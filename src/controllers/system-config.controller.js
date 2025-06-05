const db = require("../config/db");

// Get all system configuration settings
exports.getAllSystemConfig = async (req, res) => {
  try {
    console.log("📋 Getting all system configuration settings");

    const result = await db.query(
      `SELECT config_key, config_value, config_description, updated_at 
       FROM system_config 
       WHERE is_active = true 
       ORDER BY config_key`
    );

    console.log(`✅ Retrieved ${result.rows.length} configuration settings`);

    res.status(200).json({
      message: "System configuration retrieved successfully",
      config: result.rows,
    });
  } catch (error) {
    console.error("❌ Error getting system configuration:", error);
    res.status(500).json({
      message: "Server error while retrieving system configuration",
    });
  }
};

// Get specific configuration setting
exports.getConfigSetting = async (req, res) => {
  try {
    const { configKey } = req.params;
    console.log(`📋 Getting configuration setting: ${configKey}`);

    const result = await db.query(
      `SELECT config_key, config_value, config_description, updated_at 
       FROM system_config 
       WHERE config_key = $1 AND is_active = true`,
      [configKey]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: `Configuration setting '${configKey}' not found`,
      });
    }

    console.log(
      `✅ Retrieved configuration: ${configKey} = ${result.rows[0].config_value}`
    );

    res.status(200).json({
      message: "Configuration setting retrieved successfully",
      config: result.rows[0],
    });
  } catch (error) {
    console.error("❌ Error getting configuration setting:", error);
    res.status(500).json({
      message: "Server error while retrieving configuration setting",
    });
  }
};

// Update configuration setting (Admin only)
exports.updateConfigSetting = async (req, res) => {
  try {
    const { configKey } = req.params;
    const { configValue, configDescription } = req.body;

    console.log(`🔧 Updating configuration: ${configKey} = ${configValue}`);

    // Validate input
    if (configValue === undefined || configValue === null) {
      return res.status(400).json({
        message: "Configuration value is required",
      });
    }

    // Convert value to string for storage
    const valueString = String(configValue);

    // Validate specific configuration keys
    if (configKey === "course_registration_enabled") {
      if (!["true", "false"].includes(valueString.toLowerCase())) {
        return res.status(400).json({
          message: "course_registration_enabled must be 'true' or 'false'",
        });
      }
    }

    // Check if configuration exists
    const existingResult = await db.query(
      `SELECT config_key FROM system_config WHERE config_key = $1`,
      [configKey]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        message: `Configuration setting '${configKey}' not found`,
      });
    }

    // Update the configuration
    const updateResult = await db.query(
      `UPDATE system_config 
       SET config_value = $1, 
           config_description = COALESCE($2, config_description),
           updated_at = CURRENT_TIMESTAMP
       WHERE config_key = $3 AND is_active = true
       RETURNING config_key, config_value, config_description, updated_at`,
      [valueString, configDescription, configKey]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({
        message: `Failed to update configuration setting '${configKey}'`,
      });
    }

    console.log(`✅ Configuration updated: ${configKey} = ${valueString}`);

    res.status(200).json({
      message: `Configuration '${configKey}' updated successfully`,
      config: updateResult.rows[0],
    });
  } catch (error) {
    console.error("❌ Error updating configuration setting:", error);
    res.status(500).json({
      message: "Server error while updating configuration setting",
    });
  }
};

// Get course registration status (public endpoint for students)
exports.getCourseRegistrationStatus = async (req, res) => {
  try {
    console.log("📋 Getting course registration status for student");

    const result = await db.query(
      `SELECT config_value, config_description, updated_at
       FROM system_config 
       WHERE config_key = 'course_registration_enabled' AND is_active = true`
    );

    if (result.rows.length === 0) {
      // Default to enabled if not found
      return res.status(200).json({
        enabled: true,
        message: "Course registration is available",
      });
    }

    const isEnabled = result.rows[0].config_value.toLowerCase() === "true";

    // Get the custom message
    const messageResult = await db.query(
      `SELECT config_value
       FROM system_config 
       WHERE config_key = 'registration_message' AND is_active = true`
    );

    const message =
      messageResult.rows.length > 0
        ? messageResult.rows[0].config_value
        : isEnabled
        ? "Course registration is available"
        : "Course registration is currently disabled";

    console.log(
      `✅ Course registration status: ${isEnabled ? "ENABLED" : "DISABLED"}`
    );

    res.status(200).json({
      enabled: isEnabled,
      message: message,
      lastUpdated: result.rows[0].updated_at,
    });
  } catch (error) {
    console.error("❌ Error getting course registration status:", error);
    res.status(500).json({
      message: "Server error while checking course registration status",
    });
  }
};
