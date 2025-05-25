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
    allocationCourseCodeInput.addEventListener("input", handleCourseCodeInput);
  }

  if (allocationEmployeeIdInput) {
    allocationEmployeeIdInput.addEventListener("input", handleEmployeeIdInput);
  }

  if (allocationSlotNameInput) {
    allocationSlotNameInput.addEventListener("change", handleSlotNameChange);
  }

  if (allocationVenueTypeInput) {
    allocationVenueTypeInput.addEventListener("change", handleVenueTypeChange);
  }

  if (allocationVenueInput) {
    allocationVenueInput.addEventListener("change", handleVenueChange);
  }

  if (allocationComponentTypeInput) {
    allocationComponentTypeInput.addEventListener(
      "change",
      handleComponentTypeChange
    );
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
      showAlert("Failed to load faculty allocations", "danger");

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
            currentUser && currentUser.role === "admin"
              ? `
            <button class="btn btn-sm btn-primary edit-allocation-btn" 
              data-allocation='${JSON.stringify(firstAllocation)}'>
              <i class="fas fa-edit"></i>
            </button>
          `
              : ""
          }
          <button class="btn btn-sm btn-danger delete-allocation-btn" 
            data-allocation='${JSON.stringify(firstAllocation)}'>
            <i class="fas fa-trash"></i>
          </button>
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
              currentUser && currentUser.role === "admin"
                ? `
              <button class="btn btn-sm btn-primary edit-allocation-btn" 
                data-allocation='${JSON.stringify(allocation)}'>
                <i class="fas fa-edit"></i>
              </button>
            `
                : ""
            }
            <button class="btn btn-sm btn-danger delete-allocation-btn" 
              data-allocation='${JSON.stringify(allocation)}'>
              <i class="fas fa-trash"></i>
            </button>
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

      // Populate create form dropdown
      if (allocationYearInput) {
        allocationYearInput.innerHTML = '<option value="">Select Year</option>';
        Array.from(years)
          .sort()
          .forEach((year) => {
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
        Array.from(years)
          .sort()
          .forEach((year) => {
            const option = document.createElement("option");
            option.value = year;
            option.textContent = year;
            viewFacultyYearSelect.appendChild(option);
          });
      }

      if (viewClassYearSelect) {
        viewClassYearSelect.innerHTML = '<option value="">Select Year</option>';
        Array.from(years)
          .sort()
          .forEach((year) => {
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
      venues.forEach((venue) => venueTypes.add(venue.infra_type));

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

        // Update available slots by filtering already allocated slots
        updateFacultyAvailableSlots();

        // Check for slot conflicts
        checkAndDisableConflictingSlots();
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

// Update available slots based on course TPC
function updateAvailableSlots(course) {
  if (!allocationSlotNameInput) return;

  const year = allocationYearInput.value;
  const semesterType = allocationSemesterInput.value;
  const componentType = allocationComponentTypeInput
    ? allocationComponentTypeInput.value
    : "";

  if (!year || !semesterType) return;

  // Save current selection before clearing dropdown
  const previouslySelectedSlot = allocationSlotNameInput.value;

  // Include the component type in the API call
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

      // Add the slots returned from the API
      if (data.availableSlots && data.availableSlots.length > 0) {
        // Sort slots: regular lab slots first, then compound 4-hour lab slots
        const regularSlots = data.availableSlots.filter(
          (slot) => !slot.includes(",")
        );
        const compoundSlots = data.availableSlots.filter((slot) =>
          slot.includes(",")
        );

        const sortedSlots = [...regularSlots.sort(), ...compoundSlots.sort()];

        sortedSlots.forEach((slotName) => {
          const option = document.createElement("option");
          option.value = slotName;

          // Enhanced display for different slot types
          if (slotName.includes(",") && slotName.startsWith("L")) {
            // 4-hour compound lab slot
            const linkedSlots =
              data.slotLinks && data.slotLinks[slotName]
                ? data.slotLinks[slotName]
                : [];

            if (linkedSlots.length > 0) {
              option.textContent = `🕐 4-Hour Lab: ${slotName} ↔ ${linkedSlots.join(
                ", "
              )}`;
              option.style.fontWeight = "bold";
              option.style.color = "#d63384"; // Bootstrap pink for 4-hour labs
            } else {
              option.textContent = `🕐 4-Hour Lab: ${slotName}`;
              option.style.fontWeight = "bold";
            }
          } else if (data.slotLinks && data.slotLinks[slotName]) {
            // Regular slot with linking
            option.textContent = `${slotName} (linked with ${data.slotLinks[
              slotName
            ].join(", ")})`;
          } else {
            // Regular slot without linking
            option.textContent = slotName;
          }

          allocationSlotNameInput.appendChild(option);
        });

        // Add separator if both types exist
        if (regularSlots.length > 0 && compoundSlots.length > 0) {
          // Find the first compound slot option and add a visual separator before it
          const firstCompoundIndex = regularSlots.length + 1; // +1 for the "Select Slot" option
          if (allocationSlotNameInput.options[firstCompoundIndex]) {
            allocationSlotNameInput.options[
              firstCompoundIndex
            ].style.borderTop = "2px solid #dee2e6";
            allocationSlotNameInput.options[
              firstCompoundIndex
            ].style.marginTop = "4px";
          }
        }

        // Restore previous selection if it exists in the new options
        if (
          previouslySelectedSlot &&
          data.availableSlots.includes(previouslySelectedSlot)
        ) {
          allocationSlotNameInput.value = previouslySelectedSlot;

          // Trigger the change event to update slot day display
          const changeEvent = new Event("change");
          allocationSlotNameInput.dispatchEvent(changeEvent);
        }
      } else {
        console.warn("No available slots returned from API");
        // Add a message to the dropdown
        const option = document.createElement("option");
        option.value = "";
        option.textContent = "No slots available";
        option.disabled = true;
        allocationSlotNameInput.appendChild(option);
      }

      // Update faculty available slots
      updateFacultyAvailableSlots();
    })
    .catch((error) => {
      console.error("Error fetching available slots:", error);
      showAlert("Error fetching available slots. Please try again.", "danger");
    });
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
      const filteredVenues = venues.filter((v) => v.infra_type === venueType);

      allocationVenueInput.innerHTML = '<option value="">Select Venue</option>';
      filteredVenues.forEach((venue) => {
        const option = document.createElement("option");
        option.value = venue.venue;
        option.textContent = venue.venue;
        allocationVenueInput.appendChild(option);
      });
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
  // Re-update available slots when component type changes
  if (courseData.course_code) {
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

  // Update modal title
  if (facultyAllocationModalLabel) {
    facultyAllocationModalLabel.textContent = "Create Faculty Slot Allocation";
  }

  // Show modal
  if (facultyAllocationModal) facultyAllocationModal.show();
}

// Handle save faculty allocation
function handleSaveFacultyAllocation() {
  console.log("Save button clicked");

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
    semester_type: allocationSemesterInput.value,
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
    showAlert("Please fill all required fields", "danger");
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
    .then((slots) => {
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

      // Create promises array for all allocations
      const promises = [];

      // For each individual slot that needs to be allocated
      for (const individualSlot of allIndividualSlots) {
        // Find the slot details for this individual slot
        const matchingSlots = slots.filter(
          (s) => s.slot_name === individualSlot
        );

        console.log(`Matching slots for ${individualSlot}:`, matchingSlots);

        if (matchingSlots.length === 0) {
          showAlert(`No slots found for ${individualSlot}`, "danger");
          return;
        }

        // For compound primary slots, we need to create just one allocation with the compound name
        // For individual slots, create allocation with individual slot name
        matchingSlots.forEach((slot) => {
          let slotNameToUse;

          if (is4HourLab && individualSlot === allIndividualSlots[0]) {
            // For the first slot of a 4-hour lab, use the compound name
            slotNameToUse = primarySlot;
          } else if (is4HourLab) {
            // For subsequent slots of a 4-hour lab, skip individual allocations
            // The backend will handle creating all related allocations
            return;
          } else {
            // For regular slots, use the individual slot name
            slotNameToUse = slot.slot_name;
          }

          // Create allocation with the appropriate slot name
          const completeAllocation = {
            ...allocationData,
            slot_day: slot.slot_day,
            slot_time: slot.slot_time,
            slot_name: slotNameToUse,
          };

          console.log(
            `Saving allocation for ${slotNameToUse}:`,
            completeAllocation
          );

          promises.push(
            fetch(`${window.API_URL}/faculty-allocations`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: localStorage.getItem("token"),
              },
              body: JSON.stringify(completeAllocation),
            })
          );
        });
      }

      // Execute all allocation promises
      if (promises.length === 0) {
        showAlert("No valid slots found for allocation", "danger");
        return;
      }

      Promise.all(promises)
        .then((responses) => {
          console.log("Save responses:", responses);

          const failedResponses = responses.filter((r) => !r.ok);
          if (failedResponses.length > 0) {
            return failedResponses[0].json().then((data) => {
              throw new Error(data.message);
            });
          }
          return Promise.all(responses.map((r) => r.json()));
        })
        .then((results) => {
          console.log("Save results:", results);

          // Provide appropriate success message based on allocation type
          if (is4HourLab) {
            const morningSlots = primarySlot.split(", ");
            const linkedAfternoonSlots =
              window.slotLinks && window.slotLinks[primarySlot]
                ? window.slotLinks[primarySlot]
                : [];

            showAlert(
              `✅ 4-Hour Lab allocation created successfully!\n\n` +
                `🌅 Morning slots: ${morningSlots.join(", ")}\n` +
                `🌆 Afternoon slots: ${linkedAfternoonSlots.join(", ")}\n\n` +
                `All related slots have been automatically allocated.`,
              "success"
            );
          } else if (isSummerLabSlot) {
            showAlert(
              "Faculty allocation saved successfully! The linked lab slot has also been automatically allocated.",
              "success"
            );
          } else {
            showAlert("Faculty allocation saved successfully", "success");
          }

          if (facultyAllocationModal) facultyAllocationModal.hide();
          loadFacultyAllocations();

          // Check if TEL course needs other component
          if (courseData && courseData.course_type === "TEL") {
            checkTELCourseCompletion(allocationData);
          }
        })
        .catch((error) => {
          console.error("Save faculty allocation error:", error);

          // Check if the error message contains specific conflict types
          if (error.message && error.message.includes("Slot conflict")) {
            showAlert(
              "Cannot allocate this slot because it conflicts with another slot already allocated to this faculty",
              "danger"
            );
          } else if (
            error.message &&
            error.message.includes("Linked slot clash")
          ) {
            showAlert(
              "Cannot allocate this lab slot because its linked slot is already allocated to another faculty",
              "danger"
            );
          } else if (
            error.message &&
            error.message.includes("Faculty clash in linked slot")
          ) {
            showAlert(
              "Cannot allocate this lab slot because you already have a different course allocated to the faculty in the linked slot time",
              "danger"
            );
          } else if (
            error.message &&
            error.message.includes("4-hour lab slot clash")
          ) {
            showAlert(
              "Cannot allocate this 4-hour lab because one or more of the required slots is already booked by another faculty",
              "danger"
            );
          } else if (
            error.message &&
            error.message.includes("Faculty clash in 4-hour lab")
          ) {
            showAlert(
              "Cannot allocate this 4-hour lab because you already have different courses allocated during some of the required slot times",
              "danger"
            );
          } else {
            showAlert(
              error.message || "Failed to save faculty allocation",
              "danger"
            );
          }
        });
    })
    .catch((error) => {
      console.error("Error fetching slot details:", error);
      showAlert("Failed to fetch slot details", "danger");
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
          showAlert(
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
  allocationSlotNameInput.value = allocation.slot_name;
  allocationVenueInput.value = allocation.venue;

  // Update modal title
  if (facultyAllocationModalLabel) {
    facultyAllocationModalLabel.textContent = "Edit Faculty Slot Allocation";
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
      showAlert("Faculty allocation deleted successfully", "success");
      loadFacultyAllocations();
    })
    .catch((error) => {
      console.error("Delete faculty allocation error:", error);
      showAlert(
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
    showAlert("Please select year, semester, and faculty", "warning");
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
      generateFacultyTimetable(data.faculty, data.allocations, year, semester);
    })
    .catch((error) => {
      console.error("Error fetching faculty timetable:", error);
      showAlert("Failed to load faculty timetable", "danger");
    });
}

// Handle view class timetable
function handleViewClassTimetable() {
  const year = viewClassYearSelect.value;
  const semester = viewClassSemesterSelect.value;
  const venue = viewClassVenueSelect.value;

  if (!year || !semester || !venue) {
    showAlert("Please select year, semester, and venue", "warning");
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
      showAlert("Failed to load class timetable", "danger");
    });
}

// Generate faculty timetable
function generateFacultyTimetable(faculty, allocations, year, semester) {
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
        const key = `${allocation.slot_day}-${allocation.slot_name}`;
        allocationMap[key] = allocation;
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
      const uniqueAllocations = [];
      const seen = new Set();

      allocations.forEach((allocation) => {
        const key = `${allocation.course_code}-${allocation.slot_name}-${allocation.venue}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueAllocations.push(allocation);
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
        const key = `${allocation.slot_day}-${allocation.slot_name}`;
        allocationMap[key] = allocation;
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
      const uniqueAllocations = [];
      const seen = new Set();

      allocations.forEach((allocation) => {
        const key = `${allocation.course_code}-${allocation.slot_name}-${allocation.venue}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueAllocations.push(allocation);
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
        venues.forEach((v) => {
          const option = document.createElement("option");
          option.value = v.venue;
          option.textContent = `${v.venue} (${v.infra_type})`;
          viewClassVenueSelect.appendChild(option);
        });
      }
    })
    .catch((error) => {
      console.error("Error loading venues:", error);
    });
}

// Show alert message
function showAlert(message, type = "info", timeout = 5000) {
  // Use the global showAlert function from main.js
  if (window.showAlert && showAlert !== window.showAlert) {
    window.showAlert(message, type, timeout);
  } else {
    // Fallback to console if global showAlert is not available
    console.log(`${type}: ${message}`);

    // Try to create alert manually
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
    }
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

              // Update available slots
              updateFacultyAvailableSlots();

              // Check for conflicts
              checkAndDisableConflictingSlots();

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
