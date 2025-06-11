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

// Enhanced helper function to normalize slot order (handles both theory and lab slots)
function normalizeSlotOrder(slotName, linkedSlots) {
  const allSlots = [slotName, ...(linkedSlots || [])];

  // Handle theory slots (A, B, C, D, E, F, G, H, etc.)
  const theorySlots = allSlots.filter((slot) => !slot.startsWith("L"));

  // Handle lab slots (L1+L2, L3+L4, etc.)
  const labSlots = allSlots.filter((slot) => slot.startsWith("L"));

  if (theorySlots.length > 0) {
    // For theory slots, sort alphabetically (E comes before F)
    const sortedTheory = theorySlots.sort();
    console.log(
      `🔍 Normalized theory slots: ${allSlots.join(",")} → ${sortedTheory.join(
        ","
      )}`
    );
    return sortedTheory.join(",");
  } else if (labSlots.length > 0) {
    // For lab slots, separate morning and afternoon then sort
    const morningSlots = labSlots.filter((slot) => {
      const match = slot.match(/L(\d+)/);
      if (!match) return false;
      const firstSlotNum = parseInt(match[1]);
      return firstSlotNum <= 20;
    });

    const afternoonSlots = labSlots.filter((slot) => {
      const match = slot.match(/L(\d+)/);
      if (!match) return false;
      const firstSlotNum = parseInt(match[1]);
      return firstSlotNum > 20;
    });

    // Sort each group and combine (morning first, then afternoon)
    const sortedMorning = morningSlots.sort();
    const sortedAfternoon = afternoonSlots.sort();
    const result = [...sortedMorning, ...sortedAfternoon].join(",");

    console.log(`🔍 Normalized lab slots: ${allSlots.join(",")} → ${result}`);
    return result;
  } else {
    // Fallback: just sort everything
    const result = allSlots.sort().join(",");
    console.log(`🔍 Normalized mixed slots: ${allSlots.join(",")} → ${result}`);
    return result;
  }
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

    // Get all faculty allocations for this course with actual seat availability
    const allocationsResult = await db.query(
      `SELECT 
     fa.slot_name,
     fa.venue,
     fa.slot_day,
     fa.slot_time,
     f.name as faculty_name,
     v.seats as total_seats,
     (
       SELECT COUNT(*) 
       FROM student_registrations sr 
       WHERE sr.course_code = fa.course_code 
         AND sr.slot_year = fa.slot_year 
         AND sr.semester_type = fa.semester_type 
         AND sr.venue = fa.venue
         AND (
           -- Case 1: Exact match (for 4-hour labs)
           sr.slot_name = fa.slot_name
           OR
           -- Case 2: Component match (for theory like E,F -> E or F)
           (',' || sr.slot_name || ',') LIKE ('%,' || fa.slot_name || ',%')
         )
     ) as current_registrations,
     (
       v.seats - (
         SELECT COUNT(*) 
         FROM student_registrations sr 
         WHERE sr.course_code = fa.course_code 
           AND sr.slot_year = fa.slot_year 
           AND sr.semester_type = fa.semester_type 
           AND sr.venue = fa.venue
           AND (
             sr.slot_name = fa.slot_name
             OR
             (',' || sr.slot_name || ',') LIKE ('%,' || fa.slot_name || ',%')
           )
       )
     ) as available_seats
   FROM faculty_allocation fa
   LEFT JOIN faculty f ON fa.employee_id = f.employee_id  
   LEFT JOIN venue v ON fa.venue = v.venue
   WHERE fa.course_code = $1 
     AND fa.slot_year = $2 
     AND fa.semester_type = $3
   ORDER BY fa.slot_name, fa.slot_day, fa.slot_time`,
      [course_code, slot_year, semester_type]
    );

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

          // Find ALL allocations that match this configuration
          const slotsInConfig = [
            config.slot_name,
            ...(config.linked_slots || []),
          ];

          // Get all matching allocations (not just first one)
          const matchingAllocations = practicalAllocations.filter((alloc) =>
            slotsInConfig.includes(alloc.slot_name)
          );

          // Group by unique venue+faculty combinations
          const uniqueCombinations = new Map();

          matchingAllocations.forEach((alloc) => {
            const key = `${alloc.venue}-${alloc.faculty_name}`;
            if (!uniqueCombinations.has(key)) {
              uniqueCombinations.set(key, alloc);
            }
          });

          // Create offerings for each unique venue+faculty combination
          uniqueCombinations.forEach((allocation) => {
            offerings.push({
              course_code: courseData.course_code,
              course_title: courseData.course_name,
              course_type: "P",
              slots_offered: normalizedSlots,
              venue: allocation.venue,
              faculty_name: allocation.faculty_name,
              available_seats: allocation.available_seats,
              schedule: [],
            });
          });
        });
      }
    } else if (courseType === "T") {
      // For Theory-only courses, handle both 2-credit and 4-credit courses
      console.log(
        `Processing Theory-only course: ${courseData.course_code} (T=${theory}, C=${courseData.credits})`
      );

      if (courseData.credits === 4) {
        // 4-credit theory courses need slot combination (E+F, G+H)
        console.log("4-credit theory course detected, using slot combinations");

        const theoryConfigs = await db.query(
          `SELECT slot_name, linked_slots
           FROM semester_slot_config 
           WHERE slot_year = $1 
             AND semester_type = $2 
             AND course_theory = 4 
             AND course_practical = 0`,
          [slot_year, semester_type]
        );

        // Use Set to track normalized slot combinations and prevent duplicates
        const seenSlotCombinations = new Set();

        theoryConfigs.rows.forEach((config) => {
          // Normalize slot order to prevent duplicates (E+F same as F+E)
          const normalizedSlots = normalizeSlotOrder(
            config.slot_name,
            config.linked_slots
          );

          // Skip if we've already seen this combination
          if (seenSlotCombinations.has(normalizedSlots)) {
            return;
          }
          seenSlotCombinations.add(normalizedSlots);

          // Find ALL allocations that match this configuration
          const slotsInConfig = [
            config.slot_name,
            ...(config.linked_slots || []),
          ];

          // Get all matching allocations (not just first one)
          const matchingAllocations = allocationsResult.rows.filter((alloc) =>
            slotsInConfig.includes(alloc.slot_name)
          );

          // Group by unique venue+faculty combinations
          const uniqueCombinations = new Map();

          matchingAllocations.forEach((alloc) => {
            const key = `${alloc.venue}-${alloc.faculty_name}`;
            if (!uniqueCombinations.has(key)) {
              uniqueCombinations.set(key, alloc);
            }
          });

          // Create offerings for each unique venue+faculty combination
          uniqueCombinations.forEach((allocation) => {
            // Build combined schedule from all slots in the combination for this specific venue+faculty
            const combinedSchedule = [];
            slotsInConfig.forEach((slotName) => {
              const slotAllocations = allocationsResult.rows.filter(
                (alloc) =>
                  alloc.slot_name === slotName &&
                  alloc.venue === allocation.venue &&
                  alloc.faculty_name === allocation.faculty_name
              );
              slotAllocations.forEach((alloc) => {
                combinedSchedule.push({
                  day: alloc.slot_day,
                  time: alloc.slot_time,
                });
              });
            });

            offerings.push({
              course_code: courseData.course_code,
              course_title: courseData.course_name,
              course_type: "T",
              slots_offered: normalizedSlots,
              venue: allocation.venue,
              faculty_name: allocation.faculty_name,
              available_seats: allocation.available_seats,
              schedule: combinedSchedule,
            });
          });
        });
      } else {
        // 2-credit and 3-credit theory courses - show individual slots
        console.log(
          "2/3-credit theory course detected, using individual slots"
        );

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
      }
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

        // Find ALL allocations that match this configuration
        const slotsInConfig = [
          config.slot_name,
          ...(config.linked_slots || []),
        ];

        // Get all matching allocations (not just first one)
        const matchingAllocations = allocationsResult.rows.filter((alloc) =>
          slotsInConfig.includes(alloc.slot_name)
        );

        // Group by unique venue+faculty combinations
        const uniqueCombinations = new Map();

        matchingAllocations.forEach((alloc) => {
          const key = `${alloc.venue}-${alloc.faculty_name}`;
          if (!uniqueCombinations.has(key)) {
            uniqueCombinations.set(key, alloc);
          }
        });

        // Create offerings for each unique venue+faculty combination
        uniqueCombinations.forEach((allocation) => {
          offerings.push({
            course_code: courseData.course_code,
            course_title: courseData.course_name,
            course_type: "P",
            slots_offered: normalizedSlots,
            venue: allocation.venue,
            faculty_name: allocation.faculty_name,
            available_seats: allocation.available_seats,
            schedule: [],
          });
        });
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
  console.log(`🔍 Looking for student with user_id: ${userId}`);

  const result = await db.query(
    `SELECT enrollment_no, student_name, program_name, year_admitted 
     FROM student 
     WHERE user_id = $1`,
    [userId]
  );

  console.log(`🔍 Student query result:`, result.rows);

  if (result.rows.length === 0) {
    // Additional debug: show what user_ids exist in student table
    const allStudents = await db.query(
      `SELECT user_id, enrollment_no, student_name FROM student ORDER BY user_id LIMIT 5`
    );
    console.log(`🔍 Sample students in database:`, allStudents.rows);

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

// Enhanced helper function to parse compound slot names
function parseSlotNames(slotName) {
  if (!slotName) return [];

  // Handle compound slots like "L1+L2, L17+L18,L21+L22, L37+L38"
  // Split by comma and clean up spaces
  const individualSlots = slotName
    .split(",")
    .map((slot) => slot.trim())
    .filter((slot) => slot.length > 0);

  console.log(`🔍 Parsed slot "${slotName}" into:`, individualSlots);
  return individualSlots;
}

// Enhanced helper function to check slot conflicts
async function checkSlotConflicts(
  studentEnrollment,
  slotYear,
  semesterType,
  newSlotName
) {
  console.log(`🔍 Checking conflicts for slot: "${newSlotName}"`);

  // Parse the new slot name into individual slots
  const newSlots = parseSlotNames(newSlotName);

  // Get all current registrations for the student in this semester
  const currentRegistrations = await db.query(
    `SELECT slot_name, course_code, component_type FROM student_registrations 
     WHERE enrollment_number = $1 
       AND slot_year = $2 
       AND semester_type = $3`,
    [studentEnrollment, slotYear, semesterType]
  );

  console.log(`🔍 Current registrations:`, currentRegistrations.rows);

  // Parse all current slot names into individual slots
  const currentSlots = [];
  currentRegistrations.rows.forEach((reg) => {
    const parsedSlots = parseSlotNames(reg.slot_name);
    parsedSlots.forEach((slot) => {
      currentSlots.push({
        slot_name: slot,
        course_code: reg.course_code,
        component_type: reg.component_type,
        original_slot: reg.slot_name,
      });
    });
  });

  console.log(`🔍 Parsed current slots:`, currentSlots);

  // Check each new slot against all current slots
  for (const newSlot of newSlots) {
    console.log(`🔍 Checking new slot: "${newSlot}"`);

    // Direct slot conflict (same slot)
    const directConflict = currentSlots.find(
      (current) => current.slot_name === newSlot
    );
    if (directConflict) {
      return {
        hasConflict: true,
        conflictType: "DIRECT_DUPLICATE",
        conflictingSlot: directConflict.slot_name,
        conflictingCourse: directConflict.course_code,
        message: `Slot "${newSlot}" is already occupied by ${directConflict.course_code} (${directConflict.component_type})`,
      };
    }

    // Check database conflicts for this new slot
    const conflicts = await db.query(
      `SELECT conflicting_slot_name 
       FROM slot_conflict 
       WHERE slot_year = $1 
         AND semester_type = $2 
         AND slot_name = $3`,
      [slotYear, semesterType, newSlot]
    );

    const conflictingSlotNames = conflicts.rows.map(
      (row) => row.conflicting_slot_name
    );
    console.log(
      `🔍 Database conflicts for "${newSlot}":`,
      conflictingSlotNames
    );

    // Check if any current slot conflicts with this new slot
    for (const currentSlot of currentSlots) {
      if (conflictingSlotNames.includes(currentSlot.slot_name)) {
        return {
          hasConflict: true,
          conflictType: "TIME_CONFLICT",
          conflictingSlot: currentSlot.slot_name,
          conflictingCourse: currentSlot.course_code,
          newSlot: newSlot,
          message: `Time conflict: New slot "${newSlot}" conflicts with your existing registration "${currentSlot.slot_name}" (${currentSlot.course_code} - ${currentSlot.component_type})`,
        };
      }
    }

    // Bidirectional check: Check if any current slot has this new slot in its conflicts
    for (const currentSlot of currentSlots) {
      const reverseConflicts = await db.query(
        `SELECT conflicting_slot_name 
         FROM slot_conflict 
         WHERE slot_year = $1 
           AND semester_type = $2 
           AND slot_name = $3 
           AND conflicting_slot_name = $4`,
        [slotYear, semesterType, currentSlot.slot_name, newSlot]
      );

      if (reverseConflicts.rows.length > 0) {
        return {
          hasConflict: true,
          conflictType: "REVERSE_TIME_CONFLICT",
          conflictingSlot: currentSlot.slot_name,
          conflictingCourse: currentSlot.course_code,
          newSlot: newSlot,
          message: `Time conflict: New slot "${newSlot}" conflicts with your existing registration "${currentSlot.slot_name}" (${currentSlot.course_code} - ${currentSlot.component_type})`,
        };
      }
    }
  }

  console.log(`✅ No conflicts found for slot: "${newSlotName}"`);
  return { hasConflict: false };
}

// Enhanced helper function to check TEL course component conflicts
async function checkTELComponentConflicts(
  studentEnrollment,
  slotYear,
  semesterType,
  courseCode,
  newSlotName,
  newComponentType
) {
  console.log(
    `🔍 Checking TEL component conflicts for ${courseCode} - ${newComponentType}`
  );

  // Get existing registrations for this course
  const existingComponents = await db.query(
    `SELECT slot_name, component_type FROM student_registrations 
     WHERE enrollment_number = $1 
       AND slot_year = $2 
       AND semester_type = $3 
       AND course_code = $4`,
    [studentEnrollment, slotYear, semesterType, courseCode]
  );

  if (existingComponents.rows.length === 0) {
    console.log(`✅ No existing components for ${courseCode}`);
    return { hasConflict: false };
  }

  // Parse slots for all components
  const newSlots = parseSlotNames(newSlotName);

  for (const existingComponent of existingComponents.rows) {
    const existingSlots = parseSlotNames(existingComponent.slot_name);

    console.log(
      `🔍 Checking ${newComponentType} slots [${newSlots.join(", ")}] against ${
        existingComponent.component_type
      } slots [${existingSlots.join(", ")}]`
    );

    // Check each new slot against each existing slot
    for (const newSlot of newSlots) {
      for (const existingSlot of existingSlots) {
        // Direct conflict (same slot)
        if (newSlot === existingSlot) {
          return {
            hasConflict: true,
            conflictType: "TEL_DIRECT_CONFLICT",
            conflictingSlot: existingSlot,
            message: `TEL Course Conflict: ${newComponentType} component slot "${newSlot}" is the same as ${existingComponent.component_type} component slot "${existingSlot}"`,
          };
        }

        // Check database conflicts between the slots
        const conflicts = await db.query(
          `SELECT COUNT(*) as count FROM slot_conflict 
           WHERE slot_year = $1 
             AND semester_type = $2 
             AND ((slot_name = $3 AND conflicting_slot_name = $4) 
                  OR (slot_name = $4 AND conflicting_slot_name = $3))`,
          [slotYear, semesterType, newSlot, existingSlot]
        );

        if (parseInt(conflicts.rows[0].count) > 0) {
          return {
            hasConflict: true,
            conflictType: "TEL_TIME_CONFLICT",
            conflictingSlot: existingSlot,
            newSlot: newSlot,
            message: `TEL Course Conflict: ${newComponentType} component slot "${newSlot}" conflicts with ${existingComponent.component_type} component slot "${existingSlot}"`,
          };
        }
      }
    }
  }

  console.log(`✅ No TEL component conflicts found`);
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

    // Enhanced slot conflict checking
    console.log(
      `🔍 Starting enhanced conflict validation for ${course_code} - ${slot_name}`
    );

    // 1. Check general slot conflicts
    const conflictCheck = await checkSlotConflicts(
      student.enrollment_number,
      slot_year,
      semester_type,
      slot_name
    );

    if (conflictCheck.hasConflict) {
      console.log(`❌ General conflict detected:`, conflictCheck);
      return res.status(400).json({
        message: conflictCheck.message,
        conflict_details: {
          type: conflictCheck.conflictType,
          conflicting_slot: conflictCheck.conflictingSlot,
          conflicting_course: conflictCheck.conflictingCourse,
          new_slot: conflictCheck.newSlot,
        },
      });
    }

    // 2. For TEL courses, check component-specific conflicts
    if (theory > 0 && practical > 0) {
      console.log(`🔍 TEL course detected, checking component conflicts`);

      const telConflictCheck = await checkTELComponentConflicts(
        student.enrollment_number,
        slot_year,
        semester_type,
        course_code,
        slot_name,
        componentType
      );

      if (telConflictCheck.hasConflict) {
        console.log(`❌ TEL component conflict detected:`, telConflictCheck);
        return res.status(400).json({
          message: telConflictCheck.message,
          conflict_details: {
            type: telConflictCheck.conflictType,
            conflicting_slot: telConflictCheck.conflictingSlot,
            new_slot: telConflictCheck.newSlot,
          },
        });
      }
    }

    console.log(
      `✅ All conflict checks passed for ${course_code} - ${slot_name}`
    );

    // ===== ADD THIS SEAT AVAILABILITY CHECK =====
    console.log(
      `✅ All conflict checks passed for ${course_code} - ${slot_name}`
    );

    // Check seat availability before registration
    console.log(
      `🎫 Checking seat availability for ${course_code} - ${slot_name} at ${venue}`
    );

    const seatCheckResult = await db.query(
      `SELECT 
     v.seats as total_seats,
     (
       SELECT COUNT(*) 
       FROM student_registrations sr 
       WHERE sr.course_code = $1 
         AND sr.slot_year = $2 
         AND sr.semester_type = $3 
         AND sr.venue = $4
         AND (
           sr.slot_name = $5
           OR
           (',' || sr.slot_name || ',') LIKE ('%,' || $5 || ',%')
         )
     ) as current_registrations
   FROM venue v
   WHERE v.venue = $4`,
      [course_code, slot_year, semester_type, venue, slot_name]
    );

    if (seatCheckResult.rows.length === 0) {
      return res.status(400).json({
        message: "Venue not found",
      });
    }

    const { total_seats, current_registrations } = seatCheckResult.rows[0];
    const available_seats = total_seats - current_registrations;

    console.log(
      `🎫 Seat availability: ${available_seats}/${total_seats} (${current_registrations} registered)`
    );

    if (available_seats <= 0) {
      return res.status(400).json({
        message: `Registration failed: No seats available for ${course_code} at ${venue}. All ${total_seats} seats are occupied.`,
        seat_info: {
          total_seats,
          current_registrations,
          available_seats,
        },
      });
    }

    console.log(
      `✅ Seat availability confirmed: ${available_seats} seats remaining`
    );
    // ===== END OF SEAT AVAILABILITY CHECK =====

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

// Get student slot timetable
exports.getStudentSlotTimetable = async (req, res) => {
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

    console.log(
      `🔍 Looking for registrations for student: ${student.enrollment_number}`
    );

    // Get raw student registrations first
    const rawRegistrations = await db.query(
      `SELECT * FROM student_registrations 
       WHERE enrollment_number = $1 AND slot_year = $2 AND semester_type = $3
       ORDER BY course_code, component_type`,
      [student.enrollment_number, slot_year, semester_type]
    );

    console.log(`🔍 Raw student registrations:`, rawRegistrations.rows);

    // Process each registration to handle compound slots
    const processedRegistrations = [];

    for (const registration of rawRegistrations.rows) {
      if (registration.slot_name.includes(",")) {
        // Handle compound slots like "L9+L10,L29+L30"
        const individualSlots = registration.slot_name
          .split(",")
          .map((s) => s.trim());
        console.log(
          `🔍 Processing compound slot: ${
            registration.slot_name
          } -> ${individualSlots.join(", ")}`
        );

        for (const individualSlot of individualSlots) {
          // Get slot details for each individual slot
          const slotDetails = await db.query(
            `SELECT slot_day, slot_time FROM slot 
             WHERE slot_name = $1 AND slot_year = $2 AND semester_type = $3`,
            [individualSlot, slot_year, semester_type]
          );

          if (slotDetails.rows.length > 0) {
            // Create a separate entry for each individual slot
            slotDetails.rows.forEach((slotDetail) => {
              processedRegistrations.push({
                ...registration,
                slot_name: individualSlot,
                slot_day: slotDetail.slot_day,
                slot_time: slotDetail.slot_time,
              });
            });
          } else {
            console.log(`⚠️ No slot details found for: ${individualSlot}`);
          }
        }
      } else {
        // Handle regular single slots
        const slotDetails = await db.query(
          `SELECT slot_day, slot_time FROM slot 
           WHERE slot_name = $1 AND slot_year = $2 AND semester_type = $3`,
          [registration.slot_name, slot_year, semester_type]
        );

        if (slotDetails.rows.length > 0) {
          slotDetails.rows.forEach((slotDetail) => {
            processedRegistrations.push({
              ...registration,
              slot_day: slotDetail.slot_day,
              slot_time: slotDetail.slot_time,
            });
          });
        } else {
          console.log(
            `⚠️ No slot details found for: ${registration.slot_name}`
          );
        }
      }
    }

    console.log(`🔍 Processed registrations:`, processedRegistrations.length);
    console.log(
      `🔍 Lab registrations with slot details:`,
      processedRegistrations.filter((r) => r.slot_name.startsWith("L"))
    );

    if (processedRegistrations.length === 0) {
      return res.status(404).json({
        message: "No course registrations found for this semester",
      });
    }

    res.status(200).json({
      student: {
        enrollment_number: student.enrollment_number,
        student_name: student.student_name,
        program_code: student.program_code,
        year_admitted: student.year_admitted,
      },
      semester_info: {
        slot_year,
        semester_type,
      },
      registrations: processedRegistrations,
    });
  } catch (error) {
    console.error("Get student slot timetable error:", error);
    res.status(500).json({
      message: "Server error while fetching student timetable",
      error: error.message,
    });
  }
};

// Pre-validate TEL course registration (both components)
exports.validateTELRegistration = async (req, res) => {
  try {
    const {
      course_code,
      slot_year,
      semester_type,
      theory_slot,
      theory_venue,
      theory_faculty,
      practical_slot,
      practical_venue,
      practical_faculty,
    } = req.body;
    const userId = req.userId;

    console.log(`🔍 Pre-validating TEL registration for ${course_code}`);
    console.log(`Theory: ${theory_slot}, Practical: ${practical_slot}`);

    // Validate required fields
    if (
      !course_code ||
      !slot_year ||
      !semester_type ||
      !theory_slot ||
      !theory_venue ||
      !theory_faculty ||
      !practical_slot ||
      !practical_venue ||
      !practical_faculty
    ) {
      return res.status(400).json({
        message: "Missing required fields for TEL validation",
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
    const { theory, practical } = course;

    // Verify this is actually a TEL course
    if (!(theory > 0 && practical > 0)) {
      return res.status(400).json({
        message: "This validation endpoint is only for TEL courses",
      });
    }

    // Check if course is already registered (any component)
    const existingRegistration = await db.query(
      `SELECT COUNT(*) as count FROM student_registrations 
       WHERE enrollment_number = $1 
         AND slot_year = $2 
         AND semester_type = $3 
         AND course_code = $4`,
      [student.enrollment_number, slot_year, semester_type, course_code]
    );

    if (parseInt(existingRegistration.rows[0].count) > 0) {
      return res.status(400).json({
        message: `You are already registered for ${course_code}. Please delete existing registration first.`,
      });
    }

    // Check credit limits
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

    // Check conflicts for theory slot
    console.log(`🔍 Checking theory slot conflicts: ${theory_slot}`);
    const theoryConflictCheck = await checkSlotConflicts(
      student.enrollment_number,
      slot_year,
      semester_type,
      theory_slot
    );

    if (theoryConflictCheck.hasConflict) {
      return res.status(400).json({
        message: `Theory component conflict: ${theoryConflictCheck.message}`,
        conflict_details: {
          component: "theory",
          type: theoryConflictCheck.conflictType,
          conflicting_slot: theoryConflictCheck.conflictingSlot,
          conflicting_course: theoryConflictCheck.conflictingCourse,
          new_slot: theoryConflictCheck.newSlot,
        },
      });
    }

    // Check conflicts for practical slot
    console.log(`🔍 Checking practical slot conflicts: ${practical_slot}`);
    const practicalConflictCheck = await checkSlotConflicts(
      student.enrollment_number,
      slot_year,
      semester_type,
      practical_slot
    );

    if (practicalConflictCheck.hasConflict) {
      return res.status(400).json({
        message: `Practical component conflict: ${practicalConflictCheck.message}`,
        conflict_details: {
          component: "practical",
          type: practicalConflictCheck.conflictType,
          conflicting_slot: practicalConflictCheck.conflictingSlot,
          conflicting_course: practicalConflictCheck.conflictingCourse,
          new_slot: practicalConflictCheck.newSlot,
        },
      });
    }

    // Check TEL component conflicts (theory vs practical)
    console.log(
      `🔍 Checking TEL component conflicts between theory and practical`
    );

    // Parse both slot types
    const theorySlots = parseSlotNames(theory_slot);
    const practicalSlots = parseSlotNames(practical_slot);

    // Check each theory slot against each practical slot
    for (const theorySlot of theorySlots) {
      for (const practicalSlot of practicalSlots) {
        // Direct conflict (same slot)
        if (theorySlot === practicalSlot) {
          return res.status(400).json({
            message: `TEL Component Conflict: Theory and practical components cannot use the same slot "${theorySlot}"`,
            conflict_details: {
              type: "TEL_SAME_SLOT",
              conflicting_slot: theorySlot,
            },
          });
        }

        // Check database conflicts between theory and practical slots
        const conflicts = await db.query(
          `SELECT COUNT(*) as count FROM slot_conflict 
           WHERE slot_year = $1 
             AND semester_type = $2 
             AND ((slot_name = $3 AND conflicting_slot_name = $4) 
                  OR (slot_name = $4 AND conflicting_slot_name = $3))`,
          [slot_year, semester_type, theorySlot, practicalSlot]
        );

        if (parseInt(conflicts.rows[0].count) > 0) {
          return res.status(400).json({
            message: `TEL Component Conflict: Theory slot "${theorySlot}" conflicts with practical slot "${practicalSlot}"`,
            conflict_details: {
              type: "TEL_TIME_CONFLICT",
              theory_slot: theorySlot,
              practical_slot: practicalSlot,
            },
          });
        }
      }
    }

    console.log(`✅ All TEL validation checks passed for ${course_code}`);

    // Return success response
    res.status(200).json({
      message: "TEL registration validation passed",
      validation_details: {
        course_code,
        theory_slot,
        practical_slot,
        credits: course.credits,
        total_credits_after: creditCheck.totalAfterRegistration,
      },
    });
  } catch (error) {
    console.error("TEL validation error:", error);
    res.status(500).json({
      message: "Server error during TEL validation",
      error: error.message,
    });
  }
};

// Get semesters where student has registrations
exports.getStudentRegistrationSemesters = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        message: "User ID not found in request",
      });
    }

    // Get student details using existing helper function
    const student = await getStudentByUserId(userId);

    if (!student) {
      return res.status(404).json({
        message: "Student not found",
      });
    }

    console.log(
      `🔍 Looking for semesters for student: ${student.enrollment_number}`
    );

    // Get unique semester combinations from student registrations
    const query = `
      SELECT DISTINCT 
        slot_year,
        semester_type
      FROM student_registrations 
      WHERE enrollment_number = $1
      ORDER BY slot_year DESC, semester_type
    `;

    const result = await db.query(query, [student.enrollment_number]);

    console.log(
      `Found ${result.rows.length} semesters with registrations for enrollment ${student.enrollment_number}`
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error getting student registration semesters:", error);
    res.status(500).json({
      message: "Error getting student registration semesters",
      error: error.message,
    });
  }
};
