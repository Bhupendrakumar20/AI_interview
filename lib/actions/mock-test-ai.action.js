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

// Evaluate the mock test using Gemini RAG-like rubric matching
export async function evaluateMockTest({ question, code, language, transcript, whiteboardSummary, company, role }) {
  try {
    console.log("Evaluating mock test submission using Gemini...");
    const { object } = await generateObject({
      model: google("gemini-3.5-flash-lite"),
      schema: evaluationSchema,
      system: "You are a senior principal engineer conducting a mock interview evaluation. Be thorough, objective, and provide constructive feedback.",
      prompt: `
        Analyze the candidate's mock interview submission.
        
        Context:
        - Company: ${company}
        - Target Role: ${role}
        - Question: ${question}
        
        Submitted Code (${language}):
        \`\`\`${language}
        ${code}
        \`\`\`
        
        Whiteboard Summary (shapes and text notes drawn):
        "${whiteboardSummary || "No whiteboard drawings submitted."}"
        
        Voice Transcript (candidate's verbal explanation):
        "${transcript || "No voice transcript recorded."}"
        
        Please rate the candidate and return a JSON object with the exact keys:
        - "score" (number, overall score out of 100)
        - "categories" (object with keys: "correctness", "efficiency", "communication", "design" as numbers out of 100)
        - "strengths" (array of 3 strings)
        - "improvements" (array of 3 strings)
        - "analogyFeedback" (string, explaining the concept using a creative real-world analogy)
        - "detailedReview" (string, detailed technical review and suggestions)
      `,
    });

    return { success: true, evaluation: object };
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