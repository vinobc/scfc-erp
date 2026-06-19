-- Students blocked from course registration (pending fees, suspension, etc.)
-- Blocking does NOT disable login; only blocks the course registration flow.

CREATE TABLE student_registration_block (
    block_id      SERIAL PRIMARY KEY,
    enrollment_no VARCHAR(20) NOT NULL,
    block_reason  VARCHAR(255) NOT NULL,
    notes         TEXT,
    blocked_by    INTEGER NOT NULL,
    blocked_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    unblocked_by  INTEGER,
    unblocked_at  TIMESTAMP,
    FOREIGN KEY (enrollment_no) REFERENCES student(enrollment_no) ON DELETE CASCADE,
    FOREIGN KEY (blocked_by) REFERENCES "user"(user_id),
    FOREIGN KEY (unblocked_by) REFERENCES "user"(user_id)
);

CREATE INDEX idx_srb_active_lookup
    ON student_registration_block (enrollment_no)
    WHERE unblocked_at IS NULL;

CREATE INDEX idx_srb_enrollment
    ON student_registration_block (enrollment_no);
