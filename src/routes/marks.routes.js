const express = require("express");
const marksController = require("../controllers/marks.controller");
const {
  verifyToken,
  isFacultyOrCoordinator,
  isAdmin,
  isAdminOrCoe,
  isStudent,
} = require("../middleware/auth.middleware");

const router = express.Router();

// Apply auth middleware to all marks routes
router.use(verifyToken);

// ================== FACULTY/COORDINATOR ROUTES ==================
// Configuration endpoints
// CoE also allowed to /semesters — needed to drive the lock-controls semester
// picker. CoE never proceeds into course/entry endpoints below.
router.get(
  "/semesters",
  (req, res, next) => {
    if (["faculty", "timetable_coordinator", "admin", "coe"].includes(req.userRole)) return next();
    return res.status(403).json({ message: "Access denied" });
  },
  marksController.getAvailableSemesters
);
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
// Effective per-component lock status for a faculty's specific (course, slot).
// Considers both the bulk lock and any active unlock exceptions.
router.get("/effective-locks", isFacultyOrCoordinator, marksController.getEffectiveLocks);
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

// Publish gate — faculty/coord toggle per-component visibility to students.
router.get("/publish-status", isFacultyOrCoordinator, marksController.getPublishStatus);
router.post("/publish", isFacultyOrCoordinator, marksController.publishComponent);
router.post("/unpublish", isFacultyOrCoordinator, marksController.unpublishComponent);

// ================== ADMIN / COE ROUTES ==================
// Lock control endpoints
// GET locks is accessible to faculty/coordinator (to check if entry is locked)
// and to CoE (needed by the lock-controls panel). Writes are admin OR CoE.
router.get(
  "/admin/locks",
  (req, res, next) => {
    if (["faculty", "timetable_coordinator", "admin", "coe"].includes(req.userRole)) return next();
    return res.status(403).json({ message: "Access denied" });
  },
  marksController.getLockStatus
);
router.post("/admin/lock", isAdminOrCoe, marksController.lockComponent);
router.post("/admin/unlock", isAdminOrCoe, marksController.unlockComponent);

// Selective unlock exceptions layered on top of bulk locks.
// Admin/CoE grant per-(faculty, course, slot) overrides when a bulk lock is on.
router.get("/admin/lock-exceptions", isAdminOrCoe, marksController.listMarksLockExceptions);
router.post("/admin/lock-exception", isAdminOrCoe, marksController.addMarksLockException);
router.delete("/admin/lock-exception/:id", isAdminOrCoe, marksController.deleteMarksLockException);
router.get("/admin/allocations", isAdminOrCoe, marksController.getFacultyAllocationsForSemester);

// ================== STUDENT ROUTES ==================
// Student marks view
router.get("/student/my-marks", isStudent, marksController.getMyMarks);
router.get("/student/my-consolidated", isStudent, marksController.getMyConsolidatedReport);

module.exports = router;
