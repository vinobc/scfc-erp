const db = require("../config/db");
const XLSX = require("xlsx");

// Get student registrations for download (with optional filters)
exports.getStudentRegistrations = async (req, res) => {
  try {
    const format = req.query.format || "excel";
    const { slot_year, semester_type, school, program_code, course_code } = req.query;

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
