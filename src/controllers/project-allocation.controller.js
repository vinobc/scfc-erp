const db = require("../config/db");

// Get all project allocations
exports.getAllProjectAllocations = async (req, res) => {
  try {
    const { year, semesterType, employeeId, courseCode } = req.query;

    let query = `
      SELECT 
        pa.*,
        c.course_name,
        c.credits
      FROM project_allocation pa
      JOIN course c ON pa.course_code = c.course_code
      WHERE pa.is_active = true
    `;
    const params = [];

    if (year) {
      params.push(year);
      query += ` AND pa.slot_year = $${params.length}`;
    }

    if (semesterType) {
      params.push(semesterType);
      query += ` AND pa.semester_type = $${params.length}`;
    }


    if (courseCode) {
      params.push(courseCode);
      query += ` AND pa.course_code = $${params.length}`;
    }

    query += ` ORDER BY pa.slot_year DESC, pa.semester_type, c.course_code`;

    const result = await db.query(query, params);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Get project allocations error:", error);
    res.status(500).json({ 
      message: "Server error while fetching project allocations" 
    });
  }
};

// Create new project allocation
exports.createProjectAllocation = async (req, res) => {
  try {
    const {
      slot_year,
      semester_type,
      course_code
    } = req.body;

    // Validate required fields
    if (!slot_year || !semester_type || !course_code) {
      return res.status(400).json({ 
        message: "slot_year, semester_type, and course_code are required" 
      });
    }

    // Verify the course is a project type
    const courseCheck = await db.query(
      `SELECT course_code, course_name, course_type, credits 
       FROM course 
       WHERE course_code = $1 AND course_type = 'PRJ'`,
      [course_code]
    );

    if (courseCheck.rows.length === 0) {
      return res.status(400).json({ 
        message: "Course not found or is not a project-type course" 
      });
    }

    // Check if this project course is already activated for this semester
    const existingCheck = await db.query(
      `SELECT * FROM project_allocation
       WHERE slot_year = $1 
         AND semester_type = $2 
         AND course_code = $3
         AND is_active = true`,
      [slot_year, semester_type, course_code]
    );

    if (existingCheck.rows.length > 0) {
      return res.status(409).json({
        message: `This project course is already activated for ${slot_year} ${semester_type}`,
        existingAllocation: existingCheck.rows[0]
      });
    }

    // Create the allocation (without faculty or max_students)
    const result = await db.query(
      `INSERT INTO project_allocation 
       (slot_year, semester_type, course_code)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [slot_year, semester_type, course_code]
    );

    res.status(201).json({
      message: "Project allocation created successfully",
      allocation: result.rows[0]
    });
  } catch (error) {
    console.error("Create project allocation error:", error);
    res.status(500).json({ 
      message: "Server error while creating project allocation" 
    });
  }
};

// Update project allocation
exports.updateProjectAllocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { max_students, is_active } = req.body;

    let updateFields = [];
    let values = [];
    let valueIndex = 1;

    if (max_students !== undefined) {
      updateFields.push(`max_students = $${valueIndex}`);
      values.push(max_students);
      valueIndex++;
    }

    if (is_active !== undefined) {
      updateFields.push(`is_active = $${valueIndex}`);
      values.push(is_active);
      valueIndex++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ 
        message: "No fields to update" 
      });
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE project_allocation
      SET ${updateFields.join(', ')}
      WHERE id = $${valueIndex}
      RETURNING *
    `;

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        message: "Project allocation not found" 
      });
    }

    res.status(200).json({
      message: "Project allocation updated successfully",
      allocation: result.rows[0]
    });
  } catch (error) {
    console.error("Update project allocation error:", error);
    res.status(500).json({ 
      message: "Server error while updating project allocation" 
    });
  }
};

// Delete project allocation
exports.deleteProjectAllocation = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if there are students registered
    const allocation = await db.query(
      `SELECT current_students FROM project_allocation WHERE id = $1`,
      [id]
    );

    if (allocation.rows.length === 0) {
      return res.status(404).json({ 
        message: "Project allocation not found" 
      });
    }

    if (allocation.rows[0].current_students > 0) {
      return res.status(400).json({ 
        message: "Cannot delete allocation with registered students. Please deactivate instead." 
      });
    }

    // Delete the allocation
    await db.query(
      `DELETE FROM project_allocation WHERE id = $1`,
      [id]
    );

    res.status(200).json({ 
      message: "Project allocation deleted successfully" 
    });
  } catch (error) {
    console.error("Delete project allocation error:", error);
    res.status(500).json({ 
      message: "Server error while deleting project allocation" 
    });
  }
};

// Get available project courses for allocation
exports.getAvailableProjectCourses = async (req, res) => {
  try {
    const { slot_year, semester_type } = req.query;

    if (!slot_year || !semester_type) {
      return res.status(400).json({ 
        message: "slot_year and semester_type are required" 
      });
    }

    // Get all active project courses (multiple faculty can offer the same project)
    const query = `
      SELECT 
        c.course_code,
        c.course_name,
        c.credits,
        c.programs_offered_to
      FROM course c
      WHERE c.course_type = 'PRJ'
        AND c.is_active = true
      ORDER BY c.course_code
    `;

    const result = await db.query(query);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Get available project courses error:", error);
    res.status(500).json({ 
      message: "Server error while fetching available project courses" 
    });
  }
};

// Get project allocation summary for a faculty
exports.getFacultyProjectSummary = async (req, res) => {
  try {
    const { employeeId, slot_year, semester_type } = req.query;

    if (!employeeId) {
      return res.status(400).json({ 
        message: "employeeId is required" 
      });
    }

    let query = `
      SELECT 
        pa.*,
        c.course_name,
        c.credits,
        (
          SELECT COUNT(*)
          FROM student_registrations sr
          WHERE sr.course_code = pa.course_code
            AND sr.slot_year = pa.slot_year
            AND sr.semester_type = pa.semester_type
            AND sr.faculty_name = (SELECT name FROM faculty WHERE employee_id = pa.employee_id)
        ) as actual_students
      FROM project_allocation pa
      JOIN course c ON pa.course_code = c.course_code
      WHERE pa.employee_id = $1
        AND pa.is_active = true
    `;
    const params = [employeeId];

    if (slot_year) {
      params.push(slot_year);
      query += ` AND pa.slot_year = $${params.length}`;
    }

    if (semester_type) {
      params.push(semester_type);
      query += ` AND pa.semester_type = $${params.length}`;
    }

    query += ` ORDER BY pa.slot_year DESC, pa.semester_type, c.course_code`;

    const result = await db.query(query, params);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Get faculty project summary error:", error);
    res.status(500).json({ 
      message: "Server error while fetching faculty project summary" 
    });
  }
};