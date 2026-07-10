# debug_router.py
import time
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import requests

from questionGeneration import call_ollama, clean_question_text, OLLAMA_URL, MODEL_NAME, generate_question,RUBRICS
from evaluator import extract_json, evaluate_answer
from taxonomy import  SUBTOPIC_TAGS

debug_router = APIRouter(prefix="/debug", tags=["debug"])


class RawPromptRequest(BaseModel):
    prompt: str
    temperature: float = 0.3


@debug_router.get("/ollama-health")
def check_ollama_health():
    """Confirms Ollama is reachable before running anything else — check this
    first whenever a test hangs or times out."""
    try:
        start = time.time()
        resp = requests.get("http://localhost:11434/api/tags", timeout=5)
        elapsed = round(time.time() - start, 2)
        resp.raise_for_status()
        models = [m["name"] for m in resp.json().get("models", [])]
        return {
            "reachable": True,
            "response_time_seconds": elapsed,
            "available_models": models,
            "configured_model": MODEL_NAME,
            "configured_model_available": MODEL_NAME in models,
        }
    except requests.exceptions.ConnectionError:
        raise HTTPException(503, "Ollama is not running or not reachable at localhost:11434")
    except requests.exceptions.Timeout:
        raise HTTPException(504, "Ollama is running but not responding within 5s")


@debug_router.post("/raw-ollama-call")
def raw_ollama_call(req: RawPromptRequest):
    """Send any prompt straight to Ollama and see the completely unprocessed
    response — use this to check if a model is rambling, wrapping JSON in
    markdown, or adding preamble before you blame your parsing code."""
    start = time.time()
    try:
        raw = call_ollama(req.prompt, temperature=req.temperature)
    except requests.exceptions.ReadTimeout:
        raise HTTPException(504, "Ollama call timed out after 30s — check /debug/ollama-health")
    elapsed = round(time.time() - start, 2)
    return {
        "raw_response": raw,
        "response_length_chars": len(raw),
        "elapsed_seconds": elapsed,
    }


@debug_router.post("/test-question-generation")
def test_question_generation(topic: str, difficulty: float = 5.0,
                               persona: str = "Hiring Manager"):
    """Runs the real generate_question() path and shows BOTH the raw Ollama
    output and the cleaned final question, so you can see exactly what
    clean_question_text() is stripping."""
    
    result = generate_question(topic, difficulty, persona, asked=[], target_weak_area=None)
    return result


@debug_router.post("/test-evaluator")
def test_evaluator(topic: str, question: str, answer: str,
                     persona: str = "Hiring Manager"):
    """Runs the real evaluate_answer() path. If this 500s with a JSON parse
    error, the error message will include the raw text that failed to parse —
    check that first before assuming the code is broken."""
    try:
        result = evaluate_answer(topic, question, answer, persona)
        return result
    except ValueError as e:
        raise HTTPException(422, f"Ollama did not return parseable JSON: {e}")


@debug_router.post("/raw-evaluator-response")
def raw_evaluator_response(topic: str, question: str, answer: str,
                             persona: str = "Hiring Manager"):
    """Same evaluator prompt as the real thing, but returns the raw text
    BEFORE extract_json() touches it — the single most useful endpoint when
    debugging why parsing keeps failing."""
   

    criteria = RUBRICS.get(topic, "overall correctness and clarity")
    tag_options = SUBTOPIC_TAGS.get(topic, [])
    prompt = f"""You are a {persona} evaluating a candidate's interview answer.

Topic: {topic}
Question: {question}
Candidate's answer: {answer}

Score these criteria independently, 1-10: {criteria}

For any criterion you score 5 or below, attach the closest matching concept tag
from this list: {tag_options}
If nothing on the list fits, write "general {topic}".

Return ONLY valid JSON, no markdown fences, no preamble:
{{"criterion_scores": {{}}, "weak_tags": [{{"criterion": "...", "tag": "...", "note": "..."}}], "feedback": "..."}}"""

    raw = call_ollama(prompt, temperature=0.2)

    parse_error = None
    parsed = None
    try:
        parsed = extract_json(raw)
    except ValueError as e:
        parse_error = str(e)

    return {
        "prompt_sent": prompt,
        "raw_response": raw,
        "parsed_successfully": parse_error is None,
        "parsed_result": parsed,
        "parse_error": parse_error,
    }