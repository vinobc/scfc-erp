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
        `);

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
        `);

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
