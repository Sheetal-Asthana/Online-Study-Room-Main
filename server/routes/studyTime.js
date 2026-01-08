const express = require("express");
const auth = require("../middleware/auth");
const UserProfile = require("../models/UserProfile");
const router = express.Router();

// Track study time when user is in a room
router.post("/track", auth, async (req, res) => {
  try {
    const { roomId, minutes, roomName } = req.body;
    
    if (!minutes || minutes <= 0) {
      return res.status(400).json({ msg: "Invalid study time" });
    }

    const profile = await UserProfile.findOne({ userId: req.user.id });
    if (!profile) {
      return res.status(404).json({ msg: "Profile not found" });
    }

    // Update study time
    profile.studyStats.totalStudyTime += minutes;
    profile.studyStats.lastActive = new Date();

    // Update streak (simplified - you might want more sophisticated streak logic)
    const today = new Date().toDateString();
    const lastActiveDate = new Date(profile.studyStats.lastActive).toDateString();
    if (lastActiveDate !== today) {
      // Simple streak logic - increment if active on consecutive days
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (new Date(profile.studyStats.lastActive).toDateString() === yesterday.toDateString()) {
        profile.studyStats.currentStreak += 1;
        if (profile.studyStats.currentStreak > profile.studyStats.longestStreak) {
          profile.studyStats.longestStreak = profile.studyStats.currentStreak;
        }
      } else {
        profile.studyStats.currentStreak = 1;
      }
    }

    // Add study session to recent activity
    profile.recentActivity.unshift({
      type: "study_session",
      description: `Studied for ${minutes} minutes in ${roomName}`,
      roomId: roomId,
      roomName: roomName,
      timestamp: new Date()
    });

    // Keep only last 20 activities
    if (profile.recentActivity.length > 20) {
      profile.recentActivity = profile.recentActivity.slice(0, 20);
    }

    await profile.save();

    // Check for badge achievements
    const newBadges = await checkAndAwardBadges(profile);

    res.json({
      totalStudyTime: profile.studyStats.totalStudyTime,
      currentStreak: profile.studyStats.currentStreak,
      newBadges: newBadges
    });

  } catch (err) {
    console.error("Error tracking study time:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get study statistics
router.get("/stats", auth, async (req, res) => {
  try {
    const profile = await UserProfile.findOne({ userId: req.user.id });
    if (!profile) {
      return res.status(404).json({ msg: "Profile not found" });
    }

    res.json(profile.studyStats);
  } catch (err) {
    console.error("Error fetching study stats:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;