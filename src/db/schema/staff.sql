-- Drop staff table if it exists (for development purposes)
DROP TABLE IF EXISTS staff CASCADE;

-- Create staff table
CREATE TABLE staff (
    staff_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    designation VARCHAR(50),
    employee_id INTEGER NOT NULL UNIQUE,
    department VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for faster lookups
CREATE INDEX idx_staff_name ON staff(name);
CREATE INDEX idx_staff_employee_id ON staff(employee_id);
CREATE INDEX idx_staff_department ON staff(department);
