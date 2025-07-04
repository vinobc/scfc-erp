const db = require("../../config/db");

const analyzePreMigration = async () => {
  try {
    console.log("=== PRE-MIGRATION ANALYSIS: CSE3002 to CSE1035 ===");
    console.log("Starting analysis...\n");

    // Check if CSE3002 exists
    console.log("1. Checking if CSE3002 exists...");
    const courseExists = await db.query(
      "SELECT * FROM course WHERE course_code = $1",
      ["CSE3002"]
    );
    
    if (courseExists.rows.length === 0) {
      console.log("❌ ERROR: CSE3002 course not found in database!");
      return;
    }
    
    console.log("✅ CSE3002 course found:");
    console.log("Course Details:", courseExists.rows[0]);
    console.log();

    // Check if CSE1035 already exists
    console.log("2. Checking if CSE1035 already exists...");
    const targetExists = await db.query(
      "SELECT * FROM course WHERE course_code = $1",
      ["CSE1035"]
    );
    
    if (targetExists.rows.length > 0) {
      console.log("❌ ERROR: CSE1035 course already exists!");
      console.log("Existing CSE1035 Details:", targetExists.rows[0]);
      return;
    }
    
    console.log("✅ CSE1035 course code is available");
    console.log();

    // Get faculty allocations for CSE3002
    console.log("3. Faculty allocations for CSE3002:");
    const facultyAllocations = await db.query(
      `SELECT slot_year, semester_type, employee_id, venue, slot_day, slot_name, slot_time 
       FROM faculty_allocation 
       WHERE course_code = $1 
       ORDER BY slot_year, semester_type, employee_id`,
      ["CSE3002"]
    );
    
    console.log(`Found ${facultyAllocations.rows.length} faculty allocations:`);
    facultyAllocations.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.slot_year} ${row.semester_type} - Employee: ${row.employee_id}, Venue: ${row.venue}, Slot: ${row.slot_day} ${row.slot_name} ${row.slot_time}`);
    });
    console.log();

    // Get student registrations for CSE3002
    console.log("4. Student registrations for CSE3002:");
    const studentRegistrations = await db.query(
      `SELECT enrollment_number, student_name, slot_year, semester_type, 
              component_type, withdrawn, created_at 
       FROM student_registrations 
       WHERE course_code = $1 
       ORDER BY slot_year, semester_type, enrollment_number`,
      ["CSE3002"]
    );
    
    console.log(`Found ${studentRegistrations.rows.length} student registrations:`);
    
    // Group by semester
    const semesterGroups = {};
    studentRegistrations.rows.forEach(row => {
      const semesterKey = `${row.slot_year}-${row.semester_type}`;
      if (!semesterGroups[semesterKey]) {
        semesterGroups[semesterKey] = [];
      }
      semesterGroups[semesterKey].push(row);
    });
    
    Object.keys(semesterGroups).forEach(semester => {
      const registrations = semesterGroups[semester];
      const activeCount = registrations.filter(r => !r.withdrawn).length;
      const withdrawnCount = registrations.filter(r => r.withdrawn).length;
      
      console.log(`  ${semester}: ${registrations.length} total (${activeCount} active, ${withdrawnCount} withdrawn)`);
    });
    console.log();

    // Check for any other tables that might reference CSE3002
    console.log("5. Checking for other references to CSE3002...");
    
    // Check if there are any other tables with course_code column
    const otherTables = await db.query(`
      SELECT table_name, column_name 
      FROM information_schema.columns 
      WHERE column_name = 'course_code' 
      AND table_schema = 'public'
      AND table_name NOT IN ('course', 'faculty_allocation', 'student_registrations')
    `);
    
    if (otherTables.rows.length > 0) {
      console.log("⚠️  Found additional tables with course_code column:");
      otherTables.rows.forEach(row => {
        console.log(`  - ${row.table_name}.${row.column_name}`);
      });
    } else {
      console.log("✅ No other tables found with course_code column");
    }
    console.log();

    // Generate summary
    console.log("=== MIGRATION SUMMARY ===");
    console.log(`Course to migrate: CSE3002 -> CSE1035`);
    console.log(`Course name: ${courseExists.rows[0].course_name}`);
    console.log(`Faculty allocations to update: ${facultyAllocations.rows.length}`);
    console.log(`Student registrations to update: ${studentRegistrations.rows.length}`);
    console.log(`Tables to update: 3 (course, faculty_allocation, student_registrations)`);
    console.log();
    
    console.log("✅ Pre-migration analysis completed successfully!");
    console.log("Ready to proceed with migration.");
    
  } catch (err) {
    console.error("❌ Error during pre-migration analysis:", err);
  } finally {
    process.exit();
  }
};

// Run the analysis
analyzePreMigration();