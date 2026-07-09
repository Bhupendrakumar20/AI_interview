import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@/lib/ai-provider";

export async function POST(request) {
  const body = await request.json();
  const { parsedResume, focusArea, persona, numQuestions } = body;

  if (!parsedResume) {
    return NextResponse.json({ error: "parsedResume is required" }, { status: 400 });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch("http://127.0.0.1:8080/generate-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        parsedResume,
        focusArea: focusArea || "Projects",
        persona: persona || "hiring-manager",
        numQuestions: numQuestions || 5,
      }),
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
    console.warn("Python generate-questions failed or timed out. Falling back to Gemini Cloud API...", error.message);

    try {
      const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GROQ_API_KEY;
      if (!apiKey) {
        throw new Error("No API key available for cloud fallback");
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });

      const prompt = `You are a professional technical interviewer with the following persona: ${persona || "hiring-manager"}.
Based on this resume data:
${JSON.stringify(parsedResume)}

Generate ${numQuestions || 5} claim verification questions focusing on: ${focusArea || "Projects"}.
Format the response exactly as a JSON array of objects:
[
  {
    "question": "The verification question",
    "claim": "The claim being verified",
    "expectedKeywords": ["keyword1", "keyword2"]
  }
]`;

      const result = await model.generateContent(prompt);
      const text = await result.response.text();
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      const verificationQuestions = JSON.parse(jsonMatch ? jsonMatch[0] : text);

      return NextResponse.json({
        success: true,
        verificationQuestions,
      });
    } catch (fallbackError) {
      console.error("Gemini fallback also failed:", fallbackError.message);
      return NextResponse.json({
        success: true,
        verificationQuestions: [
          {
            question: "Can you walk me through the architecture and main challenges of your most recent project?",
            claim: "General experience",
            expectedKeywords: ["architecture", "challenges"]
          }
        ]
      });
    }
  }
}
