import pymupdf

from ResumeInterview.ResumeValidate.validator import validate_resume_pdf, validate_resume_text


def test_resume_requires_content_in_all_three_sections():
    result = validate_resume_text(
        """
        EDUCATION
        BSc Computer Science, North University
        SKILLS
        Python, SQL, React
        PROJECTS
        Built a course planner with React
        """
    )

    assert result["valid"] is True
    assert result["missingSections"] == []
    assert all(result["sections"].values())


def test_resume_validation_reports_sections_without_entries():
    result = validate_resume_text(
        """
        Education
        BSc Computer Science
        Skills
        Projects
        """
    )

    assert result["valid"] is False
    assert result["missingSections"] == ["Skills", "Projects"]


def test_resume_validation_accepts_inline_section_entries():
    result = validate_resume_text(
        """
        Education: BSc Computer Science
        Skills: Python, SQL
        Projects: Inventory dashboard
        """
    )

    assert result["valid"] is True


def test_resume_validation_recognizes_section_heading_with_right_aligned_metadata():
    result = validate_resume_text(
        """
        EDUCATION 2023 – 2027 (Expected)
        Bachelor of Technology, North University
        TECHNICAL SKILLS
        Python, SQL, React
        EXPERIENCE
        Software Engineer
        PROJECTS
        Built an inventory dashboard
        """
    )

    assert result["valid"] is True


def test_language_category_inside_skills_is_not_treated_as_a_section_boundary():
    result = validate_resume_text(
        """
        EDUCATION
        Bachelor of Technology
        TECHNICAL SKILLS
        Languages: Python, JavaScript, SQL
        Frontend: React, Next.js
        EXPERIENCE
        Software Engineer
        PROJECTS
        Built an inventory dashboard
        """
    )

    assert result["valid"] is True


def test_resume_validation_does_not_match_section_words_in_paragraphs():
    result = validate_resume_text(
        """
        My education includes project work and technical skills.
        I enjoy building software.
        """
    )

    assert result["valid"] is False
    assert result["missingSections"] == ["Education", "Skills", "Projects"]


def test_other_resume_sections_end_the_required_section_content():
    result = validate_resume_text(
        """
        Education
        BSc Computer Science
        Skills
        Work Experience
        Software Engineer
        Projects
        """
    )

    assert result["valid"] is False
    assert result["missingSections"] == ["Skills", "Projects"]


def test_resume_validation_extracts_sections_from_pdf(tmp_path):
    document = pymupdf.open()
    page = document.new_page()
    page.insert_textbox(
        pymupdf.Rect(40, 40, 550, 750),
        "EDUCATION\nBSc Computer Science\nSKILLS\nPython, SQL\nPROJECTS\nBuilt an inventory app",
        fontsize=12,
    )
    pdf_path = tmp_path / "resume.pdf"
    document.save(pdf_path)
    document.close()

    result = validate_resume_pdf(pdf_path)

    assert result["valid"] is True
    assert result["missingSections"] == []


def test_non_resume_pdf_fails_validation(tmp_path):
    document = pymupdf.open()
    document.new_page()
    pdf_path = tmp_path / "document.pdf"
    document.save(pdf_path)
    document.close()

    result = validate_resume_pdf(pdf_path)

    assert result["valid"] is False
    assert result["missingSections"] == ["Education", "Skills", "Projects"]
