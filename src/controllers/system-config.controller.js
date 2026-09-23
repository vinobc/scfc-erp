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

    if (configKey === "course_withdrawal_enabled") {
      if (!["true", "false"].includes(valueString.toLowerCase())) {
        return res.status(400).json({
          message: "course_withdrawal_enabled must be 'true' or 'false'",
        });
      }
    }

    if (configKey === "registration_enabled_years") {
      try {
        const parsed = JSON.parse(valueString);
        if (!Array.isArray(parsed) || !parsed.every((y) => Number.isInteger(y))) {
          return res.status(400).json({
            message: "registration_enabled_years must be a JSON array of integers (e.g., [2024,2025,2026])",
          });
        }
      } catch (e) {
        return res.status(400).json({
          message: "registration_enabled_years must be valid JSON (e.g., [2024,2025,2026])",
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
// Powers the student sidebar's grey-out of the "Course Registration" menu item.
// Returns enabled=true only if BOTH the master toggle is ON AND the caller's
// year_admitted is present in the registration_enabled_years cohort array.
exports.getCourseRegistrationStatus = async (req, res) => {
  try {
    console.log("📋 Getting course registration status for student");

    // Fetch master toggle, custom message, and cohort array in one round-trip.
    const configResult = await db.query(
      `SELECT config_key, config_value, updated_at FROM system_config
       WHERE config_key IN ('course_registration_enabled', 'registration_message', 'registration_enabled_years')
         AND is_active = true`
    );

    const config = {};
    let lastUpdated = null;
    configResult.rows.forEach((r) => {
      config[r.config_key] = r.config_value;
      if (r.config_key === "course_registration_enabled") lastUpdated = r.updated_at;
    });

    // Master toggle missing → default enabled (pre-existing fail-safe).
    if (config.course_registration_enabled === undefined) {
      return res.status(200).json({
        enabled: true,
        message: "Course registration is available",
      });
    }

    const masterOn = config.course_registration_enabled.toLowerCase() === "true";
    const message =
      config.registration_message ||
      (masterOn
        ? "Course registration is available"
        : "Course registration is currently disabled");

    // Master toggle OFF → all callers blocked.
    if (!masterOn) {
      return res.status(200).json({
        enabled: false,
        message: message,
        lastUpdated: lastUpdated,
      });
    }

    // Master ON — if no cohort array, treat as "all cohorts allowed" (backwards
    // compat for pre-migration DB).
    if (config.registration_enabled_years === undefined) {
      return res.status(200).json({
        enabled: true,
        message: message,
        lastUpdated: lastUpdated,
      });
    }

    let allowedYears;
    try {
      allowedYears = JSON.parse(config.registration_enabled_years);
      if (!Array.isArray(allowedYears)) allowedYears = [];
    } catch (e) {
      allowedYears = [];
    }

    // For non-student callers (admin/faculty/etc.), skip cohort check — this
    // endpoint is primarily consumed by the student sidebar grey-out logic.
    // Callers whose year_admitted we can't look up get enabled=true.
    if (req.userRole !== "student") {
      return res.status(200).json({
        enabled: true,
        message: message,
        lastUpdated: lastUpdated,
      });
    }

    const studentResult = await db.query(
      `SELECT year_admitted FROM student WHERE user_id = $1`,
      [req.userId]
    );

    if (studentResult.rows.length === 0) {
      // Not a student row — treat as enabled (no data to check against).
      return res.status(200).json({
        enabled: true,
        message: message,
        lastUpdated: lastUpdated,
      });
    }

    const yearAdmitted = studentResult.rows[0].year_admitted;
    const cohortAllowed = allowedYears.includes(yearAdmitted);

    console.log(
      `✅ Registration status for ${req.userId} (year ${yearAdmitted}): ${cohortAllowed ? "ENABLED" : "BLOCKED (cohort)"}`
    );

    res.status(200).json({
      enabled: cohortAllowed,
      message: message,
      lastUpdated: lastUpdated,
    });
  } catch (error) {
    console.error("❌ Error getting course registration status:", error);
    res.status(500).json({
      message: "Server error while checking course registration status",
    });
  }
};

// Return distinct year_admitted values from student table with student counts.
// Used by the "Allowed Cohorts" checkbox list on the System Configuration page.
exports.getKnownAdmissionYears = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT year_admitted AS year, COUNT(*)::int AS student_count
       FROM student
       WHERE year_admitted IS NOT NULL
       GROUP BY year_admitted
       ORDER BY year_admitted DESC`
    );

    res.status(200).json({
      message: "Known admission years retrieved successfully",
      years: result.rows,
    });
  } catch (error) {
    console.error("❌ Error getting known admission years:", error);
    res.status(500).json({
      message: "Server error while retrieving known admission years",
    });
  }
};
