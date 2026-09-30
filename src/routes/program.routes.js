const express = require("express");
const programController = require("../controllers/program.controller");
const {
  verifyToken,
  isAdmin,
  isStaffOrAdmin,
  isFacultyOrStaffOrAdmin,
} = require("../middleware/auth.middleware");

const router = express.Router();

// Apply auth middleware to all program routes
router.use(verifyToken);

// Program routes — read endpoints gated to non-student roles to prevent
// information disclosure of the full program list to any authenticated student.
router.get("/", isFacultyOrStaffOrAdmin, programController.getAllPrograms);
router.get("/:id", isFacultyOrStaffOrAdmin, programController.getProgramById);

// Admin-only routes
router.post("/", isAdmin, programController.createProgram);
router.put("/:id", isAdmin, programController.updateProgram);
router.patch("/:id/status", isAdmin, programController.toggleProgramStatus);
router.delete("/:id", isAdmin, programController.deleteProgram);

module.exports = router;
