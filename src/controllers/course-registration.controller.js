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

// Get course details with slot offerings (Enhanced for Phase 2)
exports.getCourseDetails = async (req, res) => {
  try {
    const { course_code } = req.params;
    const { slot_year, semester_type } = req.query;

    if (!course_code) {
      return res.status(400).json({
        message: "course_code is required",
      });
    }

    // Get basic course details (T-P-C structure)
    const courseResult = await db.query(
      `SELECT course_code, course_name, theory, practical, credits
         FROM course 
         WHERE course_code = $1`,
      [course_code]
    );

    if (courseResult.rows.length === 0) {
      return res.status(404).json({ message: "Course not found" });
    }

    const courseDetails = courseResult.rows[0];

    // Calculate course type
    const theory = parseInt(courseDetails.theory);
    const practical = parseInt(courseDetails.practical);
    let courseType;
    if (theory > 0 && practical === 0) {
      courseType = "T"; // Theory only
    } else if (theory === 0 && practical > 0) {
      courseType = "P"; // Lab only
    } else if (theory > 0 && practical > 0) {
      courseType = "TEL"; // Theory embedded Lab
    } else {
      courseType = "Unknown";
    }

    // Get slot offerings with faculty and venue details (only if semester info provided)
    let slotOfferings = [];
    if (slot_year && semester_type) {
      const slotResult = await db.query(
        `SELECT 
             fa.slot_day,
             fa.slot_name,
             fa.slot_time,
             fa.venue,
             f.name as faculty_name,
             v.capacity as available_seats,
             v.seats as venue_seats
           FROM faculty_allocation fa
           JOIN faculty f ON fa.employee_id = f.employee_id
           JOIN venue v ON fa.venue = v.venue
           WHERE fa.course_code = $1 
             AND fa.slot_year = $2 
             AND fa.semester_type = $3
           ORDER BY fa.slot_day, fa.slot_name`,
        [course_code, slot_year, semester_type]
      );

      slotOfferings = slotResult.rows;
    }

    // Group slots by type (theory vs lab) for display
    const theorySlots = slotOfferings.filter((slot) => {
      // Theory slots: A1, A2, B1, B2, C1, C2, D1, D2, E1, E2, F1, F2, G1, G2, TA1, TA2, TB1, TB2
      return !slot.slot_name.startsWith("L");
    });

    const labSlots = slotOfferings.filter((slot) => {
      // Lab slots: L1, L2, L3, etc.
      return slot.slot_name.startsWith("L");
    });

    // Prepare response data
    const response = {
      // Basic course info (for existing T-P-C table)
      course_code: courseDetails.course_code,
      course_name: courseDetails.course_name,
      theory: courseDetails.theory,
      practical: courseDetails.practical,
      credits: courseDetails.credits,

      // Enhanced info (for new Phase 2 table)
      course_type: courseType,
      slot_offerings: {
        theory_slots: theorySlots,
        lab_slots: labSlots,
        all_slots: slotOfferings,
      },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Get course details error:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching course details" });
  }
};
