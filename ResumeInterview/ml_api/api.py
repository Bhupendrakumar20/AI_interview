import os
import sys
from typing import Any, Dict, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# The shared ML modules use their original top-level package imports.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ResumeInterview.ResumeFeedBack.resume_feedback import get_ats_feedback
from ResumeInterview.ResumeGeneration.generator import generate_optimized_resume
from ResumeInterview.ResumeQuestionGeneration.resume_question_generation import (
    generate_questions_for_resume,
)

load_dotenv()

app = FastAPI(title="Resume Interview ML API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class FeedbackRequest(BaseModel):
    atsResult: Dict[str, Any]
    jobDescription: str


class GenerateQuestionsRequest(BaseModel):
    parsedResume: Dict[str, Any]
    focusArea: str = "Projects"
    persona: str = "hiring-manager"
    numQuestions: int = 1


class OptimizeResumeRequest(BaseModel):
    parsedResume: Dict[str, Any]
    atsResult: Dict[str, Any]
    csvPath: Optional[str] = None


@app.get("/health")
def health():
    return {"status": "ok", "service": "ml"}


@app.post("/generate-questions")
def generate_questions(payload: GenerateQuestionsRequest):
    try:
        questions = generate_questions_for_resume(
            payload.parsedResume,
            focus=payload.focusArea,
            num_questions=payload.numQuestions,
            persona=payload.persona,
        )
        return {"success": True, "verificationQuestions": questions}
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error


@app.post("/feedback")
def feedback(payload: FeedbackRequest):
    try:
        result = get_ats_feedback(payload.atsResult, payload.jobDescription)
        return {"success": True, "feedback": result}
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error


@app.post("/optimize-resume")
def optimize_resume(payload: OptimizeResumeRequest):
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
        return {"success": True, "optimizedResume": optimized_resume}
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error
