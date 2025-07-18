// Force HTTP if needed
if (window.location.protocol === "https:") {
  window.location.protocol = "http:";
}

// DOM elements will be initialized in the setup function
let loginFormElement;
let loginButton;
let loginAlert;
let usernameInput;
let passwordInput;

// Initialize the auth components
document.addEventListener("DOMContentLoaded", () => {
  console.log("auth.js: DOM loaded");

  // Initialize DOM elements
  loginFormElement = document.getElementById("login-form");
  loginButton = document.getElementById("login-btn");
  loginAlert = document.getElementById("login-alert");
  usernameInput = document.getElementById("username-field");
  passwordInput = document.getElementById("password-field");

  if (loginButton) {
    console.log("auth.js: Login button found");
    setupLoginForm();
  } else {
    console.log("auth.js: Login button not found");
  }
});

// Setup login form submission
function setupLoginForm() {
  loginButton.addEventListener("click", handleLogin);

  // Also handle form submission via Enter key
  if (loginFormElement) {
    loginFormElement.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleLogin();
      }
    });
  }
}

// // Handle login form submission
// function handleLogin() {
//   console.log("auth.js: Login attempt");

//   // Clear previous errors
//   if (loginAlert) {
//     loginAlert.classList.add("d-none");
//   }

//   // Get form values - add checks to prevent errors
//   const username = usernameInput ? usernameInput.value.trim() : "";
//   const password = passwordInput ? passwordInput.value : "";

//   // Basic validation
//   if (!username || !password) {
//     showLoginError("Please enter both username and password.");
//     return;
//   }

//   // Disable button and show loading state
//   loginButton.disabled = true;
//   loginButton.innerHTML =
//     '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Logging in...';

//   // Send login request
//   fetch(`${window.API_URL}/auth/login`, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify({ username, password }),
//   })
//     .then((response) => {
//       if (!response.ok) {
//         throw new Error("Login failed");
//       }
//       return response.json();
//     })
//     .then((data) => {
//       // Store token and user data
//       localStorage.setItem("token", data.token);
//       currentUser = data.user;

//       // Update UI
//       const userNameElement = document.getElementById("user-name");
//       const userRoleElement = document.getElementById("user-role");
//       if (userNameElement) userNameElement.textContent = data.user.full_name;
//       if (userRoleElement) userRoleElement.textContent = data.user.role;

//       // Close modal
//       const loginModal = document.getElementById("loginModal");
//       if (loginModal) {
//         const modalInstance = bootstrap.Modal.getInstance(loginModal);
//         if (modalInstance) modalInstance.hide();
//       }

//       // Reset form
//       if (loginFormElement) loginFormElement.reset();

//       // Load dashboard data
//       if (typeof loadDashboardData === "function") {
//         loadDashboardData();
//       }

//       // Show welcome message
//       showAlert(`Welcome back, ${data.user.full_name}!`, "success");
//     })
//     .catch((error) => {
//       console.error("Login error:", error);
//       showLoginError("Invalid username or password. Please try again.");
//     })
//     .finally(() => {
//       // Reset button state
//       if (loginButton) {
//         loginButton.disabled = false;
//         loginButton.innerHTML = "Login";
//       }
//     });
// }

// Handle login form submission
function handleLogin() {
  console.log("auth.js: Login attempt");

  // Clear previous errors
  if (loginAlert) {
    loginAlert.classList.add("d-none");
  }

  // Get form values - add checks to prevent errors
  const username = usernameInput ? usernameInput.value.trim() : "";
  const password = passwordInput ? passwordInput.value : "";

  // Basic validation
  if (!username || !password) {
    showLoginError("Please enter both username and password.");
    return;
  }

  // Disable button and show loading state
  loginButton.disabled = true;
  loginButton.innerHTML =
    '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Logging in...';

  // Always try regular login first
  console.log("DEBUG - Trying regular auth endpoint first");
  fetch(`${window.API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  })
    .then((response) => {
      if (!response.ok) {
        // If regular login fails, try student login for @blr.amity.edu addresses
        if (username.endsWith("@blr.amity.edu")) {
          console.log("DEBUG - Regular login failed, trying student endpoint");
          return fetch(`${window.API_URL}/student-auth/login`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ username, password }),
          });
        }
        throw new Error("Login failed");
      }
      return response;
    })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Login failed");
      }
      return response.json();
    })
    .then((data) => {
      console.log("DEBUG - Login successful:", data);
      console.log("DEBUG - User role:", data.user.role);
      console.log("DEBUG - mustResetPassword:", data.mustResetPassword);

      // Store token
      localStorage.setItem("token", data.token);

      if (data.user.role === "student") {
        console.log("DEBUG - Handling as student login");
        if (typeof handleStudentLoginSuccess === "function") {
          handleStudentLoginSuccess(data);
        }
      } else {
        console.log("DEBUG - Handling as admin/staff/coordinator login");

        // Remove login state and add admin-specific classes
        document.body.classList.remove("login-state");
        document.body.classList.add("authenticated", "admin-user");

        // Explicitly hide student interface
        const studentInterface = document.getElementById("student-interface");
        if (studentInterface) {
          studentInterface.classList.add("d-none");
          studentInterface.classList.remove("show");
          studentInterface.style.display = "none";
        }

        // Handle admin/staff/faculty/coordinator login (existing logic)
        currentUser = data.user;

        // Update UI
        const userNameElement = document.getElementById("user-name");
        const userRoleElement = document.getElementById("user-role");
        if (userNameElement) userNameElement.textContent = data.user.full_name;
        if (userRoleElement) userRoleElement.textContent = data.user.role;

        // Update navigation based on role
        updateNavigationByRole(data.user.role);

        // Show refresh message for proper functionality
        showRefreshMessage();

        // Close modal
        const loginModal = document.getElementById("loginModal");
        if (loginModal) {
          const modalInstance = bootstrap.Modal.getInstance(loginModal);
          if (modalInstance) modalInstance.hide();
        }

        // Reset form
        if (loginFormElement) loginFormElement.reset();

        // Load dashboard data
        if (typeof loadDashboardData === "function") {
          loadDashboardData();
        }

        // Show welcome message
        showAlert(`Welcome back, ${data.user.full_name}!`, "success");
      }
    })
    .catch((error) => {
      console.error("Login error:", error);
      showLoginError("Invalid username or password. Please try again.");
    })
    .finally(() => {
      // Reset button state
      if (loginButton) {
        loginButton.disabled = false;
        loginButton.innerHTML = "Login";
      }
    });
}
// Try student login if regular login fails
function tryStudentLogin(username, password) {
  return fetch(`${window.API_URL}/student-auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  }).then((response) => {
    if (!response.ok) {
      throw new Error("Login failed");
    }
    return response.json();
  });
}

// Show login error message
function showLoginError(message) {
  if (loginAlert) {
    loginAlert.textContent = message;
    loginAlert.classList.remove("d-none");
  } else {
    alert(message);
  }
}

// Show alert message (defined in main.js, providing a fallback)
function showAlert(message, type = "info", timeout = 5000) {
  if (typeof window.showAlert === "function") {
    window.showAlert(message, type, timeout);
  } else {
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
}

// Show refresh message after login
function showRefreshMessage() {
  const alertContainer = document.getElementById("alert-container");
  if (!alertContainer) return;

  const refreshAlert = document.createElement("div");
  refreshAlert.className =
    "alert alert-info alert-dismissible d-flex align-items-center";
  refreshAlert.id = "refresh-prompt-alert";
  refreshAlert.innerHTML = `
    <i class="fas fa-info-circle me-2"></i>
    <div class="flex-grow-1">
      <strong>Please refresh the page to continue</strong> - Click the refresh button below or press F5 to access all features.
    </div>
    <button type="button" class="btn btn-sm btn-outline-primary me-2" onclick="window.location.reload()">
      <i class="fas fa-sync-alt me-1"></i> Refresh Now
    </button>
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;

  // Insert at the top of alerts
  alertContainer.insertBefore(refreshAlert, alertContainer.firstChild);
}
