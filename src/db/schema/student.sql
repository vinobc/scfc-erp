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
    school_id INTEGER,
    program_id INTEGER,
    admission_year INTEGER NOT NULL,
    admission_date DATE NOT NULL,
    current_semester_type VARCHAR(10) CHECK (current_semester_type IN ('fall', 'winter', 'summer')),
    current_semester_year INTEGER,
    cgpa DECIMAL(3,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add an index on student_eno for faster lookups
CREATE INDEX idx_student_eno ON student(student_eno);