import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@/lib/ai-provider";

function jsonToLatex(data) {
  // Safe helper to escape LaTeX special characters
  const esc = (str) => {
    if (!str) return "";
    return str
      .replace(/\\/g, "\\textbackslash{}")
      .replace(/&/g, "\\&")
      .replace(/%/g, "\\%")
      .replace(/\$/g, "\\$")
      .replace(/#/g, "\\#")
      .replace(/_/g, "\\_")
      .replace(/\{/g, "\\{")
      .replace(/\}/g, "\\}")
      .replace(/~/g, "\\textasciitilde{}")
      .replace(/\^/g, "\\textasciicircum{}");
  };

  const name = esc(data.name) || "Your Name";
  const location = esc(data.location) || "";
  const phone = esc(data.phone) || "";
  const email = esc(data.email) || "";
  const linkedin = esc(data.linkedin) || "";
  const github = esc(data.github) || "";
  const summary = esc(data.summary) || "Professional qualifications...";

  const skillsStr = Array.isArray(data.skills)
    ? data.skills.map(esc).join(", ")
    : esc(data.skills) || "";

  const experienceItems = (data.experience || [])
    .map((exp) => {
      const title = esc(exp.title);
      const company = esc(exp.company);
      const duration = esc(exp.duration);
      const bullets = (exp.responsibilities || [])
        .map((r) => `  \\item ${esc(r)}`)
        .join("\n");
      return `\\noindent\\textbf{${title}} -- ${company} \\hfill ${duration} \\\\
\\begin{itemize}[noitemsep,topsep=2pt,parsep=0pt,partopsep=0pt]
${bullets || "  \\item Details..."}
\\end{itemize}
\\vspace{6pt}`;
    })
    .join("\n");

  const projectItems = (data.projects || [])
    .map((proj) => {
      const pName = esc(proj.name);
      const pTech = Array.isArray(proj.technologies)
        ? proj.technologies.map(esc).join(", ")
        : esc(proj.technologies) || "";
      const pDesc = esc(proj.description);
      const bullets = (proj.highlights || [])
        .map((h) => `  \\item ${esc(h)}`)
        .join("\n");
      return `\\noindent\\textbf{${pName}} \\hfill \\textit{${pTech}} \\\\
\\textit{${pDesc}} \\\\
\\begin{itemize}[noitemsep,topsep=2pt,parsep=0pt,partopsep=0pt]
${bullets || "  \\item Accomplished details..."}
\\end{itemize}
\\vspace{6pt}`;
    })
    .join("\n");

  const educationItems = (data.education || [])
    .map((edu) => {
      const deg = esc(edu.degree);
      const inst = esc(edu.institution);
      const gpa = esc(edu.gpa);
      const year = esc(edu.year);
      return `\\noindent\\textbf{${deg}} \\hfill ${year} \\\\
${inst} ${gpa ? `\\hfill GPA: ${gpa}` : ""} \\\\
\\vspace{4pt}`;
    })
    .join("\n");

  const achievementsItems = (data.achievements || [])
    .map((ach) => `  \\item ${esc(ach)}`)
    .join("\n");

  const certificationsItems = (data.certifications || [])
    .map((cert) => `  \\item ${esc(cert)}`)
    .join("\n");

  return `\\documentclass[10pt,letterpaper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{hyperref}
\\usepackage{titlesec}
\\usepackage{enumitem}

\\titleformat{\\section}{\\large\\bfseries}{}{0em}{}[\\titlerule]
\\titlespacing{\\section}{0pt}{10pt}{5pt}

\\begin{document}
\\pagestyle{empty}

\\begin{center}
    {\\LARGE \\textbf{${name}}} \\\\
    \\vspace{4pt}
    ${location ? `${location} | ` : ""}${phone ? `${phone} | ` : ""}\\href{mailto:${email}}{${email}} \\\\
    \\vspace{2pt}
    ${linkedin ? `\\href{https://${linkedin}}{LinkedIn} | ` : ""}${github ? `\\href{https://${github}}{GitHub}` : ""}
\\end{center}

\\section*{Professional Summary}
${summary}

\\section*{Skills}
\\textbf{Technical Skills:} ${skillsStr || "Relevant skills..."}

\\section*{Work Experience}
${experienceItems || "\\noindent No experience details provided."}

\\section*{Projects}
${projectItems || "\\noindent No projects details provided."}

\\section*{Education}
${educationItems || "\\noindent No education details provided."}
${
  achievementsItems
    ? `
\\section*{Achievements}
\\begin{itemize}[noitemsep,topsep=2pt]
${achievementsItems}
\\end{itemize}`
    : ""
}
${
  certificationsItems
    ? `
\\section*{Certifications}
\\begin{itemize}[noitemsep,topsep=2pt]
${certificationsItems}
\\end{itemize}`
    : ""
}

\\end{document}`;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { type, text, name, email } = body;

    if (!text) {
      return NextResponse.json({ error: "Missing source content or description text." }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("Missing Google Gemini API Key.");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `You are a professional resume writer and formatter. 
Please convert the following raw resume details/description into a beautifully structured, comprehensive JSON object that represents a standard resume.
Make sure to extract:
- Personal Details (Name, email, location, phone, linkedin, github)
- Professional Summary (A strong 2-3 sentence summary)
- Tech Skills list
- Work Experience (Job title, company, duration, and bullet points of responsibilities)
- Projects (Project name, description, technologies used, and key highlight bullets)
- Education (Degree, institution, gpa, graduation year)
- Achievements (list of notable achievements)
- Certifications (list of key credentials)

If any values are missing, please extrapolate or output empty placeholders responsibly.
Here is the input data:
${text}

Additional Profile Details provided:
Name: ${name || "Not provided"}
Email: ${email || "Not provided"}

You MUST output ONLY a valid JSON object matching this schema, without markdown backticks or extra text:
{
  "name": "...",
  "email": "...",
  "phone": "...",
  "location": "...",
  "linkedin": "...",
  "github": "...",
  "summary": "...",
  "skills": ["...", "..."],
  "experience": [
    {
      "title": "...",
      "company": "...",
      "duration": "...",
      "responsibilities": ["...", "..."]
    }
  ],
  "projects": [
    {
      "name": "...",
      "description": "...",
      "technologies": ["...", "..."],
      "highlights": ["...", "..."]
    }
  ],
  "education": [
    {
      "degree": "...",
      "institution": "...",
      "gpa": "...",
      "year": "..."
    }
  ],
  "achievements": ["..."],
  "certifications": ["..."]
}`;

    const result = await model.generateContent(prompt);
    const textOutput = await result.response.text();
    const jsonMatch = textOutput.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Model failed to output a valid JSON structure.");
    }

    const parsedJson = JSON.parse(jsonMatch[0]);

    // Generate LaTeX template code
    const latexCode = jsonToLatex(parsedJson);

    return NextResponse.json({
      success: true,
      resumeJson: parsedJson,
      latexCode: latexCode,
      message: "Resume generated successfully! Your LaTeX template is ready."
    });

  } catch (error) {
    console.error("Resume generation error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to generate resume template."
    }, { status: 500 });
  }
}
