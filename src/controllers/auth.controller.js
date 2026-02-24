const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../config/db");

// JWT secret key - should be in environment variables
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-should-be-in-env";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";

// Login controller
exports.login = async (req, res) => {
  try {
    console.log("Login attempt:", { username: req.body.username });
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username and password are required" });
    }

    // Find user by username
    const result = await db.query(
      'SELECT user_id, username, email, password_hash, full_name, role FROM "user" WHERE username = $1 AND is_active = true',
      [username]
    );

    const user = result.rows[0];

    // Check if user exists
    if (!user) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    // Update last login
    await db.query(
      'UPDATE "user" SET last_login = CURRENT_TIMESTAMP WHERE user_id = $1',
      [user.user_id]
    );

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.user_id,
        username: user.username,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Send response without password
    delete user.password_hash;

    res.status(200).json({
      message: "Login successful",
      user,
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
};

// Logout controller (token invalidation would be handled client-side)
exports.logout = async (req, res) => {
  // In a stateless JWT authentication, the server doesn't maintain session
  // The client is responsible for removing the token
  res.status(200).json({ message: "Logout successful" });
};

// Get current user
exports.getCurrentUser = async (req, res) => {
  try {
    const userId = req.userId;

    const result = await db.query(
      'SELECT user_id, username, email, full_name, role FROM "user" WHERE user_id = $1',
      [userId]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Get current user error:", error);
    res
      .status(500)
      .json({ message: "Server error while getting user information" });
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

// Impersonate user (admin only)
exports.impersonate = async (req, res) => {
  try {
    const { user_id } = req.body;
    const adminUserId = req.userId;

    if (!user_id) {
      return res.status(400).json({ message: "user_id is required" });
    }

    // Query target user with full details (join with student, program, school tables)
    const result = await db.query(
      `SELECT u.user_id, u.username, u.email, u.full_name, u.role, u.is_active,
              s.enrollment_no, s.student_name, s.program_id, s.school_id,
              s.program_name, s.school_name, s.year_admitted,
              p.program_name_short,
              sc.school_short_name
       FROM "user" u
       LEFT JOIN student s ON u.user_id = s.user_id
       LEFT JOIN program p ON s.program_id = p.program_id
       LEFT JOIN school sc ON s.school_id = sc.school_id
       WHERE u.user_id = $1`,
      [user_id]
    );

    const targetUser = result.rows[0];

    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!targetUser.is_active) {
      return res.status(400).json({ message: "Cannot impersonate inactive user" });
    }

    // Prevent impersonating other admins
    if (targetUser.role === "admin") {
      return res.status(403).json({ message: "Cannot impersonate admin users" });
    }

    console.log(
      `Admin (user_id: ${adminUserId}) impersonating user: ${targetUser.username} (role: ${targetUser.role})`
    );

    // Generate JWT token for target user with impersonated_by flag
    const token = jwt.sign(
      {
        id: targetUser.user_id,
        username: targetUser.username,
        role: targetUser.role,
        enrollment_no: targetUser.enrollment_no || null,
        impersonated_by: adminUserId,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Build user response object
    const userResponse = {
      user_id: targetUser.user_id,
      username: targetUser.username,
      email: targetUser.email,
      full_name: targetUser.full_name,
      role: targetUser.role,
    };

    // Add student-specific fields if impersonating a student
    if (targetUser.role === "student" && targetUser.enrollment_no) {
      userResponse.enrollment_no = targetUser.enrollment_no;
      userResponse.student_name = targetUser.student_name;
      userResponse.program_id = targetUser.program_id;
      userResponse.school_id = targetUser.school_id;
      userResponse.program_name = targetUser.program_name;
      userResponse.school_name = targetUser.school_name;
      userResponse.program_name_short = targetUser.program_name_short;
      userResponse.school_short_name = targetUser.school_short_name;
      userResponse.year_admitted = targetUser.year_admitted;
      userResponse.must_reset_password = false; // Admin bypass - no password reset required
    }

    // Return token and user info
    res.status(200).json({
      message: "Impersonation successful",
      token,
      user: userResponse,
    });
  } catch (error) {
    console.error("Impersonate error:", error);
    res.status(500).json({ message: "Server error during impersonation" });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const userId = req.userId;
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Current password and new password are required",
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

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password_hash
    );
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    // Hash new password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await db.query(
      'UPDATE "user" SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
      [newPasswordHash, userId]
    );

    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ message: "Server error while changing password" });
  }
};
