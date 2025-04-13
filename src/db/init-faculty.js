const fs = require("fs");
const path = require("path");
const db = require("../config/db");

const initFacultyTable = async () => {
  try {
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, "schema", "faculty.sql");
    const sql = fs.readFileSync(sqlFilePath, "utf8");

    // Execute the SQL commands
    await db.query(sql);
    console.log("Faculty table created successfully!");
  } catch (err) {
    console.error("Error creating faculty table:", err);
  }
};

// Run the initialization
initFacultyTable();
