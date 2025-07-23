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

  // Initialize course withdrawal navigation
  const studentCourseWithdrawalLink = document.getElementById(
    "student-course-withdrawal-link"
  );
  if (studentCourseWithdrawalLink) {
    studentCourseWithdrawalLink.addEventListener("click", (e) => {
      e.preventDefault();
      showStudentPage("course-withdrawal");
    });
  }

  // Initialize student timetable navigation
  const studentTimetableLink = document.getElementById(
    "student-timetable-link"
  );
  if (studentTimetableLink) {
    studentTimetableLink.addEventListener("click", (e) => {
      e.preventDefault();
      showStudentPage("timetable");
    });
  }

  // Initialize student attendance navigation
  const studentAttendanceLink = document.getElementById(
    "student-attendance-link"
  );
  if (studentAttendanceLink) {
    studentAttendanceLink.addEventListener("click", (e) => {
      e.preventDefault();
      showStudentPage("attendance");
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

// Check course registration status and update navigation
async function checkAndUpdateRegistrationStatus() {
  try {
    console.log("🔍 Checking course registration status...");

    const response = await fetch(
      `${window.API_URL}/system-config/course-registration-status`,
      {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      }
    );

    if (!response.ok) {
      console.warn("Could not check registration status, assuming enabled");
      return;
    }

    const statusData = await response.json();
    console.log("📋 Registration status:", statusData);

    // Update navigation based on status
    updateCourseRegistrationNavigation(statusData.enabled, statusData.message);
  } catch (error) {
    console.error("❌ Error checking registration status:", error);
    // Fail-safe: assume registration is enabled if we can't check
    updateCourseRegistrationNavigation(
      true,
      "Course registration is available"
    );
  }
}

// Check course withdrawal status and update navigation
async function checkAndUpdateWithdrawalStatus() {
  try {
    console.log("🔍 Checking course withdrawal status...");

    const response = await fetch(
      `${window.API_URL}/course-withdrawal/withdrawal-status`,
      {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      }
    );

    if (!response.ok) {
      console.warn("Could not check withdrawal status, assuming enabled");
      return;
    }

    const statusData = await response.json();
    console.log("📋 Withdrawal status:", statusData);

    // Update navigation based on status
    updateCourseWithdrawalNavigation(statusData.enabled, statusData.message);
  } catch (error) {
    console.error("❌ Error checking withdrawal status:", error);
    // Fail-safe: assume withdrawal is disabled if we can't check (more conservative)
    updateCourseWithdrawalNavigation(
      false,
      "Course withdrawal status could not be determined"
    );
  }
}

// Update course registration navigation item
function updateCourseRegistrationNavigation(isEnabled, message) {
  const courseRegLink = document.getElementById(
    "student-course-registration-link"
  );
  const courseRegIcon = courseRegLink?.querySelector("i");

  if (!courseRegLink) {
    console.error("Course registration link not found");
    return;
  }

  if (isEnabled) {
    // Enable registration
    courseRegLink.classList.remove("disabled", "text-muted");
    courseRegLink.classList.add("text-white");
    courseRegLink.style.pointerEvents = "auto";
    courseRegLink.style.opacity = "1";

    if (courseRegIcon) {
      courseRegIcon.className = "fas fa-book-open me-2";
    }

    // Update link text
    courseRegLink.innerHTML = `
      <i class="fas fa-book-open me-2"></i>
      Course Registration
    `;

    console.log("✅ Course registration ENABLED for students");
  } else {
    // Disable registration
    courseRegLink.classList.add("disabled", "text-muted");
    courseRegLink.classList.remove("text-white");
    courseRegLink.style.pointerEvents = "none";
    courseRegLink.style.opacity = "0.5";

    if (courseRegIcon) {
      courseRegIcon.className = "fas fa-ban me-2";
    }

    // Update link text and add disabled indicator
    courseRegLink.innerHTML = `
      <i class="fas fa-ban me-2"></i>
      Course Registration (Disabled)
    `;

    // Store the disabled message for when user tries to click
    courseRegLink.setAttribute("data-disabled-message", message);

    console.log("❌ Course registration DISABLED for students");
  }
}

// Update course withdrawal navigation item
function updateCourseWithdrawalNavigation(isEnabled, message) {
  const courseWithdrawalLink = document.getElementById(
    "student-course-withdrawal-link"
  );
  const courseWithdrawalIcon = courseWithdrawalLink?.querySelector("i");

  if (!courseWithdrawalLink) {
    console.error("Course withdrawal link not found");
    return;
  }

  if (isEnabled) {
    // Enable withdrawal
    courseWithdrawalLink.classList.remove("disabled", "text-muted");
    courseWithdrawalLink.classList.add("text-white");
    courseWithdrawalLink.style.pointerEvents = "auto";
    courseWithdrawalLink.style.opacity = "1";

    if (courseWithdrawalIcon) {
      courseWithdrawalIcon.className = "fas fa-times-circle me-2";
    }

    // Update link text
    courseWithdrawalLink.innerHTML = `
      <i class="fas fa-times-circle me-2"></i>
      Course Withdrawal
    `;

    console.log("✅ Course withdrawal ENABLED for students");
  } else {
    // Disable withdrawal
    courseWithdrawalLink.classList.add("disabled", "text-muted");
    courseWithdrawalLink.classList.remove("text-white");
    courseWithdrawalLink.style.pointerEvents = "none";
    courseWithdrawalLink.style.opacity = "0.5";

    if (courseWithdrawalIcon) {
      courseWithdrawalIcon.className = "fas fa-ban me-2";
    }

    // Update link text and add disabled indicator
    courseWithdrawalLink.innerHTML = `
      <i class="fas fa-ban me-2"></i>
      Course Withdrawal (Disabled)
    `;

    // Store the disabled message for when user tries to click
    courseWithdrawalLink.setAttribute("data-disabled-message", message);

    console.log("❌ Course withdrawal DISABLED for students");
  }
}

// Show specific student page
function showStudentPage(pageType) {
  console.log("Showing student page:", pageType);

  // Check if trying to access disabled course registration
  if (pageType === "course-registration") {
    const courseRegLink = document.getElementById(
      "student-course-registration-link"
    );
    if (courseRegLink && courseRegLink.classList.contains("disabled")) {
      const message =
        courseRegLink.getAttribute("data-disabled-message") ||
        "Course registration is currently disabled by administration";
      showStudentAlert(message, "warning");
      return; // Don't navigate to the page
    }
  }

  // Check if trying to access disabled course withdrawal
  if (pageType === "course-withdrawal") {
    const courseWithdrawalLink = document.getElementById(
      "student-course-withdrawal-link"
    );
    if (courseWithdrawalLink && courseWithdrawalLink.classList.contains("disabled")) {
      const message =
        courseWithdrawalLink.getAttribute("data-disabled-message") ||
        "Course withdrawal is currently disabled by administration";
      showStudentAlert(message, "warning");
      return; // Don't navigate to the page
    }
  }

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

    case "course-withdrawal":
      const withdrawalContent = document.getElementById(
        "student-course-withdrawal-content"
      );
      if (withdrawalContent) {
        withdrawalContent.style.display = "block";
      }
      const withdrawalLink = document.getElementById(
        "student-course-withdrawal-link"
      );
      if (withdrawalLink) {
        withdrawalLink.classList.add("active");
      }
      const withdrawalTitleElement = document.getElementById("student-page-title");
      if (withdrawalTitleElement) {
        withdrawalTitleElement.textContent = "Course Withdrawal";
      }

      // Initialize course withdrawal if not already done
      if (typeof initializeCourseWithdrawal === "function") {
        initializeCourseWithdrawal();
      }
      break;

    case "timetable":
      const timetableContent = document.getElementById(
        "student-timetable-page"
      );
      if (timetableContent) {
        timetableContent.style.display = "block";
      }
      const timetableLink = document.getElementById("student-timetable-link");
      if (timetableLink) {
        timetableLink.classList.add("active");
      }
      const timetableTitleElement =
        document.getElementById("student-page-title");
      if (timetableTitleElement) {
        timetableTitleElement.textContent = "My Slot TimeTable";
      }

      // Initialize standalone timetable functionality
      if (typeof initializeStandaloneTimetable === "function") {
        initializeStandaloneTimetable();
      }
      break;

    case "attendance":
      const attendanceContent = document.getElementById(
        "student-attendance-page"
      );
      if (attendanceContent) {
        attendanceContent.style.display = "block";
      }
      const attendanceLink = document.getElementById("student-attendance-link");
      if (attendanceLink) {
        attendanceLink.classList.add("active");
      }
      const attendanceTitleElement = document.getElementById("student-page-title");
      if (attendanceTitleElement) {
        attendanceTitleElement.textContent = "My Attendance";
      }
      
      // Initialize student attendance functionality
      initializeStudentAttendance();
      break;
  }
}

// Initialize student interface navigation
async function initializeStudentNavigation() {
  // Check registration and withdrawal status first
  await checkAndUpdateRegistrationStatus();
  await checkAndUpdateWithdrawalStatus();

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

    // Show refresh message for proper functionality
    showStudentRefreshMessage();

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

// Initialize student attendance functionality
async function initializeStudentAttendance() {
  console.log("🎓 Initializing student attendance...");
  const contentDiv = document.getElementById("student-attendance-content");
  
  if (!contentDiv) {
    console.error("Attendance content div not found");
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
    console.log("📚 Courses loaded:", courses);

    if (courses.length === 0) {
      contentDiv.innerHTML = `
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
    
    contentDiv.innerHTML = coursesHtml;

  } catch (error) {
    console.error("Error loading attendance:", error);
    contentDiv.innerHTML = `
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
  const contentDiv = document.getElementById("student-attendance-content");
  
  if (!contentDiv) return;

  // Show loading
  contentDiv.innerHTML = `
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

    contentDiv.innerHTML = detailsHtml;

  } catch (error) {
    console.error("Error loading attendance details:", error);
    contentDiv.innerHTML = `
      <div class="alert alert-danger">
        <i class="fas fa-exclamation-triangle me-2"></i>
        Error loading attendance details. Please try again later.
      </div>
    `;
  }
}

// Make functions available globally
window.initializeStudentAttendance = initializeStudentAttendance;
window.viewStudentAttendanceDetails = viewStudentAttendanceDetails;

// Show refresh message after student login
function showStudentRefreshMessage() {
  const alertContainer = document.getElementById("student-alert-container");
  if (!alertContainer) return;

  const refreshAlert = document.createElement("div");
  refreshAlert.className =
    "alert alert-info alert-dismissible d-flex align-items-center";
  refreshAlert.id = "student-refresh-prompt-alert";
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

// Export functions for use in other files
window.handleStudentLoginSuccess = handleStudentLoginSuccess;
window.showStudentInterface = showStudentInterface;
window.showAdminInterface = showAdminInterface;
