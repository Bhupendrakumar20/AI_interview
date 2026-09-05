import os
import re
import shutil
import sys
import tempfile
from typing import Any, Dict

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Allow the shared parser package to work when this service is started from
# the repository root or deployed with ResumeInterview as the source tree.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ResumeInterview.ResumeParser.parser import parse_resume
from ResumeInterview.ResumeParser.read_pdf import extract_text_from_pdf

app = FastAPI(title="Resume Interview Lightweight API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AtsScoreRequest(BaseModel):
    parsedResume: Dict[str, Any]
    jobDescription: str


def _words(value: Any) -> set[str]:
    return set(re.findall(r"[a-z0-9+#.]+", str(value).lower()))


def _resume_text(resume: Dict[str, Any]) -> str:
    parts = [resume.get("profile", {}).get("summary", "")]
    parts.extend(resume.get("skills", []))
    for section in ("workExperiences", "projects", "educations"):
        for item in resume.get(section, []) or []:
            parts.append(item)
    return " ".join(str(part) for part in parts)


def _basic_ats_score(resume: Dict[str, Any], job_description: str) -> Dict[str, Any]:
    resume_words = _words(_resume_text(resume))
    job_words = _words(job_description)
    ignored = {"and", "the", "with", "for", "from", "that", "this", "are", "you"}
    required_words = {word for word in job_words if len(word) > 2 and word not in ignored}
    matched = sorted(resume_words & required_words)
    missing = sorted(required_words - resume_words)
    skills_score = round(100 * len(matched) / len(required_words)) if required_words else 0
    text_length_score = min(100, round(len(_resume_text(resume)) / 12))
    experience_score = skills_score
    projects_score = skills_score if resume.get("projects") else 0
    education_score = 100 if resume.get("educations") else 0
    achievements_score = 100 if resume.get("achievements") else 0
    formatting_score = text_length_score
    final_score = round(
        skills_score * 0.25
        + experience_score * 0.25
        + projects_score * 0.20
        + education_score * 0.10
        + achievements_score * 0.10
        + formatting_score * 0.10,
        2,
    )
    return {
        "final_score": final_score,
        "skills_score": skills_score,
        "experience_score": experience_score,
        "projects_score": projects_score,
        "education_score": education_score,
        "achievements_score": achievements_score,
        "formatting_score": formatting_score,
        "matched_skills": matched,
        "missing_skills": missing,
        "experience_details": {"method": "lexical"},
        "projects_details": {"method": "lexical"},
        "education_details": {"method": "lexical"},
        "achievements_details": {"method": "lexical"},
        "formatting_details": {"method": "lexical"},
    }


@app.get("/health")
def health():
    return {"status": "ok", "service": "lightweight"}


@app.post("/parse")
async def parse(resume: UploadFile = File(...)):
    if not resume.filename or not resume.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF supported")

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
            shutil.copyfileobj(resume.file, temp_file)
            tmp_path = temp_file.name

        parsed_resume = parse_resume(tmp_path)
        raw_text = "\n".join(extract_text_from_pdf(tmp_path))
        return {"success": True, "parsedResume": parsed_resume, "rawText": raw_text}
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)


@app.post("/ats-score")
def ats_score(payload: AtsScoreRequest):
    ats_result = _basic_ats_score(payload.parsedResume, payload.jobDescription)
    return {
        "success": True,
        "atsResult": ats_result,
        "trustScore": ats_result["final_score"],
    }
