const db = require("../config/db");

// Migrate slot name length to accommodate compound 4-hour lab slots
async function migrateSlotNameLength() {
  try {
    console.log("Starting schema migration for slot name length...");

    // Check current column length
    const currentSchema = await db.query(`
      SELECT column_name, character_maximum_length 
      FROM information_schema.columns 
      WHERE table_name = 'allowed_slot_names' 
      AND column_name = 'name'
    `);

    console.log("Current schema:", currentSchema.rows[0]);

    // Update allowed_slot_names.name column length
    await db.query(`
      ALTER TABLE allowed_slot_names 
      ALTER COLUMN name TYPE VARCHAR(25)
    `);
    console.log("✓ Updated allowed_slot_names.name to VARCHAR(25)");

    // Update slot.slot_name column length
    await db.query(`
      ALTER TABLE slot 
      ALTER COLUMN slot_name TYPE VARCHAR(25)
    `);
    console.log("✓ Updated slot.slot_name to VARCHAR(25)");

    // Update semester_slot_config.slot_name column length
    await db.query(`
      ALTER TABLE semester_slot_config 
      ALTER COLUMN slot_name TYPE VARCHAR(25)
    `);
    console.log("✓ Updated semester_slot_config.slot_name to VARCHAR(25)");

    // Update slot_conflict columns
    await db.query(`
      ALTER TABLE slot_conflict 
      ALTER COLUMN slot_name TYPE VARCHAR(25),
      ALTER COLUMN conflicting_slot_name TYPE VARCHAR(25)
    `);
    console.log("✓ Updated slot_conflict slot names to VARCHAR(25)");

    // Update faculty_allocation.slot_name column length
    await db.query(`
      ALTER TABLE faculty_allocation 
      ALTER COLUMN slot_name TYPE VARCHAR(25)
    `);
    console.log("✓ Updated faculty_allocation.slot_name to VARCHAR(25)");

    // Verify the changes
    const updatedSchema = await db.query(`
      SELECT table_name, column_name, character_maximum_length 
      FROM information_schema.columns 
      WHERE column_name IN ('slot_name', 'name', 'conflicting_slot_name')
      AND table_name IN ('allowed_slot_names', 'slot', 'semester_slot_config', 'slot_conflict', 'faculty_allocation')
      ORDER BY table_name, column_name
    `);

    console.log("\nUpdated schema verification:");
    updatedSchema.rows.forEach((row) => {
      console.log(
        `${row.table_name}.${row.column_name}: VARCHAR(${row.character_maximum_length})`
      );
    });

    console.log("\n✅ Schema migration completed successfully!");
  } catch (error) {
    console.error("❌ Schema migration failed:", error);
    throw error;
  }
}

// Run if this script is executed directly
if (require.main === module) {
  migrateSlotNameLength()
    .then(() => {
      console.log("Schema migration completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Schema migration failed:", error);
      process.exit(1);
    });
}

module.exports = { migrateSlotNameLength };
