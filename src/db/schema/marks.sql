-- Marks Entry System Schema
-- Created for faculty to enter CA, Assignment, and Lab marks

-- Table 1: marks_entry_lock (Admin control for locking/unlocking marks entry).
-- program_level splits locks by UG / PG so admin can freeze UG for result
-- processing while PG faculty continue. 'ALL' means lock applies to both.
CREATE TABLE IF NOT EXISTS marks_entry_lock (
    id SERIAL PRIMARY KEY,
    slot_year VARCHAR(20) NOT NULL,
    semester_type VARCHAR(10) NOT NULL,
    component_type VARCHAR(20) NOT NULL,  -- 'CA1', 'CA2', 'CA3', 'ASSIGNMENT', 'LAB'
    program_level VARCHAR(10) NOT NULL DEFAULT 'ALL',  -- 'UG', 'PG', 'ALL'
    is_locked BOOLEAN DEFAULT FALSE,
    locked_by INTEGER,
    locked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(slot_year, semester_type, component_type, program_level),
    FOREIGN KEY (locked_by) REFERENCES "user"(user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_marks_lock_semester ON marks_entry_lock(slot_year, semester_type);

-- Table 2: assessment_config (Assessment structure configuration per course offering per slot)
CREATE TABLE IF NOT EXISTS assessment_config (
    id SERIAL PRIMARY KEY,
    slot_year VARCHAR(20) NOT NULL,
    semester_type VARCHAR(10) NOT NULL,
    course_code VARCHAR(10) NOT NULL,
    employee_id INTEGER NOT NULL,

    -- Slot-specific identification (each slot is configured separately)
    slot_name VARCHAR(50) NOT NULL,
    venue VARCHAR(100) NOT NULL,

    -- Assessment type derived from course code + course type
    -- UG_THEORY, PG_THEORY, UG_INTEGRATED, PG_INTEGRATED, UG_LAB, PG_LAB
    assessment_type VARCHAR(20) NOT NULL,

    -- Component type for TEL courses (THEORY or LAB)
    -- For T courses: THEORY only
    -- For P courses: LAB only
    -- For TEL courses: separate configs for THEORY and LAB
    component_type VARCHAR(10) NOT NULL DEFAULT 'THEORY',

    -- JSON structure storing CAs, Assignments, Lab sessions configuration
    -- See config_json structure in plan file
    config_json JSONB NOT NULL DEFAULT '{}',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER NOT NULL,

    -- Unique constraint: one config per course offering per slot per component type
    UNIQUE(slot_year, semester_type, course_code, employee_id, slot_name, venue, component_type),

    FOREIGN KEY (employee_id) REFERENCES faculty(employee_id) ON DELETE RESTRICT,
    FOREIGN KEY (course_code) REFERENCES course(course_code) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES "user"(user_id) ON DELETE RESTRICT,

    CONSTRAINT chk_assessment_type
        CHECK (assessment_type IN ('UG_THEORY', 'PG_THEORY', 'UG_INTEGRATED', 'PG_INTEGRATED', 'UG_LAB', 'PG_LAB')),
    CONSTRAINT chk_component_type
        CHECK (component_type IN ('THEORY', 'LAB'))
);

CREATE INDEX IF NOT EXISTS idx_assessment_config_offering ON assessment_config(slot_year, semester_type, course_code, employee_id);
CREATE INDEX IF NOT EXISTS idx_assessment_config_slot ON assessment_config(slot_year, semester_type, course_code, employee_id, slot_name, venue);
CREATE INDEX IF NOT EXISTS idx_assessment_config_type ON assessment_config(assessment_type);

-- Table 3: student_marks (Marks at question/session level per student)
CREATE TABLE IF NOT EXISTS student_marks (
    id SERIAL PRIMARY KEY,

    -- Link to assessment configuration
    assessment_config_id INTEGER NOT NULL,

    -- Student identification
    enrollment_number VARCHAR(50) NOT NULL,
    student_id INTEGER NOT NULL,

    -- Assessment component identification
    -- 'CA1', 'CA2', 'CA3', 'ASSIGNMENT', 'LAB_SESSION'
    assessment_type VARCHAR(20) NOT NULL,

    -- For assignments (1, 2, 3) or lab sessions (sequential number)
    assessment_number INTEGER DEFAULT 1,

    -- Question/Session identification
    -- For CAs: '1a', '1b', '2', '3a', etc.
    -- For Assignments: 'A1', 'A2', etc.
    -- For Lab: session date as string 'YYYY-MM-DD'
    question_id VARCHAR(20) NOT NULL,

    -- Marks
    marks_obtained DECIMAL(5,2),  -- NULL means not yet entered
    max_marks DECIMAL(5,2) NOT NULL,

    -- Metadata
    entered_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Unique constraint: one mark per student per question
    UNIQUE(assessment_config_id, enrollment_number, assessment_type, assessment_number, question_id),

    -- Foreign keys
    FOREIGN KEY (assessment_config_id) REFERENCES assessment_config(id) ON DELETE CASCADE,
    FOREIGN KEY (entered_by) REFERENCES "user"(user_id) ON DELETE RESTRICT,

    -- Validation: marks cannot exceed max
    CONSTRAINT chk_marks_valid
        CHECK (marks_obtained IS NULL OR (marks_obtained >= 0 AND marks_obtained <= max_marks))
);

CREATE INDEX IF NOT EXISTS idx_student_marks_config ON student_marks(assessment_config_id);
CREATE INDEX IF NOT EXISTS idx_student_marks_student ON student_marks(enrollment_number);
CREATE INDEX IF NOT EXISTS idx_student_marks_assessment ON student_marks(assessment_type, assessment_number);
CREATE INDEX IF NOT EXISTS idx_student_marks_lookup ON student_marks(assessment_config_id, enrollment_number);
