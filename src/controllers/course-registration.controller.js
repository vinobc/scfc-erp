// src/controllers/course-registration.controller.js
const db = require("../config/db");

const courseRegistrationController = {
  // Get available semesters
  async getAvailableSemesters(req, res) {
    try {
      const query = `
        SELECT DISTINCT slot_year, semester_type 
        FROM faculty_allocation 
        ORDER BY slot_year DESC, 
        CASE semester_type 
          WHEN 'SUMMER' THEN 1 
          WHEN 'WINTER' THEN 2 
          WHEN 'FALL' THEN 3 
        END
      `;

      const result = await db.query(query);

      const semesters = result.rows.map((row) => ({
        year: row.slot_year,
        semester: row.semester_type,
        display: `${row.slot_year} - ${row.semester_type}`,
      }));

      res.json({ success: true, semesters });
    } catch (error) {
      console.error("Error fetching semesters:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to fetch semesters" });
    }
  },

  // Get courses for selected semester
  async getCoursesForSemester(req, res) {
    try {
      const { year, semester } = req.query;

      if (!year || !semester) {
        return res
          .status(400)
          .json({ success: false, message: "Year and semester are required" });
      }

      const query = `
        SELECT DISTINCT c.course_code, c.course_name, c.theory, c.practical, c.credits
        FROM course c
        INNER JOIN faculty_allocation fa ON c.course_code = fa.course_code
        WHERE fa.slot_year = $1 AND fa.semester_type = $2
        ORDER BY c.course_code
      `;

      const result = await db.query(query, [year, semester]);
      res.json({ success: true, courses: result.rows });
    } catch (error) {
      console.error("Error fetching courses:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to fetch courses" });
    }
  },

  // Enhanced getCourseDetails with proper slot filtering
  async getCourseDetails(req, res) {
    try {
      const { courseCode, year, semester } = req.query;

      if (!courseCode || !year || !semester) {
        return res.status(400).json({
          success: false,
          message: "Course code, year, and semester are required",
        });
      }

      // Get course details
      const courseQuery = `
        SELECT course_code, course_name, theory, practical, credits, description
        FROM course 
        WHERE course_code = $1
      `;
      const courseResult = await db.query(courseQuery, [courseCode]);

      if (courseResult.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Course not found" });
      }

      const course = courseResult.rows[0];

      // Get ONLY allocated slots for this specific course
      const slotsQuery = `
        SELECT DISTINCT 
          fa.slot_name,
          fa.slot_day,
          fa.slot_time,
          fa.venue,
          f.name as faculty_name,
          v.capacity
        FROM faculty_allocation fa
        LEFT JOIN faculty f ON fa.employee_id = f.employee_id
        LEFT JOIN venue v ON fa.venue = v.venue_id
        WHERE fa.course_code = $1 
          AND fa.slot_year = $2 
          AND fa.semester_type = $3
        ORDER BY fa.slot_name, fa.slot_day
      `;

      const slotsResult = await db.query(slotsQuery, [
        courseCode,
        year,
        semester,
      ]);

      console.log(
        `🔍 DEBUG: Found ${slotsResult.rows.length} allocated slots for ${courseCode}`
      );

      if (slotsResult.rows.length === 0) {
        return res.json({
          success: true,
          course,
          registrationEntries: [],
          message:
            "No faculty allocations found for this course in the selected semester",
        });
      }

      // Process allocated slots into registration entries
      const registrationEntries = await processAllocatedSlotsIntoRegistrations(
        slotsResult.rows,
        course,
        year,
        semester
      );

      res.json({
        success: true,
        course,
        registrationEntries,
      });
    } catch (error) {
      console.error("Error fetching course details:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to fetch course details" });
    }
  },
};

// Process only allocated slots into registration entries
async function processAllocatedSlotsIntoRegistrations(
  allocatedSlots,
  course,
  year,
  semester
) {
  console.log(
    `🔍 DEBUG: Processing ${allocatedSlots.length} allocated slots for ${course.course_code}`
  );

  // Separate theory and lab slots
  const theorySlots = allocatedSlots.filter(
    (slot) =>
      /^[A-H]$/.test(slot.slot_name) || /^T[A-Z]\d+$/.test(slot.slot_name)
  );
  const labSlots = allocatedSlots.filter((slot) =>
    /^L\d+\+L\d+$/.test(slot.slot_name)
  );

  console.log(
    `🔍 DEBUG: Found ${theorySlots.length} theory slots, ${labSlots.length} lab slots`
  );

  const registrationEntries = [];

  // Process theory component if exists
  if (course.theory > 0 && theorySlots.length > 0) {
    const theoryEntry = await processTheorySlots(
      theorySlots,
      course,
      year,
      semester
    );
    if (theoryEntry) {
      registrationEntries.push(theoryEntry);
    }
  }

  // Process lab component if exists
  if (course.practical > 0 && labSlots.length > 0) {
    const labEntry = await processLabSlots(labSlots, course, year, semester);
    if (labEntry) {
      registrationEntries.push(labEntry);
    }
  }

  console.log(
    `✅ DEBUG: Created ${registrationEntries.length} registration entries`
  );
  return registrationEntries;
}

// Process theory slots
async function processTheorySlots(theorySlots, course, year, semester) {
  console.log(`🔍 DEBUG Theory: Processing ${theorySlots.length} theory slots`);

  // Get unique slot names
  const uniqueSlotNames = [
    ...new Set(theorySlots.map((slot) => slot.slot_name)),
  ];
  console.log(
    `🔍 DEBUG Theory: Unique slot names: ${uniqueSlotNames.join(", ")}`
  );

  // Check for theory linking (T=4 courses with E+F or G+H)
  let isLinked = false;
  let slotGroups = [];

  if (course.theory === 4 && year === "2024-25" && semester === "SUMMER") {
    // Check if we have E+F or G+H combination
    const hasEF =
      uniqueSlotNames.includes("E") && uniqueSlotNames.includes("F");
    const hasGH =
      uniqueSlotNames.includes("G") && uniqueSlotNames.includes("H");

    if (hasEF || hasGH) {
      isLinked = true;
      console.log(
        `✅ DEBUG Theory: Found ${hasEF ? "E+F" : "G+H"} linking for T=4 course`
      );
    }
  }

  // Group slots by slot name and collect all times
  const slotDetails = {};
  theorySlots.forEach((slot) => {
    if (!slotDetails[slot.slot_name]) {
      slotDetails[slot.slot_name] = {
        times: [],
        faculty: slot.faculty_name,
        venue: slot.venue,
        capacity: slot.capacity,
      };
    }
    slotDetails[slot.slot_name].times.push({
      day: slot.slot_day,
      time: slot.slot_time,
    });
  });

  // Format display
  let slotsOffered = "";
  if (isLinked) {
    // For linked theory (E+F or G+H), show as combined
    slotsOffered = uniqueSlotNames.join(", ");

    // Create grouped time display
    const timeDetails = [];
    uniqueSlotNames.forEach((slotName) => {
      if (slotDetails[slotName]) {
        const times = slotDetails[slotName].times
          .map((t) => `${t.day} (${t.time})`)
          .join(", ");
        timeDetails.push(`${slotName}: ${times}`);
      }
    });
    slotsOffered += "\n" + timeDetails.join("\n");
  } else {
    // For individual theory slots
    const timeDetails = [];
    uniqueSlotNames.forEach((slotName) => {
      if (slotDetails[slotName]) {
        const times = slotDetails[slotName].times
          .map((t) => `${t.day} (${t.time})`)
          .join(", ");
        timeDetails.push(`${slotName}: ${times}`);
      }
    });
    slotsOffered = timeDetails.join("\n");
  }

  // Get representative faculty and venue
  const firstSlot = theorySlots[0];

  return {
    course_code: course.course_code,
    course_title: course.course_name,
    course_type: "THEORY",
    slots_offered: slotsOffered,
    venue: firstSlot.venue,
    faculty_name: firstSlot.faculty_name,
    available_seats: firstSlot.capacity || 60,
    is_linked: isLinked,
    component_type: "theory",
  };
}

// Process lab slots
async function processLabSlots(labSlots, course, year, semester) {
  console.log(`🔍 DEBUG Lab: Processing ${labSlots.length} lab slots`);

  // Clean and deduplicate lab slots
  const cleanedSlots = deduplicateSlots(labSlots);
  console.log(
    `🔍 DEBUG Lab: After deduplication: ${cleanedSlots.length} slots`
  );

  const uniqueSlotNames = [
    ...new Set(cleanedSlots.map((slot) => slot.slot_name)),
  ];
  console.log(`🔍 DEBUG Lab: Unique slot names: ${uniqueSlotNames.join(", ")}`);

  let isLinked = false;
  let slotsOffered = "";

  // Check for Summer 2024-25 linking
  if (year === "2024-25" && semester === "SUMMER") {
    if (course.practical === 2) {
      // P=2: Simple pairing (e.g., L19+L20 ↔ L39+L40)
      const linkedPairs = await findLinkedPairs(uniqueSlotNames, 2);
      if (linkedPairs.length > 0) {
        isLinked = true;
        slotsOffered = formatLinkedLabDisplay(linkedPairs, cleanedSlots);
        console.log(
          `✅ DEBUG Lab P=2: Found ${linkedPairs.length} linked pairs`
        );
      }
    } else if (course.practical === 4) {
      // P=4: Complex combinations (e.g., L5+L6, L19+L20 ↔ L25+L26, L39+L40)
      const p4Combinations = await findP4Combinations(uniqueSlotNames);
      if (p4Combinations.length > 0) {
        isLinked = true;
        slotsOffered = formatP4LabDisplay(p4Combinations, cleanedSlots);
        console.log(
          `✅ DEBUG Lab P=4: Found ${p4Combinations.length} combinations`
        );
      }
    }
  }

  // If no linking found, display individual slots
  if (!isLinked) {
    const timeDetails = uniqueSlotNames.map((slotName) => {
      const slot = cleanedSlots.find((s) => s.slot_name === slotName);
      return `${slotName} (${slot.slot_day}, ${slot.slot_time})`;
    });
    slotsOffered = timeDetails.join("\n");
  }

  // Get representative faculty and venue
  const firstSlot = cleanedSlots[0];

  return {
    course_code: course.course_code,
    course_title: course.course_name,
    course_type: "LAB",
    slots_offered: slotsOffered,
    venue: firstSlot.venue,
    faculty_name: firstSlot.faculty_name,
    available_seats: firstSlot.capacity || 30,
    is_linked: isLinked,
    component_type: "lab",
  };
}

// Helper function to deduplicate slots
function deduplicateSlots(slots) {
  const seen = new Set();
  return slots.filter((slot) => {
    const key = `${slot.slot_name}-${slot.slot_day}-${slot.slot_time}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

// Find linked pairs for P=2 courses
async function findLinkedPairs(slotNames, practical) {
  try {
    const query = `
      SELECT slot_name, linked_slots 
      FROM semester_slot_config 
      WHERE slot_year = '2024-25' 
        AND semester_type = 'SUMMER' 
        AND course_practical = $1
        AND slot_name = ANY($2)
    `;

    const result = await db.query(query, [practical, slotNames]);

    const pairs = [];
    const processed = new Set();

    result.rows.forEach((row) => {
      if (!processed.has(row.slot_name)) {
        const linkedSlots = JSON.parse(row.linked_slots);
        if (linkedSlots.length > 0 && slotNames.includes(linkedSlots[0])) {
          pairs.push({
            morning: row.slot_name,
            afternoon: linkedSlots[0],
          });
          processed.add(row.slot_name);
          processed.add(linkedSlots[0]);
        }
      }
    });

    return pairs;
  } catch (error) {
    console.error("Error finding linked pairs:", error);
    return [];
  }
}

// Find P=4 combinations
async function findP4Combinations(slotNames) {
  // Hard-coded P=4 combinations for Summer 2024-25
  const p4Mappings = [
    { morning: ["L5+L6", "L19+L20"], afternoon: ["L25+L26", "L39+L40"] },
    { morning: ["L1+L2", "L3+L4"], afternoon: ["L21+L22", "L23+L24"] },
    { morning: ["L7+L8", "L9+L10"], afternoon: ["L27+L28", "L29+L30"] },
    { morning: ["L11+L12", "L13+L14"], afternoon: ["L31+L32", "L33+L34"] },
    { morning: ["L15+L16", "L17+L18"], afternoon: ["L35+L36", "L37+L38"] },
  ];

  const sortedSlotNames = slotNames.sort();

  for (const mapping of p4Mappings) {
    const allSlots = [...mapping.morning, ...mapping.afternoon].sort();
    if (JSON.stringify(sortedSlotNames) === JSON.stringify(allSlots)) {
      console.log(
        `✅ DEBUG P=4: Found exact match for: ${sortedSlotNames.join(", ")}`
      );
      return [mapping];
    }
  }

  console.log(
    `⚠️ DEBUG P=4: No matching combination found for: ${sortedSlotNames.join(
      ", "
    )}`
  );
  return [];
}

// Format linked lab display for P=2
function formatLinkedLabDisplay(linkedPairs, slotData) {
  const pairStrings = linkedPairs.map((pair) => {
    const morningSlot = slotData.find((s) => s.slot_name === pair.morning);
    const afternoonSlot = slotData.find((s) => s.slot_name === pair.afternoon);

    return `${pair.morning}, ${pair.afternoon}\n${pair.morning} (${morningSlot.slot_day}, ${morningSlot.slot_time}), ${pair.afternoon} (${afternoonSlot.slot_day}, ${afternoonSlot.slot_time})`;
  });

  return pairStrings.join("\n\n");
}

// Format P=4 lab display with day grouping
function formatP4LabDisplay(combinations, slotData) {
  if (combinations.length === 0) return "";

  const combo = combinations[0];
  const allSlots = [...combo.morning, ...combo.afternoon];

  // First line: slot names
  const slotNames = `${combo.morning.join(", ")}\n${combo.afternoon.join(
    ", "
  )}`;

  // Group by day
  const dayGroups = {};
  allSlots.forEach((slotName) => {
    const slot = slotData.find((s) => s.slot_name === slotName);
    if (slot) {
      if (!dayGroups[slot.slot_day]) {
        dayGroups[slot.slot_day] = [];
      }
      dayGroups[slot.slot_day].push(`${slotName} (${slot.slot_time})`);
    }
  });

  // Create day-grouped display
  const dayLines = Object.keys(dayGroups)
    .sort()
    .map((day) => {
      return `${day}: ${dayGroups[day].join(", ")}`;
    });

  return `${slotNames}\n\n${dayLines.join("\n")}`;
}

module.exports = courseRegistrationController;
