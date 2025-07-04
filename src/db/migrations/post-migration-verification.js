const db = require("../../config/db");

const verifyPostMigration = async () => {
  try {
    console.log("=== POST-MIGRATION VERIFICATION: CSE3002 to CSE1035 ===");
    console.log("Starting verification...\n");

    // 1. Verify CSE1035 exists with correct details
    console.log("1. Verifying CSE1035 course exists...");
    const courseExists = await db.query(
      "SELECT * FROM course WHERE course_code = $1",
      ["CSE1035"]
    );
    
    if (courseExists.rows.length === 0) {
      console.log("❌ ERROR: CSE1035 course not found!");
      return;
    }
    
    console.log("✅ CSE1035 course found:");
    const course = courseExists.rows[0];
    console.log(`  Course Code: ${course.course_code}`);
    console.log(`  Course Name: ${course.course_name}`);
    console.log(`  Course Owner: ${course.course_owner}`);
    console.log(`  Theory/Practical/Credits: ${course.theory}/${course.practical}/${course.credits}`);
    console.log(`  Course Type: ${course.course_type}`);
    console.log(`  Programs: ${course.programs_offered_to}`);
    console.log(`  Is Active: ${course.is_active}`);
    console.log();

    // 2. Verify CSE3002 no longer exists
    console.log("2. Verifying CSE3002 no longer exists...");
    const oldCourseExists = await db.query(
      "SELECT * FROM course WHERE course_code = $1",
      ["CSE3002"]
    );
    
    if (oldCourseExists.rows.length > 0) {
      console.log("❌ ERROR: CSE3002 still exists!");
      return;
    }
    console.log("✅ CSE3002 course no longer exists");
    console.log();

    // 3. Verify faculty allocations for CSE1035
    console.log("3. Verifying faculty allocations...");
    const facultyAllocations = await db.query(
      `SELECT slot_year, semester_type, employee_id, venue, slot_day, slot_name, slot_time
       FROM faculty_allocation 
       WHERE course_code = $1 
       ORDER BY slot_year, semester_type, employee_id`,
      ["CSE1035"]
    );
    
    console.log(`✅ Found ${facultyAllocations.rows.length} faculty allocations for CSE1035`);
    
    // Check that no CSE3002 faculty allocations exist
    const oldFacultyAllocations = await db.query(
      "SELECT COUNT(*) FROM faculty_allocation WHERE course_code = $1",
      ["CSE3002"]
    );
    
    if (oldFacultyAllocations.rows[0].count !== "0") {
      console.log(`❌ ERROR: Found ${oldFacultyAllocations.rows[0].count} faculty allocations still using CSE3002`);
      return;
    }
    console.log("✅ No faculty allocations remain with CSE3002");
    
    // Show faculty breakdown
    const facultyBreakdown = {};
    facultyAllocations.rows.forEach(alloc => {
      if (!facultyBreakdown[alloc.employee_id]) {
        facultyBreakdown[alloc.employee_id] = 0;
      }
      facultyBreakdown[alloc.employee_id]++;
    });
    
    console.log("  Faculty allocation breakdown:");
    Object.keys(facultyBreakdown).forEach(empId => {
      console.log(`    Employee ${empId}: ${facultyBreakdown[empId]} allocations`);
    });
    console.log();

    // 4. Verify student registrations for CSE1035
    console.log("4. Verifying student registrations...");
    const studentRegistrations = await db.query(
      `SELECT enrollment_number, student_name, component_type, withdrawn, slot_year, semester_type
       FROM student_registrations 
       WHERE course_code = $1 
       ORDER BY slot_year, semester_type, enrollment_number`,
      ["CSE1035"]
    );
    
    console.log(`✅ Found ${studentRegistrations.rows.length} student registrations for CSE1035`);
    
    // Check that no CSE3002 student registrations exist
    const oldStudentRegistrations = await db.query(
      "SELECT COUNT(*) FROM student_registrations WHERE course_code = $1",
      ["CSE3002"]
    );
    
    if (oldStudentRegistrations.rows[0].count !== "0") {
      console.log(`❌ ERROR: Found ${oldStudentRegistrations.rows[0].count} student registrations still using CSE3002`);
      return;
    }
    console.log("✅ No student registrations remain with CSE3002");
    
    // Show student registration breakdown
    const semesterGroups = {};
    studentRegistrations.rows.forEach(reg => {
      const key = `${reg.slot_year}-${reg.semester_type}`;
      if (!semesterGroups[key]) {
        semesterGroups[key] = { total: 0, theory: 0, practical: 0, active: 0, withdrawn: 0 };
      }
      semesterGroups[key].total++;
      if (reg.component_type === 'T') semesterGroups[key].theory++;
      if (reg.component_type === 'P') semesterGroups[key].practical++;
      if (reg.withdrawn) semesterGroups[key].withdrawn++;
      else semesterGroups[key].active++;
    });
    
    console.log("  Student registration breakdown:");
    Object.keys(semesterGroups).forEach(semester => {
      const group = semesterGroups[semester];
      console.log(`    ${semester}: ${group.total} total (${group.active} active, ${group.withdrawn} withdrawn)`);
      console.log(`      Theory: ${group.theory}, Practical: ${group.practical}`);
    });
    console.log();

    // 5. Compare with expected counts from backup
    console.log("5. Comparing with pre-migration backup...");
    const expectedFacultyCount = 44;
    const expectedStudentCount = 893;
    const expectedUniqueStudents = 448;
    
    if (facultyAllocations.rows.length !== expectedFacultyCount) {
      console.log(`❌ ERROR: Faculty allocation count mismatch. Expected: ${expectedFacultyCount}, Found: ${facultyAllocations.rows.length}`);
      return;
    }
    console.log(`✅ Faculty allocation count matches: ${facultyAllocations.rows.length}`);
    
    if (studentRegistrations.rows.length !== expectedStudentCount) {
      console.log(`❌ ERROR: Student registration count mismatch. Expected: ${expectedStudentCount}, Found: ${studentRegistrations.rows.length}`);
      return;
    }
    console.log(`✅ Student registration count matches: ${studentRegistrations.rows.length}`);
    
    const actualUniqueStudents = new Set(studentRegistrations.rows.map(r => r.enrollment_number)).size;
    if (actualUniqueStudents !== expectedUniqueStudents) {
      console.log(`❌ ERROR: Unique student count mismatch. Expected: ${expectedUniqueStudents}, Found: ${actualUniqueStudents}`);
      return;
    }
    console.log(`✅ Unique student count matches: ${actualUniqueStudents}`);
    console.log();

    // 6. Verify foreign key constraint is working
    console.log("6. Verifying foreign key constraint...");
    try {
      await db.query("BEGIN");
      await db.query("DELETE FROM course WHERE course_code = $1", ["CSE1035"]);
      await db.query("ROLLBACK");
      console.log("❌ ERROR: Foreign key constraint not working - course deletion should have failed!");
      return;
    } catch (err) {
      await db.query("ROLLBACK");
      if (err.message.includes("foreign key constraint")) {
        console.log("✅ Foreign key constraint is working correctly");
      } else {
        console.log(`❌ ERROR: Unexpected error: ${err.message}`);
        return;
      }
    }
    console.log();

    // 7. Final verification summary
    console.log("=== POST-MIGRATION VERIFICATION SUMMARY ===");
    console.log("✅ Migration completed successfully!");
    console.log(`✅ Course code changed: CSE3002 -> CSE1035`);
    console.log(`✅ Course name: ${course.course_name}`);
    console.log(`✅ Faculty allocations migrated: ${facultyAllocations.rows.length}`);
    console.log(`✅ Student registrations migrated: ${studentRegistrations.rows.length}`);
    console.log(`✅ Unique students: ${actualUniqueStudents}`);
    console.log(`✅ Faculty members: ${Object.keys(facultyBreakdown).length}`);
    console.log(`✅ All data integrity checks passed`);
    console.log(`✅ Foreign key constraints working correctly`);
    console.log(`✅ No orphaned records found`);
    console.log();
    console.log("🎉 Migration verification completed successfully!");
    
  } catch (err) {
    console.error("❌ Error during post-migration verification:", err);
  } finally {
    process.exit();
  }
};

// Run the verification
verifyPostMigration();