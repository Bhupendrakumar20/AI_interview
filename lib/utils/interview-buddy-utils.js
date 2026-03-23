/**
 * Interview Buddy Utilities
 * Helper functions for session management
 */

/**
 * Generate a unique session code
 * Format: IB-XXXXX (5 alphanumeric characters)
 */
export function generateSessionCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "IB-";
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Check if session code has expired
 * Sessions expire after 24 hours
 */
export function isSessionCodeExpired(createdAt) {
  const createdDate = createdAt instanceof Date ? createdAt : new Date(createdAt);
  const expiresAt = new Date(createdDate.getTime() + 24 * 60 * 60 * 1000);
  return new Date() > expiresAt;
}

/**
 * Format duration in minutes to readable string
 */
export function formatDuration(duration) {
  if (duration < 60) {
    return `${duration}m`;
  }
  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

/**
 * Calculate session elapsed time
 */
export function getSessionElapsedTime(startTime, endTime) {
  if (!startTime) return 0;
  const end = endTime ? new Date(endTime) : new Date();
  const start = new Date(startTime);
  return Math.floor((end - start) / 1000 / 60); // in minutes
}

/**
 * Validate persona selection for AI mode
 */
export const VALID_PERSONAS = [
  "hiring-manager",
  "hr-partner",
  "startup-founder",
  "drill-sergeant",
];

export function isValidPersona(persona) {
  return VALID_PERSONAS.includes(persona);
}

/**
 * Validate difficulty level
 */
export const VALID_DIFFICULTIES = ["easy", "medium", "hard"];

export function isValidDifficulty(difficulty) {
  return VALID_DIFFICULTIES.includes(difficulty);
}

/**
 * Validate topics
 */
export const VALID_TOPICS = [
  "DSA",
  "System Design",
  "Behavioral",
  "SQL",
  "OOP",
  "React / JS",
  "HR Round",
  "Leadership",
  "Case Study",
  "Negotiation",
];

export function areValidTopics(topics) {
  return Array.isArray(topics) && topics.every((topic) => VALID_TOPICS.includes(topic));
}

/**
 * Validate session duration (15-90 minutes)
 */
export function isValidDuration(duration) {
  const dur = Number(duration);
  return dur >= 15 && dur <= 90 && dur % 5 === 0;
}

/**
 * Get persona display info
 */
export const PERSONA_INFO = {
  "hiring-manager": {
    emoji: "💼",
    name: "Hiring Manager",
    style: "Technical depth",
  },
  "hr-partner": {
    emoji: "🧑‍💼",
    name: "HR Partner",
    style: "Behavioral focus",
  },
  "startup-founder": {
    emoji: "🚀",
    name: "Startup Founder",
    style: "Culture & vision",
  },
  "drill-sergeant": {
    emoji: "🎖️",
    name: "Drill Sergeant",
    style: "High pressure",
  },
};

export function getPersonaInfo(persona) {
  return PERSONA_INFO[persona] || null;
}

/**
 * Create session feedback object
 */
export function createSessionFeedback({
  clarity = 0,
  technicalAccuracy = 0,
  communication = 0,
  confidence = 0,
  pacing = 0,
  fillerWords = 0,
}) {
  return {
    clarity, // 0-100
    technicalAccuracy, // 0-100
    communication, // 0-100
    confidence, // 0-100
    pacing, // 0-100
    fillerWords, // count
    overallScore: Math.round(
      (clarity + technicalAccuracy + communication + confidence) / 4
    ),
  };
}

/**
 * Validate job description (basic checks)
 */
export function isValidJobDescription(jd) {
  if (!jd) return false;
  const text = typeof jd === "string" ? jd : "";
  return text.trim().length >= 50; // At least 50 characters
}
