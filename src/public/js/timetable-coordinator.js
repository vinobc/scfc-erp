// DOM elements
let coordinatorAssignmentForm;
let coordinatorEmployeeIdInput;
let coordinatorEmployeeIdDisplay;
let coordinatorSchoolsContainer;
let coordinatorsTableBody;
let addNewCoordinatorBtn;

// Global data
let availableSchools = [];
let selectedEmployeeId = null;
let currentCoordinators = [];

// Initialize timetable coordinator functionality
document.addEventListener("DOMContentLoaded", () => {
  console.log("timetable-coordinator.js: DOM loaded");

  // Initialize form elements
  coordinatorAssignmentForm = document.getElementById(
    "coordinator-assignment-form"
  );
  coordinatorEmployeeIdInput = document.getElementById(
    "coordinator-employee-id"
  );
  coordinatorEmployeeIdDisplay = document.getElementById(
    "coordinator-employee-id-display"
  );
  coordinatorSchoolsContainer = document.getElementById("coordinator-schools");
  coordinatorsTableBody = document.getElementById("coordinators-table");
  addNewCoordinatorBtn = document.getElementById("add-new-coordinator-btn");

  // Setup event listeners
  if (coordinatorAssignmentForm) {
    coordinatorAssignmentForm.addEventListener(
      "submit",
      handleCoordinatorAssignment
    );
  }

  if (coordinatorEmployeeIdInput) {
    coordinatorEmployeeIdInput.addEventListener("input", handleFacultySearch);
  }

  if (addNewCoordinatorBtn) {
    addNewCoordinatorBtn.addEventListener("click", () => {
      showCreateCoordinatorPage();
    });
  }

  // Setup navigation
  setupCoordinatorNavigation();
});

// Setup navigation for coordinator pages
function setupCoordinatorNavigation() {
  const coordinatorLink = document.getElementById("timetable-coordinator-link");
  const createCoordinatorLink = document.getElementById(
    "create-coordinator-link"
  );
  const manageCoordinatorsLink = document.getElementById(
    "manage-coordinators-link"
  );

  if (coordinatorLink) {
    coordinatorLink.addEventListener("click", (e) => {
      e.preventDefault();
      const submenu = document.getElementById("timetable-coordinator-submenu");
      if (submenu) {
        submenu.classList.toggle("d-none");
      }
    });
  }

  if (createCoordinatorLink) {
    createCoordinatorLink.addEventListener("click", (e) => {
      e.preventDefault();
      showCreateCoordinatorPage();
    });
  }

  if (manageCoordinatorsLink) {
    manageCoordinatorsLink.addEventListener("click", (e) => {
      e.preventDefault();
      showManageCoordinatorsPage();
    });
  }
}

// Show create coordinator page
function showCreateCoordinatorPage() {
  console.log("Showing create coordinator page");

  // Hide all other pages
  document.querySelectorAll(".content-page").forEach((page) => {
    page.classList.remove("active");
  });

  // Show create coordinator page
  const createCoordinatorPage = document.getElementById(
    "create-coordinator-page"
  );
  if (createCoordinatorPage) {
    createCoordinatorPage.classList.add("active");
  }

  // Update page title
  const pageTitle = document.getElementById("page-title");
  if (pageTitle) {
    pageTitle.textContent = "Create Timetable Coordinator";
  }

  // Load necessary data
  loadSchoolsForAssignment();
  resetCoordinatorForm();
}

// Show manage coordinators page
function showManageCoordinatorsPage() {
  console.log("Showing manage coordinators page");

  // Hide all other pages
  document.querySelectorAll(".content-page").forEach((page) => {
    page.classList.remove("active");
  });

  // Show manage coordinators page
  const manageCoordinatorsPage = document.getElementById(
    "manage-coordinators-page"
  );
  if (manageCoordinatorsPage) {
    manageCoordinatorsPage.classList.add("active");
  }

  // Update page title
  const pageTitle = document.getElementById("page-title");
  if (pageTitle) {
    pageTitle.textContent = "Manage Timetable Coordinators";
  }

  // Load coordinators data
  loadCoordinators();
}

// Handle faculty search
function handleFacultySearch(event) {
  const searchTerm = event.target.value.trim();
  console.log("Faculty search term:", searchTerm);

  if (searchTerm.length < 2) {
    coordinatorEmployeeIdDisplay.textContent = "";
    selectedEmployeeId = null;
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
      // Filter matching faculty by name
      const matchingFaculty = facultyList.filter((f) =>
        f.name.toLowerCase().includes(searchTerm.toLowerCase())
      );

      if (matchingFaculty.length > 0) {
        // For simplicity, auto-select the first match
        // In a full implementation, you'd show a dropdown
        const faculty = matchingFaculty[0];
        coordinatorEmployeeIdDisplay.textContent = faculty.employee_id;
        selectedEmployeeId = faculty.employee_id;

        // If exact match, keep the name in the input
        const exactMatch = matchingFaculty.find(
          (f) => f.name.toLowerCase() === searchTerm.toLowerCase()
        );
        if (exactMatch) {
          coordinatorEmployeeIdInput.value = exactMatch.name;
          coordinatorEmployeeIdDisplay.textContent = exactMatch.employee_id;
          selectedEmployeeId = exactMatch.employee_id;
        }
      } else {
        coordinatorEmployeeIdDisplay.textContent = "";
        selectedEmployeeId = null;
      }
    })
    .catch((error) => {
      console.error("Error fetching faculty:", error);
    });
}

// Load schools for assignment
function loadSchoolsForAssignment() {
  fetch(`${window.API_URL}/schools`, {
    headers: {
      Authorization: localStorage.getItem("token"),
    },
  })
    .then((response) => response.json())
    .then((schools) => {
      availableSchools = schools.filter((s) => s.is_active);
      renderSchoolCheckboxes();
    })
    .catch((error) => {
      console.error("Error loading schools:", error);
      showAlert("Failed to load schools", "danger");
    });
}

// Render school checkboxes
function renderSchoolCheckboxes() {
  if (!coordinatorSchoolsContainer) return;

  coordinatorSchoolsContainer.innerHTML = `
    <div class="form-text mb-2">
      Select one or more schools for this coordinator:
    </div>
  `;

  availableSchools.forEach((school) => {
    const checkboxDiv = document.createElement("div");
    checkboxDiv.className = "form-check";
    checkboxDiv.innerHTML = `
      <input 
        class="form-check-input" 
        type="checkbox" 
        value="${school.school_id}" 
        id="school-${school.school_id}"
      >
      <label class="form-check-label" for="school-${school.school_id}">
        ${school.school_short_name} - ${school.school_long_name}
      </label>
    `;
    coordinatorSchoolsContainer.appendChild(checkboxDiv);
  });
}

// Handle coordinator assignment
function handleCoordinatorAssignment(event) {
  event.preventDefault();
  console.log("Creating coordinator assignment");

  if (!selectedEmployeeId) {
    showAlert("Please select a faculty member", "danger");
    return;
  }

  // Get selected schools
  const selectedSchools = [];
  const checkboxes = coordinatorSchoolsContainer.querySelectorAll(
    'input[type="checkbox"]:checked'
  );
  checkboxes.forEach((checkbox) => {
    selectedSchools.push(parseInt(checkbox.value));
  });

  if (selectedSchools.length === 0) {
    showAlert("Please select at least one school", "danger");
    return;
  }

  // Create coordinator assignment
  const assignmentData = {
    employee_id: selectedEmployeeId,
    school_ids: selectedSchools,
  };

  fetch(`${window.API_URL}/timetable-coordinators`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: localStorage.getItem("token"),
    },
    body: JSON.stringify(assignmentData),
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
      alert("Timetable coordinator assigned successfully!");
      resetCoordinatorForm();
    })
    .catch((error) => {
      console.error("Create coordinator assignment error:", error);
      showAlert(
        error.message || "Failed to create coordinator assignment",
        "danger"
      );
    });
}

// Reset coordinator form
function resetCoordinatorForm() {
  if (coordinatorAssignmentForm) {
    coordinatorAssignmentForm.reset();
  }
  coordinatorEmployeeIdDisplay.textContent = "";
  selectedEmployeeId = null;

  // Uncheck all school checkboxes
  const checkboxes = coordinatorSchoolsContainer.querySelectorAll(
    'input[type="checkbox"]'
  );
  checkboxes.forEach((checkbox) => {
    checkbox.checked = false;
  });
}

// Load coordinators
function loadCoordinators() {
  if (!coordinatorsTableBody) return;

  coordinatorsTableBody.innerHTML =
    '<tr><td colspan="6" class="text-center">Loading coordinators...</td></tr>';

  fetch(`${window.API_URL}/timetable-coordinators`, {
    headers: {
      Authorization: localStorage.getItem("token"),
    },
  })
    .then((response) => response.json())
    .then((coordinators) => {
      currentCoordinators = coordinators;
      renderCoordinators(coordinators);
    })
    .catch((error) => {
      console.error("Error loading coordinators:", error);
      coordinatorsTableBody.innerHTML =
        '<tr><td colspan="6" class="text-center text-danger">Error loading coordinators</td></tr>';
    });
}

// Render coordinators table
function renderCoordinators(coordinators) {
  if (!coordinatorsTableBody) return;

  if (coordinators.length === 0) {
    coordinatorsTableBody.innerHTML =
      '<tr><td colspan="6" class="text-center">No coordinators found</td></tr>';
    return;
  }

  // Group coordinators by user to show school assignments together
  const groupedCoordinators = {};
  coordinators.forEach((coord) => {
    if (!groupedCoordinators[coord.user_id]) {
      groupedCoordinators[coord.user_id] = {
        ...coord,
        schools: [],
      };
    }
    groupedCoordinators[coord.user_id].schools.push({
      school_id: coord.school_id,
      school_short_name: coord.school_short_name,
      assignment_id: coord.id,
    });
  });

  coordinatorsTableBody.innerHTML = "";

  Object.values(groupedCoordinators).forEach((coordinator) => {
    const row = document.createElement("tr");

    const schoolsList = coordinator.schools
      .map((s) => s.school_short_name)
      .join(", ");

    row.innerHTML = `
      <td>${coordinator.faculty_name || coordinator.full_name}</td>
      <td>${coordinator.employee_id}</td>
      <td>${coordinator.username}</td>
      <td>${schoolsList}</td>
      <td>${
        window.formatDate
          ? window.formatDate(coordinator.created_at)
          : coordinator.created_at
      }</td>
      <td>
        <button class="btn btn-sm btn-danger delete-coordinator-btn" 
          data-user-id="${coordinator.user_id}">
          <i class="fas fa-trash"></i> Remove
        </button>
      </td>
    `;
    coordinatorsTableBody.appendChild(row);
  });

  // Add event listeners for delete buttons
  document.querySelectorAll(".delete-coordinator-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const userId = btn.getAttribute("data-user-id");
      confirmRemoveCoordinator(userId);
    });
  });
}

// Confirm remove coordinator
function confirmRemoveCoordinator(userId) {
  const coordinator = Object.values(
    currentCoordinators.reduce((acc, coord) => {
      if (!acc[coord.user_id]) {
        acc[coord.user_id] = coord;
      }
      return acc;
    }, {})
  )[0];

  if (
    confirm(
      `Are you sure you want to remove ${
        coordinator.faculty_name || coordinator.full_name
      } as a timetable coordinator?`
    )
  ) {
    removeCoordinator(userId);
  }
}

// Remove coordinator
function removeCoordinator(userId) {
  // Find all assignments for this user and remove them
  const userCoordinators = currentCoordinators.filter(
    (c) => c.user_id == userId
  );

  const deletePromises = userCoordinators.map((coord) =>
    fetch(`${window.API_URL}/timetable-coordinators/${coord.id}`, {
      method: "DELETE",
      headers: {
        Authorization: localStorage.getItem("token"),
      },
    })
  );

  Promise.all(deletePromises)
    .then(() => {
      showAlert("Coordinator removed successfully", "success");
      loadCoordinators();
    })
    .catch((error) => {
      console.error("Error removing coordinator:", error);
      showAlert("Failed to remove coordinator", "danger");
    });
}

// Show alert message
function showAlert(message, type = "info", timeout = 5000) {
  // Use the global showAlert function from main.js
  if (
    typeof window.showAlert === "function" &&
    window.showAlert !== showAlert
  ) {
    window.showAlert(message, type, timeout);
  } else {
    console.log(`${type}: ${message}`);
  }
}
