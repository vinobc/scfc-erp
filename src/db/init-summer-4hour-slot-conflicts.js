const db = require("../config/db");

// Initialize slot conflicts for 4-hour Summer lab combinations
async function initSummer4HourSlotConflicts() {
  try {
    console.log(
      "Initializing slot conflicts for 4-hour Summer lab combinations..."
    );

    // Get all 4-hour lab combinations from semester_slot_config
    const labCombinations = await db.query(`
      SELECT slot_name, linked_slots 
      FROM semester_slot_config 
      WHERE slot_year = '2024-25' 
      AND semester_type = 'SUMMER' 
      AND course_theory = 0 
      AND course_practical = 4
    `);

    console.log(
      `Found ${labCombinations.rows.length} 4-hour lab combinations to process`
    );

    // Define theory slots that conflict with lab slots (same as current pattern)
    const theorySlotConflicts = {
      "L1+L2": ["A", "F"],
      "L3+L4": ["C", "H"],
      "L5+L6": ["B", "G"],
      "L7+L8": ["D", "A"],
      "L9+L10": ["C", "H"],
      "L11+L12": ["E", "B"],
      "L13+L14": ["D", "A"],
      "L15+L16": ["F", "C"],
      "L17+L18": ["E", "B"],
      "L19+L20": ["G", "D"],
      "L21+L22": ["A", "F"],
      "L23+L24": ["C", "H"],
      "L25+L26": ["B", "G"],
      "L27+L28": ["D", "A"],
      "L29+L30": ["C", "H"],
      "L31+L32": ["E", "B"],
      "L33+L34": ["D", "A"],
      "L35+L36": ["F", "C"],
      "L37+L38": ["E", "B"],
      "L39+L40": ["G", "D"],
    };

    let conflictsAdded = 0;

    // Process each 4-hour lab combination
    for (const combo of labCombinations.rows) {
      const morningSlots = combo.slot_name; // e.g., "L1+L2, L3+L4"
      const afternoonSlots = combo.linked_slots[0]; // e.g., "L21+L22, L23+L24"

      console.log(`Processing: ${morningSlots} ↔ ${afternoonSlots}`);

      // 1. Create bidirectional conflict between morning and afternoon combinations
      await db.query(
        `
        INSERT INTO slot_conflict 
        (slot_year, semester_type, slot_name, conflicting_slot_name)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (slot_year, semester_type, slot_name, conflicting_slot_name) 
        DO NOTHING
      `,
        ["2024-25", "SUMMER", morningSlots, afternoonSlots]
      );

      await db.query(
        `
        INSERT INTO slot_conflict 
        (slot_year, semester_type, slot_name, conflicting_slot_name)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (slot_year, semester_type, slot_name, conflicting_slot_name) 
        DO NOTHING
      `,
        ["2024-25", "SUMMER", afternoonSlots, morningSlots]
      );

      conflictsAdded += 2;

      // 2. Extract individual lab pairs from combinations
      const morningPairs = morningSlots.split(", "); // ["L1+L2", "L3+L4"]
      const afternoonPairs = afternoonSlots.split(", "); // ["L21+L22", "L23+L24"]
      const allLabPairs = [...morningPairs, ...afternoonPairs];

      // 3. Create conflicts between the 4-hour combination and theory slots
      const conflictingTheorySlots = new Set();

      allLabPairs.forEach((labPair) => {
        if (theorySlotConflicts[labPair]) {
          theorySlotConflicts[labPair].forEach((theorySlot) => {
            conflictingTheorySlots.add(theorySlot);
          });
        }
      });

      // Add theory slot conflicts for morning combination
      for (const theorySlot of conflictingTheorySlots) {
        await db.query(
          `
          INSERT INTO slot_conflict 
          (slot_year, semester_type, slot_name, conflicting_slot_name)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (slot_year, semester_type, slot_name, conflicting_slot_name) 
          DO NOTHING
        `,
          ["2024-25", "SUMMER", morningSlots, theorySlot]
        );

        await db.query(
          `
          INSERT INTO slot_conflict 
          (slot_year, semester_type, slot_name, conflicting_slot_name)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (slot_year, semester_type, slot_name, conflicting_slot_name) 
          DO NOTHING
        `,
          ["2024-25", "SUMMER", theorySlot, morningSlots]
        );

        conflictsAdded += 2;
      }

      // Add theory slot conflicts for afternoon combination
      for (const theorySlot of conflictingTheorySlots) {
        await db.query(
          `
          INSERT INTO slot_conflict 
          (slot_year, semester_type, slot_name, conflicting_slot_name)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (slot_year, semester_type, slot_name, conflicting_slot_name) 
          DO NOTHING
        `,
          ["2024-25", "SUMMER", afternoonSlots, theorySlot]
        );

        await db.query(
          `
          INSERT INTO slot_conflict 
          (slot_year, semester_type, slot_name, conflicting_slot_name)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (slot_year, semester_type, slot_name, conflicting_slot_name) 
          DO NOTHING
        `,
          ["2024-25", "SUMMER", theorySlot, afternoonSlots]
        );

        conflictsAdded += 2;
      }

      // 4. Create conflicts between this 4-hour combination and other 4-hour combinations
      // that share any lab slots
      for (const otherCombo of labCombinations.rows) {
        if (otherCombo.slot_name !== combo.slot_name) {
          const otherMorningSlots = otherCombo.slot_name;
          const otherAfternoonSlots = otherCombo.linked_slots[0];

          const otherMorningPairs = otherMorningSlots.split(", ");
          const otherAfternoonPairs = otherAfternoonSlots.split(", ");
          const otherAllLabPairs = [
            ...otherMorningPairs,
            ...otherAfternoonPairs,
          ];

          // Check if there's any overlap in lab pairs
          const hasOverlap = allLabPairs.some((pair) =>
            otherAllLabPairs.includes(pair)
          );

          if (hasOverlap) {
            // Create bidirectional conflicts
            await db.query(
              `
              INSERT INTO slot_conflict 
              (slot_year, semester_type, slot_name, conflicting_slot_name)
              VALUES ($1, $2, $3, $4)
              ON CONFLICT (slot_year, semester_type, slot_name, conflicting_slot_name) 
              DO NOTHING
            `,
              ["2024-25", "SUMMER", morningSlots, otherMorningSlots]
            );

            await db.query(
              `
              INSERT INTO slot_conflict 
              (slot_year, semester_type, slot_name, conflicting_slot_name)
              VALUES ($1, $2, $3, $4)
              ON CONFLICT (slot_year, semester_type, slot_name, conflicting_slot_name) 
              DO NOTHING
            `,
              ["2024-25", "SUMMER", otherMorningSlots, morningSlots]
            );

            conflictsAdded += 2;
          }
        }
      }
    }

    console.log(`Successfully added ${conflictsAdded} slot conflict entries`);

    // Verify the conflicts
    const conflictCount = await db.query(`
      SELECT COUNT(*) as count 
      FROM slot_conflict 
      WHERE slot_year = '2024-25' 
      AND semester_type = 'SUMMER'
      AND (slot_name LIKE '%,%' OR conflicting_slot_name LIKE '%,%')
    `);

    console.log(
      `Verification: ${conflictCount.rows[0].count} conflicts involving 4-hour lab combinations`
    );

    // Show some examples
    const examples = await db.query(`
      SELECT slot_name, conflicting_slot_name 
      FROM slot_conflict 
      WHERE slot_year = '2024-25' 
      AND semester_type = 'SUMMER'
      AND slot_name LIKE '%,%'
      LIMIT 10
    `);

    console.log("\nSample 4-hour lab conflicts:");
    examples.rows.forEach((row, index) => {
      console.log(
        `${index + 1}. ${row.slot_name} ⚡ ${row.conflicting_slot_name}`
      );
    });
  } catch (error) {
    console.error("Error initializing 4-hour lab slot conflicts:", error);
    throw error;
  }
}

// Run if this script is executed directly
if (require.main === module) {
  initSummer4HourSlotConflicts()
    .then(() => {
      console.log(
        "4-hour lab slot conflicts initialization completed successfully"
      );
      process.exit(0);
    })
    .catch((error) => {
      console.error("4-hour lab slot conflicts initialization failed:", error);
      process.exit(1);
    });
}

module.exports = { initSummer4HourSlotConflicts };
