const db = require("../config/db");

async function initFall2026SemesterConfig() {
  try {
    console.log("Cloning Winter 2025-26 semester_slot_config into Fall 2026-27...");

    const insertResult = await db.query(`
      INSERT INTO semester_slot_config
        (slot_year, semester_type, slot_name, course_theory, course_practical, linked_slots)
      SELECT '2026-27', 'FALL', slot_name, course_theory, course_practical, linked_slots
      FROM semester_slot_config
      WHERE slot_year = '2025-26' AND semester_type = 'WINTER'
      ON CONFLICT (slot_year, semester_type, slot_name, course_theory, course_practical)
      DO NOTHING
    `);

    console.log(`Inserted ${insertResult.rowCount} row(s).`);

    const winter = await db.query(
      "SELECT COUNT(*)::int AS n FROM semester_slot_config WHERE slot_year='2025-26' AND semester_type='WINTER'"
    );
    const fall = await db.query(
      "SELECT COUNT(*)::int AS n FROM semester_slot_config WHERE slot_year='2026-27' AND semester_type='FALL'"
    );

    console.log(`Winter 2025-26 rows: ${winter.rows[0].n}`);
    console.log(`Fall 2026-27 rows:   ${fall.rows[0].n}`);

    if (winter.rows[0].n !== fall.rows[0].n) {
      throw new Error(
        `Row count mismatch after clone: winter=${winter.rows[0].n}, fall=${fall.rows[0].n}. Clone incomplete.`
      );
    }

    console.log("Fall 2026-27 semester_slot_config clone verified.");
  } catch (error) {
    console.error("Error cloning Fall 2026-27 semester_slot_config:", error);
    process.exitCode = 1;
  }
}

initFall2026SemesterConfig().then(() => process.exit(process.exitCode ?? 0));
