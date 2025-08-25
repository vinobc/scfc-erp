-- Migration: Increase venue field length from VARCHAR(10) to VARCHAR(50)
-- Date: 2025-08-25
-- Description: Increases the venue field length to accommodate longer venue names

BEGIN;

-- Increase venue field length
ALTER TABLE venue ALTER COLUMN venue TYPE VARCHAR(50);

-- Add migration log entry
INSERT INTO migration_log (migration_name, applied_at, description) 
VALUES (
    'increase_venue_field_length', 
    CURRENT_TIMESTAMP, 
    'Increased venue field length from VARCHAR(10) to VARCHAR(50)'
) ON CONFLICT DO NOTHING;

COMMIT;