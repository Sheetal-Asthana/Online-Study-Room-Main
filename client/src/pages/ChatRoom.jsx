// import React, { useState, useEffect, useRef } from "react";
// import io from "socket.io-client";

// const ChatBox = ({ roomId, currentUser }) => {
//   const [socket, setSocket] = useState(null);
//   const [messages, setMessages] = useState([]);
//   const [newMessage, setNewMessage] = useState("");
//   const [roomMembers, setRoomMembers] = useState([]);
//   const [isConnected, setIsConnected] = useState(false);
//   const messagesEndRef = useRef(null);

//   // Scroll to bottom of messages
//   const scrollToBottom = () => {
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
//   };

//   useEffect(() => {
//     scrollToBottom();
//   }, [messages]);

//   // Socket connection and event handlers
//   useEffect(() => {
//     const token = localStorage.getItem("token");
//     const username = currentUser?.username || localStorage.getItem("username") || "User";
    
//     const newSocket = io("http://localhost:8000", {
//       auth: {
//         token: token,
//         username: username
//       }
//     });

//     newSocket.on("connect", () => {
//       console.log("Connected to socket");
//       setIsConnected(true);
//       newSocket.emit("join_room", { roomCode: roomId });
//     });

//     newSocket.on("disconnect", () => {
//       console.log("Disconnected from socket");
//       setIsConnected(false);
//     });

//     newSocket.on("receive_message", (msg) => {
//       setMessages(prev => [...prev, msg]);
//     });

//     newSocket.on("room_members", (members) => {
//       setRoomMembers(members);
//     });

//     newSocket.on("user_joined", (data) => {
//       setMessages(prev => [...prev, {
//         author: "System",
//         text: `${data.username} joined the room`,
//         time: new Date().toLocaleTimeString(),
//         type: "system"
//       }]);
//     });

//     newSocket.on("user_left", (data) => {
//       setMessages(prev => [...prev, {
//         author: "System",
//         text: `${data.username} left the room`,
//         time: new Date().toLocaleTimeString(),
//         type: "system"
//       }]);
//     });

//     setSocket(newSocket);

//     // Cleanup on unmount
//     return () => {
//       newSocket.disconnect();
//     };
//   }, [roomId, currentUser]);

//   const sendMessage = (e) => {
//     e.preventDefault();
//     if (newMessage.trim() && socket) {
//       socket.emit("send_message", {
//         roomCode: roomId,
//         text: newMessage.trim()
//       });
//       setNewMessage("");
//     }
//   };

//   const handleKeyPress = (e) => {
//     if (e.key === 'Enter' && !e.shiftKey) {
//       e.preventDefault();
//       sendMessage(e);
//     }
//   };

//   const formatTime = (timeString) => {
//     return timeString;
//   };

//   const isSystemMessage = (message) => {
//     return message.author === "System" || message.type === "system";
//   };

//   return (
//     <div style={{ 
//       display: "flex", 
//       flexDirection: "column",
//       height: "100%",
//       border: "1px solid #e0e0e0",
//       borderRadius: "8px",
//       backgroundColor: "white",
//       overflow: "hidden"
//     }}>
//       {/* Chat Header */}
//       <div style={{ 
//         padding: "15px 20px",
//         borderBottom: "1px solid #e0e0e0",
//         backgroundColor: "#f8f9fa",
//         display: "flex",
//         justifyContent: "space-between",
//         alignItems: "center"
//       }}>
//         <div>
//           <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Chat</h3>
//           <div style={{ 
//             display: "flex", 
//             alignItems: "center", 
//             fontSize: "0.8rem",
//             color: "#666",
//             marginTop: "4px"
//           }}>
//             <div style={{
//               width: "8px",
//               height: "8px",
//               borderRadius: "50%",
//               backgroundColor: isConnected ? "#4CAF50" : "#ff4444",
//               marginRight: "6px"
//             }}></div>
//             <span>
//               {roomMembers.filter(m => m.online).length} online • {roomMembers.length} total
//             </span>
//           </div>
//         </div>
//       </div>

//       {/* Main Content Area */}
//       <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
//         {/* Messages Area */}
//         <div style={{ 
//           flex: 3,
//           display: "flex", 
//           flexDirection: "column",
//           minWidth: 0 // Important for flexbox text overflow
//         }}>
//           {/* Messages Container */}
//           <div style={{ 
//             flex: 1,
//             padding: "15px",
//             overflowY: "auto",
//             backgroundColor: "#fafafa"
//           }}>
//             {messages.length === 0 ? (
//               <div style={{ 
//                 textAlign: "center", 
//                 color: "#999",
//                 fontStyle: "italic",
//                 marginTop: "20px"
//               }}>
//                 No messages yet. Start the conversation!
//               </div>
//             ) : (
//               messages.map((msg, index) => (
//                 <div 
//                   key={index} 
//                   style={{ 
//                     marginBottom: "12px",
//                     animation: "fadeIn 0.3s ease-in"
//                   }}
//                 >
//                   {isSystemMessage(msg) ? (
//                     // System message
//                     <div style={{ 
//                       textAlign: "center",
//                       margin: "8px 0"
//                     }}>
//                       <span style={{
//                         backgroundColor: "#e3f2fd",
//                         color: "#1976d2",
//                         padding: "4px 12px",
//                         borderRadius: "12px",
//                         fontSize: "0.8rem",
//                         fontStyle: "italic"
//                       }}>
//                         {msg.text}
//                       </span>
//                     </div>
//                   ) : (
//                     // User message
//                     <div style={{ 
//                       display: "flex",
//                       flexDirection: "column",
//                       maxWidth: "80%",
//                       marginLeft: msg.author === currentUser?.username ? "auto" : "0"
//                     }}>
//                       <div style={{ 
//                         display: "flex", 
//                         justifyContent: "space-between",
//                         fontSize: "0.75rem",
//                         color: "#666",
//                         marginBottom: "2px",
//                         padding: "0 8px"
//                       }}>
//                         <strong>{msg.author}</strong>
//                         <span>{formatTime(msg.time)}</span>
//                       </div>
//                       <div style={{ 
//                         backgroundColor: msg.author === currentUser?.username ? "#007bff" : "#f0f0f0",
//                         color: msg.author === currentUser?.username ? "white" : "black",
//                         padding: "8px 12px",
//                         borderRadius: "12px",
//                         wordWrap: "break-word",
//                         border: msg.author === currentUser?.username ? "none" : "1px solid #e0e0e0"
//                       }}>
//                         {msg.text}
//                       </div>
//                     </div>
//                   )}
//                 </div>
//               ))
//             )}
//             <div ref={messagesEndRef} />
//           </div>

//           {/* Message Input */}
//           <form onSubmit={sendMessage} style={{ 
//             padding: "15px",
//             borderTop: "1px solid #e0e0e0",
//             backgroundColor: "white"
//           }}>
//             <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
//               <div style={{ flex: 1, position: "relative" }}>
//                 <textarea
//                   value={newMessage}
//                   onChange={(e) => setNewMessage(e.target.value)}
//                   onKeyPress={handleKeyPress}
//                   placeholder="Type a message..."
//                   rows="1"
//                   style={{
//                     width: "100%",
//                     padding: "10px 12px",
//                     border: "1px solid #ddd",
//                     borderRadius: "20px",
//                     resize: "none",
//                     fontSize: "0.9rem",
//                     fontFamily: "inherit",
//                     minHeight: "40px",
//                     maxHeight: "100px",
//                     outline: "none",
//                     transition: "border-color 0.2s"
//                   }}
//                   onInput={(e) => {
//                     e.target.style.height = "auto";
//                     e.target.style.height = e.target.scrollHeight + "px";
//                   }}
//                 />
//               </div>
//               <button 
//                 type="submit"
//                 disabled={!newMessage.trim() || !isConnected}
//                 style={{
//                   backgroundColor: newMessage.trim() && isConnected ? "#007bff" : "#ccc",
//                   color: "white",
//                   border: "none",
//                   padding: "10px 16px",
//                   borderRadius: "20px",
//                   cursor: newMessage.trim() && isConnected ? "pointer" : "not-allowed",
//                   fontSize: "0.9rem",
//                   fontWeight: "500",
//                   transition: "background-color 0.2s"
//                 }}
//               >
//                 Send
//               </button>
//             </div>
//           </form>
//         </div>

//         {/* Members Sidebar */}
//         <div style={{ 
//           flex: 1,
//           minWidth: "150px",
//           maxWidth: "200px",
//           borderLeft: "1px solid #e0e0e0",
//           backgroundColor: "#f8f9fa",
//           padding: "15px",
//           overflowY: "auto"
//         }}>
//           <h4 style={{ 
//             margin: "0 0 12px 0", 
//             fontSize: "0.9rem",
//             color: "#666"
//           }}>
//             Members
//           </h4>
//           <div style={{ fontSize: "0.8rem" }}>
//             {roomMembers.map((member, index) => (
//               <div 
//                 key={index} 
//                 style={{ 
//                   display: "flex", 
//                   alignItems: "center", 
//                   marginBottom: "8px",
//                   padding: "4px 0"
//                 }}
//               >
//                 <div style={{
//                   width: "8px",
//                   height: "8px",
//                   borderRadius: "50%",
//                   backgroundColor: member.online ? "#4CAF50" : "#ccc",
//                   marginRight: "8px",
//                   flexShrink: 0
//                 }}></div>
//                 <span 
//                   style={{ 
//                     fontWeight: member.online ? "600" : "400",
//                     color: member.online ? "#333" : "#999"
//                   }}
//                   title={member.online ? "Online" : "Offline"}
//                 >
//                   {member.username}
//                   {member.userId === currentUser?.id && " (You)"}
//                 </span>
//               </div>
//             ))}
//           </div>
//         </div>
//       </div>

//       {/* CSS Animation */}
//       <style>
//         {`
//           @keyframes fadeIn {
//             from { opacity: 0; transform: translateY(5px); }
//             to { opacity: 1; transform: translateY(0); }
//           }
//         `}
//       </style>
//     </div>
//   );
// };

// export default ChatBox;


import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";

const ChatBox = ({ roomId, currentUser }) => {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [roomMembers, setRoomMembers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Socket connection and event handlers
  useEffect(() => {
    const token = localStorage.getItem("token");
    const username = currentUser?.username || localStorage.getItem("username") || "User";
    
    const newSocket = io("http://localhost:9000", {
      auth: {
        token: token,
        username: username
      }
    });

    newSocket.on("connect", () => {
      console.log("Connected to socket");
      setIsConnected(true);
      newSocket.emit("join_room", { roomCode: roomId });
    });

    newSocket.on("disconnect", () => {
      console.log("Disconnected from socket");
      setIsConnected(false);
    });

    newSocket.on("receive_message", (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    newSocket.on("room_members", (members) => {
      setRoomMembers(members);
    });

    newSocket.on("user_joined", (data) => {
      setMessages(prev => [...prev, {
        author: "System",
        text: `${data.username} joined the room`,
        time: new Date().toLocaleTimeString(),
        type: "system"
      }]);
    });

    newSocket.on("user_left", (data) => {
      setMessages(prev => [...prev, {
        author: "System",
        text: `${data.username} left the room`,
        time: new Date().toLocaleTimeString(),
        type: "system"
      }]);
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.disconnect();
    };
  }, [roomId, currentUser]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim() && socket) {
      socket.emit("send_message", {
        roomCode: roomId,
        text: newMessage.trim()
      });
      setNewMessage("");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e);
    }
  };

  const formatTime = (timeString) => {
    return timeString;
  };

  const isSystemMessage = (message) => {
    return message.author === "System" || message.type === "system";
  };

  return (
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
        backgroundColor: "#f8f9fa",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <div>
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
              {roomMembers.filter(m => m.online).length} online • {roomMembers.length} total
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Messages Area */}
        <div style={{ 
          flex: 3,
          display: "flex", 
          flexDirection: "column",
          minWidth: 0 // Important for flexbox text overflow
        }}>
          {/* Messages Container */}
          <div style={{ 
            flex: 1,
            padding: "15px",
            overflowY: "auto",
            backgroundColor: "#fafafa"
          }}>
            {messages.length === 0 ? (
              <div style={{ 
                textAlign: "center", 
                color: "#999",
                fontStyle: "italic",
                marginTop: "20px"
              }}>
                No messages yet. Start the conversation!
              </div>
            ) : (
              messages.map((msg, index) => (
                <div 
                  key={index} 
                  style={{ 
                    marginBottom: "12px",
                    animation: "fadeIn 0.3s ease-in"
                  }}
                >
                  {isSystemMessage(msg) ? (
                    // System message
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
                    // User message
                    <div style={{ 
                      display: "flex",
                      flexDirection: "column",
                      maxWidth: "80%",
                      marginLeft: msg.author === currentUser?.username ? "auto" : "0"
                    }}>
                      <div style={{ 
                        display: "flex", 
                        justifyContent: "space-between",
                        fontSize: "0.75rem",
                        color: "#666",
                        marginBottom: "2px",
                        padding: "0 8px"
                      }}>
                        <strong>{msg.author}</strong>
                        <span>{formatTime(msg.time)}</span>
                      </div>
                      <div style={{ 
                        backgroundColor: msg.author === currentUser?.username ? "#007bff" : "#f0f0f0",
                        color: msg.author === currentUser?.username ? "white" : "black",
                        padding: "8px 12px",
                        borderRadius: "12px",
                        wordWrap: "break-word",
                        border: msg.author === currentUser?.username ? "none" : "1px solid #e0e0e0"
                      }}>
                        {msg.text}
                      </div>
                    </div>
                  )}
                </div>
              ))
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
              <div style={{ flex: 1, position: "relative" }}>
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  rows="1"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #ddd",
                    borderRadius: "20px",
                    resize: "none",
                    fontSize: "0.9rem",
                    fontFamily: "inherit",
                    minHeight: "40px",
                    maxHeight: "100px",
                    outline: "none",
                    transition: "border-color 0.2s"
                  }}
                  onInput={(e) => {
                    e.target.style.height = "auto";
                    e.target.style.height = e.target.scrollHeight + "px";
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
                  padding: "10px 16px",
                  borderRadius: "20px",
                  cursor: newMessage.trim() && isConnected ? "pointer" : "not-allowed",
                  fontSize: "0.9rem",
                  fontWeight: "500",
                  transition: "background-color 0.2s"
                }}
              >
                Send
              </button>
            </div>
          </form>
        </div>

        {/* Members Sidebar */}
        <div style={{ 
          flex: 1,
          minWidth: "150px",
          maxWidth: "200px",
          borderLeft: "1px solid #e0e0e0",
          backgroundColor: "#f8f9fa",
          padding: "15px",
          overflowY: "auto"
        }}>
          <h4 style={{ 
            margin: "0 0 12px 0", 
            fontSize: "0.9rem",
            color: "#666"
          }}>
            Members
          </h4>
          <div style={{ fontSize: "0.8rem" }}>
            {roomMembers.map((member, index) => (
              <div 
                key={index} 
                style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  marginBottom: "8px",
                  padding: "4px 0"
                }}
              >
                <div style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: member.online ? "#4CAF50" : "#ccc",
                  marginRight: "8px",
                  flexShrink: 0
                }}></div>
                <span 
                  style={{ 
                    fontWeight: member.online ? "600" : "400",
                    color: member.online ? "#333" : "#999"
                  }}
                  title={member.online ? "Online" : "Offline"}
                >
                  {member.username}
                  {member.userId === currentUser?.id && " (You)"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CSS Animation */}
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(5px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>
    </div>
  );
};

export default ChatBox;