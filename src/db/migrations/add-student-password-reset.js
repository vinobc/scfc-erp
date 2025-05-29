const db = require("../../config/db");

async function migrateStudentPasswordReset() {
  try {
    console.log("Adding password reset columns to student table...");

    // Add columns if they don't exist
    await db.query(`
      ALTER TABLE student 
      ADD COLUMN IF NOT EXISTS must_reset_password BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS last_password_change TIMESTAMP NULL
    `);

    // Create index
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_student_must_reset_password 
      ON student(must_reset_password)
    `);

    // Update existing students to require password reset
    await db.query(`
      UPDATE student 
      SET must_reset_password = TRUE 
      WHERE must_reset_password IS NULL
    `);

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  migrateStudentPasswordReset()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = migrateStudentPasswordReset;
