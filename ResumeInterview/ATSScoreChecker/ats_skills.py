"""
ats_skills.py
─────────────────────────────────────────────────────────────
SkillsScorer — compares resume skills against JD skills using
exact substring matching first, then falls back to embedding-
based soft matching for near-synonyms.
─────────────────────────────────────────────────────────────
"""

from typing import List, Tuple

from sklearn.metrics.pairwise import cosine_similarity

from ATSScoreChecker.ats_common import get_embedder


class SkillsScorer:

    SOFT_MATCH_THRESHOLD = 0.82

    def score(
        self,
        resume_skills: List[str],
        jd_skills: List[str],
        use_soft_match: bool = True,
    ) -> Tuple[float, List[str], List[str]]:

        if not jd_skills:
            return 100.0, [], []

        resume_lower = [str(s).lower().strip() for s in resume_skills]
        jd_lower = [str(s).lower().strip() for s in jd_skills]

        matched = []
        missing = []

        for jd_skill in jd_lower:
            if any(jd_skill in r or r in jd_skill for r in resume_lower):
                matched.append(jd_skill)
                continue

            if use_soft_match:
                emb = get_embedder()
                jd_vec = emb.encode([jd_skill])
                res_vecs = emb.encode(resume_lower) if resume_lower else None

                if res_vecs is not None and len(res_vecs) > 0:
                    sims = cosine_similarity(jd_vec, res_vecs)[0]
                    if sims.max() >= self.SOFT_MATCH_THRESHOLD:
                        matched.append(jd_skill)
                        continue

            missing.append(jd_skill)

        score = (len(matched) / len(jd_lower)) * 100
        return round(score, 2), matched, missing