'use client';

import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { 
  Mic, MicOff, Video, VideoOff, Share2, StopCircle, 
  Phone, Settings, Users, Copy, Check, AlertCircle,
  Monitor, X, Send, Clock
} from 'lucide-react';
import { io } from 'socket.io-client';

const HumanBuddySession = ({
  sessionId,
  sessionCode,
  userId,
  username,
  onSessionEnd,
  onClose,
  isOwner = false,
}) => {
  // ─── STATE ─────────────────────────────────────────────────────────

  const [socket, setSocket] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [remoteUser, setRemoteUser] = useState(null);
  
  // Local media state
  const [localStream, setLocalStream] = useState(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  
  const [userRole, setUserRole] = useState('waiting');
  const [remoteRole, setRemoteRole] = useState(null);
  const [showRoleAssignment, setShowRoleAssignment] = useState(false);
  
  const [sharedNotes, setSharedNotes] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [sessionTime, setSessionTime] = useState(0);
  const [showCopied, setShowCopied] = useState(false);
  
  // WebRTC state
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const screenShareRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const dataChannelRef = useRef(null);
  const timerIntervalRef = useRef(null);

  // ─── EFFECTS ───────────────────────────────────────────────────────

  // Connect to socket
  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_IO_URL || 'http://localhost:4001';
    const newSocket = io(socketUrl, {
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
      reconnect: true,
    });

    // Join session
    newSocket.emit('join_session', {
      userId,
      username,
      sessionCode,
      isCreator: isOwner,
    });

    // Listen for session joined
    newSocket.on('session_joined', (data) => {
      console.log('[Buddy] Session joined:', data);
      setParticipants(data.participants);
      setUserRole(data.role);
      
      if (data.role === 'waiting' && data.isCreator === false) {
        toast.info('Waiting for role assignment from session owner...');
      }
    });

    // Listen for user joining
    newSocket.on('user_joined_session', (data) => {
      console.log('[Buddy] User joined:', data);
      toast.success(`${data.username} joined the session`);
      setParticipants(data.participantCount);
    });

    // Listen for role assignments
    newSocket.on('role_assigned', (data) => {
      if (data.targetUserId === userId) {
        setUserRole(data.role);
        toast.success(`Role assigned: ${data.role}`);
      }
    });

    // Listen for media toggles
    newSocket.on('camera_toggled', (data) => {
      if (data.userId !== userId) {
        setRemoteUser(prev => prev ? { ...prev, camera: data.enabled } : null);
      }
    });

    newSocket.on('mic_toggled', (data) => {
      if (data.userId !== userId) {
        setRemoteUser(prev => prev ? { ...prev, mic: data.enabled } : null);
      }
    });

    newSocket.on('screenshare_started', (data) => {
      if (data.userId !== userId) {
        toast.info(`${data.username || 'Peer'} started sharing screen`);
      }
    });

    newSocket.on('screenshare_stopped', (data) => {
      if (data.userId !== userId) {
        toast.info('Screen share ended');
      }
    });

    // WebRTC signaling
    newSocket.on('webrtc_offer_received', (data) => {
      handleWebRTCOffer(data.offer, data.from);
    });

    newSocket.on('webrtc_answer_received', (data) => {
      handleWebRTCAnswer(data.answer);
    });

    newSocket.on('ice_candidate_received', (data) => {
      handleICECandidate(data.candidate);
    });

    // Notes update
    newSocket.on('notes_updated', (data) => {
      setSharedNotes(data.content);
    });

    // Session ended
    newSocket.on('session_ended', (data) => {
      toast.info('Session ended by ' + (data.endedBy === userId ? 'you' : 'peer'));
      handleSessionEnd();
    });

    newSocket.on('user_disconnected', (data) => {
      toast.warning(`${data.username} disconnected`);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [userId, username, sessionCode, isOwner]);

  // Initialize local media
  useEffect(() => {
    const initializeMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Failed to get media devices:', error);
        toast.error('Unable to access camera/microphone. Please check permissions.');
      }
    };

    initializeMedia();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Initialize WebRTC connection
  useEffect(() => {
    if (!socket || participants.length < 2) return;

    const initializePeerConnection = async () => {
      try {
        const peerConnection = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ],
        });

        peerConnectionRef.current = peerConnection;

        // Add local stream tracks
        if (localStream) {
          localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
          });
        }

        // Handle remote stream
        peerConnection.ontrack = (event) => {
          console.log('Received remote track:', event.track.kind);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        };

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('ice_candidate', {
              candidate: event.candidate,
              targetUserId: remoteUser?.userId,
            });
          }
        };

        // Create data channel for notes
        const dataChannel = peerConnection.createDataChannel('notes');
        setupDataChannel(dataChannel);

        peerConnection.ondatachannel = (event) => {
          setupDataChannel(event.channel);
        };

        // Create and send offer
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit('webrtc_offer', {
          offer: offer,
          targetUserId: remoteUser?.userId,
        });

        console.log('WebRTC offer sent');
      } catch (error) {
        console.error('Failed to initialize peer connection:', error);
        toast.error('Failed to initialize video call');
      }
    };

    if (isOwner && participants.length === 2) {
      // Find the other participant
      const other = participants.find(p => p !== userId);
      if (other) {
        setRemoteUser({ userId: other });
        initializePeerConnection();
      }
    }
  }, [socket, participants, localStream, isOwner, userId]);

  // Timer
  useEffect(() => {
    timerIntervalRef.current = setInterval(() => {
      setSessionTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timerIntervalRef.current);
  }, []);

  // ─── HANDLERS ──────────────────────────────────────────────────────

  const handleWebRTCOffer = async (offer, from) => {
    try {
      if (!peerConnectionRef.current) {
        const peerConnection = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
          ],
        });
        peerConnectionRef.current = peerConnection;

        if (localStream) {
          localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
          });
        }

        peerConnection.ontrack = (event) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        };

        peerConnection.onicecandidate = (event) => {
          if (event.candidate && socket) {
            socket.emit('ice_candidate', {
              candidate: event.candidate,
              targetUserId: from,
            });
          }
        };

        const dataChannel = peerConnection.createDataChannel('notes');
        setupDataChannel(dataChannel);
        peerConnection.ondatachannel = (event) => setupDataChannel(event.channel);
      }

      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);

      socket.emit('webrtc_answer', {
        answer: answer,
        targetUserId: from,
      });
    } catch (error) {
      console.error('Error handling WebRTC offer:', error);
    }
  };

  const handleWebRTCAnswer = async (answer) => {
    try {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      }
    } catch (error) {
      console.error('Error handling WebRTC answer:', error);
    }
  };

  const handleICECandidate = async (candidate) => {
    try {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  };

  const setupDataChannel = (dataChannel) => {
    dataChannelRef.current = dataChannel;
    dataChannel.onmessage = (event) => {
      setSharedNotes(event.data);
    };
  };

  const toggleCamera = async () => {
    try {
      if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.enabled = !videoTrack.enabled;
          setIsCameraOn(videoTrack.enabled);

          socket.emit('toggle_camera', {
            userId,
            sessionId,
            enabled: videoTrack.enabled,
          });
        }
      }
    } catch (error) {
      console.error('Error toggling camera:', error);
      toast.error('Failed to toggle camera');
    }
  };

  const toggleMic = async () => {
    try {
      if (localStream) {
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = !audioTrack.enabled;
          setIsMicOn(audioTrack.enabled);

          socket.emit('toggle_mic', {
            userId,
            sessionId,
            enabled: audioTrack.enabled,
          });
        }
      }
    } catch (error) {
      console.error('Error toggling mic:', error);
      toast.error('Failed to toggle microphone');
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' },
          audio: false,
        });

        if (screenShareRef.current) {
          screenShareRef.current.srcObject = screenStream;
        }

        setIsScreenSharing(true);
        socket.emit('start_screenshare', {
          userId,
          sessionId,
        });

        // Stop sharing when screen is closed
        screenStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          socket.emit('stop_screenshare', {
            userId,
            sessionId,
          });
        };
      } else {
        setIsScreenSharing(false);
        if (screenShareRef.current?.srcObject) {
          screenShareRef.current.srcObject.getTracks().forEach(track => track.stop());
        }

        socket.emit('stop_screenshare', {
          userId,
          sessionId,
        });
      }
    } catch (error) {
      console.error('Error toggling screen share:', error);
      toast.error('Failed to share screen');
    }
  };

  const assignRole = (role) => {
    if (remoteUser) {
      socket.emit('assign_role', {
        targetUserId: remoteUser.userId,
        role,
      });
      setShowRoleAssignment(false);
      toast.success(`Role assigned: ${role}`);
    }
  };

  const updateNotes = () => {
    socket.emit('update_notes', {
      sessionId,
      content: notesInput,
      timestamp: new Date().toISOString(),
    });
    setSharedNotes(notesInput);
    setNotesInput('');
  };

  const copySessionCode = async () => {
    await navigator.clipboard.writeText(sessionCode);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
    toast.success('Session code copied!');
  };

  const handleSessionEnd = async () => {
    socket.emit('end_session', {
      sessionId,
      feedback: {
        clarity: 0,
        technicalAccuracy: 0,
        communication: 0,
        overall: 0,
      },
    });

    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    toast.success('Session ended');
    onSessionEnd?.();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // ─── RENDER ────────────────────────────────────────────────────────

  if (!socket) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-200">Connecting to session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="sticky top-0 bg-slate-900 border-b border-slate-800 px-6 py-4 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">Interview Buddy Session</h1>
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-lg">
              <Clock className="w-4 h-4 text-blue-400" />
              <span className="font-mono text-sm">{formatTime(sessionTime)}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-lg">
              <span className="text-xs text-slate-400">Code:</span>
              <code className="font-mono font-bold">{sessionCode}</code>
              <button
                onClick={copySessionCode}
                className="ml-2 p-1 hover:bg-slate-700 rounded"
              >
                {showCopied ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Video Section */}
        <div className="flex-1 flex flex-col p-4">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Local Video */}
            <div className="relative bg-slate-900 rounded-lg overflow-hidden border border-slate-800">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-4 left-4 bg-slate-900/80 px-3 py-2 rounded-lg backdrop-blur">
                <p className="text-sm font-medium">{username} (You)</p>
                <p className="text-xs text-slate-400">{userRole === 'waiting' ? 'Role pending' : userRole}</p>
              </div>

              {/* Media Indicators */}
              <div className="absolute top-4 right-4 flex gap-2">
                {isCameraOn ? (
                  <div className="bg-green-500/20 px-2 py-1 rounded text-green-400 text-xs flex items-center gap-1">
                    <Video className="w-3 h-3" /> On
                  </div>
                ) : (
                  <div className="bg-red-500/20 px-2 py-1 rounded text-red-400 text-xs flex items-center gap-1">
                    <VideoOff className="w-3 h-3" /> Off
                  </div>
                )}
                {isMicOn ? (
                  <div className="bg-green-500/20 px-2 py-1 rounded text-green-400 text-xs flex items-center gap-1">
                    <Mic className="w-3 h-3" /> On
                  </div>
                ) : (
                  <div className="bg-red-500/20 px-2 py-1 rounded text-red-400 text-xs flex items-center gap-1">
                    <MicOff className="w-3 h-3" /> Off
                  </div>
                )}
              </div>
            </div>

            {/* Remote Video */}
            <div className="relative bg-slate-900 rounded-lg overflow-hidden border border-slate-800">
              {remoteUser ? (
                <>
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-4 left-4 bg-slate-900/80 px-3 py-2 rounded-lg backdrop-blur">
                    <p className="text-sm font-medium">{remoteUser.username || 'Remote User'}</p>
                    <p className="text-xs text-slate-400">{remoteRole || 'Connected'}</p>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <Users className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                    <p className="text-slate-400">Waiting for peer...</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Screen Share Display */}
          {isScreenSharing && (
            <div className="h-64 bg-slate-900 rounded-lg overflow-hidden border border-slate-800 mb-4">
              <video
                ref={screenShareRef}
                autoPlay
                playsInline
                className="w-full h-full object-contain bg-black"
              />
              <div className="absolute top-2 left-2 bg-purple-500 px-2 py-1 rounded text-xs font-medium">
                Screen Sharing
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className="flex items-center justify-center gap-3 mb-4">
              <button
                onClick={toggleCamera}
                className={`p-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  isCameraOn
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                {isCameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                Camera
              </button>

              <button
                onClick={toggleMic}
                className={`p-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  isMicOn
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                Microphone
              </button>

              <button
                onClick={toggleScreenShare}
                className={`p-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  isScreenSharing
                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                    : 'bg-slate-700 hover:bg-slate-600 text-white'
                }`}
              >
                {isScreenSharing ? <StopCircle className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
                {isScreenSharing ? 'Stop Share' : 'Screen Share'}
              </button>

              {isOwner && userRole !== 'waiting' && (
                <button
                  onClick={() => setShowRoleAssignment(!showRoleAssignment)}
                  className="p-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition-all flex items-center gap-2 text-white"
                >
                  <Users className="w-5 h-5" />
                  Assign Role
                </button>
              )}

              <button
                onClick={handleSessionEnd}
                className="p-3 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-all flex items-center gap-2 text-white ml-auto"
              >
                <Phone className="w-5 h-5" />
                End Session
              </button>
            </div>

            {/* Role Assignment Modal */}
            {showRoleAssignment && isOwner && (
              <div className="grid grid-cols-2 gap-2 mb-4">
                <button
                  onClick={() => assignRole('interviewer')}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-all"
                >
                  Mark as Interviewer
                </button>
                <button
                  onClick={() => assignRole('interviewee')}
                  className="px-3 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition-all"
                >
                  Mark as Interviewee
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Notes Section */}
        <div className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col">
          <div className="border-b border-slate-800 p-4">
            <h2 className="font-bold text-lg">Shared Notes</h2>
            <p className="text-xs text-slate-400">Collaborative notes during session</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="bg-slate-800 rounded-lg p-3 mb-4 min-h-32 max-h-48">
              <p className="text-sm text-slate-300 whitespace-pre-wrap">{sharedNotes || 'No notes yet...'}</p>
            </div>
          </div>

          <div className="border-t border-slate-800 p-4">
            <div className="flex gap-2">
              <textarea
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                placeholder="Add notes..."
                rows={3}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>
            <button
              onClick={updateNotes}
              disabled={!notesInput.trim()}
              className="w-full mt-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg py-2 font-medium transition-all flex items-center justify-center gap-2 text-white"
            >
              <Send className="w-4 h-4" />
              Add Note
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HumanBuddySession;
