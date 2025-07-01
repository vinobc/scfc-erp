const express = require("express");
const router = express.Router();
const courseWithdrawalController = require("../controllers/course-withdrawal.controller");
const { verifyToken } = require("../middleware/auth.middleware");

// Middleware to check if course withdrawal is enabled
const checkWithdrawalEnabled = async (req, res, next) => {
  try {
    // Check if course withdrawal is enabled
    const db = require("../config/db");
    const result = await db.query(
      `SELECT config_value FROM system_config 
       WHERE config_key = 'course_withdrawal_enabled' AND is_active = true`
    );

    if (result.rows.length === 0) {
      // Default to enabled if no configuration found
      return next();
    }

    const isEnabled = result.rows[0].config_value.toLowerCase() === "true";

    if (!isEnabled) {
      return res.status(403).json({
        message: "Course withdrawal is currently disabled by administration",
        withdrawalDisabled: true,
      });
    }

    next();
  } catch (error) {
    console.error("Error checking withdrawal status:", error);
    // Allow access on error (fail-safe)
    next();
  }
};

// Get registered courses for withdrawal
router.get(
  "/registered-courses/:slot_year/:semester_type",
  verifyToken,
  checkWithdrawalEnabled,
  courseWithdrawalController.getRegisteredCourses
);

// Withdraw from a course
router.post(
  "/withdraw",
  verifyToken,
  checkWithdrawalEnabled,
  courseWithdrawalController.withdrawFromCourse
);

// Get withdrawal status for a course
router.get(
  "/status/:enrollment_number/:course_code/:slot_year/:semester_type",
  verifyToken,
  courseWithdrawalController.getWithdrawalStatus
);

// Check if course withdrawal is enabled (no middleware check)
router.get(
  "/withdrawal-status",
  verifyToken,
  courseWithdrawalController.getWithdrawalEnabledStatus
);

module.exports = router;