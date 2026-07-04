"""
ats_education.py
─────────────────────────────────────────────────────────────
EducationScorer — scores candidate education (degree level +
field of study) against JD requirements, extracted with
boundary-safe regex and section-scoped field-cluster matching
to avoid false positives.
─────────────────────────────────────────────────────────────
"""

import re
from typing import List, Tuple, Optional, Set


# ─────────────────────────────────────────────────────────────
# EDUCATION SCORER CONFIG
# ─────────────────────────────────────────────────────────────

DEGREE_LEVELS = {
    "phd": 4, "ph.d": 4, "doctorate": 4,
    "m.tech": 3, "m.e": 3, "m.sc": 3, "mtech": 3, "master": 3, "mba": 3,
    "b.tech": 2, "b.e": 2, "b.sc": 2, "btech": 2, "bachelor": 2,
    "diploma": 1, "b.com": 1,
}

FIELD_CLUSTERS = {
    "computer_science": ["computer science", "computer engineering", "cse", "computing"],
    "information_technology": ["information technology", "information systems", "information science"],
    "software_engineering": ["software engineering", "software development"],
    "electronics": ["electronics", "electrical", "ece", "eee", "electronics and communication"],
    "ai_ml": ["artificial intelligence", "machine learning", "data science"],
    "distributed_systems": ["distributed systems", "distributed computing"],
    "math_stats": ["mathematics", "statistics", "applied mathematics"],
}
# ↑ Removed short ambiguous aliases: 'it', 'se', 'ai', 'ml', 'cs', 'networks'
#   These caused false positives ('it' in 'build it', 'se' in 'base', etc.)

_ALIAS_TO_CLUSTER = {
    alias: cluster
    for cluster, aliases in FIELD_CLUSTERS.items()
    for alias in aliases
}

BACHELOR_WEIGHT = 30
MASTER_WEIGHT = 25
PHD_WEIGHT = 25
FIELD_WEIGHT = 20

# ─────────────────────────────────────────────────────────
# Degree detection patterns (word-boundary safe)
# ─────────────────────────────────────────────────────────

_DEG_FLAGS = re.IGNORECASE | re.MULTILINE

# Require non-alpha before AND after the degree abbreviation
# so 'm.e.' doesn't match inside 'mentorship' or 'member'
_BACHELOR_RE = re.compile(
    r"(?:^|[\s,;(])(?:b\.tech|b\.e\.?|btech|bachelors?(?:'s)?(?:\s+of|\s+degree)?)(?=[\s,;.)'/]|$)",
    _DEG_FLAGS
)
_MASTER_RE = re.compile(
    r"(?:^|[\s,;(])(?:m\.tech|m\.e\.?|mtech|masters?(?:'s)?(?:\s+of|\s+degree)?|m\.sc)(?=[\s,;.)'/]|$)",
    _DEG_FLAGS
)
_PHD_RE = re.compile(
    r"(?:^|[\s,;(])(?:ph\.?d\.?|doctorate)(?=[\s,;.)'/]|$)",
    _DEG_FLAGS
)

# ─────────────────────────────────────────────────────────
# Field cluster extraction (education section only)
# ─────────────────────────────────────────────────────────

# Matches the qualifications/education section heading and its content
_EDU_SECTION_RE = re.compile(
    r'(?:##?\s*)?(?:qualifications?|education(?:al)?\s*(?:requirements?)?|academic\s*(?:requirements?)?|degree\s+requirements?)'
    r'(.*?)(?=\n##|\Z)',
    re.IGNORECASE | re.DOTALL
)

# Matches text within 80 chars after any degree keyword (catches inline mentions)
_DEG_PROXIMITY_RE = re.compile(
    r'(?:bachelor|b\.tech|b\.e|master|m\.tech|phd|ph\.d|doctorate|degree\s+in|pursuing|diploma)'
    r'.{0,80}',
    re.IGNORECASE
)


def _extract_education_section(jd_text: str) -> str:
    """
    Extract only the education/qualifications section of the JD.
    Falls back to lines that explicitly mention a degree if no section found.
    """
    m = _EDU_SECTION_RE.search(jd_text)
    if m:
        return m.group(1).strip()

    # Fallback: grab lines that contain an explicit degree mention
    degree_lines = [
        line for line in jd_text.splitlines()
        if any(kw in line.lower() for kw in [
            "bachelor", "b.tech", "b.e", "master", "m.tech", "phd",
            "degree in", "pursuing a", "graduate in", "diploma in",
        ])
    ]
    return "\n".join(degree_lines)


def _extract_field_clusters_from_jd(jd_text: str) -> Set[str]:
    """
    Extract ONLY field clusters that appear in:
      1. The education/qualifications section
      2. Text immediately adjacent to a degree keyword (±80 chars)

    This prevents topic mentions like 'machine learning algorithms'
    or 'computer networks' from being counted as degree requirements.
    """
    edu_section = _extract_education_section(jd_text)

    # Pull text within 80 chars of any degree keyword from full JD
    proximity_text = " ".join(
        m.group(0) for m in _DEG_PROXIMITY_RE.finditer(jd_text)
    )

    search_text = (edu_section + " " + proximity_text).lower()

    found: Set[str] = set()
    # Sort by alias length descending to match longer phrases first
    for alias, cluster in sorted(_ALIAS_TO_CLUSTER.items(), key=lambda x: -len(x[0])):
        if alias in search_text:
            found.add(cluster)

    return found


def extract_jd_requirements(jd_text: str) -> dict:
    """
    Extracts degree/field requirements from a job description.

      - Degree detection uses boundary-safe regex (no false positives
        like 'me' inside 'mentorship')
      - Field clusters extracted only from the education section or
        text immediately adjacent to a degree keyword
    """
    requirements = {
        "require_bachelor": False,
        "require_master": False,
        "require_phd": False,
        "accepted_clusters": set(),
    }

    if _BACHELOR_RE.search(jd_text):
        requirements["require_bachelor"] = True

    if _MASTER_RE.search(jd_text):
        requirements["require_master"] = True

    if _PHD_RE.search(jd_text):
        requirements["require_phd"] = True

    requirements["accepted_clusters"] = _extract_field_clusters_from_jd(jd_text)

    return requirements


# ─────────────────────────────────────────────────────────────
# EDUCATION SCORER
# ─────────────────────────────────────────────────────────────

class EducationScorer:

    def _normalize_edu(self, edu: dict) -> dict:
        degree = edu.get("degree", "")
        field = edu.get("field", "").strip()
        if not field:
            field = self._extract_field_from_degree(degree)
        return {
            "degree": degree,
            "field": field,
            "institution": edu.get("institution", ""),
            "cgpa": edu.get("cgpa", ""),
        }

    def _extract_field_from_degree(self, degree: str) -> str:
        if not degree:
            return ""
        m = re.search(r'\bin\s+([A-Za-z &/]+)', degree, re.IGNORECASE)
        if m:
            return m.group(1).strip()
        m = re.search(r'\(([^)]+)\)', degree)
        if m:
            return m.group(1).strip()
        return ""

    def _get_degree_level(self, degree_str: str) -> Optional[int]:
        dl = degree_str.lower()
        for keyword, level in sorted(DEGREE_LEVELS.items(), key=lambda x: -len(x[0])):
            if keyword in dl:
                return level
        return None

    def _get_field_cluster(self, field_str: str) -> Optional[str]:
        fl = field_str.lower()
        for alias, cluster in sorted(_ALIAS_TO_CLUSTER.items(), key=lambda x: -len(x[0])):
            if alias in fl:
                return cluster
        return None

    def _extract_jd_requirements(self, jd_text: str) -> dict:
        return extract_jd_requirements(jd_text)  # delegates to module-level function above

    def _build_candidate_profile(self, education_list: List[dict]) -> dict:
        entries = [self._normalize_edu(e) for e in education_list]
        has_bachelor = False
        has_master = False
        has_phd = False
        all_clusters: set = set()

        for edu in entries:
            level = self._get_degree_level(edu["degree"])
            cluster = self._get_field_cluster(edu["field"])
            if cluster:
                all_clusters.add(cluster)
            if level == 2:
                has_bachelor = True
            elif level == 3:
                has_master = True
            elif level == 4:
                has_phd = True

        return {
            "has_bachelor": has_bachelor,
            "has_master": has_master,
            "has_phd": has_phd,
            "all_clusters": all_clusters,
            "entries": entries,
        }

    def _score_profile(self, profile: dict, jd_req: dict) -> Tuple[float, str, dict]:
        """
        Scoring design:
          - Degree pool = 80pts, split equally across REQUIRED tiers only.
          - Over-qualified bonuses (10pts each) added on top for unrequired degrees.
          - Field clusters = 20pts.
          - Total capped at 100.

        This means master_score and phd_score are always non-zero
        if the candidate holds those degrees — either as a required
        tier score or as an over-qualified bonus.
        """
        FIELD_W = 20.0
        DEGREE_POOL = 80.0
        BONUS_W = 10.0

        reasons = []

        requires_any = any([
            jd_req["require_bachelor"],
            jd_req["require_master"],
            jd_req["require_phd"],
        ])
        req_bachelor = jd_req["require_bachelor"] or (not requires_any)
        req_master = jd_req["require_master"]
        req_phd = jd_req["require_phd"]

        required_tiers = sum([req_bachelor, req_master, req_phd])
        per_tier = DEGREE_POOL / required_tiers if required_tiers else DEGREE_POOL

        # ── Required degree scores ───────────────────────
        bachelor_score = master_score = phd_score = 0.0

        if req_bachelor:
            if profile["has_bachelor"]:
                bachelor_score = per_tier
                reasons.append("Bachelor satisfied")
            elif profile["has_master"] or profile["has_phd"]:
                bachelor_score = per_tier * 0.9
                reasons.append("Bachelor satisfied via higher degree")
            else:
                reasons.append("Bachelor missing")

        if req_master:
            if profile["has_master"] or profile["has_phd"]:
                master_score = per_tier
                reasons.append("Master satisfied")
            else:
                reasons.append("Master missing")

        if req_phd:
            if profile["has_phd"]:
                phd_score = per_tier
                reasons.append("PhD satisfied")
            else:
                reasons.append("PhD missing")

        # ── Over-qualified bonuses ───────────────────────
        bonus_master = bonus_phd = 0.0

        if not req_master and profile["has_master"]:
            bonus_master = BONUS_W
            reasons.append(f"Master bonus (+{int(BONUS_W)}pts, over-qualified)")

        if not req_phd and profile["has_phd"]:
            bonus_phd = BONUS_W
            reasons.append(f"PhD bonus (+{int(BONUS_W)}pts, over-qualified)")

        # ── Field clusters ───────────────────────────────
        accepted = jd_req["accepted_clusters"]
        candidate = profile["all_clusters"]

        if accepted:
            matched = accepted & candidate
            field_score = FIELD_W * (len(matched) / len(accepted))
            reasons.append(f"{len(matched)}/{len(accepted)} field clusters matched")
        else:
            field_score = FIELD_W
            reasons.append("No specific field required by JD")

        # ── Total (cap at 100) ───────────────────────────
        total = (
            bachelor_score + master_score + phd_score +
            bonus_master + bonus_phd + field_score
        )
        final_score = min(round(total, 2), 100.0)

        breakdown = {
            "bachelor_score": round(bachelor_score, 2),
            "master_score": round(master_score + bonus_master, 2),
            "phd_score": round(phd_score + bonus_phd, 2),
            "field_score": round(field_score, 2),
            "final_score": final_score,
            "per_tier_weight": round(per_tier, 2),
        }

        return final_score, ". ".join(reasons), breakdown

    def score(self, education: List[dict], jd_text: str) -> Tuple[float, dict]:
        if not education:
            return 0.0, {"reason": "No education found"}

        jd_req = self._extract_jd_requirements(jd_text)
        profile = self._build_candidate_profile(education)

        overall_score, overall_reason, breakdown = self._score_profile(profile, jd_req)

        education_details = {}
        for i, edu in enumerate(profile["entries"]):
            level = self._get_degree_level(edu["degree"])
            cluster = self._get_field_cluster(edu["field"])
            education_details[f"education_{i+1}"] = {
                "degree": edu["degree"],
                "field": edu["field"],
                "institution": edu["institution"],
                "degree_level": level,
                "field_cluster": cluster,
            }

        return overall_score, {
            "overall_score": overall_score,
            "overall_reason": overall_reason,
            "score_breakdown": breakdown,
            "jd_requirements": {
                "require_bachelor": jd_req["require_bachelor"],
                "require_master": jd_req["require_master"],
                "require_phd": jd_req["require_phd"],
                "accepted_clusters": list(jd_req["accepted_clusters"]),
            },
            "candidate_profile": {
                "has_bachelor": profile["has_bachelor"],
                "has_master": profile["has_master"],
                "has_phd": profile["has_phd"],
                "all_field_clusters": list(profile["all_clusters"]),
            },
            "education_entries": education_details,
        }