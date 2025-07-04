const db = require("../../config/db");

const getTestData = async () => {
  try {
    console.log("=== EXTRACTING TEST DATA FOR CSE1035 ===\n");

    // Get faculty names for CSE1035
    console.log("Faculty members teaching CSE1035:");
    const facultyData = await db.query(
      `SELECT DISTINCT fa.employee_id, f.name, f.designation 
       FROM faculty_allocation fa 
       JOIN faculty f ON fa.employee_id = f.employee_id 
       WHERE fa.course_code = $1 
       ORDER BY fa.employee_id`,
      ["CSE1035"]
    );
    
    facultyData.rows.forEach((faculty, index) => {
      console.log(`${index + 1}. Employee ID: ${faculty.employee_id} - ${faculty.name} (${faculty.designation})`);
    });
    
    console.log("\n" + "=".repeat(50) + "\n");
    
    // Get sample student enrollment numbers for CSE1035
    console.log("Sample student enrollments for CSE1035:");
    const studentData = await db.query(
      `SELECT DISTINCT enrollment_number, student_name, program_code, component_type
       FROM student_registrations 
       WHERE course_code = $1 
       ORDER BY enrollment_number
       LIMIT 10`,
      ["CSE1035"]
    );
    
    studentData.rows.forEach((student, index) => {
      console.log(`${index + 1}. ${student.enrollment_number} - ${student.student_name} (${student.program_code}) - Component: ${student.component_type}`);
    });
    
    console.log("\n" + "=".repeat(50) + "\n");
    
    // Get venue and slot information
    console.log("Sample faculty allocation details for testing:");
    const allocationData = await db.query(
      `SELECT fa.employee_id, f.name, fa.venue, fa.slot_day, fa.slot_name, fa.slot_time
       FROM faculty_allocation fa 
       JOIN faculty f ON fa.employee_id = f.employee_id 
       WHERE fa.course_code = $1 
       ORDER BY fa.employee_id, fa.slot_day, fa.slot_time
       LIMIT 5`,
      ["CSE1035"]
    );
    
    allocationData.rows.forEach((allocation, index) => {
      console.log(`${index + 1}. ${allocation.name} (${allocation.employee_id}) - Venue: ${allocation.venue}, ${allocation.slot_day} ${allocation.slot_name} ${allocation.slot_time}`);
    });
    
    console.log("\n" + "=".repeat(50) + "\n");
    console.log("Quick Test Instructions:");
    console.log("1. Login to the system as admin/staff");
    console.log("2. Navigate to Courses section");
    console.log("3. Search for course code 'CSE1035' (should find the course)");
    console.log("4. Search for course code 'CSE3002' (should return no results)");
    console.log("5. Check Faculty Allocations for CSE1035");
    console.log("6. Check Student Registrations for CSE1035");
    console.log("7. Verify course name shows: 'Fundamentals of Artificial Intelligence and Machine Learning'");
    
  } catch (err) {
    console.error("❌ Error extracting test data:", err);
  } finally {
    process.exit();
  }
};

// Run the test data extraction
getTestData();