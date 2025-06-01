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

// Helper function to normalize slot order (morning slots first)
function normalizeSlotOrder(slotName, linkedSlots) {
  const allSlots = [slotName, ...(linkedSlots || [])];

  // Separate morning and afternoon slots
  const morningSlots = allSlots.filter((slot) => {
    // Morning slots are L1-L20 range (e.g., L1+L2, L3+L4, etc.)
    const firstSlotNum = parseInt(slot.match(/L(\d+)/)[1]);
    return firstSlotNum <= 20;
  });

  const afternoonSlots = allSlots.filter((slot) => {
    // Afternoon slots are L21-L40 range (e.g., L21+L22, L23+L24, etc.)
    const firstSlotNum = parseInt(slot.match(/L(\d+)/)[1]);
    return firstSlotNum > 20;
  });

  // Sort each group and combine (morning first, then afternoon)
  const sortedMorning = morningSlots.sort();
  const sortedAfternoon = afternoonSlots.sort();

  return [...sortedMorning, ...sortedAfternoon].join(",");
}

// Get course offerings (slots, faculty, venues) for selected course
exports.getCourseOfferings = async (req, res) => {
  try {
    const { course_code, slot_year, semester_type } = req.params;

    if (!course_code || !slot_year || !semester_type) {
      return res.status(400).json({
        message: "course_code, slot_year, and semester_type are required",
      });
    }

    // First, get course details to determine T, P, C values
    const courseResult = await db.query(
      `SELECT course_code, course_name, theory, practical, credits
       FROM course 
       WHERE course_code = $1`,
      [course_code]
    );

    if (courseResult.rows.length === 0) {
      return res.status(404).json({ message: "Course not found" });
    }

    const courseData = courseResult.rows[0];
    const { theory, practical } = courseData;

    // Determine course type
    const getCourseType = (t, p) => {
      if (t > 0 && p === 0) return "T"; // Theory only
      if (t === 0 && p > 0) return "P"; // Practical only
      if (t > 0 && p > 0) return "TEL"; // Theory embedded Lab
      return "Unknown";
    };

    const courseType = getCourseType(theory, practical);

    // Get all faculty allocations for this course
    const allocationsResult = await db.query(
      `SELECT 
         fa.slot_name,
         fa.venue,
         fa.slot_day,
         fa.slot_time,
         f.name as faculty_name,
         v.capacity as available_seats
       FROM faculty_allocation fa
       LEFT JOIN faculty f ON fa.employee_id = f.employee_id  
       LEFT JOIN venue v ON fa.venue = v.venue
       WHERE fa.course_code = $1 
         AND fa.slot_year = $2 
         AND fa.semester_type = $3
       ORDER BY fa.slot_name, fa.slot_day, fa.slot_time`,
      [course_code, slot_year, semester_type]
    );

    if (allocationsResult.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "No faculty allocations found for this course" });
    }

    const offerings = [];

    if (courseType === "TEL") {
      // For TEL courses, handle theory and practical separately

      // Handle Theory component
      const theoryAllocations = allocationsResult.rows.filter(
        (row) => !row.slot_name.startsWith("L")
      );
      const theoryGroups = {};

      theoryAllocations.forEach((row) => {
        const key = `${row.slot_name}-${row.venue}-${row.faculty_name}`;
        if (!theoryGroups[key]) {
          theoryGroups[key] = {
            slot_name: row.slot_name,
            venue: row.venue,
            faculty_name: row.faculty_name,
            available_seats: row.available_seats,
            schedule: [],
          };
        }
        theoryGroups[key].schedule.push({
          day: row.slot_day,
          time: row.slot_time,
        });
      });

      Object.values(theoryGroups).forEach((group) => {
        offerings.push({
          course_code: courseData.course_code,
          course_title: courseData.course_name,
          course_type: "T",
          slots_offered: group.slot_name,
          venue: group.venue,
          faculty_name: group.faculty_name,
          available_seats: group.available_seats,
          schedule: group.schedule,
        });
      });

      // Handle Practical component using semester_slot_config
      if (practical > 0) {
        const practicalConfigs = await db.query(
          `SELECT slot_name, linked_slots
           FROM semester_slot_config 
           WHERE slot_year = $1 
             AND semester_type = $2 
             AND course_theory = 0 
             AND course_practical = $3`,
          [slot_year, semester_type, practical]
        );

        const practicalAllocations = allocationsResult.rows.filter((row) =>
          row.slot_name.startsWith("L")
        );

        // Use Set to track normalized slot combinations and prevent duplicates
        const seenSlotCombinations = new Set();

        practicalConfigs.rows.forEach((config) => {
          // Normalize slot order to prevent duplicates
          const normalizedSlots = normalizeSlotOrder(
            config.slot_name,
            config.linked_slots
          );

          // Skip if we've already seen this combination
          if (seenSlotCombinations.has(normalizedSlots)) {
            return;
          }
          seenSlotCombinations.add(normalizedSlots);

          // Check if any allocation matches this configuration
          const slotsInConfig = [
            config.slot_name,
            ...(config.linked_slots || []),
          ];
          const matchingAllocation = practicalAllocations.find((alloc) =>
            slotsInConfig.includes(alloc.slot_name)
          );

          if (matchingAllocation) {
            offerings.push({
              course_code: courseData.course_code,
              course_title: courseData.course_name,
              course_type: "P",
              slots_offered: normalizedSlots,
              venue: matchingAllocation.venue,
              faculty_name: matchingAllocation.faculty_name,
              available_seats: matchingAllocation.available_seats,
              schedule: [],
            });
          }
        });
      }
    } else if (courseType === "T") {
      // For Theory-only courses, show all theory slot options
      const theoryGroups = {};

      allocationsResult.rows.forEach((row) => {
        const key = `${row.slot_name}-${row.venue}-${row.faculty_name}`;
        if (!theoryGroups[key]) {
          theoryGroups[key] = {
            slot_name: row.slot_name,
            venue: row.venue,
            faculty_name: row.faculty_name,
            available_seats: row.available_seats,
            schedule: [],
          };
        }
        theoryGroups[key].schedule.push({
          day: row.slot_day,
          time: row.slot_time,
        });
      });

      Object.values(theoryGroups).forEach((group) => {
        offerings.push({
          course_code: courseData.course_code,
          course_title: courseData.course_name,
          course_type: "T",
          slots_offered: group.slot_name,
          venue: group.venue,
          faculty_name: group.faculty_name,
          available_seats: group.available_seats,
          schedule: group.schedule,
        });
      });
    } else if (courseType === "P") {
      // For Practical-only courses, use semester_slot_config for proper grouping
      const practicalConfigs = await db.query(
        `SELECT slot_name, linked_slots
         FROM semester_slot_config 
         WHERE slot_year = $1 
           AND semester_type = $2 
           AND course_theory = 0 
           AND course_practical = $3`,
        [slot_year, semester_type, practical]
      );

      // Use Set to track normalized slot combinations and prevent duplicates
      const seenSlotCombinations = new Set();

      practicalConfigs.rows.forEach((config) => {
        // Normalize slot order to prevent duplicates
        const normalizedSlots = normalizeSlotOrder(
          config.slot_name,
          config.linked_slots
        );

        // Skip if we've already seen this combination
        if (seenSlotCombinations.has(normalizedSlots)) {
          return;
        }
        seenSlotCombinations.add(normalizedSlots);

        // Check if any allocation matches this configuration
        const slotsInConfig = [
          config.slot_name,
          ...(config.linked_slots || []),
        ];
        const matchingAllocation = allocationsResult.rows.find((alloc) =>
          slotsInConfig.includes(alloc.slot_name)
        );

        if (matchingAllocation) {
          offerings.push({
            course_code: courseData.course_code,
            course_title: courseData.course_name,
            course_type: "P",
            slots_offered: normalizedSlots,
            venue: matchingAllocation.venue,
            faculty_name: matchingAllocation.faculty_name,
            available_seats: matchingAllocation.available_seats,
            schedule: [],
          });
        }
      });
    }

    // Sort offerings: Theory first, then Practical
    offerings.sort((a, b) => {
      if (a.course_type === "T" && b.course_type === "P") return -1;
      if (a.course_type === "P" && b.course_type === "T") return 1;
      return a.slots_offered.localeCompare(b.slots_offered);
    });

    res.status(200).json({
      course_info: {
        course_code: courseData.course_code,
        course_name: courseData.course_name,
        theory: theory,
        practical: practical,
        credits: courseData.credits,
        course_type: courseType,
      },
      offerings: offerings,
    });
  } catch (error) {
    console.error("Get course offerings error:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching course offerings" });
  }
};

// Helper function to get student details from user_id
async function getStudentByUserId(userId) {
  const result = await db.query(
    `SELECT enrollment_no, student_name, program_name, year_admitted 
     FROM student 
     WHERE user_id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw new Error("Student record not found for this user");
  }

  // Map database column names to expected property names
  return {
    enrollment_number: result.rows[0].enrollment_no,
    student_name: result.rows[0].student_name,
    program_code: result.rows[0].program_name,
    year_admitted: result.rows[0].year_admitted,
  };
}

// Helper function to check slot conflicts
async function checkSlotConflicts(
  studentEnrollment,
  slotYear,
  semesterType,
  newSlotName
) {
  // Get all current registrations for the student in this semester
  const currentRegistrations = await db.query(
    `SELECT slot_name FROM student_registrations 
     WHERE enrollment_number = $1 
       AND slot_year = $2 
       AND semester_type = $3`,
    [studentEnrollment, slotYear, semesterType]
  );

  // Get all conflicting slots for the new slot
  const conflicts = await db.query(
    `SELECT conflicting_slot_name 
     FROM slot_conflict 
     WHERE slot_year = $1 
       AND semester_type = $2 
       AND slot_name = $3`,
    [slotYear, semesterType, newSlotName]
  );

  const conflictingSlots = conflicts.rows.map(
    (row) => row.conflicting_slot_name
  );
  const currentSlots = currentRegistrations.rows.map((row) => row.slot_name);

  // Check if any current slot conflicts with the new slot
  for (const currentSlot of currentSlots) {
    if (conflictingSlots.includes(currentSlot)) {
      return {
        hasConflict: true,
        conflictingSlot: currentSlot,
      };
    }
  }

  return { hasConflict: false };
}

// Helper function to check credit limits
async function checkCreditLimits(
  studentEnrollment,
  slotYear,
  semesterType,
  newCredits
) {
  const result = await db.query(
    `SELECT SUM(credits) as total_credits 
     FROM student_registrations 
     WHERE enrollment_number = $1 
       AND slot_year = $2 
       AND semester_type = $3`,
    [studentEnrollment, slotYear, semesterType]
  );

  const currentCredits = parseInt(result.rows[0].total_credits) || 0;
  const totalAfterRegistration = currentCredits + newCredits;

  return {
    currentCredits,
    totalAfterRegistration,
    exceedsLimit: totalAfterRegistration > 27,
  };
}

// Helper function to check if course component is already registered
async function checkCourseAlreadyRegistered(
  studentEnrollment,
  slotYear,
  semesterType,
  courseCode,
  componentType
) {
  // For TEL courses, check if the specific component (T or P) is already registered
  // For single courses, check if any registration exists

  let query;
  let params;

  if (componentType === "SINGLE") {
    // For T-only or P-only courses, check if any registration exists
    query = `SELECT COUNT(*) as count 
             FROM student_registrations 
             WHERE enrollment_number = $1 
               AND slot_year = $2 
               AND semester_type = $3 
               AND course_code = $4`;
    params = [studentEnrollment, slotYear, semesterType, courseCode];
  } else {
    // For TEL courses, check if this specific component is already registered
    query = `SELECT COUNT(*) as count 
             FROM student_registrations 
             WHERE enrollment_number = $1 
               AND slot_year = $2 
               AND semester_type = $3 
               AND course_code = $4 
               AND component_type = $5`;
    params = [
      studentEnrollment,
      slotYear,
      semesterType,
      courseCode,
      componentType,
    ];
  }

  const result = await db.query(query, params);
  return parseInt(result.rows[0].count) > 0;
}

// Register course offering
exports.registerCourseOffering = async (req, res) => {
  try {
    const {
      course_code,
      slot_name,
      slot_year,
      semester_type,
      venue,
      faculty_name,
    } = req.body;
    const userId = req.userId; // FIXED: Use req.userId instead of req.user.id

    console.log(
      `🎯 Registration request: ${course_code} - ${slot_name} by user ${userId}`
    );

    // Validate required fields
    if (
      !course_code ||
      !slot_name ||
      !slot_year ||
      !semester_type ||
      !venue ||
      !faculty_name
    ) {
      return res.status(400).json({
        message:
          "Missing required fields: course_code, slot_name, slot_year, semester_type, venue, faculty_name",
      });
    }

    // Get student details
    const student = await getStudentByUserId(userId);

    // Get course details
    const courseResult = await db.query(
      `SELECT course_code, course_name, theory, practical, credits, course_type
       FROM course 
       WHERE course_code = $1`,
      [course_code]
    );

    if (courseResult.rows.length === 0) {
      return res.status(404).json({ message: "Course not found" });
    }

    const course = courseResult.rows[0];

    // Extract theory and practical values
    const { theory, practical } = course;

    // Determine component type first
    const isTheorySlot = !slot_name.startsWith("L");
    let componentType;

    if (theory > 0 && practical === 0) {
      componentType = "SINGLE"; // T-only course
    } else if (theory === 0 && practical > 0) {
      componentType = "SINGLE"; // P-only course
    } else if (theory > 0 && practical > 0) {
      componentType = isTheorySlot ? "T" : "P"; // TEL course
    }

    // Check if course component is already registered
    const alreadyRegistered = await checkCourseAlreadyRegistered(
      student.enrollment_number,
      slot_year,
      semester_type,
      course_code,
      componentType
    );

    if (alreadyRegistered) {
      const componentName =
        componentType === "SINGLE"
          ? "course"
          : componentType === "T"
          ? "theory component"
          : "practical component";
      return res.status(400).json({
        message: `You are already registered for ${componentName} of ${course_code}. Please delete existing registration first.`,
      });
    }

    // Check credit limits (only for new course registrations, not components)
    if (componentType === "SINGLE" || componentType === "T") {
      const creditCheck = await checkCreditLimits(
        student.enrollment_number,
        slot_year,
        semester_type,
        course.credits
      );

      if (creditCheck.exceedsLimit) {
        return res.status(400).json({
          message: `Registration would exceed 27 credit limit. Current: ${creditCheck.currentCredits}, After registration: ${creditCheck.totalAfterRegistration}`,
        });
      }
    }

    // Check slot conflicts
    const conflictCheck = await checkSlotConflicts(
      student.enrollment_number,
      slot_year,
      semester_type,
      slot_name
    );

    if (conflictCheck.hasConflict) {
      return res.status(400).json({
        message: `Slot conflict detected. ${slot_name} conflicts with your existing registration: ${conflictCheck.conflictingSlot}`,
      });
    }

    // Create registration data (component type already determined above)
    let registrations = [
      {
        component_type: componentType,
        slot_name: slot_name,
      },
    ];

    // Insert registration(s)
    for (const registration of registrations) {
      await db.query(
        `INSERT INTO student_registrations 
         (enrollment_number, student_name, program_code, year_admitted,
          slot_year, semester_type, course_code, course_name,
          theory, practical, credits, course_type,
          slot_name, venue, faculty_name, component_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
        [
          student.enrollment_number,
          student.student_name,
          student.program_code,
          student.year_admitted,
          slot_year,
          semester_type,
          course_code,
          course.course_name,
          course.theory,
          course.practical,
          course.credits,
          course.course_type,
          registration.slot_name,
          venue,
          faculty_name,
          registration.component_type,
        ]
      );
    }

    console.log(
      `✅ Registration successful: ${course_code} - ${slot_name} for ${student.enrollment_number}`
    );

    // Calculate new total credits for response
    const creditCheck = await checkCreditLimits(
      student.enrollment_number,
      slot_year,
      semester_type,
      0
    );

    res.status(201).json({
      message: "Registration successful",
      registration: {
        course_code,
        course_name: course.course_name,
        slot_name,
        component_type: registrations[0].component_type,
        credits: course.credits,
        new_total_credits: creditCheck.currentCredits,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      message: "Server error during registration",
      error: error.message,
    });
  }
};

// Delete course offering
exports.deleteCourseOffering = async (req, res) => {
  try {
    const { course_code, slot_year, semester_type } = req.body;
    const userId = req.userId; // FIXED: Use req.userId instead of req.user.id

    console.log(`🗑️ Delete request: ${course_code} by user ${userId}`);

    // Validate required fields
    if (!course_code || !slot_year || !semester_type) {
      return res.status(400).json({
        message:
          "Missing required fields: course_code, slot_year, semester_type",
      });
    }

    // Get student details
    const student = await getStudentByUserId(userId);

    // Check if registration exists
    const existingRegistrations = await db.query(
      `SELECT * FROM student_registrations 
       WHERE enrollment_number = $1 
         AND slot_year = $2 
         AND semester_type = $3 
         AND course_code = $4`,
      [student.enrollment_number, slot_year, semester_type, course_code]
    );

    if (existingRegistrations.rows.length === 0) {
      return res.status(404).json({
        message: `No registration found for course ${course_code}`,
      });
    }

    // For TEL courses, delete all components (both T and P)
    // For single courses, delete the single registration
    const deleteResult = await db.query(
      `DELETE FROM student_registrations 
       WHERE enrollment_number = $1 
         AND slot_year = $2 
         AND semester_type = $3 
         AND course_code = $4
       RETURNING *`,
      [student.enrollment_number, slot_year, semester_type, course_code]
    );

    console.log(
      `✅ Deletion successful: ${course_code} for ${student.enrollment_number} (${deleteResult.rows.length} registrations removed)`
    );

    res.status(200).json({
      message: "Registration deleted successfully",
      deleted_registrations: deleteResult.rows.length,
      course_code,
    });
  } catch (error) {
    console.error("Deletion error:", error);
    res.status(500).json({
      message: "Server error during deletion",
      error: error.message,
    });
  }
};

// Get student registration summary (credits, courses)
exports.getStudentRegistrationSummary = async (req, res) => {
  try {
    const { slot_year, semester_type } = req.query;
    const userId = req.userId;

    if (!slot_year || !semester_type) {
      return res.status(400).json({
        message: "slot_year and semester_type are required",
      });
    }

    // Get student details
    const student = await getStudentByUserId(userId);

    // Get all registrations for this semester
    const registrations = await db.query(
      `SELECT course_code, course_name, credits, component_type, slot_name, venue, faculty_name
       FROM student_registrations 
       WHERE enrollment_number = $1 
         AND slot_year = $2 
         AND semester_type = $3
       ORDER BY course_code, component_type`,
      [student.enrollment_number, slot_year, semester_type]
    );

    // Calculate total credits (count each course only once)
    const coursesMap = new Map();
    registrations.rows.forEach((reg) => {
      if (!coursesMap.has(reg.course_code)) {
        coursesMap.set(reg.course_code, {
          course_code: reg.course_code,
          course_name: reg.course_name,
          credits: reg.credits,
          components: [],
        });
      }
      coursesMap.get(reg.course_code).components.push({
        component_type: reg.component_type,
        slot_name: reg.slot_name,
        venue: reg.venue,
        faculty_name: reg.faculty_name,
      });
    });

    const registeredCourses = Array.from(coursesMap.values());
    const totalCredits = registeredCourses.reduce(
      (sum, course) => sum + course.credits,
      0
    );
    const remainingCredits = 27 - totalCredits;

    res.status(200).json({
      student_info: {
        enrollment_number: student.enrollment_number,
        student_name: student.student_name,
        program_code: student.program_code,
      },
      semester_info: {
        slot_year,
        semester_type,
      },
      credit_summary: {
        total_credits: totalCredits,
        remaining_credits: remainingCredits,
        max_credits: 27,
        percentage_used: Math.round((totalCredits / 27) * 100),
      },
      registered_courses: registeredCourses,
      total_courses: registeredCourses.length,
    });
  } catch (error) {
    console.error("Get registration summary error:", error);
    res.status(500).json({
      message: "Server error while fetching registration summary",
      error: error.message,
    });
  }
};
