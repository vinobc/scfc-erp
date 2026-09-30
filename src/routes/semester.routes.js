const express = require("express");
const semesterController = require("../controllers/semester.controller");
const {
  verifyToken,
  isAdmin,
  isStaffOrAdmin,
  isFacultyOrStaffOrAdmin,
} = require("../middleware/auth.middleware");

const router = express.Router();

// Apply auth middleware to all semester routes
router.use(verifyToken);

// Semester routes — read endpoints gated to non-student roles to prevent
// information disclosure of the full semester list to any authenticated student.
router.get("/", isFacultyOrStaffOrAdmin, semesterController.getAllSemesters);
router.get("/:id", isFacultyOrStaffOrAdmin, semesterController.getSemesterById);

// Admin-only routes
router.post("/", isAdmin, semesterController.createSemester);
router.put("/:id", isAdmin, semesterController.updateSemester);
router.patch("/:id/status", isAdmin, semesterController.toggleSemesterStatus);
router.delete("/:id", isAdmin, semesterController.deleteSemester);

module.exports = router;
