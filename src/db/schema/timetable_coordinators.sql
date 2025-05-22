-- Drop timetable_coordinators table if it exists (for development purposes)
DROP TABLE IF EXISTS timetable_coordinators CASCADE;

-- Create timetable_coordinators table
CREATE TABLE timetable_coordinators (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    school_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES "user"(user_id) ON DELETE CASCADE,
    FOREIGN KEY (school_id) REFERENCES school(school_id) ON DELETE CASCADE,
    UNIQUE(user_id, school_id)
);

-- Add indexes for faster lookups
CREATE INDEX idx_timetable_coordinators_user_id ON timetable_coordinators(user_id);
CREATE INDEX idx_timetable_coordinators_school_id ON timetable_coordinators(school_id);