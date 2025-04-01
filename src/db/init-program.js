const fs = require("fs");
const path = require("path");
const db = require("../config/db");

const initProgramTable = async () => {
  try {
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, "schema", "program.sql");
    const sql = fs.readFileSync(sqlFilePath, "utf8");

    // Execute the SQL commands
    await db.query(sql);
    console.log("Program table created successfully!");
  } catch (err) {
    console.error("Error creating program table:", err);
  }
};

// Run the initialization
initProgramTable();
