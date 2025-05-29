const db = require("../config/db");

// Get available academic years and semesters
exports.getAvailableSemesters = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT DISTINCT 
           slot_year, 
           semester_type,
           CASE semester_type 
             WHEN 'FALL' THEN 1 
             WHEN 'WINTER' THEN 2 
             WHEN 'SUMMER' THEN 3 
           END as semester_order
         FROM slot 
         WHERE is_active = true 
         ORDER BY slot_year DESC, semester_order`,
      []
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Get available semesters error:", error);
    res.status(500).json({ message: "Server error while fetching semesters" });
  }
};

// Get available courses for selected semester and year
exports.getCoursesForSemester = async (req, res) => {
  try {
    const { slot_year, semester_type } = req.query;

    if (!slot_year || !semester_type) {
      return res.status(400).json({
        message: "slot_year and semester_type are required",
      });
    }

    const result = await db.query(
      `SELECT DISTINCT fa.course_code, c.course_name
       FROM faculty_allocation fa
       JOIN course c ON fa.course_code = c.course_code
       WHERE fa.slot_year = $1 AND fa.semester_type = $2
       ORDER BY fa.course_code`,
      [slot_year, semester_type]
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Get courses for semester error:", error);
    res.status(500).json({ message: "Server error while fetching courses" });
  }
};

// Get course details (T-P-C structure)
exports.getCourseDetails = async (req, res) => {
  try {
    const { course_code } = req.params;

    if (!course_code) {
      return res.status(400).json({
        message: "course_code is required",
      });
    }

    const result = await db.query(
      `SELECT course_code, course_name, theory, practical, credits
       FROM course 
       WHERE course_code = $1`,
      [course_code]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Get course details error:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching course details" });
  }
};
