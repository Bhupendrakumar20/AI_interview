import fitz  # PyMuPDF
from typing import List
from ResumeParser.customtypes import TextItems


def read_pdf(file_path: str) -> TextItems:
    """Read a PDF and return a list of text items for parser input."""
    text_items: TextItems = []

    doc = fitz.open(file_path)

    for page in doc:
        blocks = page.get_text("dict")["blocks"]

        for block in blocks:
            if "lines" not in block:
                continue

            for line in block["lines"]:
                for span in line["spans"]:
                    text = span.get("text", "")
                    if not text:
                        continue

                    # Fix weird hyphen issue
                    text = text.replace('-­-', '-')

                    x0, y0, x1, y1 = span["bbox"]

                    text_items.append({
                        'text': text,
                        'fontName': span.get('font', ''),
                        'x': x0,
                        'y': y0,
                        'width': x1 - x0,
                        'height': y1 - y0,
                        'hasEOL': False,
                    })

    # Detect line breaks (same logic as your code)
    for i in range(len(text_items) - 1):
        curr = text_items[i]
        next_item = text_items[i + 1]

        if abs(next_item['y'] - curr['y']) > curr['height'] / 2:
            curr['hasEOL'] = True

    return text_items


# Alias (same as your code)
load_pdf = read_pdf


def extract_text_from_pdf(file_path: str) -> List[str]:
    """Reconstruct plain text lines from text items."""
    text_items = read_pdf(file_path)
    lines: List[str] = []
    current_line = ""

    for i in range(len(text_items) - 1):
        curr = text_items[i]
        next_item = text_items[i + 1]

        current_line += curr['text']

        # Add space if gap between spans is large
        gap = next_item['x'] - (curr['x'] + curr['width'])
        if gap > curr['width'] * 0.5:
            current_line += " "

        if curr['hasEOL']:
            lines.append(current_line.strip())
            current_line = ""

    # Last item
    if text_items:
        current_line += text_items[-1]['text']
        lines.append(current_line.strip())

    return lines


if __name__ == '__main__':
    file_path = 'fake_resume (4).pdf'

    text_items = read_pdf(file_path)
    print('Text items count:', len(text_items))
    print(text_items)  

    lines = extract_text_from_pdf(file_path)
    print('Lines count:', len(lines))
    print('First few lines:', lines)