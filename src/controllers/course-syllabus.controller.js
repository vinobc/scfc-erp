const db = require("../config/db");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Resolve upload directory from env var, defaulting to src/uploads/syllabus.
// Env var lets ops relocate to a mounted volume without code changes.
const uploadDir = process.env.SYLLABUS_UPLOAD_DIR
  ? path.resolve(process.env.SYLLABUS_UPLOAD_DIR)
  : path.join(__dirname, "../uploads/syllabus");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname).toLowerCase());
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (file.fieldname === "pdf" && ext === ".pdf") return cb(null, true);
  if (file.fieldname === "word" && (ext === ".docx" || ext === ".doc")) return cb(null, true);
  cb(new Error(`Invalid file type for field ${file.fieldname}`));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB per file
}).fields([
  { name: "pdf", maxCount: 1 },
  { name: "word", maxCount: 1 },
]);

function safeUnlink(filePath) {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (err) {
    console.error("Failed to unlink", filePath, err.message);
  }
}

const VERSION_REGEX = /^\d+\.\d{2}$/;

function toStringArray(value) {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((v) => String(v).trim()).filter(Boolean);
    } catch (_) {
      // Not JSON — treat as comma-separated fallback.
      return value.split(",").map((v) => v.trim()).filter(Boolean);
    }
  }
  return [];
}

function toBool(value) {
  if (value === true || value === false) return value;
  if (typeof value === "string") {
    const v = value.toLowerCase().trim();
    return v === "true" || v === "1" || v === "yes" || v === "y";
  }
  return false;
}

exports.uploadSyllabus = (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }

    const pdfFile = req.files && req.files.pdf ? req.files.pdf[0] : null;
    const wordFile = req.files && req.files.word ? req.files.word[0] : null;

    const cleanupUploads = () => {
      if (pdfFile) safeUnlink(pdfFile.path);
      if (wordFile) safeUnlink(wordFile.path);
    };

    if (!pdfFile || !wordFile) {
      cleanupUploads();
      return res.status(400).json({ message: "Both PDF and Word files are required" });
    }

    const {
      course_code,
      syllabus_version,
      course_type,
      ocne,
      pbl,
    } = req.body;

    if (!course_code || !syllabus_version) {
      cleanupUploads();
      return res.status(400).json({ message: "course_code and syllabus_version are required" });
    }

    if (!VERSION_REGEX.test(syllabus_version)) {
      cleanupUploads();
      return res.status(400).json({ message: "syllabus_version must match format x.xx (e.g., 1.00)" });
    }

    const pre = toStringArray(req.body.pre_requisites);
    const anti = toStringArray(req.body.anti_requisites);
    const co = toStringArray(req.body.co_requisites);
    const equiv = toStringArray(req.body.course_equivalence);

    try {
      const courseRow = await db.query(
        `SELECT course_code, course_owner FROM course WHERE course_code = $1`,
        [course_code]
      );
      if (!courseRow.rows.length) {
        cleanupUploads();
        return res.status(400).json({ message: "Course code not found in course master" });
      }
      const courseOwner = courseRow.rows[0].course_owner;

      const dup = await db.query(
        `SELECT id FROM course_syllabus WHERE course_code = $1 AND syllabus_version = $2`,
        [course_code, syllabus_version]
      );
      if (dup.rows.length) {
        cleanupUploads();
        return res.status(409).json({
          message: "A syllabus for this course and version already exists. Delete it first before re-uploading.",
        });
      }

      const insert = await db.query(
        `INSERT INTO course_syllabus
           (course_code, course_owner, syllabus_version, course_type,
            pre_requisites, anti_requisites, co_requisites, course_equivalence,
            ocne, pbl, pdf_path, word_path, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING id, uploaded_at`,
        [
          course_code,
          courseOwner,
          syllabus_version,
          course_type || null,
          pre,
          anti,
          co,
          equiv,
          toBool(ocne),
          toBool(pbl),
          pdfFile.path,
          wordFile.path,
          req.userId,
        ]
      );

      return res.status(201).json({
        message: "Syllabus uploaded successfully",
        id: insert.rows[0].id,
        uploaded_at: insert.rows[0].uploaded_at,
      });
    } catch (dbErr) {
      cleanupUploads();
      console.error("uploadSyllabus error:", dbErr);
      return res.status(500).json({ message: "Failed to save syllabus" });
    }
  });
};

exports.listSyllabi = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT cs.id, cs.course_code, cs.course_owner, cs.syllabus_version,
              cs.course_type, cs.ocne, cs.pbl, cs.uploaded_at,
              c.course_name, c.theory, c.practical, c.credits
         FROM course_syllabus cs
         JOIN course c ON c.course_code = cs.course_code
        ORDER BY cs.course_owner, cs.course_code, cs.syllabus_version DESC`
    );
    return res.json(result.rows);
  } catch (err) {
    console.error("listSyllabi error:", err);
    return res.status(500).json({ message: "Failed to list syllabi" });
  }
};

// Returns list of courses that have at least one uploaded syllabus,
// for use in user-side (student/faculty/staff) dropdowns.
exports.listUploadedCourses = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT DISTINCT c.course_code, c.course_name, c.course_owner,
              c.theory, c.practical, c.credits, c.course_type
         FROM course_syllabus cs
         JOIN course c ON c.course_code = cs.course_code
        ORDER BY c.course_code`
    );
    return res.json(result.rows);
  } catch (err) {
    console.error("listUploadedCourses error:", err);
    return res.status(500).json({ message: "Failed to list courses" });
  }
};

exports.listVersions = async (req, res) => {
  const courseCode = req.query.course_code;
  if (!courseCode) return res.status(400).json({ message: "course_code is required" });
  try {
    const result = await db.query(
      `SELECT id, syllabus_version, uploaded_at
         FROM course_syllabus
        WHERE course_code = $1
        ORDER BY syllabus_version DESC`,
      [courseCode]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error("listVersions error:", err);
    return res.status(500).json({ message: "Failed to list versions" });
  }
};

exports.getDetails = async (req, res) => {
  const courseCode = req.query.course_code;
  const version = req.query.version;
  if (!courseCode) return res.status(400).json({ message: "course_code is required" });

  try {
    let row;
    if (version) {
      const r = await db.query(
        `SELECT cs.*, c.course_name, c.theory, c.practical, c.credits
           FROM course_syllabus cs
           JOIN course c ON c.course_code = cs.course_code
          WHERE cs.course_code = $1 AND cs.syllabus_version = $2
          LIMIT 1`,
        [courseCode, version]
      );
      row = r.rows[0];
    } else {
      const r = await db.query(
        `SELECT cs.*, c.course_name, c.theory, c.practical, c.credits
           FROM course_syllabus cs
           JOIN course c ON c.course_code = cs.course_code
          WHERE cs.course_code = $1
          ORDER BY cs.syllabus_version DESC
          LIMIT 1`,
        [courseCode]
      );
      row = r.rows[0];
    }
    if (!row) return res.status(404).json({ message: "Syllabus not found" });

    // Never leak server file paths to the client.
    delete row.pdf_path;
    delete row.word_path;

    // Enrich requisites with course titles so display surfaces can show
    // "CODE - Title" without having to fetch the entire course list themselves
    // (students don't have access to /api/courses).
    const codeSet = new Set([
      ...(row.pre_requisites || []),
      ...(row.anti_requisites || []),
      ...(row.co_requisites || []),
      ...(row.course_equivalence || []),
    ]);
    row.requisite_names = {};
    if (codeSet.size > 0) {
      const names = await db.query(
        `SELECT course_code, course_name FROM course WHERE course_code = ANY($1::text[])`,
        [[...codeSet]]
      );
      names.rows.forEach((r) => {
        row.requisite_names[r.course_code] = r.course_name;
      });
    }
    return res.json(row);
  } catch (err) {
    console.error("getDetails error:", err);
    return res.status(500).json({ message: "Failed to fetch syllabus details" });
  }
};

async function fetchSyllabusRow(id) {
  const result = await db.query(
    `SELECT id, course_code, syllabus_version, pdf_path, word_path
       FROM course_syllabus WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

exports.downloadPdf = async (req, res) => {
  try {
    const row = await fetchSyllabusRow(req.params.id);
    if (!row) return res.status(404).json({ message: "Syllabus not found" });
    if (!fs.existsSync(row.pdf_path)) return res.status(404).json({ message: "PDF file missing on server" });
    const downloadName = `syllabus_${row.course_code}_v${row.syllabus_version}.pdf`;
    return res.download(row.pdf_path, downloadName);
  } catch (err) {
    console.error("downloadPdf error:", err);
    return res.status(500).json({ message: "Failed to download PDF" });
  }
};

exports.downloadWord = async (req, res) => {
  try {
    const row = await fetchSyllabusRow(req.params.id);
    if (!row) return res.status(404).json({ message: "Syllabus not found" });
    if (!fs.existsSync(row.word_path)) return res.status(404).json({ message: "Word file missing on server" });
    const ext = path.extname(row.word_path) || ".docx";
    const downloadName = `syllabus_${row.course_code}_v${row.syllabus_version}${ext}`;
    return res.download(row.word_path, downloadName);
  } catch (err) {
    console.error("downloadWord error:", err);
    return res.status(500).json({ message: "Failed to download Word file" });
  }
};

exports.deleteSyllabus = async (req, res) => {
  try {
    const row = await fetchSyllabusRow(req.params.id);
    if (!row) return res.status(404).json({ message: "Syllabus not found" });
    await db.query(`DELETE FROM course_syllabus WHERE id = $1`, [req.params.id]);
    safeUnlink(row.pdf_path);
    safeUnlink(row.word_path);
    return res.json({ message: "Syllabus deleted" });
  } catch (err) {
    console.error("deleteSyllabus error:", err);
    return res.status(500).json({ message: "Failed to delete syllabus" });
  }
};
