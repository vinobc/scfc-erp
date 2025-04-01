const fs = require("fs");
const path = require("path");
const db = require("../config/db");

const initSemesterTable = async () => {
  try {
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, "schema", "semester.sql");
    const sql = fs.readFileSync(sqlFilePath, "utf8");

    // Execute the SQL commands
    await db.query(sql);
    console.log("Semester table created successfully!");
  } catch (err) {
    console.error("Error creating semester table:", err);
  }
};

// Run the initialization
initSemesterTable();
