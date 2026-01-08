const express = require("express");
const Message = require("../models/Message");
const auth = require("../middleware/auth");

const router = express.Router();

// Get message history for a room
router.get("/room/:roomCode", auth, async (req, res) => {
  try {
    const { roomCode } = req.params;
    const { limit = 100, before } = req.query; // Pagination support
    
    let query = { roomCode: roomCode };
    
    // If 'before' timestamp is provided, get messages before that time
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }
    
    const messages = await Message.find(query)
      .sort({ createdAt: -1 }) // Newest first
      .limit(parseInt(limit))
      .lean(); // Return plain objects for better performance
    
    // Reverse to show oldest first in the UI
    const reversedMessages = messages.reverse();
    
    res.json({
      messages: reversedMessages,
      hasMore: messages.length === parseInt(limit) // Indicate if there are more messages
    });
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get message count for a room (for stats)
router.get("/room/:roomCode/count", auth, async (req, res) => {
  try {
    const { roomCode } = req.params;
    
    const count = await Message.countDocuments({ roomCode: roomCode });
    
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Search messages in a room
router.get("/room/:roomCode/search", auth, async (req, res) => {
  try {
    const { roomCode } = req.params;
    const { q: searchTerm, limit = 50 } = req.query;
    
    if (!searchTerm || searchTerm.trim().length < 2) {
      return res.status(400).json({ msg: "Search term must be at least 2 characters" });
    }
    
    const messages = await Message.find({
      roomCode: roomCode,
      text: { $regex: searchTerm, $options: "i" } // Case-insensitive search
    })
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .lean();
    
    res.json({ messages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a message (only for message author or room admin)
router.delete("/:messageId", auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    
    if (!message) {
      return res.status(404).json({ msg: "Message not found" });
    }
    
    // Check if user is the author of the message
    if (message.userId !== req.user.id) {
      return res.status(403).json({ msg: "Not authorized to delete this message" });
    }
    
    // Prevent deletion of system messages
    if (message.type === "system") {
      return res.status(403).json({ msg: "Cannot delete system messages" });
    }
    
    await Message.findByIdAndDelete(req.params.messageId);
    
    res.json({ msg: "Message deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;