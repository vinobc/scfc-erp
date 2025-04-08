const db = require("../config/db");

// Get all programs
exports.getAllPrograms = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT p.*, s.school_long_name 
       FROM program p 
       JOIN school s ON p.school_id = s.school_id 
       ORDER BY p.program_code`,
      []
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Get all programs error:", error);
    res.status(500).json({ message: "Server error while fetching programs" });
  }
};

// Get program by id
exports.getProgramById = async (req, res) => {
  try {
    const programId = req.params.id;

    const result = await db.query(
      `SELECT p.*, s.school_long_name 
       FROM program p 
       JOIN school s ON p.school_id = s.school_id 
       WHERE p.program_id = $1`,
      [programId]
    );

    const program = result.rows[0];

    if (!program) {
      return res.status(404).json({ message: "Program not found" });
    }

    res.status(200).json(program);
  } catch (error) {
    console.error("Get program by id error:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching program details" });
  }
};

// Generate a new program code
async function generateProgramCode(schoolCode, type) {
  try {
    // Get the highest current code for this school and type
    const result = await db.query(
      "SELECT program_code FROM program WHERE program_code LIKE $1 ORDER BY program_code DESC LIMIT 1",
      [`${schoolCode}-${type}%`]
    );

    let nextNumber = 1; // Default start

    if (result.rows.length > 0) {
      // Extract the number part
      const currentCode = result.rows[0].program_code;
      const match = currentCode.match(
        new RegExp(`${schoolCode}-${type}(\\d+)`)
      );
      if (match && match[1]) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    // Format with leading zeros to ensure 3 digits
    return `${schoolCode}-${type}${String(nextNumber).padStart(3, "0")}`;
  } catch (error) {
    console.error("Error generating program code:", error);
    throw error;
  }
}

// Create new program
exports.createProgram = async (req, res) => {
  try {
    const {
      school_id,
      duration_years,
      total_credits,
      program_name_long,
      program_name_short,
      department_name_long,
      department_name_short,
      specialization_name_long,
      specialization_name_short,
      type,
      description,
      is_active,
    } = req.body;

    // Validate required fields
    if (
      !school_id ||
      !duration_years ||
      !total_credits ||
      !program_name_long ||
      !program_name_short ||
      !type
    ) {
      return res.status(400).json({
        message: "Required fields missing. Please check your input.",
      });
    }

    // Validate type
    if (!["UG", "PG", "RESEARCH"].includes(type)) {
      return res.status(400).json({
        message: "Type must be one of: UG, PG, RESEARCH",
      });
    }

    // Validate duration_years
    if (![2, 3, 4, 5].includes(Number(duration_years))) {
      return res.status(400).json({
        message: "Duration years must be one of: 2, 3, 4, 5",
      });
    }

    // Get school code for program code generation
    const schoolResult = await db.query(
      "SELECT school_code FROM school WHERE school_id = $1",
      [school_id]
    );

    if (schoolResult.rows.length === 0) {
      return res.status(404).json({
        message: "School not found",
      });
    }

    const schoolCode = schoolResult.rows[0].school_code;

    // Generate program code
    const program_code = await generateProgramCode(schoolCode, type);

    // Insert new program
    const result = await db.query(
      `INSERT INTO program 
       (program_code, school_id, duration_years, total_credits, 
        program_name_long, program_name_short, 
        department_name_long, department_name_short, 
        specialization_name_long, specialization_name_short, 
        type, description, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) 
       RETURNING *`,
      [
        program_code,
        school_id,
        duration_years,
        total_credits,
        program_name_long,
        program_name_short,
        department_name_long || null,
        department_name_short || null,
        specialization_name_long || null,
        specialization_name_short || null,
        type,
        description || null,
        is_active === false ? false : true,
      ]
    );

    // Get school name for the response
    const programWithSchool = await db.query(
      `SELECT p.*, s.school_long_name 
       FROM program p 
       JOIN school s ON p.school_id = s.school_id 
       WHERE p.program_id = $1`,
      [result.rows[0].program_id]
    );

    res.status(201).json({
      message: "Program created successfully",
      program: programWithSchool.rows[0],
    });
  } catch (error) {
    console.error("Create program error:", error);
    res.status(500).json({ message: "Server error while creating program" });
  }
};

// Update program
exports.updateProgram = async (req, res) => {
  try {
    const programId = req.params.id;
    const {
      duration_years,
      total_credits,
      program_name_long,
      program_name_short,
      department_name_long,
      department_name_short,
      specialization_name_long,
      specialization_name_short,
      description,
      is_active,
    } = req.body;

    // Validate required fields
    if (
      !duration_years ||
      !total_credits ||
      !program_name_long ||
      !program_name_short
    ) {
      return res.status(400).json({
        message: "Required fields missing. Please check your input.",
      });
    }

    // Validate duration_years
    if (![2, 3, 4, 5].includes(Number(duration_years))) {
      return res.status(400).json({
        message: "Duration years must be one of: 2, 3, 4, 5",
      });
    }

    // Check if program exists
    const programExists = await db.query(
      "SELECT COUNT(*) FROM program WHERE program_id = $1",
      [programId]
    );

    if (parseInt(programExists.rows[0].count) === 0) {
      return res.status(404).json({ message: "Program not found" });
    }

    // Update program
    const result = await db.query(
      `UPDATE program 
       SET duration_years = $1, 
           total_credits = $2, 
           program_name_long = $3, 
           program_name_short = $4, 
           department_name_long = $5, 
           department_name_short = $6, 
           specialization_name_long = $7, 
           specialization_name_short = $8, 
           description = $9, 
           is_active = $10,
           updated_at = CURRENT_TIMESTAMP
       WHERE program_id = $11
       RETURNING *`,
      [
        duration_years,
        total_credits,
        program_name_long,
        program_name_short,
        department_name_long || null,
        department_name_short || null,
        specialization_name_long || null,
        specialization_name_short || null,
        description || null,
        is_active === false ? false : true,
        programId,
      ]
    );

    // Get school name for the response
    const programWithSchool = await db.query(
      `SELECT p.*, s.school_long_name 
       FROM program p 
       JOIN school s ON p.school_id = s.school_id 
       WHERE p.program_id = $1`,
      [result.rows[0].program_id]
    );

    res.status(200).json({
      message: "Program updated successfully",
      program: programWithSchool.rows[0],
    });
  } catch (error) {
    console.error("Update program error:", error);
    res.status(500).json({ message: "Server error while updating program" });
  }
};

// Toggle program status (active/inactive)
exports.toggleProgramStatus = async (req, res) => {
  try {
    const programId = req.params.id;
    const { is_active } = req.body;

    // Validate is_active parameter
    if (is_active === undefined) {
      return res
        .status(400)
        .json({ message: "is_active parameter is required" });
    }

    // Check if program exists
    const programExists = await db.query(
      "SELECT COUNT(*) FROM program WHERE program_id = $1",
      [programId]
    );

    if (parseInt(programExists.rows[0].count) === 0) {
      return res.status(404).json({ message: "Program not found" });
    }

    // Update program status
    const result = await db.query(
      `UPDATE program 
       SET is_active = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE program_id = $2
       RETURNING *`,
      [is_active, programId]
    );

    // Get school name for the response
    const programWithSchool = await db.query(
      `SELECT p.*, s.school_long_name 
       FROM program p 
       JOIN school s ON p.school_id = s.school_id 
       WHERE p.program_id = $1`,
      [result.rows[0].program_id]
    );

    res.status(200).json({
      message: `Program ${
        is_active ? "activated" : "deactivated"
      } successfully`,
      program: programWithSchool.rows[0],
    });
  } catch (error) {
    console.error("Toggle program status error:", error);
    res
      .status(500)
      .json({ message: "Server error while toggling program status" });
  }
};

// Delete program
exports.deleteProgram = async (req, res) => {
  try {
    const programId = req.params.id;
    console.log(`Delete request for program ID: ${programId}`);

    // Check if program exists
    const programExists = await db.query(
      "SELECT COUNT(*) FROM program WHERE program_id = $1",
      [programId]
    );

    console.log(`Program exists query result:`, programExists.rows[0]);

    if (parseInt(programExists.rows[0].count) === 0) {
      console.log(`Program with ID ${programId} not found in database`);
      return res.status(404).json({ message: "Program not found" });
    }

    // Check if there are related records in other tables (e.g., students)
    const studentsCount = await db.query(
      "SELECT COUNT(*) FROM student WHERE program_id = $1",
      [programId]
    );

    console.log(
      `Students count with program_id ${programId}:`,
      studentsCount.rows[0]
    );

    if (parseInt(studentsCount.rows[0].count) > 0) {
      console.log(`Cannot delete program ${programId} due to dependencies`);
      return res.status(409).json({
        message: "Cannot delete program with existing students",
        studentsCount: parseInt(studentsCount.rows[0].count),
      });
    }

    // Delete program
    console.log(`Executing DELETE for program_id ${programId}`);
    await db.query("DELETE FROM program WHERE program_id = $1", [programId]);

    res.status(200).json({
      message: "Program deleted successfully",
    });
  } catch (error) {
    console.error("Delete program error:", error);
    res.status(500).json({
      message: "Server error while deleting program",
      error: error.message,
    });
  }
};
