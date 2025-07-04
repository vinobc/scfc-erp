const db = require("../../config/db");
const fs = require("fs");
const path = require("path");

const generateBackupReport = async () => {
  try {
    console.log("=== GENERATING BACKUP REPORT FOR CSE3002 ===");
    console.log("Starting report generation...\n");

    let report = "";
    report += "=== CSE3002 COURSE MIGRATION BACKUP REPORT ===\n";
    report += `Generated on: ${new Date().toISOString()}\n`;
    report += `Purpose: Pre-migration backup for CSE3002 -> CSE1035 migration\n\n`;

    // 1. Course Details
    console.log("1. Getting course details...");
    const courseDetails = await db.query(
      "SELECT * FROM course WHERE course_code = $1",
      ["CSE3002"]
    );
    
    if (courseDetails.rows.length === 0) {
      console.log("❌ Course CSE3002 not found!");
      return;
    }

    const course = courseDetails.rows[0];
    report += "=== COURSE DETAILS ===\n";
    report += `Course Code: ${course.course_code}\n`;
    report += `Course Name: ${course.course_name}\n`;
    report += `Course Owner: ${course.course_owner}\n`;
    report += `Theory Hours: ${course.theory}\n`;
    report += `Practical Hours: ${course.practical}\n`;
    report += `Credits: ${course.credits}\n`;
    report += `Course Type: ${course.course_type}\n`;
    report += `Programs Offered To: ${course.programs_offered_to}\n`;
    report += `Is Active: ${course.is_active}\n`;
    report += `Created At: ${course.created_at}\n`;
    report += `Updated At: ${course.updated_at}\n\n`;

    // 2. Faculty Allocations
    console.log("2. Getting faculty allocations...");
    const facultyAllocations = await db.query(
      `SELECT slot_year, semester_type, course_code, employee_id, venue, 
              slot_day, slot_name, slot_time, created_at, updated_at
       FROM faculty_allocation 
       WHERE course_code = $1 
       ORDER BY slot_year, semester_type, employee_id, slot_day, slot_time`,
      ["CSE3002"]
    );

    report += "=== FACULTY ALLOCATIONS ===\n";
    report += `Total Faculty Allocations: ${facultyAllocations.rows.length}\n\n`;
    
    if (facultyAllocations.rows.length > 0) {
      report += "Faculty Allocation Details:\n";
      report += "No. | Year | Semester | Employee ID | Venue | Day | Slot Name | Time\n";
      report += "----+------+----------+-------------+-------+-----+-----------+------\n";
      
      facultyAllocations.rows.forEach((allocation, index) => {
        report += `${(index + 1).toString().padStart(3)} | ${allocation.slot_year} | ${allocation.semester_type.padEnd(8)} | ${allocation.employee_id.toString().padEnd(11)} | ${allocation.venue.padEnd(5)} | ${allocation.slot_day.padEnd(3)} | ${allocation.slot_name.padEnd(9)} | ${allocation.slot_time}\n`;
      });
    }
    report += "\n";

    // 3. Student Registrations
    console.log("3. Getting student registrations...");
    const studentRegistrations = await db.query(
      `SELECT enrollment_number, student_name, program_code, year_admitted,
              slot_year, semester_type, course_code, course_name, 
              theory, practical, credits, course_type, slot_name, venue, 
              faculty_name, component_type, withdrawn, created_at, updated_at
       FROM student_registrations 
       WHERE course_code = $1 
       ORDER BY slot_year, semester_type, enrollment_number, component_type`,
      ["CSE3002"]
    );

    report += "=== STUDENT REGISTRATIONS ===\n";
    report += `Total Student Registrations: ${studentRegistrations.rows.length}\n\n`;

    // Group by semester and component type
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

    report += "Summary by Semester:\n";
    Object.keys(semesterGroups).forEach(semester => {
      const group = semesterGroups[semester];
      report += `${semester}: ${group.total} total (${group.active} active, ${group.withdrawn} withdrawn)\n`;
      report += `  - Theory components: ${group.theory}\n`;
      report += `  - Practical components: ${group.practical}\n`;
    });
    report += "\n";

    // Detailed student registrations
    if (studentRegistrations.rows.length > 0) {
      report += "Detailed Student Registration List:\n";
      report += "No. | Enrollment | Student Name | Program | Year | Semester | Component | Venue | Faculty | Status\n";
      report += "----+------------+--------------+---------+------+----------+-----------+-------+---------+-------\n";
      
      studentRegistrations.rows.forEach((reg, index) => {
        const status = reg.withdrawn ? "WITHDRAWN" : "ACTIVE";
        const studentName = reg.student_name.length > 12 ? reg.student_name.substring(0, 12) + "..." : reg.student_name;
        const facultyName = reg.faculty_name.length > 8 ? reg.faculty_name.substring(0, 8) + "..." : reg.faculty_name;
        
        report += `${(index + 1).toString().padStart(3)} | ${reg.enrollment_number.padEnd(10)} | ${studentName.padEnd(12)} | ${reg.program_code.padEnd(7)} | ${reg.year_admitted} | ${reg.slot_year}-${reg.semester_type.substring(0,3)} | ${reg.component_type.padEnd(9)} | ${reg.venue.padEnd(5)} | ${facultyName.padEnd(7)} | ${status}\n`;
      });
    }
    report += "\n";

    // 4. Verification checksums
    report += "=== VERIFICATION CHECKSUMS ===\n";
    report += `Course records: 1\n`;
    report += `Faculty allocation records: ${facultyAllocations.rows.length}\n`;
    report += `Student registration records: ${studentRegistrations.rows.length}\n`;
    report += `Active student registrations: ${studentRegistrations.rows.filter(r => !r.withdrawn).length}\n`;
    report += `Withdrawn student registrations: ${studentRegistrations.rows.filter(r => r.withdrawn).length}\n`;
    report += `Unique students: ${new Set(studentRegistrations.rows.map(r => r.enrollment_number)).size}\n`;
    report += `Unique faculty: ${new Set(facultyAllocations.rows.map(r => r.employee_id)).size}\n`;
    report += `Unique venues: ${new Set(facultyAllocations.rows.map(r => r.venue)).size}\n\n`;

    report += "=== END OF REPORT ===\n";

    // Save to file
    const filename = `CSE3002-backup-${Date.now()}.txt`;
    const filepath = path.join(__dirname, filename);
    fs.writeFileSync(filepath, report);
    
    console.log(`✅ Backup report generated successfully!`);
    console.log(`📁 Report saved to: ${filepath}`);
    console.log(`📊 Report contains:`);
    console.log(`   - 1 course record`);
    console.log(`   - ${facultyAllocations.rows.length} faculty allocations`);
    console.log(`   - ${studentRegistrations.rows.length} student registrations`);
    console.log(`   - ${new Set(studentRegistrations.rows.map(r => r.enrollment_number)).size} unique students`);
    console.log(`   - ${new Set(facultyAllocations.rows.map(r => r.employee_id)).size} unique faculty members`);
    
    // Also output to console for immediate viewing
    console.log("\n" + "=".repeat(80));
    console.log("BACKUP REPORT CONTENT:");
    console.log("=".repeat(80));
    console.log(report);
    
  } catch (err) {
    console.error("❌ Error generating backup report:", err);
  } finally {
    process.exit();
  }
};

// Run the backup report generation
generateBackupReport();