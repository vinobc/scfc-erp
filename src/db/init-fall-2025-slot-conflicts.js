const db = require("../config/db");

// Initialize Fall 2025-26 slot conflicts based on clash table
async function initFall2025SlotConflicts() {
  try {
    console.log("Initializing Fall 2025-26 slot conflicts...");

    // Fall 2025-26 conflicts based on the clash table image
    const fall2025Conflicts = [
      // Theory slots (3-credit) conflicts
      { slot: "A1", conflicting_slot: "L1+L2" },
      { slot: "A1", conflicting_slot: "L9+L10" },
      { slot: "A1", conflicting_slot: "L19+L20" },

      { slot: "B1", conflicting_slot: "L5+L6" },
      { slot: "B1", conflicting_slot: "L11+L12" },
      { slot: "B1", conflicting_slot: "L13+L14" },

      { slot: "C1", conflicting_slot: "L9+L10" },
      { slot: "C1", conflicting_slot: "L15+L16" },
      { slot: "C1", conflicting_slot: "L17+L18" },

      // Theory slots (2-credit) conflicts
      { slot: "D1", conflicting_slot: "L3+L4" },
      { slot: "D1", conflicting_slot: "L13+L14" },

      { slot: "E1", conflicting_slot: "L7+L8" },
      { slot: "E1", conflicting_slot: "L17+L18" },

      { slot: "F1", conflicting_slot: "L1+L2" },
      { slot: "F1", conflicting_slot: "L11+L12" },

      { slot: "G1", conflicting_slot: "L5+L6" },
      { slot: "G1", conflicting_slot: "L15+L16" },

      // Theory slots (1-credit) conflicts
      { slot: "TA1", conflicting_slot: "L7+L8" },
      { slot: "TB1", conflicting_slot: "L19+L20" },
      { slot: "TC1", conflicting_slot: "L3+L4" },

      // Combined theory slots (4-credit) conflicts - A1+TA1, B1+TB1, C1+TC1
      // A1+TA1 conflicts = A1 conflicts + TA1 conflicts
      { slot: "A1+TA1", conflicting_slot: "L1+L2" },
      { slot: "A1+TA1", conflicting_slot: "L9+L10" },
      { slot: "A1+TA1", conflicting_slot: "L19+L20" },
      { slot: "A1+TA1", conflicting_slot: "L7+L8" },

      // B1+TB1 conflicts = B1 conflicts + TB1 conflicts
      { slot: "B1+TB1", conflicting_slot: "L5+L6" },
      { slot: "B1+TB1", conflicting_slot: "L11+L12" },
      { slot: "B1+TB1", conflicting_slot: "L13+L14" },
      { slot: "B1+TB1", conflicting_slot: "L19+L20" },

      // C1+TC1 conflicts = C1 conflicts + TC1 conflicts
      { slot: "C1+TC1", conflicting_slot: "L9+L10" },
      { slot: "C1+TC1", conflicting_slot: "L15+L16" },
      { slot: "C1+TC1", conflicting_slot: "L17+L18" },
      { slot: "C1+TC1", conflicting_slot: "L3+L4" },

      // Second half theory slots - A2, B2, C2, etc. with L21-L40
      { slot: "A2", conflicting_slot: "L21+L22" },
      { slot: "A2", conflicting_slot: "L29+L30" },
      { slot: "A2", conflicting_slot: "L39+L40" },

      { slot: "B2", conflicting_slot: "L25+L26" },
      { slot: "B2", conflicting_slot: "L31+L32" },
      { slot: "B2", conflicting_slot: "L33+L34" },

      { slot: "C2", conflicting_slot: "L29+L30" },
      { slot: "C2", conflicting_slot: "L35+L36" },
      { slot: "C2", conflicting_slot: "L37+L38" },

      { slot: "D2", conflicting_slot: "L23+L24" },
      { slot: "D2", conflicting_slot: "L33+L34" },

      { slot: "E2", conflicting_slot: "L27+L28" },
      { slot: "E2", conflicting_slot: "L37+L38" },

      { slot: "F2", conflicting_slot: "L21+L22" },
      { slot: "F2", conflicting_slot: "L31+L32" },

      { slot: "G2", conflicting_slot: "L25+L26" },
      { slot: "G2", conflicting_slot: "L35+L36" },

      { slot: "TA2", conflicting_slot: "L27+L28" },
      { slot: "TB2", conflicting_slot: "L39+L40" },
      { slot: "TC2", conflicting_slot: "L23+L24" },

      // Combined theory slots (4-credit) second half conflicts
      // A2+TA2 conflicts = A2 conflicts + TA2 conflicts
      { slot: "A2+TA2", conflicting_slot: "L21+L22" },
      { slot: "A2+TA2", conflicting_slot: "L29+L30" },
      { slot: "A2+TA2", conflicting_slot: "L39+L40" },
      { slot: "A2+TA2", conflicting_slot: "L27+L28" },

      // B2+TB2 conflicts = B2 conflicts + TB2 conflicts
      { slot: "B2+TB2", conflicting_slot: "L25+L26" },
      { slot: "B2+TB2", conflicting_slot: "L31+L32" },
      { slot: "B2+TB2", conflicting_slot: "L33+L34" },
      { slot: "B2+TB2", conflicting_slot: "L39+L40" },

      // C2+TC2 conflicts = C2 conflicts + TC2 conflicts
      { slot: "C2+TC2", conflicting_slot: "L29+L30" },
      { slot: "C2+TC2", conflicting_slot: "L35+L36" },
      { slot: "C2+TC2", conflicting_slot: "L37+L38" },
      { slot: "C2+TC2", conflicting_slot: "L23+L24" },
    ];

    // Insert Fall 2025-26 conflicts (bidirectional)
    for (const conflict of fall2025Conflicts) {
      // Insert the primary conflict
      await db.query(
        `INSERT INTO slot_conflict 
         (slot_year, semester_type, slot_name, conflicting_slot_name)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (slot_year, semester_type, slot_name, conflicting_slot_name) 
         DO NOTHING`,
        ["2025-26", "FALL", conflict.slot, conflict.conflicting_slot]
      );

      // Insert the reverse conflict (bidirectional)
      await db.query(
        `INSERT INTO slot_conflict 
         (slot_year, semester_type, slot_name, conflicting_slot_name)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (slot_year, semester_type, slot_name, conflicting_slot_name) 
         DO NOTHING`,
        ["2025-26", "FALL", conflict.conflicting_slot, conflict.slot]
      );
    }

    console.log("Fall 2025-26 slot conflicts initialized successfully.");
    console.log(`Total conflicts inserted: ${fall2025Conflicts.length * 2} (bidirectional)`);
  } catch (error) {
    console.error("Error initializing Fall 2025-26 slot conflicts:", error);
  }
}

// Run the initialization
initFall2025SlotConflicts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });