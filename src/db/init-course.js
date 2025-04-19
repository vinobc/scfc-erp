const fs = require("fs");
const path = require("path");
const db = require("../config/db");

const initCourseTable = async () => {
  try {
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, "schema", "course.sql");
    const sql = fs.readFileSync(sqlFilePath, "utf8");

    // Execute the SQL commands
    await db.query(sql);
    console.log("Course table created successfully!");
  } catch (err) {
    console.error("Error creating course table:", err);
  }
};

// Run the initialization
initCourseTable();
