-- Drop school_hoi table if it exists (for development purposes)
DROP TABLE IF EXISTS school_hoi CASCADE;

-- Head of Institution (HoI) → School mapping
-- One row per (HoI user, school). A school may have more than one HoI;
-- an HoI is any user (typically faculty) whom the VC has designated as head
-- of a given school. Independent of timetable_coordinators.
CREATE TABLE school_hoi (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    school_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES "user"(user_id) ON DELETE CASCADE,
    FOREIGN KEY (school_id) REFERENCES school(school_id) ON DELETE CASCADE,
    UNIQUE(user_id, school_id)
);

CREATE INDEX idx_school_hoi_user_id ON school_hoi(user_id);
CREATE INDEX idx_school_hoi_school_id ON school_hoi(school_id);
