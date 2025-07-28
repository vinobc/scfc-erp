const db = require("../config/db");


// Get available semesters for faculty based on their allocations
exports.getAvailableSemesters = async (req, res) => {
  try {
    const facultyId = req.userId; // From JWT token
    
    // Get employee_id for the faculty or timetable coordinator from user table
    const userResult = await db.query(
      "SELECT employee_id, role FROM \"user\" WHERE user_id = $1 AND role IN ('faculty', 'timetable_coordinator')",
      [facultyId]
    );

    if (!userResult.rows.length) {
      return res.status(404).json({ message: "User not found or not authorized" });
    }

    const user = userResult.rows[0];

    // Both faculty and timetable coordinators see only their own allocations
    if (!user.employee_id) {
      return res.status(404).json({ message: "User not linked to employee record" });
    }
    
    const result = await db.query(
      `SELECT DISTINCT slot_year, semester_type 
       FROM faculty_allocation 
       WHERE employee_id = $1 
       ORDER BY slot_year DESC, semester_type`,
      [user.employee_id]
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Get available semesters error:", error);
    res.status(500).json({ message: "Server error while fetching available semesters" });
  }
};

// Get faculty allocations for specific semester
exports.getFacultyAllocations = async (req, res) => {
  try {
    const facultyId = req.userId;
    const { slot_year, semester_type } = req.query;

    if (!slot_year || !semester_type) {
      return res.status(400).json({ message: "slot_year and semester_type are required" });
    }

    // Get user role and employee_id
    const userResult = await db.query(
      "SELECT employee_id, role FROM \"user\" WHERE user_id = $1 AND role IN ('faculty', 'timetable_coordinator')",
      [facultyId]
    );

    if (!userResult.rows.length) {
      return res.status(404).json({ message: "User not found or not authorized" });
    }

    const user = userResult.rows[0];

    // Both faculty and timetable coordinators see only their own allocations
    if (!user.employee_id) {
      return res.status(404).json({ message: "User not linked to employee record" });
    }

    // Get faculty allocations with course details for the user's employee_id
    const result = await db.query(
      `SELECT fa.*, c.course_name, c.theory, c.practical, c.course_type, f.name as faculty_name
       FROM faculty_allocation fa
       JOIN course c ON fa.course_code = c.course_code
       JOIN faculty f ON fa.employee_id = f.employee_id
       WHERE fa.employee_id = $1 AND fa.slot_year = $2 AND fa.semester_type = $3
       ORDER BY fa.course_code, fa.slot_day, fa.slot_time`,
      [user.employee_id, slot_year, semester_type]
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Get faculty allocations error:", error);
    res.status(500).json({ message: "Server error while fetching faculty allocations" });
  }
};

// Get students enrolled in a specific course allocation
exports.getEnrolledStudents = async (req, res) => {
  try {
    const { slot_year, semester_type, course_code, employee_id, venue, slot_day, slot_name, slot_time, attendance_date } = req.query;

    if (!slot_year || !semester_type || !course_code || !employee_id || !venue || !slot_day || !slot_name || !slot_time) {
      return res.status(400).json({ message: "All allocation parameters are required" });
    }

    // Use today's date if no specific date provided
    const targetDate = attendance_date || new Date().toISOString().split('T')[0];

    // Get students registered for this specific allocation with their attendance status for the target date
    // Handle compound slots - slot_name might be part of a larger compound slot
    const result = await db.query(
      `SELECT DISTINCT 
         sr.enrollment_number, 
         sr.student_name, 
         s.user_id as student_id,
         a.status as current_status,
         a.attendance_date
       FROM student_registrations sr
       JOIN student s ON sr.enrollment_number = s.enrollment_no
       LEFT JOIN attendance a ON s.user_id = a.student_id 
         AND a.slot_year = $1 
         AND a.semester_type = $2 
         AND a.course_code = $3
         AND a.employee_id = $4
         AND a.venue = $5
         AND a.slot_day = $6
         AND a.slot_name = $7
         AND a.slot_time = $8
         AND a.attendance_date = $9
       WHERE sr.slot_year = $1 AND sr.semester_type = $2 AND sr.course_code = $3
       AND sr.faculty_name = (SELECT name FROM faculty WHERE employee_id = $4)
       AND sr.venue = $5 
       AND (sr.slot_name = $7 OR sr.slot_name LIKE '%' || $7 || '%')
       AND sr.withdrawn = false
       ORDER BY sr.student_name`,
      [slot_year, semester_type, course_code, employee_id, venue, slot_day, slot_name, slot_time, targetDate]
    );

    res.status(200).json({
      students: result.rows,
      attendance_date: targetDate
    });
  } catch (error) {
    console.error("Get enrolled students error:", error);
    res.status(500).json({ message: "Server error while fetching enrolled students" });
  }
};

// Mark attendance for students
exports.markAttendance = async (req, res) => {
  try {
    const facultyId = req.userId;
    const { attendance_records } = req.body;

    if (!attendance_records || !Array.isArray(attendance_records)) {
      return res.status(400).json({ message: "attendance_records array is required" });
    }

    // Process each attendance record - simplified version without transactions for now
    for (const record of attendance_records) {
      const {
        student_id, slot_year, semester_type, course_code, employee_id,
        venue, slot_day, slot_name, slot_time, attendance_date, status
      } = record;

      // Insert or update attendance record
      await db.query(
        `INSERT INTO attendance 
         (student_id, slot_year, semester_type, course_code, employee_id, venue, 
          slot_day, slot_name, slot_time, attendance_date, status, recorded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (student_id, slot_year, semester_type, course_code, employee_id, venue, slot_day, slot_name, slot_time, attendance_date)
         DO UPDATE SET status = $11, recorded_by = $12, updated_at = CURRENT_TIMESTAMP`,
        [student_id, slot_year, semester_type, course_code, employee_id, venue, 
         slot_day, slot_name, slot_time, attendance_date, status, facultyId]
      );
    }

    res.status(200).json({ message: "Attendance marked successfully" });

  } catch (error) {
    console.error("Mark attendance error:", error);
    res.status(500).json({ message: "Server error while marking attendance" });
  }
};

// Get attendance records for a course
exports.getAttendanceRecords = async (req, res) => {
  try {
    const { slot_year, semester_type, course_code, employee_id, venue, slot_day, slot_name, slot_time } = req.query;

    if (!slot_year || !semester_type || !course_code || !employee_id) {
      return res.status(400).json({ message: "Required parameters are missing" });
    }

    const result = await db.query(
      `SELECT a.*, s.enrollment_no, sr.student_name
       FROM attendance a
       JOIN student s ON a.student_id = s.user_id
       JOIN student_registrations sr ON s.enrollment_no = sr.enrollment_number 
         AND a.course_code = sr.course_code AND a.slot_year = sr.slot_year AND a.semester_type = sr.semester_type
       WHERE a.slot_year = $1 AND a.semester_type = $2 AND a.course_code = $3 AND a.employee_id = $4
       ${venue ? 'AND a.venue = $5' : ''}
       ${slot_day ? 'AND a.slot_day = $6' : ''}
       ${slot_name ? 'AND a.slot_name = $7' : ''}
       ${slot_time ? 'AND a.slot_time = $8' : ''}
       ORDER BY a.attendance_date DESC, sr.student_name`,
      [slot_year, semester_type, course_code, employee_id, venue, slot_day, slot_name, slot_time].filter(p => p !== undefined)
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Get attendance records error:", error);
    res.status(500).json({ message: "Server error while fetching attendance records" });
  }
};

// Calculate attendance percentage for students in a course
exports.getAttendanceReport = async (req, res) => {
  try {
    const { slot_year, semester_type, course_code, employee_id } = req.query;

    if (!slot_year || !semester_type || !course_code || !employee_id) {
      return res.status(400).json({ message: "Required parameters are missing" });
    }

    // Get course details to check if theory component exists
    const courseResult = await db.query(
      "SELECT course_name, theory, practical, course_type FROM course WHERE course_code = $1",
      [course_code]
    );

    if (!courseResult.rows.length) {
      return res.status(404).json({ message: "Course not found" });
    }

    const course = courseResult.rows[0];

    // Get attendance percentage for each student
    const result = await db.query(
      `WITH student_attendance AS (
         SELECT 
           sr.enrollment_number,
           sr.student_name,
           COUNT(CASE WHEN a.status IN ('present', 'OD') THEN 1 END) as present_count,
           COUNT(a.id) as total_classes,
           CASE 
             WHEN COUNT(a.id) = 0 THEN 0
             ELSE ROUND((COUNT(CASE WHEN a.status IN ('present', 'OD') THEN 1 END)::decimal / COUNT(a.id)) * 100, 2)
           END as attendance_percentage
         FROM student_registrations sr
         JOIN student s ON sr.enrollment_number = s.enrollment_no
         LEFT JOIN attendance a ON s.user_id = a.student_id 
           AND a.course_code = sr.course_code 
           AND a.slot_year = sr.slot_year 
           AND a.semester_type = sr.semester_type
           AND a.employee_id = $4
         WHERE sr.slot_year = $1 AND sr.semester_type = $2 AND sr.course_code = $3
         AND sr.withdrawn = false
         GROUP BY sr.enrollment_number, sr.student_name
       )
       SELECT *, 
         CASE 
           WHEN $5 > 0 AND attendance_percentage < 75 THEN true 
           ELSE false 
         END as below_minimum
       FROM student_attendance
       ORDER BY student_name`,
      [slot_year, semester_type, course_code, employee_id, course.theory]
    );

    res.status(200).json({
      course_details: course,
      attendance_report: result.rows,
      minimum_required: course.theory > 0 ? 75 : null
    });

  } catch (error) {
    console.error("Get attendance report error:", error);
    res.status(500).json({ message: "Server error while generating attendance report" });
  }
};

// Get attendance records by date range for a course
exports.getAttendanceByDateRange = async (req, res) => {
  try {
    const { slot_year, semester_type, course_code, employee_id, start_date, end_date, status_filter } = req.query;

    if (!slot_year || !semester_type || !course_code || !employee_id) {
      return res.status(400).json({ message: "Required parameters are missing" });
    }

    let whereClause = `WHERE a.slot_year = $1 AND a.semester_type = $2 AND a.course_code = $3 AND a.employee_id = $4`;
    let params = [slot_year, semester_type, course_code, employee_id];
    let paramCount = 4;

    if (start_date) {
      paramCount++;
      whereClause += ` AND a.attendance_date >= $${paramCount}`;
      params.push(start_date);
    }

    if (end_date) {
      paramCount++;
      whereClause += ` AND a.attendance_date <= $${paramCount}`;
      params.push(end_date);
    }

    if (status_filter) {
      paramCount++;
      whereClause += ` AND a.status = $${paramCount}`;
      params.push(status_filter);
    }

    const result = await db.query(
      `SELECT 
         a.attendance_date,
         a.slot_day,
         a.slot_name,
         a.slot_time,
         a.venue,
         a.status,
         s.enrollment_no,
         sr.student_name
       FROM attendance a
       JOIN student s ON a.student_id = s.user_id
       JOIN student_registrations sr ON s.enrollment_no = sr.enrollment_number 
         AND a.course_code = sr.course_code 
         AND a.slot_year = sr.slot_year 
         AND a.semester_type = sr.semester_type
       ${whereClause}
       ORDER BY a.attendance_date DESC, sr.student_name, a.slot_time`,
      params
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Get attendance by date range error:", error);
    res.status(500).json({ message: "Server error while fetching attendance records" });
  }
};

// Get students with low attendance (below 75%)
exports.getLowAttendanceStudents = async (req, res) => {
  try {
    const { slot_year, semester_type, course_code, employee_id } = req.query;

    if (!slot_year || !semester_type || !course_code || !employee_id) {
      return res.status(400).json({ message: "Required parameters are missing" });
    }

    // Check if this is a theory course
    const courseResult = await db.query(
      "SELECT theory, practical, course_type, course_name FROM course WHERE course_code = $1",
      [course_code]
    );

    if (!courseResult.rows.length) {
      return res.status(404).json({ message: "Course not found" });
    }

    const course = courseResult.rows[0];

    // Only apply 75% rule for theory courses
    if (course.theory === 0) {
      return res.status(200).json({
        course_details: course,
        message: "75% attendance requirement not applicable for lab-only courses",
        low_attendance_students: []
      });
    }

    const result = await db.query(
      `WITH student_attendance AS (
         SELECT 
           sr.enrollment_number,
           sr.student_name,
           sr.program_code,
           COUNT(CASE WHEN a.status IN ('present', 'OD') THEN 1 END) as present_count,
           COUNT(a.id) as total_classes,
           CASE 
             WHEN COUNT(a.id) = 0 THEN 0
             ELSE ROUND((COUNT(CASE WHEN a.status IN ('present', 'OD') THEN 1 END)::decimal / COUNT(a.id)) * 100, 2)
           END as attendance_percentage
         FROM student_registrations sr
         JOIN student s ON sr.enrollment_number = s.enrollment_no
         LEFT JOIN attendance a ON s.user_id = a.student_id 
           AND a.course_code = sr.course_code 
           AND a.slot_year = sr.slot_year 
           AND a.semester_type = sr.semester_type
           AND a.employee_id = $4
         WHERE sr.slot_year = $1 AND sr.semester_type = $2 AND sr.course_code = $3
         AND sr.withdrawn = false
         GROUP BY sr.enrollment_number, sr.student_name, sr.program_code
       )
       SELECT *
       FROM student_attendance
       WHERE attendance_percentage < 75
       ORDER BY attendance_percentage ASC, student_name`,
      [slot_year, semester_type, course_code, employee_id]
    );

    res.status(200).json({
      course_details: course,
      low_attendance_students: result.rows,
      minimum_required: 75
    });

  } catch (error) {
    console.error("Get low attendance students error:", error);
    res.status(500).json({ message: "Server error while fetching low attendance students" });
  }
};

// ===== STUDENT ATTENDANCE VIEWING FUNCTIONS =====

// Get student's registered courses with attendance
exports.getStudentCourses = async (req, res) => {
  try {
    const studentId = req.userId; // From JWT token
    
    // Get student's enrollment number
    const studentResult = await db.query(
      "SELECT enrollment_no FROM student WHERE user_id = $1",
      [studentId]
    );

    if (!studentResult.rows.length) {
      return res.status(404).json({ message: "Student not found" });
    }

    const enrollmentNo = studentResult.rows[0].enrollment_no;

    // Get student's registered courses for current academic year
    const result = await db.query(
      `SELECT DISTINCT 
         sr.course_code, 
         sr.course_name,
         sr.slot_year,
         sr.semester_type,
         c.theory,
         c.practical,
         c.course_type,
         -- Calculate attendance percentage
         (SELECT 
           CASE 
             WHEN COUNT(a.id) = 0 THEN 0
             ELSE ROUND((COUNT(CASE WHEN a.status IN ('present', 'OD') THEN 1 END)::decimal / COUNT(a.id)) * 100, 2)
           END
          FROM attendance a
          WHERE a.student_id = $1
            AND a.course_code = sr.course_code
            AND a.slot_year = sr.slot_year
            AND a.semester_type = sr.semester_type
         ) as attendance_percentage,
         -- Count total classes
         (SELECT COUNT(a.id)
          FROM attendance a
          WHERE a.student_id = $1
            AND a.course_code = sr.course_code
            AND a.slot_year = sr.slot_year
            AND a.semester_type = sr.semester_type
         ) as total_classes,
         -- Count present classes
         (SELECT COUNT(CASE WHEN a.status IN ('present', 'OD') THEN 1 END)
          FROM attendance a
          WHERE a.student_id = $1
            AND a.course_code = sr.course_code
            AND a.slot_year = sr.slot_year
            AND a.semester_type = sr.semester_type
         ) as present_classes
       FROM student_registrations sr
       JOIN course c ON sr.course_code = c.course_code
       WHERE sr.enrollment_number = $2
         AND sr.withdrawn = false
       ORDER BY sr.slot_year DESC, sr.semester_type, sr.course_code`,
      [studentId, enrollmentNo]
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Get student courses error:", error);
    res.status(500).json({ message: "Server error while fetching student courses" });
  }
};

// Get detailed attendance for a specific course
exports.getStudentAttendanceReport = async (req, res) => {
  try {
    const studentId = req.userId;
    const { course_code, slot_year, semester_type } = req.params;

    if (!course_code || !slot_year || !semester_type) {
      return res.status(400).json({ message: "Course code, slot year, and semester type are required" });
    }

    // Get course details
    const courseResult = await db.query(
      "SELECT course_name, theory, practical, course_type FROM course WHERE course_code = $1",
      [course_code]
    );

    if (!courseResult.rows.length) {
      return res.status(404).json({ message: "Course not found" });
    }

    const course = courseResult.rows[0];

    // Get detailed attendance records
    const attendanceResult = await db.query(
      `SELECT 
         a.attendance_date,
         a.slot_day,
         a.slot_name,
         a.slot_time,
         a.venue,
         a.status,
         f.name as faculty_name
       FROM attendance a
       JOIN faculty f ON a.employee_id = f.employee_id
       WHERE a.student_id = $1 
         AND a.course_code = $2
         AND a.slot_year = $3
         AND a.semester_type = $4
       ORDER BY a.attendance_date DESC, a.slot_time`,
      [studentId, course_code, slot_year, semester_type]
    );

    // Calculate summary statistics
    const totalClasses = attendanceResult.rows.length;
    const presentClasses = attendanceResult.rows.filter(r => r.status === 'present' || r.status === 'OD').length;
    const absentClasses = attendanceResult.rows.filter(r => r.status === 'absent').length;
    const attendancePercentage = totalClasses > 0 ? Math.round((presentClasses / totalClasses) * 100 * 100) / 100 : 0;

    res.status(200).json({
      course_details: {
        ...course,
        course_code,
        slot_year,
        semester_type
      },
      summary: {
        total_classes: totalClasses,
        present_classes: presentClasses,
        absent_classes: absentClasses,
        attendance_percentage: attendancePercentage,
        minimum_required: course.theory > 0 ? 75 : null,
        meets_requirement: course.theory > 0 ? attendancePercentage >= 75 : true
      },
      attendance_records: attendanceResult.rows
    });

  } catch (error) {
    console.error("Get student attendance report error:", error);
    res.status(500).json({ message: "Server error while fetching attendance report" });
  }
};