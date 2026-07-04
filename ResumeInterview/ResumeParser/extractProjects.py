# import re
# from typing import List, Dict, Any
# from collections import defaultdict
# from classes import ResumeProject
# from customtypes import ResumeSectionToLines, TextItems, FeatureSet
# from get_section_lines import get_section_lines_by_keywords
# from common_features import DATE_FEATURE_SETS, get_has_text, is_bold
# from subsections import divide_section_into_subsections
# from feature_scoring_system import get_text_with_highest_feature_score
# from bullent_points import BULLET_POINTS, get_bullet_points_from_lines, get_descriptions_line_idx, separate_words
# from itertools import chain


# COMMON_TECH = [
#     "Python", "Java", "C++", "JavaScript", "TypeScript",
#     "FastAPI", "Django", "Flask", "React", "Node.js", "Node",
#     "LangChain", "LangGraph", "NLP", "TensorFlow", "PyTorch",
#     "SQL", "Postgre", "PostgreSQL", "MongoDB", "Docker", "Kubernetes", "GitHub",
#     "CNN", "OpenCV", "DeepLearning", "Deep Learning", "LSTM", "GRU", "ANN", "RNN",
#     "Scikit-learn", "Scikit", "Keras", "NumPy", "Pandas", "Matplotlib", "Seaborn",
#     "Machine Learning", "MachineLearning", "Data Science", "DataScience", "AI", "Computer Vision", "ComputerVision",
#     "RAFT",
#     "Consistent Hashing",
#     "Redis",
#     "Distributed Systems",
# ]


# def extract_tech_stack(text: str) -> List[str]:
#     tech_found = []

#     # First, try to extract comma-separated tech stacks
#     # Pattern: "Tech1, Tech2, Tech3" or "Tech1,Tech2,Tech3"
#     comma_pattern = r"([A-Za-z][A-Za-z\s\-]+?)(?:\s*,\s*|\s*$)"
#     comma_matches = re.findall(comma_pattern, text)

#     for match in comma_matches:
#         match_clean = match.strip()
#         # Check if this match contains any known tech
#         for tech in COMMON_TECH:
#             if tech.lower() in match_clean.lower():
#                 tech_found.append(tech)
#                 break

#     # Also check for individual tech words
#     for tech in COMMON_TECH:
#         pattern = r"\b" + re.escape(tech) + r"\b"
#         if re.search(pattern, text, re.IGNORECASE) and tech not in tech_found:
#             tech_found.append(tech)

#     return tech_found


# def extract_tech_stack_from_subsection(lines: List[List[Dict[str, Any]]]) -> List[str]:
#     subsection_text = " ".join(
#         item["text"]
#         for line in lines
#         for item in line
#     )
#     return extract_tech_stack(subsection_text)


# def clean_project_name(text: str, tech_stack: List[str]) -> str:
#     clean_text = text

#     for tech in tech_stack:
#         # Use boundaries that treat '-' as part of a word so that tech
#         # terms embedded inside hyphenated compounds (e.g. "AI" inside
#         # "AI-Integrated") are NOT stripped out.
#         pattern = r"(?<![A-Za-z0-9\-])" + re.escape(tech) + r"(?![A-Za-z0-9\-])"
#         clean_text = re.sub(
#             pattern,
#             "",
#             clean_text,
#             flags=re.IGNORECASE
#         )

#     # Remove common separators and clean up
#     clean_text = re.sub(r"[,\|]+", " ", clean_text)

#     # Remove leftover leading/trailing dashes created by stripped tech terms
#     clean_text = re.sub(r"^\s*-+\s*", "", clean_text)
#     clean_text = re.sub(r"\s*-+\s*$", "", clean_text)

#     clean_text = re.sub(r"\s+", " ", clean_text).strip()

#     # Remove "GitHub" and "Link" if they appear
#     clean_text = re.sub(r"\bGitHub\b", "", clean_text, flags=re.IGNORECASE)
#     clean_text = re.sub(r"\bLink\b", "", clean_text, flags=re.IGNORECASE)

#     # Strip common project-label prefixes
#     clean_text = re.sub(r'^\s*project\s*[:\-]\s*', '', clean_text, flags=re.IGNORECASE)
#     clean_text = re.sub(r'^\s*project\s+', '', clean_text, flags=re.IGNORECASE)

#     # Clean up extra spaces again
#     clean_text = re.sub(r"\s+", " ", clean_text).strip()

#     return clean_text


# def clean_project_date(text: str) -> str:
#     cleaned = re.sub(r'^\s*(date|duration)\s*[:\-]\s*', '', text, flags=re.IGNORECASE).strip()
#     return re.sub(r'\s+', ' ', cleaned).strip()


# def strip_project_prefix(text: str) -> str:
#     return re.sub(r'^\s*project\s*[:\-]\s*', '', text, flags=re.IGNORECASE).strip()


# def is_tech_metadata_line(text: str) -> bool:
#     normalized = strip_project_prefix(text).strip()
#     if not normalized:
#         return False

#     lower = normalized.lower()
#     metadata_prefixes = [
#         "tech stack", "techstack", "tech:", "tech", "stack:", "stack",
#         "tools:", "tools", "tools used", "technologies:", "technologies",
#         "technology:", "technology", "date:", "date", "duration:", "duration",
#         "platform:", "platform",
#     ]

#     if any(lower.startswith(prefix) for prefix in metadata_prefixes):
#         return True

#     # Match multi-word / hyphenated COMMON_TECH entries first (e.g. "Consistent
#     # Hashing", "Deep Learning") and remove them from consideration so the
#     # remaining single-word check isn't penalized for "using up" two words
#     # on one tech term.
#     remaining = lower
#     multiword_matches = 0
#     for tech in COMMON_TECH:
#         if " " in tech or "-" in tech:
#             pattern = r'\b' + re.escape(tech.lower()) + r'\b'
#             if re.search(pattern, remaining):
#                 multiword_matches += 1
#                 remaining = re.sub(pattern, ' ', remaining)

#     # Total word count is computed on the ORIGINAL line (so multi-word tech
#     # terms still count toward the denominator correctly).
#     total_words = len([w for w in re.split(r'[^A-Za-z0-9\+]+', lower) if w])

#     remaining_words = [w for w in re.split(r'[^A-Za-z0-9\+]+', remaining) if w]
#     single_word_matches = sum(
#         1 for word in remaining_words
#         if any(
#             word.lower() == tech.lower()
#             for tech in COMMON_TECH
#             if " " not in tech and "-" not in tech
#         )
#     )

#     tech_matches = multiword_matches + single_word_matches

#     if total_words == 0:
#         return False

#     return tech_matches >= max(2, total_words // 2)


# def is_valid_project_title(text: str) -> bool:
#     name = strip_project_prefix(text).strip()
#     if not name:
#         return False
#     if name[0].islower():
#         return False
#     if re.search(r'[-,]$', name):
#         return False
#     if re.search(r'\.$', name) and len(name.split()) <= 3:
#         return False
#     if len(name.split()) > 10:
#         return False
#     if is_tech_metadata_line(name):
#         return False
#     return True


# def is_project_header_line(line: List[Dict[str, Any]]) -> bool:
#     if not line:
#         return False
#     text = " ".join(item["text"] for item in line).strip()
#     if not text:
#         return False
#     if text.lstrip().startswith(tuple(BULLET_POINTS + ['-', '*', '•', '∙', '⋅'])):
#         return False
#     if text.lower().startswith("project:"):
#         return True
#     return is_valid_project_title(text)


# def is_date_text(text: str) -> bool:
#     normalized = strip_project_prefix(text).lower()
#     if re.search(r'(?:19|20)\d{2}', normalized):
#         return True
#     if any(month.lower() in normalized for month in [
#         'january', 'february', 'march', 'april', 'may', 'june',
#         'july', 'august', 'september', 'october', 'november', 'december',
#         'summer', 'fall', 'spring', 'winter', 'present', 'current'
#     ]):
#         return True
#     return False


# def split_project_section_into_subsections(lines: List[List[Dict[str, Any]]]):
#     subsections = []
#     current = []

#     for line in lines:
#         if is_project_header_line(line) and current:
#             subsections.append(current)
#             current = [line]
#         else:
#             current.append(line)

#     if current:
#         subsections.append(current)

#     if len(subsections) == 1:
#         return divide_section_into_subsections(lines)

#     return subsections


# def extract_project(sections: ResumeSectionToLines) -> Dict[str, Any]:
#     projects: List[ResumeProject] = []
#     projects_scores: List[Dict[str, Any]] = []

#     # Get project section lines
#     lines = get_section_lines_by_keywords(sections, ["project"])
#     subsections = split_project_section_into_subsections(lines)

#     # Process each project subsection
#     for subsection_lines in subsections:

#         # Get descriptions line index
#         descriptions_line_idx = get_descriptions_line_idx(subsection_lines)
#         if descriptions_line_idx is None:
#             descriptions_line_idx = 1

#         # Include metadata-only header lines such as Date or Tech Stack
#         while (
#             descriptions_line_idx < len(subsection_lines)
#             and (
#                 is_tech_metadata_line(" ".join(item["text"] for item in subsection_lines[descriptions_line_idx]))
#                 or is_date_text(" ".join(item["text"] for item in subsection_lines[descriptions_line_idx]))
#             )
#         ):
#             descriptions_line_idx += 1

#         # Extract header info (project name, date)
#         subsection_info_text_items = list(
#             chain.from_iterable(subsection_lines[:descriptions_line_idx])
#         )

#         # Extract date
#         date, date_scores = get_text_with_highest_feature_score(
#             subsection_info_text_items,
#             DATE_FEATURE_SETS
#         )
#         date = clean_project_date(date)

#         PROJECT_FEATURE_SETS: List[FeatureSet] = [
#             (is_bold, 2),
#             (get_has_text(date), -4),
#         ]

#         # Extract raw project text
#         project_raw, project_scores = get_text_with_highest_feature_score(
#             subsection_info_text_items,
#             PROJECT_FEATURE_SETS,
#             False
#         )

#         # If a valid project title exists in the header, prefer it.
#         candidate_titles = [
#             item["text"]
#             for item in subsection_info_text_items
#             if is_valid_project_title(item["text"])
#         ]
#         if candidate_titles:
#             project_raw = candidate_titles[0]

#         # Extract tech stack from header/summary text, but EXCLUDE the chosen
#         # title text itself. Otherwise tech-like substrings inside the title
#         # (e.g. "AI" inside "AI-Integrated Mock Interview Platform") would be
#         # pulled into tech_stack and then stripped out of the title.
#         non_title_items = [
#             item for item in subsection_info_text_items
#             if item["text"].strip() != project_raw.strip()
#         ]
#         header_text = " ".join(item["text"] for item in non_title_items)
#         tech_stack = extract_tech_stack(header_text)
#         if not tech_stack:
#             tech_stack = extract_tech_stack_from_subsection(subsection_lines)

#         project = clean_project_name(project_raw, tech_stack)
#         project = separate_words(project)
#         descriptions_lines = subsection_lines[descriptions_line_idx:]
#         descriptions = [d for d in get_bullet_points_from_lines(descriptions_lines) if d.strip()]

#         if not is_valid_project_title(project_raw):
#             if projects:
#                 previous_project = projects[-1]
#                 if date and not previous_project.get("date"):
#                     previous_project["date"] = date
#                 previous_project["techStack"] = list(set(previous_project.get("techStack", []) + tech_stack))
#                 previous_project["descriptions"].extend(descriptions)
#             continue

#         project_entry: ResumeProject = {
#             "project": project,
#             "techStack": tech_stack,
#             "date": date,
#             "descriptions": descriptions,
#         }

#         projects.append(project_entry)

#         projects_scores.append({
#             "projectScores": project_scores,
#             "dateScores": date_scores,
#         })

#     return {
#         "projects": projects,
#         # "projectsScores": projects_scores,
#     }

import re
from typing import List, Dict, Any, Optional, Tuple
from collections import defaultdict
from ResumeParser.classes import ResumeProject
from ResumeParser.customtypes import ResumeSectionToLines, TextItems, FeatureSet
from ResumeParser.get_section_lines import get_section_lines_by_keywords
from ResumeParser.common_features import DATE_FEATURE_SETS, get_has_text, is_bold
from ResumeParser.subsections import divide_section_into_subsections
from ResumeParser.feature_scoring_system import get_text_with_highest_feature_score
from ResumeParser.bullent_points import BULLET_POINTS, get_bullet_points_from_lines, get_descriptions_line_idx, separate_words
from itertools import chain


COMMON_TECH = [
    "Python", "Java", "C++", "JavaScript", "TypeScript",
    "FastAPI", "Django", "Flask", "React", "Node.js", "Node",
    "LangChain", "LangGraph", "NLP", "TensorFlow", "PyTorch",
    "SQL", "Postgre", "PostgreSQL", "MongoDB", "Docker", "Kubernetes", "GitHub",
    "CNN", "OpenCV", "DeepLearning", "Deep Learning", "LSTM", "GRU", "ANN", "RNN",
    "Scikit-learn", "Scikit", "Keras", "NumPy", "Pandas", "Matplotlib", "Seaborn",
    "Machine Learning", "MachineLearning", "Data Science", "DataScience", "AI", "Computer Vision", "ComputerVision",
    "RAFT",
    "Consistent Hashing",
    "Redis",
    "Distributed Systems",
    "GCN", "TCN", "Attention", "Time Series",
]


# Trailing words that often appear after a tech-stack list as a hyperlink
# label (e.g. "... | Python, FastAPI, NLP Code" where "Code" links to GitHub).
TRAILING_LINK_WORDS = ["code", "github", "link", "demo", "repo", "live", "view"]


def _strip_trailing_link_word(text: str) -> str:
    """Remove a trailing hyperlink-label word like 'Code' / 'GitHub' / 'Link'."""
    stripped = text.rstrip()
    words = stripped.split()
    if words and words[-1].lower() in TRAILING_LINK_WORDS:
        stripped = " ".join(words[:-1]).rstrip()
    return stripped.rstrip(" |").rstrip()


def split_title_and_techstack_line(text: str) -> Optional[Tuple[str, str]]:
    """
    Detect a single-line header of the form:

        "<Title> | <Tech1>, <Tech2>, ... [Code|GitHub|Link]"

    and split it into (title, tech_stack_text). Returns None if the line
    doesn't look like this pattern (no '|' separator).
    """
    if "|" not in text:
        return None

    parts = text.split("|", 1)
    if len(parts) != 2:
        return None

    title_part = parts[0].strip()
    tech_part = _strip_trailing_link_word(parts[1].strip())

    if not title_part:
        return None

    return title_part, tech_part


def extract_tech_stack(text: str) -> List[str]:
    tech_found = []

    # First, try to extract comma-separated tech stacks
    # Pattern: "Tech1, Tech2, Tech3" or "Tech1,Tech2,Tech3"
    comma_pattern = r"([A-Za-z][A-Za-z\s\-]+?)(?:\s*,\s*|\s*$)"
    comma_matches = re.findall(comma_pattern, text)

    for match in comma_matches:
        match_clean = match.strip()
        # Check if this match contains any known tech
        for tech in COMMON_TECH:
            if tech.lower() in match_clean.lower():
                tech_found.append(tech)
                break

    # Also check for individual tech words
    for tech in COMMON_TECH:
        pattern = r"\b" + re.escape(tech) + r"\b"
        if re.search(pattern, text, re.IGNORECASE) and tech not in tech_found:
            tech_found.append(tech)

    return tech_found


def extract_tech_stack_from_subsection(lines: List[List[Dict[str, Any]]]) -> List[str]:
    subsection_text = " ".join(
        item["text"]
        for line in lines
        for item in line
    )
    return extract_tech_stack(subsection_text)


def clean_project_name(text: str, tech_stack: List[str]) -> str:
    clean_text = text

    for tech in tech_stack:
        # Use boundaries that treat '-' as part of a word so that tech
        # terms embedded inside hyphenated compounds (e.g. "AI" inside
        # "AI-Integrated") are NOT stripped out.
        pattern = r"(?<![A-Za-z0-9\-])" + re.escape(tech) + r"(?![A-Za-z0-9\-])"
        clean_text = re.sub(
            pattern,
            "",
            clean_text,
            flags=re.IGNORECASE
        )

    # Remove common separators and clean up
    clean_text = re.sub(r"[,\|]+", " ", clean_text)

    # Remove leftover leading/trailing dashes created by stripped tech terms
    clean_text = re.sub(r"^\s*-+\s*", "", clean_text)
    clean_text = re.sub(r"\s*-+\s*$", "", clean_text)

    clean_text = re.sub(r"\s+", " ", clean_text).strip()

    # Remove "GitHub" and "Link" if they appear
    clean_text = re.sub(r"\bGitHub\b", "", clean_text, flags=re.IGNORECASE)
    clean_text = re.sub(r"\bLink\b", "", clean_text, flags=re.IGNORECASE)
    clean_text = re.sub(r"\bCode\b", "", clean_text, flags=re.IGNORECASE)

    # Strip common project-label prefixes
    clean_text = re.sub(r'^\s*project\s*[:\-]\s*', '', clean_text, flags=re.IGNORECASE)
    clean_text = re.sub(r'^\s*project\s+', '', clean_text, flags=re.IGNORECASE)

    # Clean up extra spaces again
    clean_text = re.sub(r"\s+", " ", clean_text).strip()

    return clean_text


def clean_project_date(text: str) -> str:
    cleaned = re.sub(r'^\s*(date|duration)\s*[:\-]\s*', '', text, flags=re.IGNORECASE).strip()
    return re.sub(r'\s+', ' ', cleaned).strip()


def strip_project_prefix(text: str) -> str:
    return re.sub(r'^\s*project\s*[:\-]\s*', '', text, flags=re.IGNORECASE).strip()


def is_tech_metadata_line(text: str) -> bool:
    normalized = strip_project_prefix(text).strip()
    if not normalized:
        return False

    lower = normalized.lower()
    metadata_prefixes = [
        "tech stack", "techstack", "tech:", "tech", "stack:", "stack",
        "tools:", "tools", "tools used", "technologies:", "technologies",
        "technology:", "technology", "date:", "date", "duration:", "duration",
        "platform:", "platform",
    ]

    if any(lower.startswith(prefix) for prefix in metadata_prefixes):
        return True

    # Match multi-word / hyphenated COMMON_TECH entries first (e.g. "Consistent
    # Hashing", "Deep Learning") and remove them from consideration so the
    # remaining single-word check isn't penalized for "using up" two words
    # on one tech term.
    remaining = lower
    multiword_matches = 0
    for tech in COMMON_TECH:
        if " " in tech or "-" in tech:
            pattern = r'\b' + re.escape(tech.lower()) + r'\b'
            if re.search(pattern, remaining):
                multiword_matches += 1
                remaining = re.sub(pattern, ' ', remaining)

    # Total word count is computed on the ORIGINAL line (so multi-word tech
    # terms still count toward the denominator correctly).
    total_words = len([w for w in re.split(r'[^A-Za-z0-9\+]+', lower) if w])

    remaining_words = [w for w in re.split(r'[^A-Za-z0-9\+]+', remaining) if w]
    single_word_matches = sum(
        1 for word in remaining_words
        if any(
            word.lower() == tech.lower()
            for tech in COMMON_TECH
            if " " not in tech and "-" not in tech
        )
    )

    tech_matches = multiword_matches + single_word_matches

    if total_words == 0:
        return False

    return tech_matches >= max(2, total_words // 2)


def is_valid_project_title(text: str) -> bool:
    name = strip_project_prefix(text).strip()
    if not name:
        return False

    # A "<Title> | <TechStack> [Code]" line is always a valid title line:
    # the title portion (before '|') is what we check, not the full line.
    split_result = split_title_and_techstack_line(name)
    if split_result is not None:
        title_part, _ = split_result
        name = title_part

    if name[0].islower():
        return False
    if re.search(r'[-,]$', name):
        return False
    if re.search(r'\.$', name) and len(name.split()) <= 3:
        return False
    if len(name.split()) > 10:
        return False
    if is_tech_metadata_line(name):
        return False
    return True


def is_project_header_line(line: List[Dict[str, Any]]) -> bool:
    if not line:
        return False
    text = " ".join(item["text"] for item in line).strip()
    if not text:
        return False
    if text.lstrip().startswith(tuple(BULLET_POINTS + ['-', '*', '•', '∙', '⋅'])):
        return False
    if text.lower().startswith("project:"):
        return True
    return is_valid_project_title(text)


def is_date_text(text: str) -> bool:
    normalized = strip_project_prefix(text).lower()
    if re.search(r'(?:19|20)\d{2}', normalized):
        return True
    if any(month.lower() in normalized for month in [
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december',
        'summer', 'fall', 'spring', 'winter', 'present', 'current'
    ]):
        return True
    return False


def split_project_section_into_subsections(lines: List[List[Dict[str, Any]]]):
    subsections = []
    current = []

    for line in lines:
        if is_project_header_line(line) and current:
            subsections.append(current)
            current = [line]
        else:
            current.append(line)

    if current:
        subsections.append(current)

    if len(subsections) == 1:
        return divide_section_into_subsections(lines)

    return subsections


def extract_project(sections: ResumeSectionToLines) -> Dict[str, Any]:
    projects: List[ResumeProject] = []
    projects_scores: List[Dict[str, Any]] = []

    # Get project section lines
    lines = get_section_lines_by_keywords(sections, ["project"])
    subsections = split_project_section_into_subsections(lines)

    # Process each project subsection
    for subsection_lines in subsections:

        # ── Special case: "<Title> | <TechStack> [Code]" single-line header ──
        # If the first line of this subsection matches this pattern, extract
        # the title and tech stack directly from it, then treat the rest of
        # the subsection lines as descriptions.
        first_line_text = ""
        if subsection_lines:
            first_line_text = " ".join(item["text"] for item in subsection_lines[0]).strip()

        inline_split = split_title_and_techstack_line(first_line_text) if first_line_text else None

        if inline_split is not None and is_valid_project_title(first_line_text):
            title_part, tech_part = inline_split

            date, date_scores = get_text_with_highest_feature_score(
                subsection_lines[0],
                DATE_FEATURE_SETS
            )
            date = clean_project_date(date)

            tech_stack = extract_tech_stack(tech_part)
            if not tech_stack:
                tech_stack = extract_tech_stack_from_subsection(subsection_lines)

            project = clean_project_name(title_part, [])
            project = separate_words(project)

            descriptions_lines = subsection_lines[1:]
            descriptions = [d for d in get_bullet_points_from_lines(descriptions_lines) if d.strip()]

            project_entry: ResumeProject = {
                "project": project,
                "techStack": tech_stack,
                "date": date,
                "descriptions": descriptions,
            }

            projects.append(project_entry)
            projects_scores.append({
                "projectScores": [],
                "dateScores": date_scores,
            })
            continue

        # ── Default path (multi-line headers) ──

        # Get descriptions line index
        descriptions_line_idx = get_descriptions_line_idx(subsection_lines)
        if descriptions_line_idx is None:
            descriptions_line_idx = 1

        # Include metadata-only header lines such as Date or Tech Stack
        while (
            descriptions_line_idx < len(subsection_lines)
            and (
                is_tech_metadata_line(" ".join(item["text"] for item in subsection_lines[descriptions_line_idx]))
                or is_date_text(" ".join(item["text"] for item in subsection_lines[descriptions_line_idx]))
            )
        ):
            descriptions_line_idx += 1

        # Extract header info (project name, date)
        subsection_info_text_items = list(
            chain.from_iterable(subsection_lines[:descriptions_line_idx])
        )

        # Extract date
        date, date_scores = get_text_with_highest_feature_score(
            subsection_info_text_items,
            DATE_FEATURE_SETS
        )
        date = clean_project_date(date)

        PROJECT_FEATURE_SETS: List[FeatureSet] = [
            (is_bold, 2),
            (get_has_text(date), -4),
        ]

        # Extract raw project text
        project_raw, project_scores = get_text_with_highest_feature_score(
            subsection_info_text_items,
            PROJECT_FEATURE_SETS,
            False
        )

        # If a valid project title exists in the header, prefer it.
        candidate_titles = [
            item["text"]
            for item in subsection_info_text_items
            if is_valid_project_title(item["text"])
        ]
        if candidate_titles:
            project_raw = candidate_titles[0]

        # If the chosen title itself is a "<Title> | <TechStack> [Code]" line,
        # split it now so the tech stack doesn't get treated as part of the name.
        title_split = split_title_and_techstack_line(project_raw)
        inline_tech_stack: List[str] = []
        if title_split is not None:
            project_raw, tech_part = title_split
            inline_tech_stack = extract_tech_stack(tech_part)

        # Extract tech stack from header/summary text, but EXCLUDE the chosen
        # title text itself. Otherwise tech-like substrings inside the title
        # (e.g. "AI" inside "AI-Integrated Mock Interview Platform") would be
        # pulled into tech_stack and then stripped out of the title.
        non_title_items = [
            item for item in subsection_info_text_items
            if item["text"].strip() != project_raw.strip()
        ]
        header_text = " ".join(item["text"] for item in non_title_items)
        tech_stack = extract_tech_stack(header_text)
        if not tech_stack:
            tech_stack = extract_tech_stack_from_subsection(subsection_lines)

        if inline_tech_stack:
            tech_stack = list(dict.fromkeys(inline_tech_stack + tech_stack))

        project = clean_project_name(project_raw, [] if inline_tech_stack else tech_stack)
        project = separate_words(project)
        descriptions_lines = subsection_lines[descriptions_line_idx:]
        descriptions = [d for d in get_bullet_points_from_lines(descriptions_lines) if d.strip()]

        if not is_valid_project_title(project_raw):
            if projects:
                previous_project = projects[-1]
                if date and not previous_project.get("date"):
                    previous_project["date"] = date
                previous_project["techStack"] = list(set(previous_project.get("techStack", []) + tech_stack))
                previous_project["descriptions"].extend(descriptions)
            continue

        project_entry: ResumeProject = {
            "project": project,
            "techStack": tech_stack,
            "date": date,
            "descriptions": descriptions,
        }

        projects.append(project_entry)

        projects_scores.append({
            "projectScores": project_scores,
            "dateScores": date_scores,
        })

    return {
        "projects": projects,
        # "projectsScores": projects_scores,
    }