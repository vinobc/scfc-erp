const db = require("../config/db");
const XLSX = require("xlsx");

// List currently blocked students (joined with student name + program).
// Optional ?search= matches enrollment_no or student name.
exports.listBlocks = async (req, res) => {
  try {
    const search = (req.query.search || "").trim();
    const params = [];
    let where = "WHERE b.unblocked_at IS NULL";
    if (search) {
      params.push(`%${search}%`);
      where += ` AND (b.enrollment_no ILIKE $${params.length} OR s.student_name ILIKE $${params.length})`;
    }

    const result = await db.query(
      `SELECT b.block_id, b.enrollment_no, b.block_reason, b.notes,
              b.blocked_at, b.blocked_by,
              s.student_name, s.program_name,
              u.username AS blocked_by_username
         FROM student_registration_block b
         JOIN student s ON s.enrollment_no = b.enrollment_no
         LEFT JOIN "user" u ON u.user_id = b.blocked_by
         ${where}
         ORDER BY b.blocked_at DESC`,
      params
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("List registration blocks error:", error);
    res.status(500).json({ message: "Server error while listing registration blocks" });
  }
};

const DEFAULT_BLOCK_REASON = "Administrative hold";

// Add a block for a single student.
exports.addBlock = async (req, res) => {
  try {
    const enrollmentNo = String(req.body.enrollment_no || "").trim();
    const blockReason =
      String(req.body.block_reason || "").trim() || DEFAULT_BLOCK_REASON;
    const notes = req.body.notes ? String(req.body.notes).trim() || null : null;

    if (!enrollmentNo) {
      return res.status(400).json({
        message: "enrollment_no is required",
      });
    }

    const studentCheck = await db.query(
      `SELECT 1 FROM student WHERE enrollment_no = $1`,
      [enrollmentNo]
    );
    if (studentCheck.rows.length === 0) {
      return res.status(404).json({
        message: `Student with enrollment_no '${enrollmentNo}' not found`,
      });
    }

    const existing = await db.query(
      `SELECT 1 FROM student_registration_block
        WHERE enrollment_no = $1 AND unblocked_at IS NULL`,
      [enrollmentNo]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({
        message: `Student '${enrollmentNo}' is already on the block list`,
      });
    }

    const result = await db.query(
      `INSERT INTO student_registration_block
         (enrollment_no, block_reason, notes, blocked_by)
       VALUES ($1, $2, $3, $4)
       RETURNING block_id, enrollment_no, block_reason, notes, blocked_at`,
      [enrollmentNo, blockReason, notes, req.userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Add registration block error:", error);
    res.status(500).json({ message: "Server error while adding registration block" });
  }
};

// Bulk upload from Excel. Mirrors the importStudents pattern.
// Required columns: enrollment_no, block_reason. Optional: notes.
exports.importBlocks = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Please upload an Excel file" });
    }

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json(worksheet);

    if (rawData.length === 0) {
      return res.status(400).json({ message: "Excel file has no data" });
    }

    // Normalize headers: trim whitespace and lowercase so trailing spaces in
    // header cells don't break the upload.
    const data = rawData.map((row) => {
      const normalized = {};
      for (const k of Object.keys(row)) {
        normalized[String(k).trim().toLowerCase()] = row[k];
      }
      return normalized;
    });

    // Only enrollment_no column is required. block_reason and notes are optional.
    const allKeys = new Set();
    data.forEach((row) => Object.keys(row).forEach((k) => allKeys.add(k)));
    if (!allKeys.has("enrollment_no")) {
      return res.status(400).json({
        message: "Excel file is missing required field: enrollment_no",
        expectedFields: ["enrollment_no", "block_reason (optional)", "notes (optional)"],
      });
    }

    await db.query("BEGIN");

    const results = {
      total: data.length,
      imported: 0,
      skippedAlreadyBlocked: 0,
      errors: [],
    };

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        const enrollmentNo = String(row.enrollment_no || "").trim();
        const blockReason =
          String(row.block_reason || "").trim() || DEFAULT_BLOCK_REASON;
        const notes = row.notes ? String(row.notes).trim() || null : null;

        if (!enrollmentNo) throw new Error("enrollment_no is empty");

        const studentCheck = await db.query(
          `SELECT 1 FROM student WHERE enrollment_no = $1`,
          [enrollmentNo]
        );
        if (studentCheck.rows.length === 0) {
          throw new Error(`Student '${enrollmentNo}' not found`);
        }

        const existing = await db.query(
          `SELECT 1 FROM student_registration_block
            WHERE enrollment_no = $1 AND unblocked_at IS NULL`,
          [enrollmentNo]
        );
        if (existing.rows.length > 0) {
          results.skippedAlreadyBlocked++;
          continue;
        }

        await db.query(
          `INSERT INTO student_registration_block
             (enrollment_no, block_reason, notes, blocked_by)
           VALUES ($1, $2, $3, $4)`,
          [enrollmentNo, blockReason, notes, req.userId]
        );

        results.imported++;
      } catch (error) {
        results.errors.push({ row: i + 2, message: error.message });
      }
    }

    if (results.imported > 0 || results.skippedAlreadyBlocked > 0) {
      await db.query("COMMIT");
    } else {
      await db.query("ROLLBACK");
      return res.status(400).json({
        message: "No students were blocked due to errors",
        results,
      });
    }

    res.status(200).json({
      message: `Imported ${results.imported} of ${results.total} (skipped ${results.skippedAlreadyBlocked} already-blocked)`,
      results,
    });
  } catch (error) {
    await db.query("ROLLBACK");
    console.error("Import registration blocks error:", error);
    res.status(500).json({
      message: "Server error while importing registration blocks",
      error: error.message,
    });
  }
};

// Unblock a student. Sets unblocked_at / unblocked_by on the active row.
exports.unblockStudent = async (req, res) => {
  try {
    const { enrollment_no } = req.params;

    const result = await db.query(
      `UPDATE student_registration_block
          SET unblocked_at = CURRENT_TIMESTAMP, unblocked_by = $2
        WHERE enrollment_no = $1 AND unblocked_at IS NULL
        RETURNING block_id, enrollment_no, unblocked_at`,
      [enrollment_no, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: `No active block found for '${enrollment_no}'`,
      });
    }

    res.status(200).json({
      message: `Student '${enrollment_no}' has been unblocked`,
      record: result.rows[0],
    });
  } catch (error) {
    console.error("Unblock student error:", error);
    res.status(500).json({ message: "Server error while unblocking student" });
  }
};

// History of all block/unblock records for a student (active + past).
exports.getHistory = async (req, res) => {
  try {
    const { enrollment_no } = req.params;

    const result = await db.query(
      `SELECT b.block_id, b.enrollment_no, b.block_reason, b.notes,
              b.blocked_at, b.blocked_by, b.unblocked_at, b.unblocked_by,
              ub.username AS blocked_by_username,
              uu.username AS unblocked_by_username
         FROM student_registration_block b
         LEFT JOIN "user" ub ON ub.user_id = b.blocked_by
         LEFT JOIN "user" uu ON uu.user_id = b.unblocked_by
        WHERE b.enrollment_no = $1
        ORDER BY b.blocked_at DESC`,
      [enrollment_no]
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Get block history error:", error);
    res.status(500).json({ message: "Server error while fetching block history" });
  }
};
