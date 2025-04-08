-- Drop program table if it exists (for development purposes)
DROP TABLE IF EXISTS program CASCADE;

-- Create program table
CREATE TABLE program (
    program_id SERIAL PRIMARY KEY,
    program_code VARCHAR(20) NOT NULL UNIQUE,
    school_id INTEGER NOT NULL,
    duration_years INTEGER NOT NULL CHECK (duration_years IN (2, 3, 4, 5)),
    total_credits INTEGER NOT NULL,
    program_name_long VARCHAR(100) NOT NULL,
    program_name_short VARCHAR(100) NOT NULL,
    department_name_long VARCHAR(100),
    department_name_short VARCHAR(20),
    specialization_name_long VARCHAR(100),
    specialization_name_short VARCHAR(20),
    type VARCHAR(10) NOT NULL CHECK (type IN ('UG', 'PG', 'RESEARCH')),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (school_id) REFERENCES school(school_id) ON DELETE RESTRICT
);

-- Add indexes for faster lookups
CREATE INDEX idx_program_code ON program(program_code);
CREATE INDEX idx_program_school_id ON program(school_id);