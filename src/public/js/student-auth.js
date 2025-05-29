// Student authentication and interface management
let currentStudent = null;

// Initialize student auth components
document.addEventListener("DOMContentLoaded", () => {
  console.log("student-auth.js: DOM loaded");

  // Initialize student logout button
  const studentLogoutBtn = document.getElementById("student-logout-btn");
  if (studentLogoutBtn) {
    studentLogoutBtn.addEventListener("click", handleStudentLogout);
  }

  // Initialize password reset modal buttons
  const studentResetBtn = document.getElementById("student-reset-password-btn");
  if (studentResetBtn) {
    studentResetBtn.addEventListener("click", handleStudentPasswordReset);
  }

  const studentCancelBtn = document.getElementById("student-cancel-reset-btn");
  if (studentCancelBtn) {
    studentCancelBtn.addEventListener("click", handleCancelReset);
  }

  // Initialize student navigation
  setupStudentNavigation();

  // Check for existing student session
  checkExistingStudentSession();
});

// Setup student navigation event listeners
function setupStudentNavigation() {
  // Initialize student dashboard navigation
  const studentDashboardLink = document.getElementById(
    "student-dashboard-link"
  );
  if (studentDashboardLink) {
    studentDashboardLink.addEventListener("click", (e) => {
      e.preventDefault();
      showStudentPage("dashboard");
    });
  }

  // Initialize course registration navigation
  const studentCourseRegistrationLink = document.getElementById(
    "student-course-registration-link"
  );
  if (studentCourseRegistrationLink) {
    studentCourseRegistrationLink.addEventListener("click", (e) => {
      e.preventDefault();
      showStudentPage("course-registration");
    });
  }

  // Initialize voluntary password change
  const studentChangePasswordLink = document.getElementById(
    "student-change-password-link"
  );
  if (studentChangePasswordLink) {
    studentChangePasswordLink.addEventListener("click", (e) => {
      e.preventDefault();
      showVoluntaryPasswordModal();
    });
  }

  const voluntaryChangeBtn = document.getElementById(
    "voluntary-change-password-btn"
  );
  if (voluntaryChangeBtn) {
    voluntaryChangeBtn.addEventListener("click", handleVoluntaryPasswordChange);
  }
}

// Show specific student page
function showStudentPage(pageType) {
  console.log("Showing student page:", pageType);

  // Hide all student content pages
  const contentPages = document.querySelectorAll(".student-content-page");
  contentPages.forEach((page) => {
    page.style.display = "none";
  });

  // Remove active class from all nav links
  const navLinks = document.querySelectorAll("#student-sidebar .nav-link");
  navLinks.forEach((link) => {
    link.classList.remove("active");
  });

  // Show selected page and activate nav link
  switch (pageType) {
    case "dashboard":
      const dashboardContent = document.getElementById(
        "student-dashboard-content"
      );
      if (dashboardContent) {
        dashboardContent.style.display = "block";
      }
      const dashboardLink = document.getElementById("student-dashboard-link");
      if (dashboardLink) {
        dashboardLink.classList.add("active");
      }
      const pageTitle = document.getElementById("student-page-title");
      if (pageTitle) {
        pageTitle.textContent = "Student Dashboard";
      }
      break;

    case "course-registration":
      const courseContent = document.getElementById(
        "student-course-registration-content"
      );
      if (courseContent) {
        courseContent.style.display = "block";
      }
      const courseLink = document.getElementById(
        "student-course-registration-link"
      );
      if (courseLink) {
        courseLink.classList.add("active");
      }
      const courseTitleElement = document.getElementById("student-page-title");
      if (courseTitleElement) {
        courseTitleElement.textContent = "Course Registration";
      }

      // Initialize course registration if not already done
      if (typeof initializeCourseRegistration === "function") {
        initializeCourseRegistration();
      }
      break;
  }
}

// Initialize student interface navigation
function initializeStudentNavigation() {
  // Show dashboard by default
  showStudentPage("dashboard");
}

// Check on page load if we need to restore student interface
function checkExistingStudentSession() {
  console.log("Checking for existing student session...");

  const token = localStorage.getItem("token");
  if (token) {
    // Verify the token and get user info
    fetch(`${window.API_URL}/auth/me`, {
      headers: { "x-access-token": token },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Token invalid");
        }
        return response.json();
      })
      .then((user) => {
        console.log("Existing session found for:", user);

        if (user.role === "student") {
          console.log("Restoring student interface...");

          // Get full student data to check password reset status
          fetch(`${window.API_URL}/students/${user.username.split("@")[0]}`, {
            headers: { "x-access-token": token },
          })
            .then((response) => response.json())
            .then((studentData) => {
              console.log("Student data loaded:", studentData);
              console.log(
                "Must reset password:",
                studentData.must_reset_password
              );

              // Create the data structure expected by handleStudentLoginSuccess
              const loginData = {
                user: {
                  user_id: user.user_id,
                  username: user.username,
                  role: "student",
                  enrollment_no: studentData.enrollment_no,
                  student_name: studentData.student_name,
                  program_name: studentData.program_name,
                  school_name: studentData.school_name,
                  year_admitted: studentData.year_admitted,
                  must_reset_password: studentData.must_reset_password,
                },
                token: token,
                mustResetPassword: studentData.must_reset_password,
              };

              // Restore student interface
              hideAdminInterface();
              showStudentInterface();
              updateStudentHeader(loginData.user);
              currentStudent = loginData.user;

              // CRITICAL: Check if password reset is still required
              if (studentData.must_reset_password) {
                console.log("Password reset still required - showing modal");
                showPasswordResetModal();
              } else {
                console.log(
                  "Password reset not required - student can access system"
                );
                // Initialize student navigation
                initializeStudentNavigation();
              }

              console.log("Student interface restored successfully");
            })
            .catch((err) => {
              console.error("Error getting student data:", err);
              // If we can't get student data, force login
              localStorage.removeItem("token");
              window.location.reload();
            });
        }
      })
      .catch((error) => {
        console.log("No valid session found:", error);
        // Clear invalid token
        localStorage.removeItem("token");
      });
  }
}

// Handle student login success
function handleStudentLoginSuccess(data) {
  console.log("🔥 Student login success");

  // Store token and student data
  localStorage.setItem("token", data.token);
  currentStudent = data.user;

  // Check if password reset is required
  const needsPasswordReset =
    data.mustResetPassword || (data.user && data.user.must_reset_password);

  if (needsPasswordReset) {
    console.log("🔥 Password reset required");
    document.body.className = "student-password-reset";
    showPasswordResetModal();
  } else {
    console.log("🔥 Setting student interface");

    // CRITICAL: Set both classes for CSS to work
    document.body.className = "authenticated student-user";
    console.log("🔥 Body classes set to:", document.body.className);

    updateStudentHeader(data.user);
    showStudentAlert(`Welcome, ${data.user.student_name}!`, "success");

    // Initialize student navigation
    initializeStudentNavigation();
  }

  // Close login modal
  const loginModal = document.getElementById("loginModal");
  if (loginModal) {
    const modalInstance = bootstrap.Modal.getInstance(loginModal);
    if (modalInstance) modalInstance.hide();
  }
}

// Update student header with information
function updateStudentHeader(student) {
  const elements = {
    "student-enrollment-no": student.enrollment_no,
    "student-name": student.student_name,
    "student-school": student.school_name,
    "student-program": student.program_name,
    "student-year": student.year_admitted,
  };

  Object.entries(elements).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value || "-";
  });
}

// Show student interface
function showStudentInterface() {
  const studentInterface = document.getElementById("student-interface");

  if (studentInterface) {
    studentInterface.classList.remove("d-none");
  }

  // Keep background blank
  document.body.style.backgroundColor = "#f8f9fa";
}

// Hide admin interface
function hideAdminInterface() {
  const adminInterface = document.querySelector("body > .container-fluid");
  if (adminInterface) {
    adminInterface.style.display = "none";
  }
}

// Show admin interface (for regular users)
function showAdminInterface() {
  const adminInterface = document.querySelector("body > .container-fluid");
  const studentInterface = document.getElementById("student-interface");

  if (adminInterface) {
    adminInterface.style.display = "block";
  }

  if (studentInterface) {
    studentInterface.classList.add("d-none");
  }

  // Reset background
  document.body.style.backgroundColor = "";
}

// Show password reset modal
function showPasswordResetModal() {
  const modal = new bootstrap.Modal(
    document.getElementById("studentPasswordResetModal")
  );
  modal.show();
}

// Handle cancel reset - logout and login again
function handleCancelReset() {
  // Add blank background class
  document.body.classList.add("login-state");

  // Clear storage
  localStorage.removeItem("token");
  currentStudent = null;

  // Hide password reset modal
  const modal = bootstrap.Modal.getInstance(
    document.getElementById("studentPasswordResetModal")
  );
  if (modal) modal.hide();

  // Hide student interface
  const studentInterface = document.getElementById("student-interface");
  if (studentInterface) {
    studentInterface.classList.add("d-none");
  }

  // Show login modal after brief delay
  setTimeout(() => {
    const loginModal = new bootstrap.Modal(
      document.getElementById("loginModal")
    );
    loginModal.show();

    // Remove blank background class when modal is shown
    loginModal._element.addEventListener("shown.bs.modal", () => {
      document.body.classList.remove("login-state");
    });
  }, 300);

  // Show info message
  if (typeof showAlert === "function") {
    showAlert("Please login again", "info");
  }
}

// Handle student password reset
function handleStudentPasswordReset() {
  const newPassword = document.getElementById(
    "student-new-password-field"
  ).value;
  const confirmPassword = document.getElementById(
    "student-confirm-password-field"
  ).value;
  const alertDiv = document.getElementById("student-reset-alert");
  const resetBtn = document.getElementById("student-reset-password-btn");

  // Clear previous alerts
  alertDiv.className = "alert alert-info";
  alertDiv.textContent =
    "You must change your password before accessing the system.";

  // Validate inputs
  if (!newPassword || !confirmPassword) {
    showResetAlert("Please fill in both password fields.", "danger");
    return;
  }

  if (newPassword !== confirmPassword) {
    showResetAlert("Passwords do not match.", "danger");
    return;
  }

  // Show loading state
  resetBtn.disabled = true;
  resetBtn.innerHTML =
    '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Changing...';

  // Send reset request
  fetch(`${window.API_URL}/student-auth/reset-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-access-token": localStorage.getItem("token"),
    },
    body: JSON.stringify({ newPassword }),
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((err) => {
          throw err;
        });
      }
      return response.json();
    })
    .then((data) => {
      showResetAlert("Password changed successfully!", "success");

      // Update current student data
      if (currentStudent) {
        currentStudent.must_reset_password = false;
      }

      // Close modal and show student interface after 2 seconds
      setTimeout(() => {
        const modal = bootstrap.Modal.getInstance(
          document.getElementById("studentPasswordResetModal")
        );
        if (modal) modal.hide();

        // NOW show the student interface with proper isolation
        document.body.classList.remove("student-password-reset");
        document.body.classList.add("authenticated", "student-user");

        // Explicitly hide admin interface
        const adminInterface = document.querySelector(
          "body > .container-fluid"
        );
        if (adminInterface) {
          adminInterface.style.display = "none";
        }

        // Show student interface
        const studentInterface = document.getElementById("student-interface");
        if (studentInterface) {
          studentInterface.classList.remove("d-none");
          studentInterface.classList.add("show");
          studentInterface.style.display = "block";
        }

        // Update student header information
        updateStudentHeader(currentStudent);

        // Initialize student navigation
        initializeStudentNavigation();

        // Reset form
        document.getElementById("student-password-reset-form").reset();

        // Show welcome message
        showStudentAlert(`Welcome, ${currentStudent.student_name}!`, "success");
      }, 2000);
    })
    .catch((error) => {
      console.error("Password reset error:", error);
      showResetAlert(
        error.message || "Password change failed. Please try again.",
        "danger"
      );
    })
    .finally(() => {
      // Reset button state
      resetBtn.disabled = false;
      resetBtn.innerHTML = "Change Password";
    });
}

// Show alert in password reset modal
function showResetAlert(message, type) {
  const alertDiv = document.getElementById("student-reset-alert");
  alertDiv.className = `alert alert-${type}`;
  alertDiv.textContent = message;
}

// Handle student logout
function handleStudentLogout() {
  // Add blank background class
  document.body.classList.add("login-state");

  // Clear storage
  localStorage.removeItem("token");
  currentStudent = null;

  // Hide student interface
  const studentInterface = document.getElementById("student-interface");
  if (studentInterface) {
    studentInterface.classList.add("d-none");
  }

  // Show login modal after brief delay
  setTimeout(() => {
    const loginModal = new bootstrap.Modal(
      document.getElementById("loginModal")
    );
    loginModal.show();

    // Remove blank background class when modal is shown
    loginModal._element.addEventListener("shown.bs.modal", () => {
      document.body.classList.remove("login-state");
    });
  }, 100);

  // Show logout message
  if (typeof showAlert === "function") {
    showAlert("Logged out successfully", "info");
  }
}

// Show student alert message
function showStudentAlert(message, type = "info", timeout = 5000) {
  const alertContainer = document.getElementById("student-alert-container");
  if (!alertContainer) return;

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

// Show voluntary password change modal
function showVoluntaryPasswordModal() {
  // Reset form and alerts
  const form = document.getElementById("voluntary-password-form");
  if (form) form.reset();

  const alert = document.getElementById("voluntary-password-alert");
  if (alert) alert.classList.add("d-none");

  // Show modal
  const modal = new bootstrap.Modal(
    document.getElementById("studentVoluntaryPasswordModal")
  );
  modal.show();
}

// Handle voluntary password change
function handleVoluntaryPasswordChange() {
  const currentPassword = document.getElementById(
    "voluntary-current-password-field"
  ).value;
  const newPassword = document.getElementById(
    "voluntary-new-password-field"
  ).value;
  const confirmPassword = document.getElementById(
    "voluntary-confirm-password-field"
  ).value;
  const changeBtn = document.getElementById("voluntary-change-password-btn");

  // Clear previous alerts
  hideVoluntaryAlert();

  // Validate inputs
  if (!currentPassword || !newPassword || !confirmPassword) {
    showVoluntaryAlert("Please fill in all password fields.", "danger");
    return;
  }

  if (newPassword !== confirmPassword) {
    showVoluntaryAlert("New passwords do not match.", "danger");
    return;
  }

  if (currentPassword === newPassword) {
    showVoluntaryAlert(
      "New password cannot be the same as current password.",
      "danger"
    );
    return;
  }

  // Show loading state
  changeBtn.disabled = true;
  changeBtn.innerHTML =
    '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Changing...';

  // Send change request
  fetch(`${window.API_URL}/student-auth/change-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-access-token": localStorage.getItem("token"),
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((err) => {
          throw err;
        });
      }
      return response.json();
    })
    .then((data) => {
      showVoluntaryAlert("Password changed successfully!", "success");

      // Close modal after 2 seconds
      setTimeout(() => {
        const modal = bootstrap.Modal.getInstance(
          document.getElementById("studentVoluntaryPasswordModal")
        );
        if (modal) modal.hide();

        // Reset form
        document.getElementById("voluntary-password-form").reset();

        // Show success message in main area
        showStudentAlert("Password changed successfully!", "success");
      }, 2000);
    })
    .catch((error) => {
      console.error("Voluntary password change error:", error);
      showVoluntaryAlert(
        error.message || "Password change failed. Please try again.",
        "danger"
      );
    })
    .finally(() => {
      // Reset button state
      changeBtn.disabled = false;
      changeBtn.innerHTML = "Change Password";
    });
}

// Show alert in voluntary password modal
function showVoluntaryAlert(message, type) {
  const alertDiv = document.getElementById("voluntary-password-alert");
  if (alertDiv) {
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    alertDiv.classList.remove("d-none");
  }
}

// Hide alert in voluntary password modal
function hideVoluntaryAlert() {
  const alertDiv = document.getElementById("voluntary-password-alert");
  if (alertDiv) {
    alertDiv.classList.add("d-none");
  }
}

// Export functions for use in other files
window.handleStudentLoginSuccess = handleStudentLoginSuccess;
window.showStudentInterface = showStudentInterface;
window.showAdminInterface = showAdminInterface;
