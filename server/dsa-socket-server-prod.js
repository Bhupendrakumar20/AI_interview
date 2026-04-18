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

function generateRoomCode() {
  return "DSA-" + Math.random().toString(36).substring(2, 7).toUpperCase();
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
  return {
    id: "q_" + Math.random().toString(36).substring(2, 8),
    title: "Two Sum",
    difficulty: "Easy",
    tags: ["Array", "Hash Table"],
    description:
      "Given an array of integers nums and an integer target, return indices of the two numbers that add up to target.",
    examples: [{ input: "nums = [2,7,11,15], target = 9", output: "[0,1]" }],
    constraints: ["2 <= nums.length <= 10^4", "-10^9 <= nums[i] <= 10^9"],
    hiddenTestCases: [
      { stdin: "4\n2 7 11 15\n9", expectedOutput: "0 1" },
      { stdin: "3\n3 2 4\n6", expectedOutput: "1 2" },
      { stdin: "2\n3 3\n6", expectedOutput: "0 1" },
    ],
  };
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
    socket.on("room_create", ({ username, avatar, userId }, callback) => {      if (!userId) {
        return callback?.({ success: false, error: "User ID required" });
      }
      const code = generateRoomCode();
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
        userId: userId, // ✅ ADD userId to user object (CRITICAL - was missing!)
        username,
        avatar,
        solvedAt: null,
        points: 0,
        language: "javascript",
      };
      socket.data.roomCode = code;
      socket.data.userId = userId; // Store userId on socket for disconnect cleanup
      userRoomMap.set(userId, code); // Track this user in this room
      userSocketMap.set(userId, socket.id); // Map userId to socket.id

      callback({ success: true, roomCode: code });
      console.log(`[Room] Created: ${code} by ${username} (userId: ${userId})`);
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

      socket.join(roomCode);
      room.users[socket.id] = {
        id: socket.id,
        userId: userId, // ✅ Add userId to user object for tracking
        username,
        avatar,
        solvedAt: null,
        points: 0,
        language: "javascript",
      };
      socket.data.roomCode = roomCode;
      socket.data.userId = userId; // Store userId on socket for disconnect cleanup
      userRoomMap.set(userId, roomCode); // ✅ Track userId -> roomCode
      userSocketMap.set(userId, socket.id); // ✅ Map userId to socket.id for cleanup

      callback({
        success: true,
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

    // ── START ROOM (Host only) ───────────────────────────────────────────────
    socket.on("room_start", async (_, callback) => {
      const room = getRoom(socket.data.roomCode);
      if (!room) return callback?.({ success: false, error: "Room not found." });
      if (room.hostId !== socket.id)
        return callback?.({ success: false, error: "Only the host can start." });
      if (Object.keys(room.users).length < 2)
        return callback?.({ success: false, error: "Need at least 2 players." });

      // Tally votes
      const questionMode =
        tallyVotes(room.votes.questionMode, ["same", "different"]) || "same";
      const timeLimitSecs =
        parseInt(tallyVotes(room.votes.timeLimit, ["1800", "2700", "3600"])) || 1800;

      room.config = { questionMode, timeLimitSecs };
      room.status = "active";

      // Assign questions
      let sharedQuestion = null;
      if (questionMode === "same") {
        sharedQuestion = await fetchQuestionFromDB("medium");
      }

      const assignedQuestions = {};
      for (const uid of Object.keys(room.users)) {
        const q = questionMode === "same" ? sharedQuestion : await fetchQuestionFromDB("medium");
        room.questions[uid] = q;
        assignedQuestions[uid] = { ...q, hiddenTestCases: undefined };
      }

      // Broadcast start event
      for (const [uid, q] of Object.entries(assignedQuestions)) {
        const targetSocket = io.sockets.sockets.get(uid);
        if (targetSocket) {
          targetSocket.emit("room_started", {
            config: room.config,
            question: q,
            endsAt: Date.now() + timeLimitSecs * 1000,
          });
        }
      }

      startRoomTimer(io, room, socket.data.roomCode);
      callback?.({ success: true });
      console.log(`[Room] Started: ${socket.data.roomCode} | mode=${questionMode} | time=${timeLimitSecs}s`);
    });

    // ── SET LANGUAGE ─────────────────────────────────────────────────────────
    socket.on("set_language", ({ language }) => {
      const room = getRoom(socket.data.roomCode);
      if (room && room.users[socket.id]) {
        room.users[socket.id].language = language;
      }
    });

    // ── CODE SUBMIT ──────────────────────────────────────────────────────────
    socket.on("code_submit", async ({ sourceCode, language }, callback) => {
      const roomCode = socket.data.roomCode;
      const room = getRoom(roomCode);

      if (!room || room.status !== "active") {
        return callback?.({ success: false, error: "Room is not active." });
      }

      const user = room.users[socket.id];
      if (!user) return callback?.({ success: false, error: "User not in room." });
      if (user.solvedAt) return callback?.({ success: false, error: "Already solved!" });

      const question = room.questions[socket.id];
      if (!question) return callback?.({ success: false, error: "No question assigned." });

      io.to(roomCode).emit("user_judging", { userId: socket.id, username: user.username });

      try {
        const { passed, results } = await runAllTestCases(
          sourceCode,
          language,
          question.hiddenTestCases
        );

        if (!room.submissions[socket.id]) room.submissions[socket.id] = [];
        const timeTakenSecs = Math.floor(
          (Date.now() - (room.timerEndsAt - room.config.timeLimitSecs * 1000)) / 1000
        );
        room.submissions[socket.id].push({
          questionId: question.id,
          sourceCode,
          language,
          passed,
          timeTakenSecs,
          submittedAt: Date.now(),
          testResults: results,
        });

        if (passed) {
          const minutesRemaining = Math.floor(
            Math.max(0, room.timerEndsAt - Date.now()) / 60000
          );
          let points = POINTS.SOLVE_BASE + minutesRemaining * POINTS.SPEED_BONUS_PER_MINUTE_REMAINING;
          let isFirstBlood = false;

          if (!room.firstBloodClaimedBy) {
            room.firstBloodClaimedBy = socket.id;
            points += POINTS.FIRST_BLOOD_BONUS;
            isFirstBlood = true;
          }

          user.solvedAt = Date.now();
          user.points = points;
          user.language = language;

          const leaderboard = computeLeaderboard(room);
          room.leaderboard = leaderboard;

          callback?.({ success: true, passed: true, points, isFirstBlood, testResults: results });

          io.to(roomCode).emit("leaderboard_update", {
            leaderboard,
            event: {
              type: isFirstBlood ? "first_blood" : "solve",
              userId: socket.id,
              username: user.username,
              points,
              isFirstBlood,
            },
          });

          if (isFirstBlood) {
            io.to(roomCode).emit("first_blood", {
              username: user.username,
              avatar: user.avatar,
              timeTakenSecs,
            });
          }

          const allSolved = Object.values(room.users).every((u) => u.solvedAt);
          if (allSolved) {
            clearInterval(room.timerInterval);
            setTimeout(() => endRoom(io, room, roomCode), 3000);
          }
        } else {
          callback?.({ success: true, passed: false, testResults: results });
        }
      } catch (err) {
        console.error("[Judge0] Error:", err.message);
        callback?.({ success: false, error: "Execution service unavailable." });
      }
    });

    // ── DISCONNECT ───────────────────────────────────────────────────────────
    socket.on("disconnect", () => {
      const roomCode = socket.data.roomCode;
      const userId = socket.data.userId; // ✅ Get userId from socket
      const room = getRoom(roomCode);
      if (!room) return;

      const user = room.users[socket.id];
      delete room.users[socket.id];
      delete room.votes.questionMode[socket.id];
      delete room.votes.timeLimit[socket.id];
      
      // ✅ CRITICAL: Clean up userId mappings on disconnect
      if (userId) {
        userRoomMap.delete(userId); // Remove userId -> roomCode mapping
        userSocketMap.delete(userId); // Remove userId -> socket.id mapping
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
