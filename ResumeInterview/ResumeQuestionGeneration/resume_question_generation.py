"""
ResumeQuestionGeneration/question_generator.py

Refactored from your original script. Key changes:
  1. InMemRagQuestionGenerator now takes resume_data as a constructor
     argument instead of reading a hardcoded Windows path — the API will
     have the parsed resume in memory already, from the /parse step.
  2. Removed the module-level code that ran on import (`generator = ...`,
     `question = generator.generate_rag_question(...)`, `print(question)`).
     That code executed a real Ollama call every time this file was
     imported, which would fire on every FastAPI server startup — removed.
  3. Added generate_questions_for_resume(), which maps your frontend's
     focusOptions (Projects/Experience/Skills/Gaps/Leadership/Metrics) and
     persona selector to actual resume content, then generates N questions
     by calling generate_rag_question() once per target.
  4. NEW: Leadership questions no longer go through resume RAG context.
     They're generated from a fixed bank of behavioral topics via
     generate_generic_question(), which uses a resume-free prompt.
     Skills/Experience/Projects/Education/Metrics/Gaps still use RAG
     context as before.
"""

import json
import os
import requests
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

from ATSScoreChecker.ats_score_checker import get_embedder

PERSONA_STYLES = {
    "hiring-manager": "You are an experienced hiring manager focused on real, hands-on experience.",
    "hr-partner": "You are an HR partner focused on culture fit, communication, and soft skills.",
    "founder": "You are a startup founder focused on ownership, initiative, and impact.",
    "drill-sergeant": "You are a high-pressure interviewer who asks direct, fast-paced follow-up questions.",
}

# Fixed bank of behavioral/leadership topics — deliberately resume-agnostic.
# Used for the "Leadership" focus so questions don't reference any specific
# project, company, or skill from the candidate's resume.
LEADERSHIP_TOPICS = [
    "handling conflict within a team",
    "taking initiative without being asked",
    "influencing teammates without formal authority",
    "dealing with a disagreement with a manager or senior",
    "motivating a team member who was underperforming",
    "making a decision under pressure with incomplete information",
    "receiving critical feedback and acting on it",
    "balancing competing priorities from multiple stakeholders",
]


class InMemRagQuestionGenerator:

    OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434/api/generate")
    if not OLLAMA_URL.endswith("/api/generate") and not OLLAMA_URL.endswith("/api/chat"):
        OLLAMA_URL = f"{OLLAMA_URL.rstrip('/')}/api/generate"
    MODEL_NAME = os.environ.get("OLLAMA_MODEL", "gemma3:4b")

    def __init__(self, resume_data: dict):
        self.embedder = get_embedder()
        self.resume_data = resume_data
        self.resume_chunks = self._chunk_resume(self.resume_data)

    # ==========================================================
    # RESUME CHUNKING
    # ==========================================================
    def _chunk_resume(self, resume_data):
        chunks = []

        profile = resume_data.get("profile", {})
        summary = profile.get("summary", "")
        if summary:
            chunks.append({"type": "summary", "source": "profile", "text": summary})

        for exp in resume_data.get("workExperiences", resume_data.get("experience", [])):
            company = exp.get("company", "")
            role = exp.get("jobTitle", exp.get("title", ""))
            date = exp.get("date", exp.get("duration", ""))
            base = f"\nRole: {role}\nCompany: {company}\nDuration: {date}\n"
            descs = exp.get("descriptions", exp.get("responsibilities", []))
            for desc in descs:
                chunks.append({"type": "experience", "source": company, "text": base + "\nAchievement:\n" + desc})

        for project in resume_data.get("projects", []):
            name = project.get("project", project.get("name", ""))
            tech = ", ".join(project.get("techStack", project.get("technologies", [])))
            date = project.get("date", "")
            base = f"\nProject: {name}\nDate: {date}\nTech Stack:\n{tech}\n"
            descs = project.get("descriptions", project.get("highlights", []))
            for desc in descs:
                chunks.append({"type": "project", "source": name, "text": base + "\nDescription:\n" + desc})

        skills = resume_data.get("skills", [])
        if skills:
            chunks.append({"type": "skills", "source": "skills", "text": "Skills:\n" + ", ".join(skills)})

        achievements = resume_data.get("achievements", {})
        ach_list = achievements.get("achievements", []) if isinstance(achievements, dict) else achievements
        for achievement in ach_list:
            chunks.append({"type": "achievement", "source": "achievement", "text": achievement})

        return chunks

    # ==========================================================
    # RETRIEVE
    # ==========================================================
    def retrieve_context(self, query, top_k=3):
        chunks = self.resume_chunks
        if not chunks:
            return "No resume context found."

        texts = [chunk["text"] for chunk in chunks]
        query_embedding = self.embedder.encode([query])
        chunk_embeddings = self.embedder.encode(texts)

        similarity = cosine_similarity(query_embedding, chunk_embeddings)[0]
        indices = np.argsort(similarity)[::-1][:top_k]

        retrieved = [texts[idx] for idx in indices if similarity[idx] > 0.30]

        if not retrieved:
            return "No relevant experience found."

        return "\n\n".join(retrieved)

    # ==========================================================
    # ==========================================================
    # OLLAMA / FALLBACK LLM
    # ==========================================================
    def ask_ollama(self, prompt):
        try:
            try:
                from llm_fallback import generate_with_fallback
            except ImportError:
                import sys
                parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
                if parent_dir not in sys.path:
                    sys.path.append(parent_dir)
                from llm_fallback import generate_with_fallback
            return generate_with_fallback(prompt, temperature=0.4, top_p=0.9)
        except Exception as e:
            print(f"[Fallback Import/Execution Warning] Using direct Ollama request due to: {e}")
            response = requests.post(
                self.OLLAMA_URL,
                json={"model": self.MODEL_NAME, "prompt": prompt, "stream": False,
                      "options": {"temperature": 0.4, "top_p": 0.9}}
            )
            response.raise_for_status()
            return response.json()["response"]

    # ==========================================================
    # GENERATE QUESTION — WITH RESUME CONTEXT (RAG)
    # ==========================================================
    def generate_rag_question(self, target_skill, persona="hiring-manager"):
        context = self.retrieve_context(query=target_skill)
        persona_line = PERSONA_STYLES.get(persona, PERSONA_STYLES["hiring-manager"])

        prompt = f"""
{persona_line} You are interviewing a fresher (0-2 years experience).

Candidate Skill:
{target_skill}

Candidate Resume Context:
{context}

Instructions:
- Ask ONLY ONE interview question.
- The question should be easy to medium difficulty.
- Prefer questions based on the candidate's resume or projects.
- Focus on implementation, basic concepts, debugging, coding decisions, or project experience.
- Avoid system design, scalability, distributed systems, architecture, and advanced optimization questions.
- If the resume contains relevant experience, ask about what the candidate built or implemented.
- If there is no relevant experience, ask one practical beginner-level question about {target_skill}.
- The question should be conversational, like a real campus placement interview.

Return ONLY the interview question.
"""
        return self.ask_ollama(prompt)

    # ==========================================================
    # GENERATE QUESTION — WITHOUT RESUME CONTEXT
    # ==========================================================
    def generate_generic_question(self, topic, persona="hiring-manager"):
        """
        Used for behavioral/leadership questions. Deliberately does NOT call
        retrieve_context() or reference the resume at all — these should be
        standard behavioral/situational questions, not tied to any specific
        project, company, or skill the candidate listed.
        """
        persona_line = PERSONA_STYLES.get(persona, PERSONA_STYLES["hiring-manager"])

        prompt = f"""
{persona_line} You are interviewing a fresher (0-2 years experience) for a behavioral/leadership round.

Topic to probe: {topic}

Instructions:
- Ask ONLY ONE interview question.
- Do NOT reference any specific resume, project, company, or skill — this is a general behavioral question.
- The question should be a classic behavioral/situational interview question (e.g. "Tell me about a time when...").
- Keep it realistic for a campus placement or fresher interview.
- Conversational tone, like a real interviewer.

Return ONLY the interview question.
"""
        return self.ask_ollama(prompt)


# ==========================================================
# FOCUS -> TARGET MAPPING
# ==========================================================
def _get_focus_targets(resume_data: dict, focus: str, limit: int) -> list:
    focus = (focus or "Projects").lower()

    if focus == "skills":
        targets = list(resume_data.get("skills", []))

    elif focus == "experience":
        exps = resume_data.get("workExperiences", resume_data.get("experience", []))
        targets = [e.get("jobTitle", e.get("title", "")) for e in exps]

    elif focus == "projects":
        targets = []
        for p in resume_data.get("projects", []):
            name = p.get("project", p.get("name", ""))
            tech = p.get("techStack", p.get("technologies", []))
            if name:
                targets.append(name)
            targets.extend(tech)

    elif focus == "education":
        edus = resume_data.get("educations", resume_data.get("education", []))
        targets = [e.get("degree", "") for e in edus]

    elif focus == "leadership":
        # Resume-agnostic — pull from the fixed behavioral topic bank
        # instead of skills/projects. Handled without RAG context in
        # generate_questions_for_resume() below.
        targets = list(LEADERSHIP_TOPICS)

    elif focus in ("metrics", "gaps"):
        # No direct resume field maps cleanly to these — fall back to
        # skills + project names as discussion anchors. Still resume-grounded.
        targets = list(resume_data.get("skills", []))
        for p in resume_data.get("projects", []):
            name = p.get("project", p.get("name", ""))
            if name:
                targets.append(name)

    else:
        targets = list(resume_data.get("skills", []))

    targets = [t for t in targets if t]
    if not targets:
        targets = ["general software engineering"]

    result = []
    i = 0
    while len(result) < limit:
        result.append(targets[i % len(targets)])
        i += 1

    return result


# -----------------------------
# API ENTRYPOINT — this is what api.py imports
# -----------------------------
def generate_questions_for_resume(
    resume_data: dict,
    focus: str = "Projects",
    num_questions: int = 5,
    persona: str = "hiring-manager",
) -> list:
    """
    Returns a list of {question, expectedKeywords} dicts, matching the shape
    ResumeVerification.jsx expects for verification.verificationQuestions.

    For focus == "leadership", questions are generated WITHOUT resume
    context (generic behavioral questions from LEADERSHIP_TOPICS). All
    other focus values continue to use RAG-grounded questions from the
    resume.
    """
    generator = InMemRagQuestionGenerator(resume_data)
    targets = _get_focus_targets(resume_data, focus, num_questions)
    is_leadership = (focus or "").lower() == "leadership"

    questions = []
    for target in targets:
        if is_leadership:
            q_text = generator.generate_generic_question(target, persona=persona)
        else:
            q_text = generator.generate_rag_question(target, persona=persona)

        questions.append({
            "question": q_text.strip(),
            "expectedKeywords": [target],
        })

    return questions


# -----------------------------
# CLI — only runs when executed directly, never on import
# -----------------------------
if __name__ == "__main__":
    with open("parsed_resume.json", "r", encoding="utf-8") as f:
        resume_data = json.load(f)
    questions = generate_questions_for_resume(resume_data, focus="Projects", num_questions=3)
    print(json.dumps(questions, indent=2))