-- Drop student table if it exists (for development purposes)
DROP TABLE IF EXISTS student CASCADE;

-- Create student table
CREATE TABLE student (
    student_id SERIAL PRIMARY KEY,
    student_eno VARCHAR(20) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20),
    date_of_birth DATE,
    address TEXT,
    school_id INTEGER NOT NULL,
    program_id INTEGER NOT NULL,
    admission_year INTEGER NOT NULL,
    admission_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (school_id) REFERENCES school(school_id) ON DELETE RESTRICT,
    FOREIGN KEY (program_id) REFERENCES program(program_id) ON DELETE RESTRICT
);

-- Add an index on student_eno for faster lookups
CREATE INDEX idx_student_eno ON student(student_eno);
CREATE INDEX idx_student_school_id ON student(school_id);
CREATE INDEX idx_student_program_id ON student(program_id);