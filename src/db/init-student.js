const fs = require("fs");
const path = require("path");
const db = require("../config/db");

const initStudentTable = async () => {
  try {
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, "schema", "student.sql");
    const sql = fs.readFileSync(sqlFilePath, "utf8");

    // Execute the SQL commands
    await db.query(sql);
    console.log("Student table created successfully!");
  } catch (err) {
    console.error("Error creating student table:", err);
  }
};

// Run the initialization
initStudentTable();
