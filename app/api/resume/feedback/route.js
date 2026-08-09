// import { NextResponse } from "next/server";
// import { GoogleGenerativeAI } from "@/lib/ai-provider";

// export async function POST(request) {
//   const body = await request.json();
//   const { atsResult, jobDescription } = body;

//   if (!atsResult || !jobDescription) {
//     return NextResponse.json(
//       { error: "Both atsResult and jobDescription are required" },
//       { status: 400 }
//     );
//   }

//   const controller = new AbortController();
//   const timeoutId = setTimeout(() => controller.abort(), 30000);

//   try {
//     const pythonUrl = process.env.NEXT_PUBLIC_ADAPTIVE_API_URL || "http://127.0.0.1:8080";
//     const response = await fetch(`${pythonUrl}/feedback`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ atsResult, jobDescription }),
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
//     console.warn("Python feedback failed or timed out. Falling back to Gemini Cloud API...", error.message);

//     try {
//       const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GROQ_API_KEY;
//       if (!apiKey) throw new Error("No API key available for fallback");

//       const genAI = new GoogleGenerativeAI(apiKey);
//       const model = genAI.getGenerativeModel({ model: "gemini-pro" });

//       const prompt = `You are an ATS Resume Expert. Explain overall ATS score, strengths, weaknesses, and key improvements.
// ATS Analysis:
// ${JSON.stringify(atsResult)}

// Job Description:
// ${jobDescription}

// Keep the feedback under 200 words, using clear and professional language.`;

//       const result = await model.generateContent(prompt);
//       const text = await result.response.text();

//       return NextResponse.json({
//         success: true,
//         feedback: text,
//       });
//     } catch (fallbackError) {
//       console.error("Gemini fallback failed:", fallbackError.message);
//       return NextResponse.json({
//         success: true,
//         feedback: "Based on your ATS Score check, you have a solid matching foundation. Make sure to tailor your experiences and double-check missing skills to increase overall matching chances."
//       });
//     }
//   }
// }

import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const body = await request.json();
    const { atsResult, jobDescription } = body;

    if (!atsResult || !jobDescription) {
      return NextResponse.json(
        {
          success: false,
          error: "Both atsResult and jobDescription are required.",
        },
        {
          status: 400,
        }
      );
    }

    const pythonUrl =
      process.env.NEXT_PUBLIC_RESUME_API_URL ||
      "http://127.0.0.1:8000";

    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 240000); // 2 minutes

    const response = await fetch(`${pythonUrl}/feedback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        atsResult,
        jobDescription,
      }),
    });

    clearTimeout(timeout);

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: data.detail || data.error || "Python backend failed.",
        },
        {
          status: response.status,
        }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Feedback API Error:", error);

    if (error.name === "AbortError") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Python backend took too long to respond (timeout after 120 seconds).",
        },
        {
          status: 504,
        }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal Server Error",
      },
      {
        status: 500,
      }
    );
  }
}