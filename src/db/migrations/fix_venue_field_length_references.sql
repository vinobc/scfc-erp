-- Migration: Fix venue field length in referencing tables
-- Date: 2025-08-26
-- Description: Updates venue field length in faculty_allocation and attendance tables to match venue table (VARCHAR(50))

BEGIN;

-- Update faculty_allocation table venue field length
ALTER TABLE faculty_allocation ALTER COLUMN venue TYPE VARCHAR(50);

-- Update attendance table venue field length  
ALTER TABLE attendance ALTER COLUMN venue TYPE VARCHAR(50);

-- Add migration log entry
INSERT INTO migration_log (migration_name, applied_at, description) 
VALUES (
    'fix_venue_field_length_references', 
    CURRENT_TIMESTAMP, 
    'Updated venue field length in faculty_allocation and attendance tables to VARCHAR(50)'
) ON CONFLICT DO NOTHING;

COMMIT;