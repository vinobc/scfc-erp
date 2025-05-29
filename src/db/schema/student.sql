-- Drop student table if it exists (for development purposes)
DROP TABLE IF EXISTS student CASCADE;

-- Create student table
CREATE TABLE student (
    enrollment_no VARCHAR(20) PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE,
    student_name VARCHAR(100) NOT NULL,
    program_id INTEGER NOT NULL,
    school_id INTEGER NOT NULL,
    program_name VARCHAR(100) NOT NULL,
    school_name VARCHAR(20) NOT NULL, 
    year_admitted INTEGER NOT NULL,
    email_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (program_id) REFERENCES program(program_id) ON DELETE RESTRICT,
    FOREIGN KEY (school_id) REFERENCES school(school_id) ON DELETE RESTRICT
);

-- Add password reset tracking for students  
ALTER TABLE student ADD COLUMN IF NOT EXISTS must_reset_password BOOLEAN DEFAULT TRUE;
ALTER TABLE student ADD COLUMN IF NOT EXISTS last_password_change TIMESTAMP NULL;

-- Add indexes for faster lookups
CREATE INDEX idx_student_user_id ON student(user_id);
CREATE INDEX idx_student_program_id ON student(program_id);
CREATE INDEX idx_student_school_id ON student(school_id);
CREATE INDEX IF NOT EXISTS idx_student_must_reset_password ON student(must_reset_password);