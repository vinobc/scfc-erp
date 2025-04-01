-- Drop semester table if it exists (for development purposes)
DROP TABLE IF EXISTS semester CASCADE;

-- Create semester table
CREATE TABLE semester (
    semester_id SERIAL PRIMARY KEY,
    semester_name VARCHAR(10) NOT NULL CHECK (semester_name IN ('Fall', 'Winter', 'Summer')),
    academic_year VARCHAR(7) NOT NULL, -- Format: YYYY-YY (e.g., 2024-25)
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (semester_name, academic_year)
);

-- Add an index for faster lookups
CREATE INDEX idx_semester_academic_year ON semester(academic_year);