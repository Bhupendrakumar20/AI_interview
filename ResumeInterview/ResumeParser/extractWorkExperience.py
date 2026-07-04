import re
from typing import List, Dict, Any, Optional
from ResumeParser.classes import ResumeWorkExperience
from ResumeParser.customtypes import ResumeSectionToLines, TextItem, FeatureSet
from ResumeParser.get_section_lines import get_section_lines_by_keywords
from ResumeParser.common_features import DATE_FEATURE_SETS, has_number, get_has_text, is_bold, has_year, has_month
from ResumeParser.subsections import divide_section_into_subsections
from ResumeParser.feature_scoring_system import get_text_with_highest_feature_score
from ResumeParser.bullent_points import (
    BULLET_POINTS,
    get_bullet_points_from_lines,
    get_descriptions_line_idx,
    has_at_least_8_words,
    separate_words,
)

# Work experience section keywords.
#
# IMPORTANT — do NOT add bare "professional" here.
# It is a substring of "Professional Summary", "Professional Profile", etc.,
# which would cause summary/profile section content to be pulled into work
# experience parsing.  The phrase "professional experience" (below) is
# sufficient to catch "Professional Experience" section headers.
WORK_EXPERIENCE_KEYWORDS_LOWERCASE = [
    "work experience",
    "work history",
    "professional experience",
    "employment",
    "experience",
    "history",
    "job",
]

# Section names that must NEVER be treated as work-experience sections even
# if they happen to contain one of the keywords above (e.g. a section named
# "Career History & Summary" contains "history" but is not a job list).
_WORK_EXPERIENCE_SECTION_BLOCKLIST = {
    "summary", "objective", "profile", "about", "bio",
    "introduction", "overview", "statement",
    "career summary", "career objective",
    "professional summary", "professional profile",
    "personal statement",
}

JOB_TITLES = [
    "Accountant", "Administrator", "Advisor", "Agent", "Analyst",
    "Apprentice", "Architect", "Assistant", "Associate", "Auditor",
    "Bartender", "Biologist", "Bookkeeper", "Buyer", "Carpenter",
    "Cashier", "CEO", "Clerk", "Co-op", "Co-Founder", "Consultant",
    "Coordinator", "CTO", "Developer", "Designer", "Director", "Driver",
    "Editor", "Electrician", "Engineer", "Extern", "Founder", "Freelancer",
    "Head", "Intern", "Janitor", "Journalist", "Laborer", "Lawyer", "Lead",
    "Manager", "Mechanic", "Member", "Nurse", "Officer", "Operator",
    "Operation", "Photographer", "President", "Producer", "Recruiter",
    "Representative", "Researcher", "Sales", "Server", "Scientist",
    "Specialist", "Supervisor", "Teacher", "Technician", "Trader",
    "Trainee", "Treasurer", "Tutor", "Vice", "VP", "Volunteer",
    "Webmaster", "Worker",
]

# Words that indicate work location/mode, not company names
WORK_LOCATION_WORDS = {
    "remote", "on-site", "onsite", "hybrid", "in-person", "contract",
    "freelance", "part-time", "full-time", "temporary", "volunteer",
}


def has_job_title(item: TextItem) -> bool:
    words = item["text"].split()
    return any(job_title in words for job_title in JOB_TITLES)


def has_more_than_5_words(item: TextItem) -> bool:
    return len(item["text"].split()) > 5


def is_work_location_word(item: TextItem) -> bool:
    """Penalize generic location/mode words being mistaken for company names."""
    return item["text"].strip().lower() in WORK_LOCATION_WORDS


def clean_work_date(text: str) -> str:
    cleaned = re.sub(r'^\s*(date|duration)\s*[:\-]\s*', '', text, flags=re.IGNORECASE).strip()
    return re.sub(r'\s+', ' ', cleaned).strip()


def normalize_bullet_text(text: str) -> str:
    return re.sub(r'^[\s\-\–\•\*]+\s*', '', text).strip()


def split_company_date(text: str) -> tuple[str, str]:
    text = text.strip()
    date_start = re.search(
        r'\b(' +
        r'Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|'
        r'Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|Present|Current|[12]\d{3}'
        r')\b',
        text,
        re.IGNORECASE,
    )
    if not date_start:
        return text, ''

    company_part = text[:date_start.start()].strip(' ,;-–—')
    date_part = text[date_start.start():].strip()
    return company_part, date_part


def candidate_is_title_line(candidate: str, company: str) -> bool:
    if not candidate or not company:
        return False
    candidate = normalize_bullet_text(candidate)
    company = company.strip()
    if not candidate or not company:
        return False

    company_words = [w for w in re.split(r'[^A-Za-z0-9]+', company) if w]
    candidate_words = [w for w in re.split(r'[^A-Za-z0-9]+', candidate) if w]

    if len(company_words) >= 2 and len(candidate_words) >= 2:
        if company_words[:3] == candidate_words[:3]:
            return any(job_title in candidate_words for job_title in JOB_TITLES)

    return False


def _line_text(line: List[dict]) -> str:
    return " ".join(item["text"] for item in line).strip()


# Words that, when a line ENDS with them, signal the next line is a continuation
# even if that next line starts with an uppercase letter.
# e.g. "...management platform using" → "Python, Django, and React."
_DANGLING_TRAILING_WORDS = {
    "using", "and", "or", "with", "of", "in", "for", "from", "to",
    "a", "an", "the", "by", "on", "at", "as", "via",
    "including", "such", "like", "through", "across", "within",
    "between", "among", "over", "during",
}


def _prev_line_dangles(prev_line: List[dict]) -> bool:
    """Return True when prev_line ends with a connector word → next line is a wrap."""
    text = _line_text(prev_line)
    if not text:
        return False
    last_word = text.rstrip().rstrip(".,;:").split()[-1].lower() if text.strip() else ""
    return last_word in _DANGLING_TRAILING_WORDS


def _is_continuation_line(line: List[dict], prev_line: List[dict] = None) -> bool:
    """
    Returns True when a line is a wrapped continuation of the previous sentence
    rather than the start of a new work-experience header.

    First-char heuristics:
    - Starts with digit / comma → numeric/stat wrap   e.g. "50,000 daily…"
    - Starts with lowercase     → mid-sentence wrap   e.g. "full-stack platform…"
    - Starts with bullet symbol → description line

    Context-aware (requires prev_line):
    - Previous line ends with a dangling connector (using / and / or / with / …)
      → current line is a continuation even if it starts with an uppercase letter.
      e.g. prev="…platform using"   curr="Python, Django, and React."
    """
    text = _line_text(line)
    if not text:
        return False

    first_char = text[0]

    if first_char.isdigit() or first_char == ',':
        return True
    if first_char.islower():
        return True
    if any(text.startswith(b) for b in BULLET_POINTS):
        return True

    # Context-aware: previous line leaves a dangling connector
    if prev_line is not None and _prev_line_dangles(prev_line):
        return True

    return False


def _looks_like_embedded_role(text: str) -> Optional[Dict[str, str]]:
    """
    Detect a pattern like:
      "Google Developer Group, IIIT Surat   Jan 2025 – Present   Google Developer Group Lead"
    embedded inside a bullet-point string.

    Returns a dict {company, date, jobTitle, remainder} or None.
    """
    # Pattern: <company text>  <date range>  <job title>
    # Date range: "Jan 2025 – Present", "2023 - 2024", etc.
    pattern = re.compile(
        r'^(?P<company>.+?)\s+'
        r'(?P<date>'
            r'(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|'
            r'Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|[12]\d{3})'
            r'[\s\w–\-]*?'
            r'(?:Present|Current|[12]\d{3})'
        r')\s+'
        r'(?P<title>.+)$',
        re.IGNORECASE,
    )
    m = pattern.match(text.strip())
    if not m:
        return None

    title_words = m.group("title").split()
    if not any(jt in title_words for jt in JOB_TITLES):
        return None

    return {
        "company": m.group("company").strip().rstrip(",;"),
        "date":    m.group("date").strip(),
        "jobTitle": m.group("title").strip(),
    }


def _split_descriptions_for_embedded_roles(
    descriptions: List[str],
) -> List[Dict[str, Any]]:
    """
    Walk through the description bullet list.  When a bullet looks like an
    embedded role header (company + date + title on one line), split it out
    so it becomes a separate work-experience entry.

    Returns a list of "blocks", each either:
      {"type": "desc",  "text": <str>}
      {"type": "role",  "company": .., "date": .., "jobTitle": .., "descriptions": []}
    """
    blocks: List[Dict[str, Any]] = []
    for desc in descriptions:
        role = _looks_like_embedded_role(desc)
        if role:
            blocks.append({"type": "role", **role, "descriptions": []})
        else:
            if blocks and blocks[-1]["type"] == "role":
                blocks[-1]["descriptions"].append(desc)
            else:
                blocks.append({"type": "desc", "text": desc})
    return blocks


JOB_TITLE_FEATURE_SETS: List[FeatureSet] = [
    (has_job_title, 4),
    (has_number, -4),
    (has_more_than_5_words, -2),
]


def subsection_looks_like_header(subsection: List[List[dict]]) -> bool:
    """Return True when the subsection has no bullet descriptions — i.e. it looks like a header block."""
    return get_descriptions_line_idx(subsection) is None


def _sub_has_date(subsection: List[List[dict]]) -> bool:
    """Return True when any line in the subsection contains a date range."""
    text = " ".join(_line_text(l) for l in subsection)
    return bool(re.search(
        r'\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}'
        r'|\b\d{4}\s*[–\-]\s*(?:\d{4}|Present|Current)\b',
        text, re.IGNORECASE
    ))


def _sub_has_bullets(subsection: List[List[dict]]) -> bool:
    return any(
        any(b in item["text"] for b in BULLET_POINTS)
        for line in subsection for item in line
    )


def _is_orphan_job_title_subsection(subsection: List[List[dict]]) -> bool:
    """
    Return True when this subsection is just a job-title line that the Y-gap
    splitter detached from the company/date line above it.

    Conditions (ALL must hold):
    - ≤ 2 lines (it's only a title, nothing else)
    - No date anywhere in those lines
    - No bullet characters
    - First line contains a recognised JOB_TITLES word
    """
    if not subsection or len(subsection) > 2:
        return False
    if _sub_has_date(subsection):
        return False
    if _sub_has_bullets(subsection):
        return False
    first_text = _line_text(subsection[0])
    words = re.split(r'[\s()/,]+', first_text)
    return any(jt in words for jt in JOB_TITLES)


def merge_work_experience_subsections(
    subsections: List[List[List[dict]]],
) -> List[List[List[dict]]]:
    """
    Reassemble raw subsections (produced by the Y-gap / bold splitter) into
    coherent per-job-entry blocks.

    Five rules, applied in priority order for each incoming subsection:

    Rule 1 — Context-aware continuation line
      If the subsection's first line is a wrapped sentence fragment (starts with
      digit/comma/lowercase, OR the previous line ended with a dangling connector
      word like "using", "and", "or"), merge it into the current entry.
      Handles: "50,000 daily active requests."  and  "Python, Django, and React."

    Rule 2 — Orphan job-title subsection
      If the subsection has no date, no bullets, ≤ 2 lines, and its first line
      contains a job-title keyword, the Y-gap splitter detached it from the
      company/date line → merge into the current entry.
      Handles: "Google Developer Group Lead (Promoted from Core Member)"

    Rule 3 — Subsection has a date → new job entry
      A new date-stamped block is always a fresh work-experience entry.
      Flush current, start new.
      Handles: "Google Developer Group, IIIT Surat  Jan 2025 – Present"

    Rule 4 — Subsection has bullets but no date → more descriptions for current job
      Description-only blocks that the splitter split off belong to the current entry.

    Rule 5 — Header-like subsection → new entry only if current already has descriptions
      (Original logic, kept as final fallback.)
    """
    merged_subsections: List[List[List[dict]]] = []
    current_subsection: List[List[dict]] = []

    def current_has_descriptions(lines: List[List[dict]]) -> bool:
        return any(
            any(bullet in item["text"] for bullet in BULLET_POINTS)
            for line in lines for item in line
        ) or any(
            len(line) == 1 and has_at_least_8_words(line[0])
            for line in lines
        )

    for subsection in subsections:
        if not current_subsection:
            current_subsection = list(subsection)
            continue

        first_line = subsection[0] if subsection else []
        prev_line  = current_subsection[-1] if current_subsection else []

        # Rule 1: context-aware continuation
        if first_line and _is_continuation_line(first_line, prev_line):
            current_subsection.extend(subsection)
            continue

        # Rule 2: orphan job-title line
        if _is_orphan_job_title_subsection(subsection):
            current_subsection.extend(subsection)
            continue

        # Rule 3: new date → flush and start fresh
        if _sub_has_date(subsection):
            merged_subsections.append(current_subsection)
            current_subsection = list(subsection)
            continue

        # Rule 4: bullets but no date → more descriptions for current job
        if _sub_has_bullets(subsection):
            current_subsection.extend(subsection)
            continue

        # Rule 5: header-like → new entry only when current already has descriptions
        if subsection_looks_like_header(subsection) and current_has_descriptions(current_subsection):
            merged_subsections.append(current_subsection)
            current_subsection = list(subsection)
        else:
            current_subsection.extend(subsection)

    if current_subsection:
        merged_subsections.append(current_subsection)

    return merged_subsections


def _get_work_experience_lines(sections: ResumeSectionToLines):
    """
    Return lines for the work-experience section, skipping any section whose
    name is in the blocklist (summary, objective, profile, etc.).

    Two-layer defence:
      Layer 1 — keyword list no longer contains bare "professional", so
                "Professional Summary" / "Professional Profile" won't match.
      Layer 2 — blocklist rejects any remaining false positive (e.g. a section
                named "Career History & Summary" contains "history" but is
                clearly not a job list).
    """
    filtered_sections = {
        name: lines
        for name, lines in sections.items()
        if not any(
            blocked in name.lower()
            for blocked in _WORK_EXPERIENCE_SECTION_BLOCKLIST
        )
    }
    return get_section_lines_by_keywords(
        filtered_sections, WORK_EXPERIENCE_KEYWORDS_LOWERCASE
    )


def extract_work_experience(sections: ResumeSectionToLines) -> Dict[str, Any]:
    """
    Extract work experience information from resume sections.
    """
    work_experiences: List[ResumeWorkExperience] = []
    work_experiences_scores: List[Dict[str, Any]] = []

    lines = _get_work_experience_lines(sections)
    subsections = divide_section_into_subsections(lines)
    subsections = merge_work_experience_subsections(subsections)

    print(subsections)

    for subsection_lines in subsections:
        descriptions_line_idx = get_descriptions_line_idx(subsection_lines)
        if descriptions_line_idx is None:
            descriptions_line_idx = 2
        elif descriptions_line_idx == 0 and subsection_lines:
            first_line_text = " ".join(item["text"] for item in subsection_lines[0])
            if (
                has_year({"text": first_line_text})
                or has_month({"text": first_line_text})
                or "present" in first_line_text.lower()
            ):
                descriptions_line_idx = 2

        subsection_info_text_items = [
            item
            for line in subsection_lines[:descriptions_line_idx]
            for item in line
        ]

        # Extract date
        date, date_scores = get_text_with_highest_feature_score(
            subsection_info_text_items, DATE_FEATURE_SETS
        )
        date = clean_work_date(date)

        company_from_date = ""
        if date:
            company_from_date, normalized_date = split_company_date(date)
            if company_from_date and normalized_date:
                date = clean_work_date(normalized_date)

        # Extract job title
        job_title, job_title_scores = get_text_with_highest_feature_score(
            subsection_info_text_items, JOB_TITLE_FEATURE_SETS
        )
        job_title = separate_words(job_title) if job_title else job_title

        # Company feature sets – penalise location/mode words heavily
        COMPANY_FEATURE_SETS: List[FeatureSet] = [
            (is_bold, 2),
            (get_has_text(date), -4),
            (get_has_text(job_title), -4),
            (is_work_location_word, -6),   # ← NEW: kills "Remote", "Hybrid", etc.
        ]

        company, company_scores = get_text_with_highest_feature_score(
            subsection_info_text_items,
            COMPANY_FEATURE_SETS,
            return_empty_string_if_highest_score_is_not_positive=False,
        )
        company = separate_words(company) if company else company

        # If the winning "company" is a bare location word, blank it out
        if company and company.strip().lower() in WORK_LOCATION_WORDS:
            company = ""

        if company_from_date:
            if not company or (date and company.endswith(date)):
                company = company_from_date

        # Extract raw descriptions
        subsection_descriptions_lines = subsection_lines[descriptions_line_idx:]
        raw_descriptions = get_bullet_points_from_lines(subsection_descriptions_lines)

        # Promote first description to job title when title is missing / same as company
        if (not job_title or job_title == company) and raw_descriptions:
            first_desc = normalize_bullet_text(raw_descriptions[0])
            if candidate_is_title_line(first_desc, company):
                job_title = first_desc
                raw_descriptions = raw_descriptions[1:]

        # ── Split out embedded role headers from the description list ──────────
        blocks = _split_descriptions_for_embedded_roles(raw_descriptions)

        # Collect plain descriptions for the primary entry
        primary_descriptions = [
            b["text"] for b in blocks if b["type"] == "desc"
        ]

        work_experience_entry: ResumeWorkExperience = {
            "company": company,
            "jobTitle": job_title,
            "date": date,
            "descriptions": primary_descriptions,
        }
        work_experiences.append(work_experience_entry)
        print("Extracted work experience entry:", work_experience_entry)

        work_experiences_scores.append({
            "companyScores": company_scores,
            "jobTitleScores": job_title_scores,
            "dateScores": date_scores,
        })

        # Create additional entries for any embedded role blocks
        for block in blocks:
            if block["type"] == "role":
                extra_entry: ResumeWorkExperience = {
                    "company": block["company"],
                    "jobTitle": block["jobTitle"],
                    "date": block["date"],
                    "descriptions": block["descriptions"],
                }
                work_experiences.append(extra_entry)
                work_experiences_scores.append({
                    "companyScores": [],
                    "jobTitleScores": [],
                    "dateScores": [],
                })
                print("Extracted embedded role entry:", extra_entry)

    return {
        "workExperiences": work_experiences,
        # "workExperiencesScores": work_experiences_scores,
    }