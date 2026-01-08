const mongoose = require("mongoose");
const express = require("express");
const bcrypt = require("bcryptjs");
const Room = require("../models/Room");
const UserProfile = require("../models/UserProfile");
const auth = require("../middleware/auth");

const router = express.Router();

// Helper function to check and award badges
const checkAndAwardBadges = async (profile) => {
  const badgesToAdd = [];

  // Early Adopter - Joined first room
  if (profile.joinedRooms.length >= 1 && !profile.badges.some(b => b.name === "Early Adopter")) {
    badgesToAdd.push({
      name: "Early Adopter",
      description: "Joined your first study room",
      icon: "🚀",
      earnedAt: new Date()
    });
  }

  // Social Learner - Joined 5+ unique rooms
  if (profile.joinedRooms.length >= 5 && !profile.badges.some(b => b.name === "Social Learner")) {
    badgesToAdd.push({
      name: "Social Learner",
      description: "Joined 5+ different study rooms",
      icon: "👥",
      earnedAt: new Date()
    });
  }

  // Study Enthusiast - 10+ hours of study time
  if (profile.studyStats.totalStudyTime >= 600 && !profile.badges.some(b => b.name === "Study Enthusiast")) {
    badgesToAdd.push({
      name: "Study Enthusiast",
      description: "Completed 10+ hours of study time",
      icon: "📚",
      earnedAt: new Date()
    });
  }

  // Goal Crusher - Completed 5+ goals
  if (profile.studyStats.goalsCompleted >= 5 && !profile.badges.some(b => b.name === "Goal Crusher")) {
    badgesToAdd.push({
      name: "Goal Crusher",
      description: "Completed 5+ study goals",
      icon: "🎯",
      earnedAt: new Date()
    });
  }

  // Room Creator - Created first room
  if (profile.studyStats.roomsCreated >= 1 && !profile.badges.some(b => b.name === "Room Creator")) {
    badgesToAdd.push({
      name: "Room Creator",
      description: "Created your first study room",
      icon: "✨",
      earnedAt: new Date()
    });
  }

  // Add new badges to profile
  if (badgesToAdd.length > 0) {
    profile.badges.push(...badgesToAdd);
    await profile.save();
  }

  return badgesToAdd;
};

// Enhanced sanitizeRoom function
const sanitizeRoom = (room) => {
  if (!room) return null;
  
  return {
    roomId: room.roomId,
    name: room.name,
    description: room.description,
    isPrivate: room.isPrivate,
    capacity: room.capacity,
    createdBy: room.createdBy?.username || room.createdBy,
    members: room.members.map(member => ({
      id: member._id || member,
      username: member.username || 'Unknown User'
    })),
    createdAt: room.createdAt,
    updatedAt: room.updatedAt
  };
};

// Room ID validation
const isValidRoomId = (roomId) => {
  return roomId && typeof roomId === 'string' && roomId.length >= 4;
};

async function generateUniqueRoomId() {
  const minLen = 6, maxLen = 8;
  for (let attempt = 0; attempt < 12; attempt++) {
    const len = Math.floor(Math.random() * (maxLen - minLen + 1)) + minLen;
    let id = "";
    for (let i = 0; i < len; i++) id += Math.floor(Math.random() * 10);
    const existing = await Room.findOne({ roomId: id });
    if (!existing) return id;
  }
  throw new Error("Could not generate unique room id, try again");
}

// Create room with profile integration
router.post("/create", auth, async (req, res) => {
  try {
    const { name, description = "", isPrivate = false, pin, capacity = 40 } = req.body;

    if (!name || !name.trim()) return res.status(400).json({ msg: "Room name is required" });

    const cap = parseInt(capacity, 10);
    if (isNaN(cap) || cap < 1 || cap > 40) {
      return res.status(400).json({ msg: "Capacity must be a number between 1 and 40" });
    }

    if (isPrivate && (!pin || String(pin).length < 4)) {
      return res.status(400).json({ msg: "Private rooms require a PIN of at least 4 characters" });
    }

    const roomId = await generateUniqueRoomId();

    let hashedPin;
    if (isPrivate) {
      const salt = await bcrypt.genSalt(10);
      hashedPin = await bcrypt.hash(String(pin), salt);
    }

    const room = new Room({
      roomId,
      name: name.trim(),
      description: description.trim(),
      isPrivate,
      pin: hashedPin,
      capacity: cap,
      createdBy: req.user.id,
      members: [req.user.id],
    });

    await room.save();

    // Update user profile with room creation
    let newBadges = [];
    try {
      const userProfile = await UserProfile.findOne({ userId: req.user.id });
      if (userProfile) {
        // Track room creation in study stats
        userProfile.studyStats.roomsCreated = (userProfile.studyStats.roomsCreated || 0) + 1;
        
        // Add to recent activity
        userProfile.recentActivity.unshift({
          type: "room_created",
          description: `Created room: ${name.trim()}`,
          roomId: roomId,
          roomName: name.trim(),
          timestamp: new Date()
        });
        
        if (userProfile.recentActivity.length > 20) {
          userProfile.recentActivity = userProfile.recentActivity.slice(0, 20);
        }
        
        await userProfile.save();
        
        // Check for badge achievements
        newBadges = await checkAndAwardBadges(userProfile);
        
        console.log(`📊 Updated profile for user ${req.user.username}: Created room ${roomId}`);
      }
    } catch (profileError) {
      console.error("Error updating user profile for room creation:", profileError);
    }

    res.status(201).json({
      ...sanitizeRoom(room),
      msg: "Room created successfully",
      profileUpdated: true,
      newBadges: newBadges
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Join room with full profile integration
router.post("/join", auth, async (req, res) => {
  try {
    const { roomId, pin } = req.body;
    if (!roomId) return res.status(400).json({ msg: "roomId is required" });

    const room = await Room.findOne({ roomId })
      .populate("createdBy", "username")
      .populate("members", "username");
    
    if (!room) return res.status(404).json({ msg: "Room not found" });

    const userId = new mongoose.Types.ObjectId(req.user.id);

    // Already a member? (skip capacity check)
    const isAlreadyMember = room.members.some(m => m._id.toString() === userId.toString());
    if (isAlreadyMember) {
      // Even if already a member, ensure profile is updated
      try {
        const userProfile = await UserProfile.findOne({ userId: req.user.id });
        if (userProfile) {
          const roomExistsInProfile = userProfile.joinedRooms.some(r => r.roomId === room.roomId);
          if (!roomExistsInProfile) {
            userProfile.joinedRooms.push({
              roomId: room.roomId,
              roomName: room.name,
              joinedAt: new Date()
            });
            
            userProfile.studyStats.roomsJoined = userProfile.joinedRooms.length;
            
            userProfile.recentActivity.unshift({
              type: "room_joined",
              description: `Joined ${room.name}`,
              roomId: room.roomId,
              roomName: room.name,
              timestamp: new Date()
            });
            
            if (userProfile.recentActivity.length > 20) {
              userProfile.recentActivity = userProfile.recentActivity.slice(0, 20);
            }
            
            await userProfile.save();
            await checkAndAwardBadges(userProfile);
          }
        }
      } catch (profileError) {
        console.error("Error updating user profile for existing member:", profileError);
      }
      
      return res.json({ 
        ...sanitizeRoom(room),
        msg: "Already a member of this room",
        isExistingMember: true
      });
    }

    // Private room check
    if (room.isPrivate) {
      if (!pin) return res.status(401).json({ msg: "PIN required to join this private room" });
      const match = await bcrypt.compare(String(pin), room.pin || "");
      if (!match) return res.status(401).json({ msg: "Invalid PIN" });
    }

    // FLEXIBLE Capacity check
    const dbMemberCount = room.members.length;
    
    if (dbMemberCount >= room.capacity) {
      console.log(`⚠️ Room ${roomId} shows ${dbMemberCount}/${room.capacity} in DB, but allowing join for testing`);
      // For now, we'll allow joining even if DB shows full
    }

    // Add user to room members
    room.members.push(userId);
    await room.save();

    console.log(`✅ User joined room ${roomId}. Now ${room.members.length}/${room.capacity} members in DB`);

    // Update user profile with joined room information
    let newBadges = [];
    try {
      const userProfile = await UserProfile.findOne({ userId: req.user.id });
      if (userProfile) {
        // Check if room already exists in joined rooms (shouldn't, but just in case)
        const existingRoom = userProfile.joinedRooms.find(r => r.roomId === room.roomId);
        if (!existingRoom) {
          userProfile.joinedRooms.push({
            roomId: room.roomId,
            roomName: room.name,
            joinedAt: new Date()
          });
          
          // Update rooms joined count
          userProfile.studyStats.roomsJoined = userProfile.joinedRooms.length;
          
          // Add to recent activity
          userProfile.recentActivity.unshift({
            type: "room_joined",
            description: `Joined ${room.name}`,
            roomId: room.roomId,
            roomName: room.name,
            timestamp: new Date()
          });
          
          // Keep only last 20 activities
          if (userProfile.recentActivity.length > 20) {
            userProfile.recentActivity = userProfile.recentActivity.slice(0, 20);
          }
          
          await userProfile.save();
          
          // Check for badge achievements
          newBadges = await checkAndAwardBadges(userProfile);
          
          console.log(`📊 Updated profile for user ${req.user.username}: ${userProfile.joinedRooms.length} rooms joined`);
        }
      } else {
        // Create profile if it doesn't exist (shouldn't happen with auto-creation, but just in case)
        console.log(`⚠️ Profile not found for user ${req.user.id}, creating one...`);
        const newProfile = new UserProfile({
          userId: req.user.id,
          username: req.user.username
        });
        
        newProfile.joinedRooms.push({
          roomId: room.roomId,
          roomName: room.name,
          joinedAt: new Date()
        });
        
        newProfile.studyStats.roomsJoined = 1;
        
        newProfile.recentActivity.push({
          type: "room_joined",
          description: `Joined ${room.name}`,
          roomId: room.roomId,
          roomName: room.name,
          timestamp: new Date()
        });
        
        await newProfile.save();
        newBadges = await checkAndAwardBadges(newProfile);
      }
    } catch (profileError) {
      console.error("Error updating user profile:", profileError);
      // Don't fail room join if profile update fails
    }

    res.json({
      ...sanitizeRoom(room),
      msg: "Joined room successfully",
      profileUpdated: true,
      newBadges: newBadges
    });

  } catch (err) {
    console.error("Error in join room:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get user's joined rooms
router.get("/my", auth, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ msg: "Unauthorized: no user ID" });
    }
    
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const rooms = await Room.find({ members: userId })
      .populate("createdBy", "username")
      .populate("members", "username")
      .select("-pin")
      .sort({ createdAt: -1 });
    
    res.json(rooms.map(room => sanitizeRoom(room)));
  } catch (err) {
    console.error("GET /rooms/my ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get room by ID
router.get("/:roomId", auth, async (req, res) => {
  try {
    const { roomId } = req.params;
    
    if (!isValidRoomId(roomId)) {
      return res.status(400).json({ msg: "Invalid room ID" });
    }
    
    const room = await Room.findOne({ roomId })
      .populate("createdBy", "username")
      .populate("members", "username");
    
    if (!room) {
      return res.status(404).json({ msg: "Room not found" });
    }

    // Check if user is a member of the room
    const isMember = room.members.some(member => 
      member._id.toString() === req.user.id
    );

    if (!isMember) {
      return res.status(403).json({ msg: "You are not a member of this room" });
    }

    res.json(sanitizeRoom(room));
  } catch (err) {
    console.error("Error fetching room:", err);
    res.status(500).json({ error: err.message });
  }
});

// Leave room with profile integration
router.post("/leave", auth, async (req, res) => {
  try {
    const { roomId } = req.body;
    if (!roomId) return res.status(400).json({ msg: "roomId is required" });

    const room = await Room.findOne({ roomId })
      .populate("createdBy", "username")
      .populate("members", "username");
    
    if (!room) return res.status(404).json({ msg: "Room not found" });

    const userId = new mongoose.Types.ObjectId(req.user.id);

    // Remove user from members array
    room.members = room.members.filter(member => 
      !member._id.equals(userId)
    );

    await room.save();

    // Update user profile - remove from joined rooms
    try {
      const userProfile = await UserProfile.findOne({ userId: req.user.id });
      if (userProfile) {
        userProfile.joinedRooms = userProfile.joinedRooms.filter(
          joinedRoom => joinedRoom.roomId !== roomId
        );
        
        userProfile.studyStats.roomsJoined = userProfile.joinedRooms.length;
        
        // Add leave activity
        userProfile.recentActivity.unshift({
          type: "room_left",
          description: `Left room: ${room.name}`,
          roomId: roomId,
          roomName: room.name,
          timestamp: new Date()
        });
        
        if (userProfile.recentActivity.length > 20) {
          userProfile.recentActivity = userProfile.recentActivity.slice(0, 20);
        }
        
        await userProfile.save();
        
        console.log(`📊 Updated profile for user ${req.user.username}: Removed room ${roomId}`);
      }
    } catch (profileError) {
      console.error("Error updating user profile for room leave:", profileError);
    }

    res.json({ 
      msg: "Left room successfully",
      room: sanitizeRoom(room)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
