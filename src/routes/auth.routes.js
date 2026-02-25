const express = require("express");
const rateLimit = require("express-rate-limit");
const authController = require("../controllers/auth.controller");
const { verifyToken, isAdmin } = require("../middleware/auth.middleware");

const router = express.Router();

// Rate limiter for login endpoint: max 15 failed attempts per worker per 15 minutes
// - skipSuccessfulRequests: successful logins don't count toward the limit
// - Higher max to account for campus/university users sharing the same public IP (NAT)
// - PM2 cluster mode runs 4 workers, so effective limit is ~60 failed attempts per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  skipSuccessfulRequests: true,
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
