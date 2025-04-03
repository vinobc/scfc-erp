// Debug logging - at the top of semesters.js
(function () {
  const token = localStorage.getItem("token");
  console.log("DEBUG - Token exists:", !!token);
  if (token) {
    console.log("DEBUG - Token starts with:", token.substring(0, 10) + "...");
    try {
      // Try to decode the token payload (just for debugging)
      const payload = JSON.parse(atob(token.split(".")[1]));
      console.log("DEBUG - Token payload:", payload);
    } catch (e) {
      console.log("DEBUG - Could not decode token:", e);
    }
  }
})();

// Make sure we're using the correct API URL
console.log("Semesters.js starting - API URL:", window.API_URL);

// DOM elements will be initialized in the DOMContentLoaded event
let semestersTableBody;
let addSemesterBtn;
let saveSemesterBtn;
let confirmDeleteSemesterBtn;
let semesterSearchInput;
let semesterStatusFilter;

// Semester form elements
let semesterForm;
let semesterIdInput;
let semesterNameInput;
let academicYearInput;
let semesterIsActiveInput;

// Modal elements
let semesterModal;
let deleteSemesterModal;
let semesterModalLabel;
let deleteSemesterName;
let deleteSemesterAcadYear;

// Initialize semesters functionality
document.addEventListener("DOMContentLoaded", () => {
  console.log("semesters.js: DOM loaded");

  // Initialize DOM elements
  semestersTableBody = document.getElementById("semesters-table");
  addSemesterBtn = document.getElementById("add-semester-btn");
  saveSemesterBtn = document.getElementById("save-semester-btn");
  confirmDeleteBtn = document.getElementById("confirm-delete-btn");
  semesterSearchInput = document.getElementById("semester-search-input");
  semesterStatusFilter = document.getElementById("semester-status-filter");

  // Initialize form elements
  semesterForm = document.getElementById("semester-form");
  semesterIdInput = document.getElementById("semester-id-field");
  semesterNameInput = document.getElementById("semester-name-field");
  academicYearInput = document.getElementById("academic-year-field");
  semesterIsActiveInput = document.getElementById("semester-is-active-field");

  // Initialize modal elements
  semesterModalLabel = document.getElementById("semesterModalLabel");
  deleteSemesterName = document.getElementById("delete-semester-name");
  deleteSemesterAcadYear = document.getElementById("delete-semester-acad-year");

  // Initialize Bootstrap modal objects
  const semesterModalElement = document.getElementById("semesterModal");
  confirmDeleteSemesterBtn = document.getElementById("confirm-delete-btn");
  const deleteConfirmModalElement =
    document.getElementById("deleteConfirmModal");
  if (deleteConfirmModalElement) {
    deleteSemesterModal = new bootstrap.Modal(deleteConfirmModalElement);
  }

  if (confirmDeleteSemesterBtn) {
    confirmDeleteSemesterBtn.addEventListener("click", handleConfirmDelete);
  }

  // Setup event listeners
  if (addSemesterBtn) {
    console.log("semesters.js: Add semester button found");
    addSemesterBtn.addEventListener("click", handleAddSemester);
  }

  if (saveSemesterBtn) {
    saveSemesterBtn.addEventListener("click", handleSaveSemester);
  }

  confirmDeleteSemesterBtn = document.getElementById("confirm-delete-btn");
  if (confirmDeleteSemesterBtn) {
    confirmDeleteSemesterBtn.addEventListener("click", handleConfirmDelete);
  }

  if (semesterSearchInput) {
    semesterSearchInput.addEventListener("input", filterSemesters);
  }

  if (semesterStatusFilter) {
    semesterStatusFilter.addEventListener("change", filterSemesters);
  }

  // Initial load of semesters when the page loads
  const semestersLink = document.getElementById("semesters-link");
  if (semestersLink) {
    semestersLink.addEventListener("click", () => {
      loadSemesters();
    });
  }
});

// Load all semesters from the API
function loadSemesters() {
  console.log(
    "semesters.js: Loading semesters from:",
    `${window.API_URL}/semesters`
  );

  const token = localStorage.getItem("token");
  console.log(
    "DEBUG - Sending token:",
    token ? token.substring(0, 10) + "..." : null
  );

  // Show loading state
  if (semestersTableBody) {
    semestersTableBody.innerHTML =
      '<tr><td colspan="5" class="text-center">Loading semesters...</td></tr>';
  }

  fetch(`${window.API_URL}/semesters`, {
    headers: {
      Authorization: token,
    },
  })
    .then((response) => {
      console.log("DEBUG - Response status:", response.status);
      if (!response.ok) {
        throw new Error("Failed to load semesters");
      }
      return response.json();
    })
    .then((semesters) => {
      // Rest of your function...
    })
    .catch((error) => {
      console.error("Load semesters error:", error);
      // Rest of your error handling...
    });
}
// Render semesters in the table
function renderSemesters(semesters) {
  if (!semestersTableBody) {
    console.error("Semesters table body element not found");
    return;
  }

  // Apply filters if any
  const searchTerm = semesterSearchInput
    ? semesterSearchInput.value.toLowerCase().trim()
    : "";
  const statusFilter = semesterStatusFilter
    ? semesterStatusFilter.value
    : "all";

  const filteredSemesters = semesters.filter((semester) => {
    // Apply status filter
    if (
      statusFilter !== "all" &&
      ((statusFilter === "active" && !semester.is_active) ||
        (statusFilter === "inactive" && semester.is_active))
    ) {
      return false;
    }

    // Apply search filter
    if (searchTerm) {
      return (
        semester.semester_name.toLowerCase().includes(searchTerm) ||
        semester.academic_year.toLowerCase().includes(searchTerm)
      );
    }

    return true;
  });

  if (filteredSemesters.length === 0) {
    semestersTableBody.innerHTML =
      '<tr><td colspan="5" class="text-center">No semesters match your filters.</td></tr>';
    return;
  }

  // Clear previous content
  semestersTableBody.innerHTML = "";

  // Add each semester to the table
  filteredSemesters.forEach((semester) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${semester.semester_name}</td>
      <td>${semester.academic_year}</td>
      <td>
        <span class="badge ${
          semester.is_active ? "bg-success" : "bg-danger"
        } status-badge">
          ${semester.is_active ? "Active" : "Inactive"}
        </span>
      </td>
      <td>${formatDate(semester.created_at)}</td>
      <td>
        <button class="btn btn-sm btn-primary action-btn edit-semester-btn" data-id="${
          semester.semester_id
        }">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-${
          semester.is_active ? "warning" : "success"
        } action-btn toggle-status-btn" data-id="${
      semester.semester_id
    }" data-active="${semester.is_active}">
          <i class="fas fa-${semester.is_active ? "pause" : "play"}"></i>
        </button>
        <button class="btn btn-sm btn-danger action-btn delete-semester-btn" data-id="${
          semester.semester_id
        }" data-name="${semester.semester_name}" data-acad-year="${
      semester.academic_year
    }">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;

    semestersTableBody.appendChild(row);
  });

  // Add event listeners to buttons
  addSemesterButtonListeners();
}

// Add event listeners to semester action buttons
function addSemesterButtonListeners() {
  console.log("Adding semester button listeners");

  // Edit semester buttons
  const editButtons = document.querySelectorAll(".edit-semester-btn");
  console.log(`Found ${editButtons.length} edit buttons`);

  editButtons.forEach((button) => {
    console.log("Setting up edit button listener");
    button.addEventListener("click", () => {
      const semesterId = button.getAttribute("data-id");
      console.log(`Edit button clicked for semester ID: ${semesterId}`);
      openEditSemesterModal(semesterId);
    });
  });

  // Toggle status buttons
  document.querySelectorAll(".toggle-status-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const semesterId = button.getAttribute("data-id");
      const isActive = button.getAttribute("data-active") === "true";
      toggleSemesterStatus(semesterId, !isActive);
    });
  });

  // Delete semester buttons
  document.querySelectorAll(".delete-semester-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const semesterId = button.getAttribute("data-id");
      const semesterName = button.getAttribute("data-name");
      const academicYear = button.getAttribute("data-acad-year");
      openDeleteConfirmModal(semesterId, semesterName, academicYear);
    });
  });
}

// Filter semesters based on search and status
function filterSemesters() {
  // Get all semesters again and apply filters on the client side
  // This avoids making new API calls for simple filtering
  fetch(`${window.API_URL}/semesters`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  })
    .then((response) => response.json())
    .then((semesters) => {
      renderSemesters(semesters);
    })
    .catch((error) => {
      console.error("Filter semesters error:", error);
    });
}

// Handle add semester button click
function handleAddSemester() {
  console.log("handleAddSemester called");

  // Reset form
  if (semesterForm) {
    console.log("semesterForm found, resetting");
    semesterForm.reset();
  } else {
    console.log("semesterForm not found");
  }

  if (semesterIdInput) {
    semesterIdInput.value = "";
  }

  // Update modal title
  if (semesterModalLabel) {
    semesterModalLabel.textContent = "Add New Semester";
  } else {
    console.log("semesterModalLabel not found");
  }

  // Show modal
  if (semesterModal) {
    console.log("semesterModal found, showing");
    semesterModal.show();
  } else {
    console.log("semesterModal not found");
    // Try to create it if it doesn't exist
    const semesterModalElement = document.getElementById("semesterModal");
    if (semesterModalElement) {
      console.log("semesterModalElement found, creating Bootstrap modal");
      semesterModal = new bootstrap.Modal(semesterModalElement);
      semesterModal.show();
    } else {
      console.log("semesterModalElement not found");
    }
  }
}

// Open edit semester modal
function openEditSemesterModal(semesterId) {
  console.log(`openEditSemesterModal called for ID: ${semesterId}`);

  // Get semester details
  fetch(`${window.API_URL}/semesters/${semesterId}`, {
    headers: {
      Authorization: localStorage.getItem("token"),
    },
  })
    .then((response) => {
      console.log(`Fetch response status: ${response.status}`);
      if (!response.ok) {
        throw new Error("Failed to get semester details");
      }
      return response.json();
    })
    .then((semester) => {
      console.log(`Semester data received:`, semester);

      // Fill form with semester data
      if (semesterIdInput) {
        semesterIdInput.value = semester.semester_id;
      } else {
        console.log("semesterIdInput not found");
      }
      if (semesterNameInput) semesterNameInput.value = semester.semester_name;
      if (academicYearInput) academicYearInput.value = semester.academic_year;
      if (semesterIsActiveInput)
        semesterIsActiveInput.checked = semester.is_active;

      // Update modal title
      if (semesterModalLabel) semesterModalLabel.textContent = "Edit Semester";

      // Show modal
      console.log("Attempting to show modal");
      const semesterModalElement = document.getElementById("semesterModal");
      if (semesterModalElement) {
        console.log("Modal element found, creating Bootstrap modal");
        // Always create a new modal instance to ensure it works
        const modal = new bootstrap.Modal(semesterModalElement);
        modal.show();
      } else {
        console.log("semesterModalElement not found in HTML");
      }
    })
    .catch((error) => {
      console.error("Get semester details error:", error);
      showAlert("Failed to load semester details. Please try again.", "danger");
    });
}

// Handle save semester button click
function handleSaveSemester() {
  // Get form values
  const semesterId = semesterIdInput ? semesterIdInput.value : "";
  const semesterName = semesterNameInput ? semesterNameInput.value.trim() : "";
  const academicYear = academicYearInput ? academicYearInput.value.trim() : "";
  const isActive = semesterIsActiveInput ? semesterIsActiveInput.checked : true;

  // Validate required fields
  if (!semesterName || !academicYear) {
    showAlert("Please fill all required fields.", "danger");
    return;
  }

  // Validate semester name
  if (!["Fall", "Winter", "Summer"].includes(semesterName)) {
    showAlert("Semester name must be one of: Fall, Winter, Summer", "danger");
    return;
  }

  // Validate academic year format (YYYY-YY)
  const academicYearRegex = /^\d{4}-\d{2}$/;
  if (!academicYearRegex.test(academicYear)) {
    showAlert(
      "Academic year must be in the format YYYY-YY (e.g., 2023-24)",
      "danger"
    );
    return;
  }

  // Prepare data
  const semesterData = {
    semester_name: semesterName,
    academic_year: academicYear,
    is_active: isActive,
  };

  // Show loading state
  if (saveSemesterBtn) {
    saveSemesterBtn.disabled = true;
    saveSemesterBtn.innerHTML =
      '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
  }

  // Determine if creating or updating
  const method = semesterId ? "PUT" : "POST";
  const url = semesterId
    ? `${window.API_URL}/semesters/${semesterId}`
    : `${window.API_URL}/semesters`;

  fetch(url, {
    method: method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    body: JSON.stringify(semesterData),
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((data) => {
          throw new Error(data.message || "Failed to save semester");
        });
      }
      return response.json();
    })
    .then((data) => {
      // Hide modal
      if (semesterModal) semesterModal.hide();

      // Show success message
      showAlert(data.message, "success");

      // Reload semesters
      loadSemesters();
    })
    .catch((error) => {
      console.error("Save semester error:", error);
      showAlert(error.message, "danger");
    })
    .finally(() => {
      // Reset button state
      if (saveSemesterBtn) {
        saveSemesterBtn.disabled = false;
        saveSemesterBtn.innerHTML = "Save";
      }
    });
}

// Toggle semester status
function toggleSemesterStatus(semesterId, newStatus) {
  fetch(`${window.API_URL}/semesters/${semesterId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    body: JSON.stringify({ is_active: newStatus }),
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((data) => {
          throw new Error(data.message || "Failed to update semester status");
        });
      }
      return response.json();
    })
    .then((data) => {
      // Show success message
      showAlert(data.message, "success");

      // Reload semesters
      loadSemesters();
    })
    .catch((error) => {
      console.error("Toggle status error:", error);
      showAlert(error.message, "danger");
    });
}

// Open delete confirmation modal
function openDeleteConfirmModal(semesterId, semesterName, academicYear) {
  // Show semester details and hide school details
  const schoolDetails = document.getElementById("delete-school-details");
  const semesterDetails = document.getElementById("delete-semester-details");
  if (schoolDetails) schoolDetails.style.display = "none";
  if (semesterDetails) semesterDetails.style.display = "block";

  // Set confirm modal values
  if (deleteSemesterName) deleteSemesterName.textContent = semesterName;
  if (deleteSemesterAcadYear) deleteSemesterAcadYear.textContent = academicYear;

  if (confirmDeleteSemesterBtn)
    confirmDeleteSemesterBtn.setAttribute("data-id", semesterId);

  if (deleteSemesterModal) deleteSemesterModal.show();
}

// Handle confirm delete button click
function handleConfirmDelete() {
  if (!confirmDeleteSemesterBtn) {
    console.error("Confirm delete button not found");
    return;
  }

  const semesterId = confirmDeleteSemesterBtn.getAttribute("data-id");
  console.log(`Attempting to delete semester with ID: ${semesterId}`);

  // Show loading state
  confirmDeleteSemesterBtn.disabled = true;
  confirmDeleteSemesterBtn.innerHTML =
    '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Deleting...';

  fetch(`${window.API_URL}/semesters/${semesterId}`, {
    method: "DELETE",
    headers: {
      Authorization: localStorage.getItem("token"),
    },
  })
    .then((response) => {
      console.log(`Delete response status: ${response.status}`);
      if (!response.ok) {
        return response.json().then((data) => {
          throw new Error(data.message || "Failed to delete semester");
        });
      }
      return response.json();
    })
    .then((data) => {
      // Hide modal
      if (deleteSemesterModal) deleteSemesterModal.hide();

      // Show success message
      showAlert(data.message, "success");

      // Reload semesters
      loadSemesters();
    })
    .catch((error) => {
      console.error("Delete semester error:", error);
      showAlert(error.message, "danger");

      // Hide modal
      if (deleteSemesterModal) deleteSemesterModal.hide();
    })
    .finally(() => {
      // Reset button state
      if (confirmDeleteSemesterBtn) {
        confirmDeleteSemesterBtn.disabled = false;
        confirmDeleteSemesterBtn.innerHTML = "Delete";
      }
    });
}

// Format date string
function formatDate(dateString) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}
