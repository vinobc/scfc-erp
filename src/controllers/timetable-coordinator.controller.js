const db = require("../config/db");

// Get all timetable coordinators
exports.getAllCoordinators = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        tc.id,
        tc.user_id,
        tc.school_id,
        u.username,
        u.email,
        u.full_name,
        u.employee_id,
        f.name as faculty_name,
        s.school_code,
        s.school_short_name,
        tc.created_at
      FROM timetable_coordinators tc
      JOIN "user" u ON tc.user_id = u.user_id
      LEFT JOIN faculty f ON u.employee_id = f.employee_id
      JOIN school s ON tc.school_id = s.school_id
      ORDER BY u.full_name, s.school_short_name
    `);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Get coordinators error:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching coordinators" });
  }
};

// Create timetable coordinator assignment
exports.createCoordinatorAssignment = async (req, res) => {
  try {
    const { employee_id, school_ids } = req.body;

    // Validate required fields
    if (
      !employee_id ||
      !school_ids ||
      !Array.isArray(school_ids) ||
      school_ids.length === 0
    ) {
      return res.status(400).json({
        message: "Employee ID and at least one school assignment are required",
      });
    }

    // Check if faculty member exists
    const facultyResult = await db.query(
      "SELECT faculty_id, name FROM faculty WHERE employee_id = $1 AND is_active = true",
      [employee_id]
    );

    if (facultyResult.rows.length === 0) {
      return res.status(404).json({
        message: "Active faculty member not found with this employee ID",
      });
    }

    const faculty = facultyResult.rows[0];

    // Check if user already exists for this faculty
    let userResult = await db.query(
      'SELECT user_id FROM "user" WHERE employee_id = $1',
      [employee_id]
    );

    let userId;

    if (userResult.rows.length === 0) {
      // Create user account for faculty
      const username = `${employee_id}@blr.amity.edu`;
      const email = username;

      // Default password (should be changed on first login)
      const bcrypt = require("bcrypt");
      const defaultPassword = `Faculty@${employee_id}`;
      const passwordHash = await bcrypt.hash(defaultPassword, 10);

      const createUserResult = await db.query(
        `INSERT INTO "user" 
         (username, email, password_hash, full_name, role, employee_id) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING user_id`,
        [
          username,
          email,
          passwordHash,
          faculty.name,
          "timetable_coordinator",
          employee_id,
        ]
      );

      userId = createUserResult.rows[0].user_id;
    } else {
      userId = userResult.rows[0].user_id;

      // Update role to timetable_coordinator
      await db.query(
        'UPDATE "user" SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
        ["timetable_coordinator", userId]
      );
    }

    // Remove existing coordinator assignments for this user
    await db.query("DELETE FROM timetable_coordinators WHERE user_id = $1", [
      userId,
    ]);

    // Create new coordinator assignments
    const assignmentPromises = school_ids.map((school_id) =>
      db.query(
        "INSERT INTO timetable_coordinators (user_id, school_id) VALUES ($1, $2)",
        [userId, school_id]
      )
    );

    await Promise.all(assignmentPromises);

    res.status(201).json({
      message: "Timetable coordinator assigned successfully",
      coordinator: {
        user_id: userId,
        employee_id: employee_id,
        faculty_name: faculty.name,
        school_count: school_ids.length,
      },
    });
  } catch (error) {
    console.error("Create coordinator assignment error:", error);
    res
      .status(500)
      .json({ message: "Server error while creating coordinator assignment" });
  }
};

// Remove coordinator assignment
exports.removeCoordinatorAssignment = async (req, res) => {
  try {
    const { id } = req.params;

    // Get coordinator info before deletion
    const coordinatorResult = await db.query(
      `
      SELECT 
        tc.user_id,
        u.full_name,
        s.school_short_name
      FROM timetable_coordinators tc
      JOIN "user" u ON tc.user_id = u.user_id
      JOIN school s ON tc.school_id = s.school_id
      WHERE tc.id = $1
    `,
      [id]
    );

    if (coordinatorResult.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Coordinator assignment not found" });
    }

    const coordinator = coordinatorResult.rows[0];

    // Delete the specific assignment
    await db.query("DELETE FROM timetable_coordinators WHERE id = $1", [id]);

    // Check if user has any remaining coordinator assignments
    const remainingAssignments = await db.query(
      "SELECT COUNT(*) FROM timetable_coordinators WHERE user_id = $1",
      [coordinator.user_id]
    );

    // If no more coordinator assignments, update role back to faculty
    if (parseInt(remainingAssignments.rows[0].count) === 0) {
      await db.query(
        'UPDATE "user" SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
        ["faculty", coordinator.user_id]
      );
    }

    res.status(200).json({
      message: "Coordinator assignment removed successfully",
    });
  } catch (error) {
    console.error("Remove coordinator assignment error:", error);
    res
      .status(500)
      .json({ message: "Server error while removing coordinator assignment" });
  }
};
