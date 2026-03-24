"use client";

import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { toast } from "sonner";
import DSARoomManager from "./DSARoomManager";

const DSARoomLobby = ({ userId, username, onRoomJoined, onClose }) => {
  const [roomCode, setRoomCode] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [socket, setSocket] = useState(null);
  const [createdRoomCode, setCreatedRoomCode] = useState(null);
  const [showCopyNotice, setShowCopyNotice] = useState(false);
  const [roomActive, setRoomActive] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState(null);
  const [isRoomOwner, setIsRoomOwner] = useState(false);
  const [joinRequestSent, setJoinRequestSent] = useState(false);
  const [approvedMembers, setApprovedMembers] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [notificationBadgeCount, setNotificationBadgeCount] = useState(0);
  const [showPendingPanel, setShowPendingPanel] = useState(false);

  // Initialize Socket.io connection
  useEffect(() => {
    // Determine the correct socket URL based on environment
    let socketUrl = process.env.NEXT_PUBLIC_SOCKET_IO_URL;
    
    if (!socketUrl) {
      // Default based on environment
      if (typeof window !== 'undefined') {
        const isProduction = window.location.hostname !== 'localhost';
        socketUrl = isProduction 
          ? window.location.origin  // Use same domain in production
          : "http://localhost:3001";  // Use localhost in development
      } else {
        socketUrl = "http://localhost:3001";
      }
    }
    
    console.log("[DSA Room] Connecting to socket server:", socketUrl);
    
    const newSocket = io(socketUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      path: "/socket.io/",
      // For Vercel: Use polling as fallback, prefer WebSocket for local
      transports: ["websocket", "polling"],
      // Connection settings for stability
      pingInterval: 25000,  // Send ping every 25 seconds
      pingTimeout: 60000,   // Wait 60 seconds before timeout
      upgradeTimeout: 10000,
    });

    newSocket.on("connect", () => {
      console.log("[DSA Room] Connected to Socket.io server");
      toast.success("Connected to DSA Room server");
    });

    newSocket.on("error", (error) => {
      console.error("[DSA Room] Connection error:", error);
      toast.error("Connection error: " + error);
    });

    newSocket.on("disconnect", () => {
      console.log("[DSA Room] Disconnected from server");
    });

    // Listen for room notifications
    newSocket.on("room_notification", (data) => {
      console.log("[DSA Room] Notification:", data);
      if (data.type === "join_request") {
        // AUTO-SHOW pending panel for join requests
        setShowPendingPanel(true);
        toast.info(
          `🔔 ${data.message}`,
          {
            duration: 5000,
            action: {
              label: "View",
              onClick: () => setShowPendingPanel(true),
            },
          }
        );
        setNotificationBadgeCount(data.pendingCount || 0);
      }
    });

    // Listen for members list updates
    newSocket.on("members_list", (data) => {
      console.log("[DSA Room] Members list updated:", data);
      setApprovedMembers(data.approved || []);
      setPendingRequests(data.pending || []);
      setNotificationBadgeCount(data.pendingCount || 0);
      
      // AUTO-SHOW pending panel if there are pending requests
      if (data.pending && data.pending.length > 0) {
        setShowPendingPanel(true);
      }
      
      // Save pending count to localStorage for TopBar notification badge
      if (data.pendingCount) {
        localStorage.setItem('dsaPendingCount', data.pendingCount.toString());
        window.dispatchEvent(new Event('storage'));
      } else if (data.pendingCount === 0) {
        localStorage.removeItem('dsaPendingCount');
        window.dispatchEvent(new Event('storage'));
      }
    });

    // Listen for member request
    newSocket.on("member_request", (data) => {
      console.log("[DSA Room] New join request:", data);
      // AUTO-SHOW pending panel
      setShowPendingPanel(true);
      toast.info(
        `🔔 ${data.username} wants to join your room`,
        {
          duration: 6000,
          action: {
            label: "Review",
            onClick: () => setShowPendingPanel(true),
          },
        }
      );
    });
    newSocket.on("join_approved", (data) => {
      console.log("[DSA Room] Join approved:", data);
      toast.success("✓ You've been approved! Entering room...");
      setRoomActive(true);
      setCurrentRoomId(data.roomId);
      setIsRoomOwner(false);
    });

    newSocket.on("join_rejected", (data) => {
      console.log("[DSA Room] Join rejected:", data);
      toast.error("Your join request was rejected by the room owner");
      setJoinRequestSent(false);
      setRoomCode("");
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const handleCreateRoom = async () => {
    if (!socket) {
      toast.error("Not connected to server");
      return;
    }

    setIsCreating(true);
    try {
      const code = Math.random().toString(36).substr(2, 5).toUpperCase();
      setCreatedRoomCode(code);

      socket.emit("create_room", {
        userId,
        username: username || `User_${userId.slice(0, 8)}`,
        roomCode: code,
      });

      const handleRoomCreated = (data) => {
        console.log("[DSA Room] Room created:", data);
        toast.success(`Room created! Code: ${code}`);
        setRoomActive(true);
        setCurrentRoomId(data.roomId);
        setIsRoomOwner(true);
        setIsCreating(false);
        socket.off("room_created", handleRoomCreated);
      };

      const handleError = (error) => {
        toast.error(error.message || "Failed to create room");
        setIsCreating(false);
        setCreatedRoomCode(null);
        socket.off("error_response", handleError);
      };

      socket.once("room_created", handleRoomCreated);
      socket.once("error_response", handleError);
    } catch (error) {
      console.error("[DSA Room] Error creating room:", error);
      toast.error("Failed to create room");
      setIsCreating(false);
      setCreatedRoomCode(null);
    }
  };

  const handleJoinRoom = () => {
    if (!socket) {
      toast.error("Not connected to server");
      return;
    }

    if (!roomCode.trim()) {
      toast.error("Please enter a room code");
      return;
    }

    setIsCreating(true);
    try {
      socket.emit("request_join_room", {
        userId,
        username: username || `User_${userId.slice(0, 8)}`,
        roomCode: roomCode.toUpperCase(),
      });

      const handleJoinResponse = (data) => {
        if (data.success) {
          console.log("[DSA Room] Join request sent:", data);
          toast.info("Join request sent! Waiting for owner approval...");
          setJoinRequestSent(true);
          setIsCreating(false);
          setCurrentRoomId(data.roomId);
        } else {
          toast.error(data.message || "Failed to send join request");
          setIsCreating(false);
        }
        socket.off("join_response", handleJoinResponse);
      };

      socket.once("join_response", handleJoinResponse);

      setTimeout(() => {
        socket.off("join_response", handleJoinResponse);
        if (isCreating) {
          toast.error("Join request timeout");
          setIsCreating(false);
        }
      }, 5000);
    } catch (error) {
      console.error("[DSA Room] Error joining room:", error);
      toast.error("Failed to join room");
      setIsCreating(false);
    }
  };

  const copyCode = async () => {
    if (!createdRoomCode) return;

    try {
      await navigator.clipboard.writeText(createdRoomCode);
      setShowCopyNotice(true);
      setTimeout(() => setShowCopyNotice(false), 2000);
      toast.success("Room code copied!");
    } catch (error) {
      toast.error("Failed to copy code");
    }
  };

  const handleApproveMember = (requestId, memberId, memberUsername) => {
    if (!socket) return;

    socket.emit("approve_member", {
      requestId,
      memberId,
      roomId: currentRoomId,
    });

    toast.success(`✓ ${memberUsername} approved!`);
  };

  const handleRejectMember = (requestId) => {
    if (!socket) return;

    socket.emit("reject_member", {
      requestId,
      roomId: currentRoomId,
    });

    toast.info("Member request rejected");
  };

  // Show room manager if active
  if (roomActive && currentRoomId) {
    return (
      <DSARoomManager
        socket={socket}
        roomId={currentRoomId}
        roomCode={createdRoomCode || roomCode}
        userId={userId}
        username={username}
        isOwner={isRoomOwner}
        onGameStart={(data) => {
          if (onRoomJoined) {
            onRoomJoined({
              roomId: currentRoomId,
              roomCode: createdRoomCode || roomCode,
              socket,
              gameStarted: true,
              data,
            });
          }
        }}
      />
    );
  }

  // Waiting for join approval
  if (joinRequestSent && !roomActive) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="text-6xl mb-6 animate-pulse">⏳</div>
            <h1 className="text-3xl font-bold mb-3">Waiting for Approval</h1>
            <p className="text-slate-300 mb-3">
              Your request to join the room has been sent to the room owner.
            </p>
            <p className="text-slate-400 text-sm mb-8">
              Room Code: <span className="font-mono font-bold text-emerald-400">{roomCode}</span>
            </p>
          </div>

          {/* Show live updates about your approval status */}
          <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <span className="text-lg">ℹ️</span>
              <div className="text-sm text-slate-300">
                <p className="font-semibold text-cyan-300 mb-2">What happens next?</p>
                <ul className="space-y-1 text-slate-400 text-xs">
                  <li>✓ Room owner receives a notification</li>
                  <li>✓ You'll receive an email once reviewed</li>
                  <li>✓ Real-time updates will appear below</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Real-time status indicator */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-300">Status</span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse"></span>
                <span className="text-sm text-orange-400 font-semibold">Pending Review</span>
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              setJoinRequestSent(false);
              setRoomCode("");
            }}
            className="w-full px-4 py-2 text-slate-400 hover:text-slate-200 transition border border-slate-700 rounded-lg"
          >
            ← Cancel Request
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-black mb-3">
            🏆 DSA<br />
            <span className="bg-linear-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Room
            </span>
          </h1>
          <p className="text-slate-300 text-sm">
            Real-time multiplayer competitive coding with member verification & owner controls
          </p>
        </div>

        {/* Pending Requests Panel - AUTO-SHOWS when there are requests */}
        {isRoomOwner && pendingRequests.length > 0 && (
          <div className="mb-6 p-6 rounded-2xl border-2 border-orange-700 bg-orange-500/10 animate-in shadow-lg shadow-orange-500/20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2 text-orange-300">
                <span className="text-2xl animate-bounce">🔔</span> Join Requests ({pendingRequests.length})
              </h2>
              <button
                onClick={() => setShowPendingPanel(!showPendingPanel)}
                className="text-slate-400 hover:text-slate-200 transition text-lg"
              >
                {showPendingPanel ? '✕' : '↓'}
              </button>
            </div>

            {showPendingPanel && (
              <div className="space-y-3">
                {pendingRequests.map((request) => (
                  <div
                    key={request.id}
                    className="p-4 bg-slate-800 rounded-lg border border-orange-500/30 flex items-center justify-between hover:border-orange-500 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center font-bold">
                        👤
                      </div>
                      <div>
                        <div className="font-bold text-slate-100">{request.username}</div>
                        <div className="text-xs text-slate-400">Waiting for approval</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApproveMember(request.id, request.userId, request.username)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded text-sm font-bold transition text-white"
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => handleRejectMember(request.id)}
                        className="px-4 py-2 bg-red-600/30 hover:bg-red-600/40 rounded text-sm font-bold transition text-red-300"
                      >
                        ✕ Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Member Status Panel (Owner View) */}
        {isRoomOwner && createdRoomCode && (
          <div className="mb-6 p-6 rounded-2xl border-2 border-cyan-700 bg-cyan-500/5">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span>👥</span> Room Status
            </h2>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-3 bg-slate-800 rounded-lg text-center border border-emerald-500/30">
                <div className="text-2xl font-bold text-emerald-400">{approvedMembers.length + 1}</div>
                <div className="text-xs text-slate-400 mt-1">Members Ready</div>
              </div>
              <div className="p-3 bg-slate-800 rounded-lg text-center border border-orange-500/30">
                <div className="text-2xl font-bold text-orange-400">{pendingRequests.length}</div>
                <div className="text-xs text-slate-400 mt-1">Pending Requests</div>
              </div>
              <div className="p-3 bg-slate-800 rounded-lg text-center border border-cyan-500/30">
                <div className="text-2xl font-bold text-cyan-400">0</div>
                <div className="text-xs text-slate-400 mt-1">In Game</div>
              </div>
            </div>

            {/* Members List */}
            <div className="space-y-2">
              <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/30 flex items-center justify-center text-xs font-bold">👑</div>
                  <div>
                    <div className="font-bold text-slate-100">{username || "You"}</div>
                    <div className="text-xs text-slate-400">Owner</div>
                  </div>
                </div>
                <span className="px-2 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-bold rounded">MANAGING</span>
              </div>

              {approvedMembers.map((member) => (
                <div
                  key={member.userId}
                  className="p-3 bg-slate-800 rounded-lg border border-emerald-500/20 flex items-center justify-between hover:border-emerald-500 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-xs font-bold">✓</div>
                    <div>
                      <div className="font-bold text-slate-100">{member.username}</div>
                      <div className="text-xs text-slate-400">Ready to play</div>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-emerald-500/10 text-emerald-300 text-xs font-bold rounded">READY</span>
                </div>
              ))}
            </div>

            {/* Pending Requests Quick View */}
            {pendingRequests.length > 0 && (
              <div className="mt-4 p-4 bg-orange-500/10 rounded-lg border border-orange-500/30">
                <button
                  onClick={() => setShowPendingPanel(true)}
                  className="w-full text-orange-400 hover:text-orange-300 font-bold transition flex items-center justify-center gap-2"
                >
                  <span className="text-lg animate-pulse">🔔</span>
                  {pendingRequests.length} pending request{pendingRequests.length !== 1 ? 's' : ''} - Click to review
                </button>
              </div>
            )}
          </div>
        )}

        {/* Main Content */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Create Room Card */}
          <div className="group relative p-8 rounded-3xl border-2 border-emerald-700/50 bg-linear-to-br from-emerald-950/40 to-slate-900/60 hover:border-emerald-600 transition-all duration-300">
            {/* Card Glow Effect */}
            <div className="absolute inset-0 rounded-3xl bg-emerald-500/5 group-hover:bg-emerald-500/10 transition-all duration-300" />
            
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-6">
                <div className="text-5xl">🆕</div>
                <span className="px-3 py-1 text-xs font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 rounded-full">NEW</span>
              </div>

              <h2 className="text-2xl font-black mb-2 text-emerald-400">Create New Room</h2>
              <p className="text-slate-300 text-sm mb-6">
                Start a new session. You'll be the room owner and can manage all settings.
              </p>

              {/* Features List */}
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

              {createdRoomCode ? (
                <div className="space-y-4">
                  {/* Room Code Display */}
                  <div className="p-5 bg-slate-800/80 border border-emerald-500/20 rounded-2xl backdrop-blur-sm">
                    <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2">Your Room Code</div>
                    <div className="text-5xl font-mono font-black text-emerald-400 tracking-wider">{createdRoomCode}</div>
                  </div>

                  {/* Copy Button */}
                  <button
                    onClick={copyCode}
                    className={`w-full px-5 py-3 font-bold text-sm rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${
                      showCopyNotice
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white hover:shadow-lg hover:shadow-emerald-500/30'
                    }`}
                  >
                    {showCopyNotice ? (
                      <>
                        <span>✓</span> Copied!
                      </>
                    ) : (
                      <>
                        <span>📋</span> Copy Code
                      </>
                    )}
                  </button>

                  {/* Join Request Badge */}
                  {notificationBadgeCount > 0 && (
                    <button
                      onClick={() => setShowPendingPanel(!showPendingPanel)}
                    className="w-full px-5 py-4 bg-linear-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-bold rounded-xl transition-all duration-300 flex items-center justify-between animate-pulse shadow-lg shadow-orange-500/20"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">🔔</span>
                        <div className="text-left">
                          <div>{notificationBadgeCount} Join Request{notificationBadgeCount !== 1 ? 's' : ''}</div>
                          <div className="text-xs text-orange-100">Click to review</div>
                        </div>
                      </div>
                      <span className="w-6 h-6 bg-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {notificationBadgeCount}
                      </span>
                    </button>
                  )}

                  {/* Info Text */}
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-300 text-center">
                    👥 Total members: <span className="font-bold">{approvedMembers.length + 1}</span> {approvedMembers.length === 0 ? '(just you!)' : ''}
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleCreateRoom}
                  disabled={isCreating}
                  className="w-full px-5 py-4 bg-linear-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
                >
                  {isCreating ? (
                    <>
                      <span className="animate-spin">⚙️</span> Creating Room...
                    </>
                  ) : (
                    <>
                      <span>👑</span> Create as Owner
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Join Room Card */}
          <div className="group relative p-8 rounded-3xl border-2 border-cyan-700/50 bg-linear-to-br from-cyan-950/40 to-slate-900/60 hover:border-cyan-600 transition-all duration-300">
            {/* Card Glow Effect */}
            <div className="absolute inset-0 rounded-3xl bg-cyan-500/5 group-hover:bg-cyan-500/10 transition-all duration-300" />
            
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-6">
                <div className="text-5xl">🚪</div>
                <span className="px-3 py-1 text-xs font-bold text-cyan-300 bg-cyan-500/20 border border-cyan-500/40 rounded-full">JOIN</span>
              </div>

              <h2 className="text-2xl font-black mb-2 text-cyan-400">Join Existing Room</h2>
              <p className="text-slate-300 text-sm mb-6">
                Have a room code? Join and wait for owner verification.
              </p>

              {/* Steps List */}
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
                {/* Room Code Input */}
                <div>
                  <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-2">Room Code</label>
                  <input
                    type="text"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    placeholder="e.g., X9K2L"
                    maxLength="5"
                    disabled={isCreating}
                    className="w-full px-4 py-3 bg-slate-800/80 border-2 border-cyan-700/30 hover:border-cyan-600 focus:border-cyan-500 focus:outline-none rounded-xl text-white placeholder-slate-500 font-mono text-2xl text-center tracking-widest font-bold transition-all duration-300 disabled:opacity-50"
                  />
                </div>

                {/* Request Button */}
                <button
                  onClick={handleJoinRoom}
                  disabled={isCreating || !roomCode.trim()}
                  className={`w-full px-5 py-4 font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 text-lg ${
                    isCreating || !roomCode.trim()
                      ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                      : 'bg-linear-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white hover:shadow-lg hover:shadow-cyan-500/40'
                  }`}
                >
                  {isCreating ? (
                    <>
                      <span className="animate-spin">⏳</span> Requesting...
                    </>
                  ) : (
                    <>
                      <span>📨</span> Request to Join
                    </>
                  )}
                </button>

                {/* Info Text */}
                <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-xs text-cyan-300 text-center">
                  Owner will review and approve your request
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Overview */}
        <div className="grid md:grid-cols-2 gap-6 mt-12 pt-8 border-t border-slate-700/50">
          <h3 className="col-span-full text-xl font-bold text-slate-200 mb-2">✨ Platform Features</h3>
          
          <div className="group p-6 bg-linear-to-br from-purple-950/30 to-slate-900/50 border border-purple-700/30 rounded-2xl hover:border-purple-600 transition-all duration-300">
            <div className="text-4xl mb-3">👥</div>
            <div className="text-sm font-bold text-purple-300">Member Verification</div>
            <div className="text-xs text-slate-400 mt-2">Owner verifies and approves joining members</div>
          </div>

          <div className="group p-6 bg-linear-to-br from-amber-950/30 to-slate-900/50 border border-amber-700/30 rounded-2xl hover:border-amber-600 transition-all duration-300">
            <div className="text-4xl mb-3">🔐</div>
            <div className="text-sm font-bold text-amber-300">Owner Control</div>
            <div className="text-xs text-slate-400 mt-2">Complete room and game settings management</div>
          </div>

          <div className="group p-6 bg-linear-to-br from-pink-950/30 to-slate-900/50 border border-pink-700/30 rounded-2xl hover:border-pink-600 transition-all duration-300">
            <div className="text-4xl mb-3">⏱️</div>
            <div className="text-sm font-bold text-pink-300">Server-Synced Timer</div>
            <div className="text-xs text-slate-400 mt-2">Fair play environment with anti-cheat validation</div>
          </div>

          <div className="group p-6 bg-linear-to-br from-blue-950/30 to-slate-900/50 border border-blue-700/30 rounded-2xl hover:border-blue-600 transition-all duration-300">
            <div className="text-4xl mb-3">📊</div>
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
};

export default DSARoomLobby;
