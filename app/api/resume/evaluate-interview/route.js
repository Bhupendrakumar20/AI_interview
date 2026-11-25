import { GoogleGenerativeAI } from "@/lib/ai-provider";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { checkGeminiRateLimit } from "@/lib/security/rate-limiters";
import { NextResponse } from "next/server";
import { db } from "@/firebase/admin";

export const maxDuration = 300;

const genAI = new GoogleGenerativeAI(
  process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GROQ_API_KEY
);

export async function POST(request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    const rateLimitCheck = await checkGeminiRateLimit(currentUser.uid);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        {
          error: "Gemini API rate limit exceeded. Please try again later.",
          retryAfter: rateLimitCheck.resetIn,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { answers, parsedResume, focusArea } = body;

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return NextResponse.json({ error: "Answers array is required" }, { status: 400 });
    }

    const OLLAMA_URL = (
      process.env.OLLAMA_URL ||
      process.env.OLLAMA_URL_2 ||
      "https://audible-nanny-slacks.ngrok-free.dev"
    ).trim();
    const MODEL_NAME = process.env.OLLAMA_MODEL || "gemma3:4b";
    const OLLAMA_USERNAME = (process.env.OLLAMA_USERNAME || "").trim();
    const OLLAMA_PASSWORD = process.env.OLLAMA_PASSWORD || "";
    const authHeader = OLLAMA_USERNAME
      ? `Basic ${Buffer.from(`${OLLAMA_USERNAME}:${OLLAMA_PASSWORD}`).toString("base64")}`
      : undefined;

    const prompt = `
      You are a technical interviewer verifying a candidate's resume claims.
      Evaluate their answers to the verification questions and determine if they actually did the projects/work claimed on their resume.

      Focus Area: ${focusArea || "General"}
      Resume context:
      ${JSON.stringify(parsedResume || {})}

      Interview Q&A:
      ${answers.map((a, i) => `Question ${i + 1}: ${a.question}\nAnswer ${i + 1}: ${a.answer}`).join("\n\n")}

      Return ONLY a raw JSON object with this format:
      {
        "trustScore": 85,
        "verdict": "VERIFIED",
        "feedback": "Detailed overall evaluation with key strengths and major gaps.",
        "topicScores": [
          {
            "topic": "Technical Depth",
            "score": 70,
            "reason": "Specific explanation"
          }
        ],
        "answerEvaluations": [
          {
            "question": "The exact question",
            "score": 55,
            "verdict": "WEAK",
            "whatWasGood": "Specific positive points, or 'No meaningful strengths found'.",
            "whyNotGood": "Why the answer was weak: vague claims, missing reasoning, unsupported details, or no measurable impact.",
            "suggestions": ["Add a specific architecture detail.", "Explain a challenge and the decision you made."],
            "improvedAnswer": "A concise example of a stronger answer."
          }
        ],
        "overallSuggestions": ["Actionable improvement 1", "Actionable improvement 2"]
      }

      Requirements:
      - Give every answer a score from 0 to 100.
      - Include topicScores for all relevant categories, such as Technical Depth, Project Ownership, Problem Solving, Communication, Metrics/Impact, and Resume Consistency.
      - Compare each answer against the resume and question.
      - Be specific: identify exactly what evidence is missing and why it weakens credibility.
      - Suggestions must be practical and tied to the candidate's actual answer.
      - Do not treat short answers as good unless they contain enough concrete evidence.
    `;

    const encoder = new TextEncoder();
    const sendEvent = (controller, data) => {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    };
    let sentFeedbackLength = 0;
    const streamPartialFeedback = (streamController, partialText) => {
      const match = partialText.match(/["']?feedback["']?\s*:\s*"((?:\\.|[^"\\])*)/);
      if (!match) return;

      let feedbackText = "";
      try {
        feedbackText = JSON.parse(`"${match[1]}"`);
      } catch {
        feedbackText = match[1].replace(/\\n/g, "\n").replace(/\\"/g, '"');
      }

      if (feedbackText.length > sentFeedbackLength) {
        const newText = feedbackText.slice(sentFeedbackLength);
        sentFeedbackLength = feedbackText.length;
        sendEvent(streamController, { type: "chunk", text: newText });
      }
    };
    const normalizeScore = (score, fallback) => {
      const numericScore = Number(score);
      return Number.isFinite(numericScore)
        ? Math.max(0, Math.min(100, Math.round(numericScore)))
        : fallback;
    };

    return new Response(
      new ReadableStream({
        async start(streamController) {
          let accumulatedText = "";
          let evaluationData = null;

          sendEvent(streamController, { type: "start" });

          try {
            const ollamaController = new AbortController();
            const timeoutId = setTimeout(() => ollamaController.abort(), 240000);

            try {
              const ollamaResponse = await fetch(`${OLLAMA_URL.replace(/\/$/, "")}/api/chat`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  ...(authHeader ? { Authorization: authHeader } : {}),
                },
                body: JSON.stringify({
                  model: MODEL_NAME,
                  messages: [{ role: "user", content: prompt }],
                  stream: true,
                  options: { temperature: 0.3 },
                }),
                signal: ollamaController.signal,
              });

              if (ollamaResponse.ok && ollamaResponse.body) {
                const reader = ollamaResponse.body.getReader();
                const decoder = new TextDecoder();
                let ollamaBuffer = "";

                while (true) {
                  const { value, done } = await reader.read();
                  ollamaBuffer += decoder.decode(value || new Uint8Array(), { stream: !done });
                  const lines = ollamaBuffer.split("\n");
                  ollamaBuffer = lines.pop() || "";

                  for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                      const chunk = JSON.parse(line);
                      const text = chunk.message?.content || "";
                      if (text) {
                        accumulatedText += text;
                        streamPartialFeedback(streamController, accumulatedText);
                      }
                    } catch (parseError) {
                      console.warn("Could not parse Ollama stream chunk:", parseError.message);
                    }
                  }

                  if (done) break;
                }

                const cleaned = accumulatedText.replace(/```(?:json)?/gi, "").trim();
                const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
                try {
                  evaluationData = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);
                } catch {
                  evaluationData = null;
                }
              }
            } finally {
              clearTimeout(timeoutId);
            }
          } catch (ollamaError) {
            const message = ollamaError.name === "AbortError"
              ? "Ollama evaluation timed out after 240 seconds"
              : ollamaError.message;
            console.warn("Ollama evaluation failed, falling back to Gemini:", message);
          }

          if (!evaluationData) {
            const apiKey =
              process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
              process.env.GOOGLE_API_KEY ||
              process.env.GROQ_API_KEY;

            if (!apiKey) {
              sendEvent(streamController, {
                type: "error",
                error: "No API key available for fallback",
              });
              streamController.close();
              return;
            }

            try {
              const model = genAI.getGenerativeModel({ model: "gemini-pro" });
              const result = await model.generateContentStream(prompt);
              accumulatedText = "";

              for await (const chunk of result.stream) {
                const text = chunk.text();
                if (text) {
                  accumulatedText += text;
                  streamPartialFeedback(streamController, accumulatedText);
                }
              }

              const cleaned = accumulatedText.replace(/```(?:json)?/gi, "").trim();
              const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
              try {
                evaluationData = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);
              } catch {
                evaluationData = {
                  trustScore: 75,
                  verdict: "PARTIALLY_VERIFIED",
                  feedback: cleaned || "Resume answers were evaluated successfully.",
                };
              }
            } catch (geminiError) {
              sendEvent(streamController, {
                type: "error",
                error: geminiError.message || "Failed to stream interview evaluation.",
              });
              streamController.close();
              return;
            }
          }

          evaluationData.trustScore = normalizeScore(evaluationData.trustScore, 75);
          evaluationData.feedback = evaluationData.feedback || "The answers were evaluated, but no detailed feedback was returned.";
          evaluationData.topicScores = Array.isArray(evaluationData.topicScores)
            ? evaluationData.topicScores.map((topic) => ({
                topic: topic.topic || "General",
                score: normalizeScore(topic.score, evaluationData.trustScore),
                reason: topic.reason || "No specific rationale was provided.",
              }))
            : [];
          evaluationData.answerEvaluations = Array.isArray(evaluationData.answerEvaluations)
            ? evaluationData.answerEvaluations.map((answerEvaluation, idx) => ({
                question: answerEvaluation.question || answers[idx]?.question || `Question ${idx + 1}`,
                score: normalizeScore(answerEvaluation.score, evaluationData.trustScore),
                verdict: answerEvaluation.verdict || "NEEDS_IMPROVEMENT",
                whatWasGood: answerEvaluation.whatWasGood || "No clear strengths were demonstrated.",
                whyNotGood: answerEvaluation.whyNotGood || "The answer lacked specific evidence and technical depth.",
                suggestions: Array.isArray(answerEvaluation.suggestions)
                  ? answerEvaluation.suggestions
                  : ["Explain one concrete implementation decision.", "Add measurable results or outcomes."],
                improvedAnswer: answerEvaluation.improvedAnswer || "",
              }))
            : answers.map((answer, idx) => ({
                question: answer.question,
                score: normalizeScore(null, evaluationData.trustScore),
                verdict: "NEEDS_IMPROVEMENT",
                whatWasGood: "The answer attempted to address the resume claim.",
                whyNotGood: "The evaluation did not provide enough specific evidence or technical detail.",
                suggestions: [
                  "Describe the implementation architecture and your exact role.",
                  "Include a challenge, decision, and measurable result.",
                ],
                improvedAnswer: "",
              }));
          evaluationData.overallSuggestions = Array.isArray(evaluationData.overallSuggestions)
            ? evaluationData.overallSuggestions
            : [
                "Use concrete project examples instead of generic descriptions.",
                "Explain your responsibilities, technical decisions, challenges, and measurable outcomes.",
              ];

          try {
            await db.collection("users").doc(currentUser.uid).collection("resume_reports").add({
              trustScore: evaluationData.trustScore,
              verdict: evaluationData.verdict,
              feedback: evaluationData.feedback,
              topicScores: evaluationData.topicScores || [],
              answerEvaluations: evaluationData.answerEvaluations || [],
              overallSuggestions: evaluationData.overallSuggestions || [],
              focusArea: focusArea || "General",
              answers,
              createdAt: new Date(),
            });
          } catch (dbError) {
            console.error("Failed to save resume evaluation report:", dbError);
          }

          sendEvent(streamController, {
            type: "done",
            success: true,
            trustScore: evaluationData.trustScore,
            verdict: evaluationData.verdict,
            feedback: evaluationData.feedback,
            topicScores: evaluationData.topicScores || [],
            answerEvaluations: evaluationData.answerEvaluations || [],
            overallSuggestions: evaluationData.overallSuggestions || [],
          });
          streamController.close();
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      }
    );
  } catch (error) {
    console.error("Error during interview evaluation:", error);
    return NextResponse.json(
      { error: "Failed to evaluate interview", details: error.message },
      { status: 500 }
    );
  }
}
