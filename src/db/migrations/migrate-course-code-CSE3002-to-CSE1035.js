const db = require("../../config/db");

const migrateCourseCode = async () => {
  console.log("=== COURSE CODE MIGRATION: CSE3002 to CSE1035 ===");
  console.log("Starting migration...\n");

  try {
    // Begin transaction
    await db.query("BEGIN");
    console.log("✅ Transaction started");

    // 1. Validate pre-conditions
    console.log("\n1. Validating pre-conditions...");
    
    // Check if CSE3002 exists
    const sourceExists = await db.query(
      "SELECT * FROM course WHERE course_code = $1",
      ["CSE3002"]
    );
    
    if (sourceExists.rows.length === 0) {
      throw new Error("Source course CSE3002 not found!");
    }
    console.log("✅ Source course CSE3002 exists");

    // Check if CSE1035 already exists
    const targetExists = await db.query(
      "SELECT * FROM course WHERE course_code = $1",
      ["CSE1035"]
    );
    
    if (targetExists.rows.length > 0) {
      throw new Error("Target course CSE1035 already exists!");
    }
    console.log("✅ Target course CSE1035 is available");

    // 2. Get current counts for verification
    console.log("\n2. Getting current record counts...");
    
    const facultyCount = await db.query(
      "SELECT COUNT(*) FROM faculty_allocation WHERE course_code = $1",
      ["CSE3002"]
    );
    
    const studentCount = await db.query(
      "SELECT COUNT(*) FROM student_registrations WHERE course_code = $1",
      ["CSE3002"]
    );
    
    console.log(`Faculty allocations to migrate: ${facultyCount.rows[0].count}`);
    console.log(`Student registrations to migrate: ${studentCount.rows[0].count}`);

    // 3. Temporarily disable foreign key constraint
    console.log("\n3. Temporarily disabling foreign key constraint...");
    await db.query("ALTER TABLE faculty_allocation DROP CONSTRAINT faculty_allocation_course_code_fkey");
    console.log("✅ Foreign key constraint disabled");

    // 4. Update course table (primary key)
    console.log("\n4. Updating course table...");
    const updateCourse = await db.query(
      "UPDATE course SET course_code = $1 WHERE course_code = $2",
      ["CSE1035", "CSE3002"]
    );
    console.log(`✅ Course table updated: ${updateCourse.rowCount} row(s)`);

    // 5. Update faculty_allocation table
    console.log("\n5. Updating faculty_allocation table...");
    const updateFacultyAllocation = await db.query(
      "UPDATE faculty_allocation SET course_code = $1 WHERE course_code = $2",
      ["CSE1035", "CSE3002"]
    );
    console.log(`✅ Faculty allocation table updated: ${updateFacultyAllocation.rowCount} row(s)`);

    // 6. Update student_registrations table
    console.log("\n6. Updating student_registrations table...");
    const updateStudentRegistrations = await db.query(
      "UPDATE student_registrations SET course_code = $1 WHERE course_code = $2",
      ["CSE1035", "CSE3002"]
    );
    console.log(`✅ Student registrations table updated: ${updateStudentRegistrations.rowCount} row(s)`);

    // 7. Re-enable foreign key constraint
    console.log("\n7. Re-enabling foreign key constraint...");
    await db.query("ALTER TABLE faculty_allocation ADD CONSTRAINT faculty_allocation_course_code_fkey FOREIGN KEY (course_code) REFERENCES course(course_code) ON DELETE RESTRICT");
    console.log("✅ Foreign key constraint re-enabled");

    // 8. Verify migration results
    console.log("\n8. Verifying migration results...");
    
    // Check if CSE1035 now exists
    const newCourseExists = await db.query(
      "SELECT * FROM course WHERE course_code = $1",
      ["CSE1035"]
    );
    
    if (newCourseExists.rows.length === 0) {
      throw new Error("Migration failed: CSE1035 course not found after update!");
    }
    console.log("✅ CSE1035 course exists after migration");

    // Check if CSE3002 no longer exists
    const oldCourseExists = await db.query(
      "SELECT * FROM course WHERE course_code = $1",
      ["CSE3002"]
    );
    
    if (oldCourseExists.rows.length > 0) {
      throw new Error("Migration failed: CSE3002 course still exists after update!");
    }
    console.log("✅ CSE3002 course no longer exists");

    // Verify faculty allocations
    const newFacultyCount = await db.query(
      "SELECT COUNT(*) FROM faculty_allocation WHERE course_code = $1",
      ["CSE1035"]
    );
    
    const oldFacultyCount = await db.query(
      "SELECT COUNT(*) FROM faculty_allocation WHERE course_code = $1",
      ["CSE3002"]
    );
    
    if (newFacultyCount.rows[0].count !== facultyCount.rows[0].count) {
      throw new Error(`Faculty allocation count mismatch: expected ${facultyCount.rows[0].count}, got ${newFacultyCount.rows[0].count}`);
    }
    
    if (oldFacultyCount.rows[0].count !== "0") {
      throw new Error(`Old faculty allocations still exist: ${oldFacultyCount.rows[0].count} records`);
    }
    console.log("✅ Faculty allocations migrated successfully");

    // Verify student registrations
    const newStudentCount = await db.query(
      "SELECT COUNT(*) FROM student_registrations WHERE course_code = $1",
      ["CSE1035"]
    );
    
    const oldStudentCount = await db.query(
      "SELECT COUNT(*) FROM student_registrations WHERE course_code = $1",
      ["CSE3002"]
    );
    
    if (newStudentCount.rows[0].count !== studentCount.rows[0].count) {
      throw new Error(`Student registration count mismatch: expected ${studentCount.rows[0].count}, got ${newStudentCount.rows[0].count}`);
    }
    
    if (oldStudentCount.rows[0].count !== "0") {
      throw new Error(`Old student registrations still exist: ${oldStudentCount.rows[0].count} records`);
    }
    console.log("✅ Student registrations migrated successfully");

    // Commit transaction
    await db.query("COMMIT");
    console.log("\n✅ Transaction committed successfully");

    // 9. Final summary
    console.log("\n=== MIGRATION COMPLETED SUCCESSFULLY ===");
    console.log(`Course code changed: CSE3002 -> CSE1035`);
    console.log(`Course name: ${newCourseExists.rows[0].course_name}`);
    console.log(`Faculty allocations migrated: ${newFacultyCount.rows[0].count}`);
    console.log(`Student registrations migrated: ${newStudentCount.rows[0].count}`);
    console.log(`Migration completed at: ${new Date().toISOString()}`);

  } catch (err) {
    // Rollback on error
    await db.query("ROLLBACK");
    console.error("\n❌ Migration failed - Transaction rolled back");
    console.error("Error details:", err.message);
    throw err;
  } finally {
    // End the connection
    process.exit();
  }
};

// Run the migration
migrateCourseCode();