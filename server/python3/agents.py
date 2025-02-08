

import openai
import sqlite3
from datetime import datetime, timedelta
import os
import json
import ray
import base64
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv
import re
from datetime import datetime, timedelta
import pytz
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import threading
from typing import List, Tuple
from transformers import pipeline

load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

LATEST_HISTORY_ID = None

openai_api_key = os.getenv('OPENAI_API_KEY')
# Define Gmail API SCOPES
SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/calendar'
]
def check_calendar_conflicts(creds, proposed_start: datetime, proposed_end: datetime) -> List[dict]:
    """
    Check for calendar conflicts within a specified time range.
    Handles timezone-aware datetime comparisons properly.
    """
    try:
        service = build('calendar', 'v3', credentials=creds)
        
        # Ensure proposed times are UTC
        if proposed_start.tzinfo is None:
            proposed_start = proposed_start.replace(tzinfo=pytz.UTC)
        if proposed_end.tzinfo is None:
            proposed_end = proposed_end.replace(tzinfo=pytz.UTC)
        
        # Add buffer time (15 minutes before and after)
        buffer_start = (proposed_start - timedelta(minutes=15)).isoformat()
        buffer_end = (proposed_end + timedelta(minutes=15)).isoformat()
        
        events_result = service.events().list(
            calendarId='primary',
            timeMin=buffer_start,
            timeMax=buffer_end,
            singleEvents=True,
            orderBy='startTime'
        ).execute()
        
        conflicts = []
        for event in events_result.get('items', []):
            # Convert event times to UTC datetime objects
            event_start_str = event['start'].get('dateTime', event['start'].get('date'))
            event_end_str = event['end'].get('dateTime', event['end'].get('date'))
            
            # Parse the datetime strings and ensure UTC timezone
            event_start = datetime.fromisoformat(event_start_str.replace('Z', '+00:00'))
            event_end = datetime.fromisoformat(event_end_str.replace('Z', '+00:00'))
            
            if not event_start.tzinfo:
                event_start = event_start.replace(tzinfo=pytz.UTC)
            if not event_end.tzinfo:
                event_end = event_end.replace(tzinfo=pytz.UTC)
            
            if (event_start <= proposed_end and event_end >= proposed_start):
                conflicts.append({
                    'summary': event['summary'],
                    'start': event_start,
                    'end': event_end,
                    'attendees': event.get('attendees', [])
                })
        
        return conflicts
    
    except Exception as e:
        logger.error(f"Error checking calendar conflicts: {e}")
        return []

def suggest_alternative_times(creds, base_datetime: datetime, conflicts: List[dict]) -> List[datetime]:
    """
    Suggest alternative meeting times based on conflicts.
    Ensures consistent timezone handling.
    """
    # Ensure base_datetime is UTC
    if base_datetime.tzinfo is None:
        base_datetime = base_datetime.replace(tzinfo=pytz.UTC)
    
    suggestions = []
    
    # Try next few days, same time
    for i in range(1, 4):
        next_day = base_datetime + timedelta(days=i)
        if not check_calendar_conflicts(creds, next_day, next_day + timedelta(hours=1)):
            suggestions.append(next_day)
            if len(suggestions) >= 3:
                break
    
    # Try same day, different times
    if len(suggestions) < 3:
        base_date = base_datetime.date()
        for hour in [9, 10, 11, 14, 15, 16]:  # Common meeting hours
            alternative_time = datetime.combine(base_date, datetime.min.time().replace(hour=hour))
            alternative_time = alternative_time.replace(tzinfo=pytz.UTC)
            
            if alternative_time > datetime.now(pytz.UTC) and not check_calendar_conflicts(
                creds, 
                alternative_time, 
                alternative_time + timedelta(hours=1)
            ):
                suggestions.append(alternative_time)
                if len(suggestions) >= 3:
                    break
    
    return suggestions

def parse_natural_language(text, sender_email):
    current_datetime = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')
    prompt = (
        f"Today's date and time is {current_datetime}. "
        "Extract the intent, entities, and attendees from the following text in JSON format. "
        "Interpret 'me' as the sender's email. Also, include a boolean field 'is_sender_required' "
        "to indicate if the sender explicitly wants to be added to the attendees list.\n\n"
        f"Sender Email: {sender_email}\n"
        f"Text: {text}\n\n"
        "If the intent is 'reschedule', include 'old_date' and 'old_time' fields for the current meeting details.\n\n"
        "Example Output:\n"
        "{\n"
        "  \"intent\": \"reschedule\", \n"
        "  \"title\": \"Meeting\", \n"
        "  \"old_date\": \"2024-12-05\", \n"
        "  \"old_time\": \"15:00\", \n"
        "  \"new_date\": \"2024-12-06\", \n"
        "  \"new_time\": \"16:00\", \n"
        "  \"attendees\": [\"sender@example.com\", \"ravi@example.com\"],\n"
        "  \"is_sender_required\": true\n"
        "}"
    )
    try:
        response = openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are an assistant that extracts intents and entities from text, ensuring attendee information is accurate."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=150,
            temperature=0.5,
        )
        raw_content = response.choices[0].message.content.strip()
        if raw_content.startswith("```json") and raw_content.endswith("```"):
            raw_content = raw_content[7:-3].strip()

        return raw_content

    except Exception as e:
        logger.error(f"Error parsing natural language: {e}")
        return "{}"

def create_google_calendar_event(creds, title, date, time, attendees):
    """Create an event in Google Calendar."""
    try:
        service = build('calendar', 'v3', credentials=creds)
        
        # Convert attendees set to a list of dictionaries
        attendees_list = [{'email': attendee} for attendee in attendees]

        event = {
            'summary': title,
            'start': {
                'dateTime': f'{date}T{time}:00',
                'timeZone': 'UTC',
            },
            'end': {
                'dateTime': f'{date}T{int(time[:2]) + 1}:{time[3:]}:00',  # End time 1 hour later
                'timeZone': 'UTC',
            },
            'attendees': attendees_list,
        }
        event_result = service.events().insert(calendarId='primary', body=event).execute()
        logger.info(f"Event created: {event_result['summary']}")
        return f"Event created successfully: {event_result.get('htmlLink')}"
    except HttpError as error:
        logger.error(f"Error creating event: {error}")
        return f"Error creating the event in Google Calendar: {error}"

def is_valid_email(email):
    """Simple regex check for valid email."""
    regex = r'^\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b'
    return re.match(regex, email) is not None

def send_calendar_invitation(service, to_email, event, meeting_id):
    """Send acknowledgment email with a single calendar invitation."""
    try:
        # Convert ISO datetime to human-readable format
        start_time = datetime.strptime(event['start']['dateTime'], "%Y-%m-%dT%H:%M:%S")
        end_time = datetime.strptime(event['end']['dateTime'], "%Y-%m-%dT%H:%M:%S")
        formatted_date = start_time.strftime("%A, %B %d, %Y")
        formatted_time = f"{start_time.strftime('%I:%M %p')} to {end_time.strftime('%I:%M %p')}"

        # Email subject and body
        subject = f"Meeting Confirmation (ID: {meeting_id}): {event['summary']}"
        body = (
            f"Dear {to_email},\n\n"
            f"Your meeting '{event['summary']}' (ID: {meeting_id}) has been scheduled successfully.\n\n"
            f"Details:\n"
            f"Date: {formatted_date}\n"
            f"Time: {formatted_time}\n\n"
            "A calendar invitation has been attached for your convenience."
        )

        # Create email message
        message = MIMEMultipart()
        message['To'] = to_email
        message['Subject'] = subject
        message.attach(MIMEText(body, 'plain'))

        # Create ICS data
        ics_data = (
            f"BEGIN:VCALENDAR\n"
            f"VERSION:2.0\n"
            f"BEGIN:VEVENT\n"
            f"SUMMARY:{event['summary']}\n"
            f"DTSTART:{start_time.strftime('%Y%m%dT%H%M%S')}\n"
            f"DTEND:{end_time.strftime('%Y%m%dT%H%M%S')}\n"
            f"LOCATION:Virtual\n"
            f"DESCRIPTION:Scheduled via AI Assistant.\n"
            f"END:VEVENT\n"
            f"END:VCALENDAR"
        )

        # Attach ICS file
        attachment = MIMEText(ics_data, 'calendar; method=REQUEST')
        attachment.add_header('Content-Disposition', 'attachment', filename='invite.ics')
        message.attach(attachment)

        # Encode and send email
        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
        service.users().messages().send(userId='me', body={'raw': raw_message}).execute()
        logger.info(f"Calendar invitation sent to {to_email}")
    except Exception as e:
        logger.error(f"Error sending calendar invitation: {e}")

@ray.remote
def schedule_meeting(text, from_email):
    parsed = parse_natural_language(text, from_email)
    try:
        data = json.loads(parsed)
        intent = data.get('intent', '').lower()
        if intent != 'schedule':
            logger.warning(f"Unrecognized intent: {intent}. Email will not be sent.")
            return f"Intent '{intent}' not recognized for scheduling. No email sent."

        title = data.get('title', 'Meeting')
        date = data.get('new_date', datetime.utcnow().strftime('%Y-%m-%d'))
        time = data.get('new_time')
        
        # Convert date and time to datetime object
        proposed_start = datetime.strptime(f"{date}T{time}:00", "%Y-%m-%dT%H:%M:%S")
        proposed_start = proposed_start.replace(tzinfo=pytz.UTC)
        proposed_end = proposed_start + timedelta(hours=1)
        
        # Get credentials and check for conflicts
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)
        conflicts = check_calendar_conflicts(creds, proposed_start, proposed_end)
        
        if conflicts:
            # Generate alternative suggestions
            suggestions = suggest_alternative_times(creds, proposed_start, conflicts)
            
            conflict_msg = "The requested time conflicts with existing meetings:\n"
            for conflict in conflicts:
                conflict_msg += f"- {conflict['summary']} ({conflict['start'].strftime('%Y-%m-%d %H:%M')} to {conflict['end'].strftime('%H:%M')})\n"
            
            if suggestions:
                conflict_msg += "\nSuggested alternative times:\n"
                for suggestion in suggestions:
                    conflict_msg += f"- {suggestion.strftime('%Y-%m-%d %H:%M')}\n"
            
            return conflict_msg

        attendees = data.get('attendees', [])
        is_sender_required = data.get('is_sender_required', False)

        # Validate and process attendees
        valid_attendees = set()
        authorized_user_email = os.getenv('AUTHORIZED_USER_EMAIL', 'nirmiteesarode04@gmail.com')

        for attendee in attendees:
            attendee = attendee.strip()
            if attendee.lower() == "me":
                valid_attendees.add(authorized_user_email)  # Map "me" to authorized email
            elif is_valid_email(attendee):
                valid_attendees.add(attendee)
            else:
                logger.warning(f"Invalid attendee email or ambiguous reference: {attendee}. Ignoring.")

        # Add the sender's email if 'is_sender_required' is true
        if is_sender_required:
            valid_attendees.add(from_email)

        # Add the default authorized user email if no attendees are valid
        if not valid_attendees:
            valid_attendees.add(authorized_user_email)
            logger.info(f"No valid attendees provided. Using default authorized user email: {authorized_user_email}")

        # Insert meeting into the database
        conn = sqlite3.connect('scheduler.db')
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO meetings (title, date, time, attendees, status)
            VALUES (?, ?, ?, ?, 'scheduled')
        ''', (title, date, time, ','.join(valid_attendees)))
        conn.commit()
        meeting_id = cursor.lastrowid
        conn.close()

        # Create calendar event
        calendar_response = create_google_calendar_event(creds, title, date, time, valid_attendees)

        if "Event created successfully" in calendar_response:
            # Send acknowledgment email
            service = build('gmail', 'v1', credentials=creds)
            send_calendar_invitation(service, from_email, {
                'summary': title,
                'start': {'dateTime': f"{date}T{time}:00"},
                'end': {'dateTime': f"{date}T{int(time[:2]) + 1}:{time[3:]}:00"}
            }, meeting_id)
            return f"Meeting '{title}' scheduled on {date} at {time} with attendees: {list(valid_attendees)}. {calendar_response}"
        else:
            return f"Meeting '{title}' scheduled locally but failed to create in Google Calendar: {calendar_response}"

    except json.JSONDecodeError:
        logger.error("Failed to decode JSON from parsed data.")
        return "Failed to parse the meeting details. No email sent."
    except KeyError as e:
        logger.error(f"Missing key in parsed data: {e}")
        return f"Missing key in parsed data: {e}. No email sent."
    except Exception as e:
        logger.error(f"Error scheduling meeting: {e}")
        return f"Error scheduling meeting: {str(e)}. No email sent."


@ray.remote
def reschedule_meeting(text, creds, from_email):
    """Reschedule a meeting and update the event on Google Calendar."""
    parsed = parse_natural_language(text, from_email)
    try:
        data = json.loads(parsed)
        intent = data.get('intent', '').lower()
        if intent != 'reschedule':
            logger.warning(f"Unrecognized intent: {intent}. Email will not be sent.")
            return f"Intent '{intent}' not recognized for rescheduling. No email sent."
        
        title = data.get('title')
        old_date = data.get('old_date')
        old_time = data.get('old_time')
        new_date = data.get('new_date')
        new_time = data.get('new_time')
        # print(title, old_date, old_time, new_date, new_time)
        
        # Check if meeting exists
        conn = sqlite3.connect('scheduler.db')
        cursor = conn.cursor()
        cursor.execute('''
            SELECT * FROM meetings 
            WHERE title = ? AND date = ? AND time = ? AND status IN ('scheduled', 'rescheduled', 'canceled',"pending")
        ''', (title, old_date, old_time))
        meeting = cursor.fetchone()
        if not meeting:
            conn.close()
            logger.warning(f"Meeting with title '{title}' on {old_date} at {old_time} does not exist.")
            return f"Meeting with title '{title}' on {old_date} at {old_time} does not exist. No email sent."
        attendees = data.get('attendees', [])
        is_sender_required = data.get('is_sender_required', False)

        # Validate and process attendees
        valid_attendees = set()
        authorized_user_email = os.getenv('AUTHORIZED_USER_EMAIL', 'nirmiteesarode04@gmail.com')

        for attendee in attendees:
            attendee = attendee.strip()
            if attendee.lower() == "me":
                valid_attendees.add(authorized_user_email)  # Map "me" to authorized email
            elif is_valid_email(attendee):
                valid_attendees.add(attendee)
            else:
                logger.warning(f"Invalid attendee email or ambiguous reference: {attendee}. Ignoring.")

        # Add the sender's email if 'is_sender_required' is true
        if is_sender_required:
            valid_attendees.add(from_email)

        # Add the default authorized user email if no attendees are valid
        if not valid_attendees:
            valid_attendees.add(authorized_user_email)
            logger.info(f"No valid attendees provided. Using default authorized user email: {authorized_user_email}")

        # Update the meeting in the database
        cursor.execute('''
            UPDATE meetings
            SET date = ?, time = ?, status = 'rescheduled'
            WHERE id = ?
        ''', (new_date, new_time, meeting[0]))
        conn.commit()
        meeting_id = cursor.lastrowid
        conn.close()

        
        event = {
            "summary": title,
            "start": {"dateTime": f"{new_date}T{new_time}:00"},
            "end": {"dateTime": f"{new_date}T{int(new_time[:2]) + 1}:{new_time[3:]}:00"}
        }

        calendar_response = create_google_calendar_event(creds, title, new_date, new_time, valid_attendees)
        delete_calendar_event(old_date, old_time, creds)

        if "Event created successfully" in calendar_response:
            # Send acknowledgment email
            service = build('gmail', 'v1', credentials=creds)
            send_calendar_invitation(service, from_email, event, meeting_id)
            return f"Meeting '{title}' scheduled on {new_date} at {new_time} with attendees: {list(valid_attendees)}. {calendar_response}"
        else:
            return f"Meeting '{title}' scheduled locally but failed to create in Google Calendar: {calendar_response}"


    except Exception as e:
        logger.error(f"Error rescheduling meeting: {e}")
        return f"Error rescheduling meeting: {str(e)}. No email sent."
    
def delete_calendar_event(date, time,creds):
    try:
        # Get credentials and build service
        service = build('calendar', 'v3', credentials=creds)
        
        # Calculate time range for search (within a minute of specified time)
        start_time = f"{date}T{time}:00Z"
        end_time = (datetime.strptime(start_time, "%Y-%m-%dT%H:%M:%SZ") + 
                   timedelta(minutes=1)).strftime("%Y-%m-%dT%H:%M:%SZ")
        
        # Search for events in the specified time range
        events_result = service.events().list(
            calendarId='primary',
            timeMin=start_time,
            timeMax=end_time,
            singleEvents=True,
            orderBy='startTime'
        ).execute()
        
        events = events_result.get('items', [])
        
        if not events:
            logger.warning(f"No events found at {date} {time}")
            return f"No events found at {date} {time}"
        
        # Delete the first matching event
        event = events[0]
        service.events().delete(
            calendarId='primary',
            eventId=event['id']
        ).execute()
       
        
        logger.info(f"Event on {date} at {time} has been deleted")
        return f"Successfully deleted event on {date} at {time}"
        
    except Exception as e:
        logger.error(f"Error deleting event: {e}")
        return f"Error deleting event: {str(e)}"




@ray.remote
def learn_from_feedback(meeting_id, rating, comments):
    try:
        conn = sqlite3.connect('scheduler.db')
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO feedback (meeting_id, rating, comments)
            VALUES (?, ?, ?)
        ''', (meeting_id, rating, comments))
        conn.commit()
        conn.close()
        
        # Placeholder for learning logic
        # Future implementation can adjust preferences based on feedback
        
        return "Feedback recorded successfully."
    except Exception as e:
        logger.error(f"Error recording feedback: {e}")
        return f"Error recording feedback: {str(e)}. No email sent."



@ray.remote
def email_handler(): 
    """Monitors Gmail inbox for new scheduling emails based on history ID."""
    global LATEST_HISTORY_ID
    try:
        print("Email Handler")
        creds = None
        if os.path.exists('token.json'):
            creds = Credentials.from_authorized_user_file('token.json', SCOPES)
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                if not os.path.exists('credentials.json'):
                    logger.error("credentials.json file not found.")
                    return "credentials.json file not found."
                flow = InstalledAppFlow.from_client_secrets_file(
                    'credentials.json', SCOPES)
                creds = flow.run_local_server(port=0)
            with open('token.json', 'w') as token:
                token.write(creds.to_json())

        service = build('gmail', 'v1', credentials=creds)

        # Check if history ID is initialized
        if not LATEST_HISTORY_ID:
            logger.error("History ID not initialized. Run initialize_history_id first.")
            return "History ID not initialized."

        # Fetch new messages based on history ID
        results = service.users().history().list(
            userId='me',
            startHistoryId=LATEST_HISTORY_ID
        ).execute()

        changes = results.get('history', [])
        if not changes:
            logger.info("No new emails since the last check.")
            return "No new emails."

        for change in changes:
            messages = change.get('messages', [])
            for message in messages:
                msg_id = message['id']
                process_email(service, msg_id)

        # Update the latest history ID
        if 'historyId' in results:
            LATEST_HISTORY_ID = results['historyId']

        return "Processed new emails."
    except Exception as e:
        logger.error(f"Error in email_handler: {e}")
        return f"Error in email_handler: {str(e)}. No email sent."

def send_email(subject, to_email, body, service):
    """Sends an email response."""
    try:
        message = MIMEMultipart()
        message['To'] = to_email
        message['Subject'] = "Re: " + subject
        message.attach(MIMEText(body, 'plain'))

        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
        message_body = {'raw': raw_message}

        service.users().messages().send(userId='me', body=message_body).execute()
        logger.info(f"Email sent to {to_email}")
    except Exception as e:
        logger.error(f"Error sending email: {e}")
        
        

def initialize_history_id(service):
    """Initialize the history ID when the server starts."""
    global LATEST_HISTORY_ID
    try:
        print("Initializing history ID")
        # Get the current profile's history ID
        profile = service.users().getProfile(userId='me').execute()
        LATEST_HISTORY_ID = profile.get('historyId')
        logger.info(f"Initialized latest history ID: {LATEST_HISTORY_ID}")
    except Exception as e:
        logger.error(f"Error initializing history ID: {e}")


def fetch_new_emails(service):
    """Fetch new emails using Gmail history API."""
    global LATEST_HISTORY_ID
    try:
        print("Fetching new emails")
        if not LATEST_HISTORY_ID:
            logger.error("History ID not initialized.")
            return

        # Fetch new messages based on history ID
        results = service.users().history().list(
            userId='me', startHistoryId=LATEST_HISTORY_ID
        ).execute()

        changes = results.get('history', [])
        for change in changes:
            messages = change.get('messages', [])
            for message in messages:
                msg_id = message['id']
                process_email(service, msg_id)

        # Update the latest history ID
        if 'historyId' in results:
            LATEST_HISTORY_ID = results['historyId']
    except Exception as e:
        logger.error(f"Error fetching new emails: {e}")

# def process_email(service, msg_id):
#     """Process a single email by ID."""
#     try:
#         # Check if the message has already been processed
#         print("Processing email")
#         conn = sqlite3.connect('scheduler.db')
#         cursor = conn.cursor()
#         cursor.execute('SELECT id FROM processed_emails WHERE msg_id = ?', (msg_id,))
#         if cursor.fetchone():
#             logger.info(f"Email {msg_id} has already been processed. Skipping.")
#             conn.close()
#             return

#         message = service.users().messages().get(userId='me', id=msg_id, format='full').execute()
#         payload = message.get('payload', {})
#         headers = payload.get('headers', [])
#         subject = next((h['value'] for h in headers if h['name'].lower() == 'subject'), "")
#         from_email = next((h['value'] for h in headers if h['name'].lower() == 'from'), "")
#         # Extract the email address from the 'From' header
#         from_email = re.search(r'<(.+?)>', from_email)
#         from_email = from_email.group(1) if from_email else from_email

#         # Extract the email body
#         body = ""
#         if 'parts' in payload:
#             for part in payload['parts']:
#                 if part.get('mimeType') == 'text/plain':
#                     data = part['body'].get('data', '')
#                     if data:
#                         decoded_data = base64.urlsafe_b64decode(data).decode('utf-8')
#                         body += decoded_data
#         else:
#             data = payload['body'].get('data', '')
#             if data:
#                 decoded_data = base64.urlsafe_b64decode(data).decode('utf-8')
#                 body += decoded_data

#         if not body:
#             body = "No content found in the email body."

#         logger.info(f"Processing email from {from_email} with subject '{subject}'.")
#         response_message = ray.get(schedule_meeting.remote(body, from_email))

#         logger.info(response_message)

#         # Mark the email as processed
#         cursor.execute('INSERT INTO processed_emails (msg_id) VALUES (?)', (msg_id,))
#         conn.commit()
#         conn.close()

#     except Exception as e:
#         logger.error(f"Error processing email: {e}")


# Initialize sentiment analysis pipeline
sentiment_pipeline = pipeline("sentiment-analysis")

def analyze_email_sentiment(email_text):
    """Analyze the sentiment and priority of an email."""
    try:
        # Get sentiment result
        sentiment_result = sentiment_pipeline(email_text)[0]
        label = sentiment_result['label']
        score = sentiment_result['score']
        
        # Define urgency keywords
        urgency_keywords = ["urgent", "ASAP", "immediately", "deadline", "important", "critical"]
        
        # Determine priority
        priority = "Medium Priority"
        if any(word in email_text.lower() for word in urgency_keywords):
            priority = "High Priority - Urgent"
        elif label == "NEGATIVE" and score > 0.75:
            priority = "High Priority - Negative"
        elif label == "POSITIVE" and score > 0.75:
            priority = "Low Priority - Positive"
        
        return {
            "sentiment": label,
            "confidence": score,
            "priority": priority
        }
    except Exception as e:
        logger.error(f"Error analyzing email sentiment: {e}")
        return None

# Modify the process_email function to include sentiment analysis
def process_email(service, msg_id):
    """Process a single email by ID."""
    try:
        print("Processing email")
        conn = sqlite3.connect('scheduler.db')
        cursor = conn.cursor()
        
        # Create sentiment_analysis table if it doesn't exist
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sentiment_analysis (
                msg_id TEXT PRIMARY KEY,
                sentiment TEXT,
                confidence REAL,
                priority TEXT,
                processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        cursor.execute('SELECT id FROM processed_emails WHERE msg_id = ?', (msg_id,))
        if cursor.fetchone():
            logger.info(f"Email {msg_id} has already been processed. Skipping.")
            conn.close()
            return

        message = service.users().messages().get(userId='me', id=msg_id, format='full').execute()
        payload = message.get('payload', {})
        headers = payload.get('headers', [])
        subject = next((h['value'] for h in headers if h['name'].lower() == 'subject'), "")
        from_email = next((h['value'] for h in headers if h['name'].lower() == 'from'), "")
        from_email = re.search(r'<(.+?)>', from_email)
        from_email = from_email.group(1) if from_email else from_email

        # Extract the email body
        body = ""
        if 'parts' in payload:
            for part in payload['parts']:
                if part.get('mimeType') == 'text/plain':
                    data = part['body'].get('data', '')
                    if data:
                        decoded_data = base64.urlsafe_b64decode(data).decode('utf-8')
                        body += decoded_data
        else:
            data = payload['body'].get('data', '')
            if data:
                decoded_data = base64.urlsafe_b64decode(data).decode('utf-8')
                body += decoded_data

        if not body:
            body = "No content found in the email body."

        # Perform sentiment analysis
        sentiment_result = analyze_email_sentiment(body)
        if sentiment_result:
            cursor.execute('''
                INSERT INTO sentiment_analysis (msg_id, sentiment, confidence, priority)
                VALUES (?, ?, ?, ?)
            ''', (msg_id, sentiment_result['sentiment'], sentiment_result['confidence'], 
                 sentiment_result['priority']))
        
        print("reached tasks")

        tasks = analyze_email_for_tasks(body, msg_id)
        print(tasks)
        if tasks:
            store_tasks(tasks, msg_id, conn)
            logger.info(f"Stored {len(tasks)} tasks from email {msg_id}")

        logger.info(f"Processing email from {from_email} with subject '{subject}'.")
        response_message = ray.get(schedule_meeting.remote(body, from_email))

        logger.info(response_message)

        # Mark the email as processed
        cursor.execute('INSERT INTO processed_emails (msg_id) VALUES (?)', (msg_id,))
        conn.commit()
        conn.close()

    except Exception as e:
        logger.error(f"Error processing email: {e}")

def create_event(creds, title, date, time, attendees):
    try:
        service = build('calendar', 'v3', credentials=creds)
        start_datetime = f"{date}T{time}:00"
        end_time = (datetime.strptime(start_datetime, "%Y-%m-%dT%H:%M:%S") + timedelta(hours=1)).strftime("%H:%M:%S")
        end_datetime = f"{date}T{end_time}"

        event = {
            'summary': title,
            'start': {
                'dateTime': start_datetime,
                'timeZone': 'UTC',
            },
            'end': {
                'dateTime': end_datetime,
                'timeZone': 'UTC',
            },
            'attendees': [{'email': attendee} for attendee in attendees],
        }
        created_event = service.events().insert(calendarId='primary', body=event).execute()
        logger.info(f"Event created: {created_event.get('htmlLink')}")
        return f"Event created successfully: {created_event.get('htmlLink')}"
    except HttpError as error:
        error_content = error.content.decode() if hasattr(error, 'content') else str(error)
        logger.error(f"An error occurred while creating the event: {error_content}")
        return f"Failed to create the event in Google Calendar. Error: {error_content}"

def analyze_email_for_tasks(email_body: str, msg_id: str) -> List[dict]:
    """Analyze email content using OpenAI to extract tasks."""
    try:
        prompt = f"""
        Extract actionable tasks from the email content below.
        Return ONLY a valid JSON array containing tasks in this EXACT format:
        [
            {{
                "title": "task title",
                "project": "project name",
                "assignee": ["person name"],
                "dueDate": "YYYY-MM-DD",
                "status": "Not started"
            }}
        ]

        Rules:
        - If no tasks found, return empty array []
        - All dates must be in YYYY-MM-DD format
        - Status must be "Not started"
        - Use "General" for project if not specified
        - Each task must have all required fields
        - Return ONLY the JSON array, no other text

        Email Content:
        {email_body}
        """

        response = openai.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a task extraction AI that ONLY returns valid JSON arrays."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=1000
        )

        content = response.choices[0].message.content.strip()
        
        # Remove any markdown formatting
        if content.startswith("```json"):
            content = content[7:-3] if content.endswith("```") else content[7:]
        
        # Validate and parse JSON
        tasks = json.loads(content)
        
        # Validate task structure
        if not isinstance(tasks, list):
            logger.warning("OpenAI response is not a list")
            return []
            
        valid_tasks = []
        for task in tasks:
            if all(key in task for key in ["title", "project", "assignee", "dueDate", "status"]):
                # Ensure assignee is a list
                if isinstance(task["assignee"], str):
                    task["assignee"] = [task["assignee"]]
                valid_tasks.append(task)
            else:
                logger.warning(f"Skipping invalid task structure: {task}")
                
        return valid_tasks

    except json.JSONDecodeError as e:
        logger.error(f"Error decoding JSON from OpenAI response: {e}\nResponse content: {content}")
        return []
    except Exception as e:
        logger.error(f"Error analyzing tasks: {e}")
        return []

def store_tasks(tasks: List[dict], msg_id: str, conn: sqlite3.Connection):
    """Store tasks in the database."""
    try:
        cursor = conn.cursor()
        for task in tasks:
            cursor.execute('''
                INSERT OR IGNORE INTO tasks 
                (msg_id, title, project, assignee, due_date, status)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                msg_id,
                task['title'],
                task['project'],
                ','.join(task['assignee']),
                task['dueDate'],
                task['status']
            ))
        conn.commit()
    except Exception as e:
        logger.error(f"Error storing tasks: {e}")
