// DOM elements will be initialized in the DOMContentLoaded event
let facultyAllocationTableBody;
let addFacultyAllocationBtn;
let saveFacultyAllocationBtn;

// Faculty allocation form elements
let facultyAllocationForm;
let allocationYearInput;
let allocationCourseCodeInput;
let allocationCourseNameDisplay;
let allocationCourseTpcDisplay;
let allocationSemesterTypeInput;
let allocationEmployeeIdInput;
let allocationFacultyNameDisplay;
let allocationSlotNameInput;
let allocationSlotDayDisplay;
let allocationVenueTypeInput;
let allocationVenueInput;
let allocationComponentTypeInput;

// P=4 Lab Selection elements (Fall 2025-26)
let p4LabSelectionContainer;
let allocationLabPair1;
let allocationLabPair2;
let allocationLabDayTime1;
let allocationLabDayTime2;
let allocationLabVenueType1;
let allocationLabVenueType2;
let allocationLabVenue1;
let allocationLabVenue2;
let p4ValidationMessage;
let redundantVenueTypeField;
let redundantVenueField;

// View elements
let viewFacultyYearSelect;
let viewFacultySemesterSelect;
let viewFacultySelect;
let viewFacultyTimetableBtn;
let facultyTimetableContainer;
let facultyTimetableTitle;

let viewClassYearSelect;
let viewClassSemesterSelect;
let viewClassVenueSelect;
let viewClassTimetableBtn;
let classTimetableContainer;
let classTimetableTitle;

// Modal elements
let facultyAllocationModal;
let facultyAllocationModalLabel;
let facultyAllocationDeleteModal;
let confirmFacultyAllocationDeleteBtn;

// Global data
let availableSlots = [];
let courseData = {};
let facultyData = {};
let currentAllocations = [];
let isEditMode = false;
let currentEditData = null;

// Initialize faculty allocation functionality
document.addEventListener("DOMContentLoaded", () => {
  console.log("faculty-allocation.js: DOM loaded");

  console.log(
    "Course code input:",
    document.getElementById("allocation-course-code-field")
  );
  console.log(
    "Course name display:",
    document.getElementById("allocation-course-name-display")
  );
  console.log(
    "Employee ID input:",
    document.getElementById("allocation-employee-id-field")
  );
  console.log(
    "Faculty name display:",
    document.getElementById("allocation-faculty-name-display")
  );

  // Initialize form elements
  facultyAllocationForm = document.getElementById("faculty-allocation-form");
  allocationYearInput = document.getElementById("allocation-year-field");
  allocationCourseCodeInput = document.getElementById(
    "allocation-course-code-field"
  );
  allocationCourseNameDisplay = document.getElementById(
    "allocation-course-name-display"
  );
  allocationCourseTpcDisplay = document.getElementById(
    "allocation-course-tpc-display"
  );
  allocationSemesterTypeInput = document.getElementById(
    "allocation-semester-type-field"
  );
  allocationSemesterInput = allocationSemesterTypeInput; // Create alias for backward compatibility
  allocationEmployeeIdInput = document.getElementById(
    "allocation-employee-id-field"
  );
  allocationFacultyNameDisplay = document.getElementById(
    "allocation-faculty-name-display"
  );
  allocationSlotNameInput = document.getElementById(
    "allocation-slot-name-field"
  );
  allocationSlotDayDisplay = document.getElementById(
    "allocation-slot-day-display"
  );
  allocationVenueTypeInput = document.getElementById(
    "allocation-venue-type-field"
  );
  allocationVenueInput = document.getElementById("allocation-venue-field");
  allocationComponentTypeInput = document.getElementById(
    "allocation-component-type-field"
  );

  // Initialize P=4 lab selection elements (Fall 2025-26)
  p4LabSelectionContainer = document.getElementById("p4-lab-selection-container");
  allocationLabPair1 = document.getElementById("allocation-lab-pair-1");
  allocationLabPair2 = document.getElementById("allocation-lab-pair-2");
  allocationLabDayTime1 = document.getElementById("allocation-lab-day-time-1");
  allocationLabDayTime2 = document.getElementById("allocation-lab-day-time-2");
  allocationLabVenueType1 = document.getElementById("allocation-lab-venue-type-1");
  allocationLabVenueType2 = document.getElementById("allocation-lab-venue-type-2");
  allocationLabVenue1 = document.getElementById("allocation-lab-venue-1");
  allocationLabVenue2 = document.getElementById("allocation-lab-venue-2");
  p4ValidationMessage = document.getElementById("p4-validation-message");
  redundantVenueTypeField = document.getElementById("allocation-venue-type-field");
  redundantVenueField = document.getElementById("allocation-venue-field");

  // Initialize view elements
  viewFacultyYearSelect = document.getElementById("view-faculty-year");
  viewFacultySemesterSelect = document.getElementById("view-faculty-semester");
  viewFacultySelect = document.getElementById("view-faculty-select");
  viewFacultyTimetableBtn = document.getElementById(
    "view-faculty-timetable-btn"
  );
  facultyTimetableContainer = document.getElementById(
    "faculty-timetable-container"
  );
  facultyTimetableTitle = document.getElementById("faculty-timetable-title");

  viewClassYearSelect = document.getElementById("view-class-year");
  viewClassSemesterSelect = document.getElementById("view-class-semester");
  viewClassVenueSelect = document.getElementById("view-class-venue");
  viewClassTimetableBtn = document.getElementById("view-class-timetable-btn");
  classTimetableContainer = document.getElementById(
    "class-timetable-container"
  );
  classTimetableTitle = document.getElementById("class-timetable-title");

  // Initialize modal elements
  facultyAllocationModalLabel = document.getElementById(
    "facultyAllocationModalLabel"
  );
  addFacultyAllocationBtn = document.getElementById(
    "add-faculty-allocation-btn"
  );
  saveFacultyAllocationBtn = document.getElementById(
    "save-faculty-allocation-btn"
  );
  confirmFacultyAllocationDeleteBtn = document.getElementById(
    "confirm-faculty-allocation-delete-btn"
  );

  // Initialize Bootstrap modal objects
  const facultyAllocationModalElement = document.getElementById(
    "facultyAllocationModal"
  );
  const facultyAllocationDeleteModalElement = document.getElementById(
    "facultyAllocationDeleteModal"
  );

  if (facultyAllocationModalElement) {
    facultyAllocationModal = new bootstrap.Modal(facultyAllocationModalElement);
  }

  if (facultyAllocationDeleteModalElement) {
    facultyAllocationDeleteModal = new bootstrap.Modal(
      facultyAllocationDeleteModalElement
    );
  }

  // Setup event listeners
  if (addFacultyAllocationBtn) {
    addFacultyAllocationBtn.addEventListener(
      "click",
      handleAddFacultyAllocation
    );
  }

  if (saveFacultyAllocationBtn) {
    saveFacultyAllocationBtn.addEventListener(
      "click",
      handleSaveFacultyAllocation
    );
  }

  if (allocationCourseCodeInput) {
    allocationCourseCodeInput.addEventListener("input", (event) => {
      handleCourseCodeInput(event);
      checkConflictsRealTime();
    });
  }

  if (allocationEmployeeIdInput) {
    allocationEmployeeIdInput.addEventListener("input", (event) => {
      handleEmployeeIdInput(event);
      checkConflictsRealTime();
    });
  }

  if (allocationSlotNameInput) {
    allocationSlotNameInput.addEventListener("change", (event) => {
      handleSlotNameChange(event);
      checkConflictsRealTime();
    });
  }

  if (allocationVenueInput) {
    allocationVenueInput.addEventListener("change", (event) => {
      handleVenueChange(event);
      checkConflictsRealTime();
    });
    // Add searchable overlay to venue dropdown
    setupSearchableSelect(allocationVenueInput, "Type venue name to search...");
  }
  if (allocationYearInput) {
    allocationYearInput.addEventListener("change", checkConflictsRealTime);
  }

  if (allocationSemesterTypeInput) {
    allocationSemesterTypeInput.addEventListener(
      "change",
      checkConflictsRealTime
    );
  }
  if (allocationVenueTypeInput) {
    allocationVenueTypeInput.addEventListener("change", handleVenueTypeChange);
  }

  if (allocationComponentTypeInput) {
    allocationComponentTypeInput.addEventListener(
      "change",
      handleComponentTypeChange
    );
  }

  // P=4 lab selection event listeners (Fall 2025-26)
  if (allocationLabPair1) {
    allocationLabPair1.addEventListener("change", handleLabPair1Change);
  }

  if (allocationLabPair2) {
    allocationLabPair2.addEventListener("change", handleLabPair2Change);
  }

  if (allocationLabVenueType1) {
    allocationLabVenueType1.addEventListener("change", handleLabVenueType1Change);
  }

  if (allocationLabVenueType2) {
    allocationLabVenueType2.addEventListener("change", handleLabVenueType2Change);
  }

  if (allocationLabVenue1) {
    allocationLabVenue1.addEventListener("change", handleLabVenue1Change);
  }

  if (allocationLabVenue2) {
    allocationLabVenue2.addEventListener("change", handleLabVenue2Change);
  }

  if (viewFacultyTimetableBtn) {
    viewFacultyTimetableBtn.addEventListener(
      "click",
      handleViewFacultyTimetable
    );
  }

  if (viewClassTimetableBtn) {
    viewClassTimetableBtn.addEventListener("click", handleViewClassTimetable);
  }

  setupSearchFunctionality();

  // Setup navigation for Faculty Slot Timetable
  setupFacultyAllocationNavigation();

  if (allocationCourseCodeInput && allocationEmployeeIdInput) {
    setupCourseCodeAutocomplete();
    setupFacultyNameAutocomplete();
  }
});

// Setup navigation for faculty allocation
function setupFacultyAllocationNavigation() {
  const createFacultySlotLink = document.getElementById(
    "create-faculty-slot-link"
  );
  const viewFacultySlotLink = document.getElementById("view-faculty-slot-link");
  const viewClassSlotLink = document.getElementById("view-class-slot-link");

  if (createFacultySlotLink) {
    createFacultySlotLink.addEventListener("click", () => {
      showCreateFacultyAllocationPage();
    });
  }

  if (viewFacultySlotLink) {
    viewFacultySlotLink.addEventListener("click", () => {
      showViewFacultyTimetablePage();
    });
  }

  if (viewClassSlotLink) {
    viewClassSlotLink.addEventListener("click", () => {
      showViewClassTimetablePage();
    });
  }
}

// Show create faculty allocation page
function showCreateFacultyAllocationPage() {
  console.log("Showing create faculty allocation page");

  document.querySelectorAll(".content-page").forEach((page) => {
    page.classList.remove("active");
  });

  const facultyAllocationPage = document.getElementById(
    "create-faculty-allocation-page"
  );
  if (facultyAllocationPage) {
    facultyAllocationPage.classList.add("active");
  }

  document.getElementById("page-title").textContent =
    "Create Faculty Slot Allocation";

  // Load necessary data
  loadFacultyAllocations();
  populateDropdowns();
}

// Show view faculty timetable page
function showViewFacultyTimetablePage() {
  document.querySelectorAll(".content-page").forEach((page) => {
    page.classList.remove("active");
  });
  document
    .getElementById("view-faculty-timetable-page")
    .classList.add("active");
  document.getElementById("page-title").textContent =
    "View Faculty Slot Timetable";

  // Load necessary data
  populateViewDropdowns();
}

// Show view class timetable page
function showViewClassTimetablePage() {
  document.querySelectorAll(".content-page").forEach((page) => {
    page.classList.remove("active");
  });
  document.getElementById("view-class-timetable-page").classList.add("active");
  document.getElementById("page-title").textContent =
    "View Class Slot Timetable";

  // Load necessary data
  populateViewDropdowns();
}

// Load faculty allocations
function loadFacultyAllocations() {
  console.log("Loading faculty allocations");

  // Check if table body exists
  facultyAllocationTableBody = document.getElementById(
    "faculty-allocation-table"
  );
  console.log("Faculty allocation table body:", facultyAllocationTableBody);

  if (!facultyAllocationTableBody) {
    console.error("Faculty allocation table body not found!");
    return;
  }

  // Show loading state
  facultyAllocationTableBody.innerHTML =
    '<tr><td colspan="10" class="text-center">Loading faculty allocations...</td></tr>';

  fetch(`${window.API_URL}/faculty-allocations`, {
    headers: {
      Authorization: localStorage.getItem("token"),
    },
  })
    .then((response) => {
      console.log("Response status:", response.status);
      if (!response.ok) {
        throw new Error("Failed to load faculty allocations");
      }
      return response.json();
    })
    .then((allocations) => {
      console.log("Fetched allocations:", allocations);
      currentAllocations = allocations;
      renderFacultyAllocations(allocations);
    })
    .catch((error) => {
      console.error("Load faculty allocations error:", error);
      localShowAlert("Failed to load faculty allocations", "danger");

      if (facultyAllocationTableBody) {
        facultyAllocationTableBody.innerHTML =
          '<tr><td colspan="10" class="text-center text-danger">Error loading faculty allocations. Please try again.</td></tr>';
      }
    });
}

// Render faculty allocations
function renderFacultyAllocations(allocations) {
  console.log("Rendering allocations:", allocations);
  console.log("Table body element:", facultyAllocationTableBody);

  if (!facultyAllocationTableBody) {
    console.error("Table body not found in render function!");
    return;
  }

  if (!allocations || allocations.length === 0) {
    facultyAllocationTableBody.innerHTML =
      '<tr><td colspan="10" class="text-center">No faculty allocations found.</td></tr>';
    return;
  }

  facultyAllocationTableBody.innerHTML = "";

  // Group allocations by course, faculty, and venue to identify linked sets
  const processedIds = new Set();
  const allocationGroups = new Map();

  // First pass: group related allocations
  allocations.forEach((allocation) => {
    const baseKey = `${allocation.slot_year}-${allocation.semester_type}-${allocation.course_code}-${allocation.employee_id}-${allocation.venue}`;

    if (!allocationGroups.has(baseKey)) {
      allocationGroups.set(baseKey, []);
    }
    allocationGroups.get(baseKey).push(allocation);
  });

  // Second pass: render grouped allocations
  allocationGroups.forEach((group, baseKey) => {
    if (processedIds.has(baseKey)) {
      return;
    }

    // Check if this is a 4-hour lab course allocation
    const firstAllocation = group[0];
    let is4HourLab = false;
    let morningSlots = [];
    let afternoonSlots = [];

    // Detect 4-hour lab pattern: compound slots + linked afternoon slots
    if (
      firstAllocation.semester_type === "SUMMER" &&
      firstAllocation.practical === 4 &&
      group.some((a) => a.slot_name.includes(","))
    ) {
      is4HourLab = true;

      // Separate morning and afternoon slots
      group.forEach((allocation) => {
        if (allocation.slot_name.includes(",")) {
          // This is the compound slot entry
          const slots = allocation.slot_name.split(", ");
          slots.forEach((slot) => {
            if (slot.startsWith("L") && parseInt(slot.match(/\d+/)[0]) < 21) {
              morningSlots.push({ ...allocation, individual_slot: slot });
            } else if (
              slot.startsWith("L") &&
              parseInt(slot.match(/\d+/)[0]) >= 21
            ) {
              afternoonSlots.push({ ...allocation, individual_slot: slot });
            }
          });
        } else {
          // Individual slot allocations
          if (
            allocation.slot_name.startsWith("L") &&
            parseInt(allocation.slot_name.match(/\d+/)[0]) < 21
          ) {
            morningSlots.push(allocation);
          } else if (
            allocation.slot_name.startsWith("L") &&
            parseInt(allocation.slot_name.match(/\d+/)[0]) >= 21
          ) {
            afternoonSlots.push(allocation);
          }
        }
      });

      console.log(
        `4-hour lab detected: ${morningSlots.length} morning + ${afternoonSlots.length} afternoon slots`
      );
    }

    // Render based on allocation type
    if (is4HourLab) {
      // Render 4-hour lab as a single grouped row
      const row = document.createElement("tr");
      row.classList.add("table-warning"); // Different highlight for 4-hour labs

      // Collect all slot names for display
      const allSlotNames = [
        ...morningSlots.map((s) => s.individual_slot || s.slot_name),
        ...afternoonSlots.map((s) => s.individual_slot || s.slot_name),
      ];
      const uniqueSlotNames = [...new Set(allSlotNames)];

      // Collect all day/time combinations
      const allDayTimes = group.map((a) => `${a.slot_day} ${a.slot_time}`);
      const uniqueDayTimes = [...new Set(allDayTimes)];

      row.innerHTML = `
        <td>${firstAllocation.slot_year}</td>
        <td>${firstAllocation.semester_type}</td>
        <td>${firstAllocation.course_code}</td>
        <td>${firstAllocation.course_name || "N/A"}</td>
        <td>${firstAllocation.theory || "0"}-${
        firstAllocation.practical || "0"
      }-${firstAllocation.credits || "0"}</td>
        <td>${firstAllocation.faculty_name || "N/A"}</td>
        <td>
          <span class="badge bg-warning text-dark">4-Hour Lab</span><br>
          <small>${uniqueSlotNames.join(", ")}</small>
        </td>
        <td>
          <small>${uniqueDayTimes.join("<br>")}</small>
        </td>
        <td>${firstAllocation.venue}</td>
        <td>
          ${
            currentUser && (currentUser.role === "admin" || currentUser.role === "timetable_coordinator")
              ? `
            <button class="btn btn-sm btn-primary edit-allocation-btn"
              data-allocation='${JSON.stringify(firstAllocation)}'>
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-danger delete-allocation-btn"
              data-allocation='${JSON.stringify(firstAllocation)}'>
              <i class="fas fa-trash"></i>
            </button>
          `
              : ""
          }
        </td>
      `;
      facultyAllocationTableBody.appendChild(row);
    } else {
      // Render regular allocations (existing logic)
      group.forEach((allocation, index) => {
        const allocationKey = `${baseKey}-${allocation.slot_name}`;

        if (processedIds.has(allocationKey)) {
          return;
        }

        // Check for regular 2-hour summer lab linking
        let linkedAllocation = null;
        let isLinkedPair = false;

        if (
          allocation.semester_type === "SUMMER" &&
          allocation.slot_name.startsWith("L") &&
          allocation.slot_name.includes("+") &&
          !allocation.slot_name.includes(",") // Not a compound slot
        ) {
          // Determine linked slot name pattern (L1+L2 -> L21+L22 or vice versa)
          let linkedSlotName = null;

          if (
            allocation.slot_name.match(/L\d+\+L\d+/) &&
            parseInt(allocation.slot_name.match(/\d+/)[0]) < 21
          ) {
            // This is a morning lab slot, find afternoon equivalent
            const slotNumbers = allocation.slot_name.match(/L(\d+)\+L(\d+)/);
            if (slotNumbers && slotNumbers.length === 3) {
              const firstNum = parseInt(slotNumbers[1]) + 20;
              const secondNum = parseInt(slotNumbers[2]) + 20;
              linkedSlotName = `L${firstNum}+L${secondNum}`;
            }
          } else if (
            allocation.slot_name.match(/L\d+\+L\d+/) &&
            parseInt(allocation.slot_name.match(/\d+/)[0]) >= 21
          ) {
            // This is an afternoon lab slot, find morning equivalent
            const slotNumbers = allocation.slot_name.match(/L(\d+)\+L(\d+)/);
            if (slotNumbers && slotNumbers.length === 3) {
              const firstNum = parseInt(slotNumbers[1]) - 20;
              const secondNum = parseInt(slotNumbers[2]) - 20;
              linkedSlotName = `L${firstNum}+L${secondNum}`;
            }
          }

          // If we found a linked slot name, look for it in the same group
          if (linkedSlotName) {
            linkedAllocation = group.find(
              (a) => a.slot_name === linkedSlotName
            );

            if (linkedAllocation) {
              isLinkedPair = true;
              // Mark the linked allocation as processed
              processedIds.add(`${baseKey}-${linkedAllocation.slot_name}`);
            }
          }
        }

        // Mark current allocation as processed
        processedIds.add(allocationKey);

        const row = document.createElement("tr");

        // Highlight linked pairs
        if (isLinkedPair) {
          row.classList.add("table-info");
        }

        row.innerHTML = `
          <td>${allocation.slot_year}</td>
          <td>${allocation.semester_type}</td>
          <td>${allocation.course_code}</td>
          <td>${allocation.course_name || "N/A"}</td>
          <td>${allocation.theory || "0"}-${allocation.practical || "0"}-${
          allocation.credits || "0"
        }</td>
          <td>${allocation.faculty_name || "N/A"}</td>
          <td>${
            isLinkedPair
              ? `${allocation.slot_name} <br><span class="badge bg-info">Linked with ${linkedAllocation.slot_name}</span>`
              : allocation.slot_name
          }</td>
          <td>${allocation.slot_day} ${allocation.slot_time} ${
          isLinkedPair
            ? `<br><span class="badge bg-light text-dark">${linkedAllocation.slot_day} ${linkedAllocation.slot_time}</span>`
            : ""
        }</td>
          <td>${allocation.venue}</td>
          <td>
            ${
              currentUser && (currentUser.role === "admin" || currentUser.role === "timetable_coordinator")
                ? `
              <button class="btn btn-sm btn-primary edit-allocation-btn"
                data-allocation='${JSON.stringify(allocation)}'>
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn btn-sm btn-danger delete-allocation-btn"
                data-allocation='${JSON.stringify(allocation)}'>
                <i class="fas fa-trash"></i>
              </button>
            `
                : ""
            }
          </td>
        `;
        facultyAllocationTableBody.appendChild(row);
      });
    }

    processedIds.add(baseKey);
  });

  console.log("Finished rendering allocations");

  // Setup event listeners for edit and delete buttons (existing logic)
  document.querySelectorAll(".edit-allocation-btn").forEach((btn) => {
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.addEventListener("click", () => {
      const allocation = JSON.parse(newBtn.getAttribute("data-allocation"));
      openEditAllocationModal(allocation);
    });
  });

  document.querySelectorAll(".delete-allocation-btn").forEach((btn) => {
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.addEventListener("click", () => {
      const allocation = JSON.parse(newBtn.getAttribute("data-allocation"));
      openDeleteAllocationModal(allocation);
    });
  });
}
// Add search functionality
function setupSearchFunctionality() {
  const searchInput = document.getElementById("faculty-allocation-search");

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const searchTerm = e.target.value.toLowerCase().trim();
      console.log("Searching for:", searchTerm);

      if (!currentAllocations || currentAllocations.length === 0) {
        return;
      }

      const filteredAllocations = currentAllocations.filter((allocation) => {
        return (
          allocation.slot_year.toLowerCase().includes(searchTerm) ||
          allocation.semester_type.toLowerCase().includes(searchTerm) ||
          allocation.course_code.toLowerCase().includes(searchTerm) ||
          (allocation.course_name &&
            allocation.course_name.toLowerCase().includes(searchTerm)) ||
          (allocation.faculty_name &&
            allocation.faculty_name.toLowerCase().includes(searchTerm)) ||
          allocation.slot_name.toLowerCase().includes(searchTerm) ||
          allocation.slot_day.toLowerCase().includes(searchTerm) ||
          allocation.venue.toLowerCase().includes(searchTerm)
        );
      });

      console.log("Filtered allocations:", filteredAllocations);
      renderFacultyAllocations(filteredAllocations);
    });
  }
}

// Populate dropdowns
function populateDropdowns() {
  // Load academic years
  populateAcademicYears();

  // Load venue types
  populateVenueTypes();

  // Load other data as needed
}

// Populate academic years
function populateAcademicYears() {
  fetch(`${window.API_URL}/slots`, {
    headers: {
      Authorization: localStorage.getItem("token"),
    },
  })
    .then((response) => response.json())
    .then((slots) => {
      const years = new Set();
      slots.forEach((slot) => years.add(slot.slot_year));

      const sortedYears = Array.from(years).sort().reverse();

      // Populate create form dropdown
      if (allocationYearInput) {
        allocationYearInput.innerHTML = '<option value="">Select Year</option>';
        sortedYears.forEach((year) => {
          const option = document.createElement("option");
          option.value = year;
          option.textContent = year;
          allocationYearInput.appendChild(option);
        });
      }

      // Populate view form dropdowns
      if (viewFacultyYearSelect) {
        viewFacultyYearSelect.innerHTML =
          '<option value="">Select Year</option>';
        sortedYears.forEach((year) => {
          const option = document.createElement("option");
          option.value = year;
          option.textContent = year;
          viewFacultyYearSelect.appendChild(option);
        });
      }

      if (viewClassYearSelect) {
        viewClassYearSelect.innerHTML = '<option value="">Select Year</option>';
        sortedYears.forEach((year) => {
          const option = document.createElement("option");
          option.value = year;
          option.textContent = year;
          viewClassYearSelect.appendChild(option);
        });
      }
    })
    .catch((error) => {
      console.error("Error loading academic years:", error);
    });
}

// Populate venue types
function populateVenueTypes() {
  fetch(`${window.API_URL}/venues`, {
    headers: {
      Authorization: localStorage.getItem("token"),
    },
  })
    .then((response) => response.json())
    .then((venues) => {
      const venueTypes = new Set();
      venues.filter(v => v.is_active === true).forEach((venue) => venueTypes.add(venue.infra_type));

      if (allocationVenueTypeInput) {
        allocationVenueTypeInput.innerHTML =
          '<option value="">Select Venue Type</option>';
        Array.from(venueTypes)
          .sort()
          .forEach((type) => {
            const option = document.createElement("option");
            option.value = type;
            option.textContent = type;
            allocationVenueTypeInput.appendChild(option);
          });
      }
    })
    .catch((error) => {
      console.error("Error loading venue types:", error);
    });
}

// Handle course code input
function handleCourseCodeInput(event) {
  const courseCode = event.target.value.trim().toUpperCase();
  console.log("Course code typed:", courseCode);

  if (courseCode.length < 2) {
    allocationCourseNameDisplay.textContent = "";
    allocationCourseTpcDisplay.textContent = "";
    return;
  }

  // Fetch all courses and filter client-side for now
  fetch(`${window.API_URL}/courses`, {
    headers: {
      Authorization: localStorage.getItem("token"),
    },
  })
    .then((response) => {
      console.log("Response status:", response.status);
      return response.json();
    })
    .then((courses) => {
      console.log("All courses:", courses);
      console.log("Number of courses:", courses.length);

      // Filter courses that start with the typed code
      const matchingCourses = courses.filter((c) =>
        c.course_code.toUpperCase().startsWith(courseCode)
      );
      console.log("Matching courses:", matchingCourses);

      // If exact match found, populate the fields
      const exactMatch = courses.find(
        (c) => c.course_code.toUpperCase() === courseCode
      );
      console.log("Exact match:", exactMatch);

      if (exactMatch) {
        courseData = exactMatch;
        console.log("Setting course name display:", exactMatch.course_name);
        allocationCourseNameDisplay.textContent = exactMatch.course_name;
        allocationCourseTpcDisplay.textContent = `${exactMatch.theory}-${exactMatch.practical}-${exactMatch.credits}`;

        // Update component type options for TEL courses
        updateComponentTypeOptions(exactMatch);

        // Check if P=4 lab selection should be shown (Fall 2025-26)
        const componentType = allocationComponentTypeInput ? allocationComponentTypeInput.value : "";
        toggleP4LabSelection(exactMatch, componentType);

        // Update available slots based on TPC
        updateAvailableSlots(exactMatch);
      } else {
        allocationCourseNameDisplay.textContent = "";
        allocationCourseTpcDisplay.textContent = "";
      }
    })
    .catch((error) => {
      console.error("Error fetching course details:", error);
    });
}

// Handle employee ID input
function handleEmployeeIdInput(event) {
  const employeeId = event.target.value.trim();
  console.log("Employee ID typed:", employeeId);

  if (!employeeId) {
    allocationFacultyNameDisplay.textContent = "";
    return;
  }

  // Fetch all faculty and filter client-side
  fetch(`${window.API_URL}/faculty`, {
    headers: {
      Authorization: localStorage.getItem("token"),
    },
  })
    .then((response) => {
      console.log("Faculty response status:", response.status);
      return response.json();
    })
    .then((facultyList) => {
      console.log("All faculty:", facultyList);
      console.log("Number of faculty:", facultyList.length);

      // Find exact match by employee ID
      const matchingFaculty = facultyList.find(
        (f) => f.employee_id.toString() === employeeId
      );
      console.log("Matching faculty:", matchingFaculty);

      if (matchingFaculty) {
        facultyData = matchingFaculty;
        console.log("Setting faculty name display:", matchingFaculty.name);
        allocationFacultyNameDisplay.textContent = matchingFaculty.name;

        // If course is already selected, refresh slots with faculty-specific logic
        if (courseData && courseData.course_code) {
          console.log("Faculty selected, refreshing slots with enhanced API");
          updateAvailableSlots(courseData);
        } else {
          // Fallback to original logic if course not selected yet
          updateFacultyAvailableSlots();
          checkAndDisableConflictingSlots();
        }
      } else {
        allocationFacultyNameDisplay.textContent = "";
      }
    })
    .catch((error) => {
      console.error("Error fetching faculty details:", error);
    });
}

// Update component type options for TEL courses
function updateComponentTypeOptions(course) {
  if (!allocationComponentTypeInput) return;

  allocationComponentTypeInput.innerHTML = "";

  if (course.course_type === "TEL") {
    // Show component type selection for TEL courses
    allocationComponentTypeInput.style.display = "block";

    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "Select Component Type";
    allocationComponentTypeInput.appendChild(defaultOption);

    if (course.theory > 0) {
      const theoryOption = document.createElement("option");
      theoryOption.value = "theory";
      theoryOption.textContent = "Theory Component";
      allocationComponentTypeInput.appendChild(theoryOption);
    }

    if (course.practical > 0) {
      const labOption = document.createElement("option");
      labOption.value = "lab";
      labOption.textContent = "Lab Component";
      allocationComponentTypeInput.appendChild(labOption);
    }
  } else {
    // Hide for non-TEL courses
    allocationComponentTypeInput.style.display = "none";
  }
}

// Update available slots based on course TPC and faculty availability
function updateAvailableSlots(course) {
  if (!allocationSlotNameInput) return;

  const year = allocationYearInput.value;
  const semesterType = allocationSemesterInput.value;
  const componentType = allocationComponentTypeInput
    ? allocationComponentTypeInput.value
    : "";
  const facultyId = allocationEmployeeIdInput.value;

  if (!year || !semesterType) return;

  // Save current selection before clearing dropdown
  const previouslySelectedSlot = allocationSlotNameInput.value;

  // If both course and faculty are selected, use the enhanced API
  if (facultyId && facultyData && facultyData.employee_id) {
    console.log("Using enhanced faculty-specific slot API");

    fetch(
      `${window.API_URL}/faculty-allocations/available-slots-for-faculty?` +
        `facultyId=${facultyId}&courseCode=${course.course_code}&year=${year}&semesterType=${semesterType}` +
        `${componentType ? `&componentType=${componentType}` : ""}`,
      {
        headers: {
          Authorization: localStorage.getItem("token"),
        },
      }
    )
      .then((response) => response.json())
      .then((data) => {
        console.log("Enhanced API response:", data);
        populateSlotDropdownWithAvailability(data, previouslySelectedSlot);
      })
      .catch((error) => {
        console.error("Error fetching enhanced available slots:", error);
        // Fallback to original API
        useOriginalSlotAPI(
          course,
          year,
          semesterType,
          componentType,
          previouslySelectedSlot
        );
      });
  } else {
    // Use original API when faculty is not selected yet
    console.log("Using original slot API (faculty not selected)");
    useOriginalSlotAPI(
      course,
      year,
      semesterType,
      componentType,
      previouslySelectedSlot
    );
  }
}

// Original slot API logic (fallback)
function useOriginalSlotAPI(
  course,
  year,
  semesterType,
  componentType,
  previouslySelectedSlot
) {
  fetch(
    `${window.API_URL}/faculty-allocations/available-slots?` +
      `courseCode=${course.course_code}&year=${year}&semesterType=${semesterType}` +
      `${componentType ? `&componentType=${componentType}` : ""}`,
    {
      headers: {
        Authorization: localStorage.getItem("token"),
      },
    }
  )
    .then((response) => response.json())
    .then((data) => {
      // Store linked slots information globally
      window.slotLinks = data.slotLinks || {};

      // Clear the dropdown
      allocationSlotNameInput.innerHTML =
        '<option value="">Select Slot</option>';

      // Add the slots returned from the API (existing logic)
      if (data.availableSlots && data.availableSlots.length > 0) {
        populateBasicSlotDropdown(
          data.availableSlots,
          data.slotLinks,
          previouslySelectedSlot
        );
      } else {
        console.warn("No available slots returned from original API");
        const option = document.createElement("option");
        option.value = "";
        option.textContent = "No slots available";
        option.disabled = true;
        allocationSlotNameInput.appendChild(option);
      }
    })
    .catch((error) => {
      console.error("Error fetching available slots:", error);
      localShowAlert(
        "Error fetching available slots. Please try again.",
        "danger"
      );
    });
}

// Populate dropdown with availability information (NEW ENHANCED VERSION)
function populateSlotDropdownWithAvailability(data, previouslySelectedSlot) {
  // Store linked slots information globally
  window.slotLinks = data.slotLinks || {};

  // Clear the dropdown
  allocationSlotNameInput.innerHTML = '<option value="">Select Slot</option>';

  const availableSlots = data.availableSlots || [];
  const disabledSlots = data.disabledSlots || [];
  const allSlots = [...availableSlots];

  // Add disabled slot names to show them as disabled options
  disabledSlots.forEach((disabled) => {
    if (!allSlots.includes(disabled.slotName)) {
      allSlots.push(disabled.slotName);
    }
  });

  if (allSlots.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No slots available";
    option.disabled = true;
    allocationSlotNameInput.appendChild(option);
    return;
  }

  // Sort slots: available first, then disabled
  allSlots.sort((a, b) => {
    const aDisabled = disabledSlots.find((d) => d.slotName === a);
    const bDisabled = disabledSlots.find((d) => d.slotName === b);

    if (aDisabled && !bDisabled) return 1;
    if (!aDisabled && bDisabled) return -1;

    // Sort by slot name within each group
    return a.localeCompare(b);
  });

  // Add options to dropdown
  allSlots.forEach((slotName) => {
    const option = document.createElement("option");
    option.value = slotName;

    // Check if this slot is disabled
    const disabledInfo = disabledSlots.find((d) => d.slotName === slotName);

    if (disabledInfo) {
      // Disabled slot - show with reason
      option.disabled = true;
      option.style.color = "#dc3545";
      option.style.fontStyle = "italic";

      // Enhanced display with conflict reason
      if (slotName.includes(",") && slotName.startsWith("L")) {
        option.textContent = `❌ 4-Hour Lab: ${slotName} - ${disabledInfo.reason}`;
      } else if (data.slotLinks && data.slotLinks[slotName]) {
        option.textContent = `❌ ${slotName} (+ ${data.slotLinks[slotName].join(
          ", "
        )}) - ${disabledInfo.reason}`;
      } else {
        option.textContent = `❌ ${slotName} - ${disabledInfo.reason}`;
      }

      // Add detailed reason as title for tooltip
      option.title = disabledInfo.details || disabledInfo.reason;
    } else {
      // Available slot - show normally
      option.style.color = "#198754";

      if (slotName.includes(",") && slotName.startsWith("L")) {
        const linkedSlots =
          data.slotLinks && data.slotLinks[slotName]
            ? data.slotLinks[slotName]
            : [];
        if (linkedSlots.length > 0) {
          option.textContent = `✅ 4-Hour Lab: ${slotName} ↔ ${linkedSlots.join(
            ", "
          )}`;
          option.style.fontWeight = "bold";
        } else {
          option.textContent = `✅ 4-Hour Lab: ${slotName}`;
          option.style.fontWeight = "bold";
        }
      } else if (data.slotLinks && data.slotLinks[slotName]) {
        option.textContent = `✅ ${slotName} (linked with ${data.slotLinks[
          slotName
        ].join(", ")})`;
      } else {
        option.textContent = `✅ ${slotName}`;
      }
    }

    allocationSlotNameInput.appendChild(option);
  });

  // Restore previous selection if it's still available
  if (
    previouslySelectedSlot &&
    availableSlots.includes(previouslySelectedSlot)
  ) {
    allocationSlotNameInput.value = previouslySelectedSlot;

    // Trigger the change event to update slot day display
    const changeEvent = new Event("change");
    allocationSlotNameInput.dispatchEvent(changeEvent);
  }

  console.log(
    `Populated dropdown: ${availableSlots.length} available, ${disabledSlots.length} disabled`
  );
}

// Populate basic dropdown (existing logic for when faculty not selected)
function populateBasicSlotDropdown(
  availableSlots,
  slotLinks,
  previouslySelectedSlot
) {
  // Sort slots: regular lab slots first, then compound 4-hour lab slots
  const regularSlots = availableSlots.filter((slot) => !slot.includes(","));
  const compoundSlots = availableSlots.filter((slot) => slot.includes(","));
  const sortedSlots = [...regularSlots.sort(), ...compoundSlots.sort()];

  sortedSlots.forEach((slotName) => {
    const option = document.createElement("option");
    option.value = slotName;

    // Enhanced display for different slot types (existing logic)
    if (slotName.includes(",") && slotName.startsWith("L")) {
      const linkedSlots =
        slotLinks && slotLinks[slotName] ? slotLinks[slotName] : [];
      if (linkedSlots.length > 0) {
        option.textContent = `🕐 4-Hour Lab: ${slotName} ↔ ${linkedSlots.join(
          ", "
        )}`;
        option.style.fontWeight = "bold";
        option.style.color = "#d63384";
      } else {
        option.textContent = `🕐 4-Hour Lab: ${slotName}`;
        option.style.fontWeight = "bold";
      }
    } else if (slotLinks && slotLinks[slotName]) {
      option.textContent = `${slotName} (linked with ${slotLinks[slotName].join(
        ", "
      )})`;
    } else {
      option.textContent = slotName;
    }

    allocationSlotNameInput.appendChild(option);
  });

  // Restore previous selection if it exists in the new options
  if (
    previouslySelectedSlot &&
    availableSlots.includes(previouslySelectedSlot)
  ) {
    allocationSlotNameInput.value = previouslySelectedSlot;
    const changeEvent = new Event("change");
    allocationSlotNameInput.dispatchEvent(changeEvent);
  }
}

// Update faculty available slots by filtering already allocated
function updateFacultyAvailableSlots() {
  if (
    !facultyData.employee_id ||
    !allocationYearInput.value ||
    !allocationSemesterTypeInput.value
  )
    return;

  // Get faculty allocations
  fetch(
    `${window.API_URL}/faculty-allocations/faculty-timetable?` +
      `employeeId=${facultyData.employee_id}&` +
      `year=${allocationYearInput.value}&` +
      `semesterType=${allocationSemesterTypeInput.value}`,
    {
      headers: {
        Authorization: localStorage.getItem("token"),
      },
    }
  )
    .then((response) => response.json())
    .then((data) => {
      const allocatedSlots = new Set();

      // Only add slots that this faculty actually has allocated
      if (data.allocations && data.allocations.length > 0) {
        data.allocations.forEach((a) => allocatedSlots.add(a.slot_name));
      }

      console.log("Faculty allocated slots:", allocatedSlots);

      // Only disable slots already allocated to this faculty
      if (allocationSlotNameInput) {
        Array.from(allocationSlotNameInput.options).forEach((option) => {
          if (option.value && allocatedSlots.has(option.value)) {
            option.disabled = true;
            option.textContent = `${option.value} (Already Allocated)`;
          }
        });
      }
    })
    .catch((error) => {
      console.error("Error fetching faculty allocations:", error);
    });
}

// Handle slot name change
function handleSlotNameChange(event) {
  const slotName = event.target.value;
  const year = allocationYearInput.value;
  const semesterType = allocationSemesterInput.value;

  if (!slotName || !year || !semesterType) {
    allocationSlotDayDisplay.textContent = "";
    return;
  }

  // Check if this is a linked slot
  const linkedSlots =
    window.slotLinks && window.slotLinks[slotName]
      ? [slotName, ...window.slotLinks[slotName]]
      : [slotName];

  // Get slot details to show days and times
  fetch(`${window.API_URL}/slots/${year}/${semesterType}`, {
    headers: {
      Authorization: localStorage.getItem("token"),
    },
  })
    .then((response) => response.json())
    .then((slots) => {
      console.log("All slots:", slots);
      let allMatchingSlots = [];

      // Process each slot in the linked slots array
      linkedSlots.forEach((currentSlotName) => {
        let matchingSlots = [];

        // Check if this is a compound 4-hour lab slot (e.g., "L1+L2, L3+L4")
        if (currentSlotName.includes(",") && currentSlotName.startsWith("L")) {
          console.log(
            `Processing compound 4-hour lab slot: ${currentSlotName}`
          );

          // Parse individual slot pairs from compound slot
          const slotPairs = currentSlotName.split(", "); // ["L1+L2", "L3+L4"]

          slotPairs.forEach((pairName) => {
            const pairSlots = slots.filter(
              (s) => s.slot_name === pairName.trim()
            );
            matchingSlots = [...matchingSlots, ...pairSlots];
          });
        }
        // Check if this is a regular lab slot (e.g., L1+L2)
        else if (
          currentSlotName.startsWith("L") &&
          currentSlotName.includes("+")
        ) {
          // For lab slots, search for the exact combined name
          matchingSlots = slots.filter((s) => s.slot_name === currentSlotName);
        }
        // Check if this is a combined theory slot (e.g., A1+TA1)
        else if (currentSlotName.includes("+")) {
          const slotParts = currentSlotName.split("+");
          const firstSlotName = slotParts[0];
          const secondSlotName = slotParts[1];

          // Find slots for both parts
          const firstSlotMatches = slots.filter(
            (s) => s.slot_name === firstSlotName
          );
          const secondSlotMatches = slots.filter(
            (s) => s.slot_name === secondSlotName
          );

          // Combine the information from both slot parts
          matchingSlots = [...firstSlotMatches, ...secondSlotMatches];
        } else {
          // Handle regular non-combined slots
          matchingSlots = slots.filter((s) => s.slot_name === currentSlotName);
        }

        allMatchingSlots = [...allMatchingSlots, ...matchingSlots];
      });

      console.log("All matching slots:", allMatchingSlots);

      if (allMatchingSlots.length > 0) {
        let dayTimeDisplay = "";

        // For 4-hour lab compound slots, show structured display
        if (slotName.includes(",") && slotName.startsWith("L")) {
          const morningSlots = slotName.split(", "); // ["L1+L2", "L3+L4"]
          const linkedAfternoonSlots = linkedSlots.filter(
            (s) => s !== slotName
          ); // ["L21+L22, L23+L24"]

          // Display morning slots
          dayTimeDisplay += `🌅 Morning Slots (${slotName}):\n`;
          morningSlots.forEach((morningSlot) => {
            const morningSlotData = allMatchingSlots.filter(
              (s) => s.slot_name === morningSlot.trim()
            );
            if (morningSlotData.length > 0) {
              dayTimeDisplay += `  • ${morningSlot}: ${morningSlotData
                .map((s) => `${s.slot_day} (${s.slot_time})`)
                .join(", ")}\n`;
            }
          });

          // Display afternoon slots if they exist
          if (linkedAfternoonSlots.length > 0) {
            linkedAfternoonSlots.forEach((afternoonCompound) => {
              const afternoonSlots = afternoonCompound.split(", "); // ["L21+L22", "L23+L24"]
              dayTimeDisplay += `\n🌆 Afternoon Slots (${afternoonCompound}):\n`;

              afternoonSlots.forEach((afternoonSlot) => {
                const afternoonSlotData = slots.filter(
                  (s) => s.slot_name === afternoonSlot.trim()
                );
                if (afternoonSlotData.length > 0) {
                  dayTimeDisplay += `  • ${afternoonSlot}: ${afternoonSlotData
                    .map((s) => `${s.slot_day} (${s.slot_time})`)
                    .join(", ")}\n`;
                }
              });
            });

            dayTimeDisplay += `\n⚡ Note: This is a 4-hour lab course. Selecting this slot will automatically allocate both morning and afternoon sessions.`;
          }
        }
        // If there are regular linked slots, show 'Primary:' and 'Linked:'
        else if (linkedSlots.length > 1) {
          // Group by slot name
          const slotsByName = {};
          allMatchingSlots.forEach((slot) => {
            if (!slotsByName[slot.slot_name]) {
              slotsByName[slot.slot_name] = [];
            }
            slotsByName[slot.slot_name].push(slot);
          });

          // Display primary slot
          dayTimeDisplay += `Primary (${slotName}): `;
          dayTimeDisplay += slotsByName[slotName]
            .map((s) => `${s.slot_day} (${s.slot_time})`)
            .join(", ");

          // Display linked slots
          linkedSlots
            .filter((s) => s !== slotName)
            .forEach((linkedSlot) => {
              if (
                slotsByName[linkedSlot] &&
                slotsByName[linkedSlot].length > 0
              ) {
                dayTimeDisplay += `\nLinked (${linkedSlot}): `;
                dayTimeDisplay += slotsByName[linkedSlot]
                  .map((s) => `${s.slot_day} (${s.slot_time})`)
                  .join(", ");
              }
            });

          // Add note for Summer lab slots
          if (
            semesterType === "SUMMER" &&
            slotName.startsWith("L") &&
            slotName.includes("+")
          ) {
            dayTimeDisplay += `\n\nNote: For Summer semester, lab slots are automatically linked (${slotName} with ${linkedSlots[1]}). Both slots will be allocated.`;
          }
        } else {
          // Regular slot display
          dayTimeDisplay = allMatchingSlots
            .map((s) => `${s.slot_day} (${s.slot_time})`)
            .join(", ");
        }

        allocationSlotDayDisplay.textContent = dayTimeDisplay;
      } else {
        allocationSlotDayDisplay.textContent =
          "Slot day/time information not found";
      }
    })
    .catch((error) => {
      console.error("Error fetching slot details:", error);
      allocationSlotDayDisplay.textContent = "Error fetching slot information";
    });
}

// Check and disable conflicting slots
function checkAndDisableConflictingSlots() {
  const year = allocationYearInput.value;
  const semesterType = allocationSemesterInput.value;
  const employeeId = allocationEmployeeIdInput.value;

  if (!year || !semesterType || !employeeId) return;

  // Get faculty allocations
  fetch(
    `${window.API_URL}/faculty-allocations/faculty-timetable?` +
      `employeeId=${employeeId}&` +
      `year=${year}&` +
      `semesterType=${semesterType}`,
    {
      headers: {
        Authorization: localStorage.getItem("token"),
      },
    }
  )
    .then((response) => response.json())
    .then((data) => {
      // No faculty allocations yet
      if (!data.allocations || data.allocations.length === 0) return;

      // Get the allocated slot names
      const allocatedSlots = data.allocations.map((a) => a.slot_name);

      // For each allocated slot, fetch conflicting slots
      const fetchPromises = allocatedSlots.map((slotName) =>
        fetch(
          `${window.API_URL}/slot-conflicts?` +
            `slotYear=${year}&` +
            `semesterType=${semesterType}&` +
            `slotName=${slotName}`,
          {
            headers: {
              Authorization: localStorage.getItem("token"),
            },
          }
        ).then((response) => response.json())
      );

      // Process all fetched conflicts
      Promise.all(fetchPromises)
        .then((results) => {
          // Collect all conflicting slots
          const allConflictingSlots = new Set();

          results.forEach((result) => {
            if (result.conflictingSlots) {
              result.conflictingSlots.forEach((slot) => {
                allConflictingSlots.add(slot);
              });
            }
          });

          console.log(
            "All conflicting slots:",
            Array.from(allConflictingSlots)
          );

          // Disable conflicting slots in dropdown
          if (allocationSlotNameInput) {
            Array.from(allocationSlotNameInput.options).forEach((option) => {
              if (option.value && allConflictingSlots.has(option.value)) {
                option.disabled = true;
                option.textContent = `${option.value} (Conflicts with allocated slot)`;
              }
            });
          }
        })
        .catch((error) => {
          console.error("Error fetching conflicting slots:", error);
        });
    })
    .catch((error) => {
      console.error("Error fetching faculty allocations:", error);
    });
}

// Handle venue type change
function handleVenueTypeChange(event) {
  const venueType = event.target.value;

  if (!venueType) {
    allocationVenueInput.innerHTML = '<option value="">Select Venue</option>';
    // Clear searchable input if present
    if (allocationVenueInput._searchableRefresh) {
      allocationVenueInput._searchableRefresh();
    }
    return;
  }

  // Fetch venues of selected type
  fetch(`${window.API_URL}/venues`, {
    headers: {
      Authorization: localStorage.getItem("token"),
    },
  })
    .then((response) => response.json())
    .then((venues) => {
      const filteredVenues = venues.filter((v) => v.infra_type === venueType && v.is_active === true);

      allocationVenueInput.innerHTML = '<option value="">Select Venue</option>';
      filteredVenues.forEach((venue) => {
        const option = document.createElement("option");
        option.value = venue.venue;
        option.textContent = `${venue.venue} (Capacity: ${venue.capacity})`;
        allocationVenueInput.appendChild(option);
      });
      // Clear searchable input after repopulating
      if (allocationVenueInput._searchableRefresh) {
        allocationVenueInput._searchableRefresh();
      }
    })
    .catch((error) => {
      console.error("Error fetching venues:", error);
    });
  // If course is selected, refresh slots to clear conflict status
  if (courseData.course_code) {
    updateAvailableSlots(courseData);
  }
}

function handleVenueChange(event) {
  // If course is selected, refresh slots to check for conflicts with new venue
  if (courseData.course_code) {
    updateAvailableSlots(courseData);
  }
}

// Handle component type change
function handleComponentTypeChange(event) {
  console.log("Component type changed:", event.target.value);
  const componentType = event.target.value;
  
  // Toggle P=4 lab selection if needed (Fall 2025-26)
  if (courseData.course_code) {
    toggleP4LabSelection(courseData, componentType);
    updateAvailableSlots(courseData);
  }
}

// Handle add faculty allocation
function handleAddFacultyAllocation() {
  isEditMode = false;
  currentEditData = null;

  // Reset form
  if (facultyAllocationForm) facultyAllocationForm.reset();

  // Clear displays
  allocationCourseNameDisplay.textContent = "";
  allocationCourseTpcDisplay.textContent = "";
  allocationFacultyNameDisplay.textContent = "";
  allocationSlotDayDisplay.textContent = "";

  // Re-enable all fields for create mode (in case they were disabled in edit mode)
  if (allocationYearInput) {
    allocationYearInput.disabled = false;
    allocationYearInput.style.backgroundColor = "";
    allocationYearInput.style.cursor = "";
  }

  if (allocationSemesterTypeInput) {
    allocationSemesterTypeInput.disabled = false;
    allocationSemesterTypeInput.style.backgroundColor = "";
    allocationSemesterTypeInput.style.cursor = "";
  }

  if (allocationCourseCodeInput) {
    allocationCourseCodeInput.disabled = false;
    allocationCourseCodeInput.style.backgroundColor = "";
    allocationCourseCodeInput.style.cursor = "";
  }

  if (allocationSlotNameInput) {
    allocationSlotNameInput.disabled = false;
    allocationSlotNameInput.style.backgroundColor = "";
    allocationSlotNameInput.style.cursor = "";
  }

  if (allocationEmployeeIdInput) {
    allocationEmployeeIdInput.disabled = false;
    allocationEmployeeIdInput.style.backgroundColor = "";
    allocationEmployeeIdInput.style.cursor = "";
  }

  if (allocationVenueTypeInput) {
    allocationVenueTypeInput.disabled = false;
    allocationVenueTypeInput.style.backgroundColor = "";
    allocationVenueTypeInput.style.cursor = "";
  }

  if (allocationVenueInput) {
    allocationVenueInput.disabled = false;
    allocationVenueInput.style.backgroundColor = "";
    allocationVenueInput.style.cursor = "";
    // Clear searchable input
    if (allocationVenueInput._searchableRefresh) {
      allocationVenueInput._searchableRefresh();
    }
  }

  // Update modal title
  if (facultyAllocationModalLabel) {
    facultyAllocationModalLabel.textContent = "Create Faculty Slot Allocation";
  }

  // Show modal
  if (facultyAllocationModal) facultyAllocationModal.show();
}

// Handle update faculty allocation (edit mode)
function handleUpdateFacultyAllocation() {
  console.log("Update button clicked - Edit mode");

  // Get employee ID from hidden field or input
  const hiddenEmployeeIdInput = document.getElementById("hidden-employee-id-field");
  const newEmployeeId = hiddenEmployeeIdInput
    ? hiddenEmployeeIdInput.value
    : allocationEmployeeIdInput.value;

  // Get faculty name from display or search input
  const facultyNameSearch = document.getElementById("faculty-name-search");
  const newFacultyName = facultyNameSearch
    ? facultyNameSearch.value
    : allocationFacultyNameDisplay.textContent;

  // Prepare old and new allocation data
  const oldAllocation = {
    slot_year: currentEditData.slot_year,
    semester_type: currentEditData.semester_type,
    course_code: currentEditData.course_code,
    employee_id: currentEditData.employee_id,
    faculty_name: currentEditData.faculty_name,
    venue: currentEditData.venue,
    slot_day: currentEditData.slot_day,
    slot_name: currentEditData.slot_name,
    slot_time: currentEditData.slot_time,
  };

  const newAllocation = {
    slot_year: currentEditData.slot_year, // Readonly in edit mode
    semester_type: currentEditData.semester_type, // Readonly in edit mode
    course_code: currentEditData.course_code, // Readonly in edit mode
    employee_id: parseInt(newEmployeeId),
    faculty_name: newFacultyName,
    venue: allocationVenueInput.value,
    slot_day: currentEditData.slot_day, // Readonly in edit mode
    slot_name: currentEditData.slot_name, // Readonly in edit mode
    slot_time: currentEditData.slot_time, // Readonly in edit mode
  };

  console.log("Old allocation:", oldAllocation);
  console.log("New allocation:", newAllocation);

  // Validate that something changed
  if (
    oldAllocation.employee_id === newAllocation.employee_id &&
    oldAllocation.venue === newAllocation.venue
  ) {
    localShowAlert("No changes detected. Please modify faculty or venue.", "warning");
    return;
  }

  // Validate new values
  if (!newAllocation.employee_id || !newAllocation.venue) {
    localShowAlert("Please select both faculty and venue", "danger");
    return;
  }

  // Make PUT request to update allocation
  fetch(`${window.API_URL}/faculty-allocations`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: localStorage.getItem("token"),
    },
    body: JSON.stringify({
      oldAllocation: oldAllocation,
      newAllocation: newAllocation,
    }),
  })
    .then(async (response) => {
      const data = await response.json();

      if (!response.ok) {
        // Handle error responses
        throw new Error(data.message || "Failed to update allocation");
      }

      return data;
    })
    .then((data) => {
      console.log("Update response:", data);

      // Show success message with details
      let successMessage = `Faculty allocation updated successfully!`;
      if (data.allocationsUpdated > 0) {
        successMessage += ` ${data.allocationsUpdated} slot allocation(s) updated.`;
      }
      if (data.studentsUpdated > 0) {
        successMessage += ` ${data.studentsUpdated} student registration(s) updated.`;
      }

      if (data.changes) {
        if (data.changes.facultyChanged) {
          successMessage += `\nFaculty: ${data.changes.facultyChanged.from} → ${data.changes.facultyChanged.to}`;
        }
        if (data.changes.venueChanged) {
          successMessage += `\nVenue: ${data.changes.venueChanged.from} → ${data.changes.venueChanged.to}`;
        }
      }

      localShowAlert(successMessage, "success");

      // Close modal and refresh data
      if (facultyAllocationModal) facultyAllocationModal.hide();
      loadFacultyAllocations();
    })
    .catch((error) => {
      console.error("Update error:", error);
      localShowAlert(error.message || "Error updating faculty allocation", "danger");
    });
}

// Handle save faculty allocation
function handleSaveFacultyAllocation() {
  console.log("Save button clicked");

  // Check if this is a P=4 lab allocation (Fall 2025-26)
  const isP4Lab = p4LabSelectionContainer &&
                  p4LabSelectionContainer.style.display === "block" &&
                  allocationLabPair1.value &&
                  allocationLabPair2.value;

  if (isP4Lab) {
    handleSaveP4FacultyAllocation();
    return;
  }

  // Handle EDIT mode separately
  if (isEditMode && currentEditData) {
    handleUpdateFacultyAllocation();
    return;
  }

  // Get employee ID from the hidden field if it exists
  const hiddenEmployeeIdInput = document.getElementById(
    "hidden-employee-id-field"
  );
  const employeeId = hiddenEmployeeIdInput
    ? hiddenEmployeeIdInput.value
    : allocationEmployeeIdInput.value;

  // Get form values
  const allocationData = {
    slot_year: allocationYearInput.value,
    semester_type: allocationSemesterTypeInput.value,
    course_code: allocationCourseCodeInput.value,
    employee_id: parseInt(employeeId),
    venue: allocationVenueInput.value,
    slot_name: allocationSlotNameInput.value,
  };

  console.log("Allocation data:", allocationData);

  // Validate required fields
  if (
    !allocationData.slot_year ||
    !allocationData.semester_type ||
    !allocationData.course_code ||
    !allocationData.employee_id ||
    !allocationData.venue ||
    !allocationData.slot_name
  ) {
    localShowAlert("Please fill all required fields", "danger");
    return;
  }

  // Get slot details for the selected slot name
  const year = allocationData.slot_year;
  const semesterType = allocationData.semester_type;
  const primarySlot = allocationData.slot_name;

  console.log("Fetching slots for:", year, semesterType);

  fetch(`${window.API_URL}/slots/${year}/${semesterType}`, {
    headers: {
      Authorization: localStorage.getItem("token"),
    },
  })
    .then((response) => {
      console.log("Slots response:", response);
      return response.json();
    })
    .then(async (slots) => {
      console.log("All slots:", slots);

      // Check if selected slot has linked slots
      const linkedSlots =
        window.slotLinks && window.slotLinks[primarySlot]
          ? [primarySlot, ...window.slotLinks[primarySlot]]
          : [primarySlot];

      console.log("Primary slot:", primarySlot);
      console.log("Linked slots:", linkedSlots);

      // Check if this is a summer lab slot
      const isSummerLabSlot =
        semesterType === "SUMMER" &&
        primarySlot.startsWith("L") &&
        primarySlot.includes("+");

      // Check if this is a 4-hour compound lab slot
      const is4HourLab = primarySlot.includes(",") && isSummerLabSlot;

      // Parse all individual slot names that need to be allocated
      const allIndividualSlots = [];

      linkedSlots.forEach((slotName) => {
        if (slotName.includes(",")) {
          // This is a compound slot - parse individual slots
          const individualSlots = slotName.split(", ").map((s) => s.trim());
          allIndividualSlots.push(...individualSlots);
        } else {
          // This is already an individual slot
          allIndividualSlots.push(slotName);
        }
      });

      console.log("All individual slots to allocate:", allIndividualSlots);

      // PRE-CHECK: Validate ALL days before creating any allocation
      // This prevents partial allocations when some days have conflicts
      console.log("Starting pre-check for all slots...");
      let hasConflict = false;
      let conflictDetails = [];

      for (const individualSlot of allIndividualSlots) {
        let slotToSearch = individualSlot;
        if (individualSlot.includes('+') && !individualSlot.includes(',') && !individualSlot.startsWith('L')) {
          slotToSearch = individualSlot.split('+')[0];
        }

        const preCheckSlots = slots.filter((s) => s.slot_name === slotToSearch);

        for (const slot of preCheckSlots) {
          let slotNameToUse;
          if (is4HourLab && individualSlot === allIndividualSlots[0]) {
            slotNameToUse = primarySlot;
          } else if (is4HourLab) {
            continue;
          } else if (individualSlot.includes('+') && !individualSlot.includes(',') && !individualSlot.startsWith('L')) {
            slotNameToUse = individualSlot;
          } else {
            slotNameToUse = slot.slot_name;
          }

          try {
            const checkResponse = await fetch(
              `${window.API_URL}/faculty-allocations/check-conflicts`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: localStorage.getItem("token"),
                },
                body: JSON.stringify({
                  slot_year: year,
                  semester_type: semesterType,
                  course_code: courseCode,
                  employee_id: employeeId,
                  venue: venue,
                  slot_day: slot.slot_day,
                  slot_name: slotNameToUse,
                  slot_time: slot.slot_time,
                }),
              }
            );

            if (!checkResponse.ok) {
              const errorData = await checkResponse.json();
              hasConflict = true;
              conflictDetails.push({
                day: slot.slot_day,
                time: slot.slot_time,
                slot: slotNameToUse,
                error: errorData.message
              });
            }
          } catch (err) {
            console.error("Pre-check error:", err);
          }
        }
      }

      if (hasConflict) {
        const conflictMsg = conflictDetails.map(c => `${c.day} ${c.time} (${c.slot}): ${c.error}`).join('\n\n');
        localShowAlert(`Cannot allocate - conflicts found on some days:\n\n${conflictMsg}\n\nPlease choose a different venue that is available for ALL required time slots.`, "danger");
        return;
      }

      console.log("Pre-check passed, proceeding with allocations...");

      // Build allocations array for atomic batch request
      const batchAllocations = [];

      // For each individual slot that needs to be allocated
      for (const individualSlot of allIndividualSlots) {
        // Parse slot name for T=4 combined slots (e.g., "B1+TB1" -> use "B1" for lookup)
        let slotToSearch = individualSlot;
        if (individualSlot.includes('+') && !individualSlot.includes(',') && !individualSlot.startsWith('L')) {
          slotToSearch = individualSlot.split('+')[0];
          console.log(`T=4 slot detected: ${individualSlot}, searching for: ${slotToSearch}`);
        }

        const matchingSlots = slots.filter(
          (s) => s.slot_name === slotToSearch
        );

        console.log(`Matching slots for ${individualSlot} (searched: ${slotToSearch}):`, matchingSlots);

        if (matchingSlots.length === 0) {
          localShowAlert(`No slots found for ${individualSlot}`, "danger");
          return;
        }

        matchingSlots.forEach((slot) => {
          let slotNameToUse;

          if (is4HourLab && individualSlot === allIndividualSlots[0]) {
            slotNameToUse = primarySlot;
          } else if (is4HourLab) {
            return;
          } else if (individualSlot.includes('+') && !individualSlot.includes(',') && !individualSlot.startsWith('L')) {
            slotNameToUse = individualSlot;
          } else {
            slotNameToUse = slot.slot_name;
          }

          const completeAllocation = {
            ...allocationData,
            slot_day: slot.slot_day,
            slot_time: slot.slot_time,
            slot_name: slotNameToUse,
          };

          console.log(
            `Adding to batch for ${slotNameToUse}:`,
            completeAllocation
          );

          batchAllocations.push(completeAllocation);
        });
      }

      if (batchAllocations.length === 0) {
        localShowAlert("No valid slots found for allocation", "danger");
        return;
      }

      // Send single atomic batch request — all succeed or none
      fetch(`${window.API_URL}/faculty-allocations/batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: localStorage.getItem("token"),
        },
        body: JSON.stringify({ allocations: batchAllocations }),
      })
        .then(async (response) => {
          const data = await response.json();
          if (!response.ok) {
            const error = new Error(data.message || "Failed to save faculty allocation");
            error.conflicts = data.conflicts;
            error.conflictType = data.conflicts && data.conflicts.length > 0 ? data.conflicts[0].type : undefined;
            throw error;
          }
          return data;
        })
        .then((result) => {
          console.log("Batch save result:", result);

          if (is4HourLab) {
            const morningSlots = primarySlot.split(", ");
            const linkedAfternoonSlots =
              window.slotLinks && window.slotLinks[primarySlot]
                ? window.slotLinks[primarySlot]
                : [];

            localShowAlert(
              `✅ 4-Hour Lab allocation created successfully!\n\n` +
                `🌅 Morning slots: ${morningSlots.join(", ")}\n` +
                `🌆 Afternoon slots: ${linkedAfternoonSlots.join(", ")}\n\n` +
                `All related slots have been automatically allocated.`,
              "success"
            );
          } else if (isSummerLabSlot) {
            localShowAlert(
              "Faculty allocation saved successfully! The linked lab slot has also been automatically allocated.",
              "success"
            );
          } else {
            localShowAlert("Faculty allocation saved successfully", "success");
          }

          if (facultyAllocationModal) facultyAllocationModal.hide();
          loadFacultyAllocations();

          if (courseData && courseData.course_type === "TEL") {
            checkTELCourseCompletion(allocationData);
          }
        })
        .catch((error) => {
          console.error("Save faculty allocation error:", error);

          let displayMessage = "";

          // Handle batch conflict details
          if (error.conflicts && error.conflicts.length > 0) {
            const conflictMsg = error.conflicts
              .map(c => `${c.day} ${c.time} (${c.slot}): ${c.error}`)
              .join('\n\n');
            displayMessage = `❌ Conflicts found — no allocations were created:\n\n${conflictMsg}\n\nPlease choose a different venue that is available for ALL required time slots.`;
          } else if (error.message) {
            const errorMsg = error.message.toLowerCase();

            if (
              errorMsg.includes("venue clash") ||
              (errorMsg.includes("venue") && errorMsg.includes("already booked"))
            ) {
              displayMessage = `❌ Venue Conflict!\n\n${error.message}\n\nPlease select a different venue or time slot.`;
            } else if (
              errorMsg.includes("faculty clash") ||
              (errorMsg.includes("faculty") && errorMsg.includes("already assigned"))
            ) {
              displayMessage = `❌ Faculty Conflict!\n\n${error.message}\n\nThis faculty member is already teaching another course at this time.`;
            } else if (errorMsg.includes("slot conflict")) {
              displayMessage = `❌ Slot Conflict!\n\n${error.message}\n\nThis slot conflicts with another slot already allocated to this faculty.`;
            } else if (errorMsg.includes("linked slot clash")) {
              displayMessage = `❌ Linked Slot Conflict!\n\n${error.message}\n\nThe afternoon session for this lab is already occupied.`;
            } else if (errorMsg.includes("4-hour lab") && errorMsg.includes("clash")) {
              displayMessage = `❌ 4-Hour Lab Conflict!\n\n${error.message}\n\nOne or more required time slots are unavailable.`;
            } else {
              displayMessage = `❌ Allocation Failed!\n\n${error.message}`;
            }
          } else {
            displayMessage =
              "❌ Unknown error occurred while saving faculty allocation. Please try again.";
          }

          localShowAlert(displayMessage, "danger", 10000);
        });
    })
    .catch((error) => {
      console.error("Error fetching slot details:", error);
      localShowAlert("Failed to fetch slot details", "danger");
    });
}

// Handle save P=4 faculty allocation (Fall 2025-26)
function handleSaveP4FacultyAllocation() {
  console.log("Saving P=4 lab allocation");

  // Get employee ID from the hidden field if it exists
  const hiddenEmployeeIdInput = document.getElementById(
    "hidden-employee-id-field"
  );
  const employeeId = hiddenEmployeeIdInput
    ? hiddenEmployeeIdInput.value
    : allocationEmployeeIdInput.value;

  // Get form values for P=4 allocation
  const p4AllocationData = {
    slot_year: allocationYearInput.value,
    semester_type: allocationSemesterTypeInput.value,
    course_code: allocationCourseCodeInput.value,
    employee_id: parseInt(employeeId),
    lab_pair_1: allocationLabPair1.value,
    lab_pair_2: allocationLabPair2.value,
    venue_type_1: allocationLabVenueType1.value,
    venue_type_2: allocationLabVenueType2.value,
    venue_1: allocationLabVenue1.value,
    venue_2: allocationLabVenue2.value,
  };

  console.log("P=4 Allocation data:", p4AllocationData);

  // Validate required fields
  if (
    !p4AllocationData.slot_year ||
    !p4AllocationData.semester_type ||
    !p4AllocationData.course_code ||
    !p4AllocationData.employee_id ||
    !p4AllocationData.lab_pair_1 ||
    !p4AllocationData.lab_pair_2 ||
    !p4AllocationData.venue_type_1 ||
    !p4AllocationData.venue_type_2 ||
    !p4AllocationData.venue_1 ||
    !p4AllocationData.venue_2
  ) {
    localShowAlert("Please fill all required fields for P=4 allocation including both venues", "danger");
    return;
  }

  // Disable save button during save
  if (saveFacultyAllocationBtn) {
    saveFacultyAllocationBtn.disabled = true;
    saveFacultyAllocationBtn.textContent = "Saving...";
  }

  // Send to P=4 allocation endpoint
  fetch(`${window.API_URL}/faculty-allocations/p4-allocation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: localStorage.getItem("token"),
    },
    body: JSON.stringify(p4AllocationData),
  })
    .then((response) => {
      console.log("P=4 allocation response status:", response.status);
      return response.json().then(data => ({
        status: response.status,
        data: data
      }));
    })
    .then(({status, data}) => {
      console.log("P=4 allocation response:", data);
      
      if (status >= 200 && status < 300 && data.allocations && data.allocations.length === 2) {
        localShowAlert(
          `P=4 lab allocation created successfully! Allocated ${data.labPairs.pair1} and ${data.labPairs.pair2}`,
          "success"
        );
        
        // Close modal and refresh table
        if (facultyAllocationModal) facultyAllocationModal.hide();
        loadFacultyAllocations();
        
        // Reset form
        if (facultyAllocationForm) facultyAllocationForm.reset();
        clearP4Selection();
        
      } else {
        // Handle error responses (4xx, 5xx) or incomplete data
        const errorMessage = data.message || "Error creating P=4 allocation";
        console.log("P=4 allocation failed:", errorMessage);
        console.log("About to show alert with message:", errorMessage);
        localShowAlert(errorMessage, "danger");
        console.log("Alert call completed");
      }
    })
    .catch((error) => {
      console.error("Error creating P=4 allocation:", error);
      localShowAlert("Error creating P=4 allocation", "danger");
    })
    .finally(() => {
      // Re-enable save button
      if (saveFacultyAllocationBtn) {
        saveFacultyAllocationBtn.disabled = false;
        saveFacultyAllocationBtn.textContent = "Save Allocation";
        saveFacultyAllocationBtn.className = "btn btn-primary";
      }
    });
}

// Check TEL course completion
function checkTELCourseCompletion(allocation) {
  // Check if both theory and lab components are allocated
  fetch(
    `${window.API_URL}/faculty-allocations?` +
      `year=${allocation.slot_year}&` +
      `semesterType=${allocation.semester_type}&` +
      `courseCode=${allocation.course_code}`,
    {
      headers: {
        Authorization: localStorage.getItem("token"),
      },
    }
  )
    .then((response) => response.json())
    .then((allocations) => {
      const hasTheory = allocations.some((a) => {
        // Check if this is a theory slot
        const theorySlots = [
          "A1",
          "B1",
          "C1",
          "D1",
          "E1",
          "F1",
          "G1",
          "A2",
          "B2",
          "C2",
          "D2",
          "E2",
          "F2",
          "G2",
          "A1+TA1",
          "B1+TB1",
          "C1+TC1",
          "A2+TA2",
          "B2+TB2",
          "C2+TC2",
        ];
        return theorySlots.includes(a.slot_name);
      });

      const hasLab = allocations.some((a) => {
        // Check if this is a lab slot
        return a.slot_name.startsWith("L");
      });

      if (courseData.theory > 0 && courseData.practical > 0) {
        if (!hasTheory || !hasLab) {
          localShowAlert(
            `TEL course ${allocation.course_code} requires both theory and lab allocation. ` +
              `Currently has: ${hasTheory ? "Theory" : ""} ${
                hasLab ? "Lab" : ""
              }`,
            "warning"
          );
        }
      }
    })
    .catch((error) => {
      console.error("Error checking TEL course completion:", error);
    });
}

// Open edit allocation modal
function openEditAllocationModal(allocation) {
  isEditMode = true;
  currentEditData = allocation;

  // Fill form with existing data
  allocationYearInput.value = allocation.slot_year;
  allocationSemesterTypeInput.value = allocation.semester_type;
  allocationCourseCodeInput.value = allocation.course_code;
  allocationCourseNameDisplay.textContent = allocation.course_name;
  allocationCourseTpcDisplay.textContent = `${allocation.theory}-${allocation.practical}-${allocation.credits}`;
  allocationEmployeeIdInput.value = allocation.employee_id;
  allocationFacultyNameDisplay.textContent = allocation.faculty_name;

  // For slot name dropdown, ensure the current slot exists as an option before disabling
  if (allocationSlotNameInput) {
    // Clear existing options
    allocationSlotNameInput.innerHTML = "";

    // Add the current slot as the only option
    const option = document.createElement("option");
    option.value = allocation.slot_name;
    option.textContent = allocation.slot_name;
    option.selected = true;
    allocationSlotNameInput.appendChild(option);
  }

  // Set venue type and load venues
  if (allocationVenueTypeInput && allocation.venue_type) {
    allocationVenueTypeInput.value = allocation.venue_type;

    // Load venues of this type
    fetch(`${window.API_URL}/venues`, {
      headers: {
        Authorization: localStorage.getItem("token"),
      },
    })
      .then((response) => response.json())
      .then((venues) => {
        const filteredVenues = venues.filter(
          (v) => v.infra_type === allocation.venue_type && v.is_active === true
        );

        allocationVenueInput.innerHTML = '<option value="">Select Venue</option>';
        filteredVenues.forEach((venue) => {
          const option = document.createElement("option");
          option.value = venue.venue;
          option.textContent = `${venue.venue} (Capacity: ${venue.capacity})`;
          if (venue.venue === allocation.venue) {
            option.selected = true;
          }
          allocationVenueInput.appendChild(option);
        });
      })
      .catch((error) => {
        console.error("Error loading venues:", error);
      });
  } else {
    // If venue_type is not available, fetch venue data to show capacity
    fetch(`${window.API_URL}/venues`, {
      headers: {
        Authorization: localStorage.getItem("token"),
      },
    })
      .then((response) => response.json())
      .then((venues) => {
        const matchingVenue = venues.find((v) => v.venue === allocation.venue);
        allocationVenueInput.innerHTML = "";
        const option = document.createElement("option");
        option.value = allocation.venue;
        option.textContent = matchingVenue
          ? `${matchingVenue.venue} (Capacity: ${matchingVenue.capacity})`
          : allocation.venue;
        option.selected = true;
        allocationVenueInput.appendChild(option);
      })
      .catch((error) => {
        console.error("Error loading venue data:", error);
        // Fallback to just showing venue name if fetch fails
        allocationVenueInput.innerHTML = "";
        const option = document.createElement("option");
        option.value = allocation.venue;
        option.textContent = allocation.venue;
        option.selected = true;
        allocationVenueInput.appendChild(option);
      });
  }

  // Make fields readonly except Faculty, Venue Type, and Venue
  // Year, Semester, Course Code, and Slot Name should be readonly in edit mode
  if (allocationYearInput) {
    allocationYearInput.disabled = true;
    allocationYearInput.style.backgroundColor = "#e9ecef";
    allocationYearInput.style.cursor = "not-allowed";
  }

  if (allocationSemesterTypeInput) {
    allocationSemesterTypeInput.disabled = true;
    allocationSemesterTypeInput.style.backgroundColor = "#e9ecef";
    allocationSemesterTypeInput.style.cursor = "not-allowed";
  }

  if (allocationCourseCodeInput) {
    allocationCourseCodeInput.disabled = true;
    allocationCourseCodeInput.style.backgroundColor = "#e9ecef";
    allocationCourseCodeInput.style.cursor = "not-allowed";
  }

  if (allocationSlotNameInput) {
    allocationSlotNameInput.disabled = true;
    allocationSlotNameInput.style.backgroundColor = "#e9ecef";
    allocationSlotNameInput.style.cursor = "not-allowed";
  }

  // Ensure Faculty, Venue Type, and Venue inputs are enabled
  if (allocationEmployeeIdInput) {
    allocationEmployeeIdInput.disabled = false;
    allocationEmployeeIdInput.style.backgroundColor = "";
    allocationEmployeeIdInput.style.cursor = "";
  }

  if (allocationVenueTypeInput) {
    allocationVenueTypeInput.disabled = false;
    allocationVenueTypeInput.style.backgroundColor = "";
    allocationVenueTypeInput.style.cursor = "";
  }

  if (allocationVenueInput) {
    allocationVenueInput.disabled = false;
    allocationVenueInput.style.backgroundColor = "";
    allocationVenueInput.style.cursor = "";
  }

  // Update modal title
  if (facultyAllocationModalLabel) {
    facultyAllocationModalLabel.textContent = "Edit Faculty Slot Allocation (Faculty & Venue Only)";
  }

  // Show modal
  if (facultyAllocationModal) facultyAllocationModal.show();
}

// Open delete allocation modal
function openDeleteAllocationModal(allocation) {
  currentEditData = allocation;

  let warningMessage = "";
  let slotCount = 1;

  // Check if this is a 4-hour lab course
  const is4HourLab =
    allocation.semester_type === "SUMMER" &&
    allocation.practical === 4 &&
    allocation.slot_name.startsWith("L");

  if (is4HourLab) {
    if (allocation.slot_name.includes(",")) {
      // This is a compound slot - count all related slots
      const morningSlots = allocation.slot_name.split(", ");
      slotCount = morningSlots.length * 2; // Each morning slot has an afternoon counterpart

      warningMessage =
        `\n\n⚠️  4-HOUR LAB DELETION WARNING:\n` +
        `This will delete ALL ${slotCount} related lab slots:\n` +
        `🌅 Morning: ${morningSlots.join(", ")}\n` +
        `🌆 Afternoon: Corresponding linked afternoon slots\n\n` +
        `This action cannot be undone!`;
    } else {
      // Individual slot from a 4-hour lab
      slotCount = 4; // All 4 slots will be deleted
      warningMessage =
        `\n\n⚠️  4-HOUR LAB DELETION WARNING:\n` +
        `This will delete ALL 4 related lab slots for this course.\n` +
        `This action cannot be undone!`;
    }
  } else if (
    allocation.semester_type === "SUMMER" &&
    allocation.slot_name.startsWith("L") &&
    allocation.slot_name.includes("+")
  ) {
    // Regular 2-hour summer lab with linking
    slotCount = 2;

    // Determine linked slot name pattern
    let linkedSlotName = null;
    if (
      allocation.slot_name.match(/L\d+\+L\d+/) &&
      parseInt(allocation.slot_name.match(/\d+/)[0]) < 21
    ) {
      const slotNumbers = allocation.slot_name.match(/L(\d+)\+L(\d+)/);
      if (slotNumbers && slotNumbers.length === 3) {
        const firstNum = parseInt(slotNumbers[1]) + 20;
        const secondNum = parseInt(slotNumbers[2]) + 20;
        linkedSlotName = `L${firstNum}+L${secondNum}`;
      }
    } else if (
      allocation.slot_name.match(/L\d+\+L\d+/) &&
      parseInt(allocation.slot_name.match(/\d+/)[0]) >= 21
    ) {
      const slotNumbers = allocation.slot_name.match(/L(\d+)\+L(\d+)/);
      if (slotNumbers && slotNumbers.length === 3) {
        const firstNum = parseInt(slotNumbers[1]) - 20;
        const secondNum = parseInt(slotNumbers[2]) - 20;
        linkedSlotName = `L${firstNum}+L${secondNum}`;
      }
    }

    if (linkedSlotName) {
      warningMessage =
        `\n\n⚠️  SUMMER LAB DELETION WARNING:\n` +
        `This will also delete the linked slot: ${linkedSlotName}`;
    }
  }

  // Show confirmation modal
  const confirmMessage = `Are you sure you want to delete the allocation for:

📚 Course: ${allocation.course_code} - ${allocation.course_name}
👤 Faculty: ${allocation.faculty_name}
🕐 Slot: ${allocation.slot_name} on ${allocation.slot_day} at ${allocation.slot_time}
🏢 Venue: ${allocation.venue}${warningMessage}`;

  if (confirm(confirmMessage)) {
    deleteFacultyAllocation(allocation);
  }
}

// Delete faculty allocation
function deleteFacultyAllocation(allocation) {
  fetch(`${window.API_URL}/faculty-allocations`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: localStorage.getItem("token"),
    },
    body: JSON.stringify(allocation),
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((data) => {
          throw new Error(data.message);
        });
      }
      return response.json();
    })
    .then((data) => {
      localShowAlert("Faculty allocation deleted successfully", "success");
      loadFacultyAllocations();
    })
    .catch((error) => {
      console.error("Delete faculty allocation error:", error);
      localShowAlert(
        error.message || "Failed to delete faculty allocation",
        "danger"
      );
    });
}

// Handle view faculty timetable
function handleViewFacultyTimetable() {
  const year = viewFacultyYearSelect.value;
  const semester = viewFacultySemesterSelect.value;
  const employeeId = viewFacultySelect.value;

  if (!year || !semester || !employeeId) {
    localShowAlert("Please select year, semester, and faculty", "warning");
    return;
  }

  fetch(
    `${window.API_URL}/faculty-allocations/faculty-timetable?` +
      `employeeId=${employeeId}&year=${year}&semesterType=${semester}`,
    {
      headers: {
        Authorization: localStorage.getItem("token"),
      },
    }
  )
    .then((response) => response.json())
    .then((data) => {
      generateFacultyTimetable(data.faculty, data.allocations, year, semester, data.summaryAllocations);
    })
    .catch((error) => {
      console.error("Error fetching faculty timetable:", error);
      localShowAlert("Failed to load faculty timetable", "danger");
    });
}

// Handle view class timetable
function handleViewClassTimetable() {
  const year = viewClassYearSelect.value;
  const semester = viewClassSemesterSelect.value;
  const venue = viewClassVenueSelect.value;

  if (!year || !semester || !venue) {
    localShowAlert("Please select year, semester, and venue", "warning");
    return;
  }

  fetch(
    `${window.API_URL}/faculty-allocations/class-timetable?` +
      `venue=${venue}&year=${year}&semesterType=${semester}`,
    {
      headers: {
        Authorization: localStorage.getItem("token"),
      },
    }
  )
    .then((response) => response.json())
    .then((data) => {
      generateClassTimetable(data.venue, data.allocations, year, semester);
    })
    .catch((error) => {
      console.error("Error fetching class timetable:", error);
      localShowAlert("Failed to load class timetable", "danger");
    });
}

// Generate faculty timetable
function generateFacultyTimetable(faculty, allocations, year, semester, summaryAllocations) {
  // Show the container
  if (facultyTimetableContainer) {
    facultyTimetableContainer.style.display = "block";
  }

  // Set title
  if (facultyTimetableTitle) {
    facultyTimetableTitle.textContent = `Faculty Slot Timetable of ${faculty.name}`;
  }

  // First, fetch the actual slots defined for this year and semester
  fetch(`${window.API_URL}/slots/${year}/${semester}`, {
    headers: {
      Authorization: localStorage.getItem("token"),
    },
  })
    .then((response) => response.json())
    .then((slots) => {
      // Create allocation map
      const allocationMap = {};
      allocations.forEach((allocation) => {
        // For T=4 combined slots like "B1+TB1", create entries for both the combined name and individual components
        if (allocation.slot_name.includes('+') && !allocation.slot_name.includes(',') && !allocation.slot_name.startsWith('L')) {
          // T=4 theory slot - create entries for both combined and individual slot names
          const key = `${allocation.slot_day}-${allocation.slot_name}`;
          allocationMap[key] = allocation;
          
          // Also create entries using the component slot names for lookup
          const components = allocation.slot_name.split('+');
          components.forEach(component => {
            const componentKey = `${allocation.slot_day}-${component}`;
            allocationMap[componentKey] = allocation;
          });
        } else {
          // Regular slot
          const key = `${allocation.slot_day}-${allocation.slot_name}`;
          allocationMap[key] = allocation;
        }
      });

      // Use EXACT same logic as master timetable
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

      // Create a map of day -> time -> slot (SAME as master timetable)
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

      // Generate HTML table with EXACT same structure as master timetable
      let tableHtml = `
        <table class="table table-bordered timetable-container">
            <thead>
              <tr class="table-primary">
                <th></th>
                <th colspan="4">Morning</th>
                <th rowspan="2" class="align-middle">Lunch</th>
                <th colspan="4">Afternoon</th>
              </tr>
              <tr class="table-primary">
                <th>Day</th>
                <th>9:00 - 9:50</th>
                <th>9:55 - 10:45</th>
                <th>10:50 - 11:40</th>
                <th>11:45 - 12:35</th>
                <th>1:15 - 2:05</th>
                <th>2:10 - 3:00</th>
                <th>3:05 - 3:55</th>
                <th>4:00 - 4:50</th>
              </tr>
            </thead>
            <tbody>
        `;

      // Generate the timetable HTML using EXACT same logic as master
      days.forEach((day) => {
        // Theory row - EXACT same as master timetable
        let rowHtml = `<tr><td class="table-secondary"><strong>${day}</strong></td>`;

        // Theory slots - Morning (first 4 time slots)
        for (let i = 0; i < 4; i++) {
          const timeSlot = timeSlots[i];
          const slotName = slotMap[day][timeSlot] || "";
          const allocation = allocationMap[`${day}-${slotName}`];

          if (allocation) {
            rowHtml += `<td class="text-center table-success">${slotName}<br>${allocation.course_code}<br>${allocation.venue}<br>${allocation.employee_id}</td>`;
          } else {
            rowHtml += `<td class="text-center">${slotName}</td>`;
          }
        }

        // Lunch
        rowHtml += `<td class="table-secondary text-center">LUNCH</td>`;

        // Theory slots - Afternoon (time slots 5-8, skipping index 4 which is lunch)
        for (let i = 5; i < 9; i++) {
          const timeSlot = timeSlots[i];
          const slotName = slotMap[day][timeSlot] || "";
          const allocation = allocationMap[`${day}-${slotName}`];

          if (allocation) {
            rowHtml += `<td class="text-center table-success">${slotName}<br>${allocation.course_code}<br>${allocation.venue}<br>${allocation.employee_id}</td>`;
          } else {
            rowHtml += `<td class="text-center">${slotName}</td>`;
          }
        }

        rowHtml += "</tr>";
        tableHtml += rowHtml;

        // Lab slots row - EXACT same hardcoded pattern as master timetable
        let labRowHtml = `<tr><td class="table-warning">Lab</td>`;

        // Morning labs - EXACT same pattern as master
        const morningLab1 = `L${
          day === "MON"
            ? "1+L2"
            : day === "TUE"
            ? "5+L6"
            : day === "WED"
            ? "9+L10"
            : day === "THU"
            ? "13+L14"
            : "17+L18"
        }`;

        const morningLab2 = `L${
          day === "MON"
            ? "3+L4"
            : day === "TUE"
            ? "7+L8"
            : day === "WED"
            ? "11+L12"
            : day === "THU"
            ? "15+L16"
            : "19+L20"
        }`;

        // First morning lab
        const allocation1 = allocationMap[`${day}-${morningLab1}`];
        if (allocation1) {
          labRowHtml += `<td class="text-center table-warning" colspan="2">${morningLab1}<br>${allocation1.course_code}<br>${allocation1.venue}<br>${allocation1.employee_id}</td>`;
        } else {
          labRowHtml += `<td class="text-center table-warning" colspan="2">${morningLab1}</td>`;
        }

        // Second morning lab
        const allocation2 = allocationMap[`${day}-${morningLab2}`];
        if (allocation2) {
          labRowHtml += `<td class="text-center table-warning" colspan="2">${morningLab2}<br>${allocation2.course_code}<br>${allocation2.venue}<br>${allocation2.employee_id}</td>`;
        } else {
          labRowHtml += `<td class="text-center table-warning" colspan="2">${morningLab2}</td>`;
        }

        // Lunch
        labRowHtml += `<td class="table-secondary"></td>`;

        // Afternoon labs - EXACT same pattern as master
        const afternoonLab1 = `L${
          day === "MON"
            ? "21+L22"
            : day === "TUE"
            ? "25+L26"
            : day === "WED"
            ? "29+L30"
            : day === "THU"
            ? "33+L34"
            : "37+L38"
        }`;

        const afternoonLab2 = `L${
          day === "MON"
            ? "23+L24"
            : day === "TUE"
            ? "27+L28"
            : day === "WED"
            ? "31+L32"
            : day === "THU"
            ? "35+L36"
            : "39+L40"
        }`;

        // First afternoon lab
        const allocation3 = allocationMap[`${day}-${afternoonLab1}`];
        if (allocation3) {
          labRowHtml += `<td class="text-center table-warning" colspan="2">${afternoonLab1}<br>${allocation3.course_code}<br>${allocation3.venue}<br>${allocation3.employee_id}</td>`;
        } else {
          labRowHtml += `<td class="text-center table-warning" colspan="2">${afternoonLab1}</td>`;
        }

        // Second afternoon lab
        const allocation4 = allocationMap[`${day}-${afternoonLab2}`];
        if (allocation4) {
          labRowHtml += `<td class="text-center table-warning" colspan="2">${afternoonLab2}<br>${allocation4.course_code}<br>${allocation4.venue}<br>${allocation4.employee_id}</td>`;
        } else {
          labRowHtml += `<td class="text-center table-warning" colspan="2">${afternoonLab2}</td>`;
        }

        labRowHtml += "</tr>";
        tableHtml += labRowHtml;
      });

      tableHtml += "</tbody></table>";

      // Create summary table with unique allocations only
      // Filter out compound slot entries when individual entries exist
      const uniqueAllocations = [];
      const seen = new Set();

      // Group allocations by course-faculty-venue (without slot_name)
      const allocationGroups = {};
      allocations.forEach((allocation) => {
        const groupKey = `${allocation.course_code}-${allocation.employee_id}-${allocation.venue}`;
        if (!allocationGroups[groupKey]) {
          allocationGroups[groupKey] = [];
        }
        allocationGroups[groupKey].push(allocation);
      });

      // Process each group to remove compound duplicates
      Object.values(allocationGroups).forEach((group) => {
        // Separate compound slots (containing commas) from individual slots
        const compoundSlots = group.filter((a) => a.slot_name.includes(","));
        const individualSlots = group.filter((a) => !a.slot_name.includes(","));

        // If we have both compound and individual slots for the same course-faculty-venue
        if (compoundSlots.length > 0 && individualSlots.length > 0) {
          // Check if the compound slot components exist as individual slots
          const shouldRemoveCompound = compoundSlots.some((compound) => {
            const compoundComponents = compound.slot_name
              .split(", ")
              .map((s) => s.trim());
            const hasAllComponents = compoundComponents.every((component) =>
              individualSlots.some(
                (individual) => individual.slot_name === component
              )
            );
            return hasAllComponents;
          });

          if (shouldRemoveCompound) {
            // Only add individual slots, skip compound slots
            individualSlots.forEach((allocation) => {
              const key = `${allocation.course_code}-${allocation.slot_name}-${allocation.venue}`;
              if (!seen.has(key)) {
                seen.add(key);
                uniqueAllocations.push(allocation);
              }
            });
          } else {
            // Add all slots if compound components don't match individual slots
            group.forEach((allocation) => {
              const key = `${allocation.course_code}-${allocation.slot_name}-${allocation.venue}`;
              if (!seen.has(key)) {
                seen.add(key);
                uniqueAllocations.push(allocation);
              }
            });
          }
        } else {
          // No conflict, add all slots from this group
          group.forEach((allocation) => {
            const key = `${allocation.course_code}-${allocation.slot_name}-${allocation.venue}`;
            if (!seen.has(key)) {
              seen.add(key);
              uniqueAllocations.push(allocation);
            }
          });
        }
      });

      // Custom sorting function for slot names
      function sortSlotNames(a, b) {
        const slotA = a.slot_name;
        const slotB = b.slot_name;

        // Handle lab slots (L1+L2, L3+L4, etc.)
        if (slotA.startsWith("L") && slotB.startsWith("L")) {
          const numA = parseInt(slotA.match(/\d+/)[0]);
          const numB = parseInt(slotB.match(/\d+/)[0]);
          return numA - numB;
        }

        // Handle theory slots
        if (!slotA.startsWith("L") && !slotB.startsWith("L")) {
          // Extract base letter and number
          const extractSlotParts = (slot) => {
            if (slot.includes("TA") || slot.includes("TB")) {
              return {
                letter: slot.substring(0, 2),
                number: parseInt(slot.substring(2)) || 0,
              };
            } else {
              const match = slot.match(/([A-Z]+)(\d*)/);
              return { letter: match[1], number: parseInt(match[2]) || 0 };
            }
          };

          const partsA = extractSlotParts(slotA);
          const partsB = extractSlotParts(slotB);

          // First compare by letter
          if (partsA.letter !== partsB.letter) {
            return partsA.letter.localeCompare(partsB.letter);
          }

          // Then by number
          return partsA.number - partsB.number;
        }

        // Mixed case: lab slots come after theory slots
        if (slotA.startsWith("L") && !slotB.startsWith("L")) {
          return 1;
        }
        if (!slotA.startsWith("L") && slotB.startsWith("L")) {
          return -1;
        }

        // Fallback to alphabetical
        return slotA.localeCompare(slotB);
      }

      // Override with summaryAllocations if provided (for P=4 course grouping)
      if (summaryAllocations && summaryAllocations.length > 0) {
        uniqueAllocations.length = 0; // Clear the array
        uniqueAllocations.push(...summaryAllocations);
      }

      // Sort unique allocations by slot name
      uniqueAllocations.sort(sortSlotNames);

      let summaryTable = `
        <div class="mt-4">
          <h6>Summary</h6>
          <table class="table summary-table">
            <thead>
              <tr>
                <th>Sl. No.</th>
                <th>Course Code</th>
                <th>Course Title</th>
                <th>Slot</th>
                <th>Venue</th>
                <th>Employee ID</th>
                <th>Faculty Name</th>
              </tr>
            </thead>
            <tbody>
    `;

      // Add rows for each unique allocation
      uniqueAllocations.forEach((allocation, index) => {
        summaryTable += `
              <tr>
                <td>${index + 1}.</td>
                <td>${allocation.course_code}</td>
                <td>${allocation.course_name}</td>
                <td>${allocation.slot_name}</td>
                <td>${allocation.venue}</td>
                <td>${allocation.employee_id}</td>
                <td>${faculty.name}</td>
              </tr>
      `;
      });

      summaryTable += `
            </tbody>
          </table>
        </div>
    `;

      // Update the container
      const facultyTimetableDiv = document.getElementById(
        "faculty-timetable-div"
      );
      if (facultyTimetableDiv) {
        facultyTimetableDiv.innerHTML = tableHtml + summaryTable;
      }
    })
    .catch((error) => {
      console.error("Error fetching slots for timetable:", error);
      const facultyTimetableDiv = document.getElementById(
        "faculty-timetable-div"
      );
      if (facultyTimetableDiv) {
        facultyTimetableDiv.innerHTML = `<div class="alert alert-danger">Error loading timetable slots. Please try again.</div>`;
      }
    });
}

// Generate class timetable
function generateClassTimetable(venue, allocations, year, semester) {
  // Show the container
  if (classTimetableContainer) {
    classTimetableContainer.style.display = "block";
  }

  // Set title
  if (classTimetableTitle) {
    classTimetableTitle.textContent = `Class Slot Timetable of ${venue.venue} : ${venue.infra_type}`;
  }

  // First, fetch the actual slots defined for this year and semester
  fetch(`${window.API_URL}/slots/${year}/${semester}`, {
    headers: {
      Authorization: localStorage.getItem("token"),
    },
  })
    .then((response) => response.json())
    .then((slots) => {
      // Create allocation map
      const allocationMap = {};
      allocations.forEach((allocation) => {
        // For T=4 combined slots like "A1+TA1", create entries for both the combined name and individual components
        if (allocation.slot_name.includes('+') && !allocation.slot_name.includes(',') && !allocation.slot_name.startsWith('L')) {
          // T=4 theory slot - create entries for both combined and individual slot names
          const key = `${allocation.slot_day}-${allocation.slot_name}`;
          allocationMap[key] = allocation;
          
          // Also create entries using the component slot names for lookup
          const components = allocation.slot_name.split('+');
          components.forEach(component => {
            const componentKey = `${allocation.slot_day}-${component}`;
            allocationMap[componentKey] = allocation;
          });
          console.log(`🔍 Created T=4 entries for ${allocation.slot_name} on ${allocation.slot_day}: component keys for ${components.join(', ')}`);
        } else {
          // Regular slot
          const key = `${allocation.slot_day}-${allocation.slot_name}`;
          allocationMap[key] = allocation;
        }
      });

      // Use EXACT same logic as master timetable
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

      // Create a map of day -> time -> slot (SAME as master timetable)
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

      // Generate HTML table with EXACT same structure as master timetable
      let tableHtml = `
        <table class="table table-bordered timetable-container">
            <thead>
              <tr class="table-primary">
                <th></th>
                <th colspan="4">Morning</th>
                <th rowspan="2" class="align-middle">Lunch</th>
                <th colspan="4">Afternoon</th>
              </tr>
              <tr class="table-primary">
                <th>Day</th>
                <th>9:00 - 9:50</th>
                <th>9:55 - 10:45</th>
                <th>10:50 - 11:40</th>
                <th>11:45 - 12:35</th>
                <th>1:15 - 2:05</th>
                <th>2:10 - 3:00</th>
                <th>3:05 - 3:55</th>
                <th>4:00 - 4:50</th>
              </tr>
            </thead>
            <tbody>
        `;

      // Generate the timetable HTML using EXACT same logic as master
      days.forEach((day) => {
        // Theory row - EXACT same as master timetable
        let rowHtml = `<tr><td class="table-secondary"><strong>${day}</strong></td>`;

        // Theory slots - Morning (first 4 time slots)
        for (let i = 0; i < 4; i++) {
          const timeSlot = timeSlots[i];
          const slotName = slotMap[day][timeSlot] || "";
          const allocation = allocationMap[`${day}-${slotName}`];

          if (allocation) {
            rowHtml += `<td class="text-center table-success">${slotName}<br>${allocation.course_code}<br>${allocation.venue}<br>${allocation.employee_id}</td>`;
          } else {
            rowHtml += `<td class="text-center">${slotName}</td>`;
          }
        }

        // Lunch
        rowHtml += `<td class="table-secondary text-center">LUNCH</td>`;

        // Theory slots - Afternoon (time slots 5-8, skipping index 4 which is lunch)
        for (let i = 5; i < 9; i++) {
          const timeSlot = timeSlots[i];
          const slotName = slotMap[day][timeSlot] || "";
          const allocation = allocationMap[`${day}-${slotName}`];

          if (allocation) {
            rowHtml += `<td class="text-center table-success">${slotName}<br>${allocation.course_code}<br>${allocation.venue}<br>${allocation.employee_id}</td>`;
          } else {
            rowHtml += `<td class="text-center">${slotName}</td>`;
          }
        }

        rowHtml += "</tr>";
        tableHtml += rowHtml;

        // Lab slots row - EXACT same hardcoded pattern as master timetable
        let labRowHtml = `<tr><td class="table-warning">Lab</td>`;

        // Morning labs - EXACT same pattern as master
        const morningLab1 = `L${
          day === "MON"
            ? "1+L2"
            : day === "TUE"
            ? "5+L6"
            : day === "WED"
            ? "9+L10"
            : day === "THU"
            ? "13+L14"
            : "17+L18"
        }`;

        const morningLab2 = `L${
          day === "MON"
            ? "3+L4"
            : day === "TUE"
            ? "7+L8"
            : day === "WED"
            ? "11+L12"
            : day === "THU"
            ? "15+L16"
            : "19+L20"
        }`;

        // First morning lab
        const allocation1 = allocationMap[`${day}-${morningLab1}`];
        if (allocation1) {
          labRowHtml += `<td class="text-center table-warning" colspan="2">${morningLab1}<br>${allocation1.course_code}<br>${allocation1.venue}<br>${allocation1.employee_id}</td>`;
        } else {
          labRowHtml += `<td class="text-center table-warning" colspan="2">${morningLab1}</td>`;
        }

        // Second morning lab
        const allocation2 = allocationMap[`${day}-${morningLab2}`];
        if (allocation2) {
          labRowHtml += `<td class="text-center table-warning" colspan="2">${morningLab2}<br>${allocation2.course_code}<br>${allocation2.venue}<br>${allocation2.employee_id}</td>`;
        } else {
          labRowHtml += `<td class="text-center table-warning" colspan="2">${morningLab2}</td>`;
        }

        // Lunch
        labRowHtml += `<td class="table-secondary"></td>`;

        // Afternoon labs - EXACT same pattern as master
        const afternoonLab1 = `L${
          day === "MON"
            ? "21+L22"
            : day === "TUE"
            ? "25+L26"
            : day === "WED"
            ? "29+L30"
            : day === "THU"
            ? "33+L34"
            : "37+L38"
        }`;

        const afternoonLab2 = `L${
          day === "MON"
            ? "23+L24"
            : day === "TUE"
            ? "27+L28"
            : day === "WED"
            ? "31+L32"
            : day === "THU"
            ? "35+L36"
            : "39+L40"
        }`;

        // First afternoon lab
        const allocation3 = allocationMap[`${day}-${afternoonLab1}`];
        if (allocation3) {
          labRowHtml += `<td class="text-center table-warning" colspan="2">${afternoonLab1}<br>${allocation3.course_code}<br>${allocation3.venue}<br>${allocation3.employee_id}</td>`;
        } else {
          labRowHtml += `<td class="text-center table-warning" colspan="2">${afternoonLab1}</td>`;
        }

        // Second afternoon lab
        const allocation4 = allocationMap[`${day}-${afternoonLab2}`];
        if (allocation4) {
          labRowHtml += `<td class="text-center table-warning" colspan="2">${afternoonLab2}<br>${allocation4.course_code}<br>${allocation4.venue}<br>${allocation4.employee_id}</td>`;
        } else {
          labRowHtml += `<td class="text-center table-warning" colspan="2">${afternoonLab2}</td>`;
        }

        labRowHtml += "</tr>";
        tableHtml += labRowHtml;
      });

      tableHtml += "</tbody></table>";

      // Create summary table with unique allocations only
      // Filter out compound slot entries when individual entries exist
      const uniqueAllocations = [];
      const seen = new Set();

      // Group allocations by course-faculty-venue (without slot_name)
      const allocationGroups = {};
      allocations.forEach((allocation) => {
        const groupKey = `${allocation.course_code}-${allocation.employee_id}-${allocation.venue}`;
        if (!allocationGroups[groupKey]) {
          allocationGroups[groupKey] = [];
        }
        allocationGroups[groupKey].push(allocation);
      });

      // Process each group to remove compound duplicates
      Object.values(allocationGroups).forEach((group) => {
        // Separate compound slots (containing commas) from individual slots
        const compoundSlots = group.filter((a) => a.slot_name.includes(","));
        const individualSlots = group.filter((a) => !a.slot_name.includes(","));

        // If we have both compound and individual slots for the same course-faculty-venue
        if (compoundSlots.length > 0 && individualSlots.length > 0) {
          // Check if the compound slot components exist as individual slots
          const shouldRemoveCompound = compoundSlots.some((compound) => {
            const compoundComponents = compound.slot_name
              .split(", ")
              .map((s) => s.trim());
            const hasAllComponents = compoundComponents.every((component) =>
              individualSlots.some(
                (individual) => individual.slot_name === component
              )
            );
            return hasAllComponents;
          });

          if (shouldRemoveCompound) {
            // Only add individual slots, skip compound slots
            individualSlots.forEach((allocation) => {
              const key = `${allocation.course_code}-${allocation.slot_name}-${allocation.venue}`;
              if (!seen.has(key)) {
                seen.add(key);
                uniqueAllocations.push(allocation);
              }
            });
          } else {
            // Add all slots if compound components don't match individual slots
            group.forEach((allocation) => {
              const key = `${allocation.course_code}-${allocation.slot_name}-${allocation.venue}`;
              if (!seen.has(key)) {
                seen.add(key);
                uniqueAllocations.push(allocation);
              }
            });
          }
        } else {
          // No conflict, add all slots from this group
          group.forEach((allocation) => {
            const key = `${allocation.course_code}-${allocation.slot_name}-${allocation.venue}`;
            if (!seen.has(key)) {
              seen.add(key);
              uniqueAllocations.push(allocation);
            }
          });
        }
      });

      // Custom sorting function for slot names
      function sortSlotNames(a, b) {
        const slotA = a.slot_name;
        const slotB = b.slot_name;

        // Handle lab slots (L1+L2, L3+L4, etc.)
        if (slotA.startsWith("L") && slotB.startsWith("L")) {
          const numA = parseInt(slotA.match(/\d+/)[0]);
          const numB = parseInt(slotB.match(/\d+/)[0]);
          return numA - numB;
        }

        // Handle theory slots
        if (!slotA.startsWith("L") && !slotB.startsWith("L")) {
          // Extract base letter and number
          const extractSlotParts = (slot) => {
            if (slot.includes("TA") || slot.includes("TB")) {
              return {
                letter: slot.substring(0, 2),
                number: parseInt(slot.substring(2)) || 0,
              };
            } else {
              const match = slot.match(/([A-Z]+)(\d*)/);
              return { letter: match[1], number: parseInt(match[2]) || 0 };
            }
          };

          const partsA = extractSlotParts(slotA);
          const partsB = extractSlotParts(slotB);

          // First compare by letter
          if (partsA.letter !== partsB.letter) {
            return partsA.letter.localeCompare(partsB.letter);
          }

          // Then by number
          return partsA.number - partsB.number;
        }

        // Mixed case: lab slots come after theory slots
        if (slotA.startsWith("L") && !slotB.startsWith("L")) {
          return 1;
        }
        if (!slotA.startsWith("L") && slotB.startsWith("L")) {
          return -1;
        }

        // Fallback to alphabetical
        return slotA.localeCompare(slotB);
      }

      // Sort unique allocations by slot name
      uniqueAllocations.sort(sortSlotNames);

      let summaryTable = `
        <div class="mt-4">
          <h6>Summary</h6>
          <table class="table summary-table">
            <thead>
              <tr>
                <th>Sl. No.</th>
                <th>Course Code</th>
                <th>Course Title</th>
                <th>Slot</th>
                <th>Venue</th>
                <th>Employee ID</th>
                <th>Faculty Name</th>
              </tr>
            </thead>
            <tbody>
    `;

      // Add rows for each unique allocation
      uniqueAllocations.forEach((allocation, index) => {
        summaryTable += `
              <tr>
                <td>${index + 1}.</td>
                <td>${allocation.course_code}</td>
                <td>${allocation.course_name}</td>
                <td>${allocation.slot_name}</td>
                <td>${allocation.venue}</td>
                <td>${allocation.employee_id}</td>
                <td>${allocation.faculty_name}</td>
              </tr>
      `;
      });

      summaryTable += `
            </tbody>
          </table>
        </div>
    `;

      // Update the container
      const classTimetableDiv = document.getElementById("class-timetable-div");
      if (classTimetableDiv) {
        classTimetableDiv.innerHTML = tableHtml + summaryTable;
      }
    })
    .catch((error) => {
      console.error("Error fetching slots for class timetable:", error);
      const classTimetableDiv = document.getElementById("class-timetable-div");
      if (classTimetableDiv) {
        classTimetableDiv.innerHTML = `<div class="alert alert-danger">Error loading timetable slots. Please try again.</div>`;
      }
    });
}

// Populate view dropdowns
function populateViewDropdowns() {
  // Populate years (already done in populateAcademicYears)
  populateAcademicYears();

  // Populate faculty dropdown
  fetch(`${window.API_URL}/faculty`, {
    headers: {
      Authorization: localStorage.getItem("token"),
    },
  })
    .then((response) => response.json())
    .then((faculty) => {
      if (viewFacultySelect) {
        viewFacultySelect.innerHTML =
          '<option value="">Select Faculty</option>';
        faculty.forEach((f) => {
          const option = document.createElement("option");
          option.value = f.employee_id;
          option.textContent = `${f.name} (${f.employee_id})`;
          viewFacultySelect.appendChild(option);
        });
        // Add searchable overlay if not already set up
        if (!viewFacultySelect._searchableRefresh) {
          setupSearchableSelect(viewFacultySelect, "Type faculty name to search...");
        }
      }
    })
    .catch((error) => {
      console.error("Error loading faculty:", error);
    });

  // Populate venue dropdown
  fetch(`${window.API_URL}/venues`, {
    headers: {
      Authorization: localStorage.getItem("token"),
    },
  })
    .then((response) => response.json())
    .then((venues) => {
      if (viewClassVenueSelect) {
        viewClassVenueSelect.innerHTML =
          '<option value="">Select Venue</option>';
        venues.filter(v => v.is_active === true).forEach((v) => {
          const option = document.createElement("option");
          option.value = v.venue;
          option.textContent = `${v.venue} (${v.infra_type})`;
          viewClassVenueSelect.appendChild(option);
        });
        // Add searchable overlay if not already set up
        if (!viewClassVenueSelect._searchableRefresh) {
          setupSearchableSelect(viewClassVenueSelect, "Type venue name to search...");
        }
      }
    })
    .catch((error) => {
      console.error("Error loading venues:", error);
    });
}

// Local alert function - bypasses global showAlert completely
function localShowAlert(message, type = "info", timeout = 8000) {
  console.log(`[LOCAL ALERT] Creating alert: ${type} - ${message}`);

  const alertContainer = document.getElementById("alert-container");
  if (!alertContainer) {
    console.error("Alert container not found!");
    alert(message); // Fallback to browser alert
    return;
  }

  // Create alert element
  const alertDiv = document.createElement("div");
  alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
  alertDiv.style.margin = "10px 0";
  alertDiv.style.whiteSpace = "pre-line";
  alertDiv.style.zIndex = "9999";
  alertDiv.style.position = "relative";

  alertDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;

  // Add alert to container
  alertContainer.appendChild(alertDiv);
  console.log("Local alert added to DOM:", alertDiv);

  // Force scroll to top and focus on alert
  window.scrollTo({ top: 0, behavior: "smooth" });

  // Auto-remove after timeout
  if (timeout && timeout > 0) {
    setTimeout(() => {
      if (alertDiv.parentNode) {
        alertDiv.classList.remove("show");
        setTimeout(() => {
          if (alertDiv.parentNode) {
            alertDiv.remove();
          }
        }, 150);
      }
    }, timeout);
  }
}

// Enhanced autocomplete for course code
function setupCourseCodeAutocomplete() {
  // Create a dropdown container for our custom autocomplete
  const dropdown = document.createElement("div");
  dropdown.className = "autocomplete-dropdown";
  dropdown.style.display = "none";
  dropdown.style.position = "absolute";
  dropdown.style.zIndex = "1000";
  dropdown.style.backgroundColor = "#fff";
  dropdown.style.border = "1px solid #ddd";
  dropdown.style.maxHeight = "200px";
  dropdown.style.overflowY = "auto";
  dropdown.style.width = "100%";

  // Insert the dropdown after the course code input
  allocationCourseCodeInput.parentNode.style.position = "relative";
  allocationCourseCodeInput.parentNode.appendChild(dropdown);

  // Replace the existing input handler with our enhanced version
  allocationCourseCodeInput.removeEventListener("input", handleCourseCodeInput);
  allocationCourseCodeInput.addEventListener("input", function (event) {
    const courseCode = event.target.value.trim().toUpperCase();

    if (courseCode.length < 2) {
      dropdown.style.display = "none";
      allocationCourseNameDisplay.textContent = "";
      allocationCourseTpcDisplay.textContent = "";
      return;
    }

    // Fetch all courses and filter client-side
    fetch(`${window.API_URL}/courses`, {
      headers: {
        Authorization: localStorage.getItem("token"),
      },
    })
      .then((response) => response.json())
      .then((courses) => {
        // Filter courses that match the typed code
        const matchingCourses = courses.filter((c) =>
          c.course_code.toUpperCase().includes(courseCode)
        );

        if (matchingCourses.length > 0) {
          // Show dropdown with matching courses
          dropdown.style.display = "block";
          dropdown.innerHTML = "";

          matchingCourses.forEach((course) => {
            const item = document.createElement("div");
            item.className = "autocomplete-item";
            item.style.padding = "8px 12px";
            item.style.cursor = "pointer";
            item.style.borderBottom = "1px solid #eee";
            item.textContent = `${course.course_code} - ${course.course_name}`;

            item.addEventListener("mouseover", () => {
              item.style.backgroundColor = "#f1f1f1";
            });

            item.addEventListener("mouseout", () => {
              item.style.backgroundColor = "transparent";
            });

            item.addEventListener("click", () => {
              // Set the value in the input field
              allocationCourseCodeInput.value = course.course_code;

              // Update displays
              courseData = course;
              allocationCourseNameDisplay.textContent = course.course_name;
              allocationCourseTpcDisplay.textContent = `${course.theory}-${course.practical}-${course.credits}`;

              // Update component type options for TEL courses
              updateComponentTypeOptions(course);

              // Check if P=4 lab selection should be shown (Fall 2025-26)
              const componentType = allocationComponentTypeInput ? allocationComponentTypeInput.value : "";
              toggleP4LabSelection(course, componentType);

              // Update available slots based on TPC
              updateAvailableSlots(course);

              // Hide dropdown
              dropdown.style.display = "none";
            });

            dropdown.appendChild(item);
          });
        } else {
          dropdown.style.display = "none";
        }
      })
      .catch((error) => {
        console.error("Error fetching course details:", error);
        dropdown.style.display = "none";
      });
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", function (event) {
    if (
      !allocationCourseCodeInput.contains(event.target) &&
      !dropdown.contains(event.target)
    ) {
      dropdown.style.display = "none";
    }
  });
}

function setupFacultyNameAutocomplete() {
  // Find the labels more reliably using parent-child relationships
  // The label for the input field where faculty name is typed
  const employeeIdField = document.getElementById(
    "allocation-employee-id-field"
  );
  const employeeIdLabel =
    employeeIdField && employeeIdField.closest(".mb-3")?.querySelector("label");

  // The label for the display field that shows employee ID
  const facultyNameDisplay = document.getElementById(
    "allocation-faculty-name-display"
  );
  const facultyNameLabel =
    facultyNameDisplay &&
    facultyNameDisplay.closest(".mb-3")?.querySelector("label");

  // Update the labels
  if (employeeIdLabel) {
    employeeIdLabel.textContent = "Faculty Name *";
    console.log("Updated input field label to: Faculty Name *");
  } else {
    console.warn("Could not find the label for employee ID field");
  }

  if (facultyNameLabel) {
    facultyNameLabel.textContent = "Employee ID";
    console.log("Updated display field label to: Employee ID");
  } else {
    console.warn("Could not find the label for faculty name display");
  }

  // Add a fallback method using direct DOM selection
  setTimeout(() => {
    // Attempt to update labels again after a short delay
    const labels = document.querySelectorAll("label");
    labels.forEach((label) => {
      // Check if the label is for the faculty name display by its proximity to the element
      if (
        label.nextElementSibling &&
        label.nextElementSibling.id === "allocation-faculty-name-display"
      ) {
        label.textContent = "Employee ID";
        console.log("Updated faculty display label via fallback method");
      }
    });
  }, 500);

  // Create a new text input for faculty name search
  const facultyNameSearchInput = document.createElement("input");
  facultyNameSearchInput.type = "text";
  facultyNameSearchInput.className = "form-control";
  facultyNameSearchInput.placeholder = "Start typing faculty name...";
  facultyNameSearchInput.id = "faculty-name-search";

  // Get the existing employee ID field and its container
  const employeeIdContainer = allocationEmployeeIdInput.parentNode;

  // Insert the faculty name search before the employee ID input
  employeeIdContainer.insertBefore(
    facultyNameSearchInput,
    allocationEmployeeIdInput
  );

  // Hide the original employee ID input
  allocationEmployeeIdInput.style.display = "none";

  // Create dropdown container
  const dropdown = document.createElement("div");
  dropdown.className = "autocomplete-dropdown";
  dropdown.style.display = "none";
  dropdown.style.position = "absolute";
  dropdown.style.zIndex = "1000";
  dropdown.style.backgroundColor = "#fff";
  dropdown.style.border = "1px solid #ddd";
  dropdown.style.maxHeight = "200px";
  dropdown.style.overflowY = "auto";
  dropdown.style.width = "100%";

  // Add dropdown to container
  employeeIdContainer.style.position = "relative";
  employeeIdContainer.appendChild(dropdown);

  // Add input event listener to faculty name search
  facultyNameSearchInput.addEventListener("input", function (event) {
    const searchTerm = event.target.value.trim().toLowerCase();
    console.log("Faculty search term:", searchTerm);

    if (searchTerm.length < 2) {
      dropdown.style.display = "none";
      allocationFacultyNameDisplay.textContent = "";
      return;
    }

    // Fetch faculty data
    fetch(`${window.API_URL}/faculty`, {
      headers: {
        Authorization: localStorage.getItem("token"),
      },
    })
      .then((response) => response.json())
      .then((facultyList) => {
        console.log("Faculty list:", facultyList);

        // Filter matching faculty
        const matchingFaculty = facultyList.filter((f) =>
          f.name.toLowerCase().includes(searchTerm)
        );
        console.log("Matching faculty:", matchingFaculty);

        if (matchingFaculty.length > 0) {
          // Show dropdown
          dropdown.style.display = "block";
          dropdown.innerHTML = "";

          matchingFaculty.forEach((faculty) => {
            const item = document.createElement("div");
            item.className = "autocomplete-item";
            item.style.padding = "8px 12px";
            item.style.cursor = "pointer";
            item.style.borderBottom = "1px solid #eee";
            item.textContent = faculty.name;

            item.addEventListener("mouseover", () => {
              item.style.backgroundColor = "#f1f1f1";
            });

            item.addEventListener("mouseout", () => {
              item.style.backgroundColor = "transparent";
            });

            item.addEventListener("click", () => {
              // Set the search input to faculty name
              facultyNameSearchInput.value = faculty.name;

              // Set the hidden employee ID input
              allocationEmployeeIdInput.value = faculty.employee_id;

              // Display the faculty name and employee ID
              allocationFacultyNameDisplay.textContent = faculty.employee_id;

              // Store faculty data
              facultyData = faculty;

              // If course is already selected, refresh slots with enhanced API
              if (courseData && courseData.course_code) {
                console.log(
                  "Faculty selected via autocomplete, refreshing slots with enhanced API"
                );
                updateAvailableSlots(courseData);
                
                // Also refresh P=4 lab pairs if this is a P=4 course
                if (courseData.practical === 4) {
                  console.log("Refreshing P=4 lab pairs after faculty selection");
                  loadP4LabPairs();
                }
              } else {
                // Fallback to original logic if course not selected yet
                updateFacultyAvailableSlots();
                checkAndDisableConflictingSlots();
              }

              // Hide dropdown
              dropdown.style.display = "none";
            });

            dropdown.appendChild(item);
          });
        } else {
          dropdown.style.display = "none";
        }
      })
      .catch((error) => {
        console.error("Error fetching faculty:", error);
        dropdown.style.display = "none";
      });
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", function (event) {
    if (
      !facultyNameSearchInput.contains(event.target) &&
      !dropdown.contains(event.target)
    ) {
      dropdown.style.display = "none";
    }
  });
}

// Reusable searchable select utility
// Converts a plain <select> into a searchable dropdown
function setupSearchableSelect(selectElement, placeholder) {
  if (!selectElement) return;

  const container = selectElement.parentNode;

  // Create search input
  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.className = "form-control";
  searchInput.placeholder = placeholder || "Type to search...";

  // Hide the original select
  selectElement.style.display = "none";

  // Insert search input before the hidden select
  container.insertBefore(searchInput, selectElement);

  // Create dropdown container
  const dropdown = document.createElement("div");
  dropdown.className = "autocomplete-dropdown";
  dropdown.style.display = "none";
  dropdown.style.position = "absolute";
  dropdown.style.zIndex = "1000";
  dropdown.style.backgroundColor = "#fff";
  dropdown.style.border = "1px solid #ddd";
  dropdown.style.maxHeight = "200px";
  dropdown.style.overflowY = "auto";
  dropdown.style.width = "100%";

  container.style.position = "relative";
  container.appendChild(dropdown);

  // Build options list from current select options
  function getOptions() {
    return Array.from(selectElement.options)
      .filter((opt) => opt.value) // skip placeholder options
      .map((opt) => ({ value: opt.value, text: opt.textContent }));
  }

  // Show filtered dropdown
  function showDropdown(searchTerm) {
    const options = getOptions();
    const filtered = searchTerm
      ? options.filter((o) => o.text.toLowerCase().includes(searchTerm.toLowerCase()))
      : options;

    if (filtered.length === 0) {
      dropdown.style.display = "none";
      return;
    }

    dropdown.style.display = "block";
    dropdown.innerHTML = "";

    filtered.forEach((opt) => {
      const item = document.createElement("div");
      item.className = "autocomplete-item";
      item.style.padding = "8px 12px";
      item.style.cursor = "pointer";
      item.style.borderBottom = "1px solid #eee";
      item.textContent = opt.text;

      item.addEventListener("mouseover", () => {
        item.style.backgroundColor = "#f1f1f1";
      });
      item.addEventListener("mouseout", () => {
        item.style.backgroundColor = "transparent";
      });
      item.addEventListener("click", () => {
        searchInput.value = opt.text;
        selectElement.value = opt.value;
        // Trigger change event on the original select
        selectElement.dispatchEvent(new Event("change"));
        dropdown.style.display = "none";
      });

      dropdown.appendChild(item);
    });
  }

  // Input event — filter as user types, or show all if empty
  searchInput.addEventListener("input", function () {
    const searchTerm = this.value.trim();
    if (searchTerm.length === 0) {
      showDropdown(""); // show all options
    } else if (searchTerm.length >= 2) {
      showDropdown(searchTerm);
    } else {
      dropdown.style.display = "none";
    }
  });

  // Focus/click event — show all options like a dropdown
  searchInput.addEventListener("focus", function () {
    showDropdown(this.value.trim().length >= 2 ? this.value.trim() : "");
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", function (event) {
    if (!searchInput.contains(event.target) && !dropdown.contains(event.target)) {
      dropdown.style.display = "none";
    }
  });

  // Allow clearing — if user clears the input, reset the select
  searchInput.addEventListener("input", function () {
    if (this.value.trim() === "") {
      selectElement.value = "";
      selectElement.dispatchEvent(new Event("change"));
    }
  });

  // Expose a refresh method to sync search input with select value
  selectElement._searchableRefresh = function () {
    const selectedOption = selectElement.options[selectElement.selectedIndex];
    if (selectedOption && selectedOption.value) {
      searchInput.value = selectedOption.textContent;
    } else {
      searchInput.value = "";
    }
  };

  return searchInput;
}

// Real-time conflict checking with visual feedback
let conflictCheckTimeout = null;

async function checkConflictsRealTime() {
  // Clear any existing timeout
  if (conflictCheckTimeout) {
    clearTimeout(conflictCheckTimeout);
  }

  // Debounce the conflict check (wait 500ms after user stops interacting)
  conflictCheckTimeout = setTimeout(async () => {
    await performConflictCheck();
  }, 500);
}

async function performConflictCheck() {
  try {
    // Get current form values
    const year = allocationYearInput?.value;
    const semesterType = allocationSemesterTypeInput?.value;
    const courseCode = allocationCourseCodeInput?.value;
    const facultyId = allocationEmployeeIdInput?.value;
    const slotName = allocationSlotNameInput?.value;
    const venue = allocationVenueInput?.value;

    // Need at least year and semester to do meaningful conflict checking
    if (!year || !semesterType) {
      clearConflictIndicators();
      return;
    }

    // Build query parameters
    const params = new URLSearchParams({
      year,
      semesterType,
    });

    if (courseCode) params.append("courseCode", courseCode);
    if (facultyId) params.append("facultyId", facultyId);
    if (slotName) params.append("slotName", slotName);
    if (venue) params.append("venue", venue);

    console.log("Checking conflicts with params:", params.toString());

    // Make API call
    const response = await fetch(
      `${window.API_URL}/faculty-allocations/check-conflicts?${params}`,
      {
        headers: {
          Authorization: localStorage.getItem("token"),
        },
      }
    );

    if (!response.ok) {
      console.error("Conflict check failed:", response.status);
      return;
    }

    const result = await response.json();
    console.log("Conflict check result:", result);

    // Update UI based on conflicts
    updateConflictIndicators(result);
  } catch (error) {
    console.error("Error checking conflicts:", error);
    clearConflictIndicators();
  }
}

function updateConflictIndicators(conflictResult) {
  // Clear previous indicators
  clearConflictIndicators();

  const { hasConflicts, conflicts } = conflictResult;

  if (hasConflicts && conflicts.length > 0) {
    // Show conflicts with visual indicators
    conflicts.forEach((conflict) => {
      showConflictIndicator(conflict);
    });

    // Disable save button
    if (saveFacultyAllocationBtn) {
      saveFacultyAllocationBtn.disabled = true;
      saveFacultyAllocationBtn.textContent = "Conflicts Detected";
      saveFacultyAllocationBtn.className = "btn btn-danger";
    }

    // Show conflict summary
    showConflictSummary(conflicts);
  } else {
    // No conflicts - enable save button and show success indicators
    if (saveFacultyAllocationBtn) {
      saveFacultyAllocationBtn.disabled = false;
      saveFacultyAllocationBtn.textContent = "Save Allocation";
      saveFacultyAllocationBtn.className = "btn btn-success";
    }

    // Show success indicators on filled fields
    showSuccessIndicators();
  }
}

function showConflictIndicator(conflict) {
  console.log("Showing conflict indicator for:", conflict);

  // Add red borders and warning icons based on conflict type
  if (
    conflict.type === "venue_clash" ||
    conflict.type === "linked_slot_venue_clash"
  ) {
    addConflictStyling(allocationVenueInput, conflict.message);
    addConflictStyling(
      allocationSlotNameInput,
      "Slot time conflicts with venue booking"
    );
  }

  if (
    conflict.type === "faculty_clash" ||
    conflict.type === "linked_slot_faculty_clash"
  ) {
    addConflictStyling(
      allocationEmployeeIdInput?.parentNode?.querySelector(
        "#faculty-name-search"
      ) || allocationEmployeeIdInput,
      conflict.message
    );
    addConflictStyling(
      allocationSlotNameInput,
      "Faculty already teaching at this time"
    );
  }

  if (conflict.type === "slot_conflict") {
    addConflictStyling(allocationSlotNameInput, conflict.message);
  }
}

function addConflictStyling(element, message) {
  if (!element) return;

  // Add red border
  element.style.borderColor = "#dc3545";
  element.style.borderWidth = "2px";
  element.style.boxShadow = "0 0 0 0.2rem rgba(220, 53, 69, 0.25)";

  // Add or update conflict message
  let conflictMsg = element.parentNode.querySelector(".conflict-message");
  if (!conflictMsg) {
    conflictMsg = document.createElement("div");
    conflictMsg.className = "conflict-message text-danger small mt-1";
    conflictMsg.innerHTML =
      '<i class="fas fa-exclamation-triangle"></i> ' + message;
    element.parentNode.appendChild(conflictMsg);
  } else {
    conflictMsg.innerHTML =
      '<i class="fas fa-exclamation-triangle"></i> ' + message;
  }
}

function showSuccessIndicators() {
  // Add green checkmarks to successfully filled fields
  const fieldsToCheck = [
    {
      element: allocationCourseCodeInput,
      condition: () => courseData && courseData.course_code,
    },
    {
      element:
        allocationEmployeeIdInput?.parentNode?.querySelector(
          "#faculty-name-search"
        ) || allocationEmployeeIdInput,
      condition: () => facultyData && facultyData.employee_id,
    },
    {
      element: allocationSlotNameInput,
      condition: () => allocationSlotNameInput?.value,
    },
    {
      element: allocationVenueInput,
      condition: () => allocationVenueInput?.value,
    },
  ];

  fieldsToCheck.forEach(({ element, condition }) => {
    if (element && condition()) {
      addSuccessStyling(element);
    }
  });
}

function addSuccessStyling(element) {
  if (!element) return;

  // Add green border
  element.style.borderColor = "#198754";
  element.style.borderWidth = "2px";
  element.style.boxShadow = "0 0 0 0.2rem rgba(25, 135, 84, 0.25)";

  // Add or update success indicator
  let successMsg = element.parentNode.querySelector(".success-message");
  if (!successMsg) {
    successMsg = document.createElement("div");
    successMsg.className = "success-message text-success small mt-1";
    successMsg.innerHTML = '<i class="fas fa-check-circle"></i> Available';
    element.parentNode.appendChild(successMsg);
  }
}

function showConflictSummary(conflicts) {
  // Create or update conflict summary alert
  let summaryAlert = document.querySelector(".conflict-summary-alert");
  if (!summaryAlert) {
    summaryAlert = document.createElement("div");
    summaryAlert.className = "conflict-summary-alert alert alert-danger mt-3";
    // Insert after the form or in a visible location
    const form = document.getElementById("faculty-allocation-form");
    if (form) {
      form.parentNode.insertBefore(summaryAlert, form.nextSibling);
    }
  }

  let summaryHtml =
    '<h6><i class="fas fa-exclamation-triangle"></i> Allocation Conflicts Detected:</h6><ul>';
  conflicts.forEach((conflict, index) => {
    summaryHtml += `<li><strong>${conflict.type
      .replace(/_/g, " ")
      .toUpperCase()}:</strong> ${conflict.message}</li>`;
  });
  summaryHtml +=
    "</ul><small>Please resolve these conflicts before saving the allocation.</small>";

  summaryAlert.innerHTML = summaryHtml;
}

function clearConflictIndicators() {
  // Remove all conflict and success styling
  const allInputs = [
    allocationCourseCodeInput,
    allocationEmployeeIdInput?.parentNode?.querySelector(
      "#faculty-name-search"
    ) || allocationEmployeeIdInput,
    allocationSlotNameInput,
    allocationVenueInput,
  ];

  allInputs.forEach((element) => {
    if (element) {
      // Reset styling
      element.style.borderColor = "";
      element.style.borderWidth = "";
      element.style.boxShadow = "";

      // Remove conflict/success messages
      const conflictMsg = element.parentNode.querySelector(".conflict-message");
      const successMsg = element.parentNode.querySelector(".success-message");
      if (conflictMsg) conflictMsg.remove();
      if (successMsg) successMsg.remove();
    }
  });

  // Remove conflict summary
  const summaryAlert = document.querySelector(".conflict-summary-alert");
  if (summaryAlert) summaryAlert.remove();

  // Reset save button
  if (saveFacultyAllocationBtn) {
    saveFacultyAllocationBtn.disabled = false;
    saveFacultyAllocationBtn.textContent = "Save Allocation";
    saveFacultyAllocationBtn.className = "btn btn-primary";
  }
}

// P=4 Lab Selection Functions

// Show/hide P=4 lab selection based on course P=4 and componentType=lab
function toggleP4LabSelection(course, componentType) {
  if (!p4LabSelectionContainer || !course) return;

  const shouldShowP4Selection =
    course.practical === 4 &&
    (
      // For Lab-only courses (T=0, P=4), always show P=4 selection
      (course.theory === 0) ||
      // For TEL courses (T>0, P=4), show only when lab component is selected
      (course.theory > 0 && componentType === "lab")
    );

  if (shouldShowP4Selection) {
    p4LabSelectionContainer.style.display = "block";
    allocationSlotNameInput.style.display = "none"; // Hide regular slot selection
    
    // Hide redundant venue type and venue fields
    if (redundantVenueTypeField) {
      redundantVenueTypeField.parentElement.style.display = "none";
    }
    if (redundantVenueField) {
      redundantVenueField.parentElement.style.display = "none";
    }
    
    loadP4LabPairs();
    loadP4VenueTypes();
  } else {
    p4LabSelectionContainer.style.display = "none";
    allocationSlotNameInput.style.display = "block"; // Show regular slot selection
    
    // Show redundant venue type and venue fields
    if (redundantVenueTypeField) {
      redundantVenueTypeField.parentElement.style.display = "block";
    }
    if (redundantVenueField) {
      redundantVenueField.parentElement.style.display = "block";
    }
    
    clearP4Selection();
  }
}

// Load available lab pairs for P=4 selection
function loadP4LabPairs() {
  console.log("loadP4LabPairs() called");
  if (!allocationLabPair1 || !allocationLabPair2) {
    console.log("P=4 dropdowns not found");
    return;
  }

  const year = allocationYearInput.value;
  const semesterType = allocationSemesterTypeInput.value;
  const courseCode = allocationCourseCodeInput.value;
  const facultyId = allocationEmployeeIdInput.value;

  if (!year || !semesterType || !courseCode || !facultyId) {
    console.log("Missing required fields for P=4:", { year, semesterType, courseCode, facultyId });
    return;
  }
  
  console.log("Loading P=4 lab pairs with:", { year, semesterType, courseCode, facultyId });

  // Use enhanced API that considers faculty conflicts for P=4 courses  
  fetch(
    `${window.API_URL}/faculty-allocations/available-slots-for-faculty?` +
      `facultyId=${facultyId}&courseCode=${courseCode}&year=${year}&semesterType=${semesterType}&componentType=lab`,
    {
      headers: {
        Authorization: localStorage.getItem("token"),
      },
    }
  )
    .then((response) => response.json())
    .then((data) => {
      console.log("P=4 lab slots response:", data);
      console.log("Available slots:", data.availableSlots);
      console.log("Disabled slots:", data.disabledSlots);
      
      // Clear existing options
      allocationLabPair1.innerHTML = '<option value="">Select First Lab Pair</option>';
      allocationLabPair2.innerHTML = '<option value="">Select Second Lab Pair</option>';

      // Populate both dropdowns with available lab pairs
      if (data.availableSlots && data.availableSlots.length > 0) {
        data.availableSlots.forEach((slot) => {
          const option1 = document.createElement("option");
          option1.value = slot;
          option1.textContent = slot;
          allocationLabPair1.appendChild(option1);

          const option2 = document.createElement("option");
          option2.value = slot;
          option2.textContent = slot;
          allocationLabPair2.appendChild(option2);
        });
      }

      // Add disabled slots (already allocated) as greyed out options
      if (data.disabledSlots && data.disabledSlots.length > 0) {
        data.disabledSlots.forEach((disabled) => {
          const option1 = document.createElement("option");
          option1.value = disabled.slotName;
          option1.textContent = `❌ ${disabled.slotName} - ${disabled.reason}`;
          option1.disabled = true;
          option1.style.color = "#dc3545";
          option1.style.fontStyle = "italic";
          allocationLabPair1.appendChild(option1);

          const option2 = document.createElement("option");
          option2.value = disabled.slotName;
          option2.textContent = `❌ ${disabled.slotName} - ${disabled.reason}`;
          option2.disabled = true;
          option2.style.color = "#dc3545";
          option2.style.fontStyle = "italic";
          allocationLabPair2.appendChild(option2);
        });
      }
      
      // Load venues for both lab venue dropdowns
      loadP4LabVenues();
    })
    .catch((error) => {
      console.error("Error loading P=4 lab pairs:", error);
      localShowAlert("Error loading lab pairs", "danger");
      
      // Fallback to basic API if enhanced API fails
      console.log("Falling back to basic available-slots API...");
      fetch(
        `${window.API_URL}/faculty-allocations/available-slots?` +
          `courseCode=${courseCode}&year=${year}&semesterType=${semesterType}&componentType=lab`,
        {
          headers: {
            Authorization: localStorage.getItem("token"),
          },
        }
      )
      .then((response) => response.json())
      .then((data) => {
        console.log("Fallback API response:", data);
        // Use the old logic for fallback
        if (data.availableSlots && data.availableSlots.length > 0) {
          data.availableSlots.forEach((slot) => {
            const option1 = document.createElement("option");
            option1.value = slot;
            option1.textContent = slot;
            allocationLabPair1.appendChild(option1);

            const option2 = document.createElement("option");
            option2.value = slot;
            option2.textContent = slot;
            allocationLabPair2.appendChild(option2);
          });
        }
      })
      .catch((fallbackError) => {
        console.error("Fallback API also failed:", fallbackError);
      });
    });
}

// Load venues for P=4 lab selection
function loadP4LabVenues() {
  if (!allocationLabVenue1 || !allocationLabVenue2) return;

  // Get lab venues (same logic as existing venue loading)
  fetch(`${window.API_URL}/venues`, {
    headers: {
      Authorization: localStorage.getItem("token"),
    },
  })
    .then((response) => response.json())
    .then((venues) => {
      // Filter for active lab venues only
      const labVenues = venues.filter((v) => v.is_active === true);
      
      // Clear existing options
      allocationLabVenue1.innerHTML = '<option value="">Select Venue for First Lab</option>';
      allocationLabVenue2.innerHTML = '<option value="">Select Venue for Second Lab</option>';

      // Populate both venue dropdowns
      labVenues.forEach((venue) => {
        const option1 = document.createElement("option");
        option1.value = venue.venue;
        option1.textContent = venue.venue;
        allocationLabVenue1.appendChild(option1);

        const option2 = document.createElement("option");
        option2.value = venue.venue;
        option2.textContent = venue.venue;
        allocationLabVenue2.appendChild(option2);
      });
    })
    .catch((error) => {
      console.error("Error loading venues for P=4:", error);
    });
}

// Handle first lab pair selection
function handleLabPair1Change() {
  const selectedPair1 = allocationLabPair1.value;
  
  // Update day/time display for first lab pair
  const year = allocationYearInput ? allocationYearInput.value : "";
  const semester = allocationSemesterTypeInput ? allocationSemesterTypeInput.value : "";
  updateLabPairDayTime(selectedPair1, allocationLabDayTime1, year, semester);
  
  // Update second dropdown to exclude the selected pair and conflicting pairs
  updateSecondLabPairOptions(selectedPair1);
  
  // Clear second selection if it conflicts
  if (allocationLabPair2.value === selectedPair1) {
    allocationLabPair2.value = "";
    if (allocationLabDayTime2) allocationLabDayTime2.textContent = "";
  }
  
  // Validate current selection with separate venues
  validateP4Selection();
}

// Handle second lab pair selection
function handleLabPair2Change() {
  const selectedPair2 = allocationLabPair2.value;
  
  // Update day/time display for second lab pair
  const year = allocationYearInput ? allocationYearInput.value : "";
  const semester = allocationSemesterTypeInput ? allocationSemesterTypeInput.value : "";
  updateLabPairDayTime(selectedPair2, allocationLabDayTime2, year, semester);
  
  // Validate current selection with separate venues
  validateP4Selection();
}

// Update second dropdown options based on first selection
function updateSecondLabPairOptions(selectedPair1) {
  if (!allocationLabPair2) return;

  // Re-enable all options first
  Array.from(allocationLabPair2.options).forEach((option) => {
    option.disabled = false;
    option.style.display = "block";
  });

  if (selectedPair1) {
    // Disable the same pair in second dropdown
    Array.from(allocationLabPair2.options).forEach((option) => {
      if (option.value === selectedPair1) {
        option.disabled = true;
        option.style.display = "none";
      }
    });
  }
}

// Validate lab pair combination using the new API
function validateLabPairCombination(pair1, pair2) {
  if (!pair1 || !pair2 || !p4ValidationMessage) return;

  const facultyId = allocationEmployeeIdInput.value;
  const venue = allocationVenueInput.value;
  const year = allocationYearInput.value;
  const semesterType = allocationSemesterTypeInput.value;

  if (!facultyId || !venue) {
    p4ValidationMessage.textContent = "Select faculty and venue first";
    p4ValidationMessage.className = "form-text text-warning";
    return;
  }

  // Show loading message
  p4ValidationMessage.textContent = "Validating lab pair combination...";
  p4ValidationMessage.className = "form-text text-info";

  fetch(
    `${window.API_URL}/faculty-allocations/validate-lab-pairs?` +
      `pair1=${pair1}&pair2=${pair2}&facultyId=${facultyId}&venue=${venue}&year=${year}&semesterType=${semesterType}`,
    {
      headers: {
        Authorization: localStorage.getItem("token"),
      },
    }
  )
    .then((response) => response.json())
    .then((data) => {
      console.log("Validation response:", data);
      
      if (data.valid) {
        p4ValidationMessage.textContent = `✓ Valid combination: ${pair1} + ${pair2}`;
        p4ValidationMessage.className = "form-text text-success";
        
        // Enable save button if it was disabled
        if (saveFacultyAllocationBtn) {
          saveFacultyAllocationBtn.disabled = false;
          saveFacultyAllocationBtn.className = "btn btn-success";
        }
      } else {
        p4ValidationMessage.textContent = `✗ ${data.message}`;
        p4ValidationMessage.className = "form-text text-danger";
        
        // Show detailed conflicts
        if (data.conflicts && data.conflicts.length > 0) {
          const conflictDetails = data.conflicts.map(c => c.message).join("; ");
          p4ValidationMessage.textContent += ` (${conflictDetails})`;
        }
        
        // Disable save button
        if (saveFacultyAllocationBtn) {
          saveFacultyAllocationBtn.disabled = true;
          saveFacultyAllocationBtn.className = "btn btn-danger";
        }
      }
    })
    .catch((error) => {
      console.error("Error validating lab pairs:", error);
      p4ValidationMessage.textContent = "Error validating combination";
      p4ValidationMessage.className = "form-text text-danger";
    });
}

// Clear P=4 validation message
function clearP4ValidationMessage() {
  if (p4ValidationMessage) {
    p4ValidationMessage.textContent = "";
    p4ValidationMessage.className = "form-text";
  }
}

// Clear P=4 selection
function clearP4Selection() {
  if (allocationLabPair1) allocationLabPair1.value = "";
  if (allocationLabPair2) allocationLabPair2.value = "";
  if (allocationLabDayTime1) allocationLabDayTime1.textContent = "";
  if (allocationLabDayTime2) allocationLabDayTime2.textContent = "";
  if (allocationLabVenueType1) allocationLabVenueType1.value = "";
  if (allocationLabVenueType2) allocationLabVenueType2.value = "";
  if (allocationLabVenue1) allocationLabVenue1.value = "";
  if (allocationLabVenue2) allocationLabVenue2.value = "";
  clearP4ValidationMessage();
}

// Handle lab venue change events
function handleLabVenue1Change() {
  validateP4Selection();
}

function handleLabVenue2Change() {
  validateP4Selection();
}

// Validate complete P=4 selection
function validateP4Selection() {
  const pair1 = allocationLabPair1.value;
  const pair2 = allocationLabPair2.value;
  const venue1 = allocationLabVenue1.value;
  const venue2 = allocationLabVenue2.value;
  const facultyId = allocationEmployeeIdInput.value;
  
  if (pair1 && pair2 && venue1 && venue2 && facultyId) {
    // Validate both pairs with their respective venues
    validateDualLabPairCombination(pair1, pair2, venue1, venue2, facultyId);
  } else {
    clearP4ValidationMessage();
  }
}

// Validate dual lab pair combination with separate venues
function validateDualLabPairCombination(pair1, pair2, venue1, venue2, facultyId) {
  if (!p4ValidationMessage) return;

  const year = allocationYearInput.value;
  const semesterType = allocationSemesterTypeInput.value;

  // Show loading message
  p4ValidationMessage.textContent = "Validating lab pair combination...";
  p4ValidationMessage.className = "form-text text-info";

  // For now, use the existing API but we'll need to enhance it for dual venues
  fetch(
    `${window.API_URL}/faculty-allocations/validate-lab-pairs?` +
      `pair1=${pair1}&pair2=${pair2}&facultyId=${facultyId}&venue=${venue1}&year=${year}&semesterType=${semesterType}`,
    {
      headers: {
        Authorization: localStorage.getItem("token"),
      },
    }
  )
    .then((response) => response.json())
    .then((data) => {
      console.log("Dual validation response:", data);
      
      if (data.valid) {
        // Check if same venue is used - but only warn if there might be actual conflicts
        if (venue1 === venue2) {
          // Same venue is OK if time slots don't overlap (which our clash table should handle)
          // Since the backend validation passed, the time slots are compatible
          p4ValidationMessage.textContent = `✓ Valid combination: ${pair1} + ${pair2} using ${venue1} at different times`;
          p4ValidationMessage.className = "form-text text-success";
        } else {
          p4ValidationMessage.textContent = `✓ Valid combination: ${pair1} (${venue1}) + ${pair2} (${venue2})`;
          p4ValidationMessage.className = "form-text text-success";
        }
        
        // Enable save button
        if (saveFacultyAllocationBtn) {
          saveFacultyAllocationBtn.disabled = false;
          saveFacultyAllocationBtn.className = "btn btn-success";
        }
      } else {
        p4ValidationMessage.textContent = `✗ ${data.message}`;
        p4ValidationMessage.className = "form-text text-danger";
        
        // Disable save button
        if (saveFacultyAllocationBtn) {
          saveFacultyAllocationBtn.disabled = true;
          saveFacultyAllocationBtn.className = "btn btn-danger";
        }
      }
    })
    .catch((error) => {
      console.error("Error validating dual lab pairs:", error);
      p4ValidationMessage.textContent = "Error validating combination";
      p4ValidationMessage.className = "form-text text-danger";
    });
}

// Removed duplicate localShowAlert function - using the detailed implementation above

// Update lab pair day/time display
function updateLabPairDayTime(labPair, displayElement, year = null, semester = null) {
  if (!displayElement || !labPair) {
    if (displayElement) displayElement.textContent = "";
    return;
  }
  
  // Get year and semester from form inputs if not provided
  const currentYear = year || (allocationYearInput ? allocationYearInput.value : "");
  const currentSemester = semester || (allocationSemesterTypeInput ? allocationSemesterTypeInput.value : "");
  
  // 2025-26 lab slot timings for FALL and WINTER (based on master timetable)
  const fall2025DayTimeMap = {
    "L1+L2": "Monday 9:00 - 10:45",
    "L3+L4": "Monday 10:50 - 12:35",
    "L5+L6": "Tuesday 9:00 - 10:45",
    "L7+L8": "Tuesday 10:50 - 12:35",
    "L9+L10": "Wednesday 9:00 - 10:45",
    "L11+L12": "Wednesday 10:50 - 12:35",
    "L13+L14": "Thursday 9:00 - 10:45",
    "L15+L16": "Thursday 10:50 - 12:35",
    "L17+L18": "Friday 9:00 - 10:45",
    "L19+L20": "Friday 10:50 - 12:35",
    "L21+L22": "Monday 1:15 - 3:00",
    "L23+L24": "Monday 3:05 - 4:50",
    "L25+L26": "Tuesday 1:15 - 3:00",
    "L27+L28": "Tuesday 3:05 - 4:50",
    "L29+L30": "Wednesday 1:15 - 3:00",
    "L31+L32": "Wednesday 3:05 - 4:50",
    "L33+L34": "Thursday 1:15 - 3:00",
    "L35+L36": "Thursday 3:05 - 4:50",
    "L37+L38": "Friday 1:15 - 3:00",
    "L39+L40": "Friday 3:05 - 4:50"
  };
  
  // Default/legacy lab slot timings for other semesters
  const defaultDayTimeMap = {
    "L1+L2": "Monday 8:00 AM - 10:00 AM",
    "L3+L4": "Monday 10:15 AM - 12:15 PM",
    "L5+L6": "Monday 1:00 PM - 3:00 PM",
    "L7+L8": "Monday 3:15 PM - 5:15 PM",
    "L9+L10": "Tuesday 8:00 AM - 10:00 AM",
    "L11+L12": "Tuesday 10:15 AM - 12:15 PM",
    "L13+L14": "Tuesday 1:00 PM - 3:00 PM",
    "L15+L16": "Tuesday 3:15 PM - 5:15 PM",
    "L17+L18": "Wednesday 8:00 AM - 10:00 AM",
    "L19+L20": "Wednesday 10:15 AM - 12:15 PM",
    "L21+L22": "Wednesday 1:00 PM - 3:00 PM",
    "L23+L24": "Wednesday 3:15 PM - 5:15 PM",
    "L25+L26": "Thursday 8:00 AM - 10:00 AM",
    "L27+L28": "Thursday 10:15 AM - 12:15 PM",
    "L29+L30": "Thursday 1:00 PM - 3:00 PM",
    "L31+L32": "Thursday 3:15 PM - 5:15 PM",
    "L33+L34": "Friday 8:00 AM - 10:00 AM",
    "L35+L36": "Friday 10:15 AM - 12:15 PM",
    "L37+L38": "Friday 1:00 PM - 3:00 PM",
    "L39+L40": "Friday 3:15 PM - 5:15 PM"
  };
  
  // Use 2025-26 timings for FALL and WINTER (same timetable)
  const dayTimeMap = (currentYear === "2025-26" && (currentSemester === "FALL" || currentSemester === "WINTER"))
    ? fall2025DayTimeMap
    : defaultDayTimeMap;
  
  displayElement.textContent = dayTimeMap[labPair] || "Unknown time slot";
}

// Load P=4 venue types
function loadP4VenueTypes() {
  if (!allocationLabVenueType1 || !allocationLabVenueType2) return;
  
  fetch(`${window.API_URL}/venues`, {
    headers: {
      Authorization: localStorage.getItem("token"),
    },
  })
    .then((response) => response.json())
    .then((venues) => {
      // Clear existing options
      allocationLabVenueType1.innerHTML = '<option value="">Select Venue Type</option>';
      allocationLabVenueType2.innerHTML = '<option value="">Select Venue Type</option>';
      
      // Extract unique venue types (infra_type) from active venues only
      const uniqueTypes = [...new Set(venues.filter(v => v.is_active === true).map(venue => venue.infra_type))]
        .filter(type => type && type.trim() !== '') // Remove null/empty values
        .sort(); // Sort alphabetically
      
      // Populate both venue type dropdowns
      uniqueTypes.forEach((venueType) => {
        const option1 = document.createElement("option");
        option1.value = venueType;
        option1.textContent = venueType;
        allocationLabVenueType1.appendChild(option1);
        
        const option2 = document.createElement("option");
        option2.value = venueType;
        option2.textContent = venueType;
        allocationLabVenueType2.appendChild(option2);
      });
    })
    .catch((error) => {
      console.error("Error loading venue types for P=4:", error);
    });
}

// Handle venue type changes for P=4
function handleLabVenueType1Change() {
  const selectedType = allocationLabVenueType1.value;
  loadVenuesForP4Lab(selectedType, allocationLabVenue1);
}

function handleLabVenueType2Change() {
  const selectedType = allocationLabVenueType2.value;
  loadVenuesForP4Lab(selectedType, allocationLabVenue2);
}

// Load venues for specific venue type and lab
function loadVenuesForP4Lab(venueType, venueDropdown) {
  if (!venueType || !venueDropdown) {
    if (venueDropdown) {
      venueDropdown.innerHTML = '<option value="">Select Venue</option>';
    }
    return;
  }
  
  fetch(`${window.API_URL}/venues`, {
    headers: {
      Authorization: localStorage.getItem("token"),
    },
  })
    .then((response) => response.json())
    .then((venues) => {
      venueDropdown.innerHTML = '<option value="">Select Venue</option>';
      
      // Filter venues by infra_type and only show active venues
      const filteredVenues = venues.filter(venue => 
        venue.infra_type === venueType && venue.is_active === true
      );
      
      filteredVenues.forEach((venue) => {
        const option = document.createElement("option");
        option.value = venue.venue;
        option.textContent = venue.venue;
        venueDropdown.appendChild(option);
      });
    })
    .catch((error) => {
      console.error("Error loading venues for P=4 lab:", error);
    });
}

// Export functions globally for navigation system
window.showCreateFacultyAllocationPage = showCreateFacultyAllocationPage;
window.showViewFacultyTimetablePage = showViewFacultyTimetablePage;
