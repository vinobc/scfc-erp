-- Drop table if it exists (for development purposes)
DROP TABLE IF EXISTS semester_slot_config CASCADE;

-- Create semester_slot_config table
CREATE TABLE semester_slot_config (
    config_id SERIAL PRIMARY KEY,
    slot_year VARCHAR(20) NOT NULL,
    semester_type VARCHAR(10) NOT NULL,
    slot_name VARCHAR(15) NOT NULL,
    course_theory INTEGER NOT NULL,
    course_practical INTEGER NOT NULL,
    linked_slots TEXT[] DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_slot_semester_config UNIQUE (slot_year, semester_type, slot_name, course_theory, course_practical),
    CONSTRAINT fk_slot_name FOREIGN KEY (slot_name) REFERENCES allowed_slot_names(name)
);

-- Add indexes for faster lookups
CREATE INDEX idx_semester_slot_config_semester ON semester_slot_config(slot_year, semester_type);
CREATE INDEX idx_semester_slot_config_tpc ON semester_slot_config(course_theory, course_practical);