// DOM elements will be initialized in the DOMContentLoaded event
let studentsTableBody;
let addStudentBtn;
let saveStudentBtn;
let importStudentsBtn;
let uploadStudentsBtn;
let studentSearchInput;
let studentProgramFilter;
let studentSchoolFilter;
let studentYearFilter;

// Student form elements
let studentForm;
let studentEnrollmentInput;
// studentUserIdInput removed - user_id will be set automatically when user account is created
let studentNameInput;
let studentProgramInput;
let studentSchoolInput;
let studentYearInput;
let studentEmailInput;

// Import form elements
let studentFileInput;
let studentFileInfo;

// Modal elements
let studentModal;
let studentImportModal;
let studentDeleteModal;
let studentModalLabel;
let confirmStudentDeleteBtn;
let studentDeleteEnrollment;
let studentDeleteName;

// Bulk status elements
let bulkStatusBtn;
let bulkStatusModal;
let selectAllYearsCheckbox;
let yearsCheckboxContainer;
let previewBulkUpdateBtn;
let executeBulkUpdateBtn;
let bulkPreviewDiv;

// Initialize students functionality
document.addEventListener("DOMContentLoaded", () => {
  console.log("students.js: DOM loaded");

  // Initialize DOM elements
  studentsTableBody = document.getElementById("students-table");
  addStudentBtn = document.getElementById("add-student-btn");
  saveStudentBtn = document.getElementById("save-student-btn");
  importStudentsBtn = document.getElementById("import-students-btn");
  uploadStudentsBtn = document.getElementById("upload-students-btn");
  studentSearchInput = document.getElementById("student-search-input");
  studentProgramFilter = document.getElementById("student-program-filter");
  studentSchoolFilter = document.getElementById("student-school-filter");
  studentYearFilter = document.getElementById("student-year-filter");
  bulkStatusBtn = document.getElementById("bulk-status-btn");

  // Initialize form elements
  studentForm = document.getElementById("student-form");
  studentEnrollmentInput = document.getElementById("student-enrollment-field");
  // studentUserIdInput removed - user_id field no longer exists in form
  studentNameInput = document.getElementById("student-name-field");
  studentProgramInput = document.getElementById("student-program-field");
  studentSchoolInput = document.getElementById("student-school-field");
  studentYearInput = document.getElementById("student-year-field");
  studentEmailInput = document.getElementById("student-email-field");

  // Initialize import form elements
  studentFileInput = document.getElementById("student-file-input");
  studentFileInfo = document.getElementById("student-file-info");

  // Initialize modal elements
  studentModalLabel = document.getElementById("studentModalLabel");
  studentDeleteEnrollment = document.getElementById(
    "student-delete-enrollment"
  );
  studentDeleteName = document.getElementById("student-delete-name");
  confirmStudentDeleteBtn = document.getElementById(
    "confirm-student-delete-btn"
  );

  // Initialize bulk status elements
  selectAllYearsCheckbox = document.getElementById("select-all-years");
  yearsCheckboxContainer = document.getElementById("years-checkbox-container");
  previewBulkUpdateBtn = document.getElementById("preview-bulk-update-btn");
  executeBulkUpdateBtn = document.getElementById("execute-bulk-update-btn");
  bulkPreviewDiv = document.getElementById("bulk-preview");

  // Initialize Bootstrap modal objects
  const studentModalElement = document.getElementById("studentModal");
  const studentImportModalElement = document.getElementById(
    "importStudentsModal"
  );
  const studentDeleteModalElement =
    document.getElementById("studentDeleteModal");
  const bulkStatusModalElement = document.getElementById("bulkStatusModal");

  if (studentModalElement) {
    studentModal = new bootstrap.Modal(studentModalElement);
  }

  if (studentImportModalElement) {
    studentImportModal = new bootstrap.Modal(studentImportModalElement);
  }

  if (studentDeleteModalElement) {
    studentDeleteModal = new bootstrap.Modal(studentDeleteModalElement);
  }

  if (bulkStatusModalElement) {
    bulkStatusModal = new bootstrap.Modal(bulkStatusModalElement);
  }

  // Setup event listeners
  if (addStudentBtn) {
    console.log("students.js: Add student button found");
    addStudentBtn.addEventListener("click", handleAddStudent);
  }

  if (saveStudentBtn) {
    saveStudentBtn.addEventListener("click", handleSaveStudent);
  }

  if (importStudentsBtn) {
    importStudentsBtn.addEventListener("click", () => {
      if (studentImportModal) studentImportModal.show();
    });
  }

  if (studentFileInput) {
    studentFileInput.addEventListener("change", handleFileSelected);
  }

  if (uploadStudentsBtn) {
    uploadStudentsBtn.addEventListener("click", handleUploadStudents);
  }

  if (confirmStudentDeleteBtn) {
    confirmStudentDeleteBtn.addEventListener(
      "click",
      handleStudentDeleteConfirm
    );
  }

  // Add event listener for create user accounts
  const createUserAccountsBtn = document.getElementById(
    "create-user-accounts-btn"
  );
  if (createUserAccountsBtn) {
    createUserAccountsBtn.addEventListener(
      "click",
      showCreateUserAccountsModal
    );
  }

  // Add event listeners for bulk status functionality
  if (bulkStatusBtn) {
    bulkStatusBtn.addEventListener("click", showBulkStatusModal);
  }

  if (selectAllYearsCheckbox) {
    selectAllYearsCheckbox.addEventListener("change", handleSelectAllYears);
  }

  if (previewBulkUpdateBtn) {
    previewBulkUpdateBtn.addEventListener("click", previewBulkUpdate);
  }

  if (executeBulkUpdateBtn) {
    executeBulkUpdateBtn.addEventListener("click", executeBulkUpdate);
  }

  if (studentSearchInput) {
    studentSearchInput.addEventListener("input", filterStudents);
  }

  if (studentProgramFilter) {
    studentProgramFilter.addEventListener("change", filterStudents);
  }

  if (studentSchoolFilter) {
    studentSchoolFilter.addEventListener("change", filterStudents);
  }

  if (studentYearFilter) {
    studentYearFilter.addEventListener("change", filterStudents);
  }

  // Initial load of dropdowns
  loadDropdowns();

  // Initial load of students when the page loads
  const studentsLink = document.getElementById("students-link");
  if (studentsLink) {
    studentsLink.addEventListener("click", () => {
      loadStudents();
    });
  }
});

// Load all dropdowns (programs, schools, years)
function loadDropdowns() {
  // Load programs dropdown
  fetch(`${window.API_URL}/programs`, {
    headers: {
      Authorization: localStorage.getItem("token"),
    },
  })
    .then((response) => response.json())
    .then((programs) => {
      if (studentProgramFilter) {
        let options = '<option value="all">All Programs</option>';
        programs.forEach((program) => {
          options += `<option value="${program.program_name_short}">${program.program_name_short}</option>`;
        });
        studentProgramFilter.innerHTML = options;
      }

      if (studentProgramInput) {
        let options = '<option value="">Select a program</option>';
        programs.forEach((program) => {
          if (program.is_active) {
            options += `<option value="${program.program_name_short}">${program.program_name_short} - ${program.program_name_long}</option>`;
          }
        });
        studentProgramInput.innerHTML = options;
      }
    })
    .catch((error) => {
      console.error("Load programs error:", error);
    });

  // Load schools dropdown
  fetch(`${window.API_URL}/schools`, {
    headers: {
      Authorization: localStorage.getItem("token"),
    },
  })
    .then((response) => response.json())
    .then((schools) => {
      if (studentSchoolFilter) {
        let options = '<option value="all">All Schools</option>';
        schools.forEach((school) => {
          options += `<option value="${school.school_short_name}">${school.school_short_name}</option>`;
        });
        studentSchoolFilter.innerHTML = options;
      }

      if (studentSchoolInput) {
        let options = '<option value="">Select a school</option>';
        schools.forEach((school) => {
          if (school.is_active) {
            options += `<option value="${school.school_short_name}">${school.school_short_name} - ${school.school_long_name}</option>`;
          }
        });
        studentSchoolInput.innerHTML = options;
      }
    })
    .catch((error) => {
      console.error("Load schools error:", error);
    });
}

// Load all students from the API
function loadStudents() {
  console.log("students.js: Loading students");

  // Show loading state
  if (studentsTableBody) {
    studentsTableBody.innerHTML =
      '<tr><td colspan="9" class="text-center">Loading students...</td></tr>';
  }

  fetch(`${window.API_URL}/students`, {
    headers: {
      Authorization: localStorage.getItem("token"),
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to load students");
      }
      return response.json();
    })
    .then((students) => {
      if (students.length === 0) {
        if (studentsTableBody) {
          studentsTableBody.innerHTML =
            '<tr><td colspan="9" class="text-center">No students found. Add a new student or import students from Excel.</td></tr>';
        }
        return;
      }

      // Update the dashboard counter
      const studentsCount = document.getElementById("students-count");
      if (studentsCount) {
        studentsCount.textContent = students.length;
      }

      // Populate years filter if needed
      populateYearsFilter(students);

      // Render students
      renderStudents(students);
    })
    .catch((error) => {
      console.error("Load students error:", error);
      if (studentsTableBody) {
        studentsTableBody.innerHTML =
          '<tr><td colspan="9" class="text-center text-danger">Error loading students. Please try again.</td></tr>';
      }
      showAlert(
        "Failed to load students. Please refresh the page or try again later.",
        "danger"
      );
    });
}

// Populate years filter dropdown based on available data
function populateYearsFilter(students) {
  if (!studentYearFilter) return;

  // Get unique years
  const years = [
    ...new Set(students.map((student) => student.year_admitted)),
  ].sort((a, b) => b - a);

  let options = '<option value="all">All Years</option>';
  years.forEach((year) => {
    options += `<option value="${year}">${year}</option>`;
  });

  studentYearFilter.innerHTML = options;
}

// Render students in the table
function renderStudents(students) {
  if (!studentsTableBody) {
    console.error("Students table body element not found");
    return;
  }

  // Apply filters if any
  const searchTerm = studentSearchInput
    ? studentSearchInput.value.toLowerCase().trim()
    : "";
  const programFilter = studentProgramFilter
    ? studentProgramFilter.value
    : "all";
  const schoolFilter = studentSchoolFilter ? studentSchoolFilter.value : "all";
  const yearFilter = studentYearFilter ? studentYearFilter.value : "all";

  const filteredStudents = students.filter((student) => {
    // Apply program filter
    if (programFilter !== "all" && student.program_name !== programFilter) {
      return false;
    }

    // Apply school filter
    if (schoolFilter !== "all" && student.school_name !== schoolFilter) {
      return false;
    }

    // Apply year filter
    if (
      yearFilter !== "all" &&
      student.year_admitted.toString() !== yearFilter
    ) {
      return false;
    }

    // Apply search filter
    if (searchTerm) {
      return (
        student.enrollment_no.toLowerCase().includes(searchTerm) ||
        student.student_name.toLowerCase().includes(searchTerm) ||
        (student.email_id &&
          student.email_id.toLowerCase().includes(searchTerm)) ||
        false // user_id search removed
      );
    }

    return true;
  });

  if (filteredStudents.length === 0) {
    studentsTableBody.innerHTML =
      '<tr><td colspan="9" class="text-center">No students match your filters.</td></tr>';
    return;
  }

  // Clear previous content
  studentsTableBody.innerHTML = "";

  // Add each student to the table
  filteredStudents.forEach((student) => {
    const row = document.createElement("tr");
    
    // Add visual indicator for inactive students
    if (student.is_active === false) {
      row.style.opacity = "0.7";
      row.style.backgroundColor = "#f8f9fa";
    }

    row.innerHTML = `
      <td>${student.enrollment_no}</td>
      <!-- User ID column removed -->
      <td>${student.student_name}</td>
      <td>${student.program_name}</td>
      <td>${student.school_name}</td>
      <td>${student.year_admitted}</td>
      <td>${student.email_id || "-"}</td>
      <td>
        <button class="btn btn-sm ${student.is_active !== false ? 'btn-success' : 'btn-danger'} action-btn toggle-student-status-btn" 
                data-enrollment="${student.enrollment_no}" 
                data-name="${student.student_name}" 
                data-status="${student.is_active !== false ? 'active' : 'inactive'}"
                title="${student.is_active !== false ? 'Click to deactivate' : 'Click to activate'}">
          <i class="fas fa-power-off"></i> ${student.is_active !== false ? 'Active' : 'Inactive'}
        </button>
      </td>
      <td>
  <button class="btn btn-sm btn-primary action-btn edit-student-btn" data-enrollment="${
    student.enrollment_no
  }">
    <i class="fas fa-edit"></i>
  </button>
  <button class="btn btn-sm btn-warning action-btn reset-student-password-btn" data-enrollment="${
    student.enrollment_no
  }" data-name="${student.student_name}" title="Reset Password">
    <i class="fas fa-key"></i>
  </button>
  <button class="btn btn-sm btn-danger action-btn delete-student-btn" data-enrollment="${
    student.enrollment_no
  }" data-name="${student.student_name}">
    <i class="fas fa-trash"></i>
  </button>
</td>
    `;

    studentsTableBody.appendChild(row);
  });

  // Add event listeners to buttons
  addStudentButtonListeners();
}

// Add event listeners to student action buttons
function addStudentButtonListeners() {
  // Edit student buttons
  const editButtons = document.querySelectorAll(".edit-student-btn");
  editButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const enrollmentNo = button.getAttribute("data-enrollment");
      openEditStudentModal(enrollmentNo);
    });
  });

  // Delete student buttons
  const deleteButtons = document.querySelectorAll(".delete-student-btn");
  deleteButtons.forEach((button) => {
    const enrollmentNo = button.getAttribute("data-enrollment");
    const studentName = button.getAttribute("data-name");

    button.addEventListener("click", () => {
      openStudentDeleteModal(enrollmentNo, studentName);
    });
  });

  // Reset password buttons
  const resetPasswordButtons = document.querySelectorAll(
    ".reset-student-password-btn"
  );
  resetPasswordButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const enrollmentNo = button.getAttribute("data-enrollment");
      const studentName = button.getAttribute("data-name");
      confirmResetStudentPassword(enrollmentNo, studentName);
    });
  });

  // Toggle status buttons
  const toggleStatusButtons = document.querySelectorAll(
    ".toggle-student-status-btn"
  );
  toggleStatusButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const enrollmentNo = button.getAttribute("data-enrollment");
      const studentName = button.getAttribute("data-name");
      const currentStatus = button.getAttribute("data-status");
      confirmToggleStudentStatus(enrollmentNo, studentName, currentStatus);
    });
  });
}

// Filter students based on search, program, school, and year
function filterStudents() {
  // Get all students again and apply filters on the client side
  // This avoids making new API calls for simple filtering
  fetch(`${window.API_URL}/students`, {
    headers: {
      Authorization: localStorage.getItem("token"),
    },
  })
    .then((response) => response.json())
    .then((students) => {
      renderStudents(students);
    })
    .catch((error) => {
      console.error("Filter students error:", error);
    });
}

// Handle add student button click
function handleAddStudent() {
  // Reset form
  if (studentForm) studentForm.reset();

  // Enable enrollment field for new students
  if (studentEnrollmentInput) {
    studentEnrollmentInput.disabled = false;
  }

  // Update modal title
  if (studentModalLabel) studentModalLabel.textContent = "Add New Student";

  // Show modal
  if (studentModal) studentModal.show();
}

// Open edit student modal
function openEditStudentModal(enrollmentNo) {
  // Get student details
  fetch(`${window.API_URL}/students/${enrollmentNo}`, {
    headers: {
      Authorization: localStorage.getItem("token"),
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to get student details");
      }
      return response.json();
    })
    .then((student) => {
      // Fill form with student data
      if (studentEnrollmentInput) {
        studentEnrollmentInput.value = student.enrollment_no;
        studentEnrollmentInput.disabled = true; // Disable enrollment for editing
      }
      // studentUserIdInput no longer exists - user_id will be set when user account is created
      if (studentNameInput) studentNameInput.value = student.student_name;
      if (studentProgramInput) studentProgramInput.value = student.program_name;
      if (studentSchoolInput) studentSchoolInput.value = student.school_name;
      if (studentYearInput) studentYearInput.value = student.year_admitted;
      if (studentEmailInput) studentEmailInput.value = student.email_id || "";

      // Update modal title
      if (studentModalLabel) studentModalLabel.textContent = "Edit Student";

      // Show modal
      if (studentModal) studentModal.show();
    })
    .catch((error) => {
      console.error("Get student details error:", error);
      showAlert("Failed to load student details. Please try again.", "danger");
    });
}

// Open student delete modal
function openStudentDeleteModal(enrollmentNo, studentName) {
  // Set the values
  if (studentDeleteEnrollment)
    studentDeleteEnrollment.textContent = enrollmentNo;
  if (studentDeleteName) studentDeleteName.textContent = studentName;

  // Set the student ID on the delete button
  if (confirmStudentDeleteBtn) {
    confirmStudentDeleteBtn.setAttribute("data-enrollment", enrollmentNo);
  }

  // Show the modal
  if (studentDeleteModal) {
    studentDeleteModal.show();
  }
}

// Handle save student button click
function handleSaveStudent() {
  // Get form values
  const enrollmentNo = studentEnrollmentInput
    ? studentEnrollmentInput.value.trim()
    : "";
  // userId removed - will be set automatically when user account is created
  const studentName = studentNameInput ? studentNameInput.value.trim() : "";
  const programName = studentProgramInput ? studentProgramInput.value : "";
  const schoolName = studentSchoolInput ? studentSchoolInput.value : "";
  const yearAdmitted = studentYearInput ? studentYearInput.value : "";
  const emailId = studentEmailInput ? studentEmailInput.value.trim() : "";

  // Validate required fields (userId validation removed)
  if (
    !enrollmentNo ||
    !studentName ||
    !programName ||
    !schoolName ||
    !yearAdmitted
  ) {
    showAlert("Please fill all required fields.", "danger");
    return;
  }

  // Prepare data (user_id removed)
  const studentData = {
    enrollment_no: enrollmentNo,
    student_name: studentName,
    program_name: programName,
    school_name: schoolName,
    year_admitted: parseInt(yearAdmitted),
    email_id: emailId || null,
  };

  // Show loading state
  if (saveStudentBtn) {
    saveStudentBtn.disabled = true;
    saveStudentBtn.innerHTML =
      '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
  }

  // Determine if creating or updating
  const isEditing = studentEnrollmentInput && studentEnrollmentInput.disabled;
  const method = isEditing ? "PUT" : "POST";
  const url = isEditing
    ? `${window.API_URL}/students/${enrollmentNo}`
    : `${window.API_URL}/students`;

  fetch(url, {
    method: method,
    headers: {
      "Content-Type": "application/json",
      Authorization: localStorage.getItem("token"),
    },
    body: JSON.stringify(studentData),
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((data) => {
          throw new Error(data.message || "Failed to save student");
        });
      }
      return response.json();
    })
    .then((data) => {
      // Hide modal
      if (studentModal) studentModal.hide();

      // Show success message
      showAlert(data.message, "success");

      // Reload students
      loadStudents();
    })
    .catch((error) => {
      console.error("Save student error:", error);
      showAlert(error.message, "danger");
    })
    .finally(() => {
      // Reset button state
      if (saveStudentBtn) {
        saveStudentBtn.disabled = false;
        saveStudentBtn.innerHTML = "Save";
      }
    });
}

// Handle file selection for import
function handleFileSelected() {
  if (!studentFileInput || !studentFileInfo || !uploadStudentsBtn) return;

  const file = studentFileInput.files[0];
  if (!file) {
    studentFileInfo.textContent = "";
    uploadStudentsBtn.disabled = true;
    return;
  }

  // Check file type
  const validTypes = [
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];
  if (!validTypes.includes(file.type)) {
    studentFileInfo.textContent =
      "Invalid file type. Please upload an Excel file (.xlsx or .xls).";
    studentFileInfo.classList.add("text-danger");
    uploadStudentsBtn.disabled = true;
    return;
  }

  // Display file info
  studentFileInfo.textContent = `Selected: ${file.name} (${formatFileSize(
    file.size
  )})`;
  studentFileInfo.classList.remove("text-danger");
  uploadStudentsBtn.disabled = false;
}

// Format file size for display
function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Handle upload students button click
function handleUploadStudents() {
  if (!studentFileInput || !uploadStudentsBtn) return;

  const file = studentFileInput.files[0];
  if (!file) {
    showAlert("Please select a file first.", "danger");
    return;
  }

  // Create FormData
  const formData = new FormData();
  formData.append("file", file);

  // Show loading state
  uploadStudentsBtn.disabled = true;
  uploadStudentsBtn.innerHTML =
    '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Uploading...';

  // Upload file
  fetch(`${window.API_URL}/students/import`, {
    method: "POST",
    headers: {
      Authorization: localStorage.getItem("token"),
    },
    body: formData,
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((data) => {
          throw new Error(data.message || "Failed to import students");
        });
      }
      return response.json();
    })
    .then((data) => {
      // Hide modal
      if (studentImportModal) studentImportModal.hide();

      // Show success message with details
      let message = data.message;
      if (
        data.results &&
        data.results.errors &&
        data.results.errors.length > 0
      ) {
        message += `<br><br>Errors (${data.results.errors.length}):`;
        message += '<ul class="mb-0">';
        // Show first 5 errors
        const errorsToShow = data.results.errors.slice(0, 5);
        errorsToShow.forEach((error) => {
          message += `<li>Row ${error.row}: ${error.message}</li>`;
        });
        if (data.results.errors.length > 5) {
          message += `<li>...and ${
            data.results.errors.length - 5
          } more errors</li>`;
        }
        message += "</ul>";
      }

      showAlert(
        message,
        data.results.errors.length > 0 ? "warning" : "success"
      );

      // Reload students
      loadStudents();
    })
    .catch((error) => {
      console.error("Import students error:", error);
      showAlert(error.message, "danger");
    })
    .finally(() => {
      // Reset button state
      uploadStudentsBtn.disabled = false;
      uploadStudentsBtn.innerHTML = "Upload";

      // Reset file input
      studentFileInput.value = "";
      if (studentFileInfo) {
        studentFileInfo.textContent = "";
      }
    });
}

// Handle confirm delete button click
function handleStudentDeleteConfirm() {
  if (!confirmStudentDeleteBtn) return;

  const enrollmentNo = confirmStudentDeleteBtn.getAttribute("data-enrollment");

  // Show loading state
  confirmStudentDeleteBtn.disabled = true;
  confirmStudentDeleteBtn.innerHTML =
    '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Deleting...';

  fetch(`${window.API_URL}/students/${enrollmentNo}`, {
    method: "DELETE",
    headers: {
      Authorization: localStorage.getItem("token"),
    },
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((data) => {
          throw new Error(data.message || "Failed to delete student");
        });
      }
      return response.json();
    })
    .then((data) => {
      // Hide modal
      if (studentDeleteModal) studentDeleteModal.hide();

      // Show success message
      showAlert(data.message, "success");

      // Reload students
      loadStudents();
    })
    .catch((error) => {
      console.error("Delete student error:", error);
      showAlert(error.message, "danger");

      // Hide modal
      if (studentDeleteModal) studentDeleteModal.hide();
    })
    .finally(() => {
      // Reset button state
      if (confirmStudentDeleteBtn) {
        confirmStudentDeleteBtn.disabled = false;
        confirmStudentDeleteBtn.innerHTML = "Delete";
      }
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

// Confirm and reset student password
function confirmResetStudentPassword(enrollmentNo, studentName) {
  if (
    confirm(
      `Are you sure you want to reset the password for ${studentName} (${enrollmentNo})?\n\nThis will reset their password to the default format: Student@${enrollmentNo}`
    )
  ) {
    resetStudentPassword(enrollmentNo, studentName);
  }
}

// Reset student password to default
function resetStudentPassword(enrollmentNo, studentName) {
  fetch(`${window.API_URL}/students/${enrollmentNo}/reset-password`, {
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
        `Password reset successful for ${data.student_name}!<br><br>
       <strong>Username:</strong> ${data.username}<br>
       <strong>New Password:</strong> ${data.new_password}<br><br>
       <small>Please share these credentials with the student.</small>`,
        "success",
        10000
      );
    })
    .catch((error) => {
      console.error("Reset student password error:", error);
      showAlert(error.message, "danger");
    });
}

// Show students without user accounts and allow creating them
function showCreateUserAccountsModal() {
  // Get all students and check which ones don't have user accounts
  fetch(`${window.API_URL}/students`, {
    headers: {
      Authorization: localStorage.getItem("token"),
    },
  })
    .then((response) => response.json())
    .then((students) => {
      // For now, we'll use a simple approach with prompt
      // In a full implementation, you'd create a proper modal
      const enrollmentNumbers = students.map((s) => s.enrollment_no);
      const selectedStudents = prompt(
        `Enter enrollment numbers separated by commas to create user accounts for:\n\nAvailable students: ${enrollmentNumbers
          .slice(0, 10)
          .join(", ")}${
          enrollmentNumbers.length > 10 ? "..." : ""
        }\n\nExample: A101,A102,A103`
      );

      if (selectedStudents) {
        const enrollmentList = selectedStudents
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s);
        if (enrollmentList.length > 0) {
          createStudentUserAccounts(enrollmentList);
        }
      }
    })
    .catch((error) => {
      console.error("Error fetching students:", error);
      showAlert("Failed to load students", "danger");
    });
}

// Confirm and toggle student status
function confirmToggleStudentStatus(enrollmentNo, studentName, currentStatus) {
  const newStatus = currentStatus === "active" ? "inactive" : "active";
  const action = currentStatus === "active" ? "deactivate" : "activate";
  
  if (
    confirm(
      `Are you sure you want to ${action} ${studentName} (${enrollmentNo})?\n\n${
        currentStatus === "active" 
          ? "The student will not be able to login to their portal." 
          : "The student will be able to login to their portal again."
      }`
    )
  ) {
    toggleStudentStatus(enrollmentNo, studentName);
  }
}

// Toggle student status
function toggleStudentStatus(enrollmentNo, studentName) {
  fetch(`${window.API_URL}/students/${enrollmentNo}/toggle-status`, {
    method: "PUT",
    headers: {
      Authorization: localStorage.getItem("token"),
      "Content-Type": "application/json",
    },
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((data) => {
          throw new Error(data.message || "Failed to toggle student status");
        });
      }
      return response.json();
    })
    .then((data) => {
      showAlert(
        `${data.student_name} has been ${data.is_active ? "activated" : "deactivated"} successfully!`,
        "success"
      );
      // Reload students to reflect the change
      loadStudents();
    })
    .catch((error) => {
      console.error("Toggle student status error:", error);
      showAlert(error.message, "danger");
    });
}

// Create user accounts for selected students
function createStudentUserAccounts(enrollmentNumbers) {
  fetch(`${window.API_URL}/students/create-users`, {
    method: "POST",
    headers: {
      Authorization: localStorage.getItem("token"),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      enrollment_numbers: enrollmentNumbers,
    }),
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((data) => {
          throw new Error(data.message || "Failed to create user accounts");
        });
      }
      return response.json();
    })
    .then((data) => {
      let message = data.message + "<br><br>";

      if (data.results.created.length > 0) {
        message += "<strong>Created Accounts:</strong><br>";
        data.results.created.forEach((student) => {
          message += `• ${student.student_name} (${student.enrollment_no}): ${student.default_password}<br>`;
        });
        message += "<br>";
      }

      if (data.results.skipped.length > 0) {
        message += "<strong>Skipped (already exists):</strong><br>";
        data.results.skipped.forEach((student) => {
          message += `• ${student.student_name} (${student.enrollment_no})<br>`;
        });
        message += "<br>";
      }

      if (data.results.errors.length > 0) {
        message += "<strong>Errors:</strong><br>";
        data.results.errors.forEach((error) => {
          message += `• ${error.enrollment_no}: ${error.message}<br>`;
        });
      }

      showAlert(
        message,
        data.results.errors.length > 0 ? "warning" : "success",
        15000
      );
    })
    .catch((error) => {
      console.error("Create user accounts error:", error);
      showAlert(error.message, "danger");
    });
}

// Bulk Status Functions
async function showBulkStatusModal() {
  try {
    // Load unique years
    const response = await fetch("/api/students/years", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch admission years");
    }

    const data = await response.json();
    populateYearsCheckboxes(data.years);
    
    if (bulkStatusModal) {
      bulkStatusModal.show();
    }
  } catch (error) {
    console.error("Error loading years:", error);
    showAlert("Failed to load admission years", "danger");
  }
}

function populateYearsCheckboxes(years) {
  if (!yearsCheckboxContainer) return;

  let checkboxesHtml = '';
  years.forEach(year => {
    checkboxesHtml += `
      <div class="form-check">
        <input class="form-check-input year-checkbox" type="checkbox" value="${year}" id="year-${year}">
        <label class="form-check-label" for="year-${year}">
          ${year}
        </label>
      </div>
    `;
  });
  
  yearsCheckboxContainer.innerHTML = checkboxesHtml;

  // Add event listeners to individual year checkboxes
  const yearCheckboxes = document.querySelectorAll('.year-checkbox');
  yearCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', updateSelectAllCheckbox);
  });
}

function handleSelectAllYears() {
  if (!selectAllYearsCheckbox || !yearsCheckboxContainer) return;

  const yearCheckboxes = yearsCheckboxContainer.querySelectorAll('.year-checkbox');
  const selectAll = selectAllYearsCheckbox.checked;

  yearCheckboxes.forEach(checkbox => {
    checkbox.checked = selectAll;
  });

  // Reset preview and execute button
  if (bulkPreviewDiv) {
    bulkPreviewDiv.classList.add('d-none');
  }
  if (executeBulkUpdateBtn) {
    executeBulkUpdateBtn.disabled = true;
  }
}

function updateSelectAllCheckbox() {
  if (!selectAllYearsCheckbox || !yearsCheckboxContainer) return;

  const yearCheckboxes = yearsCheckboxContainer.querySelectorAll('.year-checkbox');
  const checkedBoxes = yearsCheckboxContainer.querySelectorAll('.year-checkbox:checked');

  if (checkedBoxes.length === yearCheckboxes.length) {
    selectAllYearsCheckbox.checked = true;
    selectAllYearsCheckbox.indeterminate = false;
  } else if (checkedBoxes.length > 0) {
    selectAllYearsCheckbox.checked = false;
    selectAllYearsCheckbox.indeterminate = true;
  } else {
    selectAllYearsCheckbox.checked = false;
    selectAllYearsCheckbox.indeterminate = false;
  }

  // Reset preview and execute button
  if (bulkPreviewDiv) {
    bulkPreviewDiv.classList.add('d-none');
  }
  if (executeBulkUpdateBtn) {
    executeBulkUpdateBtn.disabled = true;
  }
}

async function previewBulkUpdate() {
  const selectedYears = getSelectedYears();
  const selectedStatus = getSelectedStatus();

  if (selectedYears.length === 0) {
    showAlert("Please select at least one year", "warning");
    return;
  }

  if (!selectedStatus) {
    showAlert("Please select a status (Active or Inactive)", "warning");
    return;
  }

  try {
    // Count students for preview
    const students = await getStudentsData();
    let affectedCount = 0;

    if (selectedYears.includes("all") || selectAllYearsCheckbox.checked) {
      affectedCount = students.length;
    } else {
      affectedCount = students.filter(student => 
        selectedYears.includes(student.year_admitted.toString())
      ).length;
    }

    // Show preview
    if (bulkPreviewDiv) {
      bulkPreviewDiv.innerHTML = `
        <strong>Preview:</strong><br>
        This will ${selectedStatus === 'active' ? 'activate' : 'deactivate'} 
        <strong>${affectedCount}</strong> students 
        ${selectedYears.includes("all") || selectAllYearsCheckbox.checked ? 'from all years' : `from year(s): ${selectedYears.join(', ')}`}.
      `;
      bulkPreviewDiv.classList.remove('d-none');
    }

    // Enable execute button
    if (executeBulkUpdateBtn) {
      executeBulkUpdateBtn.disabled = false;
    }

  } catch (error) {
    console.error("Error previewing bulk update:", error);
    showAlert("Failed to preview bulk update", "danger");
  }
}

async function executeBulkUpdate() {
  const selectedYears = getSelectedYears();
  const selectedStatus = getSelectedStatus();

  if (selectedYears.length === 0 || !selectedStatus) {
    showAlert("Please complete the preview first", "warning");
    return;
  }

  // Confirm action
  const yearText = selectedYears.includes("all") || selectAllYearsCheckbox.checked 
    ? "all years" 
    : `year(s) ${selectedYears.join(', ')}`;
  
  const confirmed = confirm(
    `Are you sure you want to ${selectedStatus === 'active' ? 'activate' : 'deactivate'} all students from ${yearText}?\n\nThis action cannot be undone.`
  );

  if (!confirmed) return;

  try {
    // Prepare request
    const requestYears = selectedYears.includes("all") || selectAllYearsCheckbox.checked 
      ? ["all"] 
      : selectedYears;

    const response = await fetch("/api/students/bulk-status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({
        years: requestYears,
        status: selectedStatus,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to update student status");
    }

    const data = await response.json();

    // Show success message
    showAlert(
      `${data.message}`,
      "success",
      10000
    );

    // Close modal
    if (bulkStatusModal) {
      bulkStatusModal.hide();
    }

    // Reload students to reflect changes
    loadStudents();

  } catch (error) {
    console.error("Error executing bulk update:", error);
    showAlert("Failed to execute bulk update", "danger");
  }
}

function getSelectedYears() {
  if (!yearsCheckboxContainer) return [];
  
  const checkedBoxes = yearsCheckboxContainer.querySelectorAll('.year-checkbox:checked');
  return Array.from(checkedBoxes).map(checkbox => checkbox.value);
}

function getSelectedStatus() {
  const activeRadio = document.getElementById('status-active');
  const inactiveRadio = document.getElementById('status-inactive');

  if (activeRadio && activeRadio.checked) return 'active';
  if (inactiveRadio && inactiveRadio.checked) return 'inactive';
  return null;
}

async function getStudentsData() {
  const response = await fetch("/api/students", {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch students");
  }

  const students = await response.json();
  return students || [];
}
