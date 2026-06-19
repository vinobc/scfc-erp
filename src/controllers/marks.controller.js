const db = require("../config/db");

// ================== HELPER FUNCTIONS ==================

// Derive assessment type from course code and course type
function deriveAssessmentType(courseCode, courseType, theory = 0, practical = 0) {
  // Course code format: ABC1234 (e.g., CSE2008)
  // First digit after prefix (position 3) determines level
  // 1-4 = UG, 5-6 = PG, 7 = Research
  const levelDigit = parseInt(courseCode.charAt(3));

  let level;
  if (levelDigit >= 1 && levelDigit <= 4) {
    level = "UG";
  } else if (levelDigit >= 5 && levelDigit <= 6) {
    level = "PG";
  } else {
    level = "RESEARCH";
  }

  // Combine with course type
  if (courseType === "T") return `${level}_THEORY`;
  if (courseType === "P") return `${level}_LAB`;
  if (courseType === "TEL") return `${level}_INTEGRATED`;

  // NC (non-credit) — shape by theory/practical hours
  if (courseType === "NC") {
    const t = Number(theory) || 0;
    const p = Number(practical) || 0;
    if (t > 0 && p === 0) return `${level}_THEORY`;
    if (t === 0 && p > 0) return `${level}_LAB`;
    if (t > 0 && p > 0) return `${level}_INTEGRATED`;
    return `${level}_THEORY`;
  }

  return `${level}_THEORY`; // Default fallback
}

// Get default assessment structure based on type
function getDefaultAssessmentStructure(assessmentType) {
  const structures = {
    UG_THEORY: {
      cas: [
        { number: 1, scaledTo: 25 },
        { number: 2, scaledTo: 25 },
        { number: 3, scaledTo: 25 },
      ],
      assignmentTotal: 25,
      maxAssignments: 3,
      labTotal: 0,
    },
    PG_THEORY: {
      cas: [
        { number: 1, scaledTo: 40 },
        { number: 2, scaledTo: 40 },
      ],
      assignmentTotal: 20,
      maxAssignments: 2,
      labTotal: 0,
    },
    UG_INTEGRATED: {
      cas: [
        { number: 1, scaledTo: 20 },
        { number: 2, scaledTo: 20 },
        { number: 3, scaledTo: 20 },
      ],
      assignmentTotal: 10,
      maxAssignments: 3,
      labTotal: 30,
    },
    PG_INTEGRATED: {
      cas: [
        { number: 1, scaledTo: 30 },
        { number: 2, scaledTo: 30 },
      ],
      assignmentTotal: 10,
      maxAssignments: 2,
      labTotal: 30,
    },
    UG_LAB: {
      cas: [],
      assignmentTotal: 0,
      maxAssignments: 0,
      labTotal: 100,
    },
    PG_LAB: {
      cas: [],
      assignmentTotal: 0,
      maxAssignments: 0,
      labTotal: 100,
    },
  };

  return structures[assessmentType] || structures.UG_THEORY;
}

// ================== FACULTY ENDPOINTS ==================

// Get available semesters for faculty based on their allocations
exports.getAvailableSemesters = async (req, res) => {
  try {
    const userId = req.userId;

    // Get user info - allow faculty, timetable_coordinator, and admin
    const userResult = await db.query(
      'SELECT employee_id, role FROM "user" WHERE user_id = $1',
      [userId]
    );

    if (!userResult.rows.length) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = userResult.rows[0];

    // Admin can see all semesters
    if (user.role === "admin") {
      const result = await db.query(
        `SELECT DISTINCT slot_year, semester_type
         FROM faculty_allocation
         ORDER BY slot_year DESC, semester_type`
      );
      return res.status(200).json(result.rows);
    }

    // Faculty and timetable_coordinator see only their allocations
    if (!user.employee_id) {
      return res
        .status(404)
        .json({ message: "User not linked to employee record" });
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
    res
      .status(500)
      .json({ message: "Server error while fetching available semesters" });
  }
};

// Get course offerings for a semester (each slot as separate offering)
exports.getCourseOfferings = async (req, res) => {
  try {
    const userId = req.userId;
    const { slot_year, semester_type } = req.query;

    if (!slot_year || !semester_type) {
      return res
        .status(400)
        .json({ message: "slot_year and semester_type are required" });
    }

    const userResult = await db.query(
      'SELECT employee_id, role FROM "user" WHERE user_id = $1',
      [userId]
    );

    if (!userResult.rows.length) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = userResult.rows[0];
    let employeeCondition = "";
    let params = [slot_year, semester_type];

    // Only Admin can see all courses
    // Coordinators see only their own courses (like faculty)
    if (user.role === "admin") {
      // No employee filter for admin
    } else if (user.employee_id) {
      employeeCondition = "AND fa.employee_id = $3";
      params.push(user.employee_id);
    } else {
      return res
        .status(404)
        .json({ message: "User not linked to employee record" });
    }

    // Get each slot as a separate offering (grouped by slot_name + venue, aggregate day/time)
    const result = await db.query(
      `SELECT
         fa.course_code,
         c.course_name,
         c.course_type,
         c.theory,
         c.practical,
         fa.employee_id,
         f.name as faculty_name,
         fa.slot_name,
         fa.venue,
         STRING_AGG(DISTINCT fa.slot_day || ' ' || fa.slot_time, ', ' ORDER BY fa.slot_day || ' ' || fa.slot_time) as schedule
       FROM faculty_allocation fa
       JOIN course c ON fa.course_code = c.course_code
       JOIN faculty f ON fa.employee_id = f.employee_id
       WHERE fa.slot_year = $1 AND fa.semester_type = $2 ${employeeCondition}
       GROUP BY fa.course_code, c.course_name, c.course_type, c.theory, c.practical,
                fa.employee_id, f.name, fa.slot_name, fa.venue
       ORDER BY fa.course_code, fa.slot_name`,
      params
    );

    // Add assessment type to each course
    const coursesWithType = result.rows.map((course) => {
      const assessmentType = deriveAssessmentType(
        course.course_code,
        course.course_type,
        course.theory,
        course.practical
      );
      return {
        ...course,
        assessment_type: assessmentType,
        assessment_structure: getDefaultAssessmentStructure(assessmentType),
      };
    });

    res.status(200).json(coursesWithType);
  } catch (error) {
    console.error("Get course offerings error:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching course offerings" });
  }
};

// Get assessment type for a course
exports.getAssessmentType = async (req, res) => {
  try {
    const { course_code } = req.params;

    const courseResult = await db.query(
      "SELECT course_code, course_name, course_type, theory, practical FROM course WHERE course_code = $1",
      [course_code]
    );

    if (!courseResult.rows.length) {
      return res.status(404).json({ message: "Course not found" });
    }

    const course = courseResult.rows[0];
    const assessmentType = deriveAssessmentType(
      course.course_code,
      course.course_type,
      course.theory,
      course.practical
    );

    res.status(200).json({
      course_code: course.course_code,
      course_name: course.course_name,
      course_type: course.course_type,
      assessment_type: assessmentType,
      assessment_structure: getDefaultAssessmentStructure(assessmentType),
    });
  } catch (error) {
    console.error("Get assessment type error:", error);
    res
      .status(500)
      .json({ message: "Server error while getting assessment type" });
  }
};

// Get assessment configuration for a course offering (slot-specific)
exports.getAssessmentConfig = async (req, res) => {
  try {
    const { slot_year, semester_type, course_code, employee_id, slot_name, venue, component_type } = req.query;

    if (!slot_year || !semester_type || !course_code || !employee_id || !slot_name || !venue) {
      return res.status(400).json({ message: "Required parameters missing (including slot_name and venue)" });
    }

    const compType = component_type || "THEORY";

    const result = await db.query(
      `SELECT ac.*, c.course_type, c.course_name
       FROM assessment_config ac
       JOIN course c ON ac.course_code = c.course_code
       WHERE ac.slot_year = $1 AND ac.semester_type = $2
         AND ac.course_code = $3 AND ac.employee_id = $4
         AND ac.slot_name = $5 AND ac.venue = $6
         AND ac.component_type = $7`,
      [slot_year, semester_type, course_code, employee_id, slot_name, venue, compType]
    );

    if (!result.rows.length) {
      // Return default structure if no config exists
      const courseResult = await db.query(
        "SELECT course_type, theory, practical FROM course WHERE course_code = $1",
        [course_code]
      );

      if (!courseResult.rows.length) {
        return res.status(404).json({ message: "Course not found" });
      }

      const assessmentType = deriveAssessmentType(
        course_code,
        courseResult.rows[0].course_type,
        courseResult.rows[0].theory,
        courseResult.rows[0].practical
      );

      return res.status(200).json({
        exists: false,
        assessment_type: assessmentType,
        component_type: compType,
        config_json: {},
        default_structure: getDefaultAssessmentStructure(assessmentType),
      });
    }

    res.status(200).json({
      exists: true,
      ...result.rows[0],
    });
  } catch (error) {
    console.error("Get assessment config error:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching assessment config" });
  }
};

// Save assessment configuration (slot-specific)
exports.saveAssessmentConfig = async (req, res) => {
  try {
    const userId = req.userId;
    const {
      slot_year,
      semester_type,
      course_code,
      employee_id,
      slot_name,
      venue,
      component_type,
      config_json,
    } = req.body;

    if (!slot_year || !semester_type || !course_code || !employee_id || !slot_name || !venue) {
      return res.status(400).json({ message: "Required parameters missing (including slot_name and venue)" });
    }

    // Check if user is allowed to configure this course
    const userResult = await db.query(
      'SELECT employee_id, role FROM "user" WHERE user_id = $1',
      [userId]
    );
    const user = userResult.rows[0];

    // Admin can configure any course
    // Faculty/Coordinator can only configure their own courses
    if (user.role !== 'admin') {
      if (user.employee_id !== parseInt(employee_id)) {
        return res.status(403).json({
          message: "You can only configure marks for courses allocated to you"
        });
      }
    }

    const compType = component_type || "THEORY";

    // Get course type to derive assessment type
    const courseResult = await db.query(
      "SELECT course_type, theory, practical FROM course WHERE course_code = $1",
      [course_code]
    );

    if (!courseResult.rows.length) {
      return res.status(404).json({ message: "Course not found" });
    }

    const assessmentType = deriveAssessmentType(
      course_code,
      courseResult.rows[0].course_type,
      courseResult.rows[0].theory,
      courseResult.rows[0].practical
    );

    // Check if config already exists (to detect question structure changes)
    const existingConfig = await db.query(
      `SELECT id, config_json FROM assessment_config
       WHERE slot_year = $1 AND semester_type = $2 AND course_code = $3
         AND employee_id = $4 AND slot_name = $5 AND venue = $6 AND component_type = $7`,
      [slot_year, semester_type, course_code, employee_id, slot_name, venue, compType]
    );

    // Upsert the configuration (slot-specific)
    const result = await db.query(
      `INSERT INTO assessment_config
       (slot_year, semester_type, course_code, employee_id, slot_name, venue, assessment_type, component_type, config_json, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (slot_year, semester_type, course_code, employee_id, slot_name, venue, component_type)
       DO UPDATE SET config_json = $9, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        slot_year,
        semester_type,
        course_code,
        employee_id,
        slot_name,
        venue,
        assessmentType,
        compType,
        JSON.stringify(config_json),
        userId,
      ]
    );

    // If config existed, check if CA question structures changed and clean up old marks
    if (existingConfig.rows.length > 0) {
      const oldConfig = typeof existingConfig.rows[0].config_json === "string"
        ? JSON.parse(existingConfig.rows[0].config_json)
        : existingConfig.rows[0].config_json;
      const newConfig = config_json;
      const configId = result.rows[0].id;

      // Compare each CA's question structure
      const oldCAs = (oldConfig.cas || []);
      const newCAs = (newConfig.cas || []);

      for (const newCA of newCAs) {
        const oldCA = oldCAs.find(c => c.number === newCA.number);
        if (!oldCA) continue; // New CA, no old marks to clean

        // Compare question IDs and max marks
        const oldQs = JSON.stringify((oldCA.questions || []).map(q => ({ id: q.id, maxMarks: q.maxMarks })).sort((a, b) => a.id.localeCompare(b.id)));
        const newQs = JSON.stringify((newCA.questions || []).map(q => ({ id: q.id, maxMarks: q.maxMarks })).sort((a, b) => a.id.localeCompare(b.id)));

        if (oldQs !== newQs) {
          // Question structure changed — delete old marks for this CA
          const deleted = await db.query(
            `DELETE FROM student_marks WHERE assessment_config_id = $1 AND assessment_type = $2`,
            [configId, `CA${newCA.number}`]
          );
          console.log(`Cleaned up ${deleted.rowCount} old marks for CA${newCA.number} (config ${configId}) due to question structure change`);
        }
      }
    }

    res.status(200).json({
      message: "Assessment configuration saved successfully",
      config: result.rows[0],
    });
  } catch (error) {
    console.error("Save assessment config error:", error);
    res
      .status(500)
      .json({ message: "Server error while saving assessment config" });
  }
};

// Get lab sessions from attendance dates (slot-specific)
exports.getLabSessions = async (req, res) => {
  try {
    const { slot_year, semester_type, course_code, employee_id, slot_name, venue } = req.query;

    if (!slot_year || !semester_type || !course_code || !employee_id) {
      return res.status(400).json({ message: "Required parameters missing" });
    }

    // Build query - filter by specific slot if provided
    let query = `SELECT DISTINCT attendance_date, slot_name, venue
       FROM attendance
       WHERE slot_year = $1 AND semester_type = $2
         AND course_code = $3 AND employee_id = $4`;
    let params = [slot_year, semester_type, course_code, employee_id];

    // If slot_name provided, filter by that specific slot
    if (slot_name) {
      query += ` AND slot_name = $5`;
      params.push(slot_name);
      if (venue) {
        query += ` AND venue = $6`;
        params.push(venue);
      }
    } else {
      // Otherwise, only get lab slots
      query += ` AND slot_name LIKE 'L%'`;
    }

    query += ` ORDER BY attendance_date`;

    const result = await db.query(query, params);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Get lab sessions error:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching lab sessions" });
  }
};

// Get enrolled students for marks entry (slot-specific)
exports.getEnrolledStudents = async (req, res) => {
  try {
    const { slot_year, semester_type, course_code, employee_id, slot_name, venue } = req.query;

    if (!slot_year || !semester_type || !course_code || !employee_id) {
      return res.status(400).json({ message: "Required parameters missing" });
    }

    // Get faculty name for matching registrations
    const facultyResult = await db.query(
      "SELECT name FROM faculty WHERE employee_id = $1",
      [employee_id]
    );

    if (!facultyResult.rows.length) {
      return res.status(404).json({ message: "Faculty not found" });
    }

    const facultyName = facultyResult.rows[0].name;

    // Build query - filter by specific slot if provided
    let query = `SELECT DISTINCT
         sr.enrollment_number,
         sr.student_name,
         s.user_id as student_id,
         sr.component_type,
         sr.slot_name,
         sr.venue
       FROM student_registrations sr
       JOIN student s ON sr.enrollment_number = s.enrollment_no
       WHERE sr.slot_year = $1 AND sr.semester_type = $2
         AND sr.course_code = $3 AND sr.faculty_name = $4
         AND sr.withdrawn = false`;
    let params = [slot_year, semester_type, course_code, facultyName];

    // Filter by specific slot if provided.
    // Matches either the exact slot or a composite registration string like
    // "L5+L6, L31+L32" that contains the requested slot as a comma-anchored token.
    if (slot_name) {
      query += ` AND ( sr.slot_name = $5
                       OR ',' || REPLACE(sr.slot_name, ' ', '') || ','
                             LIKE '%,' || REPLACE($5, ' ', '') || ',%' )`;
      params.push(slot_name);
      if (venue) {
        query += ` AND sr.venue = $6`;
        params.push(venue);
      }
    }

    query += ` ORDER BY sr.enrollment_number`;

    const result = await db.query(query, params);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Get enrolled students error:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching enrolled students" });
  }
};

// Get marks entry data for a specific component (slot-specific)
exports.getMarksEntryData = async (req, res) => {
  try {
    const {
      slot_year,
      semester_type,
      course_code,
      employee_id,
      slot_name,
      venue,
      component_type,
      assessment_type,
      assessment_number,
    } = req.query;

    if (!slot_year || !semester_type || !course_code || !employee_id || !slot_name || !venue) {
      return res.status(400).json({ message: "Required parameters missing (including slot_name and venue)" });
    }

    const compType = component_type || "THEORY";
    const assType = assessment_type || "CA1";
    const assNumber = assessment_number || 1;

    // Get assessment config (slot-specific)
    const configResult = await db.query(
      `SELECT * FROM assessment_config
       WHERE slot_year = $1 AND semester_type = $2
         AND course_code = $3 AND employee_id = $4
         AND slot_name = $5 AND venue = $6
         AND component_type = $7`,
      [slot_year, semester_type, course_code, employee_id, slot_name, venue, compType]
    );

    if (!configResult.rows.length) {
      return res.status(404).json({
        message: "Assessment configuration not found. Please configure first.",
      });
    }

    const config = configResult.rows[0];
    const configJson = config.config_json;

    // Check if component is locked
    const lockResult = await db.query(
      `SELECT is_locked FROM marks_entry_lock
       WHERE slot_year = $1 AND semester_type = $2 AND component_type = $3`,
      [slot_year, semester_type, assType]
    );

    const isLocked = lockResult.rows.length > 0 && lockResult.rows[0].is_locked;

    // Get faculty name
    const facultyResult = await db.query(
      "SELECT name FROM faculty WHERE employee_id = $1",
      [employee_id]
    );

    const facultyName = facultyResult.rows[0]?.name;

    // Get students with existing marks (slot-specific)
    const studentsResult = await db.query(
      `SELECT DISTINCT
         sr.enrollment_number,
         sr.student_name,
         s.user_id as student_id
       FROM student_registrations sr
       JOIN student s ON sr.enrollment_number = s.enrollment_no
       WHERE sr.slot_year = $1 AND sr.semester_type = $2
         AND sr.course_code = $3 AND sr.faculty_name = $4
         AND ( sr.slot_name = $5
            OR ',' || REPLACE(sr.slot_name, ' ', '') || ','
                  LIKE '%,' || REPLACE($5, ' ', '') || ',%' )
         AND sr.venue = $6
         AND sr.withdrawn = false
       ORDER BY sr.enrollment_number`,
      [slot_year, semester_type, course_code, facultyName, slot_name, venue]
    );

    // Get existing marks for these students
    const marksResult = await db.query(
      `SELECT enrollment_number, question_id, marks_obtained, max_marks
       FROM student_marks
       WHERE assessment_config_id = $1
         AND assessment_type = $2
         AND assessment_number = $3`,
      [config.id, assType, assNumber]
    );

    // Create a map of marks by enrollment_number
    const marksMap = {};
    marksResult.rows.forEach((mark) => {
      if (!marksMap[mark.enrollment_number]) {
        marksMap[mark.enrollment_number] = {};
      }
      marksMap[mark.enrollment_number][mark.question_id] = {
        marks_obtained: mark.marks_obtained,
        max_marks: mark.max_marks,
      };
    });

    // If this is a lab session, get attendance status for each student
    let attendanceMap = {};
    if (assType === "LAB_SESSION") {
      // Get attendance for the lab date (assessment_number could be the date or session index)
      const labSessions = configJson.labSessions || [];
      const session = labSessions[assNumber - 1];

      if (session && session.date) {
        const attendanceResult = await db.query(
          `SELECT s.enrollment_no, a.status
           FROM student s
           JOIN attendance a ON s.user_id = a.student_id
           WHERE a.slot_year = $1 AND a.semester_type = $2
             AND a.course_code = $3 AND a.employee_id = $4
             AND a.attendance_date = $5
             AND a.slot_name = $6 AND a.venue = $7`,
          [slot_year, semester_type, course_code, employee_id, session.date, slot_name, venue]
        );

        attendanceResult.rows.forEach((record) => {
          attendanceMap[record.enrollment_no] = record.status;
        });
      }
    }

    // Combine students with their marks and attendance
    const studentsWithMarks = studentsResult.rows.map((student) => ({
      ...student,
      marks: marksMap[student.enrollment_number] || {},
      attendance_status: attendanceMap[student.enrollment_number] || null,
    }));

    res.status(200).json({
      config: config,
      config_json: configJson,
      assessment_type: assType,
      assessment_number: assNumber,
      is_locked: isLocked,
      students: studentsWithMarks,
    });
  } catch (error) {
    console.error("Get marks entry data error:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching marks entry data" });
  }
};

// Save marks (bulk)
exports.saveMarks = async (req, res) => {
  try {
    const userId = req.userId;
    const { marks_records, assessment_config_id, assessment_type, assessment_number } = req.body;

    if (!marks_records || !Array.isArray(marks_records) || !assessment_config_id) {
      return res.status(400).json({ message: "marks_records array and assessment_config_id are required" });
    }

    // Get config to verify and check lock status
    const configResult = await db.query(
      "SELECT * FROM assessment_config WHERE id = $1",
      [assessment_config_id]
    );

    if (!configResult.rows.length) {
      return res.status(404).json({ message: "Assessment configuration not found" });
    }

    const config = configResult.rows[0];

    // Check if user is allowed to enter marks for this course
    const userResult = await db.query(
      'SELECT employee_id, role FROM "user" WHERE user_id = $1',
      [userId]
    );
    const user = userResult.rows[0];

    // Admin can enter marks for any course
    // Faculty/Coordinator can only enter marks for their own courses
    if (user.role !== 'admin') {
      if (user.employee_id !== config.employee_id) {
        return res.status(403).json({
          message: "You can only enter marks for courses allocated to you"
        });
      }
    }

    // Check if locked
    // Map assessment_type to lock component_type (LAB_SESSION -> LAB, CA1/CA2/CA3 stay as is, ASSIGNMENT stays as is)
    let lockComponentType = assessment_type;
    if (assessment_type === 'LAB_SESSION') {
      lockComponentType = 'LAB';
    }

    const lockResult = await db.query(
      `SELECT is_locked FROM marks_entry_lock
       WHERE slot_year = $1 AND semester_type = $2 AND component_type = $3`,
      [config.slot_year, config.semester_type, lockComponentType]
    );

    if (lockResult.rows.length > 0 && lockResult.rows[0].is_locked) {
      return res.status(403).json({ message: "Marks entry is locked for this component" });
    }

    const assNumber = assessment_number || 1;

    // Process each marks record
    for (const record of marks_records) {
      const { enrollment_number, student_id, question_id, marks_obtained, max_marks } = record;

      // Validate marks don't exceed max
      if (marks_obtained !== null && marks_obtained > max_marks) {
        return res.status(400).json({
          message: `Invalid marks for ${enrollment_number}, question ${question_id}: ${marks_obtained} exceeds max ${max_marks}`,
        });
      }

      // Upsert the marks record
      await db.query(
        `INSERT INTO student_marks
         (assessment_config_id, enrollment_number, student_id, assessment_type, assessment_number, question_id, marks_obtained, max_marks, entered_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (assessment_config_id, enrollment_number, assessment_type, assessment_number, question_id)
         DO UPDATE SET marks_obtained = $7, entered_by = $9, updated_at = CURRENT_TIMESTAMP`,
        [
          assessment_config_id,
          enrollment_number,
          student_id,
          assessment_type,
          assNumber,
          question_id,
          marks_obtained,
          max_marks,
          userId,
        ]
      );
    }

    res.status(200).json({
      message: "Marks saved successfully",
      count: marks_records.length,
    });
  } catch (error) {
    console.error("Save marks error:", error);
    res.status(500).json({ message: "Server error while saving marks" });
  }
};

// Get marks summary for a course (slot-specific)
exports.getMarksSummary = async (req, res) => {
  try {
    const { slot_year, semester_type, course_code, employee_id, slot_name, venue } = req.query;

    if (!slot_year || !semester_type || !course_code || !employee_id || !slot_name || !venue) {
      return res.status(400).json({ message: "Required parameters missing (including slot_name and venue)" });
    }

    // Get all configs for this course + slot (THEORY and LAB components)
    const configResult = await db.query(
      `SELECT * FROM assessment_config
       WHERE slot_year = $1 AND semester_type = $2
         AND course_code = $3 AND employee_id = $4
         AND slot_name = $5 AND venue = $6`,
      [slot_year, semester_type, course_code, employee_id, slot_name, venue]
    );

    if (!configResult.rows.length) {
      return res.status(404).json({ message: "No assessment configuration found" });
    }

    // Get faculty name
    const facultyResult = await db.query(
      "SELECT name FROM faculty WHERE employee_id = $1",
      [employee_id]
    );

    const facultyName = facultyResult.rows[0]?.name;

    // Get all students (slot-specific)
    const studentsResult = await db.query(
      `SELECT DISTINCT
         sr.enrollment_number,
         sr.student_name
       FROM student_registrations sr
       WHERE sr.slot_year = $1 AND sr.semester_type = $2
         AND sr.course_code = $3 AND sr.faculty_name = $4
         AND ( sr.slot_name = $5
            OR ',' || REPLACE(sr.slot_name, ' ', '') || ','
                  LIKE '%,' || REPLACE($5, ' ', '') || ',%' )
         AND sr.venue = $6
         AND sr.withdrawn = false
       ORDER BY sr.enrollment_number`,
      [slot_year, semester_type, course_code, facultyName, slot_name, venue]
    );

    // Get all marks for all configs
    const configIds = configResult.rows.map((c) => c.id);
    const marksResult = await db.query(
      `SELECT sm.*, ac.component_type, ac.config_json, ac.assessment_type as course_assessment_type
       FROM student_marks sm
       JOIN assessment_config ac ON sm.assessment_config_id = ac.id
       WHERE sm.assessment_config_id = ANY($1)`,
      [configIds]
    );

    // Build summary for each student
    const summaryMap = {};
    studentsResult.rows.forEach((student) => {
      summaryMap[student.enrollment_number] = {
        enrollment_number: student.enrollment_number,
        student_name: student.student_name,
        components: {},
        total_obtained: 0,
        total_max: 0,  // Will accumulate actual max marks from entered components
      };
    });

    // Process marks and calculate totals
    marksResult.rows.forEach((mark) => {
      const student = summaryMap[mark.enrollment_number];
      if (student) {
        const key = `${mark.assessment_type}_${mark.assessment_number}`;
        if (!student.components[key]) {
          student.components[key] = {
            assessment_type: mark.assessment_type,
            assessment_number: mark.assessment_number,
            total_obtained: 0,
            total_max: 0,
            questions: {},
          };
        }
        student.components[key].questions[mark.question_id] = {
          obtained: mark.marks_obtained,
          max: mark.max_marks,
        };
        if (mark.marks_obtained !== null) {
          student.components[key].total_obtained += parseFloat(mark.marks_obtained);
        }
        student.components[key].total_max += parseFloat(mark.max_marks);
      }
    });

    // Calculate scaled totals based on assessment structure
    const configs = {};
    configResult.rows.forEach((c) => {
      configs[c.component_type] = c;
    });

    Object.values(summaryMap).forEach((student) => {
      let grandTotal = 0;
      let grandMax = 0;

      Object.values(student.components).forEach((comp) => {
        if (comp.total_max > 0) {
          grandTotal += comp.total_obtained;
          grandMax += comp.total_max;
        }
      });

      student.total_obtained = grandTotal;
      student.total_max = grandMax;
    });

    res.status(200).json({
      configs: configResult.rows,
      students: Object.values(summaryMap),
    });
  } catch (error) {
    console.error("Get marks summary error:", error);
    res.status(500).json({ message: "Server error while fetching marks summary" });
  }
};

// ================== ADMIN ENDPOINTS ==================

// Get lock status for all components
exports.getLockStatus = async (req, res) => {
  try {
    const { slot_year, semester_type } = req.query;

    if (!slot_year || !semester_type) {
      return res.status(400).json({ message: "slot_year and semester_type are required" });
    }

    const result = await db.query(
      `SELECT * FROM marks_entry_lock
       WHERE slot_year = $1 AND semester_type = $2
       ORDER BY component_type`,
      [slot_year, semester_type]
    );

    // Return all component types with their lock status
    const componentTypes = ["CA1", "CA2", "CA3", "ASSIGNMENT", "LAB"];
    const lockStatus = componentTypes.map((type) => {
      const existing = result.rows.find((r) => r.component_type === type);
      return {
        component_type: type,
        is_locked: existing ? existing.is_locked : false,
        locked_at: existing ? existing.locked_at : null,
        locked_by: existing ? existing.locked_by : null,
      };
    });

    res.status(200).json(lockStatus);
  } catch (error) {
    console.error("Get lock status error:", error);
    res.status(500).json({ message: "Server error while fetching lock status" });
  }
};

// Lock a component
exports.lockComponent = async (req, res) => {
  try {
    const userId = req.userId;
    const { slot_year, semester_type, component_type } = req.body;

    if (!slot_year || !semester_type || !component_type) {
      return res.status(400).json({ message: "Required parameters missing" });
    }

    await db.query(
      `INSERT INTO marks_entry_lock (slot_year, semester_type, component_type, is_locked, locked_by, locked_at)
       VALUES ($1, $2, $3, true, $4, CURRENT_TIMESTAMP)
       ON CONFLICT (slot_year, semester_type, component_type)
       DO UPDATE SET is_locked = true, locked_by = $4, locked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP`,
      [slot_year, semester_type, component_type, userId]
    );

    res.status(200).json({ message: `${component_type} locked successfully` });
  } catch (error) {
    console.error("Lock component error:", error);
    res.status(500).json({ message: "Server error while locking component" });
  }
};

// Unlock a component
exports.unlockComponent = async (req, res) => {
  try {
    const userId = req.userId;
    const { slot_year, semester_type, component_type } = req.body;

    if (!slot_year || !semester_type || !component_type) {
      return res.status(400).json({ message: "Required parameters missing" });
    }

    await db.query(
      `INSERT INTO marks_entry_lock (slot_year, semester_type, component_type, is_locked, locked_by, locked_at)
       VALUES ($1, $2, $3, false, $4, NULL)
       ON CONFLICT (slot_year, semester_type, component_type)
       DO UPDATE SET is_locked = false, locked_by = NULL, locked_at = NULL, updated_at = CURRENT_TIMESTAMP`,
      [slot_year, semester_type, component_type, userId]
    );

    res.status(200).json({ message: `${component_type} unlocked successfully` });
  } catch (error) {
    console.error("Unlock component error:", error);
    res.status(500).json({ message: "Server error while unlocking component" });
  }
};

// ================== STUDENT ENDPOINTS ==================

// Get marks for logged-in student
exports.getMyMarks = async (req, res) => {
  try {
    const userId = req.userId;
    const { slot_year, semester_type, course_code, slot_name } = req.query;

    // Get student enrollment number
    const studentResult = await db.query(
      "SELECT enrollment_no FROM student WHERE user_id = $1",
      [userId]
    );

    if (!studentResult.rows.length) {
      return res.status(404).json({ message: "Student record not found" });
    }

    const enrollmentNo = studentResult.rows[0].enrollment_no;

    // Build query with optional filters.
    // For two-meeting labs the student's registration carries a composite slot
    // (e.g. "L5+L6, L31+L32") while each assessment_config has one of the
    // single slots. LEFT JOIN student_registrations so we surface the student's
    // own registration slot_name and the frontend (which keys on the registration
    // card's slot label) can find the matching course entry.
    let query = `SELECT
         sm.*,
         ac.course_code,
         ac.slot_year,
         ac.semester_type,
         COALESCE(sr.slot_name, ac.slot_name) AS slot_name,
         ac.slot_name AS config_slot_name,
         ac.venue,
         ac.assessment_type as course_assessment_type,
         ac.component_type,
         c.course_name,
         -- labSessions is a positional array; assessment_number=1 -> labSessions[0]
         (ac.config_json -> 'labSessions' -> (sm.assessment_number - 1) ->> 'date') AS session_date
       FROM student_marks sm
       JOIN assessment_config ac ON sm.assessment_config_id = ac.id
       JOIN course c ON ac.course_code = c.course_code
       LEFT JOIN student_registrations sr
         ON sr.enrollment_number = sm.enrollment_number
        AND sr.slot_year         = ac.slot_year
        AND sr.semester_type     = ac.semester_type
        AND sr.course_code       = ac.course_code
        AND sr.venue             = ac.venue
        AND sr.withdrawn         = false
        AND ( sr.slot_name = ac.slot_name
           OR ',' || REPLACE(sr.slot_name, ' ', '') || ','
                 LIKE '%,' || REPLACE(ac.slot_name, ' ', '') || ',%' )
       WHERE sm.enrollment_number = $1`;

    const params = [enrollmentNo];
    let paramIndex = 2;

    // Add optional filters
    if (slot_year) {
      query += ` AND ac.slot_year = $${paramIndex}`;
      params.push(slot_year);
      paramIndex++;
    }
    if (semester_type) {
      query += ` AND ac.semester_type = $${paramIndex}`;
      params.push(semester_type);
      paramIndex++;
    }
    if (course_code) {
      query += ` AND ac.course_code = $${paramIndex}`;
      params.push(course_code);
      paramIndex++;
    }
    if (slot_name) {
      // slot_name from the student card may be a composite (e.g.
      // "L5+L6, L31+L32"). Match the config's single slot against that.
      query += ` AND ( ac.slot_name = $${paramIndex}
                       OR ',' || REPLACE($${paramIndex}, ' ', '') || ','
                             LIKE '%,' || REPLACE(ac.slot_name, ' ', '') || ',%' )`;
      params.push(slot_name);
    }

    query += ` ORDER BY ac.slot_year DESC, ac.semester_type, ac.course_code, ac.slot_name, sm.assessment_type, sm.assessment_number`;

    // Get marks for this student (with optional filters)
    const marksResult = await db.query(query, params);

    // Group by course, semester, and slot
    const courseMarks = {};
    marksResult.rows.forEach((mark) => {
      const key = `${mark.slot_year}_${mark.semester_type}_${mark.course_code}_${mark.slot_name}`;
      if (!courseMarks[key]) {
        courseMarks[key] = {
          slot_year: mark.slot_year,
          semester_type: mark.semester_type,
          course_code: mark.course_code,
          course_name: mark.course_name,
          slot_name: mark.slot_name,
          venue: mark.venue,
          course_assessment_type: mark.course_assessment_type,
          components: {},
        };
      }

      // Lab sessions are split per config slot so a student can see Tuesday's
      // (L5+L6) and Wednesday's (L31+L32) Lab Session 1 as separate rows.
      // Other components (CA, ASSIGNMENT, etc.) continue to aggregate as before.
      const isLabSession = mark.assessment_type === 'LAB_SESSION';
      const compKey = isLabSession
        ? `${mark.assessment_type}_${mark.assessment_number}_${mark.config_slot_name}`
        : `${mark.assessment_type}_${mark.assessment_number}`;
      if (!courseMarks[key].components[compKey]) {
        courseMarks[key].components[compKey] = {
          assessment_type: mark.assessment_type,
          assessment_number: mark.assessment_number,
          config_slot_name: mark.config_slot_name,
          session_date: mark.session_date,
          total_obtained: 0,
          total_max: 0,
        };
      }

      if (mark.marks_obtained !== null) {
        courseMarks[key].components[compKey].total_obtained += parseFloat(mark.marks_obtained);
      }
      courseMarks[key].components[compKey].total_max += parseFloat(mark.max_marks);
    });

    // Convert to the format expected by frontend
    const courses = Object.values(courseMarks).map(course => {
      const marks = Object.values(course.components).map(comp => {
        let component;
        if (comp.assessment_type === 'LAB_SESSION') {
          const dateSuffix = comp.session_date ? ` — ${comp.session_date}` : '';
          component = `Lab Session ${comp.assessment_number} (${comp.config_slot_name}${dateSuffix})`;
        } else if (comp.assessment_type === 'ASSIGNMENT') {
          component = `Assignment ${comp.assessment_number}`;
        } else {
          component = comp.assessment_type;
        }
        return {
          component,
          marks_obtained: comp.total_obtained,
          max_marks: comp.total_max,
        };
      });

      return {
        slot_year: course.slot_year,
        semester_type: course.semester_type,
        course_code: course.course_code,
        course_name: course.course_name,
        slot_name: course.slot_name,
        venue: course.venue,
        marks: marks
      };
    });

    res.status(200).json({
      enrollment_number: enrollmentNo,
      courses: courses,
    });
  } catch (error) {
    console.error("Get my marks error:", error);
    res.status(500).json({ message: "Server error while fetching marks" });
  }
};

// Reset marks for a specific component (delete marks when resetting config)
exports.resetMarks = async (req, res) => {
  try {
    const { assessment_config_id, assessment_type, assessment_number } = req.query;

    if (!assessment_config_id || !assessment_type) {
      return res.status(400).json({ message: "Missing required parameters" });
    }

    // Build the delete query
    let query = `
      DELETE FROM student_marks
      WHERE assessment_config_id = $1 AND assessment_type = $2
    `;
    let params = [assessment_config_id, assessment_type];

    // If assessment_number is provided (for specific assignment), add it to the query
    if (assessment_number) {
      query += ` AND assessment_number = $3`;
      params.push(assessment_number);
    }

    const result = await db.query(query, params);

    res.status(200).json({
      message: `Deleted ${result.rowCount} marks records`,
      deleted_count: result.rowCount,
    });
  } catch (error) {
    console.error("Reset marks error:", error);
    res.status(500).json({ message: "Server error while resetting marks" });
  }
};
