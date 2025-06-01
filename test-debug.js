// Temporary debug - create this file as test-debug.js
const db = require("./src/config/db");

async function debugUserTables() {
  try {
    console.log("=== USER TABLE STRUCTURE ===");
    const userStructure = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'user'
      ORDER BY ordinal_position
    `);
    console.log("User table columns:", userStructure.rows);

    console.log("\n=== STUDENT TABLE STRUCTURE ===");
    const studentStructure = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'student'
      ORDER BY ordinal_position  
    `);
    console.log("Student table columns:", studentStructure.rows);

    console.log("\n=== SAMPLE USER DATA ===");
    const sampleUsers = await db.query(`SELECT * FROM "user" LIMIT 3`);
    console.log("Sample users:", sampleUsers.rows);

    console.log("\n=== SAMPLE STUDENT DATA ===");
    const sampleStudents = await db.query(`SELECT * FROM student LIMIT 3`);
    console.log("Sample students:", sampleStudents.rows);
  } catch (error) {
    console.error("Debug error:", error);
  } finally {
    process.exit(0);
  }
}

debugUserTables();
