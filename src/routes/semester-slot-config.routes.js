const express = require("express");
const semesterSlotConfigController = require("../controllers/semester-slot-config.controller");
const {
  verifyToken,
  isAdmin,
  isStaffOrAdmin,
} = require("../middleware/auth.middleware");

const router = express.Router();

// Apply auth middleware to all routes
router.use(verifyToken);

// Get all semester slot configurations - available to staff and admin
router.get("/", isStaffOrAdmin, semesterSlotConfigController.getAllConfigs);

// Get configurations for specific semester - available to staff and admin
router.get(
  "/:year/:semesterType",
  isStaffOrAdmin,
  semesterSlotConfigController.getConfigBySemester
);

// Create, update, delete - admin only
router.post("/", isAdmin, semesterSlotConfigController.createConfig);
router.put("/:id", isAdmin, semesterSlotConfigController.updateConfig);
router.delete("/:id", isAdmin, semesterSlotConfigController.deleteConfig);

module.exports = router;
