# api.py
import uuid
import time
import logging
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(debug_router)

SESSIONS: dict[str, InterviewState] = {}
SESSION_TIMEOUT_SECONDS = 3600  # NEW — 1 hour of inactivity


def cleanup_stale_sessions():
    """NEW — removes sessions untouched for over an hour. Guards against
    orphaned sessions from dev-mode double-mounts, abandoned tabs, or
    crashed clients piling up in memory indefinitely."""
    now = time.time()
    stale_ids = [
        sid for sid, state in SESSIONS.items()
        if now - getattr(state, "_last_touched", now) > SESSION_TIMEOUT_SECONDS
    ]
    for sid in stale_ids:
        logger.info(f"Cleaning up stale session: {sid}")
        del SESSIONS[sid]


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
    cleanup_stale_sessions()  # NEW

    session_id = str(uuid.uuid4())
    state = InterviewState(
        session_id=session_id,
        persona=req.persona,
        topic_focus=req.topic_focus,
        max_questions=req.max_questions,
    )
    state._last_touched = time.time()  # NEW

    topic = pick_next_topic(state)
    logger.info(f"[{session_id}] New session created, first topic: {topic}")  # log line lets you confirm no duplicates on reload

    question = await get_next_question(topic, state.difficulty, state.persona, [], None)
    state.current_topic = topic
    state.current_question = question
    SESSIONS[session_id] = state

    return StartSessionResponse(
        session_id=session_id,
        question=question,
        difficulty=state.difficulty,
        question_number=1,
    )


@app.post("/interview/answer", response_model=SubmitAnswerResponse)
async def submit_answer(req: SubmitAnswerRequest):
    state = SESSIONS.get(req.session_id)
    if not state:
        raise HTTPException(404, "Session not found — it may have ended or the server restarted")

    state._last_touched = time.time()  # NEW
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
        del SESSIONS[req.session_id]
        logger.info(f"[{req.session_id}] Session complete")
        return SubmitAnswerResponse(done=True, evaluation=evaluation, report=report)

    next_topic = pick_next_topic(state)
    target_weak = pick_target_weak_area(state, next_topic)
    next_question = await get_next_question(
        next_topic, state.difficulty, state.persona, state.asked_questions, target_weak,
    )
    state.current_topic = next_topic
    state.current_question = next_question

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
def get_session_state(session_id: str):
    state = SESSIONS.get(session_id)
    if not state:
        raise HTTPException(404, "Session not found")
    return SessionStateResponse(
        session_id=state.session_id,
        persona=state.persona,
        difficulty=state.difficulty,
        question_count=state.question_count,
        max_questions=state.max_questions,
        locked_topic=state.locked_topic,
        weak_areas={k: v.dict() for k, v in state.weak_areas.items()},
        topic_performance=state.topic_performance,
    )


@app.delete("/interview/session/{session_id}")
def end_session_early(session_id: str):
    if session_id not in SESSIONS:
        raise HTTPException(404, "Session not found")
    state = SESSIONS.pop(session_id)
    return {"ended": True, "report": build_report(state)}


@app.get("/health")
def health():
    return {"status": "ok"}


def build_report(state: InterviewState) -> dict:
    by_topic = {}
    for entry in state.performance_history:
        by_topic.setdefault(entry["topic"], []).append(entry["score"])
    return {
        "avg_by_topic": {t: round(sum(s) / len(s), 1) for t, s in by_topic.items()},
        "top_weak_areas": sorted(
            [(k, v.severity) for k, v in state.weak_areas.items()],
            key=lambda x: -x[1],
        )[:5],
        "score_progression": [e["score"] for e in state.performance_history],
        "performance_history": state.performance_history,
    }