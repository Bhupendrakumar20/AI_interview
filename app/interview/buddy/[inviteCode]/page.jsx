"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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
  Laptop,
  PenTool,
  Square,
  Circle,
  Type,
  RotateCcw,
  Undo2,
  Trash2,
  Play,
  Lightbulb,
  Sparkles,
  Download,
  Terminal,
  Settings,
  Grid,
  Code
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Editor from "@monaco-editor/react";

const INITIAL_CODE_TEMPLATES = {
  javascript: `// Write your JavaScript solution here\nfunction solve(input) {\n  console.log("Hello PrepWise JS");\n  return true;\n}\n\nsolve();`,
  python: `# Write your Python solution here\ndef solve():\n    print("Hello PrepWise Python")\n    return True\n\nsolve()`,
  cpp: `// Write your C++ solution here\n#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello PrepWise C++" << endl;\n    return 0;\n}`,
  java: `// Write your Java solution here\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello PrepWise Java");\n    }\n}`
};

export default function BuddyInvitePage() {
  const params = useParams();
  const router = useRouter();
  const sessionCode = params?.inviteCode;

  // Active workspace tab: "video" | "editor" | "whiteboard"
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState("video");

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

  // Collaborative Code Editor State
  const [selectedLanguage, setSelectedLanguage] = useState("javascript");
  const [editorCode, setEditorCode] = useState(INITIAL_CODE_TEMPLATES.javascript);
  const [consoleOutput, setConsoleOutput] = useState("");
  const [consoleError, setConsoleError] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);

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

      socket.on("code-sync", ({ code, language }) => {
        setEditorCode(code);
        if (language) {
          setSelectedLanguage(language);
        }
      });

      socket.on("whiteboard-sync", ({ shapes }) => {
        setShapes(shapes);
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
        if (track.kind === "video" && isScreenSharingRef.current && screenStreamRef.current) {
          const screenVideoTrack = screenStreamRef.current.getVideoTracks()[0];
          if (screenVideoTrack) {
            pc.addTrack(screenVideoTrack, screenStreamRef.current);
            return;
          }
        }
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
  // Screen Sharing State & Refs
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const screenStreamRef = useRef(null);
  const isScreenSharingRef = useRef(false);

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });
      screenStreamRef.current = stream;
      isScreenSharingRef.current = true;
      setIsScreenSharing(true);

      const screenTrack = stream.getVideoTracks()[0];

      // Replace track on all active peer connections
      Object.values(peerConnections.current).forEach((pc) => {
        const senders = pc.getSenders();
        const videoSender = senders.find((s) => s.track && s.track.kind === "video");
        if (videoSender && screenTrack) {
          videoSender.replaceTrack(screenTrack);
        }
      });

      // Update local preview
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Handle user ending screen share via native browser bar
      screenTrack.onended = () => {
        stopScreenShare();
      };

      toast.info("Screen sharing started.");
    } catch (err) {
      console.error("Error starting screen share:", err);
      toast.error("Could not share screen: " + (err.message || err));
    }
  };

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }
    isScreenSharingRef.current = false;
    setIsScreenSharing(false);

    // Revert to webcam track on all connections
    if (localStreamRef.current) {
      const webcamTrack = localStreamRef.current.getVideoTracks()[0];
      Object.values(peerConnections.current).forEach((pc) => {
        const senders = pc.getSenders();
        const videoSender = senders.find((s) => s.track && s.track.kind === "video");
        if (videoSender && webcamTrack) {
          videoSender.replaceTrack(webcamTrack);
        }
      });

      // Revert local preview
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
    }

    toast.info("Screen sharing stopped.");
  };

  const toggleScreenShare = () => {
    if (isScreenSharing) {
      stopScreenShare();
    } else {
      startScreenShare();
    }
  };

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
  // Collaborative Code Editor & Whiteboard Logic
  // ----------------------------------------------------
  const handleEditorChange = (value) => {
    setEditorCode(value);
    if (socketRef.current) {
      socketRef.current.emit("code-sync", { code: value, language: selectedLanguage });
    }
  };

  const handleLanguageChange = (e) => {
    const lang = e.target.value;
    setSelectedLanguage(lang);
    setEditorCode(INITIAL_CODE_TEMPLATES[lang] || "");
    if (socketRef.current) {
      socketRef.current.emit("code-sync", { code: INITIAL_CODE_TEMPLATES[lang] || "", language: lang });
    }
  };

  const handleRunCode = async () => {
    setIsExecuting(true);
    setConsoleOutput("Compiling and executing code...");
    setConsoleError("");
    try {
      const response = await fetch("/api/code-executor/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceCode: editorCode,
          language: selectedLanguage,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setConsoleOutput(data.output || "Execution finished successfully with no stdout.");
        toast.success("Code executed successfully!");
      } else {
        setConsoleError(data.error || "Execution failed.");
        setConsoleOutput(data.output || "");
        toast.error("Execution error.");
      }
    } catch (err) {
      console.error("Error executing code:", err);
      setConsoleError(err.message || "Network error executing code");
      toast.error("Execution failed.");
    } finally {
      setIsExecuting(false);
    }
  };

  // Whiteboard Canvas Drawing Logic
  const canvasRef = useRef(null);
  const [whiteboardTool, setWhiteboardTool] = useState("pencil"); // pencil, rect, circle, line, text
  const [strokeColor, setStrokeColor] = useState("#3b82f6"); // blue
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [whiteboardText, setWhiteboardText] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);
  const [shapes, setShapes] = useState([]); // Save vector history
  const [currentShape, setCurrentShape] = useState(null);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid background
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1;
    const gridSize = 30;
    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw all completed shapes
    shapes.forEach((shape) => {
      ctx.strokeStyle = shape.color;
      ctx.fillStyle = shape.color;
      ctx.lineWidth = shape.width;

      if (shape.type === "pencil") {
        ctx.beginPath();
        shape.points.forEach((pt, idx) => {
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
      } else if (shape.type === "rect") {
        ctx.strokeRect(shape.x, shape.y, shape.w, shape.h);
      } else if (shape.type === "circle") {
        ctx.beginPath();
        ctx.arc(shape.x + shape.w / 2, shape.y + shape.h / 2, Math.abs(shape.w) / 2, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (shape.type === "line") {
        ctx.beginPath();
        ctx.moveTo(shape.x, shape.y);
        ctx.lineTo(shape.x + shape.w, shape.y + shape.h);
        ctx.stroke();
      } else if (shape.type === "text") {
        ctx.font = `${shape.width * 5 + 12}px sans-serif`;
        ctx.fillText(shape.text, shape.x, shape.y);
      }
    });

    // Draw current active shape
    if (currentShape) {
      ctx.strokeStyle = currentShape.color;
      ctx.fillStyle = currentShape.color;
      ctx.lineWidth = currentShape.width;

      if (currentShape.type === "pencil") {
        ctx.beginPath();
        currentShape.points.forEach((pt, idx) => {
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
      } else if (currentShape.type === "rect") {
        ctx.strokeRect(currentShape.x, currentShape.y, currentShape.w, currentShape.h);
      } else if (currentShape.type === "circle") {
        ctx.beginPath();
        ctx.arc(currentShape.x + currentShape.w / 2, currentShape.y + currentShape.h / 2, Math.abs(currentShape.w) / 2, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (currentShape.type === "line") {
        ctx.beginPath();
        ctx.moveTo(currentShape.x, currentShape.y);
        ctx.lineTo(currentShape.x + currentShape.w, currentShape.y + currentShape.h);
        ctx.stroke();
      }
    }
  }, [shapes, currentShape]);

  useEffect(() => {
    if (activeWorkspaceTab === "whiteboard") {
      redrawCanvas();
    }
  }, [redrawCanvas, activeWorkspaceTab]);

  const getCanvasMousePos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handleMouseDown = (e) => {
    const pos = getCanvasMousePos(e);
    setIsDrawing(true);

    if (whiteboardTool === "pencil") {
      setCurrentShape({
        type: "pencil",
        color: strokeColor,
        width: strokeWidth,
        points: [pos]
      });
    } else if (whiteboardTool === "text") {
      if (!whiteboardText.trim()) {
        toast.info("Please enter text in the input box first.");
        setIsDrawing(false);
        return;
      }
      const newShape = {
        type: "text",
        color: strokeColor,
        width: strokeWidth,
        x: pos.x,
        y: pos.y,
        text: whiteboardText
      };
      setShapes((prev) => {
        const next = [...prev, newShape];
        if (socketRef.current) {
          socketRef.current.emit("whiteboard-sync", { shapes: next });
        }
        return next;
      });
      setWhiteboardText("");
      setIsDrawing(false);
    } else {
      setCurrentShape({
        type: whiteboardTool,
        color: strokeColor,
        width: strokeWidth,
        x: pos.x,
        y: pos.y,
        w: 0,
        h: 0
      });
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || !currentShape) return;
    const pos = getCanvasMousePos(e);

    if (currentShape.type === "pencil") {
      setCurrentShape((prev) => ({
        ...prev,
        points: [...prev.points, pos]
      }));
    } else {
      setCurrentShape((prev) => ({
        ...prev,
        w: pos.x - prev.x,
        h: pos.y - prev.y
      }));
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentShape) {
      setShapes((prev) => {
        const next = [...prev, currentShape];
        if (socketRef.current) {
          socketRef.current.emit("whiteboard-sync", { shapes: next });
        }
        return next;
      });
      setCurrentShape(null);
    }
  };

  const handleUndo = () => {
    setShapes((prev) => {
      const next = prev.slice(0, -1);
      if (socketRef.current) {
        socketRef.current.emit("whiteboard-sync", { shapes: next });
      }
      return next;
    });
  };

  const handleClearCanvas = () => {
    setShapes([]);
    if (socketRef.current) {
      socketRef.current.emit("whiteboard-sync", { shapes: [] });
    }
    toast.success("Canvas cleared.");
  };

  const handleDownloadWhiteboard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `whiteboard-${sessionCode}.png`;
    link.href = url;
    link.click();
    toast.success("Whiteboard image downloaded!");
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

    // Stop screen share tracks too
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }
    isScreenSharingRef.current = false;
    setIsScreenSharing(false);

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

  const renderVideoTilesSidebar = () => (
    <div className="w-72 flex flex-col gap-4 overflow-y-auto border-l border-slate-800/80 pl-4 h-full max-h-[calc(100vh-140px)]">
      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
        👥 Participants ({participantsCount})
      </span>
      {/* Local Video */}
      <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shadow aspect-video">
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${isScreenSharing ? "" : "scale-x-[-1]"}`}
        />
        <div className="absolute top-2 left-2 bg-slate-950/80 px-2 py-0.5 rounded-full text-[10px] border border-slate-800/50 font-semibold flex items-center gap-1">
          <span className="w-1 h-1 rounded-full bg-blue-500" />
          {displayName} (You)
        </div>
      </div>
      {/* Remote Videos */}
      {Object.keys(peers).map((socketId) => {
        const peer = peers[socketId];
        return (
          <div key={socketId} className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shadow aspect-video">
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
            <div className="absolute top-2 left-2 bg-slate-950/80 px-2 py-0.5 rounded-full text-[10px] border border-slate-800/50 font-semibold flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-emerald-500" />
              {peer.username}
            </div>
          </div>
        );
      })}
    </div>
  );

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
          {/* Main Workspace Column */}
          <div className="flex-1 flex flex-col p-4 overflow-hidden relative justify-between gap-4">
            
            {/* Header info */}
            <div className="flex items-center justify-between bg-slate-950/40 backdrop-blur p-4 rounded-xl border border-slate-800/80 gap-4">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                  🎥 Code: <code className="text-blue-400 font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">{sessionCode}</code>
                </h2>
                <Button
                  size="xs"
                  onClick={copyInviteLink}
                  className="bg-slate-900 border border-slate-800 text-slate-400 hover:text-white px-2 py-0.5 text-[10px]"
                >
                  <Copy size={10} className="mr-1 inline" /> Copy Link
                </Button>
              </div>

              {/* Workspace Navigation Tabs */}
              <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800/85">
                {[
                  { id: "video", label: "Video Call", icon: Video },
                  { id: "editor", label: "Code Editor", icon: Code },
                  { id: "whiteboard", label: "Whiteboard", icon: PenTool }
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveWorkspaceTab(tab.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        activeWorkspaceTab === tab.id
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                      }`}
                    >
                      <Icon size={12} />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                <Users size={14} className="text-blue-400" />
                <span>{participantsCount} Connected</span>
              </div>
            </div>

            {/* Content Area Based on Active Workspace Tab */}
            <div className="flex-1 flex overflow-hidden min-h-[300px] relative">
              
              {/* Tab 1: Video Grid */}
              {activeWorkspaceTab === "video" && (
                <div className="flex-1 grid gap-4 items-center justify-center overflow-hidden relative">
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
                        className={`w-full h-full object-cover ${isScreenSharing ? "" : "scale-x-[-1]"}`}
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
              )}

              {/* Tab 2: Collaborative Code Editor */}
              {activeWorkspaceTab === "editor" && (
                <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden h-full">
                  <div className="flex-1 flex flex-col bg-slate-950/50 border border-slate-800/80 rounded-2xl overflow-hidden p-4 gap-4">
                    {/* Editor Toolbar */}
                    <div className="flex items-center justify-between border-b border-slate-800/60 pb-3 gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-400">Language:</span>
                        <select
                          value={selectedLanguage}
                          onChange={handleLanguageChange}
                          className="bg-slate-900 border border-slate-850 rounded px-2.5 py-1 text-xs text-white focus:outline-none"
                        >
                          <option value="javascript">JavaScript</option>
                          <option value="python">Python</option>
                          <option value="cpp">C++</option>
                          <option value="java">Java</option>
                        </select>
                      </div>
                      <Button
                        size="sm"
                        disabled={isExecuting}
                        onClick={handleRunCode}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5 px-4 rounded-xl"
                      >
                        {isExecuting ? <RotateCcw className="animate-spin" size={14} /> : <Play size={14} />}
                        Run Code
                      </Button>
                    </div>
                    
                    {/* Editor area */}
                    <div className="flex-1 min-h-[220px] rounded-xl overflow-hidden border border-slate-800 bg-[#1e1e1e]">
                      <Editor
                        height="100%"
                        language={selectedLanguage}
                        theme="vs-dark"
                        value={editorCode}
                        onChange={handleEditorChange}
                        options={{
                          minimap: { enabled: false },
                          fontSize: 14,
                          automaticLayout: true,
                          scrollBeyondLastLine: false
                        }}
                      />
                    </div>

                    {/* Console Output */}
                    <div className="h-44 border-t border-slate-800/60 pt-3 flex flex-col gap-2">
                      <span className="text-xs uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Terminal size={14} className="text-blue-400" /> Output Console
                      </span>
                      <div className="flex-1 bg-slate-900/60 rounded-xl p-3 border border-slate-800/60 overflow-y-auto font-mono text-xs text-slate-300">
                        {consoleError ? (
                          <pre className="text-rose-400 whitespace-pre-wrap">{consoleError}</pre>
                        ) : (
                          <pre className="whitespace-pre-wrap">{consoleOutput || "Output will be printed here after running code..."}</pre>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Sidebar video stream list */}
                  {renderVideoTilesSidebar()}
                </div>
              )}

              {/* Tab 3: Collaborative Whiteboard */}
              {activeWorkspaceTab === "whiteboard" && (
                <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden h-full">
                  <div className="flex-1 flex flex-col bg-slate-950/50 border border-slate-800/80 rounded-2xl overflow-hidden p-4 gap-4">
                    {/* Drawing Toolbar */}
                    <div className="flex flex-wrap items-center justify-between border-b border-slate-800/60 pb-3 gap-2">
                      <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-850">
                        {[
                          { id: "pencil", icon: PenTool, label: "Draw" },
                          { id: "rect", icon: Square, label: "Rectangle" },
                          { id: "circle", icon: Circle, label: "Circle" },
                          { id: "text", icon: Type, label: "Text" }
                        ].map((tool) => {
                          const ToolIcon = tool.icon;
                          return (
                            <button
                              key={tool.id}
                              onClick={() => setWhiteboardTool(tool.id)}
                              className={`p-2 rounded-md transition-all ${whiteboardTool === tool.id ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"}`}
                              title={tool.label}
                            >
                              <ToolIcon size={14} />
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex items-center gap-3">
                        {whiteboardTool === "text" && (
                          <input
                            type="text"
                            placeholder="Enter whiteboard text..."
                            value={whiteboardText}
                            onChange={(e) => setWhiteboardText(e.target.value)}
                            className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-white placeholder-slate-600 focus:outline-none"
                          />
                        )}
                        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-850">
                          {["#3b82f6", "#ef4444", "#10b981", "#eab308", "#ffffff"].map((color) => (
                            <button
                              key={color}
                              onClick={() => setStrokeColor(color)}
                              className={`w-4 h-4 rounded-full border transition-all ${strokeColor === color ? "border-white scale-110" : "border-transparent"}`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        
                        <select
                          value={strokeWidth}
                          onChange={(e) => setStrokeWidth(Number(e.target.value))}
                          className="bg-slate-900 border border-slate-850 rounded px-2 py-0.5 text-xs text-white focus:outline-none"
                        >
                          <option value={1}>Thin</option>
                          <option value={3}>Medium</option>
                          <option value={6}>Thick</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={handleUndo}
                          disabled={shapes.length === 0}
                          className="p-1.5 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 disabled:opacity-50"
                          title="Undo"
                        >
                          <Undo2 size={14} />
                        </button>
                        <button
                          onClick={handleClearCanvas}
                          className="p-1.5 rounded bg-slate-900 border border-slate-800 hover:bg-rose-950 hover:text-rose-450 text-slate-350 transition-colors"
                          title="Clear Canvas"
                        >
                          <Trash2 size={14} />
                        </button>
                        <button
                          onClick={handleDownloadWhiteboard}
                          className="p-1.5 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300"
                          title="Download PNG"
                        >
                          <Download size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Canvas Container */}
                    <div className="flex-1 min-h-[220px] relative rounded-xl overflow-hidden border border-slate-800/80 bg-[#0f172a]/60">
                      <canvas
                        ref={canvasRef}
                        width={900}
                        height={600}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        className="w-full h-full cursor-crosshair block"
                      />
                    </div>
                  </div>

                  {/* Sidebar video stream list */}
                  {renderVideoTilesSidebar()}
                </div>
              )}

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
                onClick={toggleScreenShare}
                className={`p-3.5 rounded-full transition-all ${isScreenSharing ? "bg-blue-600 text-white hover:bg-blue-500" : "bg-slate-900 text-slate-300 hover:bg-slate-800"}`}
                title={isScreenSharing ? "Stop Screen Share" : "Share Screen"}
              >
                <Laptop size={20} />
              </button>
              <button
                onClick={handleLeaveCall}
                className="p-3.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-lg shadow-rose-500/20"
              >
                <PhoneOff size={20} />
              </button>
            </div>
          </div>

          {/* Right sidebar column: Shared Notes Chat */}
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
