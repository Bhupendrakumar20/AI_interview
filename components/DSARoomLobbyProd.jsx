/**
 * DSA Room Lobby — Complete Setup & Voting Phase
 * ──────────────────────────────────────────────
 * Room creation, joining, voting on game settings, and transition to live room
 * 
 * CRITICAL FIX: Ensures both owner and non-owner can enter the live room
 * by guaranteeing socket connection, listener registration, and proper event handling
 */

import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import DSALiveRoom from "./DSALiveRoom";

let socketInstance = null;
let socketInitialized = false;

function getSocket() {
  if (!socketInstance) {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_IO_URL || "http://localhost:4001";
    console.log("🔌 [INIT] Creating socket connection to:", socketUrl);
    
    socketInstance = io(socketUrl, {
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
      transports: ["websocket", "polling"],
      forceNew: false,
    });
  }
  return socketInstance;
}

export default function DSARoomLobby({ userId, userName, onClose }) {
  // Tab state
  const [activeTab, setActiveTab] = useState("create"); // 'create' | 'join'

  // Lobby state
  const [createdRoomCode, setCreatedRoomCode] = useState("");
  const [joinRoomCode, setJoinRoomCode] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  // Live room state
  const [roomCode, setRoomCode] = useState("");
  const [isInRoom, setIsInRoom] = useState(false);
  const [roomStatus, setRoomStatus] = useState("lobby"); // 'lobby' | 'voting' | 'active' | 'review'
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isHost, setIsHost] = useState(false);

  // Voting state
  const [questionModeVotes, setQuestionModeVotes] = useState({});
  const [timeLimitVotes, setTimeLimitVotes] = useState({});
  const [myQuestionModeVote, setMyQuestionModeVote] = useState("");
  const [myTimeLimitVote, setMyTimeLimitVote] = useState("");

  // Socket state
  const [socketError, setSocketError] = useState(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  const socket = getSocket();
  const listenerSetupRef = useRef(false);

  // ─────────────────────────────────────────────────────────────────────
  // CRITICAL: Setup socket event listeners on component mount
  // This runs ONCE and sets up listeners BEFORE any room operations
  // ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (listenerSetupRef.current) return; // Only setup listeners ONCE
    listenerSetupRef.current = true;

    console.log("🎯 [SETUP] Registering all socket event listeners...");

    const handleConnect = () => {
      console.log("✅ [CONNECT] Socket connected:", socket.id);
      setIsSocketConnected(true);
      setSocketError(null);
    };

    const handleDisconnect = (reason) => {
      console.warn("⚠️ [DISCONNECT] Socket disconnected:", reason);
      setIsSocketConnected(false);
    };

    const handleConnectError = (error) => {
      console.error("❌ [ERROR] Socket connection error:", error);
      setSocketError(String(error) || "Failed to connect to DSA Room server");
    };

    // ✅ CRITICAL: Lobby update listener
    const handleLobbyUpdate = ({ users: u }) => {
      console.log("[LOBBY] Users updated:", u?.length || 0, "users");
      setUsers(u || []);
    };

    // ✅ CRITICAL: Vote update listener
    const handleVoteUpdate = ({ questionModeVotes: qv, timeLimitVotes: tv }) => {
      console.log("[VOTE] Vote update received");
      setQuestionModeVotes(qv || {});
      setTimeLimitVotes(tv || {});
    };

    // ✅ CRITICAL: room_started event listener - BOTH OWNER AND NON-OWNER
    // This is the KEY event that triggers transition to DSALiveRoom
    const handleRoomStarted = (data) => {
      console.log("🎮 [ROOM_STARTED] ✅✅✅ GAME STARTING EVENT RECEIVED ✅✅✅", data);
      console.log("   → Setting roomStatus to 'active'");
      console.log("   → Non-owner should now see DSALiveRoom");
      setRoomStatus("active");
    };

    const handleUserLeft = ({ users: u }) => {
      console.log("[USER_LEFT] User left, updated users:", u?.length || 0);
      setUsers(u || []);
    };

    const handleHostTransferred = ({ newHostId }) => {
      console.log("[HOST_TRANSFER] New host:", newHostId);
      setIsHost(newHostId === socket.id);
    };

    // ✅ REGISTER ALL LISTENERS NOW - before socket.connect()
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("lobby_update", handleLobbyUpdate);
    socket.on("vote_update", handleVoteUpdate);
    socket.on("room_started", handleRoomStarted);
    socket.on("user_left", handleUserLeft);
    socket.on("host_transferred", handleHostTransferred);

    console.log("✅ [SETUP] All listeners registered successfully");

    // Check if already connected
    if (socket.connected) {
      console.log("ℹ️ [INFO] Socket already connected");
      setIsSocketConnected(true);
    }

    // Cleanup on unmount
    return () => {
      console.log("🧹 [CLEANUP] Removing all socket listeners");
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("lobby_update", handleLobbyUpdate);
      socket.off("vote_update", handleVoteUpdate);
      socket.off("room_started", handleRoomStarted);
      socket.off("user_left", handleUserLeft);
      socket.off("host_transferred", handleHostTransferred);
      listenerSetupRef.current = false;
    };
  }, [socket]); // Only depend on socket instance

  // ── CREATE ROOM ──────────────────────────────────────────────────────────────
  const handleCreateRoom = async () => {
    setIsCreating(true);
    setSocketError(null);
    
    try {
      console.log("📝 [CREATE] Starting room creation...");

      // Step 1: Ensure socket is connected
      if (!socket.connected) {
        console.log("🔌 [CREATE] Socket not connected, connecting now...");
        socket.connect();
        
        // Wait for connection with timeout
        await new Promise((resolve, reject) => {
          const connectTimer = setTimeout(() => {
            console.error("❌ [CREATE] Socket connection timeout");
            reject(new Error("Socket connection timeout"));
          }, 5000);

          const onConnect = () => {
            clearTimeout(connectTimer);
            console.log("✅ [CREATE] Socket connected, socket.id:", socket.id);
            socket.off("connect", onConnect);
            socket.off("connect_error", onError);
            resolve();
          };

          const onError = (error) => {
            clearTimeout(connectTimer);
            console.error("❌ [CREATE] Connection error:", error);
            socket.off("connect", onConnect);
            socket.off("connect_error", onError);
            reject(error);
          };

          socket.on("connect", onConnect);
          socket.on("connect_error", onError);
        });
      } else {
        console.log("ℹ️ [CREATE] Socket already connected");
      }

      // Step 2: Emit room_create event
      console.log("📡 [CREATE] Emitting room_create...");
      socket.emit("room_create", { 
        username: userName, 
        avatar: "[U]", 
        userId 
      }, (response) => {
        if (response && response.success) {
          console.log("✅ [CREATE] Room created! Code:", response.roomCode);
          setRoomCode(response.roomCode);
          setCreatedRoomCode(response.roomCode);
          setIsInRoom(true);
          setIsHost(true);
          setCurrentUser({ username: userName, id: socket.id });
          setSocketError(null);
        } else {
          const errorMsg = response?.error || "Failed to create room";
          console.error("❌ [CREATE] Failed:", errorMsg);
          setSocketError(errorMsg);
        }
        setIsCreating(false);
      });
    } catch (error) {
      const errorMsg = String(error) || "Failed to connect and create room";
      console.error("❌ [CREATE] Error:", errorMsg);
      setSocketError(errorMsg);
      setIsCreating(false);
    }
  };

  // ── JOIN ROOM ────────────────────────────────────────────────────────────────
  const handleJoinRoom = async () => {
    if (!joinRoomCode.trim()) {
      setSocketError("Please enter a room code");
      return;
    }
    
    setIsJoining(true);
    setSocketError(null);

    try {
      console.log("📝 [JOIN] Starting room join for code:", joinRoomCode);

      // Step 1: Ensure socket is connected
      if (!socket.connected) {
        console.log("🔌 [JOIN] Socket not connected, connecting now...");
        socket.connect();

        // Wait for connection with timeout
        await new Promise((resolve, reject) => {
          const connectTimer = setTimeout(() => {
            console.error("❌ [JOIN] Socket connection timeout");
            reject(new Error("Socket connection timeout"));
          }, 5000);

          const onConnect = () => {
            clearTimeout(connectTimer);
            console.log("✅ [JOIN] Socket connected, socket.id:", socket.id);
            socket.off("connect", onConnect);
            socket.off("connect_error", onError);
            resolve();
          };

          const onError = (error) => {
            clearTimeout(connectTimer);
            console.error("❌ [JOIN] Connection error:", error);
            socket.off("connect", onConnect);
            socket.off("connect_error", onError);
            reject(error);
          };

          socket.on("connect", onConnect);
          socket.on("connect_error", onError);
        });
      } else {
        console.log("ℹ️ [JOIN] Socket already connected");
      }

      // Step 2: Emit room_join event
      console.log("📡 [JOIN] Emitting room_join for code:", joinRoomCode);
      socket.emit("room_join", { 
        roomCode: joinRoomCode, 
        username: userName, 
        avatar: "[U]", 
        userId 
      }, (response) => {
        if (response && response.success) {
          console.log("✅ [JOIN] Successfully joined room!", joinRoomCode);
          console.log("   → socket.data.roomCode should now be set on server");
          console.log("   → Waiting for owner to start game...");
          setRoomCode(joinRoomCode);
          setIsInRoom(true);
          setUsers(response.lobbyState?.users || []);
          setIsHost(response.lobbyState?.hostId === socket.id);
          setCurrentUser({ username: userName, id: socket.id });
          setSocketError(null);
        } else {
          const errorMsg = response?.error || "Failed to join room";
          console.error("❌ [JOIN] Failed:", errorMsg);
          setSocketError(errorMsg);
        }
        setIsJoining(false);
      });
    } catch (error) {
      const errorMsg = String(error) || "Failed to connect and join room";
      console.error("❌ [JOIN] Error:", errorMsg);
      setSocketError(errorMsg);
      setIsJoining(false);
    }
  };

  // ── CAST VOTE ────────────────────────────────────────────────────────────────
  const handleVote = (type, value) => {
    if (type === "questionMode") {
      setMyQuestionModeVote(value);
    } else if (type === "timeLimit") {
      setMyTimeLimitVote(value);
    }
    socket.emit("cast_vote", { type, value });
  };

  // ── START ROOM ───────────────────────────────────────────────────────────────
  const handleStartRoom = () => {
    if (users.length < 2) {
      alert("Need at least 2 players to start");
      return;
    }
    socket.emit("room_start", {}, (response) => {
      if (!response.success) {
        alert("Failed to start: " + response.error);
      }
    });
  };

  // ── LIVE ROOM VIEW ────────────────────────────────────────────────────────────
  if (isInRoom && roomStatus === "active") {
    return <DSALiveRoom roomCode={roomCode} username={userName} userId={currentUser?.id} />;
  }

  // ── LOBBY VIEW ────────────────────────────────────────────────────────────────
  if (!isInRoom) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-black text-white mb-2">⚔ DSA Room</h1>
            <p className="text-slate-400">Real-time competitive coding with friends</p>
          </div>

          {/* Connection Status Alert */}
          {socketError && (
            <div className="mb-6 p-4 bg-red-950/50 border border-red-700 rounded-lg">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div className="flex-1">
                  <h3 className="text-red-300 font-bold mb-1">Connection Error</h3>
                  <p className="text-red-200 text-sm">{socketError}</p>
                  <p className="text-red-300 text-xs mt-2">
                    Make sure the DSA Room server is running. Check your internet connection or try again later.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Socket Status Indicator */}
          <div className="mb-6 flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isSocketConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
            <span className={`text-sm font-medium ${isSocketConnected ? "text-green-400" : "text-red-400"}`}>
              {isSocketConnected ? "✓ Connected to DSA Server" : "✗ Disconnected from DSA Server"}
            </span>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="group relative p-8 rounded-3xl border-2 border-emerald-700/50 bg-linear-to-br from-emerald-950/40 to-slate-900/60 hover:border-emerald-600 transition-all duration-300">
              <div className="absolute inset-0 rounded-3xl bg-emerald-500/5 group-hover:bg-emerald-500/10 transition-all duration-300" />

              <div className="relative z-10">
                <div className="flex items-start justify-between mb-6">
                  <div className="text-5xl">◆</div>
                  <span className="px-3 py-1 text-xs font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 rounded-full">
                    CREATE
                  </span>
                </div>

                <h2 className="text-2xl font-black mb-2 text-emerald-400">Create New Room</h2>
                <p className="text-slate-300 text-sm mb-6">
                  Start a new session. You'll be the room owner and manage all settings.
                </p>

                <ul className="space-y-3 mb-8">
                  <li className="flex items-start gap-3 text-sm text-slate-300">
                    <span className="text-emerald-400 font-bold shrink-0">✓</span>
                    <span>Approve/reject member join requests</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-slate-300">
                    <span className="text-emerald-400 font-bold shrink-0">✓</span>
                    <span>See who's requesting and who's in the room</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-slate-300">
                    <span className="text-emerald-400 font-bold shrink-0">✓</span>
                    <span>Choose question mode (same/different)</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-slate-300">
                    <span className="text-emerald-400 font-bold shrink-0">✓</span>
                    <span>Start the game when ready</span>
                  </li>
                </ul>

                <button
                  onClick={handleCreateRoom}
                  disabled={isCreating}
                  className="w-full px-5 py-4 bg-linear-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
                >
                  {isCreating ? (
                    <>
                      <span className="animate-spin">⊙</span> Creating Room...
                    </>
                  ) : (
                    <>
                      <span>Owner</span> Create as Owner
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Join Room Card */}
            <div className="group relative p-8 rounded-3xl border-2 border-cyan-700/50 bg-linear-to-br from-cyan-950/40 to-slate-900/60 hover:border-cyan-600 transition-all duration-300">
              <div className="absolute inset-0 rounded-3xl bg-cyan-500/5 group-hover:bg-cyan-500/10 transition-all duration-300" />

              <div className="relative z-10">
                <div className="flex items-start justify-between mb-6">
                  <div className="text-5xl">✫</div>
                  <span className="px-3 py-1 text-xs font-bold text-cyan-300 bg-cyan-500/20 border border-cyan-500/40 rounded-full">
                    JOIN
                  </span>
                </div>

                <h2 className="text-2xl font-black mb-2 text-cyan-400">Join Existing Room</h2>
                <p className="text-slate-300 text-sm mb-6">
                  Have a room code? Join and wait for owner verification.
                </p>

                <ul className="space-y-3 mb-8">
                  <li className="flex items-start gap-3 text-sm text-slate-300">
                    <span className="text-cyan-400 font-bold shrink-0">✓</span>
                    <span>Enter room code from owner</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-slate-300">
                    <span className="text-cyan-400 font-bold shrink-0">✓</span>
                    <span>Your username is verified automatically</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-slate-300">
                    <span className="text-cyan-400 font-bold shrink-0">✓</span>
                    <span>Wait for owner to approve your request</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-slate-300">
                    <span className="text-cyan-400 font-bold shrink-0">✓</span>
                    <span>Join game when owner starts</span>
                  </li>
                </ul>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-2">
                      Room Code
                    </label>
                    <input
                      type="text"
                      value={joinRoomCode}
                      onChange={(e) => setJoinRoomCode(e.target.value.toUpperCase())}
                      placeholder="e.g., X9K2L"
                      maxLength="8"
                      disabled={isCreating}
                      className="w-full px-4 py-3 bg-slate-800/80 border-2 border-cyan-700/30 hover:border-cyan-600 focus:border-cyan-500 focus:outline-none rounded-xl text-white placeholder-slate-500 font-mono text-2xl text-center tracking-widest font-bold transition-all duration-300 disabled:opacity-50"
                    />
                  </div>

                  <button
                    onClick={handleJoinRoom}
                    disabled={isCreating || !joinRoomCode.trim()}
                    className={`w-full px-5 py-4 font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 text-lg ${
                      isCreating || !joinRoomCode.trim()
                        ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                        : "bg-linear-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white hover:shadow-lg hover:shadow-cyan-500/40"
                    }`}
                  >
                    {isJoining ? (
                      <>
                        <span className="animate-spin">⏳</span> Requesting...
                      </>
                    ) : (
                      <>
                        <span>→</span> Request to Join
                      </>
                    )}
                  </button>

                  <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-xs text-cyan-300 text-center">
                    Owner will review and approve your request
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Features Overview */}
          <div className="grid md:grid-cols-2 gap-6 mt-12 pt-8 border-t border-slate-700/50">
            <h3 className="col-span-full text-xl font-bold text-slate-200 mb-2">Platform Features</h3>

            <div className="group p-6 bg-linear-to-br from-purple-950/30 to-slate-900/50 border border-purple-700/30 rounded-2xl hover:border-purple-600 transition-all duration-300">
              <div className="text-4xl mb-3">◉</div>
              <div className="text-sm font-bold text-purple-300">Member Verification</div>
              <div className="text-xs text-slate-400 mt-2">
                Owner verifies and approves joining members
              </div>
            </div>

            <div className="group p-6 bg-linear-to-br from-amber-950/30 to-slate-900/50 border border-amber-700/30 rounded-2xl hover:border-amber-600 transition-all duration-300">
              <div className="text-4xl mb-3">◊</div>
              <div className="text-sm font-bold text-amber-300">Owner Control</div>
              <div className="text-xs text-slate-400 mt-2">Complete room and game settings management</div>
            </div>

            <div className="group p-6 bg-linear-to-br from-pink-950/30 to-slate-900/50 border border-pink-700/30 rounded-2xl hover:border-pink-600 transition-all duration-300">
              <div className="text-4xl mb-3">⧖</div>
              <div className="text-sm font-bold text-pink-300">Server-Synced Timer</div>
              <div className="text-xs text-slate-400 mt-2">Fair play environment with anti-cheat validation</div>
            </div>

            <div className="group p-6 bg-linear-to-br from-blue-950/30 to-slate-900/50 border border-blue-700/30 rounded-2xl hover:border-blue-600 transition-all duration-300">
              <div className="text-4xl mb-3">≫</div>
              <div className="text-sm font-bold text-blue-300">Live Leaderboard</div>
              <div className="text-xs text-slate-400 mt-2">Real-time rankings and scoring during gameplay</div>
            </div>
          </div>

          {/* Close Button */}
          {onClose && (
            <button
              onClick={onClose}
              className="w-full mt-6 px-4 py-2 text-slate-400 hover:text-slate-200 text-sm transition"
            >
              ← Back to Interview Buddy
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── VOTING PHASE VIEW ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Voting Phase</h1>
          <p className="text-slate-400">Room: {roomCode}</p>
        </div>

        {/* Players List */}
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-bold text-white mb-4">Players ({users.length})</h2>
          <div className="space-y-2">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded">
                <span>{u.id === currentUser?.id ? "[Me]" : "[U]"}</span>
                <span className="flex-1">{u.username}</span>
                {u.id === currentUser?.id && <span className="text-xs text-blue-400">YOU</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Voting Options */}
        <div className="space-y-6">
          {/* Question Mode Vote */}
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
            <h3 className="text-lg font-bold text-white mb-4">Question Mode</h3>
            <div className="grid grid-cols-2 gap-4">
              {["same", "different"].map((mode) => (
                <button
                  key={mode}
                  onClick={() => handleVote("questionMode", mode)}
                  className={`p-4 rounded-lg border-2 transition ${
                    myQuestionModeVote === mode
                      ? "border-blue-500 bg-blue-500/20 text-blue-300"
                      : "border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600"
                  }`}
                >
                  <div className="font-bold capitalize">{mode}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    {mode === "same" ? "Everyone solves the same problem" : "Everyone gets different problems"}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Time Limit Vote */}
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
            <h3 className="text-lg font-bold text-white mb-4">Time Limit</h3>
            <div className="grid grid-cols-3 gap-4">
              {["1800", "2700", "3600"].map((time) => (
                <button
                  key={time}
                  onClick={() => handleVote("timeLimit", time)}
                  className={`p-4 rounded-lg border-2 transition ${
                    myTimeLimitVote === time
                      ? "border-green-500 bg-green-500/20 text-green-300"
                      : "border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600"
                  }`}
                >
                  <div className="font-bold">{Math.floor(parseInt(time) / 60)} min</div>
                  <div className="text-xs text-slate-400 mt-1">{time}s</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Start Button */}
        {isHost && (
          <button
            onClick={handleStartRoom}
            className="w-full mt-8 px-6 py-3 bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-lg transition"
          >
            Start Game
          </button>
        )}

        {!isHost && (
          <div className="w-full mt-8 px-6 py-3 bg-slate-800 text-slate-400 text-center rounded-lg">
            Waiting for host to start the game...
          </div>
        )}
      </div>
    </div>
  );
}
