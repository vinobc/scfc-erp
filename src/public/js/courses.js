// DOM elements will be initialized in the DOMContentLoaded event
let coursesTableBody;
let addCourseBtn;
let saveCourseBtn;
let courseSearchInput;
let courseStatusFilter;
let courseTypeFilter;
let importCoursesBtn;
let fileInput;

// Schools data for course owner multi-select
let schoolsData = [];
let selectedSchoolCodes = new Set();

// Course owner dropdown elements
let courseOwnerDropdownBtn;
let courseOwnerDisplay;
let courseOwnerCheckboxes;

// Course form elements
let courseForm;
let courseOwnerInput;
let courseCodeInput;
let courseNameInput;
let theoryInput;
let practicalInput;
let creditsInput;
let courseTypeInput;
let prerequisiteInput;
let antirequisiteInput;
let courseEquivalenceInput;
let programsOfferedToInput;
let curriculumVersionInput;
let remarksInput;
let courseIsActiveInput;

// Modal elements
let courseModal;
let courseModalLabel;
let courseDeleteModal;
let confirmCourseDeleteBtn;
let courseDeleteCode;
let courseDeleteName;
let importModal;

// Initialize courses functionality
document.addEventListener("DOMContentLoaded", () => {
  console.log("courses.js: DOM loaded");

  // Initialize DOM elements
  coursesTableBody = document.getElementById("courses-table");
  addCourseBtn = document.getElementById("add-course-btn");
  saveCourseBtn = document.getElementById("save-course-btn");
  courseSearchInput = document.getElementById("course-search-input");
  courseStatusFilter = document.getElementById("course-status-filter");
  courseTypeFilter = document.getElementById("course-type-filter");
  importCoursesBtn = document.getElementById("import-courses-btn");
  fileInput = document.getElementById("file-input");

  // Initialize form elements
  courseForm = document.getElementById("course-form");
  courseOwnerInput = document.getElementById("course-owner-field");
  courseOwnerDropdownBtn = document.getElementById("course-owner-dropdown-btn");
  courseOwnerDisplay = document.getElementById("course-owner-display");
  courseOwnerCheckboxes = document.getElementById("course-owner-checkboxes");
  courseCodeInput = document.getElementById("course-code-field");
  courseNameInput = document.getElementById("course-name-field");
  theoryInput = document.getElementById("theory-field");
  practicalInput = document.getElementById("practical-field");
  creditsInput = document.getElementById("credits-field");
  courseTypeInput = document.getElementById("course-type-field");
  prerequisiteInput = document.getElementById("prerequisite-field");
  antirequisiteInput = document.getElementById("antirequisite-field");
  courseEquivalenceInput = document.getElementById("course-equivalence-field");
  programsOfferedToInput = document.getElementById("programs-offered-to-field");
  curriculumVersionInput = document.getElementById("curriculum-version-field");
  remarksInput = document.getElementById("remarks-field");
  courseIsActiveInput = document.getElementById("course-is-active-field");

  // Initialize modal elements
  courseModalLabel = document.getElementById("courseModalLabel");
  courseDeleteCode = document.getElementById("course-delete-code");
  courseDeleteName = document.getElementById("course-delete-name");
  confirmCourseDeleteBtn = document.getElementById("confirm-course-delete-btn");

  // Initialize Bootstrap modal objects
  const courseModalElement = document.getElementById("courseModal");
  const courseDeleteModalElement = document.getElementById("courseDeleteModal");
  const importModalElement = document.getElementById("importModal");

  if (courseModalElement) {
    courseModal = new bootstrap.Modal(courseModalElement);
  }

  if (courseDeleteModalElement) {
    courseDeleteModal = new bootstrap.Modal(courseDeleteModalElement);
  }

  if (importModalElement) {
    importModal = new bootstrap.Modal(importModalElement);
  }

  // Setup event listeners
  if (addCourseBtn) {
    console.log("courses.js: Add course button found");
    addCourseBtn.addEventListener("click", handleAddCourse);
  }

  if (saveCourseBtn) {
    saveCourseBtn.addEventListener("click", handleSaveCourse);
  }

  if (confirmCourseDeleteBtn) {
    confirmCourseDeleteBtn.addEventListener("click", handleCourseDeleteConfirm);
  }

  if (courseSearchInput) {
    courseSearchInput.addEventListener("input", filterCourses);
  }

  if (courseStatusFilter) {
    courseStatusFilter.addEventListener("change", filterCourses);
  }

  if (courseTypeFilter) {
    courseTypeFilter.addEventListener("change", filterCourses);
  }

  if (importCoursesBtn) {
    importCoursesBtn.addEventListener("click", function () {
      if (importModal) {
        importModal.show();
      }
    });
  }

  if (fileInput) {
    fileInput.addEventListener("change", function () {
      const fileInfo = document.getElementById("file-info");
      if (fileInfo && this.files.length > 0) {
        fileInfo.textContent = `Selected file: ${this.files[0].name}`;
        document.getElementById("upload-btn").disabled = false;
      }
    });
  }

  // Add event listener for upload button
  const uploadBtn = document.getElementById("upload-btn");
  if (uploadBtn) {
    uploadBtn.addEventListener("click", handleImportCourses);
  }

  // Initial load of courses when the page loads
  const coursesLink = document.getElementById("courses-link");
  if (coursesLink) {
    coursesLink.addEventListener("click", () => {
      loadCourses();
    });
  }

  // Load schools for course owner dropdown
  loadSchoolsForCourseOwner();
});

// Load schools and populate course owner dropdown
function loadSchoolsForCourseOwner() {
  fetch(`${window.API_URL}/schools`, {
    headers: {
      Authorization: localStorage.getItem("token"),
    },
  })
    .then((response) => {
      if (!response.ok) throw new Error("Failed to load schools");
      return response.json();
    })
    .then((schools) => {
      schoolsData = schools;

      // Populate checkboxes
      if (courseOwnerCheckboxes) {
        let html = "";
        schools.forEach((school) => {
          if (school.is_active) {
            html += `
              <li class="px-3 py-2">
                <div class="form-check">
                  <input
                    class="form-check-input course-owner-checkbox"
                    type="checkbox"
                    value="${school.school_code}"
                    id="owner-${school.school_code}"
                  />
                  <label class="form-check-label" for="owner-${school.school_code}">
                    ${school.school_short_name}
                  </label>
                </div>
              </li>
            `;
          }
        });
        courseOwnerCheckboxes.innerHTML = html;

        // Add event listeners
        const checkboxes = document.querySelectorAll(".course-owner-checkbox");
        checkboxes.forEach((checkbox) => {
          checkbox.addEventListener("change", handleOwnerCheckboxChange);
        });
      }
    })
    .catch((error) => {
      console.error("Load schools error:", error);
    });
}

// Handle checkbox selection
function handleOwnerCheckboxChange(event) {
  const schoolCode = event.target.value;
  if (event.target.checked) {
    selectedSchoolCodes.add(schoolCode);
  } else {
    selectedSchoolCodes.delete(schoolCode);
  }
  updateCourseOwnerDisplay();
}

// Update display and hidden input
function updateCourseOwnerDisplay() {
  const schoolMap = {};
  schoolsData.forEach((s) => {
    schoolMap[s.school_code] = s.school_short_name;
  });

  const selectedNames = Array.from(selectedSchoolCodes)
    .map((code) => schoolMap[code] || code)
    .join(", ");

  if (courseOwnerDisplay) {
    courseOwnerDisplay.textContent = selectedNames || "Select schools...";
  }

  if (courseOwnerInput) {
    courseOwnerInput.value = Array.from(selectedSchoolCodes).join(",");
  }
}

// Reset selection
function resetCourseOwnerSelection() {
  selectedSchoolCodes.clear();
  const checkboxes = document.querySelectorAll(".course-owner-checkbox");
  checkboxes.forEach((cb) => (cb.checked = false));
  updateCourseOwnerDisplay();
}

// Set selection from value (handles legacy data)
function setCourseOwnerSelection(value) {
  resetCourseOwnerSelection();
  if (!value) return;

  // Create reverse map: short_name -> code
  const reverseMap = {};
  schoolsData.forEach((s) => {
    reverseMap[s.school_short_name] = s.school_code;
  });

  // Split by comma or ampersand
  const parts = value.split(/[,&]/).map((s) => s.trim());

  parts.forEach((part) => {
    let code = part;
    // If it's a short name (not code), convert to code
    if (!part.startsWith("SCL") && reverseMap[part]) {
      code = reverseMap[part];
    }

    if (code) {
      selectedSchoolCodes.add(code);
      const checkbox = document.getElementById(`owner-${code}`);
      if (checkbox) checkbox.checked = true;
    }
  });

  updateCourseOwnerDisplay();
}

// Get display names from codes
function getCourseOwnerDisplayNames(value) {
  if (!value) return "-";

  const schoolMap = {};
  schoolsData.forEach((s) => {
    schoolMap[s.school_code] = s.school_short_name;
    schoolMap[s.school_short_name] = s.school_short_name; // Handle legacy
  });

  const parts = value.split(/[,&]/).map((s) => s.trim());
  return parts.map((p) => schoolMap[p] || p).join(", ");
}

// Hide admin-only elements for faculty and timetable coordinators
function hideAdminOnlyElements() {
  // Check if current user is admin
  const isAdmin = currentUser && currentUser.role === "admin";
  
  if (!isAdmin) {
    // Hide Add Course button
    if (addCourseBtn) {
      addCourseBtn.style.display = "none";
    }
    
    // Hide Import Courses button
    if (importCoursesBtn) {
      importCoursesBtn.style.display = "none";
    }
    
    // Hide Actions column header
    const coursesPage = document.getElementById("courses-page");
    if (coursesPage) {
      const actionsHeader = coursesPage.querySelector("thead th:last-child");
      if (actionsHeader && actionsHeader.textContent.trim() === "Actions") {
        actionsHeader.style.display = "none";
      }
    }
  }
}

// Load all courses from the API
function loadCourses() {
  console.log("courses.js: Loading courses");

  // Set active page
  setActivePage("courses-page");

  // Hide admin-only elements for faculty and timetable coordinators
  hideAdminOnlyElements();

  // Show loading state
  if (coursesTableBody) {
    const isAdmin = currentUser && currentUser.role === "admin";
    const colspan = isAdmin ? "7" : "6";
    coursesTableBody.innerHTML =
      `<tr><td colspan="${colspan}" class="text-center">Loading courses...</td></tr>`;
  }

  fetch(`${window.API_URL}/courses`, {
    headers: {
      Authorization: localStorage.getItem("token"),
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to load courses");
      }
      return response.json();
    })
    .then((courses) => {
      if (courses.length === 0) {
        if (coursesTableBody) {
          const isAdmin = currentUser && currentUser.role === "admin";
          const colspan = isAdmin ? "7" : "6";
          coursesTableBody.innerHTML =
            `<tr><td colspan="${colspan}" class="text-center">No courses found. Add a new course or import courses to get started.</td></tr>`;
        }
        return;
      }

      // Update the dashboard counter
      const coursesCount = document.getElementById("courses-count");
      if (coursesCount) {
        coursesCount.textContent = courses.length;
      }

      // Render courses
      renderCourses(courses);
    })
    .catch((error) => {
      console.error("Load courses error:", error);
      if (coursesTableBody) {
        const isAdmin = currentUser && currentUser.role === "admin";
        const colspan = isAdmin ? "7" : "6";
        coursesTableBody.innerHTML =
          `<tr><td colspan="${colspan}" class="text-center text-danger">Error loading courses. Please try again.</td></tr>`;
      }
      showAlert(
        "Failed to load courses. Please refresh the page or try again later.",
        "danger"
      );
    });
}

// Helper function to set the active page
function setActivePage(pageId) {
  // First, hide all content pages
  const contentPages = document.querySelectorAll(".content-page");
  contentPages.forEach((page) => {
    page.classList.remove("active");
  });

  // Then, show the selected page
  const selectedPage = document.getElementById(pageId);
  if (selectedPage) {
    selectedPage.classList.add("active");
  }

  // Update the page title
  const pageTitle = document.getElementById("page-title");
  if (pageTitle) {
    switch (pageId) {
      case "courses-page":
        pageTitle.textContent = "Course Management";
        break;
      default:
        pageTitle.textContent = "Dashboard";
    }
  }

  // Update active class in sidebar
  const navLinks = document.querySelectorAll(".nav-link");
  navLinks.forEach((link) => {
    link.classList.remove("active");
  });

  if (pageId === "courses-page") {
    const coursesLink = document.getElementById("courses-link");
    if (coursesLink) coursesLink.classList.add("active");
  }
}

// Render courses in the table
function renderCourses(courses) {
  if (!coursesTableBody) {
    console.error("Courses table body element not found");
    return;
  }

  // Apply filters if any
  const searchTerm = courseSearchInput
    ? courseSearchInput.value.toLowerCase().trim()
    : "";
  const statusFilter = courseStatusFilter ? courseStatusFilter.value : "all";
  const typeFilter = courseTypeFilter ? courseTypeFilter.value : "all";

  const filteredCourses = courses.filter((course) => {
    // Apply status filter
    if (
      statusFilter !== "all" &&
      ((statusFilter === "active" && !course.is_active) ||
        (statusFilter === "inactive" && course.is_active))
    ) {
      return false;
    }

    // Apply type filter
    if (typeFilter !== "all" && course.course_type !== typeFilter) {
      return false;
    }

    // Apply search filter
    if (searchTerm) {
      const ownerDisplay = getCourseOwnerDisplayNames(course.course_owner);
      return (
        course.course_code.toLowerCase().includes(searchTerm) ||
        course.course_name.toLowerCase().includes(searchTerm) ||
        ownerDisplay.toLowerCase().includes(searchTerm)
      );
    }

    return true;
  });

  if (filteredCourses.length === 0) {
    const isAdmin = currentUser && currentUser.role === "admin";
    const colspan = isAdmin ? "7" : "6";
    coursesTableBody.innerHTML =
      `<tr><td colspan="${colspan}" class="text-center">No courses match your filters.</td></tr>`;
    return;
  }

  // Clear previous content
  coursesTableBody.innerHTML = "";

  // Add each course to the table
  filteredCourses.forEach((course) => {
    const row = document.createElement("tr");
    const isAdmin = currentUser && currentUser.role === "admin";

    // Format the TPC (Theory, Practical, Credits)
    const tpc = `${course.theory}-${course.practical}-${course.credits}`;

    // Get course owner display names
    const ownerDisplay = getCourseOwnerDisplayNames(course.course_owner);

    // Build the row HTML based on user role
    let rowHTML = `
      <td>${course.course_code}</td>
      <td>
        <strong>${course.course_name}</strong><br>
        <small>${ownerDisplay}</small>
      </td>
      <td>${tpc}</td>
      <td>${course.course_type}</td>
      <td>
        <span title="${course.programs_offered_to}">${truncateText(
      course.programs_offered_to,
      30
    )}</span>
      </td>
      <td>
        <span class="badge ${
          course.is_active ? "bg-success" : "bg-danger"
        } status-badge">
          ${course.is_active ? "Active" : "Inactive"}
        </span>
      </td>`;

    // Only add Actions column for admin users
    if (isAdmin) {
      rowHTML += `
      <td>
        <button class="btn btn-sm btn-primary action-btn edit-course-btn" data-code="${
          course.course_code
        }">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-${
          course.is_active ? "warning" : "success"
        } action-btn toggle-status-btn" data-code="${
      course.course_code
    }" data-active="${course.is_active}">
          <i class="fas fa-${course.is_active ? "pause" : "play"}"></i>
        </button>
        <button class="btn btn-sm btn-danger action-btn delete-course-btn" data-code="${
          course.course_code
        }" data-name="${course.course_name}">
          <i class="fas fa-trash"></i>
        </button>
      </td>`;
    }

    row.innerHTML = rowHTML;

    coursesTableBody.appendChild(row);
  });

  // Add event listeners to buttons (only for admin users)
  const isAdmin = currentUser && currentUser.role === "admin";
  if (isAdmin) {
    addCourseButtonListeners();
  }
}

// Helper function to truncate text
function truncateText(text, maxLength) {
  if (!text) return "";
  return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
}

// Add event listeners to course action buttons
function addCourseButtonListeners() {
  console.log("Adding course button listeners");

  // Edit course buttons
  const editButtons = document.querySelectorAll(".edit-course-btn");
  console.log(`Found ${editButtons.length} edit buttons`);

  editButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const courseCode = button.getAttribute("data-code");
      console.log(`Edit button clicked for course code: ${courseCode}`);
      openEditCourseModal(courseCode);
    });
  });

  // Toggle status buttons
  const toggleButtons = document.querySelectorAll(".toggle-status-btn");
  console.log(`Found ${toggleButtons.length} toggle buttons`);

  toggleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const courseCode = button.getAttribute("data-code");
      const isActive = button.getAttribute("data-active") === "true";
      console.log(
        `Toggle button clicked for course code: ${courseCode}, current status: ${isActive}`
      );
      toggleCourseStatus(courseCode, !isActive);
    });
  });

  // Delete course buttons
  const deleteButtons = document.querySelectorAll(".delete-course-btn");
  console.log(`Found ${deleteButtons.length} delete buttons`);

  deleteButtons.forEach((button) => {
    const courseCode = button.getAttribute("data-code");
    const courseName = button.getAttribute("data-name");
    console.log(
      `Setting up delete button for course: ${courseCode}, ${courseName}`
    );

    button.addEventListener("click", () => {
      console.log(`Delete button clicked for course code: ${courseCode}`);
      openCourseDeleteModal(courseCode, courseName);
    });
  });
}

// Filter courses based on search, status, and type
function filterCourses() {
  // Get all courses again and apply filters on the client side
  // This avoids making new API calls for simple filtering
  fetch(`${window.API_URL}/courses`, {
    headers: {
      Authorization: localStorage.getItem("token"),
    },
  })
    .then((response) => response.json())
    .then((courses) => {
      renderCourses(courses);
    })
    .catch((error) => {
      console.error("Filter courses error:", error);
    });
}

// Handle add course button click
function handleAddCourse() {
  // Reset form
  if (courseForm) courseForm.reset();

  // Reset course owner selection
  resetCourseOwnerSelection();

  // Make course code editable for new courses
  if (courseCodeInput) {
    courseCodeInput.readOnly = false;
  }

  // Update modal title
  if (courseModalLabel) courseModalLabel.textContent = "Add New Course";

  // Show modal
  if (courseModal) courseModal.show();
}

// Open edit course modal
function openEditCourseModal(courseCode) {
  console.log(`Opening edit modal for course code: ${courseCode}`);

  // Get course details
  fetch(`${window.API_URL}/courses/${courseCode}`, {
    headers: {
      Authorization: localStorage.getItem("token"),
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to get course details");
      }
      return response.json();
    })
    .then((course) => {
      console.log(`Course data received:`, course);

      // Fill form with course data
      // Set course owner (handles both new codes and legacy data)
      setCourseOwnerSelection(course.course_owner);

      if (courseCodeInput) {
        courseCodeInput.value = course.course_code;
        // Make course code read-only for editing existing courses
        courseCodeInput.readOnly = true;
      }
      if (courseNameInput) courseNameInput.value = course.course_name;
      if (theoryInput) theoryInput.value = course.theory;
      if (practicalInput) practicalInput.value = course.practical;
      if (creditsInput) creditsInput.value = course.credits;
      if (courseTypeInput) courseTypeInput.value = course.course_type;
      if (prerequisiteInput)
        prerequisiteInput.value = course.prerequisite || "";
      if (antirequisiteInput)
        antirequisiteInput.value = course.antirequisite || "";
      if (courseEquivalenceInput)
        courseEquivalenceInput.value = course.course_equivalence || "";
      if (programsOfferedToInput)
        programsOfferedToInput.value = course.programs_offered_to;
      if (curriculumVersionInput)
        curriculumVersionInput.value = course.curriculum_version || "";
      if (remarksInput) remarksInput.value = course.remarks || "";
      if (courseIsActiveInput) courseIsActiveInput.checked = course.is_active;

      // Update modal title
      if (courseModalLabel) courseModalLabel.textContent = "Edit Course";

      // Show modal
      if (courseModal) courseModal.show();
    })
    .catch((error) => {
      console.error("Get course details error:", error);
      showAlert("Failed to load course details. Please try again.", "danger");
    });
}

// Open course delete modal
function openCourseDeleteModal(courseCode, courseName) {
  console.log(`Opening delete modal for course: ${courseCode}, ${courseName}`);

  // Set the values
  if (courseDeleteCode) courseDeleteCode.textContent = courseCode;
  if (courseDeleteName) courseDeleteName.textContent = courseName;

  // Set the course code on the delete button
  if (confirmCourseDeleteBtn) {
    confirmCourseDeleteBtn.setAttribute("data-code", courseCode);
  }

  // Show the modal
  if (courseDeleteModal) {
    courseDeleteModal.show();
  } else {
    console.error("Course delete modal not initialized");
    // Try to create it if it doesn't exist
    const modalElement = document.getElementById("courseDeleteModal");
    if (modalElement) {
      console.log("Found modal element, creating Bootstrap modal");
      courseDeleteModal = new bootstrap.Modal(modalElement);
      courseDeleteModal.show();
    } else {
      console.error("Modal element not found in DOM");
    }
  }
}

// Handle save course button click
function handleSaveCourse() {
  // Get form values
  const courseOwner = courseOwnerInput ? courseOwnerInput.value.trim() : "";
  const courseCode = courseCodeInput ? courseCodeInput.value.trim() : "";
  const courseName = courseNameInput ? courseNameInput.value.trim() : "";
  const theory = theoryInput ? parseInt(theoryInput.value) : 0;
  const practical = practicalInput ? parseInt(practicalInput.value) : 0;
  const credits = creditsInput ? parseInt(creditsInput.value) : 0;
  const courseType = courseTypeInput ? courseTypeInput.value : "";
  const prerequisite = prerequisiteInput ? prerequisiteInput.value.trim() : "";
  const antirequisite = antirequisiteInput
    ? antirequisiteInput.value.trim()
    : "";
  const courseEquivalence = courseEquivalenceInput
    ? courseEquivalenceInput.value.trim()
    : "";
  const programsOfferedTo = programsOfferedToInput
    ? programsOfferedToInput.value.trim()
    : "";
  const curriculumVersion =
    curriculumVersionInput && curriculumVersionInput.value
      ? parseFloat(curriculumVersionInput.value)
      : null;
  const remarks = remarksInput ? remarksInput.value.trim() : "";
  const isActive = courseIsActiveInput ? courseIsActiveInput.checked : true;

  // Validate required fields
  if (
    !courseOwner ||
    !courseCode ||
    !courseName ||
    theory < 0 ||
    practical < 0 ||
    credits < 0 ||
    !courseType ||
    !programsOfferedTo
  ) {
    showAlert("Please fill all required fields correctly.", "danger");
    return;
  }

  // Prepare data
  const courseData = {
    course_owner: courseOwner,
    course_code: courseCode,
    course_name: courseName,
    theory: theory,
    practical: practical,
    credits: credits,
    course_type: courseType,
    prerequisite: prerequisite || null,
    antirequisite: antirequisite || null,
    course_equivalence: courseEquivalence || null,
    programs_offered_to: programsOfferedTo,
    curriculum_version: curriculumVersion,
    remarks: remarks || null,
    is_active: isActive,
  };

  // Show loading state
  if (saveCourseBtn) {
    saveCourseBtn.disabled = true;
    saveCourseBtn.innerHTML =
      '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
  }

  // Determine if creating or updating based on whether the course code is read-only
  const isEditing = courseCodeInput && courseCodeInput.readOnly;
  const method = isEditing ? "PUT" : "POST";
  const url = isEditing
    ? `${window.API_URL}/courses/${courseCode}`
    : `${window.API_URL}/courses`;

  fetch(url, {
    method: method,
    headers: {
      "Content-Type": "application/json",
      Authorization: localStorage.getItem("token"),
    },
    body: JSON.stringify(courseData),
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((data) => {
          throw new Error(data.message || "Failed to save course");
        });
      }
      return response.json();
    })
    .then((data) => {
      // Hide modal
      if (courseModal) courseModal.hide();

      // Show success message
      showAlert(data.message, "success");

      // Reload courses
      loadCourses();
    })
    .catch((error) => {
      console.error("Save course error:", error);
      showAlert(error.message, "danger");
    })
    .finally(() => {
      // Reset button state
      if (saveCourseBtn) {
        saveCourseBtn.disabled = false;
        saveCourseBtn.innerHTML = "Save";
      }
    });
}

// Toggle course status
function toggleCourseStatus(courseCode, newStatus) {
  fetch(`${window.API_URL}/courses/${courseCode}/status`, {
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
          throw new Error(data.message || "Failed to update course status");
        });
      }
      return response.json();
    })
    .then((data) => {
      // Show success message
      showAlert(data.message, "success");

      // Reload courses
      loadCourses();
    })
    .catch((error) => {
      console.error("Toggle status error:", error);
      showAlert(error.message, "danger");
    });
}

// Handle confirm delete button click
function handleCourseDeleteConfirm() {
  if (!confirmCourseDeleteBtn) {
    console.error("Confirm course delete button not found");
    return;
  }

  const courseCode = confirmCourseDeleteBtn.getAttribute("data-code");
  console.log(`Confirming delete for course code: ${courseCode}`);

  // Show loading state
  confirmCourseDeleteBtn.disabled = true;
  confirmCourseDeleteBtn.innerHTML =
    '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Deleting...';

  console.log(`Delete URL: ${window.API_URL}/courses/${courseCode}`);
  fetch(`${window.API_URL}/courses/${courseCode}`, {
    method: "DELETE",
    headers: {
      Authorization: localStorage.getItem("token"),
    },
  })
    .then((response) => {
      console.log(`Delete course response status: ${response.status}`);
      if (!response.ok) {
        return response.json().then((data) => {
          console.log(`Delete error response:`, data);
          throw new Error(data.message || "Failed to delete course");
        });
      }
      return response.json();
    })
    .then((data) => {
      console.log(`Delete success response:`, data);
      // Hide modal
      if (courseDeleteModal) courseDeleteModal.hide();

      // Show success message
      showAlert(data.message, "success");

      // Reload courses
      loadCourses();
    })
    .catch((error) => {
      console.error("Delete course error:", error);
      showAlert(error.message, "danger");

      // Hide modal
      if (courseDeleteModal) courseDeleteModal.hide();
    })
    .finally(() => {
      // Reset button state
      if (confirmCourseDeleteBtn) {
        confirmCourseDeleteBtn.disabled = false;
        confirmCourseDeleteBtn.innerHTML = "Delete";
      }
    });
}

// Handle import courses
function handleImportCourses() {
  const fileInput = document.getElementById("file-input");
  if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
    showAlert("Please select a file to import", "danger");
    return;
  }

  const file = fileInput.files[0];
  const formData = new FormData();
  formData.append("file", file);

  // Show loading state
  const uploadBtn = document.getElementById("upload-btn");
  if (uploadBtn) {
    uploadBtn.disabled = true;
    uploadBtn.innerHTML =
      '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Uploading...';
  }

  fetch(`${window.API_URL}/courses/import`, {
    method: "POST",
    headers: {
      Authorization: localStorage.getItem("token"),
    },
    body: formData,
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((data) => {
          throw new Error(data.message || "Failed to import courses");
        });
      }
      return response.json();
    })
    .then((data) => {
      // Hide modal
      if (importModal) importModal.hide();

      // Show success message with details
      const message = `
        ${data.message}<br>
        Total: ${data.stats.total} | 
        Imported: ${data.stats.imported} | 
        Skipped: ${data.stats.skipped}
      `;
      showAlert(message, "success");

      // Reload courses
      loadCourses();
    })
    .catch((error) => {
      console.error("Import courses error:", error);
      showAlert(error.message, "danger");
    })
    .finally(() => {
      // Reset file input and button state
      if (fileInput) fileInput.value = "";
      const fileInfo = document.getElementById("file-info");
      if (fileInfo) fileInfo.textContent = "";
      if (uploadBtn) {
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = "Upload";
      }
    });
}

// Show alert message
// Show alert message
function showAlert(message, type = "info", timeout = 5000) {
  // Local implementation
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
