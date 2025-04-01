const fs = require("fs");
const path = require("path");
const db = require("../config/db");

const initSchoolTable = async () => {
  try {
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, "schema", "school.sql");
    const sql = fs.readFileSync(sqlFilePath, "utf8");

    // Execute the SQL commands
    await db.query(sql);
    console.log("School table created successfully!");
  } catch (err) {
    console.error("Error creating school table:", err);
  }
};

// Run the initialization
initSchoolTable();
