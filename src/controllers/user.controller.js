const db = require("../config/db");
const bcrypt = require("bcrypt");

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        u.user_id,
        u.username,
        u.email,
        u.full_name,
        u.role,
        u.employee_id,
        u.is_active,
        u.last_login,
        u.created_at,
        f.name as faculty_name,
        s.school_short_name
      FROM "user" u
      LEFT JOIN faculty f ON u.employee_id = f.employee_id
      LEFT JOIN school s ON f.school_id = s.school_id
      ORDER BY u.full_name
    `);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({ message: "Server error while fetching users" });
  }
};

// Get user by id
exports.getUserById = async (req, res) => {
  try {
    const userId = req.params.id;

    const result = await db.query(
      `
      SELECT 
        u.user_id,
        u.username,
        u.email,
        u.full_name,
        u.role,
        u.employee_id,
        u.is_active,
        u.last_login,
        u.created_at,
        f.name as faculty_name
      FROM "user" u
      LEFT JOIN faculty f ON u.employee_id = f.employee_id
      WHERE u.user_id = $1
    `,
      [userId]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Remove password hash from response
    delete user.password_hash;

    res.status(200).json(user);
  } catch (error) {
    console.error("Get user by id error:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching user details" });
  }
};

// Create new user account for faculty
exports.createFacultyUser = async (req, res) => {
  try {
    const { employee_id, role } = req.body;

    // Validate required fields
    if (!employee_id || !role) {
      return res.status(400).json({
        message: "Employee ID and role are required",
      });
    }

    // Validate role
    const validRoles = ["faculty", "timetable_coordinator"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        message: "Role must be 'faculty' or 'timetable_coordinator'",
      });
    }

    // Check if faculty member exists
    const facultyResult = await db.query(
      "SELECT faculty_id, name, email FROM faculty WHERE employee_id = $1 AND is_active = true",
      [employee_id]
    );

    if (facultyResult.rows.length === 0) {
      return res.status(404).json({
        message: "Active faculty member not found with this employee ID",
      });
    }

    const faculty = facultyResult.rows[0];

    // Check if user already exists
    const existingUser = await db.query(
      'SELECT user_id FROM "user" WHERE employee_id = $1',
      [employee_id]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        message: "User account already exists for this faculty member",
      });
    }

    // Generate username and email
    const username = `${employee_id}@blr.amity.edu`;
    const email = faculty.email || username;

    // Generate default password
    const defaultPassword = `Faculty@${employee_id}`;
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    // Create user account
    const result = await db.query(
      `INSERT INTO "user" 
       (username, email, password_hash, full_name, role, employee_id) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING user_id, username, email, full_name, role, employee_id, is_active, created_at`,
      [username, email, passwordHash, faculty.name, role, employee_id]
    );

    res.status(201).json({
      message: "User account created successfully",
      user: result.rows[0],
      defaultPassword: defaultPassword, // In production, this should be sent via secure channel
    });
  } catch (error) {
    console.error("Create faculty user error:", error);
    res
      .status(500)
      .json({ message: "Server error while creating user account" });
  }
};

// Update user
exports.updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const { full_name, email, role, is_active } = req.body;

    // Validate required fields
    if (!full_name || !email || !role) {
      return res.status(400).json({
        message: "Full name, email, and role are required",
      });
    }

    // Check if user exists
    const userExists = await db.query(
      'SELECT COUNT(*) FROM "user" WHERE user_id = $1',
      [userId]
    );

    if (parseInt(userExists.rows[0].count) === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update user
    const result = await db.query(
      `UPDATE "user" 
       SET full_name = $1, 
           email = $2, 
           role = $3, 
           is_active = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $5
       RETURNING user_id, username, email, full_name, role, employee_id, is_active, updated_at`,
      [full_name, email, role, is_active === false ? false : true, userId]
    );

    res.status(200).json({
      message: "User updated successfully",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ message: "Server error while updating user" });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    // Check if user exists
    const userExists = await db.query(
      'SELECT COUNT(*) FROM "user" WHERE user_id = $1',
      [userId]
    );

    if (parseInt(userExists.rows[0].count) === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // Delete user (cascade will handle timetable_coordinators)
    await db.query('DELETE FROM "user" WHERE user_id = $1', [userId]);

    res.status(200).json({
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({
      message: "Server error while deleting user",
      error: error.message,
    });
  }
};

// Create new admin user
exports.createAdminUser = async (req, res) => {
  try {
    const { admin_name, full_name } = req.body;

    // Validate required fields
    if (!admin_name || !full_name) {
      return res.status(400).json({
        message: "Admin name and full name are required",
      });
    }

    // Validate admin_name format (no spaces, special chars except underscore)
    if (!/^[a-zA-Z0-9_]+$/.test(admin_name)) {
      return res.status(400).json({
        message:
          "Admin name can only contain letters, numbers, and underscores",
      });
    }

    // Generate username and email
    const username = `admin_${admin_name}@blr.amity.edu`;
    const email = username;

    // Check if username already exists
    const existingUser = await db.query(
      'SELECT user_id FROM "user" WHERE username = $1',
      [username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        message: "Admin user with this name already exists",
      });
    }

    // Generate default password
    const defaultPassword = `Admin@${admin_name}`;
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    // Create admin user account
    const result = await db.query(
      `INSERT INTO "user" 
         (username, email, password_hash, full_name, role) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING user_id, username, email, full_name, role, is_active, created_at`,
      [username, email, passwordHash, full_name, "admin"]
    );

    res.status(201).json({
      message: "Admin user account created successfully",
      user: result.rows[0],
      defaultPassword: defaultPassword, // In production, this should be sent via secure channel
    });
  } catch (error) {
    console.error("Create admin user error:", error);
    res
      .status(500)
      .json({ message: "Server error while creating admin account" });
  }
};
