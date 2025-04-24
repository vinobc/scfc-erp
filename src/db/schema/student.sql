-- Drop student table if it exists (for development purposes)
DROP TABLE IF EXISTS student CASCADE;

-- Create student table
CREATE TABLE student (
    enrollment_no VARCHAR(20) PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE,
    student_name VARCHAR(100) NOT NULL,
    program_name VARCHAR(100) NOT NULL,
    school_name VARCHAR(20) NOT NULL,
    year_admitted INTEGER NOT NULL,
    email_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (program_name) REFERENCES program(program_name_short) ON DELETE RESTRICT,
    FOREIGN KEY (school_name) REFERENCES school(school_short_name) ON DELETE RESTRICT
);

-- Add indexes for faster lookups
CREATE INDEX idx_student_user_id ON student(user_id);
CREATE INDEX idx_student_program_name ON student(program_name);
CREATE INDEX idx_student_school_name ON student(school_name);