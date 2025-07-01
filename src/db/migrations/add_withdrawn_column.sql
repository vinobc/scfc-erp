-- Migration: Add withdrawn column to student_registrations table
-- This column tracks whether a student has withdrawn from a registered course

ALTER TABLE student_registrations 
ADD COLUMN IF NOT EXISTS withdrawn BOOLEAN DEFAULT FALSE;

-- Add index for performance when filtering withdrawn courses
CREATE INDEX IF NOT EXISTS idx_student_registrations_withdrawn 
ON student_registrations(enrollment_number, withdrawn);

-- Add comment
COMMENT ON COLUMN student_registrations.withdrawn IS 'Indicates if the student has withdrawn from this course registration';