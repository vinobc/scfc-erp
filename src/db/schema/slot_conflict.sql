-- Drop slot_conflict table if it exists (for development purposes)
DROP TABLE IF EXISTS slot_conflict CASCADE;

-- Create slot_conflict table
CREATE TABLE slot_conflict (
    conflict_id SERIAL PRIMARY KEY,
    slot_year VARCHAR(20) NOT NULL,
    semester_type VARCHAR(10) NOT NULL,
    slot_name VARCHAR(15) NOT NULL,
    conflicting_slot_name VARCHAR(15) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint to prevent duplicate conflicts
    CONSTRAINT unique_slot_conflict UNIQUE (slot_year, semester_type, slot_name, conflicting_slot_name),
    
    -- Foreign key constraints
    CONSTRAINT fk_slot_name FOREIGN KEY (slot_name) REFERENCES allowed_slot_names(name),
    CONSTRAINT fk_conflicting_slot_name FOREIGN KEY (conflicting_slot_name) REFERENCES allowed_slot_names(name),
    
    -- Check constraints for allowed values
    CONSTRAINT chk_slot_conflict_semester_type 
        CHECK (semester_type IN ('FALL', 'WINTER', 'SUMMER'))
);

-- Add indexes for faster lookups
CREATE INDEX idx_slot_conflict_semester ON slot_conflict(slot_year, semester_type);
CREATE INDEX idx_slot_conflict_slot_names ON slot_conflict(slot_name, conflicting_slot_name);