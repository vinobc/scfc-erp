// Force HTTP protocol
if (window.location.protocol === "https:") {
  window.location.protocol = "http:";
}

// Global variables
const API_URL = 'http://35.200.229.112/api';
let currentUser = null;

// DOM elements - will be initialized after DOM loads
let contentPages;
let navLinks;
let pageTitle;
let userNameElement;
let userRoleElement;
let alertContainer;

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  console.log("main.js: DOM loaded");
  
  // Initialize DOM elements
  contentPages = document.querySelectorAll('.content-page');
  navLinks = document.querySelectorAll('.nav-link');
  pageTitle = document.getElementById('page-title');
  userNameElement = document.getElementById('user-name');
  userRoleElement = document.getElementById('user-role');
  alertContainer = document.getElementById('alert-container');
  
  // Check if user is logged in
  checkAuthStatus();
  
  // Setup navigation
  setupNavigation();

  // Setup logout functionality
  const logoutLink = document.getElementById('logout-link');
  if (logoutLink) {
    logoutLink.addEventListener('click', handleLogout);
  }
});

// Authentication status check
function checkAuthStatus() {
  console.log("main.js: Checking auth status");
  const token = localStorage.getItem('token');
  
  if (!token) {
    showLoginModal();
    return;
  }
  
  // Get current user info
  fetch(`${API_URL}/auth/me`, {
    headers: {
      'Authorization': token
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Authentication failed');
    }
    return response.json();
  })
  .then(user => {
    currentUser = user;
    if (userNameElement) userNameElement.textContent = user.full_name;
    if (userRoleElement) userRoleElement.textContent = user.role;
    
    // Load dashboard data
    loadDashboardData();
  })
  .catch(error => {
    console.error('Auth check error:', error);
    localStorage.removeItem('token');
    showLoginModal();
  });
}

// Setup navigation between pages
function setupNavigation() {
  if (!navLinks || navLinks.length === 0) {
    console.error("Navigation links not found");
    return;
  }
  
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      
      const targetId = link.getAttribute('id');
      if (targetId === 'logout-link') return;
      
      const targetPage = targetId.replace('-link', '-page');
      
      // Update active navigation
      navLinks.forEach(navLink => navLink.classList.remove('active'));
      link.classList.add('active');
      
      // Show target page
      const targetElement = document.getElementById(targetPage);
      if (targetElement) {
        contentPages.forEach(page => page.classList.remove('active'));
        targetElement.classList.add('active');
        
        // Update page title
        if (pageTitle) pageTitle.textContent = link.textContent.trim();
        
        // Load page-specific data
        if (targetPage === 'schools-page') {
          if (typeof loadSchools === 'function') {
            loadSchools();
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
  const schoolsCount = document.getElementById('schools-count');
  const programsCount = document.getElementById('programs-count');
  const studentsCount = document.getElementById('students-count');
  const coursesCount = document.getElementById('courses-count');
  
  // For now, just clear the counts
  if (schoolsCount) schoolsCount.textContent = '...';
  if (programsCount) programsCount.textContent = '...';
  if (studentsCount) studentsCount.textContent = '...';
  if (coursesCount) coursesCount.textContent = '...';
  
  // Fetch schools count for dashboard
  fetch(`${API_URL}/schools`, {
    headers: {
      'Authorization': localStorage.getItem('token')
    }
  })
  .then(response => response.json())
  .then(schools => {
    if (schoolsCount) schoolsCount.textContent = schools.length;
  })
  .catch(error => {
    console.error('Error fetching schools count:', error);
    if (schoolsCount) schoolsCount.textContent = '?';
  });
  
  // Other counts would be fetched similarly once those APIs are implemented
}

// Handle logout
function handleLogout(e) {
  e.preventDefault();
  console.log("main.js: Logging out");
  
  // Send logout request to the server
  fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    headers: {
      'Authorization': localStorage.getItem('token')
    }
  })
  .finally(() => {
    // Clear local storage and redirect to login
    localStorage.removeItem('token');
    currentUser = null;
    showLoginModal();
  });
}

// Show login modal
function showLoginModal() {
  console.log("main.js: Showing login modal");
  const loginModalElement = document.getElementById('loginModal');
  if (loginModalElement) {
    const loginModal = new bootstrap.Modal(loginModalElement);
    loginModal.show();
  } else {
    console.error('Login modal element not found');
  }
}

// Show alert message - made available globally
window.showAlert = function(message, type = 'info', timeout = 5000) {
  if (!alertContainer) {
    console.error('Alert container not found');
    console.log(message); // Log the message instead
    return;
  }
  
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
  alertDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;
  
  alertContainer.appendChild(alertDiv);
  
  if (timeout) {
    setTimeout(() => {
      alertDiv.classList.remove('show');
      setTimeout(() => alertDiv.remove(), 150);
    }, timeout);
  }
};

// Format date string - made available globally
window.formatDate = function(dateString) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
};