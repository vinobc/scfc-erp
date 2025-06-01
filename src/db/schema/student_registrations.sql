-- Student course registrations table
CREATE TABLE IF NOT EXISTS student_registrations (
    id SERIAL PRIMARY KEY,
    
    -- Student Information
    enrollment_number VARCHAR(50) NOT NULL,
    student_name VARCHAR(255) NOT NULL,
    program_code VARCHAR(10) NOT NULL,
    year_admitted INTEGER NOT NULL,
    
    -- Academic Period
    slot_year VARCHAR(10) NOT NULL,
    semester_type VARCHAR(20) NOT NULL,
    
    -- Course Information
    course_code VARCHAR(20) NOT NULL,
    course_name VARCHAR(255) NOT NULL,
    theory INTEGER NOT NULL DEFAULT 0,
    practical INTEGER NOT NULL DEFAULT 0,
    credits INTEGER NOT NULL DEFAULT 0,
    course_type VARCHAR(10) NOT NULL, -- 'T', 'P', 'TEL'
    
    -- Offering Details
    slot_name VARCHAR(50) NOT NULL,
    venue VARCHAR(50) NOT NULL,
    faculty_name VARCHAR(255) NOT NULL,
    
    -- Component Type (for TEL courses)
    component_type VARCHAR(10) NOT NULL, -- 'T' (theory), 'P' (practical), 'SINGLE' (for T-only/P-only)
    
    -- Timestamps
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(enrollment_number, slot_year, semester_type, course_code, component_type)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_student_registrations_student ON student_registrations(enrollment_number);
CREATE INDEX IF NOT EXISTS idx_student_registrations_semester ON student_registrations(slot_year, semester_type);
CREATE INDEX IF NOT EXISTS idx_student_registrations_course ON student_registrations(course_code);
CREATE INDEX IF NOT EXISTS idx_student_registrations_slot ON student_registrations(slot_name);

-- Comments
COMMENT ON TABLE student_registrations IS 'Stores student course registrations with slot and faculty details';
COMMENT ON COLUMN student_registrations.component_type IS 'T=theory component, P=practical component, SINGLE=complete course (T-only/P-only)';
COMMENT ON COLUMN student_registrations.credits IS 'Credits for the entire course (not per component)';