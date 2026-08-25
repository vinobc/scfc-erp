-- Selective unlock exceptions layered on top of marks_entry_lock (bulk lock).
-- When a bulk lock is in effect, admin/CoE can grant per-(faculty, course,
-- slot) exceptions so those specific faculty can finish entering marks.
-- Delete the row = revoke the exception. Optional expires_at silently stops
-- the row from applying after the given time (no cleanup job needed).

DROP TABLE IF EXISTS marks_lock_exception;

CREATE TABLE marks_lock_exception (
    id SERIAL PRIMARY KEY,
    slot_year VARCHAR(20) NOT NULL,
    semester_type VARCHAR(10) NOT NULL,
    component_type VARCHAR(20) NOT NULL,
    program_level VARCHAR(10) NOT NULL,
    employee_id INTEGER NOT NULL,
    course_code VARCHAR(20) NOT NULL,
    slot_name VARCHAR(100) NOT NULL,
    venue VARCHAR(100) NOT NULL,
    expires_at TIMESTAMP,
    granted_by INTEGER,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (program_level IN ('UG', 'PG', 'ALL')),
    FOREIGN KEY (granted_by) REFERENCES "user"(user_id) ON DELETE SET NULL
);

CREATE INDEX idx_marks_lock_exception_lookup
    ON marks_lock_exception (slot_year, semester_type, component_type, employee_id, course_code, slot_name, venue);
