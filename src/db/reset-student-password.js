const bcrypt = require("bcrypt");
const db = require("../config/db");

async function resetStudentPassword() {
  try {
    const enrollmentNo = "A866185824001";
    const defaultPassword = `Student@${enrollmentNo}`;

    console.log("Resetting password for:", enrollmentNo);
    console.log("New password will be:", defaultPassword);

    // Hash the default password
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // Update the user password and student reset flag
    await db.query("BEGIN");

    // Update user password
    await db.query(
      `
      UPDATE "user" 
      SET password_hash = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE username = $2
    `,
      [hashedPassword, `${enrollmentNo}@blr.amity.edu`]
    );

    // Reset student password flags
    await db.query(
      `
      UPDATE student 
      SET must_reset_password = TRUE, last_password_change = NULL 
      WHERE enrollment_no = $1
    `,
      [enrollmentNo]
    );

    await db.query("COMMIT");

    console.log("✅ Password reset successfully!");
    console.log("Login credentials:");
    console.log("Username:", `${enrollmentNo}@blr.amity.edu`);
    console.log("Password:", defaultPassword);
    console.log("Must reset password: TRUE");

    process.exit(0);
  } catch (error) {
    await db.query("ROLLBACK");
    console.error("❌ Error resetting password:", error);
    process.exit(1);
  }
}

resetStudentPassword();
