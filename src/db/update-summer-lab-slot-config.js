const db = require("../config/db");

async function updateSummerLabSlotConfig() {
  try {
    console.log("Updating Summer lab slot linkages...");

    // First, check if the configurations already exist to avoid duplicates
    const checkResult = await db.query(
      `SELECT * FROM semester_slot_config 
       WHERE slot_year = '2024-25' AND semester_type = 'SUMMER'
       AND slot_name = 'L1+L2' AND linked_slots IS NOT NULL`
    );

    if (checkResult.rows.length > 0) {
      console.log("Summer lab slot linkages already exist, skipping update");
      return;
    }

    // Add lab slot linkages for Summer 2024-25
    const labSlotPairs = [
      { primary: "L1+L2", linked: "L21+L22" },
      { primary: "L3+L4", linked: "L23+L24" },
      { primary: "L5+L6", linked: "L25+L26" },
      { primary: "L7+L8", linked: "L27+L28" },
      { primary: "L9+L10", linked: "L29+L30" },
      { primary: "L11+L12", linked: "L31+L32" },
      { primary: "L13+L14", linked: "L33+L34" },
      { primary: "L15+L16", linked: "L35+L36" },
      { primary: "L17+L18", linked: "L37+L38" },
      { primary: "L19+L20", linked: "L39+L40" },
    ];

    // Insert bidirectional linkages for each pair (each slot points to the other)
    for (const pair of labSlotPairs) {
      // Primary slot links to secondary
      await db.query(
        `
        INSERT INTO semester_slot_config 
        (slot_year, semester_type, slot_name, course_theory, course_practical, linked_slots)
        VALUES ('2024-25', 'SUMMER', $1, 0, 2, ARRAY[$2])
        ON CONFLICT (slot_year, semester_type, slot_name, course_theory, course_practical)
        DO UPDATE SET linked_slots = ARRAY[$2]
      `,
        [pair.primary, pair.linked]
      );

      // Secondary slot links to primary
      await db.query(
        `
        INSERT INTO semester_slot_config 
        (slot_year, semester_type, slot_name, course_theory, course_practical, linked_slots)
        VALUES ('2024-25', 'SUMMER', $1, 0, 2, ARRAY[$2])
        ON CONFLICT (slot_year, semester_type, slot_name, course_theory, course_practical)
        DO UPDATE SET linked_slots = ARRAY[$2]
      `,
        [pair.linked, pair.primary]
      );

      console.log(`Linked ${pair.primary} with ${pair.linked}`);
    }

    console.log("Summer lab slot linkages updated successfully");
  } catch (error) {
    console.error("Error updating summer lab slot linkages:", error);
    throw error;
  }
}

// Run if this script is executed directly
if (require.main === module) {
  updateSummerLabSlotConfig()
    .then(() => {
      console.log("Summer lab slot config update completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Summer lab slot config update failed:", error);
      process.exit(1);
    });
}

module.exports = { updateSummerLabSlotConfig };
