# Assessify: AI-Driven Online Programming Examination Platform

**Assessify** is a **secure, intelligent, and multi-format web-based platform** designed to revolutionize the way **Computer Science Engineering exams** are conducted online.  
By integrating **AI-driven proctoring**, a **Smart Teacher Dashboard**, and **multi-format answer support**, it ensures **academic integrity**, **accessibility**, and **fairness** — all within a seamless, real-time environment.

---

## Abstract

Traditional online exam systems often fail to ensure integrity or support diverse question formats.  
**Assessify** bridges this gap with an **AI-powered, real-time proctoring system** and an **interactive exam workspace** where students can:

- Write **code**
- Draw **diagrams**
- Submit **text responses**
- Attempt **MCQs**

Instructors receive **real-time alerts** on suspicious activity, enabling **immediate intervention**.  
Built using modern technologies such as **React.js**, **Node.js**, and **MongoDB**, Assessify is **modular**, **scalable**, and ready for deployment in **universities**, **bootcamps**, and **certification platforms**.

---

## Tech Stack

| Layer | Technologies Used |
|-------|-------------------|
| **Frontend** | React.js, Tailwind CSS, CodeMirror, Socket-client |
| **Backend** | Node.js, Express.js, Socket.io |
| **Database** | MongoDB, Cloudinary |
| **AI Monitoring** | TensorFlow, MediaPipe |
| **Auto Evaluation** | Python, Docker, Fastapi, Sentence Transformers |

---

## Key Features

### Students
- **Multi-format Answer Interface** — Code, Text, MCQs, and Diagram editors in a unified workspace  
- **Lockdown Mode** — Prevents tab switching, external application access etc.
- **AI Proctoring** — Webcam-based anomaly detection to maintain exam integrity  

### Teachers
- **Live Dashboard** — Monitor active students, alerts, and submissions in real time  
- **Alerts** — Suspicious activities flagged automatically  
- **Exam Management** — Create, schedule, and manage exams with full administrative control 
- **Auto Evaluation** — Do the auto evalution of papers 

---

## Modules Overview

| Module  | Description |
|--------|-------------|
| **Authentication** | Secure login system for teachers |
| **Exam Creation** | Create questions in text, code, MCQs, or diagram formats |
| **Exam Workspace** | Unified and responsive student interface with integrated editors |
| **AI Proctoring** | Real-time anomaly detection using webcam input |
| **Teacher Dashboard** | Live monitoring, AI alerts, and performance insights |
| **Result Management** | Exam manula and auto evaluation |

---

## Installation & Setup

### Steps

Prerequisites
- Node.js and npm 
- MongoDB (local or hosted, e.g., Atlas)
- Git

1. Clone the repository
```bash
git clone https://github.com/yourusername/codefusion.git
cd codefusion
```

2. Backend — install, configure, and run
```bash
cd Project/backend

# install dependencies
npm install

# create .env file (see template below)
# edit .env and set values (PORT, MONGO_DB_URL, secrets, etc.)

# run
npm run dev
```

Backend .env template (backend/.env)
```env
# Server
PORT=3000
NODE_ENV=dev
CORS_ORIGIN=

# Database 

#local
MONGO_DB_URL=
DB_NAME=

#atlas
MONGO=

# Auth tokens
ACCESS_TOKEN_SECRET=your_access_token_secret
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_SECRET=your_refresh_token_secret
REFRESH_TOKEN_EXPIRY=7d

#Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Password reset
TEMP_TOKEN_SECRET=

# For Email Sending
EMAIL_USER=
EMAIL_PASS=

#for local evalution with docker
TEXT_GRADING_MICROSERVICE_URL=
CODE_GRADING_MICROSERVICE_URL=

#for gemini evaluation
GEMINI_API_KEY=
GEMINI_GRADER_MODEL=

SYSTEM_PROMPT_TEXT=
SYSTEM_PROMPT_CODE=
```

3. Frontend — install, configure, and run
```bash
#open new terminal
cd /Project/frontend

# install dependencies
npm install

# create frontend env
# set API url  (example below)

# run dev server
npm run dev
```

Frontend .env template (frontend/.env)
```env
VITE_API_URL=
```

## Evaluation Engine (Code + Text Evaluation Microservice)
Assessify includes a dedicated AI-powered Evaluation Microservice responsible for automatically grading both programming solutions and descriptive (theoretical) answers in real time.

The evaluation system is designed with two separate execution strategies depending on the environment:

### Local Development Mode:
Uses a dedicated Evaluation Microservice for code execution, test case validation, and text evaluation.
### Production Mode:
Uses Google Gemini (LLM-based evaluation) for intelligent assessment of both code quality and textual explanations.

### Evaluation Flow
Student submits an answer (code / text / mixed format)
System determines environment (local or production)
Evaluation is triggered via:
Microservice (local)
Gemini API (production)
Response is normalized into a unified scoring format
Result is stored and shown in the Teacher Dashboard

### Evaluation Microservice Documentation
For detailed implementation, API structure, and architecture of the local evaluation system, refer to:
https://github.com/Faizan-313/Assessify/blob/main/microservices/README.md

### Benefits of This Architecture
Ensures consistent evaluation logic across environments
Enables offline/local testing without external API dependency
Uses Gemini in production for advanced semantic evaluation
Improves scalability and reliability of grading system
Supports both deterministic (test-case based) and AI-based scoring

(why we are using two seperate logics for evaluation has simple answer -> it is easy to use gemini for production as compared to our own microservice evaluation)


Notes
- Replace placeholder secrets with secure values.
- If using MongoDB Atlas, whitelist your server IP / add proper network & user credentials.

## License
This project is licensed under the MIT License.

## Conclusion
Assessify is a next-generation online programming examination system that blends security, flexibility, and AI intelligence.
By providing a unified platform for multi-format exams and real-time monitoring, it advances the future of fair, scalable, and intelligent remote assessments.

