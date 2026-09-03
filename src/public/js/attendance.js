// Global variables for attendance system
console.log("📋 Loading attendance.js file...");
console.log("🧪 Testing attendance.js loading - this should appear in browser console");
let attendanceSemesters = [];
let attendanceAllocations = [];
let selectedAllocation = null;
let attendanceEnrolledStudents = [];

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
    
    attendanceSemesters = await response.json();
    renderSemesterSelection();

  } catch (error) {
    console.error("Error loading attendance interface:", error);
    showAttendanceError("Error loading attendance system. Please try again.");
  }
}

// Render semester selection interface
function renderSemesterSelection() {
  const content = document.getElementById("attendance-content");
  
  if (!attendanceSemesters.length) {
    content.innerHTML = `
      <div class="alert alert-info text-center">
        <h5>📚 No Course Allocations Found</h5>
        <p>You don't have any course allocations assigned. Please contact the administrator.</p>
      </div>
    `;
    return;
  }

  let semesterOptions = attendanceSemesters
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

              <!-- Admin-only: Attendance lock controls (rendered by JS after semester picked) -->
              <div id="attendance-admin-lock-controls" class="mt-4 d-none"></div>

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
    // Admin: render/refresh the attendance-lock controls for the picked semester.
    if (typeof currentUser !== "undefined" && currentUser?.role === "admin" && this.value) {
      const [slot_year, semester_type] = this.value.split("|");
      renderAttendanceLockControls(slot_year, semester_type);
    } else {
      const adminPanel = document.getElementById("attendance-admin-lock-controls");
      if (adminPanel) { adminPanel.classList.add("d-none"); adminPanel.innerHTML = ""; }
    }
  });
}

// Admin-only: render the attendance-lock controls (UG / PG / Both toggles).
async function renderAttendanceLockControls(slot_year, semester_type) {
  const panel = document.getElementById("attendance-admin-lock-controls");
  if (!panel) return;
  panel.classList.remove("d-none");
  panel.innerHTML = `
    <div class="card border-warning">
      <div class="card-header bg-warning text-dark">
        <h6 class="mb-0"><i class="fas fa-lock me-2"></i>Attendance Lock Controls (Admin Only)</h6>
      </div>
      <div class="card-body">
        <div class="text-center py-2">
          <div class="spinner-border spinner-border-sm" role="status"></div>
          <span class="ms-2">Loading lock status...</span>
        </div>
      </div>
    </div>
  `;
  try {
    const response = await fetch(
      `${window.API_URL}/attendance/admin/locks?slot_year=${slot_year}&semester_type=${semester_type}`,
      { headers: { "x-access-token": localStorage.getItem("token") } }
    );
    if (!response.ok) throw new Error("Failed to load attendance lock status");
    const locks = await response.json();
    const lockMap = {};
    locks.forEach((l) => { lockMap[l.program_level] = l.is_locked; });

    const cell = (level) => {
      const isLocked = lockMap[level] || false;
      const badge = isLocked
        ? '<span class="badge bg-danger">Locked</span>'
        : '<span class="badge bg-success">Open</span>';
      const btnClass = isLocked ? "btn-success" : "btn-danger";
      const btnText = isLocked ? "Unlock" : "Lock";
      const btnIcon = isLocked ? "fa-unlock" : "fa-lock";
      return `
        <div class="d-flex flex-column align-items-center gap-1">
          ${badge}
          <button class="btn btn-sm ${btnClass}" onclick="toggleAttendanceLock('${slot_year}', '${semester_type}', '${level}', ${isLocked})">
            <i class="fas ${btnIcon} me-1"></i>${btnText}
          </button>
        </div>
      `;
    };

    // Date-range locks: fetch active ranges for this semester
    let rangeRowsHtml = "";
    try {
      const rr = await fetch(
        `${window.API_URL}/attendance/admin/lock-ranges?slot_year=${slot_year}&semester_type=${semester_type}`,
        { headers: { "x-access-token": localStorage.getItem("token") } }
      );
      if (rr.ok) {
        const ranges = await rr.json();
        if (ranges.length === 0) {
          rangeRowsHtml = `<tr><td colspan="5" class="text-center text-muted small">No date-range locks active.</td></tr>`;
        } else {
          rangeRowsHtml = ranges
            .map((r) => {
              const levelLabel = r.program_level === "ALL" ? "Both" : r.program_level;
              const locked = r.locked_at ? new Date(r.locked_at).toLocaleString() : "";
              return `
                <tr>
                  <td>${r.start_date}</td>
                  <td>${r.end_date}</td>
                  <td>${levelLabel}</td>
                  <td class="small text-muted">${locked}</td>
                  <td class="text-center">
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteAttendanceLockRange(${r.id}, '${slot_year}', '${semester_type}')">
                      <i class="fas fa-trash me-1"></i>Remove
                    </button>
                  </td>
                </tr>`;
            })
            .join("");
        }
      } else {
        rangeRowsHtml = `<tr><td colspan="5" class="text-danger small">Failed to load date-range locks.</td></tr>`;
      }
    } catch (e) {
      console.error("Error loading attendance lock ranges:", e);
      rangeRowsHtml = `<tr><td colspan="5" class="text-danger small">Failed to load date-range locks.</td></tr>`;
    }

    panel.innerHTML = `
      <div class="card border-warning">
        <div class="card-header bg-warning text-dark">
          <h6 class="mb-0"><i class="fas fa-lock me-2"></i>Attendance Lock Controls (Admin Only) - ${slot_year} ${semester_type}</h6>
        </div>
        <div class="card-body">
          <p class="text-muted small mb-3">Lock/unlock attendance marking per program level. The "Both" toggle locks BOTH UG and PG regardless of the UG/PG individual toggles. When locked, faculty cannot mark, edit, or clear attendance for that program level. RESEARCH-tier courses are not affected by any lock.</p>
          <table class="table table-bordered table-sm mb-3 align-middle">
            <thead class="table-light">
              <tr>
                <th class="text-center">UG</th>
                <th class="text-center">PG</th>
                <th class="text-center">Both</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="text-center">${cell("UG")}</td>
                <td class="text-center">${cell("PG")}</td>
                <td class="text-center">${cell("ALL")}</td>
              </tr>
            </tbody>
          </table>

          <hr class="my-3">

          <h6 class="mb-2"><i class="fas fa-calendar-alt me-2"></i>Date-range Locks</h6>
          <p class="text-muted small mb-2">Lock attendance for a specific date window (both endpoints inclusive). Multiple ranges are allowed; a save is blocked if the attendance date falls inside ANY active range OR the whole-semester lock above is on. RESEARCH courses bypass all locks.</p>
          <div class="row g-2 align-items-end mb-2">
            <div class="col-auto">
              <label class="form-label small mb-1">Start date</label>
              <input type="date" id="attn-lock-range-start" class="form-control form-control-sm">
            </div>
            <div class="col-auto">
              <label class="form-label small mb-1">End date</label>
              <input type="date" id="attn-lock-range-end" class="form-control form-control-sm">
            </div>
            <div class="col-auto">
              <label class="form-label small mb-1">Program level</label>
              <select id="attn-lock-range-level" class="form-select form-select-sm">
                <option value="UG">UG</option>
                <option value="PG">PG</option>
                <option value="ALL">Both</option>
              </select>
            </div>
            <div class="col-auto">
              <button class="btn btn-sm btn-warning" onclick="addAttendanceLockRange('${slot_year}', '${semester_type}')">
                <i class="fas fa-plus me-1"></i>Add Lock
              </button>
            </div>
          </div>
          <table class="table table-bordered table-sm mb-0 align-middle">
            <thead class="table-light">
              <tr>
                <th>Start</th>
                <th>End</th>
                <th>Program Level</th>
                <th>Locked At</th>
                <th class="text-center">Action</th>
              </tr>
            </thead>
            <tbody>${rangeRowsHtml}</tbody>
          </table>
        </div>
      </div>
    `;
  } catch (error) {
    console.error("Error loading attendance lock status:", error);
    panel.innerHTML = `
      <div class="alert alert-danger">
        <i class="fas fa-exclamation-triangle me-2"></i>Failed to load attendance lock status
      </div>
    `;
  }
}

async function toggleAttendanceLock(slot_year, semester_type, program_level, currentlyLocked) {
  const action = currentlyLocked ? "unlock" : "lock";
  try {
    const response = await fetch(`${window.API_URL}/attendance/admin/${action}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": localStorage.getItem("token"),
      },
      body: JSON.stringify({ slot_year, semester_type, program_level }),
    });
    if (!response.ok) throw new Error(`Failed to ${action} attendance`);
    // Refresh the panel to reflect the new state
    renderAttendanceLockControls(slot_year, semester_type);
  } catch (error) {
    console.error(`Error ${action}ing attendance:`, error);
    alert(`Failed to ${action} attendance for ${program_level}`);
  }
}

async function addAttendanceLockRange(slot_year, semester_type) {
  const start = document.getElementById("attn-lock-range-start")?.value;
  const end = document.getElementById("attn-lock-range-end")?.value;
  const level = document.getElementById("attn-lock-range-level")?.value;
  if (!start || !end) {
    alert("Please pick both start and end dates.");
    return;
  }
  if (start > end) {
    alert("Start date must be on or before end date.");
    return;
  }
  try {
    const response = await fetch(`${window.API_URL}/attendance/admin/lock-range`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": localStorage.getItem("token"),
      },
      body: JSON.stringify({
        slot_year,
        semester_type,
        program_level: level,
        start_date: start,
        end_date: end,
      }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || "Failed to add date-range lock");
    }
    renderAttendanceLockControls(slot_year, semester_type);
  } catch (error) {
    console.error("Error adding attendance lock range:", error);
    alert(error.message || "Failed to add date-range lock");
  }
}

async function deleteAttendanceLockRange(id, slot_year, semester_type) {
  if (!confirm("Remove this date-range lock?")) return;
  try {
    const response = await fetch(`${window.API_URL}/attendance/admin/lock-range/${id}`, {
      method: "DELETE",
      headers: { "x-access-token": localStorage.getItem("token") },
    });
    if (!response.ok) throw new Error("Failed to remove date-range lock");
    renderAttendanceLockControls(slot_year, semester_type);
  } catch (error) {
    console.error("Error deleting attendance lock range:", error);
    alert("Failed to remove date-range lock");
  }
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
    
    attendanceAllocations = await response.json();
    renderCourseSelection();

  } catch (error) {
    console.error("Error loading faculty courses:", error);
    showAttendanceError("Error loading courses. Please try again.");
  }
}

// Render course selection
function renderCourseSelection() {
  const courseList = document.getElementById("course-list");

  if (!attendanceAllocations.length) {
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
  attendanceAllocations.forEach(allocation => {
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
  const course = attendanceAllocations.filter(a => a.course_code === courseCode);
  
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

    const data = await response.json();
    attendanceEnrolledStudents = data.students || data;

    // Also fetch attendance stats for each student
    try {
      const statsParams = new URLSearchParams({
        slot_year, semester_type, course_code, employee_id
      });
      const statsRes = await fetch(`${window.API_URL}/attendance/report?${statsParams}`, {
        headers: { "x-access-token": localStorage.getItem("token") }
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        const statsMap = {};
        (statsData.attendance_report || []).forEach(r => {
          statsMap[r.enrollment_number] = r;
        });
        // Attach stats to each student
        attendanceEnrolledStudents.forEach(s => {
          const stats = statsMap[s.enrollment_number];
          if (stats) {
            s.att_total = parseInt(stats.total_classes) || 0;
            s.att_present = parseInt(stats.present_count) || 0;
            s.att_absent = s.att_total - s.att_present;
            s.att_percentage = parseFloat(stats.attendance_percentage) || 0;
          }
        });
      }
    } catch (e) {
      console.warn("Could not fetch attendance stats:", e);
    }

    renderAttendanceInterface();

  } catch (error) {
    console.error("Error loading attendance interface:", error);
    showAttendanceError("Error loading students. Please try again.");
  }
}

// Render attendance marking interface
function renderAttendanceInterface() {
  const attendanceInterface = document.getElementById("attendance-interface");
  
  if (!attendanceEnrolledStudents.length) {
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
            <button class="btn btn-sm btn-outline-secondary" onclick="showAllocationSelection('${selectedAllocation.course_code}', attendanceAllocations.filter(a => a.course_code === '${selectedAllocation.course_code}'))">
              <i class="fas fa-arrow-left me-1"></i>Back
            </button>
          </div>
        </div>
      </div>
      <div class="card-body">
        <div class="row mb-3">
          <div class="col-md-4">
            <label for="attendance-date" class="form-label">Attendance Date <span class="text-danger">*</span></label>
            <input type="date" id="attendance-date" class="form-control" value="" onkeydown="return false">
          </div>
          <div class="col-md-8">
            <label class="form-label">Bulk Actions</label>
            <div>
              <button id="mark-all-present-btn" class="btn btn-sm btn-success me-2" onclick="bulkMarkAttendance('present')" disabled>
                <i class="fas fa-check me-1"></i>Mark All Present
              </button>
              <button id="mark-all-absent-btn" class="btn btn-sm btn-warning me-2" onclick="bulkMarkAttendance('absent')" disabled>
                <i class="fas fa-times me-1"></i>Mark All Absent
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
                <th>Classes</th>
                <th>Present</th>
                <th>Absent</th>
                <th>%</th>
                <th>Attendance Status</th>
              </tr>
            </thead>
            <tbody>
  `;

  attendanceEnrolledStudents.forEach((student, index) => {
    const currentStatus = student.current_status || null;
    const isOD = student.is_od === true;
    const attPct = student.att_percentage || 0;
    const pctClass = attPct < 75 ? "text-danger fw-bold" : "text-success";
    interfaceHtml += `
      <tr${attPct < 75 && student.att_total > 0 ? ' class="table-warning"' : ''}>
        <td>${index + 1}</td>
        <td>${student.enrollment_number}</td>
        <td>${student.student_name}</td>
        <td>${student.att_total || 0}</td>
        <td>${student.att_present || 0}</td>
        <td>${student.att_absent || 0}</td>
        <td class="${pctClass}">${attPct}%</td>
        <td>
          <div class="d-flex align-items-center">
            <div class="btn-group" role="group" aria-label="Attendance options">
              <input type="radio" class="btn-check" name="attendance_${student.student_id}" id="present_${student.student_id}" value="present" ${currentStatus === 'present' ? 'checked' : ''}>
              <label class="btn btn-outline-success" for="present_${student.student_id}">Present</label>

              <input type="radio" class="btn-check" name="attendance_${student.student_id}" id="absent_${student.student_id}" value="absent" ${currentStatus === 'absent' ? 'checked' : ''}>
              <label class="btn btn-outline-danger" for="absent_${student.student_id}">Absent</label>
            </div>
            ${isOD ? '<span class="badge bg-info ms-2 fs-6">OD</span>' : ''}
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
            <button id="save-attendance-btn" class="btn btn-primary" onclick="saveAttendance()" disabled>
              <i class="fas fa-save me-2"></i>Save Attendance
            </button>
          </div>
          <div class="col-md-6 text-end">
            <button class="btn btn-outline-warning" onclick="downloadLowAttendance()">
              <i class="fas fa-download me-2"></i>Download Low Attendance
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  attendanceInterface.innerHTML = interfaceHtml;

  // Setup date field event listener to enable/disable buttons
  const dateInput = document.getElementById("attendance-date");
  const markPresentBtn = document.getElementById("mark-all-present-btn");
  const markAbsentBtn = document.getElementById("mark-all-absent-btn");
  const saveBtn = document.getElementById("save-attendance-btn");

  dateInput.addEventListener("change", function() {
    const hasDate = this.value.trim() !== "";
    markPresentBtn.disabled = !hasDate;
    markAbsentBtn.disabled = !hasDate;
    saveBtn.disabled = !hasDate;
  });
}

// Bulk mark attendance (includes all students, OD is a separate indicator)
function bulkMarkAttendance(status) {
  attendanceEnrolledStudents.forEach(student => {
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

  // Collect attendance data (all students including OD — OD is a separate flag)
  const attendanceRecords = [];
  attendanceEnrolledStudents.forEach(student => {
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

    if (!response.ok) {
      // Surface the backend message (e.g. attendance-lock 403) instead of a generic error.
      let msg = "Failed to save attendance";
      try { const j = await response.json(); if (j.message) msg = j.message; } catch (_) {}
      throw new Error(msg);
    }

    const result = await response.json();
    showAttendanceAlert("Attendance saved successfully!", "success");

  } catch (error) {
    console.error("Error saving attendance:", error);
    showAttendanceAlert(error.message || "Error saving attendance. Please try again.", "error");
  }
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
window.renderAttendanceLockControls = renderAttendanceLockControls;
window.toggleAttendanceLock = toggleAttendanceLock;
console.log("✅ attendance.js loaded successfully, initializeAttendance is now:", typeof window.initializeAttendance);