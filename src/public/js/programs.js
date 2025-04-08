// DOM elements will be initialized in the DOMContentLoaded event
let programsTableBody;
let addProgramBtn;
let saveProgramBtn;
let programSearchInput;
let programSchoolFilter;
let programStatusFilter;

// Program form elements
let programForm;
let programIdInput;
let programSchoolInput;
let programTypeInput;
let programLongNameInput;
let programShortNameInput;
let programDurationInput;
let programCreditsInput;
let programDeptLongNameInput;
let programDeptShortNameInput;
let programSpecLongNameInput;
let programSpecShortNameInput;
let programDescriptionInput;
let programIsActiveInput;

// Modal elements
let programModal;
let programDeleteModal;
let programModalLabel;
let confirmProgramDeleteBtn;
let programDeleteCode;
let programDeleteName;

// Initialize programs functionality
document.addEventListener("DOMContentLoaded", () => {
  console.log("programs.js: DOM loaded");

  // Initialize DOM elements
  programsTableBody = document.getElementById("programs-table");
  addProgramBtn = document.getElementById("add-program-btn");
  saveProgramBtn = document.getElementById("save-program-btn");
  programSearchInput = document.getElementById("program-search-input");
  programSchoolFilter = document.getElementById("program-school-filter");
  programStatusFilter = document.getElementById("program-status-filter");

  // Initialize form elements
  programForm = document.getElementById("program-form");
  programIdInput = document.getElementById("program-id-field");
  programSchoolInput = document.getElementById("program-school-field");
  programTypeInput = document.getElementById("program-type-field");
  programLongNameInput = document.getElementById("program-long-name-field");
  programShortNameInput = document.getElementById("program-short-name-field");
  programDurationInput = document.getElementById("program-duration-field");
  programCreditsInput = document.getElementById("program-credits-field");
  programDeptLongNameInput = document.getElementById(
    "program-dept-long-name-field"
  );
  programDeptShortNameInput = document.getElementById(
    "program-dept-short-name-field"
  );
  programSpecLongNameInput = document.getElementById(
    "program-spec-long-name-field"
  );
  programSpecShortNameInput = document.getElementById(
    "program-spec-short-name-field"
  );
  programDescriptionInput = document.getElementById(
    "program-description-field"
  );
  programIsActiveInput = document.getElementById("program-is-active-field");

  // Initialize modal elements
  programModalLabel = document.getElementById("programModalLabel");
  programDeleteCode = document.getElementById("program-delete-code");
  programDeleteName = document.getElementById("program-delete-name");
  confirmProgramDeleteBtn = document.getElementById(
    "confirm-program-delete-btn"
  );

  // Initialize Bootstrap modal objects
  const programModalElement = document.getElementById("programModal");
  const programDeleteModalElement =
    document.getElementById("programDeleteModal");

  if (programModalElement) {
    programModal = new bootstrap.Modal(programModalElement);
  }

  if (programDeleteModalElement) {
    programDeleteModal = new bootstrap.Modal(programDeleteModalElement);
  }

  // Setup event listeners
  if (addProgramBtn) {
    console.log("programs.js: Add program button found");
    addProgramBtn.addEventListener("click", handleAddProgram);
  }

  if (saveProgramBtn) {
    saveProgramBtn.addEventListener("click", handleSaveProgram);
  }

  if (confirmProgramDeleteBtn) {
    confirmProgramDeleteBtn.addEventListener(
      "click",
      handleProgramDeleteConfirm
    );
  }

  if (programSearchInput) {
    programSearchInput.addEventListener("input", filterPrograms);
  }

  if (programSchoolFilter) {
    programSchoolFilter.addEventListener("change", filterPrograms);
  }

  if (programStatusFilter) {
    programStatusFilter.addEventListener("change", filterPrograms);
  }

  // Initial load of schools dropdown for filter
  loadSchoolsDropdown();

  // Initial load of programs when the page loads
  const programsLink = document.getElementById("programs-link");
  if (programsLink) {
    programsLink.addEventListener("click", () => {
      loadPrograms();
    });
  }
});

// Load all schools for dropdowns
function loadSchoolsDropdown() {
  console.log("programs.js: Loading schools for dropdowns");

  fetch(`${window.API_URL}/schools`, {
    headers: {
      Authorization: localStorage.getItem("token"),
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to load schools");
      }
      return response.json();
    })
    .then((schools) => {
      // Populate school filter dropdown
      if (programSchoolFilter) {
        let options = '<option value="all">All Schools</option>';
        schools.forEach((school) => {
          options += `<option value="${school.school_id}">${school.school_long_name}</option>`;
        });
        programSchoolFilter.innerHTML = options;
      }

      // Populate school select in program form
      if (programSchoolInput) {
        let options = '<option value="">Select a school</option>';
        schools.forEach((school) => {
          if (school.is_active) {
            options += `<option value="${school.school_id}">${school.school_long_name}</option>`;
          }
        });
        programSchoolInput.innerHTML = options;
      }
    })
    .catch((error) => {
      console.error("Load schools error:", error);
      showAlert("Failed to load schools. Please try again.", "danger");
    });
}

// Load all programs from the API
function loadPrograms() {
  console.log("programs.js: Loading programs");

  // Show loading state
  if (programsTableBody) {
    programsTableBody.innerHTML =
      '<tr><td colspan="8" class="text-center">Loading programs...</td></tr>';
  }

  fetch(`${window.API_URL}/programs`, {
    headers: {
      Authorization: localStorage.getItem("token"),
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to load programs");
      }
      return response.json();
    })
    .then((programs) => {
      if (programs.length === 0) {
        if (programsTableBody) {
          programsTableBody.innerHTML =
            '<tr><td colspan="8" class="text-center">No programs found. Add a new program to get started.</td></tr>';
        }
        return;
      }

      // Update the dashboard counter
      const programsCount = document.getElementById("programs-count");
      if (programsCount) {
        programsCount.textContent = programs.length;
      }

      // Render programs
      renderPrograms(programs);
    })
    .catch((error) => {
      console.error("Load programs error:", error);
      if (programsTableBody) {
        programsTableBody.innerHTML =
          '<tr><td colspan="8" class="text-center text-danger">Error loading programs. Please try again.</td></tr>';
      }
      showAlert(
        "Failed to load programs. Please refresh the page or try again later.",
        "danger"
      );
    });
}

// Render programs in the table
function renderPrograms(programs) {
  if (!programsTableBody) {
    console.error("Programs table body element not found");
    return;
  }

  // Apply filters if any
  const searchTerm = programSearchInput
    ? programSearchInput.value.toLowerCase().trim()
    : "";
  const schoolFilter = programSchoolFilter ? programSchoolFilter.value : "all";
  const statusFilter = programStatusFilter ? programStatusFilter.value : "all";

  const filteredPrograms = programs.filter((program) => {
    // Apply school filter
    if (
      schoolFilter !== "all" &&
      program.school_id.toString() !== schoolFilter
    ) {
      return false;
    }

    // Apply status filter
    if (
      statusFilter !== "all" &&
      ((statusFilter === "active" && !program.is_active) ||
        (statusFilter === "inactive" && program.is_active))
    ) {
      return false;
    }

    // Apply search filter
    if (searchTerm) {
      return (
        program.program_code.toLowerCase().includes(searchTerm) ||
        program.program_name_long.toLowerCase().includes(searchTerm) ||
        program.program_name_short.toLowerCase().includes(searchTerm) ||
        program.school_long_name.toLowerCase().includes(searchTerm)
      );
    }

    return true;
  });

  if (filteredPrograms.length === 0) {
    programsTableBody.innerHTML =
      '<tr><td colspan="8" class="text-center">No programs match your filters.</td></tr>';
    return;
  }

  // Clear previous content
  programsTableBody.innerHTML = "";

  // Add each program to the table
  filteredPrograms.forEach((program) => {
    console.log("Program duration:", program.duration_years, "Type:", typeof program.duration_years);
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${program.program_code}</td>
      <td>${program.school_long_name}</td>
      <td>
        <strong>${program.program_name_short}</strong><br>
        <small>${program.program_name_long}</small>
      </td>
      <td>${program.type}</td>
 <td>${program.duration_years} ${
      program.duration_years === 1 ? "year" : "years"
    }</td>
      <td>${program.total_credits}</td>
      <td>
        <span class="badge ${
          program.is_active ? "bg-success" : "bg-danger"
        } status-badge">
          ${program.is_active ? "Active" : "Inactive"}
        </span>
      </td>
      <td>
        <button class="btn btn-sm btn-primary action-btn edit-program-btn" data-id="${
          program.program_id
        }">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-${
          program.is_active ? "warning" : "success"
        } action-btn toggle-status-btn" data-id="${
      program.program_id
    }" data-active="${program.is_active}">
          <i class="fas fa-${program.is_active ? "pause" : "play"}"></i>
        </button>
        <button class="btn btn-sm btn-danger action-btn delete-program-btn" data-id="${
          program.program_id
        }" data-code="${program.program_code}" data-name="${
      program.program_name_long
    }">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;

    programsTableBody.appendChild(row);
  });

  // Add event listeners to buttons
  addProgramButtonListeners();
}

// Add event listeners to program action buttons
function addProgramButtonListeners() {
  console.log("Adding program button listeners");

  // Edit program buttons
  const editButtons = document.querySelectorAll(".edit-program-btn");
  console.log(`Found ${editButtons.length} edit buttons`);

  editButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const programId = button.getAttribute("data-id");
      console.log(`Edit button clicked for program ID: ${programId}`);
      openEditProgramModal(programId);
    });
  });

  // Toggle status buttons
  const toggleButtons = document.querySelectorAll(".toggle-status-btn");
  console.log(`Found ${toggleButtons.length} toggle buttons`);

  toggleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const programId = button.getAttribute("data-id");
      const isActive = button.getAttribute("data-active") === "true";
      console.log(
        `Toggle button clicked for program ID: ${programId}, current status: ${isActive}`
      );
      toggleProgramStatus(programId, !isActive);
    });
  });

  // Delete program buttons
  const deleteButtons = document.querySelectorAll(".delete-program-btn");
  console.log(`Found ${deleteButtons.length} delete buttons`);

  deleteButtons.forEach((button) => {
    const programId = button.getAttribute("data-id");
    const programCode = button.getAttribute("data-code");
    const programName = button.getAttribute("data-name");
    console.log(
      `Setting up delete button for program: ${programId}, ${programCode}, ${programName}`
    );

    button.addEventListener("click", () => {
      console.log(`Delete button clicked for program ID: ${programId}`);
      openProgramDeleteModal(programId, programCode, programName);
    });
  });
}

// Filter programs based on search, school, and status
function filterPrograms() {
  // Get all programs again and apply filters on the client side
  // This avoids making new API calls for simple filtering
  fetch(`${window.API_URL}/programs`, {
    headers: {
      Authorization: localStorage.getItem("token"),
    },
  })
    .then((response) => response.json())
    .then((programs) => {
      renderPrograms(programs);
    })
    .catch((error) => {
      console.error("Filter programs error:", error);
    });
}

// Handle add program button click
function handleAddProgram() {
  // Reset form
  if (programForm) programForm.reset();
  if (programIdInput) programIdInput.value = "";

  // Update modal title
  if (programModalLabel) programModalLabel.textContent = "Add New Program";

  // Show modal
  if (programModal) programModal.show();
}

// Open edit program modal
function openEditProgramModal(programId) {
  console.log(`Opening edit modal for program ID: ${programId}`);

  // Get program details
  fetch(`${window.API_URL}/programs/${programId}`, {
    headers: {
      Authorization: localStorage.getItem("token"),
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to get program details");
      }
      return response.json();
    })
    .then((program) => {
      console.log(`Program data received:`, program);

      // Fill form with program data
      if (programIdInput) programIdInput.value = program.program_id;
      if (programSchoolInput) programSchoolInput.value = program.school_id;
      if (programTypeInput) programTypeInput.value = program.type;
      if (programLongNameInput)
        programLongNameInput.value = program.program_name_long;
      if (programShortNameInput)
        programShortNameInput.value = program.program_name_short;
      if (programDurationInput)
        programDurationInput.value = program.duration_years;
      if (programCreditsInput)
        programCreditsInput.value = program.total_credits;
      if (programDeptLongNameInput)
        programDeptLongNameInput.value = program.department_name_long || "";
      if (programDeptShortNameInput)
        programDeptShortNameInput.value = program.department_name_short || "";
      if (programSpecLongNameInput)
        programSpecLongNameInput.value = program.specialization_name_long || "";
      if (programSpecShortNameInput)
        programSpecShortNameInput.value =
          program.specialization_name_short || "";
      if (programDescriptionInput)
        programDescriptionInput.value = program.description || "";
      if (programIsActiveInput)
        programIsActiveInput.checked = program.is_active;

      // Update modal title
      if (programModalLabel) programModalLabel.textContent = "Edit Program";

      // Show modal
      if (programModal) programModal.show();
    })
    .catch((error) => {
      console.error("Get program details error:", error);
      showAlert("Failed to load program details. Please try again.", "danger");
    });
}

// Open program delete modal
function openProgramDeleteModal(programId, programCode, programName) {
  console.log(
    `Opening delete modal for program: ${programId}, ${programCode}, ${programName}`
  );

  // Set the values
  if (programDeleteCode) programDeleteCode.textContent = programCode;
  if (programDeleteName) programDeleteName.textContent = programName;

  // Set the program ID on the delete button
  if (confirmProgramDeleteBtn) {
    confirmProgramDeleteBtn.setAttribute("data-id", programId);
  }

  // Show the modal
  if (programDeleteModal) {
    programDeleteModal.show();
  } else {
    console.error("Program delete modal not initialized");
    // Try to create it if it doesn't exist
    const modalElement = document.getElementById("programDeleteModal");
    if (modalElement) {
      console.log("Found modal element, creating Bootstrap modal");
      programDeleteModal = new bootstrap.Modal(modalElement);
      programDeleteModal.show();
    } else {
      console.error("Modal element not found in DOM");
    }
  }
}

// Handle save program button click
function handleSaveProgram() {
  // Get form values
  const programId = programIdInput ? programIdInput.value : "";
  const schoolId = programSchoolInput ? programSchoolInput.value : "";
  const type = programTypeInput ? programTypeInput.value : "";
  const programLongName = programLongNameInput
    ? programLongNameInput.value.trim()
    : "";
  const programShortName = programShortNameInput
    ? programShortNameInput.value.trim()
    : "";
  const durationYears = programDurationInput ? programDurationInput.value : "";
  const totalCredits = programCreditsInput ? programCreditsInput.value : "";
  const deptLongName = programDeptLongNameInput
    ? programDeptLongNameInput.value.trim()
    : "";
  const deptShortName = programDeptShortNameInput
    ? programDeptShortNameInput.value.trim()
    : "";
  const specLongName = programSpecLongNameInput
    ? programSpecLongNameInput.value.trim()
    : "";
  const specShortName = programSpecShortNameInput
    ? programSpecShortNameInput.value.trim()
    : "";
  const description = programDescriptionInput
    ? programDescriptionInput.value.trim()
    : "";
  const isActive = programIsActiveInput ? programIsActiveInput.checked : true;

  // Validate required fields
  if (
    !schoolId ||
    !type ||
    !programLongName ||
    !programShortName ||
    !durationYears ||
    !totalCredits
  ) {
    showAlert("Please fill all required fields.", "danger");
    return;
  }

  // Prepare data
  const programData = {
    school_id: schoolId,
    type: type,
    program_name_long: programLongName,
    program_name_short: programShortName,
    duration_years: durationYears,
    total_credits: totalCredits,
    department_name_long: deptLongName || null,
    department_name_short: deptShortName || null,
    specialization_name_long: specLongName || null,
    specialization_name_short: specShortName || null,
    description: description || null,
    is_active: isActive,
  };

  // Show loading state
  if (saveProgramBtn) {
    saveProgramBtn.disabled = true;
    saveProgramBtn.innerHTML =
      '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
  }

  // Determine if creating or updating
  const method = programId ? "PUT" : "POST";
  const url = programId
    ? `${window.API_URL}/programs/${programId}`
    : `${window.API_URL}/programs`;

  fetch(url, {
    method: method,
    headers: {
      "Content-Type": "application/json",
      Authorization: localStorage.getItem("token"),
    },
    body: JSON.stringify(programData),
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((data) => {
          throw new Error(data.message || "Failed to save program");
        });
      }
      return response.json();
    })
    .then((data) => {
      // Hide modal
      if (programModal) programModal.hide();

      // Show success message
      showAlert(data.message, "success");

      // Reload programs
      loadPrograms();
    })
    .catch((error) => {
      console.error("Save program error:", error);
      showAlert(error.message, "danger");
    })
    .finally(() => {
      // Reset button state
      if (saveProgramBtn) {
        saveProgramBtn.disabled = false;
        saveProgramBtn.innerHTML = "Save";
      }
    });
}

// Toggle program status
function toggleProgramStatus(programId, newStatus) {
  fetch(`${window.API_URL}/programs/${programId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: localStorage.getItem("token"),
    },
    body: JSON.stringify({ is_active: newStatus }),
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((data) => {
          throw new Error(data.message || "Failed to update program status");
        });
      }
      return response.json();
    })
    .then((data) => {
      // Show success message
      showAlert(data.message, "success");

      // Reload programs
      loadPrograms();
    })
    .catch((error) => {
      console.error("Toggle status error:", error);
      showAlert(error.message, "danger");
    });
}

// Handle confirm delete button click
function handleProgramDeleteConfirm() {
  if (!confirmProgramDeleteBtn) {
    console.error("Confirm program delete button not found");
    return;
  }

  const programId = confirmProgramDeleteBtn.getAttribute("data-id");
  console.log(`Confirming delete for program ID: ${programId}`);

  // Show loading state
  confirmProgramDeleteBtn.disabled = true;
  confirmProgramDeleteBtn.innerHTML =
    '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Deleting...';

  console.log(`Delete URL: ${window.API_URL}/programs/${programId}`);
  fetch(`${window.API_URL}/programs/${programId}`, {
    method: "DELETE",
    headers: {
      Authorization: localStorage.getItem("token"),
    },
  })
    .then((response) => {
      console.log(`Delete program response status: ${response.status}`);
      if (!response.ok) {
        return response.json().then((data) => {
          console.log(`Delete error response:`, data);
          throw new Error(data.message || "Failed to delete program");
        });
      }
      return response.json();
    })
    .then((data) => {
      console.log(`Delete success response:`, data);
      // Hide modal
      if (programDeleteModal) programDeleteModal.hide();

      // Show success message
      showAlert(data.message, "success");

      // Reload programs
      loadPrograms();
    })
    .catch((error) => {
      console.error("Delete program error:", error);
      showAlert(error.message, "danger");

      // Hide modal
      if (programDeleteModal) programDeleteModal.hide();
    })
    .finally(() => {
      // Reset button state
      if (confirmProgramDeleteBtn) {
        confirmProgramDeleteBtn.disabled = false;
        confirmProgramDeleteBtn.innerHTML = "Delete";
      }
    });
}

// Show alert message
// Show alert message
function showAlert(message, type = "info", timeout = 5000) {
  // Use local implementation directly to avoid recursion
  const alertContainer = document.getElementById("alert-container");
  if (alertContainer) {
    const alertDiv = document.createElement("div");
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      `;

    alertContainer.appendChild(alertDiv);

    if (timeout) {
      setTimeout(() => {
        alertDiv.classList.remove("show");
        setTimeout(() => alertDiv.remove(), 150);
      }, timeout);
    }
  } else {
    console.log(message);
  }
}
