// src/db/create-slot-conflict-table.js
const db = require("../config/db");
const fs = require("fs");
const path = require("path");

async function createSlotConflictTable() {
  try {
    console.log("Creating slot_conflict table...");

    // Read the SQL file content
    const sqlFilePath = path.join(__dirname, "schema", "slot_conflict.sql");
    const sqlContent = fs.readFileSync(sqlFilePath, "utf8");

    // Execute the SQL
    await db.query(sqlContent);

    console.log("slot_conflict table created successfully");
  } catch (error) {
    console.error("Error creating slot_conflict table:", error);
  }
}

// Run the function
createSlotConflictTable()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
