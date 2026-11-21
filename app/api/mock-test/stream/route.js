import { randomUUID } from "node:crypto";
import { streamText } from "ai";
import { groq } from "@ai-sdk/groq";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { getCurrentUser } from "@/lib/actions/auth.action";
import {
  acquireMockTestQuestionLoad,
  ActiveInterviewModeError,
  ActiveInterviewRoundError,
  releaseMockTestQuestionLoad,
} from "@/lib/modules/interview-session.service";
import { DIFFICULTY_LEVELS } from "@/lib/mock-test-constants";
import { getCachedData, setCachedData, generateCacheKey } from "@/lib/cache-helpers";
import { FALLBACK_MOCK_TEST_QUESTIONS } from "@/lib/fallback-data";
import { withRateLimit } from "@/lib/rate-limiter";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

function getModel(modelName) {
  if (modelName.startsWith("llama") || modelName.includes("gpt-oss")) {
    return groq(modelName);
  }
  return google(modelName);
}

// Use the verified model ID from the curl check above, with a solid fallback
const FALLBACK_MODELS = process.env.GROQ_API_KEY
  ? ["openai/gpt-oss-120b", "llama-3.3-70b-versatile"]
  : ["gemini-3.5-flash-lite", "gemini-1.5-flash"];
/**
 * Runs a text prompt through Ollama first, then the cloud fallback chain.
 * Yields generated text chunks as soon as each provider produces them.
 */
async function* streamTextWithFallback({ system, prompt, userId = "anonymous", signal }) {
  const OLLAMA_URL = (process.env.OLLAMA_URL || process.env.OLLAMA_URL_2 || "https://audible-nanny-slacks.ngrok-free.dev").trim();
  const MODEL_NAME = process.env.OLLAMA_MODEL || "gemma3:4b";
  const OLLAMA_USERNAME = (process.env.OLLAMA_USERNAME || "").trim();
  const OLLAMA_PASSWORD = process.env.OLLAMA_PASSWORD || "";
  const authHeader = OLLAMA_USERNAME
    ? `Basic ${Buffer.from(`${OLLAMA_USERNAME}:${OLLAMA_PASSWORD}`).toString("base64")}`
    : undefined;
  let emittedText = false;

  // 1. Try local Ollama first
  let timeoutId;
  try {
    const controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), 1200000);
    const abortRequest = () => controller.abort();
    signal?.addEventListener("abort", abortRequest, { once: true });

    const response = await fetch(`${OLLAMA_URL.replace(/\/$/, "")}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
        stream: true,
        options: { temperature: 0.3 },
      }),
      signal: controller.signal,
    });

    if (!response.ok || !response.body) {
      throw new Error(`Ollama HTTP status ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) continue;
        const data = JSON.parse(line);
        const text = data.message?.content || data.response || "";
        if (text) {
          emittedText = true;
          yield text;
        }
      }

      if (done) break;
    }
    if (buffer.trim()) {
      const data = JSON.parse(buffer);
      const text = data.message?.content || data.response || "";
      if (text) {
        emittedText = true;
        yield text;
      }
    }
    if (!emittedText) throw new Error("Ollama returned empty content");
    console.log("✅ Success with Ollama!");
    return;
  } catch (ollamaError) {
    if (signal?.aborted) throw ollamaError;
    if (emittedText) throw ollamaError;
    console.warn(`⚠️ Ollama failed: ${ollamaError.message}. Falling back to cloud...`);
  } finally {
    clearTimeout(timeoutId);
  }

  // 2. Cloud fallback chain (Groq / Gemini)
  let lastError;
  for (const modelName of FALLBACK_MODELS) {
    let modelEmittedText = false;
    try {
      console.log(`🤖 Trying model: ${modelName} with rate limiter...`);
      const response = await withRateLimit(
        async () => streamText({
          model: getModel(modelName),
          system,
          prompt,
          abortSignal: signal,
        }),
        `streamText(${modelName})`,
        userId,
        { model: modelName, prompt }
      );
      for await (const text of response.textStream) {
        if (!text) continue;
        modelEmittedText = true;
        yield text;
      }
      console.log(`✅ Success with model: ${modelName}`);
    } catch (error) {
      if (signal?.aborted) throw error;
      if (modelEmittedText) throw error;
      console.warn(`⚠️ Model ${modelName} failed. Reason: ${error.message}`);
      lastError = error;
      continue;
    }
    return;
  }
  throw lastError || new Error("All fallback models failed.");
}

function getQuestionWords(question) {
  const ignoredWords = new Set([
    "about", "after", "also", "and", "are", "can", "each", "for", "from",
    "given", "how", "into", "its", "may", "that", "the", "their", "then",
    "there", "these", "this", "through", "using", "when", "where", "which",
    "with", "would", "your", "array", "arrays", "element", "elements",
    "integer", "integers", "number", "numbers", "nums", "find", "return",
    "implement", "design", "function", "solution", "question",
  ]);
  return new Set(
    question.toLowerCase().match(/[a-z0-9]+/g)?.filter((word) => word.length > 2 && !ignoredWords.has(word)) || []
  );
}

function isSimilarQuestion(candidate, existingQuestions) {
  const candidateWords = getQuestionWords(candidate);
  if (candidateWords.size === 0) return false;

  return existingQuestions.some((question) => {
    const existingWords = getQuestionWords(question);
    if (existingWords.size === 0) return false;
    let sharedWords = 0;
    for (const word of candidateWords) {
      if (existingWords.has(word)) sharedWords += 1;
    }
    return sharedWords / Math.min(candidateWords.size, existingWords.size) >= 0.65;
  });
}

/** Streams ONE question as plain text. */
async function* generateOneQuestion({ company, role, difficulty, questionType, index, previousQuestions }, userId, signal) {
  const previousQuestionsText = previousQuestions.length
    ? `\nDo not repeat or rephrase any of these questions, and do not test the same core concept or solution approach:\n${previousQuestions.map((previous, previousIndex) => `${previousIndex + 1}. ${previous}`).join("\n")}\n`
    : "";
  const prompt = `
Generate exactly 1 mock interview question (question #${index + 1} in a set) for the position of ${role} at ${company}.

Requirements:
- Difficulty Level: ${difficulty}
- Question Type: ${questionType}
- Choose a different underlying topic, skill, and solution approach from the previous questions.
- Do not create a variation of an earlier question by changing wording, adding constraints, or changing the requested complexity.
${previousQuestionsText}

Return only the interview question text. Do not include a number, label, explanation, or markdown.
`;

  for await (const text of streamTextWithFallback({
    system: "You are an expert technical interviewer. Return only the requested interview question.",
    prompt,
    userId,
    signal,
  })) {
    yield text;
  }
}

/**
 * POST /api/mock-test/stream
 *
 * Streams NDJSON events for question starts, text chunks, and completions.
 *
 * Body: { company, role, difficulty, questionType, count, userId }
 */
export async function POST(req) {
  const body = await req.json();
  const {
    company,
    role = "Software Engineer",
    difficulty = "Medium",
    questionType = "Technical",
    count = 5,
    userId: requestUserId = "anonymous",
    roundId,
    responseType,
    question,
  } = body;
  let userId = requestUserId;
  let questionLoadUserId = null;
  let questionLoadRequestId = null;
  let questionLoadReleasePromise = null;

  if (responseType && !["answer", "tips"].includes(responseType)) {
    return Response.json({ error: "Unsupported response type" }, { status: 400 });
  }

  if (responseType && (typeof question !== "string" || !question.trim())) {
    return Response.json({ error: "A question is required" }, { status: 400 });
  }

  if (!responseType && roundId) {
    let currentUser;
    try {
      currentUser = await getCurrentUser();
    } catch (error) {
      console.error("Could not authenticate mock-test question request:", error);
      return Response.json({ error: "Could not verify the current user" }, { status: 500 });
    }

    if (currentUser?.id && currentUser.id !== "dummy-user-id") {
      questionLoadUserId = currentUser.id;
      userId = currentUser.id;
      questionLoadRequestId = randomUUID();
      try {
        await acquireMockTestQuestionLoad({
          userId: questionLoadUserId,
          roundId,
          requestId: questionLoadRequestId,
        });
      } catch (error) {
        if (
          error instanceof ActiveInterviewModeError ||
          error instanceof ActiveInterviewRoundError
        ) {
          return Response.json(
            { error: error.message, activeMode: error.activeMode, activeRound: error.activeRound },
            { status: 409 }
          );
        }
        console.error("Could not reserve mock-test question loading:", error);
        return Response.json(
          { error: error.message || "Could not reserve mock-test question loading" },
          { status: 500 }
        );
      }
    }
  }

  const releaseQuestionLoad = () => {
    if (!questionLoadUserId || !questionLoadRequestId) return Promise.resolve();
    if (!questionLoadReleasePromise) {
      questionLoadReleasePromise = releaseMockTestQuestionLoad({
        userId: questionLoadUserId,
        requestId: questionLoadRequestId,
      }).catch((error) => {
        console.error("Could not release mock-test question loading:", error);
      });
    }
    return questionLoadReleasePromise;
  };

  const cacheKey = generateCacheKey("mocktest-list-v2", { company, role, difficulty, questionType, count });
  const cached = getCachedData(cacheKey);

  const encoder = new TextEncoder();
  let streamClosed = false;

  const safeEnqueue = (controller, chunk) => {
    if (streamClosed) return;
    try {
      controller.enqueue(chunk);
    } catch (error) {
      if (error?.code !== "ERR_INVALID_STATE") {
        throw error;
      }
      streamClosed = true;
    }
  };

  const safeClose = async (controller) => {
    await releaseQuestionLoad();
    if (streamClosed) return;
    streamClosed = true;
    try {
      controller.close();
    } catch (error) {
      if (error?.code !== "ERR_INVALID_STATE") {
        throw error;
      }
    }
  };

  const stream = new ReadableStream({
    async start(controller) {
      try {
        if (responseType) {
          const responseCacheKey = generateCacheKey(`mocktest-${responseType}`, { question, company, role });
          const cachedResponse = getCachedData(responseCacheKey);
          const prompt = responseType === "answer"
            ? `
Question: "${question}"
Company: ${company}
Role: ${role}
Difficulty: ${difficulty}

Give a clear, structured expected answer or approach (use the STAR method if it's a behavioral question).
Respond in plain text, no markdown headers — just the explanation, 3-6 sentences.
`
            : `
Question: "${question}"
Company: ${company}
Role: ${role}
Difficulty: ${difficulty}

Give exactly 3 short, actionable tips for answering this well in an interview.
Return only the tips, with one tip per line. Do not use numbering, bullets, markdown, or commentary.
`;

          safeEnqueue(controller, encoder.encode(JSON.stringify({
            type: "response_start",
            responseType,
          }) + "\n"));

          let responseText = Array.isArray(cachedResponse)
            ? cachedResponse.join("\n")
            : cachedResponse || "";
          if (cachedResponse) {
            safeEnqueue(controller, encoder.encode(JSON.stringify({
              type: "response_token",
              text: responseText,
            }) + "\n"));
          } else {
            for await (const text of streamTextWithFallback({
              system: responseType === "answer"
                ? "You are an expert interviewer providing model answers to candidates."
                : "You are an expert interview coach. Return exactly three practical tips.",
              prompt,
              userId,
              signal: req.signal,
            })) {
              if (streamClosed) return;
              responseText += text;
              safeEnqueue(controller, encoder.encode(JSON.stringify({
                type: "response_token",
                text,
              }) + "\n"));
            }
          }

          responseText = responseText.trim();
          if (!responseText) throw new Error("Model returned an empty response");

          let value = responseText;
          if (responseType === "tips") {
            value = responseText
              .split(/\r?\n/)
              .map((tip) => tip.replace(/^\s*(?:[-*]|\d+[.)])\s*/, "").trim())
              .filter(Boolean);
            if (value.length !== 3) {
              throw new Error("Model did not return exactly three tips");
            }
          }

          if (!cachedResponse) setCachedData(responseCacheKey, value);
          safeEnqueue(controller, encoder.encode(JSON.stringify({
            type: "response_complete",
            responseType,
            value,
          }) + "\n"));
          safeEnqueue(controller, encoder.encode(JSON.stringify({ type: "done" }) + "\n"));
          await safeClose(controller);
          return;
        }

        if (cached) {
          cached.forEach((question, index) => {
            safeEnqueue(controller, encoder.encode(JSON.stringify({
              type: "question_start",
              index,
              difficulty: question.difficulty,
            }) + "\n"));
            safeEnqueue(controller, encoder.encode(JSON.stringify({
              type: "question_token",
              index,
              text: question.question,
            }) + "\n"));
            safeEnqueue(controller, encoder.encode(JSON.stringify({
              type: "question_complete",
              index,
              question,
            }) + "\n"));
          });
          safeEnqueue(controller, encoder.encode(JSON.stringify({ type: "done" }) + "\n"));
          await safeClose(controller);
          return;
        }

        const questions = [];
        for (let i = 0; i < count; i++) {
          if (streamClosed) return;
          safeEnqueue(controller, encoder.encode(JSON.stringify({
            type: "question_start",
            index: i,
            difficulty,
          }) + "\n"));

          let questionText = "";
          const rejectedQuestions = [];
          let retryCount = 0;
          try {
            while (true) {
              questionText = "";
              const priorQuestions = [
                ...questions.map((item) => item.question),
                ...rejectedQuestions,
              ];
              for await (const text of generateOneQuestion(
                { company, role, difficulty, questionType, index: i, previousQuestions: priorQuestions },
                userId,
                req.signal
              )) {
                if (streamClosed) return;
                questionText += text;
                safeEnqueue(controller, encoder.encode(JSON.stringify({
                  type: "question_token",
                  index: i,
                  text,
                }) + "\n"));
              }
              questionText = questionText.trim();
              if (!questionText) throw new Error("Model returned an empty question");
              if (!isSimilarQuestion(questionText, priorQuestions)) break;

              rejectedQuestions.push(questionText);
              console.warn(`Question ${i + 1} was too similar to an earlier question; regenerating.`);
              safeEnqueue(controller, encoder.encode(JSON.stringify({
                type: "question_reset",
                index: i,
              }) + "\n"));
              if (retryCount >= 2) {
                const fallbackList = FALLBACK_MOCK_TEST_QUESTIONS[questionType]
                  || FALLBACK_MOCK_TEST_QUESTIONS.Technical;
                const uniqueFallback = fallbackList.find((item) =>
                  !isSimilarQuestion(item.question, questions.map((question) => question.question))
                );
                if (!uniqueFallback) throw new Error("Unable to generate a distinct question for this set");
                questionText = uniqueFallback.question;
                safeEnqueue(controller, encoder.encode(JSON.stringify({
                  type: "question_token",
                  index: i,
                  text: questionText,
                }) + "\n"));
                break;
              }
              retryCount += 1;
            }
          } catch (error) {
            if (streamClosed || req.signal.aborted) return;
            if (questionText) throw error;
            console.error(`Question ${i + 1} generation failed, using static fallback:`, error.message);
            const fallbackList = FALLBACK_MOCK_TEST_QUESTIONS[questionType]
              || FALLBACK_MOCK_TEST_QUESTIONS.Technical;
            const fallback = fallbackList.find((item) =>
              !isSimilarQuestion(item.question, questions.map((question) => question.question))
            );
            if (!fallback) throw error;
            questionText = fallback.question;
            safeEnqueue(controller, encoder.encode(JSON.stringify({
              type: "question_token",
              index: i,
              text: questionText,
            }) + "\n"));
          }

          const question = {
            question: questionText,
            difficulty: DIFFICULTY_LEVELS.includes(difficulty) ? difficulty : "Medium",
          };
          questions.push(question);
          safeEnqueue(controller, encoder.encode(JSON.stringify({
            type: "question_complete",
            index: i,
            question,
          }) + "\n"));
        }

        setCachedData(cacheKey, questions);
        safeEnqueue(controller, encoder.encode(JSON.stringify({ type: "done" }) + "\n"));
        await safeClose(controller);
      } catch (error) {
        console.error("Stream error:", error);
        if (streamClosed) return;
        safeEnqueue(
          controller,
          encoder.encode(JSON.stringify({ error: error.message || "Generation failed" }) + "\n")
        );
        await safeClose(controller);
      } finally {
        await releaseQuestionLoad();
      }
    },
    async cancel() {
      streamClosed = true;
      await releaseQuestionLoad();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}