-- Grade publish gate: once a course-slot-faculty's grades are finalized and
-- CoE/admin is satisfied, they explicitly publish grades for that offering.
-- Presence of a row in grade_publish_state = grades are visible to faculty +
-- students. Absence = hidden (letter grade column shows "Pending CoE publish").
-- Admin and CoE always see grades regardless of this gate.
--
-- Granularity: per (course_code, slot_year, semester_type, slot_name, venue,
-- employee_id) — mirrors how View Grades / Consolidated reports are keyed.
--
-- Safe to re-run: uses IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS grade_publish_state (
    id SERIAL PRIMARY KEY,
    slot_year VARCHAR(20) NOT NULL,
    semester_type VARCHAR(10) NOT NULL,
    course_code VARCHAR(10) NOT NULL,
    employee_id INTEGER NOT NULL,
    slot_name VARCHAR(50) NOT NULL,
    venue VARCHAR(100) NOT NULL,
    published_by INTEGER REFERENCES "user"(user_id) ON DELETE SET NULL,
    published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (slot_year, semester_type, course_code, employee_id, slot_name, venue)
);

CREATE INDEX IF NOT EXISTS idx_grade_publish_semester
    ON grade_publish_state(slot_year, semester_type);
