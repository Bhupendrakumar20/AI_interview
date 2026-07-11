
# """
# api.py
# Unified FastAPI backend for Resume Interview
# """

# import os
# import shutil
# import tempfile

# from fastapi import FastAPI, UploadFile, File, Form, HTTPException
# from fastapi.middleware.cors import CORSMiddleware

# from ResumeParser.parser import parse_resume
# from ATSScoreChecker.ats_score_checker import ATSScorer
# from ResumeGeneration.generator import generate_optimized_resume
# from ResumeQuestionGeneration.resume_question_generation import generate_questions_for_resume
# from ResumeFeedBack.resume_feedback import get_ats_feedback

# app = FastAPI(title="Resume Interview API")

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["http://localhost:3000"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# @app.get("/health")
# def health():
#     return {"status":"ok"}

# @app.post("/resume-interview")
# async def resume_interview(
#     resume: UploadFile = File(...),
#     jobDescription: str = Form(...),
#     focusArea: str = Form("Projects"),
#     persona: str = Form("hiring-manager"),
#     numQuestions: int = Form(5),
# ):
#     if not resume.filename.lower().endswith(".pdf"):
#         raise HTTPException(status_code=400, detail="Only PDF supported")

#     tmp_path = None
#     try:
#         with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
#             shutil.copyfileobj(resume.file, tmp)
#             tmp_path = tmp.name

#         parsed_resume = parse_resume(tmp_path)

#         scorer = ATSScorer()
#         ats = scorer.score_resume(parsed_resume, jobDescription)

#         ats_json = {
#             "final_score": ats.final_score,
#             "skills_score": ats.skills_score,
#             "experience_score": ats.experience_score,
#             "projects_score": ats.projects_score,
#             "education_score": ats.education_score,
#             "achievements_score": ats.achievements_score,
#             "formatting_score": ats.formatting_score,
#             "matched_skills": ats.matched_skills,
#             "missing_skills": ats.missing_skills,
#             "experience_details": ats.experience_details,
#             "projects_details": ats.projects_details,
#             "education_details": ats.education_details,
#             "achievements_details": ats.achievements_details,
#             "formatting_details": ats.formatting_details,
#         }

#         optimized_resume = generate_optimized_resume(parsed_resume)

#         questions = generate_questions_for_resume(
#             parsed_resume,
#             focus=focusArea,
#             num_questions=numQuestions,
#             persona=persona,
#         )

#         feedback = get_ats_feedback(ats_json, jobDescription)

#         return {
#             "success": True,
#             "parsedResume": parsed_resume,
#             "ats": ats_json,
#             "trustScore": ats.final_score,
#             "optimizedResume": optimized_resume,
#             "verificationQuestions": questions,
#             "feedback": feedback,
#         }

#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

#     finally:
#         if tmp_path and os.path.exists(tmp_path):
#             os.remove(tmp_path)

"""
api.py
FastAPI backend for Resume Interview — split into separate endpoints
matching the corrected flow:

Upload Resume -> POST /parse -> parsedResume
    -> POST /ats-score -> atsResult
        -> POST /feedback
        -> POST /optimize-resume
    -> POST /generate-questions

parsedResume fans out to /ats-score and /generate-questions independently.
atsResult (produced by /ats-score) fans out to /feedback and /optimize-resume.
Each endpoint takes the output of the previous step as input (the frontend
is responsible for passing `parsedResume` / `atsResult` along), so every
step can be called and tested independently.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
# Load root .env.local file to ensure we get correct environment variables (like OLLAMA_URL and OLLAMA_MODEL)
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_local_path = os.path.join(root_dir, ".env.local")
if os.path.exists(env_local_path):
    load_dotenv(env_local_path)
else:
    load_dotenv()
import shutil
import tempfile
from typing import Any, Dict, Optional

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from ResumeParser.parser import parse_resume
from ATSScoreChecker.ats_score_checker import ATSScorer
from ResumeGeneration.generator import generate_optimized_resume
from ResumeQuestionGeneration.resume_question_generation import generate_questions_for_resume
from ResumeFeedBack.resume_feedback import get_ats_feedback

app = FastAPI(title="Resume Interview API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:4001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------

class AtsScoreRequest(BaseModel):
    parsedResume: Dict[str, Any]
    jobDescription: str


class FeedbackRequest(BaseModel):
    atsResult: Dict[str, Any]
    jobDescription: str


class GenerateQuestionsRequest(BaseModel):
    parsedResume: Dict[str, Any]
    focusArea: str = "Projects"
    persona: str = "hiring-manager"
    numQuestions: int = 5


class OptimizeResumeRequest(BaseModel):
    # Now takes atsResult (produced by /ats-score) instead of a bare
    # parsedResume, so this endpoint sits downstream of atsResult in the
    # flow, alongside /feedback.
    parsedResume: Dict[str, Any]
    atsResult: Dict[str, Any]
    csvPath: Optional[str] = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _ats_result_to_json(ats) -> Dict[str, Any]:
    return {
        "final_score": ats.final_score,
        "skills_score": ats.skills_score,
        "experience_score": ats.experience_score,
        "projects_score": ats.projects_score,
        "education_score": ats.education_score,
        "achievements_score": ats.achievements_score,
        "formatting_score": ats.formatting_score,
        "matched_skills": ats.matched_skills,
        "missing_skills": ats.missing_skills,
        "experience_details": ats.experience_details,
        "projects_details": ats.projects_details,
        "education_details": ats.education_details,
        "achievements_details": ats.achievements_details,
        "formatting_details": ats.formatting_details,
    }


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Step 1: Upload Resume -> POST /parse -> parsedResume
# ---------------------------------------------------------------------------

@app.post("/parse")
async def parse(resume: UploadFile = File(...)):
    if not resume.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF supported")

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            shutil.copyfileobj(resume.file, tmp)
            tmp_path = tmp.name

        parsed_resume = parse_resume(tmp_path)
        
        # Extract raw text directly from the PDF to avoid heuristic parser data-loss
        from ResumeParser.read_pdf import extract_text_from_pdf
        raw_lines = extract_text_from_pdf(tmp_path)
        raw_text = "\n".join(raw_lines)

        return {
            "success": True,
            "parsedResume": parsed_resume,
            "rawText": raw_text,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)


# ---------------------------------------------------------------------------
# Step 2a: parsedResume -> POST /ats-score -> atsResult
# ---------------------------------------------------------------------------

@app.post("/ats-score")
async def ats_score(payload: AtsScoreRequest):
    try:
        scorer = ATSScorer()
        ats = scorer.score_resume(payload.parsedResume, payload.jobDescription)
        ats_json = _ats_result_to_json(ats)

        return {
            "success": True,
            "atsResult": ats_json,
            "trustScore": ats.final_score,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# Step 2b: parsedResume -> POST /generate-questions
# (independent branch off parsedResume, does not depend on atsResult)
# ---------------------------------------------------------------------------

@app.post("/generate-questions")
async def generate_questions(payload: GenerateQuestionsRequest):
    try:
        questions = generate_questions_for_resume(
            payload.parsedResume,
            focus=payload.focusArea,
            num_questions=payload.numQuestions,
            persona=payload.persona,
        )

        return {
            "success": True,
            "verificationQuestions": questions,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# Step 3a: atsResult -> POST /feedback
# ---------------------------------------------------------------------------

@app.post("/feedback")
async def feedback(payload: FeedbackRequest):
    try:
        result = get_ats_feedback(payload.atsResult, payload.jobDescription)

        return {
            "success": True,
            "feedback": result,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# Step 3b: atsResult -> POST /optimize-resume
# (sibling branch to /feedback, both hang off atsResult)
# ---------------------------------------------------------------------------

@app.post("/optimize-resume")
async def optimize_resume(payload: OptimizeResumeRequest):
    try:
        if payload.csvPath:
            optimized_resume = generate_optimized_resume(
                payload.parsedResume,
                ats_result=payload.atsResult,
                csv_path=payload.csvPath,
            )
        else:
            optimized_resume = generate_optimized_resume(
                payload.parsedResume,
                ats_result=payload.atsResult,
            )

        return {
            "success": True,
            "optimizedResume": optimized_resume,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))