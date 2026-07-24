-- Extend the user.role CHECK constraint to include the 'coe' (Controller of
-- Examinations) role. Safe to run on an existing DB: existing rows are
-- unaffected because 'coe' is only added to the allowed set.

ALTER TABLE "user" DROP CONSTRAINT IF EXISTS user_role_check;

ALTER TABLE "user" ADD CONSTRAINT user_role_check
  CHECK (role IN (
    'admin',
    'staff',
    'faculty',
    'student',
    'parent',
    'service',
    'timetable_coordinator',
    'coe'
  ));
