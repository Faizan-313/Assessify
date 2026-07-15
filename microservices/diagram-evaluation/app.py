"""Gemini-backed diagram grading microservice.

Images are decoded into Pillow Image objects before being passed to Gemini. This
prevents Gemini from treating a data-URL/base64 value as prompt text.
"""

import base64
import binascii
import json
import os
import re
import time
from io import BytesIO
from typing import Any

import google.generativeai as genai
import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel

load_dotenv()

app = FastAPI(title="Diagram Evaluation Service")
MAX_IMAGE_BYTES = 15 * 1024 * 1024
DATA_URL_PATTERN = re.compile(r"^data:(image/[\w.+-]+);base64,([\s\S]+)$", re.IGNORECASE)


class DiagramRequest(BaseModel):
    question: dict[str, Any]
    answerDiagram: str | None = None


SYSTEM_PROMPT = """You are an expert university examiner grading diagram-based answers.

You will receive the exam question, the maximum marks, the student's submitted
diagram image and, optionally, a teacher reference diagram image. Evaluate only
the student's diagram. Award marks for technical correctness, meaningful labels,
required components, correct relationships, and completeness.

Strict scoring rules:
- Blank, mostly blank, random, or unrelated diagrams receive 0 marks.
- Generic shapes without meaningful labels or relationships receive at most 20%.
- Related diagrams missing most required concepts or relationships receive at most 40%.
- Award full marks only when important concepts, labels, and relationships are correct.
- Ignore artistic quality, handwriting, colors, orientation, and layout differences.

If a reference diagram is provided, use it as guidance but accept technically
correct alternative representations.

Return only valid JSON with this shape:
{ "marksObtained": <number between 0 and maxMarks>, "feedback": "<3-5 teacher-facing sentences>" }"""


def no_answer_response() -> dict[str, Any]:
    return {"status": "done", "marksObtained": 0, "feedback": "No answer was submitted; 0 marks awarded."}


def decode_image(source: str) -> Image.Image:
    """Turn a data URL, raw base64 string, or image URL into a Pillow image."""
    value = str(source or "").strip()
    if not value:
        raise ValueError("An image is required")

    if value.startswith(("http://", "https://")):
        response = requests.get(value, timeout=15)
        response.raise_for_status()
        image_bytes = response.content
    else:
        match = DATA_URL_PATTERN.match(value)
        encoded_image = match.group(2) if match else value
        try:
            image_bytes = base64.b64decode(encoded_image, validate=True)
        except (binascii.Error, ValueError) as exc:
            raise ValueError("Diagram must be an image data URL, raw base64 image, or image URL") from exc

    if not image_bytes or len(image_bytes) > MAX_IMAGE_BYTES:
        raise ValueError("Diagram image is empty or exceeds the 15 MB limit")

    try:
        image = Image.open(BytesIO(image_bytes))
        image.load()
        return image.convert("RGB")
    except (UnidentifiedImageError, OSError) as exc:
        raise ValueError("Diagram data is not a supported image") from exc


def build_prompt(question: dict[str, Any], has_reference_image: bool) -> str:
    config = question.get("evaluationConfig") or {}
    return "\n".join([
        f"Question: {question.get('questionText') or ''}",
        f"Max marks: {question.get('marks') or 0}",
        f"Reference rubric: {config.get('referenceAnswer') or '(no text rubric provided)'}",
        f"Reference diagram: {'provided as the first image' if has_reference_image else '(no reference diagram provided)'}",
        "Student diagram: provided as the final image. Grade the final image.",
    ])


def parse_model_json(raw: str) -> dict[str, Any]:
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", cleaned, flags=re.IGNORECASE)
    parsed = json.loads(cleaned)
    if not isinstance(parsed, dict):
        raise ValueError("Gemini returned a non-object JSON response")
    return parsed


def grade_with_retries(model: Any, prompt_parts: list[Any]) -> dict[str, Any]:
    last_error: Exception | None = None
    for attempt in range(3):
        try:
            return parse_model_json(model.generate_content(prompt_parts).text or "")
        except Exception as exc:  # Gemini SDK exposes multiple provider-specific exception classes.
            last_error = exc
            if attempt < 2:
                time.sleep(2 ** attempt)
    raise RuntimeError("Gemini diagram evaluation failed") from last_error


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/diagram-evaluate")
def evaluate(request: DiagramRequest):
    if not request.answerDiagram or not request.answerDiagram.strip():
        return no_answer_response()

    api_key = os.getenv("DIAGRAM_EVALUATION_KEY") 
    model_name = os.getenv("DIAGRAM_GRADER_MODEL") 
    if not api_key or not model_name:
        raise HTTPException(500, "GEMINI_API_KEY (or GEMINI_DIAGRAM_EVALUATION_KEY) and GEMINI_GRADER_MODEL are required")

    try:
        answer_image = decode_image(request.answerDiagram)
        reference_source = (request.question.get("evaluationConfig") or {}).get("referenceImage")
        reference_image = decode_image(reference_source) if reference_source else None
    except (ValueError, requests.RequestException) as exc:
        raise HTTPException(400, str(exc)) from exc

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(
        model_name=model_name,
        system_instruction=SYSTEM_PROMPT,
        generation_config={"temperature": 0, "response_mime_type": "application/json"},
    )
    prompt_parts: list[Any] = [build_prompt(request.question, reference_image is not None)]
    if reference_image is not None:
        prompt_parts.append(reference_image)
    prompt_parts.append(answer_image)

    try:
        parsed = grade_with_retries(model, prompt_parts)
    except Exception as exc:
        raise HTTPException(502, str(exc)) from exc

    raw_marks = parsed.get("marksObtained", parsed.get("marks_awarded", parsed.get("marks_obtained", 0)))
    
    try:
        marks = float(raw_marks)
    except (TypeError, ValueError):
        marks = 0

    max_marks = float(request.question.get("marks") or 0)
    feedback = parsed.get("feedback") or parsed.get("comment") or parsed.get("rationale") or "(Model returned no feedback text.)"
    return {"status": "done", "marksObtained": max(0, min(marks, max_marks)), "feedback": str(feedback).strip()}
