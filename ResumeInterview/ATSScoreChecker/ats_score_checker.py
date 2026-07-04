import json
import re
import os
import numpy as np
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List, Tuple
from ATSScoreChecker.ats_common import get_embedder,normalize_resume,_join_descriptions,ScoreBreakdown
from sklearn.metrics.pairwise import cosine_similarity

from ATSScoreChecker.ats_skills import SkillsScorer
from ATSScoreChecker.ats_achievements import AchievementsScorer
from ATSScoreChecker.ats_experience import ExperienceScorer , extract_skills 
from ATSScoreChecker.ats_education import EducationScorer
from ATSScoreChecker.ats_projects import ProjectsScorer
from ATSScoreChecker.ats_formatting import FormattingScorer






# ─────────────────────────────────────────────────────────────
# JD PARSER
# ─────────────────────────────────────────────────────────────

class JDParser:

    COMMON_TECH = [
        "python", "java", "javascript", "typescript", "go", "rust", "c++", "c#",
        "fastapi", "django", "flask", "spring", "node.js", "react", "vue", "angular", "next.js",
        "docker", "kubernetes", "aws", "gcp", "azure", "terraform", "ansible", "cloudformation",
        "postgresql", "mysql", "mongodb", "redis", "elasticsearch", "kafka", "rabbitmq",
        "spark", "hadoop", "airflow", "dbt", "snowflake", "bigquery",
        "pandas", "numpy", "scikit-learn", "tensorflow", "pytorch", "keras",
        "git", "linux", "unix", "bash", "shell scripting", "command line",
        "rest api", "graphql", "grpc", "soap", "microservices", "serverless",
        "ci/cd", "jenkins", "gitlab ci", "github actions", "azure devops",
        "langchain", "openai", "llm", "rag", "machine learning", "deep learning",
        "artificial intelligence", "nlp",
        "data structures", "algorithms", "object-oriented programming", "functional programming",
        "agile", "scrum", "kanban", "unit testing", "integration testing", "end-to-end testing",
        "database design", "sql optimization", "data warehousing", "etl",
        "web development", "mobile development", "front-end", "back-end", "full-stack",
        "security", "authentication", "authorization", "encryption",
        "system design", "distributed systems", "scalable architecture", "high availability",
        "data analysis", "data visualization", "business intelligence",
        "containerization", "virtualization", "vmware",
        "api design", "api development", "cloud computing", "devops", "sre",
        "blockchain", "cybersecurity", "penetration testing",
        "communication", "teamwork", "problem-solving", "leadership", "mentorship",
    ]

    def extract_skills(self, jd_text: str) -> List[str]:
        lower = jd_text.lower()
        found = [tech for tech in self.COMMON_TECH if tech in lower]
        return list(set(found))


# ─────────────────────────────────────────────────────────────
# MAIN ATS SCORER
# ─────────────────────────────────────────────────────────────

class ATSScorer:

    def __init__(self):
        self.skills_scorer       = SkillsScorer()
        self.experience_scorer   = ExperienceScorer()
        self.projects_scorer     = ProjectsScorer()
        self.education_scorer    = EducationScorer()
        self.achievements_scorer = AchievementsScorer()
        self.formatting_scorer   = FormattingScorer()

    def score_resume(self, raw_resume: dict, jd_text: str) -> ScoreBreakdown:
        """
        Accept raw parsed resume JSON (new schema) or already-normalized dict.
        Normalizes automatically before scoring.
        """
        # Normalize only if the new schema keys are present
        if "profile" in raw_resume or "workExperiences" in raw_resume or "educations" in raw_resume:
            resume_data = normalize_resume(raw_resume)
        else:
            resume_data = raw_resume   # already in internal schema

        breakdown = ScoreBreakdown()

        # Skills
        skills_score, matched, missing = self.skills_scorer.score(
            resume_data.get("skills", []),
            list(extract_skills(jd_text)),
        )
        breakdown.skills_score   = skills_score
        breakdown.matched_skills = matched
        breakdown.missing_skills = missing

        # Experience
        experience_score, experience_details = self.experience_scorer.score(resume_data, jd_text)
        breakdown.experience_score   = experience_score
        breakdown.experience_details = experience_details

        # Projects
        projects_score, projects_details = self.projects_scorer.score(
            resume_data.get("projects", []), jd_text
        )
        breakdown.projects_score   = projects_score
        breakdown.projects_details = projects_details

        # Education
        education_score, education_details = self.education_scorer.score(
            resume_data.get("education", []), jd_text
        )
        breakdown.education_score   = education_score
        breakdown.education_details = education_details

        # Achievements
        achievements_score, achievements_details = self.achievements_scorer.score(resume_data, jd_text)
        breakdown.achievements_score   = achievements_score
        breakdown.achievements_details = achievements_details

        # Formatting
        formatting_score, formatting_details = self.formatting_scorer.score(resume_data)
        breakdown.formatting_score   = formatting_score
        breakdown.formatting_details = formatting_details

        # Final weighted score
        breakdown.final_score = round(
            breakdown.skills_score       * 0.25 +
            breakdown.experience_score   * 0.25 +
            breakdown.projects_score     * 0.20 +
            breakdown.education_score    * 0.10 +
            breakdown.achievements_score * 0.10 +
            breakdown.formatting_score   * 0.10,
            2,
        )

        return breakdown


# ─────────────────────────────────────────────────────────────
# REPORT PRINTER
# ─────────────────────────────────────────────────────────────

def print_report(result: ScoreBreakdown) -> None:
    print("\n" + "=" * 60)
    print("🎯 ATS SCORE REPORT")
    print("=" * 60)

    print(f"\n✅ FINAL ATS SCORE : {result.final_score}/100\n")
    print(f"Skills Score      : {result.skills_score}")
    print(f"Experience Score  : {result.experience_score}")
    print(f"Projects Score    : {result.projects_score}")
    print(f"Education Score   : {result.education_score}")
    print(f"Achievements Score: {result.achievements_score}")
    print(f"Formatting Score  : {result.formatting_score}")

    print("\n✅ MATCHED SKILLS:")
    print(", ".join(result.matched_skills) if result.matched_skills else "No skills matched.")

    print("\n❌ MISSING SKILLS:")
    print(", ".join(result.missing_skills) if result.missing_skills else "No missing skills.")

    if result.experience_details:
        print("\n── Experience Details ─────────────────────────────")
        print(f"  Years Required (JD) : {result.experience_details.get('years_required_jd', 'N/A')}")
        print(f"  Years in Resume     : {result.experience_details.get('years_in_resume', 'N/A')}")
        print(f"  Years Match Score   : {result.experience_details.get('years_score', 'N/A')}")
        print(f"  Skill Score         : {result.experience_details.get('skill_score', 'N/A')}")

    if result.projects_details and result.projects_details.get("projects"):
        print("\n── Project Details ────────────────────────────────")
        for proj_key, proj_info in result.projects_details["projects"].items():
            print(f"  - {proj_info.get('name', 'N/A')}: "
                  f"Semantic={proj_info.get('semantic_score', 'N/A')}, "
                  f"Quality={proj_info.get('quality_score', 'N/A')}, "
                  f"Composite={proj_info.get('composite_score', 'N/A')}")

    if result.achievements_details and result.achievements_details.get("sub_scores"):
        sub = result.achievements_details["sub_scores"]
        print("\n── Achievements Details ───────────────────────────")
        print(f"  Certifications Score: {sub.get('certifications', 'N/A')}")
        print(f"  Hackathon Score     : {sub.get('hackathons', 'N/A')}")
        print(f"  Leadership Score    : {sub.get('leadership', 'N/A')}")
        print(f"  Courses Score       : {sub.get('courses', 'N/A')}")
        print(f"  Coding Score        : {sub.get('coding_profiles', 'N/A')}")

    if result.education_details and result.education_details.get("education_entries"):
        print("\n── Education Details ──────────────────────────────")
        print(f"  Overall Score: {result.education_details.get('overall_score', 'N/A')}")
        for edu_key, edu_info in result.education_details["education_entries"].items():
            print(f"  - Degree: {edu_info.get('degree', 'N/A')}, "
                  f"Field: {edu_info.get('field', 'N/A')}, "
                  f"Institution: {edu_info.get('institution', 'N/A')}")

    if result.formatting_details:
        req = result.formatting_details.get("required_sections", {})
        print("\n── Formatting Details ─────────────────────────────")
        print(f"  Present Sections: {', '.join(req.get('present', []))}")
        print(f"  Missing Sections: {', '.join(req.get('missing', []))}")
        print(f"  Formatting Score: {result.formatting_details.get('final_score', 'N/A')}")


# ─────────────────────────────────────────────────────────────
# ENTRY POINT
# ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("\n==============================")
    print("ATS RESUME SCORER")
    print("==============================\n")

    print("Paste Resume JSON Below:")
    print("(Type END on a new line to finish)\n")

    resume_lines = []
    while True:
        line = input()
        if line.strip() == "END":
            break
        resume_lines.append(line)

    try:
        resume_json = json.loads("\n".join(resume_lines))
    except json.JSONDecodeError:
        print("\n❌ Invalid Resume JSON")
        exit(1)

    print("\nPaste Job Description:")
    print("(Type END on a new line to finish)\n")

    jd_lines = []
    while True:
        line = input()
        if line.strip() == "END":
            break
        jd_lines.append(line)

    jd_text = "\n".join(jd_lines)

    scorer = ATSScorer()
    result = scorer.score_resume(resume_json, jd_text)

    print_report(result)

    output = {
        "final_score":          result.final_score,
        "skills_score":         result.skills_score,
        "experience_score":     result.experience_score,
        "projects_score":       result.projects_score,
        "education_score":      result.education_score,
        "achievements_score":   result.achievements_score,
        "formatting_score":     result.formatting_score,
        "matched_skills":       result.matched_skills,
        "missing_skills":       result.missing_skills,
        "experience_details":   result.experience_details,
        "projects_details":     result.projects_details,
        "education_details":    result.education_details,
        "achievements_details": result.achievements_details,
        "formatting_details":   result.formatting_details,
    }

    with open("ATSScoreChecker/ats_result.json", "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)

    print("\n💾 Result Saved Successfully -> ats_result.json")