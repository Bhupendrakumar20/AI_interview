# question_gen.py
import re
import httpx
import logging
from AIBuddyMode.llm_fallback import generate_with_fallback

logger = logging.getLogger("adaptive_interview")

RUBRICS = {
    "dsa": "correctness, time complexity, space complexity, edge case handling",
    "system design": "scalability reasoning, tradeoff articulation, bottleneck identification",
    "behavioral": "STAR structure, specificity of impact, self-awareness",
    "core cs": "conceptual accuracy, depth of explanation",
    "oop": "correct use of OOP principles, design pattern justification",
}


def clean_question_text(raw: str) -> str:
    text = raw.strip()
    text = re.sub(r'^(sure|okay|here\'?s?|certainly)[^:]*:\s*', '', text, flags=re.IGNORECASE)
    text = text.strip('"\'')
    return text.strip()


async def fetch_leetcode_questions(difficulty: str, limit: int = 5) -> list[dict]:
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
    """For system design / behavioral / core cs / oop. Uses the Ollama ->
    Gemini -> Groq fallback chain, so a slow/dead local Ollama doesn't stall
    the whole interview session."""
    weak_line = f'Bias the question toward testing: "{target_weak_area}".' if target_weak_area else ""

    prompt = f"""You are a {persona} interviewing a candidate for an engineering role.

Topic: {topic}
Difficulty target: {difficulty:.1f}/10
Questions already asked (do not repeat or closely rephrase): {asked[-5:]}
{weak_line}

Generate ONE {topic} interview question matching a {persona}'s tone and the difficulty target.
Return ONLY the question text, nothing else — no preamble, no markdown."""

    result = generate_with_fallback(prompt, temperature=0.3, num_predict=300)
    question_text = clean_question_text(result["text"])
    logger.info(f"[question_gen] topic={topic} source={result['source']}")

    return {
        "title": topic.title(),
        "description": question_text,
        "difficulty": difficulty_to_leetcode_label(difficulty),
        "topic": topic,
        "source": "generated",
        "llm_source": result["source"],  # optional, useful for debugging which provider answered
    }


async def get_next_question(topic: str, difficulty: float, persona: str,
                             asked: list[str], target_weak_area: str | None) -> dict:
    if topic in ("dsa", "sql"):
        return await get_dsa_question(difficulty, asked)
    import asyncio
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        None, generate_question, topic, difficulty, persona, asked, target_weak_area
    )