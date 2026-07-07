const db = require("../config/db");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Resolve upload directory from env var, defaulting to src/uploads/curriculum.
// Env var lets ops relocate to a mounted volume without code changes.
const uploadDir = process.env.CURRICULUM_UPLOAD_DIR
  ? path.resolve(process.env.CURRICULUM_UPLOAD_DIR)
  : path.join(__dirname, "../uploads/curriculum");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // {fieldname}-{timestamp}-{random}.{ext} — timestamp defends against
    // orphan collisions if a row is deleted and a new upload arrives.
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname).toLowerCase());
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (file.fieldname === "pdf" && ext === ".pdf") return cb(null, true);
  if (file.fieldname === "excel" && (ext === ".xlsx" || ext === ".xls")) return cb(null, true);
  cb(new Error(`Invalid file type for field ${file.fieldname}`));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB per file
}).fields([
  { name: "pdf", maxCount: 1 },
  { name: "excel", maxCount: 1 },
]);

// Delete files from disk without throwing if they don't exist.
function safeUnlink(filePath) {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (err) {
    console.error("Failed to unlink", filePath, err.message);
  }
}

const VERSION_REGEX = /^\d+\.\d{2}$/;

exports.uploadCurriculum = (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }

    const pdfFile = req.files && req.files.pdf ? req.files.pdf[0] : null;
    const excelFile = req.files && req.files.excel ? req.files.excel[0] : null;

    const cleanupUploads = () => {
      if (pdfFile) safeUnlink(pdfFile.path);
      if (excelFile) safeUnlink(excelFile.path);
    };

    if (!pdfFile || !excelFile) {
      cleanupUploads();
      return res.status(400).json({ message: "Both PDF and Excel files are required" });
    }

    const { school_id, program_id, admitted_year, curriculum_version } = req.body;

    if (!school_id || !program_id || !admitted_year || !curriculum_version) {
      cleanupUploads();
      return res.status(400).json({ message: "school_id, program_id, admitted_year, curriculum_version are required" });
    }

    if (!VERSION_REGEX.test(curriculum_version)) {
      cleanupUploads();
      return res.status(400).json({ message: "curriculum_version must match format x.xx (e.g., 1.00)" });
    }

    const yearInt = parseInt(admitted_year, 10);
    if (Number.isNaN(yearInt) || yearInt < 1900 || yearInt > 2100) {
      cleanupUploads();
      return res.status(400).json({ message: "admitted_year must be a valid year" });
    }

    try {
      const dup = await db.query(
        `SELECT id FROM program_curriculum
         WHERE program_id = $1 AND admitted_year = $2 AND curriculum_version = $3`,
        [program_id, yearInt, curriculum_version]
      );
      if (dup.rows.length) {
        cleanupUploads();
        return res.status(409).json({
          message: "A curriculum for this program, year, and version already exists. Delete it first before re-uploading.",
        });
      }

      const insert = await db.query(
        `INSERT INTO program_curriculum
           (school_id, program_id, admitted_year, curriculum_version, pdf_path, excel_path, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, uploaded_at`,
        [school_id, program_id, yearInt, curriculum_version, pdfFile.path, excelFile.path, req.userId]
      );

      return res.status(201).json({
        message: "Curriculum uploaded successfully",
        id: insert.rows[0].id,
        uploaded_at: insert.rows[0].uploaded_at,
      });
    } catch (dbErr) {
      cleanupUploads();
      console.error("uploadCurriculum error:", dbErr);
      return res.status(500).json({ message: "Failed to save curriculum" });
    }
  });
};

exports.listCurricula = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT pc.id, pc.school_id, pc.program_id, pc.admitted_year,
              pc.curriculum_version, pc.uploaded_at,
              s.school_long_name, s.school_short_name,
              p.program_name_long, p.program_name_short, p.program_code
       FROM program_curriculum pc
       JOIN school s  ON s.school_id = pc.school_id
       JOIN program p ON p.program_id = pc.program_id
       ORDER BY s.school_short_name, p.program_name_short, pc.admitted_year DESC, pc.curriculum_version DESC`
    );
    return res.json(result.rows);
  } catch (err) {
    console.error("listCurricula error:", err);
    return res.status(500).json({ message: "Failed to list curricula" });
  }
};

async function fetchCurriculumRow(id) {
  const result = await db.query(
    `SELECT id, pdf_path, excel_path, program_id, admitted_year, curriculum_version
     FROM program_curriculum WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

exports.downloadPdf = async (req, res) => {
  try {
    const row = await fetchCurriculumRow(req.params.id);
    if (!row) return res.status(404).json({ message: "Curriculum not found" });
    if (!fs.existsSync(row.pdf_path)) return res.status(404).json({ message: "PDF file missing on server" });
    const downloadName = `curriculum_${row.program_id}_${row.admitted_year}_v${row.curriculum_version}.pdf`;
    return res.download(row.pdf_path, downloadName);
  } catch (err) {
    console.error("downloadPdf error:", err);
    return res.status(500).json({ message: "Failed to download PDF" });
  }
};

exports.downloadExcel = async (req, res) => {
  try {
    const row = await fetchCurriculumRow(req.params.id);
    if (!row) return res.status(404).json({ message: "Curriculum not found" });
    if (!fs.existsSync(row.excel_path)) return res.status(404).json({ message: "Excel file missing on server" });
    const ext = path.extname(row.excel_path) || ".xlsx";
    const downloadName = `curriculum_${row.program_id}_${row.admitted_year}_v${row.curriculum_version}${ext}`;
    return res.download(row.excel_path, downloadName);
  } catch (err) {
    console.error("downloadExcel error:", err);
    return res.status(500).json({ message: "Failed to download Excel" });
  }
};

exports.deleteCurriculum = async (req, res) => {
  try {
    const row = await fetchCurriculumRow(req.params.id);
    if (!row) return res.status(404).json({ message: "Curriculum not found" });
    await db.query(`DELETE FROM program_curriculum WHERE id = $1`, [req.params.id]);
    safeUnlink(row.pdf_path);
    safeUnlink(row.excel_path);
    return res.json({ message: "Curriculum deleted" });
  } catch (err) {
    console.error("deleteCurriculum error:", err);
    return res.status(500).json({ message: "Failed to delete curriculum" });
  }
};
