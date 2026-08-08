# adaptive_interview/router.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from AIBuddyMode.state import InterviewState
from AIBuddyMode.logic import pick_next_topic, pick_target_weak_area, apply_evaluation
from AIBuddyMode.questionGeneration import get_next_question
from AIBuddyMode.evaluator import evaluate_answer

router = APIRouter(prefix="/interview", tags=["adaptive-interview"])

# In-memory store — swap for Redis/DB in production
SESSIONS: dict[str, InterviewState] = {}

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
    topic = pick_next_topic(state.topic_focus, state.topic_performance)
    question = await get_next_question(topic, state.difficulty, state.persona, [], None)
    state.current_topic = topic
    state.current_question = question
    SESSIONS[req.session_id] = state
    return {"question": question, "difficulty": state.difficulty, "question_number": 1}



@router.post("/answer")
async def submit_answer(req: SubmitAnswerRequest):
    state = SESSIONS.get(req.session_id)
    if not state:
        raise HTTPException(404, "Session not found")

    evaluation = await evaluate_answer(
        state.current_topic, state.current_question["description"], req.answer, state.persona
    )
    apply_evaluation(state, evaluation, state.current_topic, req.answer)

    if state.question_count >= state.max_questions:
        report = build_report(state)
        del SESSIONS[req.session_id]
        return {"done": True, "evaluation": evaluation, "report": report}

    next_topic = pick_next_topic(state)   # returns locked_topic if set
    target_weak = pick_target_weak_area(state, next_topic)
    next_question = await get_next_question(
        next_topic, state.difficulty, state.persona, state.asked_questions, target_weak
    )
    state.current_topic = next_topic
    state.current_question = next_question

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
    return {
        "avg_by_topic": {t: sum(s) / len(s) for t, s in by_topic.items()},
        "top_weak_areas": sorted(state.weak_areas.items(), key=lambda x: -x[1])[:5],
        "score_progression": [e["score"] for e in state.performance_history],
        "performance_history": state.performance_history,
    }