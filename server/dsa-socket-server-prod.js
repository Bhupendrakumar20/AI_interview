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
      stdin: stdin,
    };

    const response = await axios.post(
      `${PISTON_API_URL}/execute`,
      payload,
      { timeout: PISTON_TIMEOUT, headers: { "Content-Type": "application/json" } }
    );

    console.log("[Piston] Execution successful:", response.data?.run?.exit_code === 0 ? "PASS" : "FAIL");
    
    return {
      stdout: response.data?.run?.stdout || "",
      stderr: response.data?.run?.stderr || "",
      exit_code: response.data?.run?.exit_code || 0,
    };
  } catch (err) {
    console.error("[Piston] Error:", {
      message: err.message,
      status: err.response?.status,
      url: PISTON_API_URL,
    });
    return {
      stdout: "",
      stderr: err.message || "Execution error",
      exit_code: -1,
    };
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
  const results = await Promise.all(
    testCases.map((tc) => executePistonCode(sourceCode, language, tc.stdin))
  );

  const passed = results.every((r, i) => {
    const actual = (r.output || "").trim();
    const expected = testCases[i].expectedOutput.trim();
    return r.success && actual === expected;
  });

  return {
    passed,
    results: results.map((r, i) => ({
      testCase: i + 1,
      status: r.success ? "Accepted" : "Failed",
      stdout: r.output || "",
      stderr: r.error || "",
      time: null,
      memory: null,
    })),
  };
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
      // ✅ Validate userId is provided
      if (!userId) {
        return callback?.({ success: false, error: "User ID required" });
      }

      // ✅ Check if this userId is already in another room
      const existingRoomCode = userRoomMap.get(userId);
      if (existingRoomCode) {
        console.error(`[Block] User (${userId}) tried to create room but already in room ${existingRoomCode}`);
        return callback({
          success: false,
          error: `User is already in room: ${existingRoomCode}. Cannot create or join multiple rooms simultaneously.`,
        });
      }

      const code = generateRoomCode();
      const sessionId = generateSessionId(); // ✅ Create unique session ID

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
      room.users[socket.id] = {
        id: socket.id,
        userId: userId,
        sessionId: sessionId, // ✅ Add session ID to user object
        username,
        avatar,
        solvedAt: null,
        points: 0,
        language: "javascript",
      };
      socket.data.roomCode = code;
      socket.data.userId = userId;
      socket.data.sessionId = sessionId; // ✅ Store session ID on socket
      userRoomMap.set(userId, code); // Track this user in this room
      userSocketMap.set(userId, socket.id); // Map userId to socket.id
      sessionMap.set(sessionId, { userId, socketId: socket.id, roomCode: code, createdAt: Date.now() }); // ✅ Track session

      callback({
        success: true,
        roomCode: code,
        sessionId: sessionId, // ✅ Return session ID to client
      });
      console.log(`[Room] Created: ${code} by ${username} (userId: ${userId}, sessionId: ${sessionId})`);
    });

    // ── JOIN ROOM ────────────────────────────────────────────────────────────
    socket.on("room_join", ({ roomCode, username, avatar, userId }, callback) => {
      const room = getRoom(roomCode);

      if (!room) return callback({ success: false, error: "Room not found." });
      if (room.status !== "lobby") return callback({ success: false, error: "Room already started." });
      if (Object.keys(room.users).length >= MAX_ROOM_SIZE)
        return callback({ success: false, error: "Room is full." });

      console.log(`[Debug] Join attempt: username=${username}, userId=${userId}, roomCode=${roomCode}`);

      // ✅ Validation Priority 1: Check by userId (database ID)
      if (userId) {
        // Check 1a: userId already in another room
        const existingRoomCode = userRoomMap.get(userId);
        if (existingRoomCode && existingRoomCode !== roomCode) {
          console.error(`[Block] ${username} already in room ${existingRoomCode}, rejecting join to ${roomCode}`);
          return callback({
            success: false,
            error: `User already in room: ${existingRoomCode}. Cannot be in multiple rooms. Leave first.`,
          });
        }

        // Check 1b: userId already in THIS specific room (different device/connection)
        const userAlreadyInRoom = Object.values(room.users).some(u => u.userId === userId);
        if (userAlreadyInRoom) {
          console.error(`[Block] ${username} (${userId}) already in this room from another device`);
          return callback({
            success: false,
            error: "This account is already joined in this room from another device. Cannot join twice.",
          });
        }
      }

      // ✅ Validation Priority 2: FALLBACK - Check by username (if userId missing or as extra layer)
      const userByUsername = Object.values(room.users).find(u => u.username === username);
      if (userByUsername) {
        console.error(`[Block] Username ${username} already in room, forcing disconnect of old connection`);
        
        // AGGRESSIVE: Force disconnect the old socket with same username
        const oldSocket = io.sockets.sockets.get(userByUsername.id);
        if (oldSocket) {
          console.log(`[Force-Disconnect] Disconnecting old socket ${userByUsername.id} for duplicate ${username}`);
          oldSocket.emit("duplicate_join_detected", { 
            message: "Your account was logged in from another device. Disconnecting..." 
          });
          oldSocket.disconnect(true);
        }
        
        // Remove the stale user entry after force disconnect
        delete room.users[userByUsername.id];
        delete room.votes.questionMode[userByUsername.id];
        delete room.votes.timeLimit[userByUsername.id];
      }

      const sessionId = generateSessionId(); // ✅ Create unique session ID for this join

      socket.join(roomCode);
      room.users[socket.id] = {
        id: socket.id,
        userId: userId,
        sessionId: sessionId, // ✅ Add session ID to user object
        username,
        avatar,
        solvedAt: null,
        points: 0,
        language: "javascript",
      };
      socket.data.roomCode = roomCode;
      socket.data.userId = userId;
      socket.data.sessionId = sessionId; // ✅ Store session ID on socket
      userRoomMap.set(userId, roomCode); // ✅ Track userId -> roomCode
      userSocketMap.set(userId, socket.id); // ✅ Map userId to socket.id for cleanup
      sessionMap.set(sessionId, { userId, socketId: socket.id, roomCode: roomCode, createdAt: Date.now() }); // ✅ Track session

      callback({
        success: true,
        sessionId: sessionId, // ✅ Return session ID to client
        lobbyState: {
          roomCode,
          hostId: room.hostId,
          users: Object.values(room.users),
          status: room.status,
        },
      });

      socket.to(roomCode).emit("lobby_update", { users: Object.values(room.users) });
      console.log(`[Room] ${username} joined ${roomCode} (userId: ${userId})`);
    });

    // ── CAST VOTE ────────────────────────────────────────────────────────────
    socket.on("cast_vote", ({ type, value }) => {
      const room = getRoom(socket.data.roomCode);
      if (!room || room.status !== "lobby") return;

      if (type === "questionMode") room.votes.questionMode[socket.id] = value;
      if (type === "timeLimit") room.votes.timeLimit[socket.id] = value;

      io.to(socket.data.roomCode).emit("vote_update", {
        questionModeVotes: room.votes.questionMode,
        timeLimitVotes: room.votes.timeLimit,
        totalUsers: Object.keys(room.users).length,
      });
    });

    // ── GET QUESTION LIST (LeetCode ONLY via GraphQL API) ──────────────────
    socket.on("get_question_list", async ({ difficulty = "Medium" }, callback) => {
      try {
        console.log(`[LeetCode Questions] Fetching ${difficulty} problems from LeetCode GraphQL API...`);
        // LEETCODE ONLY - getMixedProblems calls fetchFromLeetCode exclusively
        const problems = await getMixedProblems(difficulty, 5);
        
        if (!problems || problems.length === 0) {
          console.warn("[LeetCode Questions] LeetCode API returned no results");
          return callback?.({
            success: false,
            error: "No LeetCode problems available at this time. Check LeetCode API connectivity.",
            questions: [],
          });
        }
        
        // Return ONLY LeetCode questions with LeetCode titles from GraphQL API
        const leetcodeQuestions = problems.map((p) => {
          // STRICT VALIDATION - Must be LeetCode
          if (!p.id || !p.id.startsWith("lc_")) {
            console.error("[LeetCode Validation] Non-LeetCode question detected:", p);
            return null;
          }
          return {
            id: p.id,
            title: p.title,  // LeetCode title from GraphQL ONLY
            difficulty: p.difficulty,
            source: "leetcode",  // ALWAYS leetcode
            tags: p.tags || [],
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
        // ========== STRICT LEETCODE-ONLY VALIDATION ==========
        if (!questionId || !titleSlug) {
          console.error("[LeetCode Details] Missing questionId or titleSlug");
          return callback?.({
            success: false,
            error: "Invalid request: Missing question ID or slug.",
          });
        }

        if (!questionId.startsWith("lc_")) {
          console.error("[LeetCode Details] REJECTED Non-LeetCode question ID:", questionId);
          return callback?.({
            success: false,
            error: "ERROR: Only LeetCode problems are supported in DSA Room. Non-LeetCode questions are NOT allowed.",
          });
        }

        console.log(`[LeetCode Details] Fetching LeetCode problem from GraphQL API: ${titleSlug}...`);
        
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
      const room = getRoom(socket.data.roomCode);
      if (!room) {
        console.error(`[Room Start] Room not found for code: ${socket.data.roomCode}`);
        return callback?.({ success: false, error: "Room not found." });
      }
      
      if (room.hostId !== socket.id) {
        const hostUser = room.users[room.hostId];
        const callerUser = room.users[socket.id];
        console.error(`[Room Start] REJECTED - Only host can start. Host: ${hostUser?.username}, Caller: ${callerUser?.username}`);
        return callback?.({ success: false, error: "Only the host can start." });
      }
      
      if (Object.keys(room.users).length < 2) {
        console.error(`[Room Start] Not enough players: ${Object.keys(room.users).length} < 2`);
        return callback?.({ success: false, error: "Need at least 2 players." });
      }

      console.log(`\n🎮 [Room Start] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`   Room: ${socket.data.roomCode}`);
      console.log(`   Host: ${room.users[socket.id].username}`);
      console.log(`   Players: ${Object.keys(room.users).length}`);
      console.log(`   ${Object.values(room.users).map(u => `• ${u.username}`).join("\n   ")}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

      // ✅ FIXED: Assign LeetCode questions to each player
      let sharedQuestion = null;
      if (questionMode === "same") {
        console.log("[Room Start] Fetching shared LeetCode question...");
        sharedQuestion = await fetchQuestionFromDB("medium");
        if (!sharedQuestion) {
          return callback?.({ success: false, error: "Failed to load LeetCode questions. Try again." });
        }
      }

      const assignedQuestions = {};
      const userIds = Object.keys(room.users);
      
      for (const socketId of userIds) {
        let q;
        if (questionMode === "same") {
          q = sharedQuestion;
        } else {
          // Fetch different question for each player
          q = await fetchQuestionFromDB("medium");
          if (!q) {
            console.warn("[Room Start] Failed to fetch question for", socketId, "using fallback");
            q = sharedQuestion || await fetchQuestionFromDB("medium");
          }
        }
        
        // ✅ Store with test cases for execution
        room.questions[socketId] = q;
        
        // ✅ Send question WITHOUT hidden test cases to client
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
          // DO NOT send hiddenTestCases to client
        };
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
      console.log(`[Room Start] Broadcasting room_started to all sockets in room ${socket.data.roomCode}`);
      console.log(`[Room Start] Room has ${Object.keys(room.users).length} users:`, Object.values(room.users).map(u => u.username).join(", "));
      
      // Broadcast to room using socket.io rooms
      io.to(socket.data.roomCode).emit("room_started", {
        config: room.config,
        endsAt: endsAt,
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
    socket.on("set_language", ({ language }) => {
      const room = getRoom(socket.data.roomCode);
      if (room && room.users[socket.id]) {
        room.users[socket.id].language = language;
      }
    });

    // ── CODE SUBMIT ──────────────────────────────────────────────────────────
    socket.on("code_submit", async ({ sourceCode, language, questionId }, callback) => {
      const roomCode = socket.data.roomCode;
      const room = getRoom(roomCode);

      console.log(`[Code Submit] ${roomCode} | Player: ${room?.users[socket.id]?.username} | Question: ${questionId}`);

      // ✅ Validation checks
      if (!room || room.status !== "active") {
        console.error("[Code Submit] Room not active or not found");
        return callback?.({ success: false, error: "Room is not active." });
      }

      const user = room.users[socket.id];
      if (!user) {
        console.error("[Code Submit] User not in room");
        return callback?.({ success: false, error: "User not in room." });
      }
      
      if (user.solvedAt) {
        console.warn("[Code Submit] User already solved", user.username);
        return callback?.({ success: false, error: "You already solved this! Cannot submit twice." });
      }

      const question = room.questions[socket.id];
      if (!question) {
        console.error("[Code Submit] No question assigned to user");
        return callback?.({ success: false, error: "No question assigned to you." });
      }

      // ✅ Validate time hasn't expired
      if (Date.now() > room.timerEndsAt) {
        console.warn("[Code Submit] Time limit exceeded for", user.username);
        return callback?.({ success: false, error: "Time limit exceeded!" });
      }

      if (!sourceCode || sourceCode.trim().length === 0) {
        return callback?.({ success: false, error: "Code cannot be empty." });
      }

      // ✅ Notify others that this user is being judged
      io.to(roomCode).emit("user_judging", { 
        socketId: socket.id,
        userId: user.userId,
        username: user.username,
        questionTitle: question.title,
      });

      try {
        console.log(`[Code Submit] Running tests for ${user.username} on "${question.title}"...`);
        
        // ✅ Use the test cases from the question
        const testCases = question.hiddenTestCases || question.testCases || [];
        if (testCases.length === 0) {
          console.warn("[Code Submit] No test cases available for question", question.id);
          return callback?.({ success: false, error: "No test cases available for this problem." });
        }

        const { passed, results } = await runAllTestCases(sourceCode, language, testCases);

        // ✅ Store submission for review phase
        if (!room.submissions[socket.id]) {
          room.submissions[socket.id] = [];
        }
        
        const timeTakenSecs = Math.floor((Date.now() - (room.timerEndsAt - room.config.timeLimitSecs * 1000)) / 1000);
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
          console.log(`[Code Submit] ✅ ACCEPTED! ${user.username} solved "${question.title}"`);
          
          // ✅ Calculate points
          const secondsRemaining = Math.max(0, (room.timerEndsAt - Date.now()) / 1000);
          const minutesRemaining = Math.floor(secondsRemaining / 60);
          let points = POINTS.SOLVE_BASE + minutesRemaining * POINTS.SPEED_BONUS_PER_MINUTE_REMAINING;
          let isFirstBlood = false;

          // Check for first blood
          if (!room.firstBloodClaimedBy) {
            room.firstBloodClaimedBy = socket.id;
            points += POINTS.FIRST_BLOOD_BONUS;
            isFirstBlood = true;
            console.log(`[First Blood] ${user.username} claimed first blood! +${POINTS.FIRST_BLOOD_BONUS} bonus`);
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
            message: isFirstBlood ? `🎯 First Blood! +${points} points!` : `✅ Accepted! +${points} points`,
            testResults: results 
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
          console.log(`[Code Submit] ❌ FAILED some test cases for ${user.username}`);
          callback?.({ 
            success: true, 
            passed: false,
            message: "❌ Some test cases failed. Try again!",
            testResults: results 
          });
        }
      } catch (err) {
        console.error("[Code Submit] Execution Error:", err.message);
        callback?.({ success: false, error: `Execution error: ${err.message}` });
      }
    });

    // ── DISCONNECT ───────────────────────────────────────────────────────────
    socket.on("disconnect", () => {
      const roomCode = socket.data.roomCode;
      const userId = socket.data.userId; // ✅ Get userId from socket
      const sessionId = socket.data.sessionId; // ✅ Get sessionId from socket
      const room = getRoom(roomCode);
      if (!room) return;

      const user = room.users[socket.id];
      delete room.users[socket.id];
      delete room.votes.questionMode[socket.id];
      delete room.votes.timeLimit[socket.id];
      
      // ✅ CRITICAL: Clean up userId and sessionId mappings on disconnect
      if (userId) {
        userRoomMap.delete(userId); // Remove userId -> roomCode mapping
        userSocketMap.delete(userId); // Remove userId -> socket.id mapping
      }
      if (sessionId) {
        sessionMap.delete(sessionId); // ✅ Remove session tracking
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
      
      console.log(`[Disconnect] User ${user?.username} (userId: ${userId}, sessionId: ${sessionId}) left room ${roomCode}`);

      console.log(`[Socket] Disconnected: ${socket.id}`);
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
