# Witty.ai - AI-Powered Multi-Agent Productivity Platform

A comprehensive AI-driven productivity ecosystem featuring intelligent task management, document automation, video conferencing, email processing, and a conversational AI assistant. This platform integrates multiple AI agents to streamline workflows and enhance productivity across various business operations.

## 🚀 Core Features Overview

### 1. **AI-Powered Task Management System**
- **Smart Task Generation**: Generate tasks from natural language prompts using GPT-4
- **Notion Integration**: Seamless synchronization with Notion databases for task storage and management
- **Team Analytics**: Real-time progress tracking with completion percentages and team performance metrics
- **Productivity Reports**: AI-generated daily reports with personalized productivity suggestions
- **Task Automation**: Automatic task extraction from emails and meeting transcripts

### 2. **Intelligent Document Generation & Management**
- **Template-Based Document Creation**: Pre-built templates for:
  - Employee Completion Letters
  - Employee Offer Letters  
  - Meeting Room Booking Forms
- **AI Field Guidance**: Contextual help for form filling using Google Gemini AI
- **Advanced Text Editor**: Rich text editor with version control capabilities
- **Digital Signature Integration**: 
  - Draw signatures with touch/mouse support
  - Upload signature images
  - Insert signatures into documents
- **Multi-Format Export**: Export documents as PDF or DOCX
- **Version History**: Track document changes with timestamp and versioning

### 3. **Video Conferencing & Meeting Intelligence**
- **Integrated Video Calls**: Built using ZegoCloud SDK with real-time video/audio
- **Automatic Recording**: Screen and audio recording during meetings
- **AI Meeting Summarization**: 
  - Extract meeting minutes and key decisions
  - Identify action items with assignees and deadlines
  - Generate follow-up meeting schedules
  - Convert meeting content to structured tasks
- **Meeting Review Interface**: Streamlit-based interface for analyzing recorded meetings
- **Smart Task Generation**: Automatically create Notion tasks from meeting discussions

### 4. **Email Processing & Sentiment Analysis**
- **Gmail API Integration**: Real-time email monitoring and processing
- **Sentiment Analysis**: AI-powered email sentiment classification with confidence scoring
- **Priority Classification**: Automatic email prioritization based on content analysis
- **Task Extraction**: Intelligent extraction of actionable tasks from email content
- **Financial Content Detection**: Smart filtering to avoid processing financial/sensitive emails
- **Email-to-Task Workflow**: Direct conversion of email requests to Notion tasks

### 5. **AI Meeting Scheduler with Calendar Integration**
- **Natural Language Processing**: Schedule meetings using plain English commands
- **Google Calendar Integration**: Automatic calendar event creation and conflict detection
- **Smart Conflict Resolution**: Suggest alternative meeting times when conflicts exist
- **Email Notifications**: Automated calendar invitations and acknowledgments
- **Rescheduling Support**: Intelligent meeting rescheduling with participant notifications
- **Multi-Participant Management**: Handle complex attendee lists and email validation

### 6. **Conversational AI Assistant (Jack)**
- **3D Avatar Interface**: Realistic 3D character with facial expressions and animations
- **Speech-to-Text Processing**: Real-time voice input using AssemblyAI
- **Text-to-Speech Output**: Natural voice responses using ElevenLabs
- **Lip Sync Technology**: Synchronized mouth movements using Rhubarb Lip Sync
- **Contextual Responses**: AI responses based on user's task history and context
- **Navigation Commands**: Voice commands to navigate between different platform features
- **Emotional Intelligence**: Dynamic facial expressions and animations based on conversation context

### 7. **Calendar & Scheduling Interface**
- **Google Calendar Embedding**: Integrated calendar view for schedule management
- **Interactive Calendar Component**: Custom calendar interface with date selection
- **Chatbot Integration**: AI-powered scheduling assistant
- **Event Management**: Create, view, and manage calendar events directly from the platform

### 8. **Authentication & User Management**
- **Clerk Integration**: Secure user authentication and session management
- **User Profiles**: Personalized user experiences with profile management
- **Multi-User Support**: Team collaboration features with user assignments
- **Theme Management**: Light/dark mode toggle with system preference detection

### 9. **Real-Time Notifications & Updates**
- **Email Monitoring**: Background processes for continuous email monitoring
- **History-Based Updates**: Gmail History API for efficient change detection
- **Real-Time Sync**: Live updates across all platform components
- **Status Tracking**: Real-time status updates for tasks, meetings, and processes

### 10. **Advanced UI/UX Components**
- **Responsive Design**: Mobile-first design with Tailwind CSS
- **Modern UI Components**: Shadcn/ui component library integration
- **Interactive Elements**: Drag-and-drop interfaces, modals, and tooltips
- **Custom Fonts**: Neue Montreal typography for professional appearance
- **Accessibility Features**: Screen reader support and keyboard navigation

## 🛠 Technical Architecture

### Frontend Stack
- **React 18**: Modern component-based architecture
- **Vite**: Fast build tool and development server
- **Tailwind CSS**: Utility-first styling framework
- **Shadcn/ui**: High-quality React component library
- **React Router**: Client-side routing
- **Three.js**: 3D graphics for AI avatar
- **React Three Fiber**: React renderer for Three.js

### Backend Services

#### Main Express Server (`server/express/`)
- **Express.js**: RESTful API server
- **Notion API**: Task and database management
- **OpenAI GPT-4**: Report generation and task analysis
- **MongoDB**: User data storage
- **CORS**: Cross-origin resource sharing

#### Python AI Services (`server/python3/`)
- **FastAPI**: High-performance API framework
- **Ray**: Distributed computing for AI agents
- **Google Calendar API**: Calendar integration
- **Gmail API**: Email processing
- **SQLite**: Local data storage for meetings and tasks
- **OpenAI**: Natural language processing
- **Transformers**: Sentiment analysis pipeline

#### Jack AI Backend (`jack/backend/`)
- **Node.js Express**: Real-time AI conversation server
- **Google Gemini**: Advanced language model
- **ElevenLabs**: Text-to-speech synthesis
- **AssemblyAI**: Speech-to-text transcription
- **Lip Sync Processing**: Mouth movement synchronization

#### Video Processing (`server/python2/`)
- **Streamlit**: Interactive meeting analysis interface
- **Google Generative AI**: Video content analysis
- **Phi Data**: Agent framework for video processing
- **DuckDuckGo Integration**: External information retrieval

### Database Architecture
- **Notion**: Primary task and project management
- **SQLite**: Local storage for meetings, feedback, and email processing
- **MongoDB**: User authentication and profile data

### AI/ML Components
- **Google Gemini Pro**: Advanced language understanding
- **OpenAI GPT-4**: Task generation and analysis
- **Transformers Pipeline**: Sentiment analysis
- **AssemblyAI**: Speech recognition
- **ElevenLabs**: Voice synthesis
- **Rhubarb Lip Sync**: Facial animation

## 🔧 Setup & Installation

### Prerequisites
- Node.js 18+
- Python 3.9+
- MongoDB
- Google Cloud Console account
- OpenAI API key
- ElevenLabs API key
- AssemblyAI API key
- Notion API token

### Environment Variables Required

```env
# API Keys
GOOGLE_API_KEY=your_google_api_key
OPENAI_API_KEY=your_openai_api_key
ELEVEN_LABS_API_KEY=your_elevenlabs_api_key
ASSEMBLY_AI_API_KEY=your_assemblyai_api_key
GEMINI_API_KEY=your_gemini_api_key

# Authentication
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_key

# Database
MONGO_DB_URI=your_mongodb_uri

# Notion
NOTION_API_TOKEN=your_notion_token

# Google Services
AUTHORIZED_USER_EMAIL=your_email
```

### Installation Steps

1. **Clone the repository**
```bash
git clone <repository-url>
cd caffeine.js
```

2. **Install frontend dependencies**
```bash
cd client
npm install
```

3. **Install backend dependencies**
```bash
cd ../server/express
npm install

cd ../python3
pip install -r requirements.txt

cd ../../jack/backend
npm install

cd ../frontend
npm install
```

4. **Setup Google OAuth credentials**
- Create `credentials.json` in `server/python3/`
- Run authorization flow for Gmail and Calendar APIs

5. **Initialize databases**
```bash
cd server/python3
python init_db.py
```

6. **Start all services**
```bash
# Frontend (Terminal 1)
cd client && npm run dev

# Express API (Terminal 2)
cd server/express && npm start

# Python AI Services (Terminal 3)
cd server/python3 && uvicorn main:app --reload --port 8000

# Jack AI Backend (Terminal 4)
cd jack/backend && npm start

# Jack AI Frontend (Terminal 5)
cd jack/frontend && npm run dev

# Video Analysis (Terminal 6)
cd server/python2 && streamlit run app.py --server.port 8501
```

## 🎯 Key Use Cases

### 1. **Meeting Management Workflow**
1. Join video call with automatic recording
2. AI extracts meeting minutes and action items
3. Tasks automatically created in Notion
4. Follow-up meetings scheduled via email
5. Team members receive calendar invitations

### 2. **Email-to-Task Automation**
1. Emails continuously monitored for task-related content
2. AI performs sentiment analysis and priority classification
3. Actionable items extracted and converted to structured tasks
4. Tasks synchronized with Notion for team visibility
5. Progress tracking and completion analytics

### 3. **Document Generation Pipeline**
1. Select document template (offer letter, completion letter, etc.)
2. AI provides contextual guidance for form fields
3. Fill form with intelligent field suggestions
4. Add digital signatures with drawing or upload
5. Export as PDF or DOCX with version control

### 4. **Conversational AI Assistance**
1. Voice or text interaction with 3D AI assistant
2. Natural language commands for platform navigation
3. Task creation and management through conversation
4. Real-time responses with emotional intelligence
5. Context-aware suggestions based on user history

## 🔮 Advanced Features

### AI-Powered Insights
- **Productivity Analytics**: Daily/weekly performance reports
- **Team Collaboration Metrics**: Inter-team communication analysis
- **Sentiment Trending**: Email sentiment analysis over time
- **Meeting Effectiveness**: Analysis of meeting outcomes and action item completion

### Integration Capabilities
- **Notion Workspace**: Complete task lifecycle management
- **Google Workspace**: Calendar, Gmail, and Drive integration
- **Multi-Modal AI**: Text, voice, and video processing
- **Real-Time Synchronization**: Live updates across all platform components
  
Witty.ai represents the next evolution in AI-powered productivity platforms, seamlessly integrating multiple intelligent agents to create a unified workspace that adapts to your team's unique workflow. By combining advanced language models, computer vision, and natural language processing, the platform eliminates the friction between different productivity tools and transforms how teams collaborate, communicate, and execute projects.

