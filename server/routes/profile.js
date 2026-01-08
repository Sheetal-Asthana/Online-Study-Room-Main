// const express = require("express");
// const auth = require("../middleware/auth");
// const UserProfile = require("../models/UserProfile");
// const User = require("../models/User");
// const router = express.Router();

// // Get user profile
// router.get("/me", auth, async (req, res) => {
//   try {
//     const profile = await UserProfile.findOne({ userId: req.user.id })
//       .populate("userId", "username email");
    
//     if (!profile) {
//       return res.status(404).json({ msg: "Profile not found" });
//     }
    
//     res.json(profile);
//   } catch (err) {
//     console.error("Error fetching profile:", err);
//     res.status(500).json({ error: "Server error" });
//   }
// });

// // Get profile by username
// router.get("/:username", async (req, res) => {
//   try {
//     const profile = await UserProfile.findOne({ username: req.params.username })
//       .populate("userId", "username email");
    
//     if (!profile) {
//       return res.status(404).json({ msg: "Profile not found" });
//     }
    
//     // Check privacy settings
//     if (profile.privacySettings.profileVisibility === "private" && 
//         (!req.user || req.user.id !== profile.userId.toString())) {
//       return res.status(403).json({ msg: "This profile is private" });
//     }
    
//     res.json(profile);
//   } catch (err) {
//     console.error("Error fetching profile:", err);
//     res.status(500).json({ error: "Server error" });
//   }
// });

// // Update profile
// router.put("/me", auth, async (req, res) => {
//   try {
//     const {
//       fullName,
//       bio,
//       pronouns,
//       location,
//       timezone,
//       school,
//       major,
//       studyGoals,
//       skillTags,
//       themePreferences,
//       privacySettings
//     } = req.body;

//     const updateData = {};
    
//     if (fullName !== undefined) updateData.fullName = fullName;
//     if (bio !== undefined) updateData.bio = bio;
//     if (pronouns !== undefined) updateData.pronouns = pronouns;
//     if (location !== undefined) updateData.location = location;
//     if (timezone !== undefined) updateData.timezone = timezone;
//     if (school !== undefined) updateData.school = school;
//     if (major !== undefined) updateData.major = major;
//     if (studyGoals !== undefined) updateData.studyGoals = studyGoals;
//     if (skillTags !== undefined) updateData.skillTags = skillTags;
//     if (themePreferences !== undefined) updateData.themePreferences = themePreferences;
//     if (privacySettings !== undefined) updateData.privacySettings = privacySettings;

//     const profile = await UserProfile.findOneAndUpdate(
//       { userId: req.user.id },
//       { $set: updateData },
//       { new: true, runValidators: true }
//     );

//     if (!profile) {
//       return res.status(404).json({ msg: "Profile not found" });
//     }

//     res.json(profile);
//   } catch (err) {
//     console.error("Error updating profile:", err);
//     res.status(500).json({ error: "Server error" });
//   }
// });

// // Add study time
// router.post("/study-time", auth, async (req, res) => {
//   try {
//     const { minutes } = req.body;
    
//     const profile = await UserProfile.findOne({ userId: req.user.id });
//     if (!profile) {
//       return res.status(404).json({ msg: "Profile not found" });
//     }
    
//     profile.studyStats.totalStudyTime += minutes;
//     profile.studyStats.lastActive = new Date();
    
//     await profile.save();
    
//     res.json({ 
//       totalStudyTime: profile.studyStats.totalStudyTime,
//       message: `Added ${minutes} minutes to study time`
//     });
//   } catch (err) {
//     console.error("Error updating study time:", err);
//     res.status(500).json({ error: "Server error" });
//   }
// });

// // Add joined room to profile
// router.post("/joined-room", auth, async (req, res) => {
//   try {
//     const { roomId, roomName } = req.body;
    
//     const profile = await UserProfile.findOne({ userId: req.user.id });
//     if (!profile) {
//       return res.status(404).json({ msg: "Profile not found" });
//     }
    
//     // Check if room already exists
//     const existingRoom = profile.joinedRooms.find(room => room.roomId === roomId);
//     if (!existingRoom) {
//       profile.joinedRooms.push({
//         roomId,
//         roomName,
//         joinedAt: new Date()
//       });
      
//       profile.studyStats.roomsJoined += 1;
      
//       // Add to recent activity
//       profile.recentActivity.unshift({
//         type: "room_joined",
//         description: `Joined ${roomName}`,
//         roomId,
//         roomName,
//         timestamp: new Date()
//       });
      
//       // Keep only last 20 activities
//       if (profile.recentActivity.length > 20) {
//         profile.recentActivity = profile.recentActivity.slice(0, 20);
//       }
      
//       await profile.save();
//     }
    
//     res.json(profile.joinedRooms);
//   } catch (err) {
//     console.error("Error updating joined rooms:", err);
//     res.status(500).json({ error: "Server error" });
//   }
// });

// module.exports = router;

const express = require("express");
const auth = require("../middleware/auth");
const UserProfile = require("../models/UserProfile");
const User = require("../models/User");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Configure multer for profile pictures
const profilePicStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const profilePicsDir = path.join(__dirname, "../uploads/profile-pictures");
    if (!fs.existsSync(profilePicsDir)) {
      fs.mkdirSync(profilePicsDir, { recursive: true });
    }
    cb(null, profilePicsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, req.user.id + "-" + uniqueSuffix + ext);
  }
});

const uploadProfilePic = multer({
  storage: profilePicStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Upload profile picture
router.post("/upload-profile-pic", auth, uploadProfilePic.single("profilePic"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: "No file uploaded" });
    }

    const profile = await UserProfile.findOne({ userId: req.user.id });
    if (!profile) {
      // Delete the uploaded file if profile doesn't exist
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ msg: "Profile not found" });
    }

    // Delete old profile picture if exists
    if (profile.profilePhoto?.url && fs.existsSync(profile.profilePhoto.url)) {
      fs.unlinkSync(profile.profilePhoto.url);
    }

    // Update profile with new picture
    profile.profilePhoto = {
      url: `/uploads/profile-pictures/${req.file.filename}`,
      publicId: req.file.filename
    };

    await profile.save();

    res.json({
      msg: "Profile picture updated successfully",
      profilePhoto: profile.profilePhoto
    });

  } catch (err) {
    // Clean up file if error occurs
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: err.message });
  }
});

// Update badge system to be dynamic
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

  // Add new badges to profile
  if (badgesToAdd.length > 0) {
    profile.badges.push(...badgesToAdd);
    await profile.save();
  }

  return badgesToAdd;
};
// Get user profile
router.get("/me", auth, async (req, res) => {
  try {
    let profile = await UserProfile.findOne({ userId: req.user.id })
      .populate("userId", "username email");
    
    if (!profile) {
      // Create profile if it doesn't exist
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ msg: "User not found" });
      }
      
      profile = new UserProfile({
        userId: req.user.id,
        username: user.username
      });
      
      // Add welcome badge
      profile.badges.push({
        name: "Welcome!",
        description: "Joined StudyRoom",
        icon: "🎉"
      });
      
      await profile.save();
    }
    
    res.json(profile);
  } catch (err) {
    console.error("Error fetching profile:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get profile by username
router.get("/:username", async (req, res) => {
  try {
    const profile = await UserProfile.findOne({ username: req.params.username })
      .populate("userId", "username email");
    
    if (!profile) {
      return res.status(404).json({ msg: "Profile not found" });
    }
    
    // Check privacy settings
    if (profile.privacySettings.profileVisibility === "private" && 
        (!req.user || req.user.id !== profile.userId.toString())) {
      return res.status(403).json({ msg: "This profile is private" });
    }
    
    res.json(profile);
  } catch (err) {
    console.error("Error fetching profile:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Update profile
router.put("/me", auth, async (req, res) => {
  try {
    const {
      fullName,
      bio,
      pronouns,
      location,
      timezone,
      school,
      major,
      studyGoals,
      skillTags,
      themePreferences,
      privacySettings
    } = req.body;

    const updateData = {};
    
    if (fullName !== undefined) updateData.fullName = fullName;
    if (bio !== undefined) updateData.bio = bio;
    if (pronouns !== undefined) updateData.pronouns = pronouns;
    if (location !== undefined) updateData.location = location;
    if (timezone !== undefined) updateData.timezone = timezone;
    if (school !== undefined) updateData.school = school;
    if (major !== undefined) updateData.major = major;
    if (studyGoals !== undefined) updateData.studyGoals = studyGoals;
    if (skillTags !== undefined) updateData.skillTags = skillTags;
    if (themePreferences !== undefined) updateData.themePreferences = themePreferences;
    if (privacySettings !== undefined) updateData.privacySettings = privacySettings;

    const profile = await UserProfile.findOneAndUpdate(
      { userId: req.user.id },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!profile) {
      return res.status(404).json({ msg: "Profile not found" });
    }

    res.json(profile);
  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Add study time
router.post("/study-time", auth, async (req, res) => {
  try {
    const { minutes } = req.body;
    
    const profile = await UserProfile.findOne({ userId: req.user.id });
    if (!profile) {
      return res.status(404).json({ msg: "Profile not found" });
    }
    
    profile.studyStats.totalStudyTime += minutes;
    profile.studyStats.lastActive = new Date();
    
    await profile.save();
    
    res.json({ 
      totalStudyTime: profile.studyStats.totalStudyTime,
      message: `Added ${minutes} minutes to study time`
    });
  } catch (err) {
    console.error("Error updating study time:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Add joined room to profile
router.post("/joined-room", auth, async (req, res) => {
  try {
    const { roomId, roomName } = req.body;
    
    const profile = await UserProfile.findOne({ userId: req.user.id });
    if (!profile) {
      return res.status(404).json({ msg: "Profile not found" });
    }
    
    // Check if room already exists
    const existingRoom = profile.joinedRooms.find(room => room.roomId === roomId);
    if (!existingRoom) {
      profile.joinedRooms.push({
        roomId,
        roomName,
        joinedAt: new Date()
      });
      
      profile.studyStats.roomsJoined += 1;
      
      // Add to recent activity
      profile.recentActivity.unshift({
        type: "room_joined",
        description: `Joined ${roomName}`,
        roomId,
        roomName,
        timestamp: new Date()
      });
      
      // Keep only last 20 activities
      if (profile.recentActivity.length > 20) {
        profile.recentActivity = profile.recentActivity.slice(0, 20);
      }
      
      await profile.save();
    }
    
    res.json(profile.joinedRooms);
  } catch (err) {
    console.error("Error updating joined rooms:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;