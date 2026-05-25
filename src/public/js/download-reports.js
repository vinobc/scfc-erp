// Download Reports Management
console.log("Loading download-reports.js file...");

// Store user role for conditional UI
let currentUserRole = null;

// Helper: get user role from JWT token
function getUserRoleFromToken() {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.role || null;
  } catch (e) {
    return null;
  }
}

// Initialize download reports functionality
function initializeDownloadReports() {
  console.log("Initializing download reports...");
  currentUserRole = getUserRoleFromToken();
  console.log("Detected user role:", currentUserRole);
  displayDownloadReportsInterface();
  loadFilterOptions();
}

// Load filter dropdown options
async function loadFilterOptions() {
  const token = localStorage.getItem("token");
  const headers = { "x-access-token": token };

  try {
    // Load distinct slot_years and semester_types from available data
    const [schoolsRes, programsRes, coursesRes, slotsRes, venuesRes] = await Promise.all([
      fetch(`${window.API_URL}/schools`, { headers }),
      fetch(`${window.API_URL}/programs`, { headers }),
      fetch(`${window.API_URL}/courses`, { headers }),
      fetch(`${window.API_URL}/slots`, { headers }),
      fetch(`${window.API_URL}/venues`, { headers })
    ]);

    if (schoolsRes.ok) {
      const schools = await schoolsRes.json();
      const schoolSelect = document.getElementById("report-filter-school");
      if (schoolSelect) {
        schools.forEach(s => {
          const opt = document.createElement("option");
          opt.value = s.school_short_name;
          opt.textContent = `${s.school_short_name} - ${s.school_long_name}`;
          schoolSelect.appendChild(opt);
        });
      }
      // Also populate ineligible report school dropdown
      const inelSchoolSelect = document.getElementById("inel-filter-school");
      if (inelSchoolSelect) {
        schools.forEach(s => {
          const opt = document.createElement("option");
          opt.value = s.school_short_name;
          opt.textContent = `${s.school_short_name} - ${s.school_long_name}`;
          inelSchoolSelect.appendChild(opt);
        });
      }
      // Also populate courses report school dropdown
      const coursesSchoolSelect = document.getElementById("courses-filter-school");
      if (coursesSchoolSelect) {
        schools.forEach(s => {
          const opt = document.createElement("option");
          opt.value = s.school_short_name;
          opt.textContent = `${s.school_short_name} - ${s.school_long_name}`;
          coursesSchoolSelect.appendChild(opt);
        });
      }
    }

    if (programsRes.ok) {
      const programs = await programsRes.json();
      const programSelect = document.getElementById("report-filter-program");
      if (programSelect) {
        const uniquePrograms = [...new Map(programs.map(p => [p.program_code, p])).values()];
        uniquePrograms.sort((a, b) => a.program_code.localeCompare(b.program_code));
        uniquePrograms.forEach(p => {
          const opt = document.createElement("option");
          opt.value = p.program_code;
          opt.textContent = `${p.program_name_short || p.program_name_long || p.program_code}`;
          programSelect.appendChild(opt);
        });
      }
    }

    if (coursesRes.ok) {
      const courses = await coursesRes.json();
      const courseSelect = document.getElementById("report-filter-course");
      if (courseSelect) {
        courses.sort((a, b) => a.course_code.localeCompare(b.course_code));
        courses.forEach(c => {
          const opt = document.createElement("option");
          opt.value = c.course_code;
          opt.textContent = `${c.course_code} - ${c.course_name}`;
          courseSelect.appendChild(opt);
        });
      }
    }

    if (slotsRes.ok) {
      const slots = await slotsRes.json();
      const slotSelect = document.getElementById("report-filter-slot");
      if (slotSelect) {
        const uniqueSlotNames = [...new Set(slots.map(s => s.slot_name))].sort();
        uniqueSlotNames.forEach(name => {
          const opt = document.createElement("option");
          opt.value = name;
          opt.textContent = name;
          slotSelect.appendChild(opt);
        });
      }
    }

    if (venuesRes.ok) {
      const venues = await venuesRes.json();
      const venueSelect = document.getElementById("report-filter-venue");
      if (venueSelect) {
        venues.sort((a, b) => (a.venue || '').localeCompare(b.venue || ''));
        venues.forEach(v => {
          if (!v.venue) return;
          const opt = document.createElement("option");
          opt.value = v.venue;
          opt.textContent = v.venue;
          venueSelect.appendChild(opt);
        });
      }
    }
  } catch (error) {
    console.error("Error loading filter options:", error);
  }
}

// Display download reports interface
function displayDownloadReportsInterface() {
  const contentDiv = document.getElementById("download-reports-content");
  if (!contentDiv) {
    console.error("download-reports-content div not found");
    return;
  }

  // Generate year options (current year and 4 previous)
  const currentYear = new Date().getFullYear();
  let yearOptions = '<option value="">All Years</option>';
  for (let y = currentYear; y >= currentYear - 4; y--) {
    const yearStr = `${y}-${(y + 1).toString().slice(-2)}`;
    yearOptions += `<option value="${yearStr}">${yearStr}</option>`;
  }

  contentDiv.innerHTML = `
    <div class="container-fluid">
      <div class="row">
        <div class="col-12">
          <div class="d-flex justify-content-between align-items-center mb-4">
            <h2 class="text-primary mb-0"><i class="fas fa-download me-2"></i>Download Reports</h2>
          </div>

          <!-- Student Registrations Report -->
          <div class="card mb-4">
            <div class="card-header bg-primary text-white">
              <h5 class="card-title mb-0"><i class="fas fa-user-graduate me-2"></i>Student Registrations Report</h5>
            </div>
            <div class="card-body">
              <p class="text-muted mb-3">Download student course registration data including enrollment numbers, courses, slots, faculty, and venues.</p>

              <!-- Filters -->
              <div class="card mb-3">
                <div class="card-header bg-light">
                  <h6 class="mb-0"><i class="fas fa-filter me-2"></i>Filters (Optional)</h6>
                </div>
                <div class="card-body">
                  <div class="row g-3">
                    <div class="col-md-3">
                      <label for="report-filter-year" class="form-label">Academic Year</label>
                      <select id="report-filter-year" class="form-select">
                        ${yearOptions}
                      </select>
                    </div>
                    <div class="col-md-3">
                      <label for="report-filter-semester" class="form-label">Semester</label>
                      <select id="report-filter-semester" class="form-select">
                        <option value="">All Semesters</option>
                        <option value="FALL">FALL</option>
                        <option value="WINTER">WINTER</option>
                        <option value="SUMMER">SUMMER</option>
                      </select>
                    </div>
                    <div class="col-md-3">
                      <label for="report-filter-school" class="form-label">School</label>
                      <select id="report-filter-school" class="form-select">
                        <option value="">All Schools</option>
                      </select>
                    </div>
                    <div class="col-md-3">
                      <label for="report-filter-program" class="form-label">Program</label>
                      <select id="report-filter-program" class="form-select">
                        <option value="">All Programs</option>
                      </select>
                    </div>
                  </div>
                  <div class="row g-3 mt-1">
                    <div class="col-md-3">
                      <label for="report-filter-course" class="form-label">Course</label>
                      <select id="report-filter-course" class="form-select">
                        <option value="">All Courses</option>
                      </select>
                    </div>
                    <div class="col-md-3">
                      <label for="report-filter-slot" class="form-label">Slot</label>
                      <select id="report-filter-slot" class="form-select">
                        <option value="">All Slots</option>
                      </select>
                    </div>
                    <div class="col-md-3">
                      <label for="report-filter-venue" class="form-label">Venue</label>
                      <select id="report-filter-venue" class="form-select">
                        <option value="">All Venues</option>
                      </select>
                    </div>
                    <div class="col-md-3 d-flex align-items-end">
                      <button class="btn btn-outline-secondary" onclick="clearReportFilters()">
                        <i class="fas fa-times me-1"></i>Clear Filters
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Download Buttons -->
              <div class="row">
                <div class="col-md-6">
                  <label class="form-label">Download Format</label>
                  <div class="btn-group d-flex" role="group">
                    <button type="button" class="btn btn-outline-success" onclick="downloadRegistrations('excel')">
                      <i class="fas fa-file-excel me-2"></i>Excel (.xlsx)
                    </button>
                    <button type="button" class="btn btn-outline-info" onclick="downloadRegistrations('csv')">
                      <i class="fas fa-file-csv me-2"></i>CSV
                    </button>
                    <button type="button" class="btn btn-outline-primary" onclick="downloadRegistrations('both')">
                      <i class="fas fa-file-archive me-2"></i>Both
                    </button>
                  </div>
                </div>
                <div class="col-md-6 d-flex align-items-end">
                  <button class="btn btn-warning" onclick="downloadAllRegistrations()">
                    <i class="fas fa-download me-2"></i>Download All (No Filters)
                  </button>
                </div>
              </div>

              <div id="download-status" class="mt-3"></div>
            </div>
          </div>

          <!-- Student Marks Report - Faculty/Coordinator View -->
          ${currentUserRole === "faculty" || currentUserRole === "timetable_coordinator" ? `
          <div class="card mb-4">
            <div class="card-header bg-success text-white">
              <h5 class="card-title mb-0"><i class="fas fa-clipboard-check me-2"></i>Student Marks Report</h5>
            </div>
            <div class="card-body">
              <p class="text-muted mb-3">Download student marks report. Select academic year, semester, course, slot, and assessment component.</p>
              <div class="card mb-3">
                <div class="card-header bg-light">
                  <h6 class="mb-0"><i class="fas fa-filter me-2"></i>Filters</h6>
                </div>
                <div class="card-body">
                  <div class="row g-3">
                    <div class="col-md-3">
                      <label for="marks-filter-year" class="form-label">Academic Year <span class="text-danger">*</span></label>
                      <select id="marks-filter-year" class="form-select" onchange="onMarksYearSemesterChange()">
                        ${yearOptions}
                      </select>
                    </div>
                    <div class="col-md-3">
                      <label for="marks-filter-semester" class="form-label">Semester <span class="text-danger">*</span></label>
                      <select id="marks-filter-semester" class="form-select" onchange="onMarksYearSemesterChange()">
                        <option value="">Select Semester</option>
                        <option value="FALL">FALL</option>
                        <option value="WINTER">WINTER</option>
                        <option value="SUMMER">SUMMER</option>
                      </select>
                    </div>
                    <div class="col-md-3">
                      <label for="marks-filter-course" class="form-label">Course <span class="text-danger">*</span></label>
                      <select id="marks-filter-course" class="form-select" onchange="onMarksCourseChange()">
                        <option value="">Select Year & Semester first</option>
                      </select>
                    </div>
                    <div class="col-md-3">
                      <label for="marks-filter-slot" class="form-label">Slot</label>
                      <select id="marks-filter-slot" class="form-select" onchange="onMarksSlotChange()">
                        <option value="">All Slots</option>
                      </select>
                    </div>
                  </div>
                  <div class="row g-3 mt-1">
                    <div class="col-md-3">
                      <label for="marks-filter-component" class="form-label">Component <span class="text-danger">*</span></label>
                      <select id="marks-filter-component" class="form-select">
                        <option value="">Select Course first</option>
                      </select>
                    </div>
                    <div class="col-md-3 d-flex align-items-end">
                      <button class="btn btn-outline-secondary" onclick="clearMarksFilters()">
                        <i class="fas fa-times me-1"></i>Clear Filters
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div class="row">
                <div class="col-md-6">
                  <button type="button" class="btn btn-success" onclick="downloadMarksReport()">
                    <i class="fas fa-file-excel me-2"></i>Download Marks Report (.xlsx)
                  </button>
                </div>
              </div>
              <div id="marks-download-status" class="mt-3"></div>
            </div>
          </div>
          ` : ""}

          <!-- Student Marks Report - Admin View -->
          ${currentUserRole === "admin" ? `
          <div class="card mb-4">
            <div class="card-header bg-success text-white">
              <h5 class="card-title mb-0"><i class="fas fa-clipboard-check me-2"></i>Student Marks Report</h5>
            </div>
            <div class="card-body">
              <p class="text-muted mb-3">View marks entry status and download marks reports for all faculty.</p>
              <div class="card mb-3">
                <div class="card-header bg-light">
                  <h6 class="mb-0"><i class="fas fa-filter me-2"></i>Select Semester & Component</h6>
                </div>
                <div class="card-body">
                  <div class="row g-3">
                    <div class="col-md-3">
                      <label for="admin-marks-year" class="form-label">Academic Year <span class="text-danger">*</span></label>
                      <select id="admin-marks-year" class="form-select">
                        ${yearOptions}
                      </select>
                    </div>
                    <div class="col-md-3">
                      <label for="admin-marks-semester" class="form-label">Semester <span class="text-danger">*</span></label>
                      <select id="admin-marks-semester" class="form-select">
                        <option value="">Select Semester</option>
                        <option value="FALL">FALL</option>
                        <option value="WINTER">WINTER</option>
                        <option value="SUMMER">SUMMER</option>
                      </select>
                    </div>
                    <div class="col-md-3">
                      <label for="admin-marks-component" class="form-label">Component <span class="text-danger">*</span></label>
                      <select id="admin-marks-component" class="form-select">
                        <option value="">Select Component</option>
                        <option value="CA1">CA1</option>
                        <option value="CA2">CA2</option>
                        <option value="CA3">CA3</option>
                        <option value="IM">IM (Internal Marks)</option>
                      </select>
                    </div>
                    <div class="col-md-3 d-flex align-items-end">
                      <button class="btn btn-primary" onclick="loadMarksSummary()">
                        <i class="fas fa-search me-2"></i>View Summary
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Summary Table -->
              <div id="marks-summary-container"></div>

              <div id="marks-download-status" class="mt-3"></div>
            </div>
          </div>
          ` : ""}

          <!-- Student Attendance Report (Admin, Faculty, Coordinator) -->
          ${currentUserRole === "admin" || currentUserRole === "faculty" || currentUserRole === "timetable_coordinator" ? `
          <div class="card mb-4">
            <div class="card-header bg-info text-white">
              <h5 class="card-title mb-0"><i class="fas fa-calendar-check me-2"></i>Student Attendance Report</h5>
            </div>
            <div class="card-body">
              <p class="text-muted mb-3">Download student attendance report with summary and date-wise breakdown.</p>
              <div class="card mb-3">
                <div class="card-header bg-light">
                  <h6 class="mb-0"><i class="fas fa-filter me-2"></i>Filters</h6>
                </div>
                <div class="card-body">
                  <div class="row g-3">
                    <div class="col-md-3">
                      <label for="att-filter-year" class="form-label">Academic Year <span class="text-danger">*</span></label>
                      <select id="att-filter-year" class="form-select" onchange="onAttYearSemesterChange()">
                        ${yearOptions}
                      </select>
                    </div>
                    <div class="col-md-3">
                      <label for="att-filter-semester" class="form-label">Semester <span class="text-danger">*</span></label>
                      <select id="att-filter-semester" class="form-select" onchange="onAttYearSemesterChange()">
                        <option value="">Select Semester</option>
                        <option value="FALL">FALL</option>
                        <option value="WINTER">WINTER</option>
                        <option value="SUMMER">SUMMER</option>
                      </select>
                    </div>
                    <div class="col-md-3">
                      <label for="att-filter-course" class="form-label">Course <span class="text-danger">*</span></label>
                      <select id="att-filter-course" class="form-select" onchange="onAttCourseChange()">
                        <option value="">Select Year & Semester first</option>
                      </select>
                    </div>
                    <div class="col-md-3">
                      <label for="att-filter-slot" class="form-label">Slot</label>
                      <select id="att-filter-slot" class="form-select">
                        <option value="">All Slots</option>
                      </select>
                    </div>
                  </div>
                  <div class="row g-3 mt-1">
                    ${currentUserRole === "admin" ? `
                    <div class="col-md-3">
                      <label for="att-filter-faculty" class="form-label">Faculty <span class="text-danger">*</span></label>
                      <select id="att-filter-faculty" class="form-select">
                        <option value="">Select Course first</option>
                      </select>
                    </div>
                    ` : ""}
                    <div class="col-md-3 d-flex align-items-end">
                      <button class="btn btn-outline-secondary" onclick="clearAttFilters()">
                        <i class="fas fa-times me-1"></i>Clear Filters
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div class="row">
                <div class="col-md-6">
                  <button type="button" class="btn btn-info text-white" onclick="downloadAttendanceReport()">
                    <i class="fas fa-file-excel me-2"></i>Download Attendance Report (.xlsx)
                  </button>
                </div>
              </div>
              <div id="att-download-status" class="mt-3"></div>
            </div>
          </div>
          ` : ""}

          <!-- Ineligible Students Report (Admin only) -->
          ${currentUserRole === "admin" ? `
          <div class="card mb-4">
            <div class="card-header bg-danger text-white">
              <h5 class="card-title mb-0"><i class="fas fa-exclamation-triangle me-2"></i>Ineligible Students Report</h5>
            </div>
            <div class="card-body">
              <p class="text-muted mb-3">Download list of students below 75% attendance (theory courses only) for CoE submissions.</p>
              <div class="card mb-3">
                <div class="card-header bg-light">
                  <h6 class="mb-0"><i class="fas fa-filter me-2"></i>Filters</h6>
                </div>
                <div class="card-body">
                  <div class="row g-3">
                    <div class="col-md-3">
                      <label for="inel-filter-year" class="form-label">Academic Year <span class="text-danger">*</span></label>
                      <select id="inel-filter-year" class="form-select">
                        ${yearOptions}
                      </select>
                    </div>
                    <div class="col-md-3">
                      <label for="inel-filter-semester" class="form-label">Semester <span class="text-danger">*</span></label>
                      <select id="inel-filter-semester" class="form-select">
                        <option value="">Select Semester</option>
                        <option value="FALL">FALL</option>
                        <option value="WINTER">WINTER</option>
                        <option value="SUMMER">SUMMER</option>
                      </select>
                    </div>
                    <div class="col-md-2">
                      <label for="inel-filter-level" class="form-label">Level <span class="text-danger">*</span></label>
                      <select id="inel-filter-level" class="form-select">
                        <option value="">Select Level</option>
                        <option value="UG">UG</option>
                        <option value="PG">PG</option>
                        <option value="All">All</option>
                      </select>
                    </div>
                    <div class="col-md-2">
                      <label for="inel-filter-school" class="form-label">School</label>
                      <select id="inel-filter-school" class="form-select">
                        <option value="">All Schools</option>
                      </select>
                    </div>
                    <div class="col-md-2">
                      <label for="inel-filter-cutoff" class="form-label">Cutoff Date <span class="text-danger">*</span></label>
                      <input type="date" id="inel-filter-cutoff" class="form-control">
                    </div>
                  </div>
                </div>
              </div>
              <div class="row">
                <div class="col-md-6">
                  <button type="button" class="btn btn-danger" onclick="downloadIneligibleReport()">
                    <i class="fas fa-file-excel me-2"></i>Download Ineligible Students Report (.xlsx)
                  </button>
                </div>
              </div>
              <div id="inel-download-status" class="mt-3"></div>
            </div>
          </div>
          ` : ""}

          <!-- Courses Report (Admin only) -->
          ${currentUserRole === "admin" ? `
          <div class="card mb-4">
            <div class="card-header bg-secondary text-white">
              <h5 class="card-title mb-0"><i class="fas fa-book me-2"></i>Download Courses</h5>
            </div>
            <div class="card-body">
              <p class="text-muted mb-3">Download course master data with TPC details.</p>
              <div class="row g-3 mb-3">
                <div class="col-md-3">
                  <label for="courses-filter-school" class="form-label">School</label>
                  <select id="courses-filter-school" class="form-select">
                    <option value="">All Schools</option>
                  </select>
                </div>
                <div class="col-md-3">
                  <label for="courses-filter-type" class="form-label">Course Type</label>
                  <select id="courses-filter-type" class="form-select">
                    <option value="">All Types</option>
                    <option value="T">Theory (T)</option>
                    <option value="P">Practical (P)</option>
                    <option value="TEL">Integrated (TEL)</option>
                  </select>
                </div>
                <div class="col-md-3 d-flex align-items-end">
                  <button type="button" class="btn btn-secondary" onclick="downloadCoursesReport()">
                    <i class="fas fa-file-excel me-2"></i>Download (.xlsx)
                  </button>
                </div>
              </div>
              <div id="courses-download-status"></div>
            </div>
          </div>
          ` : ""}

        </div>
      </div>
    </div>
  `;
}

// Clear all filters
function clearReportFilters() {
  document.getElementById("report-filter-year").value = "";
  document.getElementById("report-filter-semester").value = "";
  document.getElementById("report-filter-school").value = "";
  document.getElementById("report-filter-program").value = "";
  document.getElementById("report-filter-course").value = "";
  document.getElementById("report-filter-slot").value = "";
  document.getElementById("report-filter-venue").value = "";
}

// Build query string from filters
function buildFilterParams(format) {
  const params = new URLSearchParams();
  params.append("format", format);

  const year = document.getElementById("report-filter-year").value;
  const semester = document.getElementById("report-filter-semester").value;
  const school = document.getElementById("report-filter-school").value;
  const program = document.getElementById("report-filter-program").value;
  const course = document.getElementById("report-filter-course").value;
  const slot = document.getElementById("report-filter-slot").value;
  const venue = document.getElementById("report-filter-venue").value;

  if (year) params.append("slot_year", year);
  if (semester) params.append("semester_type", semester);
  if (school) params.append("school", school);
  if (program) params.append("program_code", program);
  if (course) params.append("course_code", course);
  if (slot) params.append("slot_name", slot);
  if (venue) params.append("venue", venue);

  return params.toString();
}

// Download all registrations (no filters)
function downloadAllRegistrations() {
  downloadReport("excel", true);
}

// Download with filters
function downloadRegistrations(format) {
  downloadReport(format, false);
}

// Core download function
async function downloadReport(format, skipFilters) {
  const statusDiv = document.getElementById("download-status");
  statusDiv.innerHTML = `
    <div class="alert alert-info">
      <i class="fas fa-spinner fa-spin me-2"></i>Preparing download...
    </div>
  `;

  try {
    let url;
    if (skipFilters) {
      url = `${window.API_URL}/reports/student-registrations?format=${format}`;
    } else {
      url = `${window.API_URL}/reports/student-registrations?${buildFilterParams(format)}`;
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "x-access-token": localStorage.getItem("token"),
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to download report");
    }

    if (format === "both") {
      const data = await response.json();

      downloadBase64File(
        data.excel.data,
        data.excel.filename,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      setTimeout(() => {
        downloadBase64File(
          data.csv.data,
          data.csv.filename,
          "text/csv;charset=utf-8;"
        );
      }, 500);

      statusDiv.innerHTML = `
        <div class="alert alert-success">
          <i class="fas fa-check-circle me-2"></i>Both files downloaded successfully!
        </div>
      `;
    } else {
      const blob = await response.blob();
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = format === "excel" ? "student_registrations.xlsx" : "student_registrations.csv";

      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?(.+?)"?$/);
        if (match) filename = match[1];
      }

      const url2 = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url2;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url2);

      statusDiv.innerHTML = `
        <div class="alert alert-success">
          <i class="fas fa-check-circle me-2"></i>Report downloaded successfully!
        </div>
      `;
    }
  } catch (error) {
    console.error("Error downloading report:", error);
    statusDiv.innerHTML = `
      <div class="alert alert-danger">
        <i class="fas fa-exclamation-circle me-2"></i>Error: ${error.message}
      </div>
    `;
  }
}

// Helper function to download base64 encoded file
function downloadBase64File(base64Data, filename, mimeType) {
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============ Student Marks Report Functions ============

// Cache for courses data
let marksReportCoursesCache = [];

// When year or semester changes, load available courses
async function onMarksYearSemesterChange() {
  const year = document.getElementById("marks-filter-year").value;
  const semester = document.getElementById("marks-filter-semester").value;

  const courseSelect = document.getElementById("marks-filter-course");
  const slotSelect = document.getElementById("marks-filter-slot");
  const componentSelect = document.getElementById("marks-filter-component");
  const facultySelect = document.getElementById("marks-filter-faculty");

  // Reset dependent dropdowns
  courseSelect.innerHTML = '<option value="">Loading courses...</option>';
  slotSelect.innerHTML = '<option value="">All Slots</option>';
  componentSelect.innerHTML = '<option value="">Select Course first</option>';
  if (facultySelect) facultySelect.innerHTML = '<option value="">All Faculty</option>';

  if (!year || !semester) {
    courseSelect.innerHTML = '<option value="">Select Year & Semester first</option>';
    return;
  }

  try {
    const token = localStorage.getItem("token");
    const res = await fetch(
      `${window.API_URL}/reports/student-marks/courses?slot_year=${year}&semester_type=${semester}`,
      { headers: { "x-access-token": token } }
    );

    if (!res.ok) throw new Error("Failed to load courses");

    marksReportCoursesCache = await res.json();

    courseSelect.innerHTML = '<option value="">Select Course</option>';

    // Get unique courses
    const uniqueCourses = [];
    const seen = new Set();
    for (const c of marksReportCoursesCache) {
      if (!seen.has(c.course_code)) {
        seen.add(c.course_code);
        uniqueCourses.push(c);
      }
    }

    uniqueCourses.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.course_code;
      opt.textContent = `${c.course_code} - ${c.course_name}`;
      courseSelect.appendChild(opt);
    });

    // Populate faculty dropdown for admin
    if (facultySelect && currentUserRole === "admin") {
      const uniqueFaculty = [];
      const seenFac = new Set();
      for (const c of marksReportCoursesCache) {
        if (!seenFac.has(c.employee_id)) {
          seenFac.add(c.employee_id);
          uniqueFaculty.push({ employee_id: c.employee_id, faculty_name: c.faculty_name });
        }
      }
      uniqueFaculty.sort((a, b) => a.faculty_name.localeCompare(b.faculty_name));
      uniqueFaculty.forEach(f => {
        const opt = document.createElement("option");
        opt.value = f.employee_id;
        opt.textContent = f.faculty_name;
        facultySelect.appendChild(opt);
      });
    }
  } catch (error) {
    console.error("Error loading marks report courses:", error);
    courseSelect.innerHTML = '<option value="">Error loading courses</option>';
  }
}

// Cache for slots data (with component_types)
let marksReportSlotsCache = [];

// When course changes, load slots and update component dropdown
async function onMarksCourseChange() {
  const year = document.getElementById("marks-filter-year").value;
  const semester = document.getElementById("marks-filter-semester").value;
  const courseCode = document.getElementById("marks-filter-course").value;

  const slotSelect = document.getElementById("marks-filter-slot");
  const componentSelect = document.getElementById("marks-filter-component");

  slotSelect.innerHTML = '<option value="">All Slots</option>';
  marksReportSlotsCache = [];
  componentSelect.innerHTML = '<option value="">Select Component</option>';

  if (!courseCode) {
    componentSelect.innerHTML = '<option value="">Select Course first</option>';
    return;
  }

  // Show all valid components for the course initially (before slot selection)
  const courseEntry = marksReportCoursesCache.find(c => c.course_code === courseCode);
  if (courseEntry && courseEntry.valid_components) {
    courseEntry.valid_components.forEach(comp => {
      const opt = document.createElement("option");
      opt.value = comp;
      opt.textContent = comp === "IM" ? "IM (Internal Marks)" : comp;
      componentSelect.appendChild(opt);
    });
  }

  // Load slots for this course
  try {
    const token = localStorage.getItem("token");
    const facultySelect = document.getElementById("marks-filter-faculty");
    const empId = facultySelect ? facultySelect.value : "";
    let url = `${window.API_URL}/reports/student-marks/slots?slot_year=${year}&semester_type=${semester}&course_code=${courseCode}`;
    if (empId) url += `&employee_id=${empId}`;

    const res = await fetch(url, { headers: { "x-access-token": token } });
    if (res.ok) {
      marksReportSlotsCache = await res.json();
      marksReportSlotsCache.forEach(s => {
        const opt = document.createElement("option");
        opt.value = s.slot_name;
        opt.textContent = `${s.slot_name} (${s.venue})`;
        slotSelect.appendChild(opt);
      });
    }
  } catch (error) {
    console.error("Error loading slots:", error);
  }
}

// When slot changes, update component dropdown based on slot's component_types
function onMarksSlotChange() {
  const slotName = document.getElementById("marks-filter-slot").value;
  const courseCode = document.getElementById("marks-filter-course").value;
  const componentSelect = document.getElementById("marks-filter-component");
  componentSelect.innerHTML = '<option value="">Select Component</option>';

  if (!slotName) {
    // "All Slots" selected — show all valid components for the course
    const courseEntry = marksReportCoursesCache.find(c => c.course_code === courseCode);
    if (courseEntry && courseEntry.valid_components) {
      courseEntry.valid_components.forEach(comp => {
        const opt = document.createElement("option");
        opt.value = comp;
        opt.textContent = comp === "IM" ? "IM (Internal Marks)" : comp;
        componentSelect.appendChild(opt);
      });
    }
    return;
  }

  // Find the slot's component_types
  const slotData = marksReportSlotsCache.find(s => s.slot_name === slotName);
  if (!slotData) return;

  const compTypes = slotData.component_types || [];
  const hasTheory = compTypes.includes("THEORY");
  const hasLab = compTypes.includes("LAB");

  if (hasTheory) {
    // Theory slot: show CAs + IM
    const courseEntry = marksReportCoursesCache.find(c => c.course_code === courseCode);
    if (courseEntry && courseEntry.valid_components) {
      courseEntry.valid_components.forEach(comp => {
        // For theory-only slot, CA and IM (assignment only) are valid
        const opt = document.createElement("option");
        opt.value = comp;
        opt.textContent = comp === "IM" ? "IM (Internal Marks)" : comp;
        componentSelect.appendChild(opt);
      });
    }
  }

  if (hasLab && !hasTheory) {
    // Lab-only slot: only IM (lab marks)
    const opt = document.createElement("option");
    opt.value = "IM";
    opt.textContent = "IM (Internal Marks)";
    componentSelect.appendChild(opt);
  }
}

// Clear marks filters
function clearMarksFilters() {
  document.getElementById("marks-filter-year").value = "";
  document.getElementById("marks-filter-semester").value = "";
  const courseSelect = document.getElementById("marks-filter-course");
  courseSelect.innerHTML = '<option value="">Select Year & Semester first</option>';
  document.getElementById("marks-filter-slot").innerHTML = '<option value="">All Slots</option>';
  const componentSelect = document.getElementById("marks-filter-component");
  componentSelect.innerHTML = '<option value="">Select Course first</option>';
  const facultySelect = document.getElementById("marks-filter-faculty");
  if (facultySelect) facultySelect.innerHTML = '<option value="">All Faculty</option>';
  marksReportCoursesCache = [];
  marksReportSlotsCache = [];
}

// Download marks report
async function downloadMarksReport() {
  const year = document.getElementById("marks-filter-year").value;
  const semester = document.getElementById("marks-filter-semester").value;
  const course = document.getElementById("marks-filter-course").value;
  const slot = document.getElementById("marks-filter-slot").value;
  const component = document.getElementById("marks-filter-component").value;
  const facultySelect = document.getElementById("marks-filter-faculty");
  const empId = facultySelect ? facultySelect.value : "";

  const statusDiv = document.getElementById("marks-download-status");

  // Validate required fields
  if (!year || !semester || !component) {
    statusDiv.innerHTML = `
      <div class="alert alert-warning">
        <i class="fas fa-exclamation-triangle me-2"></i>Please select Academic Year, Semester, and Component.
      </div>
    `;
    return;
  }

  statusDiv.innerHTML = `
    <div class="alert alert-info">
      <i class="fas fa-spinner fa-spin me-2"></i>Preparing marks report...
    </div>
  `;

  try {
    const params = new URLSearchParams();
    params.append("slot_year", year);
    params.append("semester_type", semester);
    params.append("component", component);
    if (course) params.append("course_code", course);
    if (slot) params.append("slot_name", slot);
    if (empId) params.append("employee_id", empId);

    const url = `${window.API_URL}/reports/student-marks?${params.toString()}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "x-access-token": localStorage.getItem("token"),
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to download marks report");
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get("Content-Disposition");
    let filename = "student_marks_report.xlsx";
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?(.+?)"?$/);
      if (match) filename = match[1];
    }

    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);

    statusDiv.innerHTML = `
      <div class="alert alert-success">
        <i class="fas fa-check-circle me-2"></i>Marks report downloaded successfully!
      </div>
    `;
  } catch (error) {
    console.error("Error downloading marks report:", error);
    statusDiv.innerHTML = `
      <div class="alert alert-danger">
        <i class="fas fa-exclamation-circle me-2"></i>Error: ${error.message}
      </div>
    `;
  }
}

// ============ Admin Marks Summary Functions ============

let marksSummaryData = [];

// Load marks entry summary for admin
async function loadMarksSummary() {
  const year = document.getElementById("admin-marks-year").value;
  const semester = document.getElementById("admin-marks-semester").value;
  const component = document.getElementById("admin-marks-component").value;
  const container = document.getElementById("marks-summary-container");
  const statusDiv = document.getElementById("marks-download-status");

  if (!year || !semester || !component) {
    if (statusDiv) statusDiv.innerHTML = `
      <div class="alert alert-warning">
        <i class="fas fa-exclamation-triangle me-2"></i>Please select Academic Year, Semester, and Component.
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="text-center py-3">
      <i class="fas fa-spinner fa-spin me-2"></i>Loading summary...
    </div>
  `;
  if (statusDiv) statusDiv.innerHTML = "";

  try {
    const token = localStorage.getItem("token");
    const res = await fetch(
      `${window.API_URL}/reports/student-marks/summary?slot_year=${year}&semester_type=${semester}&component=${component}`,
      { headers: { "x-access-token": token } }
    );

    if (!res.ok) throw new Error("Failed to load summary");

    marksSummaryData = await res.json();

    if (marksSummaryData.length === 0) {
      container.innerHTML = `
        <div class="alert alert-info">
          <i class="fas fa-info-circle me-2"></i>No faculty allocations found for ${component} in ${semester} ${year}.
        </div>
      `;
      return;
    }

    // Count stats
    const total = marksSummaryData.length;
    const complete = marksSummaryData.filter(r => r.status === "Complete").length;
    const partial = marksSummaryData.filter(r => r.status === "Partial").length;
    const notEntered = marksSummaryData.filter(r => r.status === "Not Entered").length;
    const notConfigured = marksSummaryData.filter(r => r.status === "Not Configured").length;

    let html = `
      <!-- Stats -->
      <div class="row mb-3 g-2">
        <div class="col">
          <div class="card bg-light">
            <div class="card-body text-center py-2">
              <h5 class="mb-0">${total}</h5>
              <small class="text-muted">Total</small>
            </div>
          </div>
        </div>
        <div class="col">
          <div class="card bg-success bg-opacity-10 border-success">
            <div class="card-body text-center py-2">
              <h5 class="mb-0 text-success">${complete}</h5>
              <small class="text-muted">Complete</small>
            </div>
          </div>
        </div>
        <div class="col">
          <div class="card bg-warning bg-opacity-10 border-warning">
            <div class="card-body text-center py-2">
              <h5 class="mb-0 text-warning">${partial}</h5>
              <small class="text-muted">Partial</small>
            </div>
          </div>
        </div>
        <div class="col">
          <div class="card bg-danger bg-opacity-10 border-danger">
            <div class="card-body text-center py-2">
              <h5 class="mb-0 text-danger">${notEntered}</h5>
              <small class="text-muted">Not Entered</small>
            </div>
          </div>
        </div>
        <div class="col">
          <div class="card bg-secondary bg-opacity-10 border-secondary">
            <div class="card-body text-center py-2">
              <h5 class="mb-0 text-secondary">${notConfigured}</h5>
              <small class="text-muted">Not Configured</small>
            </div>
          </div>
        </div>
      </div>

      <!-- Filter by Status -->
      <div class="mb-2">
        <span class="me-2 text-muted small">Filter:</span>
        <button class="btn btn-sm btn-outline-dark me-1 active" onclick="filterSummaryByStatus('All', this)">All</button>
        <button class="btn btn-sm btn-outline-success me-1" onclick="filterSummaryByStatus('Complete', this)">Complete</button>
        <button class="btn btn-sm btn-outline-warning me-1" onclick="filterSummaryByStatus('Partial', this)">Partial</button>
        <button class="btn btn-sm btn-outline-danger me-1" onclick="filterSummaryByStatus('Not Entered', this)">Not Entered</button>
        <button class="btn btn-sm btn-outline-secondary me-1" onclick="filterSummaryByStatus('Not Configured', this)">Not Configured</button>
      </div>

      <!-- Actions -->
      <div class="d-flex justify-content-between align-items-center mb-2">
        <div>
          <button class="btn btn-sm btn-outline-primary me-2" onclick="toggleAllSummaryRows(true)">Select All</button>
          <button class="btn btn-sm btn-outline-secondary me-2" onclick="toggleAllSummaryRows(false)">Deselect All</button>
          <button class="btn btn-sm btn-info text-white" onclick="downloadStatusReport()">
            <i class="fas fa-file-excel me-1"></i>Download Status Report
          </button>
        </div>
        <button class="btn btn-success" onclick="downloadSelectedMarks()">
          <i class="fas fa-download me-2"></i>Download Selected Marks
        </button>
      </div>

      <!-- Table -->
      <div class="table-responsive">
        <table class="table table-bordered table-hover table-sm">
          <thead class="table-dark">
            <tr>
              <th style="width:40px"><input type="checkbox" id="summary-select-all" onchange="toggleAllSummaryRows(this.checked)"></th>
              <th>Course</th>
              <th>Slot</th>
              <th>Faculty</th>
              <th>Type</th>
              <th>Entered</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
    `;

    marksSummaryData.forEach((row, idx) => {
      let statusBadge;
      if (row.status === "Complete") {
        statusBadge = '<span class="badge bg-success">Complete</span>';
      } else if (row.status === "Partial") {
        statusBadge = '<span class="badge bg-warning text-dark">Partial</span>';
      } else if (row.status === "Not Configured") {
        statusBadge = '<span class="badge bg-secondary">Not Configured</span>';
      } else {
        statusBadge = '<span class="badge bg-danger">Not Entered</span>';
      }

      const canDownload = row.status !== "Not Configured";

      html += `
        <tr>
          <td><input type="checkbox" class="summary-row-check" data-idx="${idx}" ${canDownload ? "" : "disabled"}></td>
          <td>${row.course_code} - ${row.course_name}</td>
          <td>${row.slot_name}</td>
          <td>${row.faculty_name}</td>
          <td><small>${row.assessment_type}</small></td>
          <td>${row.students_with_marks}/${row.total_students}</td>
          <td>${statusBadge}</td>
          <td>
            ${canDownload ? `<button class="btn btn-sm btn-outline-success" onclick="downloadSingleMarks(${idx})" title="Download">
              <i class="fas fa-download"></i>
            </button>` : `<button class="btn btn-sm btn-outline-secondary" disabled title="Not configured">
              <i class="fas fa-download"></i>
            </button>`}
          </td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
    `;

    container.innerHTML = html;

  } catch (error) {
    console.error("Error loading marks summary:", error);
    container.innerHTML = `
      <div class="alert alert-danger">
        <i class="fas fa-exclamation-circle me-2"></i>Error: ${error.message}
      </div>
    `;
  }
}

// Filter summary table by status
function filterSummaryByStatus(status, btn) {
  // Update active button
  if (btn) {
    btn.closest("div").querySelectorAll("button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  }

  const rows = document.querySelectorAll(".summary-row-check");
  rows.forEach(cb => {
    const idx = parseInt(cb.dataset.idx);
    const row = marksSummaryData[idx];
    const tr = cb.closest("tr");
    if (status === "All" || row.status === status) {
      tr.style.display = "";
    } else {
      tr.style.display = "none";
    }
  });
}

// Download status report as CSV
function downloadStatusReport() {
  if (!marksSummaryData.length) return;

  const year = document.getElementById("admin-marks-year").value;
  const semester = document.getElementById("admin-marks-semester").value;
  const component = document.getElementById("admin-marks-component").value;

  const headers = ["Course Code", "Course Name", "Slot", "Faculty", "Assessment Type", "Students Entered", "Total Students", "Status"];

  // Sort by status: Not Configured, Not Entered, Partial, Complete
  const statusOrder = { "Not Configured": 0, "Not Entered": 1, "Partial": 2, "Complete": 3 };
  const sorted = [...marksSummaryData].sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

  let csv = headers.join(",") + "\n";
  sorted.forEach(r => {
    csv += [
      `"${r.course_code}"`, `"${r.course_name}"`, `"${r.slot_name}"`, `"${r.faculty_name}"`,
      `"${r.assessment_type}"`, r.students_with_marks, r.total_students, `"${r.status}"`
    ].join(",") + "\n";
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const semPrefix = semester === "WINTER" ? "WS" : semester === "FALL" ? "FS" : "SS";
  const cleanYear = year.replace(/-/g, "_");
  const filename = `${semPrefix}${cleanYear}_${component}_Status_Report.csv`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Toggle all checkboxes (only visible rows)
function toggleAllSummaryRows(checked) {
  document.querySelectorAll(".summary-row-check").forEach(cb => {
    if (!cb.disabled && cb.closest("tr").style.display !== "none") cb.checked = checked;
  });
  const selectAll = document.getElementById("summary-select-all");
  if (selectAll) selectAll.checked = checked;
}

// Download marks for a single row
async function downloadSingleMarks(idx) {
  const row = marksSummaryData[idx];
  if (!row) return;

  const year = document.getElementById("admin-marks-year").value;
  const semester = document.getElementById("admin-marks-semester").value;
  const component = document.getElementById("admin-marks-component").value;

  await doMarksDownload(year, semester, component, row.course_code, row.slot_name, row.employee_id);
}

// Download marks for all selected rows
async function downloadSelectedMarks() {
  const checkboxes = document.querySelectorAll(".summary-row-check:checked");
  if (checkboxes.length === 0) {
    const statusDiv = document.getElementById("marks-download-status");
    if (statusDiv) statusDiv.innerHTML = `
      <div class="alert alert-warning">
        <i class="fas fa-exclamation-triangle me-2"></i>Please select at least one row to download.
      </div>
    `;
    return;
  }

  const year = document.getElementById("admin-marks-year").value;
  const semester = document.getElementById("admin-marks-semester").value;
  const component = document.getElementById("admin-marks-component").value;

  if (checkboxes.length === 1) {
    // Single selection — download individual file
    const idx = parseInt(checkboxes[0].dataset.idx);
    const row = marksSummaryData[idx];
    await doMarksDownload(year, semester, component, row.course_code, row.slot_name, row.employee_id);
  } else {
    // Multiple selection — download as one Excel with multiple sheets
    const params = new URLSearchParams();
    params.append("slot_year", year);
    params.append("semester_type", semester);
    params.append("component", component);

    // Pass selected items as comma-separated course_code:slot_name:employee_id
    const items = [];
    checkboxes.forEach(cb => {
      const row = marksSummaryData[parseInt(cb.dataset.idx)];
      items.push(`${row.course_code}:${row.slot_name}:${row.employee_id}`);
    });
    params.append("items", items.join(","));

    await doMarksDownload(year, semester, component, null, null, null, params.toString());
  }
}

// Core download helper for admin
async function doMarksDownload(year, semester, component, courseCode, slotName, employeeId, customParams) {
  const statusDiv = document.getElementById("marks-download-status");
  statusDiv.innerHTML = `
    <div class="alert alert-info">
      <i class="fas fa-spinner fa-spin me-2"></i>Preparing download...
    </div>
  `;

  try {
    let url;
    if (customParams) {
      url = `${window.API_URL}/reports/student-marks?${customParams}`;
    } else {
      const params = new URLSearchParams();
      params.append("slot_year", year);
      params.append("semester_type", semester);
      params.append("component", component);
      if (courseCode) params.append("course_code", courseCode);
      if (slotName) params.append("slot_name", slotName);
      if (employeeId) params.append("employee_id", employeeId);
      url = `${window.API_URL}/reports/student-marks?${params.toString()}`;
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "x-access-token": localStorage.getItem("token"),
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to download marks report");
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get("Content-Disposition");
    let filename = "student_marks_report.xlsx";
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?(.+?)"?$/);
      if (match) filename = match[1];
    }

    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);

    statusDiv.innerHTML = `
      <div class="alert alert-success">
        <i class="fas fa-check-circle me-2"></i>Marks report downloaded successfully!
      </div>
    `;
  } catch (error) {
    console.error("Error downloading marks report:", error);
    statusDiv.innerHTML = `
      <div class="alert alert-danger">
        <i class="fas fa-exclamation-circle me-2"></i>Error: ${error.message}
      </div>
    `;
  }
}

// ============ Attendance Report Functions ============

let attCoursesCache = [];

// When year or semester changes, load attendance courses
async function onAttYearSemesterChange() {
  const year = document.getElementById("att-filter-year").value;
  const semester = document.getElementById("att-filter-semester").value;
  const courseSelect = document.getElementById("att-filter-course");
  const slotSelect = document.getElementById("att-filter-slot");

  courseSelect.innerHTML = '<option value="">Loading courses...</option>';
  slotSelect.innerHTML = '<option value="">All Slots</option>';
  attCoursesCache = [];

  if (!year || !semester) {
    courseSelect.innerHTML = '<option value="">Select Year & Semester first</option>';
    return;
  }

  try {
    const token = localStorage.getItem("token");
    const res = await fetch(
      `${window.API_URL}/reports/student-attendance/courses?slot_year=${year}&semester_type=${semester}`,
      { headers: { "x-access-token": token } }
    );
    if (!res.ok) throw new Error("Failed to load courses");

    attCoursesCache = await res.json();
    courseSelect.innerHTML = '<option value="">Select Course</option>';

    const uniqueCourses = [];
    const seen = new Set();
    for (const c of attCoursesCache) {
      if (!seen.has(c.course_code)) {
        seen.add(c.course_code);
        uniqueCourses.push(c);
      }
    }
    uniqueCourses.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.course_code;
      opt.textContent = `${c.course_code} - ${c.course_name}`;
      courseSelect.appendChild(opt);
    });
  } catch (error) {
    console.error("Error loading attendance courses:", error);
    courseSelect.innerHTML = '<option value="">Error loading courses</option>';
  }
}

// When course changes, load slots and populate faculty dropdown for admin
async function onAttCourseChange() {
  const year = document.getElementById("att-filter-year").value;
  const semester = document.getElementById("att-filter-semester").value;
  const courseCode = document.getElementById("att-filter-course").value;
  const slotSelect = document.getElementById("att-filter-slot");
  const facultySelect = document.getElementById("att-filter-faculty");

  slotSelect.innerHTML = '<option value="">All Slots</option>';
  if (facultySelect) facultySelect.innerHTML = '<option value="">Select Faculty</option>';
  if (!courseCode) {
    if (facultySelect) facultySelect.innerHTML = '<option value="">Select Course first</option>';
    return;
  }

  // Populate faculty dropdown for admin
  if (facultySelect) {
    const uniqueFaculty = [];
    const seenFac = new Set();
    for (const c of attCoursesCache) {
      if (c.course_code === courseCode && !seenFac.has(c.employee_id)) {
        seenFac.add(c.employee_id);
        uniqueFaculty.push({ employee_id: c.employee_id, faculty_name: c.faculty_name });
      }
    }
    uniqueFaculty.sort((a, b) => a.faculty_name.localeCompare(b.faculty_name));
    uniqueFaculty.forEach(f => {
      const opt = document.createElement("option");
      opt.value = f.employee_id;
      opt.textContent = f.faculty_name;
      facultySelect.appendChild(opt);
    });
    // Auto-select if only one faculty
    if (uniqueFaculty.length === 1) {
      facultySelect.value = uniqueFaculty[0].employee_id;
    }
  }

  try {
    const token = localStorage.getItem("token");
    const res = await fetch(
      `${window.API_URL}/reports/student-attendance/slots?slot_year=${year}&semester_type=${semester}&course_code=${courseCode}`,
      { headers: { "x-access-token": token } }
    );
    if (res.ok) {
      const slots = await res.json();
      slots.forEach(s => {
        const opt = document.createElement("option");
        opt.value = s.slot_name;
        opt.textContent = `${s.slot_name} (${s.venue})`;
        slotSelect.appendChild(opt);
      });
    }
  } catch (error) {
    console.error("Error loading attendance slots:", error);
  }
}

// Clear attendance filters
function clearAttFilters() {
  document.getElementById("att-filter-year").value = "";
  document.getElementById("att-filter-semester").value = "";
  document.getElementById("att-filter-course").innerHTML = '<option value="">Select Year & Semester first</option>';
  document.getElementById("att-filter-slot").innerHTML = '<option value="">All Slots</option>';
  const facultySelect = document.getElementById("att-filter-faculty");
  if (facultySelect) facultySelect.innerHTML = '<option value="">Select Course first</option>';
  attCoursesCache = [];
}

// Download attendance report
async function downloadAttendanceReport() {
  const year = document.getElementById("att-filter-year").value;
  const semester = document.getElementById("att-filter-semester").value;
  const course = document.getElementById("att-filter-course").value;
  const slot = document.getElementById("att-filter-slot").value;
  const facultySelect = document.getElementById("att-filter-faculty");
  const empId = facultySelect ? facultySelect.value : "";
  const statusDiv = document.getElementById("att-download-status");

  if (!year || !semester || !course) {
    statusDiv.innerHTML = `
      <div class="alert alert-warning">
        <i class="fas fa-exclamation-triangle me-2"></i>Please select Academic Year, Semester, and Course.
      </div>
    `;
    return;
  }

  // Admin must select a faculty
  if (facultySelect && !empId) {
    statusDiv.innerHTML = `
      <div class="alert alert-warning">
        <i class="fas fa-exclamation-triangle me-2"></i>Please select a Faculty.
      </div>
    `;
    return;
  }

  statusDiv.innerHTML = `
    <div class="alert alert-info">
      <i class="fas fa-spinner fa-spin me-2"></i>Preparing attendance report...
    </div>
  `;

  try {
    const params = new URLSearchParams();
    params.append("slot_year", year);
    params.append("semester_type", semester);
    params.append("course_code", course);
    if (slot) params.append("slot_name", slot);
    if (empId) params.append("employee_id", empId);

    const response = await fetch(`${window.API_URL}/reports/student-attendance?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "x-access-token": localStorage.getItem("token"),
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to download attendance report");
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get("Content-Disposition");
    let filename = "attendance_report.xlsx";
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?(.+?)"?$/);
      if (match) filename = match[1];
    }

    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);

    statusDiv.innerHTML = `
      <div class="alert alert-success">
        <i class="fas fa-check-circle me-2"></i>Attendance report downloaded successfully!
      </div>
    `;
  } catch (error) {
    console.error("Error downloading attendance report:", error);
    statusDiv.innerHTML = `
      <div class="alert alert-danger">
        <i class="fas fa-exclamation-circle me-2"></i>Error: ${error.message}
      </div>
    `;
  }
}

// Make functions available globally
window.initializeDownloadReports = initializeDownloadReports;
window.downloadRegistrations = downloadRegistrations;
window.downloadAllRegistrations = downloadAllRegistrations;
window.clearReportFilters = clearReportFilters;
window.onMarksYearSemesterChange = onMarksYearSemesterChange;
window.onMarksCourseChange = onMarksCourseChange;
window.onMarksSlotChange = onMarksSlotChange;
window.clearMarksFilters = clearMarksFilters;
window.downloadMarksReport = downloadMarksReport;
window.loadMarksSummary = loadMarksSummary;
window.filterSummaryByStatus = filterSummaryByStatus;
window.downloadStatusReport = downloadStatusReport;
window.toggleAllSummaryRows = toggleAllSummaryRows;
window.downloadSingleMarks = downloadSingleMarks;
window.downloadSelectedMarks = downloadSelectedMarks;
window.onAttYearSemesterChange = onAttYearSemesterChange;
window.onAttCourseChange = onAttCourseChange;
window.clearAttFilters = clearAttFilters;
window.downloadAttendanceReport = downloadAttendanceReport;
window.downloadIneligibleReport = downloadIneligibleReport;
window.downloadCoursesReport = downloadCoursesReport;
console.log("download-reports.js loaded successfully");

// ============ Ineligible Students Report Functions ============

async function downloadIneligibleReport() {
  const year = document.getElementById("inel-filter-year").value;
  const semester = document.getElementById("inel-filter-semester").value;
  const level = document.getElementById("inel-filter-level").value;
  const school = document.getElementById("inel-filter-school").value;
  const cutoff = document.getElementById("inel-filter-cutoff").value;
  const statusDiv = document.getElementById("inel-download-status");

  if (!year || !semester || !level || !cutoff) {
    statusDiv.innerHTML = `
      <div class="alert alert-warning">
        <i class="fas fa-exclamation-triangle me-2"></i>Please select Academic Year, Semester, Level, and Cutoff Date.
      </div>
    `;
    return;
  }

  statusDiv.innerHTML = `
    <div class="alert alert-info">
      <i class="fas fa-spinner fa-spin me-2"></i>Generating ineligible students report...
    </div>
  `;

  try {
    const params = new URLSearchParams();
    params.append("slot_year", year);
    params.append("semester_type", semester);
    params.append("level", level);
    params.append("cutoff_date", cutoff);
    if (school) params.append("school", school);

    const response = await fetch(`${window.API_URL}/reports/ineligible-students?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "x-access-token": localStorage.getItem("token"),
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to download report");
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get("Content-Disposition");
    let filename = "ineligible_students_report.xlsx";
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?(.+?)"?$/);
      if (match) filename = match[1];
    }

    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);

    statusDiv.innerHTML = `
      <div class="alert alert-success">
        <i class="fas fa-check-circle me-2"></i>Ineligible students report downloaded successfully!
      </div>
    `;
  } catch (error) {
    console.error("Error downloading ineligible report:", error);
    statusDiv.innerHTML = `
      <div class="alert alert-danger">
        <i class="fas fa-exclamation-circle me-2"></i>Error: ${error.message}
      </div>
    `;
  }
}

// ============ Courses Report Functions ============

async function downloadCoursesReport() {
  const school = document.getElementById("courses-filter-school").value;
  const courseType = document.getElementById("courses-filter-type").value;
  const statusDiv = document.getElementById("courses-download-status");

  statusDiv.innerHTML = `
    <div class="alert alert-info">
      <i class="fas fa-spinner fa-spin me-2"></i>Preparing courses download...
    </div>
  `;

  try {
    const params = new URLSearchParams();
    if (school) params.append("school", school);
    if (courseType) params.append("course_type", courseType);

    const response = await fetch(`${window.API_URL}/reports/courses?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "x-access-token": localStorage.getItem("token"),
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to download courses");
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get("Content-Disposition");
    let filename = "courses.xlsx";
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?(.+?)"?$/);
      if (match) filename = match[1];
    }

    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);

    statusDiv.innerHTML = `
      <div class="alert alert-success">
        <i class="fas fa-check-circle me-2"></i>Courses downloaded successfully!
      </div>
    `;
  } catch (error) {
    console.error("Error downloading courses:", error);
    statusDiv.innerHTML = `
      <div class="alert alert-danger">
        <i class="fas fa-exclamation-circle me-2"></i>Error: ${error.message}
      </div>
    `;
  }
}
