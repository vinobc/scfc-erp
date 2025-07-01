const pool = require("../config/db");

// Helper function to get student by user ID
async function getStudentByUserId(userId) {
  console.log(`🔍 Looking for student with user_id: ${userId}`);

  const result = await pool.query(
    `SELECT enrollment_no, student_name, program_name, year_admitted 
     FROM student 
     WHERE user_id = $1`,
    [userId]
  );

  console.log(`🔍 Student query result:`, result.rows);

  if (result.rows.length === 0) {
    throw new Error("Student record not found for this user");
  }

  const student = result.rows[0];
  return {
    enrollment_number: student.enrollment_no,
    student_name: student.student_name,
    program_code: student.program_name,
    year_admitted: student.year_admitted,
  };
}

// Get all registered courses for a student for withdrawal
const getRegisteredCourses = async (req, res) => {
  try {
    const { slot_year, semester_type } = req.params;
    const userId = req.userId;

    // Get student details
    const student = await getStudentByUserId(userId);
    const enrollment_number = student.enrollment_number;

    // Get all registered courses
    const query = `
      SELECT 
        sr.course_code,
        sr.course_name,
        sr.theory,
        sr.practical,
        sr.credits,
        sr.course_type,
        sr.faculty_name,
        sr.withdrawn,
        sr.slot_name,
        sr.venue,
        sr.component_type
      FROM student_registrations sr
      WHERE sr.enrollment_number = $1
        AND sr.slot_year = $2
        AND sr.semester_type = $3
      ORDER BY sr.course_code, sr.component_type
    `;

    const result = await pool.query(query, [
      enrollment_number,
      slot_year,
      semester_type
    ]);

    // Group by course_code and aggregate components
    const coursesMap = new Map();
    
    result.rows.forEach(row => {
      const courseKey = row.course_code;
      
      if (!coursesMap.has(courseKey)) {
        coursesMap.set(courseKey, {
          course_code: row.course_code,
          course_name: row.course_name,
          theory: row.theory,
          practical: row.practical,
          credits: row.credits,
          course_type: row.course_type,
          faculty_name: row.faculty_name,
          withdrawn: row.withdrawn,
          components: []
        });
      }
      
      coursesMap.get(courseKey).components.push({
        slot_name: row.slot_name,
        venue: row.venue,
        component_type: row.component_type
      });
    });

    const courses = Array.from(coursesMap.values());

    res.json({
      courses: courses,
      enrollment_number,
      slot_year,
      semester_type
    });
  } catch (error) {
    console.error("Error fetching registered courses:", error);
    res.status(500).json({ 
      message: "Failed to fetch registered courses",
      error: error.message 
    });
  }
};

// Withdraw from a course
const withdrawFromCourse = async (req, res) => {
  try {
    const { course_code, slot_year, semester_type } = req.body;
    const userId = req.userId;

    // Get student details
    const student = await getStudentByUserId(userId);
    const enrollment_number = student.enrollment_number;

    // Check if the course is already withdrawn
    const checkQuery = `
      SELECT withdrawn 
      FROM student_registrations 
      WHERE enrollment_number = $1 
        AND course_code = $2 
        AND slot_year = $3 
        AND semester_type = $4
      LIMIT 1
    `;

    const checkResult = await pool.query(checkQuery, [
      enrollment_number,
      course_code,
      slot_year,
      semester_type
    ]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ 
        message: "Course registration not found" 
      });
    }

    if (checkResult.rows[0].withdrawn) {
      return res.status(400).json({ 
        message: "Course already withdrawn" 
      });
    }

    // Update all components of the course to withdrawn
    const updateQuery = `
      UPDATE student_registrations 
      SET withdrawn = true,
          updated_at = CURRENT_TIMESTAMP
      WHERE enrollment_number = $1 
        AND course_code = $2 
        AND slot_year = $3 
        AND semester_type = $4
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [
      enrollment_number,
      course_code,
      slot_year,
      semester_type
    ]);

    // Log the withdrawal
    console.log(`Course withdrawal: ${enrollment_number} withdrew from ${course_code} (${slot_year} ${semester_type})`);

    res.json({
      message: "Successfully withdrawn from course",
      withdrawnCount: result.rowCount,
      course: {
        course_code,
        course_name: result.rows[0].course_name,
        credits: result.rows[0].credits
      }
    });
  } catch (error) {
    console.error("Error withdrawing from course:", error);
    res.status(500).json({ 
      message: "Failed to withdraw from course",
      error: error.message 
    });
  }
};

// Get withdrawal status for a specific course
const getWithdrawalStatus = async (req, res) => {
  try {
    const { enrollment_number, course_code, slot_year, semester_type } = req.params;
    const userId = req.userId;

    // Get student details
    const student = await getStudentByUserId(userId);

    // Verify the requesting user
    if (student.enrollment_number !== enrollment_number) {
      return res.status(403).json({ 
        message: "Unauthorized to view this information" 
      });
    }

    const query = `
      SELECT DISTINCT
        course_code,
        course_name,
        withdrawn
      FROM student_registrations
      WHERE enrollment_number = $1
        AND course_code = $2
        AND slot_year = $3
        AND semester_type = $4
      LIMIT 1
    `;

    const result = await pool.query(query, [
      enrollment_number,
      course_code,
      slot_year,
      semester_type
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        message: "Course registration not found" 
      });
    }

    res.json({
      course_code,
      course_name: result.rows[0].course_name,
      withdrawn: result.rows[0].withdrawn
    });
  } catch (error) {
    console.error("Error fetching withdrawal status:", error);
    res.status(500).json({ 
      message: "Failed to fetch withdrawal status",
      error: error.message 
    });
  }
};

// Check if course withdrawal is enabled
const getWithdrawalEnabledStatus = async (req, res) => {
  try {
    const query = `
      SELECT config_value, config_description 
      FROM system_config 
      WHERE config_key = 'course_withdrawal_enabled' AND is_active = true
    `;

    const result = await pool.query(query);

    if (result.rows.length === 0) {
      // Default to enabled if no configuration found
      return res.json({
        enabled: true,
        message: "Course withdrawal is available"
      });
    }

    const config = result.rows[0];
    const isEnabled = config.config_value.toLowerCase() === "true";

    res.json({
      enabled: isEnabled,
      message: isEnabled 
        ? "Course withdrawal is available" 
        : (config.config_description || "Course withdrawal is currently disabled by administration")
    });
  } catch (error) {
    console.error("Error checking withdrawal enabled status:", error);
    res.status(500).json({ 
      message: "Failed to check withdrawal status",
      error: error.message 
    });
  }
};

module.exports = {
  getRegisteredCourses,
  withdrawFromCourse,
  getWithdrawalStatus,
  getWithdrawalEnabledStatus
};