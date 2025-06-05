const express = require("express");
const router = express.Router();
const systemConfigController = require("../controllers/system-config.controller");
const { verifyToken, isAdmin } = require("../middleware/auth.middleware");

// Public endpoint for students to check registration status
router.get(
  "/course-registration-status",
  verifyToken,
  systemConfigController.getCourseRegistrationStatus
);

// Admin-only endpoints
router.get(
  "/",
  verifyToken,
  isAdmin,
  systemConfigController.getAllSystemConfig
);

router.get(
  "/:configKey",
  verifyToken,
  isAdmin,
  systemConfigController.getConfigSetting
);

router.put(
  "/:configKey",
  verifyToken,
  isAdmin,
  systemConfigController.updateConfigSetting
);

module.exports = router;
