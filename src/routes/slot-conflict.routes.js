const express = require("express");
const slotConflictController = require("../controllers/slot-conflict.controller");
const {
  verifyToken,
  isStaffOrAdmin,
} = require("../middleware/auth.middleware");

const router = express.Router();

// Apply auth middleware to all routes
router.use(verifyToken);

// Get conflicting slots for a specific slot
router.get("/", isStaffOrAdmin, slotConflictController.getConflictingSlots);

// Get all conflicts for a specific semester
router.get(
  "/:slotYear/:semesterType",
  isStaffOrAdmin,
  slotConflictController.getAllConflictsForSemester
);

module.exports = router;
