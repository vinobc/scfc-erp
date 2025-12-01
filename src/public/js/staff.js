// DOM elements will be initialized in the DOMContentLoaded event
let staffTableBody;
let addStaffBtn;
let saveStaffBtn;
let staffSearchInput;
let staffDepartmentFilter;
let staffStatusFilter;

// Staff form elements
let staffForm;
let staffIdInput;
let staffNameInput;
let staffEmployeeIdInput;
let staffDesignationInput;
let staffDepartmentInput;
let staffEmailInput;
let staffIsActiveInput;

// Modal elements
let staffModal;
let staffDeleteModal;
let staffModalLabel;
let confirmStaffDeleteBtn;
let staffDeleteName;
let staffDeleteEmployeeId;

// Department list
const DEPARTMENTS = [
  "Admissions",
  "Administration",
  "Accounts",
  "AIB",
  "AINTT",
  "AIP",
  "AIRBAS",
  "ALS",
  "APMD",
  "ASAS",
  "ASET",
  "ASFT",
  "COE",
  "CRC",
  "Hostel",
  "HR",
  "IT",
  "Library",
  "Projects",
  "Registrar Office",
  "Security",
  "Student Services",
  "Student Welfare",
  "VC-Office",
  "Vice President Office"
];

// Initialize staff functionality
document.addEventListener("DOMContentLoaded", () => {
  console.log("staff.js: DOM loaded");

  // Initialize DOM elements
  staffTableBody = document.getElementById("staff-table");
  addStaffBtn = document.getElementById("add-staff-btn");
  saveStaffBtn = document.getElementById("save-staff-btn");
  staffSearchInput = document.getElementById("staff-search-input");
  staffDepartmentFilter = document.getElementById("staff-department-filter");
  staffStatusFilter = document.getElementById("staff-status-filter");

  // Initialize form elements
  staffForm = document.getElementById("staff-form");
  staffIdInput = document.getElementById("staff-id-field");
  staffNameInput = document.getElementById("staff-name-field");
  staffEmployeeIdInput = document.getElementById("staff-employee-id-field");
  staffDesignationInput = document.getElementById("staff-designation-field");
  staffDepartmentInput = document.getElementById("staff-department-field");
  staffEmailInput = document.getElementById("staff-email-field");
  staffIsActiveInput = document.getElementById("staff-is-active-field");

  // Initialize modal elements
  staffModalLabel = document.getElementById("staffModalLabel");
  staffDeleteName = document.getElementById("staff-delete-name");
  staffDeleteEmployeeId = document.getElementById("staff-delete-employee-id");
  confirmStaffDeleteBtn = document.getElementById("confirm-staff-delete-btn");

  // Initialize Bootstrap modal objects
  const staffModalElement = document.getElementById("staffModal");
  const staffDeleteModalElement = document.getElementById("staffDeleteModal");

  if (staffModalElement) {
    staffModal = new bootstrap.Modal(staffModalElement);
  }

  if (staffDeleteModalElement) {
    staffDeleteModal = new bootstrap.Modal(staffDeleteModalElement);
  }

  // Setup event listeners
  if (addStaffBtn) {
    console.log("staff.js: Add staff button found");
    addStaffBtn.addEventListener("click", handleAddStaff);
  }

  if (saveStaffBtn) {
    saveStaffBtn.addEventListener("click", handleSaveStaff);
  }

  if (confirmStaffDeleteBtn) {
    confirmStaffDeleteBtn.addEventListener("click", handleStaffDeleteConfirm);
  }

  if (staffSearchInput) {
    staffSearchInput.addEventListener("input", filterStaff);
  }

  if (staffDepartmentFilter) {
    staffDepartmentFilter.addEventListener("change", filterStaff);
  }

  if (staffStatusFilter) {
    staffStatusFilter.addEventListener("change", filterStaff);
  }

  // Setup navigation listener
  const staffLink = document.getElementById("staff-link");
  if (staffLink) {
    staffLink.addEventListener("click", () => {
      // Show staff page
      document.querySelectorAll(".content-page").forEach((page) => {
        page.classList.remove("active");
      });
      document.getElementById("staff-page").classList.add("active");

      // Update page title
      document.getElementById("page-title").textContent = "Staff";

      // Load staff data
      loadStaff();

      // Load departments for the dropdown
      loadDepartmentsForDropdown();
    });
  }
});

// Load departments for dropdown (hardcoded list)
function loadDepartmentsForDropdown() {
  // Populate department filter dropdown
  if (staffDepartmentFilter) {
    staffDepartmentFilter.innerHTML = '<option value="all">All Departments</option>';
    DEPARTMENTS.forEach((dept) => {
      const option = document.createElement("option");
      option.value = dept;
      option.textContent = dept;
      staffDepartmentFilter.appendChild(option);
    });
  }

  // Populate staff form department dropdown
  if (staffDepartmentInput) {
    staffDepartmentInput.innerHTML = '<option value="">Select a department</option>';
    DEPARTMENTS.forEach((dept) => {
      const option = document.createElement("option");
      option.value = dept;
      option.textContent = dept;
      staffDepartmentInput.appendChild(option);
    });
  }
}

// Load all staff from the API
function loadStaff() {
  console.log("staff.js: Loading staff");

  // Show loading state
  if (staffTableBody) {
    staffTableBody.innerHTML =
      '<tr><td colspan="7" class="text-center">Loading staff...</td></tr>';
  }

  fetch(`${window.API_URL}/staff`, {
    headers: {
      Authorization: localStorage.getItem("token"),
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to load staff");
      }
      return response.json();
    })
    .then((staff) => {
      if (staff.length === 0) {
        if (staffTableBody) {
          staffTableBody.innerHTML =
            '<tr><td colspan="7" class="text-center">No staff found. Add a new staff member to get started.</td></tr>';
        }
        return;
      }

      // Render staff
      renderStaff(staff);
    })
    .catch((error) => {
      console.error("Load staff error:", error);
      if (staffTableBody) {
        staffTableBody.innerHTML =
          '<tr><td colspan="7" class="text-center text-danger">Error loading staff. Please try again.</td></tr>';
      }
      window.showAlert(
        "Failed to load staff. Please refresh the page or try again later.",
        "danger"
      );
    });
}

// Render staff in the table
function renderStaff(staffList) {
  if (!staffTableBody) {
    console.error("Staff table body element not found");
    return;
  }

  // Apply filters if any
  const searchTerm = staffSearchInput
    ? staffSearchInput.value.toLowerCase().trim()
    : "";
  const departmentFilter = staffDepartmentFilter ? staffDepartmentFilter.value : "all";
  const statusFilter = staffStatusFilter ? staffStatusFilter.value : "all";

  const filteredStaff = staffList.filter((staff) => {
    // Apply department filter
    if (departmentFilter !== "all" && staff.department !== departmentFilter) {
      return false;
    }

    // Apply status filter
    if (
      statusFilter !== "all" &&
      ((statusFilter === "active" && !staff.is_active) ||
        (statusFilter === "inactive" && staff.is_active))
    ) {
      return false;
    }

    // Apply search filter
    if (searchTerm) {
      return (
        staff.name.toLowerCase().includes(searchTerm) ||
        (staff.designation &&
          staff.designation.toLowerCase().includes(searchTerm)) ||
        staff.employee_id.toString().includes(searchTerm) ||
        (staff.email && staff.email.toLowerCase().includes(searchTerm)) ||
        (staff.department &&
          staff.department.toLowerCase().includes(searchTerm))
      );
    }

    return true;
  });

  if (filteredStaff.length === 0) {
    staffTableBody.innerHTML =
      '<tr><td colspan="7" class="text-center">No staff match your filters.</td></tr>';
    return;
  }

  // Clear previous content
  staffTableBody.innerHTML = "";

  // Add each staff to the table
  filteredStaff.forEach((staff) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${staff.name}</td>
      <td>${staff.employee_id}</td>
      <td>${staff.designation || "-"}</td>
      <td>${staff.department || "-"}</td>
      <td>${staff.email || "-"}</td>
      <td>
        <span class="badge ${
          staff.is_active ? "bg-success" : "bg-danger"
        } status-badge">
          ${staff.is_active ? "Active" : "Inactive"}
        </span>
      </td>
      <td>
        <button class="btn btn-sm btn-primary action-btn edit-staff-btn" data-id="${
          staff.staff_id
        }">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-${
          staff.is_active ? "warning" : "success"
        } action-btn toggle-staff-status-btn"
                data-id="${staff.staff_id}" data-active="${staff.is_active}">
          <i class="fas fa-${staff.is_active ? "pause" : "play"}"></i>
        </button>
        <button class="btn btn-sm btn-danger action-btn delete-staff-btn"
                data-id="${staff.staff_id}"
                data-name="${staff.name}"
                data-employee-id="${staff.employee_id}">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;

    staffTableBody.appendChild(row);
  });

  // Add event listeners to buttons
  addStaffButtonListeners();
}

// Filter staff based on search, department, and status
function filterStaff() {
  // Get all staff again and apply filters on the client side
  fetch(`${window.API_URL}/staff`, {
    headers: {
      Authorization: localStorage.getItem("token"),
    },
  })
    .then((response) => response.json())
    .then((staff) => {
      renderStaff(staff);
    })
    .catch((error) => {
      console.error("Filter staff error:", error);
    });
}

// Add event listeners to staff action buttons
function addStaffButtonListeners() {
  console.log("Adding staff button listeners");

  // Edit staff buttons
  const editButtons = document.querySelectorAll(".edit-staff-btn");
  console.log(`Found ${editButtons.length} edit buttons`);

  editButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const staffId = button.getAttribute("data-id");
      console.log(`Edit button clicked for staff ID: ${staffId}`);
      openEditStaffModal(staffId);
    });
  });

  // Toggle status buttons
  const toggleButtons = document.querySelectorAll(".toggle-staff-status-btn");
  console.log(`Found ${toggleButtons.length} toggle buttons`);

  toggleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const staffId = button.getAttribute("data-id");
      const isActive = button.getAttribute("data-active") === "true";
      console.log(
        `Toggle button clicked for staff ID: ${staffId}, current status: ${isActive}`
      );
      toggleStaffStatus(staffId, !isActive);
    });
  });

  // Delete staff buttons
  const deleteButtons = document.querySelectorAll(".delete-staff-btn");
  console.log(`Found ${deleteButtons.length} delete buttons`);

  deleteButtons.forEach((button) => {
    const staffId = button.getAttribute("data-id");
    const staffName = button.getAttribute("data-name");
    const employeeId = button.getAttribute("data-employee-id");

    button.addEventListener("click", () => {
      console.log(`Delete button clicked for staff ID: ${staffId}`);
      openStaffDeleteModal(staffId, staffName, employeeId);
    });
  });
}

// Handle add staff button click
function handleAddStaff() {
  // Reset form
  if (staffForm) staffForm.reset();
  if (staffIdInput) staffIdInput.value = "";

  // Update modal title
  if (staffModalLabel) staffModalLabel.textContent = "Add New Staff";

  // Make sure departments dropdown is loaded
  loadDepartmentsForDropdown();

  // Show modal
  if (staffModal) staffModal.show();
}

// Open edit staff modal
function openEditStaffModal(staffId) {
  console.log(`Opening edit modal for staff ID: ${staffId}`);

  // Get staff details
  fetch(`${window.API_URL}/staff/${staffId}`, {
    headers: {
      Authorization: localStorage.getItem("token"),
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to get staff details");
      }
      return response.json();
    })
    .then((staff) => {
      console.log(`Staff data received:`, staff);

      // Make sure departments dropdown is loaded before populating form
      loadDepartmentsForDropdown();

      // Fill form with staff data
      if (staffIdInput) staffIdInput.value = staff.staff_id;
      if (staffNameInput) staffNameInput.value = staff.name;
      if (staffEmployeeIdInput) staffEmployeeIdInput.value = staff.employee_id;
      if (staffDesignationInput)
        staffDesignationInput.value = staff.designation || "";
      if (staffDepartmentInput) staffDepartmentInput.value = staff.department;
      if (staffEmailInput) staffEmailInput.value = staff.email || "";
      if (staffIsActiveInput) staffIsActiveInput.checked = staff.is_active;

      // Update modal title
      if (staffModalLabel) staffModalLabel.textContent = "Edit Staff";

      // Show modal
      if (staffModal) staffModal.show();
    })
    .catch((error) => {
      console.error("Get staff details error:", error);
      window.showAlert(
        "Failed to load staff details. Please try again.",
        "danger"
      );
    });
}

// Open staff delete modal
function openStaffDeleteModal(staffId, staffName, employeeId) {
  console.log(
    `Opening delete modal for staff: ${staffId}, ${staffName}, ${employeeId}`
  );

  // Set the values
  if (staffDeleteName) staffDeleteName.textContent = staffName;
  if (staffDeleteEmployeeId) staffDeleteEmployeeId.textContent = employeeId;

  // Set the staff ID on the delete button
  if (confirmStaffDeleteBtn) {
    confirmStaffDeleteBtn.setAttribute("data-id", staffId);
  }

  // Show the modal
  if (staffDeleteModal) {
    staffDeleteModal.show();
  } else {
    console.error("Staff delete modal not initialized");
  }
}

// Handle save staff button click
function handleSaveStaff() {
  // Get form values
  const staffId = staffIdInput ? staffIdInput.value : "";
  const name = staffNameInput ? staffNameInput.value.trim() : "";
  const employeeId = staffEmployeeIdInput ? staffEmployeeIdInput.value : "";
  const designation = staffDesignationInput
    ? staffDesignationInput.value.trim()
    : "";
  const department = staffDepartmentInput ? staffDepartmentInput.value : "";
  const email = staffEmailInput ? staffEmailInput.value.trim() : "";
  const isActive = staffIsActiveInput ? staffIsActiveInput.checked : true;

  // Validate required fields
  if (!name || !employeeId || !department) {
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
  const staffData = {
    name,
    employee_id: parseInt(employeeId),
    designation: designation || null,
    department: department,
    email: email || null,
    is_active: isActive,
  };

  // Show loading state
  if (saveStaffBtn) {
    saveStaffBtn.disabled = true;
    saveStaffBtn.innerHTML =
      '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
  }

  // Determine if creating or updating
  const method = staffId ? "PUT" : "POST";
  const url = staffId
    ? `${window.API_URL}/staff/${staffId}`
    : `${window.API_URL}/staff`;

  fetch(url, {
    method: method,
    headers: {
      "Content-Type": "application/json",
      Authorization: localStorage.getItem("token"),
    },
    body: JSON.stringify(staffData),
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((data) => {
          throw new Error(data.message || "Failed to save staff");
        });
      }
      return response.json();
    })
    .then((data) => {
      // Hide modal
      if (staffModal) staffModal.hide();

      // Show success message
      window.showAlert(data.message, "success");

      // Reload staff
      loadStaff();
    })
    .catch((error) => {
      console.error("Save staff error:", error);
      window.showAlert(error.message, "danger");
    })
    .finally(() => {
      // Reset button state
      if (saveStaffBtn) {
        saveStaffBtn.disabled = false;
        saveStaffBtn.innerHTML = "Save";
      }
    });
}

// Toggle staff status
function toggleStaffStatus(staffId, newStatus) {
  fetch(`${window.API_URL}/staff/${staffId}/status`, {
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
          throw new Error(data.message || "Failed to update staff status");
        });
      }
      return response.json();
    })
    .then((data) => {
      // Show success message
      window.showAlert(data.message, "success");

      // Reload staff
      loadStaff();
    })
    .catch((error) => {
      console.error("Toggle status error:", error);
      window.showAlert(error.message, "danger");
    });
}

// Handle confirm delete button click
function handleStaffDeleteConfirm() {
  if (!confirmStaffDeleteBtn) {
    console.error("Confirm staff delete button not found");
    return;
  }

  const staffId = confirmStaffDeleteBtn.getAttribute("data-id");
  console.log(`Confirming delete for staff ID: ${staffId}`);

  // Show loading state
  confirmStaffDeleteBtn.disabled = true;
  confirmStaffDeleteBtn.innerHTML =
    '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Deleting...';

  fetch(`${window.API_URL}/staff/${staffId}`, {
    method: "DELETE",
    headers: {
      Authorization: localStorage.getItem("token"),
    },
  })
    .then((response) => {
      console.log(`Delete staff response status: ${response.status}`);
      if (!response.ok) {
        return response.json().then((data) => {
          console.log(`Delete error response:`, data);
          throw new Error(data.message || "Failed to delete staff");
        });
      }
      return response.json();
    })
    .then((data) => {
      console.log(`Delete success response:`, data);
      // Hide modal
      if (staffDeleteModal) staffDeleteModal.hide();

      // Show success message
      window.showAlert(data.message, "success");

      // Reload staff
      loadStaff();
    })
    .catch((error) => {
      console.error("Delete staff error:", error);
      window.showAlert(error.message, "danger");

      // Hide modal
      if (staffDeleteModal) staffDeleteModal.hide();
    })
    .finally(() => {
      // Reset button state
      if (confirmStaffDeleteBtn) {
        confirmStaffDeleteBtn.disabled = false;
        confirmStaffDeleteBtn.innerHTML = "Delete";
      }
    });
}
