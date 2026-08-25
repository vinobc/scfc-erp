const db = require("../config/db");

// Adds 4 new 3-credit combined theory slots to Fall 2026-27, per VC's
// request (25-Aug-2026) to give ASAS/AIIT more slot flexibility:
//   E1+TC1, E2+TC2, F1+TB1, F2+TB2
//
// Idempotent: safe to re-run.

const NEW_SLOTS = ["E1+TC1", "E2+TC2", "F1+TB1", "F2+TB2"];

// Conflict pairs, one direction. The script inserts both directions for each.
// Category per slot: 3 lab conflicts + 1 root-component + 1 cross-combined-sharing.
// Matches W25-26's stored pattern (T-side component conflicts intentionally
// omitted for consistency with W25-26; latent gap discussed and accepted).
const CONFLICT_PAIRS = [
  // E1+TC1
  { a: "E1+TC1", b: "L7+L8" },
  { a: "E1+TC1", b: "L17+L18" },
  { a: "E1+TC1", b: "L3+L4" },
  { a: "E1+TC1", b: "E1" },
  { a: "E1+TC1", b: "C1+TC1" },
  // E2+TC2
  { a: "E2+TC2", b: "L27+L28" },
  { a: "E2+TC2", b: "L37+L38" },
  { a: "E2+TC2", b: "L23+L24" },
  { a: "E2+TC2", b: "E2" },
  { a: "E2+TC2", b: "C2+TC2" },
  // F1+TB1
  { a: "F1+TB1", b: "L1+L2" },
  { a: "F1+TB1", b: "L11+L12" },
  { a: "F1+TB1", b: "L19+L20" },
  { a: "F1+TB1", b: "F1" },
  { a: "F1+TB1", b: "B1+TB1" },
  // F2+TB2
  { a: "F2+TB2", b: "L21+L22" },
  { a: "F2+TB2", b: "L31+L32" },
  { a: "F2+TB2", b: "L39+L40" },
  { a: "F2+TB2", b: "F2" },
  { a: "F2+TB2", b: "B2+TB2" },
];

async function initFall2026Additional3crSlots() {
  try {
    console.log("Adding 4 new 3-credit combined slots to Fall 2026-27...");

    // Step 1: allowed_slot_names (global)
    const namesResult = await db.query(
      `INSERT INTO allowed_slot_names (name)
       VALUES ('E1+TC1'), ('E2+TC2'), ('F1+TB1'), ('F2+TB2')
       ON CONFLICT (name) DO NOTHING`
    );
    console.log(`allowed_slot_names: inserted ${namesResult.rowCount} of 4 (rest already present).`);

    // Step 2: semester_slot_config (F26-27, T=3/P=0 + T=3/P=2 for each)
    const configResult = await db.query(
      `INSERT INTO semester_slot_config
         (slot_year, semester_type, slot_name, course_theory, course_practical, linked_slots)
       VALUES
         ('2026-27', 'FALL', 'E1+TC1', 3, 0, NULL),
         ('2026-27', 'FALL', 'E1+TC1', 3, 2, NULL),
         ('2026-27', 'FALL', 'E2+TC2', 3, 0, NULL),
         ('2026-27', 'FALL', 'E2+TC2', 3, 2, NULL),
         ('2026-27', 'FALL', 'F1+TB1', 3, 0, NULL),
         ('2026-27', 'FALL', 'F1+TB1', 3, 2, NULL),
         ('2026-27', 'FALL', 'F2+TB2', 3, 0, NULL),
         ('2026-27', 'FALL', 'F2+TB2', 3, 2, NULL)
       ON CONFLICT (slot_year, semester_type, slot_name, course_theory, course_practical)
       DO NOTHING`
    );
    console.log(`semester_slot_config: inserted ${configResult.rowCount} of 8 (rest already present).`);

    // Step 3: slot_conflict (F26-27, bidirectional)
    let inserted = 0;
    for (const { a, b } of CONFLICT_PAIRS) {
      const r1 = await db.query(
        `INSERT INTO slot_conflict
           (slot_year, semester_type, slot_name, conflicting_slot_name)
         VALUES ('2026-27', 'FALL', $1, $2)
         ON CONFLICT (slot_year, semester_type, slot_name, conflicting_slot_name)
         DO NOTHING`,
        [a, b]
      );
      const r2 = await db.query(
        `INSERT INTO slot_conflict
           (slot_year, semester_type, slot_name, conflicting_slot_name)
         VALUES ('2026-27', 'FALL', $1, $2)
         ON CONFLICT (slot_year, semester_type, slot_name, conflicting_slot_name)
         DO NOTHING`,
        [b, a]
      );
      inserted += r1.rowCount + r2.rowCount;
    }
    console.log(`slot_conflict: inserted ${inserted} of ${CONFLICT_PAIRS.length * 2} (rest already present).`);

    // Per-slot verification
    console.log("");
    console.log("Per-slot verification (F26-27):");
    for (const name of NEW_SLOTS) {
      const cfg = await db.query(
        `SELECT COUNT(*)::int AS n FROM semester_slot_config
         WHERE slot_year='2026-27' AND semester_type='FALL' AND slot_name = $1`,
        [name]
      );
      const conf = await db.query(
        `SELECT COUNT(*)::int AS n FROM slot_conflict
         WHERE slot_year='2026-27' AND semester_type='FALL'
           AND (slot_name = $1 OR conflicting_slot_name = $1)`,
        [name]
      );
      const cfgN = cfg.rows[0].n;
      const confN = conf.rows[0].n;
      const cfgOk = cfgN === 2 ? "OK" : "MISMATCH";
      const confOk = confN === 10 ? "OK" : "MISMATCH";
      console.log(`  ${name}: semester_slot_config=${cfgN} [${cfgOk}, expect 2], slot_conflict=${confN} [${confOk}, expect 10]`);
      if (cfgN !== 2 || confN !== 10) {
        throw new Error(`Verification failed for ${name}`);
      }
    }

    console.log("");
    console.log("Fall 2026-27 additional 3-credit slots setup verified.");
  } catch (error) {
    console.error("Error adding Fall 2026-27 additional 3-credit slots:", error);
    process.exitCode = 1;
  }
}

initFall2026Additional3crSlots().then(() => process.exit(process.exitCode ?? 0));
