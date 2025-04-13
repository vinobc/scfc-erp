-- Drop faculty table if it exists (for development purposes)
DROP TABLE IF EXISTS faculty CASCADE;

-- Create faculty table
CREATE TABLE faculty (
    faculty_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    designation VARCHAR(50),
    employee_id INTEGER NOT NULL UNIQUE,
    school_id INTEGER NOT NULL,
    email VARCHAR(100) UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (school_id) REFERENCES school(school_id) ON DELETE RESTRICT
);

-- Add indexes for faster lookups
CREATE INDEX idx_faculty_name ON faculty(name);
CREATE INDEX idx_faculty_employee_id ON faculty(employee_id);
CREATE INDEX idx_faculty_school_id ON faculty(school_id);