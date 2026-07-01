"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { io } from "socket.io-client";
import { toast } from "sonner";
import {
  ArrowLeft,
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Users,
  Copy,
  Layout,
  MessageSquare,
  Volume2,
  Share2,
  Laptop
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BuddyInvitePage() {
  const params = useParams();
  const router = useRouter();
  const sessionCode = params?.inviteCode;

  // Configuration & Staging (Pre-flight Lobby)
  const [inLobby, setInLobby] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [localStream, setLocalStream] = useState(null);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [isLobbyChecking, setIsLobbyChecking] = useState(false);

  // Active Call State
  const [joined, setJoined] = useState(false);
  const [peers, setPeers] = useState({}); // socketId -> { userId, username, stream, cameraOn, micOn }
  const [sharedNotes, setSharedNotes] = useState("");
  const [noteText, setNoteText] = useState("");
  const [notesHistory, setNotesHistory] = useState([]);
  const [participantsCount, setParticipantsCount] = useState(1);

  // Refs for WebRTC & Socket
  const socketRef = useRef(null);
  const localVideoRef = useRef(null);
  const lobbyVideoRef = useRef(null);
  const peerConnections = useRef({}); // socketId -> RTCPeerConnection
  const localStreamRef = useRef(null);
  const iceServersRef = useRef(null);
  const candidateQueues = useRef({}); // socketId -> RTCIceCandidate[]


  // ----------------------------------------------------
  // Lobby Hardware Verification
  // ----------------------------------------------------
  useEffect(() => {
    if (inLobby) {
      startLobbyPreview();
    }
    return () => {
      stopLobbyPreview();
    };
  }, [inLobby]);

  const startLobbyPreview = async () => {
    try {
      setIsLobbyChecking(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, frameRate: 15 },
        audio: { echoCancellation: true, noiseSuppression: true }
      });
      localStreamRef.current = stream;
      setLocalStream(stream);

      if (lobbyVideoRef.current) {
        lobbyVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn("Camera/Mic blocked or unavailable. Falling back to placeholder.");
      
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, 640, 480);
      ctx.fillStyle = "#64748b";
      ctx.font = "20px Arial";
      ctx.textAlign = "center";
      ctx.fillText("Camera Unavailable / In Use", 320, 240);
      
      const fallbackStream = canvas.captureStream(15);
      localStreamRef.current = fallbackStream;
      setLocalStream(fallbackStream);
      if (lobbyVideoRef.current) {
        lobbyVideoRef.current.srcObject = fallbackStream;
      }
      setCameraEnabled(false);
      toast.warning("Webcam is already in use by another browser window. Using a placeholder video.");
    } finally {
      setIsLobbyChecking(false);
    }
  };


  const stopLobbyPreview = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }
  };

  const toggleLobbyCamera = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCameraEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleLobbyMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicEnabled(audioTrack.enabled);
      }
    }
  };

  // ----------------------------------------------------
  // Join Call & Initialize Signaling
  // ----------------------------------------------------
  const handleJoinCall = async () => {
    if (!displayName.trim()) {
      toast.error("Please enter your display name first.");
      return;
    }

    setInLobby(false);
    setJoined(true);

    try {
      // 1. Fetch Ephemeral ICE Credentials from secure API route
      const iceRes = await fetch("/api/interview-buddy/ice-credentials");
      const iceData = await iceRes.json();
      iceServersRef.current = iceData.iceServers;

      // 2. Connect to the mesh signaling server
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_IO_URL || "http://localhost:4002";
      console.log(`🔌 Connecting to signaling server at: ${socketUrl}`);
      const socket = io(socketUrl, {
        transports: ["websocket", "polling"],
        reconnectionAttempts: 5,
        timeout: 10000
      });
      socketRef.current = socket;

      socket.on("connect", () => {
        console.log(`✅ Socket connected successfully. Socket ID: ${socket.id}`);
        toast.success("Connected to WebRTC signaling server!");
      });

      socket.on("connect_error", (error) => {
        console.error("❌ Socket connection error:", error);
        toast.error(`Signaling connection error: ${error.message}`);
      });

      socket.on("disconnect", (reason) => {
        console.warn("⚠️ Socket disconnected:", reason);
      });

      // Request stream if stopped during lobby transition
      let stream = localStreamRef.current;
      if (!stream) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480, frameRate: 15 },
            audio: { echoCancellation: true, noiseSuppression: true }
          });
        } catch (mediaErr) {
          console.warn("Failed to get camera/mic. Using fallback blank stream.", mediaErr);
          toast.warning("Webcam is already in use by another tab. Joining with placeholder video.");

          const canvas = document.createElement("canvas");
          canvas.width = 640;
          canvas.height = 480;
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#0f172a";
          ctx.fillRect(0, 0, 640, 480);
          ctx.fillStyle = "#64748b";
          ctx.font = "20px Arial";
          ctx.textAlign = "center";
          ctx.fillText("Camera Unavailable / In Use", 320, 240);

          stream = canvas.captureStream(15);
          setCameraEnabled(false);

          // Attempt to fetch audio-only so the users can still talk!
          try {
            const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioStream.getAudioTracks().forEach(track => stream.addTrack(track));
          } catch (audioErr) {
            console.warn("Microphone also unavailable.", audioErr);
            setMicEnabled(false);
          }
        }
        localStreamRef.current = stream;
        setLocalStream(stream);
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }


      // Join Signaling Room
      console.log(`Sending join-room request for room [${sessionCode}]`);
      socket.emit("join-room", {
        roomId: sessionCode,
        userId: `usr-${Math.random().toString(36).substr(2, 9)}`,
        username: displayName
      });

      // 3. Socket Event Handlers
      socket.on("room-full", ({ message }) => {
        toast.error(message);
        handleLeaveCall();
      });

      socket.on("room-users", ({ peers: existingPeers }) => {
        console.log("👥 Existing room peers in this session:", existingPeers);
        setParticipantsCount(existingPeers.length + 1);

        // Initiate connection with all existing peers
        existingPeers.forEach((peer) => {
          console.log(`Initiating WebRTC handshake to existing peer: ${peer.username} (${peer.socketId})`);
          createPeerConnection(peer.socketId, peer.username, true);
        });
      });

      socket.on("user-joined", ({ socketId, userId, username }) => {
        console.log(`👤 New peer joined: ${username} (Socket: ${socketId})`);
        toast.info(`${username} joined the interview session.`);
        setParticipantsCount((c) => Math.min(3, c + 1));
        
        // Wait for offer from this peer
        createPeerConnection(socketId, username, false);
      });

      socket.on("signal", async ({ senderSocketId, signalData }) => {
        const pc = peerConnections.current[senderSocketId];
        if (!pc) {
          console.warn(`⚠️ Received signal from ${senderSocketId} but no PeerConnection is initialized yet.`);
          return;
        }

        if (signalData.sdp) {
          console.log(`📄 Received SDP ${signalData.sdp.type} signal from socket ${senderSocketId}`);
          await pc.setRemoteDescription(new RTCSessionDescription(signalData.sdp));
          
          // Apply any ICE candidates that were queued while waiting for SDP remote description
          const queuedCandidates = candidateQueues.current[senderSocketId] || [];
          console.log(`📦 Applying ${queuedCandidates.length} queued ICE candidates for socket ${senderSocketId}`);
          for (const candidate of queuedCandidates) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(err => {
              console.error("Error applying queued ICE candidate:", err);
            });
          }
          candidateQueues.current[senderSocketId] = [];

          if (signalData.sdp.type === "offer") {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            console.log(`📤 Sending SDP answer to socket ${senderSocketId}`);
            socket.emit("signal", {
              targetSocketId: senderSocketId,
              signalData: { sdp: answer }
            });
          }
        } else if (signalData.candidate) {
          try {
            if (pc.remoteDescription) {
              await pc.addIceCandidate(new RTCIceCandidate(signalData.candidate));
            } else {
              if (!candidateQueues.current[senderSocketId]) {
                candidateQueues.current[senderSocketId] = [];
              }
              candidateQueues.current[senderSocketId].push(signalData.candidate);
              console.log(`📥 Queued ICE candidate from socket ${senderSocketId} (SDP remote description not set yet)`);
            }
          } catch (e) {
            console.error("Error adding ICE candidate:", e);
          }
        }
      });


      socket.on("user-left", ({ socketId, username }) => {
        console.log(`❌ Peer left: ${username}`);
        toast.warning(`${username} left the session.`);
        setParticipantsCount((c) => Math.max(1, c - 1));
        cleanupPeer(socketId);
      });

      socket.on("note-sync", ({ text, sender }) => {
        setNotesHistory((prev) => [...prev, { sender, text }]);
      });

    } catch (err) {
      console.error("Error initializing mock WebRTC workspace:", err);
      toast.error("Failed to establish video session.");
    }
  };

  // ----------------------------------------------------
  // WebRTC Peer Connection Core Logic (Mesh Grid)
  // ----------------------------------------------------
  const createPeerConnection = async (peerSocketId, peerName, isInitiator) => {
    const pc = new RTCPeerConnection({
      iceServers: iceServersRef.current || [{ urls: "stun:stun.l.google.com:19302" }]
    });

    peerConnections.current[peerSocketId] = pc;

    // Add local tracks to send to peer
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // Handle incoming remote track from peer
    pc.ontrack = (event) => {
      console.log(`🎥 Received remote track from ${peerName}`);
      const remoteStream = event.streams[0];
      setPeers((prev) => ({
        ...prev,
        [peerSocketId]: {
          ...prev[peerSocketId],
          username: peerName,
          stream: remoteStream,
          cameraOn: true,
          micOn: true
        }
      }));
    };

    // Relay local ICE candidates to peer via signaling server
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit("signal", {
          targetSocketId: peerSocketId,
          signalData: { candidate: event.candidate }
        });
      }
    };

    // If initiator, generate WebRTC offer
    if (isInitiator) {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socketRef.current.emit("signal", {
          targetSocketId: peerSocketId,
          signalData: { sdp: offer }
        });
      } catch (err) {
        console.error("Error creating WebRTC offer:", err);
      }
    }
  };

  const cleanupPeer = (socketId) => {
    if (peerConnections.current[socketId]) {
      peerConnections.current[socketId].close();
      delete peerConnections.current[socketId];
    }
    setPeers((prev) => {
      const copy = { ...prev };
      delete copy[socketId];
      return copy;
    });
  };

  // ----------------------------------------------------
  // Stateful Media Controls (In-Call)
  // ----------------------------------------------------
  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCameraEnabled(videoTrack.enabled);
        toast.info(videoTrack.enabled ? "Camera enabled." : "Camera muted.");
      }
    }
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicEnabled(audioTrack.enabled);
        toast.info(audioTrack.enabled ? "Microphone enabled." : "Microphone muted.");
      }
    }
  };

  // ----------------------------------------------------
  // Real-time Notes Synchronization
  // ----------------------------------------------------
  const handleAddNote = () => {
    if (!noteText.trim()) return;
    
    // Broadcast note via WebSocket to other peers
    if (socketRef.current) {
      socketRef.current.emit("note-sync", {
        text: noteText,
        sender: displayName
      });
    }

    setNotesHistory((prev) => [...prev, { sender: displayName, text: noteText }]);
    setNoteText("");
  };

  // ----------------------------------------------------
  // Call Cleanup & Destruction
  // ----------------------------------------------------
  const handleLeaveCall = () => {
    // 1. Stop all local tracks
    stopLobbyPreview();

    // 2. Close peer connections
    Object.keys(peerConnections.current).forEach((key) => {
      peerConnections.current[key].close();
    });
    peerConnections.current = {};

    // 3. Disconnect Socket
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setPeers({});
    setJoined(false);
    setInLobby(true);
    toast.success("Disconnected from interview session.");
    router.push("/interview");
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}/interview/buddy/${sessionCode}`;
    navigator.clipboard.writeText(link);
    toast.success("Invite link copied to clipboard!");
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col justify-between relative overflow-hidden">
      {/* Dynamic Background Glows */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-500/5 to-transparent rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-br from-purple-500/5 to-transparent rounded-full blur-3xl -z-10" />

      {/* LOBBY INTERFACE */}
      {inLobby ? (
        <div className="max-w-4xl mx-auto w-full my-auto px-6 py-12 flex flex-col md:flex-row items-center gap-12">
          {/* Lobby Preview Feed */}
          <div className="w-full md:w-1/2 flex flex-col gap-4">
            <div className="relative aspect-video rounded-2xl overflow-hidden border border-slate-800 bg-[#0d1424] shadow-2xl flex items-center justify-center">
              <video
                ref={lobbyVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover scale-x-[-1] ${!cameraEnabled ? "hidden" : ""}`}
              />
              {!cameraEnabled && (
                <div className="flex flex-col items-center gap-2 text-slate-500">
                  <VideoOff size={44} />
                  <span className="text-xs">Camera is Off</span>
                </div>
              )}

              {/* Lobby preview overlay triggers */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-slate-950/80 backdrop-blur px-4 py-2 rounded-full border border-slate-800">
                <button
                  onClick={toggleLobbyCamera}
                  className={`p-2 rounded-full transition-all ${cameraEnabled ? "bg-slate-800 text-slate-200 hover:bg-slate-700" : "bg-rose-600 text-white"}`}
                >
                  {cameraEnabled ? <Video size={16} /> : <VideoOff size={16} />}
                </button>
                <button
                  onClick={toggleLobbyMic}
                  className={`p-2 rounded-full transition-all ${micEnabled ? "bg-slate-800 text-slate-200 hover:bg-slate-700" : "bg-rose-600 text-white"}`}
                >
                  {micEnabled ? <Mic size={16} /> : <MicOff size={16} />}
                </button>
              </div>
            </div>
            <p className="text-xs text-center text-slate-500">
              Verify your camera settings and microphone levels before joining the live session.
            </p>
          </div>

          {/* Lobby Configuration details */}
          <div className="w-full md:w-1/2 flex flex-col gap-6 items-start">
            <button
              onClick={() => router.push("/interview")}
              className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white transition text-xs font-semibold"
            >
              <ArrowLeft size={14} /> Back to Dashboard
            </button>

            <div>
              <span className="text-[10px] font-bold tracking-widest text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full uppercase">
                Peer-to-Peer Interview Room
              </span>
              <h1 className="text-3xl font-extrabold mt-3 leading-tight text-white">
                Pre-Flight Lobby Staging
              </h1>
              <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                You are joining session <code className="text-blue-400 font-bold bg-slate-900/60 px-1.5 py-0.5 rounded border border-slate-800">{sessionCode}</code>. Up to 3 active peers can collaborate.
              </p>
            </div>

            <div className="w-full space-y-2">
              <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Your Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter display name (e.g. John Doe)"
                className="w-full px-4 py-3 bg-[#0d1424] border border-slate-800 rounded-xl text-slate-100 text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500/80 transition-all"
              />
            </div>

            <Button
              onClick={handleJoinCall}
              disabled={isLobbyChecking || !displayName.trim()}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 py-3.5 rounded-xl font-bold flex items-center justify-center gap-1.5 text-white"
            >
              <Video size={18} /> Join Interview Session
            </Button>
          </div>
        </div>
      ) : (
        /* IN-CALL WORKSPACE INTERFACE */
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden h-screen max-h-screen">
          {/* Main video grid column */}
          <div className="flex-1 flex flex-col p-4 overflow-hidden relative justify-between gap-4">
            
            {/* Header info */}
            <div className="flex items-center justify-between bg-slate-950/40 backdrop-blur p-4 rounded-xl border border-slate-800/80">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                  🎥 Session Code: <code className="text-blue-400 font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">{sessionCode}</code>
                </h2>
                <Button
                  size="xs"
                  onClick={copyInviteLink}
                  className="bg-slate-900 border border-slate-800 text-slate-400 hover:text-white px-2 py-0.5 text-[10px]"
                >
                  <Copy size={10} className="mr-1 inline" /> Copy Link
                </Button>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                <Users size={14} className="text-blue-400" />
                <span>{participantsCount} / 3 Connected</span>
              </div>
            </div>

            {/* Dynamic Grid Layout */}
            <div className="flex-1 grid gap-4 items-center justify-center overflow-hidden min-h-[300px] relative">
              <div
                className={`w-full h-full max-w-5xl mx-auto grid gap-4 ${
                  participantsCount === 1
                    ? "grid-cols-1 max-h-[500px]"
                    : participantsCount === 2
                    ? "grid-cols-1 md:grid-cols-2 max-h-[450px]"
                    : "grid-cols-1 md:grid-cols-3 max-h-[350px]"
                }`}
              >
                {/* Local Camera stream */}
                <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-xl aspect-video group">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                  <div className="absolute top-3 left-3 bg-slate-950/80 px-3 py-1 rounded-full text-xs border border-slate-800 font-semibold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    {displayName} (You)
                  </div>
                </div>

                {/* Remote streams (Mesh) */}
                {Object.keys(peers).map((socketId) => {
                  const peer = peers[socketId];
                  return (
                    <div key={socketId} className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-xl aspect-video group">
                      <video
                        ref={(el) => {
                          if (el && peer.stream) {
                            el.srcObject = peer.stream;
                          }
                        }}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-3 left-3 bg-slate-950/80 px-3 py-1 rounded-full text-xs border border-slate-800 font-semibold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {peer.username}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom floating control bar */}
            <div className="flex justify-center items-center gap-4 bg-slate-950/90 backdrop-blur p-4 rounded-2xl border border-slate-800/80 shadow-2xl max-w-md mx-auto w-full">
              <button
                onClick={toggleCamera}
                className={`p-3.5 rounded-full transition-all ${cameraEnabled ? "bg-slate-900 text-slate-300 hover:bg-slate-800" : "bg-rose-600 text-white hover:bg-rose-500"}`}
              >
                {cameraEnabled ? <Video size={20} /> : <VideoOff size={20} />}
              </button>
              <button
                onClick={toggleMic}
                className={`p-3.5 rounded-full transition-all ${micEnabled ? "bg-slate-900 text-slate-300 hover:bg-slate-800" : "bg-rose-600 text-white hover:bg-rose-500"}`}
              >
                {micEnabled ? <Mic size={20} /> : <MicOff size={20} />}
              </button>
              <button
                onClick={handleLeaveCall}
                className="p-3.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-lg shadow-rose-500/20"
              >
                <PhoneOff size={20} />
              </button>
            </div>
          </div>

          {/* Right sidebar column: Shared Interview Notes */}
          <aside className="w-full md:w-80 border-l border-slate-800 bg-[#0d1424]/40 backdrop-blur p-4 flex flex-col justify-between overflow-hidden gap-4">
            <div className="flex flex-col overflow-hidden flex-1 gap-3">
              <h3 className="text-xs uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
                <MessageSquare size={14} className="text-blue-500" /> Session Notes Chat
              </h3>
              
              <div className="flex-1 overflow-y-auto bg-[#0a0e1a]/80 border border-slate-800/60 rounded-xl p-3.5 space-y-3.5 max-h-[70vh]">
                {notesHistory.length === 0 ? (
                  <p className="text-xs text-slate-500 italic text-center py-6">No session notes recorded yet.</p>
                ) : (
                  notesHistory.map((note, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <span className="text-[10px] font-bold text-blue-400 block">{note.sender}</span>
                      <p className="text-xs text-slate-300 bg-slate-900/60 border border-slate-800/40 p-2.5 rounded-lg font-mono whitespace-pre-wrap">{note.text}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddNote();
                }}
                placeholder="Share note/feedback..."
                className="flex-1 px-3 py-2 bg-[#090d16] border border-slate-800 rounded-lg text-xs focus:outline-none placeholder-slate-600"
              />
              <Button onClick={handleAddNote} className="bg-blue-600 hover:bg-blue-500 text-xs px-3">
                Send
              </Button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
