const db = require("../config/db");

async function initFall2026SlotConflicts() {
  try {
    console.log("Cloning Winter 2025-26 slot_conflict into Fall 2026-27...");

    const insertResult = await db.query(`
      INSERT INTO slot_conflict
        (slot_year, semester_type, slot_name, conflicting_slot_name)
      SELECT '2026-27', 'FALL', slot_name, conflicting_slot_name
      FROM slot_conflict
      WHERE slot_year = '2025-26' AND semester_type = 'WINTER'
      ON CONFLICT (slot_year, semester_type, slot_name, conflicting_slot_name)
      DO NOTHING
    `);

    console.log(`Inserted ${insertResult.rowCount} row(s).`);

    const winter = await db.query(
      "SELECT COUNT(*)::int AS n FROM slot_conflict WHERE slot_year='2025-26' AND semester_type='WINTER'"
    );
    const fall = await db.query(
      "SELECT COUNT(*)::int AS n FROM slot_conflict WHERE slot_year='2026-27' AND semester_type='FALL'"
    );

    console.log(`Winter 2025-26 rows: ${winter.rows[0].n}`);
    console.log(`Fall 2026-27 rows:   ${fall.rows[0].n}`);

    if (winter.rows[0].n !== fall.rows[0].n) {
      throw new Error(
        `Row count mismatch after clone: winter=${winter.rows[0].n}, fall=${fall.rows[0].n}. Clone incomplete.`
      );
    }

    console.log("Fall 2026-27 slot_conflict clone verified.");
  } catch (error) {
    console.error("Error cloning Fall 2026-27 slot_conflict:", error);
    process.exitCode = 1;
  }
}

initFall2026SlotConflicts().then(() => process.exit(process.exitCode ?? 0));
