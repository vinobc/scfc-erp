-- OD (On Duty) Feature Tables
-- Run this migration to create the tables needed for OD management

-- 1. OD Event table - DSW creates events and maps to faculty coordinators
CREATE TABLE IF NOT EXISTS od_event (
    event_id SERIAL PRIMARY KEY,
    event_name VARCHAR(255) NOT NULL,
    slot_year VARCHAR(20) NOT NULL,
    semester_type VARCHAR(10) NOT NULL,
    coordinator_employee_id INTEGER NOT NULL,
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (coordinator_employee_id) REFERENCES faculty(employee_id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES "user"(user_id) ON DELETE RESTRICT,
    CONSTRAINT chk_od_event_semester CHECK (semester_type IN ('FALL', 'WINTER', 'SUMMER'))
);

CREATE INDEX IF NOT EXISTS idx_od_event_coordinator ON od_event(coordinator_employee_id);
CREATE INDEX IF NOT EXISTS idx_od_event_semester ON od_event(slot_year, semester_type);

-- 2. OD Activity table - Faculty coordinators create activities under events
CREATE TABLE IF NOT EXISTS od_activity (
    activity_id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL,
    activity_name VARCHAR(255) NOT NULL,
    activity_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES od_event(event_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_od_activity_event ON od_activity(event_id);
CREATE INDEX IF NOT EXISTS idx_od_activity_date ON od_activity(activity_date);

-- 3. OD Activity Student table - Students assigned to activities
CREATE TABLE IF NOT EXISTS od_activity_student (
    id SERIAL PRIMARY KEY,
    activity_id INTEGER NOT NULL,
    enrollment_number VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (activity_id) REFERENCES od_activity(activity_id) ON DELETE CASCADE,
    UNIQUE(activity_id, enrollment_number)
);

CREATE INDEX IF NOT EXISTS idx_od_activity_student_activity ON od_activity_student(activity_id);
CREATE INDEX IF NOT EXISTS idx_od_activity_student_enrollment ON od_activity_student(enrollment_number);

-- 4. Add od_activity_id column to attendance table to track auto-generated OD records
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS od_activity_id INTEGER NULL;

-- Add foreign key constraint (only if column was just added)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_attendance_od_activity'
    ) THEN
        ALTER TABLE attendance ADD CONSTRAINT fk_attendance_od_activity
            FOREIGN KEY (od_activity_id) REFERENCES od_activity(activity_id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_attendance_od_activity ON attendance(od_activity_id);
