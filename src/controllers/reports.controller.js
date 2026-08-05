const db = require("../config/db");
const XLSX = require("xlsx");

// ─── Helpers for SUMMER lab compound-slot merge ─────────────────────────────
// In SUMMER, student_registrations.slot_name is comma-separated for compound
// lab batches (e.g. "L11+L12,L31+L32"), meaning one student is registered
// across two pair-slots as a single merged lab batch. faculty_allocation and
// assessment_config still hold one row per pair. These helpers let the marks
// report collapse the pair-rows into a single merged row per compound.

function isCompoundSlot(s) {
  return typeof s === "string" && s.includes(",");
}
function decomposeCompoundSlot(s) {
  if (typeof s !== "string") return [];
  return s.split(",").map((t) => t.trim()).filter(Boolean);
}

// Parse a slot_time string like "9.00-9.50" or "1.15–2.05" into
// minutes-since-midnight (24h). Hours below 8 are treated as PM (adds 12h)
// since morning lab slots start at 9. Returns Infinity for unparseable input
// so unknown slots fall to the end of a sort.
function parseSlotStartMinutes(slot_time) {
  if (typeof slot_time !== "string") return Infinity;
  const startPart = slot_time.split(/[–\-]/)[0].trim();
  const [rawH, rawM] = startPart.split(/[.:]/).map(Number);
  if (!Number.isFinite(rawH)) return Infinity;
  const h = rawH < 8 ? rawH + 12 : rawH;
  return h * 60 + (Number.isFinite(rawM) ? rawM : 0);
}

// Look up slot start-time (in minutes) for each of the given slot_names.
// Returns { <slot_name>: minutes | Infinity }. Uses the `slot` table filtered
// to the given (slot_year, semester_type). Same slot_name may appear multiple
// times across weekdays with the same slot_time — MIN() picks any of them.
async function getSlotStartTimeMap(slot_year, semester_type, slot_names) {
  const uniq = Array.from(new Set((slot_names || []).filter(Boolean)));
  const out = {};
  for (const n of uniq) out[n] = Infinity;
  if (uniq.length === 0) return out;
  const r = await db.query(
    `SELECT slot_name, MIN(slot_time) AS slot_time
     FROM slot
     WHERE slot_year = $1 AND semester_type = $2 AND slot_name = ANY($3)
     GROUP BY slot_name`,
    [slot_year, semester_type, uniq]
  );
  for (const row of r.rows) {
    out[row.slot_name] = parseSlotStartMinutes(row.slot_time);
  }
  return out;
}

// Helper: Derive assessment type from course code and course type
function deriveAssessmentType(courseCode, courseType, theory = 0, practical = 0) {
  const levelDigit = parseInt(courseCode.charAt(3));
  let level;
  if (levelDigit >= 1 && levelDigit <= 4) {
    level = "UG";
  } else if (levelDigit >= 5 && levelDigit <= 6) {
    level = "PG";
  } else {
    level = "RESEARCH";
  }
  if (courseType === "T") return `${level}_THEORY`;
  if (courseType === "P") return `${level}_LAB`;
  if (courseType === "TEL") return `${level}_INTEGRATED`;
  if (courseType === "NC") {
    const t = Number(theory) || 0;
    const p = Number(practical) || 0;
    if (t > 0 && p === 0) return `${level}_THEORY`;
    if (t === 0 && p > 0) return `${level}_LAB`;
    if (t > 0 && p > 0) return `${level}_INTEGRATED`;
    return `${level}_THEORY`;
  }
  return `${level}_THEORY`;
}

// Helper: Get valid components for a given assessment type
function getValidComponents(assessmentType) {
  switch (assessmentType) {
    case "UG_THEORY":
      return ["CA1", "CA2", "CA3", "IM"];
    case "PG_THEORY":
      return ["CA1", "CA2", "IM"];
    case "UG_INTEGRATED":
      return ["CA1", "CA2", "CA3", "IM"];
    case "PG_INTEGRATED":
      return ["CA1", "CA2", "IM"];
    case "UG_LAB":
    case "PG_LAB":
      return ["IM"];
    default:
      return ["CA1", "CA2", "CA3", "IM"];
  }
}

// Helper: Enumerate the configured "pieces" that make up a component for one offering.
// Each piece is a (assessment_type, assessment_number, question_id) triple that should
// have a non-null student_marks row for every enrolled student when the component is
// fully entered. Shape matches how src/public/js/marks.js writes marks.
function extractConfiguredPieces(component, configRow, isLabSlot) {
  const cj = typeof configRow.config_json === "string"
    ? JSON.parse(configRow.config_json)
    : (configRow.config_json || {});
  const pieces = [];

  if (component === "CA1" || component === "CA2" || component === "CA3") {
    const n = parseInt(component.slice(2));
    const ca = (cj.cas || []).find(c => c.number === n);
    for (const q of (ca?.questions || [])) {
      pieces.push({ assessment_type: component, assessment_number: n, question_id: String(q.id) });
    }
  } else if (component === "IM") {
    if (isLabSlot) {
      const sessions = cj.labSessions || [];
      sessions.forEach((s, i) => {
        pieces.push({
          assessment_type: "LAB_SESSION",
          assessment_number: i + 1,
          question_id: String(s?.date ?? `S${i + 1}`),
        });
      });
    } else {
      for (const a of (cj.assignments || [])) {
        for (const q of (a.questions || [])) {
          pieces.push({
            assessment_type: "ASSIGNMENT",
            assessment_number: a.number,
            question_id: String(q.id),
          });
        }
      }
    }
  }

  return pieces;
}

// Helper: Parse program_code from student_registrations into program and branch
function parseProgramBranch(programCode) {
  // Match known degree patterns at the start, everything after is branch
  // e.g. "B.Tech. CSE (AI & ML)" → program="B.Tech.", branch="CSE (AI & ML)"
  // e.g. "B.Tech. (CSE)" → program="B.Tech.", branch="(CSE)"
  // e.g. "BCA" → program="BCA", branch=""
  const degreePattern = /^(B\.Tech\.|M\.Tech\.|B\.Sc\.|M\.Sc\.|B\.A\.|B\.Des\.|B\.Com\.|Ph\.D\.|B\.A\.,\s*LL\.B\.\s*\(Hons\.\)|LL\.M\.|BBA|BCA|MBA|MCA|LLM)\s*/i;
  const match = programCode.match(degreePattern);
  if (match) {
    const program = match[1].trim();
    const branch = programCode.slice(match[0].length).trim();
    return { program, branch };
  }
  return { program: programCode, branch: "" };
}

// Helper: Build CoE template worksheet for a single course-slot-faculty-component combo
function buildCoEWorksheet(headerInfo, students, component) {
  const { slotName, facultyName, courseCode, courseName, credits, courseType, assessmentType, semesterLabel, hasTheoryConfig, hasLabConfig, theoryConfigJson, labConfigs, isMerged, slotStartTimes } = headerInfo;

  // Determine program level (UG/PG)
  const programLevel = assessmentType.startsWith("PG") ? "PG" : "UG";

  // Determine title row for component
  let componentTitle;
  if (component === "IM") {
    componentTitle = "Internal Marks";
  } else {
    const caNum = component.replace("CA", "");
    componentTitle = `Continuous Assessment \u2013 ${caNum}`;
  }

  // Credit format like "3:0:3" or "2:2:3"
  const creditStr = `${credits}`;

  // Build header rows (matching CoE template)
  const rows = [];
  rows.push(["AMITY UNIVERSITY BENGALURU"]);
  rows.push([`${programLevel} Program: ${semesterLabel}`]);
  rows.push([componentTitle]);
  rows.push([]); // blank row

  rows.push(["Slot", "", slotName, "Faculty Name", "", facultyName]);
  rows.push(["Course Code", "", courseCode, "Course Name", "", courseName]);
  rows.push(["Credit", "", creditStr, "Course Type", "", courseType]);
  rows.push([]); // blank row

  // Determine marks columns based on component
  let marksHeaders;
  let imColumns = []; // Track IM column structure for data rows
  if (component === "IM") {
    const showAssignment = hasTheoryConfig;
    const showLab = hasLabConfig;
    let totalMax = 0;

    // Build individual assignment columns from config
    if (showAssignment && theoryConfigJson) {
      const assignments = theoryConfigJson.assignments || [];
      assignments.forEach(a => {
        imColumns.push({ type: "assignment", number: a.number, maxMarks: a.maxMarks });
        totalMax += a.maxMarks || 0;
      });
    }

    // Build individual lab session columns from all lab configs. For merged
    // groups (SUMMER compound), sessions from multiple pair-configs get global
    // S1..Sn numbering, ordered by (session_date, slot_start_time).
    if (showLab && Array.isArray(labConfigs) && labConfigs.length > 0) {
      // Flatten (pair_slot, sessionNumber, date, maxMarks, config_id) from every labConfig.
      const flatSessions = [];
      for (const lc of labConfigs) {
        const sessions = (lc.config_json && lc.config_json.labSessions) || [];
        for (const s of sessions) {
          flatSessions.push({
            config_id: lc.id,
            pair_slot: lc.slot_name,
            number: s.sessionNumber,
            date: s.date || "",
            maxMarks: s.maxMarks || 0,
          });
        }
      }
      // Sort by (date, slot_start_time). Unknown slot_time → Infinity (sort last).
      flatSessions.sort((a, b) => {
        if (a.date !== b.date) return a.date < b.date ? -1 : 1;
        const ta = slotStartTimes ? (slotStartTimes[a.pair_slot] ?? Infinity) : 0;
        const tb = slotStartTimes ? (slotStartTimes[b.pair_slot] ?? Infinity) : 0;
        return ta - tb;
      });
      flatSessions.forEach((s, idx) => {
        imColumns.push({
          type: "lab",
          number: s.number,
          config_id: s.config_id,
          pair_slot: s.pair_slot,
          date: s.date,
          globalIndex: idx + 1,
          maxMarks: s.maxMarks,
        });
        totalMax += s.maxMarks || 0;
      });
    }

    // Build headers from columns
    marksHeaders = imColumns.map(col => {
      if (col.type === "assignment") {
        return `A${col.number}\n(${col.maxMarks})`;
      }
      // Lab column — global index + pair-slot + date so same-day columns from
      // different pair-configs are distinguishable.
      const dateShort = col.date ? String(col.date).slice(5, 10) : `S${col.number}`;
      const labPrefix = isMerged ? `S${col.globalIndex} ${col.pair_slot}` : `Lab ${col.number}`;
      return `${labPrefix} ${dateShort}\n(${col.maxMarks})`;
    });
    if (imColumns.length > 0) {
      marksHeaders.push(`Total\n(${totalMax})`);
    } else {
      marksHeaders = ["Marks"];
    }
  } else {
    // CA component: find max marks from first student that has data
    let maxMarks = "";
    for (const s of students) {
      if (s.max_marks !== null && s.max_marks !== undefined) {
        maxMarks = s.max_marks;
        break;
      }
    }
    marksHeaders = [`Marks\n(${maxMarks})`];
  }

  // Header row
  rows.push(["S.No.", "SEN", "Student Name", "School", "Program", "Branch", ...marksHeaders, "Remarks\n(AB/WD/IE/IE(FD)/MP)"]);

  // Student data rows
  students.forEach((s, idx) => {
    const { program, branch } = parseProgramBranch(s.program_code);
    // Strip prefix, uppercase, then move leading single-char initials to end
    // e.g. "Mr S R JEEVIKA" → "S R JEEVIKA" → "JEEVIKA S R"
    let cleanName = s.student_name.replace(/^(Mr\.?|Ms\.?|Mrs\.?|Dr\.?)\s+/i, "").toUpperCase();
    const tokens = cleanName.split(/\s+/);
    const firstMulti = tokens.findIndex(t => t.length > 1);
    if (firstMulti > 0) {
      cleanName = [...tokens.slice(firstMulti), ...tokens.slice(0, firstMulti)].join(" ");
    }
    const row = [idx + 1, s.enrollment_number, cleanName, s.school || "", program, branch];

    if (component === "IM") {
      let rowTotal = 0;
      let hasAnyMark = false;
      imColumns.forEach(col => {
        const key = col.type === "assignment"
          ? `assignment_${col.number}`
          : `lab_${col.config_id}_${col.number}`;
        const val = s[key];
        if (val !== null && val !== undefined) {
          row.push(val);
          rowTotal += val;
          hasAnyMark = true;
        } else {
          row.push("");
        }
      });
      if (imColumns.length > 0) {
        row.push(hasAnyMark ? rowTotal : "");
      }
    } else {
      row.push(s.marks !== null && s.marks !== undefined ? s.marks : "");
    }

    row.push(""); // Remarks column (empty)
    rows.push(row);
  });

  // Footer rows
  rows.push([]);
  rows.push([]);
  rows.push(["", "", "Evaluator", "", "", "Marks Statement Verified by"]);
  rows.push(["Signature with Date"]);
  rows.push(["Name of the Faculty", "", facultyName]);
  rows.push(["Emp. ID"]);
  rows.push(["School / Institute"]);

  // Create worksheet from array of arrays
  const ws = XLSX.utils.aoa_to_sheet(rows);
  return ws;
}

// Get student registrations for download (with optional filters)
exports.getStudentRegistrations = async (req, res) => {
  try {
    const format = req.query.format || "excel";
    const { slot_year, semester_type, school, program_code, course_code, slot_name, venue } = req.query;

    // Build dynamic query
    let query = `
      SELECT DISTINCT
        sr.enrollment_number,
        sr.student_name,
        sr.program_code,
        sr.year_admitted,
        sr.slot_year,
        sr.semester_type,
        sr.course_code,
        sr.course_name,
        sr.theory,
        sr.practical,
        sr.credits,
        sr.course_type,
        sr.slot_name,
        sr.venue,
        sr.faculty_name,
        sr.component_type,
        sr.withdrawn,
        sr.created_at,
        sr.updated_at
      FROM student_registrations sr
    `;

    const conditions = [];
    const params = [];

    // Apply filters
    if (slot_year) {
      params.push(slot_year);
      conditions.push(`sr.slot_year = $${params.length}`);
    }
    if (semester_type) {
      params.push(semester_type);
      conditions.push(`sr.semester_type = $${params.length}`);
    }
    if (school) {
      // Join to course and school tables to filter by school
      query = query.replace(
        "FROM student_registrations sr",
        `FROM student_registrations sr
         JOIN course c ON sr.course_code = c.course_code
         JOIN school s ON c.school_id = s.school_id`
      );
      params.push(school);
      conditions.push(`s.school_short_name = $${params.length}`);
    }
    if (program_code) {
      params.push(program_code);
      conditions.push(`sr.program_code = $${params.length}`);
    }
    if (course_code) {
      params.push(course_code);
      conditions.push(`sr.course_code = $${params.length}`);
    }
    if (slot_name) {
      params.push(slot_name);
      conditions.push(`sr.slot_name = $${params.length}`);
    }
    if (venue) {
      params.push(venue);
      conditions.push(`sr.venue = $${params.length}`);
    }

    // Faculty can only see their own courses
    if (req.userRole === "faculty") {
      const userResult = await db.query(
        'SELECT employee_id FROM "user" WHERE user_id = $1',
        [req.userId]
      );
      if (userResult.rows.length && userResult.rows[0].employee_id) {
        // Join to faculty_allocation to match by employee_id
        if (!query.includes("JOIN faculty_allocation")) {
          query = query.replace(
            "FROM student_registrations sr",
            `FROM student_registrations sr
             JOIN faculty_allocation fa ON sr.course_code = fa.course_code
               AND sr.slot_year = fa.slot_year AND sr.semester_type = fa.semester_type
               AND sr.venue = fa.venue
               AND (sr.slot_name = fa.slot_name OR sr.slot_name LIKE '%' || fa.slot_name || '%')`
          );
        }
        params.push(userResult.rows[0].employee_id);
        conditions.push(`fa.employee_id = $${params.length}`);
      }
    }

    if (conditions.length) {
      query += " WHERE " + conditions.join(" AND ");
    }
    query += " ORDER BY sr.slot_year DESC, sr.semester_type, sr.enrollment_number, sr.course_code";

    const result = await db.query(query, params);
    const data = result.rows;
    const timestamp = new Date().toISOString().slice(0, 10);

    if (format === "excel") {
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Student Registrations");
      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="student_registrations_${timestamp}.xlsx"`);
      return res.send(buffer);
    } else if (format === "csv") {
      const worksheet = XLSX.utils.json_to_sheet(data);
      const csvContent = XLSX.utils.sheet_to_csv(worksheet);

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="student_registrations_${timestamp}.csv"`);
      return res.send(csvContent);
    } else if (format === "both") {
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Student Registrations");

      const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
      const csvContent = XLSX.utils.sheet_to_csv(worksheet);

      return res.json({
        excel: {
          filename: `student_registrations_${timestamp}.xlsx`,
          data: excelBuffer.toString("base64"),
        },
        csv: {
          filename: `student_registrations_${timestamp}.csv`,
          data: Buffer.from(csvContent).toString("base64"),
        },
      });
    } else {
      return res.status(400).json({ message: "Invalid format. Use 'excel', 'csv', or 'both'" });
    }
  } catch (error) {
    console.error("Error generating student registrations report:", error);
    res.status(500).json({ message: "Error generating report", error: error.message });
  }
};

// Get courses available for marks report (faculty sees own, admin sees all)
exports.getMarksReportCourses = async (req, res) => {
  try {
    const { slot_year, semester_type } = req.query;
    if (!slot_year || !semester_type) {
      return res.status(400).json({ message: "slot_year and semester_type are required" });
    }

    let query;
    const params = [slot_year, semester_type];

    if (req.userRole === "faculty" || req.userRole === "timetable_coordinator") {
      // Get faculty's/coordinator's employee_id
      const userResult = await db.query(
        'SELECT employee_id FROM "user" WHERE user_id = $1',
        [req.userId]
      );
      if (!userResult.rows.length || !userResult.rows[0].employee_id) {
        return res.json([]);
      }
      params.push(userResult.rows[0].employee_id);
      query = `
        SELECT DISTINCT ac.course_code, c.course_name, c.course_type, c.theory, c.practical, c.credits,
               ac.assessment_type, ac.employee_id, f.name as faculty_name
        FROM assessment_config ac
        JOIN course c ON ac.course_code = c.course_code
        JOIN faculty f ON ac.employee_id = f.employee_id
        WHERE ac.slot_year = $1 AND ac.semester_type = $2 AND ac.employee_id = $3
        ORDER BY ac.course_code
      `;
    } else {
      // Admin sees all
      query = `
        SELECT DISTINCT ac.course_code, c.course_name, c.course_type, c.theory, c.practical, c.credits,
               ac.assessment_type, ac.employee_id, f.name as faculty_name
        FROM assessment_config ac
        JOIN course c ON ac.course_code = c.course_code
        JOIN faculty f ON ac.employee_id = f.employee_id
        WHERE ac.slot_year = $1 AND ac.semester_type = $2
        ORDER BY ac.course_code
      `;
    }

    const result = await db.query(query, params);

    // Add valid components for each course
    const courses = result.rows.map(row => ({
      ...row,
      valid_components: getValidComponents(row.assessment_type)
    }));

    res.json(courses);
  } catch (error) {
    console.error("Error fetching marks report courses:", error);
    res.status(500).json({ message: "Error fetching courses", error: error.message });
  }
};

// Get marks entry summary for admin (who entered, who hasn't, who hasn't configured)
exports.getMarksEntrySummary = async (req, res) => {
  try {
    const { slot_year, semester_type, component } = req.query;
    if (!slot_year || !semester_type || !component) {
      return res.status(400).json({ message: "slot_year, semester_type, and component are required" });
    }

    // HoI-scoping: non-admin/non-coe callers who have req.hoiSchoolIds see only
    // faculty from their school(s). Admin/coe remain unrestricted.
    const allocationParams = [slot_year, semester_type];
    let hoiFilter = "";
    if (
      req.userRole !== "admin" &&
      req.userRole !== "coe" &&
      req.hoiSchoolIds &&
      req.hoiSchoolIds.length
    ) {
      allocationParams.push(req.hoiSchoolIds);
      hoiFilter = ` AND f.school_id = ANY($${allocationParams.length})`;
    }

    // Get ALL faculty-course-slot combos from faculty_allocation
    const allocationResult = await db.query(`
      SELECT DISTINCT fa.course_code, fa.slot_name, fa.employee_id, fa.venue,
             c.course_name, c.course_type, c.theory, c.practical, c.credits,
             f.name as faculty_name
      FROM faculty_allocation fa
      JOIN course c ON fa.course_code = c.course_code
      JOIN faculty f ON fa.employee_id = f.employee_id
      WHERE fa.slot_year = $1 AND fa.semester_type = $2${hoiFilter}
      ORDER BY fa.course_code, fa.slot_name, f.name
    `, allocationParams);

    // Get all assessment configs for this semester (for lookup)
    const configResult = await db.query(`
      SELECT ac.id, ac.course_code, ac.slot_name, ac.employee_id, ac.assessment_type, ac.component_type, ac.config_json
      FROM assessment_config ac
      WHERE ac.slot_year = $1 AND ac.semester_type = $2
    `, [slot_year, semester_type]);

    // Build config lookup map: key = course_code_slot_name_employee_id
    const configMap = {};
    for (const cfg of configResult.rows) {
      const key = `${cfg.course_code}_${cfg.slot_name}_${cfg.employee_id}`;
      if (!configMap[key]) configMap[key] = [];
      configMap[key].push(cfg);
    }

    // ─── SUMMER lab compound-slot merge: pre-fetch compound + bare SR ─────
    // A student registered as sr.slot_name = "L11+L12,L31+L32" attends BOTH
    // pair-slots as one merged lab batch. We collapse those pair rows into a
    // single merged summary row so faculty/HoI see one file per batch.
    const allowedFacultyKeys = new Set(
      allocationResult.rows.map(a => `${a.course_code}_${a.faculty_name}`)
    );
    let mergedCoverage = new Map(); // key: `${course}_${faculty}_${pair}` → compound_slot
    let compoundKeys = new Set();   // key: `${course}_${faculty}_${compound_slot}`
    let barePairsWithStudents = new Set(); // key: `${course}_${faculty}_${pair}`
    if (component === "IM") {
      // Compound registrations
      const compoundResult = await db.query(`
        SELECT DISTINCT sr.course_code, sr.faculty_name, sr.slot_name AS compound_slot
        FROM student_registrations sr
        WHERE sr.slot_year = $1 AND sr.semester_type = $2
          AND sr.slot_name LIKE '%,%'
          AND (sr.withdrawn IS NULL OR sr.withdrawn = false)
      `, [slot_year, semester_type]);
      for (const row of compoundResult.rows) {
        const facultyKey = `${row.course_code}_${row.faculty_name}`;
        if (!allowedFacultyKeys.has(facultyKey)) continue; // respect HoI/allocation filter
        const pairs = decomposeCompoundSlot(row.compound_slot);
        const labPairs = pairs.filter(p => /^L\d+\+L\d+$/.test(p));
        if (labPairs.length < 2) continue; // only merge when there are ≥2 lab pairs
        compoundKeys.add(`${row.course_code}_${row.faculty_name}_${row.compound_slot}`);
        for (const p of labPairs) {
          mergedCoverage.set(`${row.course_code}_${row.faculty_name}_${p}`, row.compound_slot);
        }
      }
      // Bare (non-compound) lab-pair registrations — used to defend against the
      // hybrid case (same pair has both compound and bare batches).
      if (mergedCoverage.size > 0) {
        const bareResult = await db.query(`
          SELECT DISTINCT sr.course_code, sr.faculty_name, sr.slot_name AS bare_slot
          FROM student_registrations sr
          WHERE sr.slot_year = $1 AND sr.semester_type = $2
            AND sr.slot_name NOT LIKE '%,%'
            AND sr.slot_name ~ '^L\\d+\\+L\\d+$'
            AND (sr.withdrawn IS NULL OR sr.withdrawn = false)
        `, [slot_year, semester_type]);
        for (const row of bareResult.rows) {
          barePairsWithStudents.add(`${row.course_code}_${row.faculty_name}_${row.bare_slot}`);
        }
      }

      // ─── Fallback merge for SUMMER: empty lab-pair allocations ───────
      // For (course, faculty) combos in SUMMER with ≥2 lab-pair fa rows that
      // have neither compound SR coverage nor any bare SR, collapse the pair
      // rows into a single virtual compound row so the summary reads
      // consistently with the real compound-merged rows shown elsewhere.
      // Empty allocations still appear (Not Configured / 0 students) but as
      // ONE row per course-faculty, not N.
      if (semester_type === "SUMMER") {
        const labPairsByCF = new Map();
        for (const alloc of allocationResult.rows) {
          if (!/^L\d+\+L\d+$/.test(alloc.slot_name)) continue;
          const pairKey = `${alloc.course_code}_${alloc.faculty_name}_${alloc.slot_name}`;
          if (mergedCoverage.has(pairKey)) continue;         // already in a real compound
          if (barePairsWithStudents.has(pairKey)) continue;  // has bare SR — keep as its own row
          const cf = `${alloc.course_code}|${alloc.faculty_name}`; // '|' separator (safe: neither course_code nor faculty_name contains it)
          if (!labPairsByCF.has(cf)) labPairsByCF.set(cf, new Set());
          labPairsByCF.get(cf).add(alloc.slot_name);
        }
        for (const [cf, pairSet] of labPairsByCF.entries()) {
          const pairs = Array.from(pairSet);
          if (pairs.length < 2) continue;
          // Sort pairs by their leading numeric slot index (L5+L6 before L25+L26).
          pairs.sort((a, b) => {
            const na = parseInt((a.match(/^L(\d+)/) || [0, "0"])[1], 10);
            const nb = parseInt((b.match(/^L(\d+)/) || [0, "0"])[1], 10);
            return na - nb;
          });
          const compound_slot = pairs.join(",");
          const sepIdx = cf.indexOf("|");
          const course_code = cf.slice(0, sepIdx);
          const faculty_name = cf.slice(sepIdx + 1);
          compoundKeys.add(`${course_code}_${faculty_name}_${compound_slot}`);
          for (const p of pairs) {
            mergedCoverage.set(`${course_code}_${faculty_name}_${p}`, compound_slot);
          }
        }
      }
    }

    const summary = [];
    const processedKeys = new Set();

    for (const alloc of allocationResult.rows) {
      const groupKey = `${alloc.course_code}_${alloc.slot_name}_${alloc.employee_id}`;
      if (processedKeys.has(groupKey)) continue;
      processedKeys.add(groupKey);

      // Skip lab-pair rows that are represented by a merged compound row below.
      // Only skip when the pair has NO separate bare-registration batch (hybrid case).
      const pairCoverageKey = `${alloc.course_code}_${alloc.faculty_name}_${alloc.slot_name}`;
      if (mergedCoverage.has(pairCoverageKey) && !barePairsWithStudents.has(pairCoverageKey)) {
        continue;
      }

      // Derive assessment type
      const assessmentType = deriveAssessmentType(alloc.course_code, alloc.course_type, alloc.theory, alloc.practical);

      // Check if component is valid for this course type
      const validComponents = getValidComponents(assessmentType);
      if (!validComponents.includes(component)) continue;

      // For TEL courses: theory slots have CAs+IM(assignment), lab slots have IM(lab)
      // Determine if this is a lab slot by checking if slot_name starts with L and has +
      const isLabSlot = /^L\d+\+L\d+$/.test(alloc.slot_name) || /^L\d+$/.test(alloc.slot_name);
      // CA components should only show for non-lab slots
      if (component !== "IM" && isLabSlot && (alloc.course_type === "TEL")) continue;
      // Lab slots for TEL: only show IM
      if (component === "IM" && !isLabSlot && alloc.course_type === "TEL") {
        // Theory slot IM is fine (shows assignments)
      }

      // Resolve the required assessment_config for this component + slot type.
      // IM on a lab slot needs the LAB config (lab sessions);
      // CA1/CA2/CA3 and IM on a theory slot need the THEORY config (assignments / CA questions).
      const configs = configMap[groupKey] || [];
      const requiredComponentType = (component === "IM" && isLabSlot) ? "LAB" : "THEORY";
      const configRow = configs.find(c => c.component_type === requiredComponentType);

      let status;
      let totalStudents = 0;
      let studentsWithMarks = 0;
      let studentsPartial = 0;
      let studentsMissing = 0;
      let partialDetail = [];
      let missingDetail = [];

      if (!configRow) {
        status = "Not Configured";
      } else {
        const pieces = extractConfiguredPieces(component, configRow, isLabSlot);

        if (pieces.length === 0) {
          // Config row exists but no questions/assignments/sessions configured yet.
          status = "Not Configured";
        } else {
          // Fetch the actual enrolled non-withdrawn students for this offering
          // (SUMMER-tolerant slot_name match, matches the prior COUNT query shape).
          const enrollmentResult = await db.query(`
            SELECT DISTINCT sr.enrollment_number
            FROM student_registrations sr
            WHERE sr.slot_year = $1 AND sr.semester_type = $2
              AND sr.course_code = $3
              AND ( sr.slot_name = $4
                 OR ',' || REPLACE(sr.slot_name, ' ', '') || ','
                       LIKE '%,' || REPLACE($4, ' ', '') || ',%' )
              AND sr.faculty_name = $5
              AND (sr.withdrawn IS NULL OR sr.withdrawn = false)
          `, [slot_year, semester_type, alloc.course_code, alloc.slot_name, alloc.faculty_name]);
          const enrollments = enrollmentResult.rows.map(r => r.enrollment_number);
          totalStudents = enrollments.length;

          if (totalStudents === 0) {
            // Approved edge-case: empty class shouldn't show a green Complete.
            status = "Not Entered";
          } else {
            const coverageResult = await db.query(`
              WITH filled AS (
                SELECT sm.enrollment_number, COUNT(*) AS c
                FROM student_marks sm
                JOIN unnest($2::text[], $3::int[], $4::text[])
                     AS p(assessment_type, assessment_number, question_id)
                  ON p.assessment_type = sm.assessment_type
                 AND p.assessment_number = sm.assessment_number
                 AND p.question_id = sm.question_id
                WHERE sm.assessment_config_id = $1
                  AND sm.marks_obtained IS NOT NULL
                  AND sm.enrollment_number = ANY($5::text[])
                GROUP BY sm.enrollment_number
              )
              SELECT
                COALESCE(COUNT(*) FILTER (WHERE c = $6), 0)::int AS fully_done,
                COALESCE(COUNT(*) FILTER (WHERE c > 0 AND c < $6), 0)::int AS partial,
                COALESCE(SUM(c), 0)::int AS filled_cells
              FROM filled
            `, [
              configRow.id,
              pieces.map(p => p.assessment_type),
              pieces.map(p => p.assessment_number),
              pieces.map(p => p.question_id),
              enrollments,
              pieces.length,
            ]);

            const fullyDone = parseInt(coverageResult.rows[0].fully_done);
            const partialCount = parseInt(coverageResult.rows[0].partial);
            const filledCells = parseInt(coverageResult.rows[0].filled_cells);
            studentsWithMarks = fullyDone;
            studentsPartial = partialCount;
            studentsMissing = totalStudents - fullyDone - partialCount;

            if (filledCells === 0) {
              status = "Not Entered";
            } else if (fullyDone === totalStudents) {
              status = "Complete";
            } else {
              status = "Partial";
            }

            // If any student is partial or missing, fetch per-student detail so
            // the UI can show "Q3 blank for 6" and let HoI expand the enrollment list.
            if (studentsPartial > 0 || studentsMissing > 0) {
              const detailResult = await db.query(`
                WITH req AS (
                  SELECT assessment_type, assessment_number, question_id
                  FROM unnest($2::text[], $3::int[], $4::text[])
                       AS p(assessment_type, assessment_number, question_id)
                ),
                sps AS (
                  SELECT e.enrollment_number, r.question_id,
                         CASE WHEN sm.marks_obtained IS NOT NULL THEN 1 ELSE 0 END AS is_filled
                  FROM unnest($5::text[]) AS e(enrollment_number)
                  CROSS JOIN req r
                  LEFT JOIN student_marks sm
                    ON sm.assessment_config_id = $1
                   AND sm.enrollment_number = e.enrollment_number
                   AND sm.assessment_type = r.assessment_type
                   AND sm.assessment_number = r.assessment_number
                   AND sm.question_id = r.question_id
                )
                SELECT sps.enrollment_number,
                       SUM(sps.is_filled)::int AS filled,
                       COALESCE(
                         array_agg(sps.question_id ORDER BY sps.question_id)
                           FILTER (WHERE sps.is_filled = 0),
                         ARRAY[]::text[]
                       ) AS missing_pieces
                FROM sps
                GROUP BY sps.enrollment_number
                HAVING SUM(sps.is_filled) < $6
                ORDER BY SUM(sps.is_filled), sps.enrollment_number
              `, [
                configRow.id,
                pieces.map(p => p.assessment_type),
                pieces.map(p => p.assessment_number),
                pieces.map(p => p.question_id),
                enrollments,
                pieces.length,
              ]);

              for (const r of detailResult.rows) {
                if (r.filled === 0) {
                  missingDetail.push({ enrollment_number: r.enrollment_number });
                } else {
                  partialDetail.push({
                    enrollment_number: r.enrollment_number,
                    missing_pieces: r.missing_pieces || [],
                  });
                }
              }
            }
          }
        }
      }

      summary.push({
        course_code: alloc.course_code,
        course_name: alloc.course_name,
        course_type: alloc.course_type,
        slot_name: alloc.slot_name,
        venue: alloc.venue,
        employee_id: alloc.employee_id,
        faculty_name: alloc.faculty_name,
        assessment_type: assessmentType,
        total_students: totalStudents,
        students_with_marks: studentsWithMarks,
        students_done: studentsWithMarks,
        students_partial: studentsPartial,
        students_missing: studentsMissing,
        partial_detail: partialDetail,
        missing_detail: missingDetail,
        status: status,
        theory: alloc.theory,
        practical: alloc.practical,
        credits: alloc.credits
      });
    }

    // ─── Emit merged rows for compound-registered lab batches ───────────
    // For each compound (course, faculty, compound_slot), aggregate pieces
    // across all constituent pair-configs and produce a single summary row.
    for (const compoundKey of compoundKeys) {
      // compoundKey = `${course}_${faculty}_${compound_slot}` — split from the right
      // so faculty names with underscores don't break parsing.
      const lastUnderscore = compoundKey.lastIndexOf("_");
      if (lastUnderscore < 0) continue;
      const compound_slot = compoundKey.slice(lastUnderscore + 1);
      const beforeCompound = compoundKey.slice(0, lastUnderscore);
      const firstUnderscore = beforeCompound.indexOf("_");
      if (firstUnderscore < 0) continue;
      const course_code = beforeCompound.slice(0, firstUnderscore);
      const faculty_name = beforeCompound.slice(firstUnderscore + 1);

      // Find the alloc rows this compound covers so we know the pieces to fetch.
      const pairs = decomposeCompoundSlot(compound_slot).filter(p => /^L\d+\+L\d+$/.test(p));
      const relatedAllocs = allocationResult.rows.filter(
        a => a.course_code === course_code
          && a.faculty_name === faculty_name
          && pairs.includes(a.slot_name)
      );
      if (relatedAllocs.length === 0) continue;
      const sampleAlloc = relatedAllocs[0];
      const employee_id = sampleAlloc.employee_id;

      // Collect LAB configs (component_type === 'LAB') for every constituent pair.
      const mergedConfigs = [];
      for (const pair of pairs) {
        const configs = configMap[`${course_code}_${pair}_${employee_id}`] || [];
        for (const cfg of configs) {
          if (cfg.component_type === "LAB") mergedConfigs.push(cfg);
        }
      }

      const assessmentType = deriveAssessmentType(course_code, sampleAlloc.course_type, sampleAlloc.theory, sampleAlloc.practical);
      let status = "Not Configured";
      let totalStudents = 0;
      let studentsWithMarks = 0;
      let studentsPartial = 0;
      let studentsMissing = 0;
      let partialDetail = [];
      let missingDetail = [];

      if (mergedConfigs.length > 0) {
        // Concatenate pieces (LAB_SESSION entries) across all merged configs,
        // tagging each with the config_id so identical (assess_type, num, q_id)
        // triples from different pair-configs stay distinct.
        const taggedPieces = [];
        for (const cfg of mergedConfigs) {
          const cfgPieces = extractConfiguredPieces(component, cfg, /* isLabSlot */ true);
          for (const p of cfgPieces) {
            taggedPieces.push({ ...p, config_id: cfg.id });
          }
        }
        if (taggedPieces.length > 0) {
          const enrollmentResult = await db.query(`
            SELECT DISTINCT sr.enrollment_number
            FROM student_registrations sr
            WHERE sr.slot_year = $1 AND sr.semester_type = $2
              AND sr.course_code = $3
              AND sr.slot_name = $4
              AND sr.faculty_name = $5
              AND (sr.withdrawn IS NULL OR sr.withdrawn = false)
          `, [slot_year, semester_type, course_code, compound_slot, faculty_name]);
          const enrollments = enrollmentResult.rows.map(r => r.enrollment_number);
          totalStudents = enrollments.length;

          if (totalStudents === 0) {
            status = "Not Entered";
          } else {
            // Coverage across all merged configs — the 4-tuple (config_id +
            // triple) uniquely identifies a piece. Same triple across two
            // configs represents two DIFFERENT physical sessions at different
            // slot times; both must be filled for the student to be "done".
            const coverageResult = await db.query(`
              WITH filled AS (
                SELECT sm.enrollment_number, COUNT(*) AS c
                FROM student_marks sm
                JOIN unnest($1::int[], $2::text[], $3::int[], $4::text[])
                     AS p(config_id, assessment_type, assessment_number, question_id)
                  ON p.config_id = sm.assessment_config_id
                 AND p.assessment_type = sm.assessment_type
                 AND p.assessment_number = sm.assessment_number
                 AND p.question_id = sm.question_id
                WHERE sm.marks_obtained IS NOT NULL
                  AND sm.enrollment_number = ANY($5::text[])
                GROUP BY sm.enrollment_number
              )
              SELECT
                COALESCE(COUNT(*) FILTER (WHERE c = $6), 0)::int AS fully_done,
                COALESCE(COUNT(*) FILTER (WHERE c > 0 AND c < $6), 0)::int AS partial,
                COALESCE(SUM(c), 0)::int AS filled_cells
              FROM filled
            `, [
              taggedPieces.map(p => p.config_id),
              taggedPieces.map(p => p.assessment_type),
              taggedPieces.map(p => p.assessment_number),
              taggedPieces.map(p => p.question_id),
              enrollments,
              taggedPieces.length,
            ]);
            const fullyDone = parseInt(coverageResult.rows[0].fully_done);
            const partialCount = parseInt(coverageResult.rows[0].partial);
            const filledCells = parseInt(coverageResult.rows[0].filled_cells);
            studentsWithMarks = fullyDone;
            studentsPartial = partialCount;
            studentsMissing = totalStudents - fullyDone - partialCount;
            if (filledCells === 0) status = "Not Entered";
            else if (fullyDone === totalStudents) status = "Complete";
            else status = "Partial";

            if (studentsPartial > 0 || studentsMissing > 0) {
              const detailResult = await db.query(`
                WITH req AS (
                  SELECT config_id, assessment_type, assessment_number, question_id,
                         config_id || ':' || assessment_type || ':' || assessment_number || ':' || question_id AS piece_key
                  FROM unnest($1::int[], $2::text[], $3::int[], $4::text[])
                       AS p(config_id, assessment_type, assessment_number, question_id)
                ),
                sps AS (
                  SELECT e.enrollment_number, r.piece_key,
                         CASE WHEN sm.marks_obtained IS NOT NULL THEN 1 ELSE 0 END AS is_filled
                  FROM unnest($5::text[]) AS e(enrollment_number)
                  CROSS JOIN req r
                  LEFT JOIN student_marks sm
                    ON sm.assessment_config_id = r.config_id
                   AND sm.enrollment_number = e.enrollment_number
                   AND sm.assessment_type = r.assessment_type
                   AND sm.assessment_number = r.assessment_number
                   AND sm.question_id = r.question_id
                )
                SELECT sps.enrollment_number,
                       SUM(sps.is_filled)::int AS filled,
                       COALESCE(
                         array_agg(sps.piece_key ORDER BY sps.piece_key)
                           FILTER (WHERE sps.is_filled = 0),
                         ARRAY[]::text[]
                       ) AS missing_pieces
                FROM sps
                GROUP BY sps.enrollment_number
                HAVING SUM(sps.is_filled) < $6
                ORDER BY SUM(sps.is_filled), sps.enrollment_number
              `, [
                taggedPieces.map(p => p.config_id),
                taggedPieces.map(p => p.assessment_type),
                taggedPieces.map(p => p.assessment_number),
                taggedPieces.map(p => p.question_id),
                enrollments,
                taggedPieces.length,
              ]);
              for (const r of detailResult.rows) {
                if (r.filled === 0) {
                  missingDetail.push({ enrollment_number: r.enrollment_number });
                } else {
                  partialDetail.push({
                    enrollment_number: r.enrollment_number,
                    missing_pieces: r.missing_pieces || [],
                  });
                }
              }
            }
          }
        }
      }

      summary.push({
        course_code,
        course_name: sampleAlloc.course_name,
        course_type: sampleAlloc.course_type,
        slot_name: compound_slot,
        venue: sampleAlloc.venue,
        employee_id,
        faculty_name,
        assessment_type: assessmentType,
        total_students: totalStudents,
        students_with_marks: studentsWithMarks,
        students_done: studentsWithMarks,
        students_partial: studentsPartial,
        students_missing: studentsMissing,
        partial_detail: partialDetail,
        missing_detail: missingDetail,
        status,
        theory: sampleAlloc.theory,
        practical: sampleAlloc.practical,
        credits: sampleAlloc.credits,
        is_merged: true,
      });
    }

    res.json(summary);
  } catch (error) {
    console.error("Error fetching marks entry summary:", error);
    res.status(500).json({ message: "Error fetching summary", error: error.message });
  }
};

// Get available slots for a course in marks report
exports.getMarksReportSlots = async (req, res) => {
  try {
    const { slot_year, semester_type, course_code, employee_id } = req.query;
    if (!slot_year || !semester_type || !course_code) {
      return res.status(400).json({ message: "slot_year, semester_type, and course_code are required" });
    }

    const params = [slot_year, semester_type, course_code];
    let empFilter = "";

    if (req.userRole === "faculty" || req.userRole === "timetable_coordinator") {
      const userResult = await db.query(
        'SELECT employee_id FROM "user" WHERE user_id = $1',
        [req.userId]
      );
      if (!userResult.rows.length || !userResult.rows[0].employee_id) {
        return res.json([]);
      }
      params.push(userResult.rows[0].employee_id);
      empFilter = ` AND ac.employee_id = $${params.length}`;
    } else if (employee_id) {
      params.push(employee_id);
      empFilter = ` AND ac.employee_id = $${params.length}`;
    }

    const query = `
      SELECT ac.slot_name, ac.venue, ac.component_type, ac.assessment_type
      FROM assessment_config ac
      WHERE ac.slot_year = $1 AND ac.semester_type = $2 AND ac.course_code = $3${empFilter}
      ORDER BY ac.slot_name
    `;

    const result = await db.query(query, params);

    // Group by slot_name+venue, collect component_types per slot
    const slotMap = {};
    for (const row of result.rows) {
      const key = `${row.slot_name}_${row.venue}`;
      if (!slotMap[key]) {
        slotMap[key] = {
          slot_name: row.slot_name,
          venue: row.venue,
          assessment_type: row.assessment_type,
          component_types: []
        };
      }
      if (!slotMap[key].component_types.includes(row.component_type)) {
        slotMap[key].component_types.push(row.component_type);
      }
    }

    // Filter out slots with 0 registered students (handles stale configs)
    const slots = Object.values(slotMap);
    const validSlots = [];
    for (const slot of slots) {
      const countResult = await db.query(`
        SELECT COUNT(DISTINCT sr.enrollment_number) as total
        FROM student_registrations sr
        WHERE sr.slot_year = $1 AND sr.semester_type = $2
          AND sr.course_code = $3
          AND ( sr.slot_name = $4
             OR ',' || REPLACE(sr.slot_name, ' ', '') || ','
                   LIKE '%,' || REPLACE($4, ' ', '') || ',%' )
          AND (sr.withdrawn IS NULL OR sr.withdrawn = false)
      `, [slot_year, semester_type, course_code, slot.slot_name]);
      if (parseInt(countResult.rows[0].total) > 0) {
        validSlots.push(slot);
      }
    }

    res.json(validSlots);
  } catch (error) {
    console.error("Error fetching marks report slots:", error);
    res.status(500).json({ message: "Error fetching slots", error: error.message });
  }
};

// Download student marks report in CoE template format
exports.getStudentMarksReport = async (req, res) => {
  try {
    const { slot_year, semester_type, course_code, slot_name, component, employee_id, items } = req.query;

    if (!slot_year || !semester_type || !component) {
      return res.status(400).json({ message: "slot_year, semester_type, and component are required" });
    }

    // Build semester label for template header
    const semLabel = `${semester_type.charAt(0)}${semester_type.slice(1).toLowerCase()} Semester ${slot_year}`;

    // Parse items filter for bulk admin downloads (format: "CSE2008:E1:313117,CSE5028:D1:313117")
    // Also build a list of "requested slots" (single-item or bulk) so we can
    // detect compound slot_name values (SUMMER lab merges) and route their
    // constituent pair-configs into a single merged group.
    let itemsFilter = null;
    let requestedSlots = [];
    if (items) {
      itemsFilter = new Set(items.split(",").map(i => {
        const [c, s, e] = i.split(":");
        return `${c}_${s}_${e}`;
      }));
      requestedSlots = items.split(",").map(i => {
        const [c, s, e] = i.split(":");
        return { course_code: c, slot_name: s, employee_id: parseInt(e) };
      });
    }
    // Non-bulk single-item requestedSlots is populated after facultyEmployeeId is resolved (below).

    // Determine faculty filter and (for HoIs) whether to restrict configs to
    // the HoI's schools.
    let facultyEmployeeId = null;
    let restrictToHoiSchools = false;
    if (req.userRole === "admin" || req.userRole === "coe") {
      // Global access; honor optional employee_id filter.
      if (employee_id) facultyEmployeeId = parseInt(employee_id);
    } else {
      // faculty or timetable_coordinator: may also be an HoI.
      const userResult = await db.query(
        'SELECT employee_id FROM "user" WHERE user_id = $1',
        [req.userId]
      );
      const ownEmpId = userResult.rows.length ? userResult.rows[0].employee_id : null;
      const reqEmpId = employee_id ? parseInt(employee_id) : null;
      const isHoi = req.hoiSchoolIds && req.hoiSchoolIds.length > 0;

      if (reqEmpId && reqEmpId !== ownEmpId) {
        // Downloading another faculty's report — HoI-only, and only within their schools.
        if (!isHoi) {
          return res.status(403).json({ message: "Not authorized to download for another faculty" });
        }
        const schoolCheck = await db.query(
          "SELECT school_id FROM faculty WHERE employee_id = $1",
          [reqEmpId]
        );
        if (!schoolCheck.rows.length || !req.hoiSchoolIds.includes(schoolCheck.rows[0].school_id)) {
          return res.status(403).json({ message: "Faculty is not in your school" });
        }
        facultyEmployeeId = reqEmpId;
      } else if (reqEmpId === ownEmpId && ownEmpId) {
        facultyEmployeeId = ownEmpId;
      } else if (isHoi) {
        // No employee_id → HoI bulk download across their school(s).
        restrictToHoiSchools = true;
      } else {
        if (!ownEmpId) {
          return res.status(400).json({ message: "Faculty employee_id not found" });
        }
        facultyEmployeeId = ownEmpId;
      }
    }

    // Populate requestedSlots for single-item mode (bulk mode already filled it above).
    if (!items && course_code && facultyEmployeeId) {
      requestedSlots.push({
        course_code,
        slot_name: slot_name || null,
        employee_id: facultyEmployeeId,
      });
    }

    // Build a compound-group map: for each requested compound slot_name, map
    // every constituent pair-slot back to the compound "target group key" so
    // the pair-configs all land in one merged group during the grouping loop.
    const compoundGroupMap = new Map(); // pairKey → { targetKey, compound_slot }
    for (const rs of requestedSlots) {
      if (rs.slot_name && isCompoundSlot(rs.slot_name)) {
        const pairs = decomposeCompoundSlot(rs.slot_name).filter(p => /^L\d+\+L\d+$/.test(p));
        if (pairs.length < 2) continue;
        const targetKey = `${rs.course_code}_${rs.slot_name}_${rs.employee_id}`;
        for (const p of pairs) {
          compoundGroupMap.set(
            `${rs.course_code}_${p}_${rs.employee_id}`,
            { targetKey, compound_slot: rs.slot_name }
          );
        }
      }
    }

    // Get assessment configs matching the filters
    let configQuery = `
      SELECT ac.id, ac.slot_year, ac.semester_type, ac.course_code, ac.employee_id,
             ac.slot_name, ac.venue, ac.assessment_type, ac.component_type, ac.config_json,
             c.course_name, c.course_type, c.theory, c.practical, c.credits,
             f.name as faculty_name
      FROM assessment_config ac
      JOIN course c ON ac.course_code = c.course_code
      JOIN faculty f ON ac.employee_id = f.employee_id
      WHERE ac.slot_year = $1 AND ac.semester_type = $2
    `;
    const configParams = [slot_year, semester_type];

    if (course_code) {
      configParams.push(course_code);
      configQuery += ` AND ac.course_code = $${configParams.length}`;
    }
    if (slot_name) {
      // Compound slot: expand to all pair-slots so the query fetches every
      // constituent pair-config in one shot. Non-compound falls back to = via ANY([single]).
      const slotFilterList = isCompoundSlot(slot_name)
        ? decomposeCompoundSlot(slot_name)
        : [slot_name];
      configParams.push(slotFilterList);
      configQuery += ` AND ac.slot_name = ANY($${configParams.length})`;
    }
    if (facultyEmployeeId) {
      configParams.push(facultyEmployeeId);
      configQuery += ` AND ac.employee_id = $${configParams.length}`;
    }
    if (restrictToHoiSchools) {
      configParams.push(req.hoiSchoolIds);
      configQuery += ` AND f.school_id = ANY($${configParams.length})`;
    }

    configQuery += " ORDER BY ac.course_code, ac.slot_name, ac.employee_id";
    const configResult = await db.query(configQuery, configParams);

    if (configResult.rows.length === 0) {
      return res.status(404).json({ message: "No assessment configurations found for the selected filters" });
    }

    // Group configs by course_code + slot_name + employee_id — with pair-configs
    // belonging to a compound-requested slot collapsed under the compound key.
    // labConfigs is an ARRAY so merged groups can hold multiple pair LAB configs.
    const groupedConfigs = {};
    for (const cfg of configResult.rows) {
      const pairKey = `${cfg.course_code}_${cfg.slot_name}_${cfg.employee_id}`;
      const compound = compoundGroupMap.get(pairKey);
      const key = compound ? compound.targetKey : pairKey;
      // If items filter is active, skip configs not in the selected items.
      if (itemsFilter && !itemsFilter.has(key)) continue;
      if (!groupedConfigs[key]) {
        groupedConfigs[key] = {
          theoryConfig: null,
          labConfigs: [],
          info: cfg,
          isCompound: !!compound,
          compoundSlot: compound ? compound.compound_slot : null,
        };
      }
      if (cfg.component_type === "THEORY") {
        groupedConfigs[key].theoryConfig = cfg;
      } else if (cfg.component_type === "LAB") {
        groupedConfigs[key].labConfigs.push(cfg);
      }
    }

    const workbook = XLSX.utils.book_new();
    let sheetCount = 0;

    for (const [key, group] of Object.entries(groupedConfigs)) {
      // Prefer THEORY config for CA components: a slot may have both LAB and
      // THEORY configs (theory course taught in a lab-format slot); picking the
      // LAB config's assessment_type would wrongly reject CA1/CA2/CA3 downloads.
      const info = (component !== "IM" && group.theoryConfig)
        ? group.theoryConfig
        : (group.labConfigs.length ? group.labConfigs[0] : group.info);
      const assessmentType = info.assessment_type;

      // Check if the requested component is valid for this slot's configs.
      const hasTheory = !!group.theoryConfig;
      const hasLab = group.labConfigs.length > 0;

      if (component === "IM") {
        // IM is valid for all slots
      } else {
        // CA components require a theory config
        if (!hasTheory) continue;
        const validComponents = getValidComponents(assessmentType);
        if (!validComponents.includes(component)) continue;
      }

      // Display slot_name for merged groups is the compound; for non-merged, the pair.
      const displaySlot = group.isCompound && group.compoundSlot ? group.compoundSlot : info.slot_name;

      // Students query — for merged groups, exact-match on the compound; for
      // non-merged, keep the SUMMER-tolerant matching.
      let studentsSql;
      let studentsParams;
      if (group.isCompound) {
        studentsSql = `
          SELECT DISTINCT sr.enrollment_number, sr.student_name, sr.program_code,
                 s.school_short_name as school
          FROM student_registrations sr
          LEFT JOIN student st ON sr.enrollment_number = st.enrollment_no
          LEFT JOIN program p ON st.program_id = p.program_id
          LEFT JOIN school s ON p.school_id = s.school_id
          WHERE sr.slot_year = $1 AND sr.semester_type = $2
            AND sr.course_code = $3
            AND sr.slot_name = $4
            AND sr.faculty_name = $5
            AND (sr.withdrawn IS NULL OR sr.withdrawn = false)
          ORDER BY sr.enrollment_number
        `;
        studentsParams = [slot_year, semester_type, info.course_code, group.compoundSlot, info.faculty_name];
      } else {
        studentsSql = `
          SELECT DISTINCT sr.enrollment_number, sr.student_name, sr.program_code,
                 s.school_short_name as school
          FROM student_registrations sr
          LEFT JOIN student st ON sr.enrollment_number = st.enrollment_no
          LEFT JOIN program p ON st.program_id = p.program_id
          LEFT JOIN school s ON p.school_id = s.school_id
          WHERE sr.slot_year = $1 AND sr.semester_type = $2
            AND sr.course_code = $3
            AND ( sr.slot_name = $4
               OR ',' || REPLACE(sr.slot_name, ' ', '') || ','
                     LIKE '%,' || REPLACE($4, ' ', '') || ',%' )
            AND sr.faculty_name = $5
            AND (sr.withdrawn IS NULL OR sr.withdrawn = false)
          ORDER BY sr.enrollment_number
        `;
        studentsParams = [slot_year, semester_type, info.course_code, info.slot_name, info.faculty_name];
      }
      const studentsResult = await db.query(studentsSql, studentsParams);

      if (studentsResult.rows.length === 0) continue;

      // For merged lab groups, look up slot start-times so lab sessions across
      // pair-configs can be ordered chronologically (date, then real slot time).
      let slotStartTimes = null;
      if (group.isCompound && group.labConfigs.length > 0) {
        const pairNames = group.labConfigs.map(c => c.slot_name);
        slotStartTimes = await getSlotStartTimeMap(slot_year, semester_type, pairNames);
      }

      // Fetch marks based on component type
      let students;
      if (component === "IM") {
        students = await fetchIMMarks(group, studentsResult.rows, assessmentType);
      } else {
        students = await fetchCAMarks(group, studentsResult.rows, component);
      }

      // Build the worksheet
      const creditStr = `${info.theory || 0}:${info.practical || 0}:${info.credits || 0}`;
      const headerInfo = {
        slotName: displaySlot,
        facultyName: info.faculty_name,
        courseCode: info.course_code,
        courseName: info.course_name,
        credits: creditStr,
        courseType: info.course_type,
        assessmentType: assessmentType,
        semesterLabel: semLabel,
        hasTheoryConfig: !!group.theoryConfig,
        hasLabConfig: hasLab,
        theoryConfigJson: group.theoryConfig ? (typeof group.theoryConfig.config_json === "string" ? JSON.parse(group.theoryConfig.config_json) : group.theoryConfig.config_json) : null,
        // Merged: pass all labConfigs so buildCoEWorksheet can render per-pair columns.
        // Non-merged: single-element array works too; buildCoEWorksheet handles both.
        labConfigs: group.labConfigs.map(c => ({
          id: c.id,
          slot_name: c.slot_name,
          config_json: typeof c.config_json === "string" ? JSON.parse(c.config_json) : c.config_json,
        })),
        isMerged: !!group.isCompound,
        slotStartTimes,
      };

      const ws = buildCoEWorksheet(headerInfo, students, component);

      // Sheet name (max 31 chars for Excel)
      let sheetName = `${displaySlot}-${info.course_code}-${component}`;
      if (sheetName.length > 31) {
        sheetName = sheetName.substring(0, 31);
      }
      // Ensure unique sheet name
      let finalSheetName = sheetName;
      let counter = 1;
      while (workbook.SheetNames.includes(finalSheetName)) {
        finalSheetName = `${sheetName.substring(0, 28)}_${counter}`;
        counter++;
      }

      XLSX.utils.book_append_sheet(workbook, ws, finalSheetName);
      sheetCount++;
    }

    if (sheetCount === 0) {
      return res.status(404).json({ message: "No data found for the selected filters and component" });
    }

    const semPrefix = semester_type === "WINTER" ? "WS" : semester_type === "FALL" ? "FS" : "SS";
    // Build filename: e.g. WS2025_26_A2_CSE2018_Dr_Vinob_Chander_R_CA1.xlsx
    const firstGroup = Object.values(groupedConfigs)[0];
    const fInfo = firstGroup ? firstGroup.info : null;
    let filename;
    if (fInfo && course_code && slot_name) {
      const cleanName = fInfo.faculty_name.replace(/\./g, "").replace(/\s+/g, "_");
      const cleanYear = slot_year.replace(/-/g, "_");
      // Compound slot_names contain commas/spaces — normalize for the filename.
      const cleanSlot = slot_name.replace(/,\s*/g, "_").replace(/\s+/g, "");
      filename = `${semPrefix}${cleanYear}_${cleanSlot}_${course_code}_${cleanName}_${component}.xlsx`;
    } else {
      const cleanYear = slot_year.replace(/-/g, "_");
      filename = `${semPrefix}${cleanYear}_${component}_marks.xlsx`;
    }

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(buffer);

  } catch (error) {
    console.error("Error generating student marks report:", error);
    res.status(500).json({ message: "Error generating marks report", error: error.message });
  }
};

// Helper: Fetch CA marks for students
async function fetchCAMarks(group, students, component) {
  // Use THEORY config for CA marks
  const config = group.theoryConfig || group.info;

  // Get marks for this CA component, summed per student
  const marksResult = await db.query(`
    SELECT sm.enrollment_number,
           SUM(sm.marks_obtained) as total_marks,
           SUM(sm.max_marks) as total_max
    FROM student_marks sm
    WHERE sm.assessment_config_id = $1
      AND sm.assessment_type = $2
    GROUP BY sm.enrollment_number
  `, [config.id, component]);

  const marksMap = {};
  let maxMarks = null;
  for (const m of marksResult.rows) {
    marksMap[m.enrollment_number] = parseFloat(m.total_marks);
    if (maxMarks === null) {
      maxMarks = parseFloat(m.total_max);
    }
  }

  return students.map(s => ({
    ...s,
    marks: marksMap[s.enrollment_number] !== undefined ? marksMap[s.enrollment_number] : null,
    max_marks: maxMarks
  }));
}

// Helper: Fetch IM marks (Assignment + Lab) for students.
// Supports multiple LAB configs per group (SUMMER compound-slot merge) — lab
// session marks are keyed by (config_id, assessment_number) so same-numbered
// sessions across pair-configs remain distinct.
async function fetchIMMarks(group, students, assessmentType) {
  const results = {};

  students.forEach(s => {
    results[s.enrollment_number] = { ...s };
  });

  // Get individual assignment marks from THEORY config
  if (group.theoryConfig && !assessmentType.endsWith("_LAB")) {
    const assignResult = await db.query(`
      SELECT sm.enrollment_number, sm.assessment_number,
             SUM(sm.marks_obtained) as marks
      FROM student_marks sm
      WHERE sm.assessment_config_id = $1
        AND sm.assessment_type = 'ASSIGNMENT'
      GROUP BY sm.enrollment_number, sm.assessment_number
    `, [group.theoryConfig.id]);

    for (const m of assignResult.rows) {
      if (results[m.enrollment_number]) {
        results[m.enrollment_number][`assignment_${m.assessment_number}`] = parseFloat(m.marks);
      }
    }
  }

  // Get individual lab session marks across ALL lab configs in the group.
  const labConfigIds = (group.labConfigs || []).map(c => c.id);
  if (labConfigIds.length > 0 && (assessmentType.endsWith("_INTEGRATED") || assessmentType.endsWith("_LAB"))) {
    const labResult = await db.query(`
      SELECT sm.enrollment_number, sm.assessment_config_id, sm.assessment_number,
             SUM(sm.marks_obtained) as marks
      FROM student_marks sm
      WHERE sm.assessment_config_id = ANY($1::int[])
        AND sm.assessment_type = 'LAB_SESSION'
      GROUP BY sm.enrollment_number, sm.assessment_config_id, sm.assessment_number
    `, [labConfigIds]);

    for (const m of labResult.rows) {
      if (results[m.enrollment_number]) {
        // Compound key so same-numbered sessions from different pair-configs
        // don't overwrite each other.
        results[m.enrollment_number][`lab_${m.assessment_config_id}_${m.assessment_number}`] = parseFloat(m.marks);
      }
    }
  }

  return students.map(s => results[s.enrollment_number]);
}

// ============ ATTENDANCE REPORT ============

// Download student attendance report
// Attendance entry summary — one row per (course, slot, faculty) allocation for
// the semester, with sessions_marked (COUNT DISTINCT attendance_date) as a
// minimal signal for the caller. Admin sees all schools; HoIs are constrained
// to their own school(s). Powers the bulk-list view for admin and HoIs.
exports.getAttendanceEntrySummary = async (req, res) => {
  try {
    const { slot_year, semester_type } = req.query;
    if (!slot_year || !semester_type) {
      return res.status(400).json({ message: "slot_year and semester_type are required" });
    }

    const params = [slot_year, semester_type];
    let hoiFilter = "";
    if (
      req.userRole !== "admin" &&
      req.userRole !== "coe" &&
      req.hoiSchoolIds &&
      req.hoiSchoolIds.length
    ) {
      params.push(req.hoiSchoolIds);
      hoiFilter = ` AND f.school_id = ANY($${params.length})`;
    }

    const result = await db.query(`
      SELECT DISTINCT fa.course_code, fa.slot_name, fa.employee_id, fa.venue,
             c.course_name, c.course_type,
             f.name AS faculty_name,
             (
               -- Count per-period sessions, not per-date. A compound theory
               -- slot (e.g. SUMMER slot A) can meet twice on the same date at
               -- different slot_times; each period is its own session.
               SELECT COUNT(DISTINCT (a.attendance_date, a.slot_time))::int
               FROM attendance a
               WHERE a.slot_year = fa.slot_year
                 AND a.semester_type = fa.semester_type
                 AND a.course_code = fa.course_code
                 AND a.slot_name = fa.slot_name
                 AND a.employee_id = fa.employee_id
             ) AS sessions_marked,
             (
               SELECT MAX(a.attendance_date)
               FROM attendance a
               WHERE a.slot_year = fa.slot_year
                 AND a.semester_type = fa.semester_type
                 AND a.course_code = fa.course_code
                 AND a.slot_name = fa.slot_name
                 AND a.employee_id = fa.employee_id
             ) AS last_marked_date
      FROM faculty_allocation fa
      JOIN course c ON fa.course_code = c.course_code
      JOIN faculty f ON fa.employee_id = f.employee_id
      WHERE fa.slot_year = $1 AND fa.semester_type = $2${hoiFilter}
      ORDER BY f.name, fa.course_code, fa.slot_name
    `, params);

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching attendance entry summary:", error);
    res.status(500).json({ message: "Error fetching attendance summary", error: error.message });
  }
};

// Build the two attendance sheets (Summary + Date-wise) for one
// (course_code, slot_name, employee_id) tuple and append them to the workbook.
// Returns true if sheets were appended, false if no students were found.
// sheetSuffix is used to disambiguate sheet names in bulk mode; ignored in single mode.
async function appendAttendanceSheets(workbook, opts) {
  const { slot_year, semester_type, semLabel, course_code, slot_name, employee_id, bulkPrefix } = opts;

  // Get course details
  const courseResult = await db.query(
    "SELECT course_name, course_type, theory, practical, credits FROM course WHERE course_code = $1",
    [course_code]
  );
  if (!courseResult.rows.length) return false;
  const course = courseResult.rows[0];

  // Get faculty name
  const facultyResult = await db.query(
    "SELECT name FROM faculty WHERE employee_id = $1",
    [employee_id]
  );
  const facultyName = facultyResult.rows.length ? facultyResult.rows[0].name : "";

  let slotFilter = "";
  const params = [slot_year, semester_type, course_code, employee_id];
  if (slot_name) {
    params.push(slot_name);
    slotFilter = ` AND a.slot_name = $${params.length}`;
  }

  const datesResult = await db.query(`
    SELECT DISTINCT a.attendance_date, a.slot_time, a.slot_day, a.slot_name
    FROM attendance a
    WHERE a.slot_year = $1 AND a.semester_type = $2
      AND a.course_code = $3 AND a.employee_id = $4${slotFilter}
    ORDER BY a.attendance_date, a.slot_time
  `, params);
  const dates = datesResult.rows;

  const studentsResult = await db.query(`
    WITH distinct_students AS (
      SELECT DISTINCT sr.enrollment_number, sr.student_name, sr.program_code
      FROM student_registrations sr
      WHERE sr.slot_year = $1 AND sr.semester_type = $2 AND sr.course_code = $3
        AND sr.faculty_name = (SELECT name FROM faculty WHERE employee_id = $4)
        -- SUMMER lab registrations store slot_name as a combined pair
        -- (e.g. "L11+L12,L31+L32") while the slot dropdown offers each pair
        -- separately; tolerate the compound form via a comma-split match.
        ${slot_name ? `AND (sr.slot_name = $5 OR $5 = ANY(regexp_split_to_array(sr.slot_name, '\\s*,\\s*')))` : ""}
        AND (sr.withdrawn IS NULL OR sr.withdrawn = false)
    )
    SELECT
      ds.enrollment_number, ds.student_name, ds.program_code,
      s.school_short_name as school,
      COUNT(a.id) as total_classes,
      COUNT(CASE WHEN a.status = 'present' OR a.is_od = true THEN 1 END) as present_count,
      COUNT(CASE WHEN a.status = 'absent' AND (a.is_od IS NULL OR a.is_od = false) THEN 1 END) as absent_count,
      COUNT(CASE WHEN a.is_od = true THEN 1 END) as od_count,
      CASE
        WHEN COUNT(a.id) = 0 THEN 0
        ELSE ROUND((COUNT(CASE WHEN a.status = 'present' OR a.is_od = true THEN 1 END)::decimal / COUNT(a.id)) * 100, 2)
      END as attendance_percentage
    FROM distinct_students ds
    JOIN student st ON ds.enrollment_number = st.enrollment_no
    LEFT JOIN program p ON st.program_id = p.program_id
    LEFT JOIN school s ON p.school_id = s.school_id
    LEFT JOIN attendance a ON st.user_id = a.student_id
      AND a.course_code = $3
      AND a.slot_year = $1
      AND a.semester_type = $2
      AND a.employee_id = $4
      ${slot_name ? `AND a.slot_name = $5` : ""}
    GROUP BY ds.enrollment_number, ds.student_name, ds.program_code, s.school_short_name
    ORDER BY ds.enrollment_number
  `, params);
  const students = studentsResult.rows;
  if (students.length === 0) return false;

  const dateWiseResult = await db.query(`
    SELECT a.student_id, st.enrollment_no as enrollment_number, a.attendance_date, a.slot_time, a.status, a.is_od
    FROM attendance a
    JOIN student st ON a.student_id = st.user_id
    WHERE a.slot_year = $1 AND a.semester_type = $2
      AND a.course_code = $3 AND a.employee_id = $4${slotFilter}
    ORDER BY a.attendance_date, a.slot_time
  `, params);
  // Map key = "YYYY-MM-DD|<slot_time>" so compound theory slots (same date,
  // two periods at different slot_times) each get their own column.
  const dateWiseMap = {};
  for (const row of dateWiseResult.rows) {
    if (!dateWiseMap[row.enrollment_number]) dateWiseMap[row.enrollment_number] = {};
    const key = `${row.attendance_date.toISOString().slice(0, 10)}|${row.slot_time || ""}`;
    dateWiseMap[row.enrollment_number][key] =
      row.is_od ? "OD" : (row.status === "present" ? "P" : "A");
  }

  // ---- Summary sheet rows ----
  const summaryRows = [];
  summaryRows.push(["AMITY UNIVERSITY BENGALURU"]);
  summaryRows.push([`Attendance Report - ${semLabel}`]);
  summaryRows.push([]);
  summaryRows.push(["Course Code", "", course_code, "Course Name", "", course.course_name]);
  summaryRows.push(["Faculty", "", facultyName, "Slot", "", slot_name || "All Slots"]);
  summaryRows.push([]);
  summaryRows.push(["S.No.", "Enrollment", "Student Name", "School", "Program", "Branch", "Total Classes", "Present", "Absent", "OD", "Attendance %"]);
  students.forEach((s, idx) => {
    const { program, branch } = parseProgramBranch(s.program_code);
    let cleanName = s.student_name.replace(/^(Mr\.?|Ms\.?|Mrs\.?|Dr\.?)\s+/i, "").toUpperCase();
    const tokens = cleanName.split(/\s+/);
    const firstMulti = tokens.findIndex(t => t.length > 1);
    if (firstMulti > 0) {
      cleanName = [...tokens.slice(firstMulti), ...tokens.slice(0, firstMulti)].join(" ");
    }
    summaryRows.push([
      idx + 1, s.enrollment_number, cleanName, s.school || "", program, branch,
      parseInt(s.total_classes), parseInt(s.present_count), parseInt(s.absent_count), parseInt(s.od_count),
      parseFloat(s.attendance_percentage)
    ]);
  });

  // ---- Date-wise sheet rows ----
  const dateHeaders = ["S.No.", "Enrollment", "Student Name"];
  dates.forEach((d, i) => {
    const dateStr = d.attendance_date.toISOString().slice(5, 10);
    // Compound theory slots meet twice per date at different slot_times; include
    // slot_time in the header so the two same-date columns are distinguishable.
    // Prefix with a session number for easy reference (e.g. "S1", "S2").
    const timeStr = d.slot_time ? ` ${d.slot_time}` : "";
    dateHeaders.push(`S${i + 1} ${dateStr}${timeStr}\n(${d.slot_day})`);
  });
  dateHeaders.push("Total", "Present", "Absent", "OD", "%");

  const dateRows = [];
  dateRows.push(["AMITY UNIVERSITY BENGALURU"]);
  dateRows.push([`Date-wise Attendance - ${semLabel}`]);
  dateRows.push([]);
  dateRows.push(["Course Code", "", course_code, "Course Name", "", course.course_name]);
  dateRows.push(["Faculty", "", facultyName, "Slot", "", slot_name || "All Slots"]);
  dateRows.push([]);
  dateRows.push(dateHeaders);
  students.forEach((s, idx) => {
    let cleanName = s.student_name.replace(/^(Mr\.?|Ms\.?|Mrs\.?|Dr\.?)\s+/i, "").toUpperCase();
    const tokens = cleanName.split(/\s+/);
    const firstMulti = tokens.findIndex(t => t.length > 1);
    if (firstMulti > 0) {
      cleanName = [...tokens.slice(firstMulti), ...tokens.slice(0, firstMulti)].join(" ");
    }
    const row = [idx + 1, s.enrollment_number, cleanName];
    dates.forEach(d => {
      const key = `${d.attendance_date.toISOString().slice(0, 10)}|${d.slot_time || ""}`;
      row.push(dateWiseMap[s.enrollment_number]?.[key] || "");
    });
    row.push(parseInt(s.total_classes), parseInt(s.present_count), parseInt(s.absent_count), parseInt(s.od_count), parseFloat(s.attendance_percentage));
    dateRows.push(row);
  });

  // Sheet names — bulk mode needs disambiguation. Excel caps at 31 chars and
  // disallows \ / ? * : [ ]  — course_code + slot are safe with those chars.
  let sumName = bulkPrefix ? `${bulkPrefix}-Sum` : "Summary";
  let dateName = bulkPrefix ? `${bulkPrefix}-Date` : "Date-wise";
  if (sumName.length > 31) sumName = sumName.slice(0, 31);
  if (dateName.length > 31) dateName = dateName.slice(0, 31);
  let counter = 1;
  const baseSum = sumName, baseDate = dateName;
  while (workbook.SheetNames.includes(sumName) || workbook.SheetNames.includes(dateName)) {
    sumName = `${baseSum.slice(0, 28)}_${counter}`;
    dateName = `${baseDate.slice(0, 28)}_${counter}`;
    counter++;
  }
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(summaryRows), sumName);
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(dateRows), dateName);
  return true;
}

exports.getStudentAttendanceReport = async (req, res) => {
  try {
    const { slot_year, semester_type, course_code, slot_name, employee_id, items } = req.query;

    if (!slot_year || !semester_type) {
      return res.status(400).json({ message: "slot_year and semester_type are required" });
    }

    // Parse item list: bulk mode uses items=course:slot:employee[,course:slot:employee...]
    // Single mode uses course_code + slot_name + employee_id (or own emp for faculty/TTC).
    let itemList;
    if (items) {
      itemList = items.split(",").map(s => {
        const parts = s.split(":");
        return {
          course_code: parts[0],
          slot_name: parts[1] || null,
          employee_id: parseInt(parts[2]),
        };
      }).filter(it => it.course_code && it.employee_id);
      if (itemList.length === 0) {
        return res.status(400).json({ message: "items parameter is empty or malformed" });
      }
    } else {
      // Respect frontend-provided employee_id when present (HoI single-download
      // from the school summary sends it). Only fall back to caller's own emp
      // when employee_id is missing — that covers the plain My-Courses flow for
      // pure faculty / TTC. The shared access-control loop below validates.
      let facultyEmployeeId = null;
      if (employee_id) {
        facultyEmployeeId = parseInt(employee_id);
      } else if (req.userRole === "faculty" || req.userRole === "timetable_coordinator") {
        const userResult = await db.query(
          'SELECT employee_id FROM "user" WHERE user_id = $1',
          [req.userId]
        );
        if (!userResult.rows.length || !userResult.rows[0].employee_id) {
          return res.status(400).json({ message: "Employee ID not found" });
        }
        facultyEmployeeId = userResult.rows[0].employee_id;
      }
      if (!course_code || !facultyEmployeeId) {
        return res.status(400).json({ message: "course_code and employee_id are required" });
      }
      itemList = [{ course_code, slot_name: slot_name || null, employee_id: facultyEmployeeId }];
    }

    // Access control per item.
    // Admin/CoE: no restriction.
    // Faculty/TTC: allowed only for their own employee_id.
    // HoI (non-admin/non-coe with hoiSchoolIds): allowed for any faculty in their school(s), plus own.
    const isAdminOrCoe = req.userRole === "admin" || req.userRole === "coe";
    const isHoi = req.hoiSchoolIds && req.hoiSchoolIds.length > 0;
    let ownEmpId = null;
    if (!isAdminOrCoe) {
      const userResult = await db.query(
        'SELECT employee_id FROM "user" WHERE user_id = $1',
        [req.userId]
      );
      ownEmpId = userResult.rows.length ? userResult.rows[0].employee_id : null;
    }
    for (const it of itemList) {
      if (isAdminOrCoe) continue;
      if (it.employee_id === ownEmpId) continue;
      if (isHoi) {
        const schoolCheck = await db.query(
          "SELECT school_id FROM faculty WHERE employee_id = $1",
          [it.employee_id]
        );
        if (!schoolCheck.rows.length || !req.hoiSchoolIds.includes(schoolCheck.rows[0].school_id)) {
          return res.status(403).json({ message: `Faculty ${it.employee_id} is not in your school` });
        }
        continue;
      }
      return res.status(403).json({ message: "Not authorized to download for another faculty" });
    }

    // Build workbook (one workbook, N items × 2 sheets each in bulk mode).
    const workbook = XLSX.utils.book_new();
    const semLabel = `${semester_type.charAt(0)}${semester_type.slice(1).toLowerCase()} Semester ${slot_year}`;
    const semPrefix = semester_type === "WINTER" ? "WS" : semester_type === "FALL" ? "FS" : "SS";
    const cleanYear = slot_year.replace(/-/g, "_");
    const isBulk = itemList.length > 1;
    let added = 0;
    for (const it of itemList) {
      const bulkPrefix = isBulk ? `${it.course_code}-${it.slot_name || "all"}` : null;
      const ok = await appendAttendanceSheets(workbook, {
        slot_year, semester_type, semLabel,
        course_code: it.course_code,
        slot_name: it.slot_name,
        employee_id: it.employee_id,
        bulkPrefix,
      });
      if (ok) added++;
    }
    if (added === 0) {
      return res.status(404).json({ message: "No students found for the selected filters" });
    }

    // Filename — preserve original shape for single-item requests; use a generic
    // bulk filename otherwise.
    let filename;
    if (!isBulk) {
      const it = itemList[0];
      const facultyResult = await db.query(
        "SELECT name FROM faculty WHERE employee_id = $1",
        [it.employee_id]
      );
      const facultyName = facultyResult.rows.length ? facultyResult.rows[0].name : "";
      const cleanFacultyName = facultyName.replace(/\./g, "").replace(/\s+/g, "_");
      if (it.slot_name) {
        filename = `${semPrefix}${cleanYear}_${it.slot_name}_${it.course_code}_${cleanFacultyName}_Attendance.xlsx`;
      } else {
        filename = `${semPrefix}${cleanYear}_${it.course_code}_${cleanFacultyName}_Attendance.xlsx`;
      }
    } else {
      filename = `${semPrefix}${cleanYear}_Attendance_${added}items.xlsx`;
    }

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(buffer);

  } catch (error) {
    console.error("Error generating attendance report:", error);
    res.status(500).json({ message: "Error generating attendance report", error: error.message });
  }
};

// Get courses for attendance report (faculty sees own, admin sees all)
exports.getAttendanceReportCourses = async (req, res) => {
  try {
    const { slot_year, semester_type } = req.query;
    if (!slot_year || !semester_type) {
      return res.status(400).json({ message: "slot_year and semester_type are required" });
    }

    const params = [slot_year, semester_type];
    let empFilter = "";

    if (req.userRole === "faculty" || req.userRole === "timetable_coordinator") {
      const userResult = await db.query(
        'SELECT employee_id FROM "user" WHERE user_id = $1',
        [req.userId]
      );
      if (!userResult.rows.length || !userResult.rows[0].employee_id) {
        return res.json([]);
      }
      params.push(userResult.rows[0].employee_id);
      empFilter = ` AND fa.employee_id = $${params.length}`;
    }

    const query = `
      SELECT DISTINCT fa.course_code, c.course_name, c.course_type,
             fa.employee_id, f.name as faculty_name
      FROM faculty_allocation fa
      JOIN course c ON fa.course_code = c.course_code
      JOIN faculty f ON fa.employee_id = f.employee_id
      WHERE fa.slot_year = $1 AND fa.semester_type = $2${empFilter}
      ORDER BY fa.course_code
    `;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching attendance report courses:", error);
    res.status(500).json({ message: "Error fetching courses", error: error.message });
  }
};

// Get slots for attendance report
exports.getAttendanceReportSlots = async (req, res) => {
  try {
    const { slot_year, semester_type, course_code, employee_id } = req.query;
    if (!slot_year || !semester_type || !course_code) {
      return res.status(400).json({ message: "slot_year, semester_type, and course_code are required" });
    }

    const params = [slot_year, semester_type, course_code];
    let empFilter = "";

    if (req.userRole === "faculty" || req.userRole === "timetable_coordinator") {
      const userResult = await db.query(
        'SELECT employee_id FROM "user" WHERE user_id = $1',
        [req.userId]
      );
      if (!userResult.rows.length || !userResult.rows[0].employee_id) {
        return res.json([]);
      }
      params.push(userResult.rows[0].employee_id);
      empFilter = ` AND fa.employee_id = $${params.length}`;
    } else if (employee_id) {
      params.push(employee_id);
      empFilter = ` AND fa.employee_id = $${params.length}`;
    }

    const query = `
      SELECT DISTINCT fa.slot_name, fa.venue
      FROM faculty_allocation fa
      WHERE fa.slot_year = $1 AND fa.semester_type = $2 AND fa.course_code = $3${empFilter}
      ORDER BY fa.slot_name
    `;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching attendance report slots:", error);
    res.status(500).json({ message: "Error fetching slots", error: error.message });
  }
};

// ============ DEBAR LIST REPORT ============

// Download debar list report (admin only)
exports.getDebarListReport = async (req, res) => {
  try {
    const { slot_year, semester_type, level, school, cutoff_date } = req.query;

    if (!slot_year || !semester_type || !level || !cutoff_date) {
      return res.status(400).json({ message: "slot_year, semester_type, level, and cutoff_date are required" });
    }

    // Build level filter based on course code 4th digit
    let levelFilter = "";
    if (level === "UG") {
      levelFilter = " AND CAST(SUBSTRING(fa.course_code, 4, 1) AS INTEGER) BETWEEN 1 AND 4";
    } else if (level === "PG") {
      levelFilter = " AND CAST(SUBSTRING(fa.course_code, 4, 1) AS INTEGER) BETWEEN 5 AND 6";
    }

    // Build school filter
    let schoolFilter = "";
    const params = [slot_year, semester_type, cutoff_date];
    if (school) {
      params.push(school);
      schoolFilter = ` AND sch.school_short_name = $${params.length}`;
    }

    // Get all theory course-slot-faculty combos with attendance stats per student up to cutoff date
    const result = await db.query(`
      WITH distinct_students AS (
        SELECT DISTINCT sr.enrollment_number, sr.student_name, sr.program_code,
               sr.course_code, c.course_name, sr.slot_name, sr.faculty_name,
               sch.school_short_name as school
        FROM student_registrations sr
        JOIN student st ON sr.enrollment_number = st.enrollment_no
        JOIN program p ON st.program_id = p.program_id
        JOIN school sch ON p.school_id = sch.school_id
        JOIN course c ON sr.course_code = c.course_code
        JOIN faculty_allocation fa ON fa.course_code = sr.course_code
          AND fa.slot_year = sr.slot_year AND fa.semester_type = sr.semester_type
          AND fa.slot_name = sr.slot_name
          AND (SELECT name FROM faculty WHERE employee_id = fa.employee_id) = sr.faculty_name
        WHERE sr.slot_year = $1 AND sr.semester_type = $2
          AND sr.slot_name NOT LIKE 'L%'
          AND (sr.withdrawn IS NULL OR sr.withdrawn = false)
          ${levelFilter}${schoolFilter}
      ),
      student_attendance AS (
        SELECT
          ds.enrollment_number, ds.student_name, ds.program_code,
          ds.course_code, ds.course_name, ds.slot_name, ds.faculty_name, ds.school,
          COUNT(a.id) as total_classes,
          COUNT(CASE WHEN a.status = 'present' AND a.is_od IS NOT TRUE THEN 1 END) as present_count,
          COUNT(CASE WHEN a.status = 'absent' AND a.is_od IS NOT TRUE THEN 1 END) as absent_count,
          COUNT(CASE WHEN a.is_od = true THEN 1 END) as od_count,
          CASE
            WHEN COUNT(a.id) = 0 THEN 0
            ELSE ROUND((COUNT(CASE WHEN a.status = 'present' OR a.is_od = true THEN 1 END)::decimal / COUNT(a.id)) * 100, 2)
          END as attendance_percentage
        FROM distinct_students ds
        JOIN student st ON ds.enrollment_number = st.enrollment_no
        JOIN faculty f ON f.name = ds.faculty_name
        LEFT JOIN attendance a ON st.user_id = a.student_id
          AND a.course_code = ds.course_code
          AND a.slot_name = ds.slot_name
          AND a.slot_year = $1
          AND a.semester_type = $2
          AND a.employee_id = f.employee_id
          AND a.attendance_date <= $3::date
        GROUP BY ds.enrollment_number, ds.student_name, ds.program_code,
                 ds.course_code, ds.course_name, ds.slot_name, ds.faculty_name, ds.school
      )
      SELECT * FROM student_attendance
      ORDER BY school, course_code, slot_name, enrollment_number
    `, params);

    const allRows = result.rows;

    if (allRows.length === 0) {
      return res.status(404).json({ message: "No student registrations found for the selected filters" });
    }

    // Categorize
    const eligible = [];
    const ineligible = [];
    const noData = [];
    for (const r of allRows) {
      const total = parseInt(r.total_classes);
      const pct = parseFloat(r.attendance_percentage);
      if (total === 0) noData.push(r);
      else if (pct >= 75) eligible.push(r);
      else ineligible.push(r);
    }

    // Per-school breakdown for summary sheet
    const schoolCounts = {};
    const bump = (rows, key) => {
      for (const r of rows) {
        const s = r.school || "Unknown";
        if (!schoolCounts[s]) schoolCounts[s] = { eligible: 0, ineligible: 0, noData: 0 };
        schoolCounts[s][key] += 1;
      }
    };
    bump(eligible, "eligible");
    bump(ineligible, "ineligible");
    bump(noData, "noData");

    const workbook = XLSX.utils.book_new();
    const semLabel = `${semester_type.charAt(0)}${semester_type.slice(1).toLowerCase()} Semester ${slot_year}`;
    const levelLabel = level === "All" ? "UG & PG" : level;

    // Summary sheet
    const summaryRows = [];
    summaryRows.push(["AMITY UNIVERSITY BENGALURU"]);
    summaryRows.push([`Debar List (75% Attendance Rule, Theory Only) - ${levelLabel}`]);
    summaryRows.push([`${semLabel} | Cutoff Date: ${cutoff_date}`]);
    summaryRows.push([]);
    summaryRows.push(["School", "Eligible", "Ineligible (Debarred)", "No Data / Not Marked", "Total"]);

    const schoolNames = Object.keys(schoolCounts).sort();
    let gEligible = 0, gIneligible = 0, gNoData = 0;
    schoolNames.forEach(s => {
      const c = schoolCounts[s];
      const rowTotal = c.eligible + c.ineligible + c.noData;
      summaryRows.push([s, c.eligible, c.ineligible, c.noData, rowTotal]);
      gEligible += c.eligible;
      gIneligible += c.ineligible;
      gNoData += c.noData;
    });
    summaryRows.push([]);
    summaryRows.push(["Grand Total", gEligible, gIneligible, gNoData, gEligible + gIneligible + gNoData]);

    const summaryWs = XLSX.utils.aoa_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(workbook, summaryWs, "Summary");

    // Data sheets
    const headers = ["S.No.", "Enrollment", "Student Name", "Program", "Branch", "School", "Course Code", "Course Name", "Slot", "Faculty", "Total Classes", "Present", "Absent", "OD", "Attendance %"];

    const formatName = (raw) => {
      let cleanName = raw.replace(/^(Mr\.?|Ms\.?|Mrs\.?|Dr\.?)\s+/i, "").toUpperCase();
      const tokens = cleanName.split(/\s+/);
      const firstMulti = tokens.findIndex(t => t.length > 1);
      if (firstMulti > 0) {
        cleanName = [...tokens.slice(firstMulti), ...tokens.slice(0, firstMulti)].join(" ");
      }
      return cleanName;
    };

    const buildDataSheet = (title, students, includePct) => {
      const rows = [];
      rows.push(["AMITY UNIVERSITY BENGALURU"]);
      rows.push([`${title} (${levelLabel})`]);
      rows.push([`${semLabel} | Cutoff Date: ${cutoff_date}`]);
      rows.push([]);
      rows.push(headers);

      students.forEach((s, idx) => {
        const { program, branch } = parseProgramBranch(s.program_code);
        rows.push([
          idx + 1, s.enrollment_number, formatName(s.student_name), program, branch, s.school || "",
          s.course_code, s.course_name, s.slot_name, s.faculty_name,
          parseInt(s.total_classes), parseInt(s.present_count), parseInt(s.absent_count), parseInt(s.od_count),
          includePct ? parseFloat(s.attendance_percentage) : ""
        ]);
      });
      return XLSX.utils.aoa_to_sheet(rows);
    };

    XLSX.utils.book_append_sheet(workbook, buildDataSheet("Eligible Students (>= 75%)", eligible, true), "Eligible");
    XLSX.utils.book_append_sheet(workbook, buildDataSheet("Ineligible Students / Debarred (< 75%)", ineligible, true), "Ineligible");
    XLSX.utils.book_append_sheet(workbook, buildDataSheet("No Attendance Data / Not Marked", noData, false), "No Data");

    // Generate filename
    const semPrefix = semester_type === "WINTER" ? "WS" : semester_type === "FALL" ? "FS" : "SS";
    const cleanYear = slot_year.replace(/-/g, "_");
    const filename = `${semPrefix}${cleanYear}_${levelLabel.replace(/\s+/g, "_").replace(/&/g, "and")}_Debar_List_${cutoff_date}.xlsx`;

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(buffer);

  } catch (error) {
    console.error("Error generating debar list report:", error);
    res.status(500).json({ message: "Error generating report", error: error.message });
  }
};

// ============ COURSES REPORT ============

// Download courses report
exports.getCoursesReport = async (req, res) => {
  try {
    const { school, course_type } = req.query;

    let query = `
      SELECT course_code, course_name, theory, practical, credits, course_type, course_owner,
             prerequisite, antirequisite, course_equivalence, programs_offered_to, curriculum_version, remarks
      FROM course
      WHERE is_active = true
    `;
    const params = [];

    if (school) {
      params.push(school);
      query += ` AND course_owner = $${params.length}`;
    }
    if (course_type) {
      params.push(course_type);
      query += ` AND course_type = $${params.length}`;
    }

    query += " ORDER BY course_owner, course_code";

    const result = await db.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "No courses found for the selected filters" });
    }

    const workbook = XLSX.utils.book_new();

    const headers = ["Course Code", "Course Name", "Theory", "Practical", "Credits", "TPC", "Course Type", "School",
                     "Prerequisite", "Antirequisite", "Course Equivalence", "Programs Offered To", "Curriculum Version", "Remarks"];

    const rows = [headers];
    result.rows.forEach(c => {
      rows.push([
        c.course_code,
        c.course_name,
        c.theory,
        c.practical,
        c.credits,
        `${c.theory}:${c.practical}:${c.credits}`,
        c.course_type,
        c.course_owner,
        c.prerequisite || "",
        c.antirequisite || "",
        c.course_equivalence || "",
        c.programs_offered_to || "",
        c.curriculum_version || "",
        c.remarks || ""
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Force TPC column (index 5) to text format so Excel doesn't interpret as date
    const range = XLSX.utils.decode_range(ws["!ref"]);
    for (let r = 1; r <= range.e.r; r++) {
      const cellRef = XLSX.utils.encode_cell({ r, c: 5 });
      if (ws[cellRef]) {
        ws[cellRef].t = "s"; // Force string type
      }
    }

    XLSX.utils.book_append_sheet(workbook, ws, "Courses");

    const filename = school ? `Courses_${school}.xlsx` : "Courses_All.xlsx";
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(buffer);

  } catch (error) {
    console.error("Error generating courses report:", error);
    res.status(500).json({ message: "Error generating report", error: error.message });
  }
};

// Return the current user's HoI (Head of Institution) status and school list.
// Frontend uses this to decide whether to render the school-scoped Student
// Marks Report view (and whether to show the "My courses | My school" toggle
// for users who are also Timetable Coordinators).
exports.getHoiStatus = async (req, res) => {
  try {
    const schoolIds = req.hoiSchoolIds || [];
    if (schoolIds.length === 0) {
      return res.json({ isHoi: false, schools: [] });
    }
    const result = await db.query(
      `SELECT school_id, school_short_name, school_long_name
       FROM school
       WHERE school_id = ANY($1)
       ORDER BY school_short_name`,
      [schoolIds]
    );
    res.json({ isHoi: true, schools: result.rows });
  } catch (error) {
    console.error("Error fetching HoI status:", error);
    res.status(500).json({ message: "Error fetching HoI status", error: error.message });
  }
};
