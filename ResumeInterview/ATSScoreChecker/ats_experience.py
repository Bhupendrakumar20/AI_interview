"""
ats_experience.py
─────────────────────────────────────────────────────────────
ExperienceScorer — scores candidate work experience against a
job description across three axes: skill overlap (semantic +
exact), years of experience, and seniority level.

Also houses the pluggable embedding-backend infrastructure
(SentenceTransformer / Voyage / OpenAI) used by the semantic
skill matcher.
─────────────────────────────────────────────────────────────
"""

import os
import re
from datetime import datetime
from typing import List, Tuple

import numpy as np

from ATSScoreChecker.ats_common import extract_skills


# ─────────────────────────────────────────────────────────────
# SENIORITY CONFIG
# ─────────────────────────────────────────────────────────────

SENIORITY_KEYWORDS = {
    "senior": ["senior", "lead", "principal", "staff", "architect", "head of"],
    "mid": ["mid", "intermediate", "software engineer ii", "sde-2"],
    "junior": ["junior", "associate", "entry", "fresher", "graduate", "intern"],
}
SENIORITY_YEAR_MAP = {"senior": 5.0, "mid": 3.0, "junior": 1.0}


# ─────────────────────────────────────────────────────────────
# EMBEDDING BACKENDS
# ─────────────────────────────────────────────────────────────

class EmbeddingBackend:
    def embed(self, texts: List[str]) -> np.ndarray:
        raise NotImplementedError

    def similarity(self, a: np.ndarray, b: np.ndarray) -> np.ndarray:
        a_norm = a / (np.linalg.norm(a, axis=1, keepdims=True) + 1e-10)
        b_norm = b / (np.linalg.norm(b, axis=1, keepdims=True) + 1e-10)
        return a_norm @ b_norm.T


class SentenceTransformerBackend(EmbeddingBackend):
    def __init__(self, model: str = "all-MiniLM-L6-v2"):
        from sentence_transformers import SentenceTransformer
        print(f"[SentenceTransformer] Loading model: {model}")
        self.model = SentenceTransformer(model)

    def embed(self, texts: List[str]) -> np.ndarray:
        return self.model.encode(texts, normalize_embeddings=True)


class VoyageBackend(EmbeddingBackend):
    def __init__(self, model: str = "voyage-3-lite"):
        import voyageai
        api_key = os.environ.get("VOYAGE_API_KEY")
        if not api_key:
            raise ValueError("Set VOYAGE_API_KEY environment variable.")
        self.client = voyageai.Client(api_key=api_key)
        self.model = model
        print(f"[Voyage] Using model: {model}")

    def embed(self, texts: List[str]) -> np.ndarray:
        result = self.client.embed(texts, model=self.model, input_type="document")
        return np.array(result.embeddings)


class OpenAIBackend(EmbeddingBackend):
    def __init__(self, model: str = "text-embedding-3-small"):
        from openai import OpenAI
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("Set OPENAI_API_KEY environment variable.")
        self.client = OpenAI(api_key=api_key)
        self.model = model
        print(f"[OpenAI] Using model: {model}")

    def embed(self, texts: List[str]) -> np.ndarray:
        resp = self.client.embeddings.create(input=texts, model=self.model)
        return np.array([e.embedding for e in resp.data])


def get_backend(name: str) -> EmbeddingBackend:
    backends = {
        "sentence-transformers": SentenceTransformerBackend,
        "voyage": VoyageBackend,
        "openai": OpenAIBackend,
    }
    if name not in backends:
        raise ValueError(f"Unknown backend '{name}'. Choose: {list(backends)}")
    return backends[name]()


# ─────────────────────────────────────────────────────────────
# SEMANTIC SKILL MATCHER
# ─────────────────────────────────────────────────────────────

class SemanticSkillMatcher:
    def __init__(self, backend: EmbeddingBackend, threshold: float = 0.65):
        self.backend = backend
        self.threshold = threshold

    def match(
        self,
        jd_skills: set,
        exp_skills: set,
        project_skills: set,
    ) -> dict:
        jd_list = sorted(jd_skills)
        all_candidate = exp_skills | project_skills

        # Pass 1: Exact matching
        exact_exp: dict = {}
        exact_proj: dict = {}
        remaining_jd: List[str] = []

        for skill in jd_list:
            if skill in exp_skills:
                exact_exp[skill] = skill
            elif skill in project_skills:
                exact_proj[skill] = skill
            else:
                remaining_jd.append(skill)

        # Pass 2: Semantic matching
        sem_exp: dict = {}
        sem_proj: dict = {}
        unmatched: List[str] = []

        if remaining_jd and all_candidate:
            candidate_list = sorted(all_candidate)
            all_texts = remaining_jd + candidate_list
            all_embeddings = self.backend.embed(all_texts)
            jd_embeddings = all_embeddings[:len(remaining_jd)]
            cand_embeddings = all_embeddings[len(remaining_jd):]
            sim_matrix = self.backend.similarity(jd_embeddings, cand_embeddings)

            for i, jd_skill in enumerate(remaining_jd):
                sims = sim_matrix[i]
                best_idx = int(np.argmax(sims))
                best_score = float(sims[best_idx])
                best_candidate = candidate_list[best_idx]

                if best_score >= self.threshold:
                    if best_candidate in exp_skills:
                        sem_exp[jd_skill] = (best_candidate, round(best_score, 3))
                    else:
                        sem_proj[jd_skill] = (best_candidate, round(best_score, 3))
                else:
                    unmatched.append(jd_skill)

        # Weighted score
        total = len(jd_list) if jd_list else 1
        weighted = 0.0

        for _ in exact_exp:
            weighted += 1.0
        for _ in exact_proj:
            weighted += 0.6
        for _, (_, sim) in sem_exp.items():
            weighted += sim
        for _, (_, sim) in sem_proj.items():
            weighted += sim * 0.6

        skill_score = round((weighted / total) * 100, 2)

        return {
            "skill_score": skill_score,
            "jd_skills_count": len(jd_list),
            "exact_exp_match": sorted(exact_exp.keys()),
            "exact_proj_match": sorted(exact_proj.keys()),
            "semantic_exp_match": {k: v for k, v in sorted(sem_exp.items())},
            "semantic_proj_match": {k: v for k, v in sorted(sem_proj.items())},
            "missing_skills": sorted(unmatched),
            "weighted_score": round(weighted, 2),
        }


# ─────────────────────────────────────────────────────────────
# EXPERIENCE SCORER
# ─────────────────────────────────────────────────────────────

class ExperienceScorer:

    def __init__(
        self,
        backend: str = "sentence-transformers",
        semantic_threshold: float = 0.65,
    ):
        self.matcher = SemanticSkillMatcher(
            backend=get_backend(backend),
            threshold=semantic_threshold,
        )

    def _extract_years(self, text: str) -> float:
        patterns = [
            r"(\d+)\s*\+\s*(?:years?|yrs?)",
            r"(\d+)\s*-\s*(\d+)\s*(?:years?|yrs?)",
            r"(\d+)\s*(?:years?|yrs?)",
        ]
        for pat in patterns:
            m = re.search(pat, text, re.IGNORECASE)
            if m:
                if m.lastindex and m.lastindex >= 2:
                    return (float(m.group(1)) + float(m.group(2))) / 2
                return float(m.group(1))
        return 0.0

    def _extract_duration_years(self, d: str) -> float:
        """
        Parse duration strings like:
          'Jan 2025 – Present'  → years from start to now
          '2022 – 2024'         → 2
          '2 years'             → 2
        """
        v = self._extract_years(d)
        if v > 0:
            return v

        # Look for year pairs
        years = re.findall(r'\b(20\d{2}|19\d{2})\b', d)
        if len(years) >= 2:
            return abs(int(years[-1]) - int(years[0]))

        # "Present" / "Current" with a single start year → compute from now
        if re.search(r'\b(present|current|now)\b', d, re.IGNORECASE):
            year_match = re.search(r'\b(20\d{2}|19\d{2})\b', d)
            if year_match:
                start_year = int(year_match.group(1))
                return round(max(0.0, datetime.now().year - start_year +
                                  (datetime.now().month - 1) / 12), 2)

        return 0.0

    def _extract_seniority(self, text: str) -> str:
        # Only look at the first 3 lines where job title usually appears
        title_section = "\n".join(text.strip().splitlines()[:3]).lower()

        for tier, keywords in SENIORITY_KEYWORDS.items():
            if any(kw in title_section for kw in keywords):
                return tier

        # Fallback: scan full text but require word boundaries
        text_lower = text.lower()
        for tier, keywords in SENIORITY_KEYWORDS.items():
            for kw in keywords:
                # require the keyword to be near "engineer/developer/role" words
                pattern = rf'\b{re.escape(kw)}\b.{{0,30}}(?:engineer|developer|role|position|analyst)'
                if re.search(pattern, text_lower):
                    return tier

        return "junior"

    def _extract_jd_requirements(self, jd_text: str) -> dict:
        jd_lower = jd_text.lower()
        years_required = 0.0
        year_patterns = [
            r"minimum\s+(\d+)\+?\s*(?:years?|yrs?)",
            r"at\s+least\s+(\d+)\+?\s*(?:years?|yrs?)",
            r"(\d+)\+\s*(?:years?|yrs?)\s+(?:of\s+)?(?:experience|exp)",
            r"(\d+)\s*-\s*(\d+)\s*(?:years?|yrs?)\s+(?:of\s+)?(?:experience|exp)",
            r"(\d+)\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:backend|software|relevant)",
        ]
        for pat in year_patterns:
            m = re.search(pat, jd_lower)
            if m:
                if m.lastindex and m.lastindex >= 2:
                    years_required = (float(m.group(1)) + float(m.group(2))) / 2
                else:
                    years_required = float(m.group(1))
                break
        return {
            "years_required": years_required,
            "required_skills": extract_skills(jd_text),
            "seniority": self._extract_seniority(jd_text),
        }

    def _build_candidate_profile(self, resume_data: dict) -> dict:
        total_years: float = 0.0
        exp_skills: set = set()
        project_skills: set = set()
        titles: list = []
        exp_entries: list = []

        for exp in resume_data.get("experience", []):
            dur = exp.get("duration", "")
            yrs = self._extract_duration_years(dur)
            total_years += yrs

            responsibilities = exp.get("responsibilities", [])
            if isinstance(responsibilities, list):
                resp_text = " ".join(responsibilities)
            else:
                resp_text = str(responsibilities)

            text = " ".join(filter(None, [
                exp.get("title", ""),
                exp.get("company", ""),
                exp.get("description", ""),
                resp_text,
            ]))
            skills = extract_skills(text)
            exp_skills |= skills
            titles.append(exp.get("title", ""))
            exp_entries.append({
                "type": "experience",
                "title": exp.get("title", ""),
                "company": exp.get("company", ""),
                "duration": dur,
                "years": round(yrs, 2),
                "matched_skills": sorted(skills),
            })

        for proj in resume_data.get("projects", []):
            highlights = proj.get("highlights", proj.get("descriptions", []))
            if isinstance(highlights, list):
                highlights_text = " ".join(str(h) for h in highlights)
            else:
                highlights_text = str(highlights)

            tech = proj.get("technologies", proj.get("techStack", []))
            if isinstance(tech, list):
                tech_text = " ".join(str(t) for t in tech)
            else:
                tech_text = str(tech)

            text = " ".join(filter(None, [
                proj.get("name", ""),
                proj.get("description", ""),
                tech_text,
                highlights_text,
            ]))
            project_skills |= extract_skills(text)

        return {
            "total_years": total_years,
            "exp_skills": exp_skills,
            "project_skills": project_skills,
            "titles": titles,
            "seniority": self._extract_seniority(" ".join(titles)),
            "exp_entries": exp_entries,
            "project_count": len(resume_data.get("projects", [])),
        }

    def _score_years(self, candidate_years: float, jd_req: dict) -> Tuple[float, str]:
        required = jd_req["years_required"] or SENIORITY_YEAR_MAP.get(jd_req["seniority"], 2.0)
        if candidate_years >= required:
            return 100.0, f"Candidate has {candidate_years}y >= required {required}y"
        elif candidate_years == 0.0:
            return 20.0, f"No extractable years; required {required}y"
        else:
            ratio = (candidate_years / required) * 100
            return round(ratio, 2), f"{candidate_years}y of {required}y required ({round(ratio)}%)"

    def _score_seniority(self, candidate: str, required: str) -> Tuple[float, str]:
        rank = {"junior": 1, "mid": 2, "senior": 3}
        c, r = rank.get(candidate, 2), rank.get(required, 2)
        if c == r:
            return 100.0, f"Seniority match ({required})"
        elif c > r:
            return 80.0, f"Over-qualified: candidate={candidate}, JD={required}"
        else:
            return max(0.0, 100.0 - (r - c) * 25), f"Under-qualified: candidate={candidate}, JD={required}"

    def score(self, resume_data: dict, jd_text: str) -> Tuple[float, dict]:
        if not resume_data.get("experience") and not resume_data.get("projects"):
            return 0.0, {"reason": "No experience or projects found"}

        jd_req = self._extract_jd_requirements(jd_text)
        profile = self._build_candidate_profile(resume_data)

        skill_match = self.matcher.match(
            jd_skills=jd_req["required_skills"],
            exp_skills=profile["exp_skills"],
            project_skills=profile["project_skills"],
        )

        years_score, years_reason = self._score_years(profile["total_years"], jd_req)
        seniority_score, seniority_reason = self._score_seniority(
            profile["seniority"], jd_req["seniority"]
        )

        final = skill_match["skill_score"] * 0.55 + years_score * 0.25 + seniority_score * 0.20

        return round(final, 2), {
            "years_required_jd": jd_req["years_required"],
            "years_in_resume": round(profile["total_years"], 2),
            "years_score": years_score,
            "years_reason": years_reason,
            "skill_score": skill_match["skill_score"],
            "skill_details": skill_match,
            "seniority_score": seniority_score,
            "seniority_reason": seniority_reason,
            "final_score": round(final, 2),
            "weights": {"skills": "55%", "years": "25%", "seniority": "20%"},
            "experience_entries": profile["exp_entries"],
            "project_count": profile["project_count"],
            "semantic_threshold": self.matcher.threshold,
        }