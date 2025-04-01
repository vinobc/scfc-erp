-- Drop school table if it exists (for development purposes)
DROP TABLE IF EXISTS school CASCADE;

-- Create school table
CREATE TABLE school (
    school_id SERIAL PRIMARY KEY,
    school_code VARCHAR(10) NOT NULL UNIQUE,
    school_long_name VARCHAR(100) NOT NULL,
    school_short_name VARCHAR(20) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add an index on school_code for faster lookups
CREATE INDEX idx_school_code ON school(school_code);