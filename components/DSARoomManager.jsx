"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";

const DSARoomManager = ({ 
  socket, 
  roomId, 
  roomCode, 
  userId, 
  username, 
  isOwner,
  onGameStart 
}) => {
  const [members, setMembers] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [questionMode, setQuestionMode] = useState("same"); // same or different
  const [startCountdown, setStartCountdown] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [showLoadingArena, setShowLoadingArena] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [showCopyNotice, setShowCopyNotice] = useState(false);
  const [submissionFeed, setSubmissionFeed] = useState([]);
  const [gameActivity, setGameActivity] = useState([]);

  // Listen for member updates
  useEffect(() => {
    if (!socket) return;

    socket.on("members_list", (data) => {
      console.log("[DSA Room] Members list:", data);
      setMembers(data.approved || []);
      setPendingRequests(data.pending || []);
      setPendingApprovals(data.pending || []);
    });

    socket.on("room_state", (data) => {
      console.log("[DSA Room] Room state:", data);
      if (data.success) {
        setMembers(data.members || []);
        setPendingRequests(data.pending || []);
        setPendingApprovals(data.pending || []);
      }
    });

    socket.on("member_joined", (data) => {
      console.log("[DSA Room] New member:", data);
      setMembers((prev) => [...prev, data]);
      toast.success(`${data.username} joined the room`);
    });

    socket.on("member_request", (data) => {
      console.log("[DSA Room] Member request:", data);
      setPendingRequests((prev) => [...prev, data]);
      toast.info(`${data.username} requests to join`);
    });

    socket.on("game_starting", (data) => {
      console.log("[DSA Room] Game starting:", data);
      setGameStarted(true);
      setQuestions(data.questions || []);
      setLeaderboard(data.leaderboard || []);
      if (onGameStart) onGameStart(data);
    });

    socket.on("leaderboard_update", (data) => {
      console.log("[DSA Room] Leaderboard update:", data);
      if (data.leaderboard && Array.isArray(data.leaderboard)) {
        // Update leaderboard with sorted data
        setLeaderboard(data.leaderboard);
        
        // Show toast notification for updated player
        if (data.updatedPlayer) {
          const player = data.updatedPlayer;
          if (player.status === "completed") {
            toast.success(`🎉 ${player.username} solved! +${player.points} pts`, {
              duration: 3000,
            });
          }
        }
      }
    });

    socket.on("submission_notification", (data) => {
      console.log("[DSA Room] Submission notification:", data);
      if (data.type === "success") {
        toast.success(data.message, { duration: 5000 });
        // Add to activity feed
        setGameActivity((prev) => [
          {
            id: `${Date.now()}_${Math.random()}`,
            type: "success",
            message: data.message,
            timestamp: new Date(),
            icon: data.icon,
          },
          ...prev,
        ].slice(0, 10)); // Keep last 10 activities
      } else {
        // Quiet notification for wrong submissions
        setGameActivity((prev) => [
          {
            id: `${Date.now()}_${Math.random()}`,
            type: "attempt",
            message: data.message,
            timestamp: new Date(),
            icon: data.icon,
          },
          ...prev,
        ].slice(0, 10));
      }
    });

    return () => {
      socket.off("members_list");
      socket.off("member_joined");
      socket.off("member_request");
      socket.off("game_starting");
      socket.off("leaderboard_update");
      socket.off("submission_notification");
      socket.off("room_state");
    };
  }, [socket, onGameStart]);

  // Request room state when entering room (for newly approved members)
  useEffect(() => {
    if (!socket || !roomId) return;
    console.log("[DSA Room] Requesting room state for:", roomId);
    socket.emit("get_room_state", { roomId });
  }, [socket, roomId]);

  // Start countdown when owner initiates
  useEffect(() => {
    if (startCountdown === null || startCountdown === undefined) return;
    
    if (startCountdown <= 0) {
      // Countdown complete - fully transition to game
      console.log("[DSA Room] Countdown complete, entering arena");
      // Make sure gameStarted is true even if socket event hasn't fired
      setStartCountdown(null); // Reset countdown
      return;
    }

    const timer = setTimeout(() => {
      setStartCountdown((prev) => {
        if (prev === null || typeof prev !== 'number') return null;
        return prev - 1;
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [startCountdown]);

  useEffect(() => {
    if (gameStarted && startCountdown === null) {
      // Game started and countdown is done - show arena
      setShowLoadingArena(true);
    }
  }, [gameStarted, startCountdown]);

  // Fallback: If countdown reaches 0 but gameStarted hasn't been set, set it now
  useEffect(() => {
    if (startCountdown === null && !gameStarted) {
      // Countdown finished but gameStarted event might not have fired
      const fallbackTimer = setTimeout(() => {
        console.log("[DSA Room] Fallback: Forcing game started after countdown");
        setGameStarted(true);
      }, 500);
      return () => clearTimeout(fallbackTimer);
    }
  }, [startCountdown, gameStarted]);

  const handleApproveMember = (requestId, memberId, memberUsername) => {
    if (!socket) return;

    socket.emit("approve_member", {
      requestId,
      memberId,
      roomId,
    });

    setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
    setMembers((prev) => [
      ...prev,
      { userId: memberId, username: memberUsername, joinedAt: new Date() },
    ]);
    toast.success(`${memberUsername} approved!`);
  };

  const handleRejectMember = (requestId) => {
    if (!socket) return;

    socket.emit("reject_member", {
      requestId,
      roomId,
    });

    setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
    toast.info("Member request rejected");
  };

  const handleStartGame = () => {
    if (!socket || !isOwner) return;
    
    // Count total players: owner + approved members
    const totalPlayers = members.length + 1; // +1 for owner
    
    if (totalPlayers < 2) {
      toast.error("Need at least 2 players to start");
      return;
    }

    socket.emit("start_game", {
      roomId,
      questionMode,
      startTime: Date.now(),
    });

    setStartCountdown(5); // 5 second countdown
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setShowCopyNotice(true);
      setTimeout(() => setShowCopyNotice(false), 2000);
      toast.success("Room code copied!");
    } catch (error) {
      toast.error("Failed to copy code");
    }
  };

  // Game view
  if (gameStarted) {
    // Show countdown screen
    if (startCountdown !== null && startCountdown > 0) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-slate-100 p-6 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-6xl font-black mb-6 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              ⚔️ BABYLON DSA
            </h1>
            <div className="text-9xl font-mono font-black text-cyan-400 mb-8 animate-pulse">
              {startCountdown}
            </div>
            <p className="text-2xl font-bold text-purple-300 mb-4">Get Ready for Battle!</p>
            <div className="flex items-center justify-center gap-2 text-emerald-400 font-bold">
              <span className="animate-spin">⚡</span>
              <span>Starting Arena in {startCountdown} seconds...</span>
              <span className="animate-spin">⚡</span>
            </div>
          </div>
        </div>
      );
    }

    // Loading screen after countdown
    if (!showLoadingArena) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-slate-100 p-6 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-6 animate-spin">⚔️</div>
            <h2 className="text-3xl font-black text-cyan-400 mb-4">ENTERING ARENA...</h2>
            <p className="text-slate-400">Loading your battle arena...</p>
          </div>
        </div>
      );
    }

    // Actual game arena view
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-slate-100 p-6">
        {/* Header */}
        <div className="max-w-7xl mx-auto mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-black bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                ⚔️ BABYLON DSA ARENA
              </h1>
              <p className="text-cyan-300/70 text-sm mt-2">Real-time algorithmic combat</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-mono font-bold text-emerald-400 font-black">
                22:55
              </div>
              <div className="text-xs text-emerald-300">TIME REMAINING</div>
            </div>
          </div>
        </div>

        <div className="flex gap-6 max-w-7xl mx-auto">
          {/* Questions Panel */}
          <div className="flex-1 bg-gradient-to-br from-slate-900/80 to-slate-900/40 rounded-2xl border border-cyan-500/30 p-6 backdrop-blur-sm shadow-2xl shadow-cyan-500/10">
            <div className="flex items-center gap-3 mb-6">
              <div className="text-3xl">🧩</div>
              <div>
                <h2 className="text-2xl font-black text-cyan-400">PROBLEMS</h2>
                <div className="text-xs text-cyan-300/50">{questions.length} CHALLENGES</div>
              </div>
            </div>
            <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto scrollbar-thin scrollbar-thumb-purple-500/50 scrollbar-track-slate-900/50">
              {questions.map((q, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-gradient-to-r from-slate-800/60 to-slate-800/30 rounded-lg border border-purple-500/40 hover:border-cyan-400/60 transition hover:shadow-lg hover:shadow-cyan-500/20 cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="text-lg group-hover:scale-110 transition">#</div>
                      <h3 className="font-bold text-slate-100 group-hover:text-cyan-300 transition">{q.title}</h3>
                    </div>
                    <span
                      className={`text-xs px-3 py-1 rounded-full font-bold whitespace-nowrap ml-2 ${
                        q.difficulty === "easy"
                          ? "bg-emerald-500/30 text-emerald-300 border border-emerald-500/50"
                          : q.difficulty === "medium"
                          ? "bg-amber-500/30 text-amber-300 border border-amber-500/50"
                          : "bg-red-500/30 text-red-300 border border-red-500/50"
                      }`}
                    >
                      {q.difficulty.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 group-hover:text-slate-300 transition">{q.description}</p>
                  {q.solved && (
                    <div className="mt-3 pt-3 border-t border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2 font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      YOU SOLVED THIS
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Leaderboard & Activity Panel */}
          <div className="w-96 space-y-6">
            {/* Leaderboard */}
            <div className="bg-gradient-to-br from-slate-900/80 to-slate-900/40 rounded-2xl border border-pink-500/30 p-6 backdrop-blur-sm sticky top-6 h-fit shadow-2xl shadow-pink-500/10">
              <div className="flex items-center gap-3 mb-6">
                <div className="text-3xl animate-bounce">🏆</div>
                <div>
                  <h2 className="text-2xl font-black text-pink-400">LEADERBOARD</h2>
                  <div className="text-xs text-pink-300/50">{leaderboard.length} COMPETITORS</div>
                </div>
              </div>
              <div className="space-y-2">
                {leaderboard.map((member, idx) => (
                  <div
                    key={member.userId}
                    className={`p-3 rounded-lg border transition backdrop-blur-sm ${
                      member.userId === userId
                        ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-cyan-400 ring-1 ring-cyan-400/50 shadow-lg shadow-cyan-500/20"
                        : "bg-slate-800/50 border-pink-500/30 hover:border-pink-400/60"
                    } flex items-center justify-between group cursor-pointer`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${
                        idx === 0 ? "bg-gradient-to-br from-yellow-400 to-amber-500 text-slate-950 shadow-lg shadow-yellow-500/50" :
                        idx === 1 ? "bg-gradient-to-br from-gray-300 to-gray-400 text-slate-950 shadow-lg shadow-gray-400/50" :
                        idx === 2 ? "bg-gradient-to-br from-orange-400 to-red-500 text-slate-950 shadow-lg shadow-orange-500/50" :
                        "bg-gradient-to-br from-purple-500 to-pink-500 text-white"
                      }`}>
                        {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-100 group-hover:text-cyan-300 transition">
                          {member.username}
                          {member.isOwner && <span className="ml-1 text-xs text-purple-300">👑</span>}
                          {member.userId === userId && <span className="ml-1 text-xs text-cyan-300">(YOU)</span>}
                        </div>
                        <div className="text-xs text-slate-400">
                          {member.status === "completed" ? "🎯 COMPLETED" : "⏳ IN PROGRESS"}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black text-pink-400">{member.points || 0}</div>
                      <div className="text-xs text-pink-300/50 font-bold">PTS</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pending Approval Section */}
            {pendingApprovals && pendingApprovals.length > 0 && (
              <div className="mt-6 pt-6 border-t border-slate-700">
                <div className="text-sm font-bold text-orange-400 mb-3 flex items-center gap-2">
                  <span>⏳</span> Waiting for Approval ({pendingApprovals.length})
                </div>
                <div className="space-y-2">
                  {pendingApprovals.map((user, idx) => (
                    <div
                      key={user.userId}
                      className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-between hover:border-orange-500 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-orange-500/30 flex items-center justify-center text-xs">
                          👤
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-100">
                            {user.username}
                          </div>
                          <div className="text-xs text-slate-400">
                            {user.requestedAt
                              ? new Date(user.requestedAt).toLocaleTimeString()
                              : 'Just now'}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-orange-300 font-semibold">
                        PENDING
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Lobby view
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-slate-100 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Room Info */}
        <div className="mb-8 bg-gradient-to-br from-slate-900/80 to-slate-900/40 rounded-2xl border border-cyan-500/30 p-6 backdrop-blur-sm shadow-2xl shadow-cyan-500/10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-black bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">⚔️ BABYLON DSA</h1>
              <p className="text-cyan-300/70 text-sm mt-2">Member verification & game lobby</p>
            </div>
            {isOwner && (
              <div className="px-3 py-1 bg-emerald-500/20 border border-emerald-500 rounded-full text-emerald-300 text-xs font-bold">
                👑 Room Owner
              </div>
            )}
          </div>

          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="text-xs text-cyan-300/70 font-bold mb-2">🔐 ROOM CODE</div>
              <div className="text-4xl font-mono font-black bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent tracking-wider">{roomCode}</div>
            </div>
            <button
              onClick={copyCode}
              className="px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 rounded-lg font-bold text-sm transition h-fit shadow-lg shadow-cyan-500/50 hover:shadow-cyan-500/70"
            >
              {showCopyNotice ? "✓ COPIED!" : "📋 COPY"}
            </button>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-cyan-500/20">
            <div className="flex items-center gap-2">
              <span className="text-lg">👥</span>
              <div>
                <div className="text-sm font-bold text-cyan-300">{members.length + 1} MEMBERS</div>
                {isOwner && pendingRequests.length > 0 && (
                  <div className="text-xs text-purple-300/70">{pendingRequests.length} PENDING APPROVAL</div>
                )}
              </div>
            </div>
            {isOwner && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-500/30 to-pink-500/30 border border-purple-400/50 rounded-full">
                <span>👑</span>
                <span className="text-xs font-bold text-purple-300">ROOM OWNER</span>
              </div>
            )}
          </div>
        </div>

        {/* Pending Requests (Owner Only) */}
        {isOwner && pendingRequests.length > 0 && (
          <div className="mb-8 bg-gradient-to-br from-slate-900/80 to-slate-900/40 rounded-2xl border border-pink-500/30 p-6 backdrop-blur-sm shadow-2xl shadow-pink-500/10">
            <div className="flex items-center gap-3 mb-6">
              <div className="text-3xl animate-bounce">🔔</div>
              <div>
                <h2 className="text-2xl font-black text-pink-400">PENDING REQUESTS</h2>
                <div className="text-xs text-pink-300/50">{pendingRequests.length} AWAITING APPROVAL</div>
              </div>
            </div>
            <div className="space-y-3">
              {pendingRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-4 bg-gradient-to-r from-slate-800/60 to-slate-800/30 rounded-lg border border-pink-500/40 hover:border-pink-400/60 transition flex items-center justify-between group"
                >
                  <div className="flex-1">
                    <div className="font-bold text-slate-100 group-hover:text-pink-300 transition">{req.username}</div>
                    <div className="text-xs text-slate-400">Requesting to join</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        handleApproveMember(req.id, req.userId, req.username)
                      }
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded text-sm font-medium transition"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => handleRejectMember(req.id)}
                      className="px-3 py-1.5 bg-red-600/30 hover:bg-red-600/40 rounded text-sm font-medium transition text-red-300"
                    >
                      ✕ Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Members List */}
        <div className="mb-8 bg-slate-900 rounded-2xl border border-slate-800 p-6">
          <h2 className="text-xl font-bold mb-4">👥 Members ({members.length + 1})</h2>
          <div className="space-y-2 mb-4">
            {/* Room Creator */}
            <div className="p-3 bg-slate-800 rounded-lg border border-emerald-500/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-sm font-bold">
                  👑
                </div>
                <div>
                  <div className="font-bold text-slate-100">{username}</div>
                  <div className="text-xs text-slate-400">Room Owner</div>
                </div>
              </div>
              <span className="text-xs text-emerald-300">You</span>
            </div>

            {/* Other Members */}
            {members.map((member) => (
              <div
                key={member.userId}
                className="p-3 bg-slate-800 rounded-lg border border-slate-700 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold">
                    ✓
                  </div>
                  <div>
                    <div className="font-bold text-slate-100">{member.username}</div>
                    <div className="text-xs text-slate-400">Member</div>
                  </div>
                </div>
                <span className="text-xs text-emerald-300">Joined</span>
              </div>
            ))}
          </div>
        </div>

        {/* Owner Controls */}
        {isOwner && (
          <div className="mb-8 bg-gradient-to-br from-slate-900/80 to-slate-900/40 rounded-2xl border border-purple-500/30 p-6 backdrop-blur-sm shadow-2xl shadow-purple-500/10">
            <div className="flex items-center gap-3 mb-6">
              <div className="text-3xl">⚙️</div>
              <div>
                <h2 className="text-2xl font-black text-purple-400">GAME SETTINGS</h2>
                <div className="text-xs text-purple-300/50">CUSTOMIZE YOUR BATTLEFIELD</div>
              </div>
            </div>

            {/* Question Mode Selection */}
            <div className="mb-6">
              <h3 className="text-xs font-black text-purple-300 mb-3 tracking-wider">🎯 QUESTION MODE</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setQuestionMode("same")}
                  className={`p-4 rounded-lg border-2 transition ${
                    questionMode === "same"
                      ? "border-cyan-400 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 shadow-lg shadow-cyan-500/30"
                      : "border-slate-700/50 bg-slate-800/40 hover:border-cyan-500/60"
                  }`}
                >
                  <div className="font-bold text-sm mb-1">📋 SAME</div>
                  <div className="text-xs text-slate-400">Everyone solves identical problems</div>
                </button>
                <button
                  onClick={() => setQuestionMode("different")}
                  className={`p-4 rounded-lg border-2 transition ${
                    questionMode === "different"
                      ? "border-pink-400 bg-gradient-to-br from-pink-500/20 to-purple-500/20 shadow-lg shadow-pink-500/30"
                      : "border-slate-700/50 bg-slate-800/40 hover:border-pink-500/60"
                  }`}
                >
                  <div className="font-bold text-sm mb-1">🎲 DIFFERENT</div>
                  <div className="text-xs text-slate-400">Unique problems for each player</div>
                </button>
              </div>
            </div>

            {/* Start Game Button */}
            <button
              onClick={handleStartGame}
              disabled={members.length + 1 < 2}
              className="w-full px-6 py-4 bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 hover:from-emerald-400 hover:via-green-400 hover:to-emerald-500 text-white rounded-xl font-black transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg shadow-2xl shadow-emerald-500/50 hover:shadow-emerald-500/70"
            >
              {startCountdown !== null ? (
                <>
                  <span className="text-2xl animate-spin">⚡</span>
                  <span>STARTING IN {startCountdown}S</span>
                </>
              ) : (
                <>
                  <span className="text-2xl">⚔️</span>
                  <span>START ARENA BATTLE</span>
                </>
              )}
            </button>

            {members.length + 1 < 2 && (
              <div className="mt-3 text-xs text-slate-400 text-center font-semibold">
                ⏳ AWAITING PLAYERS... (Need 2+ members)
              </div>
            )}
          </div>
        )}

        {/* Waiting for Owner (Non-Owner) */}
        {!isOwner && (
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 text-center">
            <div className="text-4xl mb-3">⏳</div>
            <h2 className="text-xl font-bold mb-2">Waiting for Room Owner</h2>
            <p className="text-slate-400 text-sm">
              The room owner will start the game when ready
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DSARoomManager;
