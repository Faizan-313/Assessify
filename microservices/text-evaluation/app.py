from fastapi import FastAPI
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer, util

app = FastAPI()

print("Loading text model...")
model = SentenceTransformer("all-MiniLM-L6-v2")
print("Text Model loaded!")

class EvaluationRequest(BaseModel):
    teacherAnswer: str
    studentAnswer: str

@app.get("/")
def root():
    return {"message": "Text Evaluation Service Running"}

@app.post("/text-evaluate")
def evaluate(data: EvaluationRequest):
    teacher_embedding = model.encode(
        data.teacherAnswer,
        convert_to_tensor=True
    )

    student_embedding = model.encode(
        data.studentAnswer,
        convert_to_tensor=True
    )

    similarity = util.cos_sim(
        teacher_embedding,
        student_embedding
    ).item()

    if similarity >= 0.9:
        feedback = f"Answer closely matches the model answer. {similarity:.2f}"
    elif similarity >= 0.75:
        feedback = f"Answer covers most key concepts but lacks some details. {similarity:.2f}"
    elif similarity >= 0.5:
        feedback = f"Answer is partially correct but misses important concepts. {similarity:.2f}"
    else:
        feedback = f"Answer differs significantly from the expected answer. {similarity:.2f}"

    return {
        "similarity": round(similarity, 2),
        "feedback": feedback
    }