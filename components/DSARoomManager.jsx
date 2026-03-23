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
    };
  }, [socket, onGameStart]);

  // Start countdown when owner initiates
  useEffect(() => {
    if (startCountdown === null) return;
    if (startCountdown === 0) {
      console.log("[DSA Room] Starting game");
      return;
    }

    const timer = setTimeout(() => {
      setStartCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearTimeout(timer);
  }, [startCountdown]);

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
    if (members.length < 2) {
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
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
        <div className="flex gap-6 max-w-7xl mx-auto">
          {/* Questions Panel */}
          <div className="flex-1 bg-slate-900 rounded-2xl border border-slate-800 p-6">
            <h2 className="text-2xl font-bold mb-6">🧩 Questions</h2>
            <div className="space-y-4">
              {questions.map((q, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-slate-800 rounded-lg border border-slate-700 hover:border-slate-600 transition cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-slate-100">{q.title}</h3>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        q.difficulty === "easy"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : q.difficulty === "medium"
                          ? "bg-yellow-500/20 text-yellow-300"
                          : "bg-red-500/20 text-red-300"
                      }`}
                    >
                      {q.difficulty}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400">{q.description}</p>
                  {q.solved && (
                    <div className="mt-2 text-xs text-emerald-300 flex items-center gap-1">
                      ✓ You solved this
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Leaderboard & Activity Panel */}
          <div className="w-96 space-y-6">
            {/* Leaderboard */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 sticky top-6 h-fit">
              <h2 className="text-2xl font-bold mb-6">🏆 Leaderboard</h2>
              <div className="space-y-3">
                {leaderboard.map((member, idx) => (
                  <div
                    key={member.userId}
                    className={`p-3 rounded-lg border transition ${
                      member.userId === userId
                        ? "bg-blue-500/10 border-blue-500 ring-1 ring-blue-500/50"
                        : "bg-slate-800 border-slate-700 hover:border-slate-600"
                    } flex items-center justify-between`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-linear-to-br from-emerald-400 to-cyan-400 flex items-center justify-center text-sm font-bold text-slate-950">
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-100">
                          {member.username}
                          {member.isOwner && <span className="text-xs ml-1">👑</span>}
                        </div>
                        <div className="text-xs text-slate-400">
                          {member.solved || 0} solved
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {member.status === 'pending' && (
                        <span className="px-2 py-1 bg-orange-500/20 text-orange-300 text-xs font-bold rounded">
                          ⏳ Pending
                        </span>
                      )}
                      <div className="text-lg font-bold text-emerald-400">
                        {member.points || 0}
                      </div>
                    </div>
                  </div>
                ))}
                
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

            {/* Activity Feed */}
            {gameActivity.length > 0 && (
              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <span>📡</span> Live Activity
                </h2>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {gameActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className={`p-3 rounded-lg border text-sm transition ${
                        activity.type === "success"
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                          : "bg-slate-800 border-slate-700 text-slate-300"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-lg">{activity.icon}</span>
                        <div className="flex-1">
                          <div className="font-medium">{activity.message}</div>
                          <div className="text-xs text-slate-400 mt-1">
                            {activity.timestamp.toLocaleTimeString()}
                          </div>
                        </div>
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
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Room Info */}
        <div className="mb-8 bg-slate-900 rounded-2xl border border-slate-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-black mb-2">🏆 DSA Room</h1>
              <p className="text-slate-400 text-sm">Member verification & game lobby</p>
            </div>
            {isOwner && (
              <div className="px-3 py-1 bg-emerald-500/20 border border-emerald-500 rounded-full text-emerald-300 text-xs font-bold">
                👑 Room Owner
              </div>
            )}
          </div>

          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="text-xs text-slate-400 mb-1">Room Code</div>
              <div className="text-3xl font-mono font-bold text-emerald-400">{roomCode}</div>
            </div>
            <button
              onClick={copyCode}
              className="px-4 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-medium text-sm transition h-fit"
            >
              {showCopyNotice ? "✓ Copied" : "📋 Copy"}
            </button>
          </div>

          <div className="text-xs text-slate-400">
            👥 Members: {members.length + 1} {isOwner && `(${pendingRequests.length} pending)`}
          </div>
        </div>

        {/* Pending Requests (Owner Only) */}
        {isOwner && pendingRequests.length > 0 && (
          <div className="mb-8 bg-slate-900 rounded-2xl border border-slate-800 p-6">
            <h2 className="text-xl font-bold mb-4">🔔 Pending Requests ({pendingRequests.length})</h2>
            <div className="space-y-3">
              {pendingRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-4 bg-slate-800 rounded-lg border border-slate-700 flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-slate-100">{req.username}</div>
                    <div className="text-xs text-slate-400">Requests to join</div>
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
          <div className="mb-8 bg-slate-900 rounded-2xl border border-slate-800 p-6">
            <h2 className="text-xl font-bold mb-4">⚙️ Game Settings</h2>

            {/* Question Mode Selection */}
            <div className="mb-6">
              <h3 className="text-sm font-bold text-slate-300 mb-3">Question Mode</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setQuestionMode("same")}
                  className={`p-3 rounded-lg border-2 transition ${
                    questionMode === "same"
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-slate-700 bg-slate-800 hover:border-slate-600"
                  }`}
                >
                  <div className="font-bold text-sm mb-1">📋 Same Questions</div>
                  <div className="text-xs text-slate-400">Everyone solves the same problems</div>
                </button>
                <button
                  onClick={() => setQuestionMode("different")}
                  className={`p-3 rounded-lg border-2 transition ${
                    questionMode === "different"
                      ? "border-purple-500 bg-purple-500/10"
                      : "border-slate-700 bg-slate-800 hover:border-slate-600"
                  }`}
                >
                  <div className="font-bold text-sm mb-1">🎲 Different Questions</div>
                  <div className="text-xs text-slate-400">Each player gets unique problems</div>
                </button>
              </div>
            </div>

            {/* Start Game Button */}
            <button
              onClick={handleStartGame}
              disabled={members.length < 1}
              className="w-full px-6 py-3 bg-linear-to-r from-emerald-500 to-emerald-600 hover:shadow-lg hover:shadow-emerald-500/30 text-white rounded-lg font-bold transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {startCountdown !== null ? (
                <>🚀 Starting in {startCountdown}s</>
              ) : (
                <>✦ Start Game</>
              )}
            </button>

            {members.length < 1 && (
              <div className="mt-3 text-xs text-slate-400 text-center">
                Waiting for members to join...
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
