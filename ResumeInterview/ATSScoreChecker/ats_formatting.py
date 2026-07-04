import re
from typing import  Tuple

class FormattingScorer:

    REQUIRED = ["name", "email", "skills", "experience", "education"]

    ACTION_VERBS = [
        "developed", "built", "implemented", "designed",
        "optimized", "created", "deployed", "improved",
        "integrated", "automated", "engineered",
        "managed", "configured", "reduced", "increased",
        "analyzed", "tested", "maintained",
    ]

    def score(self, resume_data: dict) -> Tuple[float, dict]:
        details     = {}
        total_score = 0.0

        # 1. Required sections (20 pts)
        present_sections = [r for r in self.REQUIRED if resume_data.get(r)]
        missing_sections = [r for r in self.REQUIRED if not resume_data.get(r)]
        section_score    = (len(present_sections) / len(self.REQUIRED)) * 20
        total_score += section_score
        details["required_sections"] = {
            "present": present_sections,
            "missing": missing_sections,
            "score":   round(section_score, 2),
        }

        # 2. Contact format (10 pts)
        contact_score = 0.0
        email = resume_data.get("email", "")
        phone = resume_data.get("phone", "")
        email_valid = bool(re.match(r"[^@]+@[^@]+\.[^@]+", email))
        phone_valid = bool(re.match(r"^[0-9+\-\s]{10,15}$", str(phone)))
        if email_valid:
            contact_score += 5
        if phone_valid:
            contact_score += 5
        total_score += contact_score
        details["contact_formatting"] = {
            "email_valid": email_valid,
            "phone_valid": phone_valid,
            "score":       contact_score,
        }

        # 3. Skills formatting (10 pts)
        skills_score = 0.0
        skills = resume_data.get("skills", [])
        if isinstance(skills, list):
            if len(skills) >= 5:
                skills_score += 5
            clean_skills = [s for s in skills if isinstance(s, str) and len(s.strip()) > 1]
            if len(clean_skills) == len(skills):
                skills_score += 5
        total_score += skills_score
        details["skills_formatting"] = {
            "total_skills": len(skills),
            "score":        skills_score,
        }

        # 4. Experience alignment (15 pts)
        experience_score  = 0.0
        experiences       = resume_data.get("experience", [])
        aligned_count     = sum(
            1 for exp in experiences
            if len(str(exp.get("description", "")).split()) >= 20
        )
        if experiences:
            experience_score = (aligned_count / len(experiences)) * 15
        total_score += experience_score
        details["experience_alignment"] = {
            "total_experience":       len(experiences),
            "well_described_experience": aligned_count,
            "score":                  round(experience_score, 2),
        }

        # 5. Project quality (25 pts)
        project_score    = 0.0
        projects         = resume_data.get("projects", [])
        good_projects    = 0
        project_feedback = []

        for project in projects:
            name      = project.get("name", "Unnamed Project")
            description = str(project.get("description", ""))
            desc_lower  = description.lower()
            p_score     = 0

            if len(description.split()) >= 20:
                p_score += 5
            verbs_found = [v for v in self.ACTION_VERBS if v in desc_lower]
            if verbs_found:
                p_score += 5
            if re.search(r"\d+", description):
                p_score += 5
            technologies = project.get("technologies", [])
            if isinstance(technologies, list) and technologies:
                p_score += 5
            if "\n" in description or "-" in description:
                p_score += 5
            if p_score >= 15:
                good_projects += 1
            project_feedback.append({
                "project_name":      name,
                "project_score":     p_score,
                "action_verbs_found": verbs_found,
                "has_metrics":       bool(re.search(r"\d+", description)),
            })

        if projects:
            project_score = (good_projects / len(projects)) * 25
        total_score += project_score
        details["project_quality"] = {
            "total_projects":   len(projects),
            "good_projects":    good_projects,
            "score":            round(project_score, 2),
            "project_feedback": project_feedback,
        }

        # 6. Education (10 pts)
        education_score = 0.0
        education       = resume_data.get("education", [])
        proper_count    = sum(
            1 for edu in education
            if edu.get("degree") and edu.get("institution")
        )
        if education:
            education_score = (proper_count / len(education)) * 10
        total_score += education_score
        details["education_quality"] = {
            "total_education": len(education),
            "proper_entries":  proper_count,
            "score":           round(education_score, 2),
        }

        final_score = round(total_score, 2)
        details["final_score"] = final_score
        return final_score, details
