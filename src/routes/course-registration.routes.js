const express = require("express");
const router = express.Router();
const courseRegistrationController = require("../controllers/course-registration.controller");
const { verifyToken } = require("../middleware/auth.middleware");

// Middleware to check if course registration is enabled
const checkRegistrationEnabled = async (req, res, next) => {
  try {
    // Check if course registration is enabled
    const db = require("../config/db");
    const result = await db.query(
      `SELECT config_value FROM system_config 
       WHERE config_key = 'course_registration_enabled' AND is_active = true`
    );

    if (result.rows.length === 0) {
      // Default to enabled if no configuration found
      return next();
    }

    const isEnabled = result.rows[0].config_value.toLowerCase() === "true";

    if (!isEnabled) {
      return res.status(403).json({
        message: "Course registration is currently disabled by administration",
        registrationDisabled: true,
      });
    }

    next();
  } catch (error) {
    console.error("Error checking registration status:", error);
    // Allow access on error (fail-safe)
    next();
  }
};

// Get available semesters
router.get(
  "/semesters",
  verifyToken,
  checkRegistrationEnabled,
  courseRegistrationController.getAvailableSemesters
);

// Get courses for selected semester
router.get(
  "/courses",
  verifyToken,
  checkRegistrationEnabled,
  courseRegistrationController.getCoursesForSemester
);

// Get course details
router.get(
  "/course/:course_code",
  verifyToken,
  checkRegistrationEnabled,
  courseRegistrationController.getCourseDetails
);

// Get course offerings (slots, faculty, venues)
router.get(
  "/course-offerings/:course_code/:slot_year/:semester_type",
  verifyToken,
  checkRegistrationEnabled,
  courseRegistrationController.getCourseOfferings
);

// Register course offering
router.post(
  "/register",
  verifyToken,
  checkRegistrationEnabled,
  courseRegistrationController.registerCourseOffering
);

// Delete course offering
router.delete(
  "/delete",
  verifyToken,
  checkRegistrationEnabled,
  courseRegistrationController.deleteCourseOffering
);

// Get student registration summary
router.get(
  "/summary",
  verifyToken,
  checkRegistrationEnabled,
  courseRegistrationController.getStudentRegistrationSummary
);

// Get student slot timetable
router.get(
  "/student-timetable",
  verifyToken,
  checkRegistrationEnabled,
  courseRegistrationController.getStudentSlotTimetable
);

// Validate TEL registration
router.post(
  "/validate-tel",
  verifyToken,
  checkRegistrationEnabled,
  courseRegistrationController.validateTELRegistration
);

module.exports = router;
