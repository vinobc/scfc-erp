const db = require("../config/db");

// Get all semester slot configurations
exports.getAllConfigs = async (req, res) => {
  try {
    const { year, semesterType } = req.query;

    let query = `
      SELECT * FROM semester_slot_config
      WHERE 1=1
    `;
    const params = [];

    if (year) {
      params.push(year);
      query += ` AND slot_year = $${params.length}`;
    }

    if (semesterType) {
      params.push(semesterType);
      query += ` AND semester_type = $${params.length}`;
    }

    query += ` ORDER BY slot_year, semester_type, course_theory, course_practical, slot_name`;

    const result = await db.query(query, params);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Get semester slot configs error:", error);
    res.status(500).json({
      message: "Server error while fetching semester slot configurations",
    });
  }
};

// Get configurations for specific semester
exports.getConfigBySemester = async (req, res) => {
  try {
    const { year, semesterType } = req.params;

    const result = await db.query(
      `SELECT * FROM semester_slot_config 
       WHERE slot_year = $1 AND semester_type = $2
       ORDER BY course_theory, course_practical, slot_name`,
      [year, semesterType]
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Get semester slot config error:", error);
    res.status(500).json({
      message: "Server error while fetching semester slot configuration",
    });
  }
};

// Create new semester slot configuration
exports.createConfig = async (req, res) => {
  try {
    const {
      slot_year,
      semester_type,
      slot_name,
      course_theory,
      course_practical,
      linked_slots,
    } = req.body;

    // Validate required fields
    if (
      !slot_year ||
      !semester_type ||
      !slot_name ||
      course_theory === undefined ||
      course_practical === undefined
    ) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    // Check if configuration already exists
    const existingConfig = await db.query(
      `SELECT * FROM semester_slot_config
       WHERE slot_year = $1 
       AND semester_type = $2 
       AND slot_name = $3
       AND course_theory = $4
       AND course_practical = $5`,
      [slot_year, semester_type, slot_name, course_theory, course_practical]
    );

    if (existingConfig.rows.length > 0) {
      return res.status(409).json({
        message: "Configuration already exists",
      });
    }

    // Insert new configuration
    const result = await db.query(
      `INSERT INTO semester_slot_config
       (slot_year, semester_type, slot_name, course_theory, course_practical, linked_slots)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        slot_year,
        semester_type,
        slot_name,
        course_theory,
        course_practical,
        linked_slots,
      ]
    );

    res.status(201).json({
      message: "Semester slot configuration created successfully",
      config: result.rows[0],
    });
  } catch (error) {
    console.error("Create semester slot config error:", error);
    res.status(500).json({
      message: "Server error while creating semester slot configuration",
    });
  }
};

// Update semester slot configuration
exports.updateConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      slot_year,
      semester_type,
      slot_name,
      course_theory,
      course_practical,
      linked_slots,
      is_active,
    } = req.body;

    // Validate required fields
    if (
      !slot_year ||
      !semester_type ||
      !slot_name ||
      course_theory === undefined ||
      course_practical === undefined
    ) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    // Update configuration
    const result = await db.query(
      `UPDATE semester_slot_config
       SET slot_year = $1,
           semester_type = $2,
           slot_name = $3,
           course_theory = $4,
           course_practical = $5,
           linked_slots = $6,
           is_active = $7,
           updated_at = CURRENT_TIMESTAMP
       WHERE config_id = $8
       RETURNING *`,
      [
        slot_year,
        semester_type,
        slot_name,
        course_theory,
        course_practical,
        linked_slots,
        is_active,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Semester slot configuration not found",
      });
    }

    res.status(200).json({
      message: "Semester slot configuration updated successfully",
      config: result.rows[0],
    });
  } catch (error) {
    console.error("Update semester slot config error:", error);
    res.status(500).json({
      message: "Server error while updating semester slot configuration",
    });
  }
};

// Delete semester slot configuration
exports.deleteConfig = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `DELETE FROM semester_slot_config
       WHERE config_id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Semester slot configuration not found",
      });
    }

    res.status(200).json({
      message: "Semester slot configuration deleted successfully",
    });
  } catch (error) {
    console.error("Delete semester slot config error:", error);
    res.status(500).json({
      message: "Server error while deleting semester slot configuration",
    });
  }
};
