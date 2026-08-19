const db = require("../config/db");

async function initFall2026Slots() {
  try {
    console.log("Cloning Winter 2025-26 slot rows into Fall 2026-27...");

    const existing = await db.query(
      "SELECT COUNT(*)::int AS n FROM slot WHERE slot_year='2026-27' AND semester_type='FALL'"
    );
    if (existing.rows[0].n > 0) {
      throw new Error(
        `Refusing to run: Fall 2026-27 already has ${existing.rows[0].n} slot row(s). Delete them first if you intend to re-clone.`
      );
    }

    const insertResult = await db.query(`
      INSERT INTO slot
        (slot_year, semester_type, slot_day, slot_name, slot_time, is_active)
      SELECT '2026-27', 'FALL', slot_day, slot_name, slot_time, is_active
      FROM slot
      WHERE slot_year = '2025-26' AND semester_type = 'WINTER'
    `);

    console.log(`Inserted ${insertResult.rowCount} row(s).`);

    const winter = await db.query(
      "SELECT COUNT(*)::int AS n FROM slot WHERE slot_year='2025-26' AND semester_type='WINTER'"
    );
    const fall = await db.query(
      "SELECT COUNT(*)::int AS n FROM slot WHERE slot_year='2026-27' AND semester_type='FALL'"
    );

    console.log(`Winter 2025-26 rows: ${winter.rows[0].n}`);
    console.log(`Fall 2026-27 rows:   ${fall.rows[0].n}`);

    if (winter.rows[0].n !== fall.rows[0].n) {
      throw new Error(
        `Row count mismatch after clone: winter=${winter.rows[0].n}, fall=${fall.rows[0].n}. Clone incomplete.`
      );
    }

    console.log("Fall 2026-27 slot clone verified.");
  } catch (error) {
    console.error("Error cloning Fall 2026-27 slot:", error);
    process.exitCode = 1;
  }
}

initFall2026Slots().then(() => process.exit(process.exitCode ?? 0));
