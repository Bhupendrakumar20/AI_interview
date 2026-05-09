import { GoogleGenerativeAI } from "@google/generative-ai";
import { withRateLimit } from "@/lib/rate-limiter";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

export async function POST(request) {
  try {
    const {
      mode, // "setup", "assist", "evaluate"
      question,
      candidateResponse,
      aiToolsUsed = [],
      promptQuality,
      aiDebugSkill,
      decisionMaking,
      efficiency,
      sessionId,
      candidateId,
    } = await request.json();

    if (mode === "setup") {
      return setupCopilotMode(sessionId, candidateId);
    } else if (mode === "assist") {
      return assistWithAI(question, aiToolsUsed, sessionId, candidateId);
    } else if (mode === "evaluate") {
      return evaluateCopilotUsage(
        candidateResponse,
        aiToolsUsed,
        promptQuality,
        aiDebugSkill,
        decisionMaking,
        efficiency,
        sessionId,
        candidateId
      );
    }

    return Response.json(
      { error: "Invalid mode. Use: setup, assist, or evaluate" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Copilot mode error:", error);
    return Response.json(
      { error: "Copilot mode failed", details: error.message },
      { status: 500 }
    );
  }
}

async function setupCopilotMode(sessionId, candidateId) {
  try {
    // Establish guidelines for AI usage
    const guidelines = {
      allowedTools: [
        { name: "ChatGPT", capability: "general_assistance" },
        { name: "GitHub Copilot", capability: "code_generation" },
        { name: "Official Docs", capability: "reference" },
        { name: "Stack Overflow", capability: "research" },
      ],
      constraints: {
        directCopyPaste: false, // Must understand and explain
        multipleConsultations: "encouraged for validation",
        timeLimit: "no hard limit, but logged",
        explanationRequired: true,
      },
      monitoredMetrics: [
        "prompts_used",
        "refinement_iterations",
        "time_per_prompt",
        "explanatory_depth",
        "independent_thinking",
      ],
    };

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return Response.json(
        {
          mode: "copilot",
          status: "active",
          sessionId,
          candidateId,
          guidelines,
          geminiAvailable: false,
          fallback: true,
        },
        { status: 200 }
      );
    }

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // Get AI tips for optimal copilot usage
    const tipsPrompt = `Generate 3-4 tips for candidates on how to best use AI tools during interviews to demonstrate real productivity and AI literacy. Focus on:
1. Asking better prompts
2. Debugging AI suggestions
3. Showing critical thinking
4. Time efficiency

Format as JSON array of tips.`;

    const tipsResult = await withRateLimit(async () => {
      return await model.generateContent(tipsPrompt);
    }, "copilotModeTips", candidateId || sessionId || "anonymous");
    const tipsText = await tipsResult.response.text();

    let tips = [];
    try {
      tips = JSON.parse(tipsText);
    } catch {
      tips = generateDefaultTips();
    }

    return Response.json(
      {
        mode: "copilot",
        status: "active",
        sessionId,
        candidateId,
        guidelines,
        tips,
        geminiAvailable: true,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Setup error:", error);
    return Response.json(
      { error: "Setup failed", details: error.message },
      { status: 500 }
    );
  }
}

async function assistWithAI(question, aiToolsUsed = [], sessionId, candidateId) {
  try {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return generateFallbackAssistance(question);
    }

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // Provide AI-assisted guidance
    const assistPrompt = `A candidate is working on this interview question and wants to use AI assistance:

Question: "${question}"

Provide assistance that:
1. Guides structure/approach without giving complete answer
2. Suggests key areas to cover
3. Points out gotchas or edge cases
4. Recommends how to use AI tools effectively

Format as JSON with:
{
  "guidance": "structural guidance",
  "keyAreas": ["area1", "area2"],
  "edgeCases": ["edge1", "edge2"],
  "recommendedPrompts": [{"prompt": "example", "purpose": "what to ask AI"}],
  "followUpValidation": "how to verify AI suggestions"
}`;

    const result = await withRateLimit(async () => {
      return await model.generateContent(assistPrompt);
    }, "copilotModeAssist", candidateId || sessionId || "anonymous");
    const responseText = await result.response.text();

    let assistance;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      assistance = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
    } catch {
      assistance = {
        guidance: responseText,
        keyAreas: [],
        edgeCases: [],
        recommendedPrompts: [],
      };
    }

    return Response.json(
      {
        sessionId,
        candidateId,
        question,
        assistance,
        toolsAvailable: [
          "chatgpt",
          "copilot",
          "documentation",
          "debugger",
        ],
        instructions: "Use these suggestions to enhance your answer with AI. Show your understanding!",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Assist error:", error);
    return generateFallbackAssistance(question);
  }
}

async function evaluateCopilotUsage(
  candidateResponse,
  aiToolsUsed = [],
  promptQuality = 0,
  aiDebugSkill = 0,
  decisionMaking = 0,
  efficiency = 0,
  sessionId,
  candidateId
) {
  try {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return generateFallbackEvaluation(
        candidateResponse,
        aiToolsUsed,
        promptQuality
      );
    }

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // Evaluate AI usage quality
    const evaluationPrompt = `Evaluate this candidate's use of AI tools during interview:

Response: "${candidateResponse}"
AI Tools Used: ${aiToolsUsed.join(", ")}
Prompt Quality Score (0-100): ${promptQuality}
AI Debugging Skill (0-100): ${aiDebugSkill}
Decision Making (0-100): ${decisionMaking}

Assess:
1. Quality of AI prompts
2. How well they debugged AI suggestions
3. Critical thinking shown
4. Time efficiency
5. Understanding of solution

Return JSON:
{
  "aiLiteracyScore": (0-100),
  "promptEngineeringSkill": "description",
  "debuggingAbility": "description",
  "criticalThinking": "high|medium|low",
  "productivityScore": (0-100),
  "overallAssessment": "strong|adequate|weak",
  "recommendation": "assessment of their AI usage effectiveness"
}`;

    const result = await withRateLimit(async () => {
      return await model.generateContent(evaluationPrompt);
    }, "copilotModeEvaluation", candidateId || sessionId || "anonymous");
    const responseText = await result.response.text();

    let evaluation;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      evaluation = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
    } catch {
      evaluation = {
        aiLiteracyScore: (promptQuality + aiDebugSkill + decisionMaking) / 3,
        overallAssessment: "adequate",
      };
    }

    // Calculate AI Literacy Score
    const aiLiteracyScore = calculateAILiteracy(
      promptQuality,
      aiDebugSkill,
      decisionMaking,
      efficiency
    );

    return Response.json(
      {
        sessionId,
        candidateId,
        aiLiteracyScore,
        evaluation,
        toolsUsagePattern: analyzeToolUsage(aiToolsUsed),
        metrics: {
          promptQuality,
          debuggingSkill: aiDebugSkill,
          decisionMaking,
          efficiency,
        },
        verdict:
          aiLiteracyScore >= 80
            ? "EXCELLENT_AI_PRODUCTIVITY"
            : aiLiteracyScore >= 60
              ? "GOOD_AI_USAGE"
              : "NEEDS_IMPROVEMENT",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Evaluation error:", error);
    return Response.json(
      { error: "Evaluation failed", details: error.message },
      { status: 500 }
    );
  }
}

function calculateAILiteracy(
  promptQuality,
  debuggingSkill,
  decisionMaking,
  efficiency
) {
  // Weighted scoring
  const weights = {
    promptQuality: 0.3,
    debuggingSkill: 0.25,
    decisionMaking: 0.25,
    efficiency: 0.2,
  };

  return Math.round(
    promptQuality * weights.promptQuality +
      debuggingSkill * weights.debuggingSkill +
      decisionMaking * weights.decisionMaking +
      efficiency * weights.efficiency
  );
}

function analyzeToolUsage(toolsUsed) {
  const usagePattern = {
    totalToolsUsed: toolsUsed.length,
    diversity: new Set(toolsUsed).size,
    pattern: "",
    analysis: "",
  };

  if (toolsUsed.length === 0) {
    usagePattern.pattern = "NO_AI_USAGE";
    usagePattern.analysis = "Candidate did not use AI assistance";
  } else if (toolsUsed.length <= 3) {
    usagePattern.pattern = "FOCUSED_AI_USAGE";
    usagePattern.analysis = "Strategic, targeted use of AI tools";
  } else if (toolsUsed.length <= 6) {
    usagePattern.pattern = "BALANCED_AI_USAGE";
    usagePattern.analysis = "Good mix of tools for different purposes";
  } else {
    usagePattern.pattern = "HEAVY_AI_RELIANCE";
    usagePattern.analysis = "Frequent AI tool usage detected";
  }

  return usagePattern;
}

function generateDefaultTips() {
  return [
    {
      tip: "Ask specific prompts",
      example: "Instead of 'how do I optimize', ask 'how can I optimize database queries for a million-user table'",
    },
    {
      tip: "Always validate AI suggestions",
      example: "Check if the code runs, understand each line, identify limitations",
    },
    {
      tip: "Show your thought process",
      example: "Explain why you accepted or rejected AI suggestions",
    },
  ];
}

function generateFallbackAssistance(question) {
  return Response.json(
    {
      question,
      guidance:
        "Break down the problem step by step. Consider edge cases and performance implications.",
      keyAreas: [
        "Problem understanding",
        "Approach selection",
        "Implementation",
        "Testing",
      ],
      message:
        "Gemini API not available. Use general problem-solving approach.",
    },
    { status: 200 }
  );
}

function generateFallbackEvaluation(candidateResponse, aiToolsUsed, promptQuality) {
  const baseScore = promptQuality || 50;

  return Response.json(
    {
      aiLiteracyScore: baseScore,
      toolsUsed: aiToolsUsed.length,
      verdict:
        baseScore >= 75
          ? "GOOD_AI_USAGE"
          : baseScore >= 50
            ? "ADEQUATE_AI_USAGE"
            : "NEEDS_IMPROVEMENT",
      message: "Gemini API not available. Using basic evaluation.",
    },
    { status: 200 }
  );
}
