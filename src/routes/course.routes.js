const express = require("express");
const courseController = require("../controllers/course.controller");
const {
  verifyToken,
  isAdmin,
  isStaffOrAdmin,
  isFacultyOrCoordinator,
} = require("../middleware/auth.middleware");

const router = express.Router();

// Apply auth middleware to all course routes
router.use(verifyToken);

// Course routes - accessible by faculty, timetable coordinators, and admins
router.get("/", isFacultyOrCoordinator, courseController.getAllCourses);
router.get("/:code", isFacultyOrCoordinator, courseController.getCourseByCode);

// Admin-only routes
router.post("/", isAdmin, courseController.createCourse);
router.put("/:code", isAdmin, courseController.updateCourse);
router.patch("/:code/status", isAdmin, courseController.toggleCourseStatus);
router.delete("/:code", isAdmin, courseController.deleteCourse);
router.post("/import", isAdmin, courseController.importCoursesFromExcel);

module.exports = router;
