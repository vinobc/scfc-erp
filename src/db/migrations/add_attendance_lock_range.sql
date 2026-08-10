-- Date-range attendance lock. Complements attendance_entry_lock (which locks
-- an entire semester per program level) by letting admin lock only specific
-- date windows. Enforcement is a UNION of the two — either mechanism can
-- block a mark/clear attempt.
--
-- Multiple ranges per (slot_year, semester_type, program_level) are allowed
-- and simply union at enforcement time. Deleting a row = unlocking that
-- window (no is_locked flag needed).

CREATE TABLE IF NOT EXISTS attendance_lock_range (
    id SERIAL PRIMARY KEY,
    slot_year VARCHAR(20) NOT NULL,
    semester_type VARCHAR(10) NOT NULL,
    program_level VARCHAR(10) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    locked_by INTEGER,
    locked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (start_date <= end_date),
    CHECK (program_level IN ('UG', 'PG', 'ALL')),
    FOREIGN KEY (locked_by) REFERENCES "user"(user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_attendance_lock_range_lookup
    ON attendance_lock_range (slot_year, semester_type, program_level, start_date, end_date);
