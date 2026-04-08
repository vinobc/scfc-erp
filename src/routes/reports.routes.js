const express = require("express");
const reportsController = require("../controllers/reports.controller");
const { verifyToken, isFacultyOrStaffOrAdmin } = require("../middleware/auth.middleware");

const router = express.Router();

// Get student registrations report (admin, faculty, staff, timetable_coordinator)
router.get(
  "/student-registrations",
  verifyToken,
  isFacultyOrStaffOrAdmin,
  reportsController.getStudentRegistrations
);

module.exports = router;
