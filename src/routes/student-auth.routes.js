const express = require("express");
const studentAuthController = require("../controllers/student-auth.controller");
const { verifyToken } = require("../middleware/auth.middleware");

const router = express.Router();

// Student authentication routes
router.post("/login", studentAuthController.studentLogin);
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
