const express = require("express");
const router = express.Router();
const courseRegistrationController = require("../controllers/course-registration.controller");
const { verifyToken } = require("../middleware/auth.middleware");

// Middleware to check if course registration is enabled
const checkRegistrationEnabled = async (req, res, next) => {
  try {
    // Admin bypass: If admin is impersonating a user, allow access regardless of registration status
    if (req.impersonatedBy) {
      console.log(`🔓 Admin impersonation bypass - allowing course registration access (impersonated by admin ID: ${req.impersonatedBy})`);
      return next();
    }

    const db = require("../config/db");

    // Fetch master toggle, custom message, and allowed-cohort array in one round-trip.
    const configResult = await db.query(
      `SELECT config_key, config_value FROM system_config
       WHERE config_key IN ('course_registration_enabled', 'registration_message', 'registration_enabled_years')
         AND is_active = true`
    );

    const config = {};
    configResult.rows.forEach((r) => {
      config[r.config_key] = r.config_value;
    });

    // Master toggle missing → fail-safe allow (pre-existing behavior).
    if (config.course_registration_enabled === undefined) {
      return next();
    }

    const isEnabled = config.course_registration_enabled.toLowerCase() === "true";
    const blockMessage =
      config.registration_message ||
      "Course registration is currently disabled by administration";

    if (!isEnabled) {
      return res.status(403).json({
        message: blockMessage,
        registrationDisabled: true,
      });
    }

    // Master toggle ON — check the allowed-cohort array against the student's
    // year_admitted. If the config key is missing (pre-migration DB), treat as
    // "all cohorts allowed" for backwards compatibility.
    if (config.registration_enabled_years === undefined) {
      return next();
    }

    let allowedYears;
    try {
      allowedYears = JSON.parse(config.registration_enabled_years);
      if (!Array.isArray(allowedYears)) allowedYears = [];
    } catch (e) {
      allowedYears = [];
    }

    // Look up student's year_admitted from the request's authenticated user.
    const studentResult = await db.query(
      `SELECT year_admitted FROM student WHERE user_id = $1`,
      [req.userId]
    );

    // Non-student caller (admin, faculty, etc.) — controller's own role checks
    // will handle authorization. Skip the cohort gate.
    if (studentResult.rows.length === 0) {
      return next();
    }

    const yearAdmitted = studentResult.rows[0].year_admitted;

    if (!allowedYears.includes(yearAdmitted)) {
      return res.status(403).json({
        message: blockMessage,
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

// Block status — student-facing. No checkRegistrationEnabled middleware so the
// banner shows even when registration window is closed.
router.get(
  "/block-status",
  verifyToken,
  courseRegistrationController.getBlockStatus
);

// Get available semesters (always available for viewing purposes)
router.get(
  "/semesters",
  verifyToken,
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

// Get student slot timetable (for viewing, should always be available)
router.get(
  "/student-timetable",
  verifyToken,
  courseRegistrationController.getStudentSlotTimetable
);

// Validate TEL registration
router.post(
  "/validate-tel",
  verifyToken,
  checkRegistrationEnabled,
  courseRegistrationController.validateTELRegistration
);

// Atomic TEL registration (both theory and practical in one transaction)
router.post(
  "/register-tel",
  verifyToken,
  checkRegistrationEnabled,
  courseRegistrationController.registerTELCourseAtomic
);

// Get student slot timetable (read-only, always available)
router.get(
  "/my-timetable",
  verifyToken,
  // NO checkRegistrationEnabled middleware - always allow viewing
  courseRegistrationController.getStudentSlotTimetable
);

// Get semesters where student has registrations (read-only, always available)
router.get(
  "/my-semesters",
  verifyToken,
  courseRegistrationController.getStudentRegistrationSemesters
);

// Admin route to view any student's timetable (always available for viewing)
router.get(
  "/admin-student-timetable/:enrollment_no",
  verifyToken,
  courseRegistrationController.getAdminStudentTimetable
);

module.exports = router;
