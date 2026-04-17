/**
 * DSA Room — Production Socket.io Server
 * ─────────────────────────────────────
 * Full real-time multiplayer coding rooms with:
 *  • Room lifecycle (lobby → voting → active → review → closed)
 *  • Vote aggregation for game config
 *  • Server-authoritative timer (1s broadcasts)
 *  • Judge0 code execution pipeline
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

const JUDGE0_BASE_URL = process.env.JUDGE0_API_URL || "https://judge0-ce.p.rapidapi.com";
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY || "";
const JUDGE0_HEADERS = {
  "X-RapidAPI-Key": JUDGE0_API_KEY,
  "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
  "Content-Type": "application/json",
};

const LANGUAGE_IDS = {
  javascript: 63,
  python: 71,
  java: 62,
  cpp: 54,
  c: 50,
};

// ─────────────────────────────────────────────────────────────────────────────
// IN-MEMORY ROOM STORE (use Redis in production)
// ─────────────────────────────────────────────────────────────────────────────

const roomStore = new Map();

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

async function submitToJudge0(sourceCode, languageId, stdin) {
  try {
    if (!JUDGE0_API_KEY) {
      console.warn("[Judge0] API key not configured, using fallback simulation");
      // Fallback: simulate response for testing
      return {
        status: { id: 3, description: "Accepted" },
        stdout: "OK",
        stderr: "",
        time: 0.123,
        memory: 12,
      };
    }

    const { data } = await axios.post(
      `${JUDGE0_BASE_URL}/submissions?base64_encoded=false&wait=true`,
      { source_code: sourceCode, language_id: languageId, stdin },
      { headers: JUDGE0_HEADERS, timeout: 10000 }
    );
    console.log("[Judge0] Submission successful:", data.status?.description);
    return data;
  } catch (err) {
    console.error("[Judge0] Error:", {
      message: err.message,
      status: err.response?.status,
      statusText: err.response?.statusText,
      url: JUDGE0_BASE_URL,
    });
    return {
      status: { id: -1, description: "Execution Error" },
      stdout: "",
      stderr: err.message,
    };
  }
}

async function runAllTestCases(sourceCode, languageId, testCases) {
  const results = await Promise.all(
    testCases.map((tc) => submitToJudge0(sourceCode, languageId, tc.stdin))
  );

  const passed = results.every((r, i) => {
    const actual = (r.stdout || "").trim();
    const expected = testCases[i].expectedOutput.trim();
    return r.status?.id === 3 && actual === expected; // status 3 = Accepted
  });

  return {
    passed,
    results: results.map((r, i) => ({
      testCase: i + 1,
      status: r.status?.description || "Unknown",
      stdout: r.stdout || "",
      stderr: r.stderr || "",
      time: r.time,
      memory: r.memory,
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
    socket.on("room_create", ({ username, avatar }, callback) => {
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
        username,
        avatar,
        solvedAt: null,
        points: 0,
        language: "javascript",
      };
      socket.data.roomCode = code;

      callback({ success: true, roomCode: code });
      console.log(`[Room] Created: ${code} by ${username}`);
    });

    // ── JOIN ROOM ────────────────────────────────────────────────────────────
    socket.on("room_join", ({ roomCode, username, avatar }, callback) => {
      const room = getRoom(roomCode);

      if (!room) return callback({ success: false, error: "Room not found." });
      if (room.status !== "lobby") return callback({ success: false, error: "Room already started." });
      if (Object.keys(room.users).length >= MAX_ROOM_SIZE)
        return callback({ success: false, error: "Room is full." });

      socket.join(roomCode);
      room.users[socket.id] = {
        id: socket.id,
        username,
        avatar,
        solvedAt: null,
        points: 0,
        language: "javascript",
      };
      socket.data.roomCode = roomCode;

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
      console.log(`[Room] ${username} joined ${roomCode}`);
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

      const languageId = LANGUAGE_IDS[language] || LANGUAGE_IDS.javascript;

      io.to(roomCode).emit("user_judging", { userId: socket.id, username: user.username });

      try {
        const { passed, results } = await runAllTestCases(
          sourceCode,
          languageId,
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
      const room = getRoom(roomCode);
      if (!room) return;

      const user = room.users[socket.id];
      delete room.users[socket.id];
      delete room.votes.questionMode[socket.id];
      delete room.votes.timeLimit[socket.id];

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
