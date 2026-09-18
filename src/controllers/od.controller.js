const db = require("../config/db");

// Helper: parse slot time string to minutes since midnight (from faculty-allocation.controller.js)
function parseSlotTimeRange(timeStr) {
  const cleanStr = timeStr.replace(/–/g, "-");
  const [startStr, endStr] = cleanStr.split("-");

  const parseTime = (str) => {
    const [hours, mins] = str.trim().split(".").map(Number);
    let h = hours;
    if (h < 8) h += 12; // 1.15 -> 13:15, 4.00 -> 16:00
    return h * 60 + (mins || 0);
  };

  return { start: parseTime(startStr), end: parseTime(endStr) };
}

// Helper: convert HH:MM (24h) time to minutes since midnight
function timeToMinutes(timeStr) {
  const [hours, mins] = timeStr.split(":").map(Number);
  return hours * 60 + (mins || 0);
}

// Helper: check if two time ranges overlap
function timesOverlap(range1, range2) {
  return range1.start < range2.end && range2.start < range1.end;
}

// Helper: get day abbreviation from date
function getDayOfWeek(dateStr) {
  const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  return days[new Date(dateStr).getDay()];
}

// Core: Auto-mark OD for a student in an activity
async function autoMarkOD(
  activityId,
  enrollmentNumber,
  activityDate,
  startTime,
  endTime,
  slotYear,
  semesterType,
  recordedBy
) {
  const dayOfWeek = getDayOfWeek(activityDate);
  if (dayOfWeek === "SUN" || dayOfWeek === "SAT") return;

  // Get student's user_id
  const studentResult = await db.query(
    "SELECT user_id FROM student WHERE enrollment_no = $1",
    [enrollmentNumber]
  );
  if (!studentResult.rows.length) return;
  const studentId = studentResult.rows[0].user_id;

  // Find student's timetable for that day
  const timetableResult = await db.query(
    `SELECT DISTINCT
       fa.slot_year, fa.semester_type, fa.course_code, fa.employee_id,
       fa.venue, fa.slot_day, fa.slot_name, fa.slot_time
     FROM student_registrations sr
     JOIN faculty_allocation fa ON
       fa.slot_year = sr.slot_year
       AND fa.semester_type = sr.semester_type
       AND fa.course_code = sr.course_code
       AND fa.venue = sr.venue
       AND (sr.slot_name = fa.slot_name OR sr.slot_name LIKE '%' || fa.slot_name || '%')
     WHERE sr.enrollment_number = $1
       AND sr.slot_year = $2
       AND sr.semester_type = $3
       AND fa.slot_day = $4
       AND sr.withdrawn = false`,
    [enrollmentNumber, slotYear, semesterType, dayOfWeek]
  );

  // Parse activity time and apply 10-minute buffer
  const activityStart = timeToMinutes(startTime) - 10;
  const activityEnd = timeToMinutes(endTime) + 10;
  const activityRange = { start: activityStart, end: activityEnd };

  // For each slot, check overlap and insert OD
  for (const slot of timetableResult.rows) {
    const slotRange = parseSlotTimeRange(slot.slot_time);

    if (timesOverlap(activityRange, slotRange)) {
      await db.query(
        `INSERT INTO attendance
         (student_id, slot_year, semester_type, course_code, employee_id, venue,
          slot_day, slot_name, slot_time, attendance_date, status, is_od, recorded_by, od_activity_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NULL, true, $11, $12)
         ON CONFLICT (student_id, slot_year, semester_type, course_code, employee_id, venue, slot_day, slot_name, slot_time, attendance_date)
         DO UPDATE SET is_od = true, od_activity_id = $12, updated_at = CURRENT_TIMESTAMP`,
        [
          studentId,
          slot.slot_year,
          slot.semester_type,
          slot.course_code,
          slot.employee_id,
          slot.venue,
          slot.slot_day,
          slot.slot_name,
          slot.slot_time,
          activityDate,
          recordedBy,
          activityId,
        ]
      );
    }
  }
}

// Helper: remove OD attendance records for a student in an activity
async function removeODRecords(activityId, enrollmentNumber) {
  const studentResult = await db.query(
    "SELECT user_id FROM student WHERE enrollment_no = $1",
    [enrollmentNumber]
  );
  if (!studentResult.rows.length) return;

  const studentId = studentResult.rows[0].user_id;
  // If faculty already marked attendance, just clear OD flag; otherwise delete the record
  await db.query(
    "UPDATE attendance SET is_od = false, od_activity_id = NULL WHERE od_activity_id = $1 AND student_id = $2 AND status IS NOT NULL",
    [activityId, studentId]
  );
  await db.query(
    "DELETE FROM attendance WHERE od_activity_id = $1 AND student_id = $2 AND status IS NULL",
    [activityId, studentId]
  );
}

// Helper: remove all OD records for an activity
async function removeAllODRecordsForActivity(activityId) {
  // Preserve faculty-marked records, just clear OD flag
  await db.query(
    "UPDATE attendance SET is_od = false, od_activity_id = NULL WHERE od_activity_id = $1 AND status IS NOT NULL",
    [activityId]
  );
  // Delete auto-created records where faculty never marked
  await db.query(
    "DELETE FROM attendance WHERE od_activity_id = $1 AND status IS NULL",
    [activityId]
  );
}

// ==================== DSW Event Management ====================

// Create an OD event
exports.createEvent = async (req, res) => {
  try {
    const { event_name, slot_year, semester_type, coordinator_employee_id } =
      req.body;

    if (
      !event_name ||
      !slot_year ||
      !semester_type ||
      !coordinator_employee_id
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Verify faculty exists
    const facultyCheck = await db.query(
      "SELECT employee_id, name FROM faculty WHERE employee_id = $1 AND is_active = true",
      [coordinator_employee_id]
    );
    if (!facultyCheck.rows.length) {
      return res
        .status(404)
        .json({ message: "Faculty coordinator not found or inactive" });
    }

    // Check for duplicate event (same name, year, semester)
    const dupCheck = await db.query(
      `SELECT event_id FROM od_event WHERE event_name = $1 AND slot_year = $2 AND semester_type = $3`,
      [event_name, slot_year, semester_type]
    );
    if (dupCheck.rows.length > 0) {
      return res.status(409).json({ message: "An event with the same name already exists for this year and semester" });
    }

    const result = await db.query(
      `INSERT INTO od_event (event_name, slot_year, semester_type, coordinator_employee_id, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [event_name, slot_year, semester_type, coordinator_employee_id, req.userId]
    );

    res.status(201).json({
      message: "Event created successfully",
      event: result.rows[0],
    });
  } catch (error) {
    console.error("Create OD event error:", error);
    res
      .status(500)
      .json({ message: "Server error while creating OD event" });
  }
};

// Get OD events (DSW sees all, faculty sees their own)
exports.getEvents = async (req, res) => {
  try {
    const { slot_year, semester_type } = req.query;

    let query = `
      SELECT e.*, f.name as coordinator_name, s.school_short_name as coordinator_school,
             (SELECT COUNT(*) FROM od_activity WHERE event_id = e.event_id) as activity_count
      FROM od_event e
      JOIN faculty f ON e.coordinator_employee_id = f.employee_id
      LEFT JOIN school s ON f.school_id = s.school_id
    `;
    const params = [];
    const conditions = [];

    // If faculty or timetable_coordinator role, only show their events
    if (req.userRole === "faculty" || req.userRole === "timetable_coordinator") {
      const userResult = await db.query(
        'SELECT employee_id FROM "user" WHERE user_id = $1',
        [req.userId]
      );
      if (!userResult.rows.length || !userResult.rows[0].employee_id) {
        return res.status(200).json({ events: [] });
      }
      conditions.push(`e.coordinator_employee_id = $${params.length + 1}`);
      params.push(userResult.rows[0].employee_id);
    }

    if (slot_year) {
      conditions.push(`e.slot_year = $${params.length + 1}`);
      params.push(slot_year);
    }
    if (semester_type) {
      conditions.push(`e.semester_type = $${params.length + 1}`);
      params.push(semester_type);
    }

    if (conditions.length) {
      query += " WHERE " + conditions.join(" AND ");
    }
    query += " ORDER BY e.created_at DESC";

    const result = await db.query(query, params);
    res.status(200).json({ events: result.rows });
  } catch (error) {
    console.error("Get OD events error:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching OD events" });
  }
};

// Delete an OD event (cascades to activities and students, cleans up attendance)
exports.deleteEvent = async (req, res) => {
  try {
    const { eventId } = req.params;

    // First remove all OD attendance records for all activities in this event
    await db.query(
      `DELETE FROM attendance WHERE od_activity_id IN
       (SELECT activity_id FROM od_activity WHERE event_id = $1)`,
      [eventId]
    );

    // Delete the event (cascades to activities and activity_students)
    const result = await db.query(
      "DELETE FROM od_event WHERE event_id = $1 RETURNING *",
      [eventId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.status(200).json({ message: "Event deleted successfully" });
  } catch (error) {
    console.error("Delete OD event error:", error);
    res
      .status(500)
      .json({ message: "Server error while deleting OD event" });
  }
};

// Search faculty for autocomplete
exports.searchFaculty = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.status(200).json({ faculty: [] });
    }

    const result = await db.query(
      `SELECT f.name, f.employee_id, s.school_short_name
       FROM faculty f
       LEFT JOIN school s ON f.school_id = s.school_id
       WHERE (f.name ILIKE '%' || $1 || '%' OR CAST(f.employee_id AS TEXT) LIKE '%' || $1 || '%')
         AND f.is_active = true
       ORDER BY f.name
       LIMIT 20`,
      [q]
    );

    res.status(200).json({ faculty: result.rows });
  } catch (error) {
    console.error("Search faculty error:", error);
    res
      .status(500)
      .json({ message: "Server error while searching faculty" });
  }
};

// ==================== Faculty Coordinator Activity Management ====================

// Get event details with activities
exports.getEventDetails = async (req, res) => {
  try {
    const { eventId } = req.params;

    // Get event
    const eventResult = await db.query(
      `SELECT e.*, f.name as coordinator_name, s.school_short_name as coordinator_school
       FROM od_event e
       JOIN faculty f ON e.coordinator_employee_id = f.employee_id
       LEFT JOIN school s ON f.school_id = s.school_id
       WHERE e.event_id = $1`,
      [eventId]
    );

    if (!eventResult.rows.length) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Verify access: faculty can only see their own events
    if (req.userRole === "faculty") {
      const userResult = await db.query(
        'SELECT employee_id FROM "user" WHERE user_id = $1',
        [req.userId]
      );
      if (
        !userResult.rows.length ||
        userResult.rows[0].employee_id !==
          eventResult.rows[0].coordinator_employee_id
      ) {
        return res
          .status(403)
          .json({ message: "Not authorized to view this event" });
      }
    }

    // Get activities with student counts
    const activitiesResult = await db.query(
      `SELECT a.*,
              (SELECT COUNT(*) FROM od_activity_student WHERE activity_id = a.activity_id) as student_count
       FROM od_activity a
       WHERE a.event_id = $1
       ORDER BY a.activity_date, a.start_time`,
      [eventId]
    );

    res.status(200).json({
      event: eventResult.rows[0],
      activities: activitiesResult.rows,
    });
  } catch (error) {
    console.error("Get event details error:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching event details" });
  }
};

// Create activity under an event
exports.createActivity = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { activity_name, activity_date, start_time, end_time } = req.body;

    if (!activity_name || !activity_date || !start_time || !end_time) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Verify event exists and user is coordinator
    const eventResult = await db.query(
      "SELECT * FROM od_event WHERE event_id = $1",
      [eventId]
    );
    if (!eventResult.rows.length) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (req.userRole === "faculty") {
      const userResult = await db.query(
        'SELECT employee_id FROM "user" WHERE user_id = $1',
        [req.userId]
      );
      if (
        !userResult.rows.length ||
        userResult.rows[0].employee_id !==
          eventResult.rows[0].coordinator_employee_id
      ) {
        return res
          .status(403)
          .json({ message: "Not authorized to manage this event" });
      }
    }

    // Check for duplicate activity (same name and date in the same event)
    const dupCheck = await db.query(
      `SELECT activity_id FROM od_activity WHERE event_id = $1 AND activity_name = $2 AND activity_date = $3`,
      [eventId, activity_name, activity_date]
    );
    if (dupCheck.rows.length > 0) {
      return res.status(409).json({ message: "An activity with the same name already exists for this date" });
    }

    const result = await db.query(
      `INSERT INTO od_activity (event_id, activity_name, activity_date, start_time, end_time)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [eventId, activity_name, activity_date, start_time, end_time]
    );

    res.status(201).json({
      message: "Activity created successfully",
      activity: result.rows[0],
    });
  } catch (error) {
    console.error("Create activity error:", error);
    res
      .status(500)
      .json({ message: "Server error while creating activity" });
  }
};

// Update activity
exports.updateActivity = async (req, res) => {
  try {
    const { activityId } = req.params;
    const { activity_name, activity_date, start_time, end_time } = req.body;

    if (!activity_name || !activity_date || !start_time || !end_time) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Get current activity and event
    const activityResult = await db.query(
      `SELECT a.*, e.coordinator_employee_id, e.slot_year, e.semester_type
       FROM od_activity a JOIN od_event e ON a.event_id = e.event_id
       WHERE a.activity_id = $1`,
      [activityId]
    );
    if (!activityResult.rows.length) {
      return res.status(404).json({ message: "Activity not found" });
    }

    // Verify access
    if (req.userRole === "faculty") {
      const userResult = await db.query(
        'SELECT employee_id FROM "user" WHERE user_id = $1',
        [req.userId]
      );
      if (
        !userResult.rows.length ||
        userResult.rows[0].employee_id !==
          activityResult.rows[0].coordinator_employee_id
      ) {
        return res
          .status(403)
          .json({ message: "Not authorized to update this activity" });
      }
    }

    // Update the activity
    await db.query(
      `UPDATE od_activity SET activity_name = $1, activity_date = $2, start_time = $3, end_time = $4, updated_at = CURRENT_TIMESTAMP
       WHERE activity_id = $5`,
      [activity_name, activity_date, start_time, end_time, activityId]
    );

    // Recalculate OD for all students in this activity (date/time may have changed)
    await removeAllODRecordsForActivity(activityId);

    const students = await db.query(
      "SELECT enrollment_number FROM od_activity_student WHERE activity_id = $1",
      [activityId]
    );

    const event = activityResult.rows[0];
    for (const student of students.rows) {
      await autoMarkOD(
        parseInt(activityId),
        student.enrollment_number,
        activity_date,
        start_time,
        end_time,
        event.slot_year,
        event.semester_type,
        req.userId
      );
    }

    res.status(200).json({ message: "Activity updated successfully" });
  } catch (error) {
    console.error("Update activity error:", error);
    res
      .status(500)
      .json({ message: "Server error while updating activity" });
  }
};

// Delete activity
exports.deleteActivity = async (req, res) => {
  try {
    const { activityId } = req.params;

    // Get activity and verify access
    const activityResult = await db.query(
      `SELECT a.*, e.coordinator_employee_id
       FROM od_activity a JOIN od_event e ON a.event_id = e.event_id
       WHERE a.activity_id = $1`,
      [activityId]
    );
    if (!activityResult.rows.length) {
      return res.status(404).json({ message: "Activity not found" });
    }

    if (req.userRole === "faculty") {
      const userResult = await db.query(
        'SELECT employee_id FROM "user" WHERE user_id = $1',
        [req.userId]
      );
      if (
        !userResult.rows.length ||
        userResult.rows[0].employee_id !==
          activityResult.rows[0].coordinator_employee_id
      ) {
        return res
          .status(403)
          .json({ message: "Not authorized to delete this activity" });
      }
    }

    // Remove OD attendance records first
    await removeAllODRecordsForActivity(activityId);

    // Delete activity (cascades to od_activity_student)
    await db.query("DELETE FROM od_activity WHERE activity_id = $1", [
      activityId,
    ]);

    res.status(200).json({ message: "Activity deleted successfully" });
  } catch (error) {
    console.error("Delete activity error:", error);
    res
      .status(500)
      .json({ message: "Server error while deleting activity" });
  }
};

// Get students in an activity
exports.getActivityStudents = async (req, res) => {
  try {
    const { activityId } = req.params;

    const result = await db.query(
      `SELECT oas.id, oas.enrollment_number, oas.created_at,
              s.student_name, s.school_name, s.program_name
       FROM od_activity_student oas
       JOIN student s ON oas.enrollment_number = s.enrollment_no
       WHERE oas.activity_id = $1
       ORDER BY oas.enrollment_number`,
      [activityId]
    );

    res.status(200).json({ students: result.rows });
  } catch (error) {
    console.error("Get activity students error:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching activity students" });
  }
};

// Add student to activity
exports.addStudentToActivity = async (req, res) => {
  try {
    const { activityId } = req.params;
    const { enrollment_number } = req.body;

    if (!enrollment_number) {
      return res
        .status(400)
        .json({ message: "Enrollment number is required" });
    }

    // Verify student exists
    const studentCheck = await db.query(
      "SELECT enrollment_no, student_name FROM student WHERE enrollment_no = $1",
      [enrollment_number]
    );
    if (!studentCheck.rows.length) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Get activity and event details
    const activityResult = await db.query(
      `SELECT a.*, e.coordinator_employee_id, e.slot_year, e.semester_type
       FROM od_activity a JOIN od_event e ON a.event_id = e.event_id
       WHERE a.activity_id = $1`,
      [activityId]
    );
    if (!activityResult.rows.length) {
      return res.status(404).json({ message: "Activity not found" });
    }

    // Block adding students to future-dated activities
    const activityDate = new Date(activityResult.rows[0].activity_date);
    const today = new Date();
    activityDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    if (activityDate > today) {
      return res.status(400).json({
        message: "Cannot add students to future-dated activities. Students can only be added on or after the activity date.",
      });
    }

    // Verify access
    if (req.userRole === "faculty") {
      const userResult = await db.query(
        'SELECT employee_id FROM "user" WHERE user_id = $1',
        [req.userId]
      );
      if (
        !userResult.rows.length ||
        userResult.rows[0].employee_id !==
          activityResult.rows[0].coordinator_employee_id
      ) {
        return res
          .status(403)
          .json({ message: "Not authorized to manage this activity" });
      }
    }

    // Insert student
    try {
      await db.query(
        "INSERT INTO od_activity_student (activity_id, enrollment_number) VALUES ($1, $2)",
        [activityId, enrollment_number]
      );
    } catch (err) {
      if (err.code === "23505") {
        return res
          .status(409)
          .json({ message: "Student already added to this activity" });
      }
      throw err;
    }

    // Auto-mark OD
    const activity = activityResult.rows[0];
    const startTime = activity.start_time.substring(0, 5); // HH:MM from HH:MM:SS
    const endTime = activity.end_time.substring(0, 5);

    await autoMarkOD(
      parseInt(activityId),
      enrollment_number,
      activity.activity_date,
      startTime,
      endTime,
      activity.slot_year,
      activity.semester_type,
      req.userId
    );

    res.status(201).json({
      message: "Student added and OD marked successfully",
      student: studentCheck.rows[0],
    });
  } catch (error) {
    console.error("Add student to activity error:", error);
    res
      .status(500)
      .json({ message: "Server error while adding student" });
  }
};

// Remove student from activity
exports.removeStudentFromActivity = async (req, res) => {
  try {
    const { activityId, enrollmentNumber } = req.params;

    // Verify access
    const activityResult = await db.query(
      `SELECT a.*, e.coordinator_employee_id
       FROM od_activity a JOIN od_event e ON a.event_id = e.event_id
       WHERE a.activity_id = $1`,
      [activityId]
    );
    if (!activityResult.rows.length) {
      return res.status(404).json({ message: "Activity not found" });
    }

    if (req.userRole === "faculty") {
      const userResult = await db.query(
        'SELECT employee_id FROM "user" WHERE user_id = $1',
        [req.userId]
      );
      if (
        !userResult.rows.length ||
        userResult.rows[0].employee_id !==
          activityResult.rows[0].coordinator_employee_id
      ) {
        return res
          .status(403)
          .json({ message: "Not authorized to manage this activity" });
      }
    }

    // Remove OD attendance records
    await removeODRecords(parseInt(activityId), enrollmentNumber);

    // Remove student from activity
    const result = await db.query(
      "DELETE FROM od_activity_student WHERE activity_id = $1 AND enrollment_number = $2 RETURNING *",
      [activityId, enrollmentNumber]
    );

    if (!result.rows.length) {
      return res
        .status(404)
        .json({ message: "Student not found in this activity" });
    }

    res
      .status(200)
      .json({ message: "Student removed and OD records cleared" });
  } catch (error) {
    console.error("Remove student from activity error:", error);
    res
      .status(500)
      .json({ message: "Server error while removing student" });
  }
};

// Lookup student by enrollment number
exports.lookupStudent = async (req, res) => {
  try {
    const { enrollmentNumber } = req.params;

    const result = await db.query(
      `SELECT s.enrollment_no, s.student_name, s.school_name, s.program_name
       FROM student s
       WHERE s.enrollment_no = $1`,
      [enrollmentNumber]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.status(200).json({ student: result.rows[0] });
  } catch (error) {
    console.error("Lookup student error:", error);
    res
      .status(500)
      .json({ message: "Server error while looking up student" });
  }
};

// =============================================================================
// BULK ADD STUDENTS TO AN ACTIVITY
// =============================================================================
// The coordinator can add many students to an OD activity at once (via paste
// or Excel/CSV upload). Two endpoints:
//   1. validateBulkStudents  — dry-run: returns per-row status (will_add /
//                              already_in_activity / not_found /
//                              duplicate_in_list / invalid_format). No DB
//                              writes.
//   2. bulkAddStudentsToActivity — commits: for each valid row, inserts into
//                                  od_activity_student and calls autoMarkOD.
//                                  Per-student commit (idempotent, safe to
//                                  retry).
// Both endpoints reuse the exact same auth + future-date rules as the
// single-add endpoint (addStudentToActivity).

const MAX_BULK_STUDENTS = 2000; // soft cap per request

// Helper: shared prechecks (activity exists, not future-dated, caller is
// authorised). Returns { ok: true, activity } or { ok: false, code, message }.
async function loadActivityAndAuthorise(activityId, req) {
  const activityResult = await db.query(
    `SELECT a.*, e.coordinator_employee_id, e.slot_year, e.semester_type
     FROM od_activity a JOIN od_event e ON a.event_id = e.event_id
     WHERE a.activity_id = $1`,
    [activityId]
  );
  if (!activityResult.rows.length) {
    return { ok: false, code: 404, message: "Activity not found" };
  }

  const activity = activityResult.rows[0];

  // Block bulk add on future-dated activities — same rule as single-add.
  const activityDate = new Date(activity.activity_date);
  const today = new Date();
  activityDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  if (activityDate > today) {
    return {
      ok: false,
      code: 400,
      message: "Cannot add students to future-dated activities. Students can only be added on or after the activity date.",
    };
  }

  // Faculty must be the event's coordinator. Admin and staff bypass.
  if (req.userRole === "faculty") {
    const userResult = await db.query(
      'SELECT employee_id FROM "user" WHERE user_id = $1',
      [req.userId]
    );
    if (
      !userResult.rows.length ||
      userResult.rows[0].employee_id !== activity.coordinator_employee_id
    ) {
      return { ok: false, code: 403, message: "Not authorized to manage this activity" };
    }
  }

  return { ok: true, activity };
}

// Helper: normalise the caller-supplied list. Trims, uppercases, drops empty
// strings, splits on comma/newline/whitespace, de-duplicates while preserving
// first-occurrence order. Returns { unique: [...], duplicates: [enr, ...] }.
function normaliseEnrolmentList(rawList) {
  if (!Array.isArray(rawList)) return { unique: [], duplicates: [] };
  const seen = new Set();
  const unique = [];
  const duplicates = [];
  for (const raw of rawList) {
    if (raw === null || raw === undefined) continue;
    const str = String(raw).trim().toUpperCase();
    if (str === "") continue;
    if (seen.has(str)) {
      duplicates.push(str);
      continue;
    }
    seen.add(str);
    unique.push(str);
  }
  return { unique, duplicates };
}

// Helper: basic enrolment format sanity — starts with A, 12–13 chars,
// remaining characters alphanumeric.
function isValidEnrolmentFormat(str) {
  return /^A[A-Z0-9]{11,12}$/.test(str);
}

// POST /od/activities/:activityId/students/validate
// Body: { enrollment_numbers: string[] }
// Returns per-row status. NO DB writes.
exports.validateBulkStudents = async (req, res) => {
  try {
    const { activityId } = req.params;
    const { enrollment_numbers } = req.body;

    if (!Array.isArray(enrollment_numbers)) {
      return res.status(400).json({ message: "enrollment_numbers must be an array" });
    }
    if (enrollment_numbers.length === 0) {
      return res.status(400).json({ message: "No enrolment numbers provided" });
    }
    if (enrollment_numbers.length > MAX_BULK_STUDENTS) {
      return res.status(400).json({
        message: `Batch too large. Maximum ${MAX_BULK_STUDENTS} enrolment numbers per submission.`,
      });
    }

    const guard = await loadActivityAndAuthorise(activityId, req);
    if (!guard.ok) return res.status(guard.code).json({ message: guard.message });

    const { unique, duplicates } = normaliseEnrolmentList(enrollment_numbers);

    // Look up all matching students in one query.
    let studentMap = new Map();
    if (unique.length > 0) {
      const studentsRes = await db.query(
        `SELECT enrollment_no, student_name, school_name, program_name
         FROM student
         WHERE enrollment_no = ANY($1::text[])`,
        [unique]
      );
      for (const s of studentsRes.rows) studentMap.set(s.enrollment_no, s);
    }

    // Look up existing memberships in one query.
    let alreadyInActivity = new Set();
    if (unique.length > 0) {
      const existingRes = await db.query(
        `SELECT enrollment_number FROM od_activity_student
         WHERE activity_id = $1 AND enrollment_number = ANY($2::text[])`,
        [activityId, unique]
      );
      for (const r of existingRes.rows) alreadyInActivity.add(r.enrollment_number);
    }

    // Build per-row status for the unique set.
    const rows = unique.map((enr) => {
      if (!isValidEnrolmentFormat(enr)) {
        return { enrollment_number: enr, status: "invalid_format", reason: "Enrolment format invalid" };
      }
      const student = studentMap.get(enr);
      if (!student) {
        return { enrollment_number: enr, status: "not_found", reason: "Student record not found" };
      }
      if (alreadyInActivity.has(enr)) {
        return {
          enrollment_number: enr,
          status: "already_in_activity",
          reason: "Already added to this activity",
          student_name: student.student_name,
          school_name: student.school_name,
          program_name: student.program_name,
        };
      }
      return {
        enrollment_number: enr,
        status: "will_add",
        student_name: student.student_name,
        school_name: student.school_name,
        program_name: student.program_name,
      };
    });

    // Append duplicate-in-list rows (they appear once in `unique`, so any
    // extra occurrences show here — indicated but not counted twice).
    for (const dup of duplicates) {
      rows.push({
        enrollment_number: dup,
        status: "duplicate_in_list",
        reason: "Appears more than once in the submitted list",
      });
    }

    const summary = {
      total_submitted: enrollment_numbers.length,
      unique_submitted: unique.length,
      will_add:            rows.filter((r) => r.status === "will_add").length,
      already_in_activity: rows.filter((r) => r.status === "already_in_activity").length,
      not_found:           rows.filter((r) => r.status === "not_found").length,
      invalid_format:      rows.filter((r) => r.status === "invalid_format").length,
      duplicate_in_list:   duplicates.length,
    };

    res.status(200).json({ summary, rows });
  } catch (error) {
    console.error("Validate bulk students error:", error);
    res.status(500).json({ message: "Server error while validating enrolment list" });
  }
};

// POST /od/activities/:activityId/students/bulk
// Body: { enrollment_numbers: string[] }
// For each unique enrolment: revalidates, inserts od_activity_student row,
// auto-marks OD. Per-student commit (one failure doesn't block others).
exports.bulkAddStudentsToActivity = async (req, res) => {
  try {
    const { activityId } = req.params;
    const { enrollment_numbers } = req.body;

    if (!Array.isArray(enrollment_numbers)) {
      return res.status(400).json({ message: "enrollment_numbers must be an array" });
    }
    if (enrollment_numbers.length === 0) {
      return res.status(400).json({ message: "No enrolment numbers provided" });
    }
    if (enrollment_numbers.length > MAX_BULK_STUDENTS) {
      return res.status(400).json({
        message: `Batch too large. Maximum ${MAX_BULK_STUDENTS} enrolment numbers per submission.`,
      });
    }

    const guard = await loadActivityAndAuthorise(activityId, req);
    if (!guard.ok) return res.status(guard.code).json({ message: guard.message });
    const activity = guard.activity;

    const { unique } = normaliseEnrolmentList(enrollment_numbers);

    const added = [];
    const skipped = [];
    const failed = [];
    const startTime = activity.start_time.substring(0, 5);
    const endTime = activity.end_time.substring(0, 5);

    for (const enr of unique) {
      try {
        if (!isValidEnrolmentFormat(enr)) {
          skipped.push({ enrollment_number: enr, reason: "Enrolment format invalid" });
          continue;
        }

        // Verify student exists (cheap, indexed).
        const studentCheck = await db.query(
          "SELECT enrollment_no, student_name FROM student WHERE enrollment_no = $1",
          [enr]
        );
        if (!studentCheck.rows.length) {
          skipped.push({ enrollment_number: enr, reason: "Student not found" });
          continue;
        }

        // Attempt insert. Unique constraint on (activity_id, enrollment_number)
        // handles the "already added" case idempotently.
        try {
          await db.query(
            "INSERT INTO od_activity_student (activity_id, enrollment_number) VALUES ($1, $2)",
            [activityId, enr]
          );
        } catch (insErr) {
          if (insErr.code === "23505") {
            skipped.push({ enrollment_number: enr, reason: "Already added to this activity" });
            continue;
          }
          throw insErr;
        }

        // Auto-mark OD (reuses the tested single-add helper).
        await autoMarkOD(
          parseInt(activityId),
          enr,
          activity.activity_date,
          startTime,
          endTime,
          activity.slot_year,
          activity.semester_type,
          req.userId
        );

        added.push({ enrollment_number: enr, student_name: studentCheck.rows[0].student_name });
      } catch (rowErr) {
        console.error(`Bulk add: row failed for ${enr}`, rowErr);
        failed.push({ enrollment_number: enr, reason: "Server error while adding this row" });
      }
    }

    const summary = {
      total_submitted: enrollment_numbers.length,
      unique_processed: unique.length,
      added: added.length,
      skipped: skipped.length,
      failed: failed.length,
    };

    res.status(200).json({ summary, added, skipped, failed });
  } catch (error) {
    console.error("Bulk add students error:", error);
    res.status(500).json({ message: "Server error while bulk-adding students" });
  }
};
