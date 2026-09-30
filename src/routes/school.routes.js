const express = require("express");
const schoolController = require("../controllers/school.controller");
const {
  verifyToken,
  isAdmin,
  isStaffOrAdmin,
  isFacultyOrStaffOrAdmin,
} = require("../middleware/auth.middleware");

const router = express.Router();

// Apply auth middleware to all school routes
router.use(verifyToken);

// School routes — read endpoints gated to non-student roles to prevent
// information disclosure of the full school list to any authenticated student.
router.get("/", isFacultyOrStaffOrAdmin, schoolController.getAllSchools);
router.get("/:id", isFacultyOrStaffOrAdmin, schoolController.getSchoolById);

// Admin-only routes
router.post("/", isAdmin, schoolController.createSchool);
router.put("/:id", isAdmin, schoolController.updateSchool);
router.patch("/:id/status", isAdmin, schoolController.toggleSchoolStatus);
router.delete("/:id", isAdmin, schoolController.deleteSchool);

module.exports = router;
