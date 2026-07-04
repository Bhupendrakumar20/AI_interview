from typing import Dict, Any
from ResumeParser.classes import Resume
from ResumeParser.customtypes import ResumeSectionToLines
from ResumeParser.extractprofile import extract_profile
from ResumeParser.extractEducation import extract_education
from ResumeParser.extractWorkExperience import extract_work_experience
from ResumeParser.extractProjects import extract_project
from ResumeParser.extractSkills import extract_skills
from ResumeParser.extractAchivement import extract_achievements

def extract_resume_from_sections(sections: ResumeSectionToLines) -> Resume:
   
    profile_result = extract_profile(sections)
    education_result = extract_education(sections)
    work_experience_result = extract_work_experience(sections)
    project_result = extract_project(sections)
    skills_result = extract_skills(sections)
    achievements_result = extract_achievements(sections)

    return {
        "profile": profile_result["profile"],
        "educations": education_result["educations"],
        "workExperiences": work_experience_result["workExperiences"],
        "projects": project_result["projects"],
        "skills": skills_result["skills"],
        "achievements": achievements_result,
        "custom": {
            "descriptions": [],
        },
    }