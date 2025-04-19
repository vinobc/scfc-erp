-- Drop course table if it exists (for development purposes)
DROP TABLE IF EXISTS course CASCADE;

-- Create course table
CREATE TABLE course (
    course_owner VARCHAR(20) NOT NULL,
    course_code VARCHAR(10) NOT NULL PRIMARY KEY,
    course_name VARCHAR(150) NOT NULL,
    theory INTEGER NOT NULL CHECK (theory >= 0 AND theory <= 10),
    practical INTEGER NOT NULL CHECK (practical >= 0 AND practical <= 10),
    credits INTEGER NOT NULL CHECK (credits >= 0 AND credits <= 10),
    course_type VARCHAR(5) NOT NULL,
    prerequisite VARCHAR(200),
    antirequisite VARCHAR(200),
    course_equivalence VARCHAR(200),
    programs_offered_to VARCHAR(800) NOT NULL,
    curriculum_version FLOAT,
    remarks VARCHAR(600),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for faster lookups
CREATE INDEX idx_course_owner ON course(course_owner);
CREATE INDEX idx_course_type ON course(course_type);