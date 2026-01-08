const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const auth = require("../middleware/auth");
const UserProfile = require("../models/UserProfile");

const router = express.Router();
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (password.length < 6) {
      return res.status(400).json({ msg: "Password must be at least 6 characters" });
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });
    if (existingUser) {
      if (existingUser.email === email) return res.status(400).json({ msg: "Email already exists" });
      if (existingUser.username === username) return res.status(400).json({ msg: "Username already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();

    // Create user profile automatically
    try {
      const userProfile = new UserProfile({
        userId: newUser._id,
        username: newUser.username
      });
      
      // Add welcome badge
      userProfile.badges.push({
        name: "Welcome!",
        description: "Joined StudyRoom",
        icon: "🎉"
      });
      
      await userProfile.save();
    } catch (profileError) {
      console.error("Error creating user profile:", profileError);
      // Don't fail registration if profile creation fails
    }

    const payload = {
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
      },
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "5h" });

    res.json({ token, user: payload.user });
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({ msg: `${field} already exists` });
    }
    res.status(500).json({ error: err.message });
  }
});
// router.post("/register", async (req, res) => {
//   try {
//     const { username, email, password } = req.body;

//     if (password.length < 6) {
//       return res.status(400).json({ msg: "Password must be at least 6 characters" });
//     }

//     const existingUser = await User.findOne({
//       $or: [{ email }, { username }]
//     });
//     if (existingUser) {
//       if (existingUser.email === email) return res.status(400).json({ msg: "Email already exists" });
//       if (existingUser.username === username) return res.status(400).json({ msg: "Username already exists" });
//     }

//     const salt = await bcrypt.genSalt(10);
//     const hashedPassword = await bcrypt.hash(password, salt);

//     const newUser = new User({ username, email, password: hashedPassword });
//     await newUser.save();
// // Add this after newUser.save() in the register route

// // In the register route, after newUser.save():
// try {
//   // Create user profile
//   const userProfile = new UserProfile({
//     userId: newUser._id,
//     username: newUser.username
//   });
//   await userProfile.save();
  
//   // Add default badges
//   userProfile.badges.push({
//     name: "Welcome!",
//     description: "Joined StudyRoom",
//     icon: "🎉"
//   });
//   await userProfile.save();
  
// } catch (profileError) {
//   console.error("Error creating user profile:", profileError);
//   // Don't fail registration if profile creation fails
// }
//     const payload = {
//       user: {
//         id: newUser._id,
//         username: newUser.username,
//         email: newUser.email,
//       },
//     };

//     const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "5h" });

//     res.json({ token, user: payload.user });
//   } catch (err) {
//     if (err.code === 11000) {
//       const field = Object.keys(err.keyPattern)[0];
//       return res.status(400).json({ msg: `${field} already exists` });
//     }
//     res.status(500).json({ error: err.message });
//   }
// });

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ msg: "User does not exist" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

    const payload = {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "5h" });


    res.json({ token, user: payload.user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.get("/protected", auth, (req, res) => {
  res.json({
    msg: "You are authorized",
    user: req.user, 
  });
});

module.exports = router;

