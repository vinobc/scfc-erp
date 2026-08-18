-- Add marks publish gate: student visibility of each component's marks is now
-- controlled by an explicit "publish" action by faculty. Absence of a row in
-- marks_publish_state = unpublished (default); presence = published.
--
-- Granularity matches the faculty entry unit:
--   • assessment_type in ('CA1','CA2','CA3'): assessment_number is always 1
--   • assessment_type = 'ASSIGNMENT': one row per assignment number
--   • assessment_type = 'LAB_SESSION': one row per lab session index
--
-- Safe to re-run: uses IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS marks_publish_state (
    id SERIAL PRIMARY KEY,
    assessment_config_id INTEGER NOT NULL REFERENCES assessment_config(id) ON DELETE CASCADE,
    assessment_type VARCHAR(20) NOT NULL,   -- CA1 | CA2 | CA3 | ASSIGNMENT | LAB_SESSION
    assessment_number INTEGER NOT NULL DEFAULT 1,
    published_by INTEGER REFERENCES "user"(user_id) ON DELETE SET NULL,
    published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (assessment_config_id, assessment_type, assessment_number)
);

CREATE INDEX IF NOT EXISTS idx_marks_publish_config
    ON marks_publish_state(assessment_config_id);
