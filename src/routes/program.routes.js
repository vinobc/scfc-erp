const express = require("express");
const programController = require("../controllers/program.controller");
const {
  verifyToken,
  isAdmin,
  isStaffOrAdmin,
} = require("../middleware/auth.middleware");

const router = express.Router();

// Apply auth middleware to all program routes
router.use(verifyToken);

// Program routes
router.get("/", programController.getAllPrograms);
router.get("/:id", programController.getProgramById);

// Admin-only routes
router.post("/", isAdmin, programController.createProgram);
router.put("/:id", isAdmin, programController.updateProgram);
router.patch("/:id/status", isAdmin, programController.toggleProgramStatus);
router.delete("/:id", isAdmin, programController.deleteProgram);

module.exports = router;
