const express = require("express");
const staffController = require("../controllers/staff.controller");
const {
  verifyToken,
  isAdmin,
} = require("../middleware/auth.middleware");

const router = express.Router();

// Apply auth middleware to all staff routes
router.use(verifyToken);

// Staff routes
router.get("/", staffController.getAllStaff);
router.get("/:id", staffController.getStaffById);

// Admin-only routes
router.post("/", isAdmin, staffController.createStaff);
router.put("/:id", isAdmin, staffController.updateStaff);
router.patch("/:id/status", isAdmin, staffController.toggleStaffStatus);
router.delete("/:id", isAdmin, staffController.deleteStaff);

module.exports = router;
