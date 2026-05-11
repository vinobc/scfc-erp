-- Persistent informational text shown below the master slot timetable.
-- One row per (slot_year, semester_type).

CREATE TABLE IF NOT EXISTS slot_info (
    slot_info_id  SERIAL PRIMARY KEY,
    slot_year     VARCHAR(20) NOT NULL,
    semester_type VARCHAR(10) NOT NULL,
    info_text     TEXT NOT NULL DEFAULT '',
    updated_by    INTEGER,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_slot_info_year_semester UNIQUE (slot_year, semester_type),
    CONSTRAINT chk_slot_info_semester_type CHECK (semester_type IN ('FALL','WINTER','SUMMER'))
);

CREATE INDEX IF NOT EXISTS idx_slot_info_year_sem
    ON slot_info(slot_year, semester_type);
