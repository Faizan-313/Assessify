# Automated Examination Evaluation Microservices

This repository contains the evaluation microservices used in the Student Assessify platform. The system provides automatic assessment for both descriptive and programming questions, reducing manual grading effort and enabling instant feedback.

## Overview

The project consists of two independent evaluation services:

### 1. Text Evaluation Service

Evaluates descriptive answers submitted by students by comparing them with model answers and assigning scores based on semantic similarity.

### 2. Code Evaluation Service

Compiles and executes programming solutions against predefined test cases and calculates scores based on passed test cases.

## Features

### Text Evaluation

* Exact Match Detection
* Paraphrase Detection
* Partial Correctness Evaluation
* Incorrect Answer Detection
* Automatic Score Generation
* Semantic Similarity Analysis

### Code Evaluation

* Automatic Compilation
* Multi-Test Case Execution
* Runtime Error Detection
* Compilation Error Detection
* Timeout Handling
* Automatic Score Calculation
* Support for Multiple Programming Languages

## Architecture

```text
Student Assessify Platform
            │
            ▼
     Node.js Backend
            │
    ┌───────┴────────┐
    ▼                ▼
Text Evaluation   Code Evaluation
  Service            Service
    ▼                ▼
Answer Score    Test Case Results
```

## Supported Languages

### Programming Evaluation

* C++
* Python
* JavaScript

## Technology Stack

### Backend Services

* Python
* FastAPI / HTTP Server
* Docker

### Text Evaluation

* Sentence Transformers
* NLP-based Similarity Analysis

### Code Evaluation

* Python Subprocess Module
* Temporary File Execution
* Test Case Validation Engine

## Text Evaluation API

### Request

```json
{
  "teacherAnswer": "Photosynthesis is the process by which plants make food using sunlight.",
  "studentAnswer": "Plants use sunlight to prepare their food."
}
```

### Response

```json
{
  "teacherAnswer": "Photosynthesis is the process by which plants make food using sunlight.",
  "studentAnswer": "Plants use sunlight to prepare their food.",
  "similarity": 0.65
}
```

## Code Evaluation API

### Request

```json
{
  "language": "python",
  "code": "a,b=map(int,input().split())\nprint(a+b)",
  "testCases": [
    { "input": "2 3\n", "output": "5" },
    { "input": "4 4\n", "output": "10" },
    { "input": "4 6\n", "output": "10" },
    { "input": "5 1\n", "output": "6" }
  ]
}
```

### Response

```json
{
    "success": true,
    "passed": 3,
    "failed": 1,
    "total": 4,
    "score": 50,
    "results": [
        {
            "testCase": 1,
            "status": "passed",
            "passed": true
        },
        {
            "testCase": 2,
            "status": "wrong_answer",
            "passed": false,
            "expected": "10",
            "actual": "8"
        }
    ]
}
```

## Project Structure

```text
evaluation-services/
│
├── text-evaluation/
│   ├── app.py
│   ├── models/
│   └── requirements.txt
│
├── code-evaluation/
│   ├── app.py
│   ├── language_handlers/
│   │   ├── cpp.py
│   │   ├── python.py
│   │   └── javascript.py
|   ├──Dockerfile
│   └── requirements.txt
│
└── README.md
```

## Running the Services

### Install Dependencies

```bash
cd text-evaluation
pip install -r requirements.txt
```

### Start Text Evaluation Service in venv

```bash
ppython -m venv venv
venv\Scripts\activate
uvicorn app:app --reload  
```

## Docker Deployment

Build the image:

```bash
cd ../code-evaluation
 docker build -t code-runner .
```

Run the container:

```bash
docker run -p <port:port> code-runner
```

## Note
This microservice is used only in the local environment for now and production is using gemini for evaluation for both text and code.

## License

This project is developed for educational and research purposes as part of the Student Assessify platform.
