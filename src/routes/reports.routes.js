const express = require("express");
const reportsController = require("../controllers/reports.controller");
const { verifyToken, isFacultyOrStaffOrAdmin, attachHoiSchools } = require("../middleware/auth.middleware");

const router = express.Router();

// Get student registrations report (admin, faculty, staff, timetable_coordinator)
router.get(
  "/student-registrations",
  verifyToken,
  isFacultyOrStaffOrAdmin,
  reportsController.getStudentRegistrations
);

// Middleware: allow admin, faculty, timetable_coordinator, and coe for marks reports
function isAdminOrFaculty(req, res, next) {
  if (!["admin", "faculty", "timetable_coordinator", "coe"].includes(req.userRole)) {
    return res.status(403).json({ message: "Require Admin, Faculty, Timetable Coordinator, or CoE Role" });
  }
  next();
}

// Get courses available for marks report
router.get(
  "/student-marks/courses",
  verifyToken,
  isAdminOrFaculty,
  attachHoiSchools,
  reportsController.getMarksReportCourses
);

// Get available slots for marks report
router.get(
  "/student-marks/slots",
  verifyToken,
  isAdminOrFaculty,
  attachHoiSchools,
  reportsController.getMarksReportSlots
);

// Get marks entry summary (admin, coe, and HoIs — HoIs get school-scoped results)
router.get(
  "/student-marks/summary",
  verifyToken,
  attachHoiSchools,
  (req, res, next) => {
    if (["admin", "coe"].includes(req.userRole)) return next();
    if (req.hoiSchoolIds && req.hoiSchoolIds.length) return next();
    return res.status(403).json({ message: "Require Admin, CoE, or HoI access" });
  },
  reportsController.getMarksEntrySummary
);

// Download student marks report
router.get(
  "/student-marks",
  verifyToken,
  isAdminOrFaculty,
  attachHoiSchools,
  reportsController.getStudentMarksReport
);

// Download Consolidated Marks & Grade Report (per course-slot XLSX)
router.get(
  "/consolidated",
  verifyToken,
  isAdminOrFaculty,
  attachHoiSchools,
  reportsController.getConsolidatedReportXlsx
);

// Get courses for attendance report
router.get(
  "/student-attendance/courses",
  verifyToken,
  isAdminOrFaculty,
  attachHoiSchools,
  reportsController.getAttendanceReportCourses
);

// Get slots for attendance report
router.get(
  "/student-attendance/slots",
  verifyToken,
  isAdminOrFaculty,
  attachHoiSchools,
  reportsController.getAttendanceReportSlots
);

// Attendance entry summary (admin and HoIs — powers the bulk-list view)
router.get(
  "/student-attendance/summary",
  verifyToken,
  attachHoiSchools,
  (req, res, next) => {
    if (req.userRole === "admin") return next();
    if (req.hoiSchoolIds && req.hoiSchoolIds.length) return next();
    return res.status(403).json({ message: "Require Admin or HoI access" });
  },
  reportsController.getAttendanceEntrySummary
);

// Download student attendance report (single or bulk via items=)
router.get(
  "/student-attendance",
  verifyToken,
  isAdminOrFaculty,
  attachHoiSchools,
  reportsController.getStudentAttendanceReport
);

// Download debar list report (admin or coe)
router.get(
  "/debar-list",
  verifyToken,
  (req, res, next) => {
    if (!["admin", "coe"].includes(req.userRole)) {
      return res.status(403).json({ message: "Require Admin or CoE Role" });
    }
    next();
  },
  reportsController.getDebarListReport
);

// HoI status for the current user (used by the frontend to render the
// school-scoped Student Marks Report view).
router.get(
  "/hoi-status",
  verifyToken,
  attachHoiSchools,
  reportsController.getHoiStatus
);

// Download courses report (all roles except students)
router.get(
  "/courses",
  verifyToken,
  (req, res, next) => {
    if (req.userRole === "student") {
      return res.status(403).json({ message: "Students cannot access this report" });
    }
    next();
  },
  reportsController.getCoursesReport
);

module.exports = router;
