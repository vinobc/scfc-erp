const express = require("express");
const attendanceController = require("../controllers/attendance.controller");
const {
  verifyToken,
  isFaculty
} = require("../middleware/auth.middleware");

const router = express.Router();

// Apply auth middleware to all attendance routes
router.use(verifyToken);

// Faculty attendance routes - protected by isFaculty middleware
router.get("/semesters", isFaculty, attendanceController.getAvailableSemesters);
router.get("/allocations", isFaculty, attendanceController.getFacultyAllocations);
router.get("/students", isFaculty, attendanceController.getEnrolledStudents);
router.post("/mark", isFaculty, attendanceController.markAttendance);
router.get("/records", isFaculty, attendanceController.getAttendanceRecords);
router.get("/report", isFaculty, attendanceController.getAttendanceReport);
router.get("/date-range", isFaculty, attendanceController.getAttendanceByDateRange);
router.get("/low-attendance", isFaculty, attendanceController.getLowAttendanceStudents);

module.exports = router;