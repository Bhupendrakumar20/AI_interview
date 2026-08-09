// import { NextResponse } from "next/server";
// import { GoogleGenerativeAI } from "@/lib/ai-provider";

// export async function POST(request) {
//   const body = await request.json();
//   const { parsedResume, atsResult } = body;

//   if (!parsedResume || !atsResult) {
//     return NextResponse.json(
//       { error: "Both parsedResume and atsResult are required" },
//       { status: 400 }
//     );
//   }

//   const controller = new AbortController();
//   const timeoutId = setTimeout(() => controller.abort(), 30000);

//   try {
//     const pythonUrl = process.env.NEXT_PUBLIC_ADAPTIVE_API_URL || "http://127.0.0.1:8080";
//     const response = await fetch(`${pythonUrl}/optimize-resume`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ parsedResume, atsResult }),
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
//     console.warn("Python optimize-resume failed or timed out. Falling back to Gemini Cloud API...", error.message);

//     try {
//       const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GROQ_API_KEY;
//       if (!apiKey) throw new Error("No API key available for fallback");

//       const genAI = new GoogleGenerativeAI(apiKey);
//       const model = genAI.getGenerativeModel({ model: "gemini-pro" });

//       const prompt = `Optimize this resume based on the ATS score analysis.
// Resume:
// ${JSON.stringify(parsedResume)}

// ATS Result:
// ${JSON.stringify(atsResult)}

// Generate a new professional summary and a list of key tailored skills to add, formatted as JSON:
// {
//   "summary": "The new optimized professional summary",
//   "skills": ["Skill1", "Skill2", "Skill3"]
// }`;

//       const result = await model.generateContent(prompt);
//       const text = await result.response.text();
//       const jsonMatch = text.match(/\{[\s\S]*\}/);
//       const optimizedResume = JSON.parse(jsonMatch ? jsonMatch[0] : text);

//       return NextResponse.json({
//         success: true,
//         optimizedResume,
//       });
//     } catch (fallbackError) {
//       console.error("Gemini fallback failed:", fallbackError.message);
//       return NextResponse.json({
//         success: true,
//         optimizedResume: {
//           summary: parsedResume?.profile?.summary || "Highly skilled software engineer focusing on system design and scalable architectures.",
//           skills: atsResult?.missing_skills || []
//         }
//       });
//     }
//   }
// }
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const body = await request.json();

    const { parsedResume, atsResult } = body;

    if (!parsedResume || !atsResult) {
      return NextResponse.json(
        {
          success: false,
          error: "Both parsedResume and atsResult are required.",
        },
        {
          status: 400,
        }
      );
    }

    const pythonUrl =
      process.env.NEXT_PUBLIC_RESUME_API_URL ||
      process.env.NEXT_PUBLIC_RESUME_API_URL_2 ||
      "http://127.0.0.1:8000";

    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 240000); // 2 minutes

    const response = await fetch(`${pythonUrl}/optimize-resume`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "bypass-tunnel-reminder": "true",
      },
      signal: controller.signal,
      body: JSON.stringify({
        parsedResume,
        atsResult,
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
    console.error("Optimize Resume API Error:", error);

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