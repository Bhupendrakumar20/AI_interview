"""
ats_common.py
─────────────────────────────────────────────────────────────
Shared utilities used across all ATS scorer modules:
  - Lazy model loaders (spaCy, SentenceTransformer)
  - Resume schema normalizer (parsed JSON -> internal schema)
  - Canonical skills / aliases + generic skill extraction
  - ScoreBreakdown dataclass (the overall result container)
─────────────────────────────────────────────────────────────
"""

import re
from dataclasses import dataclass, field
from typing import Optional, List


# ─────────────────────────────────────────────────────────────
# MODEL LOADING
# ─────────────────────────────────────────────────────────────

_nlp = None
_embedder = None


def get_nlp():
    global _nlp
    if _nlp is None:
        import spacy
        _nlp = spacy.load("en_core_web_sm")
    return _nlp


def get_embedder():
    global _embedder

    if _embedder is None:
        print("\n⏳ Loading Hugging Face embedding model...")

        from langchain_huggingface import HuggingFaceEmbeddings

        _embedder = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2",
            model_kwargs={"device": "cpu"},
            encode_kwargs={"normalize_embeddings": True}
        )

        print("✅ Hugging Face embedding model loaded\n")

    return _embedder


# ─────────────────────────────────────────────────────────────
# SCHEMA NORMALIZER
# ─────────────────────────────────────────────────────────────

def _join_descriptions(descriptions) -> str:
    """Safely join a descriptions field that may be a list or string."""
    if isinstance(descriptions, list):
        return " ".join(str(d) for d in descriptions if d)
    if isinstance(descriptions, str):
        return descriptions
    return ""


def normalize_resume(raw: dict) -> dict:
    """
    Convert the parsed resume JSON schema into the internal schema
    expected by all scorers.

    Parsed schema                  →  Internal schema
    ─────────────────────────────────────────────────
    profile.name / email / phone   →  name, email, phone
    educations[]                   →  education[]
      .school                      →    .institution
      .degree                      →    .degree
      .gpa                         →    .cgpa
      .date                        →    .year
      .descriptions[]              →    .field  (extracted if possible)
    workExperiences[]              →  experience[]
      .company                     →    .company
      .jobTitle                    →    .title
      .date                        →    .duration
      .descriptions[]              →    .responsibilities[]
    projects[]                     →  projects[]
      .project                     →    .name
      .techStack[]                 →    .technologies[]
      .descriptions[]              →    .highlights[]
      .date                        →    .date
    achievements (nested dict)     →  achievements[], certifications[]
      .achievements[]              →    achievements[]
      .certifications[]            →    certifications[]
      .awards[]                    →    achievements[]  (merged)
    skills[]                       →  skills[]  (unchanged)
    """
    normalized: dict = {}

    # ── Profile ──────────────────────────────────────────────
    profile = raw.get("profile", {})
    normalized["name"] = profile.get("name", raw.get("name", ""))
    normalized["email"] = profile.get("email", raw.get("email", ""))
    normalized["phone"] = profile.get("phone", raw.get("phone", ""))
    normalized["summary"] = profile.get("summary", raw.get("summary", ""))

    # ── Education ────────────────────────────────────────────
    raw_educations = raw.get("educations", raw.get("education", []))
    education_list = []
    for edu in raw_educations:
        degree_str = edu.get("degree", "")
        # Try to extract field from "B.Tech in Computer Science"
        field_val = ""
        m = re.search(r'\bin\s+([A-Za-z &/]+)', degree_str, re.IGNORECASE)
        if m:
            field_val = m.group(1).strip()
        else:
            # Try parentheses: "B.E (CSE)"
            m2 = re.search(r'\(([^)]+)\)', degree_str)
            if m2:
                field_val = m2.group(1).strip()

        education_list.append({
            "degree": degree_str,
            "field": field_val,
            "institution": edu.get("school", edu.get("institution", "")),
            "cgpa": edu.get("gpa", edu.get("cgpa", "")),
            "year": edu.get("date", edu.get("year", "")),
        })
    normalized["education"] = education_list

    # ── Work Experience ──────────────────────────────────────
    raw_experiences = raw.get("workExperiences", raw.get("experience", []))
    experience_list = []
    for exp in raw_experiences:
        responsibilities = []
        raw_desc = exp.get("descriptions", exp.get("responsibilities", []))
        if isinstance(raw_desc, list):
            responsibilities = [str(d) for d in raw_desc if d]
        elif isinstance(raw_desc, str):
            responsibilities = [raw_desc]

        experience_list.append({
            "title": exp.get("jobTitle", exp.get("title", "")),
            "company": exp.get("company", ""),
            "duration": exp.get("date", exp.get("duration", "")),
            "location": exp.get("location", ""),
            "description": " ".join(responsibilities),
            "responsibilities": responsibilities,
        })
    normalized["experience"] = experience_list

    # ── Projects ─────────────────────────────────────────────
    raw_projects = raw.get("projects", [])
    project_list = []
    for proj in raw_projects:
        # name: prefer "name", fall back to "project"
        name = proj.get("name", proj.get("project", ""))

        # descriptions: list → highlights list + joined description
        raw_desc = proj.get("descriptions", proj.get("highlights", []))
        if isinstance(raw_desc, list):
            highlights = [str(d) for d in raw_desc if d]
        elif isinstance(raw_desc, str):
            highlights = [raw_desc]
        else:
            highlights = []

        # techStack → technologies
        tech = proj.get("techStack", proj.get("technologies", []))
        if isinstance(tech, str):
            tech = [t.strip() for t in tech.split(",") if t.strip()]

        project_list.append({
            "name": name,
            "descriptions": highlights,          # kept for ProjectsScorer._build_project_text
            "highlights": highlights,
            "technologies": tech,
            "techStack": tech,                   # kept for backward compat
            "description": " ".join(highlights),
            "date": proj.get("date", ""),
            "impact": proj.get("impact", ""),
            "role": proj.get("role", ""),
        })
    normalized["projects"] = project_list

    # ── Skills ───────────────────────────────────────────────
    normalized["skills"] = raw.get("skills", [])

    # ── Achievements / Certifications ────────────────────────
    raw_achievements = raw.get("achievements", {})

    # Handle both:
    #   a) dict with sub-keys  {"achievements": [], "certifications": [], "awards": []}
    #   b) plain list          [{"title": ...}, ...]
    if isinstance(raw_achievements, dict):
        ach_list = raw_achievements.get("achievements", [])
        cert_list = raw_achievements.get("certifications", [])
        award_list = raw_achievements.get("awards", [])

        # Normalize awards → same shape as achievements
        for award in award_list:
            if isinstance(award, dict):
                ach_list.append(award)
            elif isinstance(award, str):
                ach_list.append({"title": award})

        normalized["achievements"] = ach_list
        normalized["certifications"] = cert_list

    elif isinstance(raw_achievements, list):
        normalized["achievements"] = raw_achievements
        normalized["certifications"] = raw.get("certifications", [])

    else:
        normalized["achievements"] = []
        normalized["certifications"] = raw.get("certifications", [])

    # ── Coding profiles (optional field) ─────────────────────
    normalized["coding_profiles"] = raw.get("coding_profiles", [])

    # ── Extracurriculars (optional field) ─────────────────────
    normalized["extracurriculars"] = raw.get("extracurriculars", [])

    return normalized


# ─────────────────────────────────────────────────────────────
# DATA CLASS
# ─────────────────────────────────────────────────────────────

@dataclass
class ScoreBreakdown:
    skills_score: float = 0.0
    experience_score: float = 0.0
    projects_score: float = 0.0
    education_score: float = 0.0
    formatting_score: float = 0.0
    achievements_score: float = 0.0
    final_score: float = 0.0

    matched_skills: List[str] = field(default_factory=list)
    missing_skills: List[str] = field(default_factory=list)

    experience_details: dict = field(default_factory=dict)
    projects_details: dict = field(default_factory=dict)
    education_details: dict = field(default_factory=dict)
    formatting_details: dict = field(default_factory=dict)
    achievements_details: dict = field(default_factory=dict)


# ─────────────────────────────────────────────────────────────
# CANONICAL SKILLS + ALIASES
# ─────────────────────────────────────────────────────────────

CANONICAL_SKILLS: set = {
    "python", "java", "javascript", "typescript", "go", "rust", "c++", "c#",
    "ruby", "scala", "kotlin", "swift", "php", "r", "bash", "shell", "dart",
    "django", "fastapi", "flask", "express", "spring boot", "spring", "rails",
    "laravel", "nestjs", "gin", "fiber", "phoenix", "starlette", "tornado",
    "react", "vue", "angular", "svelte", "nextjs", "nuxt", "html", "css",
    "tailwind", "bootstrap", "webpack", "vite", "redux",
    "postgresql", "mysql", "sqlite", "mariadb", "sql server", "sql",
    "mongodb", "redis", "cassandra", "dynamodb", "couchdb", "firebase",
    "elasticsearch", "opensearch", "neo4j", "influxdb", "memcached",
    "kafka", "rabbitmq", "celery", "sqs", "pubsub", "nats", "kinesis", "pulsar",
    "aws", "gcp", "google cloud", "azure", "heroku", "digitalocean", "cloudflare",
    "ec2", "s3", "lambda", "rds", "ecs", "eks", "cloudwatch", "iam",
    "docker", "kubernetes", "helm", "terraform", "ansible", "jenkins",
    "github actions", "gitlab ci", "circleci", "argocd", "pulumi",
    "prometheus", "grafana", "datadog", "sentry", "opentelemetry", "kibana",
    "pytorch", "tensorflow", "keras", "scikit-learn", "xgboost", "lightgbm",
    "hugging face", "transformers", "langchain", "llamaindex", "openai api",
    "onnx", "mlflow", "ray", "numpy", "pandas", "opencv",
    "rest apis", "graphql", "grpc", "websockets", "oauth", "jwt",
    "microservices", "event-driven architecture", "domain-driven design",
    "system design", "distributed systems", "high availability",
    "ci/cd", "ci/cd pipelines", "test-driven development", "agile", "devops",
    "containerization", "infrastructure as code", "caching", "load balancing",
    "backend development", "full stack", "api development", "scalability",
    "concurrency", "async programming", "object-oriented programming",
    "functional programming", "design patterns", "performance optimization",
    "spark", "hadoop", "airflow", "dbt", "snowflake", "bigquery",
    "databricks", "flink", "hive",
    "git", "github", "gitlab", "jira", "linux", "nginx",
    "ssl/tls", "encryption", "owasp", "vault",
    "pytest", "jest", "unittest", "selenium", "cypress", "playwright",
    "rag", "rlhf", "lora", "vllm", "triton", "langgraph", "weaviate",
    "pinecone", "milvus", "chromadb", "qdrant", "fastembed",
}

SKILL_ALIASES: dict = {
    "ci": "ci/cd", "cd": "ci/cd",
    "ci/cd": "ci/cd pipelines", "cicd": "ci/cd pipelines",
    "github action": "github actions", "gitlab-ci": "gitlab ci",
    "rest": "rest apis", "restful": "rest apis",
    "restful api": "rest apis", "restful apis": "rest apis", "rest api": "rest apis",
    "amazon web services": "aws", "google cloud platform": "gcp",
    "google cloud": "gcp", "microsoft azure": "azure",
    "machine learning": "scikit-learn", "deep learning": "pytorch",
    "nlp": "transformers", "natural language processing": "transformers",
    "llm": "openai api", "large language models": "openai api",
    "node": "javascript", "node.js": "javascript", "nodejs": "javascript",
    "react.js": "react", "vue.js": "vue", "next.js": "nextjs",
    "golang": "go", "fast api": "fastapi",
    "postgres": "postgresql", "mongo": "mongodb", "dynamo": "dynamodb",
    "elastic": "elasticsearch", "k8s": "kubernetes",
    "containerization": "docker", "containerized": "docker",
    "microservice": "microservices",
    "event driven": "event-driven architecture",
    "event-driven": "event-driven architecture",
    "ddd": "domain-driven design", "tdd": "test-driven development",
    "oop": "object-oriented programming",
    "version control": "git", "vcs": "git",
    "backend": "backend development", "api": "rest apis",
    "iac": "infrastructure as code",
}

_BOILERPLATE = {
    "experience", "years", "year", "strong", "proficiency", "knowledge",
    "understanding", "familiarity", "background", "skill", "skills",
    "candidate", "ideal candidate", "role", "position", "job", "team",
    "opportunity", "responsibilities", "requirements", "qualifications",
    "preferred", "required", "minimum", "build", "develop", "design",
    "implement", "create", "write", "maintain", "optimize", "collaborate",
    "computer science", "information technology", "engineering",
    "bachelor", "master", "degree", "phd", "b.tech", "m.tech", "b.e",
    "related field", "relevant field", "compensation", "benefits",
}

_STOP = {
    "a", "an", "the", "and", "or", "but", "if", "in", "on", "at", "to",
    "for", "of", "with", "by", "from", "as", "is", "was", "are", "were",
    "be", "been", "have", "has", "had", "do", "does", "will", "would",
    "should", "could", "may", "might", "not", "no", "so", "that", "this",
    "it", "its", "we", "our", "you", "your", "they", "their",
}


def _normalize_text(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r'^[•\-–—►▪▸\*]+\s*', '', text)
    return re.sub(r'\s+', ' ', text).strip()


def _is_boilerplate(phrase: str) -> bool:
    p = phrase.strip().lower()
    if re.fullmatch(r'[\W_\d]+', p) or len(p) <= 1:
        return True
    if re.fullmatch(r'\d+%?', p):
        return True
    if p in _BOILERPLATE:
        return True
    words = p.split()
    if all(w in _STOP for w in words):
        return True
    if len(words) > 4:
        return True
    _VERBS = {
        "build", "develop", "design", "implement", "create", "write",
        "maintain", "optimize", "collaborate", "contribute", "ensure",
        "manage", "lead", "drive", "support", "integrate", "deploy",
        "monitor", "troubleshoot", "architect", "deliver", "work", "help",
    }
    if words and words[0] in _VERBS:
        return True
    return False


def extract_skills(text: str) -> set:
    """Layer 1 (canonical) + Layer 2 (aliases) + Layer 3 (patterns)."""
    found: set = set()
    text_norm = _normalize_text(text)

    for skill in CANONICAL_SKILLS:
        pat = r'(?<![a-zA-Z0-9\-])' + re.escape(skill) + r'(?![a-zA-Z0-9\-])'
        if re.search(pat, text_norm, re.IGNORECASE):
            found.add(skill)

    words = text_norm.split()
    for n in range(1, 5):
        for i in range(len(words) - n + 1):
            gram = ' '.join(words[i:i + n])
            if gram in SKILL_ALIASES:
                found.add(SKILL_ALIASES[gram])
            elif gram in CANONICAL_SKILLS:
                found.add(gram)

    _CAMEL = re.compile(r'\b[A-Z][a-z]+(?:[A-Z][a-z0-9]+)+\b')
    _ACRONYM = re.compile(r'\b[A-Z]{2,6}\b')
    _DOTTED = re.compile(r'\b[a-zA-Z][a-zA-Z0-9]*\.[a-zA-Z]{2,4}\b')
    _SKIP_ACRO = {"JD", "OR", "AND", "THE", "FOR", "WITH", "API", "IT", "PM", "US", "INC"}

    for m in _CAMEL.finditer(text):
        t = m.group(0).lower()
        if not _is_boilerplate(t) and len(t) > 3:
            found.add(SKILL_ALIASES.get(t, t))

    for m in _ACRONYM.finditer(text):
        t = m.group(0)
        if t not in _SKIP_ACRO:
            tl = t.lower()
            found.add(SKILL_ALIASES.get(tl, tl))

    for m in _DOTTED.finditer(text):
        t = m.group(0).lower()
        if not _is_boilerplate(t):
            found.add(SKILL_ALIASES.get(t, t))

    return found