// DOM elements
const loginForm = document.getElementById("login-form");
const loginButton = document.getElementById("login-btn");
const loginAlert = document.getElementById("login-alert");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");

// Initialize the auth components
document.addEventListener("DOMContentLoaded", () => {
  setupLoginForm();
});

// Setup login form submission
function setupLoginForm() {
  loginButton.addEventListener("click", handleLogin);

  // Also handle form submission via Enter key
  loginForm.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleLogin();
    }
  });
}

// Handle login form submission
function handleLogin() {
  // Clear previous errors
  loginAlert.classList.add("d-none");

  // Get form values
  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  // Basic validation
  if (!username || !password) {
    showLoginError("Please enter both username and password.");
    return;
  }

  // Disable button and show loading state
  loginButton.disabled = true;
  loginButton.innerHTML =
    '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Logging in...';

  // Send login request
  fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Login failed");
      }
      return response.json();
    })
    .then((data) => {
      // Store token and user data
      localStorage.setItem("token", data.token);
      currentUser = data.user;

      // Update UI
      userNameElement.textContent = data.user.full_name;
      userRoleElement.textContent = data.user.role;

      // Close modal
      bootstrap.Modal.getInstance(document.getElementById("loginModal")).hide();

      // Reset form
      loginForm.reset();

      // Load dashboard data
      loadDashboardData();

      // Show welcome message
      showAlert(`Welcome back, ${data.user.full_name}!`, "success");
    })
    .catch((error) => {
      console.error("Login error:", error);
      showLoginError("Invalid username or password. Please try again.");
    })
    .finally(() => {
      // Reset button state
      loginButton.disabled = false;
      loginButton.innerHTML = "Login";
    });
}

// Show login error message
function showLoginError(message) {
  loginAlert.textContent = message;
  loginAlert.classList.remove("d-none");
}
