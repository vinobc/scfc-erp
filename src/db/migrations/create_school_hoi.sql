-- Head of Institution (HoI) → School mapping
-- Run this migration to enable school-scoped Student Marks Report access for HoIs.

CREATE TABLE IF NOT EXISTS school_hoi (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    school_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES "user"(user_id) ON DELETE CASCADE,
    FOREIGN KEY (school_id) REFERENCES school(school_id) ON DELETE CASCADE,
    UNIQUE(user_id, school_id)
);

CREATE INDEX IF NOT EXISTS idx_school_hoi_user_id ON school_hoi(user_id);
CREATE INDEX IF NOT EXISTS idx_school_hoi_school_id ON school_hoi(school_id);
