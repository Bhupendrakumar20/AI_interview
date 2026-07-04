import re
from typing import List, Optional
from ResumeParser.customtypes import Lines, TextItem

BULLET_POINTS = [
    "⋅", "∙", "🞄", "•", "⦁", "⚫︎", "●", "⬤", "⚬", "○",
    "*", "-", "‣", "⁃", "➔", "➤", "→", "⇒", "⮞", "⮟", "–",
]


def separate_words(text: str) -> str:
    """Separate concatenated words by inserting spaces before capital letters."""
    return re.sub(r'([a-z])([A-Z])', r'\1 \2', text)


def get_bullet_points_from_lines(lines: Lines) -> List[str]:
    """
    Convert bullet-point lines into a list of description strings.

    Handles:
    - Explicit bullet characters (•, -, *, ⋅, …)
    - Implicit bullets (long single-item lines)
    - Multi-line wrapped bullets: a line that starts with a digit, comma, or
      lowercase letter after a bullet entry is treated as a continuation of
      the previous bullet rather than a new entry.
    """
    first_bullet_point_line_index = get_first_bullet_point_line_idx(lines)
    if first_bullet_point_line_index == -1:
        return [" ".join(item["text"] for item in line) for line in lines]

    bullet_lines = lines[first_bullet_point_line_index:]
    bullet_points: List[str] = []
    current_point = ""

    for line in bullet_lines:
        line_text = " ".join(item["text"] for item in line).strip()
        stripped = line_text.lstrip()

        bullet = next(
            (b for b in BULLET_POINTS if stripped.startswith(b)),
            None,
        )

        if bullet:
            if current_point:
                bullet_points.append(current_point.strip())
            split_pattern = r'(?:(?<=^)|(?<=\s))' + re.escape(bullet)
            segments = [seg.strip() for seg in re.split(split_pattern, stripped) if seg.strip()]
            if segments:
                current_point = segments[0]
                for seg in segments[1:]:
                    if current_point:
                        bullet_points.append(current_point.strip())
                    current_point = seg
            else:
                current_point = stripped[len(bullet):].strip()

        elif _is_wrapped_continuation(line_text):
            # This line is a sentence fragment that wraps from the previous bullet.
            # Append it to the current bullet rather than starting a new one.
            if current_point:
                current_point += " " + line_text
            else:
                # No active bullet yet — treat as a standalone description
                current_point = line_text

        else:
            # Continuation of the previous bullet OR a plain prose description
            if current_point:
                current_point += " " + line_text
            else:
                current_point = line_text

    if current_point:
        bullet_points.append(current_point.strip())

    return bullet_points


def _is_wrapped_continuation(text: str) -> bool:
    """
    Return True when a line looks like a mid-sentence wrap rather than the
    start of a new bullet entry.

    Heuristics:
    - Starts with a digit or comma            → wrapped number/stat
    - Starts with a lowercase letter          → middle of a sentence
    - Starts with a conjunction / preposition → e.g. "and", "or", "to", "for"

    We deliberately do NOT flag lines that start with an uppercase letter
    followed by more uppercase (could be a proper noun / new sentence).
    """
    if not text:
        return False

    first_char = text[0]

    # Digit-led wrap: "50,000 daily active requests."
    if first_char.isdigit() or first_char == ',':
        return True

    # Lowercase-led wrap
    if first_char.islower():
        return True

    return False


def get_most_common_bullet_point(string: str) -> str:
    bullet_to_count = {bullet: 0 for bullet in BULLET_POINTS}
    bullet_with_most_count = BULLET_POINTS[0]
    bullet_max_count = 0

    for char in string:
        if char in bullet_to_count:
            bullet_to_count[char] += 1
            if bullet_to_count[char] > bullet_max_count:
                bullet_with_most_count = char
                bullet_max_count = bullet_to_count[char]

    return bullet_with_most_count


def get_first_bullet_point_line_idx(lines: Lines) -> int:
    for i, line in enumerate(lines):
        for item in line:
            if any(bullet in item["text"] for bullet in BULLET_POINTS):
                return i
    return -1


def is_word(string: str) -> bool:
    return bool(re.match(r"^[^0-9]+$", string))


def has_at_least_8_words(item: TextItem) -> bool:
    words = [word for word in re.split(r"\s+", item["text"]) if word and is_word(word)]
    return len(words) >= 8


def get_descriptions_line_idx(lines: Lines) -> Optional[int]:
    idx = get_first_bullet_point_line_idx(lines)
    if idx != -1:
        return idx

    for i, line in enumerate(lines):
        if len(line) == 1 and has_at_least_8_words(line[0]):
            return i

    return None