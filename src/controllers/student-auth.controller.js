const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../config/db");

// JWT secret key - should be in environment variables
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-should-be-in-env";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";

// Student login controller
exports.studentLogin = async (req, res) => {
  try {
    console.log("Student login attempt:", req.body);
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        message: "Username and password are required",
      });
    }

    // Check if username follows student format: enrollment_number@blr.amity.edu
    const emailRegex = /^(.+)@blr\.amity\.edu$/;
    const match = username.match(emailRegex);

    if (!match) {
      return res.status(401).json({
        message: "Invalid student username format",
      });
    }

    const enrollmentNumber = match[1];

    // Find student by enrollment number
    const studentResult = await db.query(
      `SELECT s.*, u.user_id, u.username, u.password_hash, u.is_active,
              p.program_name_short, sc.school_short_name
       FROM student s
       JOIN "user" u ON s.user_id = u.user_id
       JOIN program p ON s.program_id = p.program_id
       JOIN school sc ON s.school_id = sc.school_id
       WHERE s.enrollment_no = $1 AND u.role = 'student' AND u.is_active = true`,
      [enrollmentNumber]
    );

    const student = studentResult.rows[0];

    // Check if student exists
    if (!student) {
      return res.status(401).json({
        message: "Invalid username or password",
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(
      password,
      student.password_hash
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid username or password",
      });
    }

    // Update last login
    await db.query(
      'UPDATE "user" SET last_login = CURRENT_TIMESTAMP WHERE user_id = $1',
      [student.user_id]
    );

    // Generate JWT token
    const token = jwt.sign(
      {
        id: student.user_id,
        username: student.username,
        role: "student",
        enrollment_no: student.enrollment_no,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Prepare student data for response
    const studentData = {
      user_id: student.user_id,
      username: student.username,
      role: "student",
      enrollment_no: student.enrollment_no,
      student_name: student.student_name,
      program_name: student.program_name_short,
      school_name: student.school_short_name,
      year_admitted: student.year_admitted,
      must_reset_password: student.must_reset_password,
    };

    res.status(200).json({
      message: "Student login successful",
      user: studentData,
      token,
      mustResetPassword: student.must_reset_password,
    });
  } catch (error) {
    console.error("Student login error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
};

// Student password reset (first time mandatory)
exports.studentResetPassword = async (req, res) => {
  try {
    const userId = req.userId;
    const { newPassword } = req.body;

    // Validate input
    if (!newPassword) {
      return res.status(400).json({
        message: "New password is required",
      });
    }

    // Get student data to check against default password
    const studentResult = await db.query(
      `SELECT s.enrollment_no FROM student s 
         JOIN "user" u ON s.user_id = u.user_id 
         WHERE u.user_id = $1`,
      [userId]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ message: "Student not found" });
    }

    const enrollmentNo = studentResult.rows[0].enrollment_no;
    const defaultPassword = `Student@${enrollmentNo}`;

    // Check if new password is same as default password
    if (newPassword === defaultPassword) {
      return res.status(400).json({
        message: "New password cannot be the same as your default password",
      });
    }

    // Validate password complexity
    const complexityCheck = validatePasswordComplexity(newPassword);
    if (!complexityCheck.isValid) {
      return res.status(400).json({
        message: complexityCheck.message,
      });
    }

    // Get current user
    const result = await db.query(
      'SELECT password_hash FROM "user" WHERE user_id = $1',
      [userId]
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Hash new password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password and reset flag
    await db.query(
      `UPDATE "user" 
         SET password_hash = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE user_id = $2`,
      [newPasswordHash, userId]
    );

    await db.query(
      `UPDATE student 
         SET must_reset_password = FALSE, last_password_change = CURRENT_TIMESTAMP 
         WHERE user_id = $1`,
      [userId]
    );

    res.status(200).json({
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Student password reset error:", error);
    res.status(500).json({
      message: "Server error while changing password",
    });
  }
};

// Password complexity validation function
const validatePasswordComplexity = (password) => {
  if (password.length < 8) {
    return {
      isValid: false,
      message: "Password must be at least 8 characters long",
    };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      isValid: false,
      message: "Password must contain at least one uppercase letter",
    };
  }

  if (!/[a-z]/.test(password)) {
    return {
      isValid: false,
      message: "Password must contain at least one lowercase letter",
    };
  }

  if (!/\d/.test(password)) {
    return {
      isValid: false,
      message: "Password must contain at least one digit",
    };
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return {
      isValid: false,
      message: "Password must contain at least one special character",
    };
  }

  return { isValid: true };
};

// Student voluntary password change (with current password verification)
exports.studentChangePassword = async (req, res) => {
  try {
    const userId = req.userId;
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Current password and new password are required",
      });
    }

    // Get student data to check against default password
    const studentResult = await db.query(
      `SELECT s.enrollment_no, u.password_hash FROM student s 
         JOIN "user" u ON s.user_id = u.user_id 
         WHERE u.user_id = $1`,
      [userId]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ message: "Student not found" });
    }

    const { enrollment_no, password_hash } = studentResult.rows[0];
    const defaultPassword = `Student@${enrollment_no}`;

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      password_hash
    );
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    // Check if new password is same as default password
    if (newPassword === defaultPassword) {
      return res.status(400).json({
        message: "New password cannot be the same as your default password",
      });
    }

    // Check if new password is same as current password
    const isSameAsCurrent = await bcrypt.compare(newPassword, password_hash);
    if (isSameAsCurrent) {
      return res.status(400).json({
        message: "New password cannot be the same as your current password",
      });
    }

    // Validate password complexity
    const complexityCheck = validatePasswordComplexity(newPassword);
    if (!complexityCheck.isValid) {
      return res.status(400).json({
        message: complexityCheck.message,
      });
    }

    // Hash new password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await db.query(
      `UPDATE "user" 
         SET password_hash = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE user_id = $2`,
      [newPasswordHash, userId]
    );

    await db.query(
      `UPDATE student 
         SET last_password_change = CURRENT_TIMESTAMP 
         WHERE user_id = $1`,
      [userId]
    );

    res.status(200).json({
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Student voluntary password change error:", error);
    res.status(500).json({
      message: "Server error while changing password",
    });
  }
};
