# api.py
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import uuid
import time
import logging
import json
import redis
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from state import InterviewState
from logic import pick_next_topic, pick_target_weak_area, apply_evaluation
from questionGeneration import get_next_question
from evaluator import evaluate_answer
from debuger import debug_router

from fastapi.responses import JSONResponse
from starlette.requests import Request


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("adaptive_interview")

app = FastAPI(title="Adaptive AI Buddy Interview API")

from dotenv import load_dotenv
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_local_path = os.path.join(root_dir, ".env.local")
if os.path.exists(env_local_path):
    load_dotenv(env_local_path)
else:
    load_dotenv()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(debug_router)

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
        logger.error(f"Error parsing session state from Redis: {err}")
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
        logger.error(f"Error saving session state to Redis: {err}")

# Helper function to delete state from Redis
def delete_session_state(session_id: str):
    try:
        redis_client.delete(f"adaptive:session:{session_id}")
    except Exception as err:
        logger.error(f"Error deleting session state from Redis: {err}")


@app.exception_handler(Exception)
async def catch_all_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled exception on {request.url.path}")
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal error: {type(exc).__name__}: {str(exc)}"},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": "true",
        },
    )


class StartSessionRequest(BaseModel):
    persona: str = "Hiring Manager"
    topic_focus: list[str] = ["dsa"]
    max_questions: int = 6


class StartSessionResponse(BaseModel):
    session_id: str
    question: dict
    difficulty: float
    question_number: int


class SubmitAnswerRequest(BaseModel):
    session_id: str
    answer: str


class SubmitAnswerResponse(BaseModel):
    done: bool
    evaluation: dict
    next_question: dict | None = None
    difficulty: float | None = None
    topic_locked: bool | None = None
    locked_topic: str | None = None
    question_number: int | None = None
    report: dict | None = None


class SessionStateResponse(BaseModel):
    session_id: str
    persona: str
    difficulty: float
    question_count: int
    max_questions: int
    locked_topic: str | None
    weak_areas: dict
    topic_performance: dict


@app.post("/interview/start", response_model=StartSessionResponse)
async def start_session(req: StartSessionRequest):
    session_id = str(uuid.uuid4())
    state = InterviewState(
        session_id=session_id,
        persona=req.persona,
        topic_focus=req.topic_focus,
        max_questions=req.max_questions,
    )
    state._last_touched = time.time()

    topic = pick_next_topic(state)
    logger.info(f"[{session_id}] New session created, first topic: {topic}")

    question = await get_next_question(topic, state.difficulty, state.persona, [], None)
    state.current_topic = topic
    state.current_question = question
    
    save_session_state(session_id, state)

    return StartSessionResponse(
        session_id=session_id,
        question=question,
        difficulty=state.difficulty,
        question_number=1,
    )


@app.post("/interview/answer", response_model=SubmitAnswerResponse)
async def submit_answer(req: SubmitAnswerRequest):
    state = get_session_state(req.session_id)
    if not state:
        raise HTTPException(404, "Session not found — it may have ended or the server restarted")

    state._last_touched = time.time()
    logger.info(f"[{req.session_id}] Answer received for topic={state.current_topic}")

    try:
        evaluation = evaluate_answer(
            state.current_topic, state.current_question["description"],
            req.answer, state.persona,
        )
    except ValueError as e:
        logger.error(f"[{req.session_id}] Evaluator JSON parse failed: {e}")
        raise HTTPException(502, f"Evaluation failed — model returned unparseable output: {e}")
    except Exception as e:
        logger.exception(f"[{req.session_id}] Unexpected error during evaluation")
        raise HTTPException(500, f"Unexpected evaluation error: {type(e).__name__}: {e}")

    apply_evaluation(state, evaluation, state.current_topic, req.answer)
    logger.info(f"[{req.session_id}] Score={evaluation['score']} difficulty->{state.difficulty} "
                f"locked_topic={state.locked_topic}")

    if state.question_count >= state.max_questions:
        report = build_report(state)
        delete_session_state(req.session_id)
        logger.info(f"[{req.session_id}] Session complete")
        return SubmitAnswerResponse(done=True, evaluation=evaluation, report=report)

    next_topic = pick_next_topic(state)
    target_weak = pick_target_weak_area(state, next_topic)
    next_question = await get_next_question(
        next_topic, state.difficulty, state.persona, state.asked_questions, target_weak,
    )
    state.current_topic = next_topic
    state.current_question = next_question

    save_session_state(req.session_id, state)

    return SubmitAnswerResponse(
        done=False,
        evaluation=evaluation,
        next_question=next_question,
        difficulty=state.difficulty,
        topic_locked=state.locked_topic is not None,
        locked_topic=state.locked_topic,
        question_number=state.question_count + 1,
    )


@app.get("/interview/session/{session_id}", response_model=SessionStateResponse)
def get_session_state_endpoint(session_id: str):
    state = get_session_state(session_id)
    if not state:
        raise HTTPException(404, "Session not found")
    return SessionStateResponse(
        session_id=state.session_id,
        persona=state.persona,
        difficulty=state.difficulty,
        question_count=state.question_count,
        max_questions=state.max_questions,
        locked_topic=state.locked_topic,
        weak_areas={k: v.dict() if hasattr(v, 'dict') else v for k, v in state.weak_areas.items()},
        topic_performance=state.topic_performance,
    )


@app.delete("/interview/session/{session_id}")
def end_session_early(session_id: str):
    state = get_session_state(session_id)
    if not state:
        raise HTTPException(404, "Session not found")
    
    delete_session_state(session_id)
    return {"ended": True, "report": build_report(state)}


@app.get("/health")
def health():
    return {"status": "ok"}


def build_report(state: InterviewState) -> dict:
    by_topic = {}
    for entry in state.performance_history:
        by_topic.setdefault(entry["topic"], []).append(entry["score"])
    
    weak_areas_sorted = {}
    for topic_tag, w_area in state.weak_areas.items():
        severity = w_area.severity if hasattr(w_area, 'severity') else w_area.get('severity', 0.0)
        weak_areas_sorted[topic_tag] = severity

    return {
        "avg_by_topic": {t: round(sum(s) / len(s), 1) for t, s in by_topic.items()},
        "top_weak_areas": sorted(
            weak_areas_sorted.items(),
            key=lambda x: -x[1],
        )[:5],
        "score_progression": [e["score"] for e in state.performance_history],
        "performance_history": state.performance_history,
    }