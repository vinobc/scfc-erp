const express = require("express");
const router = express.Router();
const projectAllocationController = require("../controllers/project-allocation.controller");
const { verifyToken, isAdmin, isStaffOrAdmin } = require("../middleware/auth.middleware");

// Get all project allocations - accessible by all authenticated users
router.get(
  "/",
  verifyToken,
  projectAllocationController.getAllProjectAllocations
);

// Get available project courses for allocation
router.get(
  "/available-courses",
  verifyToken,
  isStaffOrAdmin,
  projectAllocationController.getAvailableProjectCourses
);

// Get faculty project summary
router.get(
  "/faculty-summary",
  verifyToken,
  projectAllocationController.getFacultyProjectSummary
);

// Create new project allocation
router.post(
  "/",
  verifyToken,
  isStaffOrAdmin,
  projectAllocationController.createProjectAllocation
);

// Update project allocation
router.put(
  "/:id",
  verifyToken,
  isStaffOrAdmin,
  projectAllocationController.updateProjectAllocation
);

// Delete project allocation
router.delete(
  "/:id",
  verifyToken,
  isStaffOrAdmin,
  projectAllocationController.deleteProjectAllocation
);

module.exports = router;