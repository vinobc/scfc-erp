const db = require("../config/db");
const XLSX = require("xlsx");
const bcrypt = require("bcrypt");

// Get all students
exports.getAllStudents = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT s.*, p.program_name_short, sc.school_short_name 
       FROM student s
       JOIN program p ON s.program_id = p.program_id
       JOIN school sc ON s.school_id = sc.school_id
       ORDER BY s.enrollment_no`,
      []
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Get all students error:", error);
    res.status(500).json({ message: "Server error while fetching students" });
  }
};

// Get student by enrollment number
exports.getStudentByEnrollment = async (req, res) => {
  try {
    const enrollmentNo = req.params.enrollment_no;

    const result = await db.query(
      `SELECT s.*, p.program_name_short, sc.school_short_name 
       FROM student s
       JOIN program p ON s.program_id = p.program_id
       JOIN school sc ON s.school_id = sc.school_id
       WHERE s.enrollment_no = $1`,
      [enrollmentNo]
    );

    const student = result.rows[0];

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.status(200).json(student);
  } catch (error) {
    console.error("Get student by enrollment error:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching student details" });
  }
};

// Create new student
exports.createStudent = async (req, res) => {
  try {
    const {
      enrollment_no,
      user_id,
      student_name,
      program_name,
      school_name,
      year_admitted,
      email_id,
    } = req.body;

    // Validate required fields
    if (
      !enrollment_no ||
      !user_id ||
      !student_name ||
      !program_name ||
      !school_name ||
      !year_admitted
    ) {
      return res.status(400).json({
        message: "Required fields missing. Please check your input.",
      });
    }

    // Check if the program exists and get its ID
    const programResult = await db.query(
      "SELECT program_id FROM program WHERE program_name_short = $1",
      [program_name]
    );

    if (programResult.rows.length === 0) {
      return res.status(404).json({
        message: `Program with name '${program_name}' not found`,
      });
    }
    const program_id = programResult.rows[0].program_id;

    // Check if the school exists and get its ID
    const schoolResult = await db.query(
      "SELECT school_id FROM school WHERE school_short_name = $1",
      [school_name]
    );

    if (schoolResult.rows.length === 0) {
      return res.status(404).json({
        message: `School with name '${school_name}' not found`,
      });
    }
    const school_id = schoolResult.rows[0].school_id;

    // Check if enrollment_no already exists
    const enrollmentCheck = await db.query(
      "SELECT COUNT(*) FROM student WHERE enrollment_no = $1",
      [enrollment_no]
    );

    if (parseInt(enrollmentCheck.rows[0].count) > 0) {
      return res.status(409).json({
        message: "A student with this enrollment number already exists",
      });
    }

    // Check if user_id already exists
    const userIdCheck = await db.query(
      "SELECT COUNT(*) FROM student WHERE user_id = $1",
      [user_id]
    );

    if (parseInt(userIdCheck.rows[0].count) > 0) {
      return res.status(409).json({
        message: "A student with this user ID already exists",
      });
    }

    // Insert new student
    const result = await db.query(
      `INSERT INTO student 
       (enrollment_no, user_id, student_name, program_id, school_id, program_name, school_name, year_admitted, email_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING *`,
      [
        enrollment_no,
        user_id,
        student_name,
        program_id,
        school_id,
        program_name,
        school_name,
        year_admitted,
        email_id || null,
      ]
    );

    // Get the full student data with joined program and school info
    const studentData = await db.query(
      `SELECT s.*, p.program_name_short, sc.school_short_name 
       FROM student s
       JOIN program p ON s.program_id = p.program_id
       JOIN school sc ON s.school_id = sc.school_id
       WHERE s.enrollment_no = $1`,
      [enrollment_no]
    );

    res.status(201).json({
      message: "Student created successfully",
      student: studentData.rows[0],
    });
  } catch (error) {
    console.error("Create student error:", error);
    res.status(500).json({ message: "Server error while creating student" });
  }
};

// Update student
exports.updateStudent = async (req, res) => {
  try {
    const enrollmentNo = req.params.enrollment_no;
    const {
      user_id,
      student_name,
      program_name,
      school_name,
      year_admitted,
      email_id,
    } = req.body;

    // Validate required fields
    if (
      !user_id ||
      !student_name ||
      !program_name ||
      !school_name ||
      !year_admitted
    ) {
      return res.status(400).json({
        message: "Required fields missing. Please check your input.",
      });
    }

    // Check if the program exists and get its ID
    const programResult = await db.query(
      "SELECT program_id FROM program WHERE program_name_short = $1",
      [program_name]
    );

    if (programResult.rows.length === 0) {
      return res.status(404).json({
        message: `Program with name '${program_name}' not found`,
      });
    }
    const program_id = programResult.rows[0].program_id;

    // Check if the school exists and get its ID
    const schoolResult = await db.query(
      "SELECT school_id FROM school WHERE school_short_name = $1",
      [school_name]
    );

    if (schoolResult.rows.length === 0) {
      return res.status(404).json({
        message: `School with name '${school_name}' not found`,
      });
    }
    const school_id = schoolResult.rows[0].school_id;

    // Check if student exists
    const studentExists = await db.query(
      "SELECT COUNT(*) FROM student WHERE enrollment_no = $1",
      [enrollmentNo]
    );

    if (parseInt(studentExists.rows[0].count) === 0) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Check if user_id already exists for a different student
    const userIdCheck = await db.query(
      "SELECT COUNT(*) FROM student WHERE user_id = $1 AND enrollment_no != $2",
      [user_id, enrollmentNo]
    );

    if (parseInt(userIdCheck.rows[0].count) > 0) {
      return res.status(409).json({
        message: "Another student with this user ID already exists",
      });
    }

    // Update student
    const result = await db.query(
      `UPDATE student 
       SET user_id = $1, 
           student_name = $2, 
           program_id = $3, 
           school_id = $4, 
           program_name = $5, 
           school_name = $6, 
           year_admitted = $7, 
           email_id = $8,
           updated_at = CURRENT_TIMESTAMP
       WHERE enrollment_no = $9
       RETURNING *`,
      [
        user_id,
        student_name,
        program_id,
        school_id,
        program_name,
        school_name,
        year_admitted,
        email_id || null,
        enrollmentNo,
      ]
    );

    // Get the full student data with joined program and school info
    const studentData = await db.query(
      `SELECT s.*, p.program_name_short, sc.school_short_name 
       FROM student s
       JOIN program p ON s.program_id = p.program_id
       JOIN school sc ON s.school_id = sc.school_id
       WHERE s.enrollment_no = $1`,
      [enrollmentNo]
    );

    res.status(200).json({
      message: "Student updated successfully",
      student: studentData.rows[0],
    });
  } catch (error) {
    console.error("Update student error:", error);
    res.status(500).json({ message: "Server error while updating student" });
  }
};

// Delete student
exports.deleteStudent = async (req, res) => {
  try {
    const enrollmentNo = req.params.enrollment_no;

    // Check if student exists
    const studentExists = await db.query(
      "SELECT COUNT(*) FROM student WHERE enrollment_no = $1",
      [enrollmentNo]
    );

    if (parseInt(studentExists.rows[0].count) === 0) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Delete student
    await db.query("DELETE FROM student WHERE enrollment_no = $1", [
      enrollmentNo,
    ]);

    res.status(200).json({
      message: "Student deleted successfully",
    });
  } catch (error) {
    console.error("Delete student error:", error);
    res.status(500).json({
      message: "Server error while deleting student",
      error: error.message,
    });
  }
};

// Import students from Excel
exports.importStudents = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Please upload an Excel file" });
    }

    // Read Excel file
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      return res.status(400).json({ message: "Excel file has no data" });
    }

    // Validate Excel data structure
    const requiredFields = [
      "enrollment_no",
      "user_id",
      "student_name",
      "program_name",
      "school_name",
      "year_admitted",
    ];
    const firstRow = data[0];

    for (const field of requiredFields) {
      if (!(field in firstRow)) {
        return res.status(400).json({
          message: `Excel file is missing required field: ${field}`,
          expectedFields: requiredFields,
        });
      }
    }

    // Begin transaction
    await db.query("BEGIN");

    const results = {
      total: data.length,
      imported: 0,
      errors: [],
    };

    // Pre-load all program and school mappings for faster processing
    const programsResult = await db.query(
      "SELECT program_id, program_name_short FROM program"
    );
    const programMap = {};
    programsResult.rows.forEach((row) => {
      programMap[row.program_name_short] = row.program_id;
    });

    const schoolsResult = await db.query(
      "SELECT school_id, school_short_name FROM school"
    );
    const schoolMap = {};
    schoolsResult.rows.forEach((row) => {
      schoolMap[row.school_short_name] = row.school_id;
    });

    // Process each row
    for (let i = 0; i < data.length; i++) {
      try {
        const row = data[i];

        // Look up program ID
        const programId = programMap[row.program_name];
        if (!programId) {
          throw new Error(`Program '${row.program_name}' not found`);
        }

        // Look up school ID
        const schoolId = schoolMap[row.school_name];
        if (!schoolId) {
          throw new Error(`School '${row.school_name}' not found`);
        }

        // Check if enrollment_no already exists
        const enrollmentCheck = await db.query(
          "SELECT COUNT(*) FROM student WHERE enrollment_no = $1",
          [row.enrollment_no]
        );

        if (parseInt(enrollmentCheck.rows[0].count) > 0) {
          throw new Error(
            `A student with enrollment number '${row.enrollment_no}' already exists`
          );
        }

        // Check if user_id already exists
        const userIdCheck = await db.query(
          "SELECT COUNT(*) FROM student WHERE user_id = $1",
          [row.user_id]
        );

        if (parseInt(userIdCheck.rows[0].count) > 0) {
          throw new Error(
            `A student with user ID '${row.user_id}' already exists`
          );
        }

        // Insert the student
        await db.query(
          `INSERT INTO student 
           (enrollment_no, user_id, student_name, program_id, school_id, program_name, school_name, year_admitted, email_id) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            row.enrollment_no,
            row.user_id,
            row.student_name,
            programId,
            schoolId,
            row.program_name,
            row.school_name,
            row.year_admitted,
            row.email_id || null,
          ]
        );

        results.imported++;
      } catch (error) {
        results.errors.push({
          row: i + 1,
          message: error.message,
        });
      }
    }

    // If at least one student was imported, commit the transaction
    if (results.imported > 0) {
      await db.query("COMMIT");
    } else {
      await db.query("ROLLBACK");
      return res.status(400).json({
        message: "No students were imported due to errors",
        results,
      });
    }

    res.status(200).json({
      message: `Successfully imported ${results.imported} of ${results.total} students`,
      results,
    });
  } catch (error) {
    // Rollback transaction on error
    await db.query("ROLLBACK");
    console.error("Import students error:", error);
    res.status(500).json({
      message: "Server error while importing students",
      error: error.message,
    });
  }
};

// Admin reset student password to default
exports.adminResetStudentPassword = async (req, res) => {
  try {
    const { enrollment_no } = req.params;

    // Get student details
    const studentResult = await db.query(
      `SELECT s.enrollment_no, s.user_id, s.student_name, u.username 
       FROM student s
       JOIN "user" u ON s.user_id = u.user_id
       WHERE s.enrollment_no = $1 AND u.role = 'student'`,
      [enrollment_no]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({
        message: "Student not found or does not have a user account",
      });
    }

    const student = studentResult.rows[0];
    const defaultPassword = `Student@${enrollment_no}`;

    // Hash the default password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(defaultPassword, saltRounds);

    // Update user password
    await db.query(
      `UPDATE "user" 
       SET password_hash = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE user_id = $2`,
      [passwordHash, student.user_id]
    );

    // Reset password change flag for student
    await db.query(
      `UPDATE student 
       SET must_reset_password = TRUE, last_password_change = NULL 
       WHERE user_id = $1`,
      [student.user_id]
    );

    res.status(200).json({
      message: "Student password reset successfully",
      student_name: student.student_name,
      enrollment_no: enrollment_no,
      username: student.username,
      new_password: defaultPassword,
    });
  } catch (error) {
    console.error("Admin reset student password error:", error);
    res.status(500).json({
      message: "Server error while resetting student password",
    });
  }
};

// Admin create user accounts for students
exports.adminCreateStudentUsers = async (req, res) => {
  try {
    const { enrollment_numbers } = req.body;

    // Validate input
    if (
      !enrollment_numbers ||
      !Array.isArray(enrollment_numbers) ||
      enrollment_numbers.length === 0
    ) {
      return res.status(400).json({
        message: "Please provide an array of enrollment numbers",
      });
    }

    const results = {
      created: [],
      skipped: [],
      errors: [],
    };

    for (const enrollment_no of enrollment_numbers) {
      try {
        // Check if student exists and doesn't have user account
        const studentResult = await db.query(
          `SELECT s.enrollment_no, s.student_name, s.email_id 
           FROM student s
           LEFT JOIN "user" u ON s.user_id = u.user_id
           WHERE s.enrollment_no = $1`,
          [enrollment_no]
        );

        if (studentResult.rows.length === 0) {
          results.errors.push({
            enrollment_no,
            message: "Student not found",
          });
          continue;
        }

        const student = studentResult.rows[0];

        // Check if user account already exists
        const existingUser = await db.query(
          `SELECT user_id FROM "user" WHERE username = $1`,
          [`${enrollment_no}@blr.amity.edu`]
        );

        if (existingUser.rows.length > 0) {
          results.skipped.push({
            enrollment_no,
            student_name: student.student_name,
            message: "User account already exists",
          });
          continue;
        }

        // Create user account
        const username = `${enrollment_no}@blr.amity.edu`;
        const email = student.email_id || username;
        const defaultPassword = `Student@${enrollment_no}`;
        const passwordHash = await bcrypt.hash(defaultPassword, 10);

        const userResult = await db.query(
          `INSERT INTO "user" 
           (username, email, password_hash, full_name, role) 
           VALUES ($1, $2, $3, $4, $5) 
           RETURNING user_id`,
          [username, email, passwordHash, student.student_name, "student"]
        );

        const userId = userResult.rows[0].user_id;

        // Update student table with user_id
        await db.query(
          `UPDATE student 
           SET user_id = $1, must_reset_password = TRUE 
           WHERE enrollment_no = $2`,
          [userId, enrollment_no]
        );

        results.created.push({
          enrollment_no,
          student_name: student.student_name,
          username,
          default_password: defaultPassword,
        });
      } catch (error) {
        console.error(`Error creating user for ${enrollment_no}:`, error);
        results.errors.push({
          enrollment_no,
          message: error.message,
        });
      }
    }

    res.status(200).json({
      message: `User creation completed. Created: ${results.created.length}, Skipped: ${results.skipped.length}, Errors: ${results.errors.length}`,
      results,
    });
  } catch (error) {
    console.error("Admin create student users error:", error);
    res.status(500).json({
      message: "Server error while creating student user accounts",
    });
  }
};
