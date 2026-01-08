const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const File = require("../models/File");
const auth = require("../middleware/auth");

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow all file types for now
    cb(null, true);
  }
});

// Upload file
router.post("/upload", auth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: "No file uploaded" });
    }

    const { roomCode } = req.body;
    
    if (!roomCode) {
      // Delete the uploaded file if roomCode is missing
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ msg: "Room code is required" });
    }

    const newFile = new File({
      filename: req.file.filename,
      originalName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      fileType: req.file.mimetype,
      roomCode: roomCode,
      uploadedBy: {
        userId: req.user.id,
        username: req.user.username
      }
    });

    await newFile.save();

    res.json({
      msg: "File uploaded successfully",
      file: {
        id: newFile._id,
        originalName: newFile.originalName,
        fileSize: newFile.fileSize,
        fileType: newFile.fileType,
        uploadedBy: newFile.uploadedBy,
        createdAt: newFile.createdAt
      }
    });

  } catch (err) {
    // Clean up file if error occurs
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: err.message });
  }
});

// Get files for a room
router.get("/room/:roomCode", auth, async (req, res) => {
  try {
    const { roomCode } = req.params;
    
    const files = await File.find({ roomCode })
      .sort({ createdAt: -1 })
      .limit(50); // Limit to recent 50 files

    res.json(files);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Download file
router.get("/download/:fileId", auth, async (req, res) => {
  try {
    const file = await File.findById(req.params.fileId);
    
    if (!file) {
      return res.status(404).json({ msg: "File not found" });
    }

    // Check if user has access to this room's files
    // You might want to add room membership validation here

    if (!fs.existsSync(file.filePath)) {
      return res.status(404).json({ msg: "File not found on server" });
    }

    res.download(file.filePath, file.originalName);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete file
router.delete("/:fileId", auth, async (req, res) => {
  try {
    const file = await File.findById(req.params.fileId);
    
    if (!file) {
      return res.status(404).json({ msg: "File not found" });
    }

    // Check if user is the uploader
    if (file.uploadedBy.userId !== req.user.id) {
      return res.status(403).json({ msg: "Not authorized to delete this file" });
    }

    // Delete physical file
    if (fs.existsSync(file.filePath)) {
      fs.unlinkSync(file.filePath);
    }

    // Delete database record
    await File.findByIdAndDelete(req.params.fileId);

    res.json({ msg: "File deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;