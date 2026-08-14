# adaptive_interview/router.py
import json
import redis
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from state import InterviewState
from logic import pick_next_topic, pick_target_weak_area, apply_evaluation
from questionGeneration import get_next_question
from evaluator import evaluate_answer

router = APIRouter(prefix="/interview", tags=["adaptive-interview"])

# Initialize Redis client (decode_responses=True returns string instead of bytes)
redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

# Helper function to get state from Redis
def get_session_state(session_id: str) -> InterviewState | None:
    try:
        data = redis_client.get(f"adaptive:session:{session_id}")
        if not data:
            return None
        # Support Pydantic v2 and fallback to Pydantic v1
        if hasattr(InterviewState, 'model_validate_json'):
            return InterviewState.model_validate_json(data)
        else:
            return InterviewState.parse_raw(data)
    except Exception as err:
        print(f"Error parsing session state: {err}")
        return None

# Helper function to save state to Redis
def save_session_state(session_id: str, state: InterviewState):
    try:
        # Support Pydantic v2 and fallback to Pydantic v1
        if hasattr(state, 'model_dump_json'):
            data = state.model_dump_json()
        else:
            data = state.json()
        redis_client.set(f"adaptive:session:{session_id}", data, ex=7200) # 2 hours expiry
    except Exception as err:
        print(f"Error saving session state: {err}")

# Helper function to delete state from Redis
def delete_session_state(session_id: str):
    try:
        redis_client.delete(f"adaptive:session:{session_id}")
    except Exception as err:
        print(f"Error deleting session state: {err}")


class StartSessionRequest(BaseModel):
    session_id: str
    persona: str = "Hiring Manager"
    topic_focus: list[str] = ["dsa"]
    max_questions: int = 6

class SubmitAnswerRequest(BaseModel):
    session_id: str
    answer: str

@router.post("/start")
async def start_session(req: StartSessionRequest):
    state = InterviewState(
        session_id=req.session_id,
        persona=req.persona,
        topic_focus=req.topic_focus,
        max_questions=req.max_questions,
    )
    # Fix original bug: passing state instead of focus list
    topic = pick_next_topic(state)
    question = await get_next_question(topic, state.difficulty, state.persona, [], None)
    state.current_topic = topic
    state.current_question = question
    
    save_session_state(req.session_id, state)
    return {"question": question, "difficulty": state.difficulty, "question_number": 1}


@router.post("/answer")
async def submit_answer(req: SubmitAnswerRequest):
    state = get_session_state(req.session_id)
    if not state:
        raise HTTPException(404, "Session not found")

    evaluation = await evaluate_answer(
        state.current_topic, state.current_question["description"], req.answer, state.persona
    )
    apply_evaluation(state, evaluation, state.current_topic, req.answer)

    if state.question_count >= state.max_questions:
        report = build_report(state)
        delete_session_state(req.session_id)
        return {"done": True, "evaluation": evaluation, "report": report}

    next_topic = pick_next_topic(state)   # returns locked_topic if set
    target_weak = pick_target_weak_area(state, next_topic)
    next_question = await get_next_question(
        next_topic, state.difficulty, state.persona, state.asked_questions, target_weak
    )
    state.current_topic = next_topic
    state.current_question = next_question

    save_session_state(req.session_id, state)

    return {
        "done": False,
        "evaluation": evaluation,
        "next_question": next_question,
        "difficulty": state.difficulty,
        "topic_locked": state.locked_topic is not None,
        "locked_topic": state.locked_topic,
        "question_number": state.question_count + 1,
    }

def build_report(state: InterviewState) -> dict:
    by_topic = {}
    for entry in state.performance_history:
        by_topic.setdefault(entry["topic"], []).append(entry["score"])
    
    # Extract string values from WeakArea if it is a dictionary/model
    weak_areas_sorted = {}
    for topic_tag, w_area in state.weak_areas.items():
        # Handle dict or WeakArea object
        severity = w_area.severity if hasattr(w_area, 'severity') else w_area.get('severity', 0.0)
        weak_areas_sorted[topic_tag] = severity

    return {
        "avg_by_topic": {t: sum(s) / len(s) for t, s in by_topic.items()},
        "top_weak_areas": sorted(weak_areas_sorted.items(), key=lambda x: -x[1])[:5],
        "score_progression": [e["score"] for e in state.performance_history],
        "performance_history": state.performance_history,
    }