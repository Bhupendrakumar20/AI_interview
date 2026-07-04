import re
from typing import Dict, Any, Optional,List
from ResumeParser.classes import ResumeKey
from ResumeParser.customtypes import ResumeSectionToLines, TextItems,TextItem, FeatureSet
from ResumeParser.feature_scoring_system import get_text_with_highest_feature_score
from ResumeParser.get_section_lines import get_section_lines_by_keywords
from ResumeParser.common_features import is_bold,has_letter_and_is_all_upper_case,has_number,has_letter,has_comma


def match_only_letter_space_or_period(item: TextItem) -> Optional[re.Match]:
    return re.search(r"^[a-zA-Z\s\.]+$", item["text"])


# Email
# Simple email regex: xxx@xxx.xxx (xxx = anything not space)
def match_email(item: TextItem) -> Optional[re.Match]:
    return re.search(r"\S+@\S+\.\S+", item["text"])


def has_at(item: TextItem) -> bool:
    return "@" in item["text"]


# Phone
# Simple phone regex that matches (xxx)-xxx-xxxx where () and - are optional, - can also be space
def match_phone(item: TextItem) -> Optional[re.Match]:
    return re.search(r"\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}", item["text"])


def has_parenthesis(item: TextItem) -> bool:
    return bool(re.search(r"\([0-9]+\)", item["text"]))


# Location
# Simple location regex that matches "<City>, <ST>"
def match_city_and_state(item: TextItem) -> Optional[re.Match]:
    return re.search(r"[A-Z][a-zA-Z\s]+, [A-Z]{2}", item["text"])


# URL
# Simple url regex that matches "xxx.xxx/xxx" (xxx = anything not space)
def match_url(item: TextItem) -> Optional[re.Match]:
    return re.search(r"\S+\.[a-z]+\/\S+", item["text"])


def match_linkedin(item: TextItem) -> Optional[re.Match]:
    return re.search(
        r"(https?:\/\/)?(www\.)?linkedin\.com\/(in|pub)\/[A-Za-z0-9\-_%]+\/?",
        item["text"]
    )

def match_github(item: TextItem) -> Optional[re.Match]:
    return re.search(
        r"(https?:\/\/)?(www\.)?github\.com\/[A-Za-z0-9\-]+\/?",
        item["text"]
    )

def match_url_http_fallback(item: TextItem) -> Optional[re.Match]:
    return re.search(r"https?:\/\/\S+\.\S+", item["text"])
# Match www.xxx.xxx
def match_url_www_fallback(item: TextItem) -> Optional[re.Match]:
    return re.search(r"www\.\S+\.\S+", item["text"])

def detect_platform(url: str) -> str:
    if "linkedin.com" in url:
        return "linkedin"
    elif "github.com" in url:
        return "github"
    return "other"


def has_slash(item: TextItem) -> bool:
    return "/" in item["text"]


# Summary
def has_4_or_more_words(item: TextItem) -> bool:
    return len(item["text"].split(" ")) >= 4


# Name -> contains only letters/space/period, e.g. Leonardo W. DiCaprio
#      -> is bolded or has all letters as uppercase
NAME_FEATURE_SETS: List[FeatureSet] = [
    (match_only_letter_space_or_period, 3, True),
    (is_bold, 2, None),
    (has_letter_and_is_all_upper_case, 2, None),
    # Match against other unique attributes
    (has_at, -4, None),  # Email
    (has_number, -4, None),  # Phone
    (has_parenthesis, -4, None),  # Phone
    (has_comma, -4, None),  # Location
    (has_slash, -4, None),  # URL
    (has_4_or_more_words, -2, None),  # Summary
]

# Email -> match email regex xxx@xxx.xxx
EMAIL_FEATURE_SETS: List[FeatureSet] = [
    (match_email, 4, True),
    (is_bold, -1, None),  # Name
    (has_letter_and_is_all_upper_case, -1, None),  # Name
    (has_parenthesis, -4, None),  # Phone
    (has_comma, -4, None),  # Location
    (has_slash, -4, None),  # URL
    (has_4_or_more_words, -4, None),  # Summary
]

# Phone -> match phone regex (xxx)-xxx-xxxx
PHONE_FEATURE_SETS: List[FeatureSet] = [
    (match_phone, 4, True),
    (has_letter, -4, None),  
]

LOCATION_FEATURE_SETS: List[FeatureSet] = [
    (match_city_and_state, 4, True),
    (is_bold, -1, None),  
    (has_at, -4, None),  
    (has_parenthesis, -3, None), 
    (has_slash, -4, None),  
]



LINKEDIN_FEATURE_SETS: List[FeatureSet] = [
    (match_linkedin, 5, True),  
    (is_bold, -1, None),
    (has_at, -4, None),
    (has_parenthesis, -3, None),
    (has_comma, -4, None),
    (has_4_or_more_words, -4, None),
]

GITHUB_FEATURE_SETS: List[FeatureSet] = [
    (match_github, 5, True),    
    (is_bold, -1, None),
    (has_at, -4, None),
    (has_parenthesis, -3, None),
    (has_comma, -4, None),
    (has_4_or_more_words, -4, None),
]

# Summary -> has 4 or more words
SUMMARY_FEATURE_SETS: List[FeatureSet] = [
    (has_4_or_more_words, 4, None),
    (is_bold, -1, None),  # Name
    (has_at, -4, None),  # Email
    (has_parenthesis, -3, None),  # Phone
    (match_city_and_state, -4, False),  # Location
]

def extract_profile(sections: ResumeSectionToLines) -> Dict[str, Any]:
    lines = sections.get("profile", [])
    text_items = [item for line in lines for item in line]

    name, name_scores = get_text_with_highest_feature_score(
        text_items, NAME_FEATURE_SETS
    )
    email, email_scores = get_text_with_highest_feature_score(
        text_items, EMAIL_FEATURE_SETS
    )
    phone, phone_scores = get_text_with_highest_feature_score(
        text_items, PHONE_FEATURE_SETS
    )
    location, location_scores = get_text_with_highest_feature_score(
        text_items, LOCATION_FEATURE_SETS
    )
    linkedin_url, linkedin_scores = get_text_with_highest_feature_score(
        text_items, LINKEDIN_FEATURE_SETS
    )
    github_url, github_scores = get_text_with_highest_feature_score(
        text_items, GITHUB_FEATURE_SETS
    )
    summary, summary_scores = get_text_with_highest_feature_score(
        text_items, SUMMARY_FEATURE_SETS, None, True
    )

    summary_lines = get_section_lines_by_keywords(sections, ["summary"])
    summary_section = " ".join(
        [text_item["text"] for line in summary_lines for text_item in line]
    )

    objective_lines = get_section_lines_by_keywords(sections, ["objective"])
    objective_section = " ".join(
        [text_item["text"] for line in objective_lines for text_item in line]
    )

    return {
        "profile": {
            "name": name,
            "email": email,
            "phone": phone,
            "location": location,
            "linkedin_url": linkedin_url,
            "github_url": github_url,
            "summary": summary_section or objective_section or summary,
        },
        # "profileScores": {
        #     "name": name_scores,
        #     "email": email_scores,
        #     "phone": phone_scores,
        #     "location": location_scores,
        #     "linkedin_url": linkedin_scores,
        #     "github_url": github_scores,
        #     "summary": summary_scores,
        # },
    }
