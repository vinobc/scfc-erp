-- Migration: Increase course_owner field length to support multiple schools
-- Date: 2025-11-03
-- Description: Expands course_owner from VARCHAR(20) to VARCHAR(100) to allow multiple comma-separated school codes

-- Alter the course_owner column to VARCHAR(100)
ALTER TABLE course
ALTER COLUMN course_owner TYPE VARCHAR(100);

-- No data migration needed - existing data is compatible
