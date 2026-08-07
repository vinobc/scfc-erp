const express = require("express");
const marksController = require("../controllers/marks.controller");
const {
  verifyToken,
  isFacultyOrCoordinator,
  isAdmin,
  isStudent,
} = require("../middleware/auth.middleware");

const router = express.Router();

// Apply auth middleware to all marks routes
router.use(verifyToken);

// ================== FACULTY/COORDINATOR ROUTES ==================
// Configuration endpoints
router.get("/semesters", isFacultyOrCoordinator, marksController.getAvailableSemesters);
router.get("/courses", isFacultyOrCoordinator, marksController.getCourseOfferings);
router.get("/assessment-type/:course_code", isFacultyOrCoordinator, marksController.getAssessmentType);
router.get("/config", isFacultyOrCoordinator, marksController.getAssessmentConfig);
router.post("/config", isFacultyOrCoordinator, marksController.saveAssessmentConfig);
router.get("/lab-sessions", isFacultyOrCoordinator, marksController.getLabSessions);

// Marks entry endpoints
router.get("/students", isFacultyOrCoordinator, marksController.getEnrolledStudents);
router.get("/entry", isFacultyOrCoordinator, marksController.getMarksEntryData);
router.post("/entry", isFacultyOrCoordinator, marksController.saveMarks);
router.get("/summary", isFacultyOrCoordinator, marksController.getMarksSummary);
// Consolidated is also read-access for COE (used by the View Grades page)
router.get(
  "/consolidated",
  (req, res, next) => {
    if (["faculty", "timetable_coordinator", "admin", "coe"].includes(req.userRole)) return next();
    return res.status(403).json({ message: "Require Faculty, Coordinator, Admin, or CoE Role" });
  },
  marksController.getConsolidatedReport
);
router.delete("/reset-marks", isFacultyOrCoordinator, marksController.resetMarks);

// ================== ADMIN ROUTES ==================
// Lock control endpoints
// GET locks is accessible to faculty/coordinator (to check if entry is locked)
// POST lock/unlock is admin only
router.get("/admin/locks", isFacultyOrCoordinator, marksController.getLockStatus);
router.post("/admin/lock", isAdmin, marksController.lockComponent);
router.post("/admin/unlock", isAdmin, marksController.unlockComponent);

// ================== STUDENT ROUTES ==================
// Student marks view
router.get("/student/my-marks", isStudent, marksController.getMyMarks);
router.get("/student/my-consolidated", isStudent, marksController.getMyConsolidatedReport);

module.exports = router;
