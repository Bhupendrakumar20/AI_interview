"""
ats_projects.py
─────────────────────────────────────────────────────────────
ProjectsScorer — scores resume projects against a job
description using a composite of semantic similarity, keyword
(TF-IDF) overlap, and a quality signal (impact / tech / richness),
adjusted by a recency multiplier and aggregated with an
exponential-decay + floor-guarantee scheme.
─────────────────────────────────────────────────────────────
"""

import math
import re
from datetime import datetime
from typing import List, Tuple, Dict

from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer


# ─────────────────────────────────────────────────────────────
# RESCALING HELPERS
# The core insight: cosine similarity lives in [0.25, 0.85]
# for real resume/JD pairs — never 0, never 1.
# Map the *observed* range onto [0, 100] so a strong match
# actually scores high instead of landing at 60.
# ─────────────────────────────────────────────────────────────

def _rescale(value: float, low: float, high: float) -> float:
    """
    Linearly rescale `value` from [low, high] → [0, 100].
    Values below `low` clamp to 0; above `high` clamp to 100.
    """
    if high <= low:
        return 100.0
    return round(min(100.0, max(0.0, (value - low) / (high - low) * 100)), 2)


def _sigmoid_boost(x: float, midpoint: float = 50.0, steepness: float = 0.06) -> float:
    """
    Soft S-curve that pushes mid-range scores (40–70) upward.
    Scores below midpoint get a gentle lift; scores above get
    compressed only slightly — net effect is upward shift.
    Output stays in [0, 100].
    """
    raw = 1 / (1 + math.exp(-steepness * (x - midpoint)))
    # Normalise so sigmoid(0)→0 and sigmoid(100)→100
    lo = 1 / (1 + math.exp(-steepness * (0 - midpoint)))
    hi = 1 / (1 + math.exp(-steepness * (100 - midpoint)))
    return round((raw - lo) / (hi - lo) * 100, 2)


# ─────────────────────────────────────────────────────────────
# IMPACT PATTERNS  — tiered, weighted
# ─────────────────────────────────────────────────────────────

_IMPACT_TIERS: List[Tuple[float, str]] = [
    # Tier A — hard numbers (strongest signal)
    (20.0, r'\b\d+\s*%'),
    (20.0, r'\b\d+x\b'),
    (20.0, r'\b\d+\s*(?:ms|seconds?|minutes?|hrs?|hours?)\b'),
    (20.0, r'\b\d+[kmb]?\s*(?:users?|customers?|requests?|records?|queries|transactions?)\b'),
    (20.0, r'\$[\d,.]+[kmb]?\b'),

    # Tier B — ownership & delivery verbs
    (12.0, r'\b(?:reduced|improved|increased|decreased|optimis[e]?d?|cut|boosted|accelerated|eliminated|automated|scaled)\b'),
    (12.0, r'\b(?:designed|architected|led|owned|built|launched|shipped|deployed|delivered)\b'),

    # Tier C — context / scope signals
    (6.0, r'\b(?:production|live|real.?world|open.?source|millions?|thousands?|enterprise)\b'),
    (6.0, r'\b(?:team\s*of\s*\d+|cross.?functional|end.?to.?end|zero.?downtime)\b'),
]

_IMPACT_COMPILED = [
    (pts, re.compile(pat, re.IGNORECASE)) for pts, pat in _IMPACT_TIERS
]

# Observed ceiling for a genuinely strong project ≈ 80 raw pts.
# Treat that as our "100" by rescaling with low=0, high=80.
_IMPACT_RAW_MAX = 80.0


def _impact_score(text: str) -> float:
    """Returns 0–100 after rescaling from observed raw range."""
    total = 0.0
    for pts, pat in _IMPACT_COMPILED:
        hits = pat.findall(text)
        total += pts * min(len(hits), 3)
    return _rescale(total, low=0, high=_IMPACT_RAW_MAX)


# ─────────────────────────────────────────────────────────────
# TECHNOLOGY SCORER
# ─────────────────────────────────────────────────────────────

_SENIOR_TECH = {
    "kubernetes", "k8s", "terraform", "kafka", "spark", "flink", "cassandra", "redis",
    "elasticsearch", "graphql", "grpc", "pytorch", "tensorflow", "airflow", "dbt",
    "mlflow", "ray", "triton", "rust", "go", "scala", "hbase", "clickhouse", "trino",
    "celery", "rabbitmq", "istio", "prometheus", "grafana", "argocd", "pulsar",
}


def _tech_score(tech_list: list) -> float:
    """Returns 0–100. Rewards breadth + seniority-level tools."""
    if not tech_list:
        return 0.0

    n = len(tech_list)
    base = min(60.0, n * 6.0)                          # 6 pts/tech, cap 60
    senior_ct = sum(1 for t in tech_list if str(t).lower() in _SENIOR_TECH)
    senior_pts = min(40.0, senior_ct * 10.0)            # 10 pts/senior tech, cap 40
    return round(min(100.0, base + senior_pts), 2)


# ─────────────────────────────────────────────────────────────
# RICHNESS SCORER
# ─────────────────────────────────────────────────────────────

def _richness_score(text: str) -> float:
    """
    Rewards description depth. 80 words ≈ full score.
    Uses sqrt curve so 20 words already earns ~50/100 rather than 25/100.
    """
    words = len(text.split())
    if words == 0:
        return 0.0
    # sqrt gives faster early climb: sqrt(20/80)=0.5, sqrt(80/80)=1.0
    return round(min(100.0, math.sqrt(min(words, 80) / 80) * 100), 2)


# ─────────────────────────────────────────────────────────────
# QUALITY SCORE  (combines impact + tech + richness)
# ─────────────────────────────────────────────────────────────

def _build_quality_text(project: dict) -> str:
    desc = project.get("description", "")
    if not desc:
        raw = project.get("descriptions", [])
        desc = " ".join(str(x) for x in raw) if isinstance(raw, list) else str(raw)

    highlights = project.get("highlights", [])
    hl_text = (
        " ".join(str(h) for h in highlights)
        if isinstance(highlights, list) else str(highlights)
    )
    return " ".join(filter(None, [
        desc, hl_text,
        project.get("impact", ""),
        project.get("role", ""),
        project.get("name", ""),
    ]))


def _quality_score(project: dict) -> float:
    """
    Composite quality, 0–100.
      impact   50 %  (quantified results)
      tech     30 %  (stack depth + seniority)
      richness 20 %  (description length)
    +  5 pt bonus for public URL/GitHub link.
    """
    text = _build_quality_text(project)
    tech_list = project.get("techStack", project.get("technologies", []))

    impact = _impact_score(text)
    tech = _tech_score(tech_list)
    richness = _richness_score(text)

    raw = impact * 0.50 + tech * 0.30 + richness * 0.20

    has_link = bool(project.get("url") or project.get("github") or project.get("link"))
    bonus = 5.0 if has_link else 0.0

    return round(min(100.0, raw + bonus), 2)


# ─────────────────────────────────────────────────────────────
# RECENCY WEIGHT  — now a BOOST not just a penalty
# ─────────────────────────────────────────────────────────────

def _recency_weight(project: dict) -> float:
    """
    Returns multiplier in [0.75, 1.10].
    Projects from the current year get a 10% BOOST (1.10).
    Last year → 1.0 (neutral). Each older year → -0.05 (floor 0.75).
    Unknown date → 0.90 (mild penalty, not neutral).
    """
    text = " ".join(filter(None, [
        project.get("duration", ""),
        project.get("date", ""),
        project.get("year", ""),
    ]))
    years = [int(y) for y in re.findall(r'\b(20\d{2})\b', text)]
    if not years:
        return 0.90

    current = datetime.now().year
    most_recent = max(years)
    delta = current - most_recent            # 0 = this year, 1 = last year …

    if delta <= 0:
        return 1.10                          # current year: boost
    return round(max(0.75, 1.0 - (delta - 1) * 0.05), 3)


# ─────────────────────────────────────────────────────────────
# KEYWORD SCORER  (TF-IDF, rescaled)
# ─────────────────────────────────────────────────────────────

class _KeywordScorer:
    """
    TF-IDF bigram overlap. Complements neural embeddings because
    it rewards exact term matches that embedding models can blur.
    Scores are rescaled from [0, 0.5] → [0, 100] because raw
    TF-IDF cosine rarely exceeds 0.5 for resume/JD pairs.
    """
    _KW_RAW_MAX = 0.45   # empirical ceiling for strong resume/JD pair

    def scores(self, project_texts: List[str], jd_text: str) -> List[float]:
        corpus = [jd_text] + project_texts
        vec = TfidfVectorizer(
            ngram_range=(1, 2),
            min_df=1,
            sublinear_tf=True,
            stop_words="english",
        )
        tfidf = vec.fit_transform(corpus)
        jd_vec = tfidf[0:1]
        proj_vecs = tfidf[1:]
        raw_sims = cosine_similarity(proj_vecs, jd_vec).flatten()
        return [
            _rescale(float(s), low=0, high=self._KW_RAW_MAX)
            for s in raw_sims
        ]


# ─────────────────────────────────────────────────────────────
# AGGREGATION  — exponential decay + floor guarantee
# ─────────────────────────────────────────────────────────────

def _aggregate(scores: List[float]) -> float:
    """
    Exponential-decay aggregation (λ=0.6) so the best project
    dominates but breadth still counts.

    Floor guarantee: if the best project scores well (≥70),
    the final is never dragged below 0.85 × best_score by a
    weak tail. This prevents one mediocre project from
    significantly hurting the overall score.
    """
    if not scores:
        return 0.0

    ranked = sorted(scores, reverse=True)
    lam = 0.6
    raw_w = [math.exp(-lam * i) for i in range(len(ranked))]
    total = sum(raw_w)
    weights = [w / total for w in raw_w]

    weighted = sum(s * w for s, w in zip(ranked, weights))

    # Floor: don't let tail projects drag us below 85% of best
    floor = ranked[0] * 0.85 if ranked[0] >= 70 else 0.0
    final = max(weighted, floor)

    return round(final, 2)


# ─────────────────────────────────────────────────────────────
# PROJECTS SCORER
# ─────────────────────────────────────────────────────────────

class ProjectsScorer:
    """
    Scores resume projects against a job description.

    Per-project composite (before recency):
        semantic   45%   sentence-transformer cosine, rescaled [0.25,0.85]→[0,100]
        keyword    25%   TF-IDF bigram overlap,       rescaled [0.0, 0.45]→[0,100]
        quality    30%   impact + tech + richness,    each already on [0,100]

    Then × recency multiplier [0.75, 1.10]  — current year gets a BOOST.
    Then sigmoid boost to push mid-range scores upward.
    Final = exponential-decay aggregation with a floor guarantee.
    """

    # Observed range for semantic cosine in resume/JD context.
    _SEM_LOW = 0.25
    _SEM_HIGH = 0.85

    def __init__(self, embedder=None):
        self._embedder = embedder
        self._kw_scorer = _KeywordScorer()

    def _get_embedder(self):
        if self._embedder is None:
            from sentence_transformers import SentenceTransformer
            self._embedder = SentenceTransformer("all-MiniLM-L6-v2")
        return self._embedder

    def _build_project_text(self, proj: dict) -> str:
        descriptions = proj.get("descriptions", proj.get("highlights", []))
        desc_text = (
            " ".join(str(x) for x in descriptions)
            if isinstance(descriptions, list) else str(descriptions)
        )
        if not desc_text.strip():
            desc_text = proj.get("description", "")

        tech_list = proj.get("techStack", proj.get("technologies", []))
        tech_text = (
            " ".join(str(x) for x in tech_list)
            if isinstance(tech_list, list) else str(tech_list)
        )

        parts = [
            proj.get("name", ""),
            desc_text,
            tech_text,
            proj.get("impact", ""),
            proj.get("role", ""),
        ]
        return " ".join(p for p in parts if p).strip()

    def _semantic_scores(self, project_texts: List[str], jd_text: str) -> List[float]:
        emb = self._get_embedder()
        all_vecs = emb.encode([jd_text] + project_texts, normalize_embeddings=True)
        jd_vec = all_vecs[0:1]
        p_vecs = all_vecs[1:]
        raw = cosine_similarity(p_vecs, jd_vec).flatten()
        return [
            _rescale(float(s), self._SEM_LOW, self._SEM_HIGH)
            for s in raw
        ]

    def score(self, projects: List[dict], jd_text: str) -> Tuple[float, dict]:
        if not projects:
            return 0.0, {"reason": "No projects provided"}

        valid = [(p, self._build_project_text(p)) for p in projects]
        valid = [(p, t) for p, t in valid if t.strip()]
        if not valid:
            return 0.0, {"reason": "All projects had empty text"}

        valid_projects, valid_texts = zip(*valid)
        valid_texts = list(valid_texts)

        sem_scores = self._semantic_scores(valid_texts, jd_text)
        kw_scores = self._kw_scorer.scores(valid_texts, jd_text)

        composite_scores: List[float] = []
        project_details: Dict[str, dict] = {}

        for i, (proj, sem, kw) in enumerate(zip(valid_projects, sem_scores, kw_scores)):
            quality = _quality_score(proj)
            recency = _recency_weight(proj)

            raw_composite = sem * 0.30 + kw * 0.25 + quality * 0.45
            # Apply recency (can boost or penalise), then sigmoid uplift
            boosted = _sigmoid_boost(raw_composite * recency)
            composite_scores.append(boosted)

            text = self._build_project_text(proj)
            project_details[f"project_{i + 1}"] = {
                "name": proj.get("name", f"Project {i + 1}"),
                "semantic_score": round(sem, 2),
                "keyword_score": round(kw, 2),
                "quality_score": round(quality, 2),
                "recency_multiplier": recency,
                "composite_score": round(boosted, 2),
                "quality_breakdown": {
                    "impact": _impact_score(text),
                    "tech": _tech_score(proj.get("techStack", proj.get("technologies", []))),
                    "richness": _richness_score(text),
                },
            }

        final_score = _aggregate(composite_scores)
        return final_score, {
            "final_score": final_score,
            "project_count": len(valid_projects),
            "score_weights": {"semantic": "30%", "keyword": "25%", "quality": "45%"},
            "pipeline": "rescale → recency multiply → sigmoid boost → exp-decay aggregate",
            "projects": project_details,
        }