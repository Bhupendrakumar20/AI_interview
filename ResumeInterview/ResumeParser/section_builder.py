import pdfplumber
from typing import List, Dict, Any, Optional
import re
from ResumeParser.customtypes import TextItems, TextItem


def read_pdf(file_path: str) -> TextItems:
    text_items: TextItems = []

    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            chars = page.chars
            current_item = None
            page_text_items = []

            for char in chars:
                char_text = char.get('text', '')
                char_x = char.get('x0', 0)  
                char_y = char.get('top', 0)  
                char_width = char.get('x1', 0) - char.get('x0', 0)
                char_height = char.get('bottom', 0) - char.get('top', 0)
                char_fontname = char.get('fontname', '')
                char_text = char_text.replace('-­‐', '-')
                if current_item is None:
                    current_item = {
                        'text': char_text,
                        'x': char_x,
                        'y': char_y,
                        'width': char_width,
                        'height': char_height,
                        'fontName': char_fontname,
                        'hasEOL': False
                    }
                else:
                    if (abs(current_item['y'] - char_y) < 2 and  
                        char_x - (current_item['x'] + current_item['width']) < 10):  
                        current_item['text'] += char_text
                        current_item['width'] = char_x + char_width - current_item['x']
                    else:
                        page_text_items.append(current_item)
                        current_item = {
                            'text': char_text,
                            'x': char_x,
                            'y': char_y,
                            'width': char_width,
                            'height': char_height,
                            'fontName': char_fontname,
                            'hasEOL': False
                        }

            if current_item:
                page_text_items.append(current_item)
            text_items.extend(page_text_items)
    def is_empty_space(text_item: TextItem) -> bool:
        return not text_item.get('hasEOL', False) and text_item['text'].strip() == ""

    text_items = [item for item in text_items if not is_empty_space(item)]

    return text_items


SECTION_KEYWORDS = {
    "profile": ["profile", "summary"],
    "skills": ["skills", "technical skills","relevant skills"],
    "work": ["experience", "work experience", "professional experience"],
    "education": ["education"],
    "project": ["projects", "project"],
}


def build_sections(lines: List[List[Dict]]) -> Dict[str, List[List[Dict]]]:
    """Build sections from lines based on keywords."""
    sections = {}
    current_section = "profile"  

    sections[current_section] = []

    for line in lines:
        text = line[0]["text"].lower()

        matched = False
        for section, keywords in SECTION_KEYWORDS.items():
            if any(keyword in text for keyword in keywords):
                current_section = section
                if current_section not in sections:
                    sections[current_section] = []
                matched = True
                break

        if not matched:
            sections.setdefault(current_section, []).append(line)

    return sections