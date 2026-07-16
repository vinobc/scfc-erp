-- Migration: Create course_syllabus table
-- Stores uploaded syllabus documents (PDF + Word) per (course_code, syllabus_version)
-- along with per-version syllabus attributes (course type, requisites, OCNE, PBL).
-- Admin uploads both files; users download PDF only.

CREATE TABLE IF NOT EXISTS course_syllabus (
    id                  SERIAL PRIMARY KEY,
    course_code         VARCHAR(10) NOT NULL REFERENCES course(course_code) ON DELETE CASCADE,
    course_owner        VARCHAR(100) NOT NULL,
    syllabus_version    NUMERIC(4,2) NOT NULL,
    course_type         VARCHAR(50),
    pre_requisites      TEXT[] NOT NULL DEFAULT '{}',
    anti_requisites     TEXT[] NOT NULL DEFAULT '{}',
    co_requisites       TEXT[] NOT NULL DEFAULT '{}',
    course_equivalence  TEXT[] NOT NULL DEFAULT '{}',
    ocne                BOOLEAN NOT NULL DEFAULT FALSE,
    pbl                 BOOLEAN NOT NULL DEFAULT FALSE,
    pdf_path            TEXT NOT NULL,
    word_path           TEXT NOT NULL,
    uploaded_by         INTEGER REFERENCES "user"(user_id),
    uploaded_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT course_syllabus_uniq UNIQUE (course_code, syllabus_version)
);

CREATE INDEX IF NOT EXISTS idx_course_syllabus_lookup
    ON course_syllabus (course_code, syllabus_version);

CREATE INDEX IF NOT EXISTS idx_course_syllabus_owner
    ON course_syllabus (course_owner);

COMMENT ON TABLE course_syllabus IS
    'Per (course, syllabus version) documents and attributes. PDF served to all portal users; Word is admin-only.';
