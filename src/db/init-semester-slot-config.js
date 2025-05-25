// const db = require("../config/db");
// const fs = require("fs");
// const path = require("path");

// // Read schema file
// const schemaPath = path.join(__dirname, "schema", "semester_slot_config.sql");
// const schema = fs.readFileSync(schemaPath, "utf8");

// // Initialize semester slot config table
// async function initSemesterSlotConfig() {
//   try {
//     console.log("Initializing semester slot config table...");
//     await db.query(schema);
//     console.log("Semester slot config table initialized successfully");

//     // Add default configurations for Summer 2024-25
//     await db.query(`
//             -- 3 credit theory slots (A, B, C, D)
//             INSERT INTO semester_slot_config (slot_year, semester_type, slot_name, course_theory, course_practical, linked_slots)
//             VALUES
//             ('2024-25', 'SUMMER', 'A', 3, 0, NULL),
//             ('2024-25', 'SUMMER', 'B', 3, 0, NULL),
//             ('2024-25', 'SUMMER', 'C', 3, 0, NULL),
//             ('2024-25', 'SUMMER', 'D', 3, 0, NULL),

//             -- 2 credit theory slots (E, F, G, H)
//             ('2024-25', 'SUMMER', 'E', 2, 0, NULL),
//             ('2024-25', 'SUMMER', 'F', 2, 0, NULL),
//             ('2024-25', 'SUMMER', 'G', 2, 0, NULL),
//             ('2024-25', 'SUMMER', 'H', 2, 0, NULL),

//             -- 4 credit theory slots (E+F, G+H)
//             ('2024-25', 'SUMMER', 'E', 4, 0, ARRAY['F']),
//             ('2024-25', 'SUMMER', 'F', 4, 0, ARRAY['E']),
//             ('2024-25', 'SUMMER', 'G', 4, 0, ARRAY['H']),
//             ('2024-25', 'SUMMER', 'H', 4, 0, ARRAY['G'])
//         `);

//     // Add default configurations for Winter 2024-25
//     await db.query(`
//             -- 3 credit theory slots
//             INSERT INTO semester_slot_config (slot_year, semester_type, slot_name, course_theory, course_practical, linked_slots)
//             VALUES
//             ('2024-25', 'WINTER', 'A1', 3, 0, NULL),
//             ('2024-25', 'WINTER', 'B1', 3, 0, NULL),
//             ('2024-25', 'WINTER', 'C1', 3, 0, NULL),
//             ('2024-25', 'WINTER', 'A2', 3, 0, NULL),
//             ('2024-25', 'WINTER', 'B2', 3, 0, NULL),
//             ('2024-25', 'WINTER', 'C2', 3, 0, NULL),

//             -- 2 credit theory slots
//             ('2024-25', 'WINTER', 'D1', 2, 0, NULL),
//             ('2024-25', 'WINTER', 'E1', 2, 0, NULL),
//             ('2024-25', 'WINTER', 'F1', 2, 0, NULL),
//             ('2024-25', 'WINTER', 'G1', 2, 0, NULL),
//             ('2024-25', 'WINTER', 'D2', 2, 0, NULL),
//             ('2024-25', 'WINTER', 'E2', 2, 0, NULL),
//             ('2024-25', 'WINTER', 'F2', 2, 0, NULL),
//             ('2024-25', 'WINTER', 'G2', 2, 0, NULL),

//             -- 4 credit theory slots
//             ('2024-25', 'WINTER', 'A1', 4, 0, ARRAY['TA1']),
//             ('2024-25', 'WINTER', 'B1', 4, 0, ARRAY['TB1']),
//             ('2024-25', 'WINTER', 'C1', 4, 0, ARRAY['TC1']),
//             ('2024-25', 'WINTER', 'A2', 4, 0, ARRAY['TA2']),
//             ('2024-25', 'WINTER', 'B2', 4, 0, ARRAY['TB2']),
//             ('2024-25', 'WINTER', 'C2', 4, 0, ARRAY['TC2'])
//         `);

//     console.log("Default semester slot configurations added successfully");
//   } catch (error) {
//     console.error("Error initializing semester slot config table:", error);
//     throw error;
//   }
// }

// // Run if this script is executed directly
// if (require.main === module) {
//   initSemesterSlotConfig()
//     .then(() => {
//       console.log("Semester slot config initialization completed");
//       process.exit(0);
//     })
//     .catch((error) => {
//       console.error("Semester slot config initialization failed:", error);
//       process.exit(1);
//     });
// }

// module.exports = { initSemesterSlotConfig };

const db = require("../config/db");
const fs = require("fs");
const path = require("path");

// Read schema file
const schemaPath = path.join(__dirname, "schema", "semester_slot_config.sql");
const schema = fs.readFileSync(schemaPath, "utf8");

// Initialize semester slot config table
async function initSemesterSlotConfig() {
  try {
    console.log("Initializing semester slot config table...");
    await db.query(schema);
    console.log("Semester slot config table initialized successfully");

    // Add default configurations for Summer 2024-25
    await db.query(`
            -- 3 credit theory slots (A, B, C, D)
            INSERT INTO semester_slot_config (slot_year, semester_type, slot_name, course_theory, course_practical, linked_slots)
            VALUES 
            ('2024-25', 'SUMMER', 'A', 3, 0, NULL),
            ('2024-25', 'SUMMER', 'B', 3, 0, NULL),
            ('2024-25', 'SUMMER', 'C', 3, 0, NULL),
            ('2024-25', 'SUMMER', 'D', 3, 0, NULL),

            -- 2 credit theory slots (E, F, G, H)
            ('2024-25', 'SUMMER', 'E', 2, 0, NULL),
            ('2024-25', 'SUMMER', 'F', 2, 0, NULL),
            ('2024-25', 'SUMMER', 'G', 2, 0, NULL),
            ('2024-25', 'SUMMER', 'H', 2, 0, NULL),

            -- 4 credit theory slots (E+F, G+H)
            ('2024-25', 'SUMMER', 'E', 4, 0, ARRAY['F']),
            ('2024-25', 'SUMMER', 'F', 4, 0, ARRAY['E']),
            ('2024-25', 'SUMMER', 'G', 4, 0, ARRAY['H']),
            ('2024-25', 'SUMMER', 'H', 4, 0, ARRAY['G'])
            ON CONFLICT (slot_year, semester_type, slot_name, course_theory, course_practical) 
            DO NOTHING
        `);

    // Add 2-hour individual lab slot configurations for Summer 2024-25
    console.log(
      "Adding 2-hour individual lab slot configurations for Summer 2024-25..."
    );

    const individual2HourLabs = [
      // Morning lab slots with afternoon links
      { slot: "L1+L2", linked: "L21+L22" },
      { slot: "L3+L4", linked: "L23+L24" },
      { slot: "L5+L6", linked: "L25+L26" },
      { slot: "L7+L8", linked: "L27+L28" },
      { slot: "L9+L10", linked: "L29+L30" },
      { slot: "L11+L12", linked: "L31+L32" },
      { slot: "L13+L14", linked: "L33+L34" },
      { slot: "L15+L16", linked: "L35+L36" },
      { slot: "L17+L18", linked: "L37+L38" },
      { slot: "L19+L20", linked: "L39+L40" },
    ];

    for (const lab of individual2HourLabs) {
      // Morning slot (links to afternoon)
      await db.query(
        `
        INSERT INTO semester_slot_config 
        (slot_year, semester_type, slot_name, course_theory, course_practical, linked_slots)
        VALUES ('2024-25', 'SUMMER', $1, 0, 2, ARRAY[$2])
        ON CONFLICT (slot_year, semester_type, slot_name, course_theory, course_practical) 
        DO UPDATE SET linked_slots = EXCLUDED.linked_slots, updated_at = CURRENT_TIMESTAMP
      `,
        [lab.slot, lab.linked]
      );

      // Afternoon slot (links back to morning)
      await db.query(
        `
        INSERT INTO semester_slot_config 
        (slot_year, semester_type, slot_name, course_theory, course_practical, linked_slots)
        VALUES ('2024-25', 'SUMMER', $1, 0, 2, ARRAY[$2])
        ON CONFLICT (slot_year, semester_type, slot_name, course_theory, course_practical) 
        DO UPDATE SET linked_slots = EXCLUDED.linked_slots, updated_at = CURRENT_TIMESTAMP
      `,
        [lab.linked, lab.slot]
      );
    }

    console.log(
      `✅ Added ${
        individual2HourLabs.length * 2
      } individual 2-hour lab slot configurations for Summer`
    );

    // Add default configurations for Winter 2024-25
    await db.query(`
            -- 3 credit theory slots
            INSERT INTO semester_slot_config (slot_year, semester_type, slot_name, course_theory, course_practical, linked_slots)
            VALUES 
            ('2024-25', 'WINTER', 'A1', 3, 0, NULL),
            ('2024-25', 'WINTER', 'B1', 3, 0, NULL),
            ('2024-25', 'WINTER', 'C1', 3, 0, NULL),
            ('2024-25', 'WINTER', 'A2', 3, 0, NULL),
            ('2024-25', 'WINTER', 'B2', 3, 0, NULL),
            ('2024-25', 'WINTER', 'C2', 3, 0, NULL),

            -- 2 credit theory slots
            ('2024-25', 'WINTER', 'D1', 2, 0, NULL),
            ('2024-25', 'WINTER', 'E1', 2, 0, NULL),
            ('2024-25', 'WINTER', 'F1', 2, 0, NULL),
            ('2024-25', 'WINTER', 'G1', 2, 0, NULL),
            ('2024-25', 'WINTER', 'D2', 2, 0, NULL),
            ('2024-25', 'WINTER', 'E2', 2, 0, NULL),
            ('2024-25', 'WINTER', 'F2', 2, 0, NULL),
            ('2024-25', 'WINTER', 'G2', 2, 0, NULL),

            -- 4 credit theory slots
            ('2024-25', 'WINTER', 'A1', 4, 0, ARRAY['TA1']),
            ('2024-25', 'WINTER', 'B1', 4, 0, ARRAY['TB1']),
            ('2024-25', 'WINTER', 'C1', 4, 0, ARRAY['TC1']),
            ('2024-25', 'WINTER', 'A2', 4, 0, ARRAY['TA2']),
            ('2024-25', 'WINTER', 'B2', 4, 0, ARRAY['TB2']),
            ('2024-25', 'WINTER', 'C2', 4, 0, ARRAY['TC2'])
            ON CONFLICT (slot_year, semester_type, slot_name, course_theory, course_practical) 
            DO NOTHING
        `);

    // Add individual lab slots for Winter 2024-25 (no linking needed as per requirement)
    console.log(
      "Adding individual lab slot configurations for Winter 2024-25 (no linking)..."
    );

    const winterLabSlots = [
      "L1+L2",
      "L3+L4",
      "L5+L6",
      "L7+L8",
      "L9+L10",
      "L11+L12",
      "L13+L14",
      "L15+L16",
      "L17+L18",
      "L19+L20",
      "L21+L22",
      "L23+L24",
      "L25+L26",
      "L27+L28",
      "L29+L30",
      "L31+L32",
      "L33+L34",
      "L35+L36",
      "L37+L38",
      "L39+L40",
    ];

    for (const labSlot of winterLabSlots) {
      await db.query(
        `
        INSERT INTO semester_slot_config 
        (slot_year, semester_type, slot_name, course_theory, course_practical, linked_slots)
        VALUES ('2024-25', 'WINTER', $1, 0, 2, NULL)
        ON CONFLICT (slot_year, semester_type, slot_name, course_theory, course_practical) 
        DO NOTHING
      `,
        [labSlot]
      );
    }

    console.log(
      `✅ Added ${winterLabSlots.length} individual lab slot configurations for Winter (no linking)`
    );

    // Verification
    const summerIndividualResult = await db.query(`
      SELECT COUNT(*) as count 
      FROM semester_slot_config 
      WHERE slot_year = '2024-25' 
      AND semester_type = 'SUMMER' 
      AND course_theory = 0 
      AND course_practical = 2
    `);

    const winterLabResult = await db.query(`
      SELECT COUNT(*) as count 
      FROM semester_slot_config 
      WHERE slot_year = '2024-25' 
      AND semester_type = 'WINTER' 
      AND course_theory = 0 
      AND course_practical = 2
    `);

    console.log(
      `✅ Verification - Summer 2-hour labs: ${summerIndividualResult.rows[0].count} configurations`
    );
    console.log(
      `✅ Verification - Winter labs: ${winterLabResult.rows[0].count} configurations`
    );
    console.log("Default semester slot configurations added successfully");
  } catch (error) {
    console.error("Error initializing semester slot config table:", error);
    throw error;
  }
}

// Run if this script is executed directly
if (require.main === module) {
  initSemesterSlotConfig()
    .then(() => {
      console.log("Semester slot config initialization completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Semester slot config initialization failed:", error);
      process.exit(1);
    });
}

module.exports = { initSemesterSlotConfig };
