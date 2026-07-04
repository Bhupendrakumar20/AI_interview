from typing import TypedDict, List, Literal

class ResumeProfile(TypedDict):
    name: str
    email: str
    phone: str
    url: str
    summary: str
    location: str
    linkedin_url: str
    github_url: str


class ResumeWorkExperience(TypedDict):
    company: str
    jobTitle: str
    date: str
    descriptions: List[str]


class ResumeEducation(TypedDict):
    school: str
    degree: str
    date: str
    gpa: str
    descriptions: List[str]


class ResumeProject(TypedDict):
    project: str
    techStack: List[str]
    date: str
    descriptions: List[str]


class FeaturedSkill(TypedDict):
    skill: str
    rating: float


class ResumeSkills(TypedDict):
    featuredSkills: List[FeaturedSkill]
    descriptions: List[str]


class ResumeCertification(TypedDict, total=False):
    name: str
    issuer: str
    date: str


class ResumeAchievements(TypedDict):
    achievements: List[str]
    certifications: List[ResumeCertification]
    awards: List[str]


class ResumeCustom(TypedDict):
    descriptions: List[str]


class Resume(TypedDict):
    profile: ResumeProfile
    workExperiences: List[ResumeWorkExperience]
    educations: List[ResumeEducation]
    projects: List[ResumeProject]
    skills: ResumeSkills
    achievements: ResumeAchievements
    custom: ResumeCustom


ResumeKey = Literal["profile", "workExperiences", "educations", "projects", "skills", "achievements", "custom"]
