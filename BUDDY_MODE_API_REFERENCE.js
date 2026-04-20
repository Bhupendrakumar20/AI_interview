// Quick Reference - Human Buddy Mode API Endpoints
// Used by the new HumanBuddySession component

/**
 * CREATE NEW HUMAN BUDDY SESSION
 * POST /api/interview-buddy/create-session
 */
const createSession = async () => {
  const response = await fetch("/api/interview-buddy/create-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: "user123",
      mode: "human",
      topics: ["DSA", "System Design"],
      difficulty: "medium",
      duration: 30,
    }),
  });
  const { sessionId, sessionCode } = await response.json();
  // Use sessionCode to share with buddy
  // sessionId used for socket events
};

/**
 * JOIN EXISTING HUMAN BUDDY SESSION
 * POST /api/interview-buddy/join-session
 */
const joinSession = async (sessionCode) => {
  const response = await fetch("/api/interview-buddy/join-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: "user456",
      sessionCode: "IB-7X4K9",
    }),
  });
  const { sessionId, sessionCode } = await response.json();
  // Now use sessionId to connect to WebSocket
};

/**
 * MAIN SOCKET EVENTS FOR HUMAN BUDDY MODE
 */

// 1. CONNECT TO /interview-buddy namespace
const socket = io(socketUrl, {
  path: "/socket.io/",
  transports: ["websocket", "polling"],
});

// 2. JOIN SESSION (Both creator and joiner do this)
socket.emit("join_session", {
  userId: "user123",
  username: "John Doe",
  sessionCode: "IB-7X4K9",
  isCreator: true, // true if owner, false if joining
});

// 3. LISTEN FOR SESSION JOINED EVENT
socket.on("session_joined", (data) => {
  console.log("Participants:", data.participants); // array of user IDs
  console.log("My role:", data.role); // 'owner', 'interviewer', 'interviewee', or 'waiting'
  console.log("Session data:", data.sessionData);
  
  // Now:
  // - Initialize local camera/mic
  // - Setup WebRTC
  // - Show role assignment UI (if owner)
});

// 4. ASSIGN ROLE (Owner only)
socket.emit("assign_role", {
  targetUserId: "user456",
  role: "interviewer", // or 'interviewee'
});

// 5. TOGGLE CAMERA/MIC
socket.emit("toggle_camera", {
  userId: "user123",
  sessionId: "session123",
  enabled: true,
});

socket.emit("toggle_mic", {
  userId: "user123",
  sessionId: "session123",
  enabled: true,
});

// 6. SCREEN SHARING
socket.emit("start_screenshare", {
  userId: "user123",
  sessionId: "session123",
});

socket.emit("stop_screenshare", {
  userId: "user123",
  sessionId: "session123",
});

// 7. WEBRTC SIGNALING (Automatic in component)
socket.emit("webrtc_offer", {
  offer: rtcOffer,
  targetUserId: "user456",
});

socket.emit("webrtc_answer", {
  answer: rtcAnswer,
  targetUserId: "user456",
});

socket.emit("ice_candidate", {
  candidate: iceCandidate,
  targetUserId: "user456",
});

// 8. SHARED NOTES
socket.emit("update_notes", {
  sessionId: "session123",
  content: "Session notes here...",
  timestamp: new Date().toISOString(),
});

// 9. END SESSION
socket.emit("end_session", {
  sessionId: "session123",
  feedback: {
    clarity: 85,
    technicalAccuracy: 80,
    communication: 88,
    confidence: 82,
  },
});

// ============================================================================
// LISTENING FOR EVENTS FROM PEERS
// ============================================================================

// User joined
socket.on("user_joined_session", (data) => {
  console.log(`${data.username} joined`);
  console.log(`Members: ${data.participantCount}/${data.totalParticipants}`);
});

// Role assigned
socket.on("role_assigned", (data) => {
  console.log(`${data.targetUserId} is now ${data.role}`);
});

// Peer toggled camera
socket.on("camera_toggled", (data) => {
  console.log(`${data.userId} camera: ${data.enabled ? 'ON' : 'OFF'}`);
  // Update peer's video indicator
});

// Peer toggled mic
socket.on("mic_toggled", (data) => {
  console.log(`${data.userId} mic: ${data.enabled ? 'ON' : 'OFF'}`);
  // Update peer's audio indicator
});

// Peer started screen share
socket.on("screenshare_started", (data) => {
  console.log(`${data.userId} started sharing screen`);
  // Show screen video stream
});

// Peer stopped screen share
socket.on("screenshare_stopped", (data) => {
  console.log(`${data.userId} stopped screen share`);
  // Hide screen video stream
});

// WebRTC signals from peer
socket.on("webrtc_offer_received", (data) => {
  // data.offer - RTCSessionDescription
  // data.from - Peer user ID
  // Handle in HumanBuddySession.jsx
});

socket.on("webrtc_answer_received", (data) => {
  // data.answer - RTCSessionDescription
  // data.from - Peer user ID
  // Handle in HumanBuddySession.jsx
});

socket.on("ice_candidate_received", (data) => {
  // data.candidate - RTCIceCandidate
  // data.from - Peer user ID
  // Handle in HumanBuddySession.jsx
});

// Notes synced from peer
socket.on("notes_updated", (data) => {
  console.log("Notes updated:", data.content);
  console.log("Updated by:", data.updatedBy);
  // Update shared notes display
});

// Session ended
socket.on("session_ended", (data) => {
  console.log(`Session ended by ${data.endedBy}`);
  console.log(`Reason: ${data.reason}`);
  // Cleanup WebRTC, close component
});

// Peer disconnected
socket.on("user_disconnected", (data) => {
  console.log(`${data.username} disconnected`);
  // Show disconnection message
});

// Error handling
socket.on("error", (data) => {
  console.error("Socket error:", data.message);
  // Handle: "Room is full", "Invalid role", "Unauthorized", etc.
});

/**
 * FIRESTORE COLLECTION STRUCTURE
 * interview_buddy_sessions/{sessionId}
 * 
 * {
 *   createdBy: "user123",
 *   mode: "human",
 *   sessionCode: "IB-7X4K9",
 *   participants: ["user123", "user456"],
 *   participants_user123: {
 *     joinedAt: Timestamp,
 *     role: "owner",
 *     name: "John Doe",
 *     camera: true,
 *     mic: true,
 *     screenShare: false
 *   },
 *   participants_user456: {
 *     joinedAt: Timestamp,
 *     role: "interviewer",
 *     name: "Jane Smith",
 *     camera: true,
 *     mic: false,
 *     screenShare: false
 *   },
 *   topics: ["DSA", "System Design"],
 *   difficulty: "medium",
 *   duration: 30,
 *   status: "in_progress",
 *   sharedNotes: "Session notes...",
 *   startTime: Timestamp,
 *   endTime: Timestamp,
 *   createdAt: Timestamp,
 *   updatedAt: Timestamp
 * }
 */

// ============================================================================
// WEBRTC SETUP (Automatic in HumanBuddySession component)
// ============================================================================

const setupPeerConnection = async (localStream) => {
  const peerConnection = new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  });

  // Add local tracks
  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  // Handle remote stream
  peerConnection.ontrack = (event) => {
    remoteVideoElement.srcObject = event.streams[0];
  };

  // ICE candidates
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("ice_candidate", {
        candidate: event.candidate,
        targetUserId: peerId,
      });
    }
  };

  // Data channel for notes
  const dataChannel = peerConnection.createDataChannel("notes");
  dataChannel.onmessage = (event) => {
    updateSharedNotes(event.data);
  };

  // Create offer
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  socket.emit("webrtc_offer", { offer, targetUserId: peerId });

  return peerConnection;
};
