import streamlit as st
import requests
import os
import time
from phi.agent import Agent
from phi.model.google import Gemini
from phi.tools.duckduckgo import DuckDuckGo
from google.generativeai import upload_file, get_file
import google.generativeai as genai
from dotenv import load_dotenv
from datetime import datetime


# Load environment variables
load_dotenv()

API_ENDPOINT = "http://localhost:3000/api/add-tasks"
DATABASE_ID = "19446fcb-6003-8170-974f-ee59405cd704"

API_KEY = os.getenv("GOOGLE_API_KEY")
if API_KEY:
    genai.configure(api_key=API_KEY)

# Page configuration
st.set_page_config(
    page_title="Multimodal AI Agent- Video Summarizer",
    layout="wide"
)

st.title("Meet AI Summarizer Agent")

@st.cache_resource
def initialize_agent():
    return Agent(
        name="Video AI Summarizer",
        model=Gemini(id="gemini-2.0-flash-exp"),
        tools=[DuckDuckGo()],
        markdown=True,
    )

# Initialize the agent
multimodal_Agent = initialize_agent()

# Ensure session state variables exist
if "ai_response" not in st.session_state:
    st.session_state.ai_response = None

if "tasks" not in st.session_state:
    st.session_state.tasks = []

# **Specify the local video file path**
video_path = "../express/recordings/meeting.mp4"  # Change this to your local file path

# Function to extract tasks
# def extract_tasks(response_content):
#     tasks = []
#     if "**Action Items:**" in response_content:
#         action_items_section = response_content.split("**Action Items:**")[1].split("**Follow-Up Meetings:**")[0]
#         st.write("Extracted Action Items Section:", action_items_section)

#         for line in action_items_section.split("\n"):
#             if "Task:" in line and "Assigned to:" in line and "Deadline:" in line:
#                 try:
#                     task_parts = line.split("|")
#                     task_title = task_parts[0].split(":")[1].strip()
#                     assignee = [task_parts[1].split(":")[1].strip()]  # Always in an array
#                     raw_due_date = task_parts[2].split(":")[1].strip()

#                     # Convert date to YYYY-MM-DD format
#                     try:
#                         parsed_date = datetime.strptime(raw_due_date, "%d %b %Y")  # Example: "14 Feb 2025"
#                         formatted_due_date = parsed_date.strftime("%Y-%m-%d")  # Convert to YYYY-MM-DD
#                     except ValueError:
#                         continue  # Skip invalid dates

#                     task = {
#                         "title": task_title,
#                         "assignee": assignee,
#                         "dueDate": formatted_due_date,  # Strictly YYYY-MM-DD format
#                         "project": "Matcha",  # Set all projects to "Matcha"
#                         "status": "Not started"
#                     }
#                     st.write("Extracted Task:", task)
#                     tasks.append(task)
#                 except (IndexError, ValueError):
#                     continue

#     return tasks

def extract_tasks(response_content):
    tasks = []
    if not response_content:
        return tasks
            
    # Split more robustly to handle variations in markdown
    sections = response_content.split("**Action Items:**")
    if len(sections) < 2:
        st.warning("No Action Items section found")
        return tasks
        
    action_items = sections[1].split("**Follow-Up Meetings:**")[0].strip()
    
    for line in action_items.split("\n"):
        line = line.strip()
        if "Task:" in line and "Assigned to:" in line and "Deadline:" in line:
            try:
                task_parts = [part.strip() for part in line.split("|")]
                task_title = task_parts[0].split("Task:")[1].strip()
                assignee = [task_parts[1].split("Assigned to:")[1].strip()]
                raw_due_date = task_parts[2].split("Deadline:")[1].strip()
                
                try:
                    parsed_date = datetime.strptime(raw_due_date, "%d %m %Y")
                    formatted_due_date = parsed_date.strftime("%Y-%m-%d")
                    
                    task = {
                        "title": task_title,
                        "assignee": assignee,
                        "dueDate": formatted_due_date,
                        "project": "Matcha",
                        "status": "Not started"
                    }
                    tasks.append(task)
                except ValueError as e:
                    st.warning(f"Invalid date format: {raw_due_date}")
                    continue
                    
            except (IndexError, ValueError) as e:
                st.warning(f"Error parsing line: {line}\nError: {str(e)}")
                continue
    
    return tasks

# Check if the file exists
if not os.path.exists(video_path):
    st.error(f"Video file not found at: {video_path}")
else:
    st.video(video_path, format="video/mp4", start_time=0)

    if st.button("Analyze Video", key="analyze_video_button"):
        try:
            with st.spinner("Processing video and gathering insights..."):
                processed_video = upload_file(video_path)
                while processed_video.state.name == "PROCESSING":
                    time.sleep(1)
                    processed_video = get_file(processed_video.name)

                # AI agent processing
                analysis_prompt = """
                You are an AI assistant designed to analyze video conference recordings. The uploaded video contains a recorded meeting. Your task is to extract insights based on the audio transcription. Ignore visual elements and focus entirely on the spoken content.

                **Instructions:**  
                1. **Generate Meeting Minutes**  
                - Summarize key points discussed.  
                - List major decisions made.  

                2. **Identify Actionable Tasks**  
                - Extract any tasks assigned during the meeting.  
                - Mention who is responsible for each task (if stated).  
                - Include deadlines (if mentioned).  

                3. **Highlight Follow-Up Meetings**  
                - Identify any follow-up meetings scheduled.  
                - Provide date, time, and agenda (if available).  

                4. **Ensure Clarity & Structure**  
                - Present information in a well-structured format (bullet points or sections).  
                - Use clear and professional language. 
                
                5. **Names**  
                - The names of the assigned to should be among Nirmitee Sarode, Shreya Rathod, Tabish Shaikh and Riva Rodrigues only.


                **Output Format Example:**  

                **Meeting Minutes:**  
                - [Summary of key discussions]  
                - [Decisions made]  

                **Action Items:**  
                - Task: [Task description] | Assigned to: [Person] | Deadline: [DD MM YYYY]  
                - Task: [Task description] | Assigned to: [Person] | Deadline: [DD MM YYYY]  

                **Follow-Up Meetings:**  
                - Date: [MM/DD/YYYY] | Time: [HH:MM AM/PM] | Agenda: [Brief agenda]  

                Process the audio carefully, ensuring accuracy in summarization. Do not include unnecessary details or filler text.
                """

                response = multimodal_Agent.run(analysis_prompt, videos=[processed_video])

                # Store AI response
                st.session_state.ai_response = response.content
                st.session_state.tasks = extract_tasks(response.content)  # Extract tasks

                st.success("Analysis complete! Review the summary below.")

        except Exception as error:
            st.error(f"An error occurred during analysis: {error}")

# Display AI-generated response
if st.session_state.ai_response:
    st.subheader("Analysis Result")
    st.markdown(st.session_state.ai_response)

# Show button only if tasks exist
if st.session_state.tasks:
    if st.button("Send Tasks to Notion"):
        payload = {
            "databaseId": DATABASE_ID,
            "tasks": st.session_state.tasks
        }

        try:
            response = requests.post(API_ENDPOINT, json=payload)
            if response.status_code == 200:
                st.success("Tasks successfully sent to the API!")
            # else:
                # st.error(body=f"")
        except Exception as e:
            st.error(f"Error while sending tasks: {e}")

# Hide Streamlit menu
hide_menu_style = """
    <style>
    #MainMenu {visibility: hidden;}
    header {visibility: hidden;}
    </style>
    """
st.markdown(hide_menu_style, unsafe_allow_html=True)
