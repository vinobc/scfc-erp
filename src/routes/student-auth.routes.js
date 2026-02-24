const express = require("express");
const rateLimit = require("express-rate-limit");
const studentAuthController = require("../controllers/student-auth.controller");
const { verifyToken } = require("../middleware/auth.middleware");

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
