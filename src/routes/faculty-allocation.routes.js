const express = require("express");
const facultyAllocationController = require("../controllers/faculty-allocation.controller");
const {
  verifyToken,
  isAdmin,
  isStaffOrAdmin,
} = require("../middleware/auth.middleware");

const router = express.Router();

// Apply auth middleware to all faculty allocation routes
router.use(verifyToken);

// Faculty allocation routes

// Read operations - available to staff and admin
router.get(
  "/",
  isStaffOrAdmin,
  facultyAllocationController.getAllFacultyAllocations
);
router.get(
  "/faculty-timetable",
  isStaffOrAdmin,
  facultyAllocationController.getFacultyTimetable
);
router.get(
  "/class-timetable",
  isStaffOrAdmin,
  facultyAllocationController.getClassTimetable
);
router.get(
  "/available-slots",
  isStaffOrAdmin,
  facultyAllocationController.getAvailableSlotsForCourse
);

// Write operations - admin only
router.post("/", isAdmin, facultyAllocationController.createFacultyAllocation);
router.put("/", isAdmin, facultyAllocationController.updateFacultyAllocation);
router.delete(
  "/",
  isAdmin,
  facultyAllocationController.deleteFacultyAllocation
);

module.exports = router;
