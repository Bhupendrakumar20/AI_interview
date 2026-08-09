# debug_router.py
import time
import requests
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from llm_fallback import generate_with_fallback, OLLAMA_URL, MODEL_NAME
from questionGeneration import clean_question_text, generate_question, RUBRICS
from evaluator import extract_json, evaluate_answer, looks_truncated
from taxonomy import SUBTOPIC_TAGS

debug_router = APIRouter(prefix="/debug", tags=["debug"])


class RawPromptRequest(BaseModel):
    prompt: str
    temperature: float = 0.3


@debug_router.get("/ollama-health")
def check_ollama_health():
    """Confirms Ollama specifically is reachable — this checks ONLY the local
    model, not the fallback chain. If Ollama is down, /interview/answer will
    still work via Gemini/Groq, but this endpoint will report unreachable."""
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


@debug_router.get("/fallback-chain-health")
def check_fallback_chain_health():
    """Checks all three providers in the fallback chain and reports which
    ones are actually usable right now — Ollama reachability, and whether
    GOOGLE_API_KEY / GROQ_API_KEY are set at all. Doesn't burn a real
    generation call on the cloud providers, just checks config presence."""
    import os

    ollama_status = {"reachable": False, "error": None}
    try:
        resp = requests.get("http://localhost:11434/api/tags", timeout=5)
        resp.raise_for_status()
        ollama_status["reachable"] = True
        models = [m["name"] for m in resp.json().get("models", [])]
        ollama_status["configured_model_available"] = MODEL_NAME in models
    except Exception as e:
        ollama_status["error"] = str(e)

    gemini_key_set = bool(
        os.environ.get("GOOGLE_API_KEY") or os.environ.get("GOOGLE_GENERATIVE_AI_API_KEY")
    )
    groq_key_set = bool(os.environ.get("GROQ_API_KEY"))

    return {
        "ollama": ollama_status,
        "gemini": {"api_key_configured": gemini_key_set},
        "groq": {"api_key_configured": groq_key_set},
        "fallback_order": ["ollama", "gemini", "groq"],
        "will_work_if_ollama_down": gemini_key_set or groq_key_set,
    }


@debug_router.post("/raw-ollama-call")
def raw_ollama_call(req: RawPromptRequest):
    """Sends a prompt through the FULL fallback chain (Ollama -> Gemini ->
    Groq) and returns the raw text plus which provider actually answered.
    Use this to see if a model is rambling, wrapping JSON in markdown, or
    silently falling back to a cloud provider when you expected local."""
    start = time.time()
    try:
        result = generate_with_fallback(req.prompt, temperature=req.temperature)
    except RuntimeError as e:
        raise HTTPException(502, f"All LLM providers failed: {e}")
    elapsed = round(time.time() - start, 2)
    return {
        "raw_response": result["text"],
        "answered_by": result["source"],  # "ollama" | "gemini" | "groq"
        "response_length_chars": len(result["text"]),
        "elapsed_seconds": elapsed,
    }


@debug_router.post("/test-question-generation")
def test_question_generation(topic: str, difficulty: float = 5.0,
                               persona: str = "Hiring Manager"):
    """Runs the real generate_question() path — shows the final cleaned
    question plus which provider in the fallback chain answered."""
    result = generate_question(topic, difficulty, persona, asked=[], target_weak_area=None)
    return result


@debug_router.post("/test-evaluator")
def test_evaluator(topic: str, question: str, answer: str,
                     persona: str = "Hiring Manager"):
    """Runs the real evaluate_answer() path, including the fallback chain
    and JSON repair/retry logic. If this 500s, the error message includes
    the raw text that failed to parse."""
    try:
        result = evaluate_answer(topic, question, answer, persona)
        return result
    except ValueError as e:
        raise HTTPException(422, f"LLM did not return parseable JSON: {e}")
    except RuntimeError as e:
        raise HTTPException(502, f"All LLM providers failed: {e}")


@debug_router.post("/raw-evaluator-response")
def raw_evaluator_response(topic: str, question: str, answer: str,
                             persona: str = "Hiring Manager"):
    """Same evaluator prompt as the real thing, sent through the full
    fallback chain, returned BEFORE extract_json() touches it — the most
    useful endpoint when debugging why parsing keeps failing or whether
    truncation is happening."""
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
{{"criterion_scores": {{}}, "weak_tags": [{{"criterion": "...", "tag": "..."}}], "feedback": "..."}}"""

    try:
        result = generate_with_fallback(prompt, temperature=0.2, num_predict=1024)
    except RuntimeError as e:
        raise HTTPException(502, f"All LLM providers failed: {e}")

    raw = result["text"]

    parse_error = None
    parsed = None
    try:
        parsed = extract_json(raw)
    except ValueError as e:
        parse_error = str(e)

    return {
        "prompt_sent": prompt,
        "answered_by": result["source"],
        "raw_response": raw,
        "appears_truncated": looks_truncated(raw),
        "parsed_successfully": parse_error is None,
        "parsed_result": parsed,
        "parse_error": parse_error,
    }