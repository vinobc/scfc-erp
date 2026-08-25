const db = require("../config/db");

// ================== HELPER FUNCTIONS ==================

// Derive the program level ('UG' | 'PG' | 'RESEARCH') from a course_code.
// Same digit-classification rule used by deriveAssessmentType. Used for the
// program-level lock scope: only UG/PG participate; RESEARCH bypasses locks.
function deriveProgramLevel(courseCode) {
  const levelDigit = parseInt(String(courseCode || "").charAt(3));
  if (levelDigit >= 1 && levelDigit <= 4) return "UG";
  if (levelDigit >= 5 && levelDigit <= 6) return "PG";
  return "RESEARCH";
}

// Returns true if marks entry is blocked for this specific
// (component, level, faculty, course, slot, venue).
// Consults the bulk marks_entry_lock table first; if bulk is on, checks
// marks_lock_exception for a matching unlock exception granted by admin/CoE.
// RESEARCH-tier courses bypass everything.
async function isMarksEntryLocked({
  slot_year, semester_type, component_type, program_level,
  employee_id, course_code, slot_name, venue,
}) {
  if (program_level !== "UG" && program_level !== "PG") return false;
  const bulk = await db.query(
    `SELECT 1 FROM marks_entry_lock
     WHERE slot_year = $1 AND semester_type = $2 AND component_type = $3
       AND program_level IN ('ALL', $4)
       AND is_locked = true
     LIMIT 1`,
    [slot_year, semester_type, component_type, program_level]
  );
  if (bulk.rows.length === 0) return false;
  const exc = await db.query(
    `SELECT 1 FROM marks_lock_exception
     WHERE slot_year = $1 AND semester_type = $2 AND component_type = $3
       AND program_level IN ('ALL', $4)
       AND employee_id = $5 AND course_code = $6
       AND slot_name = $7 AND venue = $8
       AND (expires_at IS NULL OR expires_at > NOW())
     LIMIT 1`,
    [slot_year, semester_type, component_type, program_level, employee_id, course_code, slot_name, venue]
  );
  return exc.rows.length === 0;
}

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

    // Admin and CoE see all semesters (CoE drives the lock-controls picker)
    if (user.role === "admin" || user.role === "coe") {
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

    // Policy guard: every CA is conducted for exactly 50 marks; duration is
    // fixed by program level (UG=90 min, PG=120 min). Reject any config that
    // tries to sneak in different values. Applies only when the config carries
    // CA entries (LAB-only configs have no cas array).
    const programLevel = deriveProgramLevel(course_code);
    const requiredDuration = programLevel === "PG" ? 120 : 90;
    const casToCheck = Array.isArray(config_json?.cas) ? config_json.cas : [];
    for (const ca of casToCheck) {
      if (Number(ca.maxMarks) !== 50) {
        return res.status(400).json({
          message: `CA${ca.number} maxMarks must be 50 (received ${ca.maxMarks}).`,
        });
      }
      if (Number(ca.duration) !== requiredDuration) {
        return res.status(400).json({
          message: `CA${ca.number} duration must be ${requiredDuration} minutes for ${programLevel} courses (received ${ca.duration}).`,
        });
      }
    }

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

    // Check if component is locked for this specific (faculty, course, slot).
    // Bulk 'ALL' locks apply to both UG and PG; admin/CoE-granted exceptions
    // can re-open a specific (faculty, course, slot). RESEARCH bypasses.
    const programLevel = deriveProgramLevel(config.course_code);
    const isLocked = await isMarksEntryLocked({
      slot_year,
      semester_type,
      component_type: assType,
      program_level: programLevel,
      employee_id,
      course_code,
      slot_name,
      venue,
    });

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
          `SELECT s.enrollment_no, a.status, a.is_od
           FROM student s
           JOIN attendance a ON s.user_id = a.student_id
           WHERE a.slot_year = $1 AND a.semester_type = $2
             AND a.course_code = $3 AND a.employee_id = $4
             AND a.attendance_date = $5
             AND a.slot_name = $6 AND a.venue = $7`,
          [slot_year, semester_type, course_code, employee_id, session.date, slot_name, venue]
        );

        // OD-exclusion applies prospectively w.e.f. Summer 2025-26 onwards.
        // For older offerings, do not surface is_od — display and totals must
        // match the pre-cutoff behaviour (i.e., what was on awarded grades).
        const odExclusionActive =
          slot_year > "2025-26" ||
          (slot_year === "2025-26" && semester_type === "SUMMER");
        attendanceResult.rows.forEach((record) => {
          attendanceMap[record.enrollment_no] = {
            status: record.status,
            is_od: odExclusionActive ? record.is_od : false,
          };
        });
      }
    }

    // Combine students with their marks and attendance. Surface both status and
    // is_od so the frontend can distinguish a plain absent (auto-0) from an
    // OD session (must be excluded from the student's lab total).
    const studentsWithMarks = studentsResult.rows.map((student) => {
      const att = attendanceMap[student.enrollment_number];
      return {
        ...student,
        marks: marksMap[student.enrollment_number] || {},
        attendance_status: att ? att.status : null,
        attendance_is_od: att ? !!att.is_od : false,
      };
    });

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

    // Program-level lock: 'ALL' bulk locks apply to both UG and PG; admin/CoE
    // exceptions can re-open a specific (faculty, course, slot). RESEARCH bypasses.
    const programLevel = deriveProgramLevel(config.course_code);
    const locked = await isMarksEntryLocked({
      slot_year: config.slot_year,
      semester_type: config.semester_type,
      component_type: lockComponentType,
      program_level: programLevel,
      employee_id: config.employee_id,
      course_code: config.course_code,
      slot_name: config.slot_name,
      venue: config.venue,
    });
    if (locked) {
      return res.status(403).json({
        message: `Marks entry is locked for ${programLevel} courses (${lockComponentType})`,
      });
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

    // Get all marks for all configs.
    // For LAB_SESSION rows, LEFT JOIN attendance so we can identify OD sessions
    // (attendance.is_od=TRUE) and exclude them from per-student totals below.
    // OD-exclusion applies prospectively w.e.f. Summer 2025-26 onwards — the
    // JOIN's semester-cutoff clause ensures pre-cutoff offerings compute
    // totals exactly as they did before the fix (parity with awarded grades).
    const configIds = configResult.rows.map((c) => c.id);
    const marksResult = await db.query(
      `SELECT sm.*, ac.component_type, ac.config_json, ac.assessment_type as course_assessment_type,
              COALESCE(a.is_od, FALSE) AS is_od
       FROM student_marks sm
       JOIN assessment_config ac ON sm.assessment_config_id = ac.id
       LEFT JOIN student st ON st.enrollment_no = sm.enrollment_number
       LEFT JOIN attendance a
         ON sm.assessment_type = 'LAB_SESSION'
        AND a.student_id = st.user_id
        AND a.slot_year = ac.slot_year
        AND a.semester_type = ac.semester_type
        AND a.course_code = ac.course_code
        AND a.employee_id = ac.employee_id
        AND a.slot_name = ac.slot_name
        AND a.venue = ac.venue
        AND a.attendance_date = (
              (ac.config_json -> 'labSessions' -> (sm.assessment_number - 1) ->> 'date')::date
            )
        AND (ac.slot_year > '2025-26'
             OR (ac.slot_year = '2025-26' AND ac.semester_type = 'SUMMER'))
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
        // OD lab sessions must not count towards this student's totals — the
        // student was on official duty; the auto-0 (from being marked absent)
        // should be excluded from both numerator and denominator.
        if (mark.assessment_type === "LAB_SESSION" && mark.is_od) return;
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

// Get lock status for all components × program levels.
// Returns one entry per (component_type, program_level). Program levels:
// 'UG', 'PG', 'ALL' (ALL means lock applies to both UG and PG).
exports.getLockStatus = async (req, res) => {
  try {
    const { slot_year, semester_type } = req.query;

    if (!slot_year || !semester_type) {
      return res.status(400).json({ message: "slot_year and semester_type are required" });
    }

    const result = await db.query(
      `SELECT * FROM marks_entry_lock
       WHERE slot_year = $1 AND semester_type = $2
       ORDER BY component_type, program_level`,
      [slot_year, semester_type]
    );

    const componentTypes = ["CA1", "CA2", "CA3", "ASSIGNMENT", "LAB"];
    const programLevels = ["UG", "PG", "ALL"];
    const lockStatus = [];
    for (const type of componentTypes) {
      for (const level of programLevels) {
        const existing = result.rows.find(
          (r) => r.component_type === type && r.program_level === level
        );
        lockStatus.push({
          component_type: type,
          program_level: level,
          is_locked: existing ? existing.is_locked : false,
          locked_at: existing ? existing.locked_at : null,
          locked_by: existing ? existing.locked_by : null,
        });
      }
    }

    res.status(200).json(lockStatus);
  } catch (error) {
    console.error("Get lock status error:", error);
    res.status(500).json({ message: "Server error while fetching lock status" });
  }
};

// Lock a component for a specific program level (UG, PG, or ALL).
exports.lockComponent = async (req, res) => {
  try {
    const userId = req.userId;
    const { slot_year, semester_type, component_type } = req.body;
    const program_level = req.body.program_level || "ALL";

    if (!slot_year || !semester_type || !component_type) {
      return res.status(400).json({ message: "Required parameters missing" });
    }
    if (!["UG", "PG", "ALL"].includes(program_level)) {
      return res.status(400).json({ message: "program_level must be UG, PG, or ALL" });
    }

    await db.query(
      `INSERT INTO marks_entry_lock (slot_year, semester_type, component_type, program_level, is_locked, locked_by, locked_at)
       VALUES ($1, $2, $3, $4, true, $5, CURRENT_TIMESTAMP)
       ON CONFLICT (slot_year, semester_type, component_type, program_level)
       DO UPDATE SET is_locked = true, locked_by = $5, locked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP`,
      [slot_year, semester_type, component_type, program_level, userId]
    );

    res.status(200).json({ message: `${component_type} locked for ${program_level}` });
  } catch (error) {
    console.error("Lock component error:", error);
    res.status(500).json({ message: "Server error while locking component" });
  }
};

// Unlock a component for a specific program level.
exports.unlockComponent = async (req, res) => {
  try {
    const userId = req.userId;
    const { slot_year, semester_type, component_type } = req.body;
    const program_level = req.body.program_level || "ALL";

    if (!slot_year || !semester_type || !component_type) {
      return res.status(400).json({ message: "Required parameters missing" });
    }
    if (!["UG", "PG", "ALL"].includes(program_level)) {
      return res.status(400).json({ message: "program_level must be UG, PG, or ALL" });
    }

    await db.query(
      `INSERT INTO marks_entry_lock (slot_year, semester_type, component_type, program_level, is_locked, locked_by, locked_at)
       VALUES ($1, $2, $3, $4, false, $5, NULL)
       ON CONFLICT (slot_year, semester_type, component_type, program_level)
       DO UPDATE SET is_locked = false, locked_by = NULL, locked_at = NULL, updated_at = CURRENT_TIMESTAMP`,
      [slot_year, semester_type, component_type, program_level, userId]
    );

    res.status(200).json({ message: `${component_type} unlocked for ${program_level}` });
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
    // Publish gate: student only sees marks whose (config, type, number) has
    // an entry in marks_publish_state. Faculty controls this via the Publish
    // button on the entry form.
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
       JOIN marks_publish_state mps
         ON  mps.assessment_config_id = sm.assessment_config_id
         AND mps.assessment_type      = sm.assessment_type
         AND mps.assessment_number    = sm.assessment_number
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

// ================== CONSOLIDATED MARKS & GRADE REPORT ==================

// Safely parse config_json which may already be an object.
function parseConfigJson(cfg) {
  if (!cfg) return {};
  const raw = cfg.config_json;
  if (!raw) return {};
  return typeof raw === "string" ? JSON.parse(raw) : raw;
}

// Decompose a compound slot_name like "L5+L6, L31+L32" into ["L5+L6","L31+L32"].
// Non-compound slot_name returns [slot_name].
function decomposeSlot(slot_name) {
  if (typeof slot_name !== "string") return [];
  if (slot_name.includes(",")) {
    return slot_name.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [slot_name];
}

// Compute Grading Type per CoE policy:
//   • Standalone Lab (course_type='P'), Non-credit ('NC'), Project ('PRJ') → always Absolute
//   • Pure Theory ('T'): this theory slot's roster ≥30 → Relative, else Absolute
//   • TEL — THEORY slot view: this theory slot's roster ≥30 → Relative, else Absolute
//   • TEL — LAB slot view: each student's grading follows THEIR theory section
//     (returned as a per-student map; header shows a note instead of one label)
//   • RESEARCH / unknown → 'N/A'
//
// Returns { header, per_student }.  `per_student` is either null or a map
// { enrollment_number → 'Relative' | 'Absolute' }.
async function computeGradingType({
  course_type,
  assessment_type,
  primary_component_type,   // 'THEORY' | 'LAB'
  class_strength,           // this slot's roster count
  slot_year,
  semester_type,
  course_code,
  enrollment_numbers,       // for TEL lab views, needed to look up theory sections
}) {
  // Absolute-always types.
  if (course_type === "P" || course_type === "NC" || course_type === "PRJ") {
    return { header: "Absolute", per_student: null };
  }

  const isTel = assessment_type === "UG_INTEGRATED" || assessment_type === "PG_INTEGRATED";
  const isTheory = assessment_type === "UG_THEORY" || assessment_type === "PG_THEORY";

  // Pure Theory OR TEL viewing the theory slot: use this slot's roster.
  if (isTheory || (isTel && primary_component_type === "THEORY")) {
    return {
      header: class_strength >= 30 ? "Relative" : "Absolute",
      per_student: null,
    };
  }

  // TEL viewing the LAB slot: per-student, based on their theory section's strength.
  if (isTel && primary_component_type === "LAB") {
    if (!enrollment_numbers || enrollment_numbers.length === 0) {
      return { header: "Per student's theory section", per_student: {} };
    }
    // For each student on the lab roster, find their THEORY registration for
    // this course-semester (via the assessment_config with component_type='THEORY'
    // matching the (slot, venue) they registered under), and how many peers are
    // in that theory slot.
    const res = await db.query(
      `WITH sr_theory AS (
         SELECT sr.enrollment_number, ac.slot_name, ac.venue
         FROM student_registrations sr
         JOIN assessment_config ac
           ON  ac.slot_year     = sr.slot_year
           AND ac.semester_type = sr.semester_type
           AND ac.course_code   = sr.course_code
           AND ac.slot_name     = sr.slot_name
           AND ac.venue         = sr.venue
           AND ac.component_type = 'THEORY'
         WHERE sr.slot_year = $1 AND sr.semester_type = $2
           AND sr.course_code = $3
           AND sr.enrollment_number = ANY($4::text[])
           AND (sr.withdrawn IS NULL OR sr.withdrawn = false)
       )
       SELECT srt.enrollment_number,
              (SELECT COUNT(DISTINCT sr2.enrollment_number)
                 FROM student_registrations sr2
                WHERE sr2.slot_year = $1 AND sr2.semester_type = $2
                  AND sr2.course_code = $3
                  AND sr2.slot_name = srt.slot_name
                  AND sr2.venue     = srt.venue
                  AND (sr2.withdrawn IS NULL OR sr2.withdrawn = false)) AS theory_strength
       FROM sr_theory srt`,
      [slot_year, semester_type, course_code, enrollment_numbers]
    );
    const per_student = {};
    for (const r of res.rows) {
      per_student[r.enrollment_number] = Number(r.theory_strength) >= 30 ? "Relative" : "Absolute";
    }
    return { header: "Per student's theory section", per_student };
  }

  // RESEARCH or anything else not covered by policy.
  return { header: "N/A", per_student: null };
}

// Build the per-student component breakdown for a course-slot (may include a
// THEORY config + one or more LAB configs, e.g. for TEL or SUMMER compound labs).
//
// Returns { assessment_type, weightages, ca_actual_max, im_actual_max, lab_actual_max,
//           lab_sessions_total, students: [ { enrollment_number, student_name, school,
//           program_code, components: {CA1|CA2|CA3|IM|LAB: {entered, actual, actual_max,
//           converted, weightage, sessions_done?, sessions_total?}}, grand_total, pending: []
//           } ], stats: {...} }.
async function computeConsolidatedReport(configs, students) {
  const theoryConfig = configs.find((c) => c.component_type === "THEORY");
  const labConfigs = configs.filter((c) => c.component_type === "LAB");

  // Assessment type: prefer THEORY, fall back to any LAB config.
  const assessmentType =
    (theoryConfig && theoryConfig.assessment_type) ||
    (labConfigs[0] && labConfigs[0].assessment_type) ||
    null;

  const theoryJson = theoryConfig ? parseConfigJson(theoryConfig) : {};
  const labJsons = labConfigs.map((c) => parseConfigJson(c));
  // Defaults are only used as a fallback for scaled totals (assignmentTotal /
  // labTotal / CA scaledTo) when a config exists but a field is missing on it.
  // Never used to invent columns that shouldn't exist.
  const defaults = assessmentType ? getDefaultAssessmentStructure(assessmentType) : { cas: [], assignmentTotal: 0, labTotal: 0 };

  // CA structure comes strictly from THEORY config — no defaults fallback so
  // a LAB-only view doesn't hallucinate CA columns. If scaledTo is missing on
  // a CA, fall back to the default for that CA number.
  const caList = (theoryJson.cas || []).filter((c) => c && c.number);
  const caWeightages = {};
  const caActualMax = {}; // per CA: sum of question max_marks
  for (const ca of caList) {
    const key = `CA${ca.number}`;
    let scaledTo = Number(ca.scaledTo);
    if (!scaledTo) {
      const dCa = (defaults.cas || []).find((d) => d.number === ca.number);
      scaledTo = dCa ? Number(dCa.scaledTo) : 0;
    }
    caWeightages[key] = scaledTo;
    caActualMax[key] = (ca.questions || []).reduce(
      (sum, q) => sum + (Number(q.maxMarks) || 0),
      0
    );
  }

  // Assignment (IM) — visible only when THEORY config exists AND has assignments.
  // Weightage: prefer config's assignmentTotal; fall back to defaults for this
  // assessment type (some older configs don't persist assignmentTotal).
  const hasAssignments = theoryConfig && Array.isArray(theoryJson.assignments) && theoryJson.assignments.length > 0;
  const assignmentTotal = hasAssignments
    ? (Number(theoryJson.assignmentTotal) || Number(defaults.assignmentTotal) || 0)
    : 0;
  const imActualMax = ((theoryJson.assignments || []).reduce(
    (sum, a) => {
      const qMax = (a.questions || []).reduce((s, q) => s + (Number(q.maxMarks) || 0), 0);
      // If assignment has no questions listed, fall back to its maxMarks field.
      return sum + (qMax > 0 ? qMax : (Number(a.maxMarks) || 0));
    },
    0
  ));

  // Lab — visible only when LAB config(s) exist AND have sessions. Weightage:
  // prefer first LAB config's labTotal; fall back to defaults.
  const hasAnyLabSessions = labJsons.some((lj) => Array.isArray(lj.labSessions) && lj.labSessions.length > 0);
  const labTotal = hasAnyLabSessions
    ? (Number(labJsons[0].labTotal) || Number(defaults.labTotal) || 0)
    : 0;
  let labActualMax = 0;
  let labSessionsTotal = 0;
  for (const lj of labJsons) {
    for (const s of (lj.labSessions || [])) {
      labActualMax += Number(s.maxMarks) || 0;
      labSessionsTotal += 1;
    }
  }

  const weightages = { ...caWeightages, IM: assignmentTotal, LAB: labTotal };

  // Fetch marks for every config in one query.
  // For LAB_SESSION rows, LEFT JOIN attendance so we can identify OD sessions
  // (attendance.is_od=TRUE) and skip them from the LAB aggregation below.
  // OD-exclusion applies prospectively w.e.f. Summer 2025-26 onwards — the
  // JOIN's semester-cutoff clause keeps pre-cutoff totals identical to the
  // pre-fix behaviour (parity with grades already awarded).
  const configIds = configs.map((c) => c.id);
  const marksRes = configIds.length
    ? await db.query(
        `SELECT sm.enrollment_number, sm.assessment_config_id, sm.assessment_type,
                sm.assessment_number, sm.question_id, sm.marks_obtained, sm.max_marks,
                COALESCE(a.is_od, FALSE) AS is_od
         FROM student_marks sm
         JOIN assessment_config ac ON ac.id = sm.assessment_config_id
         LEFT JOIN student st ON st.enrollment_no = sm.enrollment_number
         LEFT JOIN attendance a
           ON sm.assessment_type = 'LAB_SESSION'
          AND a.student_id = st.user_id
          AND a.slot_year = ac.slot_year
          AND a.semester_type = ac.semester_type
          AND a.course_code = ac.course_code
          AND a.employee_id = ac.employee_id
          AND a.slot_name = ac.slot_name
          AND a.venue = ac.venue
          AND a.attendance_date = (
                (ac.config_json -> 'labSessions' -> (sm.assessment_number - 1) ->> 'date')::date
              )
          AND (ac.slot_year > '2025-26'
               OR (ac.slot_year = '2025-26' AND ac.semester_type = 'SUMMER'))
         WHERE sm.assessment_config_id = ANY($1::int[])`,
        [configIds]
      )
    : { rows: [] };

  // Publish gate: only marks belonging to a (config_id, assessment_type,
  // assessment_number) that has a marks_publish_state row are considered.
  // Unpublished marks are hidden from students AND from the Consolidated card
  // (both student self-view and faculty View Grades).
  const publishedKeys = await fetchPublishedKeySet(configIds);
  const isPublished = (m) =>
    publishedKeys.has(`${m.assessment_config_id}|${m.assessment_type}|${m.assessment_number}`);

  // Per-component published flags (used by the frontend to distinguish
  // "Not published yet" from "Not entered").
  // A "component" here maps to the UI column: CA1 / CA2 / CA3 / IM / LAB.
  // CAs: single entry per theory config (assessment_number always 1).
  // IM:  published if ANY assignment is published.
  // LAB: published if ANY lab session (across all lab configs) is published.
  const componentPublished = {};
  const theoryConfigId = theoryConfig ? theoryConfig.id : null;
  for (const ca of caList) {
    componentPublished[`CA${ca.number}`] =
      theoryConfigId != null &&
      publishedKeys.has(`${theoryConfigId}|CA${ca.number}|1`);
  }
  if (hasAssignments) {
    componentPublished.IM = Array.from(publishedKeys).some((k) => {
      const [cid, type] = k.split("|");
      return Number(cid) === theoryConfigId && type === "ASSIGNMENT";
    });
  }
  const labConfigIds = new Set(labConfigs.map((c) => c.id));
  if (labTotal > 0) {
    componentPublished.LAB = Array.from(publishedKeys).some((k) => {
      const [cid, type] = k.split("|");
      return labConfigIds.has(Number(cid)) && type === "LAB_SESSION";
    });
  }

  const labConfigIdSet = new Set(labConfigs.map((c) => c.id));

  // Per-student accumulator.
  const perStudent = {};
  for (const s of students) {
    perStudent[s.enrollment_number] = {
      enrollment_number: s.enrollment_number,
      student_name: s.student_name,
      school: s.school || null,
      program_code: s.program_code || null,
      _ca: {},           // key CA1|CA2|CA3 → { obt, max, hasEntry }
      _im: { obt: 0, max: 0, hasEntry: false },
      _lab: { obt: 0, max: 0, sessions_done: 0, sessions_recorded: 0 },
    };
  }

  for (const m of marksRes.rows) {
    const rec = perStudent[m.enrollment_number];
    if (!rec) continue;
    // Publish gate: silently drop unpublished marks so downstream aggregation
    // reflects only what students are meant to see.
    if (!isPublished(m)) continue;
    const obtained = m.marks_obtained !== null ? parseFloat(m.marks_obtained) : null;
    const max = m.max_marks !== null ? parseFloat(m.max_marks) : 0;

    if (m.assessment_type === "CA1" || m.assessment_type === "CA2" || m.assessment_type === "CA3") {
      const key = m.assessment_type;
      if (!rec._ca[key]) rec._ca[key] = { obt: 0, max: 0, hasEntry: false };
      if (obtained !== null) {
        rec._ca[key].obt += obtained;
        rec._ca[key].hasEntry = true;
      }
      rec._ca[key].max += max;
    } else if (m.assessment_type === "ASSIGNMENT") {
      if (obtained !== null) {
        rec._im.obt += obtained;
        rec._im.hasEntry = true;
      }
      rec._im.max += max;
    } else if (m.assessment_type === "LAB_SESSION" && labConfigIdSet.has(m.assessment_config_id)) {
      // Skip OD lab sessions — student was on official duty, auto-0 must not
      // count against them. Neither the denominator (sessions_recorded, max)
      // nor the numerator (sessions_done, obt) should include this row.
      if (m.is_od) continue;
      rec._lab.sessions_recorded += 1;
      if (obtained !== null) {
        rec._lab.obt += obtained;
        rec._lab.sessions_done += 1;
      }
      rec._lab.max += max;
    }
  }

  // Build final per-student component payload.
  const studentsOut = students.map((s) => {
    const rec = perStudent[s.enrollment_number];
    const components = {};
    const pending = [];

    // CA columns — only include CA numbers present in caList.
    // Use per-student bucket.max as denominator so cross-section merges compute
    // correctly (student may not have records for every question in the config).
    for (const ca of caList) {
      const key = `CA${ca.number}`;
      const w = caWeightages[key] || 0;
      const bucket = rec._ca[key];
      const perStudentMax = bucket ? bucket.max : 0;
      const entered = bucket && bucket.hasEntry && perStudentMax > 0;
      const actual = entered ? bucket.obt : null;
      const converted = entered
        ? Number(((bucket.obt / perStudentMax) * w).toFixed(2))
        : null;
      components[key] = {
        entered,
        actual,
        actual_max: perStudentMax || caActualMax[key] || 0,
        converted,
        weightage: w,
        published: !!componentPublished[key],
      };
      if (!entered && w > 0) pending.push(key);
    }

    // IM — only if there's an assignment weightage; scale by per-student max.
    if (assignmentTotal > 0) {
      const bucket = rec._im;
      const entered = bucket.hasEntry && bucket.max > 0;
      const converted = entered
        ? Number(((bucket.obt / bucket.max) * assignmentTotal).toFixed(2))
        : null;
      components.IM = {
        entered,
        actual: entered ? bucket.obt : null,
        actual_max: bucket.max || imActualMax,
        converted,
        weightage: assignmentTotal,
        published: !!componentPublished.IM,
      };
      if (!entered) pending.push("IM");
    }

    // LAB — only if there's a lab weightage; scale by per-student max.
    // sessions_total is per-student too (how many session records exist for
    // THIS student), so cross-section merges don't inflate the denominator.
    if (labTotal > 0) {
      const bucket = rec._lab;
      const entered = bucket.sessions_done > 0 && bucket.max > 0;
      const converted = entered
        ? Number(((bucket.obt / bucket.max) * labTotal).toFixed(2))
        : null;
      components.LAB = {
        entered,
        actual: entered ? bucket.obt : null,
        actual_max: bucket.max,
        sessions_done: bucket.sessions_done,
        sessions_total: bucket.sessions_recorded,
        converted,
        weightage: labTotal,
        published: !!componentPublished.LAB,
      };
      if (!entered) pending.push("LAB");
    }

    const grand_total = Object.values(components).reduce(
      (sum, c) => sum + (c.converted != null ? c.converted : 0),
      0
    );

    return {
      enrollment_number: s.enrollment_number,
      student_name: s.student_name,
      school: s.school || null,
      program_code: s.program_code || null,
      components,
      grand_total: Number(grand_total.toFixed(2)),
      pending,
    };
  });

  // Class stats (only students with at least one component entered count as "filled").
  const filled = studentsOut.filter((s) => s.pending.length < Object.keys(s.components).length);
  const nonZeroTotals = studentsOut.filter((s) => Object.values(s.components).some((c) => c.entered)).map((s) => s.grand_total);
  const n = nonZeroTotals.length;
  const avg = n ? nonZeroTotals.reduce((a, b) => a + b, 0) / n : 0;
  const sumSqDev = n ? nonZeroTotals.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) : 0;
  // Population SD (÷N) — mathematically correct when the class IS the full population.
  // Sample SD (÷(N-1)) — matches Excel STDEV / STDEV.S. Report both.
  const stddevPop = n ? Math.sqrt(sumSqDev / n) : 0;
  const stddevSample = n > 1 ? Math.sqrt(sumSqDev / (n - 1)) : 0;
  // Component-level publish summary — used by frontend to show a hint like
  // "N of M components published" and to render "Not published yet" cells.
  const componentKeys = Object.keys(componentPublished);
  const publishedCount = componentKeys.filter((k) => componentPublished[k]).length;
  const totalComponents = componentKeys.length;

  const stats = {
    total_count: studentsOut.length,
    filled_count: filled.length,
    avg: Number(avg.toFixed(2)),
    stddev: Number(stddevPop.toFixed(2)),           // population (kept for back-compat)
    stddev_pop: Number(stddevPop.toFixed(2)),
    stddev_sample: Number(stddevSample.toFixed(2)),
    published_components: publishedCount,
    total_components: totalComponents,
    highest: n ? Number(Math.max(...nonZeroTotals).toFixed(2)) : 0,
    lowest: n ? Number(Math.min(...nonZeroTotals).toFixed(2)) : 0,
  };

  return {
    assessment_type: assessmentType,
    weightages,
    ca_actual_max: caActualMax,
    im_actual_max: imActualMax,
    lab_actual_max: labActualMax,
    lab_sessions_total: labSessionsTotal,
    students: studentsOut,
    stats,
  };
}

// GET /marks/consolidated — Faculty/Coordinator/Admin view: full class roster with
// grand-total-out-of-100 breakdown for one course-slot-faculty.
// Handles TEL (THEORY + LAB configs merged). Does NOT expand compound slots
// (faculty allocations are pair-level; compound expansion happens in the student
// endpoint and the COE report endpoint).
exports.getConsolidatedReport = async (req, res) => {
  try {
    const { slot_year, semester_type, course_code, employee_id, slot_name, venue } = req.query;

    if (!slot_year || !semester_type || !course_code || !employee_id || !slot_name || !venue) {
      return res.status(400).json({ message: "Required parameters missing (slot_year, semester_type, course_code, employee_id, slot_name, venue)" });
    }

    // Primary config for the exact slot+venue the faculty clicked.
    const primaryConfigRes = await db.query(
      `SELECT ac.*, c.course_name, c.course_type, c.theory, c.practical, c.credits,
              f.name as faculty_name
       FROM assessment_config ac
       JOIN course c ON ac.course_code = c.course_code
       JOIN faculty f ON ac.employee_id = f.employee_id
       WHERE ac.slot_year = $1 AND ac.semester_type = $2
         AND ac.course_code = $3 AND ac.employee_id = $4
         AND ac.slot_name = $5 AND ac.venue = $6`,
      [slot_year, semester_type, course_code, employee_id, slot_name, venue]
    );

    if (!primaryConfigRes.rows.length) {
      return res.status(404).json({ message: "No assessment configuration found for this course-slot" });
    }

    const info = primaryConfigRes.rows[0];

    // Roster for this slot — SUMMER-tolerant: student compound registration includes this pair.
    const studentsRes = await db.query(
      `SELECT DISTINCT sr.enrollment_number, sr.student_name, sr.program_code,
              sc.school_short_name AS school
       FROM student_registrations sr
       LEFT JOIN student st ON sr.enrollment_number = st.enrollment_no
       LEFT JOIN program p ON st.program_id = p.program_id
       LEFT JOIN school sc ON p.school_id = sc.school_id
       WHERE sr.slot_year = $1 AND sr.semester_type = $2
         AND sr.course_code = $3 AND sr.faculty_name = $4
         AND ( sr.slot_name = $5
            OR ',' || REPLACE(sr.slot_name, ' ', '') || ','
                  LIKE '%,' || REPLACE($5, ' ', '') || ',%' )
         AND sr.venue = $6
         AND (sr.withdrawn IS NULL OR sr.withdrawn = false)
       ORDER BY sr.enrollment_number`,
      [slot_year, semester_type, course_code, info.faculty_name, slot_name, venue]
    );

    const roster = studentsRes.rows;

    // Sibling configs — for TEL courses the same student may be registered in a
    // separate slot (e.g. theory in E1 / lab in L19+L20) with its own assessment
    // config. Look up every distinct (slot_name, venue, faculty_name) tuple the
    // roster students are registered under for this course, then fetch matching
    // assessment_configs. Dedupe by config.id against the primary.
    let allConfigs = [...primaryConfigRes.rows];
    if (roster.length) {
      const enrollments = roster.map((r) => r.enrollment_number);
      const siblingRegsRes = await db.query(
        `SELECT DISTINCT sr.slot_name, sr.venue, sr.faculty_name
         FROM student_registrations sr
         WHERE sr.slot_year = $1 AND sr.semester_type = $2
           AND sr.course_code = $3
           AND sr.enrollment_number = ANY($4::text[])
           AND (sr.withdrawn IS NULL OR sr.withdrawn = false)`,
        [slot_year, semester_type, course_code, enrollments]
      );

      const siblingTuples = siblingRegsRes.rows.filter(
        (t) => !(t.slot_name === slot_name && t.venue === venue && t.faculty_name === info.faculty_name)
      );

      if (siblingTuples.length) {
        // Query configs for each sibling (slot, venue, faculty) tuple using
        // multi-arg UNNEST as a table function — the reliable pg way to zip
        // three parallel arrays into rows and JOIN on them.
        const slotNames = siblingTuples.map((t) => t.slot_name);
        const venues = siblingTuples.map((t) => t.venue);
        const facultyNames = siblingTuples.map((t) => t.faculty_name);
        const siblingConfigsRes = await db.query(
          `SELECT ac.*, c.course_name, c.course_type, c.theory, c.practical, c.credits,
                  f.name as faculty_name
           FROM assessment_config ac
           JOIN course c ON ac.course_code = c.course_code
           JOIN faculty f ON ac.employee_id = f.employee_id
           JOIN UNNEST($4::text[], $5::text[], $6::text[]) AS t(sn, vn, fn)
             ON ac.slot_name = t.sn AND ac.venue = t.vn AND f.name = t.fn
           WHERE ac.slot_year = $1 AND ac.semester_type = $2
             AND ac.course_code = $3`,
          [slot_year, semester_type, course_code, slotNames, venues, facultyNames]
        );

        const seenIds = new Set(allConfigs.map((c) => c.id));
        for (const cfg of siblingConfigsRes.rows) {
          if (!seenIds.has(cfg.id)) {
            allConfigs.push(cfg);
            seenIds.add(cfg.id);
          }
        }
      }
    }

    const report = await computeConsolidatedReport(allConfigs, roster);

    // Grading Type per CoE policy: theory-slot roster ≥30 for T/TEL-theory
    // views; per-student (based on theory section) for TEL-lab views; Absolute
    // for standalone Lab/NC/PRJ.
    const gradingResult = await computeGradingType({
      course_type: info.course_type,
      assessment_type: report.assessment_type,
      primary_component_type: info.component_type,
      class_strength: roster.length,
      slot_year,
      semester_type,
      course_code,
      enrollment_numbers: roster.map((r) => r.enrollment_number),
    });
    report.stats.grading_type = gradingResult.header;
    if (gradingResult.per_student) {
      for (const s of report.students) {
        s.grading_type = gradingResult.per_student[s.enrollment_number] || "N/A";
      }
    }

    // Sibling info surfaced so the UI can inform faculty which slots were merged.
    const siblingSlots = allConfigs
      .filter((c) => !(c.slot_name === slot_name && c.venue === venue))
      .map((c) => ({
        slot_name: c.slot_name,
        venue: c.venue,
        component_type: c.component_type,
        faculty_name: c.faculty_name,
      }));

    return res.status(200).json({
      course: {
        course_code: info.course_code,
        course_name: info.course_name,
        course_type: info.course_type,
        theory: info.theory,
        practical: info.practical,
        credits: info.credits,
        slot_name,
        venue,
        faculty_name: info.faculty_name,
        employee_id: info.employee_id,
        slot_year,
        semester_type,
      },
      sibling_slots: siblingSlots,
      ...report,
    });
  } catch (error) {
    console.error("Get consolidated report error:", error);
    res.status(500).json({ message: "Server error while fetching consolidated report" });
  }
};

// GET /marks/student/my-consolidated?slot_year=&semester_type=&course_code=&slot_name=
// Student self-view of their consolidated marks for one course.
// slot_name may be compound (e.g. "L5+L6, L31+L32" for SUMMER labs) — decompose
// and fetch all matching pair-configs so lab sessions merge across pairs.
exports.getMyConsolidatedReport = async (req, res) => {
  try {
    const userId = req.userId;
    const { slot_year, semester_type, course_code, slot_name } = req.query;

    if (!slot_year || !semester_type || !course_code || !slot_name) {
      return res.status(400).json({ message: "Required parameters missing (slot_year, semester_type, course_code, slot_name)" });
    }

    const stuRes = await db.query(
      `SELECT enrollment_no FROM student WHERE user_id = $1`,
      [userId]
    );
    if (!stuRes.rows.length) {
      return res.status(404).json({ message: "Student record not found" });
    }
    const enrollmentNo = stuRes.rows[0].enrollment_no;

    // Resolve student's registration for this course/slot to identify faculty and venue.
    const regRes = await db.query(
      `SELECT sr.faculty_name, sr.venue, sr.slot_name AS reg_slot_name, sr.student_name, sr.program_code,
              sc.school_short_name AS school
       FROM student_registrations sr
       LEFT JOIN student st ON sr.enrollment_number = st.enrollment_no
       LEFT JOIN program p ON st.program_id = p.program_id
       LEFT JOIN school sc ON p.school_id = sc.school_id
       WHERE sr.enrollment_number = $1
         AND sr.slot_year = $2 AND sr.semester_type = $3
         AND sr.course_code = $4
         AND ( sr.slot_name = $5
            OR ',' || REPLACE(sr.slot_name, ' ', '') || ','
                  LIKE '%,' || REPLACE($5, ' ', '') || ',%' )
         AND (sr.withdrawn IS NULL OR sr.withdrawn = false)
       LIMIT 1`,
      [enrollmentNo, slot_year, semester_type, course_code, slot_name]
    );
    if (!regRes.rows.length) {
      return res.status(404).json({ message: "Registration not found for this course-slot" });
    }
    const reg = regRes.rows[0];

    // Get ALL of this student's registrations for this course in this semester —
    // for TEL the theory (E1) and lab (L19+L20) are separate registration rows.
    const allRegsRes = await db.query(
      `SELECT DISTINCT sr.slot_name, sr.venue, sr.faculty_name
       FROM student_registrations sr
       WHERE sr.enrollment_number = $1
         AND sr.slot_year = $2 AND sr.semester_type = $3
         AND sr.course_code = $4
         AND (sr.withdrawn IS NULL OR sr.withdrawn = false)`,
      [enrollmentNo, slot_year, semester_type, course_code]
    );

    // For each registration, decompose the slot_name (may be compound for SUMMER
    // labs), and collect (slot, venue, faculty) tuples for the config lookup.
    const slotNames = [];
    const venues = [];
    const facultyNames = [];
    for (const r of allRegsRes.rows) {
      for (const sn of decomposeSlot(r.slot_name)) {
        slotNames.push(sn);
        venues.push(r.venue);
        facultyNames.push(r.faculty_name);
      }
    }

    const configRes = await db.query(
      `SELECT ac.*, c.course_name, c.course_type, c.theory, c.practical, c.credits,
              f.name as faculty_name
       FROM assessment_config ac
       JOIN course c ON ac.course_code = c.course_code
       JOIN faculty f ON ac.employee_id = f.employee_id
       JOIN UNNEST($4::text[], $5::text[], $6::text[]) AS t(sn, vn, fn)
         ON ac.slot_name = t.sn AND ac.venue = t.vn AND f.name = t.fn
       WHERE ac.slot_year = $1 AND ac.semester_type = $2
         AND ac.course_code = $3`,
      [slot_year, semester_type, course_code, slotNames, venues, facultyNames]
    );

    if (!configRes.rows.length) {
      return res.status(404).json({ message: "No assessment configuration found" });
    }

    const info = configRes.rows[0];
    const students = [{
      enrollment_number: enrollmentNo,
      student_name: reg.student_name,
      program_code: reg.program_code,
      school: reg.school,
    }];

    const report = await computeConsolidatedReport(configRes.rows, students);

    // Grading Type per CoE policy. A student in a TEL course belongs to exactly
    // one theory section — we always compute via that theory section (treat the
    // student's view as if primary_component_type='LAB' so the helper looks up
    // per-student theory strength). For pure Theory / P / NC / PRJ, the header
    // rule is fine.
    // Pick the primary component_type as THEORY if there's a theory config in
    // the fetched set (typical for T and TEL), else LAB (pure lab courses).
    const hasTheoryConfig = configRes.rows.some((c) => c.component_type === "THEORY");
    const gradingResult = await computeGradingType({
      course_type: info.course_type,
      assessment_type: report.assessment_type,
      // For TEL always resolve per-student (student's theory section), regardless
      // of which slot they clicked. Otherwise theory-slot rules apply.
      primary_component_type: (report.assessment_type === "UG_INTEGRATED" || report.assessment_type === "PG_INTEGRATED")
        ? "LAB"
        : (hasTheoryConfig ? "THEORY" : "LAB"),
      class_strength: 1,   // unused for TEL-lab branch; unused for Absolute types
      slot_year,
      semester_type,
      course_code,
      enrollment_numbers: [enrollmentNo],
    });
    report.stats.grading_type = gradingResult.header;
    if (gradingResult.per_student) {
      for (const s of report.students) {
        s.grading_type = gradingResult.per_student[s.enrollment_number] || "N/A";
      }
    }

    // For pure Theory (T type), the student's grading type is also this theory
    // slot's strength — recompute since class_strength=1 above was a placeholder.
    if (report.assessment_type === "UG_THEORY" || report.assessment_type === "PG_THEORY") {
      const strengthRes = await db.query(
        `SELECT COUNT(DISTINCT sr.enrollment_number)::int AS n
         FROM student_registrations sr
         WHERE sr.slot_year = $1 AND sr.semester_type = $2
           AND sr.course_code = $3 AND sr.slot_name = $4 AND sr.venue = $5
           AND (sr.withdrawn IS NULL OR sr.withdrawn = false)`,
        [slot_year, semester_type, course_code, reg.reg_slot_name, reg.venue]
      );
      const theoryStrength = strengthRes.rows[0] ? strengthRes.rows[0].n : 0;
      report.stats.grading_type = theoryStrength >= 30 ? "Relative" : "Absolute";
    }

    return res.status(200).json({
      course: {
        course_code: info.course_code,
        course_name: info.course_name,
        course_type: info.course_type,
        theory: info.theory,
        practical: info.practical,
        credits: info.credits,
        slot_name: reg.reg_slot_name,
        venue: reg.venue,
        faculty_name: info.faculty_name,
        slot_year,
        semester_type,
      },
      ...report,
    });
  } catch (error) {
    console.error("Get my consolidated report error:", error);
    res.status(500).json({ message: "Server error while fetching consolidated report" });
  }
};

// Export the shared helper so reports.controller.js can reuse the exact math for XLSX.
exports._computeConsolidatedReport = computeConsolidatedReport;
exports._computeGradingType = computeGradingType;
exports._decomposeSlot = decomposeSlot;

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

// ================== PUBLISH GATE ==================
// Faculty saves marks (drafts). Students see nothing until faculty explicitly
// publishes each component. Publish is per-component-instance:
//   • CA1 / CA2 / CA3  → assessment_number = 1
//   • ASSIGNMENT       → per assignment number
//   • LAB_SESSION      → per session index
// Presence of a marks_publish_state row = published. Absence = draft.

// Helper: ensure the caller can publish/unpublish this config.
// Admin: any config. Faculty/Coordinator: must be the config's owner (employee_id).
async function assertCanTogglePublish(req, assessment_config_id) {
  const configRes = await db.query(
    `SELECT employee_id FROM assessment_config WHERE id = $1`,
    [assessment_config_id]
  );
  if (!configRes.rows.length) return { ok: false, code: 404, message: "Configuration not found" };
  if (req.userRole === "admin") return { ok: true };

  const userRes = await db.query('SELECT employee_id FROM "user" WHERE user_id = $1', [req.userId]);
  const ownEmpId = userRes.rows.length ? userRes.rows[0].employee_id : null;
  if (ownEmpId !== configRes.rows[0].employee_id) {
    return { ok: false, code: 403, message: "You can only publish marks for your own courses" };
  }
  return { ok: true };
}

// POST /marks/publish { assessment_config_id, assessment_type, assessment_number }
exports.publishComponent = async (req, res) => {
  try {
    const { assessment_config_id, assessment_type } = req.body;
    const assessment_number = req.body.assessment_number || 1;
    if (!assessment_config_id || !assessment_type) {
      return res.status(400).json({ message: "assessment_config_id and assessment_type are required" });
    }
    const guard = await assertCanTogglePublish(req, assessment_config_id);
    if (!guard.ok) return res.status(guard.code).json({ message: guard.message });

    await db.query(
      `INSERT INTO marks_publish_state (assessment_config_id, assessment_type, assessment_number, published_by, published_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       ON CONFLICT (assessment_config_id, assessment_type, assessment_number)
       DO UPDATE SET published_by = $4, published_at = CURRENT_TIMESTAMP`,
      [assessment_config_id, assessment_type, assessment_number, req.userId]
    );
    res.status(200).json({ message: "Published", published: true });
  } catch (error) {
    console.error("Publish component error:", error);
    res.status(500).json({ message: "Server error while publishing" });
  }
};

// POST /marks/unpublish { assessment_config_id, assessment_type, assessment_number }
exports.unpublishComponent = async (req, res) => {
  try {
    const { assessment_config_id, assessment_type } = req.body;
    const assessment_number = req.body.assessment_number || 1;
    if (!assessment_config_id || !assessment_type) {
      return res.status(400).json({ message: "assessment_config_id and assessment_type are required" });
    }
    const guard = await assertCanTogglePublish(req, assessment_config_id);
    if (!guard.ok) return res.status(guard.code).json({ message: guard.message });

    const result = await db.query(
      `DELETE FROM marks_publish_state
       WHERE assessment_config_id = $1 AND assessment_type = $2 AND assessment_number = $3`,
      [assessment_config_id, assessment_type, assessment_number]
    );
    res.status(200).json({ message: "Unpublished", published: false, deleted: result.rowCount });
  } catch (error) {
    console.error("Unpublish component error:", error);
    res.status(500).json({ message: "Server error while unpublishing" });
  }
};

// GET /marks/publish-status?assessment_config_id=…
// Returns all publish rows for one config: [{ assessment_type, assessment_number, published_at, published_by }]
exports.getPublishStatus = async (req, res) => {
  try {
    const { assessment_config_id } = req.query;
    if (!assessment_config_id) {
      return res.status(400).json({ message: "assessment_config_id is required" });
    }
    const result = await db.query(
      `SELECT assessment_type, assessment_number, published_at, published_by
       FROM marks_publish_state
       WHERE assessment_config_id = $1`,
      [assessment_config_id]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Get publish status error:", error);
    res.status(500).json({ message: "Server error while fetching publish status" });
  }
};

// Helper used by the read paths (student endpoints and Consolidated report):
// given a set of assessment_config_ids, fetch the published component
// instances. Returns a Set<string> of keys "config_id|assessment_type|number"
// so callers can filter their marks rows in JS.
async function fetchPublishedKeySet(config_ids) {
  if (!Array.isArray(config_ids) || config_ids.length === 0) return new Set();
  const res = await db.query(
    `SELECT assessment_config_id, assessment_type, assessment_number
     FROM marks_publish_state
     WHERE assessment_config_id = ANY($1::int[])`,
    [config_ids]
  );
  const set = new Set();
  for (const r of res.rows) {
    set.add(`${r.assessment_config_id}|${r.assessment_type}|${r.assessment_number}`);
  }
  return set;
}
exports._fetchPublishedKeySet = fetchPublishedKeySet;

// ================== MARKS LOCK EXCEPTIONS (admin / CoE) ==================

// List active exceptions for a semester. Optional component_type filter.
// expires_at is returned as ISO-ish text via TO_CHAR to sidestep the
// JS-Date-in-UTC drift we hit on the attendance-range feature.
exports.listMarksLockExceptions = async (req, res) => {
  try {
    const { slot_year, semester_type, component_type } = req.query;
    if (!slot_year || !semester_type) {
      return res.status(400).json({ message: "slot_year and semester_type are required" });
    }
    const params = [slot_year, semester_type];
    let where = "e.slot_year = $1 AND e.semester_type = $2";
    if (component_type) {
      params.push(component_type);
      where += ` AND e.component_type = $${params.length}`;
    }
    const result = await db.query(
      `SELECT e.id, e.slot_year, e.semester_type, e.component_type, e.program_level,
              e.employee_id, e.course_code, e.slot_name, e.venue,
              TO_CHAR(e.expires_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS expires_at,
              e.granted_by, e.granted_at,
              f.name AS faculty_name,
              u.username AS granted_by_username
       FROM marks_lock_exception e
       LEFT JOIN faculty f ON f.employee_id = e.employee_id
       LEFT JOIN "user" u ON u.user_id = e.granted_by
       WHERE ${where}
       ORDER BY e.granted_at DESC, e.id DESC`,
      params
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("List marks lock exceptions error:", error);
    res.status(500).json({ message: "Server error while listing marks lock exceptions" });
  }
};

// Add an unlock exception. Effective immediately; grants save access to the
// specific (faculty, course, slot, venue) for the component even while the
// bulk lock is on. Optional expires_at silently ends the grant.
exports.addMarksLockException = async (req, res) => {
  try {
    const userId = req.userId;
    const {
      slot_year, semester_type, component_type, program_level,
      employee_id, course_code, slot_name, venue,
      expires_at,
    } = req.body;
    if (!slot_year || !semester_type || !component_type || !program_level ||
        !employee_id || !course_code || !slot_name || !venue) {
      return res.status(400).json({ message: "Required parameters missing" });
    }
    if (!["UG", "PG", "ALL"].includes(program_level)) {
      return res.status(400).json({ message: "program_level must be UG, PG, or ALL" });
    }
    if (expires_at) {
      const parsed = new Date(expires_at);
      if (isNaN(parsed.getTime())) {
        return res.status(400).json({ message: "expires_at is not a valid datetime" });
      }
    }
    const result = await db.query(
      `INSERT INTO marks_lock_exception
        (slot_year, semester_type, component_type, program_level,
         employee_id, course_code, slot_name, venue, expires_at, granted_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id`,
      [slot_year, semester_type, component_type, program_level,
       employee_id, course_code, slot_name, venue, expires_at || null, userId]
    );
    res.status(201).json({ id: result.rows[0].id, message: "Exception added" });
  } catch (error) {
    console.error("Add marks lock exception error:", error);
    res.status(500).json({ message: "Server error while adding marks lock exception" });
  }
};

exports.deleteMarksLockException = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: "id is required" });
    const result = await db.query(
      `DELETE FROM marks_lock_exception WHERE id = $1`,
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Exception not found" });
    }
    res.status(200).json({ message: "Exception removed" });
  } catch (error) {
    console.error("Delete marks lock exception error:", error);
    res.status(500).json({ message: "Server error while deleting marks lock exception" });
  }
};

// Faculty-facing effective lock status per component for a specific
// (course, faculty, slot). Returns rows shaped like /admin/locks so the
// existing dashboard renderer can consume it. Considers bulk locks AND any
// active exceptions applied to this specific slot.
exports.getEffectiveLocks = async (req, res) => {
  try {
    const { slot_year, semester_type, course_code, employee_id, slot_name, venue } = req.query;
    if (!slot_year || !semester_type || !course_code || !employee_id || !slot_name || !venue) {
      return res.status(400).json({ message: "Required parameters missing" });
    }
    const programLevel = deriveProgramLevel(course_code);
    const components = ["CA1", "CA2", "CA3", "ASSIGNMENT", "LAB"];
    const rows = await Promise.all(
      components.map(async (ct) => {
        const locked = await isMarksEntryLocked({
          slot_year,
          semester_type,
          component_type: ct,
          program_level: programLevel,
          employee_id,
          course_code,
          slot_name,
          venue,
        });
        // program_level=ALL mimics the "applies to this course" shape the
        // frontend's isComponentLockedForCourse helper already expects.
        return { component_type: ct, program_level: "ALL", is_locked: locked };
      })
    );
    res.status(200).json(rows);
  } catch (error) {
    console.error("Get effective locks error:", error);
    res.status(500).json({ message: "Server error while fetching effective locks" });
  }
};

// Feed the admin/CoE UI's cascading Faculty → Course → Slot dropdowns.
// Returns distinct (employee_id, faculty_name, course_code, slot_name, venue)
// from faculty_allocation. Client-side filters the cascade — no per-cascade
// round trips.
exports.getFacultyAllocationsForSemester = async (req, res) => {
  try {
    const { slot_year, semester_type } = req.query;
    if (!slot_year || !semester_type) {
      return res.status(400).json({ message: "slot_year and semester_type are required" });
    }
    const result = await db.query(
      `SELECT DISTINCT fa.employee_id, f.name AS faculty_name,
              fa.course_code, fa.slot_name, fa.venue
       FROM faculty_allocation fa
       JOIN faculty f ON f.employee_id = fa.employee_id
       WHERE fa.slot_year = $1 AND fa.semester_type = $2
       ORDER BY f.name, fa.course_code, fa.slot_name, fa.venue`,
      [slot_year, semester_type]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Get faculty allocations error:", error);
    res.status(500).json({ message: "Server error while fetching faculty allocations" });
  }
};
