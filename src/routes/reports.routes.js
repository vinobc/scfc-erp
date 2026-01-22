const express = require("express");
const reportsController = require("../controllers/reports.controller");
const { verifyToken, isAdmin } = require("../middleware/auth.middleware");

const router = express.Router();

// Get student registrations report (admin only)
router.get(
  "/student-registrations",
  verifyToken,
  isAdmin,
  reportsController.getStudentRegistrations
);

module.exports = router;
