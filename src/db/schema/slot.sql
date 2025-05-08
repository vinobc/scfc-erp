-- Drop slot table if it exists (for development purposes)
DROP TABLE IF EXISTS slot CASCADE;

-- Create slot table
CREATE TABLE slot (
    slot_id SERIAL PRIMARY KEY,
    slot_year VARCHAR(20) NOT NULL,
    semester_type VARCHAR(10) NOT NULL,
    slot_day VARCHAR(10) NOT NULL,
    slot_name VARCHAR(15) NOT NULL,
    slot_time VARCHAR(75) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create tables for allowed values
DROP TABLE IF EXISTS allowed_slot_names CASCADE;
CREATE TABLE allowed_slot_names (
    name VARCHAR(15) PRIMARY KEY
);

DROP TABLE IF EXISTS allowed_slot_times CASCADE;
CREATE TABLE allowed_slot_times (
    time VARCHAR(75) PRIMARY KEY
);

-- Insert allowed slot_name values
INSERT INTO allowed_slot_names (name) VALUES 
('A'), ('B'), ('C'), ('D'), ('E'), ('F'), ('G'), ('H'), ('K'), ('M'), ('N'), ('P'),
('A1'), ('A2'), ('B1'), ('B2'), ('C1'), ('C2'), ('D1'), ('D2'), 
('E1'), ('E2'), ('F1'), ('F2'), ('G1'), ('G2'), ('H1'), ('H2'), 
('K1'), ('K2'), ('M1'), ('M2'), ('N1'), ('N2'), ('P1'), ('P2'),
('TA1'), ('TA2'), ('TB1'), ('TB2'), ('TC1'), ('TC2'), ('TD1'), ('TD2'),
('L1+L2'), ('L3+L4'), ('L5+L6'), ('L7+L8'), ('L9+L10'), ('L11+L12'), ('L13+L4'), ('L15+L16'), 
('L17+L18'), ('L19+L20'), ('L21+L22'), ('L23+L24'), ('L25+L26'), ('L27+L28'), ('L29+L30'), ('L31+L32'), 
('L33+L34'), ('L35+L36'), ('L37+L38'), ('L39+L40');

-- Insert allowed slot_time values
INSERT INTO allowed_slot_times (time) VALUES 
('9.00-9.50'), ('9.55-10.45'), ('10.50-11.40'), ('11.45-12.35'), 
('1.15–2.05'), ('2.10-3.00'), ('3.05–3.55'), ('4.00–4.50'),
('9.00–10:40'), ('10.50–12.30'), ('1.15–2.55'), ('3.05–4.45');

-- Add foreign key constraints
ALTER TABLE slot ADD CONSTRAINT fk_slot_name 
    FOREIGN KEY (slot_name) REFERENCES allowed_slot_names(name);

ALTER TABLE slot ADD CONSTRAINT fk_slot_time 
    FOREIGN KEY (slot_time) REFERENCES allowed_slot_times(time);

-- Add constraints for allowed values
ALTER TABLE slot ADD CONSTRAINT chk_slot_semester_type 
    CHECK (semester_type IN ('FALL', 'WINTER', 'SUMMER'));

ALTER TABLE slot ADD CONSTRAINT chk_slot_day 
    CHECK (slot_day IN ('MON', 'TUE', 'WED', 'THU', 'FRI'));

-- Add indexes for faster lookups
CREATE INDEX idx_slot_year ON slot(slot_year);
CREATE INDEX idx_slot_semester ON slot(semester_type);
CREATE INDEX idx_slot_day ON slot(slot_day);
CREATE INDEX idx_slot_name ON slot(slot_name);