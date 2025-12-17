const db = require("../config/db");

// Initialize Winter 2025-26 semester slot configuration
async function initWinter2025SemesterConfig() {
  try {
    console.log("Initializing Winter 2025-26 semester slot configuration...");

    // First, add the new combined slot names to allowed_slot_names table
    console.log("Adding new combined slot names (D1+TA1, D2+TA2) to allowed_slot_names...");
    await db.query(`
      INSERT INTO allowed_slot_names (name)
      VALUES ('D1+TA1'), ('D2+TA2')
      ON CONFLICT (name) DO NOTHING
    `);
    console.log("Successfully added new slot names to allowed_slot_names");

    // Theory Only Courses - 1 credit theory slots (T=1, P=0)
    await db.query(`
      INSERT INTO semester_slot_config (slot_year, semester_type, slot_name, course_theory, course_practical, linked_slots)
      VALUES
      ('2025-26', 'WINTER', 'TA1', 1, 0, NULL),
      ('2025-26', 'WINTER', 'TB1', 1, 0, NULL),
      ('2025-26', 'WINTER', 'TC1', 1, 0, NULL),
      ('2025-26', 'WINTER', 'TA2', 1, 0, NULL),
      ('2025-26', 'WINTER', 'TB2', 1, 0, NULL),
      ('2025-26', 'WINTER', 'TC2', 1, 0, NULL)
      ON CONFLICT (slot_year, semester_type, slot_name, course_theory, course_practical)
      DO NOTHING
    `);

    // Theory Only Courses - 2 credit theory slots (T=2, P=0)
    await db.query(`
      INSERT INTO semester_slot_config (slot_year, semester_type, slot_name, course_theory, course_practical, linked_slots)
      VALUES
      ('2025-26', 'WINTER', 'D1', 2, 0, NULL),
      ('2025-26', 'WINTER', 'E1', 2, 0, NULL),
      ('2025-26', 'WINTER', 'F1', 2, 0, NULL),
      ('2025-26', 'WINTER', 'G1', 2, 0, NULL),
      ('2025-26', 'WINTER', 'D2', 2, 0, NULL),
      ('2025-26', 'WINTER', 'E2', 2, 0, NULL),
      ('2025-26', 'WINTER', 'F2', 2, 0, NULL),
      ('2025-26', 'WINTER', 'G2', 2, 0, NULL)
      ON CONFLICT (slot_year, semester_type, slot_name, course_theory, course_practical)
      DO NOTHING
    `);

    // Theory Only Courses - 3 credit theory slots (T=3, P=0)
    await db.query(`
      INSERT INTO semester_slot_config (slot_year, semester_type, slot_name, course_theory, course_practical, linked_slots)
      VALUES
      ('2025-26', 'WINTER', 'A1', 3, 0, NULL),
      ('2025-26', 'WINTER', 'B1', 3, 0, NULL),
      ('2025-26', 'WINTER', 'C1', 3, 0, NULL),
      ('2025-26', 'WINTER', 'A2', 3, 0, NULL),
      ('2025-26', 'WINTER', 'B2', 3, 0, NULL),
      ('2025-26', 'WINTER', 'C2', 3, 0, NULL),
      ('2025-26', 'WINTER', 'D1+TA1', 3, 0, NULL),
      ('2025-26', 'WINTER', 'D2+TA2', 3, 0, NULL)
      ON CONFLICT (slot_year, semester_type, slot_name, course_theory, course_practical)
      DO NOTHING
    `);

    // Theory Only Courses - 4 credit theory slots (T=4, P=0) - Combined slots
    await db.query(`
      INSERT INTO semester_slot_config (slot_year, semester_type, slot_name, course_theory, course_practical, linked_slots)
      VALUES
      ('2025-26', 'WINTER', 'A1+TA1', 4, 0, NULL),
      ('2025-26', 'WINTER', 'B1+TB1', 4, 0, NULL),
      ('2025-26', 'WINTER', 'C1+TC1', 4, 0, NULL),
      ('2025-26', 'WINTER', 'A2+TA2', 4, 0, NULL),
      ('2025-26', 'WINTER', 'B2+TB2', 4, 0, NULL),
      ('2025-26', 'WINTER', 'C2+TC2', 4, 0, NULL)
      ON CONFLICT (slot_year, semester_type, slot_name, course_theory, course_practical)
      DO NOTHING
    `);

    // Lab Only Courses - 2 hour lab slots (T=0, P=2) - Individual lab pairs
    console.log("Adding 2-hour lab slot configurations for Winter 2025-26...");

    const labSlots = [
      "L1+L2", "L3+L4", "L5+L6", "L7+L8", "L9+L10", "L11+L12", "L13+L14",
      "L15+L16", "L17+L18", "L19+L20", "L21+L22", "L23+L24", "L25+L26",
      "L27+L28", "L29+L30", "L31+L32", "L33+L34", "L35+L36", "L37+L38", "L39+L40"
    ];

    for (const labSlot of labSlots) {
      await db.query(
        `INSERT INTO semester_slot_config
         (slot_year, semester_type, slot_name, course_theory, course_practical, linked_slots)
         VALUES ('2025-26', 'WINTER', $1, 0, 2, NULL)
         ON CONFLICT (slot_year, semester_type, slot_name, course_theory, course_practical)
         DO NOTHING`,
        [labSlot]
      );
    }

    // Lab Only Courses - 4 hour lab slots (T=0, P=4) - Same individual pairs, admin will select 2
    console.log("Adding 4-hour lab slot configurations for Winter 2025-26...");

    for (const labSlot of labSlots) {
      await db.query(
        `INSERT INTO semester_slot_config
         (slot_year, semester_type, slot_name, course_theory, course_practical, linked_slots)
         VALUES ('2025-26', 'WINTER', $1, 0, 4, NULL)
         ON CONFLICT (slot_year, semester_type, slot_name, course_theory, course_practical)
         DO NOTHING`,
        [labSlot]
      );
    }

    // TEL Courses - Theory component configurations
    console.log("Adding TEL course theory component configurations for Winter 2025-26...");

    // TEL T=1, P=2 - Theory component (same as T=1, P=0)
    await db.query(`
      INSERT INTO semester_slot_config (slot_year, semester_type, slot_name, course_theory, course_practical, linked_slots)
      VALUES
      ('2025-26', 'WINTER', 'TA1', 1, 2, NULL),
      ('2025-26', 'WINTER', 'TB1', 1, 2, NULL),
      ('2025-26', 'WINTER', 'TC1', 1, 2, NULL),
      ('2025-26', 'WINTER', 'TA2', 1, 2, NULL),
      ('2025-26', 'WINTER', 'TB2', 1, 2, NULL),
      ('2025-26', 'WINTER', 'TC2', 1, 2, NULL)
      ON CONFLICT (slot_year, semester_type, slot_name, course_theory, course_practical)
      DO NOTHING
    `);

    // TEL T=2, P=2 - Theory component
    await db.query(`
      INSERT INTO semester_slot_config (slot_year, semester_type, slot_name, course_theory, course_practical, linked_slots)
      VALUES
      ('2025-26', 'WINTER', 'D1', 2, 2, NULL),
      ('2025-26', 'WINTER', 'E1', 2, 2, NULL),
      ('2025-26', 'WINTER', 'F1', 2, 2, NULL),
      ('2025-26', 'WINTER', 'G1', 2, 2, NULL),
      ('2025-26', 'WINTER', 'D2', 2, 2, NULL),
      ('2025-26', 'WINTER', 'E2', 2, 2, NULL),
      ('2025-26', 'WINTER', 'F2', 2, 2, NULL),
      ('2025-26', 'WINTER', 'G2', 2, 2, NULL)
      ON CONFLICT (slot_year, semester_type, slot_name, course_theory, course_practical)
      DO NOTHING
    `);

    // TEL T=2, P=4 - Theory component
    await db.query(`
      INSERT INTO semester_slot_config (slot_year, semester_type, slot_name, course_theory, course_practical, linked_slots)
      VALUES
      ('2025-26', 'WINTER', 'D1', 2, 4, NULL),
      ('2025-26', 'WINTER', 'E1', 2, 4, NULL),
      ('2025-26', 'WINTER', 'F1', 2, 4, NULL),
      ('2025-26', 'WINTER', 'G1', 2, 4, NULL),
      ('2025-26', 'WINTER', 'D2', 2, 4, NULL),
      ('2025-26', 'WINTER', 'E2', 2, 4, NULL),
      ('2025-26', 'WINTER', 'F2', 2, 4, NULL),
      ('2025-26', 'WINTER', 'G2', 2, 4, NULL)
      ON CONFLICT (slot_year, semester_type, slot_name, course_theory, course_practical)
      DO NOTHING
    `);

    // TEL T=3, P=2 - Theory component (includes new D1+TA1 and D2+TA2)
    await db.query(`
      INSERT INTO semester_slot_config (slot_year, semester_type, slot_name, course_theory, course_practical, linked_slots)
      VALUES
      ('2025-26', 'WINTER', 'A1', 3, 2, NULL),
      ('2025-26', 'WINTER', 'B1', 3, 2, NULL),
      ('2025-26', 'WINTER', 'C1', 3, 2, NULL),
      ('2025-26', 'WINTER', 'A2', 3, 2, NULL),
      ('2025-26', 'WINTER', 'B2', 3, 2, NULL),
      ('2025-26', 'WINTER', 'C2', 3, 2, NULL),
      ('2025-26', 'WINTER', 'D1+TA1', 3, 2, NULL),
      ('2025-26', 'WINTER', 'D2+TA2', 3, 2, NULL)
      ON CONFLICT (slot_year, semester_type, slot_name, course_theory, course_practical)
      DO NOTHING
    `);

    console.log("Winter 2025-26 semester slot configuration initialized successfully.");

    // Verification
    const theoryResult = await db.query(`
      SELECT COUNT(*) as count
      FROM semester_slot_config
      WHERE slot_year = '2025-26'
      AND semester_type = 'WINTER'
      AND course_practical = 0
    `);

    const labResult = await db.query(`
      SELECT COUNT(*) as count
      FROM semester_slot_config
      WHERE slot_year = '2025-26'
      AND semester_type = 'WINTER'
      AND course_theory = 0
      AND course_practical > 0
    `);

    const telResult = await db.query(`
      SELECT COUNT(*) as count
      FROM semester_slot_config
      WHERE slot_year = '2025-26'
      AND semester_type = 'WINTER'
      AND course_theory > 0
      AND course_practical > 0
    `);

    console.log(`Verification - Theory-only configurations: ${theoryResult.rows[0].count}`);
    console.log(`Verification - Lab-only configurations: ${labResult.rows[0].count}`);
    console.log(`Verification - TEL configurations: ${telResult.rows[0].count}`);

  } catch (error) {
    console.error("Error initializing Winter 2025-26 semester slot configuration:", error);
  }
}

// Run the initialization
initWinter2025SemesterConfig()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
