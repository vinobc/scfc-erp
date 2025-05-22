-- Drop user table if it exists (for development purposes)
DROP TABLE IF EXISTS "user" CASCADE;

-- Create user table
CREATE TABLE "user" (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(30) NOT NULL CHECK (role IN ('admin', 'staff', 'faculty', 'student', 'parent', 'service', 'timetable_coordinator')),
    employee_id INTEGER UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES faculty(employee_id) ON DELETE SET NULL
);

-- Add indexes for faster lookups
CREATE INDEX idx_user_username ON "user"(username);
CREATE INDEX idx_user_email ON "user"(email);
CREATE INDEX idx_user_role ON "user"(role);
CREATE INDEX idx_user_employee_id ON "user"(employee_id);