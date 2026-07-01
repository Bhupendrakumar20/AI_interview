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

io.on("connection", (socket) => {
  let currentRoom = null;

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
  });
});

server.listen(PORT, () => {
  console.log(`📡 PrepWise WebRTC Mesh Signaling Server is active on port ${PORT}`);
});
