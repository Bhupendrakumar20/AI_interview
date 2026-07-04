"""
ResumeParser/parser.py

Refactored from your original script. Behavior is unchanged — same PDF
extraction, spacing fixes, dedup, and section cleanup — but wrapped so it
can be safely imported by a FastAPI server (no stdout reconfig at import
time that could crash under uvicorn, no CLI logic running on import).

Adjust the import paths below to match wherever read_pdf.py,
group_text_items_into_lines.py, group_lines_into_sections.py,
extract_resume_from_section.py, and classes.py actually live in your repo.
"""

import json
import re
import sys
import io

from ResumeParser.read_pdf import read_pdf
from ResumeParser.group_text_items_into_lines import group_text_items_into_lines
from ResumeParser.group_lines_into_sections import group_lines_into_sections
from ResumeParser.extract_resume_from_section import extract_resume_from_sections
from ResumeParser.classes import Resume

# -----------------------------
# UTF-8 FIX (safe under uvicorn — guarded)
# -----------------------------
try:
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
except (AttributeError, ValueError):
    # Some server contexts (uvicorn workers, certain reloaders) don't expose
    # a raw buffer — skip the reconfig rather than crash on import.
    pass

# -----------------------------
# PROTECTED TERMS
# -----------------------------
PROTECTED_TERMS = [
    "TensorFlow", "PyTorch", "Scikit-learn", "NumPy", "OpenCV",
    "Matplotlib", "Seaborn", "FastAPI", "LangChain", "LangGraph",
    "Machine Learning", "Deep Learning", "Node.js",
]


def protect_terms(text: str):
    placeholders = {}
    for i, term in enumerate(PROTECTED_TERMS):
        placeholder = f"__TERM{i}__"
        pattern = re.compile(re.escape(term), re.IGNORECASE)
        if pattern.search(text):
            placeholders[placeholder] = term
            text = pattern.sub(placeholder, text)
    return text, placeholders


def restore_terms(text: str, placeholders: dict):
    for placeholder, term in placeholders.items():
        text = text.replace(placeholder, term)
    return text


def nlp_spacing_fix(text: str) -> str:
    if not text or not text.strip():
        return text
    text = re.sub(r'\(cid:\d+\)', '', text)
    text, placeholders = protect_terms(text)
    text = re.sub(r'(\w+)-\s+(\w+)', r'\1\2', text)
    text = re.sub(r'([a-z])([A-Z])', r'\1 \2', text)
    text = re.sub(r'\s+([.,:;])', r'\1', text)
    text = re.sub(r'\s+', ' ', text)
    text = restore_terms(text, placeholders)
    return text.strip()


def is_valid_project_title(name: str) -> bool:
    if not name:
        return False
    if name[0].islower():
        return False
    if re.search(r'[-,]$', name):
        return False
    if re.search(r'\.$', name) and len(name.split()) <= 3:
        return False
    if len(name.split()) > 10:
        return False
    return True


def is_real_company(name: str) -> bool:
    if not name:
        return False
    if name[0].islower():
        return False
    if re.search(r'\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{4}', name):
        return False
    if re.search(r'(\d{3}.*\d{4}|linkedin\.|@|http)', name, re.IGNORECASE):
        return False
    if re.search(r'[-,]$', name):
        return False
    if re.match(r'^(Managed|Worked|Helped|Source|Devised|Increased|Enhanced|Gathered|Determined|Collaborated|Deploy|Display)', name):
        return False
    return True


def split_date_and_location(date_str: str):
    if '|' in date_str:
        parts = date_str.split('|', 1)
        return parts[0].strip(), parts[1].strip()
    return date_str.strip(), None


def merge_description_lines(descriptions: list) -> list:
    if not descriptions:
        return []
    merged = []
    buffer = ""
    for line in descriptions:
        line = line.strip()
        if not line:
            continue
        if not buffer:
            buffer = line
        else:
            prev_ends_with_fragment = re.search(r'[-,]$', buffer)
            curr_starts_lowercase = line[0].islower()
            if prev_ends_with_fragment or curr_starts_lowercase:
                if buffer.endswith('-'):
                    buffer = buffer[:-1].rstrip() + line
                else:
                    buffer = buffer + ' ' + line
            else:
                merged.append(buffer)
                buffer = line
    if buffer:
        merged.append(buffer)
    return merged


def clean_profile(data: dict) -> dict:
    cleaned = dict(data)
    summary = cleaned.get("summary", "") or ""
    summary = re.sub(r'\S+\.(jpg|jpeg|png|gif|svg)', '', summary, flags=re.IGNORECASE)
    summary = re.sub(r'linkedin\.\S+', '', summary, flags=re.IGNORECASE)
    summary = re.sub(r'github\.\S+', '', summary, flags=re.IGNORECASE)
    summary = re.sub(r'\s+', ' ', summary).strip()
    cleaned["summary"] = summary
    return cleaned


def normalize_for_dedup(text: str) -> str:
    text = re.sub(r'\s+', ' ', text.strip().lower())
    text = text.rstrip('-').strip()
    return text


def dedup_descriptions(descriptions: list) -> list:
    if not descriptions:
        return []

    seen_exact = []
    unique = []
    for item in descriptions:
        norm = normalize_for_dedup(item)
        if norm not in seen_exact:
            seen_exact.append(norm)
            unique.append(item)

    normalized = [normalize_for_dedup(d) for d in unique]
    result = []
    for i, item in enumerate(unique):
        norm_i = normalized[i]
        is_substring_of_another = any(
            norm_i in normalized[j]
            for j in range(len(unique))
            if i != j and len(normalized[j]) > len(norm_i)
        )
        if not is_substring_of_another:
            result.append(item)

    return result


def build_clean_resume(resume: dict) -> dict:
    clean = {}

    for section, data in resume.items():

        if section == 'profile':
            clean['profile'] = clean_profile(data)

        elif section == 'educations':
            merged = []
            current = None
            for edu in data:
                school = (edu.get("school") or "").strip()
                if school:
                    if current:
                        merged.append(current)
                    current = {
                        "school": edu.get("school", ""),
                        "degree": edu.get("degree", ""),
                        "gpa": edu.get("gpa", ""),
                        "date": edu.get("date", ""),
                        "descriptions": edu.get("descriptions", [])
                    }
                else:
                    if current is None:
                        current = {"school": "", "degree": "", "gpa": "", "date": "", "descriptions": []}
                    for k in ["degree", "gpa", "date"]:
                        if edu.get(k) and not current.get(k):
                            current[k] = edu[k]
                    current["descriptions"].extend(edu.get("descriptions", []))
            if current:
                merged.append(current)
            clean['educations'] = merged

        elif section == 'workExperiences':
            merged = []
            current = None
            for exp in data:
                company = (exp.get('company') or "").strip()
                job_title = (exp.get('jobTitle') or "").strip()
                date = (exp.get('date') or "").strip()
                descs = exp.get('descriptions', [])

                if is_real_company(company) and (job_title or descs):
                    if current:
                        merged.append(current)
                    current = exp.copy()
                    current['descriptions'] = list(current.get('descriptions', []))
                else:
                    if current:
                        if not current.get('date') and date:
                            current['date'] = date
                        elif not current.get('date') and re.search(
                            r'\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{4})', company
                        ):
                            current['date'] = company
                        elif company and not is_real_company(company):
                            current['descriptions'].append(company)
                        if job_title:
                            current['descriptions'].append(job_title)
                        current['descriptions'].extend(descs)

            if current:
                merged.append(current)

            final = []
            for exp in merged:
                raw_date = (exp.get('date') or "").strip()
                date_part, location_part = split_date_and_location(raw_date)
                clean_descs = dedup_descriptions(merge_description_lines(exp['descriptions']))
                clean_descs = [
                    d for d in clean_descs
                    if d.strip() and not re.search(r'linkedin\.|@|\(\d{3}\)', d)
                ]
                final.append({
                    "company": exp.get('company', ''),
                    "jobTitle": exp.get('jobTitle', ''),
                    "date": date_part,
                    "location": location_part or "",
                    "descriptions": clean_descs,
                })
            clean['workExperiences'] = final

        elif section == 'projects':
            merged = []
            current = None
            for proj in data:
                name = (proj.get('project') or "").strip()
                if is_valid_project_title(name):
                    if current:
                        current["techStack"] = list(set(current["techStack"]))
                        current["descriptions"] = dedup_descriptions(merge_description_lines(current["descriptions"]))
                        merged.append(current)
                    current = proj.copy()
                    current['descriptions'] = list(current.get('descriptions', []))
                    current['techStack'] = list(current.get('techStack', []))
                else:
                    if current:
                        current["descriptions"].extend(proj.get("descriptions", []))

            if current:
                current["techStack"] = list(set(current["techStack"]))
                current["descriptions"] = dedup_descriptions(merge_description_lines(current["descriptions"]))
                merged.append(current)
            clean['projects'] = merged

        elif section == 'skills':
            skills = list(data)
            rejoined = []
            i = 0
            while i < len(skills):
                if i + 1 < len(skills) and not skills[i + 1][0].isupper():
                    rejoined.append(skills[i] + '-' + skills[i + 1])
                    i += 2
                else:
                    rejoined.append(skills[i])
                    i += 1
            clean['skills'] = rejoined

        elif section == 'achievements':
            raw_achievements = data.get('achievements', [])
            filtered = [
                a for a in raw_achievements
                if not re.search(r'\S+\.(jpg|jpeg|png|gif)', a, re.IGNORECASE)
                and not re.match(r'^(Link|http|\s*$)', a.strip())
            ]
            filtered = [re.sub(r'\s+Link\s*$', '', a).strip() for a in filtered]
            clean['achievements'] = {
                "achievements": dedup_descriptions(filtered),
                "certifications": data.get('certifications', []),
                "awards": data.get('awards', []),
            }

        else:
            clean[section] = data

    return clean


def to_serializable(obj):
    """Recursively convert any object into JSON-safe primitives."""
    if obj is None or isinstance(obj, (str, int, float, bool)):
        return obj
    if isinstance(obj, dict):
        return {k: to_serializable(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple, set)):
        return [to_serializable(i) for i in obj]
    try:
        import dataclasses
        if dataclasses.is_dataclass(obj):
            return to_serializable(dataclasses.asdict(obj))
    except Exception:
        pass
    if hasattr(obj, '__dict__'):
        return to_serializable(vars(obj))
    return str(obj)


def parse_resume_from_pdf(file_url: str) -> Resume:
    text_items = read_pdf(file_url)
    for item in text_items:
        item['text'] = nlp_spacing_fix(item['text'])
    lines = group_text_items_into_lines(text_items)
    sections = group_lines_into_sections(lines)
    return extract_resume_from_sections(sections)


# -----------------------------
# API ENTRYPOINT — this is what api.py imports
# -----------------------------
def parse_resume(file_path: str) -> dict:
    """
    Takes a path to an uploaded PDF (already saved to disk by the API layer)
    and returns a clean, JSON-serializable dict of the parsed resume.
    """
    resume = parse_resume_from_pdf(file_path)
    clean = build_clean_resume(resume)
    return to_serializable(clean)


def save_json(data, filename="parsed_resume.json"):
    serializable = to_serializable(data)
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(serializable, f, indent=4, ensure_ascii=False)
    print(f"\nResume saved to '{filename}'")


# -----------------------------
# CLI — only runs when executed directly, never on import
# -----------------------------
if __name__ == "__main__":
    file_path = "C:\\Users\\kavya\\Downloads\\fake_resume (3).pdf"  # change for local testing
    result = parse_resume(file_path)
    save_json(result)
    print(json.dumps(result, indent=2)[:1000])