const db = require("../config/db");

// Get all schools
exports.getAllSchools = async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM school ORDER BY school_code",
      []
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Get all schools error:", error);
    res.status(500).json({ message: "Server error while fetching schools" });
  }
};

// Get school by id
exports.getSchoolById = async (req, res) => {
  try {
    const schoolId = req.params.id;

    const result = await db.query("SELECT * FROM school WHERE school_id = $1", [
      schoolId,
    ]);

    const school = result.rows[0];

    if (!school) {
      return res.status(404).json({ message: "School not found" });
    }

    res.status(200).json(school);
  } catch (error) {
    console.error("Get school by id error:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching school details" });
  }
};

// Generate a new school code
async function generateSchoolCode() {
  try {
    // Get the highest current code
    const result = await db.query(
      "SELECT school_code FROM school WHERE school_code LIKE 'SCL%' ORDER BY school_code DESC LIMIT 1"
    );

    let nextNumber = 1; // Default start

    if (result.rows.length > 0) {
      // Extract the number part
      const currentCode = result.rows[0].school_code;
      const match = currentCode.match(/SCL(\d+)/);
      if (match && match[1]) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    // Format with leading zeros to ensure 3 digits
    return `SCL${String(nextNumber).padStart(3, "0")}`;
  } catch (error) {
    console.error("Error generating school code:", error);
    throw error;
  }
}

// Create new school
exports.createSchool = async (req, res) => {
  try {
    const { school_long_name, school_short_name, description, is_active } =
      req.body;

    // Validate required fields
    if (!school_long_name || !school_short_name) {
      return res.status(400).json({
        message: "School long name and short name are required fields",
      });
    }

    // Generate a new school code
    const school_code = await generateSchoolCode();

    // Insert new school
    const result = await db.query(
      `INSERT INTO school 
       (school_code, school_long_name, school_short_name, description, is_active) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [
        school_code,
        school_long_name,
        school_short_name,
        description,
        is_active === false ? false : true,
      ]
    );

    res.status(201).json({
      message: "School created successfully",
      school: result.rows[0],
    });
  } catch (error) {
    console.error("Create school error:", error);
    res.status(500).json({ message: "Server error while creating school" });
  }
};

// Update school
exports.updateSchool = async (req, res) => {
  try {
    const schoolId = req.params.id;
    const {
      school_code,
      school_long_name,
      school_short_name,
      description,
      is_active,
    } = req.body;

    // Validate required fields
    if (!school_code || !school_long_name || !school_short_name) {
      return res.status(400).json({
        message: "School code, long name, and short name are required fields",
      });
    }

    // Check if school exists
    const schoolExists = await db.query(
      "SELECT COUNT(*) FROM school WHERE school_id = $1",
      [schoolId]
    );

    if (parseInt(schoolExists.rows[0].count) === 0) {
      return res.status(404).json({ message: "School not found" });
    }

    // Check if school code already exists for another school
    const existingSchool = await db.query(
      "SELECT COUNT(*) FROM school WHERE school_code = $1 AND school_id != $2",
      [school_code, schoolId]
    );

    if (parseInt(existingSchool.rows[0].count) > 0) {
      return res
        .status(409)
        .json({ message: "School code already exists for another school" });
    }

    // Update school
    const result = await db.query(
      `UPDATE school 
       SET school_code = $1, 
           school_long_name = $2, 
           school_short_name = $3, 
           description = $4, 
           is_active = $5,
           updated_at = CURRENT_TIMESTAMP
       WHERE school_id = $6
       RETURNING *`,
      [
        school_code,
        school_long_name,
        school_short_name,
        description,
        is_active === false ? false : true,
        schoolId,
      ]
    );

    res.status(200).json({
      message: "School updated successfully",
      school: result.rows[0],
    });
  } catch (error) {
    console.error("Update school error:", error);
    res.status(500).json({ message: "Server error while updating school" });
  }
};

// Toggle school status (active/inactive)
exports.toggleSchoolStatus = async (req, res) => {
  try {
    const schoolId = req.params.id;
    const { is_active } = req.body;

    // Validate is_active parameter
    if (is_active === undefined) {
      return res
        .status(400)
        .json({ message: "is_active parameter is required" });
    }

    // Check if school exists
    const schoolExists = await db.query(
      "SELECT COUNT(*) FROM school WHERE school_id = $1",
      [schoolId]
    );

    if (parseInt(schoolExists.rows[0].count) === 0) {
      return res.status(404).json({ message: "School not found" });
    }

    // Update school status
    const result = await db.query(
      `UPDATE school 
       SET is_active = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE school_id = $2
       RETURNING *`,
      [is_active, schoolId]
    );

    res.status(200).json({
      message: `School ${is_active ? "activated" : "deactivated"} successfully`,
      school: result.rows[0],
    });
  } catch (error) {
    console.error("Toggle school status error:", error);
    res
      .status(500)
      .json({ message: "Server error while toggling school status" });
  }
};

// Delete school
// Delete school
exports.deleteSchool = async (req, res) => {
  try {
    const schoolId = req.params.id;
    console.log(`Delete request for school ID: ${schoolId}`);

    // Check if school exists
    const schoolExists = await db.query(
      "SELECT COUNT(*) FROM school WHERE school_id = $1",
      [schoolId]
    );

    console.log(`School exists query result:`, schoolExists.rows[0]);

    if (parseInt(schoolExists.rows[0].count) === 0) {
      console.log(`School with ID ${schoolId} not found in database`);
      return res.status(404).json({ message: "School not found" });
    }

    // Check if there are related records in other tables
    const programsCount = await db.query(
      "SELECT COUNT(*) FROM program WHERE school_id = $1",
      [schoolId]
    );

    console.log(
      `Programs count with school_id ${schoolId}:`,
      programsCount.rows[0]
    );

    const studentsCount = await db.query(
      "SELECT COUNT(*) FROM student WHERE school_id = $1",
      [schoolId]
    );

    console.log(
      `Students count with school_id ${schoolId}:`,
      studentsCount.rows[0]
    );

    if (
      parseInt(programsCount.rows[0].count) > 0 ||
      parseInt(studentsCount.rows[0].count) > 0
    ) {
      console.log(`Cannot delete school ${schoolId} due to dependencies`);
      return res.status(409).json({
        message: "Cannot delete school with existing programs or students",
        programsCount: parseInt(programsCount.rows[0].count),
        studentsCount: parseInt(studentsCount.rows[0].count),
      });
    }

    // Delete school
    console.log(`Executing DELETE for school_id ${schoolId}`);
    await db.query("DELETE FROM school WHERE school_id = $1", [schoolId]);

    res.status(200).json({
      message: "School deleted successfully",
    });
  } catch (error) {
    console.error("Delete school error:", error);
    res
      .status(500)
      .json({
        message: "Server error while deleting school",
        error: error.message,
      });
  }
};
