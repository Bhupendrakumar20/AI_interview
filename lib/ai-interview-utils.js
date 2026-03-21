// Utilities for AI proctoring, cheating detection, and interview analysis

export const proctoringUtils = {
  // Face detection helpers
  detectMultipleFaces: (faceData) => {
    return (faceData?.detectedFaces?.length ?? 0) > 1;
  },

  // Eye tracking helpers
  calculateLookAwayDuration: (eyeMovements) => {
    let maxConsecutiveLookAway = 0;
    let currentLookAway = 0;

    eyeMovements?.forEach((movement) => {
      if (movement.lookingAway) {
        currentLookAway += movement.duration || 100;
        maxConsecutiveLookAway = Math.max(maxConsecutiveLookAway, currentLookAway);
      } else {
        currentLookAway = 0;
      }
    });

    return maxConsecutiveLookAway;
  },

  // Audio analysis
  detectMultipleVoices: (audioData) => {
    if (!audioData) return false;
    return audioData.voiceCount > 1 || audioData.detectedVoices?.length > 1;
  },

  // Screen activity monitoring
  detectSuspiciousObjects: (objectDetections) => {
    const suspiciousItems = ["phone", "document", "book", "notes", "screen"];
    return objectDetections?.filter((obj) =>
      suspiciousItems.includes(obj.toLowerCase())
    );
  },
};

export const cheatingDetectionUtils = {
  // Typing pattern analysis
  analyzeTypingVariance: (intervals) => {
    if (!intervals || intervals.length < 5) return null;

    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance =
      intervals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      intervals.length;
    const stdDev = Math.sqrt(variance);

    return {
      mean: Math.round(mean),
      standardDeviation: Math.round(stdDev),
      coefficientOfVariation: stdDev / mean,
      isNatural: stdDev / mean > 0.2,
    };
  },

  // Detect copy-paste patterns
  detectCopyPaste: (intervals) => {
    if (!intervals || intervals.length < 3) return false;

    // Sudden shift to very fast typing (< 10ms) indicates paste
    const veryFastTyping = intervals.filter((i) => i < 10).length;
    const slowTyping = intervals.filter((i) => i > 300).length;

    // High amount of very fast combined with some slow = suspicious pattern
    return (
      veryFastTyping > intervals.length * 0.4 ||
      Math.abs(veryFastTyping - slowTyping) > intervals.length * 0.5
    );
  },

  // AI text probability scoring
  calculateAITextProbability: (answer) => {
    let score = 0;

    // Check for formal structure
    if (/^(First|Second|Third|Finally)/m.test(answer)) score += 15;
    if (/^(In conclusion|To conclude|To summarize)/m.test(answer)) score += 15;

    // Check for common AI phrases
    const aiPhrases = [
      "I appreciate the question",
      "This is a great question",
      "From my perspective",
      "It\\'s important to note",
      "Let me explain",
      "Basically",
      "Essentially",
    ];

    aiPhrases.forEach((phrase) => {
      if (answer.includes(phrase)) score += 10;
    });

    // Check for bullet points or numbered lists
    if (/^\s*[\d\-\*]\s/m.test(answer)) score += 10;

    // Check against casual speech
    const casualPhrases = [
      "I think",
      "I believe",
      "In my experience",
      "I actually",
      "honestly",
      "personally",
    ];

    casualPhrases.forEach((phrase) => {
      if (answer.includes(phrase)) score -= 15;
    });

    // Check for contractions (humans use them more)
    const contractions = (answer.match(/\b\w+'d\b|\b\w+'s\b|\b\w+'ll\b/g) || [])
      .length;
    score -= contractions * 5;

    return Math.max(0, Math.min(100, 50 + score));
  },
};

export const interviewUtils = {
  // Extract key skills from resume
  extractSkills: (resume) => {
    // Common tech stack
    const techStack = [
      "javascript",
      "python",
      "java",
      "cpp",
      "html",
      "css",
      "react",
      "node",
      "express",
      "mongodb",
      "sql",
      "aws",
      "docker",
      "kubernetes",
      "git",
      "typescript",
    ];

    const skills = [];

    techStack.forEach((tech) => {
      if (resume.toLowerCase().includes(tech)) {
        skills.push(tech);
      }
    });

    return skills;
  },

  // Identify interview phase based on answers
  determinePhase: (answerCount) => {
    if (answerCount === 0) return "initial";
    if (answerCount < 3) return "technical";
    if (answerCount < 6) return "behavioral";
    return "closing";
  },

  // Calculate depth of answer
  analyzeAnswerDepth: (answer) => {
    const wordCount = answer.split(/\s+/).length;
    const sentenceCount = answer.split(/[.!?]+/).length;
    const uniqueWords = new Set(answer.toLowerCase().split(/\s+/)).size;

    return {
      wordCount,
      sentenceCount,
      uniqueWordCount: uniqueWords,
      averageWordsPerSentence: wordCount / sentenceCount,
      depthScore:
        (wordCount / 50 + uniqueWords / 100) * (sentenceCount / 3) * 10,
    };
  },
};

export const resumeUtils = {
  // Extract quantifiable metrics
  extractMetrics: (resume) => {
    const metricPattern =
      /(?:increased|improved|reduced|optimized|scaled|grew|decreased)\s+([^.]*?)\s+(?:by|to)\s+([\d.]+%|[\d]+x|[\d]+%)/gi;

    const metrics = [];
    let match;

    while ((match = metricPattern.exec(resume)) !== null) {
      metrics.push({
        claim: match[1],
        metric: match[2],
        fullStatement: match[0],
      });
    }

    return metrics;
  },

  // Find potential red flags
  findRedFlags: (resume) => {
    const redFlags = [];

    // Generic language
    if (/^(responsible|worked on|involved in)\s/im.test(resume)) {
      redFlags.push({
        type: "generic_language",
        severity: "low",
        count: (resume.match(/responsible for/gi) || []).length,
      });
    }

    // Inflated metrics
    if (/1000%|100x|[5-9]\d{2}%/i.test(resume)) {
      redFlags.push({
        type: "inflated_metrics",
        severity: "high",
        count: 1,
      });
    }

    // Timeline gaps
    const dateMatches = resume.match(/\d{4}[-\/]\d{2}[-\/]\d{2}/gi);
    if (dateMatches && dateMatches.length < 2) {
      redFlags.push({
        type: "unclear_timeline",
        severity: "medium",
      });
    }

    return redFlags;
  },
};

export const copilotUtils = {
  // Calculate AI Literacy score
  calculateAILiteracy: (metrics) => {
    return Math.round(
      metrics.promptQuality * 0.3 +
        metrics.debuggingSkill * 0.25 +
        metrics.decisionMaking * 0.25 +
        metrics.efficiency * 0.2
    );
  },

  // Categorize AI tool usage
  categorizeToolUsage: (toolsUsed) => {
    const toolCount = toolsUsed.length;
    const uniqueTools = new Set(toolsUsed).size;

    if (toolCount === 0) return "NO_AI_USAGE";
    if (uniqueTools <= 2) return "FOCUSED_AI_USAGE";
    if (uniqueTools <= 4) return "BALANCED_AI_USAGE";
    return "HEAVY_AI_RELIANCE";
  },

  // Validate prompt quality
  validatePromptQuality: (prompt) => {
    let score = 0;

    // Specificity bonus
    if (prompt.length > 50) score += 20;
    if (/\?/.test(prompt)) score += 15;
    if (/how|what|when|where|why/i.test(prompt)) score += 10;

    // Context bonus
    if (/given|with|using|considering/i.test(prompt)) score += 15;

    // Clarity bonus
    if (/\boutput\b|\breturn\b|\bexplain\b/i.test(prompt)) score += 10;

    return Math.min(100, score);
  },
};
