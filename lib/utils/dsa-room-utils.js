// DSA Room Utilities - Scoring, Validation, Timer Sync
'use client';

/**
 * Calculate points based on question difficulty, submission speed, and position
 */
export const calculatePoints = (params) => {
  const {
    difficulty = 'medium', // easy, medium, hard
    submissionTimeMs,      // Time from room start to submission
    timeLimitMs,          // Total time limit in ms
    isFirstToSolve,       // Boolean
  } = params;

  // Base points by difficulty
  const basePoints = {
    easy: 100,
    medium: 150,
    hard: 200,
  };

  const base = basePoints[difficulty] || 100;

  // Speed bonus (0-50 points): faster = more points
  const speedBonus = Math.max(
    0,
    Math.round(50 * (1 - submissionTimeMs / timeLimitMs))
  );

  // First blood bonus
  const firstBlood = isFirstToSolve ? 30 : 0;

  const total = base + speedBonus + firstBlood;

  return {
    base,
    speedBonus,
    firstBlood,
    total,
  };
};

/**
 * Validate submission against time constraints
 */
export const isSubmissionValid = (params) => {
  const {
    submissionTimestamp,
    roomStartTimestamp,
    timeLimitMs,
    roomStatus,
    hasUserAlreadySolvedThis,
  } = params;

  const timeElapsed = submissionTimestamp - roomStartTimestamp;
  const isBeforeTimeLimit = timeElapsed <= timeLimitMs;
  const isRoomActive = roomStatus === 'in-progress';
  const isNotDuplicate = !hasUserAlreadySolvedThis;

  return {
    isValid: isBeforeTimeLimit && isRoomActive && isNotDuplicate,
    isBeforeTimeLimit,
    isRoomActive,
    isNotDuplicate,
    timeElapsed,
  };
};

/**
 * Calculate remaining time with server-client drift correction
 */
export const calculateTimeRemaining = (params) => {
  const {
    serverTimestamp,
    roomStartTimestamp,
    timeLimitMs,
    clientTimestamp,
  } = params;

  const serverElapsed = serverTimestamp - roomStartTimestamp;
  const remaining = timeLimitMs - serverElapsed;

  // Detect client drift
  const drift = clientTimestamp - serverTimestamp;

  return {
    remaining: Math.max(0, remaining),
    serverElapsed,
    drift,
    isDrifted: Math.abs(drift) > 500, // > 500ms = drifted
  };
};

/**
 * Sort leaderboard by points (primary) then by submission time (secondary)
 */
export const sortLeaderboard = (participants) => {
  return [...participants]
    .sort((a, b) => {
      // Primary: points descending
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      // Secondary: earlier submission time wins
      return a.lastSubmissionTime - b.lastSubmissionTime;
    })
    .map((p, idx) => ({ ...p, rank: idx + 1 }));
};

/**
 * Convert milliseconds to readable timer format (MM:SS)
 */
export const formatTime = (ms) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`;
};

/**
 * Determine timer color based on remaining time percentage
 */
export const getTimerColor = (remaining, limit) => {
  const percentage = (remaining / limit) * 100;
  if (percentage > 50) return 'text-green-400'; // Green: 50%+ time left
  if (percentage > 25) return 'text-yellow-400'; // Yellow: 25-50%
  return 'text-red-500'; // Red: < 25%
};

/**
 * Generate unique room code (5 chars)
 */
export const generateRoomCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

/**
 * Validate room code format
 */
export const isValidRoomCode = (code) => {
  return /^[A-Z0-9]{5}$/.test(code);
};

/**
 * Calculate accuracy percentage from test results
 */
export const calculateAccuracy = (testResults) => {
  if (!testResults || testResults.totalTests === 0) return 0;
  return Math.round((testResults.passed / testResults.totalTests) * 100);
};

/**
 * Format execution time (ms) to readable string
 */
export const formatExecutionTime = (ms) => {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

/**
 * Format memory usage (bytes) to readable string
 */
export const formatMemoryUsage = (bytes) => {
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(2)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
};

/**
 * Judge0 language ID mapping
 */
export const JUDGE0_LANGUAGES = {
  python: 71,           // Python 3.8
  javascript: 63,       // JavaScript (Node.js 12.14.0)
  cpp: 54,             // C++ 9.2.0
  java: 62,            // Java 14.0.1
  go: 60,              // Go 1.13.5
  rust: 73,            // Rust 1.40.0
  csharp: 51,          // C# 7.3
  typescript: 74,      // JavaScript (TypeScript)
};

/**
 * Get question difficulty color
 */
export const getDifficultyColor = (difficulty) => {
  const colors = {
    easy: 'text-green-400 bg-green-500/10',
    medium: 'text-yellow-400 bg-yellow-500/10',
    hard: 'text-red-400 bg-red-500/10',
  };
  return colors[difficulty] || 'text-gray-400 bg-gray-500/10';
};

/**
 * Simulate Judge0 execution (for testing)
 */
export const simulateJudge0Execution = (code, testCases) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const passed = Math.floor(Math.random() * testCases.length) + 1;
      resolve({
        status: { id: passed === testCases.length ? 3 : 4, description: 'Accepted' }, // 3=Accepted, 4=Wrong Answer
        executionTime: Math.random() * 500 + 50,
        memory: Math.random() * 50000 + 5000,
        testResults: {
          totalTests: testCases.length,
          passed,
          failed: testCases.length - passed,
          failedTests: [],
        },
      });
    }, 1500);
  });
};

/**
 * Socket.io room namespace
 */
export const DSA_ROOM_NAMESPACE = '/dsa-room';

/**
 * Available voting options
 */
export const VOTING_OPTIONS = {
  TIME_LIMITS: [30, 45, 60], // minutes
  QUESTION_MODES: ['same', 'different'],
};

/**
 * Room status enum
 */
export const ROOM_STATUS = {
  LOBBY: 'lobby',
  VOTING: 'voting',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

/**
 * Participant status enum
 */
export const PARTICIPANT_STATUS = {
  ACTIVE: 'active',
  IDLE: 'idle',
  DISCONNECTED: 'disconnected',
  LEFT: 'left',
};

/**
 * Submission status enum
 */
export const SUBMISSION_STATUS = {
  PENDING: 'pending',
  COMPILING: 'compiling',
  COMPILED: 'compiled',
  EXECUTING: 'executing',
  COMPLETED: 'completed',
  FAILED: 'failed',
};
