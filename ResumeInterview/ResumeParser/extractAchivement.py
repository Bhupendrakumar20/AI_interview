import re
from typing import List, Dict, Any, Optional
from ResumeParser.customtypes import ResumeSectionToLines
from ResumeParser.get_section_lines import get_section_lines_by_keywords
from ResumeParser.bullent_points import get_bullet_points_from_lines, separate_words



def extract_achievements(sections: ResumeSectionToLines) -> Dict[str, Any]:
    """
    Extract achievements/certifications from resume sections.
    
    Looks for sections with keywords: achievement, accomplishment, certification,
    award, honor, recognition, etc.
    
    Also scans within Skills and Custom sections for achievement subsections.
    
    Returns a dictionary with:
    - achievements: List of achievement descriptions
    - certifications: List of certification descriptions
    - awards: List of award descriptions
    """
    
    achievements = []
    certifications = []
    awards = []
    
    # Extract general achievements from dedicated sections
    achievement_lines = get_section_lines_by_keywords(
        sections, 
        ["achievement", "accomplishment", "accomplishments"]
    )
    if achievement_lines:
        achievements = get_bullet_points_from_lines(achievement_lines)
        achievements = [separate_words(a.strip()) for a in achievements if a.strip()]
    
    # Extract certifications from dedicated sections
    cert_lines = get_section_lines_by_keywords(
        sections,
        ["certification", "certifications", "credential", "credentials"]
    )
    if cert_lines:
        certifications = _extract_certifications(cert_lines)
    
    # Extract awards and honors from dedicated sections
    award_lines = get_section_lines_by_keywords(
        sections,
        ["award", "awards", "honor", "honors", "recognition", "recognitions"]
    )
    if award_lines:
        awards = get_bullet_points_from_lines(award_lines)
        awards = [separate_words(a.strip()) for a in awards if a.strip()]
    
    # If not found in dedicated sections, look within Skills section
    if not achievements or not certifications or not awards:
        results = _extract_from_mixed_section(sections)
        if not achievements:
            achievements = results.get('achievements', [])
        if not certifications:
            certifications = results.get('certifications', [])
        if not awards:
            awards = results.get('awards', [])
    
    return {
        "achievements": achievements,
        "certifications": certifications,
        "awards": awards,
    }


def _extract_from_mixed_section(sections: ResumeSectionToLines) -> Dict[str, Any]:
    """
    Extract achievements/certifications from mixed sections like Skills 
    that might contain subsections with these keywords.
    """
    achievements = []
    certifications = []
    awards = []
    
    # Check Skills and Custom sections for achievement content
    for section_name in ['Skills', 'Custom', 'Miscellaneous', 'Other']:
        if section_name not in sections:
            continue
            
        lines = sections[section_name]
        full_text = ' '.join([
            item['text'] 
            for line in lines 
            for item in line
        ])
        
        # Look for certification/achievement subsections
        cert_match = re.search(
            r'(?:Certification|Certifications|Certificate)[s]?[:\n\s]+(.*?)(?:(?:Achievement|Award|Recognition|Other|$))',
            full_text,
            re.IGNORECASE | re.DOTALL
        )
        if cert_match:
            cert_text = cert_match.group(1)
            certs = _parse_certifications_from_text(cert_text)
            certifications.extend(certs)
        
        # Look for achievement subsections
        achieve_match = re.search(
            r'(?:Achievement|Accomplishment)[s]?[:\n\s]+(.*?)(?:(?:Award|Recognition|Certification|Other|$))',
            full_text,
            re.IGNORECASE | re.DOTALL
        )
        if achieve_match:
            achieve_text = achieve_match.group(1)
            # Split by newlines and bullet points
            items = re.split(r'[\n•ò]', achieve_text)
            achievements.extend([
                separate_words(line.strip()) 
                for line in items
                if line.strip() and len(line.strip()) > 3
            ])
        
        # Look for award subsections
        award_match = re.search(
            r'(?:Award|Award)[s]?[:\n\s]+(.*?)(?:(?:Recognition|Certification|Achievement|Other|$))',
            full_text,
            re.IGNORECASE | re.DOTALL
        )
        if award_match:
            award_text = award_match.group(1)
            # Split by newlines and bullet points
            items = re.split(r'[\n•ò]', award_text)
            awards.extend([
                separate_words(line.strip()) 
                for line in items
                if line.strip() and len(line.strip()) > 3
            ])    
    return {
        'achievements': achievements,
        'certifications': certifications,
        'awards': awards,
    }


def _parse_certifications_from_text(text: str) -> List[Dict[str, str]]:
    """Parse certification text and extract structured data."""
    certifications = []
    date_pattern = r'\((\w+\s*\d{4}|\d{1,2}/\d{1,2}/\d{4})\)'
    
    # Split by common delimiters
    lines = re.split(r'[\n•]', text)
    
    for line in lines:
        line = line.strip()
        if not line or len(line) < 3:
            continue
        
        cert_dict = {
            "name": line,
            "issuer": "",
            "date": ""
        }
        
        # Extract date if present  
        date_match = re.search(date_pattern, line)
        if date_match:
            cert_dict["date"] = date_match.group(1).strip()
            line = re.sub(date_pattern, '', line).strip()
        
        # Extract issuer if present (after dash or hyphen)
        if ' - ' in line or ' – ' in line:
            parts = re.split(r'\s*[-–]\s*', line)
            if len(parts) >= 2:
                cert_dict["name"] = parts[0].strip()
                cert_dict["issuer"] = parts[1].strip()
            else:
                cert_dict["name"] = line
        else:
            cert_dict["name"] = line
        
        cert_dict["name"] = separate_words(cert_dict["name"])
        if cert_dict["name"]:
            certifications.append(cert_dict)
    
    return certifications


def _extract_certifications(lines) -> List[Dict[str, str]]:
    """
    Extract certification details with name, issuer, and date if available.
    
    Format can be:
    - "Certification Name - Issuer (Date)"
    - "Certification Name - Issuer"
    - "Certification Name (Date)"
    - Just "Certification Name"
    """
    cert_descriptions = get_bullet_points_from_lines(lines)
    certifications = []
    
    date_pattern = r'\((\w+\s*\d{4}|\d{1,2}/\d{1,2}/\d{4})\)'
    issuer_pattern = r'-\s*([^()]+?)(?:\s*\(|$)'
    
    for cert in cert_descriptions:
        if not cert.strip():
            continue
        
        cert_dict = {
            "name": cert.strip(),
            "issuer": "",
            "date": ""
        }
        
        # Extract date if present
        date_match = re.search(date_pattern, cert)
        if date_match:
            cert_dict["date"] = date_match.group(1).strip()
            # Remove date from name for cleaner display
            cert_dict["name"] = re.sub(date_pattern, '', cert).strip()
        
        # Extract issuer if present (after dash)
        issuer_match = re.search(issuer_pattern, cert_dict["name"])
        if issuer_match:
            cert_dict["issuer"] = issuer_match.group(1).strip()
            # Clean up name to remove issuer
            cert_dict["name"] = cert_dict["name"].split('-')[0].strip()
        
        cert_dict["name"] = separate_words(cert_dict["name"])
        certifications.append(cert_dict)
    
    return certifications


def extract_custom_sections(sections: ResumeSectionToLines) -> Dict[str, Any]:
    """
    Extract any custom/unrecognized sections that might contain achievements,
    volunteer work, publications, etc.
    """
    
    # Known section keywords to skip
    known_keywords = [
        "profile", "summary", "objective",
        "education", "experience", "work", "employment",
        "project", "projects",
        "skill", "skills", "technical",
        "achievement", "accomplishment", "certification",
        "award", "honor", "recognition",
        "volunteer", "volunteering",
        "publication", "publications",
        "language", "languages",
        "reference", "references",
        "footer", "header"
    ]
    
    custom_descriptions = []
    
    # Iterate through all sections
    for section_name, lines in sections.items():
        # Check if this section name matches any known keywords
        section_lower = section_name.lower()
        is_known = any(kw in section_lower for kw in known_keywords)
        
        if not is_known and lines:
            # This is likely a custom section
            descriptions = get_bullet_points_from_lines(lines)
            descriptions = [
                separate_words(d.strip()) 
                for d in descriptions 
                if d.strip()
            ]
            custom_descriptions.extend(descriptions)
    
    return {
        "custom_sections": custom_descriptions,
    }


if __name__ == "__main__":
    # Test the achievement extraction
    from ResumeParser.read_pdf import read_pdf
    from group_text_items_into_lines import group_text_items_into_lines
    from group_lines_into_sections import group_lines_into_sections
    
    text_items = read_pdf("Kavya_patel_resume.pdf")
    lines = group_text_items_into_lines(text_items)
    sections = group_lines_into_sections(lines)
    
    achievements = extract_achievements(sections)
    print("\n===== ACHIEVEMENTS =====")
    print(achievements)
    
    custom = extract_custom_sections(sections)
    print("\n===== CUSTOM SECTIONS =====")
    print(custom)
