const express = require("express");
const attendanceController = require("../controllers/attendance.controller");
const {
  verifyToken,
  isFacultyOrCoordinator
} = require("../middleware/auth.middleware");

const router = express.Router();

// Apply auth middleware to all attendance routes
router.use(verifyToken);

// Faculty and Timetable Coordinator attendance routes - protected by isFacultyOrCoordinator middleware
router.get("/semesters", isFacultyOrCoordinator, attendanceController.getAvailableSemesters);
router.get("/allocations", isFacultyOrCoordinator, attendanceController.getFacultyAllocations);
router.get("/students", isFacultyOrCoordinator, attendanceController.getEnrolledStudents);
router.post("/mark", isFacultyOrCoordinator, attendanceController.markAttendance);
router.get("/records", isFacultyOrCoordinator, attendanceController.getAttendanceRecords);
router.get("/report", isFacultyOrCoordinator, attendanceController.getAttendanceReport);
router.get("/date-range", isFacultyOrCoordinator, attendanceController.getAttendanceByDateRange);
router.get("/low-attendance", isFacultyOrCoordinator, attendanceController.getLowAttendanceStudents);

module.exports = router;