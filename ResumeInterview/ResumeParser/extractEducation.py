import re
from typing import List, Tuple, Dict, Optional, Any
from collections import defaultdict
from ResumeParser.customtypes import ResumeSectionToLines, TextItems, TextItem, FeatureSet
from ResumeParser.classes import ResumeEducation
from ResumeParser.get_section_lines import get_section_lines_by_keywords
from ResumeParser.subsections import divide_section_into_subsections
from ResumeParser.feature_scoring_system import get_text_with_highest_feature_score
from ResumeParser.bullent_points import get_bullet_points_from_lines, get_descriptions_line_idx, separate_words
from ResumeParser.common_features import has_number, has_letter, has_comma, DATE_FEATURE_SETS

from rapidfuzz import fuzz

KNOWN_DEGREES = [
    "Bachelor of Technology", "Bachelor of Engineering", "Bachelor of Science",
    "Bachelor of Computer Applications", "Bachelor of Commerce", "Bachelor of Arts",
    "Master of Technology", "Master of Engineering", "Master of Science",
    "Master of Computer Applications", "Master of Business Administration",
    "Doctor of Philosophy",
    "B.Tech", "B.E.", "B.Sc", "BCA", "B.Com", "BA",
    "M.Tech", "M.E.", "M.Sc", "MCA", "MBA", "PhD",
]

KNOWN_FIELDS = [
    "Computer Science", "Information Technology", "Artificial Intelligence",
    "Machine Learning", "Data Science", "Data Analytics", "Cyber Security",
    "Software Engineering", "Computer Engineering", "Electronics Engineering",
    "Electronics and Communication", "Electrical Engineering",
    "Mechanical Engineering", "Civil Engineering", "Chemical Engineering",
    "Biomedical Engineering", "Business Administration",
    "Finance", "Marketing", "Accounting", "Mathematics", "Statistics",
    "Physics", "Chemistry", "Biology",
]

SCHOOLS = [
    "College", "University", "Institute", "School", "Academy",
    "BASIS", "Magnet", "MIT", "IIT", "UC", "Stanford", "Harvard",
    "Yale", "Princeton", "Cornell", "Columbia", "Johns Hopkins",
    "Northwestern", "Duke", "Penn", "Caltech", "Carnegie",
]

# Abbreviations short enough to false-positive on substring match
# (e.g. "UC" matches inside "Structures", "Education", "Luck").
# These must use word-boundary matching.
_SCHOOL_ABBREVS = {s for s in SCHOOLS if len(s) <= 4}


def hasSchool(item: dict) -> bool:
    text = item["text"]

    for school in SCHOOLS:
        if school in _SCHOOL_ABBREVS:
            # ── Word-boundary match for short abbreviations ───────────────────
            # Prevents "UC" matching inside "Structures", "Education", etc.
            if re.search(r'\b' + re.escape(school) + r'\b', text, re.IGNORECASE):
                return True
        else:
            # Substring match is fine for longer names (≥5 chars)
            if school.lower() in text.lower():
                return True

    # Fuzzy match each word against every school name
    words = re.findall(r"\w+", text)
    for word in words:
        for school in SCHOOLS:
            if fuzz.ratio(word.lower(), school.lower()) >= 80:
                return True

    # Uppercase heuristic (e.g. "IIIT SURAT" typed in all-caps)
    if (
        len(text) > 0
        and len(text) < 80
        and text.isupper()
        and len(text.split()) <= 3
        and not re.search(r"^\d{4}", text)
        and not re.search(r"^(GPA|CGPA|DEGREE|DATE|GRADE)[\s:\d]*", text, re.IGNORECASE)
    ):
        return True

    return False


DEGREES = ["Associate", "Bachelor", "Master", "PhD", "Ph."]
hasDegree = lambda item: (
    any(degree in item["text"] for degree in DEGREES)
    or bool(re.search(r"\b[ABM][\.Ss]\.?(c|tech|a|e|eng)?\.?\b", item["text"], re.IGNORECASE))
)


def match_gpa(item: TextItem) -> Optional[re.Match]:
    return re.search(
        r"(?:CGPA|GPA)[\s:\-=]*[\d\.]+(?:\s*[\d\.]*)?(?:/\d+)?|[0-4]\.\d{1,2}",
        item["text"], re.IGNORECASE
    )


def match_grade(item: TextItem) -> Optional[re.Match]:
    try:
        match = re.search(r"\d+\.?\d*(?:/\d+)?", item["text"])
        if match:
            grade_str = match.group(0).split('/')[0]
            grade = float(grade_str)
            if isinstance(grade, float) and (grade <= 110 or (grade > 4 and grade <= 10)):
                return match
    except (ValueError, TypeError):
        pass
    return None


SCHOOL_FEATURE_SETS: List[FeatureSet] = [
    (hasSchool, 4),
    (hasDegree, -4),
]

DEGREE_FEATURE_SETS: List[FeatureSet] = [
    (hasDegree, 4),
    (hasSchool, -4),
    (has_number, -3),
]

GPA_FEATURE_SETS: List[FeatureSet] = [
    (match_gpa, 5, True),
    (match_grade, 3, True),
    (has_comma, -2),
]


def extract_education(sections: ResumeSectionToLines) -> Dict[str, Any]:
    educations: List[ResumeEducation] = []
    educations_scores: List[Dict[str, Any]] = []

    lines = get_section_lines_by_keywords(sections, ["education"])
    subsections = divide_section_into_subsections(lines)

    for subsection_lines in subsections:
        text_items = [item for line in subsection_lines for item in line]

        # Group text_items into lines by y-coordinate
        lines_grouped = defaultdict(list)
        for item in text_items:
            y = round(item['y'], 1)
            lines_grouped[y].append(item)
        sorted_ys = sorted(lines_grouped.keys())
        grouped_lines = [lines_grouped[y] for y in sorted_ys]

        # Build pseudo line-items (one per visual line)
        line_items = []
        for line in grouped_lines:
            line_text = " ".join(item["text"] for item in line)
            pseudo_item = {
                "text": line_text,
                "y": line[0]["y"],
                "x": line[0].get("x", 0),
                "fontName": line[0].get("fontName", ""),
                "hasEOL": line[-1].get("hasEOL", False),
                "width": sum(item.get("width", 0) for item in line),
                "height": line[0].get("height", 0),
            }
            line_items.append(pseudo_item)

        school, school_scores = get_text_with_highest_feature_score(
            text_items, SCHOOL_FEATURE_SETS
        )
        degree, degree_scores = get_text_with_highest_feature_score(
            text_items, DEGREE_FEATURE_SETS
        )
        gpa, gpa_scores = get_text_with_highest_feature_score(
            text_items, GPA_FEATURE_SETS
        )
        date, date_scores = get_text_with_highest_feature_score(
            text_items, DATE_FEATURE_SETS
        )

        if school:
            school = re.sub(r' \d{4} [\?\–\-] \d{4}', '', school).strip()
            school = separate_words(school)

        if degree:
            degree = re.sub(r'CGPA:\s*[\d\.]+\s*/\s*\d+', '', degree).strip()
            degree = re.sub(r'GPA:\s*[\d\.]+\s*/\s*\d+', '', degree, flags=re.IGNORECASE).strip()
            degree = separate_words(degree)
            degree = correct_degree_text(degree)

        if gpa:
            gpa_normalized = re.sub(r'(\d+)\.\s+(\d+)', r'\1.\2', gpa)
            gpa_match = re.search(
                r"(?:CGPA|GPA)?[\s:\-=]*([0-9]+\.?[0-9]*)(?:/[0-9]+)?",
                gpa_normalized, re.IGNORECASE
            )
            if gpa_match:
                gpa = gpa_match.group(1)
            else:
                gpa_match = re.search(r"\d+\.?\d*", gpa)
                gpa = gpa_match.group(0) if gpa_match else ""

        if date:
            date_match = re.search(r'\d{4}\s*[\–\-]\s*\d{4}', date)
            if not date_match:
                date_match = re.search(
                    r'(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{4}'
                    r'\s*[\–\-]\s*'
                    r'(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{4}',
                    date, re.IGNORECASE
                )
            if not date_match:
                date_match = re.search(r'(\d{4})\s*[/\s\–\-]\s*(\d{4})', date)
            if not date_match:
                date_match = re.search(r'\d{4}', date)
            if date_match:
                date = date_match.group(0)

        descriptions: List[str] = []
        descriptions_line_idx = get_descriptions_line_idx(subsection_lines)
        if descriptions_line_idx is not None:
            descriptions_lines = subsection_lines[descriptions_line_idx:]
            descriptions = get_bullet_points_from_lines(descriptions_lines)

        education_entry: ResumeEducation = {
            "school": school,
            "degree": degree,
            "gpa": gpa,
            "date": date,
            "descriptions": descriptions,
        }
        educations.append(education_entry)

        educations_scores.append({
            "schoolScores": school_scores,
            "degreeScores": degree_scores,
            "gpaScores": gpa_scores,
            "dateScores": date_scores,
        })

    # ── Merge continuation subsections into their parent education entry ──────
    # (e.g. a wrapped coursework bullet that the PDF split into a separate subsection)
    educations = merge_education_entries(educations)

    # ── Append any standalone Courses section to the first education entry ────
    if educations:
        courses_lines = get_section_lines_by_keywords(sections, ["course"])
        if courses_lines:
            courses_text = " ".join(
                item["text"] for line in courses_lines for item in line
            )
            educations[0]["descriptions"].append("Courses: " + courses_text)

    print("Extracted Educations:", educations)
    return {
        "educations": educations,
        # "educationsScores": educations_scores,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Degree correction helpers
# ─────────────────────────────────────────────────────────────────────────────

def fuzzy_correct(text: str, candidates: List[str], threshold: int = 75) -> str:
    if not text:
        return text
    best_match = None
    best_score = 0
    for candidate in candidates:
        score = max(
            fuzz.ratio(text.lower(), candidate.lower()),
            fuzz.partial_ratio(text.lower(), candidate.lower()),
            fuzz.token_sort_ratio(text.lower(), candidate.lower()),
        )
        if score > best_score:
            best_score = score
            best_match = candidate
    if best_score >= threshold:
        return best_match
    return text


def correct_degree_text(degree: str) -> str:
    if not degree:
        return degree
    parts = re.split(r"\bin\b", degree, flags=re.IGNORECASE, maxsplit=1)
    if len(parts) == 1:
        return fuzzy_correct(degree, KNOWN_DEGREES)
    degree_part = parts[0].strip()
    field_part  = parts[1].strip()
    return f"{fuzzy_correct(degree_part, KNOWN_DEGREES)} in {fuzzy_correct(field_part, KNOWN_FIELDS)}"


# ─────────────────────────────────────────────────────────────────────────────
# Education entry merging
# ─────────────────────────────────────────────────────────────────────────────

def merge_education_entries(entries: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Merge subsection fragments into their parent education entry.

    A fragment is any subsection that extracted no school name.  This happens
    when the PDF inserts a visual gap mid-entry — for example when a long
    coursework bullet wraps onto a continuation line that the subsection
    splitter treats as a new block.

    Special case: if the last description of the current entry ends with a
    trailing comma (a mid-sentence wrap artefact), the fragment's descriptions
    are appended to that last item rather than added as new bullets.
    """
    merged: List[Dict[str, Any]] = []
    current: Optional[Dict[str, Any]] = None

    for edu in entries:
        has_school = bool(edu.get("school"))

        if has_school:
            if current is not None:
                merged.append(current)
            current = edu.copy()
            current["descriptions"] = list(edu.get("descriptions", []))
            continue

        # ── Fragment: merge into current ──────────────────────────────────────
        if current is None:
            current = edu.copy()
            current["descriptions"] = list(edu.get("descriptions", []))
            continue

        if edu.get("degree") and not current.get("degree"):
            current["degree"] = edu["degree"]
        if edu.get("gpa") and not current.get("gpa"):
            current["gpa"] = edu["gpa"]
        if edu.get("date") and not current.get("date"):
            current["date"] = edu["date"]

        if edu.get("descriptions"):
            if (current["descriptions"]
                    and current["descriptions"][-1].rstrip().endswith(",")):
                # Last description is a wrapped mid-sentence → stitch it together
                tail = " ".join(edu["descriptions"])
                current["descriptions"][-1] = (
                    current["descriptions"][-1].rstrip() + " " + tail
                )
            else:
                current["descriptions"].extend(edu["descriptions"])

    if current is not None:
        merged.append(current)

    return merged