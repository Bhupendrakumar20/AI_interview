# adaptive_interview/logic.py
import random
from state import InterviewState, WeakArea
from taxonomy import LOCK_THRESHOLD

def update_difficulty(current: float, score: float, k: float = 0.4) -> float:
    expected = 6.5
    delta = (score - expected) / 10
    return round(max(1.0, min(10.0, current + k * delta * 10)), 1)

def decay_weak_areas(weak_areas: dict[str, WeakArea], decay: float = 0.4) -> dict[str, WeakArea]:
    result = {}
    for tag, w in weak_areas.items():
        w.severity = round(max(0.0, w.severity - decay), 2)
        if w.severity > 0.3:
            result[tag] = w
    return result

def pick_next_topic(state: InterviewState) -> str:
    """Locked topic overrides everything else — this is what gives 'only
    this topic' behavior when a weakness is severe enough."""
    if state.locked_topic:
        return state.locked_topic

    weights = []
    for topic in state.topic_focus:
        scores = state.topic_performance.get(topic, [])
        avg = sum(scores) / len(scores) if scores else 5.0
        weights.append(max(1.0, 10 - avg))
    return random.choices(state.topic_focus, weights=weights, k=1)[0]

def pick_target_weak_area(state: InterviewState, topic: str) -> str | None:
    relevant = {tag: w for tag, w in state.weak_areas.items() if w.topic == topic}
    if not relevant:
        return None
    return max(relevant.items(), key=lambda kv: kv[1].severity)[0]

def apply_evaluation(state: InterviewState, evaluation: dict, topic: str, answer: str) -> InterviewState:
    state.difficulty = update_difficulty(state.difficulty, evaluation["score"])
    state.weak_areas = decay_weak_areas(state.weak_areas)

    for w in evaluation["weak_tags"]:
        existing = state.weak_areas.get(w["tag"])
        if existing:
            existing.severity += w["severity"]
            existing.occurrences += 1
        else:
            state.weak_areas[w["tag"]] = WeakArea(
                severity=w["severity"], topic=topic, occurrences=1
            )

    state.topic_performance.setdefault(topic, []).append(evaluation["score"])
    state.asked_questions.append(state.current_question["description"])
    state.performance_history.append({
        "topic": topic,
        "question": state.current_question["description"],
        "answer": answer,
        "score": evaluation["score"],
        "criterion_scores": evaluation["criterion_scores"],
        "weak_tags": [w["tag"] for w in evaluation["weak_tags"]],
        "feedback": evaluation["feedback"],
    })
    state.question_count += 1

    _update_lock_state(state, topic, evaluation["score"])
    return state

def _update_lock_state(state: InterviewState, topic: str, score: float):
    """Engage lock: any weak area in this topic crosses LOCK_THRESHOLD.
    Release lock: 2 consecutive good scores (>=7) in the locked topic."""
    if state.locked_topic == topic:
        if score >= 7:
            state.lock_recovery_streak += 1
        else:
            state.lock_recovery_streak = 0
        if state.lock_recovery_streak >= 2:
            state.locked_topic = None
            state.lock_recovery_streak = 0
        return

    worst_in_topic = max(
        (w.severity for w in state.weak_areas.values() if w.topic == topic),
        default=0,
    )
    if worst_in_topic >= LOCK_THRESHOLD:
        state.locked_topic = topic
        state.lock_recovery_streak = 0