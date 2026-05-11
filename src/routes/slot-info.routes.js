const express = require("express");
const slotInfoController = require("../controllers/slot-info.controller");
const { verifyToken, isAdmin } = require("../middleware/auth.middleware");

const router = express.Router();

// All slot-info routes require authentication
router.use(verifyToken);

// Read is open to any authenticated user
router.get("/:year/:semesterType", slotInfoController.getSlotInfo);

// Write is admin-only
router.put("/:year/:semesterType", isAdmin, slotInfoController.upsertSlotInfo);

module.exports = router;
