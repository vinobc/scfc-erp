const express = require("express");
const facultyController = require("../controllers/faculty.controller");
const {
  verifyToken,
  isAdmin,
  isStaffOrAdmin,
} = require("../middleware/auth.middleware");

const router = express.Router();

// Apply auth middleware to all faculty routes
router.use(verifyToken);

// Faculty routes
router.get("/", facultyController.getAllFaculty);
router.get("/:id", facultyController.getFacultyById);

// Admin-only routes
router.post("/", isAdmin, facultyController.createFaculty);
router.put("/:id", isAdmin, facultyController.updateFaculty);
router.patch("/:id/status", isAdmin, facultyController.toggleFacultyStatus);
router.delete("/:id", isAdmin, facultyController.deleteFaculty);

module.exports = router;
