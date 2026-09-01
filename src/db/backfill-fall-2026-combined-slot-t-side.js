const db = require("../config/db");

// One-shot backfill for FALL 2026-27 combined-theory faculty allocations
// that are missing T-side (day, time) rows.
//
// Root cause: pre-fix, the frontend batch-save only enumerated the "root"
// component of a combined slot name (e.g., "E1+TC1" -> just "E1"), so the
// T-side day (TC1's MON 11.45) never made it into faculty_allocation.
// The frontend fix in this same PR prevents new occurrences; this script
// tops up already-broken allocations without requiring faculty to redo them.
//
// Scope: only (slot_year='2026-27', semester_type='FALL') per Vinob's decision.
// Idempotent: ON CONFLICT DO NOTHING; safe to re-run.

const SLOT_YEAR = "2026-27";
const SEMESTER_TYPE = "FALL";

async function backfill() {
  try {
    console.log(`Backfilling combined-slot T-side rows for ${SLOT_YEAR} ${SEMESTER_TYPE}...`);

    // Distinct combined-theory allocation groups: (course, faculty, venue, slot_name)
    // Excludes lab pairs (L*) and SUMMER-style comma compounds.
    const groups = await db.query(
      `SELECT DISTINCT course_code, employee_id, venue, slot_name
       FROM faculty_allocation
       WHERE slot_year = $1 AND semester_type = $2
         AND slot_name LIKE '%+%'
         AND slot_name NOT LIKE 'L%'
         AND slot_name NOT LIKE '%,%'
       ORDER BY course_code, employee_id, slot_name`,
      [SLOT_YEAR, SEMESTER_TYPE]
    );

    console.log(`Found ${groups.rows.length} combined-slot allocation group(s).`);

    let totalInserted = 0;
    let groupsWithMissingRows = 0;
    const perGroupReport = [];

    for (const grp of groups.rows) {
      const { course_code, employee_id, venue, slot_name } = grp;
      const components = slot_name.split("+");

      // Existing (day, time) rows for this group
      const existing = await db.query(
        `SELECT slot_day, slot_time
         FROM faculty_allocation
         WHERE slot_year = $1 AND semester_type = $2 AND course_code = $3
           AND employee_id = $4 AND venue = $5 AND slot_name = $6`,
        [SLOT_YEAR, SEMESTER_TYPE, course_code, employee_id, venue, slot_name]
      );
      const existingKeys = new Set(
        existing.rows.map((r) => `${r.slot_day}|${r.slot_time}`)
      );

      // Expected (day, time) rows from slot table for all components
      const expected = await db.query(
        `SELECT DISTINCT slot_day, slot_time
         FROM slot
         WHERE slot_year = $1 AND semester_type = $2 AND slot_name = ANY($3)`,
        [SLOT_YEAR, SEMESTER_TYPE, components]
      );

      const missing = expected.rows.filter(
        (r) => !existingKeys.has(`${r.slot_day}|${r.slot_time}`)
      );

      if (missing.length === 0) {
        perGroupReport.push({
          group: `${course_code}/${employee_id}/${venue}/${slot_name}`,
          existing: existing.rows.length,
          expected: expected.rows.length,
          missing: 0,
          status: "OK",
        });
        continue;
      }

      groupsWithMissingRows++;

      for (const m of missing) {
        const r = await db.query(
          `INSERT INTO faculty_allocation
             (slot_year, semester_type, course_code, employee_id, venue, slot_day, slot_name, slot_time)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (slot_year, semester_type, course_code, employee_id, venue, slot_day, slot_name, slot_time)
           DO NOTHING`,
          [SLOT_YEAR, SEMESTER_TYPE, course_code, employee_id, venue, m.slot_day, slot_name, m.slot_time]
        );
        totalInserted += r.rowCount;
      }

      perGroupReport.push({
        group: `${course_code}/${employee_id}/${venue}/${slot_name}`,
        existing: existing.rows.length,
        expected: expected.rows.length,
        missing: missing.length,
        status: "BACKFILLED",
      });
    }

    console.log("");
    console.log("Per-group report:");
    for (const r of perGroupReport) {
      console.log(
        `  ${r.status.padEnd(11)} ${r.group}  existing=${r.existing}  expected=${r.expected}  missing=${r.missing}`
      );
    }

    console.log("");
    console.log(`Summary: ${groupsWithMissingRows} of ${groups.rows.length} group(s) needed backfill.`);
    console.log(`Total rows inserted: ${totalInserted}.`);
    console.log("Fall 2026-27 combined-slot T-side backfill complete.");
  } catch (error) {
    console.error("Error during backfill:", error);
    process.exitCode = 1;
  }
}

backfill().then(() => process.exit(process.exitCode ?? 0));
