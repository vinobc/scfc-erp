// DOM elements will be initialized in the DOMContentLoaded event
let slotsTableBody;
let addSlotBtn;
let saveSlotBtn;
let slotSearchInput;
let slotYearFilter;
let slotSemesterFilter;
let slotStatusFilter;

// Slot form elements
let slotForm;
let slotIdInput;
let slotYearInput;
let slotSemesterInput;
let slotDayInput;
let slotNameInput;
let slotTimeInput;
let slotIsActiveInput;

// View slot elements
let viewSlotYearSelect;
let viewSlotSemesterSelect;
let viewTimetableBtn;
let timetableContainer;
let timetableTitle;
let masterSlotTable;
let slotInfoTextarea;

// Modal elements
let slotModal;
let slotDeleteModal;
let slotModalLabel;
let confirmSlotDeleteBtn;
let slotDeleteYear;
let slotDeleteSemester;
let slotDeleteDay;
let slotDeleteName;
let slotDeleteTime;

// Submenu handling
let timetableLink;
let timetableSubmenu;
let masterSlotLink;
let createSlotLink;
let viewSlotLink;

// Initialize slots functionality
document.addEventListener("DOMContentLoaded", () => {
  console.log("slots.js: DOM loaded");

  // Initialize navigation elements
  timetableLink = document.getElementById("timetable-link");
  timetableSubmenu = document.getElementById("timetable-submenu");
  masterSlotLink = document.getElementById("master-slot-link");
  createSlotLink = document.getElementById("create-slot-link");
  viewSlotLink = document.getElementById("view-slot-link");

  // Initialize DOM elements
  slotsTableBody = document.getElementById("slots-table");
  addSlotBtn = document.getElementById("add-slot-btn");
  saveSlotBtn = document.getElementById("save-slot-btn");
  slotSearchInput = document.getElementById("slot-search-input");
  slotYearFilter = document.getElementById("slot-year-filter");
  slotSemesterFilter = document.getElementById("slot-semester-filter");
  slotStatusFilter = document.getElementById("slot-status-filter");

  // Initialize view slot elements
  viewSlotYearSelect = document.getElementById("view-slot-year");
  viewSlotSemesterSelect = document.getElementById("view-slot-semester");
  console.log("viewSlotYearSelect element:", viewSlotYearSelect);
  console.log("viewSlotSemesterSelect element:", viewSlotSemesterSelect);
  viewTimetableBtn = document.getElementById("view-timetable-btn");
  timetableContainer = document.getElementById("timetable-container");
  timetableTitle = document.getElementById("timetable-title");
  masterSlotTable = document.getElementById("master-slot-table");
  slotInfoTextarea = document.getElementById("slot-info-textarea");

  // Initialize form elements
  slotForm = document.getElementById("slot-form");
  slotIdInput = document.getElementById("slot-id-field");
  slotYearInput = document.getElementById("slot-year-field");
  slotSemesterInput = document.getElementById("slot-semester-field");
  slotDayInput = document.getElementById("slot-day-field");
  slotNameInput = document.getElementById("slot-name-field");
  slotTimeInput = document.getElementById("slot-time-field");
  slotIsActiveInput = document.getElementById("slot-is-active-field");

  // Initialize modal elements
  slotModalLabel = document.getElementById("slotModalLabel");
  slotDeleteYear = document.getElementById("slot-delete-year");
  slotDeleteSemester = document.getElementById("slot-delete-semester");
  slotDeleteDay = document.getElementById("slot-delete-day");
  slotDeleteName = document.getElementById("slot-delete-name");
  slotDeleteTime = document.getElementById("slot-delete-time");
  confirmSlotDeleteBtn = document.getElementById("confirm-slot-delete-btn");

  // Initialize Bootstrap modal objects
  const slotModalElement = document.getElementById("slotModal");
  const slotDeleteModalElement = document.getElementById("slotDeleteModal");

  if (slotModalElement) {
    slotModal = new bootstrap.Modal(slotModalElement);
  }

  if (slotDeleteModalElement) {
    slotDeleteModal = new bootstrap.Modal(slotDeleteModalElement);
  }

  // Setup event listeners
  if (addSlotBtn) {
    console.log("slots.js: Add slot button found");
    addSlotBtn.addEventListener("click", handleAddSlot);
  }

  if (saveSlotBtn) {
    saveSlotBtn.addEventListener("click", handleSaveSlot);
  }

  if (confirmSlotDeleteBtn) {
    confirmSlotDeleteBtn.addEventListener("click", handleSlotDeleteConfirm);
  }

  if (slotSearchInput) {
    slotSearchInput.addEventListener("input", filterSlots);
  }

  if (slotYearFilter) {
    slotYearFilter.addEventListener("change", filterSlots);
  }

  if (slotSemesterFilter) {
    slotSemesterFilter.addEventListener("change", filterSlots);
  }

  if (slotStatusFilter) {
    slotStatusFilter.addEventListener("change", filterSlots);
  }

  if (viewTimetableBtn) {
    viewTimetableBtn.addEventListener("click", handleViewTimetable);
  }

  // Setup navigation listeners
  if (timetableLink) {
    timetableLink.addEventListener("click", () => {
      // Toggle submenu
      timetableSubmenu.classList.toggle("d-none");

      // Show timetable page
      document.querySelectorAll(".content-page").forEach((page) => {
        page.classList.remove("active");
      });
      document.getElementById("timetable-page").classList.add("active");

      // Update page title
      document.getElementById("page-title").textContent =
        "TimeTable Management";
    });
  }

  if (masterSlotLink) {
    masterSlotLink.addEventListener("click", () => {
      // Show timetable page
      document.querySelectorAll(".content-page").forEach((page) => {
        page.classList.remove("active");
      });
      document.getElementById("timetable-page").classList.add("active");

      // Update page title
      document.getElementById("page-title").textContent =
        "TimeTable Management";
    });
  }

  if (createSlotLink) {
    createSlotLink.addEventListener("click", () => {
      // Show create slot page
      document.querySelectorAll(".content-page").forEach((page) => {
        page.classList.remove("active");
      });
      document.getElementById("create-slot-page").classList.add("active");

      // Update page title
      document.getElementById("page-title").textContent = "Create Slots";

      // Load slots data
      loadSlots();

      // Load allowed values
      loadAllowedSlotValues();

      // Load academic years for filter
      populateAcademicYears();
    });
  }

  const masterSlotViewLink = document.querySelector(
    "#master-slot-link + ul .nav-item:last-child .nav-link"
  );
  if (masterSlotViewLink) {
    masterSlotViewLink.addEventListener("click", (e) => {
      e.preventDefault();
      console.log("Master slot view link clicked from sidebar");

      // Show view slot page
      document.querySelectorAll(".content-page").forEach((page) => {
        page.classList.remove("active");
      });
      document.getElementById("view-slot-page").classList.add("active");

      // Update page title
      document.getElementById("page-title").textContent =
        "View Master Slot TimeTable";

      // Re-initialize the elements
      viewSlotYearSelect = document.getElementById("view-slot-year");
      viewSlotSemesterSelect = document.getElementById("view-slot-semester");

      console.log("Elements found:", {
        yearSelect: viewSlotYearSelect,
        semesterSelect: viewSlotSemesterSelect,
      });

      // Load academic years for the dropdown
      populateAcademicYears();
    });
  }

  if (viewSlotLink) {
    viewSlotLink.addEventListener("click", () => {
      // Show view slot page
      document.querySelectorAll(".content-page").forEach((page) => {
        page.classList.remove("active");
      });
      document.getElementById("view-slot-page").classList.add("active");

      // Update page title
      document.getElementById("page-title").textContent =
        "View Master Slot TimeTable";

      // Load academic years for filter
      populateAcademicYears();
    });
  }
  document.addEventListener("click", (e) => {
    // Check if clicked element is the view slot link
    if (
      e.target.id === "view-slot-link" ||
      e.target.closest("#view-slot-link") ||
      (e.target.textContent &&
        e.target.textContent.includes("View") &&
        e.target.closest("#master-slot-link"))
    ) {
      e.preventDefault();
      console.log("Navigating to view slot page");

      // Show view slot page
      document.querySelectorAll(".content-page").forEach((page) => {
        page.classList.remove("active");
      });
      document.getElementById("view-slot-page").classList.add("active");
      document.getElementById("page-title").textContent =
        "View Master Slot TimeTable";

      // Get the year dropdown
      const yearDropdown = document.getElementById("view-slot-year");
      console.log("Year dropdown found:", yearDropdown);

      if (yearDropdown) {
        // Fetch slots and populate years
        fetch(`${window.API_URL}/slots`, {
          headers: {
            Authorization: localStorage.getItem("token"),
          },
        })
          .then((response) => response.json())
          .then((slots) => {
            console.log("Fetched slots for years:", slots);

            // Get unique years
            const years = [
              ...new Set(slots.map((slot) => slot.slot_year)),
            ].sort();
            console.log("Unique years:", years);

            // Clear and populate dropdown
            yearDropdown.innerHTML =
              '<option value="">Select Academic Year</option>';
            years.forEach((year) => {
              const option = document.createElement("option");
              option.value = year;
              option.textContent = year;
              yearDropdown.appendChild(option);
            });

            console.log(
              "Populated year dropdown with",
              years.length,
              "options"
            );
          })
          .catch((error) => {
            console.error("Error fetching slots:", error);
          });
      }
    }
  });
});

// Populate academic years dropdown
function populateAcademicYears() {
  // Get all available academic years from API
  fetch(`${window.API_URL}/slots`, {
    headers: {
      Authorization: localStorage.getItem("token"),
    },
  })
    .then((response) => response.json())
    .then((slots) => {
      const years = new Set();

      // Collect all unique years
      slots.forEach((slot) => {
        years.add(slot.slot_year);
      });

      // Get sorted array of years
      const sortedYears = Array.from(years).sort();

      // Populate filter dropdown
      if (slotYearFilter) {
        // Save current selection
        const currentSelection = slotYearFilter.value;

        // Clear existing options except the default one
        while (slotYearFilter.options.length > 1) {
          slotYearFilter.remove(1);
        }

        // Add year options
        sortedYears.forEach((year) => {
          const option = document.createElement("option");
          option.value = year;
          option.textContent = year;
          slotYearFilter.add(option);
        });

        // Restore selection if possible
        if (
          currentSelection !== "all" &&
          sortedYears.includes(currentSelection)
        ) {
          slotYearFilter.value = currentSelection;
        }
      }

      // Populate view page dropdown
      if (viewSlotYearSelect) {
        // Save current selection
        const currentSelection = viewSlotYearSelect.value;

        // Clear existing options except the default one
        while (viewSlotYearSelect.options.length > 1) {
          viewSlotYearSelect.remove(1);
        }

        // Add year options
        sortedYears.forEach((year) => {
          const option = document.createElement("option");
          option.value = year;
          option.textContent = year;
          viewSlotYearSelect.add(option);
        });

        // Restore selection if possible
        if (sortedYears.includes(currentSelection)) {
          viewSlotYearSelect.value = currentSelection;
        }
      }
    })
    .catch((error) => {
      console.error("Error loading academic years:", error);
    });
}

// Load allowed slot values (names and times)
function loadAllowedSlotValues() {
  fetch(`${window.API_URL}/slots/allowed-values`, {
    headers: {
      Authorization: localStorage.getItem("token"),
    },
  })
    .then((response) => response.json())
    .then((data) => {
      if (slotNameInput) {
        // Clear existing options except the default one
        while (slotNameInput.options.length > 1) {
          slotNameInput.remove(1);
        }

        // Add name options
        data.slot_names.forEach((name) => {
          const option = document.createElement("option");
          option.value = name;
          option.textContent = name;
          slotNameInput.add(option);
        });
      }

      if (slotTimeInput) {
        // Clear existing options except the default one
        while (slotTimeInput.options.length > 1) {
          slotTimeInput.remove(1);
        }

        // Add time options
        data.slot_times.forEach((time) => {
          const option = document.createElement("option");
          option.value = time;
          option.textContent = time;
          slotTimeInput.add(option);
        });
      }
    })
    .catch((error) => {
      console.error("Error loading allowed slot values:", error);
    });
}

// Load all slots from the API
function loadSlots() {
  console.log("slots.js: Loading slots");

  // Show loading state
  if (slotsTableBody) {
    slotsTableBody.innerHTML =
      '<tr><td colspan="7" class="text-center">Loading slots...</td></tr>';
  }

  fetch(`${window.API_URL}/slots`, {
    headers: {
      Authorization: localStorage.getItem("token"),
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to load slots");
      }
      return response.json();
    })
    .then((slots) => {
      if (slots.length === 0) {
        if (slotsTableBody) {
          slotsTableBody.innerHTML =
            '<tr><td colspan="7" class="text-center">No slots found. Add a new slot to get started.</td></tr>';
        }
        return;
      }

      // Render slots
      renderSlots(slots);
    })
    .catch((error) => {
      console.error("Load slots error:", error);
      if (slotsTableBody) {
        slotsTableBody.innerHTML =
          '<tr><td colspan="7" class="text-center text-danger">Error loading slots. Please try again.</td></tr>';
      }
      showAlert(
        "Failed to load slots. Please refresh the page or try again later.",
        "danger"
      );
    });
}

// Render slots in the table
function renderSlots(slots) {
  if (!slotsTableBody) {
    console.error("Slots table body element not found");
    return;
  }

  // Apply filters if any
  const searchTerm = slotSearchInput
    ? slotSearchInput.value.toLowerCase().trim()
    : "";
  const yearFilter = slotYearFilter ? slotYearFilter.value : "all";
  const semesterFilter = slotSemesterFilter ? slotSemesterFilter.value : "all";
  const statusFilter = slotStatusFilter ? slotStatusFilter.value : "all";

  const filteredSlots = slots.filter((slot) => {
    // Apply year filter
    if (yearFilter !== "all" && slot.slot_year !== yearFilter) {
      return false;
    }

    // Apply semester filter
    if (semesterFilter !== "all" && slot.semester_type !== semesterFilter) {
      return false;
    }

    // Apply status filter
    if (
      statusFilter !== "all" &&
      ((statusFilter === "active" && !slot.is_active) ||
        (statusFilter === "inactive" && slot.is_active))
    ) {
      return false;
    }

    // Apply search filter
    if (searchTerm) {
      return (
        slot.slot_year.toLowerCase().includes(searchTerm) ||
        slot.semester_type.toLowerCase().includes(searchTerm) ||
        slot.slot_day.toLowerCase().includes(searchTerm) ||
        slot.slot_name.toLowerCase().includes(searchTerm) ||
        slot.slot_time.toLowerCase().includes(searchTerm)
      );
    }

    return true;
  });

  if (filteredSlots.length === 0) {
    slotsTableBody.innerHTML =
      '<tr><td colspan="7" class="text-center">No slots match your filters.</td></tr>';
    return;
  }

  // Clear previous content
  slotsTableBody.innerHTML = "";

  // Add each slot to the table
  filteredSlots.forEach((slot) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${slot.slot_year}</td>
      <td>${slot.semester_type}</td>
      <td>${slot.slot_day}</td>
      <td>${slot.slot_name}</td>
      <td>${slot.slot_time}</td>
      <td>
        <span class="badge ${
          slot.is_active ? "bg-success" : "bg-danger"
        } status-badge">
          ${slot.is_active ? "Active" : "Inactive"}
        </span>
      </td>
      <td>
        <button class="btn btn-sm btn-primary action-btn edit-slot-btn" data-id="${
          slot.slot_id
        }">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-${
          slot.is_active ? "warning" : "success"
        } action-btn toggle-status-btn" data-id="${
      slot.slot_id
    }" data-active="${slot.is_active}">
          <i class="fas fa-${slot.is_active ? "pause" : "play"}"></i>
        </button>
        <button class="btn btn-sm btn-danger action-btn delete-slot-btn" 
          data-id="${slot.slot_id}" 
          data-year="${slot.slot_year}" 
          data-semester="${slot.semester_type}" 
          data-day="${slot.slot_day}" 
          data-name="${slot.slot_name}" 
          data-time="${slot.slot_time}">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;

    slotsTableBody.appendChild(row);
  });

  // Add event listeners to buttons
  addSlotButtonListeners();
}

// Add event listeners to slot action buttons
function addSlotButtonListeners() {
  console.log("Adding slot button listeners");

  // Edit slot buttons
  const editButtons = document.querySelectorAll(".edit-slot-btn");
  console.log(`Found ${editButtons.length} edit buttons`);

  editButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const slotId = button.getAttribute("data-id");
      console.log(`Edit button clicked for slot ID: ${slotId}`);
      openEditSlotModal(slotId);
    });
  });

  // Toggle status buttons
  const toggleButtons = document.querySelectorAll(".toggle-status-btn");
  console.log(`Found ${toggleButtons.length} toggle buttons`);

  toggleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const slotId = button.getAttribute("data-id");
      const isActive = button.getAttribute("data-active") === "true";
      console.log(
        `Toggle button clicked for slot ID: ${slotId}, current status: ${isActive}`
      );
      toggleSlotStatus(slotId, !isActive);
    });
  });

  // Delete slot buttons
  const deleteButtons = document.querySelectorAll(".delete-slot-btn");
  console.log(`Found ${deleteButtons.length} delete buttons`);

  deleteButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const slotId = button.getAttribute("data-id");
      const slotYear = button.getAttribute("data-year");
      const slotSemester = button.getAttribute("data-semester");
      const slotDay = button.getAttribute("data-day");
      const slotName = button.getAttribute("data-name");
      const slotTime = button.getAttribute("data-time");

      console.log(`Delete button clicked for slot ID: ${slotId}`);
      openSlotDeleteModal(
        slotId,
        slotYear,
        slotSemester,
        slotDay,
        slotName,
        slotTime
      );
    });
  });
}

// Filter slots based on search and filters
function filterSlots() {
  // Get all slots again and apply filters on the client side
  // This avoids making new API calls for simple filtering
  fetch(`${window.API_URL}/slots`, {
    headers: {
      Authorization: localStorage.getItem("token"),
    },
  })
    .then((response) => response.json())
    .then((slots) => {
      renderSlots(slots);
    })
    .catch((error) => {
      console.error("Filter slots error:", error);
    });
}

// Handle add slot button click
function handleAddSlot() {
  // Reset form
  if (slotForm) slotForm.reset();
  if (slotIdInput) slotIdInput.value = "";

  // Update modal title
  if (slotModalLabel) slotModalLabel.textContent = "Add New Slot";

  // Show modal
  if (slotModal) slotModal.show();
}

// Open edit slot modal
function openEditSlotModal(slotId) {
  console.log(`Opening edit modal for slot ID: ${slotId}`);

  // Get slot details
  fetch(`${window.API_URL}/slots/${slotId}`, {
    headers: {
      Authorization: localStorage.getItem("token"),
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to get slot details");
      }
      return response.json();
    })
    .then((slot) => {
      console.log(`Slot data received:`, slot);

      // Fill form with slot data
      if (slotIdInput) slotIdInput.value = slot.slot_id;
      if (slotYearInput) slotYearInput.value = slot.slot_year;
      if (slotSemesterInput) slotSemesterInput.value = slot.semester_type;
      if (slotDayInput) slotDayInput.value = slot.slot_day;
      if (slotNameInput) slotNameInput.value = slot.slot_name;
      if (slotTimeInput) slotTimeInput.value = slot.slot_time;
      if (slotIsActiveInput) slotIsActiveInput.checked = slot.is_active;

      // Update modal title
      if (slotModalLabel) slotModalLabel.textContent = "Edit Slot";

      // Show modal
      if (slotModal) slotModal.show();
    })
    .catch((error) => {
      console.error("Get slot details error:", error);
      showAlert("Failed to load slot details. Please try again.", "danger");
    });
}

// Open slot delete modal
function openSlotDeleteModal(
  slotId,
  slotYear,
  slotSemester,
  slotDay,
  slotName,
  slotTime
) {
  console.log(`Opening delete modal for slot: ${slotId}`);

  // Set the values
  if (slotDeleteYear) slotDeleteYear.textContent = slotYear;
  if (slotDeleteSemester) slotDeleteSemester.textContent = slotSemester;
  if (slotDeleteDay) slotDeleteDay.textContent = slotDay;
  if (slotDeleteName) slotDeleteName.textContent = slotName;
  if (slotDeleteTime) slotDeleteTime.textContent = slotTime;

  // Set the slot ID on the delete button
  if (confirmSlotDeleteBtn) {
    confirmSlotDeleteBtn.setAttribute("data-id", slotId);
  }

  // Show the modal
  if (slotDeleteModal) {
    slotDeleteModal.show();
  } else {
    console.error("Slot delete modal not initialized");
  }
}

// Handle save slot button click
function handleSaveSlot() {
  // Get form values
  const slotId = slotIdInput ? slotIdInput.value : "";
  const slotYear = slotYearInput ? slotYearInput.value.trim() : "";
  const semesterType = slotSemesterInput ? slotSemesterInput.value.trim() : "";
  const slotDay = slotDayInput ? slotDayInput.value.trim() : "";
  const slotName = slotNameInput ? slotNameInput.value.trim() : "";
  const slotTime = slotTimeInput ? slotTimeInput.value.trim() : "";
  const isActive = slotIsActiveInput ? slotIsActiveInput.checked : true;

  // Validate required fields
  if (!slotYear || !semesterType || !slotDay || !slotName || !slotTime) {
    showAlert("Please fill all required fields.", "danger");
    return;
  }

  // Prepare data
  const slotData = {
    slot_year: slotYear,
    semester_type: semesterType,
    slot_day: slotDay,
    slot_name: slotName,
    slot_time: slotTime,
    is_active: isActive,
  };

  // Show loading state
  if (saveSlotBtn) {
    saveSlotBtn.disabled = true;
    saveSlotBtn.innerHTML =
      '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
  }

  // Determine if creating or updating
  const method = slotId ? "PUT" : "POST";
  const url = slotId
    ? `${window.API_URL}/slots/${slotId}`
    : `${window.API_URL}/slots`;

  fetch(url, {
    method: method,
    headers: {
      "Content-Type": "application/json",
      Authorization: localStorage.getItem("token"),
    },
    body: JSON.stringify(slotData),
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((data) => {
          throw new Error(data.message || "Failed to save slot");
        });
      }
      return response.json();
    })
    .then((data) => {
      // Hide modal
      if (slotModal) slotModal.hide();

      // Show success message
      showAlert(data.message, "success");

      // Reload slots
      loadSlots();

      // Refresh academic years
      populateAcademicYears();
    })
    .catch((error) => {
      console.error("Save slot error:", error);
      showAlert(error.message, "danger");
    })
    .finally(() => {
      // Reset button state
      if (saveSlotBtn) {
        saveSlotBtn.disabled = false;
        saveSlotBtn.innerHTML = "Save";
      }
    });
}

// Toggle slot status
function toggleSlotStatus(slotId, newStatus) {
  fetch(`${window.API_URL}/slots/${slotId}/status`, {
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
          throw new Error(data.message || "Failed to update slot status");
        });
      }
      return response.json();
    })
    .then((data) => {
      // Show success message
      showAlert(data.message, "success");

      // Reload slots
      loadSlots();
    })
    .catch((error) => {
      console.error("Toggle status error:", error);
      showAlert(error.message, "danger");
    });
}

// Handle confirm delete button click
function handleSlotDeleteConfirm() {
  if (!confirmSlotDeleteBtn) {
    console.error("Confirm slot delete button not found");
    return;
  }

  const slotId = confirmSlotDeleteBtn.getAttribute("data-id");
  console.log(`Confirming delete for slot ID: ${slotId}`);

  // Show loading state
  confirmSlotDeleteBtn.disabled = true;
  confirmSlotDeleteBtn.innerHTML =
    '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Deleting...';

  fetch(`${window.API_URL}/slots/${slotId}`, {
    method: "DELETE",
    headers: {
      Authorization: localStorage.getItem("token"),
    },
  })
    .then((response) => {
      console.log(`Delete slot response status: ${response.status}`);
      if (!response.ok) {
        return response.json().then((data) => {
          console.log(`Delete error response:`, data);
          throw new Error(data.message || "Failed to delete slot");
        });
      }
      return response.json();
    })
    .then((data) => {
      console.log(`Delete success response:`, data);
      // Hide modal
      if (slotDeleteModal) slotDeleteModal.hide();

      // Show success message
      showAlert(data.message, "success");

      // Reload slots
      loadSlots();
    })
    .catch((error) => {
      console.error("Delete slot error:", error);
      showAlert(error.message, "danger");

      // Hide modal
      if (slotDeleteModal) slotDeleteModal.hide();
    })
    .finally(() => {
      // Reset button state
      if (confirmSlotDeleteBtn) {
        confirmSlotDeleteBtn.disabled = false;
        confirmSlotDeleteBtn.innerHTML = "Delete";
      }
    });
}

// Handle view timetable button click
function handleViewTimetable() {
  const year = viewSlotYearSelect ? viewSlotYearSelect.value : "";
  const semester = viewSlotSemesterSelect ? viewSlotSemesterSelect.value : "";

  if (!year || !semester) {
    showAlert("Please select both academic year and semester type.", "warning");
    return;
  }

  // Fetch slots for the selected year and semester
  fetch(`${window.API_URL}/slots/${year}/${semester}`, {
    headers: {
      Authorization: localStorage.getItem("token"),
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to get slots for timetable");
      }
      return response.json();
    })
    .then((slots) => {
      // Generate the timetable
      generateTimetable(slots, year, semester);
    })
    .catch((error) => {
      console.error("View timetable error:", error);
      showAlert("Failed to load timetable data. Please try again.", "danger");
    });
}

// Generate the timetable view
function generateTimetable(slots, year, semester) {
  // Show the timetable container
  if (timetableContainer) {
    timetableContainer.style.display = "block";
  }

  // Set the title
  if (timetableTitle) {
    timetableTitle.textContent = `${semester} semester (AY ${year})`;
  }

  // Create rows for each day
  const days = ["MON", "TUE", "WED", "THU", "FRI"];
  const timeSlots = [
    "9.00-9.50",
    "9.55-10.45",
    "10.50-11.40",
    "11.45-12.35",
    "12.35-1.15",
    "1.15–2.05",
    "2.10-3.00",
    "3.05–3.55",
    "4.00–4.50",
  ];

  // Create a map of day -> time -> slot
  const slotMap = {};
  days.forEach((day) => {
    slotMap[day] = {};
  });

  slots.forEach((slot) => {
    if (!slotMap[slot.slot_day]) {
      slotMap[slot.slot_day] = {};
    }

    // Match the time slot to one of our standard time slots
    const matchingTimeSlot = timeSlots.find((ts) =>
      slot.slot_time.includes(ts)
    );
    if (matchingTimeSlot) {
      slotMap[slot.slot_day][matchingTimeSlot] = slot.slot_name;
    }
  });

  // Generate the timetable HTML
  let tableHtml = "";
  days.forEach((day) => {
    let rowHtml = `<tr><td class="table-secondary"><strong>${day}</strong></td>`;

    // Theory slots
    for (let i = 0; i < 4; i++) {
      const timeSlot = timeSlots[i];
      rowHtml += `<td class="text-center">${slotMap[day][timeSlot] || ""}</td>`;
    }

    // Lunch
    rowHtml += `<td class="table-secondary text-center">LUNCH</td>`;

    // Afternoon slots
    for (let i = 5; i < 9; i++) {
      const timeSlot = timeSlots[i];
      rowHtml += `<td class="text-center">${slotMap[day][timeSlot] || ""}</td>`;
    }

    rowHtml += "</tr>";
    tableHtml += rowHtml;

    // Lab slots row
    let labRowHtml = `<tr><td class="table-warning">Lab</td>`;

    // Morning labs (use placeholders for now)
    labRowHtml += `<td class="text-center table-warning" colspan="2">L${
      day === "MON"
        ? "1+L2"
        : day === "TUE"
        ? "5+L6"
        : day === "WED"
        ? "9+L10"
        : day === "THU"
        ? "13+L14"
        : "17-L18"
    }</td>`;
    labRowHtml += `<td class="text-center table-warning" colspan="2">L${
      day === "MON"
        ? "3+L4"
        : day === "TUE"
        ? "7+L8"
        : day === "WED"
        ? "11+L12"
        : day === "THU"
        ? "15+L16"
        : "19+L20"
    }</td>`;

    // Lunch
    labRowHtml += `<td class="table-secondary"></td>`;

    // Afternoon labs
    labRowHtml += `<td class="text-center table-warning" colspan="2">L${
      day === "MON"
        ? "21+L22"
        : day === "TUE"
        ? "25+L26"
        : day === "WED"
        ? "29+L30"
        : day === "THU"
        ? "33+L34"
        : "37+L38"
    }</td>`;
    labRowHtml += `<td class="text-center table-warning" colspan="2">L${
      day === "MON"
        ? "23+L24"
        : day === "TUE"
        ? "27+L28"
        : day === "WED"
        ? "31+L32"
        : day === "THU"
        ? "35+L36"
        : "39+L40"
    }</td>`;

    labRowHtml += "</tr>";
    tableHtml += labRowHtml;
  });

  // Update the table
  if (masterSlotTable && masterSlotTable.querySelector("tbody")) {
    masterSlotTable.querySelector("tbody").innerHTML = tableHtml;
  }
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
