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

// Middleware: allow admin, faculty, and timetable_coordinator for marks reports
function isAdminOrFaculty(req, res, next) {
  if (!["admin", "faculty", "timetable_coordinator"].includes(req.userRole)) {
    return res.status(403).json({ message: "Require Admin, Faculty, or Timetable Coordinator Role" });
  }
  next();
}

// Get courses available for marks report
router.get(
  "/student-marks/courses",
  verifyToken,
  isAdminOrFaculty,
  reportsController.getMarksReportCourses
);

// Get available slots for marks report
router.get(
  "/student-marks/slots",
  verifyToken,
  isAdminOrFaculty,
  reportsController.getMarksReportSlots
);

// Get marks entry summary (admin only)
router.get(
  "/student-marks/summary",
  verifyToken,
  (req, res, next) => {
    if (req.userRole !== "admin") {
      return res.status(403).json({ message: "Require Admin Role" });
    }
    next();
  },
  reportsController.getMarksEntrySummary
);

// Download student marks report
router.get(
  "/student-marks",
  verifyToken,
  isAdminOrFaculty,
  reportsController.getStudentMarksReport
);

module.exports = router;
