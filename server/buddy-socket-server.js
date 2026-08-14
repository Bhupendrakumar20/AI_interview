const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env.local") });
const { createClient } = require("redis");

const PORT = process.env.PORT || 4002;

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("PrepWise signaling server is online.\n");
});

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Redis client setup
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const redisClient = createClient({ url: REDIS_URL });

redisClient.on("error", (err) => console.error("Redis Client Error", err));
redisClient.connect().then(() => {
  console.log("📡 Connected to Redis successfully.");
});

// Helper to set expiry (2 hours TTL)
const setExpiry = async (key) => {
  try {
    await redisClient.expire(key, 7200);
  } catch (err) {
    console.error("Redis expire error:", err);
  }
};

// Helper for normal rooms
const getRoomParticipants = async (roomId) => {
  try {
    const data = await redisClient.hGetAll(`room:participants:${roomId}`);
    const participants = {};
    for (const [socketId, val] of Object.entries(data)) {
      participants[socketId] = JSON.parse(val);
    }
    return participants;
  } catch (err) {
    console.error("getRoomParticipants error:", err);
    return {};
  }
};

const addRoomParticipant = async (roomId, socketId, userObj) => {
  try {
    await redisClient.hSet(`room:participants:${roomId}`, socketId, JSON.stringify(userObj));
    await setExpiry(`room:participants:${roomId}`);
  } catch (err) {
    console.error("addRoomParticipant error:", err);
  }
};

const removeRoomParticipant = async (roomId, socketId) => {
  try {
    await redisClient.hDel(`room:participants:${roomId}`, socketId);
  } catch (err) {
    console.error("removeRoomParticipant error:", err);
  }
};

// Helpers for DSA Rooms
const getDsaRoom = async (roomId) => {
  try {
    const data = await redisClient.hGetAll(`dsa:room:${roomId}`);
    if (!data || Object.keys(data).length === 0) return null;
    return {
      roomCode: data.roomCode,
      status: data.status,
      questions: data.questions ? JSON.parse(data.questions) : [],
      question: data.question ? JSON.parse(data.question) : null,
      startTime: data.startTime ? parseInt(data.startTime) : null,
      solvedCount: data.solvedCount ? parseInt(data.solvedCount) : 0
    };
  } catch (err) {
    console.error("getDsaRoom error:", err);
    return null;
  }
};

const setDsaRoom = async (roomId, roomState) => {
  try {
    await redisClient.hSet(`dsa:room:${roomId}`, {
      roomCode: roomState.roomCode,
      status: roomState.status,
      questions: JSON.stringify(roomState.questions || []),
      question: JSON.stringify(roomState.question || {}),
      startTime: roomState.startTime ? roomState.startTime.toString() : "",
      solvedCount: roomState.solvedCount ? roomState.solvedCount.toString() : "0"
    });
    await setExpiry(`dsa:room:${roomId}`);
  } catch (err) {
    console.error("setDsaRoom error:", err);
  }
};

const deleteDsaRoom = async (roomId) => {
  try {
    await redisClient.del(`dsa:room:${roomId}`);
    await redisClient.del(`dsa:room:participants:${roomId}`);
  } catch (err) {
    console.error("deleteDsaRoom error:", err);
  }
};

const getDsaParticipants = async (roomId) => {
  try {
    const data = await redisClient.hGetAll(`dsa:room:participants:${roomId}`);
    const participants = {};
    for (const [socketId, val] of Object.entries(data)) {
      participants[socketId] = JSON.parse(val);
    }
    return participants;
  } catch (err) {
    console.error("getDsaParticipants error:", err);
    return {};
  }
};

const setDsaParticipant = async (roomId, socketId, participantObj) => {
  try {
    await redisClient.hSet(`dsa:room:participants:${roomId}`, socketId, JSON.stringify(participantObj));
    await setExpiry(`dsa:room:participants:${roomId}`);
  } catch (err) {
    console.error("setDsaParticipant error:", err);
  }
};

const deleteDsaParticipant = async (roomId, socketId) => {
  try {
    await redisClient.hDel(`dsa:room:participants:${roomId}`, socketId);
  } catch (err) {
    console.error("deleteDsaParticipant error:", err);
  }
};

io.on("connection", (socket) => {
  let currentRoom = null;
  let currentDsaRoom = null;

  socket.on("join-room", async ({ roomId, userId, username }) => {
    if (!roomId || !userId) {
      socket.emit("error", { message: "Invalid room or user credentials." });
      return;
    }

    const participantsMap = await getRoomParticipants(roomId);
    const roomParticipants = Object.keys(participantsMap);

    // Enforce 3-person hard limit
    if (roomParticipants.length >= 3) {
      socket.emit("room-full", { message: "This mock interview session is full (max 3 participants)." });
      return;
    }

    // Join room
    currentRoom = roomId;
    await addRoomParticipant(roomId, socket.id, { userId, username });
    socket.join(roomId);

    console.log(`👤 User joined room [${roomId}]: ${username} (${userId}) (Socket: ${socket.id})`);

    // Notify other members of the new peer
    socket.to(roomId).emit("user-joined", {
      socketId: socket.id,
      userId,
      username
    });

    // Send the list of existing peers in the room to the new user
    const existingPeers = roomParticipants.map((sId) => ({
      socketId: sId,
      userId: participantsMap[sId].userId,
      username: participantsMap[sId].username
    }));

    socket.emit("room-users", { peers: existingPeers });

    // Sync saved notes, code, and whiteboard shapes to the newly joined peer
    try {
      const note = await redisClient.get(`room:note:${roomId}`);
      if (note) {
        socket.emit("note-sync", { text: note, sender: "system" });
      }

      const codeData = await redisClient.hGetAll(`room:code:${roomId}`);
      if (codeData && codeData.code) {
        socket.emit("code-sync", { code: codeData.code, language: codeData.language });
      }

      const whiteboard = await redisClient.get(`room:whiteboard:${roomId}`);
      if (whiteboard) {
        socket.emit("whiteboard-sync", { shapes: JSON.parse(whiteboard) });
      }
    } catch (err) {
      console.error("Error loading room data from Redis:", err);
    }
  });

  // Relay WebRTC signals (Offers, Answers, ICE Candidates)
  socket.on("signal", async ({ targetSocketId, signalData }) => {
    if (currentRoom) {
      const participantsMap = await getRoomParticipants(currentRoom);
      if (participantsMap[targetSocketId]) {
        io.to(targetSocketId).emit("signal", {
          senderSocketId: socket.id,
          signalData
        });
      }
    }
  });

  // Relay chat/session notes to other peers in the room
  socket.on("note-sync", async ({ text, sender }) => {
    if (currentRoom) {
      socket.to(currentRoom).emit("note-sync", { text, sender });
      try {
        await redisClient.set(`room:note:${currentRoom}`, text);
        await setExpiry(`room:note:${currentRoom}`);
      } catch (err) {
        console.error("Redis note-sync error:", err);
      }
    }
  });

  // Relay code changes to other peers in the room
  socket.on("code-sync", async ({ code, language }) => {
    if (currentRoom) {
      socket.to(currentRoom).emit("code-sync", { code, language });
      try {
        await redisClient.hSet(`room:code:${currentRoom}`, { code, language });
        await setExpiry(`room:code:${currentRoom}`);
      } catch (err) {
        console.error("Redis code-sync error:", err);
      }
    }
  });

  // Relay whiteboard shapes to other peers in the room
  socket.on("whiteboard-sync", async ({ shapes }) => {
    if (currentRoom) {
      socket.to(currentRoom).emit("whiteboard-sync", { shapes });
      try {
        await redisClient.set(`room:whiteboard:${currentRoom}`, JSON.stringify(shapes));
        await setExpiry(`room:whiteboard:${currentRoom}`);
      } catch (err) {
        console.error("Redis whiteboard-sync error:", err);
      }
    }
  });

  // ----------------------------------------------------
  // DSA COMPETITIVE ROOMS
  // ----------------------------------------------------
  socket.on("dsa-join-room", async ({ roomId, userId, username }) => {
    if (!roomId || !userId) {
      socket.emit("dsa-error", { message: "Invalid room or user credentials." });
      return;
    }

    const cleanRoomId = roomId.toUpperCase();

    let room = await getDsaRoom(cleanRoomId);
    if (!room) {
      room = {
        roomCode: cleanRoomId,
        status: "lobby",
        questions: [],
        question: null,
        startTime: null,
        solvedCount: 0
      };
      await setDsaRoom(cleanRoomId, room);
    }

    const participantsMap = await getDsaParticipants(cleanRoomId);

    // Clean up any stale participant entry with the same userId to handle reconnects cleanly
    for (const [sId, p] of Object.entries(participantsMap)) {
      if (p.userId === userId && sId !== socket.id) {
        await deleteDsaParticipant(cleanRoomId, sId);
        delete participantsMap[sId];
      }
    }

    const participants = Object.values(participantsMap);

    // Enforce 3-person limit
    if (participants.length >= 3 && !participantsMap[socket.id]) {
      socket.emit("dsa-room-full", { message: "This DSA Room is full (max 3 participants)." });
      return;
    }

    // Join room
    currentDsaRoom = cleanRoomId;
    socket.join(`dsa-${cleanRoomId}`);

    const isHost = participants.length === 0;

    const newParticipantObj = {
      socketId: socket.id,
      userId,
      username,
      isHost,
      progress: 0,
      status: "coding", // coding, testing, solved
      attempts: 0,
      passedCount: 0,
      totalCases: 0,
      timeTaken: null,
      questionStatuses: {} // questionId -> { progress, status, attempts, passedCount, totalCases, timeTaken }
    };

    await setDsaParticipant(cleanRoomId, socket.id, newParticipantObj);
    participantsMap[socket.id] = newParticipantObj;

    console.log(`⚔️ User ${username} joined DSA room [${cleanRoomId}] (Host: ${isHost})`);

    // Broadcast room state and updated user list
    io.to(`dsa-${cleanRoomId}`).emit("dsa-lobby-update", {
      roomId: cleanRoomId,
      status: room.status,
      questions: room.questions || [],
      question: room.question,
      startTime: room.startTime,
      participants: Object.values(participantsMap)
    });
  });

  socket.on("dsa-start-game", async ({ roomId, questions }) => {
    const cleanRoomId = roomId?.toUpperCase();
    const room = await getDsaRoom(cleanRoomId);
    if (!room) return;

    const participantsMap = await getDsaParticipants(cleanRoomId);
    if (participantsMap[socket.id]?.isHost) {
      room.status = "playing";
      room.questions = questions || [];
      room.question = questions && questions.length > 0 ? questions[0] : null;
      room.startTime = Date.now();
      room.solvedCount = 0;

      await setDsaRoom(cleanRoomId, room);

      // Initialize questionStatuses for all participants
      for (const [sId, p] of Object.entries(participantsMap)) {
        p.questionStatuses = {};
        for (const q of room.questions) {
          p.questionStatuses[q.id] = {
            progress: 0,
            status: "coding",
            attempts: 0,
            passedCount: 0,
            totalCases: 0,
            timeTaken: null
          };
        }
        await setDsaParticipant(cleanRoomId, sId, p);
      }

      io.to(`dsa-${cleanRoomId}`).emit("dsa-game-started", {
        questions: room.questions,
        question: room.question,
        startTime: room.startTime
      });
    }
  });

  socket.on("dsa-status-update", async ({ roomId, questionId, progress, status, attempts, passedCount, totalCases }) => {
    const cleanRoomId = roomId?.toUpperCase();
    const room = await getDsaRoom(cleanRoomId);
    if (!room) return;

    const participantsMap = await getDsaParticipants(cleanRoomId);
    const p = participantsMap[socket.id];
    if (p) {
      if (questionId) {
        if (!p.questionStatuses) p.questionStatuses = {};
        if (!p.questionStatuses[questionId]) {
          p.questionStatuses[questionId] = { progress: 0, status: "coding", attempts: 0, passedCount: 0, totalCases: 0, timeTaken: null };
        }
        const qStatus = p.questionStatuses[questionId];
        qStatus.progress = progress !== undefined ? progress : qStatus.progress;
        qStatus.status = status !== undefined ? status : qStatus.status;
        qStatus.attempts = attempts !== undefined ? attempts : qStatus.attempts;
        qStatus.passedCount = passedCount !== undefined ? passedCount : qStatus.passedCount;
        qStatus.totalCases = totalCases !== undefined ? totalCases : qStatus.totalCases;
      } else {
        p.progress = progress !== undefined ? progress : p.progress;
        p.status = status !== undefined ? status : p.status;
        p.attempts = attempts !== undefined ? attempts : p.attempts;
        p.passedCount = passedCount !== undefined ? passedCount : p.passedCount;
        p.totalCases = totalCases !== undefined ? totalCases : p.totalCases;
      }

      await setDsaParticipant(cleanRoomId, socket.id, p);

      io.to(`dsa-${cleanRoomId}`).emit("dsa-lobby-update", {
        roomId: cleanRoomId,
        status: room.status,
        questions: room.questions || [],
        question: room.question,
        startTime: room.startTime,
        participants: Object.values(participantsMap)
      });
    }
  });

  socket.on("dsa-code-submit", async ({ roomId, questionId, isCorrect, code, passedCount, totalCases }) => {
    const cleanRoomId = roomId?.toUpperCase();
    const room = await getDsaRoom(cleanRoomId);
    if (!room) return;

    const participantsMap = await getDsaParticipants(cleanRoomId);
    const p = participantsMap[socket.id];
    if (p) {
      if (!p.questionStatuses) p.questionStatuses = {};
      if (!p.questionStatuses[questionId]) {
        p.questionStatuses[questionId] = {
          progress: 0,
          status: "coding",
          attempts: 0,
          passedCount: 0,
          totalCases: 0,
          timeTaken: null
        };
      }

      const qStatus = p.questionStatuses[questionId];
      qStatus.attempts = (qStatus.attempts || 0) + 1;
      qStatus.passedCount = passedCount;
      qStatus.totalCases = totalCases;

      if (isCorrect && qStatus.status !== "solved") {
        qStatus.status = "solved";
        qStatus.progress = 100;
        qStatus.timeTaken = Date.now() - room.startTime;
        room.solvedCount += 1;

        await setDsaRoom(cleanRoomId, room);

        io.to(`dsa-${cleanRoomId}`).emit("dsa-user-solved", {
          username: p.username,
          questionId,
          timeTaken: qStatus.timeTaken,
          participants: Object.values(participantsMap)
        });
      } else {
        qStatus.progress = totalCases > 0 ? Math.floor((passedCount / totalCases) * 100) : 0;
        qStatus.status = "testing";
      }

      // Compute overall stats for backwards compatibility
      p.attempts = Object.values(p.questionStatuses).reduce((sum, curr) => sum + (curr.attempts || 0), 0);
      const solvedAll = room.questions && room.questions.length > 0 &&
        room.questions.every(q => p.questionStatuses[q.id]?.status === "solved");

      if (solvedAll) {
        p.status = "solved";
        p.progress = 100;
      } else {
        p.status = "testing";
        if (room.questions && room.questions.length > 0) {
          const totalProg = room.questions.reduce((sum, q) => sum + (p.questionStatuses[q.id]?.progress || 0), 0);
          p.progress = Math.floor(totalProg / room.questions.length);
        } else {
          p.progress = qStatus.progress;
        }
      }

      await setDsaParticipant(cleanRoomId, socket.id, p);

      io.to(`dsa-${cleanRoomId}`).emit("dsa-lobby-update", {
        roomId: cleanRoomId,
        status: room.status,
        questions: room.questions || [],
        question: room.question,
        startTime: room.startTime,
        participants: Object.values(participantsMap)
      });
    }
  });

  // Listen for admin content updates and broadcast to all clients
  socket.on("admin-content-update", ({ contentType }) => {
    console.log(`📢 Admin content update broadcasted for: ${contentType}`);
    io.emit("content-updated", { contentType });
  });

  // Handle manual disconnect or connection loss
  socket.on("disconnect", async () => {
    if (currentRoom) {
      const participantsMap = await getRoomParticipants(currentRoom);
      const user = participantsMap[socket.id];
      await removeRoomParticipant(currentRoom, socket.id);
      delete participantsMap[socket.id];

      // Broadcast cleanup event to other peers
      socket.to(currentRoom).emit("user-left", {
        socketId: socket.id,
        userId: user?.userId,
        username: user?.username
      });

      console.log(`❌ User left room [${currentRoom}]: ${user?.username} (Socket: ${socket.id})`);

      // Clean up empty room
      if (Object.keys(participantsMap).length === 0) {
        try {
          await redisClient.del(`room:participants:${currentRoom}`);
          await redisClient.del(`room:note:${currentRoom}`);
          await redisClient.del(`room:code:${currentRoom}`);
          await redisClient.del(`room:whiteboard:${currentRoom}`);
        } catch (err) {
          console.error("Error clearing room from Redis:", err);
        }
      }
    }

    if (currentDsaRoom) {
      const room = await getDsaRoom(currentDsaRoom);
      if (room) {
        const participantsMap = await getDsaParticipants(currentDsaRoom);
        const leavingUser = participantsMap[socket.id];
        await deleteDsaParticipant(currentDsaRoom, socket.id);
        delete participantsMap[socket.id];

        console.log(`❌ User left DSA room [${currentDsaRoom}]: ${leavingUser?.username}`);

        const remainingParticipants = Object.values(participantsMap);
        if (remainingParticipants.length === 0) {
          await deleteDsaRoom(currentDsaRoom);
        } else {
          // Migrate host if leaving user was host
          if (leavingUser?.isHost) {
            const nextHostSocketId = Object.keys(participantsMap)[0];
            if (nextHostSocketId && participantsMap[nextHostSocketId]) {
              participantsMap[nextHostSocketId].isHost = true;
              await setDsaParticipant(currentDsaRoom, nextHostSocketId, participantsMap[nextHostSocketId]);
            }
          }

          io.to(`dsa-${currentDsaRoom}`).emit("dsa-lobby-update", {
            roomId: currentDsaRoom,
            status: room.status,
            question: room.question,
            startTime: room.startTime,
            participants: Object.values(participantsMap)
          });
        }
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`📡 PrepWise WebRTC Mesh Signaling Server is active on port ${PORT}`);
});
