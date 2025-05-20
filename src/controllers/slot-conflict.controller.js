const db = require("../config/db");

// Get conflicting slots for a specific slot
exports.getConflictingSlots = async (req, res) => {
  try {
    const { slotYear, semesterType, slotName } = req.query;

    if (!slotYear || !semesterType || !slotName) {
      return res.status(400).json({
        message: "Slot year, semester type, and slot name are required",
      });
    }

    const result = await db.query(
      `SELECT conflicting_slot_name 
       FROM slot_conflict 
       WHERE slot_year = $1 AND semester_type = $2 AND slot_name = $3`,
      [slotYear, semesterType, slotName]
    );

    res.status(200).json({
      slotYear,
      semesterType,
      slotName,
      conflictingSlots: result.rows.map((row) => row.conflicting_slot_name),
    });
  } catch (error) {
    console.error("Get conflicting slots error:", error);
    res.status(500).json({
      message: "Server error while fetching conflicting slots",
    });
  }
};

// Get all slot conflicts for a specific semester
exports.getAllConflictsForSemester = async (req, res) => {
  try {
    const { slotYear, semesterType } = req.params;

    if (!slotYear || !semesterType) {
      return res.status(400).json({
        message: "Slot year and semester type are required",
      });
    }

    const result = await db.query(
      `SELECT * FROM slot_conflict 
       WHERE slot_year = $1 AND semester_type = $2
       ORDER BY slot_name, conflicting_slot_name`,
      [slotYear, semesterType]
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Get semester conflicts error:", error);
    res.status(500).json({
      message: "Server error while fetching semester conflicts",
    });
  }
};
