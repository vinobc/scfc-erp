const db = require("../config/db");

// Initialize slot conflicts
async function initSlotConflicts() {
  try {
    console.log("Initializing slot conflicts...");

    // Summer semester (AY 2024-25) conflicts
    const summerConflicts = [
      // Monday conflicts
      { slot: "A", conflicting_slot: "L1+L2" },
      { slot: "F", conflicting_slot: "L1+L2" },
      { slot: "C", conflicting_slot: "L3+L4" },
      { slot: "H", conflicting_slot: "L3+L4" },
      { slot: "A", conflicting_slot: "L21+L22" },
      { slot: "F", conflicting_slot: "L21+L22" },
      { slot: "C", conflicting_slot: "L23+L24" },
      { slot: "H", conflicting_slot: "L23+L24" },

      // Tuesday conflicts
      { slot: "B", conflicting_slot: "L5+L6" },
      { slot: "G", conflicting_slot: "L5+L6" },
      { slot: "D", conflicting_slot: "L7+L8" },
      { slot: "A", conflicting_slot: "L7+L8" },
      { slot: "B", conflicting_slot: "L25+L26" },
      { slot: "G", conflicting_slot: "L25+L26" },
      { slot: "D", conflicting_slot: "L27+L28" },
      { slot: "A", conflicting_slot: "L27+L28" },

      // Wednesday conflicts
      { slot: "C", conflicting_slot: "L9+L10" },
      { slot: "H", conflicting_slot: "L9+L10" },
      { slot: "E", conflicting_slot: "L11+L12" },
      { slot: "B", conflicting_slot: "L11+L12" },
      { slot: "C", conflicting_slot: "L29+L30" },
      { slot: "H", conflicting_slot: "L29+L30" },
      { slot: "E", conflicting_slot: "L31+L32" },
      { slot: "B", conflicting_slot: "L31+L32" },

      // Thursday conflicts
      { slot: "D", conflicting_slot: "L13+L14" },
      { slot: "A", conflicting_slot: "L13+L14" },
      { slot: "F", conflicting_slot: "L15+L16" },
      { slot: "C", conflicting_slot: "L15+L16" },
      { slot: "D", conflicting_slot: "L33+L34" },
      { slot: "A", conflicting_slot: "L33+L34" },
      { slot: "F", conflicting_slot: "L35+L36" },
      { slot: "C", conflicting_slot: "L35+L36" },

      // Friday conflicts
      { slot: "E", conflicting_slot: "L17+L18" },
      { slot: "B", conflicting_slot: "L17+L18" },
      { slot: "G", conflicting_slot: "L19+L20" },
      { slot: "D", conflicting_slot: "L19+L20" },
      { slot: "E", conflicting_slot: "L37+L38" },
      { slot: "B", conflicting_slot: "L37+L38" },
      { slot: "G", conflicting_slot: "L39+L40" },
      { slot: "D", conflicting_slot: "L39+L40" },
    ];

    // Winter semester (AY 2024-25) conflicts
    const winterConflicts = [
      // Monday conflicts
      { slot: "A1", conflicting_slot: "L1+L2" },
      { slot: "F1", conflicting_slot: "L1+L2" },
      { slot: "D1", conflicting_slot: "L3+L4" },
      { slot: "TC1", conflicting_slot: "L3+L4" },
      { slot: "A2", conflicting_slot: "L21+L22" },
      { slot: "F2", conflicting_slot: "L21+L22" },
      { slot: "D2", conflicting_slot: "L23+L24" },
      { slot: "TC2", conflicting_slot: "L23+L24" },

      // Tuesday conflicts
      { slot: "B1", conflicting_slot: "L5+L6" },
      { slot: "G1", conflicting_slot: "L5+L6" },
      { slot: "E1", conflicting_slot: "L7+L8" },
      { slot: "TA1", conflicting_slot: "L7+L8" },
      { slot: "B2", conflicting_slot: "L25+L26" },
      { slot: "G2", conflicting_slot: "L25+L26" },
      { slot: "E2", conflicting_slot: "L27+L28" },
      { slot: "TA2", conflicting_slot: "L27+L28" },

      // Wednesday conflicts
      { slot: "C1", conflicting_slot: "L9+L10" },
      { slot: "A1", conflicting_slot: "L9+L10" },
      { slot: "F1", conflicting_slot: "L11+L12" },
      { slot: "B1", conflicting_slot: "L11+L12" },
      { slot: "C2", conflicting_slot: "L29+L30" },
      { slot: "A2", conflicting_slot: "L29+L30" },
      { slot: "F2", conflicting_slot: "L31+L32" },
      { slot: "B2", conflicting_slot: "L31+L32" },

      // Thursday conflicts
      { slot: "D1", conflicting_slot: "L13+L14" },
      { slot: "B1", conflicting_slot: "L13+L14" },
      { slot: "G1", conflicting_slot: "L15+L16" },
      { slot: "C1", conflicting_slot: "L15+L16" },
      { slot: "D2", conflicting_slot: "L33+L34" },
      { slot: "B2", conflicting_slot: "L33+L34" },
      { slot: "G2", conflicting_slot: "L35+L36" },
      { slot: "C2", conflicting_slot: "L35+L36" },

      // Friday conflicts
      { slot: "E1", conflicting_slot: "L17+L18" },
      { slot: "C1", conflicting_slot: "L17+L18" },
      { slot: "A1", conflicting_slot: "L19+L20" },
      { slot: "TB1", conflicting_slot: "L19+L20" },
      { slot: "E2", conflicting_slot: "L37+L38" },
      { slot: "C2", conflicting_slot: "L37+L38" },
      { slot: "A2", conflicting_slot: "L39+L40" },
      { slot: "TB2", conflicting_slot: "L39+L40" },
    ];

    // Insert summer conflicts
    for (const conflict of summerConflicts) {
      await db.query(
        `INSERT INTO slot_conflict 
         (slot_year, semester_type, slot_name, conflicting_slot_name)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (slot_year, semester_type, slot_name, conflicting_slot_name) 
         DO NOTHING`,
        ["2024-25", "SUMMER", conflict.slot, conflict.conflicting_slot]
      );

      // Also insert the reverse conflict
      await db.query(
        `INSERT INTO slot_conflict 
         (slot_year, semester_type, slot_name, conflicting_slot_name)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (slot_year, semester_type, slot_name, conflicting_slot_name) 
         DO NOTHING`,
        ["2024-25", "SUMMER", conflict.conflicting_slot, conflict.slot]
      );
    }

    // Insert winter conflicts
    for (const conflict of winterConflicts) {
      await db.query(
        `INSERT INTO slot_conflict 
         (slot_year, semester_type, slot_name, conflicting_slot_name)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (slot_year, semester_type, slot_name, conflicting_slot_name) 
         DO NOTHING`,
        ["2024-25", "WINTER", conflict.slot, conflict.conflicting_slot]
      );

      // Also insert the reverse conflict
      await db.query(
        `INSERT INTO slot_conflict 
         (slot_year, semester_type, slot_name, conflicting_slot_name)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (slot_year, semester_type, slot_name, conflicting_slot_name) 
         DO NOTHING`,
        ["2024-25", "WINTER", conflict.conflicting_slot, conflict.slot]
      );
    }

    console.log("Slot conflicts initialized successfully.");
  } catch (error) {
    console.error("Error initializing slot conflicts:", error);
  }
}

// Run the initialization
initSlotConflicts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
