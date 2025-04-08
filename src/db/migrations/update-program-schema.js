const db = require("../../config/db");

const migrateProgram = async () => {
  try {
    console.log("Starting program table migration...");

    // Begin transaction
    await db.query("BEGIN");

    // 1. Alter the program_name_short to VARCHAR(100)
    console.log("Increasing program_name_short length to 100...");
    await db.query(
      "ALTER TABLE program ALTER COLUMN program_name_short TYPE VARCHAR(100)"
    );

    // 2. Drop the existing constraint on duration_years
    console.log("Dropping existing constraint on duration_years...");
    await db.query(
      "ALTER TABLE program DROP CONSTRAINT IF EXISTS program_duration_years_check"
    );

    // 3. Add new constraint with 1 year option
    console.log("Adding new constraint with 1-year option...");
    await db.query(
      "ALTER TABLE program ADD CONSTRAINT program_duration_years_check CHECK (duration_years IN (1, 2, 3, 4, 5))"
    );

    // Commit transaction
    await db.query("COMMIT");

    console.log("Program table migration completed successfully!");
  } catch (err) {
    // Rollback on error
    await db.query("ROLLBACK");
    console.error("Error migrating program table:", err);
  } finally {
    // End the connection
    process.exit();
  }
};

// Run the migration
migrateProgram();
