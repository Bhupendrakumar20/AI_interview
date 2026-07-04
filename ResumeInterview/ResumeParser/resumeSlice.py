

from typing import TypedDict, List, Literal, Dict, Any, Union
from copy import deepcopy
from ResumeParser.classes import Resume, ResumeProfile, ResumeWorkExperience, ResumeEducation, ResumeProject, FeaturedSkill, ResumeSkills, ResumeCustom




ShowForm = Literal["workExperiences", "educations", "projects", "skills", "custom"]

INITIAL_PROFILE: ResumeProfile = {
    "name": "",
    "summary": "",
    "email": "",
    "phone": "",
    "location": "",
    "url": "",
}

INITIAL_WORK_EXPERIENCE: ResumeWorkExperience = {
    "company": "",
    "jobTitle": "",
    "date": "",
    "descriptions": [],
}

INITIAL_EDUCATION: ResumeEducation = {
    "school": "",
    "degree": "",
    "gpa": "",
    "date": "",
    "descriptions": [],
}

INITIAL_PROJECT: ResumeProject = {
    "project": "",
    "date": "",
    "techStack": [],
    "descriptions": [],
}

INITIAL_FEATURED_SKILL: FeaturedSkill = {"skill": "", "rating": 4}
INITIAL_FEATURED_SKILLS: List[FeaturedSkill] = [
    deepcopy(INITIAL_FEATURED_SKILL) for _ in range(6)
]

INITIAL_SKILLS: ResumeSkills = {
    "featuredSkills": INITIAL_FEATURED_SKILLS,
    "descriptions": [],
}

INITIAL_CUSTOM: ResumeCustom = {
    "descriptions": [],
}

INITIAL_RESUME_STATE: Resume = {
    "profile": deepcopy(INITIAL_PROFILE),
    "workExperiences": [deepcopy(INITIAL_WORK_EXPERIENCE)],
    "educations": [deepcopy(INITIAL_EDUCATION)],
    "projects": [deepcopy(INITIAL_PROJECT)],
    "skills": deepcopy(INITIAL_SKILLS),
    "custom": deepcopy(INITIAL_CUSTOM),
}


# State management functions (reducer-like)
class ResumeState:
    """Manages resume state and provides methods to update it."""

    def __init__(self):
        """Initialize with default resume state."""
        self.state: Resume = deepcopy(INITIAL_RESUME_STATE)

    def change_profile(self, field: str, value: str) -> None:
        """Update a profile field."""
        if field in self.state["profile"]:
            self.state["profile"][field] = value  # type: ignore

    def change_work_experiences(
        self, idx: int, field: str, value: Union[str, List[str]]
    ) -> None:
        """Update a work experience field."""
        if idx < len(self.state["workExperiences"]):
            self.state["workExperiences"][idx][field] = value  # type: ignore

    def change_educations(
        self, idx: int, field: str, value: Union[str, List[str]]
    ) -> None:
        """Update an education field."""
        if idx < len(self.state["educations"]):
            self.state["educations"][idx][field] = value  # type: ignore

    def change_projects(
        self, idx: int, field: str, value: Union[str, List[str]]
    ) -> None:
        """Update a project field."""
        if idx < len(self.state["projects"]):
            self.state["projects"][idx][field] = value  # type: ignore

    def change_skills(
        self,
        field: str,
        value: Union[List[str], None] = None,
        idx: Union[int, None] = None,
        skill: Union[str, None] = None,
        rating: Union[float, None] = None,
    ) -> None:
        """Update skills field or featured skill."""
        if field == "descriptions" and value is not None:
            self.state["skills"]["descriptions"] = value
        elif field == "featuredSkills" and idx is not None:
            if idx < len(self.state["skills"]["featuredSkills"]):
                self.state["skills"]["featuredSkills"][idx]["skill"] = skill or ""  # type: ignore
                self.state["skills"]["featuredSkills"][idx]["rating"] = rating or 0  # type: ignore

    def change_custom(self, value: List[str]) -> None:
        """Update custom descriptions."""
        self.state["custom"]["descriptions"] = value

    def add_section_in_form(self, form: ShowForm) -> None:
        """Add a new section to the specified form."""
        if form == "workExperiences":
            self.state["workExperiences"].append(deepcopy(INITIAL_WORK_EXPERIENCE))
        elif form == "educations":
            self.state["educations"].append(deepcopy(INITIAL_EDUCATION))
        elif form == "projects":
            self.state["projects"].append(deepcopy(INITIAL_PROJECT))

    def move_section_in_form(
        self, form: ShowForm, idx: int, direction: Literal["up", "down"]
    ) -> None:
        """Move a section up or down in the specified form."""
        if form not in ["skills", "custom"]:
            section_list = self.state[form]  # type: ignore
            if (idx == 0 and direction == "up") or (
                idx == len(section_list) - 1 and direction == "down"
            ):
                return

            if direction == "up":
                section_list[idx], section_list[idx - 1] = (
                    section_list[idx - 1],
                    section_list[idx],
                )
            else:
                section_list[idx], section_list[idx + 1] = (
                    section_list[idx + 1],
                    section_list[idx],
                )

    def delete_section_in_form_by_idx(self, form: ShowForm, idx: int) -> None:
        """Delete a section from the specified form by index."""
        if form not in ["skills", "custom"]:
            section_list = self.state[form]  # type: ignore
            if 0 <= idx < len(section_list):
                section_list.pop(idx)

    def set_resume(self, resume: Resume) -> None:
        """Replace entire resume state."""
        self.state = deepcopy(resume)

    def get_resume(self) -> Resume:
        """Get current resume state."""
        return deepcopy(self.state)

    def get_profile(self) -> ResumeProfile:
        """Get profile from state."""
        return deepcopy(self.state["profile"])

    def get_work_experiences(self) -> List[ResumeWorkExperience]:
        """Get work experiences from state."""
        return deepcopy(self.state["workExperiences"])

    def get_educations(self) -> List[ResumeEducation]:
        """Get educations from state."""
        return deepcopy(self.state["educations"])

    def get_projects(self) -> List[ResumeProject]:
        """Get projects from state."""
        return deepcopy(self.state["projects"])

    def get_skills(self) -> ResumeSkills:
        """Get skills from state."""
        return deepcopy(self.state["skills"])

    def get_custom(self) -> ResumeCustom:
        """Get custom from state."""
        return deepcopy(self.state["custom"])

resume_state = ResumeState()
