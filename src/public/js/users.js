// DOM elements
let usersTableBody;
let createFacultyUserBtn;
let createCoordinatorUserBtn;

// Global data
let currentUsers = [];

// Initialize users functionality
document.addEventListener("DOMContentLoaded", () => {
  console.log("users.js: DOM loaded");

  // Initialize elements
  usersTableBody = document.getElementById("users-table");
  createFacultyUserBtn = document.getElementById("create-faculty-user-btn");
  createCoordinatorUserBtn = document.getElementById(
    "create-coordinator-user-btn"
  );
  const createAdminUserBtn = document.getElementById("create-admin-user-btn");

  // Setup event listeners
  if (createFacultyUserBtn) {
    createFacultyUserBtn.addEventListener("click", () => {
      showCreateFacultyUserModal();
    });
  }

  if (createCoordinatorUserBtn) {
    createCoordinatorUserBtn.addEventListener("click", () => {
      showCreateCoordinatorUserModal();
    });
  }

  if (createAdminUserBtn) {
    createAdminUserBtn.addEventListener("click", () => {
      showCreateAdminUserModal();
    });
  }

  // Setup navigation
  setupUsersNavigation();
});

// Setup navigation for users page
function setupUsersNavigation() {
  const usersLink = document.getElementById("users-link");

  if (usersLink) {
    usersLink.addEventListener("click", (e) => {
      e.preventDefault();
      showUsersPage();
    });
  }
}

// Show users page
function showUsersPage() {
  console.log("Showing users page");

  // Hide all other pages
  document.querySelectorAll(".content-page").forEach((page) => {
    page.classList.remove("active");
  });

  // Show users page
  const usersPage = document.getElementById("users-page");
  if (usersPage) {
    usersPage.classList.add("active");
  }

  // Update page title
  const pageTitle = document.getElementById("page-title");
  if (pageTitle) {
    pageTitle.textContent = "User Management";
  }

  // Update navigation
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.classList.remove("active");
  });
  const usersLink = document.getElementById("users-link");
  if (usersLink) {
    usersLink.classList.add("active");
  }

  // Load users data
  loadUsers();
}

// Load users
function loadUsers() {
  if (!usersTableBody) return;

  usersTableBody.innerHTML =
    '<tr><td colspan="8" class="text-center">Loading users...</td></tr>';

  fetch(`${window.API_URL}/users`, {
    headers: {
      Authorization: localStorage.getItem("token"),
    },
  })
    .then((response) => response.json())
    .then((users) => {
      currentUsers = users;
      renderUsers(users);
    })
    .catch((error) => {
      console.error("Error loading users:", error);
      usersTableBody.innerHTML =
        '<tr><td colspan="8" class="text-center text-danger">Error loading users</td></tr>';
    });
}

// Render users table
function renderUsers(users) {
  if (!usersTableBody) return;

  if (users.length === 0) {
    usersTableBody.innerHTML =
      '<tr><td colspan="8" class="text-center">No users found</td></tr>';
    return;
  }

  usersTableBody.innerHTML = "";

  users.forEach((user) => {
    const row = document.createElement("tr");

    // Format last login
    const lastLogin = user.last_login
      ? window.formatDate
        ? window.formatDate(user.last_login)
        : user.last_login
      : "Never";

    // Role badge
    let roleBadge = "";
    switch (user.role) {
      case "admin":
        roleBadge = '<span class="badge bg-danger">Admin</span>';
        break;
      case "timetable_coordinator":
        roleBadge = '<span class="badge bg-warning">Coordinator</span>';
        break;
      case "faculty":
        roleBadge = '<span class="badge bg-info">Faculty</span>';
        break;
      default:
        roleBadge = `<span class="badge bg-secondary">${user.role}</span>`;
    }

    // Status badge
    const statusBadge = user.is_active
      ? '<span class="badge bg-success">Active</span>'
      : '<span class="badge bg-secondary">Inactive</span>';

    row.innerHTML = `
      <td>${user.full_name}</td>
      <td>${user.username}</td>
      <td>${roleBadge}</td>
      <td>${user.employee_id || "N/A"}</td>
      <td>${user.school_short_name || "N/A"}</td>
      <td>${lastLogin}</td>
      <td>${statusBadge}</td>
      <td>
  ${
    user.role !== "admin"
      ? `
    <button class="btn btn-sm btn-outline-primary edit-user-btn" 
      data-user-id="${user.user_id}">
      <i class="fas fa-edit"></i>
    </button>
    ${
      user.role === "faculty" || user.role === "timetable_coordinator"
        ? `<button class="btn btn-sm btn-outline-warning reset-user-password-btn" 
          data-user-id="${user.user_id}" 
          data-user-name="${user.full_name}"
          data-employee-id="${user.employee_id}"
          title="Reset Password">
          <i class="fas fa-key"></i>
        </button>`
        : ""
    }
    <button class="btn btn-sm btn-outline-danger delete-user-btn" 
      data-user-id="${user.user_id}" 
      data-user-name="${user.full_name}">
      <i class="fas fa-trash"></i>
    </button>
  `
      : `
    <span class="text-muted">Protected</span>
  `
  }
</td>
    `;
    usersTableBody.appendChild(row);
  });

  // Add event listeners
  document.querySelectorAll(".edit-user-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const userId = btn.getAttribute("data-user-id");
      editUser(userId);
    });
  });

  document.querySelectorAll(".delete-user-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const userId = btn.getAttribute("data-user-id");
      const userName = btn.getAttribute("data-user-name");
      confirmDeleteUser(userId, userName);
    });
  });

  // Reset password buttons
  document.querySelectorAll(".reset-user-password-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const userId = btn.getAttribute("data-user-id");
      const userName = btn.getAttribute("data-user-name");
      const employeeId = btn.getAttribute("data-employee-id");
      confirmResetUserPassword(userId, userName, employeeId);
    });
  });
}

// Show create faculty user modal
function showCreateFacultyUserModal() {
  // For now, use a simple prompt - in a full implementation you'd use a proper modal
  const employeeId = prompt("Enter Employee ID of faculty member:");
  if (employeeId) {
    createFacultyUser(employeeId, "faculty");
  }
}

// Show create coordinator user modal
function showCreateCoordinatorUserModal() {
  // For now, use a simple prompt - in a full implementation you'd use a proper modal
  const employeeId = prompt(
    "Enter Employee ID of faculty member to make coordinator:"
  );
  if (employeeId) {
    createFacultyUser(employeeId, "timetable_coordinator");
  }
}

// Show create admin user modal
function showCreateAdminUserModal() {
  const adminName = prompt(
    "Enter admin name (letters, numbers, underscore only):"
  );
  if (!adminName) return;

  const fullName = prompt("Enter full name for the admin:");
  if (!fullName) return;

  createAdminUser(adminName, fullName);
}

// Create faculty user
function createFacultyUser(employeeId, role) {
  const userData = {
    employee_id: parseInt(employeeId),
    role: role,
  };

  fetch(`${window.API_URL}/users/faculty`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: localStorage.getItem("token"),
    },
    body: JSON.stringify(userData),
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
      showAlert(
        `User account created successfully! Username: ${data.user.username}, Password: ${data.defaultPassword}`,
        "success",
        10000
      );
      loadUsers(); // Refresh the table
    })
    .catch((error) => {
      console.error("Create user error:", error);
      showAlert(error.message || "Failed to create user account", "danger");
    });
}

// Create admin user
function createAdminUser(adminName, fullName) {
  const userData = {
    admin_name: adminName,
    full_name: fullName,
  };

  fetch(`${window.API_URL}/users/admin`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: localStorage.getItem("token"),
    },
    body: JSON.stringify(userData),
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
      showAlert(
        `Admin account created successfully! Username: ${data.user.username}, Password: ${data.defaultPassword}`,
        "success",
        15000
      );
      loadUsers(); // Refresh the table
    })
    .catch((error) => {
      console.error("Create admin user error:", error);
      showAlert(error.message || "Failed to create admin account", "danger");
    });
}

// Edit user (placeholder)
function editUser(userId) {
  showAlert(
    "Edit functionality will be implemented in a future update",
    "info"
  );
}

// Confirm delete user
function confirmDeleteUser(userId, userName) {
  if (
    confirm(
      `Are you sure you want to delete user account for ${userName}? This action cannot be undone.`
    )
  ) {
    deleteUser(userId);
  }
}

// Delete user
function deleteUser(userId) {
  fetch(`${window.API_URL}/users/${userId}`, {
    method: "DELETE",
    headers: {
      Authorization: localStorage.getItem("token"),
    },
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((data) => {
          throw new Error(data.message);
        });
      }
      return response.json();
    })
    .then(() => {
      showAlert("User deleted successfully", "success");
      loadUsers(); // Refresh the table
    })
    .catch((error) => {
      console.error("Delete user error:", error);
      showAlert(error.message || "Failed to delete user", "danger");
    });
}

// Confirm and reset user password
function confirmResetUserPassword(userId, userName, employeeId) {
  if (
    confirm(
      `Are you sure you want to reset the password for ${userName}?\n\nThis will reset their password to the default format: Faculty@${employeeId}`
    )
  ) {
    resetUserPassword(userId, userName, employeeId);
  }
}

// Reset user password to default
function resetUserPassword(userId, userName, employeeId) {
  fetch(`${window.API_URL}/users/${userId}/reset-password`, {
    method: "PUT",
    headers: {
      Authorization: localStorage.getItem("token"),
      "Content-Type": "application/json",
    },
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((data) => {
          throw new Error(data.message || "Failed to reset password");
        });
      }
      return response.json();
    })
    .then((data) => {
      showAlert(
        `Password reset successful for ${data.user_name}!<br><br>
       <strong>Username:</strong> ${data.username}<br>
       <strong>New Password:</strong> ${data.new_password}<br>
       <strong>Role:</strong> ${data.role}<br><br>
       <small>Please share these credentials with the user.</small>`,
        "success",
        10000
      );
    })
    .catch((error) => {
      console.error("Reset user password error:", error);
      showAlert(error.message, "danger");
    });
}

// Show alert message - use existing alert container
function showAlert(message, type = "info", timeout = 5000) {
  const alertContainer = document.getElementById("alert-container");
  if (!alertContainer) {
    console.log(`Alert: ${message}`);
    return;
  }

  // Make sure container is visible and positioned
  alertContainer.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9999;
    width: 400px;
  `;

  const alertId = `alert-${Date.now()}`;

  const alertHTML = `
    <div id="${alertId}" class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
  `;

  // Add to container (don't clear existing alerts)
  alertContainer.insertAdjacentHTML("beforeend", alertHTML);

  // Auto-dismiss after timeout
  if (timeout) {
    setTimeout(() => {
      const alert = document.getElementById(alertId);
      if (alert) {
        alert.remove();
      }
    }, timeout);
  }
}
