from rapidfuzz import fuzz
from typing import Dict

from ResumeParser.classes import ResumeKey
from ResumeParser.customtypes import Line, Lines, ResumeSectionToLines
from ResumeParser.common_features import (
    has_letter_and_is_all_upper_case,
    has_only_letters_spaces_ampersands,
    is_bold,
)

PROFILE_SECTION: ResumeKey = "profile"

SECTION_TITLE_PRIMARY_KEYWORDS = [
    "experience",
    "education",
    "project",
    "skill",
    "achievement",
    "certification",
]

SECTION_TITLE_SECONDARY_KEYWORDS = [
    "job",
    "course",
    "extracurricular",
    "objective",
    "summary",
    "award",
    "honor",
    "project",
    "accomplishment",
    "credential",
    "recognition",
]

SECTION_TITLE_KEYWORDS = [
    *SECTION_TITLE_PRIMARY_KEYWORDS,
    *SECTION_TITLE_SECONDARY_KEYWORDS,
]

# Sections that must ideally exist
EXPECTED_SECTIONS = [
    "experience",
    "education",
    "skills",
    "projects",
    "certifications",
    "achievement",
]


def group_lines_into_sections(lines: Lines) -> ResumeSectionToLines:
    """
    Step 3. Group lines into sections
    """
    sections: ResumeSectionToLines = {}

    section_name: str = PROFILE_SECTION
    section_lines = []

    for i, line in enumerate(lines):

        text = line[0]["text"].strip() if line else ""

        if is_section_title(line, i):

            sections[section_name] = section_lines[:]

            section_name = text
            section_lines = []

        else:
            section_lines.append(line)

    if section_lines:
        sections[section_name] = section_lines[:]

    # ---------------------------------------------------
    # Apply fuzzy correction only if sections are missing
    # ---------------------------------------------------
    sections = correct_missing_sections(sections)

    return sections


def is_section_title(line: Line, line_number: int) -> bool:

    is_first_two_lines = line_number < 2
    has_more_than_one_item_in_line = len(line) > 1
    has_no_item_in_line = len(line) == 0

    if (
        is_first_two_lines
        or has_more_than_one_item_in_line
        or has_no_item_in_line
    ):
        return False

    text_item = line[0]

    if is_bold(text_item) and has_letter_and_is_all_upper_case(text_item):
        return True

    text = text_item["text"].strip()

    text_has_at_most_2_words = (
        len([s for s in text.split(" ") if s != "&"]) <= 2
    )

    starts_with_capital_letter = (
        text and text[0].isupper()
    )

    if (
        text_has_at_most_2_words
        and has_only_letters_spaces_ampersands(text_item)
        and starts_with_capital_letter
        and any(
            keyword in text.lower()
            for keyword in SECTION_TITLE_KEYWORDS
        )
    ):
        return True

    return False


def correct_missing_sections(
    sections: ResumeSectionToLines,
    threshold: int = 80
) -> ResumeSectionToLines:
    """
    Example:

    Experiance -> experience
    Educaton -> education

    Only executed if expected sections are missing.
    """

    detected_sections = {
        section.lower()
        for section in sections.keys()
        if section.lower() in EXPECTED_SECTIONS
    }

    missing_sections = (
        set(EXPECTED_SECTIONS)
        - detected_sections
    )

    if not missing_sections:
        return sections

    corrected_sections: ResumeSectionToLines = {}

    for section_name, section_lines in sections.items():

        section_lower = section_name.lower()

        # Already valid
        if section_lower in EXPECTED_SECTIONS:
            corrected_sections[section_lower] = section_lines
            continue

        best_match = None
        best_score = 0

        # Compare only against missing sections
        for missing_section in missing_sections:

            score = fuzz.ratio(
                section_lower,
                missing_section
            )

            if score > best_score:
                best_score = score
                best_match = missing_section

        if best_match and best_score >= threshold:

            print(
                f"[SECTION FIX] "
                f"{section_name} -> {best_match} "
                f"(score={best_score:.1f})"
            )

            corrected_sections[best_match] = section_lines

            missing_sections.remove(best_match)

        else:
            corrected_sections[section_name] = section_lines

    return corrected_sections