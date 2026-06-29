import { GoogleGenerativeAI } from "@/lib/ai-provider";
import { withRateLimit } from "@/lib/rate-limiter";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GROQ_API_KEY);

export async function POST(request) {
  try {
    const {
      faceDetectionData,
      eyeTrackingData,
      audioAnalysisData,
      screenActivityData,
      clipboardData,
      tabSwitchData,
      sessionId,
      candidateId,
    } = await request.json();

    // Initialize proctoring flags
    const proctorFlags = {
      multipleFaces: false,
      abnormalEyeMovement: false,
      multipleVoices: false,
      suspiciousVideoPatterns: false,
      copyPasteActivity: false,
      tabSwitching: false,
      phoneDetection: false,
      notesDetection: false,
      suspiciousObjects: false,
    };

    // Analyze Face Detection
    if (faceDetectionData?.detectedFaces?.length > 1) {
      proctorFlags.multipleFaces = true;
    }

    // Analyze Eye Tracking
    if (eyeTrackingData?.lookingAwayDuration > 5000) {
      // 5 seconds of looking away
      proctorFlags.abnormalEyeMovement = true;
    }

    // Analyze Audio
    if (audioAnalysisData?.detectedVoices > 1) {
      proctorFlags.multipleVoices = true;
    }

    // Analyze Screen Activity
    if (screenActivityData?.rapidMouseMovement) {
      proctorFlags.suspiciousVideoPatterns = true;
    }

    // Copy-Paste Detection
    if (clipboardData?.pasteEvents > 2) {
      proctorFlags.copyPasteActivity = true;
    }

    // Tab Switching Detection
    if (tabSwitchData?.tabSwitches > 3) {
      proctorFlags.tabSwitching = true;
    }

    // Object Detection (phone, notes)
    if (screenActivityData?.detectedObjects) {
      if (screenActivityData.detectedObjects.includes("phone")) {
        proctorFlags.phoneDetection = true;
      }
      if (screenActivityData.detectedObjects.includes("notes")) {
        proctorFlags.notesDetection = true;
      }
      if (
        screenActivityData.detectedObjects.includes("phone") ||
        screenActivityData.detectedObjects.includes("book")
      ) {
        proctorFlags.suspiciousObjects = true;
      }
    }

    // Calculate Integrity Score
    const flagsTriggered = Object.values(proctorFlags).filter(Boolean).length;
    const integrityScore = Math.max(
      0,
      100 - flagsTriggered * 15 // Each flag reduces score by 15%
    );

    // Use Gemini or Groq to generate detailed analysis if API key exists
    let aiAnalysis = {};
    if (process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GROQ_API_KEY) {
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        const prompt = `Analyze this proctoring data and provide insights:
        
        Detected Issues: ${Object.entries(proctorFlags)
          .filter(([_, v]) => v)
          .map(([k, _]) => k)
          .join(", ")}
        
        Face Detection Data: ${JSON.stringify(faceDetectionData)}
        Eye Tracking Data: ${JSON.stringify(eyeTrackingData)}
        Audio Analysis: ${JSON.stringify(audioAnalysisData)}
        
        Please provide:
        1. Risk Assessment
        2. Recommended Actions
        3. Confidence Level
        
        Format as JSON`;

        const result = await withRateLimit(async () => {
          return await model.generateContent(prompt);
        }, "proctorBehaviorAnalysis", candidateId || sessionId || "anonymous", { prompt });
        const responseText = await result.response.text();

        // Try to parse JSON response
        try {
          aiAnalysis = JSON.parse(responseText);
        } catch {
          aiAnalysis = {
            riskAssessment: responseText,
            recommendedActions: "Review recording manually",
            confidenceLevel: 0.8,
          };
        }
      } catch (error) {
        console.error("Gemini API error:", error);
        aiAnalysis = {
          error: "Gemini API not available, using flag-based analysis",
          fallbackAnalysis: true,
        };
      }
    }

    // Generate report
    const report = {
      sessionId,
      candidateId,
      timestamp: new Date().toISOString(),
      proctorFlags,
      integrityScore,
      flagsTriggered,
      aiAnalysis: aiAnalysis.fallbackAnalysis
        ? generateFallbackAnalysis(proctorFlags)
        : aiAnalysis,
      verdict:
        integrityScore >= 80
          ? "PASS"
          : integrityScore >= 60
            ? "REVIEW"
            : "FAIL",
      severity: integrityScore >= 80 ? "LOW" : integrityScore >= 60 ? "MEDIUM" : "HIGH",
    };

    return Response.json(report, { status: 200 });
  } catch (error) {
    console.error("Proctoring analysis error:", error);
    return Response.json(
      { error: "Failed to analyze proctoring data", details: error.message },
      { status: 500 }
    );
  }
}

function generateFallbackAnalysis(flags) {
  const issues = Object.entries(flags)
    .filter(([_, v]) => v)
    .map(([k, _]) => k);

  return {
    riskAssessment: issues.length
      ? `${issues.length} suspicious behaviors detected: ${issues.join(", ")}`
      : "No suspicious behaviors detected",
    recommendedActions:
      issues.length > 2
        ? "Manual review recommended"
        : issues.length > 0
          ? "Flag for further investigation"
          : "Proceed with interview",
    confidenceLevel: 0.85,
  };
}
