import { GoogleGenerativeAI } from "@google/generative-ai";
import { withRateLimit } from "@/lib/rate-limiter";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

export async function POST(request) {
  try {
    const {
      answer,
      typingPattern,
      responseLatency,
      previousAnswers = [],
      questionContext,
      sessionId,
      candidateId,
    } = await request.json();

    // Initialize detection signals
    const signals = {
      typingPatternTest: analyzeTypingPattern(typingPattern),
      copyPasteUsage: detectCopyPaste(typingPattern),
      abnormalResponseSpeed: responseLatency > 30000, // 30 seconds is suspicious
      answerSimilarity: detectSimilarity(answer, previousAnswers),
      promptLikeStructure: detectPromptStructure(answer),
      aiTextProbability: 0,
    };

    // Use Gemini to detect AI-generated content
    let aiDetectionScore = 0;
    if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        // Analyze for AI patterns
        const analyzePrompt = `Analyze this answer for AI generation characteristics. Rate on scale 0-100 how likely this is AI-generated:

Answer: "${answer}"

Consider:
1. Vocabulary complexity and patterns
2. Sentence structure formality
3. Lack of personal examples
4. Overly polished format
5. Generic vs specific knowledge

Respond with just a number (0-100).`;

        try {
          const result = await withRateLimit(async () => {
            return await model.generateContent(analyzePrompt);
          }, "aiGenerationDetection", candidateId || sessionId || "anonymous");
          const scoreText = await result.response.text();
          const score = parseInt(scoreText.match(/\d+/)?.[0] || "0");
          aiDetectionScore = Math.min(100, Math.max(0, score));
          signals.aiTextProbability = aiDetectionScore;
        } catch (parseError) {
          console.error("Error parsing AI score:", parseError);
          signals.aiTextProbability = 50; // Default to moderate suspicion
        }
      } catch (error) {
        console.error("Gemini API error:", error);
        // Fallback analysis without Gemini
        signals.aiTextProbability = fallbackAIDetection(answer);
      }
    } else {
      signals.aiTextProbability = fallbackAIDetection(answer);
    }

    // Calculate authenticity score
    const authenticityScore = calculateAuthenticityScore(signals);

    // Generate detailed report
    const report = {
      sessionId,
      candidateId,
      timestamp: new Date().toISOString(),
      authenticityScore,
      signals: {
        typingPattern: signals.typingPatternTest
          ? "✔ Natural"
          : "✗ Suspicious",
        copyPaste: signals.copyPasteUsage ? "✔ Detected" : "✗ Not detected",
        responseSpeed: signals.abnormalResponseSpeed
          ? "✗ Too fast/scripted"
          : "✔ Natural",
        answerSimilarity: signals.answerSimilarity
          ? "✗ Too similar to previous"
          : "✔ Unique",
        promptLike: signals.promptLikeStructure
          ? "✗ Prompt-like structure"
          : "✔ Natural speech",
        aiTextProbability: `${signals.aiTextProbability}%`,
      },
      verdict:
        authenticityScore >= 80
          ? "AUTHENTIC"
          : authenticityScore >= 60
            ? "QUESTIONABLE"
            : "LIKELY_AI_GENERATED",
      riskLevel:
        authenticityScore >= 80
          ? "LOW"
          : authenticityScore >= 60
            ? "MEDIUM"
            : "HIGH",
      recommendation:
        authenticityScore >= 80
          ? "Accept answer"
          : authenticityScore >= 60
            ? "Ask follow-up questions"
            : "Flag for manual review or ask clarifying questions",
    };

    return Response.json(report, { status: 200 });
  } catch (error) {
    console.error("AI detection error:", error);
    return Response.json(
      { error: "Failed to analyze answer", details: error.message },
      { status: 500 }
    );
  }
}

function analyzeTypingPattern(typingPattern) {
  if (!typingPattern) return true;

  // Check for natural typing patterns (variability in speed)
  const { intervals = [] } = typingPattern;

  if (intervals.length < 5) return true; // Not enough data

  // Calculate coefficient of variation
  const average = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const variance =
    intervals.reduce((sum, interval) => sum + Math.pow(interval - average, 2), 0) /
    intervals.length;
  const standardDeviation = Math.sqrt(variance);
  const coefficientOfVariation = standardDeviation / average;

  // Natural typing has high variation (0.3+), AI typing is too uniform (<0.15)
  return coefficientOfVariation > 0.2;
}

function detectCopyPaste(typingPattern) {
  if (!typingPattern) return false;

  // Suddenly high/low or zero intervals could indicate bulk paste
  const { intervals = [] } = typingPattern;

  if (intervals.length < 3) return false;

  // Check for suspiciously large gaps or sudden consistency
  const largeGaps = intervals.filter((i) => i > 500).length; // Gaps > 500ms
  const tinyIntervals = intervals.filter((i) => i < 10).length; // Less than 10ms

  return largeGaps > intervals.length * 0.3 || tinyIntervals > intervals.length * 0.5;
}

function detectSimilarity(answer, previousAnswers) {
  if (!previousAnswers || previousAnswers.length === 0) return false;

  // Simple similarity check using word overlap
  const answerWords = new Set(answer.toLowerCase().split(/\s+/));

  for (const prevAnswer of previousAnswers) {
    const prevWords = new Set(prevAnswer.toLowerCase().split(/\s+/));
    const intersection = [...answerWords].filter((word) => prevWords.has(word));
    const similarity = intersection.length / Math.max(answerWords.size, prevWords.size);

    if (similarity > 0.7) {
      return true; // Too similar to previous answer
    }
  }

  return false;
}

function detectPromptStructure(answer) {
  // Check for AI-like structures
  const aiPatterns = [
    /^(Sure|Of course|Certainly|Absolutely)[,!]?\s*(Here|let|i'll)/i,
    /^(The answer to your question|Regarding your question)/i,
    /^(First|1\.|Firstly),.*?(Second|2\.|Secondly)/s,
    /^(In conclusion|To conclude|Finally,)/im,
    /bullet points?:/i,
    /step-by-step guide:/i,
  ];

  return aiPatterns.some((pattern) => pattern.test(answer));
}

function calculateAuthenticityScore(signals) {
  let score = 100;

  // Deduct based on signals
  if (!signals.typingPatternTest) score -= 15;
  if (signals.copyPasteUsage) score -= 20;
  if (signals.abnormalResponseSpeed) score -= 10;
  if (signals.answerSimilarity) score -= 15;
  if (signals.promptLikeStructure) score -= 20;

  // Significant deduction for high AI probability
  score -= (signals.aiTextProbability / 100) * 40;

  return Math.max(0, Math.min(100, score));
}

function fallbackAIDetection(answer) {
  // Fallback scoring without Gemini
  let score = 50; // Neutral baseline

  const wordCount = answer.split(/\s+/).length;
  const sentenceCount = answer.split(/[.!?]+/).length;
  const avgWordsPerSentence = wordCount / sentenceCount;

  // AI answers tend to have more consistent sentence length
  if (avgWordsPerSentence > 20) score += 10;

  // Check for formal structure
  if (/^(First|Second|Third|Finally)/m.test(answer)) score += 15;

  // Check for common AI phrases
  const aiPhrases = [
    "I appreciate the question",
    "This is a great question",
    "From my perspective",
    "It's important to note",
  ];
  if (aiPhrases.some((phrase) => answer.includes(phrase))) score += 20;

  // Check for personal touch
  if (/I\s+(think|believe|tried|remember|faced)/i.test(answer)) score -= 15;

  // Check for casual language
  if (/\b(yeah|kinda|like|gonna|gotta|y'all)\b/i.test(answer)) score -= 20;

  return Math.min(100, Math.max(0, score));
}
