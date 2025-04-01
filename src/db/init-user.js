const fs = require("fs");
const path = require("path");
const db = require("../config/db");
const bcrypt = require("bcrypt");

const initUserTable = async () => {
  try {
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, "schema", "user.sql");
    const sql = fs.readFileSync(sqlFilePath, "utf8");

    // Execute the SQL commands
    await db.query(sql);
    console.log("User table created successfully!");

    // Create a default admin user if none exists
    const adminExists = await db.query(
      'SELECT COUNT(*) FROM "user" WHERE username = $1',
      ["admin"]
    );

    if (parseInt(adminExists.rows[0].count) === 0) {
      // Hash the default password
      const saltRounds = 10;
      const defaultPassword = "Admin@123"; // This should be changed immediately after first login
      const passwordHash = await bcrypt.hash(defaultPassword, saltRounds);

      // Insert the default admin
      await db.query(
        'INSERT INTO "user" (username, email, password_hash, full_name, role) VALUES ($1, $2, $3, $4, $5)',
        [
          "admin",
          "admin@erp.university.edu",
          passwordHash,
          "System Administrator",
          "admin",
        ]
      );

      console.log("Default admin user created successfully!");
    }
  } catch (err) {
    console.error("Error setting up user table:", err);
  }
};

// Run the initialization
initUserTable();
