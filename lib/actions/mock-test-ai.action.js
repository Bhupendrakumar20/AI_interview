"use server";

import { generateText, generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";

const GEMINI_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GROQ_API_KEY;

const google = createGoogleGenerativeAI({
  apiKey: GEMINI_API_KEY,
});

// Get a subtle, contextual nudge (hint) from Gemini
export async function getAiNudge({ question, code, language, transcript, company, role }) {
  try {
    const response = await generateText({
      model: google("gemini-3.5-flash-lite"),
      system: "You are an encouraging, elite tech interviewer. Give a single, subtle hint or nudge (1-2 sentences) to help the candidate make progress. Do not give the code solution. Speak to them directly.",
      prompt: `
        Company: ${company}
        Role: ${role}
        Question: ${question}
        Current Language: ${language}
        Current Code:
        \`\`\`${language}
        ${code}
        \`\`\`
        Vocalized thought process so far:
        "${transcript || "Candidate has not vocalized anything yet."}"
        
        Generate a constructive nudge/hint.
      `,
    });

    return { success: true, nudge: response.text };
  } catch (error) {
    console.error("Error generating AI nudge:", error);
    return { success: false, error: error.message };
  }
}

// Evaluation schema for the mock test
const evaluationSchema = z.object({
  score: z.number().describe("Overall score out of 100"),
  categories: z.object({
    correctness: z.number().describe("Score out of 100 for correctness of solution"),
    efficiency: z.number().describe("Score out of 100 for time and space complexity"),
    communication: z.number().describe("Score out of 100 for thought process articulation"),
    design: z.number().describe("Score out of 100 for system architecture/clean design"),
  }),
  strengths: z.array(z.string()).describe("3 key strengths observed"),
  improvements: z.array(z.string()).describe("3 key areas of improvement"),
  analogyFeedback: z.string().describe("Explain the core conceptual mistakes/patterns using a creative real-world analogy (e.g. restaurant workflow for MVC, cooking recipe for algorithms). Omit complex code references in this section."),
  detailedReview: z.string().describe("Comprehensive code/architecture feedback and advice"),
});

const EVALUATION_SYSTEM_PROMPT =
  "You are a senior principal engineer conducting a mock interview evaluation. Be thorough, objective, and provide constructive feedback. Return one JSON object matching the requested schema exactly, without markdown or an enclosing wrapper.";

const OLLAMA_EVALUATION_FORMAT = {
  type: "object",
  properties: {
    score: { type: "number" },
    categories: {
      type: "object",
      properties: {
        correctness: { type: "number" },
        efficiency: { type: "number" },
        communication: { type: "number" },
        design: { type: "number" },
      },
      required: ["correctness", "efficiency", "communication", "design"],
      additionalProperties: false,
    },
    strengths: { type: "array", items: { type: "string" } },
    improvements: { type: "array", items: { type: "string" } },
    analogyFeedback: { type: "string" },
    detailedReview: { type: "string" },
  },
  required: [
    "score",
    "categories",
    "strengths",
    "improvements",
    "analogyFeedback",
    "detailedReview",
  ],
  additionalProperties: false,
};

function getOllamaEndpoint() {
  const configuredUrl = (process.env.OLLAMA_URL || process.env.OLLAMA_URL_2 || "").trim();
  if (!configuredUrl) return null;

  const normalizedUrl = configuredUrl
    .replace(/\/api\/(chat|generate)\/?$/i, "")
    .replace(/\/+$/, "");
  return `${normalizedUrl}/api/chat`;
}

function parseEvaluation(text) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new Error("AI returned an invalid evaluation object");
  }

  const parsed = JSON.parse(cleaned.slice(start, end + 1));
  const directResult = evaluationSchema.safeParse(parsed);
  if (directResult.success) return directResult.data;

  for (const key of ["evaluation", "result", "feedback"]) {
    if (parsed && typeof parsed === "object" && key in parsed) {
      const wrappedResult = evaluationSchema.safeParse(parsed[key]);
      if (wrappedResult.success) return wrappedResult.data;
    }
  }

  throw new Error(`AI returned an invalid evaluation shape: ${directResult.error.message}`);
}

async function evaluateWithOllama({ system, prompt }) {
  const endpoint = getOllamaEndpoint();
  if (!endpoint) throw new Error("Ollama is not configured");

  const username = (process.env.OLLAMA_USERNAME || "").trim();
  const password = process.env.OLLAMA_PASSWORD || "";
  const authorization = username
    ? `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`
    : undefined;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 180000);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authorization ? { Authorization: authorization } : {}),
      },
      body: JSON.stringify({
        model: process.env.OLLAMA_MODEL || "gemma3:4b",
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
        format: OLLAMA_EVALUATION_FORMAT,
        stream: false,
        options: { temperature: 0.2 },
      }),
      signal: controller.signal,
    });

    if (!response.ok) throw new Error(`Ollama HTTP status ${response.status}`);
    const data = await response.json();
    const text = data?.message?.content || data?.response;
    if (!text) throw new Error("Ollama returned empty content");
    return parseEvaluation(text);
  } finally {
    clearTimeout(timeoutId);
  }
}

// Evaluate each mock-test submission with Ollama first and Gemini as a fallback.
export async function evaluateMockTest({
  submissions,
  company,
  role,
}) {
  if (!Array.isArray(submissions) || submissions.length === 0) {
    return { success: false, error: "At least one submitted answer is required." };
  }

  const submittedAnswers = submissions.map((submission) => `
Question ${submission.questionNumber}: ${submission.question}
Difficulty: ${submission.difficulty || "Not specified"}
Written answer:
${submission.answer?.text || "No written answer."}
Code (${submission.answer?.language || "Not specified"}):
\`\`\`${submission.answer?.language || ""}
${submission.answer?.code || ""}
\`\`\`
Voice transcript:
${submission.answer?.transcript || "No voice transcript."}
Whiteboard summary:
${submission.whiteboardSummary || "No whiteboard drawings submitted."}
`).join("\n");

  const prompt = `
Evaluate the candidate's complete mock interview submission across all questions.

Context:
- Company: ${company}
- Target Role: ${role}
Number of questions: ${submissions.length}

Return a JSON object with these exact keys:
{
  "score": 75,
  "categories": {
    "correctness": 75,
    "efficiency": 75,
    "communication": 75,
    "design": 75
  },
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "improvements": ["improvement 1", "improvement 2", "improvement 3"],
  "analogyFeedback": "A concise real-world analogy for the key concept.",
  "detailedReview": "A detailed technical review and suggestions."
}

Assess the candidate across all of the submitted questions, not just one. Scores must reflect the complete interview and be numeric values from 0 to 100. Do not put the fields inside another object.

All submitted questions and answers:
${submittedAnswers}
`;

  try {
    try {
      const evaluation = await evaluateWithOllama({
        system: EVALUATION_SYSTEM_PROMPT,
        prompt,
      });
      return { success: true, evaluation, provider: "Ollama" };
    } catch (ollamaError) {
      console.warn(`Ollama evaluation failed; using Gemini fallback: ${ollamaError.message}`);
    }

    const { object } = await generateObject({
      model: google("gemini-3.5-flash-lite"),
      schema: evaluationSchema,
      system: EVALUATION_SYSTEM_PROMPT,
      prompt,
    });
    return { success: true, evaluation: object, provider: "Gemini" };
  } catch (error) {
    console.error("Error evaluating mock test:", error);
    return { success: false, error: error.message };
  }
}

// Execute code action using self-hosted Piston local server
import { executeCode } from "@/lib/piston-service";
export async function runCodeAction({ sourceCode, language, stdin = "" }) {
  try {
    const result = await executeCode({ sourceCode, language, stdin });
    return result;
  } catch (error) {
    console.error("Error executing code via server action:", error);
    return {
      success: false,
      output: "",
      error: error.message,
    };
  }
}