from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import ray
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request  
from agents import (
    schedule_meeting,
    reschedule_meeting,
    learn_from_feedback,
    email_handler,
    initialize_history_id,
    fetch_new_emails
)
import sqlite3
import asyncio
import threading
import time
import logging
import os
from typing import List
from datetime import datetime


# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/calendar'
]

# Initialize Ray once
if not ray.is_initialized():
    ray.init(ignore_reinit_error=True)

app = FastAPI(title="AI Multi-Agent Calendar Scheduler with Email Integration")

# Define request models
class ScheduleRequest(BaseModel):
    text: str

class RescheduleRequest(BaseModel):
    text: str

class CancelRequest(BaseModel):
    meeting_id: int

class FeedbackRequest(BaseModel):
    meeting_id: int
    rating: int
    comments: str

class SentimentAnalysis(BaseModel):
    msg_id: str
    sentiment: str
    confidence: float
    priority: str
    processed_at: datetime
    subject: str
    body: str

class Task(BaseModel):
    title: str
    project: str
    assignee: List[str]
    dueDate: str
    status: str
    created_at: datetime

class TaskAnalysis(BaseModel):
    msg_id: str
    tasks: List[Task]
    processed_at: datetime



# API Endpoints

@app.get("/tasks", response_model=List[Task])
async def get_tasks():
    """Get all tasks extracted from emails."""
    try:
        conn = sqlite3.connect('scheduler.db')
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT msg_id, title, project, assignee, due_date, status, created_at 
            FROM tasks 
            ORDER BY created_at DESC
        ''')
        
        results = cursor.fetchall()
        conn.close()
        
        return [
            Task(
                title=row[1],
                project=row[2],
                assignee=row[3].split(','),
                dueDate=row[4],
                status=row[5],
                created_at=datetime.fromisoformat(row[6])
            )
            for row in results
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    


@app.get("/sentiment/emails", response_model= List[SentimentAnalysis])
async def get_email_sentiments():
    """Get sentiment analysis results for all processed emails."""
    try:
        conn = sqlite3.connect('scheduler.db')
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT msg_id, sentiment, confidence, priority, processed_at ,subject,body
            FROM sentiment_analysis 
            ORDER BY processed_at DESC
        ''')
        
        results = cursor.fetchall()
        conn.close()
        
        return [
            SentimentAnalysis(
                msg_id=row[0],
                sentiment=row[1],
                confidence=row[2],
                priority=row[3],
                processed_at=datetime.fromisoformat(row[4]),
                subject=row[5],
                body=row[6]

            )
            for row in results
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/schedule")
async def schedule(request: ScheduleRequest):
    
    from_email = "rodriguesriva1130@gmail.com"  
    result = await schedule_meeting.remote(request.text, from_email)
    return {"message": result}

@app.post("/reschedule")
async def reschedule(request: RescheduleRequest):
    from_email = "rodriguesriva1130@gmail.com"  
    creds = None
    if os.path.exists("token.json"):
        creds = Credentials.from_authorized_user_file("token.json", SCOPES)
    result = await reschedule_meeting.remote(request.text, creds,from_email)
    return {"message": result}

@app.post("/cancel")
async def cancel(request: CancelRequest):
    try:
        conn = sqlite3.connect('scheduler.db')
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE meetings
            SET status = 'canceled'
            WHERE id = ?
        ''', (request.meeting_id,))
        conn.commit()
        conn.close()
        return {"message": f"Meeting {request.meeting_id} canceled successfully."}
    except Exception as e:
        logger.error(f"Error canceling meeting: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/feedback")
async def feedback(request: FeedbackRequest):
    result = await learn_from_feedback.remote(request.meeting_id, request.rating, request.comments)
    return {"message": result}

@app.post("/process_emails")
async def process_emails():
    """Endpoint to trigger email processing manually."""
    result = await email_handler.remote()
    return {"message": result}

@app.get("/meetings")
def get_meetings():
    """Fetch all meetings."""
    try:
        conn = sqlite3.connect('scheduler.db')
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM meetings')
        meetings = cursor.fetchall()
        conn.close()
        return {"meetings": meetings}
    except Exception as e:
        logger.error(f"Error fetching meetings: {e}")
        raise HTTPException(status_code=500, detail="Error fetching meetings.")

@app.get("/feedback")
def get_feedback():
    """Fetch all feedback."""
    try:
        conn = sqlite3.connect('scheduler.db')
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM feedback')
        feedback = cursor.fetchall()
        conn.close()
        return {"feedback": feedback}
    except Exception as e:
        logger.error(f"Error fetching feedback: {e}")
        raise HTTPException(status_code=500, detail="Error fetching feedback.")

@app.get("/meeting/{meeting_id}")
def get_meeting_details(meeting_id: int):
    """Fetch details of a specific meeting."""
    try:
        conn = sqlite3.connect('scheduler.db')
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM meetings WHERE id = ?', (meeting_id,))
        meeting = cursor.fetchone()
        cursor.execute('SELECT * FROM feedback WHERE meeting_id = ?', (meeting_id,))
        feedback = cursor.fetchall()
        conn.close()
        return {"meeting": meeting, "feedback": feedback}
    except Exception as e:
        logger.error(f"Error fetching meeting details: {e}")
        raise HTTPException(status_code=500, detail="Error fetching meeting details.")

# Background Email Processing
def email_processing_loop():
    """Loop to process emails every 5 minutes."""
    while True:
        try:
            result = ray.get(email_handler.remote())
            logger.info(result)
        except Exception as e:
            logger.error(f"Error in background email processing: {e}")
        time.sleep(300)  # Wait for 5 minutes



@app.on_event("startup")
def startup_event():
    """Start background thread for email listener."""
    global LATEST_HISTORY_ID
    try:
        creds = None
        if os.path.exists('token.json'):
            creds = Credentials.from_authorized_user_file('token.json', SCOPES)
        
        # Check if credentials need refreshing
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                try:
                    creds.refresh(Request())
                    # Save refreshed credentials
                    with open('token.json', 'w') as token:
                        token.write(creds.to_json())
                except Exception as e:
                    logger.error(f"Error refreshing credentials: {e}")
                    raise ValueError("Failed to refresh Gmail credentials.")
            else:
                # Need to run authorize.py again
                raise ValueError("Gmail credentials expired. Please run authorize.py to refresh.")

        # Initialize Gmail service
        gmail_service = build('gmail', 'v1', credentials=creds)

        # Initialize History ID
        initialize_history_id(gmail_service)

        # Background email listener
        def email_listener():
            while True:
                try:
                    fetch_new_emails(gmail_service)
                except Exception as e:
                    logger.error(f"Error in email_listener: {e}")
                time.sleep(10)  # Poll every 10 seconds

        listener_thread = threading.Thread(target=email_listener, daemon=True)
        listener_thread.start()

        # Start the periodic email processing loop
        processing_thread = threading.Thread(target=email_processing_loop, daemon=True)
        processing_thread.start()

        logger.info("Started email listener and processing threads.")
    except Exception as e:
        logger.error(f"Error starting email listener thread: {e}")
        # Don't raise here, just log the error to prevent app startup failure