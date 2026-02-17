-- Fix stale credits for CSE5131 registrations created before the course credit update (0 -> 3)
-- Already executed manually on 2026-02-17
UPDATE student_registrations
SET credits = 3, updated_at = CURRENT_TIMESTAMP
WHERE course_code = 'CSE5131' AND credits = 0;
