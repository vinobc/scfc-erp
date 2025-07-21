// Global variables for attendance system
console.log("📋 Loading attendance.js file...");
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

              <!-- Step 3: Attendance Marking -->
              <div id="attendance-marking-step" class="step-section d-none mt-4">
                <h6 class="text-primary mb-3"><i class="fas fa-user-check me-2"></i>Step 3: Mark Attendance</h6>
                <div id="attendance-interface">
                  <!-- Attendance interface will be loaded here -->
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
    document.getElementById("course-selection-step").classList.add("d-none");
    document.getElementById("attendance-marking-step").classList.add("d-none");
  });
}

// Load faculty courses for selected semester
async function loadFacultyCourses() {
  const semesterSelect = document.getElementById("semester-select");
  const courseSelectionStep = document.getElementById("course-selection-step");
  const courseList = document.getElementById("course-list");

  if (!semesterSelect.value) {
    showAttendanceAlert("Please select a semester first", "warning");
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

  let coursesHtml = `
    <div class="row">
  `;

  Object.values(courseGroups).forEach(course => {
    const hasTheory = course.theory > 0;
    const badgeClass = hasTheory ? 'bg-success' : 'bg-info';
    const attendanceNote = hasTheory ? '75% attendance required' : 'Lab course - no attendance requirement';

    coursesHtml += `
      <div class="col-md-6 mb-3">
        <div class="card course-card h-100" style="cursor: pointer;" onclick="selectCourse('${course.course_code}')">
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
function selectCourse(courseCode) {
  const course = currentAllocations.filter(a => a.course_code === courseCode);
  
  if (!course.length) {
    showAttendanceAlert("Course not found", "error");
    return;
  }

  // Show allocation selection for this course
  showAllocationSelection(courseCode, course);
}

// Show allocation selection for course
function showAllocationSelection(courseCode, allocations) {
  const courseList = document.getElementById("course-list");
  
  let allocationHtml = `
    <div class="card">
      <div class="card-header bg-light">
        <div class="d-flex justify-content-between align-items-center">
          <h6 class="mb-0">${courseCode} - Select Class Session</h6>
          <button class="btn btn-sm btn-outline-secondary" onclick="renderCourseSelection()">
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
             onclick="loadAttendanceInterface('${allocation.course_code}', '${allocation.employee_id}', '${allocation.venue}', '${allocation.slot_day}', '${allocation.slot_name}', '${allocation.slot_time}')">
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

// Load attendance interface for specific allocation
async function loadAttendanceInterface(course_code, employee_id, venue, slot_day, slot_name, slot_time) {
  const semesterSelect = document.getElementById("semester-select");
  const [slot_year, semester_type] = semesterSelect.value.split("|");
  
  selectedAllocation = {
    slot_year, semester_type, course_code, employee_id, 
    venue, slot_day, slot_name, slot_time
  };

  const attendanceStep = document.getElementById("attendance-marking-step");
  const attendanceInterface = document.getElementById("attendance-interface");

  try {
    // Show loading
    attendanceInterface.innerHTML = `
      <div class="text-center py-3">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mt-2">Loading enrolled students...</p>
      </div>
    `;
    attendanceStep.classList.remove("d-none");

    // Load enrolled students
    const params = new URLSearchParams(selectedAllocation);
    const response = await fetch(`${window.API_URL}/attendance/students?${params}`, {
      headers: { "x-access-token": localStorage.getItem("token") }
    });

    if (!response.ok) throw new Error("Failed to load enrolled students");
    
    enrolledStudents = await response.json();
    renderAttendanceInterface();

  } catch (error) {
    console.error("Error loading attendance interface:", error);
    showAttendanceError("Error loading students. Please try again.");
  }
}

// Render attendance marking interface
function renderAttendanceInterface() {
  const attendanceInterface = document.getElementById("attendance-interface");
  
  if (!enrolledStudents.length) {
    attendanceInterface.innerHTML = `
      <div class="alert alert-warning">
        <h6>No enrolled students</h6>
        <p>No students are enrolled in this course session.</p>
      </div>
    `;
    return;
  }

  let interfaceHtml = `
    <div class="card">
      <div class="card-header bg-light">
        <div class="row align-items-center">
          <div class="col">
            <h6 class="mb-0">${selectedAllocation.course_code} - ${selectedAllocation.slot_day} ${selectedAllocation.slot_name}</h6>
            <small class="text-muted">${selectedAllocation.slot_time} | Venue: ${selectedAllocation.venue}</small>
          </div>
          <div class="col-auto">
            <button class="btn btn-sm btn-outline-secondary" onclick="showAllocationSelection('${selectedAllocation.course_code}', currentAllocations.filter(a => a.course_code === '${selectedAllocation.course_code}'))">
              <i class="fas fa-arrow-left me-1"></i>Back
            </button>
          </div>
        </div>
      </div>
      <div class="card-body">
        <div class="row mb-3">
          <div class="col-md-4">
            <label for="attendance-date" class="form-label">Attendance Date</label>
            <input type="date" id="attendance-date" class="form-control" value="${new Date().toISOString().split('T')[0]}">
          </div>
          <div class="col-md-8">
            <label class="form-label">Bulk Actions</label>
            <div>
              <button class="btn btn-sm btn-success me-2" onclick="bulkMarkAttendance('present')">
                <i class="fas fa-check me-1"></i>Mark All Present
              </button>
              <button class="btn btn-sm btn-warning me-2" onclick="bulkMarkAttendance('absent')">
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
            <thead>
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
    interfaceHtml += `
      <tr>
        <td>${index + 1}</td>
        <td>${student.enrollment_number}</td>
        <td>${student.student_name}</td>
        <td>
          <div class="btn-group" role="group" aria-label="Attendance options">
            <input type="radio" class="btn-check" name="attendance_${student.student_id}" id="present_${student.student_id}" value="present">
            <label class="btn btn-outline-success" for="present_${student.student_id}">Present</label>

            <input type="radio" class="btn-check" name="attendance_${student.student_id}" id="absent_${student.student_id}" value="absent">
            <label class="btn btn-outline-danger" for="absent_${student.student_id}">Absent</label>

            <input type="radio" class="btn-check" name="attendance_${student.student_id}" id="od_${student.student_id}" value="OD">
            <label class="btn btn-outline-info" for="od_${student.student_id}">OD</label>
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
            <button class="btn btn-primary" onclick="saveAttendance()">
              <i class="fas fa-save me-2"></i>Save Attendance
            </button>
          </div>
          <div class="col-md-6 text-end">
            <button class="btn btn-outline-info me-2" onclick="viewAttendanceReport()">
              <i class="fas fa-chart-bar me-2"></i>View Reports
            </button>
            <button class="btn btn-outline-warning" onclick="downloadLowAttendance()">
              <i class="fas fa-download me-2"></i>Download Low Attendance
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  attendanceInterface.innerHTML = interfaceHtml;
}

// Bulk mark attendance
function bulkMarkAttendance(status) {
  enrolledStudents.forEach(student => {
    const radio = document.getElementById(`${status}_${student.student_id}`);
    if (radio) radio.checked = true;
  });
  showAttendanceAlert(`All students marked as ${status}`, "success");
}

// Save attendance
async function saveAttendance() {
  const attendanceDate = document.getElementById("attendance-date").value;
  
  if (!attendanceDate) {
    showAttendanceAlert("Please select attendance date", "warning");
    return;
  }

  // Collect attendance data
  const attendanceRecords = [];
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

  if (!attendanceRecords.length) {
    showAttendanceAlert("Please mark attendance for at least one student", "warning");
    return;
  }

  try {
    const response = await fetch(`${window.API_URL}/attendance/mark`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": localStorage.getItem("token")
      },
      body: JSON.stringify({ attendance_records: attendanceRecords })
    });

    if (!response.ok) throw new Error("Failed to save attendance");
    
    const result = await response.json();
    showAttendanceAlert("Attendance saved successfully!", "success");

  } catch (error) {
    console.error("Error saving attendance:", error);
    showAttendanceAlert("Error saving attendance. Please try again.", "error");
  }
}

// View attendance report
async function viewAttendanceReport() {
  try {
    const params = new URLSearchParams({
      slot_year: selectedAllocation.slot_year,
      semester_type: selectedAllocation.semester_type,
      course_code: selectedAllocation.course_code,
      employee_id: selectedAllocation.employee_id
    });

    const response = await fetch(`${window.API_URL}/attendance/report?${params}`, {
      headers: { "x-access-token": localStorage.getItem("token") }
    });

    if (!response.ok) throw new Error("Failed to load attendance report");
    
    const reportData = await response.json();
    showAttendanceReport(reportData);

  } catch (error) {
    console.error("Error loading attendance report:", error);
    showAttendanceAlert("Error loading attendance report", "error");
  }
}

// Show attendance report modal
function showAttendanceReport(reportData) {
  // Create modal HTML
  const modalHtml = `
    <div class="modal fade" id="attendanceReportModal" tabindex="-1" aria-labelledby="attendanceReportModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="attendanceReportModalLabel">
              <i class="fas fa-chart-bar me-2"></i>Attendance Report - ${selectedAllocation.course_code}
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="table-responsive">
              <table class="table table-bordered table-hover">
                <thead>
                  <tr>
                    <th>Enrollment Number</th>
                    <th>Student Name</th>
                    <th>Classes Attended</th>
                    <th>Total Classes</th>
                    <th>Attendance %</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
  `;

  let bodyHtml = "";
  reportData.attendance_report.forEach(record => {
    const statusClass = record.below_minimum ? 'text-danger' : 'text-success';
    const statusIcon = record.below_minimum ? 'fas fa-exclamation-triangle' : 'fas fa-check-circle';
    const statusText = record.below_minimum ? 'Below 75%' : 'Satisfactory';

    bodyHtml += `
      <tr class="${record.below_minimum ? 'table-warning' : ''}">
        <td>${record.enrollment_number}</td>
        <td>${record.student_name}</td>
        <td>${record.present_count}</td>
        <td>${record.total_classes}</td>
        <td><strong>${record.attendance_percentage}%</strong></td>
        <td class="${statusClass}">
          <i class="${statusIcon} me-1"></i>${statusText}
        </td>
      </tr>
    `;
  });

  const fullModalHtml = modalHtml + bodyHtml + `
                </tbody>
              </table>
            </div>
            ${reportData.minimum_required ? 
              `<div class="alert alert-info mt-3">
                <strong>Note:</strong> Minimum ${reportData.minimum_required}% attendance required for theory courses.
              </div>` : 
              `<div class="alert alert-success mt-3">
                <strong>Note:</strong> This is a lab course. No minimum attendance requirement.
              </div>`
            }
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Remove existing modal if any
  const existingModal = document.getElementById('attendanceReportModal');
  if (existingModal) existingModal.remove();

  // Add modal to body
  document.body.insertAdjacentHTML('beforeend', fullModalHtml);

  // Show modal
  const modal = new bootstrap.Modal(document.getElementById('attendanceReportModal'));
  modal.show();
}

// Download low attendance students
async function downloadLowAttendance() {
  try {
    const params = new URLSearchParams({
      slot_year: selectedAllocation.slot_year,
      semester_type: selectedAllocation.semester_type,
      course_code: selectedAllocation.course_code,
      employee_id: selectedAllocation.employee_id
    });

    const response = await fetch(`${window.API_URL}/attendance/low-attendance?${params}`, {
      headers: { "x-access-token": localStorage.getItem("token") }
    });

    if (!response.ok) throw new Error("Failed to load low attendance data");
    
    const data = await response.json();
    
    if (!data.low_attendance_students.length) {
      showAttendanceAlert("No students below 75% attendance found", "info");
      return;
    }

    // Generate CSV
    const csvContent = generateAttendanceCSV(data);
    downloadCSV(csvContent, `${selectedAllocation.course_code}_low_attendance.csv`);
    showAttendanceAlert("Low attendance report downloaded successfully", "success");

  } catch (error) {
    console.error("Error downloading low attendance:", error);
    showAttendanceAlert("Error downloading low attendance report", "error");
  }
}

// Generate CSV content
function generateAttendanceCSV(data) {
  const headers = ["Enrollment Number", "Student Name", "Program", "Classes Attended", "Total Classes", "Attendance Percentage"];
  const rows = data.low_attendance_students.map(student => [
    student.enrollment_number,
    student.student_name,
    student.program_code,
    student.present_count,
    student.total_classes,
    `${student.attendance_percentage}%`
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${field}"`).join(","))
    .join("\n");

  return csvContent;
}

// Download CSV file
function downloadCSV(csvContent, filename) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Show attendance alert
function showAttendanceAlert(message, type = "info") {
  if (typeof showAlert === "function") {
    showAlert(message, type);
  } else {
    console.log(`Attendance Alert (${type}): ${message}`);
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

// Make function available globally
window.initializeAttendance = initializeAttendance;
console.log("✅ attendance.js loaded successfully, initializeAttendance is now:", typeof window.initializeAttendance);