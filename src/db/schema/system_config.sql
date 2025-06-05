-- System Configuration Table
-- Stores system-wide configuration settings
CREATE TABLE IF NOT EXISTS system_config (
    config_id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT NOT NULL,
    config_description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_config(config_key);
CREATE INDEX IF NOT EXISTS idx_system_config_active ON system_config(is_active);

-- Add comments
COMMENT ON TABLE system_config IS 'System-wide configuration settings';
COMMENT ON COLUMN system_config.config_key IS 'Unique identifier for the configuration setting';
COMMENT ON COLUMN system_config.config_value IS 'Configuration value (stored as text)';
COMMENT ON COLUMN system_config.config_description IS 'Human-readable description of the setting';
COMMENT ON COLUMN system_config.is_active IS 'Whether this configuration is currently active';