const db = require("../config/db");

async function initializeSystemConfig() {
  try {
    console.log("🔧 Setting up system configuration table...");

    // Create the table first (reads from schema file)
    const fs = require("fs");
    const path = require("path");
    const schemaPath = path.join(__dirname, "schema", "system_config.sql");
    const schema = fs.readFileSync(schemaPath, "utf8");

    await db.query(schema);
    console.log("✅ System config table created successfully");

    // Insert default configuration values
    const defaultConfigs = [
      {
        key: "course_registration_enabled",
        value: "true",
        description:
          "Controls whether students can access course registration functionality",
      },
      {
        key: "maintenance_mode",
        value: "false",
        description: "Controls whether the system is in maintenance mode",
      },
      {
        key: "registration_message",
        value: "Course registration is currently available",
        description: "Message to display to students about registration status",
      },
    ];

    for (const config of defaultConfigs) {
      // Use INSERT ... ON CONFLICT to avoid duplicates
      await db.query(
        `
        INSERT INTO system_config (config_key, config_value, config_description)
        VALUES ($1, $2, $3)
        ON CONFLICT (config_key) 
        DO UPDATE SET 
          config_value = EXCLUDED.config_value,
          config_description = EXCLUDED.config_description,
          updated_at = CURRENT_TIMESTAMP
      `,
        [config.key, config.value, config.description]
      );
    }

    console.log("✅ Default system configuration values inserted");

    // Verify the setup
    const result = await db.query(
      "SELECT * FROM system_config ORDER BY config_key"
    );
    console.log("📋 System configuration table contents:");
    result.rows.forEach((row) => {
      console.log(`   ${row.config_key}: ${row.config_value}`);
    });

    console.log("🎉 System configuration setup completed successfully!");
  } catch (error) {
    console.error("❌ Error setting up system configuration:", error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  initializeSystemConfig()
    .then(() => {
      console.log("System config initialization completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("System config initialization failed:", error);
      process.exit(1);
    });
}

module.exports = { initializeSystemConfig };
