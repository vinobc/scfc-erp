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
      // Coordinator sees: Dashboard, TimeTable (view only), Logout
      [navItems.dashboard, navItems.timetable, navItems.logout].forEach(
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
      // Faculty sees: Dashboard, TimeTable (VIEW ONLY), Logout
      [navItems.dashboard, navItems.logout].forEach((item) => {
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
