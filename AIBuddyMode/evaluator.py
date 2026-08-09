# evaluator.py
import json
import re
import logging
from AIBuddyMode.llm_fallback import generate_with_fallback
from AIBuddyMode.questionGeneration import RUBRICS
from AIBuddyMode.taxonomy import SUBTOPIC_TAGS, WEAK_THRESHOLD
from AIBuddyMode.scoring import normalize_tag

logger = logging.getLogger("adaptive_interview")


def looks_truncated(raw: str) -> bool:
    cleaned = raw.strip().replace("```json", "").replace("```", "").strip()
    return cleaned.count("{") != cleaned.count("}") or not cleaned.endswith("}")


def extract_json(raw: str) -> dict:
    raw = raw.strip().replace("```json", "").replace("```", "")
    match = re.search(r'\{.*\}', raw, re.DOTALL)
    if not match:
        raise ValueError(f"No JSON object found in LLM response: {raw[:300]}")

    candidate = match.group(0)
    try:
        return json.loads(candidate)
    except json.JSONDecodeError:
        pass

    repaired = _repair_json(candidate)
    try:
        return json.loads(repaired)
    except json.JSONDecodeError as e:
        raise ValueError(f"Malformed JSON even after repair. Error: {e}. Raw: {candidate[:500]}")


def _repair_json(text: str) -> str:
    text = re.sub(r',\s*([}\]])', r'\1', text)
    text = re.sub(r"'([a-zA-Z_][a-zA-Z0-9_ ]*)'\s*:", r'"\1":', text)
    text = re.sub(r':\s*\'([^\']*)\'', r': "\1"', text)
    text = re.sub(r'([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:', r'\1"\2":', text)
    return text


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
Keep any "note" field under 8 words.

{{"criterion_scores": {{}}, "weak_tags": [{{"criterion": "...", "tag": "..."}}], "feedback": "1 sentence, max 20 words"}}"""

    result = generate_with_fallback(prompt, temperature=0.2, num_predict=1024)
    raw = result["text"]
    logger.info(f"[evaluator] topic={topic} source={result['source']}")

    if looks_truncated(raw) and _retry:
        logger.warning("Evaluator response appears truncated, retrying with higher token budget")
        retry_result = generate_with_fallback(prompt, temperature=0.2, num_predict=2048)
        raw = retry_result["text"]

    try:
        parsed = extract_json(raw)
    except ValueError as e:
        if _retry:
            retry_prompt = prompt + f"\n\nYour previous response was cut off or invalid: {e}\nReturn ONLY the complete, valid JSON object — be concise."
            retry_result = generate_with_fallback(retry_prompt, temperature=0.2, num_predict=1024)
            parsed = extract_json(retry_result["text"])
        else:
            raise ValueError(f"Did not get parseable JSON after retries: {e}. Raw: {raw[:400]}")

    raw_scores = parsed.get("criterion_scores", {})
    clean_scores = {}
    for k, v in raw_scores.items():
        try:
            clean_scores[k] = float(v)
        except (TypeError, ValueError):
            continue
    parsed["criterion_scores"] = clean_scores

    if not clean_scores:
        logger.warning(f"No usable criterion_scores from LLM for topic={topic}, defaulting to 5.0")
        parsed["score"] = 5.0
    elif isinstance(criteria, dict):
        weighted_score = sum(clean_scores.get(c, 5.0) * w for c, w in criteria.items())
        parsed["score"] = round(weighted_score, 1)
    else:
        parsed["score"] = round(sum(clean_scores.values()) / len(clean_scores), 1)

    for w in parsed.get("weak_tags", []):
        tag = w.get("tag", f"general {topic}")
        if isinstance(tag, list):
            tag = tag[0] if tag else f"general {topic}"
        if not isinstance(tag, str):
            tag = str(tag)
        w["tag"] = normalize_tag(tag, topic)

        criterion = w.get("criterion", "")
        if isinstance(criterion, list):
            criterion = criterion[0] if criterion else ""
        crit_score = clean_scores.get(criterion, WEAK_THRESHOLD)
        w["severity"] = round(WEAK_THRESHOLD - crit_score + 1, 1)

    parsed["llm_source"] = result["source"]  # optional, for debugging
    return parsed