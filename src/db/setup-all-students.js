const bcrypt = require("bcrypt");
const db = require("../config/db");

async function setupAllStudents() {
  try {
    console.log("Setting up user accounts for ALL students...");

    // Get all existing students who don't have proper user accounts
    const studentsResult = await db.query(`
      SELECT s.enrollment_no, s.student_name, s.email_id, s.user_id,
             u.username, u.role, u.is_active
      FROM student s
      LEFT JOIN "user" u ON s.user_id = u.user_id
      WHERE u.user_id IS NULL 
         OR u.role != 'student' 
         OR u.is_active = false
         OR u.username IS NULL
      ORDER BY s.enrollment_no
    `);

    console.log(
      `Found ${studentsResult.rows.length} students needing user accounts`
    );

    if (studentsResult.rows.length === 0) {
      console.log("All students already have proper user accounts!");

      // Show summary of existing student accounts
      const summaryResult = await db.query(`
        SELECT COUNT(*) as total_students,
               COUNT(CASE WHEN u.role = 'student' THEN 1 END) as students_with_accounts,
               COUNT(CASE WHEN s.must_reset_password = true THEN 1 END) as need_password_reset
        FROM student s
        LEFT JOIN "user" u ON s.user_id = u.user_id
      `);

      const summary = summaryResult.rows[0];
      console.log(`\n📊 SUMMARY:`);
      console.log(`Total students in database: ${summary.total_students}`);
      console.log(
        `Students with user accounts: ${summary.students_with_accounts}`
      );
      console.log(
        `Students needing password reset: ${summary.need_password_reset}`
      );

      return;
    }

    // Batch processing for better performance
    const BATCH_SIZE = 100;
    let processed = 0;
    let successful = 0;
    let errors = [];

    console.log(`\nProcessing in batches of ${BATCH_SIZE}...`);

    for (let i = 0; i < studentsResult.rows.length; i += BATCH_SIZE) {
      const batch = studentsResult.rows.slice(i, i + BATCH_SIZE);
      console.log(
        `\nProcessing batch ${Math.floor(i / BATCH_SIZE) + 1} (${
          batch.length
        } students)...`
      );

      // Begin transaction for this batch
      await db.query("BEGIN");

      try {
        for (const student of batch) {
          try {
            const username = `${student.enrollment_no}@blr.amity.edu`;
            const defaultPassword = `Student@${student.enrollment_no}`;
            const hashedPassword = await bcrypt.hash(defaultPassword, 10);

            if (student.user_id && student.username) {
              // Update existing user account
              await db.query(
                `
                UPDATE "user" 
                SET password_hash = $1, role = 'student', is_active = true, updated_at = CURRENT_TIMESTAMP 
                WHERE user_id = $2
              `,
                [hashedPassword, student.user_id]
              );

              console.log(
                `  ✅ Updated: ${student.enrollment_no} - ${student.student_name}`
              );
            } else {
              // Create new user account
              const userResult = await db.query(
                `
                INSERT INTO "user" (username, email, password_hash, full_name, role, is_active) 
                VALUES ($1, $2, $3, $4, $5, $6) 
                RETURNING user_id
              `,
                [
                  username,
                  student.email_id ||
                    `${student.enrollment_no}@student.amity.edu`,
                  hashedPassword,
                  student.student_name,
                  "student",
                  true,
                ]
              );

              const user_id = userResult.rows[0].user_id;

              // Update student record with user_id
              await db.query(
                `
                UPDATE student 
                SET user_id = $1, must_reset_password = TRUE, last_password_change = NULL 
                WHERE enrollment_no = $2
              `,
                [user_id, student.enrollment_no]
              );

              console.log(
                `  ✅ Created: ${student.enrollment_no} - ${student.student_name}`
              );
            }

            successful++;
          } catch (error) {
            errors.push({
              enrollment_no: student.enrollment_no,
              name: student.student_name,
              error: error.message,
            });
            console.log(
              `  ❌ Error: ${student.enrollment_no} - ${error.message}`
            );
          }
          processed++;
        }

        await db.query("COMMIT");
        console.log(`  ✅ Batch committed successfully`);
      } catch (error) {
        await db.query("ROLLBACK");
        console.log(`  ❌ Batch failed: ${error.message}`);
      }

      // Progress update
      const progress = Math.round(
        (processed / studentsResult.rows.length) * 100
      );
      console.log(
        `Progress: ${processed}/${studentsResult.rows.length} (${progress}%)`
      );
    }

    // Final summary
    console.log(`\n🎉 Processing completed!`);
    console.log(`✅ Successfully processed: ${successful} students`);
    console.log(`❌ Errors: ${errors.length} students`);

    if (errors.length > 0) {
      console.log(`\n❌ Students with errors:`);
      errors.forEach((error) => {
        console.log(
          `  - ${error.enrollment_no} (${error.name}): ${error.error}`
        );
      });
    }

    // Show login credentials for first 10 successful accounts
    const credentialsResult = await db.query(`
      SELECT s.enrollment_no, s.student_name, u.username, s.must_reset_password
      FROM student s
      JOIN "user" u ON s.user_id = u.user_id
      WHERE u.role = 'student' AND u.is_active = true
      ORDER BY s.enrollment_no
      LIMIT 10
    `);

    console.log(`\n📋 Sample Login Credentials (First 10):`);
    credentialsResult.rows.forEach((student, index) => {
      console.log(
        `${index + 1}. ${student.student_name} (${student.enrollment_no})`
      );
      console.log(`   Username: ${student.username}`);
      console.log(`   Password: Student@${student.enrollment_no}`);
      console.log(`   Must Reset: ${student.must_reset_password}`);
      console.log("");
    });

    console.log(`🔗 All students can now login with format:`);
    console.log(`   Username: EnrollmentNumber@blr.amity.edu`);
    console.log(`   Password: Student@EnrollmentNumber`);
  } catch (error) {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  setupAllStudents()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = setupAllStudents;
