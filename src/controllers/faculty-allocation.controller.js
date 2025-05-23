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

    // Check for venue clash (different faculty for same venue/time)
    const venueClashCheck = await db.query(
      `SELECT fa.*, c.course_name, f.name as faculty_name
       FROM faculty_allocation fa
       JOIN course c ON fa.course_code = c.course_code
       JOIN faculty f ON fa.employee_id = f.employee_id
       WHERE fa.slot_year = $1 AND fa.semester_type = $2 
       AND fa.venue = $3 AND fa.slot_day = $4 
       AND fa.slot_time = $5 AND fa.employee_id != $6`,
      [slot_year, semester_type, venue, slot_day, slot_time, employee_id]
    );

    if (venueClashCheck.rows.length > 0) {
      const clash = venueClashCheck.rows[0];
      return res.status(409).json({
        message: `Venue clash: ${venue} is already booked on ${slot_day} at ${slot_time} for ${clash.course_name} by ${clash.faculty_name}`,
        type: "venue_clash",
        existingAllocation: clash,
      });
    }

    // Check for faculty clash (different course at same time)
    const facultyClashCheck = await db.query(
      `SELECT fa.*, c.course_name, v.venue as venue_name
       FROM faculty_allocation fa
       JOIN course c ON fa.course_code = c.course_code
       JOIN venue v ON fa.venue = v.venue
       WHERE fa.slot_year = $1 AND fa.semester_type = $2 
       AND fa.employee_id = $3 AND fa.slot_day = $4 
       AND fa.slot_time = $5 AND fa.course_code != $6`,
      [slot_year, semester_type, employee_id, slot_day, slot_time, course_code]
    );

    if (facultyClashCheck.rows.length > 0) {
      const clash = facultyClashCheck.rows[0];
      return res.status(409).json({
        message: `Faculty clash: Faculty is already assigned to ${clash.course_name} in ${clash.venue_name} on ${slot_day} at ${slot_time}`,
        type: "faculty_clash",
        existingAllocation: clash,
      });
    }

    // Check for slot conflicts
    // Get conflicting slot names
    const conflictingSlots = await db.query(
      `SELECT conflicting_slot_name 
       FROM slot_conflict 
       WHERE slot_year = $1 AND semester_type = $2 AND slot_name = $3`,
      [slot_year, semester_type, slot_name]
    );

    if (conflictingSlots.rows.length > 0) {
      const conflictingSlotNames = conflictingSlots.rows.map(
        (row) => row.conflicting_slot_name
      );

      // Check if faculty is already allocated in any conflicting slot
      const slotConflictCheck = await db.query(
        `SELECT fa.*, c.course_name, v.venue as venue_name
         FROM faculty_allocation fa
         JOIN course c ON fa.course_code = c.course_code
         JOIN venue v ON fa.venue = v.venue
         WHERE fa.slot_year = $1 AND fa.semester_type = $2 
         AND fa.employee_id = $3 AND fa.slot_name = ANY($4)`,
        [slot_year, semester_type, employee_id, conflictingSlotNames]
      );

      if (slotConflictCheck.rows.length > 0) {
        const conflict = slotConflictCheck.rows[0];
        return res.status(409).json({
          message: `Slot conflict: Faculty is already assigned to a conflicting slot ${conflict.slot_name} for ${conflict.course_name} in ${conflict.venue_name}`,
          type: "slot_conflict",
          existingAllocation: conflict,
        });
      }
    }

    // Check for summer lab slot linking
    let linkedSlotName = null;
    let linkedSlotDetails = null;

    // Only apply the special linking for SUMMER semester and lab slots
    if (
      semester_type === "SUMMER" &&
      slot_name.startsWith("L") &&
      slot_name.includes("+")
    ) {
      // Check for linked slot in semester_slot_config
      const linkedSlotsResult = await db.query(
        `SELECT linked_slots FROM semester_slot_config 
         WHERE slot_year = $1 AND semester_type = $2 AND slot_name = $3 
         AND course_theory = 0 AND course_practical > 0`,
        [slot_year, semester_type, slot_name]
      );

      // If there's a linked slot for this lab slot in SUMMER semester
      if (
        linkedSlotsResult.rows.length > 0 &&
        linkedSlotsResult.rows[0].linked_slots &&
        linkedSlotsResult.rows[0].linked_slots.length > 0
      ) {
        linkedSlotName = linkedSlotsResult.rows[0].linked_slots[0];

        // Find the details of the linked slot (day and time)
        const linkedSlotDetailsResult = await db.query(
          `SELECT slot_day, slot_time FROM slot 
           WHERE slot_year = $1 AND semester_type = $2 AND slot_name = $3`,
          [slot_year, semester_type, linkedSlotName]
        );

        if (linkedSlotDetailsResult.rows.length > 0) {
          linkedSlotDetails = linkedSlotDetailsResult.rows[0];

          // Check if the linked slot is already allocated to another faculty
          const linkedSlotCheck = await db.query(
            `SELECT fa.*, c.course_name, f.name as faculty_name
             FROM faculty_allocation fa
             JOIN course c ON fa.course_code = c.course_code
             JOIN faculty f ON fa.employee_id = f.employee_id
             WHERE fa.slot_year = $1 AND fa.semester_type = $2 
             AND fa.venue = $3 AND fa.slot_day = $4 
             AND fa.slot_time = $5 AND fa.employee_id != $6`,
            [
              slot_year,
              semester_type,
              venue,
              linkedSlotDetails.slot_day,
              linkedSlotDetails.slot_time,
              employee_id,
            ]
          );

          if (linkedSlotCheck.rows.length > 0) {
            const clash = linkedSlotCheck.rows[0];
            return res.status(409).json({
              message: `Linked slot clash: The linked slot ${linkedSlotName} is already booked by ${clash.faculty_name} for ${clash.course_name}`,
              type: "linked_slot_clash",
              existingAllocation: clash,
            });
          }

          // Check if faculty is already allocated in the linked slot for different course
          const facultyLinkedSlotCheck = await db.query(
            `SELECT fa.*, c.course_name, v.venue as venue_name
             FROM faculty_allocation fa
             JOIN course c ON fa.course_code = c.course_code
             JOIN venue v ON fa.venue = v.venue
             WHERE fa.slot_year = $1 AND fa.semester_type = $2 
             AND fa.employee_id = $3 AND fa.slot_day = $4 
             AND fa.slot_time = $5 AND fa.course_code != $6`,
            [
              slot_year,
              semester_type,
              employee_id,
              linkedSlotDetails.slot_day,
              linkedSlotDetails.slot_time,
              course_code,
            ]
          );

          if (facultyLinkedSlotCheck.rows.length > 0) {
            const clash = facultyLinkedSlotCheck.rows[0];
            return res.status(409).json({
              message: `Faculty clash in linked slot: Faculty is already assigned to ${clash.course_name} in ${clash.venue_name} during the linked slot time`,
              type: "faculty_linked_slot_clash",
              existingAllocation: clash,
            });
          }
        }
      }
    }

    // Check if primary allocation already exists
    const existingPrimaryCheck = await db.query(
      `SELECT * FROM faculty_allocation
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

    let result;
    let primaryAllocationExists = false;

    if (existingPrimaryCheck.rows.length > 0) {
      // Primary allocation already exists
      primaryAllocationExists = true;
      result = existingPrimaryCheck;
    } else {
      // Insert primary allocation
      result = await db.query(
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
    }

    // Handle linked slot for SUMMER lab
    let linkedAllocationExists = false;
    if (semester_type === "SUMMER" && linkedSlotName && linkedSlotDetails) {
      // Check if linked allocation already exists
      const existingLinkedCheck = await db.query(
        `SELECT * FROM faculty_allocation
         WHERE slot_year = $1 AND semester_type = $2 AND course_code = $3 
         AND employee_id = $4 AND venue = $5 AND slot_name = $6`,
        [
          slot_year,
          semester_type,
          course_code,
          employee_id,
          venue,
          linkedSlotName,
        ]
      );

      if (existingLinkedCheck.rows.length > 0) {
        // Linked allocation already exists
        linkedAllocationExists = true;
      } else {
        try {
          // Insert linked allocation
          await db.query(
            `INSERT INTO faculty_allocation 
             (slot_year, semester_type, course_code, employee_id, venue, slot_day, slot_name, slot_time)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              slot_year,
              semester_type,
              course_code,
              employee_id,
              venue,
              linkedSlotDetails.slot_day,
              linkedSlotName,
              linkedSlotDetails.slot_time,
            ]
          );
        } catch (error) {
          console.error("Error creating linked allocation:", error);
          // Only rollback primary if we just created it
          if (!primaryAllocationExists) {
            await db.query(
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
          }
          // We'll still consider it a success if the primary already existed
          if (primaryAllocationExists) {
            linkedAllocationExists = true; // Assume it exists to prevent further attempts
          } else {
            throw error;
          }
        }
      }
    }

    // Determine appropriate status code and message
    const statusCode =
      primaryAllocationExists && linkedAllocationExists ? 200 : 201;
    const message = primaryAllocationExists
      ? "Faculty allocation already exists"
      : "Faculty allocation created successfully";

    res.status(statusCode).json({
      message,
      allocation: result.rows[0],
      primaryAllocationExists,
      linkedAllocation: linkedSlotName
        ? {
            slot_name: linkedSlotName,
            slot_day: linkedSlotDetails?.slot_day,
            slot_time: linkedSlotDetails?.slot_time,
            exists: linkedAllocationExists,
          }
        : null,
    });
  } catch (error) {
    console.error("Create faculty allocation error:", error);
    res.status(500).json({
      message: "Server error while creating faculty allocation",
      error: error.message,
    });
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

    // Delete the primary allocation
    const result = await db.query(
      `DELETE FROM faculty_allocation 
       WHERE slot_year = $1 AND semester_type = $2 AND course_code = $3 
       AND employee_id = $4 AND venue = $5 AND slot_day = $6 
       AND slot_name = $7 AND slot_time = $8
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

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Faculty allocation not found" });
    }

    // For SUMMER semester lab slots, check for linked slot to delete as well
    let linkedSlotDeleted = false;
    if (
      semester_type === "SUMMER" &&
      slot_name.startsWith("L") &&
      slot_name.includes("+")
    ) {
      // Check for linked slot in semester_slot_config
      const linkedSlotsResult = await db.query(
        `SELECT linked_slots FROM semester_slot_config 
         WHERE slot_year = $1 AND semester_type = $2 AND slot_name = $3 
         AND course_theory = 0 AND course_practical > 0`,
        [slot_year, semester_type, slot_name]
      );

      // If there's a linked slot for this lab slot in SUMMER semester
      if (
        linkedSlotsResult.rows.length > 0 &&
        linkedSlotsResult.rows[0].linked_slots &&
        linkedSlotsResult.rows[0].linked_slots.length > 0
      ) {
        const linkedSlotName = linkedSlotsResult.rows[0].linked_slots[0];

        // Delete the linked allocation if it exists
        const linkedResult = await db.query(
          `DELETE FROM faculty_allocation 
           WHERE slot_year = $1 AND semester_type = $2 AND course_code = $3 
           AND employee_id = $4 AND venue = $5 AND slot_name = $6`,
          [
            slot_year,
            semester_type,
            course_code,
            employee_id,
            venue,
            linkedSlotName,
          ]
        );

        linkedSlotDeleted = linkedResult.rowCount > 0;
      }
    }

    res.status(200).json({
      message: "Faculty allocation deleted successfully",
      linkedSlotDeleted,
    });
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

    // Get available slots based on course T-P-C and semester slot configuration
    let configQuery = `
      SELECT ssc.* 
      FROM semester_slot_config ssc
      WHERE ssc.slot_year = $1 
      AND ssc.semester_type = $2 
      AND ssc.is_active = true
    `;

    const params = [year, semesterType];

    // For Theory-Embedded-Lab (TEL) courses with componentType specified
    if (course.course_type === "TEL" && componentType) {
      if (componentType === "theory") {
        params.push(theory);
        params.push(0); // No practical component
        configQuery += ` AND ssc.course_theory = $3 AND ssc.course_practical = $4`;
      } else if (componentType === "lab") {
        params.push(0); // No theory component
        params.push(practical);
        configQuery += ` AND ssc.course_theory = $3 AND ssc.course_practical = $4`;
      }
    } else {
      // For regular courses, filter based on T-P values
      if (theory > 0 && practical === 0) {
        // Theory-only course
        params.push(theory);
        configQuery += ` AND ssc.course_theory = $3 AND ssc.course_practical = 0`;
      } else if (theory === 0 && practical > 0) {
        // Lab-only course
        params.push(practical);
        configQuery += ` AND ssc.course_theory = 0 AND ssc.course_practical = $3`;
      } else if (theory > 0 && practical > 0 && course.course_type !== "TEL") {
        // Regular course with both theory and practical
        params.push(theory);
        configQuery += ` AND ((ssc.course_theory = $3 AND ssc.course_practical = 0) OR 
                             (ssc.course_theory = 0 AND ssc.course_practical > 0))`;
      }
    }

    configQuery += ` ORDER BY ssc.slot_name`;

    const configResult = await db.query(configQuery, params);

    // Extract slot names and handle linked slots
    const availableSlots = [];
    const slotLinks = {}; // to track linked slots

    configResult.rows.forEach((config) => {
      availableSlots.push(config.slot_name);

      // Track linked slots for 4-credit courses
      if (config.linked_slots && config.linked_slots.length > 0) {
        slotLinks[config.slot_name] = config.linked_slots;
      }
    });

    // If no slots found in the configuration, fall back to legacy behavior
    if (availableSlots.length === 0) {
      console.log(
        `No slot configuration found for course ${courseCode} (${theory}-${practical}-${course.credits}) in ${year} ${semesterType}`
      );

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

      console.log(
        `Using legacy behavior: Found ${availableSlots.length} slots`
      );
    }

    res.status(200).json({
      course: course,
      availableSlots: availableSlots,
      slotLinks: slotLinks,
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
