const express = require("express");
const attendanceController = require("../controllers/attendance.controller");
const {
  verifyToken,
  isFacultyOrCoordinator,
  isStudent,
  isAdmin
} = require("../middleware/auth.middleware");

const router = express.Router();

// Apply auth middleware to all attendance routes
router.use(verifyToken);

// Faculty and Timetable Coordinator attendance routes - protected by isFacultyOrCoordinator middleware
router.get("/semesters", isFacultyOrCoordinator, attendanceController.getAvailableSemesters);
router.get("/allocations", isFacultyOrCoordinator, attendanceController.getFacultyAllocations);
router.get("/students", isFacultyOrCoordinator, attendanceController.getEnrolledStudents);
router.post("/mark", isFacultyOrCoordinator, attendanceController.markAttendance);
router.delete("/clear", isFacultyOrCoordinator, attendanceController.clearAttendance);
router.get("/records", isFacultyOrCoordinator, attendanceController.getAttendanceRecords);
router.get("/report", isFacultyOrCoordinator, attendanceController.getAttendanceReport);
router.get("/date-range", isFacultyOrCoordinator, attendanceController.getAttendanceByDateRange);
router.get("/low-attendance", isFacultyOrCoordinator, attendanceController.getLowAttendanceStudents);

// Attendance lock admin routes — GET open to faculty/coordinator so the entry
// page can show a "locked" hint; POSTs are admin-only.
router.get("/admin/locks", isFacultyOrCoordinator, attendanceController.getAttendanceLockStatus);
router.post("/admin/lock", isAdmin, attendanceController.lockAttendance);
router.post("/admin/unlock", isAdmin, attendanceController.unlockAttendance);

// Date-range attendance locks — GET open to faculty/coordinator for parity
// with /admin/locks; write operations are admin-only.
router.get("/admin/lock-ranges", isFacultyOrCoordinator, attendanceController.getAttendanceLockRanges);
router.post("/admin/lock-range", isAdmin, attendanceController.addAttendanceLockRange);
router.delete("/admin/lock-range/:id", isAdmin, attendanceController.deleteAttendanceLockRange);

// Student attendance routes - protected by isStudent middleware
router.get("/student/semesters", isStudent, attendanceController.getStudentSemesters);
router.get("/student/courses", isStudent, attendanceController.getStudentCourses);
router.get("/student/report/:course_code/:slot_year/:semester_type", isStudent, attendanceController.getStudentAttendanceReport);

module.exports = router;