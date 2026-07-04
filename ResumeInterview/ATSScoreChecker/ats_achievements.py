
import re
from typing import List, Tuple

CERT_PROVIDERS: dict = {
    "google":       ["cloud", "ml", "data", "devops", "web"],
    "microsoft":    ["cloud", "azure", "data", "devops", "dotnet"],
    "aws":          ["cloud", "devops", "backend", "ml"],
    "oracle":       ["cloud", "database", "java", "backend"],
    "meta":         ["frontend", "web", "react", "mobile"],
    "coursera":     ["ml", "data", "ai", "general"],
    "udemy":        ["general", "web", "backend", "ml"],
    "nptel":        ["algorithms", "data structures", "academic"],
    "cisco":        ["networking", "security", "devops"],
    "ibm":          ["ml", "data", "cloud", "ai"],
    "databricks":   ["data", "spark", "ml", "cloud"],
    "nvidia":       ["ml", "ai", "cuda", "deep learning"],
    "hashicorp":    ["devops", "cloud", "infrastructure"],
    "mongodb":      ["database", "backend", "nosql"],
    "gcsc":         ["web", "frontend", "general", "cloud"],
    "github":       ["devops", "git", "open source"],
    "linkedin":     ["general", "professional"],
    "stanford":     ["ml", "ai", "algorithms", "academic"],
    "deeplearning": ["ml", "ai", "deep learning", "nlp"],
}

DOMAIN_KEYWORDS: dict = {
    "ml":         ["machine learning", "ml", "pytorch", "tensorflow", "scikit", "model", "training"],
    "ai":         ["artificial intelligence", "ai", "llm", "nlp", "deep learning", "neural"],
    "cloud":      ["aws", "gcp", "azure", "cloud", "kubernetes", "docker", "terraform"],
    "backend":    ["backend", "api", "fastapi", "django", "flask", "rest", "microservices"],
    "frontend":   ["frontend", "react", "vue", "angular", "javascript", "typescript", "css"],
    "data":       ["data science", "pandas", "spark", "sql", "analytics", "pipeline", "etl"],
    "devops":     ["devops", "ci/cd", "jenkins", "github actions", "ansible", "helm"],
    "security":   ["security", "owasp", "encryption", "penetration", "soc", "iam"],
    "mobile":     ["android", "ios", "flutter", "react native", "swift", "kotlin"],
    "database":   ["postgresql", "mysql", "mongodb", "redis", "cassandra", "database"],
    "algorithms": ["algorithms", "data structures", "leetcode", "competitive", "dsa"],
    "networking": ["networking", "tcp", "http", "dns", "load balancing", "cdn"],
}

HACKATHON_KEYWORDS = [
    "hackathon", "hack", "competition", "contest", "challenge",
    "winner", "won", "first place", "1st place", "runner up",
    "prize", "award", "finalist", "top", "national", "international",
    "smart india", "sih", "devfolio", "devpost", "mlh",
    "google solution challenge", "icpc", "acm", "ieee",
]

HACKATHON_RANK_BONUS = {
    "first place": 40, "1st place": 40, "1st prize": 40, "winner": 40, "won": 35,
    "first runner up": 30, "1st runner up": 30, "second place": 30, "2nd place": 30, "2nd prize": 30,
    "second runner up": 20, "2nd runner up": 20, "third place": 20, "3rd place": 20, "3rd prize": 20,
    "runner up": 25, "first": 25, "1st": 25, "second": 20, "2nd": 20, "third": 15, "3rd": 15,
    "honorable mention": 10, "special mention": 10, "finalist": 15,
    "top 10": 15, "top 50": 10, "top": 10,
    "participated": 5, "participant": 5,
}

LEADERSHIP_KEYWORDS = [
    "lead", "leader", "head", "president", "vice president", "vp",
    "captain", "founder", "co-founder", "organizer", "coordinator",
    "mentor", "team lead", "tech lead", "domain lead", "club lead",
    "incharge", "in-charge", "managed", "spearheaded", "drove",
]

LEADERSHIP_SCOPE_BONUS = {
    "national": 25, "international": 30, "college": 15,
    "department": 12, "club": 10, "team": 8, "domain": 10, "community": 8,
}

COURSE_KEYWORDS = [
    "course", "certification", "certified", "certificate", "mooc",
    "completed", "coursera", "udemy", "nptel", "edx", "udacity",
    "pluralsight", "linkedin learning", "gcsc", "google", "microsoft",
    "aws training", "bootcamp", "workshop", "training",
]


def _score_coding_profiles(achievements: List[dict]) -> Tuple[float, dict]:

    if not achievements:
        return 0.0, {"reason": "No coding profiles found"}

    CODING_PLATFORMS = [
        "leetcode", "codeforces", "codechef", "hackerrank",
        "hackerearth", "atcoder", "geeksforgeeks", "competitive programming"
    ]

    TITLE_BONUS = {
        "legendary grandmaster": 50, "international grandmaster": 45,
        "grandmaster": 40, "international master": 35,
        "candidate master": 25, "master": 30, "expert": 20,
        "specialist": 15, "pupil": 10, "newbie": 5,
        "guardian": 35, "knight": 20,
        "7 star": 45, "6 star": 40, "5 star": 30,
        "4 star": 20, "3 star": 15, "2 star": 10, "1 star": 5,
    }

    entries = []

    for ach in achievements:
        if isinstance(ach, str):
            text  = ach.lower()
            title = ach
        elif isinstance(ach, dict):
            title = ach.get("title", "")
            text  = (
                str(ach.get("title", "")) + " " +
                str(ach.get("description", "")) + " " +
                str(ach.get("organization", "")) + " " +
                str(ach.get("role", ""))
            ).lower()
        else:
            continue

        if not any(platform in text for platform in CODING_PLATFORMS):
            continue

        score = 30

        rating_match = re.search(r'(?:rating|max rating|highest rating)\D*(\d{3,4})', text)
        if rating_match:
            rating = int(rating_match.group(1))
            if rating >= 2200:   score += 35
            elif rating >= 1900: score += 30
            elif rating >= 1600: score += 20
            elif rating >= 1300: score += 10

        solved_match = re.search(r'(\d+)\s*(?:\+)?\s*(?:problems|questions|solved)', text)
        if solved_match:
            solved = int(solved_match.group(1))
            if solved >= 1000:   score += 30
            elif solved >= 750:  score += 25
            elif solved >= 500:  score += 20
            elif solved >= 250:  score += 10

        for keyword, bonus in sorted(TITLE_BONUS.items(), key=lambda x: -len(x[0])):
            if keyword in text:
                score += bonus
                break

        if "global rank" in text: score += 20
        if "top 100" in text:     score += 25
        elif "top 500" in text:   score += 15
        elif "top 1000" in text:  score += 10

        contest_match = re.search(r'(\d+)\s*(?:contests|competitions)', text)
        if contest_match:
            contests = int(contest_match.group(1))
            if contests >= 100: score += 20
            elif contests >= 50: score += 10

        entries.append({"title": title, "score": min(100, score)})

    if not entries:
        return 0.0, {"reason": "No coding profiles found", "entries": []}

    scores = sorted([e["score"] for e in entries], reverse=True)
    if len(scores) == 1:
        final_score = scores[0]
    elif len(scores) == 2:
        final_score = scores[0] * 0.7 + scores[1] * 0.3
    else:
        final_score = (
            scores[0] * 0.5 +
            scores[1] * 0.3 +
            (sum(scores[2:]) / len(scores[2:])) * 0.2
        )

    return round(min(100.0, final_score), 2), {
        "coding_profile_count": len(entries),
        "entries": entries,
        "final_coding_score": round(min(100.0, final_score), 2),
    }


def _extract_jd_domains(jd_text: str) -> set:
    jd_lower = jd_text.lower()
    domains: set = set()
    for domain, keywords in DOMAIN_KEYWORDS.items():
        if any(kw in jd_lower for kw in keywords):
            domains.add(domain)
    return domains


def _normalize_str(text: str) -> str:
    return text.lower().strip()


def _score_certifications(certifications: List[dict], jd_domains: set) -> Tuple[float, dict]:
    if not certifications:
        return 0.0, {"reason": "No certifications found", "details": []}

    cert_scores = []
    details     = []

    for cert in certifications:
        name  = _normalize_str(cert.get("name", "") + " " + cert.get("issuer", ""))
        score = 0.0
        matched_provider = None
        matched_domains  = []

        for provider, domains in CERT_PROVIDERS.items():
            if provider in name:
                score += 40
                matched_provider = provider
                overlap      = set(domains) & jd_domains
                score       += min(45, len(overlap) * 15)
                matched_domains = list(overlap)
                break

        if matched_provider is None and name.strip():
            score = 20

        for domain, keywords in DOMAIN_KEYWORDS.items():
            if domain in jd_domains:
                if any(kw in name for kw in keywords):
                    score = min(100, score + 10)
                    if domain not in matched_domains:
                        matched_domains.append(domain)

        cert_score = min(100.0, score)
        cert_scores.append(cert_score)
        details.append({
            "name":               cert.get("name", ""),
            "issuer":             cert.get("issuer", ""),
            "score":              round(cert_score, 2),
            "matched_provider":   matched_provider,
            "matched_jd_domains": matched_domains,
        })

    count_multiplier = 1.0 + min(0.15, (len(cert_scores) - 1) * 0.075)
    avg   = sum(cert_scores) / len(cert_scores)
    final = min(100.0, round(avg * count_multiplier, 2))

    return final, {
        "cert_count":        len(certifications),
        "average_raw_score": round(avg, 2),
        "count_multiplier":  round(count_multiplier, 3),
        "final_cert_score":  final,
        "details":           details,
    }


def _score_hackathons(achievements: List[dict]) -> Tuple[float, dict]:
    if not achievements:
        return 0.0, {"reason": "No achievements found"}

    hack_entries = []

    for ach in achievements:
        text = _normalize_str(
            ach.get("title", "") + " " +
            ach.get("description", "") + " " +
            ach.get("organization", "")
        )
        if not any(kw in text for kw in HACKATHON_KEYWORDS):
            continue

        score = 30.0
        for rank_kw, bonus in sorted(HACKATHON_RANK_BONUS.items(), key=lambda x: -len(x[0])):
            if rank_kw in text:
                score += bonus
                break
        for scope_kw, bonus in LEADERSHIP_SCOPE_BONUS.items():
            if scope_kw in text:
                score += bonus
                break

        hack_entries.append({
            "title": ach.get("title", ""),
            "score": round(min(100.0, score), 2),
        })

    if not hack_entries:
        return 0.0, {"reason": "No hackathon/competition entries found", "entries": []}

    hack_scores = sorted([e["score"] for e in hack_entries], reverse=True)
    if len(hack_scores) == 1:
        final = hack_scores[0]
    else:
        rest_avg = sum(hack_scores[1:]) / len(hack_scores[1:])
        final    = round(hack_scores[0] * 0.70 + rest_avg * 0.30, 2)

    return min(100.0, final), {
        "hackathon_count":       len(hack_entries),
        "entries":               hack_entries,
        "final_hackathon_score": round(final, 2),
    }


def _score_leadership(achievements: List[dict]) -> Tuple[float, dict]:
    if not achievements:
        return 0.0, {"reason": "No achievements found"}

    lead_entries = []

    for ach in achievements:
        text = _normalize_str(
            ach.get("title", "") + " " +
            ach.get("description", "") + " " +
            ach.get("organization", "") + " " +
            ach.get("role", "")
        )
        if not any(kw in text for kw in LEADERSHIP_KEYWORDS):
            continue

        score = 30.0
        for scope_kw, bonus in LEADERSHIP_SCOPE_BONUS.items():
            if scope_kw in text:
                score += bonus
                break

        domain_lead_kws = ["tech", "domain", "web", "ml", "ai", "dev", "software", "code"]
        if any(kw in text for kw in domain_lead_kws):
            score += 15
        if any(kw in text for kw in ["mentor", "mentored", "trained", "guided"]):
            score += 10

        lead_entries.append({
            "title": ach.get("title", ""),
            "role":  ach.get("role", ""),
            "score": round(min(100.0, score), 2),
        })

    if not lead_entries:
        return 0.0, {"reason": "No leadership entries found", "entries": []}

    scores = sorted([e["score"] for e in lead_entries], reverse=True)
    if len(scores) == 1:
        final = scores[0]
    elif len(scores) == 2:
        final = scores[0] * 0.65 + scores[1] * 0.35
    else:
        final = scores[0] * 0.50 + scores[1] * 0.30 + sum(scores[2:]) / len(scores[2:]) * 0.20

    return round(min(100.0, final), 2), {
        "leadership_count":       len(lead_entries),
        "entries":                lead_entries,
        "final_leadership_score": round(final, 2),
    }


def _score_courses(certifications: List[dict], achievements: List[dict]) -> Tuple[float, dict]:
    all_entries = certifications + achievements
    if not all_entries:
        return 0.0, {"reason": "No courses found"}

    course_entries = []

    for entry in all_entries:
        text = _normalize_str(
            entry.get("name", "") + " " +
            entry.get("title", "") + " " +
            entry.get("issuer", "") + " " +
            entry.get("platform", "") + " " +
            entry.get("description", "")
        )
        if not any(kw in text for kw in COURSE_KEYWORDS):
            continue

        score = 30.0
        platform_bonuses = {
            "coursera": 20, "nptel": 20, "edx": 20, "udacity": 20,
            "stanford": 25, "deeplearning.ai": 25, "google": 15,
            "microsoft": 15, "aws": 15, "udemy": 10, "gcsc": 15,
        }
        for platform, bonus in platform_bonuses.items():
            if platform in text:
                score += bonus
                break
        if any(kw in text for kw in ["completed", "certified", "certificate", "passed"]):
            score += 15

        course_entries.append({
            "name":  entry.get("name", "") or entry.get("title", ""),
            "score": round(min(100.0, score), 2),
        })

    if not course_entries:
        return 0.0, {"reason": "No course entries detected", "entries": []}

    avg         = sum(e["score"] for e in course_entries) / len(course_entries)
    count_bonus = min(10.0, len(course_entries) * 2.5)

    return round(min(100.0, avg + count_bonus), 2), {
        "course_count":       len(course_entries),
        "entries":            course_entries,
        "final_course_score": round(min(100.0, avg + count_bonus), 2),
    }


class AchievementsScorer:

    WEIGHTS = {
        "certifications":  0.15,
        "hackathons":      0.20,
        "leadership":      0.20,
        "courses":         0.20,
        "coding_profiles": 0.25,
    }

    def _normalize_achievements(self, achievements) -> List[dict]:
        normalized = []
        for ach in achievements:
            if isinstance(ach, dict):
                normalized.append({
                    "title":        ach.get("title", ""),
                    "description":  ach.get("description", ""),
                    "organization": ach.get("organization", ""),
                    "role":         ach.get("role", ""),
                    "platform":     ach.get("platform", ""),
                })
            elif isinstance(ach, str):
                normalized.append({
                    "title": ach, "description": "",
                    "organization": "", "role": "", "platform": "",
                })
        return normalized

    def _normalize_certifications(self, certifications) -> List[dict]:
        normalized = []
        for cert in certifications:
            if isinstance(cert, dict):
                normalized.append({
                    "name":     cert.get("name", ""),
                    "issuer":   cert.get("issuer", ""),
                    "platform": cert.get("platform", ""),
                })
            elif isinstance(cert, str):
                normalized.append({"name": cert, "issuer": "", "platform": ""})
        return normalized

    def score(self, resume_data: dict, jd_text: str):
        certifications   = self._normalize_certifications(resume_data.get("certifications", []))
        achievements     = self._normalize_achievements(resume_data.get("achievements", []))
        extracurriculars = self._normalize_achievements(resume_data.get("extracurriculars", []))
        coding_profiles  = resume_data.get("coding_profiles", [])

        achievements.extend(extracurriculars)

        if not certifications and not achievements and not coding_profiles:
            return 0.0, {"reason": "No achievements found"}

        jd_domains = _extract_jd_domains(jd_text)

        cert_score,   cert_details   = _score_certifications(certifications, jd_domains)
        hack_score,   hack_details   = _score_hackathons(achievements)
        lead_score,   lead_details   = _score_leadership(achievements)
        course_score, course_details = _score_courses(certifications, achievements)
        coding_score, coding_details = _score_coding_profiles(achievements)

        final = round(
            cert_score   * self.WEIGHTS["certifications"] +
            hack_score   * self.WEIGHTS["hackathons"] +
            lead_score   * self.WEIGHTS["leadership"] +
            course_score * self.WEIGHTS["courses"] +
            coding_score * self.WEIGHTS["coding_profiles"],
            2,
        )

        return final, {
            "final_score":          final,
            "jd_domains_detected":  sorted(jd_domains),
            "weights":              {k: f"{int(v * 100)}%" for k, v in self.WEIGHTS.items()},
            "sub_scores": {
                "certifications":  round(cert_score, 2),
                "hackathons":      round(hack_score, 2),
                "leadership":      round(lead_score, 2),
                "courses":         round(course_score, 2),
                "coding_profiles": round(coding_score, 2),
            },
            "details": {
                "certifications":  cert_details,
                "hackathons":      hack_details,
                "leadership":      lead_details,
                "courses":         course_details,
                "coding_profiles": coding_details,
            },
        }
