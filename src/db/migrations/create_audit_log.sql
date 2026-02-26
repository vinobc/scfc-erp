-- System-wide audit log for tracking all data changes
-- Created: 2026-02-26
-- Context: Student registration deletions were untraceable (no audit trail).
--          This adds DB-level triggers to capture INSERT/UPDATE/DELETE on all critical tables.

-- 1. Generic audit log table
CREATE TABLE IF NOT EXISTS audit_log (
    id BIGSERIAL PRIMARY KEY,
    table_name TEXT NOT NULL,
    operation VARCHAR(10) NOT NULL,       -- INSERT, UPDATE, DELETE
    old_values JSONB,                      -- full old row (UPDATE/DELETE)
    new_values JSONB,                      -- full new row (INSERT/UPDATE)
    changed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_table ON audit_log(table_name);
CREATE INDEX idx_audit_operation ON audit_log(operation);
CREATE INDEX idx_audit_changed_at ON audit_log(changed_at);

-- 2. Generic trigger function (reusable for any table)
-- Handles tables with or without an 'id' column safely
CREATE OR REPLACE FUNCTION fn_audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (table_name, operation, old_values)
        VALUES (TG_TABLE_NAME, 'DELETE', row_to_json(OLD)::jsonb);
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (table_name, operation, old_values, new_values)
        VALUES (TG_TABLE_NAME, 'UPDATE', row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, operation, new_values)
        VALUES (TG_TABLE_NAME, 'INSERT', row_to_json(NEW)::jsonb);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 3. Attach triggers to critical data tables
CREATE TRIGGER trg_audit_student_registrations
AFTER INSERT OR UPDATE OR DELETE ON student_registrations
FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER trg_audit_faculty_allocation
AFTER INSERT OR UPDATE OR DELETE ON faculty_allocation
FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER trg_audit_project_allocation
AFTER INSERT OR UPDATE OR DELETE ON project_allocation
FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER trg_audit_attendance
AFTER INSERT OR UPDATE OR DELETE ON attendance
FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER trg_audit_student_marks
AFTER INSERT OR UPDATE OR DELETE ON student_marks
FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER trg_audit_assessment_config
AFTER INSERT OR UPDATE OR DELETE ON assessment_config
FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER trg_audit_marks_entry_lock
AFTER INSERT OR UPDATE OR DELETE ON marks_entry_lock
FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

-- 4. Attach triggers to config/master tables
CREATE TRIGGER trg_audit_system_config
AFTER INSERT OR UPDATE OR DELETE ON system_config
FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER trg_audit_student
AFTER INSERT OR UPDATE OR DELETE ON student
FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER trg_audit_faculty
AFTER INSERT OR UPDATE OR DELETE ON faculty
FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER trg_audit_course
AFTER INSERT OR UPDATE OR DELETE ON course
FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER trg_audit_user
AFTER INSERT OR UPDATE OR DELETE ON "user"
FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER trg_audit_slot
AFTER INSERT OR UPDATE OR DELETE ON slot
FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER trg_audit_slot_conflict
AFTER INSERT OR UPDATE OR DELETE ON slot_conflict
FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER trg_audit_venue
AFTER INSERT OR UPDATE OR DELETE ON venue
FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER trg_audit_program
AFTER INSERT OR UPDATE OR DELETE ON program
FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

-- NOTE: To add audit to future tables, just add:
-- CREATE TRIGGER trg_audit_<table_name>
-- AFTER INSERT OR UPDATE OR DELETE ON <table_name>
-- FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();
