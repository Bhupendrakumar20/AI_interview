from datetime import datetime, timezone

from AIBuddyMode.firebase_config import db
from google.cloud.firestore_v1 import SERVER_TIMESTAMP

from datetime import datetime, date
from enum import Enum
from pydantic import BaseModel


def make_firestore_safe(value):
    """
    Convert arbitrary Python/Pydantic values into
    values that Firestore can safely store.
    """

    if value is None:
        return None

    # Primitive values
    if isinstance(value, (str, int, float, bool)):
        return value

    # Pydantic models
    if isinstance(value, BaseModel):
        return make_firestore_safe(
            value.model_dump()
        )

    # Enum
    if isinstance(value, Enum):
        return make_firestore_safe(value.value)

    # Datetime/date
    if isinstance(value, (datetime, date)):
        return value

    # Dictionary
    if isinstance(value, dict):
        return {
            str(key): make_firestore_safe(val)
            for key, val in value.items()
        }

    # List / tuple / set
    if isinstance(value, (list, tuple, set)):
        return [
            make_firestore_safe(item)
            for item in value
        ]

    # Anything unexpected
    return str(value)
def create_interview(
    session_id: str,
    created_by: str,
    persona: str,
    topics: list[str],
    difficulty: float,
    duration: int,
    max_questions: int,
):
    interview_ref = db.collection("interviews").document(session_id)

    interview_ref.set({
        "createdAt": SERVER_TIMESTAMP,
        "updatedAt": SERVER_TIMESTAMP,

        "createdBy": created_by,

        "difficulty": difficulty,
        "duration": duration,
        "maxQuestions": max_questions,

        "mode": "ai",
        "persona": persona,

        "participants": [created_by],

        "topics": topics,

        "status": "created",

        "score": None,
        "feedback": None,

        "startTime": SERVER_TIMESTAMP,
        "endTime": None,

        "jobDescription": None,

        "recordingUrl": None,
        "transcriptUrl": None,

        "sessionCode": None,
    })


def save_question(
    session_id: str,
    question_id: str,
    order: int,
    question: dict,
    topic: str,
    difficulty: float,
):
    question_ref = (
        db.collection("interviews")
        .document(session_id)
        .collection("questions")
        .document(question_id)
    )

    question_ref.set({
        "order": order,

        "question": question.get("description", ""),
        "questionData": question,

        "topic": topic,
        "difficulty": difficulty,

        "answer": None,
        "score": None,
        "feedback": None,

        "askedAt": SERVER_TIMESTAMP,
        "answeredAt": None,
    })


def save_answer(
    session_id: str,
    question_id: str,
    answer: str,
    score: float,
    feedback: str | dict,
):
    question_ref = (
        db.collection("interviews")
        .document(session_id)
        .collection("questions")
        .document(question_id)
    )

    question_ref.update({
        "answer": answer,
        "score": score,
        "feedback": feedback,
        "answeredAt": SERVER_TIMESTAMP,
    })


def complete_interview(
    session_id,
    score,
    feedback,
):
    interview_ref = (
        db
        .collection("interviews")
        .document(session_id)
    )

    safe_feedback = make_firestore_safe(feedback)

    interview_ref.update({
        "status": "completed",
        "score": float(score),
        "feedback": safe_feedback,
        "endTime": SERVER_TIMESTAMP,
        "updatedAt": SERVER_TIMESTAMP,
    })


def end_interview_early(
    session_id: str,
    score: float | None,
    feedback: dict,
):
    interview_ref = (
        db.collection("interviews")
        .document(session_id)
    )

    interview_ref.update({
        "status": "completed_early",
        "score": score,
        "feedback": feedback,
        "endTime": SERVER_TIMESTAMP,
        "updatedAt": SERVER_TIMESTAMP,
    })