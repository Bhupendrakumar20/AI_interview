# adaptive_interview/question_gen.py
import json
import re
import httpx
import requests

import os

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://127.0.0.1:11434")
if "localhost" in OLLAMA_URL:
    OLLAMA_URL = OLLAMA_URL.replace("localhost", "127.0.0.1")
if not OLLAMA_URL.endswith("/api/generate") and not OLLAMA_URL.endswith("/api/chat"):
    OLLAMA_URL = f"{OLLAMA_URL.rstrip('/')}/api/generate"

MODEL_NAME = os.environ.get("OLLAMA_MODEL", "gemma3:4b")

RUBRICS = {
    "dsa": "correctness, time complexity, space complexity, edge case handling",
    "system design": "scalability reasoning, tradeoff articulation, bottleneck identification",
    "behavioral": "STAR structure, specificity of impact, self-awareness",
    "core cs": "conceptual accuracy, depth of explanation",
    "oop": "correct use of OOP principles, design pattern justification",
}


def call_ollama(prompt: str, temperature: float = 0.3,num_predict: int = 800) -> str:
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
        # If the response is not valid JSON, try to extract the first JSON object.
        match = re.search(r"\{.*\}", text, flags=re.DOTALL)
        if match:
            return json.loads(match.group(0))["response"]
        raise


def clean_question_text(raw: str) -> str:
    """Strip Ollama preamble artifacts — reuse the same cleaner pattern you built
    for ResumeQuestionGeneration, since llama3 tends to prepend
    'Sure, here's a question:' style filler before the actual content."""
    text = raw.strip()
    text = re.sub(r'^(sure|okay|here\'?s?|certainly)[^:]*:\s*', '', text, flags=re.IGNORECASE)
    text = text.strip('"\'')
    return text.strip()


async def fetch_leetcode_questions(difficulty: str, limit: int = 5) -> list[dict]:
    """Difficulty: 'Easy' | 'Medium' | 'Hard'. Uses LeetCode's public GraphQL API."""
    query = """
    query problemsetQuestionList($categorySlug: String, $limit: Int, $filters: QuestionListFilterInput) {
      problemsetQuestionList: questionList(
        categorySlug: $categorySlug, limit: $limit, filters: $filters
      ) {
        questions: data { title titleSlug difficulty topicTags { name } }
      }
    }
    """
    variables = {"categorySlug": "", "limit": limit, "filters": {"difficulty": difficulty.upper()}}
    async with httpx.AsyncClient() as http:
        resp = await http.post(
            "https://leetcode.com/graphql",
            json={"query": query, "variables": variables},
            headers={"Content-Type": "application/json"},
            timeout=10,
        )
        data = resp.json()
        return data["data"]["problemsetQuestionList"]["questions"]


def difficulty_to_leetcode_label(difficulty: float) -> str:
    if difficulty <= 3:
        return "Easy"
    if difficulty <= 7:
        return "Medium"
    return "Hard"


async def get_dsa_question(difficulty: float, asked: list[str]) -> dict:
    label = difficulty_to_leetcode_label(difficulty)
    problems = await fetch_leetcode_questions(label, limit=8)
    unused = [p for p in problems if p["title"] not in asked]
    chosen = (unused or problems)[0]
    return {
        "title": chosen["title"],
        "description": f"{chosen['title']} ({chosen['difficulty']}) — solve on LeetCode: {chosen['titleSlug']}",
        "difficulty": chosen["difficulty"],
        "topic": "dsa",
        "source": "leetcode",
    }


def generate_question(topic: str, difficulty: float, persona: str,
                       asked: list[str], target_weak_area: str | None) -> dict:
    """For system design / behavioral / core cs / oop — Ollama-generated.
    Not async since call_ollama uses requests, not httpx — run in a threadpool
    from the router if you need it non-blocking (see note below)."""
    weak_line = f'Bias the question toward testing: "{target_weak_area}".' if target_weak_area else ""

    prompt = f"""You are a {persona} interviewing a candidate for an engineering role.

Topic: {topic}
Difficulty target: {difficulty:.1f}/10
Questions already asked (do not repeat or closely rephrase): {asked[-5:]}
{weak_line}

Generate ONE {topic} interview question matching a {persona}'s tone and the difficulty target.
Return ONLY the question text, nothing else — no preamble, no markdown."""

    raw_response = call_ollama(prompt)
    question_text = clean_question_text(raw_response)

    return {
        "title": topic.title(),
        "description": question_text,
        "difficulty": difficulty_to_leetcode_label(difficulty),
        "topic": topic,
        "source": "generated",
    }


async def get_next_question(topic: str, difficulty: float, persona: str,
                             asked: list[str], target_weak_area: str | None) -> dict:
    if topic in ("dsa", "sql"):
        return await get_dsa_question(difficulty, asked)
    # generate_question is sync (requests-based) — offload so it doesn't block the event loop
    import asyncio
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        None, generate_question, topic, difficulty, persona, asked, target_weak_area
    )