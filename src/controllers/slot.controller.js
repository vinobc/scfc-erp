const db = require("../config/db");

// Get all slots
exports.getAllSlots = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM slot ORDER BY slot_year, semester_type, slot_day, slot_time`,
      []
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Get all slots error:", error);
    res.status(500).json({ message: "Server error while fetching slots" });
  }
};

// Get slots by year and semester type
exports.getSlotsByYearAndSemester = async (req, res) => {
  try {
    const { year, semesterType } = req.params;

    const result = await db.query(
      `SELECT * FROM slot WHERE slot_year = $1 AND semester_type = $2 
       ORDER BY slot_day, slot_time`,
      [year, semesterType]
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Get slots by year and semester error:", error);
    res.status(500).json({
      message: "Server error while fetching slots by year and semester",
    });
  }
};

// Get slot by id
exports.getSlotById = async (req, res) => {
  try {
    const slotId = req.params.id;

    const result = await db.query(`SELECT * FROM slot WHERE slot_id = $1`, [
      slotId,
    ]);

    const slot = result.rows[0];

    if (!slot) {
      return res.status(404).json({ message: "Slot not found" });
    }

    res.status(200).json(slot);
  } catch (error) {
    console.error("Get slot by id error:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching slot details" });
  }
};

// Get allowed slot values
exports.getAllowedSlotValues = async (req, res) => {
  try {
    // Get allowed slot names
    const nameResult = await db.query(
      `SELECT name FROM allowed_slot_names ORDER BY name`,
      []
    );

    // Get allowed slot times
    const timeResult = await db.query(
      `SELECT time FROM allowed_slot_times ORDER BY time`,
      []
    );

    // Return both sets of values
    res.status(200).json({
      slot_names: nameResult.rows.map((row) => row.name),
      slot_times: timeResult.rows.map((row) => row.time),
    });
  } catch (error) {
    console.error("Get allowed slot values error:", error);
    res.status(500).json({
      message: "Server error while fetching allowed slot values",
    });
  }
};

// Create new slot
exports.createSlot = async (req, res) => {
  try {
    const {
      slot_year,
      semester_type,
      slot_day,
      slot_name,
      slot_time,
      is_active,
    } = req.body;

    // Validate required fields
    if (!slot_year || !semester_type || !slot_day || !slot_name || !slot_time) {
      return res.status(400).json({
        message: "Required fields missing. Please check your input.",
      });
    }

    // Validate that slot name exists in allowed_slot_names
    const nameCheckResult = await db.query(
      `SELECT COUNT(*) FROM allowed_slot_names WHERE name = $1`,
      [slot_name]
    );

    if (parseInt(nameCheckResult.rows[0].count) === 0) {
      return res.status(400).json({
        message: "Invalid slot name. Please select from the allowed values.",
      });
    }

    // Validate that slot time exists in allowed_slot_times
    const timeCheckResult = await db.query(
      `SELECT COUNT(*) FROM allowed_slot_times WHERE time = $1`,
      [slot_time]
    );

    if (parseInt(timeCheckResult.rows[0].count) === 0) {
      return res.status(400).json({
        message: "Invalid slot time. Please select from the allowed values.",
      });
    }

    // Check if the slot already exists
    const existsCheck = await db.query(
      `SELECT COUNT(*) FROM slot WHERE 
       slot_year = $1 AND semester_type = $2 AND slot_day = $3 AND slot_name = $4 AND slot_time = $5`,
      [slot_year, semester_type, slot_day, slot_name, slot_time]
    );

    if (parseInt(existsCheck.rows[0].count) > 0) {
      return res.status(409).json({
        message: "A slot with these details already exists.",
      });
    }

    // Insert new slot
    const result = await db.query(
      `INSERT INTO slot 
       (slot_year, semester_type, slot_day, slot_name, slot_time, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [
        slot_year,
        semester_type,
        slot_day,
        slot_name,
        slot_time,
        is_active === false ? false : true,
      ]
    );

    res.status(201).json({
      message: "Slot created successfully",
      slot: result.rows[0],
    });
  } catch (error) {
    console.error("Create slot error:", error);
    res.status(500).json({ message: "Server error while creating slot" });
  }
};

// Update slot
exports.updateSlot = async (req, res) => {
  try {
    const slotId = req.params.id;
    const {
      slot_year,
      semester_type,
      slot_day,
      slot_name,
      slot_time,
      is_active,
    } = req.body;

    // Validate required fields
    if (!slot_year || !semester_type || !slot_day || !slot_name || !slot_time) {
      return res.status(400).json({
        message: "Required fields missing. Please check your input.",
      });
    }

    // Validate that slot name exists in allowed_slot_names
    const nameCheckResult = await db.query(
      `SELECT COUNT(*) FROM allowed_slot_names WHERE name = $1`,
      [slot_name]
    );

    if (parseInt(nameCheckResult.rows[0].count) === 0) {
      return res.status(400).json({
        message: "Invalid slot name. Please select from the allowed values.",
      });
    }

    // Validate that slot time exists in allowed_slot_times
    const timeCheckResult = await db.query(
      `SELECT COUNT(*) FROM allowed_slot_times WHERE time = $1`,
      [slot_time]
    );

    if (parseInt(timeCheckResult.rows[0].count) === 0) {
      return res.status(400).json({
        message: "Invalid slot time. Please select from the allowed values.",
      });
    }

    // Check if slot exists
    const slotExists = await db.query(
      "SELECT COUNT(*) FROM slot WHERE slot_id = $1",
      [slotId]
    );

    if (parseInt(slotExists.rows[0].count) === 0) {
      return res.status(404).json({ message: "Slot not found" });
    }

    // Check for duplicate (excluding current record)
    const existsCheck = await db.query(
      `SELECT COUNT(*) FROM slot WHERE 
       slot_year = $1 AND semester_type = $2 AND slot_day = $3 AND slot_name = $4 AND slot_time = $5
       AND slot_id != $6`,
      [slot_year, semester_type, slot_day, slot_name, slot_time, slotId]
    );

    if (parseInt(existsCheck.rows[0].count) > 0) {
      return res.status(409).json({
        message: "Another slot with these details already exists.",
      });
    }

    // Update slot
    const result = await db.query(
      `UPDATE slot 
       SET slot_year = $1, 
           semester_type = $2, 
           slot_day = $3, 
           slot_name = $4, 
           slot_time = $5, 
           is_active = $6,
           updated_at = CURRENT_TIMESTAMP
       WHERE slot_id = $7
       RETURNING *`,
      [
        slot_year,
        semester_type,
        slot_day,
        slot_name,
        slot_time,
        is_active === false ? false : true,
        slotId,
      ]
    );

    res.status(200).json({
      message: "Slot updated successfully",
      slot: result.rows[0],
    });
  } catch (error) {
    console.error("Update slot error:", error);
    res.status(500).json({ message: "Server error while updating slot" });
  }
};

// Toggle slot status (active/inactive)
exports.toggleSlotStatus = async (req, res) => {
  try {
    const slotId = req.params.id;
    const { is_active } = req.body;

    // Validate is_active parameter
    if (is_active === undefined) {
      return res
        .status(400)
        .json({ message: "is_active parameter is required" });
    }

    // Check if slot exists
    const slotExists = await db.query(
      "SELECT COUNT(*) FROM slot WHERE slot_id = $1",
      [slotId]
    );

    if (parseInt(slotExists.rows[0].count) === 0) {
      return res.status(404).json({ message: "Slot not found" });
    }

    // Update slot status
    const result = await db.query(
      `UPDATE slot 
       SET is_active = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE slot_id = $2
       RETURNING *`,
      [is_active, slotId]
    );

    res.status(200).json({
      message: `Slot ${is_active ? "activated" : "deactivated"} successfully`,
      slot: result.rows[0],
    });
  } catch (error) {
    console.error("Toggle slot status error:", error);
    res
      .status(500)
      .json({ message: "Server error while toggling slot status" });
  }
};

// Delete slot
exports.deleteSlot = async (req, res) => {
  try {
    const slotId = req.params.id;
    console.log(`Delete request for slot ID: ${slotId}`);

    // Check if slot exists
    const slotExists = await db.query(
      "SELECT COUNT(*) FROM slot WHERE slot_id = $1",
      [slotId]
    );

    if (parseInt(slotExists.rows[0].count) === 0) {
      return res.status(404).json({ message: "Slot not found" });
    }

    // Delete slot
    await db.query("DELETE FROM slot WHERE slot_id = $1", [slotId]);

    res.status(200).json({
      message: "Slot deleted successfully",
    });
  } catch (error) {
    console.error("Delete slot error:", error);
    res.status(500).json({
      message: "Server error while deleting slot",
      error: error.message,
    });
  }
};
