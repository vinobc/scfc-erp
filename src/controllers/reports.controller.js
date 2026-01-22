const db = require("../config/db");
const XLSX = require("xlsx");

// Get all student registrations for download
exports.getStudentRegistrations = async (req, res) => {
  try {
    const format = req.query.format || "excel"; // excel, csv, or both

    // Query all student registrations
    const result = await db.query(`
      SELECT
        enrollment_number,
        student_name,
        program_code,
        year_admitted,
        slot_year,
        semester_type,
        course_code,
        course_name,
        theory,
        practical,
        credits,
        course_type,
        slot_name,
        venue,
        faculty_name,
        component_type,
        withdrawn,
        created_at,
        updated_at
      FROM student_registrations
      ORDER BY slot_year DESC, semester_type, enrollment_number, course_code
    `);

    const data = result.rows;
    const timestamp = new Date().toISOString().slice(0, 10);

    if (format === "excel") {
      // Generate Excel file
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Student Registrations");

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="student_registrations_${timestamp}.xlsx"`
      );
      return res.send(buffer);
    } else if (format === "csv") {
      // Generate CSV
      const worksheet = XLSX.utils.json_to_sheet(data);
      const csvContent = XLSX.utils.sheet_to_csv(worksheet);

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="student_registrations_${timestamp}.csv"`
      );
      return res.send(csvContent);
    } else if (format === "both") {
      // Generate both and return as JSON with base64 encoded files
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Student Registrations");

      const excelBuffer = XLSX.write(workbook, {
        type: "buffer",
        bookType: "xlsx",
      });
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
      return res
        .status(400)
        .json({ message: "Invalid format. Use 'excel', 'csv', or 'both'" });
    }
  } catch (error) {
    console.error("Error generating student registrations report:", error);
    res
      .status(500)
      .json({ message: "Error generating report", error: error.message });
  }
};
