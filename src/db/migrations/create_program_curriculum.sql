-- Migration: Create program_curriculum table
-- Stores uploaded curriculum documents (PDF + Excel) for a given
-- (program, admitted year, curriculum version). Admin uploads; users download PDF.

CREATE TABLE IF NOT EXISTS program_curriculum (
    id                  SERIAL PRIMARY KEY,
    school_id           INTEGER NOT NULL REFERENCES school(school_id),
    program_id          INTEGER NOT NULL REFERENCES program(program_id) ON DELETE CASCADE,
    admitted_year       INTEGER NOT NULL,
    curriculum_version  NUMERIC(4,2) NOT NULL,
    pdf_path            TEXT NOT NULL,
    excel_path          TEXT NOT NULL,
    uploaded_by         INTEGER REFERENCES "user"(user_id),
    uploaded_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT program_curriculum_uniq UNIQUE (program_id, admitted_year, curriculum_version)
);

CREATE INDEX IF NOT EXISTS idx_program_curriculum_lookup
    ON program_curriculum (program_id, admitted_year, curriculum_version);

COMMENT ON TABLE program_curriculum IS
    'Per (program, admitted year, version) curriculum documents. PDF served to all portal users; Excel is admin-only.';
