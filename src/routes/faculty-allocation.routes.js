const express = require("express");
const facultyAllocationController = require("../controllers/faculty-allocation.controller");
const {
  verifyToken,
  isAdmin,
  canManageFacultyAllocations,
  canViewTimetables,
} = require("../middleware/auth.middleware");

const router = express.Router();

// Apply auth middleware to all faculty allocation routes
router.use(verifyToken);

// Faculty allocation management routes (coordinators and admins can manage)
router.get(
  "/",
  canViewTimetables,
  facultyAllocationController.getAllFacultyAllocations
);
router.post(
  "/",
  canManageFacultyAllocations,
  facultyAllocationController.createFacultyAllocation
);
router.put(
  "/:id",
  canManageFacultyAllocations,
  facultyAllocationController.updateFacultyAllocation
);
router.delete(
  "/",
  canManageFacultyAllocations,
  facultyAllocationController.deleteFacultyAllocation
);

// Available slots endpoint (coordinators and admins can access)
router.get(
  "/available-slots",
  canManageFacultyAllocations,
  facultyAllocationController.getAvailableSlotsForCourse
);

// Available slots for specific faculty endpoint
router.get(
  "/available-slots-for-faculty",
  canManageFacultyAllocations,
  facultyAllocationController.getAvailableSlotsForFaculty
);

// Real-time conflict checking endpoint
router.get(
  "/check-conflicts",
  canManageFacultyAllocations,
  facultyAllocationController.checkConflicts
);

// Timetable viewing routes (faculty, coordinators, and admins can view)
router.get(
  "/faculty-timetable",
  canViewTimetables,
  facultyAllocationController.getFacultyTimetable
);
router.get(
  "/class-timetable",
  canViewTimetables,
  facultyAllocationController.getClassTimetable
);

module.exports = router;
