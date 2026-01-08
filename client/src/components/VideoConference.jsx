import React, { useEffect, useState, useRef } from "react";

/*
// Add this useEffect at the top of your component for debugging
useEffect(() => {
  console.log("🔍 VIDEO CONFERENCE DEBUG:");
  console.log("📡 Socket connected:", !!socket);
  console.log("🎥 Local stream:", localStream);
  console.log("👥 Room members:", roomMembers);
  console.log("🔗 Peer connections:", peers.size);
  console.log("📹 Remote streams:", remoteStreams.size);
  console.log("🎯 Current user:", currentUser);
}, [socket, localStream, roomMembers, peers, remoteStreams, currentUser]);

*/
const VideoConference = ({ roomId, socket, currentUser, roomMembers, isConnected }) => {
  // Video Conferencing State
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [peers, setPeers] = useState(new Map());
  
  // Refs for video elements
  const localVideoRef = useRef(null);
  const remoteVideosRef = useRef(new Map());

  // ==================== VIDEO CONFERENCING FUNCTIONS ====================

  // Initialize local media stream
  const initializeLocalStream = async (enableVideo = false) => {
    try {
      console.log("🎥 Initializing local stream with video:", enableVideo);
      
      const constraints = {
        audio: true,
        video: enableVideo ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        } : false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      setLocalStream(stream);
      setIsVideoEnabled(enableVideo);
      setIsAudioEnabled(true);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      console.log("✅ Local stream initialized successfully");
      return stream;
    } catch (error) {
      console.error("❌ Error accessing media devices:", error);
      alert("Could not access camera/microphone. Please check permissions.");
      return null;
    }
  };

  // Toggle video on/off
  const toggleVideo = async () => {
    console.log("📹 Toggling video, current state:", isVideoEnabled);
    
    if (!localStream) {
      console.log("🔄 No local stream, initializing with video...");
      const stream = await initializeLocalStream(true);
      if (stream && socket) {
        socket.emit("toggle-video", { roomCode: roomId, videoEnabled: true });
        peers.forEach((peer, userId) => {
          createOffer(peer, userId);
        });
      }
      return;
    }

    const newVideoState = !isVideoEnabled;
    console.log("🔄 New video state:", newVideoState);
    
    if (newVideoState) {
      // Enable video
      try {
        console.log("🔄 Enabling video...");
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: 1280 }, 
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
          },
          audio: false
        });
        
        const videoTrack = videoStream.getVideoTracks()[0];
        localStream.addTrack(videoTrack);
        
        // Replace video track in all peer connections
        peers.forEach((peer, userId) => {
          const sender = peer.getSenders().find(s => 
            s.track && s.track.kind === 'video'
          );
          if (sender) {
            sender.replaceTrack(videoTrack);
          }
        });
        
        console.log("✅ Video enabled successfully");
      } catch (error) {
        console.error("❌ Error enabling video:", error);
        return;
      }
    } else {
      // Disable video
      console.log("🔄 Disabling video...");
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.stop();
        localStream.removeTrack(videoTrack);
      }
      console.log("✅ Video disabled successfully");
    }
    
    setIsVideoEnabled(newVideoState);
    
    if (socket) {
      socket.emit("toggle-video", { roomCode: roomId, videoEnabled: newVideoState });
    }
  };

  // Toggle audio on/off
  const toggleAudio = () => {
    if (!localStream) return;
    
    const newAudioState = !isAudioEnabled;
    const audioTracks = localStream.getAudioTracks();
    audioTracks.forEach(track => {
      track.enabled = newAudioState;
    });
    
    setIsAudioEnabled(newAudioState);
    
    if (socket) {
      socket.emit("toggle-audio", { roomCode: roomId, audioEnabled: newAudioState });
    }
  };

  // Toggle screen sharing
  const toggleScreenShare = async () => {
    if (!localStream) return;
    
    try {
      if (!isScreenSharing) {
        // Start screen share
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        
        const videoTrack = screenStream.getVideoTracks()[0];
        
        // Replace video track in all peer connections
        peers.forEach((peer, userId) => {
          const sender = peer.getSenders().find(s => 
            s.track && s.track.kind === 'video'
          );
          if (sender) {
            sender.replaceTrack(videoTrack);
          }
        });
        
        // Handle when user stops screen share
        videoTrack.onended = () => {
          toggleScreenShare();
        };
        
        setIsScreenSharing(true);
      } else {
        // Stop screen share - revert to camera
        if (isVideoEnabled) {
          const cameraStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false
          });
          
          const videoTrack = cameraStream.getVideoTracks()[0];
          
          // Replace screen share track with camera track
          peers.forEach((peer, userId) => {
            const sender = peer.getSenders().find(s => 
              s.track && s.track.kind === 'video'
            );
            if (sender) {
              sender.replaceTrack(videoTrack);
            }
          });
          
          cameraStream.getTracks().forEach(track => {
            if (track.kind === 'video') {
              localStream.addTrack(track);
            } else {
              track.stop();
            }
          });
        }
        
        setIsScreenSharing(false);
      }
      
      if (socket) {
        socket.emit("screen-share", { 
          roomCode: roomId, 
          isSharing: !isScreenSharing 
        });
      }
    } catch (error) {
      console.error("Error with screen sharing:", error);
    }
  };

  // Create RTCPeerConnection for a user
  const createPeerConnection = (userId) => {
    console.log("🔗 Creating peer connection for:", userId);
    
    const peer = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    // Add local stream tracks to peer connection
    if (localStream) {
      localStream.getTracks().forEach(track => {
        peer.addTrack(track, localStream);
      });
    }

    // Handle incoming remote stream
    peer.ontrack = (event) => {
      console.log("📹 Received remote track from:", userId);
      const [remoteStream] = event.streams;
      setRemoteStreams(prev => new Map(prev.set(userId, remoteStream)));
      
      // Update video element when it's rendered
      setTimeout(() => {
        const videoElement = remoteVideosRef.current.get(userId);
        if (videoElement) {
          videoElement.srcObject = remoteStream;
          console.log("✅ Set remote video source for:", userId);
        }
      }, 100);
    };

    // Handle ICE candidates
    peer.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit("video-ice-candidate", {
          roomCode: roomId,
          candidate: event.candidate,
          toUserId: userId
        });
      }
    };

    // Handle connection state changes
    peer.onconnectionstatechange = () => {
      console.log(`🔗 Peer connection state for ${userId}:`, peer.connectionState);
    };

    peer.oniceconnectionstatechange = () => {
      console.log(`🧊 ICE connection state for ${userId}:`, peer.iceConnectionState);
    };

    return peer;
  };

  // Create and send offer to a user
  const createOffer = async (peer, userId) => {
    try {
      console.log("📨 Creating offer for:", userId);
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      
      if (socket) {
        socket.emit("video-offer", {
          roomCode: roomId,
          offer: offer,
          toUserId: userId
        });
        console.log("✅ Offer sent to:", userId);
      }
    } catch (error) {
      console.error("❌ Error creating offer:", error);
    }
  };

  // Handle incoming video offer
  const handleVideoOffer = async (data) => {
    const { offer, fromUserId, fromUsername } = data;
    console.log("📨 Received video offer from:", fromUsername);
    
    let peer = peers.get(fromUserId);
    if (!peer) {
      peer = createPeerConnection(fromUserId);
      setPeers(prev => new Map(prev.set(fromUserId, peer)));
    }

    try {
      await peer.setRemoteDescription(offer);
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      
      if (socket) {
        socket.emit("video-answer", {
          roomCode: roomId,
          answer: answer,
          toUserId: fromUserId
        });
        console.log("✅ Answer sent to:", fromUsername);
      }
    } catch (error) {
      console.error("❌ Error handling video offer:", error);
    }
  };

  // Handle incoming video answer
  const handleVideoAnswer = async (data) => {
    const { answer, fromUserId } = data;
    console.log("📨 Received video answer from:", fromUserId);
    
    const peer = peers.get(fromUserId);
    
    if (peer) {
      try {
        await peer.setRemoteDescription(answer);
        console.log("✅ Answer processed for:", fromUserId);
      } catch (error) {
        console.error("❌ Error handling video answer:", error);
      }
    }
  };

  // Handle incoming ICE candidate
  const handleIceCandidate = async (data) => {
    const { candidate, fromUserId } = data;
    const peer = peers.get(fromUserId);
    
    if (peer && candidate) {
      try {
        await peer.addIceCandidate(candidate);
        console.log("🧊 ICE candidate added for:", fromUserId);
      } catch (error) {
        console.error("❌ Error adding ICE candidate:", error);
      }
    }
  };

  // Handle user leaving (clean up video)
  const handleUserLeft = (data) => {
    const { userId } = data;
    console.log("👋 User left, cleaning up video for:", userId);
    
    // Close peer connection
    const peer = peers.get(userId);
    if (peer) {
      peer.close();
      setPeers(prev => {
        const newPeers = new Map(prev);
        newPeers.delete(userId);
        return newPeers;
      });
    }
    
    // Remove remote stream
    setRemoteStreams(prev => {
      const newStreams = new Map(prev);
      newStreams.delete(userId);
      return newStreams;
    });
  };

  // Initialize video connections when room members change
  useEffect(() => {
    if (!socket || !localStream || !currentUser) {
      console.log("🚫 Cannot initialize video: missing dependencies", {
        socket: !!socket,
        localStream: !!localStream,
        currentUser: !!currentUser
      });
      return;
    }

    console.log("🔄 Room members changed, updating video connections:", roomMembers.length);
    
    roomMembers.forEach(member => {
      // Don't create connection to self or offline users
      if (member.userId === currentUser.id || !member.online || peers.has(member.userId)) {
        return;
      }

      console.log("🔗 Creating video connection for:", member.username);
      
      // Create new peer connection
      const peer = createPeerConnection(member.userId);
      setPeers(prev => new Map(prev.set(member.userId, peer)));
      
      // Create offer to establish connection
      createOffer(peer, member.userId);
    });

    // Clean up peers for users who left
    peers.forEach((peer, userId) => {
      const memberExists = roomMembers.some(member => 
        member.userId === userId && member.online
      );
      
      if (!memberExists) {
        console.log("🧹 Cleaning up video connection for:", userId);
        peer.close();
        setPeers(prev => {
          const newPeers = new Map(prev);
          newPeers.delete(userId);
          return newPeers;
        });
        
        setRemoteStreams(prev => {
          const newStreams = new Map(prev);
          newStreams.delete(userId);
          return newStreams;
        });
      }
    });
  }, [roomMembers, socket, localStream, currentUser]);

  // Initialize audio stream when component mounts
  useEffect(() => {
    console.log("🎵 Initializing audio stream...");
    initializeLocalStream(false);
  }, []);

  // Setup socket event listeners
  useEffect(() => {
    if (!socket) return;

    console.log("🔌 Setting up video socket event listeners");
    
    socket.on("video-offer", handleVideoOffer);
    socket.on("video-answer", handleVideoAnswer);
    socket.on("video-ice-candidate", handleIceCandidate);
    socket.on("user-left", handleUserLeft);

    return () => {
      console.log("🧹 Cleaning up video socket event listeners");
      socket.off("video-offer", handleVideoOffer);
      socket.off("video-answer", handleVideoAnswer);
      socket.off("video-ice-candidate", handleIceCandidate);
      socket.off("user-left", handleUserLeft);
    };
  }, [socket]);

  // Clean up media streams on unmount
  useEffect(() => {
    return () => {
      console.log("🧹 Cleaning up video conference component");
      
      // Stop all media tracks
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      
      // Close all peer connections
      peers.forEach(peer => peer.close());
    };
  }, []);

  return (
    <div style={{ 
      flex: 2,
      backgroundColor: "white", 
      border: "1px solid #e0e0e0",
      borderRadius: "8px",
      padding: "20px",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      display: "flex",
      flexDirection: "column"
    }}>
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        marginBottom: "15px"
      }}>
        <h3 style={{ margin: 0 }}>Video Conference</h3>
        <div style={{ display: "flex", gap: "10px" }}>
          {/* Video Controls */}
          <button 
            onClick={toggleVideo}
            style={{ 
              backgroundColor: isVideoEnabled ? "#007bff" : "#dc3545",
              color: "white",
              border: "none",
              padding: "8px 12px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.8rem",
              display: "flex",
              alignItems: "center",
              gap: "5px"
            }}
            title={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
          >
            {isVideoEnabled ? "📹 On" : "📹 Off"}
          </button>
          
          <button 
            onClick={toggleAudio}
            style={{ 
              backgroundColor: isAudioEnabled ? "#007bff" : "#dc3545",
              color: "white",
              border: "none",
              padding: "8px 12px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.8rem",
              display: "flex",
              alignItems: "center",
              gap: "5px"
            }}
            title={isAudioEnabled ? "Mute microphone" : "Unmute microphone"}
          >
            {isAudioEnabled ? "🎤 On" : "🎤 Muted"}
          </button>
          
          <button 
            onClick={toggleScreenShare}
            style={{ 
              backgroundColor: isScreenSharing ? "#28a745" : "#6c757d",
              color: "white",
              border: "none",
              padding: "8px 12px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.8rem",
              display: "flex",
              alignItems: "center",
              gap: "5px"
            }}
            title={isScreenSharing ? "Stop screen share" : "Share screen"}
          >
            {isScreenSharing ? "🖥️ Sharing" : "🖥️ Share"}
          </button>
        </div>
      </div>

      {/* Video Grid */}
      <div style={{ 
        flex: 1,
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: "15px",
        alignItems: "center",
        justifyContent: "center"
      }}>
        {/* Local Video */}
        <div style={{ 
          position: "relative",
          backgroundColor: "#000",
          borderRadius: "8px",
          overflow: "hidden",
          aspectRatio: "16/9"
        }}>
          <video
            ref={localVideoRef}
            autoPlay
            muted
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: "scaleX(-1)" // Mirror front camera
            }}
          />
          <div style={{
            position: "absolute",
            bottom: "8px",
            left: "8px",
            backgroundColor: "rgba(0,0,0,0.7)",
            color: "white",
            padding: "4px 8px",
            borderRadius: "4px",
            fontSize: "0.7rem"
          }}>
            You {!isVideoEnabled && "(Video Off)"}
          </div>
        </div>

        {/* Remote Videos */}
        {Array.from(remoteStreams.entries()).map(([userId, stream]) => {
          const member = roomMembers.find(m => m.userId === userId);
          return (
            <div 
              key={userId}
              style={{ 
                position: "relative",
                backgroundColor: "#000",
                borderRadius: "8px",
                overflow: "hidden",
                aspectRatio: "16/9"
              }}
            >
              <video
                ref={el => {
                  if (el) {
                    remoteVideosRef.current.set(userId, el);
                    el.srcObject = stream;
                  }
                }}
                autoPlay
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover"
                }}
              />
              <div style={{
                position: "absolute",
                bottom: "8px",
                left: "8px",
                backgroundColor: "rgba(0,0,0,0.7)",
                color: "white",
                padding: "4px 8px",
                borderRadius: "4px",
                fontSize: "0.7rem"
              }}>
                {member?.username || "User"} 
                {member?.hasVideo === false && " (Video Off)"}
              </div>
            </div>
          );
        })}

        {/* Placeholder when no one has video */}
        {remoteStreams.size === 0 && (
          <div style={{ 
            gridColumn: "1 / -1",
            textAlign: "center",
            color: "#666",
            padding: "40px"
          }}>
            <h4>No one has joined with video yet</h4>
            <p>Click the camera button to start video conferencing</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoConference;