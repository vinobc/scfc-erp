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

  // Setup mobile navigation
  setupMobileNavigation();
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

      const targetPage = targetId.replace("-link", "-page");
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
        } else if (targetPage === "attendance-page") {
          console.log("🎯 Navigating to attendance-page");
          console.log("🔍 initializeAttendance type:", typeof initializeAttendance);
          if (typeof initializeAttendance === "function") {
            console.log("✅ Calling initializeAttendance");
            initializeAttendance();
          } else {
            console.error("❌ initializeAttendance is not a function");
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

// ===== ATTENDANCE SYSTEM =====

// Global variables for attendance system
let currentSemesters = [];
let currentAllocations = [];
let selectedAllocation = null;
let enrolledStudents = [];

// Initialize attendance system
function initializeAttendance() {
  console.log("🎯 Initializing attendance system");
  console.log("🔍 API_URL:", window.API_URL);
  console.log("🔐 Token:", localStorage.getItem("token") ? "Present" : "Missing");
  loadAttendanceInterface();
}

// Load main attendance interface
async function loadAttendanceInterface() {
  console.log("📋 Loading attendance interface...");
  const content = document.getElementById("attendance-content");
  if (!content) {
    console.error("❌ attendance-content element not found!");
    return;
  }

  try {
    // Show loading state
    content.innerHTML = `
      <div class="d-flex justify-content-center align-items-center" style="min-height: 200px">
        <div class="text-center">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          <p class="mt-3">Loading available semesters...</p>
        </div>
      </div>
    `;

    // Fetch available semesters
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
    
    currentSemesters = await response.json();
    renderSemesterSelection();

  } catch (error) {
    console.error("Error loading attendance interface:", error);
    showAttendanceError("Error loading attendance system. Please try again.");
  }
}

// Render semester selection interface
function renderSemesterSelection() {
  const content = document.getElementById("attendance-content");
  
  if (!currentSemesters.length) {
    content.innerHTML = `
      <div class="alert alert-info text-center">
        <h5>📚 No Course Allocations Found</h5>
        <p>You don't have any course allocations assigned. Please contact the administrator.</p>
      </div>
    `;
    return;
  }

  let semesterOptions = currentSemesters
    .map(semester => 
      `<option value="${semester.slot_year}|${semester.semester_type}">
        ${semester.slot_year} - ${semester.semester_type}
      </option>`
    )
    .join("");

  content.innerHTML = `
    <div class="container-fluid">
      <div class="row">
        <div class="col-12">
          <div class="card">
            <div class="card-header bg-primary text-white">
              <h5 class="mb-0"><i class="fas fa-calendar-check me-2"></i>Faculty Attendance Management</h5>
            </div>
            <div class="card-body">
              
              <!-- Step 1: Academic Year & Semester Selection -->
              <div id="semester-selection-step" class="step-section">
                <h6 class="text-primary mb-3"><i class="fas fa-calendar-alt me-2"></i>Step 1: Select Academic Year & Semester</h6>
                <div class="row">
                  <div class="col-md-6">
                    <label for="semester-select" class="form-label">Academic Year & Semester</label>
                    <select id="semester-select" class="form-select">
                      <option value="">Select Academic Year & Semester</option>
                      ${semesterOptions}
                    </select>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label">&nbsp;</label>
                    <div>
                      <button id="load-courses-btn" class="btn btn-primary" onclick="loadFacultyCourses()" disabled>
                        <i class="fas fa-arrow-right me-2"></i>Load My Courses
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Step 2: Course Selection -->
              <div id="course-selection-step" class="step-section d-none mt-4">
                <h6 class="text-primary mb-3"><i class="fas fa-book me-2"></i>Step 2: Select Course for Attendance</h6>
                <div id="course-list">
                  <!-- Courses will be loaded here -->
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

  semesterSelect.addEventListener("change", function() {
    loadCoursesBtn.disabled = !this.value;
    // Hide subsequent steps when semester changes
    const courseStep = document.getElementById("course-selection-step");
    if (courseStep) courseStep.classList.add("d-none");
  });
}

// Load faculty courses for selected semester
async function loadFacultyCourses() {
  const semesterSelect = document.getElementById("semester-select");
  const courseSelectionStep = document.getElementById("course-selection-step");
  const courseList = document.getElementById("course-list");

  if (!semesterSelect.value) {
    showAlert("Please select a semester first", "warning");
    return;
  }

  const [slot_year, semester_type] = semesterSelect.value.split("|");

  try {
    // Show loading
    courseList.innerHTML = `
      <div class="text-center py-3">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mt-2">Loading your courses...</p>
      </div>
    `;
    courseSelectionStep.classList.remove("d-none");

    const response = await fetch(
      `${window.API_URL}/attendance/allocations?slot_year=${encodeURIComponent(slot_year)}&semester_type=${encodeURIComponent(semester_type)}`, 
      {
        headers: { "x-access-token": localStorage.getItem("token") }
      }
    );

    if (!response.ok) throw new Error("Failed to load faculty courses");
    
    currentAllocations = await response.json();
    renderCourseSelection();

  } catch (error) {
    console.error("Error loading faculty courses:", error);
    showAttendanceError("Error loading courses. Please try again.");
  }
}

// Render course selection
function renderCourseSelection() {
  const courseList = document.getElementById("course-list");

  if (!currentAllocations.length) {
    courseList.innerHTML = `
      <div class="alert alert-info">
        <h6>No courses found</h6>
        <p>You don't have any course allocations for the selected semester.</p>
      </div>
    `;
    return;
  }

  // Group allocations by course
  const courseGroups = {};
  currentAllocations.forEach(allocation => {
    const key = `${allocation.course_code}`;
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

  let coursesHtml = `<div class="row">`;

  Object.values(courseGroups).forEach(course => {
    const hasTheory = course.theory > 0;
    const badgeClass = hasTheory ? 'bg-success' : 'bg-info';
    const attendanceNote = hasTheory ? '75% attendance required for exams' : 'Lab course - attendance tracked, no 75% requirement';

    coursesHtml += `
      <div class="col-md-6 mb-3">
        <div class="card course-card h-100" style="cursor: pointer;" onclick="selectAttendanceCourse('${course.course_code}')">
          <div class="card-body">
            <h6 class="card-title">${course.course_code}</h6>
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

  coursesHtml += `</div>`;
  courseList.innerHTML = coursesHtml;
}

// Select course for attendance
function selectAttendanceCourse(courseCode) {
  const course = currentAllocations.filter(a => a.course_code === courseCode);
  
  if (!course.length) {
    showAlert("Course not found", "error");
    return;
  }

  // Show allocation selection for this course
  showAttendanceAllocationSelection(courseCode, course);
}

// Show allocation selection for course
function showAttendanceAllocationSelection(courseCode, allocations) {
  const courseList = document.getElementById("course-list");
  
  let allocationHtml = `
    <div class="card">
      <div class="card-header bg-primary">
        <div class="d-flex justify-content-between align-items-center">
          <h6 class="mb-0 text-white">${courseCode} - Select Class Session</h6>
          <button class="btn btn-sm btn-outline-light" onclick="renderCourseSelection()">
            <i class="fas fa-arrow-left me-1"></i>Back to Courses
          </button>
        </div>
      </div>
      <div class="card-body">
        <div class="row">
  `;

  allocations.forEach((allocation, index) => {
    allocationHtml += `
      <div class="col-md-6 mb-3">
        <div class="card allocation-card h-100" style="cursor: pointer;" 
             onclick="console.log('Slot clicked!'); loadAttendanceForSlot('${allocation.course_code}', '${allocation.employee_id}', '${allocation.venue}', '${allocation.slot_day}', '${allocation.slot_name}', '${allocation.slot_time}')">
          <div class="card-body">
            <h6 class="card-title">${allocation.slot_day} - ${allocation.slot_name}</h6>
            <p class="card-text">${allocation.slot_time}</p>
            <div class="text-muted">
              <small><i class="fas fa-map-marker-alt me-1"></i>Venue: ${allocation.venue}</small>
            </div>
          </div>
        </div>
      </div>
    `;
  });

  allocationHtml += `
        </div>
      </div>
    </div>
  `;

  courseList.innerHTML = allocationHtml;
}

// Load attendance for specific slot
async function loadAttendanceForSlot(course_code, employee_id, venue, slot_day, slot_name, slot_time, selectedDate = null) {
  console.log("🎯 loadAttendanceForSlot called with params:", {course_code, employee_id, venue, slot_day, slot_name, slot_time});
  
  const semesterSelect = document.getElementById("semester-select");
  if (!semesterSelect) {
    console.error("❌ semester-select element not found!");
    return;
  }
  
  const [slot_year, semester_type] = semesterSelect.value.split("|");
  console.log("📅 Semester info:", {slot_year, semester_type});
  
  selectedAllocation = {
    slot_year, semester_type, course_code, employee_id, 
    venue, slot_day, slot_name, slot_time
  };

  try {
    // Load enrolled students
    const params = new URLSearchParams(selectedAllocation);
    if (selectedDate) {
      params.append('attendance_date', selectedDate);
    }
    console.log("🌐 Making API call to:", `${window.API_URL}/attendance/students?${params}`);
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
    console.log("👥 Response data:", responseData);
    
    // Handle both old and new response formats
    enrolledStudents = responseData.students || responseData;
    const attendanceDate = responseData.attendance_date || new Date().toISOString().split('T')[0];
    
    console.log("📊 Number of students:", enrolledStudents.length);
    console.log("📅 Attendance date:", attendanceDate);
    
    if (enrolledStudents.length === 0) {
      console.warn("⚠️ No students found for this course session");
      showAlert("No students enrolled in this course session for TUE - L7+L8. Try a different time slot or check if students have registered for this course.", "warning");
      return;
    }
    
    console.log("✅ Calling showAttendanceMarkingInterface with date:", attendanceDate);
    showAttendanceMarkingInterface(attendanceDate);

  } catch (error) {
    console.error("Error loading students:", error);
    showAlert("Error loading students. Please try again.", "error");
  }
}

// Show attendance marking interface
function showAttendanceMarkingInterface(attendanceDate = null) {
  const defaultDate = attendanceDate || new Date().toISOString().split('T')[0];
  const courseList = document.getElementById("course-list");
  
  let interfaceHtml = `
    <div class="card">
      <div class="card-header bg-success text-white">
        <div class="row align-items-center">
          <div class="col">
            <h6 class="mb-0 text-white">📋 Mark Attendance: ${selectedAllocation.course_code}</h6>
            <small>${selectedAllocation.slot_day} ${selectedAllocation.slot_name} | ${selectedAllocation.slot_time} | ${selectedAllocation.venue}</small>
          </div>
          <div class="col-auto">
            <button class="btn btn-sm btn-outline-light" onclick="showAttendanceAllocationSelection('${selectedAllocation.course_code}', currentAllocations.filter(a => a.course_code === '${selectedAllocation.course_code}'))">
              <i class="fas fa-arrow-left me-1"></i>Back
            </button>
          </div>
        </div>
      </div>
      <div class="card-body">
        <div class="row mb-3">
          <div class="col-md-4">
            <label for="attendance-date" class="form-label">Attendance Date</label>
            <input type="date" id="attendance-date" class="form-control" value="${defaultDate}" onchange="reloadAttendanceForDate()">
          </div>
          <div class="col-md-8">
            <label class="form-label">Bulk Actions</label>
            <div>
              <button class="btn btn-sm btn-success me-2" onclick="bulkMarkAttendance('present')">
                <i class="fas fa-check me-1"></i>Mark All Present
              </button>
              <button class="btn btn-sm btn-danger me-2" onclick="bulkMarkAttendance('absent')">
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

  enrolledStudents.forEach((student, index) => {
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
            <label class="btn btn-outline-success btn-sm" for="present_${student.student_id}">Present</label>

            <input type="radio" class="btn-check" name="attendance_${student.student_id}" id="absent_${student.student_id}" value="absent" ${currentStatus === 'absent' ? 'checked' : ''}>
            <label class="btn btn-outline-danger btn-sm" for="absent_${student.student_id}">Absent</label>

            <input type="radio" class="btn-check" name="attendance_${student.student_id}" id="od_${student.student_id}" value="OD" ${currentStatus === 'OD' ? 'checked' : ''}>
            <label class="btn btn-outline-info btn-sm" for="od_${student.student_id}">OD</label>
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
            <button class="btn btn-primary btn-lg" onclick="saveAttendance()">
              <i class="fas fa-save me-2"></i>Save Attendance
            </button>
          </div>
          <div class="col-md-6 text-end">
            <button class="btn btn-outline-info me-2" onclick="viewAttendanceReports()">
              <i class="fas fa-chart-bar me-2"></i>View Reports
            </button>
            <button class="btn btn-outline-warning me-2" onclick="viewAbsentRecords()">
              <i class="fas fa-user-times me-2"></i>View Absent Records
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  courseList.innerHTML = interfaceHtml;
}

// Bulk mark attendance
function bulkMarkAttendance(status) {
  enrolledStudents.forEach(student => {
    // Handle the OD case - radio button ID is lowercase "od" but value is uppercase "OD"
    const radioId = status === 'OD' ? 'od' : status;
    const radio = document.getElementById(`${radioId}_${student.student_id}`);
    if (radio) radio.checked = true;
  });
  showAlert(`All students marked as ${status}`, "success");
}

// Save attendance
async function saveAttendance() {
  console.log("💾 Save attendance button clicked");
  const attendanceDate = document.getElementById("attendance-date").value;
  console.log("📅 Selected date:", attendanceDate);
  
  if (!attendanceDate) {
    showAlert("Please select attendance date", "warning");
    return;
  }

  // Collect attendance data
  const attendanceRecords = [];
  console.log("👥 Processing students:", enrolledStudents.length);
  
  enrolledStudents.forEach(student => {
    const checkedRadio = document.querySelector(`input[name="attendance_${student.student_id}"]:checked`);
    if (checkedRadio) {
      attendanceRecords.push({
        student_id: student.student_id,
        ...selectedAllocation,
        attendance_date: attendanceDate,
        status: checkedRadio.value
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
async function viewAttendanceReports() {
  console.log("📊 View Reports button clicked");
  console.log("📋 Selected allocation:", selectedAllocation);
  
  if (!selectedAllocation) {
    console.log("❌ No allocation selected for reports");
    showAlert("Please select a course time slot first to view reports", "warning");
    return;
  }

  try {
    console.log("🔄 Making API request for attendance report...");
    const params = new URLSearchParams({
      slot_year: selectedAllocation.slot_year,
      semester_type: selectedAllocation.semester_type,
      course_code: selectedAllocation.course_code,
      employee_id: selectedAllocation.employee_id
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
    showAttendanceReportModal(reportData);

  } catch (error) {
    console.error("Error loading attendance report:", error);
    showAlert(`Error loading attendance report: ${error.message}`, "error");
  }
}

// Show attendance report modal
function showAttendanceReportModal(reportData) {
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
      <div class="card">
        <div class="card-header bg-primary d-flex justify-content-between align-items-center">
          <h5 class="mb-0 text-white">📊 Attendance Report</h5>
          <button class="btn btn-outline-primary btn-sm" onclick="loadAttendanceForSlot('${selectedAllocation.course_code}', ${selectedAllocation.employee_id}, '${selectedAllocation.venue}', '${selectedAllocation.slot_day}', '${selectedAllocation.slot_name}', '${selectedAllocation.slot_time}')">
            ← Back to Attendance
          </button>
        </div>
        <div class="card-body">
          <div class="row mb-3">
            <div class="col-md-6">
              <h6>Course Details</h6>
              <p><strong>Code:</strong> ${selectedAllocation.course_code}<br>
                 <strong>Name:</strong> ${course_details.course_name || 'N/A'}<br>
                 <strong>Type:</strong> ${course_details.course_type || 'N/A'}</p>
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
    `;
  } else {
    showAlert(`Course: ${course_details.course_name || selectedAllocation.course_code}\nTotal students: ${attendance_report.length}\nReport generated successfully!`, "success");
  }
}

// Show attendance error
function showAttendanceError(message) {
  const content = document.getElementById("attendance-content");
  if (content) {
    content.innerHTML = `
      <div class="alert alert-danger text-center">
        <h5>❌ Error</h5>
        <p>${message}</p>
        <button class="btn btn-primary" onclick="initializeAttendance()">
          <i class="fas fa-refresh me-2"></i>Try Again
        </button>
      </div>
    `;
  }
}

// View absent records with date range filter
async function viewAbsentRecords() {
  console.log("❌ View Absent Records button clicked");
  console.log("📋 Selected allocation:", selectedAllocation);
  
  if (!selectedAllocation) {
    console.log("❌ No allocation selected for absent records");
    showAlert("Please select a course time slot first to view absent records", "warning");
    return;
  }

  const content = document.getElementById("attendance-content");
  if (content) {
    content.innerHTML = `
      <div class="card">
        <div class="card-header bg-warning d-flex justify-content-between align-items-center">
          <h5 class="mb-0 text-white">❌ Absent Records: ${selectedAllocation.course_code}</h5>
          <button class="btn btn-outline-dark btn-sm" onclick="loadAttendanceForSlot('${selectedAllocation.course_code}', ${selectedAllocation.employee_id}, '${selectedAllocation.venue}', '${selectedAllocation.slot_day}', '${selectedAllocation.slot_name}', '${selectedAllocation.slot_time}')">
            ← Back to Attendance
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
              <button class="btn btn-primary" onclick="loadAbsentRecords()">
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
    `;
  }
}

// Load absent records based on filters
async function loadAbsentRecords() {
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
      slot_year: selectedAllocation.slot_year,
      semester_type: selectedAllocation.semester_type,
      course_code: selectedAllocation.course_code,
      employee_id: selectedAllocation.employee_id,
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
async function reloadAttendanceForDate() {
  const dateInput = document.getElementById('attendance-date');
  if (!dateInput || !selectedAllocation) return;
  
  const selectedDate = dateInput.value;
  console.log("📅 Reloading attendance for date:", selectedDate);
  
  // Show loading indicator
  const tableBody = document.querySelector('tbody');
  if (tableBody) {
    tableBody.innerHTML = '<tr><td colspan="4" class="text-center"><i class="fas fa-spinner fa-spin me-2"></i>Loading...</td></tr>';
  }
  
  // Reload with new date
  await loadAttendanceForSlot(
    selectedAllocation.course_code,
    selectedAllocation.employee_id,
    selectedAllocation.venue,
    selectedAllocation.slot_day,
    selectedAllocation.slot_name,
    selectedAllocation.slot_time,
    selectedDate
  );
}

// Make functions available globally
window.initializeAttendance = initializeAttendance;
window.loadFacultyCourses = loadFacultyCourses;
window.selectAttendanceCourse = selectAttendanceCourse;
window.showAttendanceAllocationSelection = showAttendanceAllocationSelection;
window.loadAttendanceForSlot = loadAttendanceForSlot;
window.showAttendanceMarkingInterface = showAttendanceMarkingInterface;
window.bulkMarkAttendance = bulkMarkAttendance;
window.saveAttendance = saveAttendance;
window.viewAttendanceReports = viewAttendanceReports;
window.viewAbsentRecords = viewAbsentRecords;
window.loadAbsentRecords = loadAbsentRecords;
window.reloadAttendanceForDate = reloadAttendanceForDate;

// ===== END ATTENDANCE SYSTEM =====

// Show alert message - made available globally
window.showAlert = function (message, type = "info", timeout = 8000) {
  console.log("🚨 showAlert called with:", { message, type, timeout });
  
  const container = document.getElementById("alert-container");
  if (!container) {
    console.error("Alert container not found");
    console.log("Message would have been:", message);
    // Fallback: show browser alert
    alert(message);
    return;
  }

  console.log("🎯 Creating alert div...");
  const alertDiv = document.createElement("div");
  alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
  alertDiv.style.zIndex = "9999";
  alertDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;

  console.log("📌 Appending alert to container...");
  container.appendChild(alertDiv);
  
  console.log("✅ Alert should now be visible");

  if (timeout) {
    setTimeout(() => {
      console.log("⏰ Removing alert after timeout");
      alertDiv.classList.remove("show");
      setTimeout(() => {
        if (alertDiv.parentNode) {
          alertDiv.remove();
        }
      }, 150);
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

// ===== MOBILE NAVIGATION FUNCTIONALITY =====
function setupMobileNavigation() {
  // Admin interface mobile navigation
  setupAdminMobileNav();
  
  // Student interface mobile navigation
  setupStudentMobileNav();
}

function setupAdminMobileNav() {
  const mobileToggle = document.getElementById('mobile-nav-toggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  
  if (!mobileToggle || !sidebar || !overlay) {
    console.log('Admin mobile navigation elements not found');
    return;
  }

  // Toggle sidebar on mobile
  mobileToggle.addEventListener('click', function() {
    const isOpen = sidebar.classList.contains('show');
    
    if (isOpen) {
      closeMobileSidebar();
    } else {
      openMobileSidebar();
    }
  });

  // Close sidebar when clicking overlay
  overlay.addEventListener('click', closeMobileSidebar);

  // Close sidebar when clicking nav links on mobile
  const navLinks = sidebar.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      // Only close on mobile/tablet
      if (window.innerWidth < 768) {
        closeMobileSidebar();
      }
    });
  });

  // Handle window resize
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 768) {
      closeMobileSidebar();
    }
  });

  function openMobileSidebar() {
    sidebar.classList.add('show');
    overlay.classList.add('show');
    document.body.style.overflow = 'hidden'; // Prevent scrolling
    mobileToggle.setAttribute('aria-expanded', 'true');
  }

  function closeMobileSidebar() {
    sidebar.classList.remove('show');
    overlay.classList.remove('show');
    document.body.style.overflow = ''; // Restore scrolling
    mobileToggle.setAttribute('aria-expanded', 'false');
  }
}

function setupStudentMobileNav() {
  const studentMobileToggle = document.getElementById('student-mobile-nav-toggle');
  const studentSidebar = document.getElementById('student-sidebar');
  const studentOverlay = document.getElementById('student-sidebar-overlay');
  
  if (!studentMobileToggle || !studentSidebar || !studentOverlay) {
    console.log('Student mobile navigation elements not found');
    return;
  }

  // Toggle student sidebar on mobile
  studentMobileToggle.addEventListener('click', function() {
    const isOpen = studentSidebar.classList.contains('show');
    
    if (isOpen) {
      closeStudentMobileSidebar();
    } else {
      openStudentMobileSidebar();
    }
  });

  // Close student sidebar when clicking overlay
  studentOverlay.addEventListener('click', closeStudentMobileSidebar);

  // Close sidebar when clicking nav links on mobile
  const studentNavLinks = studentSidebar.querySelectorAll('.nav-link');
  studentNavLinks.forEach(link => {
    link.addEventListener('click', () => {
      // Only close on mobile/tablet
      if (window.innerWidth < 768) {
        closeStudentMobileSidebar();
      }
    });
  });

  // Handle window resize for student interface
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 768) {
      closeStudentMobileSidebar();
    }
  });

  function openStudentMobileSidebar() {
    studentSidebar.classList.add('show');
    studentOverlay.classList.add('show');
    document.body.style.overflow = 'hidden'; // Prevent scrolling
    studentMobileToggle.setAttribute('aria-expanded', 'true');
  }

  function closeStudentMobileSidebar() {
    studentSidebar.classList.remove('show');
    studentOverlay.classList.remove('show');
    document.body.style.overflow = ''; // Restore scrolling
    studentMobileToggle.setAttribute('aria-expanded', 'false');
  }
}

// ===== AGGRESSIVE ANDROID TIMETABLE SCROLLING FIX =====
function forceAndroidScrolling() {
  // Detect Android devices
  const isAndroid = /Android/i.test(navigator.userAgent);
  
  if (isAndroid) {
    console.log('Android device detected - applying aggressive scrolling fixes');
    
    // Function to force scrolling on timetable containers
    function enableTimetableScrolling() {
      const timetableContainers = document.querySelectorAll('.timetable-responsive');
      
      timetableContainers.forEach(container => {
        // Force scrolling properties
        container.style.overflowX = 'scroll';
        container.style.overflowY = 'hidden';
        container.style.webkitOverflowScrolling = 'touch';
        container.style.width = '100%';
        container.style.whiteSpace = 'nowrap';
        
        // Force table width
        const table = container.querySelector('table');
        if (table) {
          table.style.minWidth = '900px';
          table.style.width = '900px';
          table.style.tableLayout = 'fixed';
        }
        
        // Add touch event listeners for Android
        let isScrolling = false;
        
        container.addEventListener('touchstart', function(e) {
          isScrolling = true;
        }, { passive: true });
        
        container.addEventListener('touchmove', function(e) {
          if (isScrolling) {
            // Allow horizontal scrolling
            e.stopPropagation();
          }
        }, { passive: true });
        
        container.addEventListener('touchend', function(e) {
          isScrolling = false;
        }, { passive: true });
      });
    }
    
    // Run immediately and on DOM changes
    enableTimetableScrolling();
    
    // Use MutationObserver to catch dynamically added timetables
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.addedNodes.length > 0) {
          setTimeout(enableTimetableScrolling, 100);
        }
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
}

// Initialize Android scrolling fix
document.addEventListener('DOMContentLoaded', forceAndroidScrolling);

// Mobile navigation setup complete
