import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

export async function POST(request) {
  try {
    const { resume, sessionId, candidateId } = await request.json();

    if (!resume) {
      return Response.json({ error: "Resume not provided" }, { status: 400 });
    }

    let extractedClaims = [];
    let verificationQuestions = [];

    // Use Gemini to extract and analyze resume claims
    if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        // Extract claims from resume
        const extractionPrompt = `Extract all technical and professional claims from this resume. Focus on:
1. Project accomplishments (built, implemented, developed)
2. Technical skills and proficiencies
3. Metrics and impact claims
4. Leadership/team work claims

Resume:
${resume}

Return as JSON array with format:
[
  {"claim": "claim text", "type": "technical|metric|leadership|skill", "priority": "high|medium|low"},
  ...
]`;

        const extractionResult = await model.generateContent(extractionPrompt);
        const extractionText = await extractionResult.response.text();

        try {
          const jsonMatch = extractionText.match(/\[[\s\S]*\]/);
          extractedClaims = JSON.parse(jsonMatch ? jsonMatch[0] : "[]");

          // If array is empty, try fallback parsing
          if (extractedClaims.length === 0) {
            extractedClaims = extractClaimsFallback(resume);
          }
        } catch (parseError) {
          console.error("Error parsing claims:", parseError);
          extractedClaims = extractClaimsFallback(resume);
        }

        // Generate verification questions for top claims
        const topClaims = extractedClaims.slice(0, 5); // Top 5 claims

        const questionsPrompt = `Generate verification questions for these resume claims. These questions should require specific knowledge that only someone who actually did the work would know.

Claims:
${topClaims.map((c) => `- ${c.claim} (${c.type})`).join("\n")}

Return as JSON array with format:
[
  {"question": "specific verification question", "claim": "which claim it verifies", "expectedKeywords": ["keyword1", "keyword2"]},
  ...
]`;

        const questionsResult = await model.generateContent(questionsPrompt);
        const questionsText = await questionsResult.response.text();

        try {
          const jsonMatch = questionsText.match(/\[[\s\S]*\]/);
          verificationQuestions = JSON.parse(jsonMatch ? jsonMatch[0] : "[]");

          if (verificationQuestions.length === 0) {
            verificationQuestions = generateFallbackQuestions(topClaims);
          }
        } catch (parseError) {
          verificationQuestions = generateFallbackQuestions(topClaims);
        }
      } catch (error) {
        console.error("Gemini API error during resume analysis:", error);
        extractedClaims = extractClaimsFallback(resume);
        verificationQuestions = generateFallbackQuestions(extractedClaims);
      }
    } else {
      // Fallback when no Gemini API
      extractedClaims = extractClaimsFallback(resume);
      verificationQuestions = generateFallbackQuestions(extractedClaims);
    }

    // Analyze resume for red flags
    const redFlags = analyzeRedFlags(resume, extractedClaims);

    const response = {
      sessionId,
      candidateId,
      timestamp: new Date().toISOString(),
      extractedClaims: extractedClaims.slice(0, 10), // Top 10 claims
      verificationQuestions,
      redFlags,
      trustScore: calculateTrustScore(redFlags),
      summary: {
        totalClaimsExtracted: extractedClaims.length,
        claimsByType: groupClaimsByType(extractedClaims),
        recommendedAction: getRecommendedAction(redFlags),
      },
    };

    return Response.json(response, { status: 200 });
  } catch (error) {
    console.error("Resume verification error:", error);
    return Response.json(
      { error: "Failed to verify resume", details: error.message },
      { status: 500 }
    );
  }
}

function extractClaimsFallback(resume) {
  const claims = [];

  // Pattern matching for common claims
  const patterns = [
    {
      regex: /built|developed|implemented|created|designed\s+([^.,]*)/gi,
      type: "technical",
    },
    {
      regex: /led|managed|mentored|oversaw\s+([^.,]*)/gi,
      type: "leadership",
    },
    {
      regex: /increased|improved|reduced|optimized\s+([^.,]*)\s+by\s+(\d+%?)/gi,
      type: "metric",
    },
    {
      regex: /proficient in|expert in|skilled in\s+([^.,]*)/gi,
      type: "skill",
    },
  ];

  patterns.forEach(({ regex, type }) => {
    let match;
    while ((match = regex.exec(resume)) !== null) {
      claims.push({
        claim: match[0],
        type: type,
        priority: match[2] ? "high" : "medium", // Claims with metrics are high priority
      });
    }
  });

  return claims.slice(0, 10);
}

function generateFallbackQuestions(claims) {
  return claims
    .slice(0, 5)
    .map((claim, index) => ({
      question: generateQuestionFromClaim(claim),
      claim: claim.claim,
      questionNumber: index + 1,
    }));
}

function generateQuestionFromClaim(claim) {
  const claimText = claim.claim || "";

  // Generate context-specific questions
  if (claim.type === "technical") {
    return `You mentioned "${claimText}". Can you explain the architecture and technical decisions you made?`;
  } else if (claim.type === "metric") {
    return `How did you achieve the results mentioned in "${claimText}"? What was your specific contribution?`;
  } else if (claim.type === "leadership") {
    return `Tell me about your experience with "${claimText}". What was your approach and what did you learn?`;
  } else if (claim.type === "skill") {
    return `Describe a real project where you used "${claimText}" and explain what you built.`;
  }

  return `Can you elaborate on your claim: "${claimText}"?`;
}

function analyzeRedFlags(resume, claims) {
  const redFlags = [];

  // Check for generic claims without specifics
  const genericPhrases = [
    /^(responsible|worked on|involved in)\s/i,
    /^(helped|assisted|supported)/i,
  ];

  claims.forEach((claim) => {
    genericPhrases.forEach((phrase) => {
      if (phrase.test(claim.claim)) {
        redFlags.push({
          type: "vague_claim",
          severity: "medium",
          description: `Generic language detected: "${claim.claim}"`,
          recommendation: "Ask for specific contributions",
        });
      }
    });
  });

  // Check for inflated metrics
  if (
    /1000%|100x|increased by [5-9]\d\d%|grew by [5-9]\d\d%/i.test(resume)
  ) {
    redFlags.push({
      type: "inflated_metrics",
      severity: "high",
      description: "Unusually high metrics that seem overstated",
      recommendation: "Verify metrics with specific examples",
    });
  }

  // Check for unrealistic scope
  if (/single-handedly|alone|by myself.*built|developed.*enterprise|system/i.test(resume)) {
    redFlags.push({
      type: "unrealistic_scope",
      severity: "high",
      description: "Claims of unrealistic solo accomplishments",
      recommendation: "Probe about team dynamics and actual contributions",
    });
  }

  // Check for buzzword density
  const buzzwords = [
    /synergy|leverage|paradigm|holistic|blockchain|ai|machine learning|quantum/gi,
  ];
  const buzzwordCount = buzzwords.reduce(
    (count, pattern) => count + (resume.match(pattern) || []).length,
    0
  );

  if (buzzwordCount > 10) {
    redFlags.push({
      type: "buzzword_heavy",
      severity: "medium",
      description: `High density of buzzwords (${buzzwordCount} detected)`,
      recommendation: "Ask for concrete examples and technical specifics",
    });
  }

  // Check for timeline inconsistencies
  if (resumeHasTimelineIssues(resume)) {
    redFlags.push({
      type: "timeline_gap",
      severity: "medium",
      description: "Potential timeline overlaps or gaps detected",
      recommendation: "Clarify employment dates and project timing",
    });
  }

  return redFlags;
}

function resumeHasTimelineIssues(resume) {
  // Simple check for date formats
  const datePattern = /\d{4}[-\/]\d{1,2}|\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}/gi;
  const dates = resume.match(datePattern) || [];

  // If we can't parse dates, we can't verify
  return dates.length < 2;
}

function calculateTrustScore(redFlags) {
  let score = 100;

  redFlags.forEach((flag) => {
    const deduction =
      flag.severity === "high" ? 20 : flag.severity === "medium" ? 10 : 5;
    score -= deduction;
  });

  return Math.max(0, score);
}

function groupClaimsByType(claims) {
  const groups = {};

  claims.forEach((claim) => {
    groups[claim.type] = (groups[claim.type] || 0) + 1;
  });

  return groups;
}

function getRecommendedAction(redFlags) {
  const highSeverity = redFlags.filter((f) => f.severity === "high");

  if (highSeverity.length > 2) {
    return "DETAILED_VERIFICATION_REQUIRED";
  } else if (highSeverity.length > 0) {
    return "FOCUSED_VERIFICATION";
  } else if (redFlags.length > 0) {
    return "STANDARD_VERIFICATION";
  }

  return "PROCEED_WITH_CONFIDENCE";
}
