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

// Get course offerings (slots, faculty, venues)
router.get(
  "/course-offerings/:course_code/:slot_year/:semester_type",
  verifyToken,
  courseRegistrationController.getCourseOfferings
);

module.exports = router;
