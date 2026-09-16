// import { NextResponse } from "next/server";
// import { GoogleGenerativeAI } from "@/lib/ai-provider";

// export async function POST(request) {
//   const body = await request.json();
//   const { parsedResume, focusArea, persona, numQuestions } = body;

//   if (!parsedResume) {
//     return NextResponse.json({ error: "parsedResume is required" }, { status: 400 });
//   }

//   const controller = new AbortController();
//   const timeoutId = setTimeout(() => controller.abort(), 30000);

//   try {
//     const pythonUrl = process.env.NEXT_PUBLIC_ADAPTIVE_API_URL || "http://127.0.0.1:8080";
//     const response = await fetch(`${pythonUrl}/generate-questions`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         parsedResume,
//         focusArea: focusArea || "Projects",
//         persona: persona || "hiring-manager",
//         numQuestions: numQuestions || 5,
//       }),
//       signal: controller.signal,
//     });

//     clearTimeout(timeoutId);

//     if (!response.ok) {
//       throw new Error(`FastAPI server error: ${response.status}`);
//     }

//     const data = await response.json();
//     return NextResponse.json(data);
//   } catch (error) {
//     clearTimeout(timeoutId);
//     console.warn("Python generate-questions failed or timed out. Falling back to Gemini Cloud API...", error.message);

//     try {
//       const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GROQ_API_KEY;
//       if (!apiKey) {
//         throw new Error("No API key available for cloud fallback");
//       }

//       const genAI = new GoogleGenerativeAI(apiKey);
//       const model = genAI.getGenerativeModel({ model: "gemini-pro" });

//       const prompt = `You are a professional technical interviewer with the following persona: ${persona || "hiring-manager"}.
// Based on this resume data:
// ${JSON.stringify(parsedResume)}

// Generate ${numQuestions || 5} claim verification questions focusing on: ${focusArea || "Projects"}.
// Format the response exactly as a JSON array of objects:
// [
//   {
//     "question": "The verification question",
//     "claim": "The claim being verified",
//     "expectedKeywords": ["keyword1", "keyword2"]
//   }
// ]`;

//       const result = await model.generateContent(prompt);
//       const text = await result.response.text();
//       const jsonMatch = text.match(/\[[\s\S]*\]/);
//       const verificationQuestions = JSON.parse(jsonMatch ? jsonMatch[0] : text);

//       return NextResponse.json({
//         success: true,
//         verificationQuestions,
//       });
//     } catch (fallbackError) {
//       console.error("Gemini fallback also failed:", fallbackError.message);
//       return NextResponse.json({
//         success: true,
//         verificationQuestions: [
//           {
//             question: "Can you walk me through the architecture and main challenges of your most recent project?",
//             claim: "General experience",
//             expectedKeywords: ["architecture", "challenges"]
//           }
//         ]
//       });
//     }
//   }
// }

import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@/lib/ai-provider";

export async function POST(request) {
  const body = await request.json();
  const {
    parsedResume,
    focusArea = "Projects",
    persona = "hiring-manager",
    numQuestions = 1,
  } = body;

  if (!parsedResume) {
    return NextResponse.json(
      {
        success: false,
        error: "parsedResume is required",
      },
      { status: 400 }
    );
  }

  const pythonUrl = process.env.NODE_ENV === "production"
    ? (process.env.NEXT_PUBLIC_RESUME_API_URL_2 || process.env.NEXT_PUBLIC_RESUME_API_URL || "http://127.0.0.1:8000")
    : (process.env.NEXT_PUBLIC_RESUME_API_URL || "http://127.0.0.1:8000");

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, 120000); // 120 seconds timeout to allow local Ollama enough time to generate and avoid cloud fallbacks

  try {
    const response = await fetch(`${pythonUrl}/generate-questions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "bypass-tunnel-reminder": "true",
      },
      signal: controller.signal,
      body: JSON.stringify({
        parsedResume,
        focusArea,
        persona,
        numQuestions,
      }),
    });

    clearTimeout(timeout);

    let data;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = { error: text || "Non-JSON response from backend" };
    }

    if (!response.ok) {
      throw new Error(data.detail || data.error || "Python backend failed.");
    }

    return NextResponse.json(data);
  } catch (error) {
    clearTimeout(timeout);
    console.warn("Python backend generate-questions failed/timed out. Falling back to Gemini/Groq Cloud AI...", error.message);

    try {
      const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GROQ_API_KEY;
      if (!apiKey) {
        throw new Error("No Cloud API Key configured (GOOGLE_GENERATIVE_AI_API_KEY or GROQ_API_KEY)");
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });

      const prompt = `You are a professional technical interviewer with the following persona: ${persona}.
Based on this resume data:
${JSON.stringify(parsedResume)}

Generate ${numQuestions} claim verification questions focusing on the area: ${focusArea}.
For each question, also identify the specific claim being verified and 2-4 expected keywords/concepts the user should mention.

You MUST output ONLY a valid JSON object matching this schema, without markdown backticks or extra text:
{
  "verificationQuestions": [
    {
      "question": "The verification question",
      "claim": "The claim being verified",
      "expectedKeywords": ["keyword1", "keyword2"]
    }
  ]
}`;

      const result = await model.generateContent(prompt);
      const responseText = await result.response.text();
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Model failed to return a valid JSON structure.");
      }

      const parsedJson = JSON.parse(jsonMatch[0]);
      return NextResponse.json({
        success: true,
        verificationQuestions: parsedJson.verificationQuestions || [],
      });
    } catch (fallbackError) {
      console.error("Cloud AI Fallback also failed:", fallbackError.message);
      // Hard fallback to mock questions to prevent front-end crash
      return NextResponse.json({
        success: true,
        verificationQuestions: [
          {
            question: `Can you walk me through how you implemented or managed ${focusArea} in your projects?`,
            claim: `Demonstrate ${focusArea} implementation`,
            expectedKeywords: [focusArea, "design", "development"]
          }
        ]
      });
    }
  }
}