const fs = require("fs");
const path = require("path");
const db = require("../config/db");

const initTimetableCoordinatorsTable = async () => {
  try {
    // Read the SQL file
    const sqlFilePath = path.join(
      __dirname,
      "schema",
      "timetable_coordinators.sql"
    );
    const sql = fs.readFileSync(sqlFilePath, "utf8");

    // Execute the SQL commands
    await db.query(sql);
    console.log("Timetable coordinators table created successfully!");
  } catch (err) {
    console.error("Error creating timetable coordinators table:", err);
  }
};

// Run the initialization
initTimetableCoordinatorsTable();
