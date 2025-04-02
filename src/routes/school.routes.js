const express = require("express");
const schoolController = require("../controllers/school.controller");
const {
  verifyToken,
  isAdmin,
  isStaffOrAdmin,
} = require("../middleware/auth.middleware");

const router = express.Router();

// Apply auth middleware to all school routes
router.use(verifyToken);

// School routes
router.get("/", schoolController.getAllSchools);
router.get("/:id", schoolController.getSchoolById);

// Admin-only routes
router.post("/", isAdmin, schoolController.createSchool);
router.put("/:id", isAdmin, schoolController.updateSchool);
router.patch("/:id/status", isAdmin, schoolController.toggleSchoolStatus);
router.delete("/:id", isAdmin, schoolController.deleteSchool);

module.exports = router;
