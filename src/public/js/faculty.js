// DOM elements will be initialized in the DOMContentLoaded event
let facultyTableBody;
let addFacultyBtn;
let saveFacultyBtn;
let facultySearchInput;
let facultySchoolFilter;
let facultyStatusFilter;

// Faculty form elements
let facultyForm;
let facultyIdInput;
let facultyNameInput;
let facultyEmployeeIdInput;
let facultyDesignationInput;
let facultySchoolInput;
let facultyEmailInput;
let facultyIsActiveInput;

// Modal elements
let facultyModal;
let facultyDeleteModal;
let facultyModalLabel;
let confirmFacultyDeleteBtn;
let facultyDeleteName;
let facultyDeleteEmployeeId;

// Initialize faculty functionality
document.addEventListener("DOMContentLoaded", () => {
  console.log("faculty.js: DOM loaded");

  // Initialize DOM elements
  facultyTableBody = document.getElementById("faculty-table");
  addFacultyBtn = document.getElementById("add-faculty-btn");
  saveFacultyBtn = document.getElementById("save-faculty-btn");
  facultySearchInput = document.getElementById("faculty-search-input");
  facultySchoolFilter = document.getElementById("faculty-school-filter");
  facultyStatusFilter = document.getElementById("faculty-status-filter");

  // Initialize form elements
  facultyForm = document.getElementById("faculty-form");
  facultyIdInput = document.getElementById("faculty-id-field");
  facultyNameInput = document.getElementById("faculty-name-field");
  facultyEmployeeIdInput = document.getElementById("faculty-employee-id-field");
  facultyDesignationInput = document.getElementById(
    "faculty-designation-field"
  );
  facultySchoolInput = document.getElementById("faculty-school-field");
  facultyEmailInput = document.getElementById("faculty-email-field");
  facultyIsActiveInput = document.getElementById("faculty-is-active-field");

  // Initialize modal elements
  facultyModalLabel = document.getElementById("facultyModalLabel");
  facultyDeleteName = document.getElementById("faculty-delete-name");
  facultyDeleteEmployeeId = document.getElementById(
    "faculty-delete-employee-id"
  );
  confirmFacultyDeleteBtn = document.getElementById(
    "confirm-faculty-delete-btn"
  );

  // Initialize Bootstrap modal objects
  const facultyModalElement = document.getElementById("facultyModal");
  const facultyDeleteModalElement =
    document.getElementById("facultyDeleteModal");

  if (facultyModalElement) {
    facultyModal = new bootstrap.Modal(facultyModalElement);
  }

  if (facultyDeleteModalElement) {
    facultyDeleteModal = new bootstrap.Modal(facultyDeleteModalElement);
  }

  // Setup event listeners
  if (addFacultyBtn) {
    console.log("faculty.js: Add faculty button found");
    addFacultyBtn.addEventListener("click", handleAddFaculty);
  }

  if (saveFacultyBtn) {
    saveFacultyBtn.addEventListener("click", handleSaveFaculty);
  }

  if (confirmFacultyDeleteBtn) {
    confirmFacultyDeleteBtn.addEventListener(
      "click",
      handleFacultyDeleteConfirm
    );
  }

  if (facultySearchInput) {
    facultySearchInput.addEventListener("input", filterFaculty);
  }

  if (facultySchoolFilter) {
    facultySchoolFilter.addEventListener("change", filterFaculty);
  }

  if (facultyStatusFilter) {
    facultyStatusFilter.addEventListener("change", filterFaculty);
  }

  // Setup navigation listener
  const facultyLink = document.getElementById("faculty-link");
  if (facultyLink) {
    facultyLink.addEventListener("click", () => {
      // Show faculty page
      document.querySelectorAll(".content-page").forEach((page) => {
        page.classList.remove("active");
      });
      document.getElementById("faculty-page").classList.add("active");

      // Update page title
      document.getElementById("page-title").textContent = "Faculty";

      // Load faculty data
      loadFaculty();

      // Load schools for the dropdown
      loadSchoolsForDropdown();
    });
  }
});

// Load all faculty from the API
function loadFaculty() {
  console.log("faculty.js: Loading faculty");

  // Show loading state
  if (facultyTableBody) {
    facultyTableBody.innerHTML =
      '<tr><td colspan="7" class="text-center">Loading faculty...</td></tr>';
  }

  fetch(`${window.API_URL}/faculty`, {
    headers: {
      Authorization: localStorage.getItem("token"),
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to load faculty");
      }
      return response.json();
    })
    .then((faculty) => {
      if (faculty.length === 0) {
        if (facultyTableBody) {
          facultyTableBody.innerHTML =
            '<tr><td colspan="7" class="text-center">No faculty found. Add a new faculty member to get started.</td></tr>';
        }
        return;
      }

      // Render faculty
      renderFaculty(faculty);
    })
    .catch((error) => {
      console.error("Load faculty error:", error);
      if (facultyTableBody) {
        facultyTableBody.innerHTML =
          '<tr><td colspan="7" class="text-center text-danger">Error loading faculty. Please try again.</td></tr>';
      }
      window.showAlert(
        "Failed to load faculty. Please refresh the page or try again later.",
        "danger"
      );
    });
}

// Load schools for dropdown
function loadSchoolsForDropdown() {
  fetch(`${window.API_URL}/schools`, {
    headers: {
      Authorization: localStorage.getItem("token"),
    },
  })
    .then((response) => response.json())
    .then((schools) => {
      // Populate school filter dropdown
      if (facultySchoolFilter) {
        // Keep the first "All Schools" option
        facultySchoolFilter.innerHTML =
          '<option value="all">All Schools</option>';

        schools
          .filter((school) => school.is_active)
          .forEach((school) => {
            const option = document.createElement("option");
            option.value = school.school_id;
            option.textContent = `${school.school_short_name} (${school.school_code})`;
            facultySchoolFilter.appendChild(option);
          });
      }

      // Populate faculty form school dropdown
      if (facultySchoolInput) {
        // Clear previous options except the first one
        facultySchoolInput.innerHTML =
          '<option value="">Select a school</option>';

        schools
          .filter((school) => school.is_active)
          .forEach((school) => {
            const option = document.createElement("option");
            option.value = school.school_id;
            option.textContent = `${school.school_short_name} (${school.school_code})`;
            facultySchoolInput.appendChild(option);
          });
      }
    })
    .catch((error) => {
      console.error("Load schools error:", error);
      window.showAlert("Failed to load schools for dropdown.", "danger");
    });
}

// Render faculty in the table
function renderFaculty(facultyList) {
  if (!facultyTableBody) {
    console.error("Faculty table body element not found");
    return;
  }

  // Apply filters if any
  const searchTerm = facultySearchInput
    ? facultySearchInput.value.toLowerCase().trim()
    : "";
  const schoolFilter = facultySchoolFilter ? facultySchoolFilter.value : "all";
  const statusFilter = facultyStatusFilter ? facultyStatusFilter.value : "all";

  const filteredFaculty = facultyList.filter((faculty) => {
    // Apply school filter
    if (schoolFilter !== "all" && faculty.school_id != schoolFilter) {
      return false;
    }

    // Apply status filter
    if (
      statusFilter !== "all" &&
      ((statusFilter === "active" && !faculty.is_active) ||
        (statusFilter === "inactive" && faculty.is_active))
    ) {
      return false;
    }

    // Apply search filter
    if (searchTerm) {
      return (
        faculty.name.toLowerCase().includes(searchTerm) ||
        (faculty.designation &&
          faculty.designation.toLowerCase().includes(searchTerm)) ||
        faculty.employee_id.toString().includes(searchTerm) ||
        (faculty.email && faculty.email.toLowerCase().includes(searchTerm)) ||
        (faculty.school_short_name &&
          faculty.school_short_name.toLowerCase().includes(searchTerm))
      );
    }

    return true;
  });

  if (filteredFaculty.length === 0) {
    facultyTableBody.innerHTML =
      '<tr><td colspan="7" class="text-center">No faculty match your filters.</td></tr>';
    return;
  }

  // Clear previous content
  facultyTableBody.innerHTML = "";

  // Add each faculty to the table
  filteredFaculty.forEach((faculty) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${faculty.name}</td>
      <td>${faculty.employee_id}</td>
      <td>${faculty.designation || "-"}</td>
      <td>${faculty.school_short_name || "-"}</td>
      <td>${faculty.email || "-"}</td>
      <td>
        <span class="badge ${
          faculty.is_active ? "bg-success" : "bg-danger"
        } status-badge">
          ${faculty.is_active ? "Active" : "Inactive"}
        </span>
      </td>
      <td>
        <button class="btn btn-sm btn-primary action-btn edit-faculty-btn" data-id="${
          faculty.faculty_id
        }">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-${
          faculty.is_active ? "warning" : "success"
        } action-btn toggle-status-btn" 
                data-id="${faculty.faculty_id}" data-active="${
      faculty.is_active
    }">
          <i class="fas fa-${faculty.is_active ? "pause" : "play"}"></i>
        </button>
        <button class="btn btn-sm btn-danger action-btn delete-faculty-btn" 
                data-id="${faculty.faculty_id}" 
                data-name="${faculty.name}" 
                data-employee-id="${faculty.employee_id}">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;

    facultyTableBody.appendChild(row);
  });

  // Add event listeners to buttons
  addFacultyButtonListeners();
}

// Filter faculty based on search, school, and status
function filterFaculty() {
  // Get all faculty again and apply filters on the client side
  fetch(`${window.API_URL}/faculty`, {
    headers: {
      Authorization: localStorage.getItem("token"),
    },
  })
    .then((response) => response.json())
    .then((faculty) => {
      renderFaculty(faculty);
    })
    .catch((error) => {
      console.error("Filter faculty error:", error);
    });
}

// Add event listeners to faculty action buttons
function addFacultyButtonListeners() {
  console.log("Adding faculty button listeners");

  // Edit faculty buttons
  const editButtons = document.querySelectorAll(".edit-faculty-btn");
  console.log(`Found ${editButtons.length} edit buttons`);

  editButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const facultyId = button.getAttribute("data-id");
      console.log(`Edit button clicked for faculty ID: ${facultyId}`);
      openEditFacultyModal(facultyId);
    });
  });

  // Toggle status buttons
  const toggleButtons = document.querySelectorAll(".toggle-status-btn");
  console.log(`Found ${toggleButtons.length} toggle buttons`);

  toggleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const facultyId = button.getAttribute("data-id");
      const isActive = button.getAttribute("data-active") === "true";
      console.log(
        `Toggle button clicked for faculty ID: ${facultyId}, current status: ${isActive}`
      );
      toggleFacultyStatus(facultyId, !isActive);
    });
  });

  // Delete faculty buttons
  const deleteButtons = document.querySelectorAll(".delete-faculty-btn");
  console.log(`Found ${deleteButtons.length} delete buttons`);

  deleteButtons.forEach((button) => {
    const facultyId = button.getAttribute("data-id");
    const facultyName = button.getAttribute("data-name");
    const employeeId = button.getAttribute("data-employee-id");

    button.addEventListener("click", () => {
      console.log(`Delete button clicked for faculty ID: ${facultyId}`);
      openFacultyDeleteModal(facultyId, facultyName, employeeId);
    });
  });
}

// Handle add faculty button click
function handleAddFaculty() {
  // Reset form
  if (facultyForm) facultyForm.reset();
  if (facultyIdInput) facultyIdInput.value = "";

  // Update modal title
  if (facultyModalLabel) facultyModalLabel.textContent = "Add New Faculty";

  // Make sure schools dropdown is loaded
  loadSchoolsForDropdown();

  // Show modal
  if (facultyModal) facultyModal.show();
}

// Open edit faculty modal
function openEditFacultyModal(facultyId) {
  console.log(`Opening edit modal for faculty ID: ${facultyId}`);

  // Get faculty details
  fetch(`${window.API_URL}/faculty/${facultyId}`, {
    headers: {
      Authorization: localStorage.getItem("token"),
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to get faculty details");
      }
      return response.json();
    })
    .then((faculty) => {
      console.log(`Faculty data received:`, faculty);

      // Make sure schools dropdown is loaded before populating form
      loadSchoolsForDropdown();

      // Fill form with faculty data
      if (facultyIdInput) facultyIdInput.value = faculty.faculty_id;
      if (facultyNameInput) facultyNameInput.value = faculty.name;
      if (facultyEmployeeIdInput)
        facultyEmployeeIdInput.value = faculty.employee_id;
      if (facultyDesignationInput)
        facultyDesignationInput.value = faculty.designation || "";
      if (facultySchoolInput) facultySchoolInput.value = faculty.school_id;
      if (facultyEmailInput) facultyEmailInput.value = faculty.email || "";
      if (facultyIsActiveInput)
        facultyIsActiveInput.checked = faculty.is_active;

      // Update modal title
      if (facultyModalLabel) facultyModalLabel.textContent = "Edit Faculty";

      // Show modal
      if (facultyModal) facultyModal.show();
    })
    .catch((error) => {
      console.error("Get faculty details error:", error);
      window.showAlert(
        "Failed to load faculty details. Please try again.",
        "danger"
      );
    });
}

// Open faculty delete modal
function openFacultyDeleteModal(facultyId, facultyName, employeeId) {
  console.log(
    `Opening delete modal for faculty: ${facultyId}, ${facultyName}, ${employeeId}`
  );

  // Set the values
  if (facultyDeleteName) facultyDeleteName.textContent = facultyName;
  if (facultyDeleteEmployeeId) facultyDeleteEmployeeId.textContent = employeeId;

  // Set the faculty ID on the delete button
  if (confirmFacultyDeleteBtn) {
    confirmFacultyDeleteBtn.setAttribute("data-id", facultyId);
  }

  // Show the modal
  if (facultyDeleteModal) {
    facultyDeleteModal.show();
  } else {
    console.error("Faculty delete modal not initialized");
  }
}

// Handle save faculty button click
function handleSaveFaculty() {
  // Get form values
  const facultyId = facultyIdInput ? facultyIdInput.value : "";
  const name = facultyNameInput ? facultyNameInput.value.trim() : "";
  const employeeId = facultyEmployeeIdInput ? facultyEmployeeIdInput.value : "";
  const designation = facultyDesignationInput
    ? facultyDesignationInput.value.trim()
    : "";
  const schoolId = facultySchoolInput ? facultySchoolInput.value : "";
  const email = facultyEmailInput ? facultyEmailInput.value.trim() : "";
  const isActive = facultyIsActiveInput ? facultyIsActiveInput.checked : true;

  // Validate required fields
  if (!name || !employeeId || !schoolId) {
    window.showAlert("Please fill all required fields.", "danger");
    return;
  }

  // Validate field lengths
  if (name.length > 100) {
    window.showAlert("Name must not exceed 100 characters.", "danger");
    return;
  }

  if (designation && designation.length > 50) {
    window.showAlert("Designation must not exceed 50 characters.", "danger");
    return;
  }

  if (email && email.length > 100) {
    window.showAlert("Email must not exceed 100 characters.", "danger");
    return;
  }

  // Prepare data
  const facultyData = {
    name,
    employee_id: parseInt(employeeId),
    designation: designation || null,
    school_id: parseInt(schoolId),
    email: email || null,
    is_active: isActive,
  };

  // Show loading state
  if (saveFacultyBtn) {
    saveFacultyBtn.disabled = true;
    saveFacultyBtn.innerHTML =
      '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
  }

  // Determine if creating or updating
  const method = facultyId ? "PUT" : "POST";
  const url = facultyId
    ? `${window.API_URL}/faculty/${facultyId}`
    : `${window.API_URL}/faculty`;

  fetch(url, {
    method: method,
    headers: {
      "Content-Type": "application/json",
      Authorization: localStorage.getItem("token"),
    },
    body: JSON.stringify(facultyData),
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((data) => {
          throw new Error(data.message || "Failed to save faculty");
        });
      }
      return response.json();
    })
    .then((data) => {
      // Hide modal
      if (facultyModal) facultyModal.hide();

      // Show success message
      window.showAlert(data.message, "success");

      // Reload faculty
      loadFaculty();
    })
    .catch((error) => {
      console.error("Save faculty error:", error);
      window.showAlert(error.message, "danger");
    })
    .finally(() => {
      // Reset button state
      if (saveFacultyBtn) {
        saveFacultyBtn.disabled = false;
        saveFacultyBtn.innerHTML = "Save";
      }
    });
}

// Toggle faculty status
function toggleFacultyStatus(facultyId, newStatus) {
  fetch(`${window.API_URL}/faculty/${facultyId}/status`, {
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
          throw new Error(data.message || "Failed to update faculty status");
        });
      }
      return response.json();
    })
    .then((data) => {
      // Show success message
      window.showAlert(data.message, "success");

      // Reload faculty
      loadFaculty();
    })
    .catch((error) => {
      console.error("Toggle status error:", error);
      window.showAlert(error.message, "danger");
    });
}

// Handle confirm delete button click
function handleFacultyDeleteConfirm() {
  if (!confirmFacultyDeleteBtn) {
    console.error("Confirm faculty delete button not found");
    return;
  }

  const facultyId = confirmFacultyDeleteBtn.getAttribute("data-id");
  console.log(`Confirming delete for faculty ID: ${facultyId}`);

  // Show loading state
  confirmFacultyDeleteBtn.disabled = true;
  confirmFacultyDeleteBtn.innerHTML =
    '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Deleting...';

  fetch(`${window.API_URL}/faculty/${facultyId}`, {
    method: "DELETE",
    headers: {
      Authorization: localStorage.getItem("token"),
    },
  })
    .then((response) => {
      console.log(`Delete faculty response status: ${response.status}`);
      if (!response.ok) {
        return response.json().then((data) => {
          console.log(`Delete error response:`, data);
          throw new Error(data.message || "Failed to delete faculty");
        });
      }
      return response.json();
    })
    .then((data) => {
      console.log(`Delete success response:`, data);
      // Hide modal
      if (facultyDeleteModal) facultyDeleteModal.hide();

      // Show success message
      window.showAlert(data.message, "success");

      // Reload faculty
      loadFaculty();
    })
    .catch((error) => {
      console.error("Delete faculty error:", error);
      window.showAlert(error.message, "danger");

      // Hide modal
      if (facultyDeleteModal) facultyDeleteModal.hide();
    })
    .finally(() => {
      // Reset button state
      if (confirmFacultyDeleteBtn) {
        confirmFacultyDeleteBtn.disabled = false;
        confirmFacultyDeleteBtn.innerHTML = "Delete";
      }
    });
}
