const express = require("express");
const slotController = require("../controllers/slot.controller");
const {
  verifyToken,
  isAdmin,
  isStaffOrAdmin,
} = require("../middleware/auth.middleware");

const router = express.Router();

// Apply auth middleware to all slot routes
router.use(verifyToken);

// Slot routes
router.get("/", slotController.getAllSlots);
router.get("/allowed-values", slotController.getAllowedSlotValues);
router.get("/:year/:semesterType", slotController.getSlotsByYearAndSemester);
router.get("/:id", slotController.getSlotById);

// Admin-only routes
router.post("/", isAdmin, slotController.createSlot);
router.put("/:id", isAdmin, slotController.updateSlot);
router.patch("/:id/status", isAdmin, slotController.toggleSlotStatus);
router.delete("/:id", isAdmin, slotController.deleteSlot);

module.exports = router;
