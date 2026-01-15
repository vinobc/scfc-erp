-- Migration: Create marks entry tables
-- Run this script to create the marks entry system tables

-- Execute the schema file
\i ../schema/marks.sql

-- Or run the following directly:

-- Table 1: marks_entry_lock
CREATE TABLE IF NOT EXISTS marks_entry_lock (
    id SERIAL PRIMARY KEY,
    slot_year VARCHAR(20) NOT NULL,
    semester_type VARCHAR(10) NOT NULL,
    component_type VARCHAR(20) NOT NULL,
    is_locked BOOLEAN DEFAULT FALSE,
    locked_by INTEGER,
    locked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(slot_year, semester_type, component_type),
    FOREIGN KEY (locked_by) REFERENCES "user"(user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_marks_lock_semester ON marks_entry_lock(slot_year, semester_type);

-- Table 2: assessment_config
CREATE TABLE IF NOT EXISTS assessment_config (
    id SERIAL PRIMARY KEY,
    slot_year VARCHAR(20) NOT NULL,
    semester_type VARCHAR(10) NOT NULL,
    course_code VARCHAR(10) NOT NULL,
    employee_id INTEGER NOT NULL,
    assessment_type VARCHAR(20) NOT NULL,
    component_type VARCHAR(10) NOT NULL DEFAULT 'THEORY',
    config_json JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER NOT NULL,
    UNIQUE(slot_year, semester_type, course_code, employee_id, component_type),
    FOREIGN KEY (employee_id) REFERENCES faculty(employee_id) ON DELETE RESTRICT,
    FOREIGN KEY (course_code) REFERENCES course(course_code) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES "user"(user_id) ON DELETE RESTRICT,
    CONSTRAINT chk_assessment_type CHECK (assessment_type IN ('UG_THEORY', 'PG_THEORY', 'UG_INTEGRATED', 'PG_INTEGRATED', 'UG_LAB', 'PG_LAB')),
    CONSTRAINT chk_component_type CHECK (component_type IN ('THEORY', 'LAB'))
);

CREATE INDEX IF NOT EXISTS idx_assessment_config_offering ON assessment_config(slot_year, semester_type, course_code, employee_id);
CREATE INDEX IF NOT EXISTS idx_assessment_config_type ON assessment_config(assessment_type);

-- Table 3: student_marks
CREATE TABLE IF NOT EXISTS student_marks (
    id SERIAL PRIMARY KEY,
    assessment_config_id INTEGER NOT NULL,
    enrollment_number VARCHAR(50) NOT NULL,
    student_id INTEGER NOT NULL,
    assessment_type VARCHAR(20) NOT NULL,
    assessment_number INTEGER DEFAULT 1,
    question_id VARCHAR(20) NOT NULL,
    marks_obtained DECIMAL(5,2),
    max_marks DECIMAL(5,2) NOT NULL,
    entered_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(assessment_config_id, enrollment_number, assessment_type, assessment_number, question_id),
    FOREIGN KEY (assessment_config_id) REFERENCES assessment_config(id) ON DELETE CASCADE,
    FOREIGN KEY (entered_by) REFERENCES "user"(user_id) ON DELETE RESTRICT,
    CONSTRAINT chk_marks_valid CHECK (marks_obtained IS NULL OR (marks_obtained >= 0 AND marks_obtained <= max_marks))
);

CREATE INDEX IF NOT EXISTS idx_student_marks_config ON student_marks(assessment_config_id);
CREATE INDEX IF NOT EXISTS idx_student_marks_student ON student_marks(enrollment_number);
CREATE INDEX IF NOT EXISTS idx_student_marks_assessment ON student_marks(assessment_type, assessment_number);
CREATE INDEX IF NOT EXISTS idx_student_marks_lookup ON student_marks(assessment_config_id, enrollment_number);

-- Verify tables created
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('marks_entry_lock', 'assessment_config', 'student_marks');
