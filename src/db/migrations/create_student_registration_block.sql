-- Migration: Create student_registration_block table
-- Holds students who are blocked from course registration (e.g. pending tuition fees,
-- suspension). Blocking does NOT disable login or other portal features. Soft-delete
-- via unblocked_at/unblocked_by preserves audit history.

CREATE TABLE IF NOT EXISTS student_registration_block (
    block_id      SERIAL PRIMARY KEY,
    enrollment_no VARCHAR(20) NOT NULL REFERENCES student(enrollment_no) ON DELETE CASCADE,
    block_reason  VARCHAR(255) NOT NULL,
    notes         TEXT,
    blocked_by    INTEGER NOT NULL REFERENCES "user"(user_id),
    blocked_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    unblocked_by  INTEGER REFERENCES "user"(user_id),
    unblocked_at  TIMESTAMP
);

-- Partial index: only one active block per student is the common lookup.
CREATE INDEX IF NOT EXISTS idx_srb_active_lookup
    ON student_registration_block (enrollment_no)
    WHERE unblocked_at IS NULL;

-- Index for history view per student
CREATE INDEX IF NOT EXISTS idx_srb_enrollment
    ON student_registration_block (enrollment_no);

COMMENT ON TABLE student_registration_block IS
    'Students blocked from course registration. Soft-deleted via unblocked_at; row remains for audit.';
