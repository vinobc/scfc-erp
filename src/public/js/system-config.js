// System Configuration Management
let systemConfig = {};
let knownAdmissionYears = []; // [{year: 2026, student_count: 3247}, ...]

// Initialize system configuration functionality
function initializeSystemConfig() {
  console.log("🔧 Initializing system configuration management...");
  loadSystemConfiguration();
}

// Load all system configuration settings
async function loadSystemConfiguration() {
  try {
    console.log("📋 Loading system configuration...");

    const [configResponse, yearsResponse] = await Promise.all([
      fetch(`${window.API_URL}/system-config`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      }),
      fetch(`${window.API_URL}/system-config/known-admission-years`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      }),
    ]);

    if (!configResponse.ok) {
      throw new Error(
        `HTTP ${configResponse.status}: Failed to load system configuration`
      );
    }
    if (!yearsResponse.ok) {
      throw new Error(
        `HTTP ${yearsResponse.status}: Failed to load known admission years`
      );
    }

    const data = await configResponse.json();
    systemConfig = {};

    // Convert array to object for easier access
    data.config.forEach((item) => {
      systemConfig[item.config_key] = item;
    });

    const yearsData = await yearsResponse.json();
    knownAdmissionYears = yearsData.years || [];

    console.log("✅ System configuration loaded:", systemConfig);
    console.log("✅ Known admission years loaded:", knownAdmissionYears);
    displaySystemConfiguration();
  } catch (error) {
    console.error("❌ Error loading system configuration:", error);
    showAlert(`Error loading system configuration: ${error.message}`, "danger");
  }
}

// Display system configuration interface
function displaySystemConfiguration() {
  const contentDiv = document.getElementById("system-config-content");
  if (!contentDiv) {
    console.error("System config content div not found");
    return;
  }

  const courseRegEnabled =
    systemConfig.course_registration_enabled?.config_value === "true";
  const registrationMessage =
    systemConfig.registration_message?.config_value || "";

  // Parse the allowed cohort array. Missing / invalid → empty array.
  let allowedYears = [];
  try {
    allowedYears = JSON.parse(
      systemConfig.registration_enabled_years?.config_value || "[]"
    );
    if (!Array.isArray(allowedYears)) allowedYears = [];
  } catch (e) {
    allowedYears = [];
  }
  const allowedYearsSet = new Set(allowedYears);

  const courseWithdrawalEnabled =
    systemConfig.course_withdrawal_enabled?.config_value === "true";
  const withdrawalMessage =
    systemConfig.withdrawal_message?.config_value || "";

  contentDiv.innerHTML = `
    <div class="container-fluid">
      <div class="row">
        <div class="col-12">
          <div class="d-flex justify-content-between align-items-center mb-4">
            <h2 class="text-primary mb-0">⚙️ System Configuration</h2>
            <button class="btn btn-outline-primary" onclick="loadSystemConfiguration()">
              🔄 Refresh
            </button>
          </div>

          <!-- Course Registration Settings -->
          <div class="card mb-4">
            <div class="card-header bg-primary text-white">
              <h5 class="card-title mb-0">📚 Course Registration Control</h5>
            </div>
            <div class="card-body">
              <div class="row">
                <div class="col-lg-8">
                  <div class="form-check form-switch mb-3">
                    <input class="form-check-input" type="checkbox" role="switch" 
                           id="courseRegistrationToggle" ${
                             courseRegEnabled ? "checked" : ""
                           }
                           onchange="toggleCourseRegistration()">
                    <label class="form-check-label" for="courseRegistrationToggle">
                      <strong>Enable Course Registration for Students</strong>
                    </label>
                  </div>
                  
                  <div class="mb-3">
                    <label for="registrationMessage" class="form-label">Registration Status Message</label>
                    <textarea class="form-control" id="registrationMessage" rows="2" 
                              placeholder="Message to display to students about registration status">${registrationMessage}</textarea>
                    <div class="form-text">This message will be shown to students when they check registration status.</div>
                  </div>
                  
                  <button class="btn btn-success" onclick="updateRegistrationMessage()">
                    💾 Update Message
                  </button>

                  <hr class="my-4">

                  <h6 class="mb-2">👥 Allowed Cohorts</h6>
                  <p class="form-text mt-0 mb-3">
                    Only students in the ticked cohorts can register (when the master toggle above is ON).
                    Admin proxy always bypasses this check.
                  </p>

                  <div id="cohortCheckboxList">
                    ${
                      knownAdmissionYears.length === 0
                        ? '<div class="text-muted small">No admission years found in the student table.</div>'
                        : knownAdmissionYears
                            .map(
                              (y) => `
                      <div class="form-check">
                        <input class="form-check-input cohort-year-checkbox" type="checkbox"
                               id="cohortYear_${y.year}" value="${y.year}"
                               ${allowedYearsSet.has(y.year) ? "checked" : ""}>
                        <label class="form-check-label" for="cohortYear_${y.year}">
                          <strong>${y.year}</strong> — Batch of ${y.year}
                          <span class="text-muted small">(${y.student_count.toLocaleString()} students)</span>
                        </label>
                      </div>
                    `
                            )
                            .join("")
                    }
                  </div>

                  <div class="mt-3">
                    <button class="btn btn-sm btn-outline-secondary me-1" onclick="quickPickCohorts('all')">All Cohorts</button>
                    <button class="btn btn-sm btn-outline-secondary me-1" onclick="quickPickCohorts('freshmen')">Freshmen Only</button>
                    <button class="btn btn-sm btn-outline-secondary me-1" onclick="quickPickCohorts('seniors')">Seniors Only</button>
                    <button class="btn btn-sm btn-outline-secondary" onclick="quickPickCohorts('none')">Clear</button>
                  </div>

                  <button class="btn btn-success mt-3" onclick="updateAllowedCohorts()">
                    💾 Save Cohorts
                  </button>
                </div>

                <div class="col-lg-4">
                  <div class="alert ${
                    courseRegEnabled ? "alert-success" : "alert-warning"
                  }" role="alert">
                    <h6 class="alert-heading">Current Status</h6>
                    <p class="mb-1">
                      <strong>Registration: </strong>
                      <span class="badge ${
                        courseRegEnabled ? "bg-success" : "bg-danger"
                      }">
                        ${courseRegEnabled ? "✅ ENABLED" : "❌ DISABLED"}
                      </span>
                    </p>
                    <p class="mb-1">
                      <strong>Cohorts open: </strong>
                      <span class="badge bg-info">
                        ${
                          allowedYears.length === 0
                            ? "None"
                            : allowedYears.sort((a, b) => b - a).join(", ")
                        }
                      </span>
                    </p>
                    <small class="text-muted">
                      Last updated: ${
                        systemConfig.course_registration_enabled?.updated_at
                          ? new Date(
                              systemConfig.course_registration_enabled.updated_at
                            ).toLocaleString()
                          : "Never"
                      }
                    </small>
                  </div>

                  <div class="card bg-light">
                    <div class="card-body text-center">
                      <h6 class="card-title">Quick Actions</h6>
                      <button class="btn btn-sm btn-outline-success mb-2 w-100"
                              onclick="quickToggleRegistration(true)">
                        ✅ Enable Registration (all cohorts)
                      </button>
                      <button class="btn btn-sm btn-outline-danger w-100"
                              onclick="quickToggleRegistration(false)"
                              ${!courseRegEnabled ? "disabled" : ""}>
                        ❌ Disable Registration
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Course Withdrawal Settings -->
          <div class="card mb-4">
            <div class="card-header bg-danger text-white">
              <h5 class="card-title mb-0">🚫 Course Withdrawal Control</h5>
            </div>
            <div class="card-body">
              <div class="row">
                <div class="col-lg-8">
                  <div class="form-check form-switch mb-3">
                    <input class="form-check-input" type="checkbox" role="switch" 
                           id="courseWithdrawalToggle" ${
                             courseWithdrawalEnabled ? "checked" : ""
                           }
                           onchange="toggleCourseWithdrawal()">
                    <label class="form-check-label" for="courseWithdrawalToggle">
                      <strong>Enable Course Withdrawal for Students</strong>
                    </label>
                  </div>
                  
                  <div class="mb-3">
                    <label for="withdrawalMessage" class="form-label">Withdrawal Status Message</label>
                    <textarea class="form-control" id="withdrawalMessage" rows="2" 
                              placeholder="Message to display to students about withdrawal status">${withdrawalMessage}</textarea>
                    <div class="form-text">This message will be shown to students when they check withdrawal status.</div>
                  </div>
                  
                  <button class="btn btn-success" onclick="updateWithdrawalMessage()">
                    💾 Update Message
                  </button>
                </div>
                
                <div class="col-lg-4">
                  <div class="alert ${
                    courseWithdrawalEnabled ? "alert-success" : "alert-warning"
                  }" role="alert">
                    <h6 class="alert-heading">Current Status</h6>
                    <p class="mb-1">
                      <strong>Withdrawal: </strong>
                      <span class="badge ${
                        courseWithdrawalEnabled ? "bg-success" : "bg-danger"
                      }">
                        ${courseWithdrawalEnabled ? "✅ ENABLED" : "❌ DISABLED"}
                      </span>
                    </p>
                    <small class="text-muted">
                      Last updated: ${
                        systemConfig.course_withdrawal_enabled?.updated_at
                          ? new Date(
                              systemConfig.course_withdrawal_enabled.updated_at
                            ).toLocaleString()
                          : "Never"
                      }
                    </small>
                  </div>
                  
                  <div class="card bg-light">
                    <div class="card-body text-center">
                      <h6 class="card-title">Quick Actions</h6>
                      <button class="btn btn-sm btn-outline-success mb-2 w-100" 
                              onclick="quickToggleWithdrawal(true)" 
                              ${courseWithdrawalEnabled ? "disabled" : ""}>
                        ✅ Enable Withdrawal
                      </button>
                      <button class="btn btn-sm btn-outline-danger w-100" 
                              onclick="quickToggleWithdrawal(false)"
                              ${!courseWithdrawalEnabled ? "disabled" : ""}>
                        ❌ Disable Withdrawal
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Configuration History/Log -->
          <div class="card">
            <div class="card-header bg-info text-white">
              <h5 class="card-title mb-0">📊 Configuration Summary</h5>
            </div>
            <div class="card-body">
              <div class="table-responsive">
                <table class="table table-sm">
                  <thead>
                    <tr>
                      <th>Setting</th>
                      <th>Current Value</th>
                      <th>Description</th>
                      <th>Last Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${Object.values(systemConfig)
                      .filter(
                        (config) => config.config_key !== "maintenance_mode"
                      ) // Filter out maintenance mode
                      .map(
                        (config) => `
                      <tr>
                        <td><code>${config.config_key}</code></td>
                        <td>
                          <span class="badge ${
                            config.config_value === "true"
                              ? "bg-success"
                              : config.config_value === "false"
                              ? "bg-danger"
                              : "bg-secondary"
                          }">
                            ${config.config_value}
                          </span>
                        </td>
                        <td>${config.config_description || "-"}</td>
                        <td>
                          <small class="text-muted">
                            ${new Date(config.updated_at).toLocaleString()}
                          </small>
                        </td>
                      </tr>
                    `
                      )
                      .join("")}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Toggle course registration
async function toggleCourseRegistration() {
  const toggle = document.getElementById("courseRegistrationToggle");
  const isEnabled = toggle.checked;

  console.log(
    `🔄 Toggling course registration: ${isEnabled ? "ENABLE" : "DISABLE"}`
  );

  try {
    const response = await fetch(
      `${window.API_URL}/system-config/course_registration_enabled`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          configValue: isEnabled.toString(),
          configDescription: `Controls whether students can access course registration functionality`,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        error.message || `HTTP ${response.status}: Update failed`
      );
    }

    const result = await response.json();
    console.log("✅ Course registration toggle updated:", result);

    showAlert(
      `Course registration ${isEnabled ? "enabled" : "disabled"} successfully!`,
      "success"
    );

    // Reload configuration to refresh display
    setTimeout(() => loadSystemConfiguration(), 1000);
  } catch (error) {
    console.error("❌ Error toggling course registration:", error);
    showAlert(`Error updating course registration: ${error.message}`, "danger");

    // Revert toggle on error
    toggle.checked = !isEnabled;
  }
}

// Quick toggle functions
async function quickToggleRegistration(enable) {
  const toggle = document.getElementById("courseRegistrationToggle");
  toggle.checked = enable;
  await toggleCourseRegistration();

  // When enabling via the quick action, also tick all known cohorts so that
  // "Enable Registration" continues to mean "everyone can register" (matches
  // the pre-cohort-feature intent).
  if (enable && knownAdmissionYears.length > 0) {
    const allYears = knownAdmissionYears.map((y) => y.year);
    await saveAllowedCohortsArray(allYears);
  }
}

// Set the cohort checkbox selection by preset.
function quickPickCohorts(preset) {
  const checkboxes = document.querySelectorAll(".cohort-year-checkbox");
  if (checkboxes.length === 0) return;

  // Determine which years to tick.
  const years = Array.from(checkboxes)
    .map((cb) => parseInt(cb.value, 10))
    .sort((a, b) => b - a);
  const freshmanYear = years[0]; // highest = most recent = freshmen

  checkboxes.forEach((cb) => {
    const y = parseInt(cb.value, 10);
    if (preset === "all") cb.checked = true;
    else if (preset === "none") cb.checked = false;
    else if (preset === "freshmen") cb.checked = y === freshmanYear;
    else if (preset === "seniors") cb.checked = y !== freshmanYear;
  });
}

// Read the current cohort selection and save.
async function updateAllowedCohorts() {
  const selected = Array.from(
    document.querySelectorAll(".cohort-year-checkbox:checked")
  ).map((cb) => parseInt(cb.value, 10));
  await saveAllowedCohortsArray(selected);
}

// Helper: persist the given array of years to system_config.
async function saveAllowedCohortsArray(years) {
  try {
    const response = await fetch(
      `${window.API_URL}/system-config/registration_enabled_years`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          configValue: JSON.stringify(years),
          configDescription:
            "JSON array of year_admitted values allowed to register when the master toggle is ON. Empty array blocks all cohorts.",
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        error.message || `HTTP ${response.status}: Update failed`
      );
    }

    showAlert(
      years.length === 0
        ? "Allowed cohorts cleared — no cohorts can register."
        : `Allowed cohorts saved: ${years.sort((a, b) => b - a).join(", ")}`,
      "success"
    );

    // Reload configuration to refresh display
    setTimeout(() => loadSystemConfiguration(), 500);
  } catch (error) {
    console.error("❌ Error saving allowed cohorts:", error);
    showAlert(`Error saving allowed cohorts: ${error.message}`, "danger");
  }
}

// Update registration message
async function updateRegistrationMessage() {
  const messageTextarea = document.getElementById("registrationMessage");
  const message = messageTextarea.value.trim();

  if (!message) {
    showAlert("Please enter a registration message", "warning");
    return;
  }

  console.log(`📝 Updating registration message: ${message}`);

  try {
    const response = await fetch(
      `${window.API_URL}/system-config/registration_message`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          configValue: message,
          configDescription: `Message to display to students about registration status`,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        error.message || `HTTP ${response.status}: Update failed`
      );
    }

    const result = await response.json();
    console.log("✅ Registration message updated:", result);

    showAlert("Registration message updated successfully!", "success");

    // Reload configuration to refresh display
    setTimeout(() => loadSystemConfiguration(), 1000);
  } catch (error) {
    console.error("❌ Error updating registration message:", error);
    showAlert(
      `Error updating registration message: ${error.message}`,
      "danger"
    );
  }
}

// Toggle course withdrawal enabled/disabled
async function toggleCourseWithdrawal() {
  const toggle = document.getElementById("courseWithdrawalToggle");
  const isEnabled = toggle.checked;

  console.log(`🔄 Toggling course withdrawal to: ${isEnabled}`);

  try {
    const response = await fetch(
      `${window.API_URL}/system-config/course_withdrawal_enabled`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: localStorage.getItem("token"),
        },
        body: JSON.stringify({
          configValue: isEnabled.toString(),
          configDescription: `Course withdrawal ${isEnabled ? "enabled" : "disabled"} by admin`,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to update configuration`);
    }

    const result = await response.json();
    console.log("✅ Course withdrawal toggle updated:", result);

    showAlert(
      `Course withdrawal ${isEnabled ? "enabled" : "disabled"} successfully!`,
      isEnabled ? "success" : "warning"
    );

    // Reload configuration to refresh display
    setTimeout(() => loadSystemConfiguration(), 1000);
  } catch (error) {
    console.error("❌ Error toggling course withdrawal:", error);
    // Revert toggle on error
    toggle.checked = !isEnabled;
    showAlert(
      `Error toggling course withdrawal: ${error.message}`,
      "danger"
    );
  }
}

// Quick toggle course withdrawal with confirmation
async function quickToggleWithdrawal(enable) {
  document.getElementById("courseWithdrawalToggle").checked = enable;
  await toggleCourseWithdrawal();
}

// Update withdrawal message
async function updateWithdrawalMessage() {
  const messageTextarea = document.getElementById("withdrawalMessage");
  const message = messageTextarea.value.trim();

  console.log("📝 Updating withdrawal message:", message);

  try {
    const response = await fetch(
      `${window.API_URL}/system-config/withdrawal_message`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: localStorage.getItem("token"),
        },
        body: JSON.stringify({
          configValue: message,
          configDescription: "Custom message for course withdrawal status",
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to update message`);
    }

    const result = await response.json();
    console.log("✅ Withdrawal message updated:", result);

    showAlert("Withdrawal message updated successfully!", "success");

    // Reload configuration to refresh display
    setTimeout(() => loadSystemConfiguration(), 1000);
  } catch (error) {
    console.error("❌ Error updating withdrawal message:", error);
    showAlert(
      `Error updating withdrawal message: ${error.message}`,
      "danger"
    );
  }
}

// Make functions globally available
window.initializeSystemConfig = initializeSystemConfig;
window.loadSystemConfiguration = loadSystemConfiguration;
window.toggleCourseRegistration = toggleCourseRegistration;
window.quickToggleRegistration = quickToggleRegistration;
window.updateRegistrationMessage = updateRegistrationMessage;
window.quickPickCohorts = quickPickCohorts;
window.updateAllowedCohorts = updateAllowedCohorts;
window.toggleCourseWithdrawal = toggleCourseWithdrawal;
window.quickToggleWithdrawal = quickToggleWithdrawal;
window.updateWithdrawalMessage = updateWithdrawalMessage;
