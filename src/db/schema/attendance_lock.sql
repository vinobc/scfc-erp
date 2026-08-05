-- Drop attendance_entry_lock table if it exists (for development purposes)
DROP TABLE IF EXISTS attendance_entry_lock CASCADE;

-- Admin control for locking/unlocking attendance marking per semester,
-- split by program level (UG / PG / ALL). Parallel to marks_entry_lock but
-- has no component dimension — attendance is a single kind of write.
CREATE TABLE attendance_entry_lock (
    id SERIAL PRIMARY KEY,
    slot_year VARCHAR(20) NOT NULL,
    semester_type VARCHAR(10) NOT NULL,
    program_level VARCHAR(10) NOT NULL,   -- 'UG', 'PG', 'ALL'
    is_locked BOOLEAN DEFAULT FALSE,
    locked_by INTEGER,
    locked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (slot_year, semester_type, program_level),
    FOREIGN KEY (locked_by) REFERENCES "user"(user_id) ON DELETE SET NULL
);

CREATE INDEX idx_attendance_lock_semester ON attendance_entry_lock(slot_year, semester_type);
