const db = require("../config/db");

// Initialize 4-hour lab slot configurations for Summer 2024-25
async function initSummer4HourLabConfig() {
  try {
    console.log(
      "Initializing 4-hour lab slot configurations for Summer 2024-25..."
    );

    // First, fix the typo in allowed_slot_names table
    await db.query(`
      UPDATE allowed_slot_names 
      SET name = 'L13+L14' 
      WHERE name = 'L13+L4'
    `);
    console.log("Fixed typo: L13+L4 → L13+L14");

    // Define morning lab pairs
    const morningLabPairs = [
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
    ];

    // Define afternoon lab pairs (corresponding to morning pairs)
    const afternoonLabPairs = [
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

    // Generate all combinations of 2 morning lab pairs with their corresponding afternoon pairs
    const combinations = [];

    for (let i = 0; i < morningLabPairs.length; i++) {
      for (let j = i + 1; j < morningLabPairs.length; j++) {
        const morningSlotName = `${morningLabPairs[i]}, ${morningLabPairs[j]}`;
        const linkedAfternoonSlots = `${afternoonLabPairs[i]}, ${afternoonLabPairs[j]}`;

        combinations.push({
          slot_name: morningSlotName,
          linked_slots: linkedAfternoonSlots,
        });
      }
    }

    console.log(
      `Generated ${combinations.length} 4-hour lab slot combinations`
    );

    // First, add all compound slot names to allowed_slot_names table
    console.log("Adding compound slot names to allowed_slot_names table...");
    for (const combo of combinations) {
      await db.query(
        `
        INSERT INTO allowed_slot_names (name) 
        VALUES ($1) 
        ON CONFLICT (name) DO NOTHING
      `,
        [combo.slot_name]
      );

      // Also add the afternoon slot combinations
      await db.query(
        `
        INSERT INTO allowed_slot_names (name) 
        VALUES ($1) 
        ON CONFLICT (name) DO NOTHING
      `,
        [combo.linked_slots]
      );
    }
    console.log("Successfully added compound slot names to allowed_slot_names");

    // Now insert all combinations into semester_slot_config
    console.log("Inserting configurations into semester_slot_config...");
    for (const combo of combinations) {
      await db.query(
        `
        INSERT INTO semester_slot_config 
        (slot_year, semester_type, slot_name, course_theory, course_practical, linked_slots)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (slot_year, semester_type, slot_name, course_theory, course_practical) 
        DO UPDATE SET
          linked_slots = EXCLUDED.linked_slots,
          updated_at = CURRENT_TIMESTAMP
      `,
        [
          "2024-25", // slot_year
          "SUMMER", // semester_type
          combo.slot_name, // slot_name (e.g., "L1+L2, L3+L4")
          0, // course_theory
          4, // course_practical
          [combo.linked_slots], // linked_slots as array (e.g., ["L21+L22, L23+L24"])
        ]
      );
    }

    console.log("Successfully added all 4-hour lab slot configurations");

    // Verify the insertions
    const result = await db.query(`
      SELECT COUNT(*) as count 
      FROM semester_slot_config 
      WHERE slot_year = '2024-25' 
      AND semester_type = 'SUMMER' 
      AND course_theory = 0 
      AND course_practical = 4
    `);

    console.log(
      `Verification: ${result.rows[0].count} 4-hour lab configurations found in database`
    );

    // Display a few examples
    const examples = await db.query(`
      SELECT slot_name, linked_slots 
      FROM semester_slot_config 
      WHERE slot_year = '2024-25' 
      AND semester_type = 'SUMMER' 
      AND course_theory = 0 
      AND course_practical = 4
      LIMIT 5
    `);

    console.log("Sample configurations:");
    examples.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.slot_name} → ${row.linked_slots[0]}`);
    });
  } catch (error) {
    console.error("Error initializing 4-hour lab slot configurations:", error);
    throw error;
  }
}

// Run if this script is executed directly
if (require.main === module) {
  initSummer4HourLabConfig()
    .then(() => {
      console.log(
        "4-hour lab slot configuration initialization completed successfully"
      );
      process.exit(0);
    })
    .catch((error) => {
      console.error(
        "4-hour lab slot configuration initialization failed:",
        error
      );
      process.exit(1);
    });
}

module.exports = { initSummer4HourLabConfig };
