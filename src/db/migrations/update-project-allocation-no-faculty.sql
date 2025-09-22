-- Migration: Remove faculty requirement from project_allocation table
-- Date: 2025-09-22
-- Description: Project courses no longer require faculty coordinators or max student limits
--              They are simply activated for a semester and students register independently

-- Step 1: Drop the existing unique constraint that includes employee_id
ALTER TABLE project_allocation 
DROP CONSTRAINT IF EXISTS project_allocation_slot_year_semester_type_course_code_emplo_key;

-- Step 2: Add new unique constraint without employee_id
ALTER TABLE project_allocation 
ADD CONSTRAINT project_allocation_unique_course_semester 
UNIQUE(slot_year, semester_type, course_code);

-- Step 3: Make employee_id nullable
ALTER TABLE project_allocation 
ALTER COLUMN employee_id DROP NOT NULL;

-- Step 4: Make max_students nullable and remove the check constraint
ALTER TABLE project_allocation 
DROP CONSTRAINT IF EXISTS chk_max_students;

ALTER TABLE project_allocation 
ALTER COLUMN max_students DROP DEFAULT,
ALTER COLUMN max_students DROP NOT NULL;

-- Step 5: Update the current_students check constraint to not reference max_students
ALTER TABLE project_allocation 
DROP CONSTRAINT IF EXISTS chk_current_students;

ALTER TABLE project_allocation 
ADD CONSTRAINT chk_current_students 
CHECK (current_students >= 0);

-- Step 6: Clear existing project allocations if needed (optional - uncomment if you want to reset)
-- DELETE FROM project_allocation;

-- Step 7: Update comments
COMMENT ON TABLE project_allocation IS 'Stores activation status for project-type courses (0-0-X credits) per semester';
COMMENT ON COLUMN project_allocation.employee_id IS 'Optional - kept for backward compatibility';
COMMENT ON COLUMN project_allocation.max_students IS 'Optional - no limit by default';
COMMENT ON COLUMN project_allocation.current_students IS 'Number of students currently registered for this project course';

-- Verification query
SELECT 
    course_code,
    slot_year,
    semester_type,
    is_active,
    current_students
FROM project_allocation 
ORDER BY slot_year DESC, semester_type, course_code;