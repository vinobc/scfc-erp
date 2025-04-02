// Global variables
const API_URL = "/api";
let currentUser = null;

// DOM elements
const contentPages = document.querySelectorAll(".content-page");
const navLinks = document.querySelectorAll(".nav-link");
const pageTitle = document.getElementById("page-title");
const userNameElement = document.getElementById("user-name");
const userRoleElement = document.getElementById("user-role");
const alertContainer = document.getElementById("alert-container");

// Initialize the application
document.addEventListener("DOMContentLoaded", () => {
  // Check if user is logged in
  checkAuthStatus();

  // Setup navigation
  setupNavigation();

  // Setup logout functionality
  document
    .getElementById("logout-link")
    .addEventListener("click", handleLogout);
});

// Authentication status check
function checkAuthStatus() {
  const token = localStorage.getItem("token");

  if (!token) {
    showLoginModal();
    return;
  }

  // Get current user info
  fetch(`${API_URL}/auth/me`, {
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
      userNameElement.textContent = user.full_name;
      userRoleElement.textContent = user.role;

      // Load dashboard data
      loadDashboardData();
    })
    .catch((error) => {
      console.error("Auth check error:", error);
      localStorage.removeItem("token");
      showLoginModal();
    });
}

// Setup navigation between pages
function setupNavigation() {
  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();

      const targetId = link.getAttribute("id");
      if (targetId === "logout-link") return;

      const targetPage = targetId.replace("-link", "-page");

      // Update active navigation
      navLinks.forEach((navLink) => navLink.classList.remove("active"));
      link.classList.add("active");

      // Show target page
      contentPages.forEach((page) => page.classList.remove("active"));
      document.getElementById(targetPage).classList.add("active");

      // Update page title
      pageTitle.textContent = link.textContent.trim();

      // Load page-specific data
      if (targetPage === "schools-page") {
        loadSchools();
      }
      // Add other page data loading as needed
    });
  });
}

// Load dashboard data
function loadDashboardData() {
  // For now, just clear the counts
  document.getElementById("schools-count").textContent = "...";
  document.getElementById("programs-count").textContent = "...";
  document.getElementById("students-count").textContent = "...";
  document.getElementById("courses-count").textContent = "...";

  // Fetch schools count for dashboard
  fetch(`${API_URL}/schools`, {
    headers: {
      Authorization: localStorage.getItem("token"),
    },
  })
    .then((response) => response.json())
    .then((schools) => {
      document.getElementById("schools-count").textContent = schools.length;
    })
    .catch((error) => {
      console.error("Error fetching schools count:", error);
      document.getElementById("schools-count").textContent = "?";
    });

  // Other counts would be fetched similarly once those APIs are implemented
}

// Handle logout
function handleLogout(e) {
  e.preventDefault();

  // Send logout request to the server
  fetch(`${API_URL}/auth/logout`, {
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
  const loginModal = new bootstrap.Modal(document.getElementById("loginModal"));
  loginModal.show();
}

// Show alert message
function showAlert(message, type = "info", timeout = 5000) {
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

// Format date string
function formatDate(dateString) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}
