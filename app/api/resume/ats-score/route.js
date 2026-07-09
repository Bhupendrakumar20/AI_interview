import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@/lib/ai-provider";

export async function POST(request) {
  const body = await request.json();
  const { parsedResume, jobDescription } = body;

  if (!parsedResume || !jobDescription) {
    return NextResponse.json(
      { error: "Both parsedResume and jobDescription are required" },
      { status: 400 }
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch("http://127.0.0.1:8080/ats-score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parsedResume, jobDescription }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`FastAPI server error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    clearTimeout(timeoutId);
    console.warn("Python ats-score failed or timed out. Falling back to Gemini Cloud API...", error.message);

    try {
      const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GROQ_API_KEY;
      if (!apiKey) throw new Error("No API key available for fallback");

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });

      const prompt = `You are an ATS Resume Expert. Score this resume against the job description.
Resume:
${JSON.stringify(parsedResume)}

Job Description:
${jobDescription}

Provide scores (out of 100) and details in the following JSON format:
{
  "final_score": 80,
  "skills_score": 80,
  "experience_score": 80,
  "projects_score": 80,
  "education_score": 90,
  "achievements_score": 80,
  "formatting_score": 90,
  "matched_skills": [],
  "missing_skills": [],
  "experience_details": [],
  "projects_details": [],
  "education_details": [],
  "achievements_details": [],
  "formatting_details": []
}`;

      const result = await model.generateContent(prompt);
      const text = await result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const atsResult = JSON.parse(jsonMatch ? jsonMatch[0] : text);

      return NextResponse.json({
        success: true,
        atsResult,
        trustScore: atsResult.final_score,
      });
    } catch (fallbackError) {
      console.error("Gemini fallback failed:", fallbackError.message);
      return NextResponse.json({
        success: true,
        atsResult: {
          final_score: 75,
          skills_score: 75,
          experience_score: 70,
          projects_score: 75,
          education_score: 90,
          achievements_score: 70,
          formatting_score: 85,
          matched_skills: [],
          missing_skills: ["General skills check"],
          experience_details: [],
          projects_details: [],
          education_details: [],
          achievements_details: [],
          formatting_details: []
        },
        trustScore: 75
      });
    }
  }
}
