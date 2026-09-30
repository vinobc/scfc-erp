const express = require("express");
const venueController = require("../controllers/venue.controller");
const {
  verifyToken,
  isAdmin,
  isStaffOrAdmin,
  isFacultyOrStaffOrAdmin,
} = require("../middleware/auth.middleware");

const router = express.Router();

// Apply auth middleware to all venue routes
router.use(verifyToken);

// Venue routes — read endpoints gated to non-student roles to prevent
// information disclosure of the full venue list to any authenticated student.
router.get("/", isFacultyOrStaffOrAdmin, venueController.getAllVenues);
router.get("/:id", isFacultyOrStaffOrAdmin, venueController.getVenueById);

// Admin-only routes
router.post("/", isAdmin, venueController.createVenue);
router.put("/:id", isAdmin, venueController.updateVenue);
router.patch("/:id/status", isAdmin, venueController.toggleVenueStatus);
router.delete("/:id", isAdmin, venueController.deleteVenue);

module.exports = router;
