const db = require("../config/db");
const XLSX = require("xlsx");

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
  const { slotName, facultyName, courseCode, courseName, credits, courseType, assessmentType, semesterLabel, hasTheoryConfig, hasLabConfig } = headerInfo;

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
  if (component === "IM") {
    // Get max marks from first student that has data
    let assignMax = "";
    let labMax = "";
    for (const s of students) {
      if (assignMax === "" && s.assignment_max !== null && s.assignment_max !== undefined) assignMax = s.assignment_max;
      if (labMax === "" && s.lab_max !== null && s.lab_max !== undefined) labMax = s.lab_max;
      if (assignMax !== "" && labMax !== "") break;
    }

    const showAssignment = hasTheoryConfig;
    const showLab = hasLabConfig;

    if (showAssignment && showLab) {
      const totalMax = (assignMax || 0) + (labMax || 0);
      marksHeaders = [`Assignment Marks\n(${assignMax})`, `Lab Marks\n(${labMax})`, `Total\n(${totalMax})`];
    } else if (showAssignment) {
      marksHeaders = [`Assignment Marks\n(${assignMax})`];
    } else if (showLab) {
      marksHeaders = [`Lab Marks\n(${labMax})`];
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
    const row = [idx + 1, s.enrollment_number, cleanName, s.school || "ASET", program, branch];

    if (component === "IM") {
      if (hasTheoryConfig && hasLabConfig) {
        row.push(s.assignment_marks !== null ? s.assignment_marks : "");
        row.push(s.lab_marks !== null ? s.lab_marks : "");
        const total = (s.assignment_marks || 0) + (s.lab_marks || 0);
        row.push(s.assignment_marks !== null || s.lab_marks !== null ? total : "");
      } else if (hasTheoryConfig) {
        row.push(s.assignment_marks !== null ? s.assignment_marks : "");
      } else if (hasLabConfig) {
        row.push(s.lab_marks !== null ? s.lab_marks : "");
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

    if (req.userRole === "faculty") {
      // Get faculty's employee_id
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

    // Get ALL faculty-course-slot combos from faculty_allocation
    const allocationResult = await db.query(`
      SELECT DISTINCT fa.course_code, fa.slot_name, fa.employee_id, fa.venue,
             c.course_name, c.course_type, c.theory, c.practical, c.credits,
             f.name as faculty_name
      FROM faculty_allocation fa
      JOIN course c ON fa.course_code = c.course_code
      JOIN faculty f ON fa.employee_id = f.employee_id
      WHERE fa.slot_year = $1 AND fa.semester_type = $2
      ORDER BY fa.course_code, fa.slot_name, f.name
    `, [slot_year, semester_type]);

    // Get all assessment configs for this semester (for lookup)
    const configResult = await db.query(`
      SELECT ac.id, ac.course_code, ac.slot_name, ac.employee_id, ac.assessment_type, ac.component_type
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

    const summary = [];
    const processedKeys = new Set();

    for (const alloc of allocationResult.rows) {
      const groupKey = `${alloc.course_code}_${alloc.slot_name}_${alloc.employee_id}`;
      if (processedKeys.has(groupKey)) continue;
      processedKeys.add(groupKey);

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

      // Check if assessment config exists
      const configs = configMap[groupKey] || [];
      const hasConfig = configs.length > 0;

      // Get total registered students
      const totalResult = await db.query(`
        SELECT COUNT(DISTINCT sr.enrollment_number) as total
        FROM student_registrations sr
        WHERE sr.slot_year = $1 AND sr.semester_type = $2
          AND sr.course_code = $3 AND sr.slot_name = $4
          AND (sr.withdrawn IS NULL OR sr.withdrawn = false)
      `, [slot_year, semester_type, alloc.course_code, alloc.slot_name]);

      const totalStudents = parseInt(totalResult.rows[0].total);

      let status;
      let studentsWithMarks = 0;

      if (!hasConfig) {
        status = "Not Configured";
      } else {
        // Check marks entry status
        if (component === "IM") {
          const marksResult = await db.query(`
            SELECT COUNT(DISTINCT sm.enrollment_number) as entered
            FROM student_marks sm
            JOIN assessment_config ac2 ON sm.assessment_config_id = ac2.id
            WHERE ac2.slot_year = $1 AND ac2.semester_type = $2
              AND ac2.course_code = $3 AND ac2.slot_name = $4 AND ac2.employee_id = $5
              AND sm.assessment_type IN ('ASSIGNMENT', 'LAB_SESSION')
              AND sm.marks_obtained IS NOT NULL
          `, [slot_year, semester_type, alloc.course_code, alloc.slot_name, alloc.employee_id]);
          studentsWithMarks = parseInt(marksResult.rows[0].entered);
        } else {
          // Find the THEORY config for CA marks
          const theoryConfig = configs.find(c => c.component_type === "THEORY");
          if (theoryConfig) {
            const marksResult = await db.query(`
              SELECT COUNT(DISTINCT sm.enrollment_number) as entered
              FROM student_marks sm
              WHERE sm.assessment_config_id = $1
                AND sm.assessment_type = $2
                AND sm.marks_obtained IS NOT NULL
            `, [theoryConfig.id, component]);
            studentsWithMarks = parseInt(marksResult.rows[0].entered);
          }
        }

        if (studentsWithMarks === 0) {
          status = "Not Entered";
        } else if (studentsWithMarks >= totalStudents) {
          status = "Complete";
        } else {
          status = "Partial";
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
        status: status,
        theory: alloc.theory,
        practical: alloc.practical,
        credits: alloc.credits
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

    if (req.userRole === "faculty") {
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
          AND sr.course_code = $3 AND sr.slot_name = $4
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
    let itemsFilter = null;
    if (items) {
      itemsFilter = new Set(items.split(",").map(i => {
        const [c, s, e] = i.split(":");
        return `${c}_${s}_${e}`;
      }));
    }

    // Determine faculty filter
    let facultyEmployeeId = null;
    if (req.userRole === "faculty") {
      const userResult = await db.query(
        'SELECT employee_id FROM "user" WHERE user_id = $1',
        [req.userId]
      );
      if (!userResult.rows.length || !userResult.rows[0].employee_id) {
        return res.status(400).json({ message: "Faculty employee_id not found" });
      }
      facultyEmployeeId = userResult.rows[0].employee_id;
    } else if (employee_id) {
      facultyEmployeeId = parseInt(employee_id);
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
      configParams.push(slot_name);
      configQuery += ` AND ac.slot_name = $${configParams.length}`;
    }
    if (facultyEmployeeId) {
      configParams.push(facultyEmployeeId);
      configQuery += ` AND ac.employee_id = $${configParams.length}`;
    }

    configQuery += " ORDER BY ac.course_code, ac.slot_name, ac.employee_id";
    const configResult = await db.query(configQuery, configParams);

    if (configResult.rows.length === 0) {
      return res.status(404).json({ message: "No assessment configurations found for the selected filters" });
    }

    // Group configs by course_code + slot_name + employee_id (unique combo for a sheet)
    const groupedConfigs = {};
    for (const cfg of configResult.rows) {
      const key = `${cfg.course_code}_${cfg.slot_name}_${cfg.employee_id}`;
      // If items filter is active, skip configs not in the selected items
      if (itemsFilter && !itemsFilter.has(key)) continue;
      if (!groupedConfigs[key]) {
        groupedConfigs[key] = { theoryConfig: null, labConfig: null, info: cfg };
      }
      if (cfg.component_type === "THEORY") {
        groupedConfigs[key].theoryConfig = cfg;
      } else if (cfg.component_type === "LAB") {
        groupedConfigs[key].labConfig = cfg;
      }
    }

    const workbook = XLSX.utils.book_new();
    let sheetCount = 0;

    for (const [key, group] of Object.entries(groupedConfigs)) {
      const info = group.info;
      const assessmentType = info.assessment_type;

      // Check if the requested component is valid for this slot's configs
      // Lab-only slots (only labConfig) should only allow IM
      // Theory-only slots should allow CAs + IM
      const hasTheory = !!group.theoryConfig;
      const hasLab = !!group.labConfig;

      if (component === "IM") {
        // IM is valid for all slots
      } else {
        // CA components require a theory config
        if (!hasTheory) continue;
        const validComponents = getValidComponents(assessmentType);
        if (!validComponents.includes(component)) continue;
      }

      // Get students registered for this course-slot
      const studentsResult = await db.query(`
        SELECT DISTINCT sr.enrollment_number, sr.student_name, sr.program_code
        FROM student_registrations sr
        WHERE sr.slot_year = $1 AND sr.semester_type = $2
          AND sr.course_code = $3 AND sr.slot_name = $4
          AND (sr.withdrawn IS NULL OR sr.withdrawn = false)
        ORDER BY sr.enrollment_number
      `, [slot_year, semester_type, info.course_code, info.slot_name]);

      if (studentsResult.rows.length === 0) continue;

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
        slotName: info.slot_name,
        facultyName: info.faculty_name,
        courseCode: info.course_code,
        courseName: info.course_name,
        credits: creditStr,
        courseType: info.course_type,
        assessmentType: assessmentType,
        semesterLabel: semLabel,
        hasTheoryConfig: !!group.theoryConfig,
        hasLabConfig: !!group.labConfig
      };

      const ws = buildCoEWorksheet(headerInfo, students, component);

      // Sheet name (max 31 chars for Excel)
      let sheetName = `${info.slot_name}-${info.course_code}-${component}`;
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
      filename = `${semPrefix}${cleanYear}_${slot_name}_${course_code}_${cleanName}_${component}.xlsx`;
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

// Helper: Fetch IM marks (Assignment + Lab) for students
async function fetchIMMarks(group, students, assessmentType) {
  const results = {};
  let assignmentMaxMarks = null;
  let labMaxMarks = null;

  students.forEach(s => {
    results[s.enrollment_number] = {
      ...s,
      assignment_marks: null,
      lab_marks: null,
      assignment_max: null,
      lab_max: null
    };
  });

  // Get assignment marks from THEORY config
  if (group.theoryConfig && !assessmentType.endsWith("_LAB")) {
    const assignResult = await db.query(`
      SELECT sm.enrollment_number,
             SUM(sm.marks_obtained) as total_marks,
             SUM(sm.max_marks) as total_max
      FROM student_marks sm
      WHERE sm.assessment_config_id = $1
        AND sm.assessment_type = 'ASSIGNMENT'
      GROUP BY sm.enrollment_number
    `, [group.theoryConfig.id]);

    for (const m of assignResult.rows) {
      if (results[m.enrollment_number]) {
        results[m.enrollment_number].assignment_marks = parseFloat(m.total_marks);
      }
      if (assignmentMaxMarks === null) {
        assignmentMaxMarks = parseFloat(m.total_max);
      }
    }
  }

  // Get lab marks from LAB config (for INTEGRATED and LAB courses)
  if (group.labConfig && (assessmentType.endsWith("_INTEGRATED") || assessmentType.endsWith("_LAB"))) {
    const labResult = await db.query(`
      SELECT sm.enrollment_number,
             SUM(sm.marks_obtained) as total_marks,
             SUM(sm.max_marks) as total_max
      FROM student_marks sm
      WHERE sm.assessment_config_id = $1
        AND sm.assessment_type = 'LAB_SESSION'
      GROUP BY sm.enrollment_number
    `, [group.labConfig.id]);

    for (const m of labResult.rows) {
      if (results[m.enrollment_number]) {
        results[m.enrollment_number].lab_marks = parseFloat(m.total_marks);
      }
      if (labMaxMarks === null) {
        labMaxMarks = parseFloat(m.total_max);
      }
    }
  }

  return students.map(s => ({
    ...results[s.enrollment_number],
    assignment_max: assignmentMaxMarks,
    lab_max: labMaxMarks
  }));
}
