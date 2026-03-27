-- Add is_od boolean column to attendance table
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS is_od BOOLEAN DEFAULT false;

-- Migrate existing OD records: set is_od=true and reset status to null
UPDATE attendance SET is_od = true WHERE status = 'OD';

-- Allow null status (for OD-only records where faculty hasn't marked yet)
ALTER TABLE attendance ALTER COLUMN status DROP NOT NULL;
UPDATE attendance SET status = NULL WHERE status = 'OD';

-- Index for OD lookups
CREATE INDEX IF NOT EXISTS idx_attendance_is_od ON attendance (is_od) WHERE is_od = true;
