// Force HTTP protocol
if (window.location.protocol === "https:") {
  window.location.protocol = "http:";
}

// Global variables
window.API_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? `${window.location.protocol}//${window.location.host}/api`
    : "http://35.200.229.112/api";

console.log("Global API URL set to:", window.API_URL);
let currentUser = null;

// DOM elements - will be initialized after DOM loads
let contentPages;
let navLinks;
let pageTitle;
let userNameElement;
let userRoleElement;
let alertContainer;

// Initialize the application
document.addEventListener("DOMContentLoaded", () => {
  console.log("main.js: DOM loaded");

  // Initialize DOM elements
  contentPages = document.querySelectorAll(".content-page");
  navLinks = document.querySelectorAll(".nav-link");
  pageTitle = document.getElementById("page-title");
  userNameElement = document.getElementById("user-name");
  userRoleElement = document.getElementById("user-role");
  alertContainer = document.getElementById("alert-container");

  // Check if user is logged in
  checkAuthStatus();

  // Setup navigation
  setupNavigation();

  // Setup logout functionality
  const logoutLink = document.getElementById("logout-link");
  if (logoutLink) {
    logoutLink.addEventListener("click", handleLogout);
  }
});

// Authentication status check
function checkAuthStatus() {
  console.log("main.js: Checking auth status");
  const token = localStorage.getItem("token");

  if (!token) {
    showLoginModal();
    return;
  }

  // Get current user info
  fetch(`${window.API_URL}/auth/me`, {
    headers: {
      Authorization: token,
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Authentication failed");
      }
      return response.json();
    })
    .then((user) => {
      currentUser = user;
      if (userNameElement) userNameElement.textContent = user.full_name;
      if (userRoleElement) userRoleElement.textContent = user.role;

      // Update navigation based on role
      updateNavigationByRole(user.role);

      // Load dashboard data
      loadDashboardData();
    })
    .catch((error) => {
      console.error("Auth check error:", error);
      localStorage.removeItem("token");
      showLoginModal();
    });
}

// Hide/show navigation based on user role
function updateNavigationByRole(userRole) {
  console.log("Updating navigation for role:", userRole);

  // Get all navigation items
  const navItems = {
    dashboard: document.getElementById("dashboard-link"),
    schools: document.getElementById("schools-link"),
    programs: document.getElementById("programs-link"),
    semesters: document.getElementById("semesters-link"),
    courses: document.getElementById("courses-link"),
    venues: document.getElementById("venues-link"),
    faculty: document.getElementById("faculty-link"),
    users: document.getElementById("users-link"),
    students: document.getElementById("students-link"),
    timetable: document.getElementById("timetable-link"),
    timetableCoordinator: document.getElementById("timetable-coordinator-link"),
    attendance: document.getElementById("attendance-link"),
    systemConfig: document.getElementById("system-config-link"),
    logout: document.getElementById("logout-link"),
  };

  // Hide all items first
  Object.values(navItems).forEach((item) => {
    if (item && item.parentElement) {
      item.parentElement.style.display = "none";
    }
  });

  // Show items based on role
  switch (userRole) {
    case "admin":
      // Admin sees everything
      Object.values(navItems).forEach((item) => {
        if (item && item.parentElement) {
          item.parentElement.style.display = "block";
        }
      });
      break;

    case "timetable_coordinator":
      // Coordinator sees: Dashboard, TimeTable (view only), Attendance, Logout
      [navItems.dashboard, navItems.timetable, navItems.attendance, navItems.logout].forEach(
        (item) => {
          if (item && item.parentElement) {
            item.parentElement.style.display = "block";
          }
        }
      );

      // Show timetable but customize submenu for coordinators (view only)
      if (navItems.timetable && navItems.timetable.parentElement) {
        navItems.timetable.parentElement.style.display = "block";
        customizeTimetableMenuForCoordinator();
      }
      break;

    case "faculty":
      // Faculty sees: Dashboard, Attendance, TimeTable (VIEW ONLY), Logout
      [navItems.dashboard, navItems.attendance, navItems.logout].forEach((item) => {
        if (item && item.parentElement) {
          item.parentElement.style.display = "block";
        }
      });

      // Show timetable but customize submenu for faculty (view only)
      if (navItems.timetable && navItems.timetable.parentElement) {
        navItems.timetable.parentElement.style.display = "block";
        customizeTimetableMenuForFaculty();
      }
      break;

    case "student":
      // Students see: Dashboard, Attendance, Logout
      [navItems.dashboard, navItems.attendance, navItems.logout].forEach((item) => {
        if (item && item.parentElement) {
          item.parentElement.style.display = "block";
        }
      });
      break;

    default:
      // Default: only dashboard and logout
      [navItems.dashboard, navItems.logout].forEach((item) => {
        if (item && item.parentElement) {
          item.parentElement.style.display = "block";
        }
      });
  }
}

// Customize timetable menu for faculty (view only)
function customizeTimetableMenuForFaculty() {
  const timetableSubmenu = document.getElementById("timetable-submenu");
  if (!timetableSubmenu) return;

  // Hide all timetable creation options for faculty
  const createSlotLink = document.getElementById("create-slot-link");
  const createFacultySlotLink = document.getElementById(
    "create-faculty-slot-link"
  );

  if (createSlotLink && createSlotLink.parentElement) {
    createSlotLink.parentElement.style.display = "none";
  }
  if (createFacultySlotLink && createFacultySlotLink.parentElement) {
    createFacultySlotLink.parentElement.style.display = "none";
  }

  // Show only view options
  const viewSlotLink = document.getElementById("view-slot-link");
  const viewFacultySlotLink = document.getElementById("view-faculty-slot-link");
  const viewClassSlotLink = document.getElementById("view-class-slot-link");
  const viewStudentTimetableLink = document.getElementById("view-student-timetable-link");

  if (viewSlotLink && viewSlotLink.parentElement) {
    viewSlotLink.parentElement.style.display = "block";
  }
  if (viewFacultySlotLink && viewFacultySlotLink.parentElement) {
    viewFacultySlotLink.parentElement.style.display = "block";
  }
  if (viewClassSlotLink && viewClassSlotLink.parentElement) {
    viewClassSlotLink.parentElement.style.display = "block";
  }
  if (viewStudentTimetableLink && viewStudentTimetableLink.parentElement) {
    viewStudentTimetableLink.parentElement.style.display = "block";
  }
}

// Customize timetable menu for coordinators (view only for master slots, full access for faculty allocations)
function customizeTimetableMenuForCoordinator() {
  const timetableSubmenu = document.getElementById("timetable-submenu");
  if (!timetableSubmenu) return;

  // Hide master slot creation options for coordinators
  const createSlotLink = document.getElementById("create-slot-link");
  if (createSlotLink && createSlotLink.parentElement) {
    createSlotLink.parentElement.style.display = "none";
  }

  // Show all other timetable options (view master slots, faculty allocations, class slots)
  const viewSlotLink = document.getElementById("view-slot-link");
  const facultySlotSection = document.getElementById("faculty-slot-link");
  const viewClassSlotLink = document.getElementById("view-class-slot-link");
  const viewStudentTimetableLink = document.getElementById("view-student-timetable-link");

  if (viewSlotLink && viewSlotLink.parentElement) {
    viewSlotLink.parentElement.style.display = "block";
  }
  if (facultySlotSection && facultySlotSection.parentElement) {
    facultySlotSection.parentElement.style.display = "block";
  }
  if (viewClassSlotLink && viewClassSlotLink.parentElement) {
    viewClassSlotLink.parentElement.style.display = "block";
  }
  if (viewStudentTimetableLink && viewStudentTimetableLink.parentElement) {
    viewStudentTimetableLink.parentElement.style.display = "block";
  }
}

// Setup navigation between pages
function setupNavigation() {
  if (!navLinks || navLinks.length === 0) {
    console.error("Navigation links not found");
    return;
  }

  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();

      const targetId = link.getAttribute("id");
      console.log("🖱️ Navigation link clicked:", targetId);
      
      if (targetId === "logout-link") return;

      // Handle special cases for faculty slot timetable
      let targetPage;
      if (targetId === "create-faculty-slot-link") {
        targetPage = "create-faculty-allocation-page";
      } else if (targetId === "view-faculty-slot-link") {
        targetPage = "view-faculty-timetable-page";
      } else {
        targetPage = targetId.replace("-link", "-page");
      }
      console.log("📄 Target page:", targetPage);

      // Update active navigation
      navLinks.forEach((navLink) => navLink.classList.remove("active"));
      link.classList.add("active");

      // Show target page
      const targetElement = document.getElementById(targetPage);
      if (targetElement) {
        contentPages.forEach((page) => page.classList.remove("active"));
        targetElement.classList.add("active");

        // Update page title
        if (pageTitle) pageTitle.textContent = link.textContent.trim();

        // Load page-specific data
        if (targetPage === "schools-page") {
          if (typeof loadSchools === "function") {
            loadSchools();
          }
        } else if (targetPage === "system-config-page") {
          if (typeof initializeSystemConfig === "function") {
            initializeSystemConfig();
          }
        } else if (targetPage === "view-student-timetable-page") {
          console.log("🎯 Navigating to view-student-timetable-page");
          console.log("🔍 initializeAdminStudentTimetable type:", typeof initializeAdminStudentTimetable);
          if (typeof initializeAdminStudentTimetable === "function") {
            console.log("✅ Calling initializeAdminStudentTimetable");
            initializeAdminStudentTimetable();
          } else {
            console.error("❌ initializeAdminStudentTimetable is not a function");
          }
        } else if (targetPage === "create-faculty-allocation-page") {
          console.log("🎯 Navigating to create-faculty-allocation-page");
          if (typeof showCreateFacultyAllocationPage === "function") {
            console.log("✅ Calling showCreateFacultyAllocationPage");
            showCreateFacultyAllocationPage();
          } else {
            console.error("❌ showCreateFacultyAllocationPage is not a function");
          }
        } else if (targetPage === "view-faculty-timetable-page") {
          console.log("🎯 Navigating to view-faculty-timetable-page");
          if (typeof showViewFacultyTimetablePage === "function") {
            console.log("✅ Calling showViewFacultyTimetablePage");
            showViewFacultyTimetablePage();
          } else {
            console.error("❌ showViewFacultyTimetablePage is not a function");
          }
        } else if (targetPage === "attendance-page") {
          console.log("🎯 Navigating to attendance-page");
          // Try to initialize attendance directly
          if (typeof window.initializeAttendance === "function") {
            console.log("✅ Calling window.initializeAttendance");
            window.initializeAttendance();
          } else if (typeof initializeAttendance === "function") {
            console.log("✅ Calling initializeAttendance");
            initializeAttendance();
          } else {
            console.error("❌ initializeAttendance is not available. Showing error message.");
            // Show error message in attendance page
            const content = document.getElementById("attendance-content");
            if (content) {
              content.innerHTML = `
                <div class="alert alert-danger text-center">
                  <h5>❌ Error</h5>
                  <p>Attendance system could not be loaded. Please refresh the page and try again.</p>
                  <p><small>Debug info: initializeAttendance function not found</small></p>
                  <button class="btn btn-primary" onclick="location.reload()">
                    <i class="fas fa-refresh me-2"></i>Refresh Page
                  </button>
                </div>
              `;
            }
          }
        }
        // Add other page data loading as needed
      } else {
        console.error(`Target page not found: ${targetPage}`);
      }
    });
  });
}

// Load dashboard data
function loadDashboardData() {
  console.log("main.js: Loading dashboard data");

  // Get the counter elements
  const schoolsCount = document.getElementById("schools-count");
  const programsCount = document.getElementById("programs-count");
  const studentsCount = document.getElementById("students-count");
  const coursesCount = document.getElementById("courses-count");

  // For now, just clear the counts
  if (schoolsCount) schoolsCount.textContent = "...";
  if (programsCount) programsCount.textContent = "...";
  if (studentsCount) studentsCount.textContent = "...";
  if (coursesCount) coursesCount.textContent = "...";

  // Fetch schools count for dashboard
  fetch(`${window.API_URL}/schools`, {
    headers: {
      Authorization: localStorage.getItem("token"),
    },
  })
    .then((response) => response.json())
    .then((schools) => {
      if (schoolsCount) schoolsCount.textContent = schools.length;
    })
    .catch((error) => {
      console.error("Error fetching schools count:", error);
      if (schoolsCount) schoolsCount.textContent = "?";
    });

  // Other counts would be fetched similarly once those APIs are implemented
}

// Handle logout
function handleLogout(e) {
  e.preventDefault();
  console.log("main.js: Logging out");

  // Send logout request to the server
  fetch(`${window.API_URL}/auth/logout`, {
    method: "POST",
    headers: {
      Authorization: localStorage.getItem("token"),
    },
  }).finally(() => {
    // Clear local storage and redirect to login
    localStorage.removeItem("token");
    currentUser = null;
    showLoginModal();
  });
}

// Show login modal
function showLoginModal() {
  console.log("main.js: Showing login modal");
  const loginModalElement = document.getElementById("loginModal");
  if (loginModalElement) {
    const loginModal = new bootstrap.Modal(loginModalElement);
    loginModal.show();
  } else {
    console.error("Login modal element not found");
  }
}

// Show alert message - made available globally
window.showAlert = function (message, type = "info", timeout = 5000) {
  if (!alertContainer) {
    console.error("Alert container not found");
    console.log(message); // Log the message instead
    return;
  }

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
};

// ===== ATTENDANCE SYSTEM =====
// Initialize attendance system
function initializeAttendance() {
  console.log("🎯 Initializing attendance system from main.js");
  console.log("🔍 API_URL:", window.API_URL);
  console.log("🔐 Token:", localStorage.getItem("token") ? "Present" : "Missing");
  console.log("👤 User role:", currentUser?.role);
  
  const content = document.getElementById("attendance-content");
  if (!content) {
    console.error("❌ attendance-content element not found!");
    return;
  }

  // Check if user is a student
  if (currentUser && currentUser.role === 'student') {
    initializeStudentAttendance();
    return;
  }

  // Timetable coordinators get the same attendance interface as faculty
  // (they can also be faculty and should be able to mark attendance for their courses)

  content.innerHTML = `
    <div class="container-fluid">
      <div class="row">
        <div class="col-12">
          <div class="card">
            <div class="card-header bg-primary text-white">
              <h5 class="mb-0"><i class="fas fa-calendar-check me-2"></i>Faculty Attendance Management</h5>
            </div>
            <div class="card-body">
              <div class="alert alert-info">
                <h6>Attendance System</h6>
                <p>The attendance management system is being loaded. Please wait while we fetch your course allocations...</p>
              </div>
              
              <div class="text-center">
                <div class="spinner-border text-primary" role="status">
                  <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-3">Loading available semesters...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Try to load semesters
  loadAttendanceSemesters();
}

// Load attendance semesters
async function loadAttendanceSemesters() {
  try {
    console.log("🌐 Making API call to:", `${window.API_URL}/attendance/semesters`);
    const response = await fetch(`${window.API_URL}/attendance/semesters`, {
      headers: { "x-access-token": localStorage.getItem("token") }
    });

    console.log("📡 API Response status:", response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ API Error:", errorText);
      throw new Error(`Failed to load available semesters: ${response.status}`);
    }
    
    const semesters = await response.json();
    console.log("📚 Loaded semesters:", semesters);
    
    const content = document.getElementById("attendance-content");
    if (content) {
      if (!semesters.length) {
        content.innerHTML = `
          <div class="alert alert-info text-center">
            <h5>📚 No Course Allocations Found</h5>
            <p>You don't have any course allocations assigned. Please contact the administrator.</p>
          </div>
        `;
      } else {
        content.innerHTML = `
          <div class="container-fluid">
            <div class="row">
              <div class="col-12">
                <div class="card">
                  <div class="card-header bg-primary text-white">
                    <h5 class="mb-0"><i class="fas fa-calendar-check me-2"></i>Faculty Attendance Management</h5>
                  </div>
                  <div class="card-body">
                    <div class="alert alert-success">
                      <h6>✅ System Ready</h6>
                      <p>Found ${semesters.length} semester(s) with course allocations. You can now manage attendance for your courses.</p>
                    </div>
                    <div id="semester-selection">
                      <h6 class="text-primary mb-3"><i class="fas fa-calendar-alt me-2"></i>Select Academic Year & Semester</h6>
                      <div class="row">
                        <div class="col-md-6">
                          <label for="semester-select" class="form-label">Academic Year & Semester</label>
                          <select id="semester-select" class="form-select">
                            <option value="">Select Academic Year & Semester</option>
                            ${semesters.map(semester => 
                              `<option value="${semester.slot_year}|${semester.semester_type}">
                                ${semester.slot_year} - ${semester.semester_type}
                              </option>`
                            ).join("")}
                          </select>
                        </div>
                        <div class="col-md-6">
                          <label class="form-label">&nbsp;</label>
                          <div>
                            <button id="load-courses-btn" class="btn btn-primary" disabled>
                              <i class="fas fa-arrow-right me-2"></i>Load My Courses
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
        
        // Setup event listeners
        const semesterSelect = document.getElementById("semester-select");
        const loadCoursesBtn = document.getElementById("load-courses-btn");
        
        if (semesterSelect && loadCoursesBtn) {
          semesterSelect.addEventListener("change", function() {
            loadCoursesBtn.disabled = !this.value;
          });
          
          loadCoursesBtn.addEventListener("click", function() {
            loadFacultyCourses();
          });
        }
      }
    }

  } catch (error) {
    console.error("Error loading attendance semesters:", error);
    const content = document.getElementById("attendance-content");
    if (content) {
      content.innerHTML = `
        <div class="alert alert-danger text-center">
          <h5>❌ Error</h5>
          <p>Error loading attendance system: ${error.message}</p>
          <button class="btn btn-primary" onclick="initializeAttendance()">
            <i class="fas fa-refresh me-2"></i>Try Again
          </button>
        </div>
      `;
    }
  }
}

// Initialize attendance system for timetable coordinators
function initializeTimetableCoordinatorAttendance() {
  console.log("🎯 Initializing timetable coordinator attendance interface");
  
  const content = document.getElementById("attendance-content");
  if (!content) return;

  // First check if the coordinator also has their own faculty allocations
  checkCoordinatorFacultyStatus();
}

// Check if timetable coordinator also has faculty allocations
async function checkCoordinatorFacultyStatus() {
  try {
    // Check if coordinator has their own semesters (as faculty)
    const response = await fetch(`${window.API_URL}/attendance/semesters`, {
      headers: { Authorization: localStorage.getItem("token") },
    });

    if (response.ok) {
      const semesters = await response.json();
      console.log("✅ Coordinator faculty status checked:", semesters);
      
      if (semesters.length > 0) {
        // Coordinator has their own faculty allocations - show dual interface
        showCoordinatorDualInterface();
      } else {
        // Coordinator only - show faculty selection interface
        showCoordinatorOnlyInterface();
      }
    } else {
      // If error, default to coordinator-only interface
      showCoordinatorOnlyInterface();
    }
  } catch (error) {
    console.error("❌ Error checking coordinator faculty status:", error);
    // If error, default to coordinator-only interface
    showCoordinatorOnlyInterface();
  }
}

// Show dual interface for coordinators who are also faculty
function showCoordinatorDualInterface() {
  const content = document.getElementById("attendance-content");
  if (!content) return;

  content.innerHTML = `
    <div class="container-fluid">
      <div class="row">
        <div class="col-12">
          <div class="card">
            <div class="card-header bg-success text-white">
              <h5 class="mb-0"><i class="fas fa-users-cog me-2"></i>Timetable Coordinator - Attendance Management</h5>
            </div>
            <div class="card-body">
              <div class="alert alert-info">
                <h6>Choose Your Role</h6>
                <p>You are a timetable coordinator with faculty allocations. Choose how you want to access the attendance system:</p>
              </div>
              
              <div class="row">
                <div class="col-md-6">
                  <div class="card border-primary h-100" style="cursor: pointer; transition: all 0.2s;" 
                       onmouseover="this.style.boxShadow='0 4px 8px rgba(0,123,255,0.3)'"
                       onmouseout="this.style.boxShadow='none'"
                       onclick="initializeFacultyMode()">
                    <div class="card-body text-center">
                      <i class="fas fa-chalkboard-teacher fa-3x text-primary mb-3"></i>
                      <h5 class="card-title">My Faculty Courses</h5>
                      <p class="card-text">Mark attendance for your own course allocations</p>
                      <div class="btn btn-primary">
                        <i class="fas fa-arrow-right me-2"></i>Access My Courses
                      </div>
                    </div>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="card border-success h-100" style="cursor: pointer; transition: all 0.2s;"
                       onmouseover="this.style.boxShadow='0 4px 8px rgba(40,167,69,0.3)'"
                       onmouseout="this.style.boxShadow='none'"
                       onclick="showCoordinatorOnlyInterface()">
                    <div class="card-body text-center">
                      <i class="fas fa-users-cog fa-3x text-success mb-3"></i>
                      <h5 class="card-title">All Faculty Courses</h5>
                      <p class="card-text">Manage attendance for any faculty member</p>
                      <div class="btn btn-success">
                        <i class="fas fa-arrow-right me-2"></i>Select Faculty
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Initialize faculty mode for coordinators with faculty allocations
function initializeFacultyMode() {
  console.log("🎯 Initializing faculty mode for coordinator");
  // Use the regular faculty initialization logic
  
  const content = document.getElementById("attendance-content");
  if (!content) return;

  content.innerHTML = `
    <div class="container-fluid">
      <div class="row">
        <div class="col-12">
          <div class="card">
            <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
              <h5 class="mb-0"><i class="fas fa-calendar-check me-2"></i>My Faculty Courses - Attendance Management</h5>
              <button class="btn btn-outline-light btn-sm" onclick="initializeTimetableCoordinatorAttendance()">
                <i class="fas fa-arrow-left me-1"></i>Back to Role Selection
              </button>
            </div>
            <div class="card-body">
              <div class="alert alert-info">
                <h6>Faculty Mode</h6>
                <p>The attendance management system is being loaded for your faculty course allocations. Please wait while we fetch your semesters...</p>
              </div>
              
              <div class="text-center">
                <div class="spinner-border text-primary" role="status">
                  <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-3">Loading available semesters...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Load semesters for faculty mode
  loadFacultySemesters();
}

// Show coordinator-only interface
function showCoordinatorOnlyInterface() {
  const content = document.getElementById("attendance-content");
  if (!content) return;

  content.innerHTML = `
    <div class="container-fluid">
      <div class="row">
        <div class="col-12">
          <div class="card">
            <div class="card-header bg-success text-white d-flex justify-content-between align-items-center">
              <h5 class="mb-0"><i class="fas fa-users-cog me-2"></i>Timetable Coordinator - Attendance Management</h5>
              <button class="btn btn-outline-light btn-sm" onclick="initializeTimetableCoordinatorAttendance()" style="display: none;" id="back-to-role-btn">
                <i class="fas fa-arrow-left me-1"></i>Back to Role Selection
              </button>
            </div>
            <div class="card-body">
              <div class="alert alert-info">
                <h6>Select Faculty and Semester</h6>
                <p>As a timetable coordinator, you can view and manage attendance for any faculty member. Please select a faculty member and semester to begin.</p>
              </div>
              
              <div class="row">
                <div class="col-md-6">
                  <label for="faculty-select" class="form-label"><strong>Faculty Member</strong></label>
                  <select class="form-select" id="faculty-select">
                    <option value="">Loading faculty...</option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label for="coordinator-semester-select" class="form-label"><strong>Academic Year & Semester</strong></label>
                  <select class="form-select" id="coordinator-semester-select">
                    <option value="">First select a faculty member</option>
                  </select>
                </div>
              </div>
              
              <div class="row mt-3">
                <div class="col-12 text-center">
                  <button class="btn btn-primary" onclick="loadCoordinatorCourses()" disabled id="load-coordinator-courses-btn">
                    <i class="fas fa-search me-2"></i>Load Courses
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Show back button if coordinator has dual roles
  checkIfDualRole();
  
  // Load faculty list
  loadFacultyList();
}

// Check if coordinator has dual roles and show back button
async function checkIfDualRole() {
  try {
    const response = await fetch(`${window.API_URL}/attendance/semesters`, {
      headers: { Authorization: localStorage.getItem("token") },
    });

    if (response.ok) {
      const semesters = await response.json();
      if (semesters.length > 0) {
        // Has dual roles - show back button
        const backBtn = document.getElementById("back-to-role-btn");
        if (backBtn) {
          backBtn.style.display = "block";
        }
      }
    }
  } catch (error) {
    console.log("Could not check dual role status");
  }
}

// Load faculty list for timetable coordinators
async function loadFacultyList() {
  try {
    const response = await fetch(`${window.API_URL}/attendance/faculty`, {
      headers: { Authorization: localStorage.getItem("token") },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const faculty = await response.json();
    console.log("✅ Faculty list loaded:", faculty);

    const facultySelect = document.getElementById("faculty-select");
    if (facultySelect) {
      facultySelect.innerHTML = '<option value="">Select faculty member...</option>';
      faculty.forEach(f => {
        facultySelect.innerHTML += `<option value="${f.employee_id}">${f.name} (${f.department || 'N/A'})</option>`;
      });

      // Add event listener to load semesters when faculty is selected
      facultySelect.addEventListener('change', function() {
        const selectedFaculty = this.value;
        if (selectedFaculty) {
          loadSemestersForFaculty(selectedFaculty);
        } else {
          const semesterSelect = document.getElementById("coordinator-semester-select");
          const loadBtn = document.getElementById("load-coordinator-courses-btn");
          if (semesterSelect) {
            semesterSelect.innerHTML = '<option value="">First select a faculty member</option>';
          }
          if (loadBtn) {
            loadBtn.disabled = true;
          }
        }
      });
    }
  } catch (error) {
    console.error("❌ Error loading faculty list:", error);
    showAlert("Failed to load faculty list", "danger");
  }
}

// Load semesters for selected faculty
async function loadSemestersForFaculty(employeeId) {
  try {
    const response = await fetch(`${window.API_URL}/attendance/semesters`, {
      headers: { Authorization: localStorage.getItem("token") },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const semesters = await response.json();
    console.log("✅ Semesters loaded for faculty:", semesters);

    const semesterSelect = document.getElementById("coordinator-semester-select");
    const loadBtn = document.getElementById("load-coordinator-courses-btn");
    
    if (semesterSelect) {
      if (semesters.length === 0) {
        semesterSelect.innerHTML = '<option value="">No semesters available</option>';
        if (loadBtn) loadBtn.disabled = true;
      } else {
        semesterSelect.innerHTML = '<option value="">Select semester...</option>';
        semesters.forEach(semester => {
          semesterSelect.innerHTML += `<option value="${semester.slot_year}|${semester.semester_type}">${semester.slot_year} - ${semester.semester_type}</option>`;
        });
        
        // Enable load button when both faculty and semester are selected
        semesterSelect.addEventListener('change', function() {
          if (loadBtn) {
            loadBtn.disabled = !this.value;
          }
        });
      }
    }
  } catch (error) {
    console.error("❌ Error loading semesters:", error);
    showAlert("Failed to load semesters", "danger");
  }
}

// Load courses for selected faculty and semester (coordinator interface)
async function loadCoordinatorCourses() {
  const facultySelect = document.getElementById("faculty-select");
  const semesterSelect = document.getElementById("coordinator-semester-select");
  
  if (!facultySelect?.value || !semesterSelect?.value) {
    showAlert("Please select both faculty member and semester", "warning");
    return;
  }

  const employeeId = facultySelect.value;
  const facultyName = facultySelect.options[facultySelect.selectedIndex].text;
  const [slot_year, semester_type] = semesterSelect.value.split("|");

  console.log("📚 Loading courses for coordinator:", { employeeId, slot_year, semester_type });

  try {
    const response = await fetch(
      `${window.API_URL}/attendance/allocations?slot_year=${slot_year}&semester_type=${semester_type}&employee_id=${employeeId}`,
      {
        headers: { Authorization: localStorage.getItem("token") },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const courses = await response.json();
    console.log("✅ Courses loaded:", courses);

    // Show courses interface with coordinator context
    showCoordinatorCoursesInterface(courses, slot_year, semester_type, employeeId, facultyName);
  } catch (error) {
    console.error("❌ Error loading courses:", error);
    showAlert("Failed to load courses", "danger");
  }
}

// Load faculty courses for selected semester
async function loadFacultyCourses() {
  const semesterSelect = document.getElementById("semester-select");
  if (!semesterSelect || !semesterSelect.value) {
    showAlert("Please select a semester first", "warning");
    return;
  }

  const [slot_year, semester_type] = semesterSelect.value.split("|");
  console.log("📚 Loading courses for:", { slot_year, semester_type });

  try {
    const content = document.getElementById("attendance-content");
    if (content) {
      content.innerHTML = `
        <div class="container-fluid">
          <div class="row">
            <div class="col-12">
              <div class="card">
                <div class="card-header bg-primary text-white">
                  <h5 class="mb-0"><i class="fas fa-calendar-check me-2"></i>Faculty Attendance Management</h5>
                </div>
                <div class="card-body">
                  <div class="text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                      <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-3">Loading your courses for ${slot_year} - ${semester_type}...</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    const response = await fetch(
      `${window.API_URL}/attendance/allocations?slot_year=${encodeURIComponent(slot_year)}&semester_type=${encodeURIComponent(semester_type)}`, 
      {
        headers: { "x-access-token": localStorage.getItem("token") }
      }
    );

    console.log("📡 Courses API Response status:", response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Courses API Error:", errorText);
      throw new Error("Failed to load faculty courses");
    }
    
    const courses = await response.json();
    console.log("📋 Loaded courses:", courses);
    showCoursesInterface(courses, slot_year, semester_type);

  } catch (error) {
    console.error("Error loading faculty courses:", error);
    const content = document.getElementById("attendance-content");
    if (content) {
      content.innerHTML = `
        <div class="alert alert-danger text-center">
          <h5>❌ Error</h5>
          <p>Error loading courses: ${error.message}</p>
          <button class="btn btn-primary" onclick="initializeAttendance()">
            <i class="fas fa-arrow-left me-2"></i>Back to Semester Selection
          </button>
        </div>
      `;
    }
  }
}

// Show courses interface
function showCoursesInterface(courses, slot_year, semester_type) {
  const content = document.getElementById("attendance-content");
  if (!content) return;

  if (!courses.length) {
    content.innerHTML = `
      <div class="container-fluid">
        <div class="row">
          <div class="col-12">
            <div class="card">
              <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                <h5 class="mb-0"><i class="fas fa-calendar-check me-2"></i>Faculty Attendance Management</h5>
                <button class="btn btn-outline-light btn-sm" onclick="initializeAttendance()">
                  <i class="fas fa-arrow-left me-1"></i>Back
                </button>
              </div>
              <div class="card-body">
                <div class="alert alert-info text-center">
                  <h6>No courses found</h6>
                  <p>You don't have any course allocations for ${slot_year} - ${semester_type}.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    return;
  }

  // Group courses by course code
  const courseGroups = {};
  courses.forEach(allocation => {
    const key = allocation.course_code;
    if (!courseGroups[key]) {
      courseGroups[key] = {
        course_code: allocation.course_code,
        course_name: allocation.course_name,
        course_type: allocation.course_type,
        theory: allocation.theory,
        practical: allocation.practical,
        allocations: []
      };
    }
    courseGroups[key].allocations.push(allocation);
  });

  let coursesHtml = `
    <div class="container-fluid">
      <div class="row">
        <div class="col-12">
          <div class="card">
            <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
              <h5 class="mb-0"><i class="fas fa-calendar-check me-2"></i>Select Course for Attendance</h5>
              <button class="btn btn-outline-light btn-sm" onclick="initializeAttendance()">
                <i class="fas fa-arrow-left me-1"></i>Back to Semester Selection
              </button>
            </div>
            <div class="card-body">
              <div class="alert alert-success">
                <h6>✅ Courses Loaded</h6>
                <p>Found ${courses.length} course allocation(s) for ${slot_year} - ${semester_type}. Click on a course to manage attendance.</p>
              </div>
              <div class="row">
  `;

  Object.values(courseGroups).forEach(course => {
    const hasTheory = course.theory > 0;
    const badgeClass = hasTheory ? 'bg-success' : 'bg-info';
    const attendanceNote = hasTheory ? '75% attendance required for exams' : 'Lab course - attendance tracked';

    coursesHtml += `
      <div class="col-md-6 mb-3">
        <div class="card course-card h-100" style="cursor: pointer; border: 2px solid #dee2e6; transition: all 0.2s;" 
             onmouseover="this.style.borderColor='#007bff'; this.style.boxShadow='0 4px 8px rgba(0,123,255,0.2)'"
             onmouseout="this.style.borderColor='#dee2e6'; this.style.boxShadow='none'"
             onclick="selectCourseForAttendance('${course.course_code}', '${slot_year}', '${semester_type}')">
          <div class="card-body">
            <h6 class="card-title text-primary">${course.course_code}</h6>
            <p class="card-text">${course.course_name}</p>
            <div class="mb-2">
              <span class="badge ${badgeClass}">${course.course_type}</span>
              <small class="text-muted ms-2">${attendanceNote}</small>
            </div>
            <div class="text-muted">
              <small><i class="fas fa-clock me-1"></i>${course.allocations.length} time slot(s)</small>
            </div>
          </div>
        </div>
      </div>
    `;
  });

  coursesHtml += `
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  content.innerHTML = coursesHtml;
}

// Select course for attendance management
async function selectCourseForAttendance(courseCode, slotYear, semesterType) {
  console.log("🎯 Selected course for attendance:", { courseCode, slotYear, semesterType });
  
  try {
    const content = document.getElementById("attendance-content");
    if (content) {
      content.innerHTML = `
        <div class="container-fluid">
          <div class="row">
            <div class="col-12">
              <div class="card">
                <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                  <h5 class="mb-0"><i class="fas fa-calendar-check me-2"></i>Loading Course: ${courseCode}</h5>
                  <button class="btn btn-outline-light btn-sm" onclick="loadFacultyCourses()">
                    <i class="fas fa-arrow-left me-1"></i>Back to Courses
                  </button>
                </div>
                <div class="card-body">
                  <div class="text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                      <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-3">Loading course details and time slots...</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    // Get course allocations for this specific course
    const response = await fetch(
      `${window.API_URL}/attendance/allocations?slot_year=${encodeURIComponent(slotYear)}&semester_type=${encodeURIComponent(semesterType)}&course_code=${encodeURIComponent(courseCode)}`, 
      {
        headers: { "x-access-token": localStorage.getItem("token") }
      }
    );

    console.log("📡 Course details API Response status:", response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Course details API Error:", errorText);
      throw new Error("Failed to load course details");
    }
    
    const courseAllocations = await response.json();
    console.log("📋 Course allocations:", courseAllocations);
    showCourseTimeSlots(courseAllocations, courseCode, slotYear, semesterType);

  } catch (error) {
    console.error("Error loading course details:", error);
    const content = document.getElementById("attendance-content");
    if (content) {
      content.innerHTML = `
        <div class="alert alert-danger text-center">
          <h5>❌ Error</h5>
          <p>Error loading course details: ${error.message}</p>
          <button class="btn btn-primary" onclick="loadFacultyCourses()">
            <i class="fas fa-arrow-left me-2"></i>Back to Courses
          </button>
        </div>
      `;
    }
  }
}

// Show course time slots for attendance
function showCourseTimeSlots(allocations, courseCode, slotYear, semesterType) {
  const content = document.getElementById("attendance-content");
  if (!content) return;

  if (!allocations.length) {
    content.innerHTML = `
      <div class="container-fluid">
        <div class="row">
          <div class="col-12">
            <div class="card">
              <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                <h5 class="mb-0"><i class="fas fa-calendar-check me-2"></i>${courseCode} - No Time Slots</h5>
                <button class="btn btn-outline-light btn-sm" onclick="loadFacultyCourses()">
                  <i class="fas fa-arrow-left me-1"></i>Back to Courses
                </button>
              </div>
              <div class="card-body">
                <div class="alert alert-warning text-center">
                  <h6>No time slots found</h6>
                  <p>No time slots found for ${courseCode} in ${slotYear} - ${semesterType}.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    return;
  }

  // Get course details from first allocation
  const courseInfo = allocations[0];
  
  let slotsHtml = `
    <div class="container-fluid">
      <div class="row">
        <div class="col-12">
          <div class="card">
            <div class="card-header bg-success text-white d-flex justify-content-between align-items-center">
              <div>
                <h5 class="mb-0"><i class="fas fa-calendar-check me-2"></i>${courseCode} - Select Time Slot</h5>
                <small>${courseInfo.course_name}</small>
              </div>
              <button class="btn btn-outline-light btn-sm" onclick="loadFacultyCourses()">
                <i class="fas fa-arrow-left me-1"></i>Back to Courses
              </button>
            </div>
            <div class="card-body">
              <div class="alert alert-info">
                <h6>📅 Select Class Session</h6>
                <p>Found ${allocations.length} time slot(s) for ${courseCode}. Click on a time slot to manage attendance for that session.</p>
              </div>
              <div class="row">
  `;

  allocations.forEach((allocation, index) => {
    slotsHtml += `
      <div class="col-md-6 mb-3">
        <div class="card time-slot-card h-100" style="cursor: pointer; border: 2px solid #28a745; transition: all 0.2s;" 
             onmouseover="this.style.borderColor='#007bff'; this.style.boxShadow='0 4px 8px rgba(0,123,255,0.2)'"
             onmouseout="this.style.borderColor='#28a745'; this.style.boxShadow='none'"
             onclick="loadAttendanceMarkingInterface('${courseCode}', '${allocation.employee_id}', '${allocation.venue}', '${allocation.slot_day}', '${allocation.slot_name}', '${allocation.slot_time}', '${slotYear}', '${semesterType}')">
          <div class="card-body">
            <h6 class="card-title text-success">
              <i class="fas fa-clock me-2"></i>${allocation.slot_day} - ${allocation.slot_name}
            </h6>
            <p class="card-text">
              <strong>Time:</strong> ${allocation.slot_time}<br>
              <strong>Venue:</strong> ${allocation.venue}
            </p>
            <div class="text-muted">
              <small><i class="fas fa-map-marker-alt me-1"></i>Click to manage attendance</small>
            </div>
          </div>
        </div>
      </div>
    `;
  });

  slotsHtml += `
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  content.innerHTML = slotsHtml;
}

// Load attendance marking interface for specific time slot
async function loadAttendanceMarkingInterface(courseCode, employeeId, venue, slotDay, slotName, slotTime, slotYear, semesterType) {
  console.log("🎯 Loading attendance marking for:", { courseCode, employeeId, venue, slotDay, slotName, slotTime, slotYear, semesterType });
  
  try {
    const content = document.getElementById("attendance-content");
    if (content) {
      content.innerHTML = `
        <div class="container-fluid">
          <div class="row">
            <div class="col-12">
              <div class="card">
                <div class="card-header bg-info text-white d-flex justify-content-between align-items-center">
                  <div>
                    <h5 class="mb-0"><i class="fas fa-users me-2"></i>Loading Students: ${courseCode}</h5>
                    <small>${slotDay} ${slotName} | ${slotTime} | Venue: ${venue}</small>
                  </div>
                  <button class="btn btn-outline-light btn-sm" onclick="selectCourseForAttendance('${courseCode}', '${slotYear}', '${semesterType}')">
                    <i class="fas fa-arrow-left me-1"></i>Back to Time Slots
                  </button>
                </div>
                <div class="card-body">
                  <div class="text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                      <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-3">Loading enrolled students...</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    // Load enrolled students for this specific time slot
    const params = new URLSearchParams({
      slot_year: slotYear,
      semester_type: semesterType,
      course_code: courseCode,
      employee_id: employeeId,
      venue: venue,
      slot_day: slotDay,
      slot_name: slotName,
      slot_time: slotTime
    });

    console.log("🌐 Making API call to load students:", `${window.API_URL}/attendance/students?${params}`);
    const response = await fetch(`${window.API_URL}/attendance/students?${params}`, {
      headers: { "x-access-token": localStorage.getItem("token") }
    });

    console.log("📡 Students API Response status:", response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Students API Error:", errorText);
      throw new Error("Failed to load enrolled students");
    }
    
    const responseData = await response.json();
    console.log("👥 Students response data:", responseData);
    
    // Handle both old and new response formats
    const students = responseData.students || responseData;
    const attendanceDate = responseData.attendance_date || new Date().toISOString().split('T')[0];
    
    console.log("📊 Number of students:", students.length);
    console.log("📅 Attendance date:", attendanceDate);
    
    if (students.length === 0) {
      console.warn("⚠️ No students found for this course session");
      const content = document.getElementById("attendance-content");
      if (content) {
        content.innerHTML = `
          <div class="container-fluid">
            <div class="row">
              <div class="col-12">
                <div class="card">
                  <div class="card-header bg-warning text-white d-flex justify-content-between align-items-center">
                    <div>
                      <h5 class="mb-0"><i class="fas fa-exclamation-triangle me-2"></i>No Students Found</h5>
                      <small>${courseCode} | ${slotDay} ${slotName}</small>
                    </div>
                    <button class="btn btn-outline-light btn-sm" onclick="selectCourseForAttendance('${courseCode}', '${slotYear}', '${semesterType}')">
                      <i class="fas fa-arrow-left me-1"></i>Back to Time Slots
                    </button>
                  </div>
                  <div class="card-body">
                    <div class="alert alert-warning text-center">
                      <h6>No students enrolled</h6>
                      <p>No students are enrolled in this course session for ${slotDay} - ${slotName}. This could mean:</p>
                      <ul class="text-start">
                        <li>Students haven't registered for this course yet</li>
                        <li>This is a different time slot than expected</li>
                        <li>Course registration is still in progress</li>
                      </ul>
                      <p class="mb-0">Please check with the administrator or try a different time slot.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
      }
      return;
    }
    
    console.log("✅ Calling showAttendanceMarkingInterface with date:", attendanceDate);
    showAttendanceMarkingInterface(students, courseCode, employeeId, venue, slotDay, slotName, slotTime, slotYear, semesterType, attendanceDate);

  } catch (error) {
    console.error("Error loading students:", error);
    const content = document.getElementById("attendance-content");
    if (content) {
      content.innerHTML = `
        <div class="alert alert-danger text-center">
          <h5>❌ Error</h5>
          <p>Error loading students: ${error.message}</p>
          <button class="btn btn-primary" onclick="selectCourseForAttendance('${courseCode}', '${slotYear}', '${semesterType}')">
            <i class="fas fa-arrow-left me-2"></i>Back to Time Slots
          </button>
        </div>
      `;
    }
  }
}

// Show attendance marking interface
function showAttendanceMarkingInterface(students, courseCode, employeeId, venue, slotDay, slotName, slotTime, slotYear, semesterType, attendanceDate) {
  const content = document.getElementById("attendance-content");
  if (!content) return;

  let interfaceHtml = `
    <div class="container-fluid">
      <div class="row">
        <div class="col-12">
          <div class="card">
            <div class="card-header bg-success text-white d-flex justify-content-between align-items-center">
              <div>
                <h5 class="mb-0 text-white">📋 Mark Attendance: ${courseCode}</h5>
                <small>${slotDay} ${slotName} | ${slotTime} | ${venue}</small>
              </div>
              <button class="btn btn-outline-light btn-sm" onclick="selectCourseForAttendance('${courseCode}', '${slotYear}', '${semesterType}')">
                <i class="fas fa-arrow-left me-1"></i>Back to Time Slots
              </button>
            </div>
            <div class="card-body">
              <div class="row mb-3">
                <div class="col-md-4">
                  <label for="attendance-date" class="form-label">Attendance Date</label>
                  <input type="date" id="attendance-date" class="form-control" value="${attendanceDate}" onchange="reloadAttendanceForDate('${courseCode}', '${employeeId}', '${venue}', '${slotDay}', '${slotName}', '${slotTime}', '${slotYear}', '${semesterType}')">
                </div>
                <div class="col-md-8">
                  <label class="form-label">Bulk Actions</label>
                  <div>
                    <button class="btn btn-sm btn-success me-2" onclick="bulkMarkAttendance('present')">
                      <i class="fas fa-check me-1"></i>Mark All Present
                    </button>
                    <button class="btn btn-sm btn-warning me-2" onclick="bulkMarkAttendance('absent')">
                      <i class="fas fa-times me-1"></i>Mark All Absent
                    </button>
                    <button class="btn btn-sm btn-info me-2" onclick="bulkMarkAttendance('OD')">
                      <i class="fas fa-briefcase me-1"></i>Mark All OD
                    </button>
                  </div>
                </div>
              </div>
              
              <div class="table-responsive">
                <table class="table table-bordered">
                  <thead class="table-primary">
                    <tr>
                      <th>Sl. No.</th>
                      <th>Enrollment Number</th>
                      <th>Student Name</th>
                      <th>Attendance Status</th>
                    </tr>
                  </thead>
                  <tbody>
  `;

  students.forEach((student, index) => {
    const currentStatus = student.current_status || null;
    interfaceHtml += `
      <tr ${currentStatus ? 'class="table-light"' : ''}>
        <td>${index + 1}</td>
        <td>${student.enrollment_number}</td>
        <td>
          ${student.student_name}
          ${currentStatus ? `<br><small class="badge bg-secondary">Previously marked: ${currentStatus.toUpperCase()}</small>` : ''}
        </td>
        <td>
          <div class="btn-group" role="group" aria-label="Attendance options">
            <input type="radio" class="btn-check" name="attendance_${student.student_id}" id="present_${student.student_id}" value="present" ${currentStatus === 'present' ? 'checked' : ''}>
            <label class="btn btn-outline-success" for="present_${student.student_id}">Present</label>

            <input type="radio" class="btn-check" name="attendance_${student.student_id}" id="absent_${student.student_id}" value="absent" ${currentStatus === 'absent' ? 'checked' : ''}>
            <label class="btn btn-outline-danger" for="absent_${student.student_id}">Absent</label>

            <input type="radio" class="btn-check" name="attendance_${student.student_id}" id="od_${student.student_id}" value="OD" ${currentStatus === 'OD' ? 'checked' : ''}>
            <label class="btn btn-outline-info" for="od_${student.student_id}">OD</label>
          </div>
        </td>
      </tr>
    `;
  });

  interfaceHtml += `
                  </tbody>
                </table>
              </div>
              
              <div class="row mt-3">
                <div class="col-md-6">
                  <button class="btn btn-primary btn-lg" onclick="saveAttendanceData('${courseCode}', '${employeeId}', '${venue}', '${slotDay}', '${slotName}', '${slotTime}', '${slotYear}', '${semesterType}')">
                    <i class="fas fa-save me-2"></i>Save Attendance
                  </button>
                </div>
                <div class="col-md-6 text-end">
                  <button class="btn btn-outline-info me-2" onclick="viewAttendanceReports('${courseCode}', '${employeeId}', '${slotYear}', '${semesterType}')">
                    <i class="fas fa-chart-bar me-2"></i>View Reports
                  </button>
                  <button class="btn btn-outline-warning me-2" onclick="viewAbsentRecords('${courseCode}', '${employeeId}', '${venue}', '${slotDay}', '${slotName}', '${slotTime}', '${slotYear}', '${semesterType}')">
                    <i class="fas fa-user-times me-2"></i>View Absent Records
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  content.innerHTML = interfaceHtml;
}

// Bulk mark attendance - Original working implementation
function bulkMarkAttendance(status) {
  // Get all students from the table
  const radioButtons = document.querySelectorAll('input[name^="attendance_"]');
  const studentIds = new Set();
  
  radioButtons.forEach(radio => {
    const match = radio.name.match(/attendance_(\d+)/);
    if (match) {
      studentIds.add(match[1]);
    }
  });

  studentIds.forEach(studentId => {
    // Handle the OD case - radio button ID is lowercase "od" but value is uppercase "OD"
    const radioId = status === 'OD' ? 'od' : status;
    const radio = document.getElementById(`${radioId}_${studentId}`);
    if (radio) radio.checked = true;
  });
  
  showAlert(`All students marked as ${status}`, "success");
}

// Save attendance data
async function saveAttendanceData(courseCode, employeeId, venue, slotDay, slotName, slotTime, slotYear, semesterType) {
  console.log("💾 Save attendance button clicked");
  const attendanceDate = document.getElementById("attendance-date").value;
  console.log("📅 Selected date:", attendanceDate);
  
  if (!attendanceDate) {
    showAlert("Please select attendance date", "warning");
    return;
  }

  // Collect attendance data
  const attendanceRecords = [];
  const radioButtons = document.querySelectorAll('input[type="radio"]:checked');
  
  radioButtons.forEach(radio => {
    const match = radio.name.match(/attendance_(\d+)/);
    if (match) {
      const studentId = match[1];
      attendanceRecords.push({
        student_id: parseInt(studentId),
        slot_year: slotYear,
        semester_type: semesterType,
        course_code: courseCode,
        employee_id: parseInt(employeeId),
        venue: venue,
        slot_day: slotDay,
        slot_name: slotName,
        slot_time: slotTime,
        attendance_date: attendanceDate,
        status: radio.value
      });
    }
  });

  console.log("📊 Attendance records to save:", attendanceRecords.length);
  console.log("📋 Records data:", attendanceRecords);

  if (!attendanceRecords.length) {
    showAlert("Please mark attendance for at least one student", "warning");
    return;
  }

  try {
    console.log("🌐 Making save attendance API call...");
    const response = await fetch(`${window.API_URL}/attendance/mark`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": localStorage.getItem("token")
      },
      body: JSON.stringify({ attendance_records: attendanceRecords })
    });

    console.log("📡 Save attendance API response status:", response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Save attendance API error:", errorText);
      throw new Error("Failed to save attendance");
    }
    
    console.log("✅ Attendance saved successfully!");
    
    // Show success notification
    showAlert("Attendance saved successfully! 🎉", "success");
    
    // Also show a prominent success notification
    const successDiv = document.createElement("div");
    successDiv.style.cssText = `
      position: fixed; 
      top: 20px; 
      right: 20px; 
      background: #28a745; 
      color: white; 
      padding: 15px 20px; 
      border-radius: 8px; 
      z-index: 10000; 
      font-weight: bold;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      animation: slideIn 0.3s ease-out;
    `;
    successDiv.innerHTML = "✅ Attendance Saved Successfully!";
    document.body.appendChild(successDiv);
    
    // Remove after 4 seconds with fade out
    setTimeout(() => {
      if (successDiv.parentNode) {
        successDiv.style.opacity = "0";
        successDiv.style.transform = "translateX(20px)";
        successDiv.style.transition = "all 0.3s ease-out";
        setTimeout(() => successDiv.remove(), 300);
      }
    }, 4000);

  } catch (error) {
    console.error("Error saving attendance:", error);
    showAlert("Error saving attendance. Please try again.", "error");
  }
}

// View attendance reports
async function viewAttendanceReports(courseCode, employeeId, slotYear, semesterType) {
  console.log("📊 View Reports button clicked");
  console.log("📋 Report params:", { courseCode, employeeId, slotYear, semesterType });
  
  try {
    console.log("🔄 Making API request for attendance report...");
    const params = new URLSearchParams({
      slot_year: slotYear,
      semester_type: semesterType,
      course_code: courseCode,
      employee_id: employeeId
    });

    console.log("📤 Request URL:", `${window.API_URL}/attendance/report?${params}`);
    const response = await fetch(`${window.API_URL}/attendance/report?${params}`, {
      headers: { "x-access-token": localStorage.getItem("token") }
    });

    console.log("📥 Response status:", response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.log("❌ Response error:", errorText);
      throw new Error(`Failed to load attendance report: ${response.status}`);
    }
    
    const reportData = await response.json();
    console.log("📊 Report data received:", reportData);
    showAttendanceReportModal(reportData, courseCode, slotYear, semesterType);

  } catch (error) {
    console.error("Error loading attendance report:", error);
    showAlert(`Error loading attendance report: ${error.message}`, "error");
  }
}

// Show attendance report modal
function showAttendanceReportModal(reportData, courseCode, slotYear, semesterType) {
  console.log("📊 Showing attendance report modal");
  
  const { course_details, attendance_report, minimum_required } = reportData;
  
  // Count students below minimum if applicable
  let belowMinimumCount = 0;
  if (minimum_required) {
    belowMinimumCount = attendance_report.filter(student => student.below_minimum).length;
  }
  
  const content = document.getElementById("attendance-content");
  if (content) {
    content.innerHTML = `
      <div class="container-fluid">
        <div class="row">
          <div class="col-12">
            <div class="card">
              <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                <h5 class="mb-0 text-white">📊 Attendance Report - ${courseCode}</h5>
                <button class="btn btn-outline-light btn-sm" onclick="selectCourseForAttendance('${courseCode}', '${slotYear}', '${semesterType}')">
                  <i class="fas fa-arrow-left me-1"></i>Back to Course
                </button>
              </div>
              <div class="card-body">
                <div class="row mb-3">
                  <div class="col-md-6">
                    <h6>Course Details</h6>
                    <p><strong>Code:</strong> ${courseCode}<br>
                       <strong>Name:</strong> ${course_details?.course_name || 'N/A'}<br>
                       <strong>Type:</strong> ${course_details?.course_type || 'N/A'}</p>
                  </div>
                  <div class="col-md-6">
                    <h6>Statistics</h6>
                    <p><strong>Total Students:</strong> ${attendance_report.length}<br>
                       <strong>Minimum Required:</strong> ${minimum_required ? minimum_required + '%' : 'Not applicable'}<br>
                       ${minimum_required ? `<strong>Below Minimum:</strong> ${belowMinimumCount}` : ''}</p>
                  </div>
                </div>
                
                <div class="table-responsive">
                  <table class="table table-striped table-sm">
                    <thead class="table-dark">
                      <tr>
                        <th>Student Name</th>
                        <th>Enrollment No.</th>
                        <th>Present Classes</th>
                        <th>Total Classes</th>
                        <th>Attendance %</th>
                        ${minimum_required ? '<th>Status</th>' : ''}
                      </tr>
                    </thead>
                    <tbody>
                      ${attendance_report.map(student => `
                        <tr ${student.below_minimum ? 'class="table-warning"' : ''}>
                          <td>${student.student_name}</td>
                          <td>${student.enrollment_number}</td>
                          <td>${student.present_count}</td>
                          <td>${student.total_classes}</td>
                          <td><strong>${student.attendance_percentage}%</strong></td>
                          ${minimum_required ? `<td>${student.below_minimum ? '<span class="badge bg-warning text-dark">Below Minimum</span>' : '<span class="badge bg-success">OK</span>'}</td>` : ''}
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
                
                ${belowMinimumCount > 0 ? `
                  <div class="alert alert-warning mt-3">
                    <strong>⚠️ Warning:</strong> ${belowMinimumCount} student(s) have attendance below ${minimum_required}%
                  </div>
                ` : ''}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  } else {
    showAlert(`Course: ${course_details?.course_name || courseCode}\nTotal students: ${attendance_report.length}\nReport generated successfully!`, "success");
  }
}

// View absent records with date range filter
async function viewAbsentRecords(courseCode, employeeId, venue, slotDay, slotName, slotTime, slotYear, semesterType) {
  console.log("❌ View Absent Records button clicked");
  console.log("📋 Selected params:", { courseCode, employeeId, venue, slotDay, slotName, slotTime, slotYear, semesterType });
  
  const content = document.getElementById("attendance-content");
  if (content) {
    content.innerHTML = `
      <div class="container-fluid">
        <div class="row">
          <div class="col-12">
            <div class="card">
              <div class="card-header bg-warning text-white d-flex justify-content-between align-items-center">
                <div>
                  <h5 class="mb-0 text-white">❌ Absent Records: ${courseCode}</h5>
                  <small>${slotDay} ${slotName} | ${slotTime} | ${venue}</small>
                </div>
                <button class="btn btn-outline-dark btn-sm" onclick="selectCourseForAttendance('${courseCode}', '${slotYear}', '${semesterType}')">
                  <i class="fas fa-arrow-left me-1"></i>Back to Course
                </button>
              </div>
              <div class="card-body">
                <div class="row mb-3">
                  <div class="col-md-3">
                    <label for="start-date" class="form-label">From Date</label>
                    <input type="date" id="start-date" class="form-control">
                  </div>
                  <div class="col-md-3">
                    <label for="end-date" class="form-label">To Date</label>
                    <input type="date" id="end-date" class="form-control" value="${new Date().toISOString().split('T')[0]}">
                  </div>
                  <div class="col-md-3">
                    <label for="status-filter" class="form-label">Status Filter</label>
                    <select id="status-filter" class="form-select">
                      <option value="">All Records</option>
                      <option value="absent" selected>Absent Only</option>
                      <option value="present">Present Only</option>
                      <option value="OD">OD Only</option>
                    </select>
                  </div>
                  <div class="col-md-3 d-flex align-items-end">
                    <button class="btn btn-primary" onclick="loadAbsentRecords('${courseCode}', '${employeeId}', '${venue}', '${slotDay}', '${slotName}', '${slotTime}', '${slotYear}', '${semesterType}')">
                      <i class="fas fa-search me-1"></i>Search
                    </button>
                  </div>
                </div>
                
                <div id="absent-records-results">
                  <div class="text-center text-muted">
                    <i class="fas fa-search fa-2x mb-2"></i>
                    <p>Select date range and click Search to view attendance records</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

// Load absent records based on filters
async function loadAbsentRecords(courseCode, employeeId, venue, slotDay, slotName, slotTime, slotYear, semesterType) {
  console.log("🔍 Loading absent records...");
  
  const startDate = document.getElementById('start-date').value;
  const endDate = document.getElementById('end-date').value;
  const statusFilter = document.getElementById('status-filter').value;
  const resultsDiv = document.getElementById('absent-records-results');
  
  if (!startDate && !endDate) {
    showAlert("Please select at least one date to filter records", "warning");
    return;
  }
  
  try {
    resultsDiv.innerHTML = '<div class="text-center"><i class="fas fa-spinner fa-spin fa-2x"></i><p>Loading...</p></div>';
    
    const params = new URLSearchParams({
      slot_year: slotYear,
      semester_type: semesterType,
      course_code: courseCode,
      employee_id: employeeId,
      venue: venue,
      slot_day: slotDay,
      slot_name: slotName,
      slot_time: slotTime,
      ...(startDate && { start_date: startDate }),
      ...(endDate && { end_date: endDate }),
      ...(statusFilter && { status_filter: statusFilter })
    });

    const response = await fetch(`${window.API_URL}/attendance/date-range?${params}`, {
      headers: { "x-access-token": localStorage.getItem("token") }
    });

    if (!response.ok) throw new Error("Failed to load attendance records");
    
    const records = await response.json();
    console.log("📊 Absent records loaded:", records.length);
    showAbsentRecordsTable(records, statusFilter);

  } catch (error) {
    console.error("Error loading absent records:", error);
    resultsDiv.innerHTML = '<div class="alert alert-danger">Error loading attendance records. Please try again.</div>';
  }
}

// Show absent records in table format
function showAbsentRecordsTable(records, statusFilter) {
  const resultsDiv = document.getElementById('absent-records-results');
  
  if (records.length === 0) {
    resultsDiv.innerHTML = `
      <div class="alert alert-info text-center">
        <i class="fas fa-info-circle me-2"></i>
        No ${statusFilter || 'attendance'} records found for the selected date range.
      </div>
    `;
    return;
  }
  
  const statusBadge = (status) => {
    switch(status) {
      case 'present': return '<span class="badge bg-success">Present</span>';
      case 'absent': return '<span class="badge bg-danger">Absent</span>';
      case 'OD': return '<span class="badge bg-info">OD</span>';
      default: return `<span class="badge bg-secondary">${status}</span>`;
    }
  };
  
  resultsDiv.innerHTML = `
    <div class="table-responsive">
      <table class="table table-striped table-sm">
        <thead class="table-dark">
          <tr>
            <th>Date</th>
            <th>Student Name</th>
            <th>Enrollment No.</th>
            <th>Time Slot</th>
            <th>Venue</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${records.map(record => `
            <tr>
              <td>${new Date(record.attendance_date).toLocaleDateString()}</td>
              <td>${record.student_name}</td>
              <td>${record.enrollment_no}</td>
              <td>${record.slot_day} - ${record.slot_name}<br><small class="text-muted">${record.slot_time}</small></td>
              <td>${record.venue}</td>
              <td>${statusBadge(record.status)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    <div class="mt-3 text-muted">
      <small>Total records: ${records.length}</small>
    </div>
  `;
}

// Reload attendance for a different date
async function reloadAttendanceForDate(courseCode, employeeId, venue, slotDay, slotName, slotTime, slotYear, semesterType) {
  const dateInput = document.getElementById('attendance-date');
  if (!dateInput) return;
  
  const selectedDate = dateInput.value;
  console.log("📅 Reloading attendance for date:", selectedDate);
  
  if (!selectedDate) {
    showAlert("Please select a valid date", "warning");
    return;
  }
  
  // Show loading indicator in the table body
  const tableBody = document.querySelector('tbody');
  if (tableBody) {
    const rowCount = tableBody.children.length;
    tableBody.innerHTML = `<tr><td colspan="4" class="text-center"><i class="fas fa-spinner fa-spin me-2"></i>Loading attendance for ${selectedDate}...</td></tr>`;
  }
  
  try {
    // Load students with attendance data for the selected date
    const params = new URLSearchParams({
      slot_year: slotYear,
      semester_type: semesterType,
      course_code: courseCode,
      employee_id: employeeId,
      venue: venue,
      slot_day: slotDay,
      slot_name: slotName,
      slot_time: slotTime,
      attendance_date: selectedDate
    });

    console.log("🌐 Making API call to load students for date:", `${window.API_URL}/attendance/students?${params}`);
    const response = await fetch(`${window.API_URL}/attendance/students?${params}`, {
      headers: { "x-access-token": localStorage.getItem("token") }
    });

    console.log("📡 Students API Response status:", response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Students API Error:", errorText);
      throw new Error("Failed to load students for selected date");
    }
    
    const responseData = await response.json();
    console.log("👥 Students response data for date:", responseData);
    
    // Handle both old and new response formats
    const students = responseData.students || responseData;
    
    console.log("📊 Number of students:", students.length);
    
    if (students.length === 0) {
      console.warn("⚠️ No students found for this course session");
      showAlert("No students found for this course session on the selected date.", "warning");
      return;
    }
    
    // Update the table with new data
    updateAttendanceTable(students, selectedDate);
    
    // Show success message
    const hasExistingAttendance = students.some(student => student.current_status);
    if (hasExistingAttendance) {
      showAlert(`Loaded existing attendance for ${selectedDate}. You can modify and save changes.`, "info");
    } else {
      showAlert(`No attendance recorded yet for ${selectedDate}. Mark attendance and save.`, "info");
    }

  } catch (error) {
    console.error("Error loading attendance for date:", error);
    showAlert(`Error loading attendance for ${selectedDate}. Please try again.`, "error");
    
    // Restore the table
    if (tableBody) {
      tableBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Please select a valid date to load attendance</td></tr>';
    }
  }
}

// Update attendance table with new student data
// The issue is that after date changes, Bootstrap radio buttons lose functionality
// Solution: Regenerate the entire interface instead of just updating the table
function updateAttendanceTable(students, attendanceDate) {
  // Get the save button to extract current parameters
  const saveButton = document.querySelector('[onclick*="saveAttendanceData"]');
  if (!saveButton) {
    console.error("Could not find save button to extract parameters");
    return;
  }

  const onclick = saveButton.getAttribute('onclick');
  const params = onclick.match(/saveAttendanceData\('([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)'\)/);
  
  if (params) {
    const [, courseCode, employeeId, venue, slotDay, slotName, slotTime, slotYear, semesterType] = params;
    
    console.log("🔄 Regenerating attendance interface with new data for date:", attendanceDate);
    
    // Regenerate the entire interface - this ensures Bootstrap radio buttons work properly
    showAttendanceMarkingInterface(students, courseCode, employeeId, venue, slotDay, slotName, slotTime, slotYear, semesterType, attendanceDate);
  } else {
    console.error("Could not parse save button parameters");
  }
}

// Make functions available globally
window.initializeAttendance = initializeAttendance;
window.loadFacultyCourses = loadFacultyCourses;
window.selectCourseForAttendance = selectCourseForAttendance;
window.loadAttendanceMarkingInterface = loadAttendanceMarkingInterface;
window.bulkMarkAttendance = bulkMarkAttendance;
window.saveAttendanceData = saveAttendanceData;
window.viewAttendanceReports = viewAttendanceReports;
window.viewAbsentRecords = viewAbsentRecords;
window.loadAbsentRecords = loadAbsentRecords;
window.reloadAttendanceForDate = reloadAttendanceForDate;

// ===== STUDENT ATTENDANCE VIEWING FUNCTIONS =====

// Initialize student attendance functionality (for testing)
async function initializeStudentAttendance() {
  console.log("🎓 Initializing student attendance...");
  const overviewDiv = document.getElementById("student-attendance-overview");
  const detailsDiv = document.getElementById("student-attendance-details");
  
  if (!overviewDiv || !detailsDiv) {
    console.error("Student attendance containers not found");
    return;
  }

  try {
    // Fetch student courses with attendance
    const response = await fetch(`${window.API_URL}/attendance/student/courses`, {
      headers: {
        "x-access-token": localStorage.getItem("token")
      }
    });

    if (!response.ok) {
      throw new Error("Failed to fetch attendance data");
    }

    const courses = await response.json();
    console.log("📚 Student courses loaded:", courses);

    if (courses.length === 0) {
      overviewDiv.innerHTML = `
        <div class="alert alert-info text-center">
          <i class="fas fa-info-circle me-2"></i>
          You have no registered courses for attendance tracking.
        </div>
      `;
      return;
    }

    // Display courses with attendance
    let coursesHtml = `
      <div class="row">
        ${courses.map(course => {
          const attendanceColor = course.attendance_percentage >= 75 ? 'success' : 
                                 course.attendance_percentage >= 60 ? 'warning' : 'danger';
          const meetsRequirement = !course.theory || course.attendance_percentage >= 75;
          
          return `
            <div class="col-md-6 mb-3">
              <div class="card h-100" style="cursor: pointer;" onclick="viewStudentAttendanceDetails('${course.course_code}', '${course.slot_year}', '${course.semester_type}')">
                <div class="card-body">
                  <h6 class="card-title">${course.course_code} - ${course.course_name}</h6>
                  <p class="text-muted mb-2">${course.slot_year} | ${course.semester_type}</p>
                  
                  <div class="mb-3">
                    <div class="d-flex justify-content-between mb-1">
                      <span>Attendance</span>
                      <span class="badge bg-${attendanceColor}">${course.attendance_percentage || 0}%</span>
                    </div>
                    <div class="progress" style="height: 20px;">
                      <div class="progress-bar bg-${attendanceColor}" role="progressbar" 
                           style="width: ${course.attendance_percentage || 0}%"
                           aria-valuenow="${course.attendance_percentage || 0}" 
                           aria-valuemin="0" aria-valuemax="100">
                      </div>
                    </div>
                  </div>
                  
                  <div class="d-flex justify-content-between text-muted small">
                    <span>${course.present_classes || 0}/${course.total_classes || 0} classes</span>
                    ${course.theory > 0 ? 
                      `<span class="badge ${meetsRequirement ? 'bg-success' : 'bg-danger'}">
                        ${meetsRequirement ? '✓ Meets 75%' : '✗ Below 75%'}
                      </span>` : 
                      '<span class="badge bg-info">Lab Only</span>'
                    }
                  </div>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
      
      <div class="mt-3 text-muted">
        <small><i class="fas fa-info-circle me-1"></i>Click on a course to view detailed attendance records</small>
      </div>
    `;
    
    overviewDiv.innerHTML = coursesHtml;
    
    // Reset details section
    detailsDiv.innerHTML = `<p class="text-muted">Select a course above to view detailed attendance records.</p>`;

  } catch (error) {
    console.error("Error loading student attendance:", error);
    overviewDiv.innerHTML = `
      <div class="alert alert-danger">
        <i class="fas fa-exclamation-triangle me-2"></i>
        Error loading attendance data. Please try again later.
      </div>
    `;
  }
}

// View detailed attendance for a course
async function viewStudentAttendanceDetails(courseCode, slotYear, semesterType) {
  console.log("📊 Viewing attendance details for:", courseCode);
  const detailsDiv = document.getElementById("student-attendance-details");
  
  if (!detailsDiv) return;

  // Show loading
  detailsDiv.innerHTML = `
    <div class="text-center">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p class="mt-2">Loading attendance details...</p>
    </div>
  `;

  try {
    const response = await fetch(
      `${window.API_URL}/attendance/student/report/${courseCode}/${slotYear}/${semesterType}`,
      {
        headers: {
          "x-access-token": localStorage.getItem("token")
        }
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch attendance details");
    }

    const data = await response.json();
    console.log("📋 Attendance details:", data);

    const { course_details, summary, attendance_records } = data;
    const attendanceColor = summary.attendance_percentage >= 75 ? 'success' : 
                           summary.attendance_percentage >= 60 ? 'warning' : 'danger';

    let detailsHtml = `
      <div class="mb-3">
        <button class="btn btn-sm btn-outline-primary" onclick="initializeStudentAttendance()">
          <i class="fas fa-arrow-left me-1"></i>Back to Courses
        </button>
      </div>

      <div class="card mb-4">
        <div class="card-header bg-primary">
          <h6 class="mb-0 text-white">${course_details.course_code} - ${course_details.course_name}</h6>
        </div>
        <div class="card-body">
          <div class="row">
            <div class="col-md-4">
              <div class="text-center">
                <h2 class="text-${attendanceColor}">${summary.attendance_percentage}%</h2>
                <p class="text-muted">Overall Attendance</p>
              </div>
            </div>
            <div class="col-md-8">
              <div class="row text-center">
                <div class="col-4">
                  <h5>${summary.present_classes}</h5>
                  <p class="text-muted">Present</p>
                </div>
                <div class="col-4">
                  <h5>${summary.absent_classes}</h5>
                  <p class="text-muted">Absent</p>
                </div>
                <div class="col-4">
                  <h5>${summary.total_classes}</h5>
                  <p class="text-muted">Total Classes</p>
                </div>
              </div>
              ${summary.minimum_required ? `
                <div class="alert ${summary.meets_requirement ? 'alert-success' : 'alert-danger'} mt-3">
                  <i class="fas ${summary.meets_requirement ? 'fa-check-circle' : 'fa-exclamation-triangle'} me-2"></i>
                  ${summary.meets_requirement ? 
                    'You meet the 75% attendance requirement for this theory course.' : 
                    `You need ${Math.ceil((0.75 * summary.total_classes) - summary.present_classes)} more present days to meet the 75% requirement.`
                  }
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header bg-primary">
          <h6 class="mb-0 text-white">Attendance History</h6>
        </div>
        <div class="card-body">
          ${attendance_records.length > 0 ? `
            <div class="table-responsive">
              <table class="table table-striped">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Day</th>
                    <th>Time</th>
                    <th>Venue</th>
                    <th>Faculty</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${attendance_records.map(record => `
                    <tr>
                      <td>${new Date(record.attendance_date).toLocaleDateString()}</td>
                      <td>${record.slot_day}</td>
                      <td>${record.slot_name} - ${record.slot_time}</td>
                      <td>${record.venue}</td>
                      <td>${record.faculty_name}</td>
                      <td>
                        <span class="badge bg-${
                          record.status === 'present' ? 'success' : 
                          record.status === 'absent' ? 'danger' : 'info'
                        }">
                          ${record.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : `
            <div class="text-center text-muted">
              <i class="fas fa-calendar-times fa-3x mb-3"></i>
              <p>No attendance records found yet.</p>
            </div>
          `}
        </div>
      </div>
    `;

    detailsDiv.innerHTML = detailsHtml;

  } catch (error) {
    console.error("Error loading attendance details:", error);
    detailsDiv.innerHTML = `
      <div class="alert alert-danger">
        <i class="fas fa-exclamation-triangle me-2"></i>
        Error loading attendance details. Please try again later.
      </div>
    `;
  }
}

// Export student functions
window.initializeStudentAttendance = initializeStudentAttendance;
window.viewStudentAttendanceDetails = viewStudentAttendanceDetails;

console.log("✅ Attendance system loaded in main.js, initializeAttendance is now:", typeof window.initializeAttendance);

// ===== END ATTENDANCE SYSTEM =====

// Format date string - made available globally
window.formatDate = function (dateString) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
};

// Global logout functionality for all user types
function handleGlobalLogout() {
  console.log("Global logout initiated");

  // Clear storage
  localStorage.removeItem("token");

  // Clear user data
  if (typeof currentUser !== "undefined") currentUser = null;
  if (typeof currentStudent !== "undefined") currentStudent = null;

  // Reset to login state
  document.body.classList.remove("authenticated");
  document.body.classList.add("login-state");

  // Hide all interfaces
  const adminInterface = document.querySelector("body > .container-fluid");
  const studentInterface = document.getElementById("student-interface");

  if (adminInterface) {
    adminInterface.style.display = "none";
  }

  if (studentInterface) {
    studentInterface.classList.add("d-none");
    studentInterface.classList.remove("show");
  }

  // Show login modal after brief delay
  setTimeout(() => {
    const loginModal = new bootstrap.Modal(
      document.getElementById("loginModal")
    );
    loginModal.show();
  }, 100);

  // Show logout message
  if (typeof showAlert === "function") {
    showAlert("Logged out successfully", "info");
  }
}
// Initialize global logout functionality
document.addEventListener("DOMContentLoaded", () => {
  // Handle logout button clicks for all user types
  const logoutLinks = document.querySelectorAll(
    '#logout-link, [data-logout="true"]'
  );
  logoutLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      handleGlobalLogout();
    });
  });
});

// Global logout functionality for all user types
function handleGlobalLogout() {
  console.log("Global logout initiated");

  // Add blank background class for all users
  document.body.classList.add("login-state");

  // Clear storage
  localStorage.removeItem("token");

  // Clear user data
  if (typeof currentUser !== "undefined") currentUser = null;
  if (typeof currentStudent !== "undefined") currentStudent = null;

  // Hide all interfaces
  const adminInterface = document.querySelector("body > .container-fluid");
  const studentInterface = document.getElementById("student-interface");

  if (adminInterface) {
    adminInterface.style.display = "none";
  }

  if (studentInterface) {
    studentInterface.classList.add("d-none");
  }

  // Show login modal after brief delay
  setTimeout(() => {
    const loginModal = new bootstrap.Modal(
      document.getElementById("loginModal")
    );
    loginModal.show();

    // Remove blank background class when modal is fully shown
    loginModal._element.addEventListener(
      "shown.bs.modal",
      () => {
        document.body.classList.remove("login-state");
      },
      { once: true }
    );
  }, 100);

  // Show logout message
  if (typeof showAlert === "function") {
    showAlert("Logged out successfully", "info");
  }
}

// Initialize global logout functionality
document.addEventListener("DOMContentLoaded", () => {
  // Handle logout button clicks for all user types
  const logoutLinks = document.querySelectorAll(
    '#logout-link, [data-logout="true"]'
  );
  logoutLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      handleGlobalLogout();
    });
  });
});

// ===== PAGE LOAD AUTHENTICATION CHECK (Fixed Version) =====

// Start with login state
document.body.className = "login-state";

document.addEventListener("DOMContentLoaded", () => {
  console.log("Page loaded - checking authentication...");

  const token = localStorage.getItem("token");

  if (!token) {
    // No token - show login modal
    console.log("No token - showing login modal");

    setTimeout(() => {
      const loginModal = new bootstrap.Modal(
        document.getElementById("loginModal")
      );
      loginModal.show();
    }, 300);
  } else {
    // Token exists - verify it
    console.log("Token found - verifying...");

    fetch(`${window.API_URL}/auth/me`, {
      headers: { "x-access-token": token },
    })
      .then((response) => {
        if (!response.ok) throw new Error("Invalid token");
        return response.json();
      })
      .then((user) => {
        console.log("Valid session found:", user.role);

        if (user.role === "student") {
          // CRITICAL: Set student classes automatically
          document.body.className = "authenticated student-user";
          console.log("Set student classes automatically");

          // Set current student data
          currentStudent = user;

          // Update header if possible
          if (typeof updateStudentHeader === "function") {
            updateStudentHeader(user);
          }
        } else {
          // Admin/staff - set admin classes
          document.body.className = "authenticated admin-user";

          // Update UI elements
          const userNameElement = document.getElementById("user-name");
          const userRoleElement = document.getElementById("user-role");
          if (userNameElement) userNameElement.textContent = user.full_name;
          if (userRoleElement) userRoleElement.textContent = user.role;

          // Set current user
          currentUser = user;

          // Load dashboard data if available
          if (typeof loadDashboardData === "function") {
            loadDashboardData();
          }
        }
      })
      .catch((error) => {
        console.log("Invalid session - showing login");
        localStorage.removeItem("token");

        setTimeout(() => {
          const loginModal = new bootstrap.Modal(
            document.getElementById("loginModal")
          );
          loginModal.show();
        }, 300);
      });
  }
});
// ===== BOOTSTRAP DEBUG (Add temporarily) =====
document.addEventListener("DOMContentLoaded", () => {
  console.log("Bootstrap available:", typeof bootstrap !== "undefined");
  console.log("Login modal element:", document.getElementById("loginModal"));

  // If bootstrap is not available, let's try a fallback
  if (typeof bootstrap === "undefined") {
    console.error("Bootstrap is not loaded!");
  }
});
