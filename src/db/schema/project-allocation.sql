-- Drop project_allocation table if it exists (for development purposes)
DROP TABLE IF EXISTS project_allocation CASCADE;

-- Create project_allocation table for PRJ type courses
CREATE TABLE project_allocation (
    id SERIAL PRIMARY KEY,
    
    -- Academic Period
    slot_year VARCHAR(20) NOT NULL,
    semester_type VARCHAR(10) NOT NULL,
    
    -- Course and Faculty
    course_code VARCHAR(10) NOT NULL,
    employee_id INTEGER NOT NULL,
    
    -- Student Management
    max_students INTEGER DEFAULT 50,
    current_students INTEGER DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint to prevent duplicate allocations
    UNIQUE(slot_year, semester_type, course_code, employee_id),
    
    -- Foreign key constraints
    FOREIGN KEY (course_code) REFERENCES course(course_code) ON DELETE RESTRICT,
    FOREIGN KEY (employee_id) REFERENCES faculty(employee_id) ON DELETE RESTRICT,
    
    -- Check constraints
    CONSTRAINT chk_project_allocation_semester_type 
        CHECK (semester_type IN ('FALL', 'WINTER', 'SUMMER')),
    CONSTRAINT chk_max_students 
        CHECK (max_students > 0),
    CONSTRAINT chk_current_students 
        CHECK (current_students >= 0 AND current_students <= max_students)
);

-- Add indexes for faster lookups
CREATE INDEX idx_project_allocation_year_semester ON project_allocation(slot_year, semester_type);
CREATE INDEX idx_project_allocation_employee ON project_allocation(employee_id);
CREATE INDEX idx_project_allocation_course ON project_allocation(course_code);
CREATE INDEX idx_project_allocation_active ON project_allocation(is_active);

-- Comments
COMMENT ON TABLE project_allocation IS 'Stores faculty allocations for project-type courses (0-0-X credits)';
COMMENT ON COLUMN project_allocation.max_students IS 'Maximum number of students that can be supervised by this faculty for this project';
COMMENT ON COLUMN project_allocation.current_students IS 'Current number of students enrolled under this faculty for this project';