const db = require("../config/db");
const fs = require("fs");
const path = require("path");

async function initStudentRegistrations() {
  try {
    console.log("Creating student_registrations table...");

    // Read and execute the SQL file
    const sqlFile = path.join(__dirname, "schema", "student_registrations.sql");
    const sql = fs.readFileSync(sqlFile, "utf8");

    await db.query(sql);

    console.log("✅ student_registrations table created successfully");

    // Insert sample data for testing (optional)
    console.log("Inserting sample registration data...");

    const sampleRegistrations = [
      {
        enrollment_number: "A86501923001",
        student_name: "Ms MITALI DWARAKANATH",
        program_code: "MBA",
        year_admitted: 2023,
        slot_year: "2024-25",
        semester_type: "SUMMER",
        course_code: "MGT1009",
        course_name: "Organizational Behaviour",
        theory: 3,
        practical: 0,
        credits: 3,
        course_type: "T",
        slot_name: "A",
        venue: "301",
        faculty_name: "Dr. Sample Faculty",
        component_type: "SINGLE",
      },
    ];

    for (const reg of sampleRegistrations) {
      await db.query(
        `INSERT INTO student_registrations 
         (enrollment_number, student_name, program_code, year_admitted, 
          slot_year, semester_type, course_code, course_name, 
          theory, practical, credits, course_type, 
          slot_name, venue, faculty_name, component_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
         ON CONFLICT (enrollment_number, slot_year, semester_type, course_code, component_type) 
         DO NOTHING`,
        [
          reg.enrollment_number,
          reg.student_name,
          reg.program_code,
          reg.year_admitted,
          reg.slot_year,
          reg.semester_type,
          reg.course_code,
          reg.course_name,
          reg.theory,
          reg.practical,
          reg.credits,
          reg.course_type,
          reg.slot_name,
          reg.venue,
          reg.faculty_name,
          reg.component_type,
        ]
      );
    }

    console.log("✅ Sample registration data inserted");
  } catch (error) {
    console.error("Error creating student_registrations table:", error);
    throw error;
  }
}

// Run if this script is executed directly
if (require.main === module) {
  initStudentRegistrations()
    .then(() => {
      console.log("Student registrations initialization completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Student registrations initialization failed:", error);
      process.exit(1);
    });
}

module.exports = { initStudentRegistrations };
