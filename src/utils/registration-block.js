const db = require("../config/db");

async function getActiveBlock(enrollmentNo) {
  if (!enrollmentNo) return null;
  const result = await db.query(
    `SELECT block_reason, notes, blocked_at
       FROM student_registration_block
      WHERE enrollment_no = $1 AND unblocked_at IS NULL
      LIMIT 1`,
    [enrollmentNo]
  );
  return result.rows[0] || null;
}

module.exports = { getActiveBlock };
