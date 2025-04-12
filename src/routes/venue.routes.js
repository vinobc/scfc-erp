const express = require("express");
const venueController = require("../controllers/venue.controller");
const {
  verifyToken,
  isAdmin,
  isStaffOrAdmin,
} = require("../middleware/auth.middleware");

const router = express.Router();

// Apply auth middleware to all venue routes
router.use(verifyToken);

// Venue routes
router.get("/", venueController.getAllVenues);
router.get("/:id", venueController.getVenueById);

// Admin-only routes
router.post("/", isAdmin, venueController.createVenue);
router.put("/:id", isAdmin, venueController.updateVenue);
router.patch("/:id/status", isAdmin, venueController.toggleVenueStatus);
router.delete("/:id", isAdmin, venueController.deleteVenue);

module.exports = router;
