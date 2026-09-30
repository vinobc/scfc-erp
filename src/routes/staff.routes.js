const express = require("express");
const staffController = require("../controllers/staff.controller");
const {
  verifyToken,
  isAdmin,
  isFacultyOrStaffOrAdmin,
} = require("../middleware/auth.middleware");

const router = express.Router();

// Apply auth middleware to all staff routes
router.use(verifyToken);

// Staff routes — read endpoints gated to non-student roles to prevent
// information disclosure of the full staff list to any authenticated student.
router.get("/", isFacultyOrStaffOrAdmin, staffController.getAllStaff);
router.get("/:id", isFacultyOrStaffOrAdmin, staffController.getStaffById);

// Admin-only routes
router.post("/", isAdmin, staffController.createStaff);
router.put("/:id", isAdmin, staffController.updateStaff);
router.patch("/:id/status", isAdmin, staffController.toggleStaffStatus);
router.delete("/:id", isAdmin, staffController.deleteStaff);

module.exports = router;
