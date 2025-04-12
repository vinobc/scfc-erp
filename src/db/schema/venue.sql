-- Drop venue table if it exists (for development purposes)
DROP TABLE IF EXISTS venue CASCADE;

-- Create venue table
CREATE TABLE venue (
    venue_id SERIAL PRIMARY KEY,
    assigned_to_school VARCHAR(10),
    venue VARCHAR(10) NOT NULL,
    capacity INTEGER NOT NULL,
    infra_type VARCHAR(20) NOT NULL,
    seats INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for faster lookups
CREATE INDEX idx_venue_name ON venue(venue);
CREATE INDEX idx_venue_infra_type ON venue(infra_type);