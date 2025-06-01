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
