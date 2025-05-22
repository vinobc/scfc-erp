const express = require("express");
const coordinatorController = require("../controllers/timetable-coordinator.controller");
const { verifyToken, isAdmin } = require("../middleware/auth.middleware");

const router = express.Router();

// Apply auth middleware to all coordinator routes
router.use(verifyToken);

// Coordinator routes (admin only)
router.get("/", isAdmin, coordinatorController.getAllCoordinators);
router.post("/", isAdmin, coordinatorController.createCoordinatorAssignment);
router.delete(
  "/:id",
  isAdmin,
  coordinatorController.removeCoordinatorAssignment
);

module.exports = router;
