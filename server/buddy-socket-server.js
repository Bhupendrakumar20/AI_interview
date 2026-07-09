const http = require("http");
const { Server } = require("socket.io");

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

// Rooms dictionary to track participants: roomId -> { socketId: { userId, username } }
const rooms = {};
const dsaRooms = {};

io.on("connection", (socket) => {
  let currentRoom = null;
  let currentDsaRoom = null;

  socket.on("join-room", ({ roomId, userId, username }) => {
    if (!roomId || !userId) {
      socket.emit("error", { message: "Invalid room or user credentials." });
      return;
    }

    // Initialize room if it doesn't exist
    if (!rooms[roomId]) {
      rooms[roomId] = {};
    }

    const roomParticipants = Object.keys(rooms[roomId]);

    // Enforce 3-person hard limit
    if (roomParticipants.length >= 3) {
      socket.emit("room-full", { message: "This mock interview session is full (max 3 participants)." });
      return;
    }

    // Join room
    currentRoom = roomId;
    rooms[roomId][socket.id] = { userId, username };
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
      userId: rooms[roomId][sId].userId,
      username: rooms[roomId][sId].username
    }));

    socket.emit("room-users", { peers: existingPeers });
  });

  // Relay WebRTC signals (Offers, Answers, ICE Candidates)
  socket.on("signal", ({ targetSocketId, signalData }) => {
    if (currentRoom && rooms[currentRoom][targetSocketId]) {
      io.to(targetSocketId).emit("signal", {
        senderSocketId: socket.id,
        signalData
      });
    }
  });

  // Relay chat/session notes to other peers in the room
  socket.on("note-sync", ({ text, sender }) => {
    if (currentRoom) {
      socket.to(currentRoom).emit("note-sync", { text, sender });
    }
  });

  // Relay code changes to other peers in the room
  socket.on("code-sync", ({ code, language }) => {
    if (currentRoom) {
      socket.to(currentRoom).emit("code-sync", { code, language });
    }
  });

  // Relay whiteboard shapes to other peers in the room
  socket.on("whiteboard-sync", ({ shapes }) => {
    if (currentRoom) {
      socket.to(currentRoom).emit("whiteboard-sync", { shapes });
    }
  });

  // ----------------------------------------------------
  // DSA COMPETITIVE ROOMS
  // ----------------------------------------------------
  socket.on("dsa-join-room", ({ roomId, userId, username }) => {
    if (!roomId || !userId) {
      socket.emit("dsa-error", { message: "Invalid room or user credentials." });
      return;
    }

    const cleanRoomId = roomId.toUpperCase();

    // Initialize room if it doesn't exist
    if (!dsaRooms[cleanRoomId]) {
      dsaRooms[cleanRoomId] = {
        roomCode: cleanRoomId,
        status: "lobby",
        participants: {},
        questions: [],
        question: null,
        startTime: null,
        solvedCount: 0
      };
    }

    const room = dsaRooms[cleanRoomId];

    // Clean up any stale participant entry with the same userId to handle reconnects cleanly
    for (const [sId, p] of Object.entries(room.participants)) {
      if (p.userId === userId && sId !== socket.id) {
        delete room.participants[sId];
      }
    }

    const participants = Object.values(room.participants);

    // Enforce 3-person limit
    if (participants.length >= 3 && !room.participants[socket.id]) {
      socket.emit("dsa-room-full", { message: "This DSA Room is full (max 3 participants)." });
      return;
    }

    // Join room
    currentDsaRoom = cleanRoomId;
    socket.join(`dsa-${cleanRoomId}`);

    const isHost = participants.length === 0;

    room.participants[socket.id] = {
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

    console.log(`⚔️ User ${username} joined DSA room [${cleanRoomId}] (Host: ${isHost})`);

    // Broadcast room state and updated user list
    io.to(`dsa-${cleanRoomId}`).emit("dsa-lobby-update", {
      roomId: cleanRoomId,
      status: room.status,
      questions: room.questions || [],
      question: room.question,
      startTime: room.startTime,
      participants: Object.values(room.participants)
    });
  });

  socket.on("dsa-start-game", ({ roomId, questions }) => {
    const cleanRoomId = roomId?.toUpperCase();
    const room = dsaRooms[cleanRoomId];
    if (room && room.participants[socket.id]?.isHost) {
      room.status = "playing";
      room.questions = questions || [];
      room.question = questions && questions.length > 0 ? questions[0] : null;
      room.startTime = Date.now();
      room.solvedCount = 0;

      // Initialize questionStatuses for all participants
      for (const p of Object.values(room.participants)) {
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
      }

      io.to(`dsa-${cleanRoomId}`).emit("dsa-game-started", {
        questions: room.questions,
        question: room.question,
        startTime: room.startTime
      });
    }
  });

  socket.on("dsa-status-update", ({ roomId, questionId, progress, status, attempts, passedCount, totalCases }) => {
    const cleanRoomId = roomId?.toUpperCase();
    const room = dsaRooms[cleanRoomId];
    if (room && room.participants[socket.id]) {
      const p = room.participants[socket.id];
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

      io.to(`dsa-${cleanRoomId}`).emit("dsa-lobby-update", {
        roomId: cleanRoomId,
        status: room.status,
        questions: room.questions || [],
        question: room.question,
        startTime: room.startTime,
        participants: Object.values(room.participants)
      });
    }
  });

  socket.on("dsa-code-submit", ({ roomId, questionId, isCorrect, code, passedCount, totalCases }) => {
    const cleanRoomId = roomId?.toUpperCase();
    const room = dsaRooms[cleanRoomId];
    if (room && room.participants[socket.id]) {
      const p = room.participants[socket.id];
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

        io.to(`dsa-${cleanRoomId}`).emit("dsa-user-solved", {
          username: p.username,
          questionId,
          timeTaken: qStatus.timeTaken,
          participants: Object.values(room.participants)
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

      io.to(`dsa-${cleanRoomId}`).emit("dsa-lobby-update", {
        roomId: cleanRoomId,
        status: room.status,
        questions: room.questions || [],
        question: room.question,
        startTime: room.startTime,
        participants: Object.values(room.participants)
      });
    }
  });

  // Handle manual disconnect or connection loss
  socket.on("disconnect", () => {
    if (currentRoom && rooms[currentRoom]) {
      const user = rooms[currentRoom][socket.id];
      delete rooms[currentRoom][socket.id];

      // Broadcast cleanup event to other peers
      socket.to(currentRoom).emit("user-left", {
        socketId: socket.id,
        userId: user?.userId,
        username: user?.username
      });

      console.log(`❌ User left room [${currentRoom}]: ${user?.username} (Socket: ${socket.id})`);

      // Clean up empty room
      if (Object.keys(rooms[currentRoom]).length === 0) {
        delete rooms[currentRoom];
      }
    }

    if (currentDsaRoom && dsaRooms[currentDsaRoom]) {
      const room = dsaRooms[currentDsaRoom];
      const leavingUser = room.participants[socket.id];
      delete room.participants[socket.id];

      console.log(`❌ User left DSA room [${currentDsaRoom}]: ${leavingUser?.username}`);

      const remainingParticipants = Object.values(room.participants);
      if (remainingParticipants.length === 0) {
        delete dsaRooms[currentDsaRoom];
      } else {
        // Migrate host if leaving user was host
        if (leavingUser?.isHost) {
          const nextHostSocketId = Object.keys(room.participants)[0];
          if (nextHostSocketId && room.participants[nextHostSocketId]) {
            room.participants[nextHostSocketId].isHost = true;
          }
        }

        io.to(`dsa-${currentDsaRoom}`).emit("dsa-lobby-update", {
          roomId: currentDsaRoom,
          status: room.status,
          question: room.question,
          startTime: room.startTime,
          participants: remainingParticipants
        });
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`📡 PrepWise WebRTC Mesh Signaling Server is active on port ${PORT}`);
});
