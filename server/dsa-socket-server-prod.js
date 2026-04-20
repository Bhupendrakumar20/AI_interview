/**
 * DSA Room — Production Socket.io Server
 * ─────────────────────────────────────
 * Full real-time multiplayer coding rooms with:
 *  • Room lifecycle (lobby → voting → active → review → closed)
 *  • Vote aggregation for game config
 *  • Server-authoritative timer (1s broadcasts)
 *  • Piston code execution pipeline (free, no API key)
 *  • Points calculation + First Blood detection
 *  • Real-time leaderboard + code review phase
 */

const { Server } = require("socket.io");
const http = require("http");
const express = require("express");
const axios = require("axios");
const { getMixedProblems, fetchLeetCodeDetails, getRandomProblem } = require("../lib/dsa-question-service");

// ─────────────────────────────────────────────────────────────────────────────
// ERROR HANDLING UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

class AppError extends Error {
  constructor(message, statusCode = 500, code = "INTERNAL_ERROR") {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.timestamp = new Date().toISOString();
  }
}

function validateInput(input, rules) {
  for (const [field, rule] of Object.entries(rules)) {
    const value = input[field];
    if (rule.required && (!value || value.toString().trim() === "")) {
      throw new AppError(`Missing required field: ${field}`, 400, "VALIDATION_ERROR");
    }
    if (rule.type && typeof value !== rule.type && value !== undefined) {
      throw new AppError(`Invalid type for ${field}: expected ${rule.type}`, 400, "VALIDATION_ERROR");
    }
    if (rule.minLength && value?.length < rule.minLength) {
      throw new AppError(`Field ${field} must be at least ${rule.minLength} characters`, 400, "VALIDATION_ERROR");
    }
    if (rule.maxLength && value?.length > rule.maxLength) {
      throw new AppError(`Field ${field} must not exceed ${rule.maxLength} characters`, 400, "VALIDATION_ERROR");
    }
    if (rule.enum && !rule.enum.includes(value)) {
      throw new AppError(`Invalid value for ${field}. Allowed: ${rule.enum.join(", ")}`, 400, "VALIDATION_ERROR");
    }
  }
}

function handleError(error, context = {}) {
  const isAppError = error instanceof AppError;
  const message = isAppError ? error.message : "An unexpected error occurred";
  const code = isAppError ? error.code : "INTERNAL_ERROR";
  const statusCode = isAppError ? error.statusCode : 500;
  
  const logLevel = statusCode >= 500 ? "error" : "warn";
  console[logLevel](`[${context.event || "ERROR"}] ${code} | ${message}`, {
    context,
    stack: error.stack,
    timestamp: new Date().toISOString(),
  });

  return {
    success: false,
    error: message,
    code: code,
    // Don't expose internal details in production
    ...(process.env.NODE_ENV !== "production" && { stack: error.stack }),
  };
}

function executeWithTimeout(promise, timeoutMs, timeoutMessage = "Operation timed out") {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new AppError(timeoutMessage, 408, "TIMEOUT_ERROR")),
        timeoutMs
      )
    ),
  ]);
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const MAX_ROOM_SIZE = 10;
const POINTS = {
  SOLVE_BASE: 100,
  FIRST_BLOOD_BONUS: 50,
  SPEED_BONUS_PER_MINUTE_REMAINING: 2,
};

// Piston API Configuration (free, no API key needed)
const PISTON_API_URL = process.env.PISTON_API_URL || "https://emkc.org/api/v2/piston";
const PISTON_TIMEOUT = 5000; // 5 seconds execution timeout

const PISTON_LANGUAGES = {
  javascript: "javascript",
  python: "python",
  java: "java",
  cpp: "cpp",
  c: "c",
  go: "go",
  rust: "rust",
  csharp: "csharp",
  ruby: "ruby",
  php: "php",
  typescript: "typescript",
};

// ─────────────────────────────────────────────────────────────────────────────
// IN-MEMORY ROOM STORE (use Redis in production)
// ─────────────────────────────────────────────────────────────────────────────

const roomStore = new Map();
const userRoomMap = new Map(); // Track userId -> roomCode (user can only be in ONE room)
const userSocketMap = new Map(); // Track userId -> socket.id for cleanup on disconnect
const sessionMap = new Map(); // Track sessionId -> { userId, socketId, roomCode, createdAt }

function generateRoomCode() {
  return "DSA-" + Math.random().toString(36).substring(2, 7).toUpperCase();
}

function generateSessionId() {
  // Generate unique session ID: SESS-<timestamp>-<random>
  return "SESS-" + Date.now() + "-" + Math.random().toString(36).substring(2, 10);
}

function getRoom(code) {
  return roomStore.get(code);
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

function computeLeaderboard(room) {
  return Object.values(room.users)
    .map((u) => ({
      userId: u.id,
      username: u.username,
      avatar: u.avatar,
      points: u.points,
      solvedAt: u.solvedAt,
      timeTakenSecs: u.solvedAt
        ? Math.floor(
            (u.solvedAt - (room.timerEndsAt - room.config.timeLimitSecs * 1000)) / 1000
          )
        : null,
      status: u.solvedAt ? "solved" : "coding",
      language: u.language,
    }))
    .sort((a, b) => b.points - a.points || (a.solvedAt ?? Infinity) - (b.solvedAt ?? Infinity));
}

function tallyVotes(votes, options) {
  const counts = {};
  options.forEach((o) => (counts[o] = 0));
  Object.values(votes).forEach((v) => {
    if (counts[v] !== undefined) counts[v]++;
  });
  return options.reduce((best, o) => (counts[o] > (counts[best] ?? -1) ? o : best), options[0]);
}

// Mock question fetcher (replace with DB query in production)
async function fetchQuestionFromDB(difficulty = "medium", exclude = []) {
  // ✅ FIXED: Now uses LeetCode GraphQL API instead of hardcoded mock data
  try {
    const mappedDifficulty = difficulty.charAt(0).toUpperCase() + difficulty.slice(1).toLowerCase();
    const problem = await getRandomProblem(mappedDifficulty);
    
    if (!problem) {
      console.error("[Question Service] Failed to fetch LeetCode problem");
      return null;
    }

    // ✅ VALIDATION: Ensure it's a LeetCode question
    if (!problem.id.startsWith('lc_')) {
      console.error("[Question Validation] Non-LeetCode question rejected:", problem.id);
      return null;
    }

    // ✅ Create test cases from LeetCode examples
    const testCases = (problem.examples || []).map((ex, idx) => ({
      stdin: ex.input || "",
      expectedOutput: ex.output || "",
      description: ex.explanation || ""
    })).slice(0, 3); // Limit to 3 test cases for execution

    return {
      id: problem.id, // lc_xxx format
      title: problem.title,
      titleSlug: problem.titleSlug,
      difficulty: problem.difficulty,
      tags: problem.tags || [],
      description: problem.description,
      examples: problem.examples,
      constraints: typeof problem.constraints === 'string' ? problem.constraints.split('\n') : problem.constraints,
      source: "leetcode",
      url: problem.url,
      testCases: testCases,
      hiddenTestCases: testCases, // Use same test cases (would be different in production)
    };
  } catch (error) {
    console.error("[Question Service] Error fetching LeetCode problem:", error.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// JUDGE0 EXECUTION PIPELINE
// ─────────────────────────────────────────────────────────────────────────────

async function executePistonCode(sourceCode, language, stdin) {
  try {
    // ✅ Validation
    if (!sourceCode || sourceCode.trim().length === 0) {
      throw new AppError("Source code is empty", 400, "EMPTY_CODE");
    }

    if (sourceCode.length > 100000) {
      throw new AppError("Source code exceeds maximum size (100KB)", 400, "CODE_TOO_LARGE");
    }

    if (!PISTON_LANGUAGES[language]) {
      throw new AppError(`Unsupported language: ${language}`, 400, "INVALID_LANGUAGE");
    }

    const pistonLanguage = PISTON_LANGUAGES[language] || "javascript";

    const payload = {
      language: pistonLanguage,
      version: "*",
      files: [
        {
          name: `main.${getFileExtension(pistonLanguage)}`,
          content: sourceCode,
        },
      ],
      stdin: stdin || "",
    };

    // ✅ Request with timeout and error handling
    const response = await executeWithTimeout(
      axios.post(`${PISTON_API_URL}/execute`, payload, {
        timeout: PISTON_TIMEOUT,
        headers: { "Content-Type": "application/json" },
      }),
      PISTON_TIMEOUT + 1000,
      "Piston API timeout"
    );

    if (!response.data || !response.data.run) {
      throw new AppError("Invalid response from Piston API", 502, "INVALID_RESPONSE");
    }

    // ✅ Check for runtime errors
    const stderr = response.data?.run?.stderr || "";
    const stdout = response.data?.run?.stdout || "";
    const exitCode = response.data?.run?.exit_code || 0;

    console.log(
      `[Piston] Execution: ${language} | Status: ${
        exitCode === 0 ? "SUCCESS" : "RUNTIME_ERROR"
      }`
    );

    return {
      output: stdout,
      error: stderr,
      success: exitCode === 0 && !stderr,
      exit_code: exitCode,
    };
  } catch (err) {
    const isAppError = err instanceof AppError;
    const message = isAppError ? err.message : err.message || "Code execution failed";

    console.error("[Piston] Error:", {
      message,
      language,
      code: isAppError ? err.code : "EXECUTION_ERROR",
      pistonUrl: PISTON_API_URL,
      timeout: PISTON_TIMEOUT,
    });

    return {
      output: "",
      error: message,
      success: false,
  }
}

function getFileExtension(language) {
  const extensions = {
    python: "py",
    javascript: "js",
    typescript: "ts",
    cpp: "cpp",
    c: "c",
    java: "java",
    go: "go",
    rust: "rs",
    csharp: "cs",
    ruby: "rb",
    php: "php",
  };
  return extensions[language] || "txt";
}

async function runAllTestCases(sourceCode, language, testCases) {
  try {
    if (!testCases || testCases.length === 0) {
      throw new AppError("No test cases provided", 400, "NO_TEST_CASES");
    }

    if (testCases.length > 100) {
      throw new AppError("Too many test cases (max 100)", 400, "TOO_MANY_TESTS");
    }

    const results = await Promise.all(
      testCases.map((tc) => executePistonCode(sourceCode, language, tc.stdin || ""))
    );

    const passed = results.every((r, i) => {
      const actual = (r.output || "").trim();
      const expected = (testCases[i].expectedOutput || "").trim();
      return r.success && actual === expected;
    });

    return {
      passed,
      results: results.map((r, i) => ({
        testCase: i + 1,
        input: testCases[i].stdin || "",
        expectedOutput: testCases[i].expectedOutput || "",
        actualOutput: r.output || "",
        status: r.success && (r.output || "").trim() === (testCases[i].expectedOutput || "").trim() ? "Accepted" : "Failed",
        error: r.error || "",
        exitCode: r.exit_code,
      })),
    };
  } catch (error) {
    console.error("[Test Cases] Error running tests:", error.message);
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TIMER MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

function startRoomTimer(io, room, roomCode) {
  room.timerEndsAt = Date.now() + room.config.timeLimitSecs * 1000;

  room.timerInterval = setInterval(() => {
    const remaining = Math.max(0, Math.ceil((room.timerEndsAt - Date.now()) / 1000));

    io.to(roomCode).emit("timer_tick", { remaining, endsAt: room.timerEndsAt });

    if (remaining <= 0) {
      clearInterval(room.timerInterval);
      endRoom(io, room, roomCode);
    }
  }, 1000);
}

function endRoom(io, room, roomCode) {
  room.status = "review";
  const leaderboard = computeLeaderboard(room);

  const codeReviewData = Object.entries(room.submissions).map(([socketId, subs]) => ({
    user: room.users[socketId],
    submissions: subs.map((s) => ({
      questionId: s.questionId,
      sourceCode: s.sourceCode,
      language: s.language,
      passed: s.passed,
      timeTakenSecs: s.timeTakenSecs,
      testResults: s.testResults,
    })),
  }));

  io.to(roomCode).emit("room_ended", {
    leaderboard,
    codeReview: codeReviewData,
    summary: {
      totalParticipants: Object.keys(room.users).length,
      totalSolved: Object.values(room.users).filter((u) => u.solvedAt).length,
      firstBlood: room.firstBloodClaimedBy ? room.users[room.firstBloodClaimedBy]?.username : null,
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SOCKET HANDLERS
// ─────────────────────────────────────────────────────────────────────────────

function registerSocketHandlers(io) {
  io.on("connection", (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    // ── CREATE ROOM ──────────────────────────────────────────────────────────
    socket.on("room_create", ({ username, avatar, userId }, callback) => {
      try {
        // ✅ Input validation
        validateInput(
          { username, avatar, userId },
          {
            username: { required: true, type: "string", minLength: 1, maxLength: 50 },
            avatar: { required: true, type: "string" },
            userId: { required: true, type: "string", minLength: 1, maxLength: 100 },
          }
        );

        // ✅ Validate userId is provided
        if (!userId.trim()) {
          throw new AppError("User ID is required", 400, "INVALID_USER_ID");
        }

        // ✅ Check if this userId is already in another room
        const existingRoomCode = userRoomMap.get(userId);
        if (existingRoomCode) {
          console.warn(`[Room Create] User (${userId}) already in room ${existingRoomCode}`);
          throw new AppError(
            `Already in room: ${existingRoomCode}. Cannot create or join multiple rooms simultaneously.`,
            409,
            "USER_IN_ANOTHER_ROOM"
          );
        }

        const code = generateRoomCode();
        const sessionId = generateSessionId();

        roomStore.set(code, {
          code,
          hostId: socket.id,
          status: "lobby",
          config: { questionMode: null, timeLimitSecs: null },
          votes: { questionMode: {}, timeLimit: {} },
          users: {},
          questions: {},
          submissions: {},
          timerInterval: null,
          timerEndsAt: null,
          firstBloodClaimedBy: null,
          leaderboard: [],
        });

        socket.join(code);
        const room = getRoom(code);
        if (!room) {
          throw new AppError("Failed to create room", 500, "ROOM_CREATION_FAILED");
        }

        room.users[socket.id] = {
          id: socket.id,
          userId: userId,
          sessionId: sessionId,
          username: username.trim(),
          avatar,
          solvedAt: null,
          points: 0,
          language: "javascript",
        };
        socket.data.roomCode = code;
        socket.data.userId = userId;
        socket.data.sessionId = sessionId;
        userRoomMap.set(userId, code);
        userSocketMap.set(userId, socket.id);
        sessionMap.set(sessionId, {
          userId,
          socketId: socket.id,
          roomCode: code,
          createdAt: Date.now(),
        });

        callback({
          success: true,
          roomCode: code,
          sessionId: sessionId,
        });
        console.log(
          `[Room Create] ✅ Created: ${code} by ${username} (userId: ${userId}, sessionId: ${sessionId})`
        );
      } catch (error) {
        const response = handleError(error, { event: "room_create", userId });
        callback?.(response);
      }
    });
    });

    // ── JOIN ROOM ────────────────────────────────────────────────────────────
    socket.on("room_join", ({ roomCode, username, avatar, userId }, callback) => {
      try {
        // ✅ Input validation
        validateInput(
          { roomCode, username, avatar, userId },
          {
            roomCode: { required: true, type: "string", minLength: 1, maxLength: 20 },
            username: { required: true, type: "string", minLength: 1, maxLength: 50 },
            avatar: { required: true, type: "string" },
            userId: { required: true, type: "string", minLength: 1, maxLength: 100 },
          }
        );

        const room = getRoom(roomCode);
        if (!room) {
          throw new AppError("Room not found", 404, "ROOM_NOT_FOUND");
        }

        if (room.status !== "lobby") {
          throw new AppError("Room has already started", 409, "ROOM_ALREADY_STARTED");
        }

        if (Object.keys(room.users).length >= MAX_ROOM_SIZE) {
          throw new AppError(`Room is full (max ${MAX_ROOM_SIZE} players)`, 409, "ROOM_FULL");
        }

        console.log(`[Join Attempt] username=${username}, userId=${userId}, roomCode=${roomCode}`);

        // ✅ Validation Priority 1: Check by userId
        if (userId) {
          const existingRoomCode = userRoomMap.get(userId);
          if (existingRoomCode && existingRoomCode !== roomCode) {
            console.warn(`[Block] ${username} already in room ${existingRoomCode}`);
            throw new AppError(
              `Already in room: ${existingRoomCode}. Cannot be in multiple rooms. Leave first.`,
              409,
              "USER_IN_ANOTHER_ROOM"
            );
          }

          const userAlreadyInRoom = Object.values(room.users).some((u) => u.userId === userId);
          if (userAlreadyInRoom) {
            console.warn(`[Block] ${username} (${userId}) already in this room`);
            throw new AppError(
              "This account is already joined in this room from another device.",
              409,
              "USER_DUPLICATE_IN_ROOM"
            );
          }
        }

        // ✅ Validation Priority 2: Check by username as fallback
        const userByUsername = Object.values(room.users).find((u) => u.username === username);
        if (userByUsername) {
          console.warn(`[Block] Username ${username} already in room, disconnecting old socket`);
          const oldSocket = io.sockets.sockets.get(userByUsername.id);
          if (oldSocket) {
            console.log(`[Force-Disconnect] Disconnecting ${userByUsername.id} for duplicate ${username}`);
            oldSocket.emit("duplicate_join_detected", {
              message: "Your account was logged in from another device.",
            });
            oldSocket.disconnect(true);
          }
          delete room.users[userByUsername.id];
          delete room.votes.questionMode[userByUsername.id];
          delete room.votes.timeLimit[userByUsername.id];
        }

        const sessionId = generateSessionId();

        socket.join(roomCode);
        room.users[socket.id] = {
          id: socket.id,
          userId: userId,
          sessionId: sessionId,
          username: username.trim(),
          avatar,
          solvedAt: null,
          points: 0,
          language: "javascript",
        };
        socket.data.roomCode = roomCode;
        socket.data.userId = userId;
        socket.data.sessionId = sessionId;
        userRoomMap.set(userId, roomCode);
        userSocketMap.set(userId, socket.id);
        sessionMap.set(sessionId, {
          userId,
          socketId: socket.id,
          roomCode: roomCode,
          createdAt: Date.now(),
        });

        callback({
          success: true,
          sessionId: sessionId,
          lobbyState: {
            roomCode,
            hostId: room.hostId,
            users: Object.values(room.users),
            status: room.status,
          },
        });

        socket.to(roomCode).emit("lobby_update", { users: Object.values(room.users) });
        console.log(`[Join] ✅ ${username} joined ${roomCode} (userId: ${userId})`);
      } catch (error) {
        const response = handleError(error, { event: "room_join", roomCode: roomCode });
        callback?.(response);
      }
    });
    });

    // ── CAST VOTE ────────────────────────────────────────────────────────────
    socket.on("cast_vote", ({ type, value }, callback) => {
      try {
        const room = getRoom(socket.data.roomCode);
        if (!room) {
          throw new AppError("Room not found", 404, "ROOM_NOT_FOUND");
        }

        if (room.status !== "lobby") {
          throw new AppError("Cannot vote after room has started", 409, "ROOM_NOT_IN_LOBBY");
        }

        validateInput(
          { type, value },
          {
            type: { required: true, type: "string", enum: ["questionMode", "timeLimit"] },
            value: { required: true },
          }
        );

        if (type === "questionMode") {
          room.votes.questionMode[socket.id] = value;
        } else if (type === "timeLimit") {
          room.votes.timeLimit[socket.id] = value;
        }

        io.to(socket.data.roomCode).emit("vote_update", {
          questionModeVotes: room.votes.questionMode,
          timeLimitVotes: room.votes.timeLimit,
          totalUsers: Object.keys(room.users).length,
        });

        callback?.({ success: true });
      } catch (error) {
        const response = handleError(error, { event: "cast_vote" });
        callback?.(response);
      }
    });

    // ── GET QUESTION LIST (LeetCode ONLY via GraphQL API) ──────────────────
    socket.on("get_question_list", async ({ difficulty = "Medium" }, callback) => {
      try {
        // ✅ Input validation
        validateInput(
          { difficulty },
          {
            difficulty: {
              required: true,
              type: "string",
              enum: ["Easy", "Medium", "Hard"],
            },
          }
        );

        console.log(`[Questions] Fetching ${difficulty} problems from LeetCode...`);

        // ✅ Fetch with timeout
        const problems = await executeWithTimeout(
          getMixedProblems(difficulty, 5),
          15000,
          "Question fetch from LeetCode timed out"
        );

        if (!problems || problems.length === 0) {
          console.warn("[Questions] LeetCode API returned no results");
          throw new AppError(
            "No problems available. LeetCode API may be unavailable.",
            503,
            "NO_PROBLEMS_AVAILABLE"
          );
        }

        // ✅ Validate all are LeetCode questions
        const leetcodeQuestions = problems
          .map((p) => {
            if (!p.id || !p.id.startsWith("lc_")) {
              console.warn("[Questions] Non-LeetCode question detected:", p.id);
              return null;
            }
            return {
              id: p.id,
              title: p.title,
              difficulty: p.difficulty,
              source: "leetcode",
              tags: p.tags || [],
              acRate: p.acRate,
              url: p.url,
            };
          })
          .filter((q) => q !== null);

        if (leetcodeQuestions.length === 0) {
          throw new AppError(
            "Question validation failed",
            502,
            "VALIDATION_ERROR"
          );
        }

        callback?.({
          success: true,
          questions: leetcodeQuestions,
          count: leetcodeQuestions.length,
        });

        console.log(
          `[Questions] ✅ Sent ${leetcodeQuestions.length} verified LeetCode problems`
        );
      } catch (error) {
        const response = handleError(error, { event: "get_question_list" });
        callback?.(response);
      }
    });
            titleSlug: p.titleSlug,  // For fetching full details
            url: p.url,  // Official LeetCode URL
            acRate: p.acRate,
          };
        }).filter(q => q !== null);

        if (leetcodeQuestions.length === 0) {
          console.error("[LeetCode Questions] All questions failed validation");
          return callback?.({
            success: false,
            error: "LeetCode questions validation failed.",
            questions: [],
          });
        }

        callback?.({
          success: true,
          questions: leetcodeQuestions,
        });
        console.log(`[LeetCode Questions] ✅ Successfully sent ${leetcodeQuestions.length} verified LeetCode problems`);
      } catch (error) {
        console.error("[LeetCode Questions] Error fetching from LeetCode API:", error.message);
        callback?.({
          success: false,
          error: "Failed to connect to LeetCode API. LeetCode GraphQL service may be unavailable.",
          questions: [],
        });
      }
    });

    // ── GET QUESTION DETAILS (Full problem with description & test cases) ────
    socket.on("get_question_details", async ({ questionId, titleSlug }, callback) => {
      try {
        // ✅ Input validation
        validateInput(
          { questionId, titleSlug },
          {
            questionId: { required: true, type: "string", minLength: 1 },
            titleSlug: { required: true, type: "string", minLength: 1 },
          }
        );

        // ✅ STRICT LEETCODE-ONLY VALIDATION
        if (!questionId.startsWith("lc_")) {
          throw new AppError(
            "Only LeetCode problems are supported",
            400,
            "NON_LEETCODE_QUESTION"
          );
        }

        console.log(`[Question Details] Fetching from LeetCode: ${titleSlug}`);

        // ✅ Fetch with timeout
        const details = await executeWithTimeout(
          fetchLeetCodeDetails(titleSlug),
          15000,
          "Question details fetch timed out"
        );

        if (!details) {
          throw new AppError(
            "Failed to fetch question details from LeetCode",
            502,
            "FETCH_FAILED"
          );
        }

        // ✅ Validate it's LeetCode
        if (details.source !== "leetcode") {
          throw new AppError(
            "Security error: non-LeetCode content received",
            400,
            "INVALID_SOURCE"
          );
        }

        callback?.({
          success: true,
          question: {
            id: details.id,
            title: details.title,
            titleSlug: details.titleSlug,
            difficulty: details.difficulty,
            description: details.description,
            tags: details.tags || [],
            examples: details.examples || [],
            testCases: details.testCases || [],
            url: details.url,
            source: "leetcode",
            constraints: details.constraints || [],
          },
        });

        console.log(
          `[Question Details] ✅ Sent: "${details.title}" from LeetCode`
        );
      } catch (error) {
        const response = handleError(error, { event: "get_question_details" });
        callback?.(response);
      }
    });
        
        // FETCH FROM LEETCODE GRAPHQL API ONLY
        const details = await fetchLeetCodeDetails(titleSlug);

        if (!details) {
          console.error("[LeetCode Details] LeetCode API returned null:", titleSlug);
          return callback?.({
            success: false,
            error: "LeetCode API failed. The problem may not exist or the API is temporarily unavailable.",
          });
        }

        // VALIDATE Response source is LeetCode
        if (details.source !== "leetcode") {
          console.error("[LeetCode Details] VALIDATION FAILED: Source is not LeetCode:", details.source);
          return callback?.({
            success: false,
            error: "SECURITY ERROR: Received non-LeetCode content. Only LeetCode is allowed.",
          });
        }

        // RETURN LEETCODE DATA ONLY
        callback?.({
          success: true,
          question: {
            id: details.id,
            title: details.title,  // LeetCode title from GraphQL ONLY
            titleSlug: details.titleSlug,
            difficulty: details.difficulty,
            description: details.description,  // LeetCode description from GraphQL ONLY
            tags: details.tags || [],
            examples: details.examples || [],
            testCases: details.testCases || [],
            url: details.url,
            source: "leetcode",
          },
        });
        console.log(`[LeetCode Details] Successfully sent LeetCode problem: "${details.title}" with full description and test cases`);
      } catch (error) {
        console.error("[LeetCode Details] Error fetching from LeetCode API:", error.message);
        callback?.({
          success: false,
          error: "LeetCode API connection error. Please try another problem or check internet connectivity.",
        });
      }
    });

    // ── START ROOM (Host only) ───────────────────────────────────────────────
    socket.on("room_start", async (_, callback) => {
      try {
        const room = getRoom(socket.data.roomCode);
        if (!room) {
          throw new AppError("Room not found", 404, "ROOM_NOT_FOUND");
        }

        if (room.hostId !== socket.id) {
          const hostUser = room.users[room.hostId];
          const callerUser = room.users[socket.id];
          throw new AppError(
            `Only the host can start the room`,
            403,
            "NOT_AUTHORIZED"
          );
        }

        if (Object.keys(room.users).length < 2) {
          throw new AppError(
            `Need at least 2 players to start (current: ${Object.keys(room.users).length})`,
            409,
            "NOT_ENOUGH_PLAYERS"
          );
        }

        // ✅ Tally votes to determine game config
        const questionMode = tallyVotes(room.votes.questionMode, ["same", "different"]) || "same";
        const timeLimitSecs =
          parseInt(tallyVotes(room.votes.timeLimit, ["300", "600", "900"]) || "300", 10) || 300;

        if (!questionMode || !timeLimitSecs) {
          throw new AppError("Failed to determine game configuration from votes", 500, "CONFIG_ERROR");
        }

        room.status = "active";
        room.config.questionMode = questionMode;
        room.config.timeLimitSecs = timeLimitSecs;

        console.log(
          `\n🎮 [Room Start] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
        );
        console.log(`   Room: ${socket.data.roomCode}`);
        console.log(`   Host: ${room.users[socket.id].username}`);
        console.log(`   Players: ${Object.keys(room.users).length}`);
        console.log(
          `   Config: ${questionMode} questions, ${timeLimitSecs}s timer`
        );
        console.log(
          `   ${Object.values(room.users).map((u) => `• ${u.username}`).join("\n   ")}`
        );
        console.log(
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
        );

        // ✅ FIXED: Assign LeetCode questions to each player with timeout
        let sharedQuestion = null;
        if (questionMode === "same") {
          console.log("[Room Start] Fetching shared LeetCode question...");
          try {
            sharedQuestion = await executeWithTimeout(
              fetchQuestionFromDB("medium"),
              10000,
              "Question fetch took too long"
            );
            if (!sharedQuestion) {
              throw new AppError(
                "Failed to load LeetCode questions",
                502,
                "FETCH_QUESTION_FAILED"
              );
            }
          } catch (err) {
            throw new AppError(
              `Failed to fetch question: ${err.message}`,
              502,
              "FETCH_ERROR"
            );
          }
        }

        const assignedQuestions = {};
        const userIds = Object.keys(room.users);

        for (const socketId of userIds) {
          try {
            let q;
            if (questionMode === "same") {
              q = sharedQuestion;
            } else {
              // Fetch different question for each player
              try {
                q = await executeWithTimeout(
                  fetchQuestionFromDB("medium"),
                  10000,
                  "Question fetch timeout"
                );
              } catch (err) {
                console.warn(
                  `[Room Start] Failed to fetch unique question for ${socketId}, using fallback`
                );
                q = sharedQuestion || (await executeWithTimeout(
                  fetchQuestionFromDB("medium"),
                  10000
                ));
              }

              if (!q) {
                throw new AppError("No fallback question available", 502, "NO_FALLBACK");
              }
            }

            room.questions[socketId] = q;
            assignedQuestions[socketId] = {
              id: q.id,
              title: q.title,
              titleSlug: q.titleSlug,
              difficulty: q.difficulty,
              description: q.description,
              examples: q.examples,
              tags: q.tags,
              constraints: q.constraints,
              source: q.source,
              url: q.url,
            };
          } catch (err) {
            throw new AppError(
              `Failed to assign question to player: ${err.message}`,
              500,
              "QUESTION_ASSIGN_ERROR"
            );
          }
        }

        // ✅ Initialize leaderboard with all participants
        const initialLeaderboard = userIds.map((socketId, idx) => ({
          rank: idx + 1,
          socketId: socketId,
          userId: room.users[socketId].userId,
          username: room.users[socketId].username,
          avatar: room.users[socketId].avatar,
          points: 0,
          solvedAt: null,
          lastProblemSolved: null,
        }));
        room.leaderboard = initialLeaderboard;

        // ✅ Broadcast start event to all players
        const endsAt = Date.now() + timeLimitSecs * 1000;
        console.log(
          `[Room Start] Broadcasting room_started to all sockets in room ${socket.data.roomCode}`
        );
        console.log(
          `[Room Start] Room has ${Object.keys(room.users).length} users:`,
          Object.values(room.users)
            .map((u) => u.username)
            .join(", ")
        );

        // Broadcast to room using socket.io rooms
        io.to(socket.data.roomCode).emit("room_started", {
          config: room.config,
          endsAt: endsAt,
          questionsCount: Object.keys(assignedQuestions).length,
        });

        // Send individual room_started to each player as backup
        for (const socketId of userIds) {
          const targetSocket = io.sockets.sockets.get(socketId);
          if (targetSocket) {
            const userName = room.users[socketId].username;
            console.log(`[Room Start]   → Sending to ${userName} (${socketId})`);
            targetSocket.emit("room_started", {
              config: room.config,
              endsAt: endsAt,
              leaderboard: initialLeaderboard,
            });
          } else {
            console.warn(`[Room Start]   ⚠️ Socket ${socketId} not found!`);
          }
        }

        // Send individual questions to each player
        for (const [socketId, q] of Object.entries(assignedQuestions)) {
          const targetSocket = io.sockets.sockets.get(socketId);
          if (targetSocket) {
            const userName = room.users[socketId].username;
            console.log(
              `[Room] Sending question to ${userName}: "${q.title}" (${q.id})`
            );
            targetSocket.emit("question_assigned", { question: q });
          } else {
            console.warn(
              `[Room] ⚠️ Socket ${socketId} not found when assigning question`
            );
          }
        }

        // ✅ FIXED: Initialize and start timer
        startRoomTimer(io, room, socket.data.roomCode);

        // ✅ Return success immediately so client knows game started
        callback?.({ success: true, endsAt });
        console.log(
          `[Room] ✅ Started: ${socket.data.roomCode} | ${Object.keys(room.users).length} players | ${timeLimitSecs}s timer`
        );
      } catch (error) {
        const response = handleError(error, {
          event: "room_start",
          roomCode: socket.data.roomCode,
        });
        callback?.(response);
      }
    });
        leaderboard: initialLeaderboard,
      });

      // EXTRA SAFETY: Also send directly to each socket to ensure delivery
      console.log(`[Room Start] Sending room_started to each socket individually...`);
      for (const socketId of Object.keys(room.users)) {
        const targetSocket = io.sockets.sockets.get(socketId);
        if (targetSocket) {
          const userName = room.users[socketId].username;
          console.log(`[Room Start]   → Sending to ${userName} (${socketId})`);
          targetSocket.emit("room_started", {
            config: room.config,
            endsAt: endsAt,
            leaderboard: initialLeaderboard,
          });
        } else {
          console.warn(`[Room Start]   ⚠️ Socket ${socketId} not found!`);
        }
      }


      // Send individual questions to each player
      for (const [socketId, q] of Object.entries(assignedQuestions)) {
        const targetSocket = io.sockets.sockets.get(socketId);
        if (targetSocket) {
          const userName = room.users[socketId].username;
          console.log(`[Room] Sending question to ${userName}: "${q.title}" (${q.id})`);
          targetSocket.emit("question_assigned", { question: q });
        } else {
          console.warn(`[Room] ⚠️ Socket ${socketId} not found when assigning question`);
        }
      }

      // ✅ FIXED: Initialize and start timer
      startRoomTimer(io, room, socket.data.roomCode);
      
      // ✅ Return success immediately so client knows game started
      callback?.({ success: true, endsAt });
      console.log(`[Room] ✅ Started: ${socket.data.roomCode} | ${Object.keys(room.users).length} players | ${timeLimitSecs}s timer`);
    });

    // ── SET LANGUAGE ─────────────────────────────────────────────────────────
    socket.on("set_language", ({ language }, callback) => {
      try {
        const room = getRoom(socket.data.roomCode);
        if (!room) {
          throw new AppError("Room not found", 404, "ROOM_NOT_FOUND");
        }

        if (!room.users[socket.id]) {
          throw new AppError("User not in room", 400, "USER_NOT_IN_ROOM");
        }

        validateInput(
          { language },
          {
            language: {
              required: true,
              type: "string",
              enum: Object.keys(PISTON_LANGUAGES),
            },
          }
        );

        room.users[socket.id].language = language;
        callback?.({ success: true });
      } catch (error) {
        const response = handleError(error, { event: "set_language" });
        callback?.(response);
      }
    });

    // ── CODE SUBMIT ──────────────────────────────────────────────────────────
    socket.on("code_submit", async ({ sourceCode, language, questionId }, callback) => {
      try {
        const roomCode = socket.data.roomCode;
        const room = getRoom(roomCode);

        // ✅ Comprehensive validation
        if (!room) {
          throw new AppError("Room not found", 404, "ROOM_NOT_FOUND");
        }

        if (room.status !== "active") {
          throw new AppError("Room is not active", 409, "ROOM_NOT_ACTIVE");
        }

        const user = room.users[socket.id];
        if (!user) {
          throw new AppError("User not in room", 400, "USER_NOT_IN_ROOM");
        }

        if (user.solvedAt) {
          throw new AppError(
            "You already solved this problem!",
            409,
            "ALREADY_SOLVED"
          );
        }

        // ✅ Input validation
        validateInput(
          { sourceCode, language, questionId },
          {
            sourceCode: { required: true, type: "string", minLength: 1, maxLength: 100000 },
            language: { required: true, type: "string", enum: Object.keys(PISTON_LANGUAGES) },
            questionId: { required: true, type: "string", minLength: 1 },
          }
        );

        if (sourceCode.trim().length === 0) {
          throw new AppError("Code cannot be empty", 400, "EMPTY_CODE");
        }

        const question = room.questions[socket.id];
        if (!question) {
          throw new AppError(
            "No question assigned to you",
            400,
            "NO_QUESTION_ASSIGNED"
          );
        }

        // ✅ Validate time hasn't expired
        if (Date.now() > room.timerEndsAt) {
          throw new AppError("Time limit exceeded!", 410, "TIME_LIMIT_EXCEEDED");
        }

        console.log(
          `[Code Submit] ${roomCode} | Player: ${user.username} | Question: ${questionId}`
        );

        // ✅ Notify others that this user is being judged
        io.to(roomCode).emit("user_judging", {
          socketId: socket.id,
          userId: user.userId,
          username: user.username,
          questionTitle: question.title,
        });

        try {
          console.log(
            `[Code Submit] Running tests for ${user.username} on "${question.title}"...`
          );

          // ✅ Use the test cases from the question with timeout
          const testCases = question.hiddenTestCases || question.testCases || [];
          if (testCases.length === 0) {
            throw new AppError(
              "No test cases available for this problem",
              502,
              "NO_TEST_CASES"
            );
          }

          // ✅ Execute with timeout (30 seconds for code execution)
          const { passed, results } = await executeWithTimeout(
            runAllTestCases(sourceCode, language, testCases),
            30000,
            "Code execution timed out (exceeded 30 seconds)"
          );

          // ✅ Store submission for review phase
          if (!room.submissions[socket.id]) {
            room.submissions[socket.id] = [];
          }

          const timeTakenSecs = Math.floor(
            (Date.now() - (room.timerEndsAt - room.config.timeLimitSecs * 1000)) / 1000
          );
          room.submissions[socket.id].push({
            questionId: question.id,
            questionTitle: question.title,
            sourceCode,
            language,
            passed,
            timeTakenSecs,
            submittedAt: Date.now(),
            testResults: results,
          });

          if (passed) {
            console.log(
              `[Code Submit] ✅ ACCEPTED! ${user.username} solved "${question.title}"`
            );

            // ✅ Calculate points
            const secondsRemaining = Math.max(0, (room.timerEndsAt - Date.now()) / 1000);
            const minutesRemaining = Math.floor(secondsRemaining / 60);
            let points =
              POINTS.SOLVE_BASE + minutesRemaining * POINTS.SPEED_BONUS_PER_MINUTE_REMAINING;
            let isFirstBlood = false;

            // Check for first blood
            if (!room.firstBloodClaimedBy) {
              room.firstBloodClaimedBy = socket.id;
              points += POINTS.FIRST_BLOOD_BONUS;
              isFirstBlood = true;
              console.log(
                `[First Blood] ${user.username} claimed first blood! +${POINTS.FIRST_BLOOD_BONUS} bonus`
              );
            }

            // ✅ Update user stats
            user.solvedAt = Date.now();
            user.points = points;
            user.language = language;
            user.lastProblemSolved = question.title;

            // ✅ Update leaderboard
            const leaderboard = computeLeaderboard(room);
            room.leaderboard = leaderboard;

            // ✅ Send success response to submitter
            callback?.({
              success: true,
              passed: true,
              points,
              isFirstBlood,
              message: isFirstBlood
                ? `🎯 First Blood! +${points} points!`
                : `✅ Accepted! +${points} points`,
              testResults: results,
            });

            // ✅ Broadcast leaderboard update to all players
            io.to(roomCode).emit("leaderboard_update", {
              leaderboard,
              event: {
                type: isFirstBlood ? "first_blood" : "solve",
                socketId: socket.id,
                userId: user.userId,
                username: user.username,
                questionTitle: question.title,
                points,
                isFirstBlood,
                timestamp: Date.now(),
              },
            });

            if (isFirstBlood) {
              io.to(roomCode).emit("first_blood", {
                username: user.username,
                avatar: user.avatar,
                questionTitle: question.title,
                points,
                timeTakenSecs,
              });
            }

            // ✅ Check if all players solved
            const allSolved = Object.values(room.users).every((u) => u.solvedAt);
            if (allSolved) {
              console.log(`[Room] All players solved! Ending room ${roomCode}`);
              clearInterval(room.timerInterval);
              setTimeout(() => endRoom(io, room, roomCode), 3000);
            }
          } else {
            console.log(
              `[Code Submit] ❌ FAILED some test cases for ${user.username}`
            );
            callback?.({
              success: true,
              passed: false,
              message: "❌ Some test cases failed. Try again!",
              testResults: results,
            });
          }
        } catch (execError) {
          console.error("[Code Submit] Execution Error:", execError.message);
          throw new AppError(
            `Code execution failed: ${execError.message}`,
            502,
            "EXECUTION_ERROR"
          );
        }
      } catch (error) {
        const response = handleError(error, {
          event: "code_submit",
          roomCode: socket.data.roomCode,
          userId: socket.data.userId,
        });
        callback?.(response);
      }
    });

    // ── DISCONNECT ───────────────────────────────────────────────────────────
    socket.on("disconnect", () => {
      try {
        const roomCode = socket.data.roomCode;
        const userId = socket.data.userId;
        const sessionId = socket.data.sessionId;
        const room = getRoom(roomCode);

        if (!room) {
          console.warn(`[Disconnect] Room ${roomCode} not found during disconnect`);
          return;
        }

        const user = room.users[socket.id];
        delete room.users[socket.id];
        delete room.votes.questionMode[socket.id];
        delete room.votes.timeLimit[socket.id];

        // ✅ CRITICAL: Clean up userId and sessionId mappings
        if (userId) {
          userRoomMap.delete(userId);
          userSocketMap.delete(userId);
        }
        if (sessionId) {
          sessionMap.delete(sessionId);
        }

        io.to(roomCode).emit("user_left", {
          userId: socket.id,
          username: user?.username,
          users: Object.values(room.users),
        });

        if (room.hostId === socket.id && Object.keys(room.users).length > 0) {
          room.hostId = Object.keys(room.users)[0];
          io.to(roomCode).emit("host_transferred", { newHostId: room.hostId });
        }

        if (Object.keys(room.users).length === 0) {
          clearInterval(room.timerInterval);
          roomStore.delete(roomCode);
          console.log(`[Room] Cleaned up empty room: ${roomCode}`);
        }

        console.log(
          `[Disconnect] User ${user?.username} (userId: ${userId}, sessionId: ${sessionId}) left room ${roomCode}`
        );
      } catch (error) {
        console.error("[Disconnect] Error during cleanup:", error.message);
      }
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVER BOOTSTRAP
// ─────────────────────────────────────────────────────────────────────────────

function createDSARoomServer() {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
    },
  });

  app.use(express.json());
  app.get("/health", (_, res) => res.json({ status: "ok", rooms: roomStore.size }));

  registerSocketHandlers(io);

  const PORT = process.env.PORT || 4001;
  server.listen(PORT, () => {
    console.log(`\n🎮 [DSA Room Server] Running on port ${PORT}`);
    console.log(`📊 Rooms: ${roomStore.size}`);
    console.log(`✅ Ready for connections\n`);
  });

  return { app, server, io };
}

module.exports = { createDSARoomServer, roomStore };

if (require.main === module) {
  createDSARoomServer();
}
