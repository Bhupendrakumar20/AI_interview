# adaptive_interview/state.py (updated)
from pydantic import BaseModel, Field
from typing import Optional
import time

class WeakArea(BaseModel):
    severity: float = 0.0
    topic: str = ""
    occurrences: int = 0

class InterviewState(BaseModel):
    session_id: str
    persona: str = "Hiring Manager"
    topic_focus: list[str] = ["dsa"]
    difficulty: float = 3.0
    max_questions: int = 6
    question_count: int = 0

    asked_questions: list[str] = []
    weak_areas: dict[str, WeakArea] = {}          # {"recursion": WeakArea(...)}
    topic_performance: dict[str, list[float]] = {}
    performance_history: list[dict] = []

    locked_topic: Optional[str] = None            # set when a topic is remediation-locked
    lock_recovery_streak: int = 0                 # consecutive good scores in locked topic

    current_topic: Optional[str] = None
    current_question: Optional[dict] = None
    _last_touched: float = time.time()