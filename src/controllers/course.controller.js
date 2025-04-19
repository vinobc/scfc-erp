const db = require("../config/db");
const multer = require("multer");
const xlsx = require("xlsx");
const path = require("path");
const fs = require("fs");

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, "../uploads");
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

// Configure file filter to only accept Excel files
const fileFilter = (req, file, cb) => {
  const allowedFileTypes = [".xlsx", ".xls"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedFileTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only Excel files (xlsx, xls) are allowed"));
  }
};

// Initialize multer upload
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
}).single("file");

// Get all courses
exports.getAllCourses = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM course ORDER BY course_code`,
      []
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Get all courses error:", error);
    res.status(500).json({ message: "Server error while fetching courses" });
  }
};

// Get course by code
exports.getCourseByCode = async (req, res) => {
  try {
    const courseCode = req.params.code;

    const result = await db.query(
      `SELECT * FROM course WHERE course_code = $1`,
      [courseCode]
    );

    const course = result.rows[0];

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.status(200).json(course);
  } catch (error) {
    console.error("Get course by code error:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching course details" });
  }
};

// Create new course
exports.createCourse = async (req, res) => {
  try {
    const {
      course_owner,
      course_code,
      course_name,
      theory,
      practical,
      credits,
      course_type,
      prerequisite,
      antirequisite,
      course_equivalence,
      programs_offered_to,
      curriculum_version,
      remarks,
      is_active,
    } = req.body;

    // Validate required fields
    if (
      !course_owner ||
      !course_code ||
      !course_name ||
      theory === undefined ||
      practical === undefined ||
      credits === undefined ||
      !course_type ||
      !programs_offered_to
    ) {
      return res.status(400).json({
        message: "Required fields missing. Please check your input.",
      });
    }

    // Check if course already exists
    const courseExists = await db.query(
      "SELECT COUNT(*) FROM course WHERE course_code = $1",
      [course_code]
    );

    if (parseInt(courseExists.rows[0].count) > 0) {
      return res.status(409).json({
        message: "Course with this code already exists",
      });
    }

    // Insert new course
    const result = await db.query(
      `INSERT INTO course 
       (course_owner, course_code, course_name, theory, practical, 
        credits, course_type, prerequisite, antirequisite, 
        course_equivalence, programs_offered_to, curriculum_version, 
        remarks, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) 
       RETURNING *`,
      [
        course_owner,
        course_code,
        course_name,
        theory,
        practical,
        credits,
        course_type,
        prerequisite || null,
        antirequisite || null,
        course_equivalence || null,
        programs_offered_to,
        curriculum_version || null,
        remarks || null,
        is_active === false ? false : true,
      ]
    );

    res.status(201).json({
      message: "Course created successfully",
      course: result.rows[0],
    });
  } catch (error) {
    console.error("Create course error:", error);
    res.status(500).json({
      message: "Server error while creating course",
      error: error.message,
    });
  }
};

// Update course
exports.updateCourse = async (req, res) => {
  try {
    const courseCode = req.params.code;
    const {
      course_owner,
      course_name,
      theory,
      practical,
      credits,
      course_type,
      prerequisite,
      antirequisite,
      course_equivalence,
      programs_offered_to,
      curriculum_version,
      remarks,
      is_active,
    } = req.body;

    // Validate required fields
    if (
      !course_owner ||
      !course_name ||
      theory === undefined ||
      practical === undefined ||
      credits === undefined ||
      !course_type ||
      !programs_offered_to
    ) {
      return res.status(400).json({
        message: "Required fields missing. Please check your input.",
      });
    }

    // Check if course exists
    const courseExists = await db.query(
      "SELECT COUNT(*) FROM course WHERE course_code = $1",
      [courseCode]
    );

    if (parseInt(courseExists.rows[0].count) === 0) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Update course
    const result = await db.query(
      `UPDATE course 
       SET course_owner = $1, 
           course_name = $2, 
           theory = $3, 
           practical = $4, 
           credits = $5, 
           course_type = $6, 
           prerequisite = $7, 
           antirequisite = $8, 
           course_equivalence = $9, 
           programs_offered_to = $10, 
           curriculum_version = $11, 
           remarks = $12, 
           is_active = $13,
           updated_at = CURRENT_TIMESTAMP
       WHERE course_code = $14
       RETURNING *`,
      [
        course_owner,
        course_name,
        theory,
        practical,
        credits,
        course_type,
        prerequisite || null,
        antirequisite || null,
        course_equivalence || null,
        programs_offered_to,
        curriculum_version || null,
        remarks || null,
        is_active === false ? false : true,
        courseCode,
      ]
    );

    res.status(200).json({
      message: "Course updated successfully",
      course: result.rows[0],
    });
  } catch (error) {
    console.error("Update course error:", error);
    res.status(500).json({ message: "Server error while updating course" });
  }
};

// Toggle course status (active/inactive)
exports.toggleCourseStatus = async (req, res) => {
  try {
    const courseCode = req.params.code;
    const { is_active } = req.body;

    // Validate is_active parameter
    if (is_active === undefined) {
      return res
        .status(400)
        .json({ message: "is_active parameter is required" });
    }

    // Check if course exists
    const courseExists = await db.query(
      "SELECT COUNT(*) FROM course WHERE course_code = $1",
      [courseCode]
    );

    if (parseInt(courseExists.rows[0].count) === 0) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Update course status
    const result = await db.query(
      `UPDATE course 
       SET is_active = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE course_code = $2
       RETURNING *`,
      [is_active, courseCode]
    );

    res.status(200).json({
      message: `Course ${is_active ? "activated" : "deactivated"} successfully`,
      course: result.rows[0],
    });
  } catch (error) {
    console.error("Toggle course status error:", error);
    res
      .status(500)
      .json({ message: "Server error while toggling course status" });
  }
};

// Delete course
exports.deleteCourse = async (req, res) => {
  try {
    const courseCode = req.params.code;

    // Check if course exists
    const courseExists = await db.query(
      "SELECT COUNT(*) FROM course WHERE course_code = $1",
      [courseCode]
    );

    if (parseInt(courseExists.rows[0].count) === 0) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Delete course
    await db.query("DELETE FROM course WHERE course_code = $1", [courseCode]);

    res.status(200).json({
      message: "Course deleted successfully",
    });
  } catch (error) {
    console.error("Delete course error:", error);
    res.status(500).json({ message: "Server error while deleting course" });
  }
};

// Import courses from Excel file
exports.importCoursesFromExcel = async (req, res) => {
  // Use multer to upload file
  upload(req, res, async function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: `Multer error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }

    // Check if file exists
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    try {
      const filePath = req.file.path;

      // Read Excel file
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = xlsx.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        return res.status(400).json({ message: "Excel file is empty" });
      }

      console.log(`Processing ${jsonData.length} courses from Excel`);

      // Validation and import statistics
      const stats = {
        total: jsonData.length,
        imported: 0,
        skipped: 0,
        errors: [],
      };

      // Process each row
      for (const row of jsonData) {
        try {
          // Map Excel columns to database fields
          const courseData = {
            course_owner: row.course_owner || "",
            course_code: row.course_code || "",
            course_name: row.course_name || "",
            theory: parseInt(row.theory || 0),
            practical: parseInt(row.practical || 0),
            credits: parseInt(row.credits || 0),
            course_type: row.course_type || "",
            prerequisite: row.prerequisite || null,
            antirequisite: row.antirequisite || null,
            course_equivalence: row.course_equivalence || null,
            programs_offered_to: row.programs_offered_to || "",
            curriculum_version: row.curriculum_version
              ? parseFloat(row.curriculum_version)
              : null,
            remarks: row.remarks || null,
            is_active: true,
          };

          // Validate required fields
          if (
            !courseData.course_owner ||
            !courseData.course_code ||
            !courseData.course_name ||
            !courseData.course_type ||
            !courseData.programs_offered_to
          ) {
            stats.skipped++;
            stats.errors.push({
              course_code: courseData.course_code || "N/A",
              error: "Missing required fields",
            });
            continue;
          }

          // Check if course already exists
          const existingCourse = await db.query(
            "SELECT course_code FROM course WHERE course_code = $1",
            [courseData.course_code]
          );

          if (existingCourse.rows.length > 0) {
            // Update existing course
            await db.query(
              `UPDATE course 
               SET course_owner = $1, 
                   course_name = $2, 
                   theory = $3, 
                   practical = $4, 
                   credits = $5, 
                   course_type = $6, 
                   prerequisite = $7, 
                   antirequisite = $8, 
                   course_equivalence = $9, 
                   programs_offered_to = $10, 
                   curriculum_version = $11, 
                   remarks = $12,
                   updated_at = CURRENT_TIMESTAMP
               WHERE course_code = $13`,
              [
                courseData.course_owner,
                courseData.course_name,
                courseData.theory,
                courseData.practical,
                courseData.credits,
                courseData.course_type,
                courseData.prerequisite,
                courseData.antirequisite,
                courseData.course_equivalence,
                courseData.programs_offered_to,
                courseData.curriculum_version,
                courseData.remarks,
                courseData.course_code,
              ]
            );
          } else {
            // Insert new course
            await db.query(
              `INSERT INTO course 
               (course_owner, course_code, course_name, theory, practical, 
                credits, course_type, prerequisite, antirequisite, 
                course_equivalence, programs_offered_to, curriculum_version, 
                remarks, is_active) 
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
              [
                courseData.course_owner,
                courseData.course_code,
                courseData.course_name,
                courseData.theory,
                courseData.practical,
                courseData.credits,
                courseData.course_type,
                courseData.prerequisite,
                courseData.antirequisite,
                courseData.course_equivalence,
                courseData.programs_offered_to,
                courseData.curriculum_version,
                courseData.remarks,
                courseData.is_active,
              ]
            );
          }

          stats.imported++;
        } catch (error) {
          console.error("Error processing course:", error);
          stats.skipped++;
          stats.errors.push({
            course_code: row.course_code || "N/A",
            error: error.message,
          });
        }
      }

      // Clean up the uploaded file
      fs.unlinkSync(filePath);

      res.status(200).json({
        message: "Courses imported successfully",
        stats: stats,
      });
    } catch (error) {
      console.error("Import courses error:", error);
      // Clean up the uploaded file if it exists
      if (req.file && req.file.path) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({
        message: "Server error while importing courses",
        error: error.message,
      });
    }
  });
};
