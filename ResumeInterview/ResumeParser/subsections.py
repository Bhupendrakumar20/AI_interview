# from typing import Callable
# from customtypes import Lines, Subsections, TextItem,Line
# from bullent_points import BULLET_POINTS
# from common_features import is_bold



# def divide_section_into_subsections(lines: Lines) -> Subsections:
#     is_line_new_subsection = create_is_line_new_subsection_by_line_gap(lines)

#     subsections = create_subsections(lines, is_line_new_subsection)
#     if len(subsections) == 1:
#         def is_line_new_subsection_by_bold(line: Line, prev_line: Line) -> bool:
#             if (
#                 not is_bold(prev_line[0])
#                 and is_bold(line[0])
#                 and line[0]["text"] not in BULLET_POINTS
#             ):
#                 return True
#             return False

#         subsections = create_subsections(lines, is_line_new_subsection_by_bold)

#     return subsections

    



# def create_is_line_new_subsection_by_line_gap(
#     lines: Lines
# ) -> Callable[[Line, Line], bool]:

#     line_gap_to_count = {}
#     lines_y = [line[0]["y"] for line in lines]

#     line_gap_with_most_count = 0
#     max_count = 0

#     for i in range(1, len(lines_y)):
#         line_gap = round(lines_y[i - 1] - lines_y[i])
#         if line_gap_to_count.get(line_gap) is None:
#             line_gap_to_count[line_gap] = 0
        
#         line_gap_to_count[line_gap] = line_gap_to_count[line_gap] 1

#         if line_gap_to_count[line_gap] > max_count:
#             line_gap_with_most_count = line_gap
#             max_count = line_gap_to_count[line_gap]

#     subsection_line_gap_threshold = line_gap_with_most_count * 1.4

#     def is_line_new_subsection(line: Line, prev_line: Line) -> bool:
#         return round(prev_line[0]["y"] - line[0]["y"]) > subsection_line_gap_threshold

#     return is_line_new_subsection


# def create_subsections(
#     lines: Lines,
#     is_line_new_subsection: Callable[[Line, Line], bool]
# ) -> Subsections:

#     subsections: Subsections = []
#     subsection: Lines = []

#     for i, line in enumerate(lines):
#         if i == 0:
#             subsection.append(line)
#             continue

#         if is_line_new_subsection(line, lines[i - 1]):
#             subsections.append(subsection)
#             subsection = []

#         subsection.append(line)

#     if subsection:
#         subsections.append(subsection)

#     return subsections


# import re
# from typing import Callable
# from customtypes import Lines, Subsections, TextItem, Line
# from bullent_points import BULLET_POINTS
# from common_features import is_bold


# # ---------------- VALIDATION ----------------
# def line_is_predominantly_bold(line: Line) -> bool:
#     """Returns True if 60% or more of the line's text items are bold."""
#     if not line:
#         return False
#     bold_count = sum(1 for item in line if is_bold(item))
#     return bold_count / len(line) >= 0.6


# def is_valid_title_line(line: Line) -> bool:
#     """
#     Returns True if the line looks like a real project/section title.
#     Rejects sentence fragments, continuation lines, and overly long lines.
#     """
#     text = " ".join(item["text"] for item in line).strip()

#     if not text:
#         return False

#     # Continuation fragment — starts with lowercase
#     if text[0].islower():
#         return False

#     # Ends mid-sentence with hyphen or comma
#     if re.search(r'[-,]$', text):
#         return False

#     # Ends with a period but is very short (e.g. "tion." "racy.")
#     if re.search(r'\.$', text) and len(text.split()) <= 3:
#         return False

#     # Too long to be a title
#     if len(text.split()) > 10:
#         return False

#     return True


# # ---------------- SUBSECTION SPLITTERS ----------------
# def create_is_line_new_subsection_by_line_gap(
#     lines: Lines,
# ) -> Callable[[Line, Line], bool]:
#     """
#     Builds a comparator that returns True when the vertical gap between
#     two consecutive lines exceeds 1.7x the most common line gap.
#     (Raised from 1.4x to avoid splitting wrapped paragraphs.)
#     """
#     line_gap_to_count: dict[int, int] = {}
#     lines_y = [line[0]["y"] for line in lines]

#     line_gap_with_most_count = 0
#     max_count = 0

#     for i in range(1, len(lines_y)):
#         line_gap = round(lines_y[i - 1] - lines_y[i])

#         if line_gap_to_count.get(line_gap) is None:
#             line_gap_to_count[line_gap] = 0

#         line_gap_to_count[line_gap] += 1

#         if line_gap_to_count[line_gap] > max_count:
#             line_gap_with_most_count = line_gap
#             max_count = line_gap_to_count[line_gap]

#     # Raised from 1.4 → 1.7 to reduce false splits inside wrapped paragraphs
#     subsection_line_gap_threshold = line_gap_with_most_count * 1.7

#     def is_line_new_subsection(line: Line, prev_line: Line) -> bool:
#         return round(prev_line[0]["y"] - line[0]["y"]) > subsection_line_gap_threshold

#     return is_line_new_subsection


# def is_line_new_subsection_by_bold(line: Line, prev_line: Line) -> bool:
#     """
#     Returns True only when:
#       1. The previous line is NOT predominantly bold (not a title itself)
#       2. The current line IS predominantly bold (likely a new title)
#       3. The line does not start with a bullet point
#       4. The line passes the title content validation
    
#     Fixes the original bug where only line[0] was checked, causing
#     wrapped sentence fragments (whose first token happened to be bold)
#     to be mistaken for new subsection headers.
#     """
#     if (
#         not line_is_predominantly_bold(prev_line)
#         and line_is_predominantly_bold(line)
#         and line[0]["text"] not in BULLET_POINTS
#         and is_valid_title_line(line)
#     ):
#         return True
#     return False


# # ---------------- SUBSECTION BUILDER ----------------
# def create_subsections(
#     lines: Lines,
#     is_line_new_subsection: Callable[[Line, Line], bool],
# ) -> Subsections:
#     """
#     Walks through lines and groups them into subsections using the
#     provided comparator function.
#     """
#     subsections: Subsections = []
#     subsection: Lines = []

#     for i, line in enumerate(lines):
#         if i == 0:
#             subsection.append(line)
#             continue

#         if is_line_new_subsection(line, lines[i - 1]):
#             subsections.append(subsection)
#             subsection = []

#         subsection.append(line)

#     if subsection:
#         subsections.append(subsection)

#     return subsections


# # ---------------- MAIN ENTRY POINT ----------------
# def divide_section_into_subsections(lines: Lines) -> Subsections:
#     """
#     Strategy 1: Split by vertical line gap (works when projects are
#                  visually separated by extra whitespace).
#     Strategy 2: If only 1 subsection found, fall back to bold-line
#                  detection with strict validation to avoid splitting
#                  on wrapped sentence fragments.
#     """
#     # Strategy 1 — gap based
#     is_line_new_subsection = create_is_line_new_subsection_by_line_gap(lines)
#     subsections = create_subsections(lines, is_line_new_subsection)

#     # Strategy 2 — bold based (only if strategy 1 failed)
#     if len(subsections) == 1:
#         subsections = create_subsections(lines, is_line_new_subsection_by_bold)

#     return subsections

import re
from typing import Callable
from ResumeParser.customtypes import Lines, Subsections, Line
from ResumeParser.bullent_points import BULLET_POINTS
from ResumeParser.common_features import is_bold


# ---------------- VALIDATION ----------------

def line_is_predominantly_bold(line: Line) -> bool:
    if not line:
        return False

    bold_count = sum(
        1 for item in line
        if is_bold(item)
    )

    return bold_count / len(line) >= 0.6


def is_valid_title_line(line: Line) -> bool:

    text = " ".join(
        item["text"]
        for item in line
    ).strip()

    if not text:
        return False

    if text[0].islower():
        return False

    if re.search(r'[-,]$', text):
        return False

    if re.search(r'\.$', text):

        if len(text.split()) <= 3:

            return False

    if len(text.split()) > 10:

        return False

    return True


# ---------------- GAP SPLITTER ----------------

def create_is_line_new_subsection_by_line_gap(
    lines: Lines
) -> Callable[[Line, Line], bool]:

    line_gap_to_count = {}

    lines_y = [
        line[0]["y"]
        for line in lines
    ]

    line_gap_with_most_count = 0

    max_count = 0

    for i in range(1, len(lines_y)):

        line_gap = round(
            lines_y[i - 1] -
            lines_y[i]
        )

        if line_gap not in line_gap_to_count:

            line_gap_to_count[line_gap] = 0

        line_gap_to_count[line_gap] += 1

        if line_gap_to_count[line_gap] > max_count:

            max_count = line_gap_to_count[line_gap]

            line_gap_with_most_count = line_gap

    subsection_line_gap_threshold = (
        line_gap_with_most_count * 1.7
    )

    def is_line_new_subsection(
        line: Line,
        prev_line: Line
    ) -> bool:

        gap = round(
            prev_line[0]["y"] -
            line[0]["y"]
        )

        return gap > subsection_line_gap_threshold


    return is_line_new_subsection


# ---------------- BOLD SPLITTER ----------------

def is_line_new_subsection_by_bold(
    line: Line,
    prev_line: Line
) -> bool:

    curr_text = " ".join(
        item["text"]
        for item in line
    )

    prev_text = " ".join(
        item["text"]
        for item in prev_line
    )

    result = (

        not line_is_predominantly_bold(prev_line)

        and

        line_is_predominantly_bold(line)

        and

        line[0]["text"] not in BULLET_POINTS

        and

        is_valid_title_line(line)

    )

    return result

    return result


# ---------------- CREATE SUBSECTIONS ----------------

def create_subsections(

    lines: Lines,

    is_line_new_subsection

) -> Subsections:

    subsections = []

    subsection = []

    for i, line in enumerate(lines):

        if i == 0:

            subsection.append(line)

            continue

        if is_line_new_subsection(

            line,

            lines[i - 1]

        ):

            print("\n======== NEW SUBSECTION ========")

            print(
                "PREV:",
                " | ".join(

                    x["text"]

                    for x in lines[i - 1]

                )
            )

            print(
                "CURR:",
                " | ".join(

                    x["text"]

                    for x in line

                )
            )

            subsections.append(subsection)

            subsection = []

        subsection.append(line)

    if subsection:

        subsections.append(subsection)

    return subsections


# ---------------- MAIN ----------------

def divide_section_into_subsections(

    lines: Lines

) -> Subsections:

    is_line_new_subsection = create_is_line_new_subsection_by_line_gap(

        lines

    )

    subsections = create_subsections(

        lines,

        is_line_new_subsection

    )

    if len(subsections) == 1:

        subsections = create_subsections(

            lines,

            is_line_new_subsection_by_bold

        )

    return subsections