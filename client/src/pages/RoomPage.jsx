import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../services/api";
import socketService from "../services/socket";
import FileSharing from "../components/FileSharing";
import VideoConference from "../components/VideoConference";
import Whiteboard from "../components/Whiteboard";
import FocusSounds from "../components/FocusSounds";
import profileApi from '../services/profileApi';

export default function RoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [roomMembers, setRoomMembers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [showLeaveOptions, setShowLeaveOptions] = useState(false);
  const [showPermanentLeaveConfirm, setShowPermanentLeaveConfirm] = useState(false);
  
  // Pomodoro Timer State
  const [pomodoroTime, setPomodoroTime] = useState(25 * 60); // Current time in seconds
  const [isPomodoroActive, setIsPomodoroActive] = useState(false);
  const [pomodoroMode, setPomodoroMode] = useState('work'); // 'work' or 'break'
  const [pomodoroCycles, setPomodoroCycles] = useState(0);
  const [showTimerSettings, setShowTimerSettings] = useState(false);
  
  // Customizable Timer Settings
  const [workDuration, setWorkDuration] = useState(25); // minutes
  const [breakDuration, setBreakDuration] = useState(5); // minutes
  
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const pomodoroIntervalRef = useRef(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize timer with current settings
  useEffect(() => {
    setPomodoroTime(workDuration * 60);
  }, [workDuration]);

  // Pomodoro Timer Effect
  useEffect(() => {
    if (isPomodoroActive && pomodoroTime > 0) {
      pomodoroIntervalRef.current = setInterval(() => {
        setPomodoroTime((time) => time - 1);
      }, 1000);
    } else if (isPomodoroActive && pomodoroTime === 0) {
      // Timer completed
      handlePomodoroComplete();
    }

    return () => {
      if (pomodoroIntervalRef.current) {
        clearInterval(pomodoroIntervalRef.current);
      }
    };
  }, [isPomodoroActive, pomodoroTime]);

  const handlePomodoroComplete = () => {
    if (pomodoroMode === 'work') {
      setPomodoroCycles(prev => prev + 1);
      // Switch to break
      setPomodoroMode('break');
      setPomodoroTime(breakDuration * 60); // Custom break duration
      
      // Show notification
      if (Notification.permission === 'granted') {
        new Notification('Pomodoro Complete!', {
          body: `Time for a ${breakDuration}-minute break!`,
          icon: '/favicon.ico'
        });
      }
    } else {
      // Switch back to work
      setPomodoroMode('work');
      setPomodoroTime(workDuration * 60); // Custom work duration
      
      if (Notification.permission === 'granted') {
        new Notification('Break Over!', {
          body: `Time to get back to work for ${workDuration} minutes!`,
          icon: '/favicon.ico'
        });
      }
    }
  };

  const startPomodoro = () => {
    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
    setIsPomodoroActive(true);
  };

  const pausePomodoro = () => {
    setIsPomodoroActive(false);
  };

  const resetPomodoro = () => {
    setIsPomodoroActive(false);
    setPomodoroTime(workDuration * 60);
    setPomodoroMode('work');
  };

  const applyTimerSettings = () => {
    // Reset timer with new settings
    setIsPomodoroActive(false);
    setPomodoroTime(workDuration * 60);
    setPomodoroMode('work');
    setShowTimerSettings(false);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Fetch room data, user info, and message history
  useEffect(() => {
    const fetchRoomAndUser = async () => {
      try {
        const token = localStorage.getItem("token");
        
        // Fetch room data
        const roomRes = await API.get(`/rooms/${roomId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRoom(roomRes.data);

        // Fetch message history
        await fetchMessageHistory();

        // Get current user info
        const userData = JSON.parse(localStorage.getItem("user") || "{}");
        setCurrentUser({
          id: userData.id,
          username: userData.username
        });
      } catch (err) {
        setError(err.response?.data?.msg || "Failed to load room");
      } finally {
        setLoading(false);
      }
    };
    fetchRoomAndUser();
  }, [roomId]);

  // Fetch message history
  const fetchMessageHistory = async (beforeTimestamp = null) => {
    try {
      setLoadingHistory(true);
      
      const params = { limit: 50 };
      if (beforeTimestamp) {
        params.before = beforeTimestamp;
      }
      
      const response = await API.get(`/messages/room/${roomId}`, { params });
      
      if (beforeTimestamp) {
        // Append older messages at the beginning
        setMessages(prev => [...response.data.messages, ...prev]);
      } else {
        // Replace messages (initial load)
        setMessages(response.data.messages);
      }
      
      setHasMoreMessages(response.data.hasMore);
      
      // Scroll to bottom only on initial load
      if (!beforeTimestamp) {
        setTimeout(scrollToBottom, 100);
      }
    } catch (error) {
      console.error("Error fetching message history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Load more messages when scrolling to top
  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (container && container.scrollTop === 0 && hasMoreMessages && !loadingHistory) {
      const oldestMessage = messages[0];
      if (oldestMessage) {
        fetchMessageHistory(oldestMessage.createdAt);
      }
    }
  };

  // Socket connection and event handlers
  useEffect(() => {
    // Connect to socket
    const socketInstance = socketService.connect();
    setSocket(socketInstance);

    // Socket event listeners
    socketInstance.on("connect", () => {
      console.log("Connected to socket");
      setIsConnected(true);
      // Join the room after connection
      socketInstance.emit("join_room", { roomCode: roomId });
    });

    socketInstance.on("disconnect", (reason) => {
      console.log("Disconnected from socket:", reason);
      setIsConnected(false);
    });

    socketInstance.on("receive_message", (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    socketInstance.on("room_members", (members) => {
      console.log("Room members updated:", members);
      setRoomMembers(members);
    });

    // Add reconnection handling
    socketInstance.on("reconnect", (attemptNumber) => {
      console.log("Reconnected to socket, attempt:", attemptNumber);
      setIsConnected(true);
      // Rejoin the room after reconnection
      socketInstance.emit("join_room", { roomCode: roomId });
    });

    socketInstance.on("reconnect_error", (error) => {
      console.error("Reconnection error:", error);
    });

    socketInstance.on("reconnect_failed", () => {
      console.error("Failed to reconnect");
      setIsConnected(false);
    });

    // Cleanup on unmount - Only remove event listeners, don't auto-leave room
    return () => {
      socketInstance.off("connect");
      socketInstance.off("disconnect");
      socketInstance.off("receive_message");
      socketInstance.off("room_members");
      socketInstance.off("reconnect");
      socketInstance.off("reconnect_error");
      socketInstance.off("reconnect_failed");
      
      // Cleanup pomodoro timer
      if (pomodoroIntervalRef.current) {
        clearInterval(pomodoroIntervalRef.current);
      }
    };
  }, [roomId]);

  // Study time tracking effect
useEffect(() => {
  let studyTimeInterval;
  let studyStartTime;

  if (isConnected && room) {
    // Start tracking study time when user joins room
    studyStartTime = Date.now();

    studyTimeInterval = setInterval(async () => {
      const minutesInRoom = Math.floor((Date.now() - studyStartTime) / (1000 * 60));
      
      // Track study time every 5 minutes
      if (minutesInRoom > 0 && minutesInRoom % 5 === 0) {
        try {
          await profileApi.addStudyTime(5, roomId, room.name);
        } catch (error) {
          console.error('Error tracking study time:', error);
        }
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
  }

  return () => {
    if (studyTimeInterval) {
      clearInterval(studyTimeInterval);
    }
    
    // Track final study time when leaving room
    if (studyStartTime && room) {
      const totalMinutes = Math.floor((Date.now() - studyStartTime) / (1000 * 60));
      if (totalMinutes > 0) {
        profileApi.addStudyTime(totalMinutes, roomId, room.name)
          .then(response => {
            if (response.data.newBadges && response.data.newBadges.length > 0) {
              console.log('Earned new badges:', response.data.newBadges);
            }
          })
          .catch(error => {
            console.error('Error tracking final study time:', error);
          });
      }
    }
  };
}, [isConnected, room, roomId]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim() && socket && isConnected) {
      socket.emit("send_message", {
        roomCode: roomId,
        text: newMessage.trim()
      });
      setNewMessage("");
    } else {
      console.error("Cannot send message: Socket not connected");
    }
  };

  // Leave Session - Just navigate away without leaving permanently
  const handleLeaveSession = () => {
    console.log("Leaving session temporarily");
    navigate("/home");
  };

  // Leave Room Permanently - Remove from room members
  const handleLeaveRoomPermanently = async () => {
    try {
      // Emit leave room event to socket
      if (socket && isConnected) {
        socket.emit("leave_room", { roomCode: roomId });
      }

      // Also call API to remove from database room members
      const token = localStorage.getItem("token");
      await API.post("/rooms/leave", 
        { roomId: roomId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log("Successfully left room permanently");
      
      // Navigate back to home
      navigate("/home");
    } catch (err) {
      console.error("Error leaving room:", err);
      navigate("/home");
    }
  };

  const handleLeaveButtonClick = () => {
    setShowLeaveOptions(true);
  };

  const handleCancelLeave = () => {
    setShowLeaveOptions(false);
    setShowPermanentLeaveConfirm(false);
  };

  const handlePermanentLeaveClick = () => {
    setShowPermanentLeaveConfirm(true);
  };

  const handleConfirmPermanentLeave = () => {
    setShowPermanentLeaveConfirm(false);
    setShowLeaveOptions(false);
    handleLeaveRoomPermanently();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e);
    }
  };

  // Format message timestamp
  const formatMessageTime = (timestamp) => {
    if (!timestamp) return "";
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      // Today - show time only
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      // Older than 24 hours - show date and time
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  // Check if messages should be grouped
  const shouldGroupMessages = (currentMsg, previousMsg) => {
    if (!previousMsg || currentMsg.type === "system" || previousMsg.type === "system") {
      return false;
    }
    
    if (currentMsg.userId !== previousMsg.userId) {
      return false;
    }
    
    const currentTime = new Date(currentMsg.timestamp || currentMsg.createdAt);
    const previousTime = new Date(previousMsg.timestamp || previousMsg.createdAt);
    const timeDiff = (currentTime - previousTime) / (1000 * 60); // Difference in minutes
    
    return timeDiff < 5; // Group if less than 5 minutes apart
  };

  if (loading) return (
    <div style={{ 
      display: "flex", 
      justifyContent: "center", 
      alignItems: "center", 
      height: "100vh" 
    }}>
      <p>Loading room...</p>
    </div>
  );

  if (error) return (
    <div style={{ 
      display: "flex", 
      justifyContent: "center", 
      alignItems: "center", 
      height: "100vh",
      color: "red" 
    }}>
      <p>{error}</p>
    </div>
  );

  return (
    <div style={{ 
      padding: "20px", 
      display: "flex", 
      flexDirection: "column", 
      height: "100vh",
      backgroundColor: "#f5f5f5"
    }}>
      {/* Room Header */}
      <div style={{ 
        backgroundColor: "white",
        padding: "20px",
        borderRadius: "8px",
        border: "1px solid #e0e0e0",
        marginBottom: "20px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
      }}>
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "flex-start" 
        }}>
          <div>
            <h1 style={{ margin: "0 0 8px 0", color: "#333" }}>{room.name}</h1>
            <p style={{ margin: "0 0 12px 0", color: "#666" }}>{room.description}</p>
            <div style={{ fontSize: "0.9rem", color: "#888" }}>
              Room ID: <strong>{room.roomId}</strong> • 
              Messages: <strong>{messages.length}</strong> • 
              Capacity: {roomMembers.filter(m => m.online).length}/{room.capacity} • 
              {room.isPrivate ? " Private Room" : " Public Room"} •
              <span style={{ 
                color: isConnected ? "#4CAF50" : "#ff4444",
                fontWeight: "bold",
                marginLeft: "8px"
              }}>
                {isConnected ? "Connected" : "Disconnected"}
              </span>
            </div>
          </div>
          
          {/* Enhanced Leave Options */}
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            {showPermanentLeaveConfirm ? (
              <div style={{ 
                display: "flex", 
                gap: "10px",
                backgroundColor: "#fff3cd",
                padding: "15px",
                borderRadius: "6px",
                border: "1px solid #ffeaa7",
                alignItems: "center"
              }}>
                <div style={{ flex: 1 }}>
                  <strong style={{ color: "#856404" }}>Leave Room Permanently?</strong>
                  <p style={{ margin: "5px 0 0 0", fontSize: "0.8rem", color: "#856404" }}>
                    You will be removed from this room and won't be able to rejoin unless invited again.
                  </p>
                </div>
                <button 
                  onClick={handleConfirmPermanentLeave}
                  style={{ 
                    backgroundColor: "#dc3545", 
                    color: "white", 
                    border: "none", 
                    padding: "8px 16px", 
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    fontWeight: "500"
                  }}
                >
                  Yes, Leave
                </button>
                <button 
                  onClick={handleCancelLeave}
                  style={{ 
                    backgroundColor: "transparent", 
                    color: "#6c757d", 
                    border: "1px solid #6c757d", 
                    padding: "8px 16px", 
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    fontWeight: "500"
                  }}
                >
                  Cancel
                </button>
              </div>
            ) : showLeaveOptions ? (
              <div style={{ 
                display: "flex", 
                gap: "10px",
                backgroundColor: "#f8f9fa",
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #e0e0e0"
              }}>
                <button 
                  onClick={handleLeaveSession}
                  style={{ 
                    backgroundColor: "#6c757d", 
                    color: "white", 
                    border: "none", 
                    padding: "8px 16px", 
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    fontWeight: "500"
                  }}
                  title="Temporarily leave - you can rejoin later"
                >
                  Leave Session
                </button>
                <button 
                  onClick={handlePermanentLeaveClick}
                  style={{ 
                    backgroundColor: "#dc3545", 
                    color: "white", 
                    border: "none", 
                    padding: "8px 16px", 
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    fontWeight: "500"
                  }}
                  title="Permanently leave this room"
                >
                  Leave Room
                </button>
                <button 
                  onClick={handleCancelLeave}
                  style={{ 
                    backgroundColor: "transparent", 
                    color: "#6c757d", 
                    border: "1px solid #6c757d", 
                    padding: "8px 16px", 
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    fontWeight: "500"
                  }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button 
                onClick={handleLeaveButtonClick}
                style={{ 
                  backgroundColor: "#ff4444", 
                  color: "white", 
                  border: "none", 
                  padding: "10px 20px", 
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  fontWeight: "500"
                }}
              >
                Leave Room
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ 
        display: "flex", 
        flex: 1, 
        gap: "20px",
        minHeight: 0
      }}>
        {/* Left Column - Video, Files & Notes */}
        <div style={{ 
          flex: 3, 
          display: "flex", 
          flexDirection: "column", 
          gap: "20px",
          minWidth: 0
        }}>
          {/* Video Conference Component */}
          <VideoConference 
            roomId={roomId}
            socket={socket}
            currentUser={currentUser}
            roomMembers={roomMembers}
            isConnected={isConnected}
          />

          {/* File Sharing & Whiteboard Area */}
          <div style={{ 
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            minWidth: 0
          }}>
            {/* Pomodoro Timer with Focus Sounds */}
            <div style={{ 
              backgroundColor: "white", 
              border: "1px solid #e0e0e0",
              borderRadius: "8px",
              padding: "20px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
            }}>
              <h3 style={{ 
                margin: "0 0 15px 0", 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center" 
              }}>
                <span>Pomodoro Timer</span>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <span style={{ 
                    fontSize: "0.8rem", 
                    backgroundColor: pomodoroMode === 'work' ? "#e3f2fd" : "#e8f5e8",
                    color: pomodoroMode === 'work' ? "#1976d2" : "#2e7d32",
                    padding: "4px 8px",
                    borderRadius: "12px"
                  }}>
                    {pomodoroMode === 'work' ? 'Work Session' : 'Break Time'}
                  </span>
                  <button 
                    onClick={() => setShowTimerSettings(!showTimerSettings)}
                    style={{ 
                      backgroundColor: "transparent",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      padding: "4px 8px",
                      cursor: "pointer",
                      fontSize: "0.7rem"
                    }}
                    title="Timer Settings"
                  >
                    ⚙️
                  </button>
                </div>
              </h3>

              {/* Timer Settings */}
              {showTimerSettings && (
                <div style={{ 
                  backgroundColor: "#f8f9fa",
                  padding: "15px",
                  borderRadius: "6px",
                  marginBottom: "15px",
                  border: "1px solid #e9ecef"
                }}>
                  <h4 style={{ margin: "0 0 10px 0", fontSize: "0.9rem" }}>Timer Settings</h4>
                  <div style={{ display: "flex", gap: "15px", marginBottom: "10px" }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: "0.8rem", color: "#666", display: "block", marginBottom: "5px" }}>
                        Work Duration (minutes)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="60"
                        value={workDuration}
                        onChange={(e) => setWorkDuration(parseInt(e.target.value) || 1)}
                        style={{
                          width: "100%",
                          padding: "8px",
                          border: "1px solid #ddd",
                          borderRadius: "4px",
                          fontSize: "0.9rem"
                        }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: "0.8rem", color: "#666", display: "block", marginBottom: "5px" }}>
                        Break Duration (minutes)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={breakDuration}
                        onChange={(e) => setBreakDuration(parseInt(e.target.value) || 1)}
                        style={{
                          width: "100%",
                          padding: "8px",
                          border: "1px solid #ddd",
                          borderRadius: "4px",
                          fontSize: "0.9rem"
                        }}
                      />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button 
                      onClick={applyTimerSettings}
                      style={{ 
                        backgroundColor: "#007bff",
                        color: "white",
                        border: "none",
                        padding: "6px 12px",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "0.8rem"
                      }}
                    >
                      Apply Settings
                    </button>
                    <button 
                      onClick={() => setShowTimerSettings(false)}
                      style={{ 
                        backgroundColor: "transparent",
                        color: "#6c757d",
                        border: "1px solid #6c757d",
                        padding: "6px 12px",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "0.8rem"
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              
              {/* Focus Sounds Integration */}
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center",
                marginBottom: "15px",
                padding: "10px",
                backgroundColor: "#f8f9fa",
                borderRadius: "6px",
                border: "1px solid #e9ecef"
              }}>
                <div style={{ fontSize: "0.9rem", color: "#666" }}>
                  <strong>Completed Cycles:</strong> {pomodoroCycles}
                  <br />
                  <span style={{ fontSize: "0.8rem" }}>
                    Current: {workDuration}min work / {breakDuration}min break
                  </span>
                </div>
                <FocusSounds />
              </div>
              
              <div style={{ textAlign: "center", marginBottom: "15px" }}>
                <div style={{ 
                  fontSize: "2.5rem", 
                  fontWeight: "bold",
                  color: pomodoroMode === 'work' ? "#dc3545" : "#28a745",
                  marginBottom: "10px"
                }}>
                  {formatTime(pomodoroTime)}
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                {!isPomodoroActive ? (
                  <button 
                    onClick={startPomodoro}
                    style={{ 
                      backgroundColor: "#28a745",
                      color: "white",
                      border: "none",
                      padding: "8px 16px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "0.9rem"
                    }}
                  >
                    Start Timer
                  </button>
                ) : (
                  <button 
                    onClick={pausePomodoro}
                    style={{ 
                      backgroundColor: "#ffc107",
                      color: "black",
                      border: "none",
                      padding: "8px 16px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "0.9rem"
                    }}
                  >
                    Pause
                  </button>
                )}
                <button 
                  onClick={resetPomodoro}
                  style={{ 
                    backgroundColor: "#6c757d",
                    color: "white",
                    border: "none",
                    padding: "8px 16px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "0.9rem"
                  }}
                >
                  Reset
                </button>
              </div>
            </div>

            {/* File Sharing Component */}
            <FileSharing roomCode={roomId} currentUser={currentUser} />
            
            {/* Whiteboard Component */}
            <Whiteboard 
              roomId={roomId}
              socket={socket}
              currentUser={currentUser}
              isConnected={isConnected}
            />
          </div>
        </div>

        {/* Chat Area */}
        <div style={{ 
          flex: 1,
          minWidth: "400px",
          maxWidth: "500px",
          display: "flex",
          flexDirection: "column"
        }}>
          <div style={{ 
            display: "flex", 
            flexDirection: "column",
            height: "100%",
            border: "1px solid #e0e0e0",
            borderRadius: "8px",
            backgroundColor: "white",
            overflow: "hidden"
          }}>
            {/* Chat Header */}
            <div style={{ 
              padding: "15px 20px",
              borderBottom: "1px solid #e0e0e0",
              backgroundColor: "#f8f9fa"
            }}>
              <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Chat</h3>
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                fontSize: "0.8rem",
                color: "#666",
                marginTop: "4px"
              }}>
                <div style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: isConnected ? "#4CAF50" : "#ff4444",
                  marginRight: "6px"
                }}></div>
                <span>
                  {roomMembers.filter(m => m.online).length} online • {roomMembers.length} total • {messages.length} messages
                </span>
              </div>
            </div>

            {/* Messages Area */}
            <div 
              ref={messagesContainerRef}
              onScroll={handleScroll}
              style={{ 
                flex: 1,
                padding: "15px",
                overflowY: "auto",
                backgroundColor: "#fafafa",
                display: "flex",
                flexDirection: "column"
              }}
            >
              {/* Loading indicator for message history */}
              {loadingHistory && (
                <div style={{ 
                  textAlign: "center", 
                  color: "#666",
                  padding: "10px",
                  fontSize: "0.9rem"
                }}>
                  Loading older messages...
                </div>
              )}

              {messages.length === 0 && !loadingHistory ? (
                <div style={{ 
                  textAlign: "center", 
                  color: "#999",
                  fontStyle: "italic",
                  marginTop: "20px",
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  {isConnected ? "No messages yet. Start the conversation!" : "Connecting to chat..."}
                </div>
              ) : (
                messages.map((msg, index) => {
                  const previousMsg = messages[index - 1];
                  const isGrouped = shouldGroupMessages(msg, previousMsg);
                  
                  return (
                    <div 
                      key={msg._id || index} 
                      style={{ 
                        marginBottom: isGrouped ? "2px" : "12px",
                      }}
                    >
                      {msg.type === "system" ? (
                        <div style={{ 
                          textAlign: "center",
                          margin: "8px 0"
                        }}>
                          <span style={{
                            backgroundColor: "#e3f2fd",
                            color: "#1976d2",
                            padding: "4px 12px",
                            borderRadius: "12px",
                            fontSize: "0.8rem",
                            fontStyle: "italic"
                          }}>
                            {msg.text}
                          </span>
                        </div>
                      ) : (
                        <div style={{ 
                          display: "flex",
                          flexDirection: "column",
                          maxWidth: "80%",
                          marginLeft: msg.userId === currentUser?.id ? "auto" : "0"
                        }}>
                          {!isGrouped && (
                            <div style={{ 
                              display: "flex", 
                              justifyContent: "space-between",
                              fontSize: "0.75rem",
                              color: "#666",
                              marginBottom: "2px",
                              padding: "0 8px"
                            }}>
                              <strong>{msg.author}</strong>
                              <span>{formatMessageTime(msg.timestamp || msg.createdAt)}</span>
                            </div>
                          )}
                          <div style={{ 
                            backgroundColor: msg.userId === currentUser?.id ? "#007bff" : "#f0f0f0",
                            color: msg.userId === currentUser?.id ? "white" : "black",
                            padding: isGrouped ? "4px 12px" : "8px 12px",
                            borderRadius: "12px",
                            wordWrap: "break-word",
                            marginTop: isGrouped ? "0" : "4px"
                          }}>
                            {msg.text}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={sendMessage} style={{ 
              padding: "15px",
              borderTop: "1px solid #e0e0e0",
              backgroundColor: "white"
            }}>
              <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={isConnected ? "Type a message..." : "Connecting..."}
                    disabled={!isConnected}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1px solid #ddd",
                      borderRadius: "20px",
                      fontSize: "0.9rem",
                      outline: "none"
                    }}
                  />
                </div>
                <button 
                  type="submit"
                  disabled={!newMessage.trim() || !isConnected}
                  style={{
                    backgroundColor: newMessage.trim() && isConnected ? "#007bff" : "#ccc",
                    color: "white",
                    border: "none",
                    padding: "10px 20px",
                    borderRadius: "20px",
                    cursor: newMessage.trim() && isConnected ? "pointer" : "not-allowed",
                    fontSize: "0.9rem",
                    fontWeight: "500"
                  }}
                >
                  Send
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}