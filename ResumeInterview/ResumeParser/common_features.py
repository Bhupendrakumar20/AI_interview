
import re
from ResumeParser.customtypes import TextItem, FeatureSet
from typing import Callable, List

def is_text_item_bold(font_name: str) -> bool:
    return "bold" in font_name.lower()

def is_bold(item: TextItem) -> bool:
    return is_text_item_bold(item.get("fontName", ""))


def has_letter(item: TextItem) -> bool:
    return bool(re.search(r"[a-zA-Z]", item["text"]))


def has_number(item: TextItem) -> bool:
    return bool(re.search(r"\d", item["text"]))


def has_comma(item: TextItem) -> bool:
    return "," in item["text"]


def get_has_text(text: str) -> Callable[[TextItem], bool]:
    """Factory function to create a function that checks if item contains text."""
    if not text:
        return lambda item: False

    def check_has_text(item: TextItem) -> bool:
        return text in item["text"]
    return check_has_text


def has_only_letters_spaces_ampersands(item: TextItem) -> bool:
    return bool(re.match(r"^[A-Za-z\s&]+$", item["text"]))


def has_letter_and_is_all_upper_case(item: TextItem) -> bool:
    return has_letter(item) and item["text"].upper() == item["text"]


# Date Features
def has_year(item: TextItem) -> bool:
    return bool(re.search(r"(?:19|20)\d{2}", item["text"]))


MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
]


def has_month(item: TextItem) -> bool:
    return any(
        month in item["text"] or month[:4] in item["text"]
        for month in MONTHS
    )


SEASONS = ["Summer", "Fall", "Spring", "Winter"]


def has_season(item: TextItem) -> bool:
    return any(season in item["text"] for season in SEASONS)


def has_present(item: TextItem) -> bool:
    return "Present" in item["text"]


DATE_FEATURE_SETS: List[FeatureSet] = [
    (has_year, 2, None),
    (has_month, 1, None),
    (has_season, 1, None),
    (has_present, 1, None),
    (has_comma, -1, None),  
]
