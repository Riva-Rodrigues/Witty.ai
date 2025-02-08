from flask import Flask, request, jsonify
from flask_cors import CORS  # Add this import
import json
import os
from datetime import datetime
from typing import List, Optional

import google.generativeai as genai

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Rest of your code remains the same...
# Configure Gemini API
GOOGLE_API_KEY = "AIzaSyC-khVzVKfULQNMwpkw0npwxWFacqlvjfA"
genai.configure(api_key=GOOGLE_API_KEY)
model = genai.GenerativeModel('gemini-pro')

def parse_tasks_from_prompt(prompt: str) -> dict:
    system_prompt = """
    Parse the following text into tasks. Extract:
    - Title of the task  ("title")
    - Status Not started ("status")
    - Assignee names ("assignee") is an array
    - Due date (if mentioned) ("dueDate") (format: YYYY-MM-DD)
    - Project name ("project")
    
    Format the output as a JSON array of task objects. Make sure that the title sound professional.
    """
    
    full_prompt = f"{system_prompt}\n\nText to parse: {prompt}"
    
    try:
        response = model.generate_content(full_prompt)
        response_text = response.text
        json_str = response_text.strip().replace('```json', '').replace('```', '')
        tasks = json.loads(json_str)
        return {"tasks": tasks}
    except Exception as e:
        print(f"Error parsing tasks: {str(e)}")
        return {"tasks": []}

@app.route('/generate-tasks', methods=['POST'])
def generate_tasks():
    if not request.json or 'prompt' not in request.json:
        return jsonify({"error": "No prompt provided"}), 400
    
    prompt = request.json['prompt']
    task_list = parse_tasks_from_prompt(prompt)
    
    return jsonify(task_list)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
