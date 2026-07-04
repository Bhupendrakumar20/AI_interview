from typing import List, Dict
from ResumeParser.bullent_points import BULLET_POINTS
from ResumeParser.customtypes import TextItems, Line, Lines

def group_text_items_into_lines(text_items: TextItems) -> Lines:
    """
    Step 2: Group text items into lines. This returns an array where each position
    contains text items in the same line of the pdf file.
    """
    lines: Lines = []

    # Group text items into lines based on hasEOL
    line: Line = []
    for item in text_items:
        # If item is EOL, add current line to lines and start a new empty line
        if item.get('hasEOL', False):
            if item['text'].strip() != "":
                line.append(dict(item))  # copy the item
            if line:  # only append if line has items
                lines.append(line)
            line = []
        # Otherwise, add item to current line
        elif item['text'].strip() != "":
            line.append(dict(item))  # copy the item

    # Add last line if there is item in last line
    if line:
        lines.append(line)

    # Many pdf docs are not well formatted, e.g. due to converting from other docs.
    # This creates many noises, where a single text item is divided into multiple
    # ones. This step is to merge adjacent text items if their distance is smaller
    # than a typical char width to filter out those noises.
    typical_char_width = get_typical_char_width([item for line in lines for item in line])
    for line in lines:
        # Start from the end of the line to make things easier to merge and delete
        i = len(line) - 1
        while i > 0:
            current_item = line[i]
            left_item = line[i - 1]
            left_item_x_end = left_item['x'] + left_item['width']
            distance = current_item['x'] - left_item_x_end
            if distance <= typical_char_width:
                if should_add_space_between_text(left_item['text'], current_item['text']):
                    left_item['text'] += " "
                left_item['text'] += current_item['text']
                # Update leftItem width to include currentItem after merge before deleting current item
                current_item_x_end = current_item['x'] + current_item['width']
                left_item['width'] = current_item_x_end - left_item['x']
                del line[i]
            i -= 1

    return lines

# Sometimes a space is lost while merging adjacent text items. This accounts for some of those cases
def should_add_space_between_text(left_text: str, right_text: str) -> bool:
    if not left_text or not right_text:
        return False
    if left_text.endswith(" ") or right_text.startswith(" "):
        return False
    if left_text.endswith("-"):
        return False

    left_text_end = left_text[-1]
    right_text_start = right_text[0]
    if (left_text_end in [":", ",", "|", ".", "/", "+", ";", "%"] + BULLET_POINTS):
        return True
    if right_text_start.isalnum() and left_text_end not in {" ", "-"}:
        return True

    return False

def get_typical_char_width(text_items: TextItems) -> float:
    """
    Return the width of a typical character. (Helper util for groupTextItemsIntoLines)

    A pdf file uses different characters, each with different width due to different
    font family and font size. This util first extracts the most typically used font
    family and font height, and compute the average character width using text items
    that match the typical font family and height.
    """
    # Exclude empty space " " in calculations since its width isn't precise
    text_items = [item for item in text_items if item['text'].strip() != ""]

    height_to_count: Dict[float, int] = {}
    common_height = 0.0
    height_max_count = 0

    font_name_to_count: Dict[str, int] = {}
    common_font_name = ""
    font_name_max_count = 0

    for item in text_items:
        text = item['text']
        height = item['height']
        font_name = item['fontName']
        # Process height
        if height not in height_to_count:
            height_to_count[height] = 0
        height_to_count[height] += 1
        if height_to_count[height] > height_max_count:
            common_height = height
            height_max_count = height_to_count[height]

        # Process font name
        if font_name not in font_name_to_count:
            font_name_to_count[font_name] = 0
        font_name_to_count[font_name] += len(text)
        if font_name_to_count[font_name] > font_name_max_count:
            common_font_name = font_name
            font_name_max_count = font_name_to_count[font_name]

    # Find the text items that match common font family and height
    common_text_items = [
        item for item in text_items
        if item['fontName'] == common_font_name and item['height'] == common_height
    ]
    # Aggregate total width and number of characters of all common text items
    total_width = 0.0
    num_chars = 0
    for item in common_text_items:
        total_width += item['width']
        num_chars += len(item['text'])

    if num_chars == 0:
        return 0.0  # Avoid division by zero

    typical_char_width = total_width / num_chars

    return typical_char_width