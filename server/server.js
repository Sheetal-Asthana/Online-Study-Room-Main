const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const Message = require("./models/Message");

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// Test route
app.get("/", (req, res) => {
  res.send("Server is running...");
});

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Create HTTP server
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173","https://room-green-nine.vercel.app"],
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

//room members tracking with video/audio status
const roomMembers = {};

// --- MESSAGE ROTATION FUNCTION ---
const rotateRoomMessages = async (roomCode, maxMessages = 1000) => {
  try {
    const messageCount = await Message.countDocuments({ roomCode });
    
    if (messageCount > maxMessages) {
      const messagesToDelete = messageCount - maxMessages;
      const oldestMessages = await Message.find({ roomCode })
        .sort({ createdAt: 1 })
        .limit(messagesToDelete)
        .select('_id');
      
      if (oldestMessages.length > 0) {
        await Message.deleteMany({ 
          _id: { $in: oldestMessages.map(m => m._id) } 
        });
        console.log(`🧹 Rotated ${oldestMessages.length} messages from ${roomCode}`);
      }
    }
  } catch (err) {
    console.error('Message rotation error:', err);
  }
};

// --- Attach Socket.IO middleware for auth ---
io.use((socket, next) => {
  try {
    const { token, username } = socket.handshake.auth;
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = { 
        id: decoded.user?.id || decoded.id, 
        username: decoded.user?.username || decoded.username 
      };
    } else {
      socket.user = { 
        id: socket.id, 
        username: username || "Guest" 
      };
    }
    next();
  } catch (err) {
    console.error("Socket auth error:", err);
    next(new Error("Authentication failed"));
  }
});

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.user.username} (ID: ${socket.user.id})`);

  // Add reconnection event handlers 
  socket.on("reconnect", (attemptNumber) => {
    console.log(`User ${socket.user.username} reconnected (attempt ${attemptNumber})`);
  });

  socket.on("reconnect_attempt", (attemptNumber) => {
    console.log(`Reconnection attempt ${attemptNumber} for ${socket.user.username}`);
  });

  socket.on("join_room", async ({ roomCode }) => {
    if (!socket.rooms.has(roomCode)) {
      socket.join(roomCode);
      
      // Initialize room members array if it doesn't exist
      if (!roomMembers[roomCode]) {
        roomMembers[roomCode] = [];
      }

      // Check if user already exists in the room
      const existingMemberIndex = roomMembers[roomCode].findIndex(
        (m) => m.userId === socket.user.id
      );

      if (existingMemberIndex === -1) {
        // Add new user to room with video/audio status
        roomMembers[roomCode].push({
          userId: socket.user.id,
          username: socket.user.username,
          online: true,
          socketId: socket.id,
          hasVideo: false,  // Initialize video as off
          hasAudio: true,   // Initialize audio as on
          isScreenSharing: false
        });

        console.log(`User ${socket.user.username} JOINED room ${roomCode}`);
        
        // Save system message for new joins
        try {
          const systemMessage = new Message({
            roomCode: roomCode,
            author: "System",
            userId: "system",
            text: `${socket.user.username} joined the room`,
            type: "system"
          });
          await systemMessage.save();
          
          // Rotate messages after saving system message
          await rotateRoomMessages(roomCode, 1000);
        } catch (err) {
          console.error("Error saving system message:", err);
        }
        
      } else {
        // Update existing user to online
        roomMembers[roomCode][existingMemberIndex].online = true;
        roomMembers[roomCode][existingMemberIndex].socketId = socket.id;
        console.log(`User ${socket.user.username} RECONNECTED to room ${roomCode}`);
      }

      // Emit updated member list to EVERYONE in the room
      io.to(roomCode).emit("room_members", roomMembers[roomCode]);
      
      // Emit system message for new joins only (not reconnects)
      if (existingMemberIndex === -1) {
        socket.to(roomCode).emit("receive_message", {
          author: "System",
          text: `${socket.user.username} joined the room`,
          time: new Date().toLocaleTimeString(),
          type: "system"
        });
      }

      console.log(`Room ${roomCode} members:`, roomMembers[roomCode].length);
    }
  });

  // Updated send_message with message rotation
  socket.on("send_message", async ({ roomCode, text }) => {
    try {
      const msgData = {
        author: socket.user.username,
        text: text.trim(),
        time: new Date().toLocaleTimeString(),
        userId: socket.user.id,
        timestamp: new Date()
      };
      
      // Save message to database
      const savedMessage = new Message({
        roomCode: roomCode,
        author: socket.user.username,
        userId: socket.user.id,
        text: text.trim(),
        type: "user"
      });
      
      await savedMessage.save();
      
      // ROTATE MESSAGES: Keep only latest 1000 messages per room
      await rotateRoomMessages(roomCode, 1000);
      
      // Broadcast message to all in the room including sender
      io.to(roomCode).emit("receive_message", msgData);
      
      console.log(`Message from ${socket.user.username} in ${roomCode}: ${text}`);
    } catch (err) {
      console.error("Error saving message:", err);
      // Still emit the message even if save fails
      io.to(roomCode).emit("receive_message", {
        author: socket.user.username,
        text: text.trim(),
        time: new Date().toLocaleTimeString(),
        userId: socket.user.id,
        timestamp: new Date()
      });
    }
  });

  socket.on("leave_room", async ({ roomCode }) => {
    try {
      socket.leave(roomCode);

      if (roomMembers[roomCode]) {
        const memberIndex = roomMembers[roomCode].findIndex(
          (m) => m.userId === socket.user.id
        );

        if (memberIndex !== -1) {
          // Notify room that user left (for video cleanup)
          socket.to(roomCode).emit("user-left", {
            userId: socket.user.id,
            username: socket.user.username
          });

          // Remove user completely from room
          const leftUser = roomMembers[roomCode].splice(memberIndex, 1)[0];
          
          console.log(`User ${leftUser.username} LEFT room ${roomCode}`);

          // Save system message for user leaving
          try {
            const systemMessage = new Message({
              roomCode: roomCode,
              author: "System",
              userId: "system",
              text: `${leftUser.username} left the room`,
              type: "system"
            });
            await systemMessage.save();
            
            // Rotate messages after saving system message
            await rotateRoomMessages(roomCode, 1000);
          } catch (err) {
            console.error("Error saving leave message:", err);
          }

          // Emit system message
          socket.to(roomCode).emit("receive_message", {
            author: "System", 
            text: `${leftUser.username} left the room`,
            time: new Date().toLocaleTimeString(),
            type: "system"
          });

          // Emit updated member list to everyone in room
          io.to(roomCode).emit("room_members", roomMembers[roomCode]);
        }

        // Clean up empty rooms
        if (roomMembers[roomCode].length === 0) {
          delete roomMembers[roomCode];
          console.log(`🧹 Room ${roomCode} cleaned up (empty)`);
        }
      }

      console.log(`User ${socket.user.username} left room ${roomCode} - socket only`);
      
    } catch (err) {
      console.error("Error in leave_room:", err);
    }
  });

  // ==================== WHITEBOARD EVENTS ====================

// Handle whiteboard drawing
socket.on("whiteboard-draw", (data) => {

  // Broadcast drawing to all other users in the room
  socket.to(data.roomCode).emit("whiteboard-draw", {
    ...data,
    fromUserId: socket.user.id,
    fromUsername: socket.user.username
  });
});

// Handle whiteboard clear
socket.on("whiteboard-clear", (data) => {
  console.log(`Whiteboard clear by ${socket.user.username} in ${data.roomCode}`);
  
  // Broadcast clear to all other users in the room
  socket.to(data.roomCode).emit("whiteboard-clear", {
    fromUserId: socket.user.id,
    fromUsername: socket.user.username
  });
});

// Handle whiteboard undo
socket.on("whiteboard-undo", (data) => {
  console.log(`⎌ Whiteboard undo by ${socket.user.username} in ${data.roomCode}, historyIndex: ${data.historyIndex}`);
  
  // Broadcast undo to all other users in the room
  socket.to(data.roomCode).emit("whiteboard-undo", {
    historyIndex: data.historyIndex,
    fromUserId: socket.user.id,
    fromUsername: socket.user.username
  });
});

// Handle whiteboard redo
socket.on("whiteboard-redo", (data) => {
  console.log(`⎌ Whiteboard redo by ${socket.user.username} in ${data.roomCode}, historyIndex: ${data.historyIndex}`);
  
  // Broadcast redo to all other users in the room
  socket.to(data.roomCode).emit("whiteboard-redo", {
    historyIndex: data.historyIndex,
    fromUserId: socket.user.id,
    fromUsername: socket.user.username
  });
});


  // ==================== VIDEO CONFERENCING EVENTS ====================

  // Handle WebRTC offer
  socket.on("video-offer", ({ roomCode, offer, toUserId }) => {
  const room = roomMembers[roomCode];
  if (!room) return;

  const target = room.find(m => m.userId === toUserId);
  if (!target || !target.socketId) return;

  socket.to(target.socketId).emit("video-offer", {
    offer,
    fromUserId: socket.user.id,
    fromUsername: socket.user.username
  });
});


  // Handle WebRTC answer
  socket.on("video-answer", ({ roomCode, answer, toUserId }) => {
  const target = roomMembers[roomCode]?.find(m => m.userId === toUserId);
  if (!target?.socketId) return;

  socket.to(target.socketId).emit("video-answer", {
    answer,
    fromUserId: socket.user.id
  });
});

  // Handle ICE candidates
  socket.on("video-ice-candidate", ({ roomCode, candidate, toUserId }) => {
  const target = roomMembers[roomCode]?.find(m => m.userId === toUserId);
  if (!target?.socketId) return;

  socket.to(target.socketId).emit("video-ice-candidate", {
    candidate,
    fromUserId: socket.user.id
  });
});;

  // Handle video toggle (mute/unmute video)
  socket.on("toggle-video", ({ roomCode, videoEnabled }) => {
    // Update user's video status in room members
    if (roomMembers[roomCode]) {
      const memberIndex = roomMembers[roomCode].findIndex(
        (m) => m.userId === socket.user.id
      );
      
      if (memberIndex !== -1) {
        roomMembers[roomCode][memberIndex].hasVideo = videoEnabled;
        
        // Broadcast updated member list to everyone in the room
        io.to(roomCode).emit("room_members", roomMembers[roomCode]);
        
        console.log(`User ${socket.user.username} ${videoEnabled ? 'enabled' : 'disabled'} video in ${roomCode}`);
      }
    }
  });

  // Handle audio toggle (mute/unmute audio)
  socket.on("toggle-audio", ({ roomCode, audioEnabled }) => {
    if (roomMembers[roomCode]) {
      const memberIndex = roomMembers[roomCode].findIndex(
        (m) => m.userId === socket.user.id
      );
      
      if (memberIndex !== -1) {
        roomMembers[roomCode][memberIndex].hasAudio = audioEnabled;
        io.to(roomCode).emit("room_members", roomMembers[roomCode]);
        
        console.log(`User ${socket.user.username} ${audioEnabled ? 'unmuted' : 'muted'} audio in ${roomCode}`);
      }
    }
  });

  // Notify room when user starts/stops screen sharing
  socket.on("screen-share", ({ roomCode, isSharing }) => {
    if (roomMembers[roomCode]) {
      const memberIndex = roomMembers[roomCode].findIndex(
        (m) => m.userId === socket.user.id
      );
      
      if (memberIndex !== -1) {
        roomMembers[roomCode][memberIndex].isScreenSharing = isSharing;
        io.to(roomCode).emit("room_members", roomMembers[roomCode]);
        
        // Broadcast screen share status to room
        socket.to(roomCode).emit("user-screen-share", {
          userId: socket.user.id,
          username: socket.user.username,
          isSharing: isSharing
        });
        
        console.log(`User ${socket.user.username} ${isSharing ? 'started' : 'stopped'} screen share in ${roomCode}`);
      }
    }
  });

  // UPDATE the disconnect handler to save system messages and handle video cleanup
  socket.on("disconnect", async (reason) => {
    console.log(`User disconnected: ${socket.user.username} (${reason})`);

    // Remove user from all rooms they were in
    for (const roomCode in roomMembers) {
      const memberIndex = roomMembers[roomCode].findIndex(
        (m) => m.socketId === socket.id
      );

      if (memberIndex !== -1) {
        const disconnectedUser = roomMembers[roomCode][memberIndex];
        
        // Notify room for video cleanup
        socket.to(roomCode).emit("user-left", {
          userId: socket.user.id,
          username: socket.user.username
        });
        
        // Mark user as offline instead of removing completely
        roomMembers[roomCode][memberIndex].online = false;
        roomMembers[roomCode][memberIndex].socketId = null;
        roomMembers[roomCode][memberIndex].hasVideo = false;
        roomMembers[roomCode][memberIndex].isScreenSharing = false;
        
        console.log(`User ${disconnectedUser.username} DISCONNECTED from room ${roomCode}`);

        // Save system message for disconnect
        try {
          const systemMessage = new Message({
            roomCode: roomCode,
            author: "System",
            userId: "system",
            text: `${disconnectedUser.username} disconnected`,
            type: "system"
          });
          await systemMessage.save();
          
          // Rotate messages after saving system message
          await rotateRoomMessages(roomCode, 1000);
        } catch (err) {
          console.error("Error saving disconnect message:", err);
        }

        // Notify room
        socket.to(roomCode).emit("receive_message", {
          author: "System",
          text: `${disconnectedUser.username} disconnected`,
          time: new Date().toLocaleTimeString(),
          type: "system"
        });

        // Send updated member list to show user as offline
        io.to(roomCode).emit("room_members", roomMembers[roomCode]);

        // Don't clean up empty rooms immediately on disconnect
        // Wait for explicit leave_room event
      }
    }
  });

  socket.on("typing_start", ({ roomCode }) => {
    socket.to(roomCode).emit("user_typing", {
      username: socket.user.username,
      userId: socket.user.id,
      isTyping: true
    });
  });

  socket.on("typing_stop", ({ roomCode }) => {
    socket.to(roomCode).emit("user_typing", {
      username: socket.user.username,
      userId: socket.user.id,
      isTyping: false
    });
  });

  // File sharing socket events
  socket.on("file_uploaded", ({ roomCode, file }) => {
    // Broadcast to all room members except sender
    socket.to(roomCode).emit("new_file", {
      file,
      uploadedBy: socket.user.username,
      message: `${socket.user.username} shared a file: ${file.originalName}`
    });
  });

  socket.on("file_deleted", ({ roomCode, fileId }) => {
    socket.to(roomCode).emit("file_removed", {
      fileId,
      deletedBy: socket.user.username
    });
  });

  // Error handling
  socket.on("error", (error) => {
    console.error(`Socket error for user ${socket.user.username}:`, error);
  });
});

// API routes
const authRoutes = require("./routes/auth");
app.use("/api/auth", authRoutes);

const roomsRoutes = require("./routes/rooms");
app.use("/api/rooms", roomsRoutes);

// File sharing routes
const filesRoutes = require("./routes/files");
app.use("/api/files", filesRoutes);

// Message history routes
const messagesRoutes = require("./routes/messages");
app.use("/api/messages", messagesRoutes);

// Serve uploaded files statically
app.use("/uploads", express.static("uploads"));

// Study time tracking routes
const studyTimeRoutes = require("./routes/studyTime");
app.use("/api/study-time", studyTimeRoutes);

const profileRoutes = require("./routes/profile");
app.use("/api/profile", profileRoutes);

app.get("/api/room-stats", (req, res) => {
  const stats = {};
  for (const roomCode in roomMembers) {
    stats[roomCode] = {
      totalMembers: roomMembers[roomCode].length,
      onlineMembers: roomMembers[roomCode].filter(m => m.online).length,
      members: roomMembers[roomCode]
    };
  }
  res.json(stats);
});

// Start server
const PORT = process.env.PORT || 9000;
server.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
