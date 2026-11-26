from __future__ import annotations

import re
from pathlib import Path

import pymupdf as fitz


SECTION_HEADINGS = {
    "education": {
        "education",
        "education background",
        "academic background",
        "academic history",
        "academic qualifications",
        "education and training",
    },
    "skills": {
        "skills",
        "technical skills",
        "core skills",
        "key skills",
        "skills and technologies",
        "technical competencies",
        "core competencies",
        "competencies",
        "technologies",
        "technology stack",
    },
    "projects": {
        "projects",
        "project experience",
        "selected projects",
        "personal projects",
        "academic projects",
    },
}

SECTION_LABELS = {
    "education": "Education",
    "skills": "Skills",
    "projects": "Projects",
}

OTHER_SECTION_HEADINGS = {
    "summary",
    "professional summary",
    "objective",
    "profile",
    "experience",
    "work experience",
    "professional experience",
    "employment history",
    "certifications",
    "certificates",
    "achievements",
    "awards",
    "publications",
    "volunteer experience",
    "references",
}


def _normalize_heading(value: str) -> str:
    value = value.strip().strip(":|")
    value = re.sub(r"\s*&\s*", " and ", value)
    return re.sub(r"\s+", " ", value).lower()


def _match_section_heading(line: str) -> tuple[str | None, str]:
    cleaned = line.strip().lstrip("•*-–—· \t")
    normalized = _normalize_heading(cleaned)
    for section, aliases in SECTION_HEADINGS.items():
        if normalized in aliases:
            return section, ""

    for separator in (":", " | ", " - ", " – ", " — "):
        if separator not in cleaned:
            continue
        heading, remainder = cleaned.split(separator, 1)
        normalized_heading = _normalize_heading(heading)
        for section, aliases in SECTION_HEADINGS.items():
            if normalized_heading in aliases and remainder.strip():
                return section, remainder.strip()

    for section, aliases in SECTION_HEADINGS.items():
        for alias in sorted(aliases, key=len, reverse=True):
            if normalized.startswith(alias) and len(normalized) > len(alias):
                next_character = normalized[len(alias)]
                if next_character.isspace() or next_character in "-–—":
                    return section, ""
    return None, ""


def _is_other_section_heading(line: str) -> bool:
    cleaned = line.strip().lstrip("•*-–—· \t")
    normalized = _normalize_heading(cleaned)
    if normalized in OTHER_SECTION_HEADINGS:
        return True

    for separator in (":", " | ", " - ", " – ", " — "):
        if separator in cleaned:
            heading = _normalize_heading(cleaned.split(separator, 1)[0])
            if heading in OTHER_SECTION_HEADINGS:
                return True
    return False


def validate_resume_text(text: str) -> dict:
    section_content = {section: False for section in SECTION_HEADINGS}
    current_section = None

    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            continue

        section, inline_content = _match_section_heading(line)
        if section:
            current_section = section
            if inline_content:
                section_content[section] = True
            continue

        if _is_other_section_heading(line):
            current_section = None
            continue

        if current_section and re.search(r"[A-Za-z0-9]", line):
            section_content[current_section] = True

    missing_sections = [
        SECTION_LABELS[section]
        for section, has_content in section_content.items()
        if not has_content
    ]
    valid = not missing_sections
    if valid:
        message = "Resume validated. Education, Skills, and Projects each contain at least one entry."
    else:
        message = (
            "This PDF could not be validated as a resume. Add a heading and at least one entry "
            f"for each required section: {', '.join(missing_sections)}."
        )

    return {
        "valid": valid,
        "sections": section_content,
        "missingSections": missing_sections,
        "message": message,
    }


def validate_resume_pdf(file_path: str | Path) -> dict:
    try:
        with fitz.open(file_path) as document:
            if document.is_encrypted:
                return {
                    "valid": False,
                    "sections": {section: False for section in SECTION_HEADINGS},
                    "missingSections": list(SECTION_LABELS.values()),
                    "message": "This PDF is password-protected. Upload an unlocked resume PDF.",
                }
            text = "\n".join(page.get_text("text", sort=True) for page in document)
    except (fitz.FileDataError, OSError) as error:
        raise ValueError("The uploaded file is not a readable PDF.") from error

    return validate_resume_text(text)
