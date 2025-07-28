-- Drop attendance table if it exists (for development purposes)
DROP TABLE IF EXISTS attendance CASCADE;

-- Create attendance table
CREATE TABLE attendance (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL,
    slot_year VARCHAR(20) NOT NULL,
    semester_type VARCHAR(10) NOT NULL,
    course_code VARCHAR(10) NOT NULL,
    employee_id INTEGER NOT NULL,
    venue VARCHAR(10) NOT NULL,
    slot_day VARCHAR(10) NOT NULL,
    slot_name VARCHAR(15) NOT NULL,
    slot_time VARCHAR(75) NOT NULL,
    attendance_date DATE NOT NULL,
    status VARCHAR(10) NOT NULL,
    recorded_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint to prevent duplicate attendance entries
    UNIQUE(student_id, slot_year, semester_type, course_code, employee_id, venue, slot_day, slot_name, slot_time, attendance_date),
    
    -- Foreign key constraints
    FOREIGN KEY (student_id) REFERENCES student(user_id) ON DELETE CASCADE,
    FOREIGN KEY (recorded_by) REFERENCES "user"(user_id) ON DELETE RESTRICT,
    FOREIGN KEY (slot_year, semester_type, course_code, employee_id, venue, slot_day, slot_name, slot_time) 
        REFERENCES faculty_allocation(slot_year, semester_type, course_code, employee_id, venue, slot_day, slot_name, slot_time) 
        ON DELETE CASCADE,
    
    -- Check constraints for allowed values
    CONSTRAINT chk_attendance_status 
        CHECK (status IN ('present', 'absent', 'OD')),
    CONSTRAINT chk_attendance_semester_type 
        CHECK (semester_type IN ('FALL', 'WINTER', 'SUMMER')),
    CONSTRAINT chk_attendance_slot_day 
        CHECK (slot_day IN ('MON', 'TUE', 'WED', 'THU', 'FRI'))
);

-- Add indexes for faster lookups
CREATE INDEX idx_attendance_student ON attendance(student_id);
CREATE INDEX idx_attendance_faculty ON attendance(employee_id);
CREATE INDEX idx_attendance_course ON attendance(course_code);
CREATE INDEX idx_attendance_year_semester ON attendance(slot_year, semester_type);
CREATE INDEX idx_attendance_date ON attendance(attendance_date);
CREATE INDEX idx_attendance_status ON attendance(status);

-- Add index for common query patterns
CREATE INDEX idx_attendance_lookup ON attendance(slot_year, semester_type, course_code, employee_id);
CREATE INDEX idx_attendance_student_course ON attendance(student_id, course_code, slot_year, semester_type);