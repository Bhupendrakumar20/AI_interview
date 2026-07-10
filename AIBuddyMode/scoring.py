# adaptive_interview/scoring.py
import re
from rapidfuzz import process, fuzz
from taxonomy import SUBTOPIC_TAGS

# Common abbreviations/word-forms that character-similarity can't bridge on its own.
# Add to this as you see more LLM output drift in practice.
ALIASES = {
    "dsa": {
        "dp": "dynamic programming",
        "recursive": "recursion",
        "recursively": "recursion",
        "hashmap": "hash tables",
        "hash map": "hash tables",
        "hashing": "hash tables",
        "bfs": "graphs",
        "dfs": "graphs",
        "big o": "time complexity",
    },
    "system design": {
        "lb": "load balancing",
        "cache invalidation": "caching",
    },
    "core cs": {
        "os": "process scheduling",
        "networking": "tcp/ip",
    },
}


def normalize_tag(raw_tag: str, topic: str, min_score: int = 70) -> str:

    if isinstance(raw_tag, list):
        raw_tag = raw_tag[0] if raw_tag else f"general {topic}"
    if not isinstance(raw_tag, str):
        raw_tag = str(raw_tag)
    raw_lower = raw_tag.strip().lower()
    for alias, canonical in ALIASES.get(topic, {}).items():
        if re.search(rf'\b{re.escape(alias)}\b', raw_lower):
            return canonical
    candidates = SUBTOPIC_TAGS.get(topic, [])
    if not candidates:
        return raw_lower

    match = process.extractOne(raw_lower, candidates, scorer=fuzz.token_set_ratio)
    if match and match[1] >= min_score:
        return match[0]

    match = process.extractOne(raw_lower, candidates, scorer=fuzz.partial_ratio)
    if match and match[1] >= min_score:
        return match[0]

    return f"general {topic}"