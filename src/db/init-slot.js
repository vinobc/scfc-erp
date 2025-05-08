const fs = require("fs");
const path = require("path");
const db = require("../config/db");

const initSlotTable = async () => {
  try {
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, "schema", "slot.sql");
    const sql = fs.readFileSync(sqlFilePath, "utf8");

    // Execute the SQL commands
    await db.query(sql);
    console.log("Slot table created successfully!");
  } catch (err) {
    console.error("Error creating slot table:", err);
  }
};

// Run the initialization
initSlotTable();
