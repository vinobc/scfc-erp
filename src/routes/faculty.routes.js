const express = require("express");
const facultyController = require("../controllers/faculty.controller");
const {
  verifyToken,
  isAdmin,
  isStaffOrAdmin,
  isFacultyOrStaffOrAdmin,
  attachCoordinatorSchools,
} = require("../middleware/auth.middleware");

const router = express.Router();

// Apply auth middleware to all faculty routes
router.use(verifyToken);

// Faculty routes — read endpoints gated to non-student roles to prevent
// information disclosure of the full faculty list to any authenticated student.
router.get("/", isFacultyOrStaffOrAdmin, attachCoordinatorSchools, facultyController.getAllFaculty);
router.get("/:id", isFacultyOrStaffOrAdmin, facultyController.getFacultyById);

// Admin-only routes
router.post("/", isAdmin, facultyController.createFaculty);
router.put("/:id", isAdmin, facultyController.updateFaculty);
router.patch("/:id/status", isAdmin, facultyController.toggleFacultyStatus);
router.delete("/:id", isAdmin, facultyController.deleteFaculty);

module.exports = router;
