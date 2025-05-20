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

  allocations.forEach((allocation, index) => {
    console.log(`Rendering allocation ${index}:`, allocation);

    const row = document.createElement("tr");
    row.innerHTML = `
        <td>${allocation.slot_year}</td>
        <td>${allocation.semester_type}</td>
        <td>${allocation.course_code}</td>
        <td>${allocation.course_name || "N/A"}</td>
        <td>${allocation.theory || "0"}-${allocation.practical || "0"}-${
      allocation.credits || "0"
    }</td>
        <td>${allocation.faculty_name || "N/A"}</td>
        <td>${allocation.slot_name}</td>
        <td>${allocation.slot_day} ${allocation.slot_time}</td>
        <td>${allocation.venue}</td>
        <td>
          <button class="btn btn-sm btn-primary edit-allocation-btn" 
            data-allocation='${JSON.stringify(allocation)}'>
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm btn-danger delete-allocation-btn" 
            data-allocation='${JSON.stringify(allocation)}'>
            <i class="fas fa-trash"></i>
          </button>
        </td>
      `;
    facultyAllocationTableBody.appendChild(row);
  });

  console.log("Finished rendering allocations");

  // Add event listeners
  document.querySelectorAll(".edit-allocation-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const allocation = JSON.parse(btn.getAttribute("data-allocation"));
      openEditAllocationModal(allocation);
    });
  });

  document.querySelectorAll(".delete-allocation-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const allocation = JSON.parse(btn.getAttribute("data-allocation"));
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
        data.availableSlots.sort().forEach((slotName) => {
          const option = document.createElement("option");
          option.value = slotName;

          // Check if this slot is part of a linked pair
          if (data.slotLinks && data.slotLinks[slotName]) {
            option.textContent = `${slotName} (linked with ${data.slotLinks[
              slotName
            ].join(", ")})`;
          } else {
            option.textContent = slotName;
          }

          allocationSlotNameInput.appendChild(option);
        });
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

        // Check if this is a lab slot (e.g., L1+L2)
        if (currentSlotName.startsWith("L") && currentSlotName.includes("+")) {
          // For lab slots, search for the exact combined name
          matchingSlots = slots.filter((s) => s.slot_name === currentSlotName);
        }
        // Check if this is a combined slot (e.g., A1+TA1)
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

        // If there are linked slots, show 'Primary:' and 'Linked:'
        if (linkedSlots.length > 1) {
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

  // Get form values
  const allocationData = {
    slot_year: allocationYearInput.value,
    semester_type: allocationSemesterInput.value,
    course_code: allocationCourseCodeInput.value,
    employee_id: parseInt(allocationEmployeeIdInput.value),
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
      const primarySlot = allocationData.slot_name;
      const linkedSlots =
        window.slotLinks && window.slotLinks[primarySlot]
          ? [primarySlot, ...window.slotLinks[primarySlot]]
          : [primarySlot];

      console.log("Primary slot:", primarySlot);
      console.log("Linked slots:", linkedSlots);

      // Create promises array for all allocations
      const promises = [];

      // For each slot in the linkedSlots array
      linkedSlots.forEach((slotName) => {
        let matchingSlots = [];

        // Check if this is a lab slot (e.g., L1+L2)
        if (slotName.startsWith("L") && slotName.includes("+")) {
          // For lab slots, search for the exact combined name
          matchingSlots = slots.filter((s) => s.slot_name === slotName);
        }
        // Check if this is a theory combined slot (e.g., A1+TA1)
        else if (slotName.includes("+")) {
          const slotParts = slotName.split("+");
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
          // Handle regular non-combined slots as before
          matchingSlots = slots.filter((s) => s.slot_name === slotName);
        }

        console.log(`Matching slots for ${slotName}:`, matchingSlots);

        if (matchingSlots.length === 0) {
          showAlert(`No slots found for ${slotName}`, "danger");
          return;
        }

        // Create allocations for all matching slots
        matchingSlots.forEach((slot) => {
          // Create a new allocation with the appropriate slot
          const completeAllocation = {
            ...allocationData,
            slot_day: slot.slot_day,
            slot_time: slot.slot_time,
            // Keep the slot_name as provided
            slot_name: slot.slot_name,
          };

          console.log(
            `Saving allocation for ${slot.slot_name}:`,
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
      });

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
          showAlert("Faculty allocation saved successfully", "success");
          if (facultyAllocationModal) facultyAllocationModal.hide();
          loadFacultyAllocations();

          // Check if TEL course needs other component
          if (courseData && courseData.course_type === "TEL") {
            checkTELCourseCompletion(allocationData);
          }
        })
        .catch((error) => {
          console.error("Save faculty allocation error:", error);

          // Check if the error message contains "Slot conflict"
          if (error.message && error.message.includes("Slot conflict")) {
            showAlert(
              "Cannot allocate this slot because it conflicts with another slot already allocated to this faculty",
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

  // Show confirmation modal
  const confirmMessage = `Are you sure you want to delete the allocation for:
    Course: ${allocation.course_code} - ${allocation.course_name}
    Faculty: ${allocation.faculty_name}
    Slot: ${allocation.slot_name} on ${allocation.slot_day} at ${allocation.slot_time}
    Venue: ${allocation.venue}`;

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

  // Create timetable structure
  const days = ["MON", "TUE", "WED", "THU", "FRI"];
  const timeSlots = [
    "9.00-9.50",
    "9.55-10.45",
    "10.50-11.40",
    "11.45-12.35",
    "1.15-2.05",
    "2.10-3.00",
    "3.05-3.55",
    "4.00-4.50",
  ];

  // Create slot map and merged slots tracker
  const slotMap = {};
  const mergedSlots = {}; // Track which slots are merged

  days.forEach((day) => {
    slotMap[day] = {};
    mergedSlots[day] = {};
  });

  // Create abbreviation map for course names
  const courseAbbreviations = {};

  allocations.forEach((allocation) => {
    console.log("Processing allocation:", allocation);

    if (!slotMap[allocation.slot_day]) {
      slotMap[allocation.slot_day] = {};
    }

    // Create abbreviation for course name
    if (!courseAbbreviations[allocation.course_code]) {
      const words = allocation.course_name.split(" ");
      const abbr = words
        .map((w) => w[0])
        .join("")
        .toUpperCase();
      courseAbbreviations[allocation.course_code] = {
        abbr: abbr,
        full: allocation.course_name,
      };
    }

    const content =
      `${allocation.slot_name}<br>` +
      `${allocation.course_code}<br>` +
      `${courseAbbreviations[allocation.course_code].abbr}<br>` +
      `${allocation.venue}`;

    // Check if it's a lab slot
    if (allocation.slot_name.startsWith("L")) {
      console.log("Lab slot:", allocation.slot_time);
      // Handle different time formats and map to our standard slots
      if (
        allocation.slot_time.includes("9.00") ||
        allocation.slot_time.includes("9:00")
      ) {
        slotMap[allocation.slot_day]["9.00-9.50"] = content;
        mergedSlots[allocation.slot_day]["9.00-9.50"] = {
          span: 2,
          type: "lab",
        };
      } else if (
        allocation.slot_time.includes("10.55") ||
        allocation.slot_time.includes("10:55") ||
        allocation.slot_time.includes("10.50")
      ) {
        slotMap[allocation.slot_day]["10.50-11.40"] = content;
        mergedSlots[allocation.slot_day]["10.50-11.40"] = {
          span: 2,
          type: "lab",
        };
      } else if (
        allocation.slot_time.includes("1.10") ||
        allocation.slot_time.includes("1:10") ||
        allocation.slot_time.includes("1.15")
      ) {
        slotMap[allocation.slot_day]["1.15-2.05"] = content;
        mergedSlots[allocation.slot_day]["1.15-2.05"] = {
          span: 2,
          type: "lab",
        };
      } else if (
        allocation.slot_time.includes("3.05") ||
        allocation.slot_time.includes("3:05")
      ) {
        slotMap[allocation.slot_day]["3.05-3.55"] = content;
        mergedSlots[allocation.slot_day]["3.05-3.55"] = {
          span: 2,
          type: "lab",
        };
      }
    } else {
      // Regular theory slots - normalize the time format
      const normalizedTime = allocation.slot_time.replace(/–/g, "-"); // Replace en-dash with hyphen
      console.log(
        "Theory slot time:",
        allocation.slot_time,
        "Normalized:",
        normalizedTime
      );

      // Try to find matching time slot
      const matchingSlot = timeSlots.find((ts) => {
        // Normalize both for comparison
        const normalizedTs = ts.replace(/–/g, "-");
        return normalizedTs === normalizedTime || ts === allocation.slot_time;
      });

      if (matchingSlot) {
        slotMap[allocation.slot_day][matchingSlot] = content;
      } else {
        console.warn("No matching time slot found for:", allocation.slot_time);
        // Try to map based on partial match
        for (let ts of timeSlots) {
          if (allocation.slot_time.includes(ts.split("-")[0])) {
            slotMap[allocation.slot_day][ts] = content;
            break;
          }
        }
      }
    }
  });

  console.log("Final slot map:", slotMap);

  // Generate HTML table
  let tableHtml = `
      <table class="table table-bordered">
        <thead>
          <tr class="table-primary">
            <th></th>
            <th colspan="4">Morning</th>
            <th rowspan="2" class="align-middle">Lunch</th>
            <th colspan="4">Afternoon</th>
          </tr>
          <tr class="table-primary">
            <th>Day</th>
            ${timeSlots
              .slice(0, 4)
              .map((ts) => `<th>${ts}</th>`)
              .join("")}
            ${timeSlots
              .slice(4, 8)
              .map((ts) => `<th>${ts}</th>`)
              .join("")}
          </tr>
        </thead>
        <tbody>
    `;

  days.forEach((day) => {
    tableHtml += `<tr><td><strong>${day}</strong></td>`;

    // Morning slots
    for (let i = 0; i < 4; i++) {
      const currentSlot = timeSlots[i];
      const content = slotMap[day][currentSlot] || "";
      const isAllocated = content !== "";
      const mergeInfo = mergedSlots[day][currentSlot];

      if (mergeInfo && mergeInfo.span === 2) {
        // This is a merged cell (lab)
        tableHtml += `<td colspan="2" class="${
          isAllocated ? "table-warning" : ""
        }">${content}</td>`;
        i++; // Skip the next slot
      } else if (
        i > 0 &&
        mergedSlots[day][timeSlots[i - 1]] &&
        mergedSlots[day][timeSlots[i - 1]].span === 2
      ) {
        // This slot is merged with the previous one, skip it
        continue;
      } else {
        // Regular slot
        tableHtml += `<td class="${
          isAllocated ? "table-success" : ""
        }">${content}</td>`;
      }
    }

    // Lunch
    tableHtml += `<td class="table-secondary">LUNCH</td>`;

    // Afternoon slots
    for (let i = 4; i < 8; i++) {
      const currentSlot = timeSlots[i];
      const content = slotMap[day][currentSlot] || "";
      const isAllocated = content !== "";
      const mergeInfo = mergedSlots[day][currentSlot];

      if (mergeInfo && mergeInfo.span === 2) {
        // This is a merged cell (lab)
        tableHtml += `<td colspan="2" class="${
          isAllocated ? "table-warning" : ""
        }">${content}</td>`;
        i++; // Skip the next slot
      } else if (
        i > 4 &&
        mergedSlots[day][timeSlots[i - 1]] &&
        mergedSlots[day][timeSlots[i - 1]].span === 2
      ) {
        // This slot is merged with the previous one, skip it
        continue;
      } else {
        // Regular slot
        tableHtml += `<td class="${
          isAllocated ? "table-success" : ""
        }">${content}</td>`;
      }
    }

    tableHtml += "</tr>";
  });

  tableHtml += "</tbody></table>";

  // Add abbreviations note
  let abbreviationsNote = "<p><strong>Course Abbreviations:</strong><br>";
  Object.entries(courseAbbreviations).forEach(([code, data]) => {
    abbreviationsNote += `${data.abbr} - ${data.full}<br>`;
  });
  abbreviationsNote += "</p>";

  // Update the container
  const facultyTimetableDiv = document.getElementById("faculty-timetable-div");
  if (facultyTimetableDiv) {
    facultyTimetableDiv.innerHTML = tableHtml + abbreviationsNote;
  }
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

  // Create timetable structure
  const days = ["MON", "TUE", "WED", "THU", "FRI"];
  const timeSlots = [
    "9.00-9.50",
    "9.55-10.45",
    "10.50-11.40",
    "11.45-12.35",
    "1.15-2.05",
    "2.10-3.00",
    "3.05-3.55",
    "4.00-4.50",
  ];

  // Create slot map and merged slots tracker
  const slotMap = {};
  const mergedSlots = {}; // Track which slots are merged

  days.forEach((day) => {
    slotMap[day] = {};
    mergedSlots[day] = {};
  });

  // Create abbreviation maps
  const courseAbbreviations = {};
  const facultyAbbreviations = {};

  allocations.forEach((allocation) => {
    console.log("Processing allocation:", allocation);

    if (!slotMap[allocation.slot_day]) {
      slotMap[allocation.slot_day] = {};
    }

    // Create abbreviations
    if (!courseAbbreviations[allocation.course_code]) {
      const words = allocation.course_name.split(" ");
      const abbr = words
        .map((w) => w[0])
        .join("")
        .toUpperCase();
      courseAbbreviations[allocation.course_code] = {
        abbr: abbr,
        full: allocation.course_name,
      };
    }

    if (!facultyAbbreviations[allocation.employee_id]) {
      const nameParts = allocation.faculty_name.split(" ");
      const abbr = nameParts
        .map((p) => p[0])
        .join("")
        .toUpperCase();
      facultyAbbreviations[allocation.employee_id] = {
        abbr: abbr,
        full: allocation.faculty_name,
      };
    }

    const content =
      `${allocation.slot_name}<br>` +
      `${allocation.course_code}<br>` +
      `${courseAbbreviations[allocation.course_code].abbr}<br>` +
      `${facultyAbbreviations[allocation.employee_id].abbr}`;

    // Check if it's a lab slot
    if (allocation.slot_name.startsWith("L")) {
      console.log("Lab slot:", allocation.slot_time);
      // Handle different time formats and map to our standard slots
      if (
        allocation.slot_time.includes("9.00") ||
        allocation.slot_time.includes("9:00")
      ) {
        slotMap[allocation.slot_day]["9.00-9.50"] = content;
        mergedSlots[allocation.slot_day]["9.00-9.50"] = {
          span: 2,
          type: "lab",
        };
      } else if (
        allocation.slot_time.includes("10.55") ||
        allocation.slot_time.includes("10:55") ||
        allocation.slot_time.includes("10.50")
      ) {
        slotMap[allocation.slot_day]["10.50-11.40"] = content;
        mergedSlots[allocation.slot_day]["10.50-11.40"] = {
          span: 2,
          type: "lab",
        };
      } else if (
        allocation.slot_time.includes("1.10") ||
        allocation.slot_time.includes("1:10") ||
        allocation.slot_time.includes("1.15")
      ) {
        slotMap[allocation.slot_day]["1.15-2.05"] = content;
        mergedSlots[allocation.slot_day]["1.15-2.05"] = {
          span: 2,
          type: "lab",
        };
      } else if (
        allocation.slot_time.includes("3.05") ||
        allocation.slot_time.includes("3:05")
      ) {
        slotMap[allocation.slot_day]["3.05-3.55"] = content;
        mergedSlots[allocation.slot_day]["3.05-3.55"] = {
          span: 2,
          type: "lab",
        };
      }
    } else {
      // Regular theory slots - normalize the time format
      const normalizedTime = allocation.slot_time.replace(/–/g, "-"); // Replace en-dash with hyphen
      console.log(
        "Theory slot time:",
        allocation.slot_time,
        "Normalized:",
        normalizedTime
      );

      // Try to find matching time slot
      const matchingSlot = timeSlots.find((ts) => {
        // Normalize both for comparison
        const normalizedTs = ts.replace(/–/g, "-");
        return normalizedTs === normalizedTime || ts === allocation.slot_time;
      });

      if (matchingSlot) {
        slotMap[allocation.slot_day][matchingSlot] = content;
      } else {
        console.warn("No matching time slot found for:", allocation.slot_time);
        // Try to map based on partial match
        for (let ts of timeSlots) {
          if (allocation.slot_time.includes(ts.split("-")[0])) {
            slotMap[allocation.slot_day][ts] = content;
            break;
          }
        }
      }
    }
  });

  console.log("Final slot map:", slotMap);

  // Generate HTML table
  let tableHtml = `
      <table class="table table-bordered">
        <thead>
          <tr class="table-primary">
            <th></th>
            <th colspan="4">Morning</th>
            <th rowspan="2" class="align-middle">Lunch</th>
            <th colspan="4">Afternoon</th>
          </tr>
          <tr class="table-primary">
            <th>Day</th>
            ${timeSlots
              .slice(0, 4)
              .map((ts) => `<th>${ts}</th>`)
              .join("")}
            ${timeSlots
              .slice(4, 8)
              .map((ts) => `<th>${ts}</th>`)
              .join("")}
          </tr>
        </thead>
        <tbody>
    `;

  days.forEach((day) => {
    tableHtml += `<tr><td><strong>${day}</strong></td>`;

    // Morning slots
    for (let i = 0; i < 4; i++) {
      const currentSlot = timeSlots[i];
      const content = slotMap[day][currentSlot] || "";
      const mergeInfo = mergedSlots[day][currentSlot];

      if (mergeInfo && mergeInfo.span === 2) {
        // This is a merged cell (lab)
        tableHtml += `<td colspan="2" class="table-warning">${content}</td>`;
        i++; // Skip the next slot
      } else if (
        i > 0 &&
        mergedSlots[day][timeSlots[i - 1]] &&
        mergedSlots[day][timeSlots[i - 1]].span === 2
      ) {
        // This slot is merged with the previous one, skip it
        continue;
      } else {
        // Regular slot
        tableHtml += `<td>${content}</td>`;
      }
    }

    // Lunch
    tableHtml += `<td class="table-secondary">LUNCH</td>`;

    // Afternoon slots
    for (let i = 4; i < 8; i++) {
      const currentSlot = timeSlots[i];
      const content = slotMap[day][currentSlot] || "";
      const mergeInfo = mergedSlots[day][currentSlot];

      if (mergeInfo && mergeInfo.span === 2) {
        // This is a merged cell (lab)
        tableHtml += `<td colspan="2" class="table-warning">${content}</td>`;
        i++; // Skip the next slot
      } else if (
        i > 4 &&
        mergedSlots[day][timeSlots[i - 1]] &&
        mergedSlots[day][timeSlots[i - 1]].span === 2
      ) {
        // This slot is merged with the previous one, skip it
        continue;
      } else {
        // Regular slot
        tableHtml += `<td>${content}</td>`;
      }
    }

    tableHtml += "</tr>";
  });

  tableHtml += "</tbody></table>";

  // Add abbreviations note
  let abbreviationsNote = "<p><strong>Abbreviations:</strong><br>";
  abbreviationsNote += "<strong>Courses:</strong><br>";
  Object.entries(courseAbbreviations).forEach(([code, data]) => {
    abbreviationsNote += `${data.abbr} - ${data.full}<br>`;
  });
  abbreviationsNote += "<br><strong>Faculty:</strong><br>";
  Object.entries(facultyAbbreviations).forEach(([id, data]) => {
    abbreviationsNote += `${data.abbr} - ${data.full}<br>`;
  });
  abbreviationsNote += "</p>";

  // Update the container
  const classTimetableDiv = document.getElementById("class-timetable-div");
  if (classTimetableDiv) {
    classTimetableDiv.innerHTML = tableHtml + abbreviationsNote;
  }
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
