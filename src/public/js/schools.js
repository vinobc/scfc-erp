// DOM elements
const schoolsTableBody = document.getElementById("schools-table-body");
const addSchoolBtn = document.getElementById("add-school-btn");
const saveSchoolBtn = document.getElementById("save-school-btn");
const confirmDeleteBtn = document.getElementById("confirm-delete-btn");
const schoolSearch = document.getElementById("school-search");
const schoolStatusFilter = document.getElementById("school-status-filter");

// School form elements
const schoolForm = document.getElementById("school-form");
const schoolIdInput = document.getElementById("school-id");
const schoolCodeInput = document.getElementById("school-code");
const schoolLongNameInput = document.getElementById("school-long-name");
const schoolShortNameInput = document.getElementById("school-short-name");
const schoolDescriptionInput = document.getElementById("school-description");
const schoolIsActiveInput = document.getElementById("school-is-active");

// Modal elements
const schoolModal = new bootstrap.Modal(document.getElementById("schoolModal"));
const deleteConfirmModal = new bootstrap.Modal(
  document.getElementById("deleteConfirmModal")
);
const schoolModalLabel = document.getElementById("schoolModalLabel");
const deleteSchoolCode = document.getElementById("delete-school-code");
const deleteSchoolName = document.getElementById("delete-school-name");

// Initialize schools functionality
document.addEventListener("DOMContentLoaded", () => {
  // Setup event listeners
  addSchoolBtn.addEventListener("click", handleAddSchool);
  saveSchoolBtn.addEventListener("click", handleSaveSchool);
  confirmDeleteBtn.addEventListener("click", handleConfirmDelete);
  schoolSearch.addEventListener("input", filterSchools);
  schoolStatusFilter.addEventListener("change", filterSchools);

  // Initial load of schools when the page loads
  document.getElementById("schools-link").addEventListener("click", () => {
    loadSchools();
  });
});

// Load all schools from the API
function loadSchools() {
  // Show loading state
  schoolsTableBody.innerHTML =
    '<tr><td colspan="6" class="text-center">Loading schools...</td></tr>';

  fetch(`${API_URL}/schools`, {
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
      if (schools.length === 0) {
        schoolsTableBody.innerHTML =
          '<tr><td colspan="6" class="text-center">No schools found. Add a new school to get started.</td></tr>';
        return;
      }

      // Update the dashboard counter
      document.getElementById("schools-count").textContent = schools.length;

      // Render schools
      renderSchools(schools);
    })
    .catch((error) => {
      console.error("Load schools error:", error);
      schoolsTableBody.innerHTML =
        '<tr><td colspan="6" class="text-center text-danger">Error loading schools. Please try again.</td></tr>';
      showAlert(
        "Failed to load schools. Please refresh the page or try again later.",
        "danger"
      );
    });
}

// Render schools in the table
function renderSchools(schools) {
  // Apply filters if any
  const searchTerm = schoolSearch.value.toLowerCase().trim();
  const statusFilter = schoolStatusFilter.value;

  const filteredSchools = schools.filter((school) => {
    // Apply status filter
    if (
      statusFilter !== "all" &&
      ((statusFilter === "active" && !school.is_active) ||
        (statusFilter === "inactive" && school.is_active))
    ) {
      return false;
    }

    // Apply search filter
    if (searchTerm) {
      return (
        school.school_code.toLowerCase().includes(searchTerm) ||
        school.school_long_name.toLowerCase().includes(searchTerm) ||
        school.school_short_name.toLowerCase().includes(searchTerm)
      );
    }

    return true;
  });

  if (filteredSchools.length === 0) {
    schoolsTableBody.innerHTML =
      '<tr><td colspan="6" class="text-center">No schools match your filters.</td></tr>';
    return;
  }

  // Clear previous content
  schoolsTableBody.innerHTML = "";

  // Add each school to the table
  filteredSchools.forEach((school) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${school.school_code}</td>
      <td>${school.school_long_name}</td>
      <td>${school.school_short_name}</td>
      <td>
        <span class="badge ${
          school.is_active ? "bg-success" : "bg-danger"
        } status-badge">
          ${school.is_active ? "Active" : "Inactive"}
        </span>
      </td>
      <td>${formatDate(school.created_at)}</td>
      <td>
        <button class="btn btn-sm btn-primary action-btn edit-school-btn" data-id="${
          school.school_id
        }">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-${
          school.is_active ? "warning" : "success"
        } action-btn toggle-status-btn" data-id="${
      school.school_id
    }" data-active="${school.is_active}">
          <i class="fas fa-${school.is_active ? "pause" : "play"}"></i>
        </button>
        <button class="btn btn-sm btn-danger action-btn delete-school-btn" data-id="${
          school.school_id
        }" data-code="${school.school_code}" data-name="${
      school.school_long_name
    }">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;

    schoolsTableBody.appendChild(row);
  });

  // Add event listeners to buttons
  addSchoolButtonListeners();
}

// Add event listeners to school action buttons
function addSchoolButtonListeners() {
  // Edit school buttons
  document.querySelectorAll(".edit-school-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const schoolId = button.getAttribute("data-id");
      openEditSchoolModal(schoolId);
    });
  });

  // Toggle status buttons
  document.querySelectorAll(".toggle-status-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const schoolId = button.getAttribute("data-id");
      const isActive = button.getAttribute("data-active") === "true";
      toggleSchoolStatus(schoolId, !isActive);
    });
  });

  // Delete school buttons
  document.querySelectorAll(".delete-school-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const schoolId = button.getAttribute("data-id");
      const schoolCode = button.getAttribute("data-code");
      const schoolName = button.getAttribute("data-name");
      openDeleteConfirmModal(schoolId, schoolCode, schoolName);
    });
  });
}

// Filter schools based on search and status
function filterSchools() {
  // Get all schools again and apply filters on the client side
  // This avoids making new API calls for simple filtering
  fetch(`${API_URL}/schools`, {
    headers: {
      Authorization: localStorage.getItem("token"),
    },
  })
    .then((response) => response.json())
    .then((schools) => {
      renderSchools(schools);
    })
    .catch((error) => {
      console.error("Filter schools error:", error);
    });
}

// Handle add school button click
function handleAddSchool() {
  // Reset form
  schoolForm.reset();
  schoolIdInput.value = "";
  schoolCodeInput.value = "";
  schoolIsActiveInput.checked = true;

  // Hide the school code display for new schools
  document.getElementById("school-code-display-container").style.display =
    "none";

  // Update modal title
  schoolModalLabel.textContent = "Add New School";

  // Show modal
  schoolModal.show();
}

// Open edit school modal
function openEditSchoolModal(schoolId) {
  // Get school details
  fetch(`${API_URL}/schools/${schoolId}`, {
    headers: {
      Authorization: localStorage.getItem("token"),
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to get school details");
      }
      return response.json();
    })
    .then((school) => {
      // Fill form with school data
      schoolIdInput.value = school.school_id;
      schoolCodeInput.value = school.school_code;

      // Show school code in read-only format
      const codeContainer = document.getElementById(
        "school-code-display-container"
      );
      const codeDisplay = document.getElementById("school-code-display");
      codeContainer.style.display = "block";
      codeDisplay.textContent = school.school_code;

      schoolLongNameInput.value = school.school_long_name;
      schoolShortNameInput.value = school.school_short_name;
      schoolDescriptionInput.value = school.description || "";
      schoolIsActiveInput.checked = school.is_active;

      // Update modal title
      schoolModalLabel.textContent = "Edit School";

      // Show modal
      schoolModal.show();
    })
    .catch((error) => {
      console.error("Get school details error:", error);
      showAlert("Failed to load school details. Please try again.", "danger");
    });
}

// Handle save school button click
function handleSaveSchool() {
  // Get form values
  const schoolId = schoolIdInput.value;
  const schoolCode = schoolCodeInput.value.trim();
  const schoolLongName = schoolLongNameInput.value.trim();
  const schoolShortName = schoolShortNameInput.value.trim();
  const schoolDescription = schoolDescriptionInput.value.trim();
  const isActive = schoolIsActiveInput.checked;

  // Validate required fields
  if (!schoolLongName || !schoolShortName) {
    showAlert("Please fill all required fields.", "danger");
    return;
  }

  // Prepare data
  const schoolData = {
    school_long_name: schoolLongName,
    school_short_name: schoolShortName,
    description: schoolDescription,
    is_active: isActive,
  };

  // Include school_code only for updates, not for new records
  if (schoolId && schoolCode) {
    schoolData.school_code = schoolCode;
  }

  // Show loading state
  saveSchoolBtn.disabled = true;
  saveSchoolBtn.innerHTML =
    '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';

  // Determine if creating or updating
  const method = schoolId ? "PUT" : "POST";
  const url = schoolId
    ? `${API_URL}/schools/${schoolId}`
    : `${API_URL}/schools`;

  fetch(url, {
    method: method,
    headers: {
      "Content-Type": "application/json",
      Authorization: localStorage.getItem("token"),
    },
    body: JSON.stringify(schoolData),
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((data) => {
          throw new Error(data.message || "Failed to save school");
        });
      }
      return response.json();
    })
    .then((data) => {
      // Hide modal
      schoolModal.hide();

      // Show success message
      showAlert(data.message, "success");

      // Reload schools
      loadSchools();
    })
    .catch((error) => {
      console.error("Save school error:", error);
      showAlert(error.message, "danger");
    })
    .finally(() => {
      // Reset button state
      saveSchoolBtn.disabled = false;
      saveSchoolBtn.innerHTML = "Save";
    });
}

// Toggle school status
function toggleSchoolStatus(schoolId, newStatus) {
  fetch(`${API_URL}/schools/${schoolId}/status`, {
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
          throw new Error(data.message || "Failed to update school status");
        });
      }
      return response.json();
    })
    .then((data) => {
      // Show success message
      showAlert(data.message, "success");

      // Reload schools
      loadSchools();
    })
    .catch((error) => {
      console.error("Toggle status error:", error);
      showAlert(error.message, "danger");
    });
}

// Open delete confirmation modal
function openDeleteConfirmModal(schoolId, schoolCode, schoolName) {
  // Set confirm modal values
  deleteSchoolCode.textContent = schoolCode;
  deleteSchoolName.textContent = schoolName;

  // Set school ID on the confirm button
  confirmDeleteBtn.setAttribute("data-id", schoolId);

  // Show modal
  deleteConfirmModal.show();
}

// Handle confirm delete button click
function handleConfirmDelete() {
  const schoolId = confirmDeleteBtn.getAttribute("data-id");

  // Show loading state
  confirmDeleteBtn.disabled = true;
  confirmDeleteBtn.innerHTML =
    '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Deleting...';

  fetch(`${API_URL}/schools/${schoolId}`, {
    method: "DELETE",
    headers: {
      Authorization: localStorage.getItem("token"),
    },
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((data) => {
          throw new Error(data.message || "Failed to delete school");
        });
      }
      return response.json();
    })
    .then((data) => {
      // Hide modal
      deleteConfirmModal.hide();

      // Show success message
      showAlert(data.message, "success");

      // Reload schools
      loadSchools();
    })
    .catch((error) => {
      console.error("Delete school error:", error);
      showAlert(error.message, "danger");

      // Hide modal
      deleteConfirmModal.hide();
    })
    .finally(() => {
      // Reset button state
      confirmDeleteBtn.disabled = false;
      confirmDeleteBtn.innerHTML = "Delete";
    });
}
