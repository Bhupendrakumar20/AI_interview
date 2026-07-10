
import json
import re
from questionGeneration import  RUBRICS
from taxonomy import SUBTOPIC_TAGS, WEAK_THRESHOLD
from scoring import normalize_tag
import requests


# evaluator.py
import json
import re
OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "gemma3:4b"

def call_ollama(prompt: str, temperature: float = 0.3, num_predict: int = 1024) -> str:
    """Single shared Ollama call — used by both question generation and evaluation.
    Matches the /api/generate endpoint you're already using elsewhere (not /api/chat)."""
    response = requests.post(
        OLLAMA_URL,
        json={
            "model": MODEL_NAME,
            "prompt": prompt,
            "stream": False,
            "options": {"temperature": temperature, "top_p": 0.9, "num_predict": num_predict},
        },
    )
    response.raise_for_status()
    try:
        return response.json()["response"]
    except ValueError:
        text = response.text.strip()
        match = re.search(r"\{.*\}", text, flags=re.DOTALL)
        if match:
            return json.loads(match.group(0))["response"]
        raise


def extract_json(raw: str) -> dict:
    raw = raw.strip().replace("```json", "").replace("```", "")
    match = re.search(r'\{.*\}', raw, re.DOTALL)
    if not match:
        raise ValueError(f"No JSON object found in Ollama response: {raw[:300]}")

    candidate = match.group(0)

    try:
        return json.loads(candidate)
    except json.JSONDecodeError:
        pass  # fall through to repair attempts below

    repaired = _repair_json(candidate)
    try:
        return json.loads(repaired)
    except json.JSONDecodeError as e:
        raise ValueError(
            f"Ollama returned malformed JSON even after repair attempt. "
            f"Error: {e}. Raw candidate: {candidate[:500]}"
        )


def _repair_json(text: str) -> str:
    """Fixes the most common ways llama3 breaks JSON syntax:
    Python-dict single quotes, trailing commas, and unquoted keys."""
    # Remove trailing commas before } or ]
    text = re.sub(r',\s*([}\]])', r'\1', text)
    text = re.sub(r"'([a-zA-Z_][a-zA-Z0-9_ ]*)'\s*:", r'"\1":', text)  # keys
    text = re.sub(r':\s*\'([^\']*)\'', r': "\1"', text)                # simple values

    # Quote bare/unquoted keys (e.g. {criterion_scores: ...} -> {"criterion_scores": ...})
    text = re.sub(r'([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:', r'\1"\2":', text)

    return text

def looks_truncated(raw: str) -> bool:
    """A truncated JSON object won't have balanced braces, and won't end
    with a closing brace after stripping whitespace/fences."""
    cleaned = raw.strip().replace("```json", "").replace("```", "").strip()
    return cleaned.count("{") != cleaned.count("}") or not cleaned.endswith("}")

def evaluate_answer(topic: str, question: str, answer: str, persona: str, _retry: bool = True) -> dict:
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

Return ONLY valid JSON using double quotes, no trailing commas, no markdown fences, no preamble.
Keep the "note" field under 8 words.

{{"criterion_scores": {{}}, "weak_tags": [{{"criterion": "...", "tag": "...", "note": "short phrase, max 8 words"}}], "feedback": "1 sentence, max 20 words"}}"""

    raw = call_ollama(prompt, temperature=0.2,num_predict=1024)
    if looks_truncated(raw) and _retry:
        #logger.warning("Evaluator response appears truncated, retrying with higher token budget")
        raw = call_ollama(prompt, temperature=0.2, num_predict=2048)


    try:
        result = extract_json(raw)
    except ValueError as e:
        if _retry:
            # one retry with an explicit correction nudge, since llama3 sometimes
            # self-corrects when told directly what it got wrong
            retry_prompt = prompt + f"\n\nYour previous attempt failed to parse as JSON: {e}\nReturn ONLY the corrected valid JSON object this time."
            raw_retry = call_ollama(retry_prompt, temperature=0.2)
            result = extract_json(raw_retry)  # let this raise if it fails again
        else:
            raise

    weights = {c: 1 / len(result["criterion_scores"]) for c in result["criterion_scores"]} \
        if isinstance(criteria, str) else criteria
    weighted_score = sum(result["criterion_scores"].get(c, 5) * w for c, w in weights.items())
    result["score"] = round(weighted_score, 1)

    for w in result.get("weak_tags", []):
        w["tag"] = normalize_tag(w.get("tag", f"general {topic}"), topic)
        criterion = w.get("criterion", "")
        if isinstance(criterion, list):
            criterion = criterion[0] if criterion else ""
        crit_score = result["criterion_scores"].get(criterion, WEAK_THRESHOLD)
        w["severity"] = round(WEAK_THRESHOLD - crit_score + 1, 1)

    return result