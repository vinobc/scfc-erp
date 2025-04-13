const db = require("../config/db");

// Get all venues
exports.getAllVenues = async (req, res) => {
  try {
    const result = await db.query(`SELECT * FROM venue ORDER BY venue`, []);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Get all venues error:", error);
    res.status(500).json({ message: "Server error while fetching venues" });
  }
};

// Get venue by id
exports.getVenueById = async (req, res) => {
  try {
    const venueId = req.params.id;

    const result = await db.query(`SELECT * FROM venue WHERE venue_id = $1`, [
      venueId,
    ]);

    const venue = result.rows[0];

    if (!venue) {
      return res.status(404).json({ message: "Venue not found" });
    }

    res.status(200).json(venue);
  } catch (error) {
    console.error("Get venue by id error:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching venue details" });
  }
};

// Create new venue
exports.createVenue = async (req, res) => {
  try {
    const {
      assigned_to_school,
      venue,
      capacity,
      infra_type,
      seats,
      is_active,
    } = req.body;

    // Validate required fields
    if (!venue || !capacity || !infra_type) {
      return res.status(400).json({
        message: "Required fields missing. Please check your input.",
      });
    }

    // Insert new venue
    const result = await db.query(
      `INSERT INTO venue 
       (assigned_to_school, venue, capacity, infra_type, seats, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [
        assigned_to_school || null,
        venue,
        capacity,
        infra_type,
        seats || null,
        is_active === false ? false : true,
      ]
    );

    res.status(201).json({
      message: "Venue created successfully",
      venue: result.rows[0],
    });
  } catch (error) {
    console.error("Create venue error:", error);
    // Check for unique constraint violation
    if (error.code === "23505" && error.constraint === "venue_venue_key") {
      return res.status(409).json({
        message:
          "A venue with this name already exists. Please use a different name.",
      });
    }
    res.status(500).json({ message: "Server error while creating venue" });
  }
};

// Update venue
exports.updateVenue = async (req, res) => {
  try {
    const venueId = req.params.id;
    const {
      assigned_to_school,
      venue,
      capacity,
      infra_type,
      seats,
      is_active,
    } = req.body;

    // Validate required fields
    if (!venue || !capacity || !infra_type) {
      return res.status(400).json({
        message: "Required fields missing. Please check your input.",
      });
    }

    // Check if venue exists
    const venueExists = await db.query(
      "SELECT COUNT(*) FROM venue WHERE venue_id = $1",
      [venueId]
    );

    if (parseInt(venueExists.rows[0].count) === 0) {
      return res.status(404).json({ message: "Venue not found" });
    }

    // Update venue
    const result = await db.query(
      `UPDATE venue 
       SET assigned_to_school = $1, 
           venue = $2, 
           capacity = $3, 
           infra_type = $4, 
           seats = $5, 
           is_active = $6,
           updated_at = CURRENT_TIMESTAMP
       WHERE venue_id = $7
       RETURNING *`,
      [
        assigned_to_school || null,
        venue,
        capacity,
        infra_type,
        seats || null,
        is_active === false ? false : true,
        venueId,
      ]
    );

    res.status(200).json({
      message: "Venue updated successfully",
      venue: result.rows[0],
    });
  } catch (error) {
    console.error("Update venue error:", error);
    // Check for unique constraint violation
    if (error.code === "23505" && error.constraint === "venue_venue_key") {
      return res.status(409).json({
        message:
          "A venue with this name already exists. Please use a different name.",
      });
    }
    res.status(500).json({ message: "Server error while updating venue" });
  }
};

// Toggle venue status (active/inactive)
exports.toggleVenueStatus = async (req, res) => {
  try {
    const venueId = req.params.id;
    const { is_active } = req.body;

    // Validate is_active parameter
    if (is_active === undefined) {
      return res
        .status(400)
        .json({ message: "is_active parameter is required" });
    }

    // Check if venue exists
    const venueExists = await db.query(
      "SELECT COUNT(*) FROM venue WHERE venue_id = $1",
      [venueId]
    );

    if (parseInt(venueExists.rows[0].count) === 0) {
      return res.status(404).json({ message: "Venue not found" });
    }

    // Update venue status
    const result = await db.query(
      `UPDATE venue 
       SET is_active = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE venue_id = $2
       RETURNING *`,
      [is_active, venueId]
    );

    res.status(200).json({
      message: `Venue ${is_active ? "activated" : "deactivated"} successfully`,
      venue: result.rows[0],
    });
  } catch (error) {
    console.error("Toggle venue status error:", error);
    res
      .status(500)
      .json({ message: "Server error while toggling venue status" });
  }
};

// Delete venue
exports.deleteVenue = async (req, res) => {
  try {
    const venueId = req.params.id;
    console.log(`Delete request for venue ID: ${venueId}`);

    // Check if venue exists
    const venueExists = await db.query(
      "SELECT COUNT(*) FROM venue WHERE venue_id = $1",
      [venueId]
    );

    console.log(`Venue exists query result:`, venueExists.rows[0]);

    if (parseInt(venueExists.rows[0].count) === 0) {
      console.log(`Venue with ID ${venueId} not found in database`);
      return res.status(404).json({ message: "Venue not found" });
    }

    // Delete venue
    console.log(`Executing DELETE for venue_id ${venueId}`);
    await db.query("DELETE FROM venue WHERE venue_id = $1", [venueId]);

    res.status(200).json({
      message: "Venue deleted successfully",
    });
  } catch (error) {
    console.error("Delete venue error:", error);
    res.status(500).json({
      message: "Server error while deleting venue",
      error: error.message,
    });
  }
};
