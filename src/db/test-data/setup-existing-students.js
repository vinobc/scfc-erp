const bcrypt = require("bcrypt");
const db = require("../../config/db");

async function setupExistingStudents() {
  try {
    console.log("Setting up user accounts for existing students...");

    // Get all existing students who don't have user accounts yet
    const studentsResult = await db.query(`
      SELECT s.enrollment_no, s.student_name, s.email_id, s.user_id
      FROM student s
      LEFT JOIN "user" u ON s.user_id = u.user_id
      WHERE u.user_id IS NULL OR u.role != 'student'
      ORDER BY s.enrollment_no
      LIMIT 5
    `);

    if (studentsResult.rows.length === 0) {
      console.log(
        "No students found without user accounts. Checking existing students..."
      );

      // Show first few students for reference
      const allStudentsResult = await db.query(`
        SELECT s.enrollment_no, s.student_name, s.user_id, u.username, u.role
        FROM student s
        LEFT JOIN "user" u ON s.user_id = u.user_id
        ORDER BY s.enrollment_no
        LIMIT 5
      `);

      console.log("First 5 students in database:");
      allStudentsResult.rows.forEach((student, index) => {
        console.log(
          `${index + 1}. ${student.enrollment_no} - ${
            student.student_name
          } - User: ${student.username || "None"} - Role: ${
            student.role || "None"
          }`
        );
      });

      return;
    }

    console.log(
      `Found ${studentsResult.rows.length} students without proper user accounts.`
    );

    // Begin transaction
    await db.query("BEGIN");

    for (const student of studentsResult.rows) {
      const username = `${student.enrollment_no}@blr.amity.edu`;
      const defaultPassword = `Student@${student.enrollment_no}`;
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);

      console.log(
        `Creating user account for: ${student.enrollment_no} - ${student.student_name}`
      );
      console.log(`  Username: ${username}`);
      console.log(`  Password: ${defaultPassword}`);

      // Create user record
      const userResult = await db.query(
        `INSERT INTO "user" (username, email, password_hash, full_name, role, is_active) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING user_id`,
        [
          username,
          student.email_id || `${student.enrollment_no}@student.amity.edu`,
          hashedPassword,
          student.student_name,
          "student",
          true,
        ]
      );

      const user_id = userResult.rows[0].user_id;

      // Update student record with user_id
      await db.query(
        `UPDATE student 
         SET user_id = $1, must_reset_password = TRUE 
         WHERE enrollment_no = $2`,
        [user_id, student.enrollment_no]
      );

      console.log(`✅ Created user account for ${student.enrollment_no}`);
    }

    await db.query("COMMIT");
    console.log("\n🎉 Student user accounts created successfully!");
    console.log("\n📋 Test Login Credentials:");

    // Show created credentials
    studentsResult.rows.forEach((student, index) => {
      console.log(
        `${index + 1}. Username: ${student.enrollment_no}@blr.amity.edu`
      );
      console.log(`   Password: Student@${student.enrollment_no}`);
      console.log(`   Name: ${student.student_name}`);
      console.log("");
    });
  } catch (error) {
    await db.query("ROLLBACK");
    console.error("Error setting up student accounts:", error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  setupExistingStudents()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = setupExistingStudents;
