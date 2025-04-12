const fs = require("fs");
const path = require("path");
const db = require("../config/db");

const initVenueTable = async () => {
  try {
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, "schema", "venue.sql");
    const sql = fs.readFileSync(sqlFilePath, "utf8");

    // Execute the SQL commands
    await db.query(sql);
    console.log("Venue table created successfully!");
  } catch (err) {
    console.error("Error creating venue table:", err);
  }
};

// Run the initialization
initVenueTable();
