const db = require("../config/db");

// Get all semesters
exports.getAllSemesters = async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM semester ORDER BY academic_year DESC, CASE WHEN semester_name = 'Fall' THEN 1 WHEN semester_name = 'Winter' THEN 2 WHEN semester_name = 'Summer' THEN 3 END",
      []
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Get all semesters error:", error);
    res.status(500).json({ message: "Server error while fetching semesters" });
  }
};

// Get semester by id
exports.getSemesterById = async (req, res) => {
  try {
    const semesterId = req.params.id;

    const result = await db.query(
      "SELECT * FROM semester WHERE semester_id = $1",
      [semesterId]
    );

    const semester = result.rows[0];

    if (!semester) {
      return res.status(404).json({ message: "Semester not found" });
    }

    res.status(200).json(semester);
  } catch (error) {
    console.error("Get semester by id error:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching semester details" });
  }
};

// Create new semester
exports.createSemester = async (req, res) => {
  try {
    const { semester_name, academic_year, is_active } = req.body;

    // Validate required fields
    if (!semester_name || !academic_year) {
      return res.status(400).json({
        message: "Semester name and academic year are required fields",
      });
    }

    // Validate semester name
    if (!["Fall", "Winter", "Summer"].includes(semester_name)) {
      return res.status(400).json({
        message: "Semester name must be one of: Fall, Winter, Summer",
      });
    }

    // Validate academic year format (YYYY-YY)
    const academicYearRegex = /^\d{4}-\d{2}$/;
    if (!academicYearRegex.test(academic_year)) {
      return res.status(400).json({
        message: "Academic year must be in the format YYYY-YY (e.g., 2023-24)",
      });
    }

    // Check if semester already exists for the academic year
    const existingResult = await db.query(
      "SELECT COUNT(*) FROM semester WHERE semester_name = $1 AND academic_year = $2",
      [semester_name, academic_year]
    );

    if (parseInt(existingResult.rows[0].count) > 0) {
      return res.status(409).json({
        message: `${semester_name} semester for academic year ${academic_year} already exists`,
      });
    }

    // Insert new semester
    const result = await db.query(
      `INSERT INTO semester 
       (semester_name, academic_year, is_active) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [semester_name, academic_year, is_active === false ? false : true]
    );

    res.status(201).json({
      message: "Semester created successfully",
      semester: result.rows[0],
    });
  } catch (error) {
    console.error("Create semester error:", error);
    res.status(500).json({ message: "Server error while creating semester" });
  }
};

// Update semester
exports.updateSemester = async (req, res) => {
  try {
    const semesterId = req.params.id;
    const { semester_name, academic_year, is_active } = req.body;

    // Validate required fields
    if (!semester_name || !academic_year) {
      return res.status(400).json({
        message: "Semester name and academic year are required fields",
      });
    }

    // Validate semester name
    if (!["Fall", "Winter", "Summer"].includes(semester_name)) {
      return res.status(400).json({
        message: "Semester name must be one of: Fall, Winter, Summer",
      });
    }

    // Validate academic year format (YYYY-YY)
    const academicYearRegex = /^\d{4}-\d{2}$/;
    if (!academicYearRegex.test(academic_year)) {
      return res.status(400).json({
        message: "Academic year must be in the format YYYY-YY (e.g., 2023-24)",
      });
    }

    // Check if semester exists
    const semesterExists = await db.query(
      "SELECT COUNT(*) FROM semester WHERE semester_id = $1",
      [semesterId]
    );

    if (parseInt(semesterExists.rows[0].count) === 0) {
      return res.status(404).json({ message: "Semester not found" });
    }

    // Check if updated semester would conflict with an existing one
    const existingResult = await db.query(
      "SELECT COUNT(*) FROM semester WHERE semester_name = $1 AND academic_year = $2 AND semester_id != $3",
      [semester_name, academic_year, semesterId]
    );

    if (parseInt(existingResult.rows[0].count) > 0) {
      return res.status(409).json({
        message: `${semester_name} semester for academic year ${academic_year} already exists`,
      });
    }

    // Update semester
    const result = await db.query(
      `UPDATE semester 
       SET semester_name = $1, 
           academic_year = $2, 
           is_active = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE semester_id = $4
       RETURNING *`,
      [
        semester_name,
        academic_year,
        is_active === false ? false : true,
        semesterId,
      ]
    );

    res.status(200).json({
      message: "Semester updated successfully",
      semester: result.rows[0],
    });
  } catch (error) {
    console.error("Update semester error:", error);
    res.status(500).json({ message: "Server error while updating semester" });
  }
};

// Toggle semester status (active/inactive)
exports.toggleSemesterStatus = async (req, res) => {
  try {
    const semesterId = req.params.id;
    const { is_active } = req.body;

    // Validate is_active parameter
    if (is_active === undefined) {
      return res
        .status(400)
        .json({ message: "is_active parameter is required" });
    }

    // Check if semester exists
    const semesterExists = await db.query(
      "SELECT COUNT(*) FROM semester WHERE semester_id = $1",
      [semesterId]
    );

    if (parseInt(semesterExists.rows[0].count) === 0) {
      return res.status(404).json({ message: "Semester not found" });
    }

    // Update semester status
    const result = await db.query(
      `UPDATE semester 
       SET is_active = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE semester_id = $2
       RETURNING *`,
      [is_active, semesterId]
    );

    res.status(200).json({
      message: `Semester ${
        is_active ? "activated" : "deactivated"
      } successfully`,
      semester: result.rows[0],
    });
  } catch (error) {
    console.error("Toggle semester status error:", error);
    res
      .status(500)
      .json({ message: "Server error while toggling semester status" });
  }
};

// Delete semester
exports.deleteSemester = async (req, res) => {
  try {
    const semesterId = req.params.id;
    console.log(`Delete request for semester ID: ${semesterId}`);

    // Check if semester exists
    const semesterExists = await db.query(
      "SELECT COUNT(*) FROM semester WHERE semester_id = $1",
      [semesterId]
    );

    console.log(`Semester exists query result:`, semesterExists.rows[0]);

    if (parseInt(semesterExists.rows[0].count) === 0) {
      console.log(`Semester with ID ${semesterId} not found in database`);
      return res.status(404).json({ message: "Semester not found" });
    }

    // Delete semester
    console.log(`Deleting semester with ID: ${semesterId}`);
    await db.query("DELETE FROM semester WHERE semester_id = $1", [semesterId]);

    res.status(200).json({
      message: "Semester deleted successfully",
    });
  } catch (error) {
    console.error("Delete semester error:", error);
    res.status(500).json({ message: "Server error while deleting semester" });
  }
};
