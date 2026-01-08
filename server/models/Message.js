const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  roomCode: { type: String, required: true },
  author: { type: String, required: true },
  userId: { type: String, required: true },
  text: { type: String, required: true },
  type: { 
    type: String, 
    enum: ["user", "system"], 
    default: "user" 
  }
}, { 
  timestamps: true,
  // Create index for faster queries by room and timestamp
  indexes: [
    { roomCode: 1, createdAt: -1 }
  ]
});

module.exports = mongoose.model("Message", MessageSchema);