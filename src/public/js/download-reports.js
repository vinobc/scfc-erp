// Download Reports Management
console.log("Loading download-reports.js file...");

// Initialize download reports functionality
function initializeDownloadReports() {
  console.log("Initializing download reports...");
  displayDownloadReportsInterface();
  loadFilterOptions();
}

// Load filter dropdown options
async function loadFilterOptions() {
  const token = localStorage.getItem("token");
  const headers = { "x-access-token": token };

  try {
    // Load distinct slot_years and semester_types from available data
    const [schoolsRes, programsRes, coursesRes] = await Promise.all([
      fetch(`${window.API_URL}/schools`, { headers }),
      fetch(`${window.API_URL}/programs`, { headers }),
      fetch(`${window.API_URL}/courses`, { headers })
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

  if (year) params.append("slot_year", year);
  if (semester) params.append("semester_type", semester);
  if (school) params.append("school", school);
  if (program) params.append("program_code", program);
  if (course) params.append("course_code", course);

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

// Make functions available globally
window.initializeDownloadReports = initializeDownloadReports;
window.downloadRegistrations = downloadRegistrations;
window.downloadAllRegistrations = downloadAllRegistrations;
window.clearReportFilters = clearReportFilters;
console.log("download-reports.js loaded successfully");
