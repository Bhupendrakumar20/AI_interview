"""
ResumeGeneration/generator.py

Refactored from your original pipeline script. Same logic (normalize ->
apply defaults -> build FAISS query -> retrieve job-market context ->
optimize via Ollama), but exposed as a function instead of a CLI main()
that reads hardcoded file paths. This matters for the API because the
parsed resume now comes from a request body, not from parsed_resume.json
on disk.

NOTE: this still depends on:
  - Ollama running locally (or reachable) at OLLAMA_URL
  - a jobs CSV (final_jobs.csv by default) present on the server for the
    FAISS vectorstore to index
Both are real infra dependencies your API server needs, not just Python
imports — make sure Ollama is running wherever this API is deployed.
"""

import os
import json
import re
import hashlib
import logging
import requests
from dotenv import load_dotenv
from langchain_community.document_loaders import CSVLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings

load_dotenv()

logging.basicConfig(
    filename="pipeline.log",
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def log(msg, level="info"):
    print(msg)
    getattr(logger, level)(msg)


embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

RESUME_SCHEMA_EXAMPLE = {
    "name": "Full Name",
    "email": "email@example.com",
    "phone": "XXXXXXXXXX",
    "linkedin": "linkedin.com/in/username",
    "github": "github.com/username",
    "location": "City, Country",
    "summary": "Professional summary optimized for job market",
    "skills": ["Skill1", "Skill2", "Skill3"],
    "experience": [
        {
            "title": "Job Title",
            "company": "Company Name",
            "duration": "Jan 2022 - Dec 2023",
            "responsibilities": ["Responsibility 1 with metric", "Responsibility 2 with metric"]
        }
    ],
    "projects": [
        {
            "name": "Project Name",
            "description": "Brief optimized project description",
            "technologies": ["Tech1", "Tech2"],
            "highlights": ["Key achievement 1", "Key achievement 2"]
        }
    ],
    "education": [
        {"degree": "B.Tech in Computer Science", "institution": "University Name", "gpa": "8.58", "year": "2023 - 2027"}
    ],
    "achievements": ["Achievement 1", "Achievement 2"],
    "certifications": ["Certification 1"]
}

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434/api/generate")
if not OLLAMA_URL.endswith("/api/generate") and not OLLAMA_URL.endswith("/api/chat"):
    OLLAMA_URL = f"{OLLAMA_URL.rstrip('/')}/api/generate"
MODEL_NAME = os.environ.get("OLLAMA_MODEL", "gemma3:4b")


def ask_ollama(prompt):
    try:
        try:
            from llm_fallback import generate_with_fallback
        except ImportError:
            import sys
            parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            if parent_dir not in sys.path:
                sys.path.append(parent_dir)
            from llm_fallback import generate_with_fallback
        return generate_with_fallback(prompt, temperature=0.3, top_p=0.9)
    except Exception as e:
        print(f"[Fallback Import/Execution Warning] Using direct Ollama request due to: {e}")
        response = requests.post(
            OLLAMA_URL,
            json={"model": MODEL_NAME, "prompt": prompt, "stream": False,
                  "options": {"temperature": 0.3, "top_p": 0.9}}
        )
        response.raise_for_status()
        return response.json()["response"]



def normalize_resume(raw):
    log("[Normalize] Converting parsed resume structure to standard format...")

    profile = raw.get("profile", {})
    name = profile.get("name", "")
    email = profile.get("email", "")
    phone = profile.get("phone", "")
    location = profile.get("location", "")
    linkedin = profile.get("linkedin_url", "")
    github = profile.get("github_url", "")
    summary = profile.get("summary", "")

    skills = raw.get("skills", [])
    if not isinstance(skills, list):
        skills = []

    work_raw = raw.get("workExperiences", [])
    experience = []
    for w in work_raw:
        if isinstance(w, dict):
            experience.append({
                "title": w.get("jobTitle", w.get("title", "")),
                "company": w.get("company", ""),
                "duration": w.get("date", w.get("duration", "")),
                "responsibilities": w.get("descriptions", w.get("responsibilities", []))
            })

    projects_raw = raw.get("projects", [])
    projects = []
    for p in projects_raw:
        if isinstance(p, dict):
            projects.append({
                "name": p.get("project", p.get("name", "")),
                "description": " ".join(p.get("descriptions", [])) if p.get("descriptions") else p.get("description", ""),
                "technologies": p.get("techStack", p.get("technologies", [])),
                "highlights": p.get("descriptions", [])
            })

    edu_raw = raw.get("educations", raw.get("education", []))
    education = []
    for e in edu_raw:
        if isinstance(e, dict):
            education.append({
                "degree": e.get("degree", ""),
                "institution": e.get("school", e.get("institution", "")),
                "gpa": e.get("gpa", ""),
                "year": e.get("date", e.get("year", ""))
            })

    ach_block = raw.get("achievements", {})
    achievements = []
    certifications = []
    if isinstance(ach_block, dict):
        achievements = ach_block.get("achievements", [])
        certifications = ach_block.get("certifications", [])
        awards = ach_block.get("awards", [])
        if awards:
            achievements.extend(awards)
    elif isinstance(ach_block, list):
        achievements = ach_block

    normalized = {
        "name": name, "email": email, "phone": phone, "linkedin": linkedin,
        "github": github, "location": location, "summary": summary,
        "skills": skills, "experience": experience, "projects": projects,
        "education": education, "achievements": achievements, "certifications": certifications
    }

    log(f"[Normalize] Done — fields: {list(normalized.keys())}")
    return normalized


FIELD_DEFAULTS = {
    "name": "", "email": "", "phone": "", "linkedin": "", "github": "",
    "location": "", "summary": "", "skills": [], "experience": [],
    "projects": [], "education": [], "achievements": [], "certifications": []
}


def apply_defaults(resume_json):
    for field, default in FIELD_DEFAULTS.items():
        if field not in resume_json or resume_json[field] is None:
            resume_json[field] = default

    list_fields = ["skills", "experience", "projects", "education", "achievements", "certifications"]
    for field in list_fields:
        if not isinstance(resume_json[field], list):
            resume_json[field] = [resume_json[field]] if resume_json[field] else []

    str_fields = ["name", "email", "phone", "linkedin", "github", "location", "summary"]
    for field in str_fields:
        if not isinstance(resume_json[field], str):
            resume_json[field] = str(resume_json[field])

    return resume_json


def validate_output_resume(data):
    for field, default in FIELD_DEFAULTS.items():
        if field not in data or data[field] is None:
            data[field] = default

    list_fields = ["skills", "experience", "projects", "education", "achievements", "certifications"]
    for field in list_fields:
        if not isinstance(data[field], list):
            data[field] = [data[field]] if data[field] else []

    return data


def load_jobs(csv_path):
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"CSV not found: {csv_path}")
    loader = CSVLoader(file_path=csv_path, encoding="utf-8")
    return loader.load()


def split_docs(docs):
    splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    return splitter.split_documents(docs)


def get_csv_hash(csv_path):
    with open(csv_path, "rb") as f:
        return hashlib.md5(f.read()).hexdigest()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

CSV_PATH = os.path.join(BASE_DIR, "final_jobs.csv")

HASH_FILE = os.path.join(BASE_DIR, "faiss_index.hash")
FAISS_INDEX_DIR = os.path.join(BASE_DIR, "faiss_index")

def should_rebuild_index(csv_path, hash_file=HASH_FILE):
    current_hash = get_csv_hash(csv_path)
    if os.path.exists(FAISS_INDEX_DIR) and os.path.exists(hash_file):
        with open(hash_file) as f:
            if f.read().strip() == current_hash:
                log("[Vectorstore] CSV unchanged — using existing index")
                return False
    with open(hash_file, "w") as f:
        f.write(current_hash)
    log("[Vectorstore] CSV changed or new — rebuilding index")
    return True


def create_vectorstore(docs):
    log("[Vectorstore] Building FAISS index...")
    db = FAISS.from_documents(docs, embeddings)
    db.save_local("faiss_index")
    return db


def load_vectorstore():
    log("[Vectorstore] Loading existing FAISS index...")
    return FAISS.load_local("faiss_index", embeddings, allow_dangerous_deserialization=True)


def build_targeted_query(resume_json):
    skills = resume_json.get("skills", [])
    experience = resume_json.get("experience", [])
    projects = resume_json.get("projects", [])

    roles = [exp.get("title", "") for exp in experience if isinstance(exp, dict) and exp.get("title")]

    proj_techs = []
    for p in projects:
        if isinstance(p, dict):
            proj_techs.extend(p.get("technologies", []))

    all_skills = list(dict.fromkeys(skills + proj_techs))
    skill_str = ", ".join(all_skills[:15]) if all_skills else "Python"
    role_str = roles[0] if roles else "Data Scientist"

    query = f"{role_str} with skills in {skill_str}"
    log(f"[Query Built]: {query}")
    return query


def retrieve_docs(vectorstore, query, k=3):
    retriever = vectorstore.as_retriever(search_kwargs={"k": k})
    docs = retriever.invoke(query)
    context = "\n\n".join([doc.page_content for doc in docs])
    if len(context) > 1000:
        context = context[:1000]
    return context


def extract_json_from_text(text):
    try:
        return json.loads(text.strip())
    except json.JSONDecodeError:
        pass

    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass

    start = text.find("{")
    end = text.rfind("}") + 1
    if start != -1 and end > start:
        try:
            return json.loads(text[start:end])
        except json.JSONDecodeError:
            pass

    try:
        partial = text[text.find("{"):]
        open_braces = partial.count("{") - partial.count("}")
        open_brackets = partial.count("[") - partial.count("]")
        fixed = partial + ("]" * open_brackets) + ("}" * open_braces)
        return json.loads(fixed)
    except (json.JSONDecodeError, ValueError):
        pass

    raise ValueError("Could not extract valid JSON from model output")


def build_prompt(resume_json, context):
    schema_str = json.dumps(RESUME_SCHEMA_EXAMPLE, indent=2)

    compact = {
        "name": resume_json.get("name", ""), "email": resume_json.get("email", ""),
        "phone": resume_json.get("phone", ""), "linkedin": resume_json.get("linkedin", ""),
        "github": resume_json.get("github", ""), "location": resume_json.get("location", ""),
        "summary": resume_json.get("summary", ""), "skills": resume_json.get("skills", [])[:20],
        "experience": resume_json.get("experience", [])[:3], "projects": resume_json.get("projects", [])[:3],
        "education": resume_json.get("education", []), "achievements": resume_json.get("achievements", []),
        "certifications": resume_json.get("certifications", [])
    }

    return f"""[INST] You are a professional resume optimizer for Data Science roles.

Optimize the resume below using the job market context provided.

### Current Resume:
{json.dumps(compact, indent=2)}

### Job Market Context:
{context}

### Instructions:
- Write a strong professional summary if missing or weak
- Add relevant missing skills from the context
- Improve project descriptions using action verbs and metrics
- If experience is empty, keep it as empty list []
- Include all achievements and certifications as-is
- Return ONLY valid JSON — no explanation, no markdown, no extra text
- Follow this EXACT JSON structure:

{schema_str}

[/INST]"""


def optimize_resume(resume_json, context, max_retries=3):
    for attempt in range(1, max_retries + 1):
        try:
            log(f"[Generating] Attempt {attempt}/{max_retries} — optimizing resume...")
            prompt = build_prompt(resume_json, context)
            raw_text = ask_ollama(prompt)
            result = extract_json_from_text(raw_text)
            result = validate_output_resume(result)
            log("Resume optimized successfully")
            return result
        except (ValueError, json.JSONDecodeError) as e:
            log(f"[Retry] Attempt {attempt} failed: {e}", "warning")
            if attempt == max_retries:
                log("All retries failed — returning normalized resume as fallback", "error")
                return resume_json


# -----------------------------
# API ENTRYPOINT — this is what api.py imports
# -----------------------------
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

CSV_PATH = os.path.join(BASE_DIR, "final_jobs.csv")
def generate_optimized_resume(parsed_resume: dict, csv_path: str = CSV_PATH) -> dict:
    """
    Takes a parsed resume dict (from ResumeParser.parse_resume) and returns
    a job-market-optimized version, using FAISS + Ollama.
    """
    if should_rebuild_index(csv_path):
        docs = split_docs(load_jobs(csv_path))
        vectorstore = create_vectorstore(docs)
    else:
        vectorstore = load_vectorstore()

    resume_json = normalize_resume(parsed_resume)
    resume_json = apply_defaults(resume_json)

    query = build_targeted_query(resume_json)
    context = retrieve_docs(vectorstore, query)

    return optimize_resume(resume_json, context)


def save_output(result, output_path="optimized_resume.json"):
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)


# -----------------------------
# CLI — only runs when executed directly, never on import
# -----------------------------
if __name__ == "__main__":
    if not os.path.exists("parsed_resume.json"):
        raise FileNotFoundError("parsed_resume.json not found")
    with open("parsed_resume.json", "r", encoding="utf-8") as f:
        raw_resume = json.load(f)
    result = generate_optimized_resume(raw_resume)
    save_output(result)
    print(json.dumps(result, indent=2))