// DOM elements will be initialized in the DOMContentLoaded event
let venuesTableBody;
let addVenueBtn;
let saveVenueBtn;
let venueSearchInput;
let venueStatusFilter;

// Venue form elements
let venueForm;
let venueIdInput;
let venueNameInput;
let venueSchoolInput;
let venueCapacityInput;
let venueInfraTypeInput;
let venueSeatsInput;
let venueIsActiveInput;

// New infrastructure type elements
let venueInfraTypeSelect;
let toggleCustomInfraTypeBtn;
let clearCustomInfraTypesBtn;
let isCustomInfraType = false;

// Modal elements
let venueModal;
let venueDeleteModal;
let venueModalLabel;
let confirmVenueDeleteBtn;
let venueDeleteName;
let venueDeleteType;

// Initialize venues functionality
document.addEventListener("DOMContentLoaded", () => {
  console.log("venues.js: DOM loaded");

  // Initialize DOM elements
  venuesTableBody = document.getElementById("venues-table");
  addVenueBtn = document.getElementById("add-venue-btn");
  saveVenueBtn = document.getElementById("save-venue-btn");
  venueSearchInput = document.getElementById("venue-search-input");
  venueStatusFilter = document.getElementById("venue-status-filter");

  // Initialize form elements
  venueForm = document.getElementById("venue-form");
  venueIdInput = document.getElementById("venue-id-field");
  venueNameInput = document.getElementById("venue-name-field");
  venueSchoolInput = document.getElementById("venue-school-field");
  venueCapacityInput = document.getElementById("venue-capacity-field");
  venueInfraTypeInput = document.getElementById("venue-infra-type-field");
  venueSeatsInput = document.getElementById("venue-seats-field");
  venueIsActiveInput = document.getElementById("venue-is-active-field");

  // Initialize new infrastructure type elements
  venueInfraTypeSelect = document.getElementById("venue-infra-type-select");
  toggleCustomInfraTypeBtn = document.getElementById(
    "toggle-custom-infra-type"
  );
  clearCustomInfraTypesBtn = document.getElementById(
    "clear-custom-infra-types"
  );

  // Add event listener for the toggle button
  if (toggleCustomInfraTypeBtn) {
    toggleCustomInfraTypeBtn.addEventListener("click", toggleCustomInfraType);
  }

  // Add event listener for the clear custom types button
  if (clearCustomInfraTypesBtn) {
    clearCustomInfraTypesBtn.addEventListener("click", clearCustomInfraTypes);
  }

  // Add event listener for the select dropdown
  if (venueInfraTypeSelect) {
    venueInfraTypeSelect.addEventListener("change", function () {
      if (venueInfraTypeInput) {
        venueInfraTypeInput.value = this.value;
      }
    });
  }

  // Initialize modal elements
  venueModalLabel = document.getElementById("venueModalLabel");
  venueDeleteName = document.getElementById("venue-delete-name");
  venueDeleteType = document.getElementById("venue-delete-type");
  confirmVenueDeleteBtn = document.getElementById("confirm-venue-delete-btn");

  // Initialize Bootstrap modal objects
  const venueModalElement = document.getElementById("venueModal");
  const venueDeleteModalElement = document.getElementById("venueDeleteModal");

  if (venueModalElement) {
    venueModal = new bootstrap.Modal(venueModalElement);
  }

  if (venueDeleteModalElement) {
    venueDeleteModal = new bootstrap.Modal(venueDeleteModalElement);
  }

  // Setup event listeners
  if (addVenueBtn) {
    console.log("venues.js: Add venue button found");
    addVenueBtn.addEventListener("click", handleAddVenue);
  }

  if (saveVenueBtn) {
    saveVenueBtn.addEventListener("click", handleSaveVenue);
  }

  if (confirmVenueDeleteBtn) {
    confirmVenueDeleteBtn.addEventListener("click", handleVenueDeleteConfirm);
  }

  if (venueSearchInput) {
    venueSearchInput.addEventListener("input", filterVenues);
  }

  if (venueStatusFilter) {
    venueStatusFilter.addEventListener("change", filterVenues);
  }

  // Setup navigation listener
  const venuesLink = document.getElementById("venues-link");
  if (venuesLink) {
    venuesLink.addEventListener("click", () => {
      // Show venues page
      document.querySelectorAll(".content-page").forEach((page) => {
        page.classList.remove("active");
      });
      document.getElementById("venues-page").classList.add("active");

      // Update page title
      document.getElementById("page-title").textContent = "Venues";

      // Load venues data
      loadVenues();
    });
  }
});

// Toggle between dropdown and custom input for infrastructure type
function toggleCustomInfraType() {
  isCustomInfraType = !isCustomInfraType;

  if (venueInfraTypeSelect) {
    venueInfraTypeSelect.style.display = isCustomInfraType ? "none" : "block";
  }

  if (venueInfraTypeInput) {
    venueInfraTypeInput.style.display = isCustomInfraType ? "block" : "none";
  }

  if (toggleCustomInfraTypeBtn) {
    toggleCustomInfraTypeBtn.textContent = isCustomInfraType
      ? "Select"
      : "Custom";
  }

  // If switching to dropdown, update it with the current input value
  if (!isCustomInfraType && venueInfraTypeInput && venueInfraTypeInput.value) {
    // Check if the value exists in the dropdown
    const exists = Array.from(venueInfraTypeSelect.options).some(
      (option) => option.value === venueInfraTypeInput.value
    );

    // If it doesn't exist, add it
    if (!exists && venueInfraTypeInput.value.trim() !== "") {
      const option = document.createElement("option");
      option.value = venueInfraTypeInput.value;
      option.text = venueInfraTypeInput.value;
      venueInfraTypeSelect.add(option);
    }

    venueInfraTypeSelect.value = venueInfraTypeInput.value;
  }
}

// Clear custom infrastructure types from the dropdown
function clearCustomInfraTypes() {
  if (venueInfraTypeSelect) {
    // Keep only the default option and predefined infrastructure types
    const defaultOption = venueInfraTypeSelect.options[0]; // The "Select or enter custom type..." option
    const predefinedOptions = [
      "Physics Lab",
      "Chemistry Lab",
      "Electronics Lab",
      "Computer Lab",
      "Classroom",
      "Design Lab",
      "Moot Court",
      "Seminar Hall",
      "Studio",
    ];

    // Clear all options
    venueInfraTypeSelect.innerHTML = "";

    // Add back the default option
    venueInfraTypeSelect.add(defaultOption);

    // Add back predefined options
    predefinedOptions.forEach((type) => {
      const option = document.createElement("option");
      option.value = type;
      option.text = type;
      venueInfraTypeSelect.add(option);
    });

    // Reset the selected value to default
    venueInfraTypeSelect.value = "";

    // Also reset the input field
    if (venueInfraTypeInput) {
      venueInfraTypeInput.value = "";
    }

    showAlert("Custom infrastructure types have been cleared", "info");
  }
}

// Reset infrastructure type form elements
function resetInfraTypeFields() {
  isCustomInfraType = false;

  if (venueInfraTypeSelect) {
    venueInfraTypeSelect.style.display = "block";
    venueInfraTypeSelect.value = "";
  }

  if (venueInfraTypeInput) {
    venueInfraTypeInput.style.display = "none";
    venueInfraTypeInput.value = "";
  }

  if (toggleCustomInfraTypeBtn) {
    toggleCustomInfraTypeBtn.textContent = "Custom";
  }
}

// Load all venues from the API
function loadVenues() {
  console.log("venues.js: Loading venues");

  // Show loading state
  if (venuesTableBody) {
    venuesTableBody.innerHTML =
      '<tr><td colspan="7" class="text-center">Loading venues...</td></tr>';
  }

  fetch(`${window.API_URL}/venues`, {
    headers: {
      Authorization: localStorage.getItem("token"),
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to load venues");
      }
      return response.json();
    })
    .then((venues) => {
      if (venues.length === 0) {
        if (venuesTableBody) {
          venuesTableBody.innerHTML =
            '<tr><td colspan="7" class="text-center">No venues found. Add a new venue to get started.</td></tr>';
        }
        return;
      }

      // Render venues
      renderVenues(venues);
    })
    .catch((error) => {
      console.error("Load venues error:", error);
      if (venuesTableBody) {
        venuesTableBody.innerHTML =
          '<tr><td colspan="7" class="text-center text-danger">Error loading venues. Please try again.</td></tr>';
      }
      showAlert(
        "Failed to load venues. Please refresh the page or try again later.",
        "danger"
      );
    });
}

// Render venues in the table
function renderVenues(venues) {
  if (!venuesTableBody) {
    console.error("Venues table body element not found");
    return;
  }

  // Apply filters if any
  const searchTerm = venueSearchInput
    ? venueSearchInput.value.toLowerCase().trim()
    : "";
  const statusFilter = venueStatusFilter ? venueStatusFilter.value : "all";

  const filteredVenues = venues.filter((venue) => {
    // Apply status filter
    if (
      statusFilter !== "all" &&
      ((statusFilter === "active" && !venue.is_active) ||
        (statusFilter === "inactive" && venue.is_active))
    ) {
      return false;
    }

    // Apply search filter
    if (searchTerm) {
      return (
        venue.venue.toLowerCase().includes(searchTerm) ||
        (venue.assigned_to_school &&
          venue.assigned_to_school.toLowerCase().includes(searchTerm)) ||
        venue.infra_type.toLowerCase().includes(searchTerm)
      );
    }

    return true;
  });

  if (filteredVenues.length === 0) {
    venuesTableBody.innerHTML =
      '<tr><td colspan="7" class="text-center">No venues match your filters.</td></tr>';
    return;
  }

  // Clear previous content
  venuesTableBody.innerHTML = "";

  // Add each venue to the table
  filteredVenues.forEach((venue) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${venue.venue}</td>
      <td>${venue.assigned_to_school || "-"}</td>
      <td>${venue.capacity}</td>
      <td>${venue.infra_type}</td>
      <td>${venue.seats || "-"}</td>
      <td>
        <span class="badge ${
          venue.is_active ? "bg-success" : "bg-danger"
        } status-badge">
          ${venue.is_active ? "Active" : "Inactive"}
        </span>
      </td>
      <td>
        <button class="btn btn-sm btn-primary action-btn edit-venue-btn" data-id="${
          venue.venue_id
        }">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-${
          venue.is_active ? "warning" : "success"
        } action-btn toggle-status-btn" data-id="${
      venue.venue_id
    }" data-active="${venue.is_active}">
          <i class="fas fa-${venue.is_active ? "pause" : "play"}"></i>
        </button>
        <button class="btn btn-sm btn-danger action-btn delete-venue-btn" data-id="${
          venue.venue_id
        }" data-name="${venue.venue}" data-type="${venue.infra_type}">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;

    venuesTableBody.appendChild(row);
  });

  // Add event listeners to buttons
  addVenueButtonListeners();
}

// Add event listeners to venue action buttons
function addVenueButtonListeners() {
  console.log("Adding venue button listeners");

  // Edit venue buttons
  const editButtons = document.querySelectorAll(".edit-venue-btn");
  console.log(`Found ${editButtons.length} edit buttons`);

  editButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const venueId = button.getAttribute("data-id");
      console.log(`Edit button clicked for venue ID: ${venueId}`);
      openEditVenueModal(venueId);
    });
  });

  // Toggle status buttons
  const toggleButtons = document.querySelectorAll(".toggle-status-btn");
  console.log(`Found ${toggleButtons.length} toggle buttons`);

  toggleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const venueId = button.getAttribute("data-id");
      const isActive = button.getAttribute("data-active") === "true";
      console.log(
        `Toggle button clicked for venue ID: ${venueId}, current status: ${isActive}`
      );
      toggleVenueStatus(venueId, !isActive);
    });
  });

  // Delete venue buttons
  const deleteButtons = document.querySelectorAll(".delete-venue-btn");
  console.log(`Found ${deleteButtons.length} delete buttons`);

  deleteButtons.forEach((button) => {
    const venueId = button.getAttribute("data-id");
    const venueName = button.getAttribute("data-name");
    const venueType = button.getAttribute("data-type");

    button.addEventListener("click", () => {
      console.log(`Delete button clicked for venue ID: ${venueId}`);
      openVenueDeleteModal(venueId, venueName, venueType);
    });
  });
}

// Filter venues based on search and status
function filterVenues() {
  // Get all venues again and apply filters on the client side
  // This avoids making new API calls for simple filtering
  fetch(`${window.API_URL}/venues`, {
    headers: {
      Authorization: localStorage.getItem("token"),
    },
  })
    .then((response) => response.json())
    .then((venues) => {
      renderVenues(venues);
    })
    .catch((error) => {
      console.error("Filter venues error:", error);
    });
}

// Handle add venue button click
function handleAddVenue() {
  // Reset form
  if (venueForm) venueForm.reset();
  if (venueIdInput) venueIdInput.value = "";

  // Reset infrastructure type fields
  resetInfraTypeFields();

  // Update modal title
  if (venueModalLabel) venueModalLabel.textContent = "Add New Venue";

  // Show modal
  if (venueModal) venueModal.show();
}

// Open edit venue modal
function openEditVenueModal(venueId) {
  console.log(`Opening edit modal for venue ID: ${venueId}`);

  // Get venue details
  fetch(`${window.API_URL}/venues/${venueId}`, {
    headers: {
      Authorization: localStorage.getItem("token"),
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to get venue details");
      }
      return response.json();
    })
    .then((venue) => {
      console.log(`Venue data received:`, venue);

      // Fill form with venue data
      if (venueIdInput) venueIdInput.value = venue.venue_id;
      if (venueNameInput) venueNameInput.value = venue.venue;
      if (venueSchoolInput)
        venueSchoolInput.value = venue.assigned_to_school || "";
      if (venueCapacityInput) venueCapacityInput.value = venue.capacity;

      // Handle infrastructure type
      if (venueInfraTypeInput) venueInfraTypeInput.value = venue.infra_type;

      // Check if the value exists in dropdown options
      let existsInDropdown = false;
      if (venueInfraTypeSelect) {
        existsInDropdown = Array.from(venueInfraTypeSelect.options).some(
          (option) => option.value === venue.infra_type
        );

        if (!existsInDropdown && venue.infra_type) {
          // Add it to the dropdown
          const option = document.createElement("option");
          option.value = venue.infra_type;
          option.text = venue.infra_type;
          venueInfraTypeSelect.add(option);
        }

        venueInfraTypeSelect.value = venue.infra_type;
      }

      // Show dropdown by default
      isCustomInfraType = false;
      if (venueInfraTypeSelect) venueInfraTypeSelect.style.display = "block";
      if (venueInfraTypeInput) venueInfraTypeInput.style.display = "none";
      if (toggleCustomInfraTypeBtn)
        toggleCustomInfraTypeBtn.textContent = "Custom";

      if (venueSeatsInput) venueSeatsInput.value = venue.seats || "";
      if (venueIsActiveInput) venueIsActiveInput.checked = venue.is_active;

      // Update modal title
      if (venueModalLabel) venueModalLabel.textContent = "Edit Venue";

      // Show modal
      if (venueModal) venueModal.show();
    })
    .catch((error) => {
      console.error("Get venue details error:", error);
      showAlert("Failed to load venue details. Please try again.", "danger");
    });
}

// Open venue delete modal
function openVenueDeleteModal(venueId, venueName, venueType) {
  console.log(
    `Opening delete modal for venue: ${venueId}, ${venueName}, ${venueType}`
  );

  // Set the values
  if (venueDeleteName) venueDeleteName.textContent = venueName;
  if (venueDeleteType) venueDeleteType.textContent = venueType;

  // Set the venue ID on the delete button
  if (confirmVenueDeleteBtn) {
    confirmVenueDeleteBtn.setAttribute("data-id", venueId);
  }

  // Show the modal
  if (venueDeleteModal) {
    venueDeleteModal.show();
  } else {
    console.error("Venue delete modal not initialized");
    // Try to create it if it doesn't exist
    const modalElement = document.getElementById("venueDeleteModal");
    if (modalElement) {
      console.log("Found modal element, creating Bootstrap modal");
      venueDeleteModal = new bootstrap.Modal(modalElement);
      venueDeleteModal.show();
    } else {
      console.error("Modal element not found in DOM");
    }
  }
}

// Handle save venue button click
function handleSaveVenue() {
  // Get form values
  const venueId = venueIdInput ? venueIdInput.value : "";
  const venueName = venueNameInput ? venueNameInput.value.trim() : "";
  const venueSchool = venueSchoolInput ? venueSchoolInput.value.trim() : "";
  const capacity = venueCapacityInput ? venueCapacityInput.value : "";
  const infraType = isCustomInfraType
    ? venueInfraTypeInput
      ? venueInfraTypeInput.value.trim()
      : ""
    : venueInfraTypeSelect
    ? venueInfraTypeSelect.value.trim()
    : "";
  const seats = venueSeatsInput ? venueSeatsInput.value : "";
  const isActive = venueIsActiveInput ? venueIsActiveInput.checked : true;

  // Validate required fields
  if (!venueName || !capacity || !infraType) {
    showAlert("Please fill all required fields.", "danger");
    return;
  }

  // Validate field lengths
  if (venueName.length > 10) {
    showAlert("Venue name must not exceed 10 characters.", "danger");
    return;
  }

  if (venueSchool && venueSchool.length > 10) {
    showAlert("School code must not exceed 10 characters.", "danger");
    return;
  }

  if (infraType.length > 20) {
    showAlert("Infrastructure type must not exceed 20 characters.", "danger");
    return;
  }

  // Prepare data
  const venueData = {
    venue: venueName,
    assigned_to_school: venueSchool || null,
    capacity: capacity,
    infra_type: infraType,
    seats: seats || null,
    is_active: isActive,
  };

  // Show loading state
  if (saveVenueBtn) {
    saveVenueBtn.disabled = true;
    saveVenueBtn.innerHTML =
      '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
  }

  // Determine if creating or updating
  const method = venueId ? "PUT" : "POST";
  const url = venueId
    ? `${window.API_URL}/venues/${venueId}`
    : `${window.API_URL}/venues`;

  fetch(url, {
    method: method,
    headers: {
      "Content-Type": "application/json",
      Authorization: localStorage.getItem("token"),
    },
    body: JSON.stringify(venueData),
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((data) => {
          throw new Error(data.message || "Failed to save venue");
        });
      }
      return response.json();
    })
    .then((data) => {
      // Hide modal
      if (venueModal) venueModal.hide();

      // Show success message
      showAlert(data.message, "success");

      // Reload venues
      loadVenues();
    })
    .catch((error) => {
      console.error("Save venue error:", error);
      showAlert(error.message, "danger");
    })
    .finally(() => {
      // Reset button state
      if (saveVenueBtn) {
        saveVenueBtn.disabled = false;
        saveVenueBtn.innerHTML = "Save";
      }
    });
}

// Toggle venue status
function toggleVenueStatus(venueId, newStatus) {
  fetch(`${window.API_URL}/venues/${venueId}/status`, {
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
          throw new Error(data.message || "Failed to update venue status");
        });
      }
      return response.json();
    })
    .then((data) => {
      // Show success message
      showAlert(data.message, "success");

      // Reload venues
      loadVenues();
    })
    .catch((error) => {
      console.error("Toggle status error:", error);
      showAlert(error.message, "danger");
    });
}

// Handle confirm delete button click
function handleVenueDeleteConfirm() {
  if (!confirmVenueDeleteBtn) {
    console.error("Confirm venue delete button not found");
    return;
  }

  const venueId = confirmVenueDeleteBtn.getAttribute("data-id");
  console.log(`Confirming delete for venue ID: ${venueId}`);

  // Show loading state
  confirmVenueDeleteBtn.disabled = true;
  confirmVenueDeleteBtn.innerHTML =
    '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Deleting...';

  fetch(`${window.API_URL}/venues/${venueId}`, {
    method: "DELETE",
    headers: {
      Authorization: localStorage.getItem("token"),
    },
  })
    .then((response) => {
      console.log(`Delete venue response status: ${response.status}`);
      if (!response.ok) {
        return response.json().then((data) => {
          console.log(`Delete error response:`, data);
          throw new Error(data.message || "Failed to delete venue");
        });
      }
      return response.json();
    })
    .then((data) => {
      console.log(`Delete success response:`, data);
      // Hide modal
      if (venueDeleteModal) venueDeleteModal.hide();

      // Show success message
      showAlert(data.message, "success");

      // Reload venues
      loadVenues();
    })
    .catch((error) => {
      console.error("Delete venue error:", error);
      showAlert(error.message, "danger");

      // Hide modal
      if (venueDeleteModal) venueDeleteModal.hide();
    })
    .finally(() => {
      // Reset button state
      if (confirmVenueDeleteBtn) {
        confirmVenueDeleteBtn.disabled = false;
        confirmVenueDeleteBtn.innerHTML = "Delete";
      }
    });
}

// Show alert message
function showAlert(message, type = "info", timeout = 5000) {
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
