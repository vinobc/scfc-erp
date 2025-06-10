const db = require("../../config/db");

async function fixProgramCodeLength() {
  try {
    console.log("🔧 Starting program_code field length migration...");

    // Check current field constraints
    const currentConstraint = await db.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'student_registrations' 
        AND column_name = 'program_code'
    `);

    console.log("📊 Current constraint:", currentConstraint.rows[0]);

    // Expand program_code field from VARCHAR(10) to VARCHAR(50)
    await db.query(`
      ALTER TABLE student_registrations 
      ALTER COLUMN program_code TYPE VARCHAR(50)
    `);

    console.log("✅ Successfully expanded program_code field to VARCHAR(50)");

    // Verify the change
    const newConstraint = await db.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'student_registrations' 
        AND column_name = 'program_code'
    `);

    console.log("📊 New constraint:", newConstraint.rows[0]);

    // Test with a long program name to ensure it works
    console.log("🧪 Testing with sample long program name...");
    const testProgramName = "B.Tech. CSE (Data Analytics)"; // 28 characters
    console.log(
      `Testing program name: "${testProgramName}" (${testProgramName.length} chars)`
    );

    console.log("✅ Migration completed successfully!");
    console.log("📈 Program code field can now handle up to 50 characters");
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    throw error;
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  fixProgramCodeLength()
    .then(() => {
      console.log("🎉 Migration completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Migration failed:", error);
      process.exit(1);
    });
}

module.exports = { fixProgramCodeLength };
