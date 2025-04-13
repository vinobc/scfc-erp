const db = require("../config/db");

// Get all faculty members
exports.getAllFaculty = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT f.*, s.school_code, s.school_short_name 
       FROM faculty f
       LEFT JOIN school s ON f.school_id = s.school_id
       ORDER BY f.name`,
      []
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Get all faculty error:", error);
    res.status(500).json({ message: "Server error while fetching faculty" });
  }
};

// Get faculty by id
exports.getFacultyById = async (req, res) => {
  try {
    const facultyId = req.params.id;

    const result = await db.query(
      `SELECT f.*, s.school_code, s.school_short_name 
       FROM faculty f
       LEFT JOIN school s ON f.school_id = s.school_id
       WHERE f.faculty_id = $1`,
      [facultyId]
    );

    const faculty = result.rows[0];

    if (!faculty) {
      return res.status(404).json({ message: "Faculty not found" });
    }

    res.status(200).json(faculty);
  } catch (error) {
    console.error("Get faculty by id error:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching faculty details" });
  }
};

// Create new faculty
exports.createFaculty = async (req, res) => {
  try {
    const { name, designation, employee_id, school_id, email, is_active } =
      req.body;

    // Validate required fields
    if (!name || !employee_id || !school_id) {
      return res.status(400).json({
        message: "Name, employee ID, and school are required fields",
      });
    }

    // Check if employee_id already exists
    const existingEmployee = await db.query(
      "SELECT COUNT(*) FROM faculty WHERE employee_id = $1",
      [employee_id]
    );

    if (parseInt(existingEmployee.rows[0].count) > 0) {
      return res.status(409).json({
        message: "Employee ID already exists",
      });
    }

    // Check if school_id exists
    const schoolExists = await db.query(
      "SELECT COUNT(*) FROM school WHERE school_id = $1",
      [school_id]
    );

    if (parseInt(schoolExists.rows[0].count) === 0) {
      return res.status(400).json({
        message: "Selected school does not exist",
      });
    }

    // Insert new faculty
    const result = await db.query(
      `INSERT INTO faculty 
       (name, designation, employee_id, school_id, email, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [
        name,
        designation || null,
        employee_id,
        school_id,
        email || null,
        is_active === false ? false : true,
      ]
    );

    res.status(201).json({
      message: "Faculty created successfully",
      faculty: result.rows[0],
    });
  } catch (error) {
    console.error("Create faculty error:", error);
    res.status(500).json({ message: "Server error while creating faculty" });
  }
};

// Update faculty
exports.updateFaculty = async (req, res) => {
  try {
    const facultyId = req.params.id;
    const { name, designation, employee_id, school_id, email, is_active } =
      req.body;

    // Validate required fields
    if (!name || !employee_id || !school_id) {
      return res.status(400).json({
        message: "Name, employee ID, and school are required fields",
      });
    }

    // Check if faculty exists
    const facultyExists = await db.query(
      "SELECT COUNT(*) FROM faculty WHERE faculty_id = $1",
      [facultyId]
    );

    if (parseInt(facultyExists.rows[0].count) === 0) {
      return res.status(404).json({ message: "Faculty not found" });
    }

    // Check if employee_id already exists for another faculty
    const existingEmployee = await db.query(
      "SELECT COUNT(*) FROM faculty WHERE employee_id = $1 AND faculty_id != $2",
      [employee_id, facultyId]
    );

    if (parseInt(existingEmployee.rows[0].count) > 0) {
      return res.status(409).json({
        message: "Employee ID already exists for another faculty",
      });
    }

    // Check if school_id exists
    const schoolExists = await db.query(
      "SELECT COUNT(*) FROM school WHERE school_id = $1",
      [school_id]
    );

    if (parseInt(schoolExists.rows[0].count) === 0) {
      return res.status(400).json({
        message: "Selected school does not exist",
      });
    }

    // Update faculty
    const result = await db.query(
      `UPDATE faculty 
       SET name = $1, 
           designation = $2, 
           employee_id = $3, 
           school_id = $4, 
           email = $5, 
           is_active = $6,
           updated_at = CURRENT_TIMESTAMP
       WHERE faculty_id = $7
       RETURNING *`,
      [
        name,
        designation || null,
        employee_id,
        school_id,
        email || null,
        is_active === false ? false : true,
        facultyId,
      ]
    );

    res.status(200).json({
      message: "Faculty updated successfully",
      faculty: result.rows[0],
    });
  } catch (error) {
    console.error("Update faculty error:", error);
    res.status(500).json({ message: "Server error while updating faculty" });
  }
};

// Toggle faculty status (active/inactive)
exports.toggleFacultyStatus = async (req, res) => {
  try {
    const facultyId = req.params.id;
    const { is_active } = req.body;

    // Validate is_active parameter
    if (is_active === undefined) {
      return res
        .status(400)
        .json({ message: "is_active parameter is required" });
    }

    // Check if faculty exists
    const facultyExists = await db.query(
      "SELECT COUNT(*) FROM faculty WHERE faculty_id = $1",
      [facultyId]
    );

    if (parseInt(facultyExists.rows[0].count) === 0) {
      return res.status(404).json({ message: "Faculty not found" });
    }

    // Update faculty status
    const result = await db.query(
      `UPDATE faculty 
       SET is_active = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE faculty_id = $2
       RETURNING *`,
      [is_active, facultyId]
    );

    res.status(200).json({
      message: `Faculty ${
        is_active ? "activated" : "deactivated"
      } successfully`,
      faculty: result.rows[0],
    });
  } catch (error) {
    console.error("Toggle faculty status error:", error);
    res
      .status(500)
      .json({ message: "Server error while toggling faculty status" });
  }
};

// Delete faculty
exports.deleteFaculty = async (req, res) => {
  try {
    const facultyId = req.params.id;
    console.log(`Delete request for faculty ID: ${facultyId}`);

    // Check if faculty exists
    const facultyExists = await db.query(
      "SELECT COUNT(*) FROM faculty WHERE faculty_id = $1",
      [facultyId]
    );

    console.log(`Faculty exists query result:`, facultyExists.rows[0]);

    if (parseInt(facultyExists.rows[0].count) === 0) {
      console.log(`Faculty with ID ${facultyId} not found in database`);
      return res.status(404).json({ message: "Faculty not found" });
    }

    // Delete faculty
    console.log(`Executing DELETE for faculty_id ${facultyId}`);
    await db.query("DELETE FROM faculty WHERE faculty_id = $1", [facultyId]);

    res.status(200).json({
      message: "Faculty deleted successfully",
    });
  } catch (error) {
    console.error("Delete faculty error:", error);
    res.status(500).json({
      message: "Server error while deleting faculty",
      error: error.message,
    });
  }
};
