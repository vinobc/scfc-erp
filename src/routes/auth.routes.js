const express = require("express");
const rateLimit = require("express-rate-limit");
const authController = require("../controllers/auth.controller");
const { verifyToken, isAdmin } = require("../middleware/auth.middleware");

const router = express.Router();

// Rate limiter for login endpoint: max 10 attempts per IP per 15 minutes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    message: "Too many login attempts. Please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth routes
router.post("/login", loginLimiter, authController.login);
router.post("/logout", verifyToken, authController.logout);
router.get("/me", verifyToken, authController.getCurrentUser);
router.post("/change-password", verifyToken, authController.changePassword);

// Admin impersonation route
router.post("/impersonate", verifyToken, isAdmin, authController.impersonate);

module.exports = router;
