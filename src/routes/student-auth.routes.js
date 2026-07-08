const express = require("express");
const rateLimit = require("express-rate-limit");
const studentAuthController = require("../controllers/student-auth.controller");
const { verifyToken } = require("../middleware/auth.middleware");

const router = express.Router();

// Rate limiter for login endpoint: max 100 failed attempts per USERNAME per 15 minutes.
// - Keyed by username (not IP) so campus NAT sharing doesn't lock out unrelated users
// - Falls back to IP if username is missing (malformed request)
// - skipSuccessfulRequests: successful logins don't count toward the limit
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const username = req.body?.username;
    return username ? `user:${String(username).toLowerCase().trim()}` : `ip:${req.ip}`;
  },
  message: {
    message: "Too many login attempts. Please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Student authentication routes
router.post("/login", loginLimiter, studentAuthController.studentLogin);
router.post(
  "/reset-password",
  verifyToken,
  studentAuthController.studentResetPassword
);
router.post(
  "/change-password",
  verifyToken,
  studentAuthController.studentChangePassword
);

module.exports = router;
