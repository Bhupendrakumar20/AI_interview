import pdfplumber
from typing import List, Dict


def extract_text_items_from_pdf(pdf_path: str) -> List[List[Dict]]:
    structured_lines = []

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            words = page.extract_words()  

            current_line = []
            current_y = None

            for word in words:
                y = round(word["top"], 1)
                if current_y is None:
                    current_y = y

                if abs(y - current_y) > 5:  
                    if current_line:
                        structured_lines.append(current_line)
                    current_line = []
                    current_y = y

                current_line.append({
                    "text": word["text"],
                    "y": y,
                    "bold": False  
                })

            if current_line:
                structured_lines.append(current_line)

    return structured_lines