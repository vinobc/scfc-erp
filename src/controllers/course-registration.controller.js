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

// Enhanced getCourseDetails with data cleanup and P=4 support
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
    const theory = parseInt(courseDetails.theory);
    const practical = parseInt(courseDetails.practical);

    // Calculate course type
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

    // Get slot offerings with faculty and venue details
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
         ORDER BY fa.slot_name, fa.slot_day`,
        [course_code, slot_year, semester_type]
      );

      slotOfferings = slotResult.rows;
    }

    // Get linked slot information for Summer 2024-25
    let linkedSlotInfo = new Map();

    if (slot_year === "2024-25" && semester_type === "SUMMER") {
      // Get P=2 linking info
      const linkedSlotsResult = await db.query(
        `SELECT slot_name, linked_slots, course_theory, course_practical
         FROM semester_slot_config 
         WHERE slot_year = $1 
           AND semester_type = $2 
           AND linked_slots IS NOT NULL
           AND (
             (course_theory = $3 AND course_practical = 0) OR 
             (course_theory = 0 AND course_practical = 2)
           )`,
        [slot_year, semester_type, theory]
      );

      // Build P=2 linked slots mapping
      linkedSlotsResult.rows.forEach((row) => {
        if (row.linked_slots && row.linked_slots.length > 0) {
          linkedSlotInfo.set(row.slot_name, row.linked_slots[0]);
          linkedSlotInfo.set(row.linked_slots[0], row.slot_name);
        }
      });
    }

    // Process slot offerings into grouped registrations
    const registrationEntries = processSlotOfferingsIntoRegistrations(
      slotOfferings,
      linkedSlotInfo,
      theory,
      practical,
      slot_year === "2024-25" && semester_type === "SUMMER"
    );

    // Prepare response data
    const response = {
      course_code: courseDetails.course_code,
      course_name: courseDetails.course_name,
      theory: courseDetails.theory,
      practical: courseDetails.practical,
      credits: courseDetails.credits,
      course_type: courseType,
      registration_entries: registrationEntries,
      is_summer_linked: slot_year === "2024-25" && semester_type === "SUMMER",
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Get course details error:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching course details" });
  }
};

// Process slot offerings into grouped registrations
function processSlotOfferingsIntoRegistrations(
  slotOfferings,
  linkedSlotInfo,
  theory,
  practical,
  isSummerLinked
) {
  if (!slotOfferings || slotOfferings.length === 0) {
    return [];
  }

  // Separate theory and lab slots
  const theorySlots = slotOfferings.filter(
    (slot) => !slot.slot_name.startsWith("L")
  );
  const labSlots = slotOfferings.filter((slot) =>
    slot.slot_name.startsWith("L")
  );

  const registrationEntries = [];

  // Process theory component
  if (theory > 0 && theorySlots.length > 0) {
    const theoryEntry = processTheorySlots(
      theorySlots,
      linkedSlotInfo,
      theory,
      isSummerLinked
    );
    if (theoryEntry) {
      registrationEntries.push(theoryEntry);
    }
  }

  // Process lab component
  if (practical > 0 && labSlots.length > 0) {
    const labEntry = processLabSlots(
      labSlots,
      linkedSlotInfo,
      practical,
      isSummerLinked
    );
    if (labEntry) {
      registrationEntries.push(labEntry);
    }
  }

  return registrationEntries;
}

// Process theory slots with linking support
function processTheorySlots(
  theorySlots,
  linkedSlotInfo,
  theory,
  isSummerLinked
) {
  // Group by slot name and deduplicate
  const slotGroups = new Map();
  theorySlots.forEach((slot) => {
    if (!slotGroups.has(slot.slot_name)) {
      slotGroups.set(slot.slot_name, []);
    }
    slotGroups.get(slot.slot_name).push(slot);
  });

  const slotNames = Array.from(slotGroups.keys());
  console.log("🔍 DEBUG: Theory slot names:", slotNames);

  // Check if linking is needed for T=4 in Summer 2024-25
  if (theory === 4 && isSummerLinked) {
    // Find linked pairs (E+F or G+H)
    const linkedPairs = findLinkedPairs(slotNames, linkedSlotInfo);
    console.log("🔍 DEBUG: Found linked theory pairs:", linkedPairs);

    if (linkedPairs.length > 0) {
      // Use the first linked pair found
      const [slot1, slot2] = linkedPairs[0];
      const slot1Data = slotGroups.get(slot1) || [];
      const slot2Data = slotGroups.get(slot2) || [];

      return {
        type: "theory",
        component_name: `${slot1}, ${slot2}`,
        is_linked: true,
        slot_details: {
          [slot1]: slot1Data,
          [slot2]: slot2Data,
        },
        all_slots_data: [...slot1Data, ...slot2Data],
        venue: slot1Data[0]?.venue || slot2Data[0]?.venue,
        faculty_name: slot1Data[0]?.faculty_name || slot2Data[0]?.faculty_name,
        available_seats:
          slot1Data[0]?.available_seats || slot2Data[0]?.available_seats,
      };
    }
  }

  // Non-linked theory (T=2, T=3, or T=4 without linking)
  const firstSlot = theorySlots[0];
  return {
    type: "theory",
    component_name: slotNames.join(", "),
    is_linked: false,
    slot_details: Object.fromEntries(slotGroups),
    all_slots_data: theorySlots,
    venue: firstSlot.venue,
    faculty_name: firstSlot.faculty_name,
    available_seats: firstSlot.available_seats,
  };
}

// Enhanced process lab slots function with data cleanup
function processLabSlots(labSlots, linkedSlotInfo, practical, isSummerLinked) {
  // Clean and deduplicate lab slots - remove invalid compound entries
  const cleanedSlots = cleanupLabSlots(labSlots);
  const uniqueSlots = deduplicateSlots(cleanedSlots);
  const firstSlot = uniqueSlots[0];

  console.log(
    "🧹 DEBUG: Original lab slots:",
    labSlots.map((s) => s.slot_name)
  );
  console.log(
    "🧹 DEBUG: Cleaned lab slots:",
    cleanedSlots.map((s) => s.slot_name)
  );
  console.log(
    "🧹 DEBUG: Unique cleaned slots:",
    uniqueSlots.map((s) => s.slot_name)
  );

  if (!isSummerLinked) {
    // Non-summer: treat as individual slots
    return {
      type: "lab",
      component_name: uniqueSlots.map((s) => s.slot_name).join(", "),
      is_linked: false,
      slot_details: uniqueSlots.reduce((acc, slot) => {
        acc[slot.slot_name] = [slot];
        return acc;
      }, {}),
      all_slots_data: uniqueSlots,
      venue: firstSlot.venue,
      faculty_name: firstSlot.faculty_name,
      available_seats: firstSlot.available_seats,
    };
  }

  // Summer 2024-25: Handle P=4 with cleaned data
  if (practical === 4) {
    // Recalculate P=4 combination with cleaned data
    const cleanedSlotNames = uniqueSlots.map((s) => s.slot_name).sort();
    console.log(
      "🔍 DEBUG P=4: Cleaned slot names for matching:",
      cleanedSlotNames
    );

    // Re-find P=4 combination with cleaned slot names
    const p4Info = findP4CombinationWithCleanedData(
      uniqueSlots,
      cleanedSlotNames
    );

    if (p4Info) {
      console.log(
        "✅ DEBUG P=4: Found matching combination after cleanup:",
        p4Info
      );

      const allSlotNames = p4Info.all;
      const slotDetails = {};

      allSlotNames.forEach((slotName) => {
        const slot = uniqueSlots.find((s) => s.slot_name === slotName);
        if (slot) {
          slotDetails[slotName] = [slot];
        }
      });

      return {
        type: "lab",
        component_name: allSlotNames.join(", "),
        is_linked: true,
        slot_details: slotDetails,
        all_slots_data: uniqueSlots,
        p4_combination: p4Info,
        venue: firstSlot.venue,
        faculty_name: firstSlot.faculty_name,
        available_seats: firstSlot.available_seats,
      };
    } else {
      console.log("⚠️ DEBUG P=4: Still no matching combination after cleanup");
    }
  } else if (practical === 2) {
    // P=2: Use simple 1:1 linking
    const pairs = [];
    const processedSlots = new Set();

    uniqueSlots.forEach((slot) => {
      if (processedSlots.has(slot.slot_name)) return;

      const linkedSlotName = linkedSlotInfo.get(slot.slot_name);
      if (linkedSlotName) {
        const linkedSlot = uniqueSlots.find(
          (s) => s.slot_name === linkedSlotName
        );
        if (linkedSlot && !processedSlots.has(linkedSlotName)) {
          pairs.push([slot, linkedSlot]);
          processedSlots.add(slot.slot_name);
          processedSlots.add(linkedSlotName);
        }
      }
    });

    const allSlotNames = [];
    const slotDetails = {};

    pairs.forEach((pair) => {
      pair.forEach((slot) => {
        allSlotNames.push(slot.slot_name);
        slotDetails[slot.slot_name] = [slot];
      });
    });

    return {
      type: "lab",
      component_name: allSlotNames.join(", "),
      is_linked: true,
      slot_details: slotDetails,
      all_slots_data: uniqueSlots,
      venue: firstSlot.venue,
      faculty_name: firstSlot.faculty_name,
      available_seats: firstSlot.available_seats,
    };
  }

  // Fallback: individual slots
  return {
    type: "lab",
    component_name: uniqueSlots.map((s) => s.slot_name).join(", "),
    is_linked: false,
    slot_details: uniqueSlots.reduce((acc, slot) => {
      acc[slot.slot_name] = [slot];
      return acc;
    }, {}),
    all_slots_data: uniqueSlots,
    venue: firstSlot.venue,
    faculty_name: firstSlot.faculty_name,
    available_seats: firstSlot.available_seats,
  };
}

// Clean up lab slots by removing invalid compound entries
function cleanupLabSlots(labSlots) {
  const validSlots = [];
  const validSlotPattern = /^L\d+\+L\d+$/; // Matches L1+L2, L19+L20, etc.

  labSlots.forEach((slot) => {
    // Only keep slots that match the valid pattern (individual lab slots)
    if (validSlotPattern.test(slot.slot_name)) {
      validSlots.push(slot);
      console.log(`✅ CLEANUP: Keeping valid slot: ${slot.slot_name}`);
    } else {
      console.log(`❌ CLEANUP: Removing invalid slot: ${slot.slot_name}`);
    }
  });

  return validSlots;
}

// Find P=4 combination with cleaned data
function findP4CombinationWithCleanedData(uniqueSlots, cleanedSlotNames) {
  // Hard-coded expected P=4 combinations based on your data
  const expectedP4Combinations = [
    {
      morning: ["L5+L6", "L19+L20"],
      afternoon: ["L25+L26", "L39+L40"],
    },
    {
      morning: ["L1+L2", "L3+L4"],
      afternoon: ["L21+L22", "L23+L24"],
    },
    {
      morning: ["L7+L8", "L9+L10"],
      afternoon: ["L27+L28", "L29+L30"],
    },
    {
      morning: ["L11+L12", "L13+L14"],
      afternoon: ["L31+L32", "L33+L34"],
    },
    {
      morning: ["L15+L16", "L17+L18"],
      afternoon: ["L35+L36", "L37+L38"],
    },
    // Add more combinations as needed
  ];

  // Check if cleaned slot names match any expected combination
  for (const combo of expectedP4Combinations) {
    const expectedSlots = [...combo.morning, ...combo.afternoon].sort();

    console.log(
      `🔍 DEBUG P=4: Checking combination: [${expectedSlots.join(", ")}]`
    );
    console.log(
      `🔍 DEBUG P=4: Against cleaned slots: [${cleanedSlotNames.join(", ")}]`
    );

    if (arraysEqual(expectedSlots, cleanedSlotNames)) {
      console.log("✅ DEBUG P=4: Found exact match!");

      // Create day-grouped structure
      const dayGroupedInfo = createDayGroupedP4StructureFromSlots(
        uniqueSlots,
        combo.morning,
        combo.afternoon
      );

      return dayGroupedInfo;
    }
  }

  return null;
}

// Create day-grouped P=4 structure from cleaned slot data
function createDayGroupedP4StructureFromSlots(
  uniqueSlots,
  morningSlots,
  afternoonSlots
) {
  const dayGroups = new Map();

  // Create a mapping of slot names to their day/time info
  const slotInfo = new Map();
  uniqueSlots.forEach((slot) => {
    slotInfo.set(slot.slot_name, slot);
  });

  // Group morning and afternoon slots by day
  morningSlots.forEach((morningSlotName) => {
    const morningSlot = slotInfo.get(morningSlotName);
    if (morningSlot) {
      const day = morningSlot.slot_day;

      if (!dayGroups.has(day)) {
        dayGroups.set(day, { morning: null, afternoon: null });
      }

      dayGroups.get(day).morning = morningSlot;
    }
  });

  afternoonSlots.forEach((afternoonSlotName) => {
    const afternoonSlot = slotInfo.get(afternoonSlotName);
    if (afternoonSlot) {
      const day = afternoonSlot.slot_day;

      if (!dayGroups.has(day)) {
        dayGroups.set(day, { morning: null, afternoon: null });
      }

      dayGroups.get(day).afternoon = afternoonSlot;
    }
  });

  // Convert to array format sorted by day
  const dayOrder = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  const sortedDays = Array.from(dayGroups.keys()).sort(
    (a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b)
  );

  const dayGroupedSlots = sortedDays
    .map((day) => ({
      day: day,
      morning: dayGroups.get(day).morning,
      afternoon: dayGroups.get(day).afternoon,
    }))
    .filter((group) => group.morning || group.afternoon);

  return {
    morning: morningSlots,
    afternoon: afternoonSlots,
    all: [...morningSlots, ...afternoonSlots],
    dayGroups: dayGroupedSlots,
  };
}

// Enhanced deduplication function
function deduplicateSlots(slots) {
  const seen = new Map();

  slots.forEach((slot) => {
    const key = slot.slot_name;
    if (!seen.has(key)) {
      seen.set(key, slot);
    } else {
      console.log(`🔄 DEDUP: Skipping duplicate slot: ${key}`);
    }
  });

  const uniqueSlots = Array.from(seen.values());
  console.log(
    `🔍 DEBUG: Deduplicated ${slots.length} slots to ${uniqueSlots.length} unique slots`
  );
  return uniqueSlots;
}

// Find linked pairs in slot names
function findLinkedPairs(slotNames, linkedSlotInfo) {
  const pairs = [];
  const processed = new Set();

  slotNames.forEach((slotName) => {
    if (processed.has(slotName)) return;

    const linkedSlot = linkedSlotInfo.get(slotName);
    if (linkedSlot && slotNames.includes(linkedSlot)) {
      pairs.push([slotName, linkedSlot]);
      processed.add(slotName);
      processed.add(linkedSlot);
    }
  });

  return pairs;
}

// Helper function to compare arrays
function arraysEqual(arr1, arr2) {
  if (arr1.length !== arr2.length) return false;
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) return false;
  }
  return true;
}
