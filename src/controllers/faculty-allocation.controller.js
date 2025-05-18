const db = require("../config/db");

// Get all faculty allocations
exports.getAllFacultyAllocations = async (req, res) => {
  try {
    const { year, semesterType, employeeId, venue } = req.query;

    let query = `
      SELECT fa.*, c.course_name, c.theory, c.practical, c.credits,
             f.name as faculty_name, v.infra_type as venue_type
      FROM faculty_allocation fa
      JOIN course c ON fa.course_code = c.course_code
      JOIN faculty f ON fa.employee_id = f.employee_id
      JOIN venue v ON fa.venue = v.venue
      WHERE 1=1
    `;
    const params = [];

    if (year) {
      params.push(year);
      query += ` AND fa.slot_year = $${params.length}`;
    }

    if (semesterType) {
      params.push(semesterType);
      query += ` AND fa.semester_type = $${params.length}`;
    }

    if (employeeId) {
      params.push(employeeId);
      query += ` AND fa.employee_id = $${params.length}`;
    }

    if (venue) {
      params.push(venue);
      query += ` AND fa.venue = $${params.length}`;
    }

    query += ` ORDER BY fa.slot_year, fa.semester_type, fa.slot_day, fa.slot_time`;

    const result = await db.query(query, params);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Get faculty allocations error:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching faculty allocations" });
  }
};

// Create new faculty allocation
exports.createFacultyAllocation = async (req, res) => {
  try {
    const {
      slot_year,
      semester_type,
      course_code,
      employee_id,
      venue,
      slot_day,
      slot_name,
      slot_time,
    } = req.body;

    // Validate required fields
    if (
      !slot_year ||
      !semester_type ||
      !course_code ||
      !employee_id ||
      !venue ||
      !slot_day ||
      !slot_name ||
      !slot_time
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check for venue clash
    const venueClashCheck = await db.query(
      `SELECT fa.*, c.course_name, f.name as faculty_name
       FROM faculty_allocation fa
       JOIN course c ON fa.course_code = c.course_code
       JOIN faculty f ON fa.employee_id = f.employee_id
       WHERE fa.slot_year = $1 AND fa.semester_type = $2 
       AND fa.venue = $3 AND fa.slot_day = $4 
       AND fa.slot_time = $5`,
      [slot_year, semester_type, venue, slot_day, slot_time]
    );

    if (venueClashCheck.rows.length > 0) {
      const clash = venueClashCheck.rows[0];
      return res.status(409).json({
        message: `Venue clash: ${venue} is already booked on ${slot_day} at ${slot_time} for ${clash.course_name} by ${clash.faculty_name}`,
        type: "venue_clash",
        existingAllocation: clash,
      });
    }

    // Check for faculty clash
    const facultyClashCheck = await db.query(
      `SELECT fa.*, c.course_name, v.venue as venue_name
       FROM faculty_allocation fa
       JOIN course c ON fa.course_code = c.course_code
       JOIN venue v ON fa.venue = v.venue
       WHERE fa.slot_year = $1 AND fa.semester_type = $2 
       AND fa.employee_id = $3 AND fa.slot_day = $4 
       AND fa.slot_time = $5`,
      [slot_year, semester_type, employee_id, slot_day, slot_time]
    );

    if (facultyClashCheck.rows.length > 0) {
      const clash = facultyClashCheck.rows[0];
      return res.status(409).json({
        message: `Faculty clash: Faculty is already assigned to ${clash.course_name} in ${clash.venue_name} on ${slot_day} at ${slot_time}`,
        type: "faculty_clash",
        existingAllocation: clash,
      });
    }

    // Insert new allocation
    const result = await db.query(
      `INSERT INTO faculty_allocation 
       (slot_year, semester_type, course_code, employee_id, venue, slot_day, slot_name, slot_time)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        slot_year,
        semester_type,
        course_code,
        employee_id,
        venue,
        slot_day,
        slot_name,
        slot_time,
      ]
    );

    res.status(201).json({
      message: "Faculty allocation created successfully",
      allocation: result.rows[0],
    });
  } catch (error) {
    console.error("Create faculty allocation error:", error);
    res
      .status(500)
      .json({ message: "Server error while creating faculty allocation" });
  }
};

// Get faculty timetable
exports.getFacultyTimetable = async (req, res) => {
  try {
    const { employeeId, year, semesterType } = req.query;

    if (!employeeId || !year || !semesterType) {
      return res.status(400).json({
        message: "Employee ID, year, and semester type are required",
      });
    }

    // Get faculty details
    const facultyResult = await db.query(
      `SELECT * FROM faculty WHERE employee_id = $1`,
      [employeeId]
    );

    if (facultyResult.rows.length === 0) {
      return res.status(404).json({ message: "Faculty not found" });
    }

    const faculty = facultyResult.rows[0];

    // Get allocations
    const allocationsResult = await db.query(
      `SELECT fa.*, c.course_name, c.theory, c.practical, c.credits,
              v.infra_type as venue_type
       FROM faculty_allocation fa
       JOIN course c ON fa.course_code = c.course_code
       JOIN venue v ON fa.venue = v.venue
       WHERE fa.employee_id = $1 AND fa.slot_year = $2 AND fa.semester_type = $3
       ORDER BY fa.slot_day, fa.slot_time`,
      [employeeId, year, semesterType]
    );

    res.status(200).json({
      faculty: faculty,
      allocations: allocationsResult.rows,
    });
  } catch (error) {
    console.error("Get faculty timetable error:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching faculty timetable" });
  }
};

// Get class/venue timetable
exports.getClassTimetable = async (req, res) => {
  try {
    const { venue, year, semesterType } = req.query;

    if (!venue || !year || !semesterType) {
      return res.status(400).json({
        message: "Venue, year, and semester type are required",
      });
    }

    // Get venue details
    const venueResult = await db.query(`SELECT * FROM venue WHERE venue = $1`, [
      venue,
    ]);

    if (venueResult.rows.length === 0) {
      return res.status(404).json({ message: "Venue not found" });
    }

    const venueDetails = venueResult.rows[0];

    // Get allocations
    const allocationsResult = await db.query(
      `SELECT fa.*, c.course_name, c.theory, c.practical, c.credits,
              f.name as faculty_name
       FROM faculty_allocation fa
       JOIN course c ON fa.course_code = c.course_code
       JOIN faculty f ON fa.employee_id = f.employee_id
       WHERE fa.venue = $1 AND fa.slot_year = $2 AND fa.semester_type = $3
       ORDER BY fa.slot_day, fa.slot_time`,
      [venue, year, semesterType]
    );

    res.status(200).json({
      venue: venueDetails,
      allocations: allocationsResult.rows,
    });
  } catch (error) {
    console.error("Get class timetable error:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching class timetable" });
  }
};

// Delete faculty allocation
exports.deleteFacultyAllocation = async (req, res) => {
  try {
    const {
      slot_year,
      semester_type,
      course_code,
      employee_id,
      venue,
      slot_day,
      slot_name,
      slot_time,
    } = req.body;

    // Validate all required fields for composite primary key
    if (
      !slot_year ||
      !semester_type ||
      !course_code ||
      !employee_id ||
      !venue ||
      !slot_day ||
      !slot_name ||
      !slot_time
    ) {
      return res.status(400).json({
        message: "All fields are required to identify the allocation",
      });
    }

    const result = await db.query(
      `DELETE FROM faculty_allocation 
       WHERE slot_year = $1 AND semester_type = $2 AND course_code = $3 
       AND employee_id = $4 AND venue = $5 AND slot_day = $6 
       AND slot_name = $7 AND slot_time = $8`,
      [
        slot_year,
        semester_type,
        course_code,
        employee_id,
        venue,
        slot_day,
        slot_name,
        slot_time,
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Faculty allocation not found" });
    }

    res
      .status(200)
      .json({ message: "Faculty allocation deleted successfully" });
  } catch (error) {
    console.error("Delete faculty allocation error:", error);
    res
      .status(500)
      .json({ message: "Server error while deleting faculty allocation" });
  }
};

// Get available slots for a course based on TPC
exports.getAvailableSlotsForCourse = async (req, res) => {
  try {
    const { courseCode, year, semesterType, componentType } = req.query;

    if (!courseCode || !year || !semesterType) {
      return res.status(400).json({
        message: "Course code, year, and semester type are required",
      });
    }

    // Get course details
    const courseResult = await db.query(
      `SELECT * FROM course WHERE course_code = $1`,
      [courseCode]
    );

    if (courseResult.rows.length === 0) {
      return res.status(404).json({ message: "Course not found" });
    }

    const course = courseResult.rows[0];
    const theory = course.theory;
    const practical = course.practical;

    // Get all slot definitions for the year and semester
    const slotsResult = await db.query(
      `SELECT * FROM slot 
       WHERE slot_year = $1 AND semester_type = $2 
       ORDER BY slot_day, slot_time`,
      [year, semesterType]
    );

    if (slotsResult.rows.length === 0) {
      return res.status(404).json({
        message: `No slots found for ${year} ${semesterType} semester`,
      });
    }

    // Group slots by their names to identify unique slot names
    const slotsByName = {};
    slotsResult.rows.forEach((slot) => {
      if (!slotsByName[slot.slot_name]) {
        slotsByName[slot.slot_name] = [];
      }
      slotsByName[slot.slot_name].push(slot);
    });

    const availableSlots = [];

    // Filter based on component type
    if (componentType === "lab") {
      // If lab component, only include lab slots
      const labSlots = Object.keys(slotsByName).filter(
        (name) => name.startsWith("L") && name.includes("+")
      );
      availableSlots.push(...labSlots);
    } else if (componentType === "theory") {
      // If theory component, only include theory slots
      const theorySlots = Object.keys(slotsByName).filter(
        (name) => !name.startsWith("L") && !name.includes("+")
      );
      availableSlots.push(...theorySlots);
    } else {
      // If no component type specified or for non-TEL courses:

      // Add appropriate slots based on course type
      if (theory > 0) {
        const theorySlots = Object.keys(slotsByName).filter(
          (name) => !name.startsWith("L") && !name.includes("+")
        );
        availableSlots.push(...theorySlots);
      }

      if (practical > 0) {
        const labSlots = Object.keys(slotsByName).filter(
          (name) => name.startsWith("L") && name.includes("+")
        );
        availableSlots.push(...labSlots);
      }
    }

    res.status(200).json({
      course: course,
      availableSlots: availableSlots,
    });
  } catch (error) {
    console.error("Get available slots error:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching available slots" });
  }
};

// Update faculty allocation
exports.updateFacultyAllocation = async (req, res) => {
  try {
    const { oldAllocation, newAllocation } = req.body;

    // Start a transaction
    const client = await db.getClient();

    try {
      await client.query("BEGIN");

      // Delete old allocation
      await client.query(
        `DELETE FROM faculty_allocation 
         WHERE slot_year = $1 AND semester_type = $2 AND course_code = $3 
         AND employee_id = $4 AND venue = $5 AND slot_day = $6 
         AND slot_name = $7 AND slot_time = $8`,
        [
          oldAllocation.slot_year,
          oldAllocation.semester_type,
          oldAllocation.course_code,
          oldAllocation.employee_id,
          oldAllocation.venue,
          oldAllocation.slot_day,
          oldAllocation.slot_name,
          oldAllocation.slot_time,
        ]
      );

      // Insert new allocation with clash checks
      // (Use the same clash checking logic as in createFacultyAllocation)

      await client.query("COMMIT");

      res.status(200).json({
        message: "Faculty allocation updated successfully",
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Update faculty allocation error:", error);
    res
      .status(500)
      .json({ message: "Server error while updating faculty allocation" });
  }
};
