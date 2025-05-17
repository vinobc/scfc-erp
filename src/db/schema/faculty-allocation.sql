-- Drop faculty_allocation table if it exists (for development purposes)
DROP TABLE IF EXISTS faculty_allocation CASCADE;

-- Create faculty_allocation table
CREATE TABLE faculty_allocation (
    slot_year VARCHAR(20) NOT NULL,
    semester_type VARCHAR(10) NOT NULL,
    course_code VARCHAR(10) NOT NULL,
    employee_id INTEGER NOT NULL,
    venue VARCHAR(10) NOT NULL,
    slot_day VARCHAR(10) NOT NULL,
    slot_name VARCHAR(15) NOT NULL,
    slot_time VARCHAR(75) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Primary key using all specified fields to handle clashes
    PRIMARY KEY (slot_year, semester_type, course_code, employee_id, venue, slot_day, slot_name, slot_time),
    
    -- Foreign key constraints
    FOREIGN KEY (course_code) REFERENCES course(course_code) ON DELETE RESTRICT,
    FOREIGN KEY (employee_id) REFERENCES faculty(employee_id) ON DELETE RESTRICT,
    FOREIGN KEY (venue) REFERENCES venue(venue) ON DELETE RESTRICT,
    FOREIGN KEY (slot_name) REFERENCES allowed_slot_names(name),
    FOREIGN KEY (slot_time) REFERENCES allowed_slot_times(time),
    
    -- Check constraints for allowed values
    CONSTRAINT chk_faculty_allocation_semester_type 
        CHECK (semester_type IN ('FALL', 'WINTER', 'SUMMER')),
    CONSTRAINT chk_faculty_allocation_slot_day 
        CHECK (slot_day IN ('MON', 'TUE', 'WED', 'THU', 'FRI'))
);

-- Add indexes for faster lookups
CREATE INDEX idx_faculty_allocation_year_semester ON faculty_allocation(slot_year, semester_type);
CREATE INDEX idx_faculty_allocation_employee ON faculty_allocation(employee_id);
CREATE INDEX idx_faculty_allocation_venue ON faculty_allocation(venue);
CREATE INDEX idx_faculty_allocation_course ON faculty_allocation(course_code);