const express = require("express");
const slotController = require("../controllers/slot.controller");
const {
  verifyToken,
  isAdmin,
  isStaffOrAdmin,
  isFacultyOrStaffOrAdmin,
} = require("../middleware/auth.middleware");

const router = express.Router();

// Apply auth middleware to all slot routes
router.use(verifyToken);

// Slot routes — full-list and admin-lookup endpoints gated to non-student roles.
// GET /:year/:semesterType left open — student portal calls this for its
// timetable display and other read-only student flows.
router.get("/", isFacultyOrStaffOrAdmin, slotController.getAllSlots);
router.get("/allowed-values", isFacultyOrStaffOrAdmin, slotController.getAllowedSlotValues);
router.get("/:year/:semesterType", slotController.getSlotsByYearAndSemester);
router.get("/:id", isFacultyOrStaffOrAdmin, slotController.getSlotById);

// Admin-only routes
router.post("/", isAdmin, slotController.createSlot);
router.put("/:id", isAdmin, slotController.updateSlot);
router.patch("/:id/status", isAdmin, slotController.toggleSlotStatus);
router.delete("/:id", isAdmin, slotController.deleteSlot);

module.exports = router;
