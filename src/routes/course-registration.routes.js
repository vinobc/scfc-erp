const express = require("express");
const router = express.Router();
const courseRegistrationController = require("../controllers/course-registration.controller");
const { verifyToken } = require("../middleware/auth.middleware");

// Get available semesters
router.get(
  "/semesters",
  verifyToken,
  courseRegistrationController.getAvailableSemesters
);

// Get courses for selected semester
router.get(
  "/courses",
  verifyToken,
  courseRegistrationController.getCoursesForSemester
);

// Get course details
router.get(
  "/course/:course_code",
  verifyToken,
  courseRegistrationController.getCourseDetails
);

module.exports = router;
