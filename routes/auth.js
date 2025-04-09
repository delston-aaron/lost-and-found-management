const express = require("express");
const bcrypt = require("bcryptjs");
const passport = require("passport");
const db = require("../db"); // Ensure correct path
const router = express.Router();

// User Registration
router.post("/register", async (req, res) => {
    const { name, email, password, phone } = req.body;
    try {
        await db.query("INSERT INTO users (name, email, password, phone) VALUES (?, ?, ?, ?)", 
                       [name, email, password, phone]);
        res.json({ success: true, message: "User registered!" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// User Login
router.post("/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
        if (err) return res.status(500).json({ message: err.message });
        if (!user) return res.status(401).json({ message: "Invalid credentials" });

        req.login(user, (err) => {
            if (err) return res.status(500).json({ message: err.message });
            res.json({ success: true, user });
        });
    })(req, res, next);
});

// User Logout
router.post("/logout", (req, res) => {
    req.logout((err) => {
        if (err) return res.status(500).json({ message: err.message });
        res.json({ success: true, message: "Logged out" });
    });
});

module.exports = router;
