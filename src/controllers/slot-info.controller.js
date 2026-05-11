const db = require("../config/db");

// Get slot info text for a given (year, semesterType).
// Returns empty info_text if no row exists yet (first-time view is a no-op, not a 404).
exports.getSlotInfo = async (req, res) => {
  try {
    const { year, semesterType } = req.params;

    const result = await db.query(
      `SELECT info_text, updated_at FROM slot_info
       WHERE slot_year = $1 AND semester_type = $2`,
      [year, semesterType]
    );

    if (result.rows.length === 0) {
      return res.status(200).json({ info_text: "", updated_at: null });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Get slot info error:", error);
    res.status(500).json({ message: "Server error while fetching slot info" });
  }
};

// Upsert slot info text for a given (year, semesterType). Admin only.
exports.upsertSlotInfo = async (req, res) => {
  try {
    const { year, semesterType } = req.params;
    const { info_text } = req.body;

    if (typeof info_text !== "string") {
      return res
        .status(400)
        .json({ message: "info_text is required and must be a string" });
    }

    const result = await db.query(
      `INSERT INTO slot_info (slot_year, semester_type, info_text, updated_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (slot_year, semester_type)
       DO UPDATE SET info_text = EXCLUDED.info_text,
                     updated_by = EXCLUDED.updated_by,
                     updated_at = CURRENT_TIMESTAMP
       RETURNING info_text, updated_at`,
      [year, semesterType, info_text, req.userId]
    );

    res.status(200).json({
      message: "Slot info saved",
      info_text: result.rows[0].info_text,
      updated_at: result.rows[0].updated_at,
    });
  } catch (error) {
    console.error("Upsert slot info error:", error);
    res.status(500).json({ message: "Server error while saving slot info" });
  }
};
