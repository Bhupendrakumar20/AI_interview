from typing import Dict, Any, List
import re
from ResumeParser.get_section_lines import get_section_lines_by_keywords


def clean_and_split_skills(raw_texts: List[str]) -> List[str]:
    """
    Cleans and splits skills:
    - Removes category prefixes (before :)
    - Splits multiple skills in one line
    - Strips whitespace
    """
    skills = []

    for text in raw_texts:
        # Remove category prefix (e.g., "Programming: Python")
        if ":" in text:
            text = text.split(":", 1)[1]

        # Split by common separators
        parts = re.split(r",|•|\||-", text)

        for part in parts:
            cleaned = part.strip()
            if cleaned:
                skills.append(cleaned)

    return skills


def extract_skills(sections) -> Dict[str, Any]:
    """
    Extract all skills as a single flat cleaned list.
    """

    # Get skill section lines
    lines = get_section_lines_by_keywords(sections, ["skill"])

    # Flatten text items
    raw_texts = [
        item["text"].strip()
        for line in lines
        for item in line
        if item["text"].strip()
    ]

    # Clean and split skills
    skills_list = clean_and_split_skills(raw_texts)

    # Optional: remove duplicates while preserving order
    seen = set()
    unique_skills = []
    for skill in skills_list:
        if skill not in seen:
            seen.add(skill)
            unique_skills.append(skill)

    return {
        "skills": unique_skills
    }