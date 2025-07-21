const fs = require("fs");
const path = require("path");
const db = require("../config/db");

const initAttendanceTable = async () => {
  try {
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, "schema", "attendance.sql");
    const sql = fs.readFileSync(sqlFilePath, "utf8");

    // Execute the SQL commands
    await db.query(sql);
    console.log("Attendance table created successfully!");
  } catch (err) {
    console.error("Error creating attendance table:", err);
  } finally {
    // Close the database connection
    process.exit();
  }
};

// Run the initialization
initAttendanceTable();