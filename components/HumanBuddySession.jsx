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

  // 🔥 STABLE SOCKET CONNECTION (Only connects once, like Google Meet)
  useEffect(() => {
    // Don't connect if missing required data
    if (!userId || !sessionCode) {
      console.log(`⏳ [HumanBuddy] Waiting for required data:`, { userId, sessionCode });
      return;
    }

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_IO_URL || 'http://localhost:4001';
    console.log(`\n${'═'.repeat(60)}`);
    console.log('🔧 [HumanBuddy] ONE-TIME Socket Connection');
    console.log(`${'═'.repeat(60)}`);
    console.log(`📍 UserId: ${userId}`);
    console.log(`👤 Username: ${username}`);
    console.log(`🔑 SessionCode: ${sessionCode}`);
    console.log(`👑 IsOwner: ${isOwner}`);
    console.log(`🌐 Socket URL: ${socketUrl}`);
    console.log(`🔗 Socket Namespace: /interview-buddy`);
    
    // 🔍 VERIFY ENVIRONMENT
    if (socketUrl.includes('localhost')) {
      console.warn(`⚠️ [WARNING] Using localhost socket URL - make sure local socket server is running!`);
    } else {
      console.log(`✅ [INFO] Using production socket server URL`);
    }
    console.log(``);
    
    const newSocket = io(`${socketUrl}/interview-buddy`, {
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
      reconnect: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
    });

    console.log('🔌 [HumanBuddy] Connecting to /interview-buddy namespace...');

    // ✅ Connection handler - emit join once
    const handleConnect = () => {
      console.log(`✅ [HumanBuddy] Socket connected: ${newSocket.id}`);
      
      // Emit join_session exactly once
      const joinData = {
        userId,
        username,
        sessionCode,
        isCreator: isOwner,
      };
      
      console.log(`📤 [HumanBuddy] Emitting join_session:`, joinData);
      newSocket.emit('join_session', joinData);
    };

    // Listen for session joined
    const handleSessionJoined = (data) => {
      console.log(`${'═'.repeat(60)}`);
      console.log(`✅ [HumanBuddy] SESSION_JOINED received`);
      console.log(`${'═'.repeat(60)}`);
      console.log(`📊 Full data:`, JSON.stringify(data, null, 2));
      console.log(`📍 Participants:`, data.participants);
      console.log(`👥 Remote Users Count:`, data.remoteUsers?.length || 0);
      console.log(`👤 My Role:`, data.role);
      console.log(``) ;
      
      setParticipants(data.participants || []);
      setUserRole(data.role);
      
      // Set remote users if available
      if (data.remoteUsers && data.remoteUsers.length > 0) {
        console.log(`\n🎯 [ACTION] Setting remote user from session_joined`);
        console.log(`   User: ${data.remoteUsers[0].username} (${data.remoteUsers[0].userId})`);
        setRemoteUser(data.remoteUsers[0]);
        toast.success(`${data.remoteUsers[0].username} is in the session`);
      } else {
        console.warn(`⚠️ [WARNING] No remote users in session_joined response`);
      }
      
      if (data.role === 'waiting' && !data.isCreator) {
        toast.info('Waiting for role assignment from session owner...');
      }
    };

    // Listen for user joining
    const handleUserJoined = (data) => {
      console.log(`${'═'.repeat(60)}`);
      console.log(`✅ [HumanBuddy] USER_JOINED_SESSION received`);
      console.log(`${'═'.repeat(60)}`);
      console.log(`📊 Full data:`, JSON.stringify(data, null, 2));
      console.log(`👤 Joining User: ${data.username} (${data.userId})`);
      console.log(`🔌 User Object Available:`, !!data.user);
      console.log(``);
      
      if (data.user && data.user.userId !== userId) {
        console.log(`\n🎯 [ACTION] Setting remote user from user_joined_session`);
        console.log(`   User: ${data.user.username} (${data.user.userId})`);
        console.log(`   Camera: ${data.user.camera}, Mic: ${data.user.mic}, Screen: ${data.user.screenShare}`);
        setRemoteUser(data.user);
        toast.success(`${data.username} joined the session!`);
      } else {
        console.warn(`⚠️ [WARNING] No user object or is same user in user_joined_session`);
      }
      
      setParticipants(data.participants || []);
    };

    const handleError = (data) => {
      console.error(`${'═'.repeat(60)}`);
      console.error(`❌ [HumanBuddy] SOCKET ERROR`);
      console.error(`${'═'.repeat(60)}`);
      console.error(`📊 Error data:`, JSON.stringify(data, null, 2));
      console.error(``);
      toast.error(data.message || 'Socket connection error');
    };

    const handleDisconnect = () => {
      console.log(`${'═'.repeat(60)}`);
      console.error(`❌ [HumanBuddy] SOCKET DISCONNECTED`);
      console.error(`${'═'.repeat(60)}`);
      console.log(``);
    };

    const handleRoleAssigned = (data) => {
      console.log(`${'═'.repeat(60)}`);
      console.log(`✅ [HumanBuddy] ROLE_ASSIGNED received`);
      console.log(`${'═'.repeat(60)}`);
      console.log(`🎯 Target User: ${data.targetUserId}`);
      console.log(`👔 Role: ${data.role}`);
      console.log(`📋 Assigned by: ${data.assignedBy}`);
      console.log(``);
      
      if (data.targetUserId === userId) {
        console.log(`✅ [ACTION] Role is for me! Setting role to: ${data.role}`);
        setUserRole(data.role);
        toast.success(`✅ You are now: ${data.role}`);
      } else {
        console.log(`ℹ️ [INFO] Role assignment for someone else (${data.targetUserId})`);
      }
    };

    // Register all listeners
    newSocket.on('connect', handleConnect);
    newSocket.on('session_joined', handleSessionJoined);
    newSocket.on('user_joined_session', handleUserJoined);
    newSocket.on('error', handleError);
    newSocket.on('disconnect', handleDisconnect);
    newSocket.on('role_assigned', handleRoleAssigned);

    // Media toggle listeners
    newSocket.on('camera_toggled', (data) => {
      console.log(`✅ [HumanBuddy] CAMERA_TOGGLED:`, data);
      if (data.userId !== userId) {
        setRemoteUser(prev => prev ? { ...prev, camera: data.enabled } : null);
      }
    });

    newSocket.on('mic_toggled', (data) => {
      console.log(`✅ [HumanBuddy] MIC_TOGGLED:`, data);
      if (data.userId !== userId) {
        setRemoteUser(prev => prev ? { ...prev, mic: data.enabled } : null);
      }
    });

    newSocket.on('screenshare_started', (data) => {
      console.log(`✅ [HumanBuddy] SCREENSHARE_STARTED:`, data);
      if (data.userId !== userId) {
        toast.info(`${data.username || 'Peer'} started sharing screen`);
      }
    });

    newSocket.on('screenshare_stopped', (data) => {
      console.log(`✅ [HumanBuddy] SCREENSHARE_STOPPED:`, data);
      if (data.userId !== userId) {
        toast.info('Screen share ended');
      }
    });

    // WebRTC signaling
    newSocket.on('webrtc_offer_received', (data) => {
      console.log(`✅ [HumanBuddy] WEBRTC_OFFER_RECEIVED:`, data);
      handleWebRTCOffer(data.offer, data.from);
    });

    newSocket.on('webrtc_answer_received', (data) => {
      console.log(`✅ [HumanBuddy] WEBRTC_ANSWER_RECEIVED:`, data);
      handleWebRTCAnswer(data.answer);
    });

    newSocket.on('ice_candidate_received', (data) => {
      console.log(`✅ [HumanBuddy] ICE_CANDIDATE_RECEIVED:`, data);
      handleICECandidate(data.candidate);
    });

    // Notes update
    newSocket.on('notes_updated', (data) => {
      console.log(`✅ [HumanBuddy] NOTES_UPDATED:`, data);
      setSharedNotes(data.content);
    });

    // Session ended
    newSocket.on('session_ended', (data) => {
      console.log(`✅ [HumanBuddy] SESSION_ENDED:`, data);
      toast.info('Session ended');
      handleSessionEnd();
    });

    newSocket.on('user_disconnected', (data) => {
      console.log(`✅ [HumanBuddy] USER_DISCONNECTED:`, data);
      toast.warning(`${data.username} disconnected`);
    });

    setSocket(newSocket);

    // � DEBUGGING: Monitor for remote user discovery
    const debugTimeout = setTimeout(() => {
      console.log(`\n${'═'.repeat(60)}`);
      console.log(`⏰ [HumanBuddy] DEBUG CHECK (2 seconds after connect)`);
      console.log(`${'═'.repeat(60)}`);
      console.log(`📍 Current State:`);
      console.log(`   - Socket ID: ${newSocket.id}`);
      console.log(`   - Socket Connected: ${newSocket.connected}`);
      console.log(`   - Participants Count: ${participants.length}`);
      console.log(`   - Remote User Set: ${!!remoteUser}`);
      console.log(`   - User ID: ${userId}`);
      console.log(`   - Session Code: ${sessionCode}`);
      
      if (!remoteUser && participants.length === 0) {
        console.warn(`⚠️ [WARNING] RemoteUser and participants both empty after 2 seconds`);
        console.warn(`⚠️ [WARNING] This might indicate socket events not being received`);
      }
      console.log(``);
    }, 2000);

    // 🔥 IMPORTANT: Only disconnect on component unmount (not on dependency changes)
    
    // 🔄 FALLBACK: Poll Firestore to find other user if socket events fail
    const pollInterval = setInterval(async () => {
      try {
        const { db } = await import('@/firebase/client');
        const sessionQuery = await db
          .collection('interview_buddy_sessions')
          .where('sessionCode', '==', sessionCode)
          .limit(1)
          .get();

        if (!sessionQuery.empty && !remoteUser) {
          const sessionData = sessionQuery.docs[0].data();
          const allParticipants = sessionData.participants || [];
          const otherUsers = allParticipants.filter(pid => pid !== userId);

          if (otherUsers.length > 0) {
            const otherUserId = otherUsers[0];
            const otherUserData = sessionData[`participants_${otherUserId}`];
            
            if (otherUserData) {
              console.log(`🔄 [FALLBACK] Found other user in Firestore, setting remote user`);
              const directRemoteUser = {
                userId: otherUserId,
                username: otherUserData.name || `User ${otherUserId}`,
                camera: otherUserData.camera || false,
                mic: otherUserData.mic || false,
                screenShare: otherUserData.screenShare || false,
              };
              setRemoteUser(directRemoteUser);
            }
          }
        }
      } catch (error) {
        // Silent error
      }
    }, 3000);
    
    return () => {
      clearTimeout(debugTimeout);
      clearInterval(pollInterval);
      console.log(`🧹 [HumanBuddy] Cleaning up socket listeners...`);
      newSocket.off('connect', handleConnect);
      newSocket.off('session_joined', handleSessionJoined);
      newSocket.off('user_joined_session', handleUserJoined);
      newSocket.off('error', handleError);
      newSocket.off('disconnect', handleDisconnect);
      newSocket.off('role_assigned', handleRoleAssigned);
      newSocket.disconnect();
    };
  }, []); // 🔥 EMPTY DEPS: Only runs once on mount, not on state changes

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
    // ✅ FIX 3: Trigger on remoteUser, not participants.length
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`🔍 [HumanBuddy] WebRTC Init Check`);
    console.log(`${'═'.repeat(60)}`);
    console.log(`   Socket exists: ${!!socket}`);
    console.log(`   Remote user exists: ${!!remoteUser}`);
    console.log(`   Remote user ID: ${remoteUser?.userId}`);
    console.log(`   Peer connection exists: ${!!peerConnectionRef.current}`);
    console.log(``);
    
    if (!socket) {
      console.warn(`⚠️ Socket not ready, skipping WebRTC init`);
      return;
    }
    
    if (!remoteUser || !remoteUser.userId) {
      console.warn(`⚠️ Remote user not available, skipping WebRTC init`);
      return;
    }

    const initializePeerConnection = async () => {
      try {
        // Avoid reinitializing
        if (peerConnectionRef.current) {
          console.log('[HumanBuddy] ℹ️ WebRTC already initialized, skipping');
          return;
        }

        console.log(`${'═'.repeat(60)}`);
        console.log(`🚀 [HumanBuddy] Initializing RTCPeerConnection`);
        console.log(`${'═'.repeat(60)}`);
        console.log(`   Remote User: ${remoteUser.username} (${remoteUser.userId})`);
        console.log(``);

        const peerConnection = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ],
        });

        peerConnectionRef.current = peerConnection;
        console.log('✅ [HumanBuddy] RTCPeerConnection created');

        // Add local stream tracks
        if (localStream) {
          console.log(`📹 [HumanBuddy] Adding local ${localStream.getTracks().length} tracks...`);
          localStream.getTracks().forEach((track, idx) => {
            peerConnection.addTrack(track, localStream);
            console.log(`   ✅ Added local ${track.kind} track #${idx + 1}`);
          });
        } else {
          console.warn(`⚠️ [WARNING] No local stream available`);
        }

        // Handle remote stream
        peerConnection.ontrack = (event) => {
          console.log(`${'═'.repeat(60)}`);
          console.log(`✅ [HumanBuddy] REMOTE TRACK RECEIVED`);
          console.log(`${'═'.repeat(60)}`);
          console.log(`   Track Kind: ${event.track.kind}`);
          console.log(`   Track ID: ${event.track.id}`);
          console.log(`   Streams: ${event.streams.length}`);
          console.log(``);
          
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
            console.log(`✅ Set remote video source`);
          } else {
            console.warn(`⚠️ remoteVideoRef.current is not available`);
          }
        };

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            console.log(`📡 [HumanBuddy] ICE candidate generated, sending to ${remoteUser?.username}`);
            socket.emit('ice_candidate', {
              candidate: event.candidate,
              targetUserId: remoteUser?.userId,
            });
          } else {
            console.log(`✅ [HumanBuddy] ICE candidate gathering complete`);
          }
        };

        // Create data channel for notes
        const dataChannel = peerConnection.createDataChannel('notes');
        setupDataChannel(dataChannel);

        peerConnection.ondatachannel = (event) => {
          setupDataChannel(event.channel);
        };

        // ✅ FIX 3: Only owner creates offer; peer waits for it
        if (isOwner) {
          console.log(`${'═'.repeat(60)}`);
          console.log(`🎬 [HumanBuddy] OWNER: Creating WebRTC offer...`);
          console.log(`${'═'.repeat(60)}`);
          console.log(`   Remote User: ${remoteUser.username}`);
          console.log(``);
          
          const offer = await peerConnection.createOffer();
          await peerConnection.setLocalDescription(offer);
          
          console.log(`✅ [HumanBuddy] Offer created and set as local description`);
          console.log(`📤 [HumanBuddy] Sending offer to ${remoteUser.username}...`);
          
          socket.emit('webrtc_offer', {
            offer: offer,
            targetUserId: remoteUser.userId,
          });
          
          console.log(`✅ [HumanBuddy] Offer sent via socket`);
        } else {
          console.log(`${'═'.repeat(60)}`);
          console.log(`👂 [HumanBuddy] PEER: Waiting for WebRTC offer...`);
          console.log(`${'═'.repeat(60)}`);
          console.log(`   Waiting for owner to send offer`);
          console.log(``);
        }
      } catch (error) {
        console.error('Failed to initialize peer connection:', error);
        toast.error('Failed to initialize video call');
      }
    };

    // ✅ FIX 3: Initialize for both owner and peer when remoteUser is set
    initializePeerConnection();
  }, [socket, remoteUser, localStream, isOwner, userId]);

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
      console.log(`${'═'.repeat(60)}`);
      console.log(`📨 [HumanBuddy] WEBRTC OFFER RECEIVED`);
      console.log(`${'═'.repeat(60)}`);
      console.log(`   From User: ${from}`);
      console.log(`   Current PeerConnection: ${!!peerConnectionRef.current}`);
      console.log(``);
      
      if (!peerConnectionRef.current) {
        console.log(`🔨 [HumanBuddy] Creating PeerConnection to handle offer...`);
        
        const peerConnection = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
          ],
        });
        peerConnectionRef.current = peerConnection;

        if (localStream) {
          console.log(`📹 [HumanBuddy] Adding local tracks...`);
          localStream.getTracks().forEach((track, idx) => {
            peerConnection.addTrack(track, localStream);
            console.log(`   ✅ Added ${track.kind} track #${idx + 1}`);
          });
        }

        peerConnection.ontrack = (event) => {
          console.log(`✅ [HumanBuddy] Remote track received in offer handler:`, event.track.kind);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        };

        peerConnection.onicecandidate = (event) => {
          if (event.candidate && socket) {
            console.log(`📡 [HumanBuddy] Sending ICE candidate from offer response...`);
            socket.emit('ice_candidate', {
              candidate: event.candidate,
              targetUserId: from,
            });
          } else {
            console.log(`✅ [HumanBuddy] ICE gathering complete for answer`);
          }
        };

        const dataChannel = peerConnection.createDataChannel('notes');
        setupDataChannel(dataChannel);
        peerConnection.ondatachannel = (event) => setupDataChannel(event.channel);
      }

      console.log(`🔄 [HumanBuddy] Setting remote description from offer...`);
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer));
      console.log(`✅ [HumanBuddy] Remote description set`);
      
      console.log(`🎬 [HumanBuddy] Creating answer...`);
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);
      console.log(`✅ [HumanBuddy] Answer created and set as local description`);

      console.log(`📤 [HumanBuddy] Sending answer back...`);
      socket.emit('webrtc_answer', {
        answer: answer,
        targetUserId: from,
      });
      console.log(`✅ [HumanBuddy] Answer sent`);
    } catch (error) {
      console.error(`❌ [HumanBuddy] Error handling WebRTC offer:`, error);
      toast.error('Failed to establish video call');
    }
  };

  const handleWebRTCAnswer = async (answer) => {
    try {
      console.log(`${'═'.repeat(60)}`);
      console.log(`📨 [HumanBuddy] WEBRTC ANSWER RECEIVED`);
      console.log(`${'═'.repeat(60)}`);
      console.log(`   Current PeerConnection: ${!!peerConnectionRef.current}`);
      console.log(``);
      
      if (peerConnectionRef.current) {
        console.log(`🔄 [HumanBuddy] Setting remote description from answer...`);
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        console.log(`✅ [HumanBuddy] Remote description set from answer - VIDEO CALL SHOULD START NOW`);
      } else {
        console.warn(`⚠️ [WARNING] No peer connection to set answer on`);
      }
    } catch (error) {
      console.error('❌ Error handling WebRTC answer:', error);
      toast.error('Failed to process answer');
    }
  };

  const handleICECandidate = async (candidate) => {
    try {
      console.log(`📡 [HumanBuddy] ICE candidate received`);
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        console.log(`✅ [HumanBuddy] ICE candidate added`);
      } else {
        console.warn(`⚠️ [WARNING] No peer connection to add ICE candidate to`);
      }
    } catch (error) {
      console.error('❌ Error adding ICE candidate:', error);
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

        const screenVideoTrack = screenStream.getVideoTracks()[0];
        
        // Display on local screen share element
        if (screenShareRef.current) {
          screenShareRef.current.srcObject = screenStream;
        }

        // ✅ KEY FIX: Replace video track in peer connection so peer sees screen
        if (peerConnectionRef.current) {
          try {
            const sender = peerConnectionRef.current
              .getSenders()
              .find(s => s.track?.kind === 'video');
            
            if (sender) {
              await sender.replaceTrack(screenVideoTrack);
              console.log('[HumanBuddy] ✓ Replaced camera track with screen track in WebRTC');
            }
          } catch (err) {
            console.warn('[HumanBuddy] Could not replace track, peer may not see screen:', err);
          }
        }

        setIsScreenSharing(true);
        socket.emit('start_screenshare', {
          userId,
          sessionId,
        });

        // Stop sharing when screen is closed by user
        screenVideoTrack.onended = async () => {
          console.log('[HumanBuddy] Screen share ended by user');
          setIsScreenSharing(false);
          
          if (screenShareRef.current?.srcObject) {
            screenShareRef.current.srcObject.getTracks().forEach(track => track.stop());
          }

          // ✅ Switch back to camera
          if (peerConnectionRef.current && localStream) {
            try {
              const cameraVideoTrack = localStream.getVideoTracks()[0];
              const sender = peerConnectionRef.current
                .getSenders()
                .find(s => s.track?.kind === 'video');
              
              if (sender && cameraVideoTrack) {
                await sender.replaceTrack(cameraVideoTrack);
                console.log('[HumanBuddy] ✓ Switched back to camera');
              }
            } catch (err) {
              console.warn('[HumanBuddy] Could not switch back to camera:', err);
            }
          }

          socket.emit('stop_screenshare', {
            userId,
            sessionId,
          });
        };
      } else {
        // Stop screen sharing manually
        setIsScreenSharing(false);
        if (screenShareRef.current?.srcObject) {
          screenShareRef.current.srcObject.getTracks().forEach(track => track.stop());
        }

        // Switch back to camera if available
        if (peerConnectionRef.current && localStream) {
          try {
            const cameraVideoTrack = localStream.getVideoTracks()[0];
            const sender = peerConnectionRef.current
              .getSenders()
              .find(s => s.track?.kind === 'video');
            
            if (sender && cameraVideoTrack) {
              await sender.replaceTrack(cameraVideoTrack);
              console.log('[HumanBuddy] ✓ Switched back to camera');
            }
          } catch (err) {
            console.warn('[HumanBuddy] Could not switch back to camera:', err);
          }
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
