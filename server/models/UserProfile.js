const mongoose = require("mongoose");

const UserProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true
  },
  username: {
    type: String,
    required: true,
    unique: true
  },
  fullName: {
    type: String,
    default: ""
  },
  bio: {
    type: String,
    default: "",
    maxlength: 500
  },
  pronouns: {
    type: String,
    default: ""
  },
  location: {
    type: String,
    default: ""
  },
  timezone: {
    type: String,
    default: Intl.DateTimeFormat().resolvedOptions().timeZone
  },
  school: {
    type: String,
    default: ""
  },
  major: {
    type: String,
    default: ""
  },
  studyGoals: {
    type: String,
    default: ""
  },
  skillTags: [{
    type: String,
    trim: true
  }],
  studyStats: {
    totalStudyTime: {
      type: Number,
      default: 0
    },
    currentStreak: {
      type: Number,
      default: 0
    },
    longestStreak: {
      type: Number,
      default: 0
    },
    goalsCompleted: {
      type: Number,
      default: 0
    },
    roomsJoined: {
      type: Number,
      default: 0
    },
    lastActive: {
      type: Date,
      default: Date.now
    }
  },
  badges: [{
    name: String,
    description: String,
    earnedAt: {
      type: Date,
      default: Date.now
    },
    icon: String
  }],
  profilePhoto: {
    url: String,
    publicId: String
  },
  themePreferences: {
    primaryColor: {
      type: String,
      default: "#4f46e5"
    },
    darkMode: {
      type: Boolean,
      default: false
    }
  },
  privacySettings: {
    profileVisibility: {
      type: String,
      enum: ["public", "private", "friends"],
      default: "public"
    },
    showActivity: {
      type: Boolean,
      default: true
    },
    showStudyStats: {
      type: Boolean,
      default: true
    }
  },
  joinedRooms: [{
    roomId: String,
    roomName: String,
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  recentActivity: [{
    type: {
      type: String,
      enum: ["room_joined", "room_created", "goal_completed", "streak_updated"]
    },
    description: String,
    roomId: String,
    roomName: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Create index for faster queries
UserProfileSchema.index({ userId: 1 });
UserProfileSchema.index({ username: 1 });

module.exports = mongoose.model("UserProfile", UserProfileSchema);