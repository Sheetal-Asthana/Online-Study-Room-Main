const mongoose = require("mongoose");

const FileSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  filePath: { type: String, required: true },
  fileSize: { type: Number, required: true },
  fileType: { type: String, required: true },
  roomCode: { type: String, required: true },
  uploadedBy: { 
    userId: { type: String, required: true },
    username: { type: String, required: true }
  }
}, { timestamps: true });

module.exports = mongoose.model("File", FileSchema);