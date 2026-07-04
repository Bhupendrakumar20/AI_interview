from typing import List
from ResumeParser.customtypes import ResumeSectionToLines


def get_section_lines_by_keywords(sections: ResumeSectionToLines,keywords: List[str]) :
    
    for section_name in sections:
        has_keyword = any(
            keyword.lower() in section_name.lower()
            for keyword in keywords
        )
        if has_keyword:
            return sections[section_name]
    return []
