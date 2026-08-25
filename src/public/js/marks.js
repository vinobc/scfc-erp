// Marks Entry System - Frontend JavaScript
console.log("Loading marks.js file...");

// Global variables
let currentSemesters = [];
let currentCourses = [];
let selectedCourse = null;
let currentConfig = null;
let enrolledStudents = [];

// Helper function to format date for display (DD/MM/YYYY)
function formatDateForDisplay(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// Helper function to format date for storage (YYYY-MM-DD)
function formatDateForStorage(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Initialize marks system
function initializeMarks() {
  console.log("Initializing marks entry system");
  loadMarksInterface();
}

// Load main marks interface
async function loadMarksInterface() {
  console.log("Loading marks interface...");
  const content = document.getElementById("marks-content");
  if (!content) {
    console.error("marks-content element not found!");
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
    const response = await fetch(`${window.API_URL}/marks/semesters`, {
      headers: { "x-access-token": localStorage.getItem("token") },
    });

    if (!response.ok) {
      throw new Error(`Failed to load semesters: ${response.status}`);
    }

    currentSemesters = await response.json();
    renderSemesterSelection();
  } catch (error) {
    console.error("Error loading marks interface:", error);
    showMarksError("Error loading marks system. Please try again.");
  }
}

// Render semester selection interface
function renderSemesterSelection() {
  const content = document.getElementById("marks-content");

  if (!currentSemesters.length) {
    content.innerHTML = `
      <div class="alert alert-info text-center">
        <h5>No Course Allocations Found</h5>
        <p>You don't have any course allocations assigned. Please contact the administrator.</p>
      </div>
    `;
    return;
  }

  let semesterOptions = currentSemesters
    .map(
      (semester) =>
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
              <h5 class="mb-0"><i class="fas fa-edit me-2"></i>Marks Entry System</h5>
            </div>
            <div class="card-body">

              <!-- Step 1: Semester Selection -->
              <div id="semester-selection-step" class="step-section">
                <h6 class="text-primary mb-3"><i class="fas fa-calendar-alt me-2"></i>Step 1: Select Academic Year & Semester</h6>
                <div class="row">
                  <div class="col-md-6">
                    <label for="marks-semester-select" class="form-label">Academic Year & Semester</label>
                    <select id="marks-semester-select" class="form-select">
                      <option value="">Select Academic Year & Semester</option>
                      ${semesterOptions}
                    </select>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label">&nbsp;</label>
                    <div>
                      <button id="load-marks-courses-btn" class="btn btn-primary" onclick="loadMarksCourses()" disabled>
                        <i class="fas fa-arrow-right me-2"></i>Load My Courses
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Admin Lock Controls (only visible to admin) -->
              <div id="admin-lock-controls" class="step-section d-none mt-4">
                <!-- Lock controls will be loaded here -->
              </div>

              <!-- Step 2: Course Selection -->
              <div id="course-selection-step" class="step-section d-none mt-4">
                <h6 class="text-primary mb-3"><i class="fas fa-book me-2"></i>Step 2: Select Course</h6>
                <div id="marks-course-list">
                  <!-- Courses will be loaded here -->
                </div>
              </div>

              <!-- Step 3: Components Dashboard -->
              <div id="components-dashboard-step" class="step-section d-none mt-4">
                <h6 class="text-primary mb-3"><i class="fas fa-list-alt me-2"></i>Step 3: Assessment Components</h6>
                <div id="components-dashboard">
                  <!-- Components will be loaded here -->
                </div>
              </div>

              <!-- Step 4: Configuration/Entry -->
              <div id="config-entry-step" class="step-section d-none mt-4">
                <div id="config-entry-content">
                  <!-- Config or entry form will be loaded here -->
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Setup event listeners
  const semesterSelect = document.getElementById("marks-semester-select");
  const loadCoursesBtn = document.getElementById("load-marks-courses-btn");

  semesterSelect.addEventListener("change", function () {
    loadCoursesBtn.disabled = !this.value;
    document.getElementById("course-selection-step").classList.add("d-none");
    document.getElementById("components-dashboard-step").classList.add("d-none");
    document.getElementById("config-entry-step").classList.add("d-none");
  });
}

// Load courses for selected semester
async function loadMarksCourses() {
  const semesterSelect = document.getElementById("marks-semester-select");
  const [slot_year, semester_type] = semesterSelect.value.split("|");

  const isCoe = typeof currentUser !== "undefined" && currentUser?.role === "coe";

  try {
    // Show admin/CoE lock controls (bulk grid + selective unlock exceptions)
    if (typeof currentUser !== "undefined" && ["admin", "coe"].includes(currentUser?.role)) {
      renderAdminLockControls(slot_year, semester_type);
    }

    // CoE has no faculty allocations and doesn't need the marks entry flow —
    // the lock panel above is their entire workflow. Hide the course step.
    if (isCoe) {
      document.getElementById("course-selection-step").classList.add("d-none");
      return;
    }

    const courseList = document.getElementById("marks-course-list");
    courseList.innerHTML = `
      <div class="text-center py-3">
        <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
        <span class="ms-2">Loading courses...</span>
      </div>
    `;

    document.getElementById("course-selection-step").classList.remove("d-none");

    const response = await fetch(
      `${window.API_URL}/marks/courses?slot_year=${slot_year}&semester_type=${semester_type}`,
      { headers: { "x-access-token": localStorage.getItem("token") } }
    );

    if (!response.ok) {
      throw new Error(`Failed to load courses: ${response.status}`);
    }

    currentCourses = await response.json();
    renderCourseList();
  } catch (error) {
    console.error("Error loading courses:", error);
    showMarksError("Error loading courses. Please try again.");
  }
}

// Render course list (each slot as separate card)
function renderCourseList() {
  const courseList = document.getElementById("marks-course-list");

  if (!currentCourses.length) {
    courseList.innerHTML = `
      <div class="alert alert-warning">
        No courses found for this semester.
      </div>
    `;
    return;
  }

  // Each course in the list is already a separate slot from the backend
  const courseCards = currentCourses
    .map(
      (course, index) => `
      <div class="card mb-3 course-card" onclick="selectCourseForMarks(${index})">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <h6 class="card-title mb-1">${course.course_code} - ${course.course_name}</h6>
              <p class="card-text text-muted mb-2">
                <small>Faculty: ${course.faculty_name} | Slot: <strong>${course.slot_name}</strong> | Venue: <strong>${course.venue}</strong></small>
              </p>
              <p class="card-text text-muted mb-0">
                <small>${course.schedule || ''}</small>
              </p>
            </div>
            <div class="text-end">
              <span class="badge bg-${getAssessmentTypeBadgeColor(course.assessment_type)}">${course.assessment_type}</span>
              <span class="badge bg-secondary ms-1">${course.course_type}</span>
            </div>
          </div>
          <div class="small text-muted mt-1">
            ${formatAssessmentStructure(course.assessment_structure)}
          </div>
        </div>
      </div>
    `
    )
    .join("");

  courseList.innerHTML = courseCards;
}

// Get badge color based on assessment type
function getAssessmentTypeBadgeColor(type) {
  const colors = {
    UG_THEORY: "primary",
    PG_THEORY: "info",
    UG_INTEGRATED: "success",
    PG_INTEGRATED: "warning",
    UG_LAB: "danger",
    PG_LAB: "dark",
  };
  return colors[type] || "secondary";
}

// Format assessment structure for display
function formatAssessmentStructure(structure) {
  if (!structure) return "";

  const parts = [];
  if (structure.cas && structure.cas.length > 0) {
    const caTotal = structure.cas.reduce((sum, ca) => sum + ca.scaledTo, 0);
    parts.push(`CAs: ${caTotal}`);
  }
  if (structure.labTotal > 0) {
    parts.push(`Lab: ${structure.labTotal}`);
  }
  if (structure.assignmentTotal > 0) {
    parts.push(`Assignment: ${structure.assignmentTotal}`);
  }

  return parts.join(" | ") + " = 100";
}

// Select course for marks entry (by index - each slot is separate)
async function selectCourseForMarks(courseIndex) {
  const semesterSelect = document.getElementById("marks-semester-select");
  const [slot_year, semester_type] = semesterSelect.value.split("|");

  selectedCourse = currentCourses[courseIndex];

  if (!selectedCourse) {
    showMarksError("Course not found");
    return;
  }

  // Show components dashboard
  document.getElementById("components-dashboard-step").classList.remove("d-none");
  document.getElementById("config-entry-step").classList.add("d-none");

  await loadComponentsDashboard(slot_year, semester_type, selectedCourse.course_code, selectedCourse.employee_id, selectedCourse.slot_name, selectedCourse.venue);
}

// Load components dashboard (slot-specific)
async function loadComponentsDashboard(slot_year, semester_type, course_code, employee_id, slot_name, venue) {
  const dashboard = document.getElementById("components-dashboard");

  dashboard.innerHTML = `
    <div class="text-center py-3">
      <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
      <span class="ms-2">Loading assessment components...</span>
    </div>
  `;

  try {
    // Get assessment config for THEORY component (slot-specific)
    const theoryResponse = await fetch(
      `${window.API_URL}/marks/config?slot_year=${slot_year}&semester_type=${semester_type}&course_code=${course_code}&employee_id=${employee_id}&slot_name=${encodeURIComponent(slot_name)}&venue=${encodeURIComponent(venue)}&component_type=THEORY`,
      { headers: { "x-access-token": localStorage.getItem("token") } }
    );

    const theoryConfig = await theoryResponse.json();

    // Get LAB config if applicable (TEL or P courses)
    let labConfig = null;
    if (selectedCourse.course_type === "TEL" || selectedCourse.course_type === "P") {
      const labResponse = await fetch(
        `${window.API_URL}/marks/config?slot_year=${slot_year}&semester_type=${semester_type}&course_code=${course_code}&employee_id=${employee_id}&slot_name=${encodeURIComponent(slot_name)}&venue=${encodeURIComponent(venue)}&component_type=LAB`,
        { headers: { "x-access-token": localStorage.getItem("token") } }
      );
      labConfig = await labResponse.json();
    }

    // Get effective per-component lock status for THIS specific slot —
    // factors in both bulk locks and any active unlock exceptions granted
    // by admin/CoE to this faculty+course+slot.
    const lockResponse = await fetch(
      `${window.API_URL}/marks/effective-locks?slot_year=${slot_year}&semester_type=${semester_type}` +
      `&course_code=${encodeURIComponent(course_code)}&employee_id=${encodeURIComponent(employee_id)}` +
      `&slot_name=${encodeURIComponent(slot_name)}&venue=${encodeURIComponent(venue)}`,
      { headers: { "x-access-token": localStorage.getItem("token") } }
    );

    let lockStatus = [];
    if (lockResponse.ok) {
      lockStatus = await lockResponse.json();
    }

    // Publish status for each configured component-instance. Set of keys
    // "config_id|assessment_type|assessment_number" — presence = published.
    const publishedKeys = new Set();
    const configIdsToCheck = [];
    if (theoryConfig?.exists && theoryConfig.id) configIdsToCheck.push(theoryConfig.id);
    if (labConfig?.exists && labConfig.id) configIdsToCheck.push(labConfig.id);
    for (const cid of configIdsToCheck) {
      try {
        const psRes = await fetch(
          `${window.API_URL}/marks/publish-status?assessment_config_id=${cid}`,
          { headers: { "x-access-token": localStorage.getItem("token") } }
        );
        if (psRes.ok) {
          const rows = await psRes.json();
          for (const r of rows) {
            publishedKeys.add(`${cid}|${r.assessment_type}|${r.assessment_number}`);
          }
        }
      } catch {}
    }

    renderComponentsDashboard(theoryConfig, labConfig, lockStatus, publishedKeys);
  } catch (error) {
    console.error("Error loading components dashboard:", error);
    dashboard.innerHTML = `
      <div class="alert alert-danger">
        Error loading assessment components. Please try again.
      </div>
    `;
  }
}

// Derive the course's program level from its course_code (mirrors backend).
// 1-4 = UG, 5-6 = PG, 7+ = RESEARCH (bypasses lock).
function deriveProgramLevelFromCode(courseCode) {
  const levelDigit = parseInt(String(courseCode || "").charAt(3));
  if (levelDigit >= 1 && levelDigit <= 4) return "UG";
  if (levelDigit >= 5 && levelDigit <= 6) return "PG";
  return "RESEARCH";
}

// Check if a component is locked for a given course. Matches the backend
// rule: RESEARCH bypasses; UG/PG match ANY lock row whose program_level is
// 'ALL' or equals the course's level.
function isComponentLockedForCourse(lockStatus, componentType, courseCode) {
  const level = deriveProgramLevelFromCode(courseCode);
  if (level !== "UG" && level !== "PG") return false;
  return (lockStatus || []).some(
    l => l.component_type === componentType
      && (l.program_level === "ALL" || l.program_level === level)
      && l.is_locked
  );
}

// Render components dashboard
function renderComponentsDashboard(theoryConfig, labConfig, lockStatus, publishedKeys) {
  const dashboard = document.getElementById("components-dashboard");
  const structure = selectedCourse.assessment_structure;
  const pubSet = publishedKeys instanceof Set ? publishedKeys : new Set();
  // Small helper: badge for the Status column reflecting publish state.
  const publishBadge = (configId, type, num) => {
    if (!configId) return "";
    const isPub = pubSet.has(`${configId}|${type}|${num || 1}`);
    return isPub
      ? '<span class="badge bg-info ms-1" title="Students can see these marks">Published</span>'
      : '<span class="badge bg-secondary ms-1" title="Not yet visible to students">Not published</span>';
  };

  // Determine which components to show based on course type and slot type
  const courseType = selectedCourse.course_type;
  const theory = Number(selectedCourse.theory) || 0;
  const practical = Number(selectedCourse.practical) || 0;
  const isLabSlot = /^L\d/.test(selectedCourse.slot_name);

  // NC (non-credit) courses are shaped by theory/practical hours
  const isNcTheory = courseType === 'NC' && theory > 0 && practical === 0;
  const isNcLab = courseType === 'NC' && theory === 0 && practical > 0;
  const isNcIntegrated = courseType === 'NC' && theory > 0 && practical > 0;

  // T (Theory) or TEL with theory slot → show CAs and Assignment
  // P (Lab) or TEL with lab slot → show Lab only
  // NC inherits the same split via its theory/practical hours
  const showTheoryComponents =
    (courseType === 'T') ||
    (courseType === 'TEL' && !isLabSlot) ||
    isNcTheory ||
    (isNcIntegrated && !isLabSlot);
  const showLabComponent =
    (courseType === 'P') ||
    (courseType === 'TEL' && isLabSlot) ||
    isNcLab ||
    (isNcIntegrated && isLabSlot);

  let html = `
    <div class="card mb-3">
      <div class="card-header">
        <strong>${selectedCourse.course_code}</strong> - ${selectedCourse.course_name}
        <span class="badge bg-${getAssessmentTypeBadgeColor(selectedCourse.assessment_type)} ms-2">${selectedCourse.assessment_type}</span>
        <span class="badge bg-info ms-1">${selectedCourse.slot_name}</span>
        <span class="badge bg-secondary ms-1">${selectedCourse.venue}</span>
      </div>
      <div class="card-body">
        <div class="table-responsive">
          <table class="table table-bordered">
            <thead class="table-light">
              <tr>
                <th>Component</th>
                <th>Weightage</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
  `;

  // Add CA rows (only for theory courses or TEL with theory slot)
  if (showTheoryComponents && structure.cas && structure.cas.length > 0) {
    structure.cas.forEach((ca, index) => {
      const caNum = index + 1;
      const isConfigured = theoryConfig.exists && theoryConfig.config_json?.cas?.find(c => c.number === caNum);
      const isLocked = isComponentLockedForCourse(lockStatus, `CA${caNum}`, selectedCourse.course_code);

      html += `
        <tr>
          <td><strong>CA${caNum}</strong></td>
          <td>${ca.scaledTo} marks</td>
          <td>
            ${isConfigured ? '<span class="badge bg-success">Configured</span>' : '<span class="badge bg-warning">Not Configured</span>'}
            ${isLocked ? '<span class="badge bg-danger ms-1">Locked</span>' : ''}
            ${isConfigured ? publishBadge(theoryConfig.id, `CA${caNum}`, 1) : ''}
          </td>
          <td>
            ${isConfigured
              ? `<button class="btn btn-sm btn-primary me-1" onclick="openMarksEntry('CA${caNum}', ${caNum}, 'THEORY')" ${isLocked ? 'disabled' : ''}>
                  <i class="fas fa-edit"></i> Enter Marks
                </button>
                <button class="btn btn-sm btn-outline-secondary" onclick="openConfigForm('CA${caNum}', ${caNum}, 'THEORY')">
                  <i class="fas fa-cog"></i> Edit Config
                </button>`
              : `<button class="btn btn-sm btn-warning" onclick="openConfigForm('CA${caNum}', ${caNum}, 'THEORY')">
                  <i class="fas fa-cog"></i> Configure
                </button>`
            }
          </td>
        </tr>
      `;
    });
  }

  // Add Assignment rows (only for theory courses or TEL with theory slot)
  if (showTheoryComponents && structure.assignmentTotal > 0) {
    const isConfigured = theoryConfig.exists && theoryConfig.config_json?.assignments?.length > 0;
    const isLocked = isComponentLockedForCourse(lockStatus, 'ASSIGNMENT', selectedCourse.course_code);

    if (!isConfigured) {
      // Not configured - show single row with Configure button
      html += `
        <tr>
          <td><strong>Internal Assessment</strong></td>
          <td>${structure.assignmentTotal} marks</td>
          <td><span class="badge bg-warning">Not Configured</span></td>
          <td>
            <button class="btn btn-sm btn-warning" onclick="openConfigForm('ASSIGNMENT', 1, 'THEORY')">
              <i class="fas fa-cog"></i> Configure
            </button>
          </td>
        </tr>
      `;
    } else {
      // Configured - show each assignment as a separate row
      const assignments = theoryConfig.config_json.assignments;
      assignments.forEach((assignment, index) => {
        const assignNum = assignment.number || (index + 1);
        const assignType = assignment.type || 'Internal Assessment';
        html += `
          <tr>
            <td><strong>Internal Assessment ${assignNum}</strong><br><small class="text-muted">${assignType}</small></td>
            <td>${assignment.maxMarks} marks</td>
            <td>
              <span class="badge bg-success">Configured</span>
              ${isLocked ? '<span class="badge bg-danger ms-1">Locked</span>' : ''}
              ${publishBadge(theoryConfig.id, 'ASSIGNMENT', assignNum)}
            </td>
            <td>
              <button class="btn btn-sm btn-primary me-1" onclick="openMarksEntry('ASSIGNMENT', ${assignNum}, 'THEORY')" ${isLocked ? 'disabled' : ''}>
                <i class="fas fa-edit"></i> Enter Marks
              </button>
              <button class="btn btn-sm btn-outline-secondary" onclick="openConfigForm('ASSIGNMENT', ${assignNum}, 'THEORY')">
                <i class="fas fa-cog"></i> Edit Config
              </button>
            </td>
          </tr>
        `;
      });
    }
  }

  // Add Lab row (only for lab courses or TEL with lab slot)
  if (showLabComponent && structure.labTotal > 0) {
    const isConfigured = labConfig?.exists && labConfig.config_json?.labSessions?.length > 0;
    const isLocked = isComponentLockedForCourse(lockStatus, 'LAB', selectedCourse.course_code);

    if (!isConfigured) {
      // Not configured - show single row with Configure button
      html += `
        <tr>
          <td><strong>Lab</strong></td>
          <td>${structure.labTotal} marks</td>
          <td><span class="badge bg-warning">Not Configured</span></td>
          <td>
            <button class="btn btn-sm btn-warning" onclick="openConfigForm('LAB_SESSION', 1, 'LAB')">
              <i class="fas fa-cog"></i> Configure
            </button>
          </td>
        </tr>
      `;
    } else {
      // Configured - show each session separately
      const sessions = labConfig.config_json.labSessions;
      sessions.forEach((session, index) => {
        const sessionNum = index + 1;
        const sessionDate = formatDateForDisplay(session.date);
        html += `
          <tr>
            <td><strong>Lab Session ${sessionNum}</strong><br><small class="text-muted">${sessionDate}</small></td>
            <td>${session.maxMarks} marks</td>
            <td>
              <span class="badge bg-success">Configured</span>
              ${isLocked ? '<span class="badge bg-danger ms-1">Locked</span>' : ''}
              ${publishBadge(labConfig?.id, 'LAB_SESSION', sessionNum)}
            </td>
            <td>
              <button class="btn btn-sm btn-primary me-1" onclick="openMarksEntry('LAB_SESSION', ${sessionNum}, 'LAB')" ${isLocked ? 'disabled' : ''}>
                <i class="fas fa-edit"></i> Enter Marks
              </button>
            </td>
          </tr>
        `;
      });
      // Add Edit Config button as a separate row
      html += `
        <tr class="table-light">
          <td colspan="3"><em>Lab Configuration</em></td>
          <td>
            <button class="btn btn-sm btn-outline-secondary" onclick="openConfigForm('LAB_SESSION', 1, 'LAB')">
              <i class="fas fa-cog"></i> Edit Config
            </button>
          </td>
        </tr>
      `;
    }
  }

  html += `
            </tbody>
          </table>
        </div>
        <div class="mt-3">
          <button class="btn btn-info" onclick="viewMarksSummary()">
            <i class="fas fa-chart-bar me-2"></i>View Summary
          </button>
        </div>
      </div>
    </div>
  `;

  dashboard.innerHTML = html;
}

// Open configuration form
async function openConfigForm(assessmentType, assessmentNumber, componentType) {
  const semesterSelect = document.getElementById("marks-semester-select");
  const [slot_year, semester_type] = semesterSelect.value.split("|");
  const configContent = document.getElementById("config-entry-content");

  document.getElementById("config-entry-step").classList.remove("d-none");

  // Fetch existing config to pre-populate form
  let existingConfig = null;
  try {
    const response = await fetch(
      `${window.API_URL}/marks/config?slot_year=${slot_year}&semester_type=${semester_type}&course_code=${selectedCourse.course_code}&employee_id=${selectedCourse.employee_id}&slot_name=${encodeURIComponent(selectedCourse.slot_name)}&venue=${encodeURIComponent(selectedCourse.venue)}&component_type=${componentType}`,
      { headers: { "x-access-token": localStorage.getItem("token") } }
    );
    if (response.ok) {
      existingConfig = await response.json();
    }
  } catch (e) {
    // Ignore - will use defaults
  }

  if (assessmentType.startsWith("CA")) {
    renderCAConfigForm(assessmentType, assessmentNumber, componentType, existingConfig);
  } else if (assessmentType === "ASSIGNMENT") {
    renderAssignmentConfigForm(componentType, existingConfig);
  } else if (assessmentType === "LAB_SESSION") {
    await renderLabConfigForm(slot_year, semester_type, componentType, existingConfig);
  }
}

// Render CA configuration form
function renderCAConfigForm(caType, caNumber, componentType, existingConfig) {
  const configContent = document.getElementById("config-entry-content");

  // Find existing CA data if available
  let caData = null;
  if (existingConfig?.config_json?.cas) {
    caData = existingConfig.config_json.cas.find((c) => c.number === caNumber);
  }

  // Pre-populate form fields with existing data or defaults.
  // Max marks is fixed at 50 and duration is fixed by program level (UG=90,
  // PG=120). Faculty cannot edit these — they're locked policy inputs, not
  // per-CA choices. RESEARCH (rare / not typically configured with CAs)
  // defaults to UG timing.
  const dateValue = caData?.date || "";
  const FIXED_MAX_MARKS = 50;
  const programLevel = deriveProgramLevelFromCode(selectedCourse.course_code);
  const fixedDuration = programLevel === "PG" ? 120 : 90;

  configContent.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h6 class="mb-0"><i class="fas fa-cog me-2"></i>Configure ${caType}</h6>
      </div>
      <div class="card-body">
        <form id="ca-config-form">
          <div class="row mb-3">
            <div class="col-md-4">
              <label class="form-label">Date Conducted</label>
              <input type="date" class="form-control" id="ca-date" value="${dateValue}" required>
            </div>
            <div class="col-md-4">
              <label class="form-label">Max Marks (conducted for)</label>
              <input type="number" class="form-control bg-light" id="ca-max-marks" value="${FIXED_MAX_MARKS}" readonly>
            </div>
            <div class="col-md-4">
              <label class="form-label">Duration (mins)</label>
              <input type="number" class="form-control bg-light" id="ca-duration" value="${fixedDuration}" readonly>
            </div>
          </div>

          <h6 class="mt-4 mb-3">Question Structure</h6>
          <div id="questions-container">
            <!-- Questions will be added here -->
          </div>

          <button type="button" class="btn btn-outline-primary btn-sm mb-3" onclick="addQuestion()">
            <i class="fas fa-plus me-1"></i>Add Question
          </button>

          <div id="questions-total" class="alert alert-info">
            Total: 0 marks
          </div>

          <div class="d-flex gap-2">
            <button type="submit" class="btn btn-primary">
              <i class="fas fa-save me-2"></i>Save Configuration
            </button>
            <button type="button" class="btn btn-secondary" onclick="closeConfigForm()">
              Cancel
            </button>
            ${caData ? `<button type="button" class="btn btn-outline-danger ms-auto" onclick="resetCAConfig(${caNumber}, '${componentType}')">
              <i class="fas fa-undo me-2"></i>Reset
            </button>` : ""}
          </div>
        </form>
      </div>
    </div>
  `;

  // Pre-populate questions from existing config or add one empty question
  if (caData?.questions && caData.questions.length > 0) {
    caData.questions.forEach((q) => {
      addQuestionWithData(q.id, q.maxMarks);
    });
  } else {
    addQuestion();
  }

  // Form submit handler
  document.getElementById("ca-config-form").addEventListener("submit", (e) => {
    e.preventDefault();
    saveCAConfig(caType, caNumber, componentType);
  });
}

// Add question to form
function addQuestion() {
  const container = document.getElementById("questions-container");
  const questionIndex = container.children.length + 1;

  const questionHtml = `
    <div class="card mb-2 question-card" data-question="${questionIndex}">
      <div class="card-body py-2">
        <div class="row align-items-center">
          <div class="col-md-2">
            <label class="form-label small">Question</label>
            <input type="number" class="form-control form-control-sm question-number" value="${questionIndex}" min="1">
          </div>
          <div class="col-md-3">
            <label class="form-label small">Sub-question (optional)</label>
            <input type="text" class="form-control form-control-sm sub-question" placeholder="a, b, c...">
          </div>
          <div class="col-md-3">
            <label class="form-label small">Max Marks</label>
            <input type="number" class="form-control form-control-sm question-marks" value="5" min="0.5" step="0.5" required onchange="updateQuestionsTotal()">
          </div>
          <div class="col-md-2">
            <label class="form-label small">&nbsp;</label>
            <button type="button" class="btn btn-outline-danger btn-sm d-block" onclick="removeQuestion(this)">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  container.insertAdjacentHTML("beforeend", questionHtml);
  updateQuestionsTotal();
}

// Add question with pre-populated data
function addQuestionWithData(questionId, maxMarks) {
  const container = document.getElementById("questions-container");
  const questionIndex = container.children.length + 1;

  // Parse question ID (e.g., "1a" -> qNum=1, subQ="a", or "2" -> qNum=2, subQ="")
  const match = String(questionId).match(/^(\d+)(.*)$/);
  const qNum = match ? match[1] : questionIndex;
  const subQ = match ? match[2] : "";

  const questionHtml = `
    <div class="card mb-2 question-card" data-question="${questionIndex}">
      <div class="card-body py-2">
        <div class="row align-items-center">
          <div class="col-md-2">
            <label class="form-label small">Question</label>
            <input type="number" class="form-control form-control-sm question-number" value="${qNum}" min="1">
          </div>
          <div class="col-md-3">
            <label class="form-label small">Sub-question (optional)</label>
            <input type="text" class="form-control form-control-sm sub-question" value="${subQ}" placeholder="a, b, c...">
          </div>
          <div class="col-md-3">
            <label class="form-label small">Max Marks</label>
            <input type="number" class="form-control form-control-sm question-marks" value="${maxMarks}" min="0.5" step="0.5" required onchange="updateQuestionsTotal()">
          </div>
          <div class="col-md-2">
            <label class="form-label small">&nbsp;</label>
            <button type="button" class="btn btn-outline-danger btn-sm d-block" onclick="removeQuestion(this)">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  container.insertAdjacentHTML("beforeend", questionHtml);
  updateQuestionsTotal();
}

// Remove question from form
function removeQuestion(btn) {
  btn.closest(".question-card").remove();
  updateQuestionsTotal();
}

// Update questions total
function updateQuestionsTotal() {
  const marksInputs = document.querySelectorAll(".question-marks");
  let total = 0;
  marksInputs.forEach((input) => {
    total += parseFloat(input.value) || 0;
  });

  const maxMarks = parseInt(document.getElementById("ca-max-marks")?.value) || 50;
  const totalDiv = document.getElementById("questions-total");

  if (total === maxMarks) {
    totalDiv.className = "alert alert-success";
    totalDiv.innerHTML = `<i class="fas fa-check me-2"></i>Total: ${total} / ${maxMarks} marks`;
  } else if (total > maxMarks) {
    totalDiv.className = "alert alert-danger";
    totalDiv.innerHTML = `<i class="fas fa-exclamation-triangle me-2"></i>Total: ${total} / ${maxMarks} marks (exceeds max!)`;
  } else {
    totalDiv.className = "alert alert-warning";
    totalDiv.innerHTML = `<i class="fas fa-info-circle me-2"></i>Total: ${total} / ${maxMarks} marks (incomplete)`;
  }
}

// Save CA configuration
async function saveCAConfig(caType, caNumber, componentType) {
  const semesterSelect = document.getElementById("marks-semester-select");
  const [slot_year, semester_type] = semesterSelect.value.split("|");

  const date = document.getElementById("ca-date").value;
  // Max marks and duration are policy-fixed (see renderCAConfigForm): 50 marks,
  // 90 min for UG, 120 min for PG. Derive here rather than reading DOM so a
  // client-side tamper can't sneak past.
  const maxMarks = 50;
  const programLevel = deriveProgramLevelFromCode(selectedCourse.course_code);
  const duration = programLevel === "PG" ? 120 : 90;

  // Collect questions
  const questions = [];
  document.querySelectorAll(".question-card").forEach((card) => {
    const qNum = card.querySelector(".question-number").value;
    const subQ = card.querySelector(".sub-question").value.trim();
    const marks = parseFloat(card.querySelector(".question-marks").value);

    const questionId = subQ ? `${qNum}${subQ}` : qNum;
    questions.push({ id: questionId, maxMarks: marks });
  });

  // Validate total question marks equals max marks
  const totalQuestionMarks = questions.reduce((sum, q) => sum + q.maxMarks, 0);
  if (totalQuestionMarks !== maxMarks) {
    showMarksAlert(
      `Question marks total (${totalQuestionMarks}) must equal max marks (${maxMarks})`,
      "danger"
    );
    return;
  }

  // Get existing config and update (slot-specific)
  try {
    const configResponse = await fetch(
      `${window.API_URL}/marks/config?slot_year=${slot_year}&semester_type=${semester_type}&course_code=${selectedCourse.course_code}&employee_id=${selectedCourse.employee_id}&slot_name=${encodeURIComponent(selectedCourse.slot_name)}&venue=${encodeURIComponent(selectedCourse.venue)}&component_type=${componentType}`,
      { headers: { "x-access-token": localStorage.getItem("token") } }
    );

    let existingConfig = await configResponse.json();
    let configJson = existingConfig.config_json || { cas: [], assignments: [], labSessions: [] };

    // Update or add CA config
    const caConfig = {
      number: caNumber,
      date: date,
      maxMarks: maxMarks,
      scaledTo: selectedCourse.assessment_structure.cas[caNumber - 1]?.scaledTo || 25,
      duration: duration,
      questions: questions,
    };

    // Find and update or add
    const existingIndex = configJson.cas?.findIndex((c) => c.number === caNumber);
    if (existingIndex >= 0) {
      configJson.cas[existingIndex] = caConfig;
    } else {
      if (!configJson.cas) configJson.cas = [];
      configJson.cas.push(caConfig);
    }

    // Save config (slot-specific)
    const saveResponse = await fetch(`${window.API_URL}/marks/config`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": localStorage.getItem("token"),
      },
      body: JSON.stringify({
        slot_year,
        semester_type,
        course_code: selectedCourse.course_code,
        employee_id: selectedCourse.employee_id,
        slot_name: selectedCourse.slot_name,
        venue: selectedCourse.venue,
        component_type: componentType,
        config_json: configJson,
      }),
    });

    if (!saveResponse.ok) {
      throw new Error("Failed to save configuration");
    }

    showMarksAlert(`${caType} configuration saved successfully`, "success");
    closeConfigForm();
    await loadComponentsDashboard(slot_year, semester_type, selectedCourse.course_code, selectedCourse.employee_id, selectedCourse.slot_name, selectedCourse.venue);
  } catch (error) {
    console.error("Error saving CA config:", error);
    showMarksAlert("Error saving configuration. Please try again.", "danger");
  }
}

// Reset CA configuration
async function resetCAConfig(caNumber, componentType) {
  if (!confirm(`Are you sure you want to reset CA${caNumber}?\n\nThis will DELETE:\n- The configuration (date, questions, etc.)\n- ALL entered marks for CA${caNumber}\n\nThis action cannot be undone.`)) {
    return;
  }

  const semesterSelect = document.getElementById("marks-semester-select");
  const [slot_year, semester_type] = semesterSelect.value.split("|");

  try {
    // Fetch existing config
    const configResponse = await fetch(
      `${window.API_URL}/marks/config?slot_year=${slot_year}&semester_type=${semester_type}&course_code=${selectedCourse.course_code}&employee_id=${selectedCourse.employee_id}&slot_name=${encodeURIComponent(selectedCourse.slot_name)}&venue=${encodeURIComponent(selectedCourse.venue)}&component_type=${componentType}`,
      { headers: { "x-access-token": localStorage.getItem("token") } }
    );

    let existingConfig = await configResponse.json();
    let configJson = existingConfig.config_json || { cas: [], assignments: [], labSessions: [] };

    // Delete marks for this CA if config exists
    if (existingConfig.id) {
      await fetch(
        `${window.API_URL}/marks/reset-marks?assessment_config_id=${existingConfig.id}&assessment_type=CA${caNumber}`,
        {
          method: "DELETE",
          headers: { "x-access-token": localStorage.getItem("token") },
        }
      );
    }

    // Remove the specific CA from the array
    configJson.cas = (configJson.cas || []).filter((c) => c.number !== caNumber);

    // Save updated config
    const saveResponse = await fetch(`${window.API_URL}/marks/config`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": localStorage.getItem("token"),
      },
      body: JSON.stringify({
        slot_year,
        semester_type,
        course_code: selectedCourse.course_code,
        employee_id: selectedCourse.employee_id,
        slot_name: selectedCourse.slot_name,
        venue: selectedCourse.venue,
        component_type: componentType,
        config_json: configJson,
      }),
    });

    if (!saveResponse.ok) {
      throw new Error("Failed to reset configuration");
    }

    showMarksAlert(`CA${caNumber} configuration and marks have been reset`, "success");
    closeConfigForm();
    await loadComponentsDashboard(slot_year, semester_type, selectedCourse.course_code, selectedCourse.employee_id, selectedCourse.slot_name, selectedCourse.venue);
  } catch (error) {
    console.error("Error resetting CA config:", error);
    showMarksAlert("Error resetting configuration. Please try again.", "danger");
  }
}

// Render Assignment configuration form
function renderAssignmentConfigForm(componentType, existingConfig) {
  const configContent = document.getElementById("config-entry-content");
  const structure = selectedCourse.assessment_structure;

  // Get existing assignments if available
  const existingAssignments = existingConfig?.config_json?.assignments || [];
  const numAssignmentsValue = existingAssignments.length || 1;

  configContent.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h6 class="mb-0"><i class="fas fa-cog me-2"></i>Configure Internal Assessment</h6>
      </div>
      <div class="card-body">
        <form id="assignment-config-form">
          <div class="mb-3">
            <label class="form-label">Number of Internal Assessments</label>
            <input type="number" class="form-control" id="num-assignments" value="${numAssignmentsValue}" min="1" max="${structure.maxAssignments}" onchange="renderAssignmentFields()">
          </div>

          <div id="assignments-container">
            <!-- Assignment fields will be rendered here -->
          </div>

          <div class="d-flex gap-2 mt-3">
            <button type="submit" class="btn btn-primary">
              <i class="fas fa-save me-2"></i>Save Configuration
            </button>
            <button type="button" class="btn btn-secondary" onclick="closeConfigForm()">
              Cancel
            </button>
            ${existingAssignments.length > 0 ? `<button type="button" class="btn btn-outline-danger ms-auto" onclick="resetAssignmentConfig('${componentType}')">
              <i class="fas fa-undo me-2"></i>Reset
            </button>` : ""}
          </div>
        </form>
      </div>
    </div>
  `;

  // Store existing assignments for renderAssignmentFields to use
  window._existingAssignments = existingAssignments;
  renderAssignmentFields();

  document.getElementById("assignment-config-form").addEventListener("submit", (e) => {
    e.preventDefault();
    saveAssignmentConfig(componentType);
  });
}

// Render assignment fields
function renderAssignmentFields() {
  const numAssignments = parseInt(document.getElementById("num-assignments").value) || 1;
  const container = document.getElementById("assignments-container");
  const structure = selectedCourse.assessment_structure;
  const marksPerAssignment = Math.floor(structure.assignmentTotal / numAssignments);

  // Get existing assignments data
  const existingAssignments = window._existingAssignments || [];

  let html = "";
  for (let i = 1; i <= numAssignments; i++) {
    // Use existing data if available, otherwise defaults
    const existing = existingAssignments.find((a) => a.number === i);
    const typeValue = existing?.type || "";
    const marksValue = existing?.maxMarks || marksPerAssignment;

    html += `
      <div class="card mb-3">
        <div class="card-header py-2">
          <strong>Internal Assessment ${i}</strong>
        </div>
        <div class="card-body py-2">
          <div class="row">
            <div class="col-md-6">
              <label class="form-label small">Type/Description</label>
              <input type="text" class="form-control form-control-sm assignment-type" value="${typeValue}" placeholder="e.g., Lab Report">
            </div>
            <div class="col-md-6">
              <label class="form-label small">Max Marks</label>
              <input type="number" class="form-control form-control-sm assignment-marks" value="${marksValue}" min="1">
            </div>
          </div>
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
}

// Save assignment configuration
async function saveAssignmentConfig(componentType) {
  const semesterSelect = document.getElementById("marks-semester-select");
  const [slot_year, semester_type] = semesterSelect.value.split("|");

  const assignments = [];
  document.querySelectorAll("#assignments-container .card").forEach((card, index) => {
    const type = card.querySelector(".assignment-type").value;
    const maxMarks = parseInt(card.querySelector(".assignment-marks").value);

    assignments.push({
      number: index + 1,
      type: type,
      maxMarks: maxMarks,
      questions: [{ id: `A${index + 1}`, maxMarks: maxMarks }],
    });
  });

  try {
    const configResponse = await fetch(
      `${window.API_URL}/marks/config?slot_year=${slot_year}&semester_type=${semester_type}&course_code=${selectedCourse.course_code}&employee_id=${selectedCourse.employee_id}&slot_name=${encodeURIComponent(selectedCourse.slot_name)}&venue=${encodeURIComponent(selectedCourse.venue)}&component_type=${componentType}`,
      { headers: { "x-access-token": localStorage.getItem("token") } }
    );

    let existingConfig = await configResponse.json();
    let configJson = existingConfig.config_json || { cas: [], assignments: [], labSessions: [] };
    configJson.assignments = assignments;

    const saveResponse = await fetch(`${window.API_URL}/marks/config`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": localStorage.getItem("token"),
      },
      body: JSON.stringify({
        slot_year,
        semester_type,
        course_code: selectedCourse.course_code,
        employee_id: selectedCourse.employee_id,
        slot_name: selectedCourse.slot_name,
        venue: selectedCourse.venue,
        component_type: componentType,
        config_json: configJson,
      }),
    });

    if (!saveResponse.ok) {
      throw new Error("Failed to save configuration");
    }

    showMarksAlert("Assignment configuration saved successfully", "success");
    closeConfigForm();
    await loadComponentsDashboard(slot_year, semester_type, selectedCourse.course_code, selectedCourse.employee_id, selectedCourse.slot_name, selectedCourse.venue);
  } catch (error) {
    console.error("Error saving assignment config:", error);
    showMarksAlert("Error saving configuration. Please try again.", "danger");
  }
}

// Reset Assignment configuration
async function resetAssignmentConfig(componentType) {
  if (!confirm("Are you sure you want to reset all assignments?\n\nThis will DELETE:\n- All assignment configurations\n- ALL entered marks for assignments\n\nThis action cannot be undone.")) {
    return;
  }

  const semesterSelect = document.getElementById("marks-semester-select");
  const [slot_year, semester_type] = semesterSelect.value.split("|");

  try {
    // Fetch existing config
    const configResponse = await fetch(
      `${window.API_URL}/marks/config?slot_year=${slot_year}&semester_type=${semester_type}&course_code=${selectedCourse.course_code}&employee_id=${selectedCourse.employee_id}&slot_name=${encodeURIComponent(selectedCourse.slot_name)}&venue=${encodeURIComponent(selectedCourse.venue)}&component_type=${componentType}`,
      { headers: { "x-access-token": localStorage.getItem("token") } }
    );

    let existingConfig = await configResponse.json();
    let configJson = existingConfig.config_json || { cas: [], assignments: [], labSessions: [] };

    // Delete marks for all assignments if config exists
    if (existingConfig.id) {
      await fetch(
        `${window.API_URL}/marks/reset-marks?assessment_config_id=${existingConfig.id}&assessment_type=ASSIGNMENT`,
        {
          method: "DELETE",
          headers: { "x-access-token": localStorage.getItem("token") },
        }
      );
    }

    // Clear all assignments
    configJson.assignments = [];

    // Save updated config
    const saveResponse = await fetch(`${window.API_URL}/marks/config`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": localStorage.getItem("token"),
      },
      body: JSON.stringify({
        slot_year,
        semester_type,
        course_code: selectedCourse.course_code,
        employee_id: selectedCourse.employee_id,
        slot_name: selectedCourse.slot_name,
        venue: selectedCourse.venue,
        component_type: componentType,
        config_json: configJson,
      }),
    });

    if (!saveResponse.ok) {
      throw new Error("Failed to reset configuration");
    }

    showMarksAlert("Assignment configuration and marks have been reset", "success");
    closeConfigForm();
    await loadComponentsDashboard(slot_year, semester_type, selectedCourse.course_code, selectedCourse.employee_id, selectedCourse.slot_name, selectedCourse.venue);
  } catch (error) {
    console.error("Error resetting assignment config:", error);
    showMarksAlert("Error resetting configuration. Please try again.", "danger");
  }
}

// Render Lab configuration form (slot-specific)
async function renderLabConfigForm(slot_year, semester_type, componentType, existingConfig) {
  const configContent = document.getElementById("config-entry-content");

  configContent.innerHTML = `
    <div class="text-center py-3">
      <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
      <span class="ms-2">Loading lab sessions from attendance...</span>
    </div>
  `;

  try {
    // Get lab sessions from attendance (slot-specific)
    const response = await fetch(
      `${window.API_URL}/marks/lab-sessions?slot_year=${slot_year}&semester_type=${semester_type}&course_code=${selectedCourse.course_code}&employee_id=${selectedCourse.employee_id}&slot_name=${encodeURIComponent(selectedCourse.slot_name)}&venue=${encodeURIComponent(selectedCourse.venue)}`,
      { headers: { "x-access-token": localStorage.getItem("token") } }
    );

    const labSessions = await response.json();

    if (!labSessions.length) {
      configContent.innerHTML = `
        <div class="alert alert-warning">
          <h6>No Lab Sessions Found</h6>
          <p>No attendance has been marked for lab slots yet. Please mark attendance first before configuring lab marks.</p>
          <button class="btn btn-secondary" onclick="closeConfigForm()">Back</button>
        </div>
      `;
      return;
    }

    const structure = selectedCourse.assessment_structure;
    const marksPerSession = Math.floor(structure.labTotal / labSessions.length);

    // Get existing lab sessions config
    const existingLabSessions = existingConfig?.config_json?.labSessions || [];

    let sessionsHtml = labSessions
      .map((session, index) => {
        // Find existing marks for this session date
        const sessionDateStr = formatDateForStorage(session.attendance_date);
        const existingSession = existingLabSessions.find((s) => s.date === sessionDateStr);
        const marksValue = existingSession?.maxMarks || marksPerSession;

        return `
        <tr>
          <td>${index + 1}</td>
          <td>${formatDateForDisplay(session.attendance_date)}</td>
          <td>${session.slot_name}</td>
          <td>
            <input type="number" class="form-control form-control-sm session-marks" value="${marksValue}" min="1" data-date="${sessionDateStr}">
          </td>
        </tr>
      `;
      })
      .join("");

    configContent.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h6 class="mb-0"><i class="fas fa-cog me-2"></i>Configure Lab Sessions</h6>
        </div>
        <div class="card-body">
          <p class="text-muted">Sessions are auto-populated from attendance dates. Set marks per session.</p>
          <form id="lab-config-form">
            <table class="table table-bordered table-sm">
              <thead class="table-light">
                <tr>
                  <th>#</th>
                  <th>Date</th>
                  <th>Slot</th>
                  <th>Max Marks</th>
                </tr>
              </thead>
              <tbody>
                ${sessionsHtml}
              </tbody>
            </table>

            <div class="d-flex gap-2 mt-3">
              <button type="submit" class="btn btn-primary">
                <i class="fas fa-save me-2"></i>Save Configuration
              </button>
              <button type="button" class="btn btn-secondary" onclick="closeConfigForm()">
                Cancel
              </button>
              ${existingLabSessions.length > 0 ? `<button type="button" class="btn btn-outline-danger ms-auto" onclick="resetLabConfig('${componentType}')">
                <i class="fas fa-undo me-2"></i>Reset
              </button>` : ""}
            </div>
          </form>
        </div>
      </div>
    `;

    document.getElementById("lab-config-form").addEventListener("submit", (e) => {
      e.preventDefault();
      saveLabConfig(slot_year, semester_type, componentType);
    });
  } catch (error) {
    console.error("Error loading lab sessions:", error);
    configContent.innerHTML = `
      <div class="alert alert-danger">
        Error loading lab sessions. Please try again.
        <button class="btn btn-secondary ms-2" onclick="closeConfigForm()">Back</button>
      </div>
    `;
  }
}

// Save lab configuration (slot-specific)
async function saveLabConfig(slot_year, semester_type, componentType) {
  const labSessions = [];
  document.querySelectorAll(".session-marks").forEach((input, index) => {
    labSessions.push({
      sessionNumber: index + 1,
      date: input.dataset.date,
      maxMarks: parseInt(input.value),
    });
  });

  try {
    const configResponse = await fetch(
      `${window.API_URL}/marks/config?slot_year=${slot_year}&semester_type=${semester_type}&course_code=${selectedCourse.course_code}&employee_id=${selectedCourse.employee_id}&slot_name=${encodeURIComponent(selectedCourse.slot_name)}&venue=${encodeURIComponent(selectedCourse.venue)}&component_type=${componentType}`,
      { headers: { "x-access-token": localStorage.getItem("token") } }
    );

    let existingConfig = await configResponse.json();
    let configJson = existingConfig.config_json || { cas: [], assignments: [], labSessions: [] };
    configJson.labSessions = labSessions;

    const saveResponse = await fetch(`${window.API_URL}/marks/config`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": localStorage.getItem("token"),
      },
      body: JSON.stringify({
        slot_year,
        semester_type,
        course_code: selectedCourse.course_code,
        employee_id: selectedCourse.employee_id,
        slot_name: selectedCourse.slot_name,
        venue: selectedCourse.venue,
        component_type: componentType,
        config_json: configJson,
      }),
    });

    if (!saveResponse.ok) {
      throw new Error("Failed to save configuration");
    }

    showMarksAlert("Lab configuration saved successfully", "success");
    closeConfigForm();
    await loadComponentsDashboard(slot_year, semester_type, selectedCourse.course_code, selectedCourse.employee_id, selectedCourse.slot_name, selectedCourse.venue);
  } catch (error) {
    console.error("Error saving lab config:", error);
    showMarksAlert("Error saving configuration. Please try again.", "danger");
  }
}

// Reset Lab configuration
async function resetLabConfig(componentType) {
  if (!confirm("Are you sure you want to reset lab sessions?\n\nThis will DELETE:\n- All lab session configurations\n- ALL entered marks for lab sessions\n\nThis action cannot be undone.")) {
    return;
  }

  const semesterSelect = document.getElementById("marks-semester-select");
  const [slot_year, semester_type] = semesterSelect.value.split("|");

  try {
    // Fetch existing config
    const configResponse = await fetch(
      `${window.API_URL}/marks/config?slot_year=${slot_year}&semester_type=${semester_type}&course_code=${selectedCourse.course_code}&employee_id=${selectedCourse.employee_id}&slot_name=${encodeURIComponent(selectedCourse.slot_name)}&venue=${encodeURIComponent(selectedCourse.venue)}&component_type=${componentType}`,
      { headers: { "x-access-token": localStorage.getItem("token") } }
    );

    let existingConfig = await configResponse.json();
    let configJson = existingConfig.config_json || { cas: [], assignments: [], labSessions: [] };

    // Delete marks for all lab sessions if config exists
    if (existingConfig.id) {
      await fetch(
        `${window.API_URL}/marks/reset-marks?assessment_config_id=${existingConfig.id}&assessment_type=LAB_SESSION`,
        {
          method: "DELETE",
          headers: { "x-access-token": localStorage.getItem("token") },
        }
      );
    }

    // Clear all lab sessions
    configJson.labSessions = [];

    // Save updated config
    const saveResponse = await fetch(`${window.API_URL}/marks/config`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": localStorage.getItem("token"),
      },
      body: JSON.stringify({
        slot_year,
        semester_type,
        course_code: selectedCourse.course_code,
        employee_id: selectedCourse.employee_id,
        slot_name: selectedCourse.slot_name,
        venue: selectedCourse.venue,
        component_type: componentType,
        config_json: configJson,
      }),
    });

    if (!saveResponse.ok) {
      throw new Error("Failed to reset configuration");
    }

    showMarksAlert("Lab configuration and marks have been reset", "success");
    closeConfigForm();
    await loadComponentsDashboard(slot_year, semester_type, selectedCourse.course_code, selectedCourse.employee_id, selectedCourse.slot_name, selectedCourse.venue);
  } catch (error) {
    console.error("Error resetting lab config:", error);
    showMarksAlert("Error resetting configuration. Please try again.", "danger");
  }
}

// Close configuration form
function closeConfigForm() {
  document.getElementById("config-entry-step").classList.add("d-none");
}

// Open marks entry form (slot-specific)
async function openMarksEntry(assessmentType, assessmentNumber, componentType) {
  const semesterSelect = document.getElementById("marks-semester-select");
  const [slot_year, semester_type] = semesterSelect.value.split("|");
  const configContent = document.getElementById("config-entry-content");

  document.getElementById("config-entry-step").classList.remove("d-none");

  configContent.innerHTML = `
    <div class="text-center py-3">
      <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
      <span class="ms-2">Loading marks entry form...</span>
    </div>
  `;

  try {
    const response = await fetch(
      `${window.API_URL}/marks/entry?slot_year=${slot_year}&semester_type=${semester_type}&course_code=${selectedCourse.course_code}&employee_id=${selectedCourse.employee_id}&slot_name=${encodeURIComponent(selectedCourse.slot_name)}&venue=${encodeURIComponent(selectedCourse.venue)}&component_type=${componentType}&assessment_type=${assessmentType}&assessment_number=${assessmentNumber}`,
      { headers: { "x-access-token": localStorage.getItem("token") } }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to load marks entry data");
    }

    const data = await response.json();
    currentConfig = data.config;
    enrolledStudents = data.students;

    // Publish state for this component-instance (drives Publish/Unpublish button).
    let publishInfo = { published: false, published_at: null };
    try {
      const psRes = await fetch(
        `${window.API_URL}/marks/publish-status?assessment_config_id=${data.config.id}`,
        { headers: { "x-access-token": localStorage.getItem("token") } }
      );
      if (psRes.ok) {
        const rows = await psRes.json();
        const match = rows.find(
          (r) => r.assessment_type === assessmentType &&
                 Number(r.assessment_number) === Number(assessmentNumber)
        );
        if (match) publishInfo = { published: true, published_at: match.published_at };
      }
    } catch {}

    renderMarksEntryForm(data, assessmentType, assessmentNumber, componentType, publishInfo);
  } catch (error) {
    console.error("Error loading marks entry:", error);
    configContent.innerHTML = `
      <div class="alert alert-danger">
        ${error.message || "Error loading marks entry form. Please configure the assessment first."}
        <button class="btn btn-secondary ms-2" onclick="closeConfigForm()">Back</button>
      </div>
    `;
  }
}

// Render marks entry form
function renderMarksEntryForm(data, assessmentType, assessmentNumber, componentType, publishInfo) {
  const configContent = document.getElementById("config-entry-content");
  const configJson = data.config_json;
  const students = data.students;
  const isLocked = data.is_locked;
  const pubState = publishInfo || { published: false, published_at: null };

  // Get questions for this assessment
  let questions = [];
  let title = "";

  if (assessmentType.startsWith("CA")) {
    const caNum = parseInt(assessmentType.replace("CA", ""));
    const caConfig = configJson.cas?.find((c) => c.number === caNum);
    questions = caConfig?.questions || [];
    title = `${assessmentType} - ${caConfig?.date || ""} (Max: ${caConfig?.maxMarks || 50})`;
  } else if (assessmentType === "ASSIGNMENT") {
    const assignment = configJson.assignments?.[assessmentNumber - 1];
    questions = assignment?.questions || [{ id: `A${assessmentNumber}`, maxMarks: assignment?.maxMarks || 10 }];
    title = `Assignment ${assessmentNumber} - ${assignment?.type || ""}`;
  } else if (assessmentType === "LAB_SESSION") {
    const session = configJson.labSessions?.[assessmentNumber - 1];
    questions = [{ id: session?.date || `S${assessmentNumber}`, maxMarks: session?.maxMarks || 10 }];
    title = `Lab Session ${assessmentNumber} - ${session?.date || ""}`;
  }

  if (!questions.length) {
    configContent.innerHTML = `
      <div class="alert alert-warning">
        No questions configured for this assessment. Please configure first.
        <button class="btn btn-secondary ms-2" onclick="closeConfigForm()">Back</button>
      </div>
    `;
    return;
  }

  // Build header row
  let headerRow = `
    <th style="min-width: 150px;">Enrollment</th>
    <th style="min-width: 150px;">Name</th>
  `;
  questions.forEach((q) => {
    headerRow += `<th style="min-width: 80px;">${q.id}<br><small>(${q.maxMarks})</small></th>`;
  });
  headerRow += `<th>Total</th>`;

  // Build student rows
  let studentRows = "";
  students.forEach((student) => {
    let rowCells = `
      <td><code>${student.enrollment_number}</code></td>
      <td>${student.student_name}</td>
    `;

    let rowTotal = 0;
    questions.forEach((q) => {
      const existingMark = student.marks[q.id];
      const markValue = existingMark?.marks_obtained ?? "";
      // OD lab sessions are excluded from this student's total (student was
      // on official duty). Renders as a locked "OD" cell — no numeric value,
      // no contribution to rowTotal, denominator effectively shrinks by this
      // session's max_marks for this student.
      const isOd = assessmentType === "LAB_SESSION" && student.attendance_is_od === true;
      const isAbsent = !isOd && assessmentType === "LAB_SESSION" && student.attendance_status === "absent";
      const noAttendance = !isOd && assessmentType === "LAB_SESSION" && !student.attendance_status;

      if (isOd) {
        rowCells += `<td><input type="text" class="form-control form-control-sm marks-input bg-info-subtle text-center fw-bold" value="OD" disabled data-enrollment="${student.enrollment_number}" data-student-id="${student.student_id}" data-question="${q.id}" data-max="${q.maxMarks}" data-od="true" title="On Duty - excluded from total"></td>`;
      } else if (isAbsent) {
        rowCells += `<td><input type="number" class="form-control form-control-sm marks-input" value="0" disabled data-enrollment="${student.enrollment_number}" data-student-id="${student.student_id}" data-question="${q.id}" data-max="${q.maxMarks}" title="Absent - Auto 0"></td>`;
      } else if (noAttendance) {
        rowCells += `<td><input type="number" class="form-control form-control-sm marks-input bg-warning" placeholder="?" disabled data-enrollment="${student.enrollment_number}" data-student-id="${student.student_id}" data-question="${q.id}" data-max="${q.maxMarks}" title="Attendance not marked"></td>`;
      } else {
        rowCells += `<td><input type="number" class="form-control form-control-sm marks-input" value="${markValue}" min="0" max="${q.maxMarks}" step="0.5" ${isLocked ? "disabled" : ""} data-enrollment="${student.enrollment_number}" data-student-id="${student.student_id}" data-question="${q.id}" data-max="${q.maxMarks}" onchange="validateMarkInput(this); updateRowTotal(this)"></td>`;
      }

      if (isOd) {
        // OD contributes nothing to the row total.
      } else if (markValue !== "" && !isNaN(parseFloat(markValue))) {
        rowTotal += parseFloat(markValue);
      } else if (isAbsent) {
        rowTotal += 0;
      }
    });

    rowCells += `<td class="row-total fw-bold">${rowTotal}</td>`;
    studentRows += `<tr>${rowCells}</tr>`;
  });

  configContent.innerHTML = `
    <div class="card">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h6 class="mb-0"><i class="fas fa-edit me-2"></i>${title}</h6>
        ${isLocked ? '<span class="badge bg-danger">Locked</span>' : ""}
      </div>
      <div class="card-body">
        <div class="table-responsive" style="max-height: 500px; overflow-y: auto;">
          <table class="table table-bordered table-sm table-hover">
            <thead class="table-light sticky-top">
              <tr>${headerRow}</tr>
            </thead>
            <tbody>
              ${studentRows}
            </tbody>
          </table>
        </div>

        <div class="d-flex gap-2 mt-3">
          <button class="btn btn-primary" onclick="saveMarksEntry('${assessmentType}', ${assessmentNumber})" ${isLocked ? "disabled" : ""}>
            <i class="fas fa-save me-2"></i>Save Marks
          </button>
          ${pubState.published
            ? `<button class="btn btn-warning" onclick="togglePublishMarks(${data.config.id}, '${assessmentType}', ${assessmentNumber}, true)" title="Unpublish (was Published on ${pubState.published_at ? new Date(pubState.published_at).toLocaleString() : ''})">
                 <i class="fas fa-eye-slash me-2"></i>Unpublish
               </button>`
            : `<button class="btn btn-success" onclick="togglePublishMarks(${data.config.id}, '${assessmentType}', ${assessmentNumber}, false)">
                 <i class="fas fa-bullhorn me-2"></i>Publish Marks
               </button>`}
          <button class="btn btn-secondary" onclick="closeConfigForm()">
            Back
          </button>
          ${pubState.published
            ? `<span class="ms-auto align-self-center small text-muted"><i class="fas fa-check-circle text-success me-1"></i>Published — students can see these marks.</span>`
            : `<span class="ms-auto align-self-center small text-muted"><i class="fas fa-eye-slash me-1"></i>Not yet published — students cannot see these marks.</span>`}
        </div>
      </div>
    </div>
  `;
}

// Validate mark input
function validateMarkInput(input) {
  const value = parseFloat(input.value);
  const max = parseFloat(input.dataset.max);

  if (value > max) {
    input.classList.add("is-invalid");
    showMarksAlert(`Value ${value} exceeds max ${max}`, "warning");
    input.value = max;
  } else if (value < 0) {
    input.classList.add("is-invalid");
    input.value = 0;
  } else {
    input.classList.remove("is-invalid");
  }
}

// Update row total
function updateRowTotal(input) {
  const row = input.closest("tr");
  const inputs = row.querySelectorAll(".marks-input");
  let total = 0;

  inputs.forEach((inp) => {
    const val = parseFloat(inp.value);
    if (!isNaN(val)) {
      total += val;
    }
  });

  row.querySelector(".row-total").textContent = total.toFixed(1);
}

// Save marks entry
async function saveMarksEntry(assessmentType, assessmentNumber) {
  // Include all marks inputs (including disabled ones for absent students)
  const inputs = document.querySelectorAll(".marks-input");
  const marksRecords = [];

  inputs.forEach((input) => {
    const value = input.value.trim();
    // Include if has a numeric value (even disabled absent students with 0)
    // Skip inputs with "?" placeholder (no attendance marked)
    if (value !== "" && value !== "?" && !isNaN(parseFloat(value))) {
      marksRecords.push({
        enrollment_number: input.dataset.enrollment,
        student_id: parseInt(input.dataset.studentId),
        question_id: input.dataset.question,
        marks_obtained: parseFloat(value),
        max_marks: parseFloat(input.dataset.max),
      });
    }
  });

  if (marksRecords.length === 0) {
    showMarksAlert("No marks to save", "warning");
    return;
  }

  try {
    const response = await fetch(`${window.API_URL}/marks/entry`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": localStorage.getItem("token"),
      },
      body: JSON.stringify({
        marks_records: marksRecords,
        assessment_config_id: currentConfig.id,
        assessment_type: assessmentType,
        assessment_number: assessmentNumber,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to save marks");
    }

    showMarksAlert(`Saved ${marksRecords.length} marks successfully`, "success");
  } catch (error) {
    console.error("Error saving marks:", error);
    showMarksAlert(error.message || "Error saving marks. Please try again.", "danger");
  }
}

// Toggle publish state for one component-instance (CA/Assignment/Lab session).
// Called from the button rendered by renderMarksEntryForm.
async function togglePublishMarks(assessmentConfigId, assessmentType, assessmentNumber, currentlyPublished) {
  const action = currentlyPublished ? "unpublish" : "publish";
  const verb = currentlyPublished ? "Unpublishing" : "Publishing";
  try {
    const response = await fetch(`${window.API_URL}/marks/${action}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": localStorage.getItem("token"),
      },
      body: JSON.stringify({
        assessment_config_id: assessmentConfigId,
        assessment_type: assessmentType,
        assessment_number: assessmentNumber,
      }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `${verb} failed`);
    }
    showMarksAlert(`${assessmentType}${assessmentType === "ASSIGNMENT" || assessmentType === "LAB_SESSION" ? " " + assessmentNumber : ""} ${action}ed`, "success");
    // Refresh the entry form so the button flips.
    const componentType = (assessmentType === "LAB_SESSION") ? "LAB" : "THEORY";
    openMarksEntry(assessmentType, assessmentNumber, componentType);
  } catch (error) {
    console.error(`${verb} error:`, error);
    showMarksAlert(error.message || `${verb} failed. Please try again.`, "danger");
  }
}
window.togglePublishMarks = togglePublishMarks;

// View marks summary (slot-specific)
async function viewMarksSummary() {
  const semesterSelect = document.getElementById("marks-semester-select");
  const [slot_year, semester_type] = semesterSelect.value.split("|");
  const configContent = document.getElementById("config-entry-content");

  document.getElementById("config-entry-step").classList.remove("d-none");

  configContent.innerHTML = `
    <div class="text-center py-3">
      <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
      <span class="ms-2">Loading marks summary...</span>
    </div>
  `;

  try {
    const qs = `slot_year=${slot_year}&semester_type=${semester_type}&course_code=${selectedCourse.course_code}&employee_id=${selectedCourse.employee_id}&slot_name=${encodeURIComponent(selectedCourse.slot_name)}&venue=${encodeURIComponent(selectedCourse.venue)}`;
    const headers = { "x-access-token": localStorage.getItem("token") };

    const summaryRes = await fetch(`${window.API_URL}/marks/summary?${qs}`, { headers });
    if (!summaryRes.ok) {
      throw new Error("Failed to load summary");
    }
    const summaryData = await summaryRes.json();
    // Consolidated Marks & Grade Report has moved to the "View Grades" sidebar
    // item; View Summary now only shows raw per-component marks.
    renderMarksSummary(summaryData);
  } catch (error) {
    console.error("Error loading summary:", error);
    configContent.innerHTML = `
      <div class="alert alert-danger">
        Error loading marks summary. Please try again.
        <button class="btn btn-secondary ms-2" onclick="closeConfigForm()">Back</button>
      </div>
    `;
  }
}

// Render the Consolidated Marks & Grade Report section (faculty view).
// Returns HTML string; the caller stitches it above the existing raw summary.
function renderConsolidatedFacultyPanel(data) {
  if (!data || !data.students) return "";

  const { course, weightages, ca_actual_max, stats, students } = data;
  const caKeys = Object.keys(weightages).filter((k) => k.startsWith("CA"))
    .sort((a, b) => parseInt(a.slice(2)) - parseInt(b.slice(2)));
  const hasIM = (weightages.IM || 0) > 0;
  const hasLAB = (weightages.LAB || 0) > 0;
  const isPureLab = !caKeys.length && !hasIM && hasLAB;

  // Header row with class stats. Standard Deviation shown is the population SD
  // (÷N) — mathematically correct when the class IS the full population.
  const sdPop = stats.stddev_pop != null ? stats.stddev_pop : stats.stddev;
  const gradingHeader = stats.grading_type || "[—]";
  // Per-student Grading Type only appears on TEL lab views (backend attaches
  // s.grading_type in that case). Header label reflects that too.
  const perStudentGrading = students.some((s) => s.grading_type);

  const statsHtml = `
    <div class="d-flex flex-wrap gap-3 small text-muted mb-2">
      <span><strong>Grading Type:</strong> ${gradingHeader}</span>
      <span><strong>Class Strength:</strong> ${stats.total_count}</span>
      <span><strong>Class Average:</strong> ${stats.avg}</span>
      <span><strong>Class Standard Deviation:</strong> ${sdPop}</span>
    </div>
  `;

  // Table header — pure-lab uses collapsed layout; others use per-CA sub-columns.
  // For TEL lab views we insert a per-student "Grading Type" column just before Grade.
  let theadHtml;
  const gradingCol = perStudentGrading ? `<th rowspan="2">Grading Type</th>` : "";
  if (isPureLab) {
    theadHtml = `
      <tr>
        <th rowspan="2">Enrollment</th>
        <th rowspan="2">Name</th>
        <th rowspan="2">Sessions Done</th>
        <th rowspan="2">Actual / Max</th>
        <th rowspan="2">Grand Total <br>(100)</th>
        ${gradingCol}
        <th rowspan="2">Grade</th>
      </tr>
      <tr></tr>
    `;
  } else {
    const caHeaders = caKeys.map((k) => `<th colspan="2" class="text-center">${k}</th>`).join("");
    const caSubHeaders = caKeys.map((k) => {
      const actMax = ca_actual_max[k] || 0;
      const conv = weightages[k];
      return `<th class="text-center">Actual<br>(${actMax})</th><th class="text-center">Converted<br>(${conv})</th>`;
    }).join("");
    const imHeader = hasIM ? `<th rowspan="2">IM<br>(${weightages.IM})</th>` : "";
    const labHeader = hasLAB ? `<th rowspan="2">Lab<br>(${weightages.LAB})</th>` : "";
    theadHtml = `
      <tr>
        <th rowspan="2">Enrollment</th>
        <th rowspan="2">Name</th>
        ${caHeaders}
        ${imHeader}
        ${labHeader}
        <th rowspan="2">Grand Total <br>(100)</th>
        ${gradingCol}
        <th rowspan="2">Grade</th>
      </tr>
      <tr>${caSubHeaders}</tr>
    `;
  }

  // Body rows
  // Publish-aware cells: an unpublished component shows "Not published" (muted
  // italic) instead of a dash — makes it clear this is a visibility gate, not
  // missing data.
  const rowsHtml = students.map((s) => {
    const cellDash = `<td class="text-muted text-center">–</td>`;
    const notPublishedCell = `<td class="text-muted fst-italic text-center small">Not published</td>`;

    let cells;
    if (isPureLab) {
      const lab = s.components.LAB;
      const labUnpub = lab && lab.published === false;
      const sessionsCell = labUnpub
        ? `<td class="text-muted fst-italic text-center small">Not published</td>`
        : `<td class="text-center">${lab ? `${lab.sessions_done}/${lab.sessions_total}` : "0/0"}</td>`;
      const actualCell = labUnpub
        ? `<td class="text-muted fst-italic text-center small">Not published</td>`
        : `<td class="text-center">${lab && lab.entered ? `${lab.actual}/${lab.actual_max}` : "–"}</td>`;
      cells = `${sessionsCell}${actualCell}`;
    } else {
      const caCells = caKeys.map((k) => {
        const c = s.components[k];
        if (c && c.published === false) return notPublishedCell + notPublishedCell;
        if (!c || !c.entered) return cellDash + cellDash;
        return `<td class="text-center">${c.actual}</td><td class="text-center fw-bold">${c.converted.toFixed(2)}</td>`;
      }).join("");
      const imCell = hasIM
        ? ((s.components.IM && s.components.IM.published === false)
            ? notPublishedCell
            : (s.components.IM && s.components.IM.entered
                ? `<td class="text-center fw-bold">${s.components.IM.converted.toFixed(2)}</td>`
                : cellDash))
        : "";
      const labCell = hasLAB
        ? ((s.components.LAB && s.components.LAB.published === false)
            ? notPublishedCell
            : (s.components.LAB && s.components.LAB.entered
                ? `<td class="text-center fw-bold">${s.components.LAB.converted.toFixed(2)}</td>`
                : cellDash))
        : "";
      cells = caCells + imCell + labCell;
    }

    const pending = (s.pending || []).length;
    const totalCell = `<td class="text-center fw-bold">${s.grand_total.toFixed(2)}${pending ? ` <span class="badge bg-warning text-dark ms-1" title="Pending: ${s.pending.join(", ")}">⚠${pending}</span>` : ''}</td>`;
    const gradingCell = perStudentGrading ? `<td class="text-center small">${s.grading_type || "N/A"}</td>` : "";
    const gradeCell = `<td class="text-center text-muted">[—]</td>`;

    return `<tr>
      <td><code>${s.enrollment_number}</code></td>
      <td>${s.student_name}</td>
      ${cells}
      ${totalCell}
      ${gradingCell}
      ${gradeCell}
    </tr>`;
  }).join("");

  return `
    <div class="card mb-3 border-success">
      <div class="card-header bg-success text-white d-flex justify-content-between align-items-center">
        <h6 class="mb-0"><i class="fas fa-award me-2"></i>Consolidated Marks &amp; Grade Report — ${course.course_code}
          <span class="badge bg-light text-dark ms-2">${course.slot_name}</span>
          <span class="badge bg-light text-dark ms-1">${course.venue}</span>
          <span class="badge bg-light text-dark ms-1">${data.assessment_type || ""}</span>
        </h6>
        <button class="btn btn-light btn-sm" onclick="downloadConsolidatedReport()">
          <i class="fas fa-file-excel me-1"></i>Export XLSX
        </button>
      </div>
      <div class="card-body">
        ${statsHtml}
        <div class="table-responsive">
          <table class="table table-bordered table-sm align-middle">
            <thead class="table-success">${theadHtml}</thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>
        <small class="text-muted"><i class="fas fa-info-circle me-1"></i>Actual = raw marks conducted; Converted = scaled to weightage. Grand Total is out of 100.
          ${stats.total_components != null
            ? ` &nbsp;·&nbsp; Published: ${stats.published_components} of ${stats.total_components} components${stats.published_components < stats.total_components ? " — unpublished components show 'Not published' and don't contribute to the Grand Total" : ""}.`
            : ""}
        </small>
      </div>
    </div>
  `;
}

// Download the Consolidated Marks & Grade Report XLSX for the current course-slot.
async function downloadConsolidatedReport() {
  const semesterSelect = document.getElementById("marks-semester-select");
  const [slot_year, semester_type] = semesterSelect.value.split("|");
  const qs = new URLSearchParams({
    slot_year,
    semester_type,
    course_code: selectedCourse.course_code,
    employee_id: selectedCourse.employee_id,
    slot_name: selectedCourse.slot_name,
    venue: selectedCourse.venue,
  }).toString();

  try {
    const res = await fetch(`${window.API_URL}/reports/consolidated?${qs}`, {
      headers: { "x-access-token": localStorage.getItem("token") },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to download report");
    }
    const blob = await res.blob();
    const cd = res.headers.get("Content-Disposition") || "";
    let filename = "consolidated_report.xlsx";
    const match = cd.match(/filename="?(.+?)"?$/);
    if (match) filename = match[1];
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) {
    alert("Download failed: " + e.message);
  }
}
window.downloadConsolidatedReport = downloadConsolidatedReport;

// Render marks summary — raw per-component only. The Consolidated Marks &
// Grade Report has moved to the dedicated "View Grades" sidebar item.
function renderMarksSummary(data) {
  const configContent = document.getElementById("config-entry-content");
  const students = data.students;
  const configs = data.configs || [];

  // Build a map of lab session dates from configs
  const labSessionDates = {};
  configs.forEach((config) => {
    if (config.component_type === "LAB" && config.config_json?.labSessions) {
      config.config_json.labSessions.forEach((session, idx) => {
        labSessionDates[`LAB_SESSION_${idx + 1}`] = session.date;
      });
    }
  });

  // Collect all unique component keys across all students
  const componentKeys = new Set();
  students.forEach((student) => {
    Object.keys(student.components).forEach((key) => componentKeys.add(key));
  });

  // Sort component keys for consistent ordering
  const sortedKeys = Array.from(componentKeys).sort((a, b) => {
    // Order: CA1, CA2, CA3, ASSIGNMENT_1, ASSIGNMENT_2, LAB_SESSION_1, etc.
    const order = { CA: 1, ASSIGNMENT: 2, LAB_SESSION: 3 };
    const [typeA] = a.split("_");
    const [typeB] = b.split("_");
    const orderA = order[typeA] || order[typeA.replace(/\d+$/, "")] || 99;
    const orderB = order[typeB] || order[typeB.replace(/\d+$/, "")] || 99;
    if (orderA !== orderB) return orderA - orderB;
    // Extract numeric part and sort numerically (fixes 1,10,11,2,3 ordering)
    const numA = parseInt(a.match(/\d+$/)?.[0] || "0", 10);
    const numB = parseInt(b.match(/\d+$/)?.[0] || "0", 10);
    return numA - numB;
  });

  // Build component header labels (short format for compact columns).
  // Component keys have shape "TYPE_NUMBER" — for CAs the number is always 1
  // (there's only one CA1 exam), so drop it: "CA1_1" → "CA1".
  const getComponentLabel = (key) => {
    if (key.startsWith("CA")) return key.split("_")[0]; // CA1, CA2, CA3
    if (key.startsWith("ASSIGNMENT_")) {
      const num = key.split("_")[1];
      return `Assign ${num}`;
    }
    if (key.startsWith("LAB_SESSION_")) {
      const num = key.split("_")[2];
      return `Lab${num}`; // Short label: Lab1, Lab2, Lab3...
    }
    return key;
  };

  // Build header row (with date tooltip for lab sessions).
  // No Total / % columns — the Consolidated Marks & Grade Report (View Grades)
  // is the source of truth for aggregate scaled totals.
  let headerRow = `<th>Enrollment</th><th>Name</th>`;
  sortedKeys.forEach((key) => {
    const label = getComponentLabel(key);
    const tooltip = key.startsWith("LAB_SESSION_") ? labSessionDates[key] || "" : "";
    headerRow += tooltip
      ? `<th title="${tooltip}">${label}</th>`
      : `<th>${label}</th>`;
  });

  // Build student rows
  let studentRows = students
    .map((student) => {
      let row = `<tr>
        <td><code>${student.enrollment_number}</code></td>
        <td>${student.student_name}</td>`;

      // Add component columns
      sortedKeys.forEach((key) => {
        const comp = student.components[key];
        if (comp && comp.total_max > 0) {
          const obtained = comp.total_obtained !== null ? comp.total_obtained.toFixed(1) : "-";
          row += `<td>${obtained}/${comp.total_max}</td>`;
        } else {
          row += `<td class="text-muted">-</td>`;
        }
      });

      row += `</tr>`;
      return row;
    })
    .join("");

  configContent.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h6 class="mb-0"><i class="fas fa-chart-bar me-2"></i>Component-wise Raw Marks - ${selectedCourse.course_code}
          <span class="badge bg-info ms-2">${selectedCourse.slot_name}</span>
          <span class="badge bg-secondary ms-1">${selectedCourse.venue}</span>
        </h6>
      </div>
      <div class="card-body">
        <div class="table-responsive">
          <table class="table table-bordered table-sm">
            <thead class="table-primary">
              <tr>${headerRow}</tr>
            </thead>
            <tbody>
              ${studentRows}
            </tbody>
          </table>
        </div>
        <button class="btn btn-secondary mt-3" onclick="closeConfigForm()">Back</button>
      </div>
    </div>
  `;
}

// ================== ADMIN LOCK CONTROLS ==================

// Render admin/CoE lock controls panel: bulk grid + selective unlock exceptions.
async function renderAdminLockControls(slot_year, semester_type) {
  const adminPanel = document.getElementById("admin-lock-controls");
  if (!adminPanel) return;

  adminPanel.classList.remove("d-none");
  adminPanel.innerHTML = `
    <div class="card border-warning">
      <div class="card-header bg-warning text-dark">
        <h6 class="mb-0"><i class="fas fa-lock me-2"></i>Marks Entry Lock Controls (Admin / CoE)</h6>
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
    const token = localStorage.getItem("token");
    const headers = { "x-access-token": token };
    const [locksResp, excResp, allocResp] = await Promise.all([
      fetch(`${window.API_URL}/marks/admin/locks?slot_year=${slot_year}&semester_type=${semester_type}`, { headers }),
      fetch(`${window.API_URL}/marks/admin/lock-exceptions?slot_year=${slot_year}&semester_type=${semester_type}`, { headers }),
      fetch(`${window.API_URL}/marks/admin/allocations?slot_year=${slot_year}&semester_type=${semester_type}`, { headers }),
    ]);
    if (!locksResp.ok) throw new Error("Failed to load lock status");
    if (!excResp.ok) throw new Error("Failed to load exceptions");
    if (!allocResp.ok) throw new Error("Failed to load allocations");
    const locks = await locksResp.json();
    const exceptions = await excResp.json();
    // Stash allocations for the cascading dropdowns to filter client-side.
    window.marksLockAllocations = await allocResp.json();

    const components = ["CA1", "CA2", "CA3", "ASSIGNMENT", "LAB"];

    // ─── Bulk lock grid (unchanged behavior) ────────────────────────────
    const lockMap = {};
    locks.forEach((lock) => {
      lockMap[`${lock.component_type}|${lock.program_level}`] = lock.is_locked;
    });

    const cell = (comp, level) => {
      const isLocked = lockMap[`${comp}|${level}`] || false;
      const badge = isLocked
        ? '<span class="badge bg-danger">Locked</span>'
        : '<span class="badge bg-success">Open</span>';
      const btnClass = isLocked ? "btn-success" : "btn-danger";
      const btnText = isLocked ? "Unlock" : "Lock";
      const btnIcon = isLocked ? "fa-unlock" : "fa-lock";
      return `
        <div class="d-flex flex-column align-items-center gap-1">
          ${badge}
          <button class="btn btn-sm ${btnClass}" onclick="toggleLock('${slot_year}', '${semester_type}', '${comp}', '${level}', ${isLocked})">
            <i class="fas ${btnIcon} me-1"></i>${btnText}
          </button>
        </div>
      `;
    };

    const lockRows = components
      .map((comp) => `
        <tr>
          <td><strong>${comp}</strong></td>
          <td class="text-center">${cell(comp, "UG")}</td>
          <td class="text-center">${cell(comp, "PG")}</td>
          <td class="text-center">${cell(comp, "ALL")}</td>
        </tr>
      `)
      .join("");

    // ─── Exception panel: form + list ───────────────────────────────────
    // Build a searchable faculty list backed by a <datalist>. Option values
    // are display labels ("Name (empId)"); we look the empId back out via
    // window.marksFacultyLookup keyed on the same label.
    const facultyEntries = [...new Map(
      window.marksLockAllocations.map((a) => [String(a.employee_id), a.faculty_name])
    ).entries()].sort((a, b) => (a[1] || "").localeCompare(b[1] || ""));
    window.marksFacultyLookup = {};
    const facultyDatalistOptions = facultyEntries.map(([empId, name]) => {
      const label = `${name || empId} (${empId})`;
      window.marksFacultyLookup[label] = empId;
      return `<option value="${label}"></option>`;
    }).join("");

    const exceptionRows = exceptions.length === 0
      ? `<tr><td colspan="9" class="text-center text-muted small">No active exceptions.</td></tr>`
      : exceptions.map((e) => {
          const levelLabel = e.program_level === "ALL" ? "Both" : e.program_level;
          const expires = e.expires_at ? e.expires_at.replace("T", " ") : "—";
          const granted = e.granted_at ? new Date(e.granted_at).toLocaleString() : "";
          return `
            <tr>
              <td>${e.faculty_name || ""} <span class="text-muted small">(${e.employee_id})</span></td>
              <td>${e.course_code}</td>
              <td>${e.slot_name}</td>
              <td>${e.venue}</td>
              <td>${e.component_type}</td>
              <td>${levelLabel}</td>
              <td class="small">${expires}</td>
              <td class="small text-muted">${granted}</td>
              <td class="text-center">
                <button class="btn btn-sm btn-outline-danger" onclick="deleteMarksLockException(${e.id}, '${slot_year}', '${semester_type}')">
                  <i class="fas fa-trash me-1"></i>Remove
                </button>
              </td>
            </tr>`;
        }).join("");

    adminPanel.innerHTML = `
      <div class="card border-warning">
        <div class="card-header bg-warning text-dark">
          <h6 class="mb-0"><i class="fas fa-lock me-2"></i>Marks Entry Lock Controls (Admin / CoE) - ${slot_year} ${semester_type}</h6>
        </div>
        <div class="card-body">
          <p class="text-muted small mb-3">Lock/unlock marks entry per component and program level. The "Both" toggle locks BOTH UG and PG regardless of the UG/PG individual toggles. When locked, faculty cannot enter or edit marks for that component in that program level. RESEARCH-tier courses are not affected by any lock.</p>
          <table class="table table-bordered table-sm mb-3 align-middle">
            <thead class="table-light">
              <tr>
                <th>Component</th>
                <th class="text-center">UG</th>
                <th class="text-center">PG</th>
                <th class="text-center">Both</th>
              </tr>
            </thead>
            <tbody>
              ${lockRows}
            </tbody>
          </table>

          <hr class="my-3">

          <h6 class="mb-2"><i class="fas fa-key me-2"></i>Temporary Unlock Exceptions</h6>
          <p class="text-muted small mb-2">When a bulk lock is on, an exception grants save access to a specific faculty + course + slot until removed. Optional expiry auto-ends the grant. Exceptions have no effect when the bulk lock is off.</p>
          <div class="row g-2 align-items-end mb-2">
            <div class="col-md-3">
              <label class="form-label small mb-1">Faculty</label>
              <input type="text" id="mle-faculty" class="form-control form-control-sm"
                     list="mle-faculty-options" placeholder="Type name or ID..."
                     autocomplete="off"
                     oninput="onMarksLockExceptionFacultyChange()"
                     onchange="onMarksLockExceptionFacultyChange()">
              <datalist id="mle-faculty-options">${facultyDatalistOptions}</datalist>
            </div>
            <div class="col-md-2">
              <label class="form-label small mb-1">Course</label>
              <select id="mle-course" class="form-select form-select-sm" onchange="onMarksLockExceptionCourseChange()" disabled>
                <option value="">Select faculty first</option>
              </select>
            </div>
            <div class="col-md-3">
              <label class="form-label small mb-1">Slot (slot_name @ venue)</label>
              <select id="mle-slot" class="form-select form-select-sm" disabled>
                <option value="">Select course first</option>
              </select>
            </div>
            <div class="col-md-2">
              <label class="form-label small mb-1">Component</label>
              <select id="mle-component" class="form-select form-select-sm">
                ${components.map((c) => `<option value="${c}">${c}</option>`).join("")}
              </select>
            </div>
            <div class="col-md-2">
              <label class="form-label small mb-1">Level</label>
              <select id="mle-level" class="form-select form-select-sm">
                <option value="UG">UG</option>
                <option value="PG">PG</option>
                <option value="ALL">Both</option>
              </select>
            </div>
          </div>
          <div class="row g-2 align-items-end mb-2">
            <div class="col-md-3">
              <label class="form-label small mb-1">Expires at (optional)</label>
              <input type="datetime-local" id="mle-expires" class="form-control form-control-sm">
            </div>
            <div class="col-md-auto">
              <button class="btn btn-sm btn-warning" onclick="addMarksLockException('${slot_year}', '${semester_type}')">
                <i class="fas fa-plus me-1"></i>Add Exception
              </button>
            </div>
          </div>

          <table class="table table-bordered table-sm mb-0 align-middle">
            <thead class="table-light">
              <tr>
                <th>Faculty</th>
                <th>Course</th>
                <th>Slot</th>
                <th>Venue</th>
                <th>Component</th>
                <th>Level</th>
                <th>Expires</th>
                <th>Granted at</th>
                <th class="text-center">Action</th>
              </tr>
            </thead>
            <tbody>${exceptionRows}</tbody>
          </table>
        </div>
      </div>
    `;
  } catch (error) {
    console.error("Error loading admin lock panel:", error);
    adminPanel.innerHTML = `
      <div class="alert alert-danger">
        <i class="fas fa-exclamation-triangle me-2"></i>Failed to load lock controls
      </div>
    `;
  }
}

// Cascading dropdown handlers for the exception form. Data comes from
// window.marksLockAllocations (populated once by renderAdminLockControls).
// Faculty is an <input>+<datalist> whose value is a label like
// "Dr. Name (313117)" — resolve it back to employee_id via marksFacultyLookup.
function resolveFacultyEmpIdFromInput() {
  const label = document.getElementById("mle-faculty")?.value?.trim();
  if (!label) return null;
  const lookup = window.marksFacultyLookup || {};
  if (lookup[label]) return lookup[label];
  // Fallback: user typed the raw empId
  return Object.values(lookup).includes(label) ? label : null;
}

function onMarksLockExceptionFacultyChange() {
  const courseSelect = document.getElementById("mle-course");
  const slotSelect = document.getElementById("mle-slot");
  const empId = resolveFacultyEmpIdFromInput();
  courseSelect.innerHTML = '<option value="">Select course</option>';
  slotSelect.innerHTML = '<option value="">Select course first</option>';
  slotSelect.disabled = true;
  if (!empId) {
    courseSelect.disabled = true;
    return;
  }
  const courses = [...new Set(
    (window.marksLockAllocations || [])
      .filter((a) => String(a.employee_id) === String(empId))
      .map((a) => a.course_code)
  )].sort();
  courseSelect.innerHTML = '<option value="">Select course</option>' +
    courses.map((c) => `<option value="${c}">${c}</option>`).join("");
  courseSelect.disabled = false;
}

function onMarksLockExceptionCourseChange() {
  const courseSelect = document.getElementById("mle-course");
  const slotSelect = document.getElementById("mle-slot");
  const empId = resolveFacultyEmpIdFromInput();
  const course = courseSelect?.value;
  if (!empId || !course) {
    slotSelect.innerHTML = '<option value="">Select course first</option>';
    slotSelect.disabled = true;
    return;
  }
  const slots = (window.marksLockAllocations || [])
    .filter((a) => String(a.employee_id) === String(empId) && a.course_code === course)
    .map((a) => ({ slot_name: a.slot_name, venue: a.venue }));
  // De-dupe by slot_name|venue
  const seen = new Set();
  const uniq = slots.filter((s) => {
    const k = `${s.slot_name}|${s.venue}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  slotSelect.innerHTML = '<option value="">Select slot</option>' +
    uniq.map((s) => `<option value="${s.slot_name}|${s.venue}">${s.slot_name} @ ${s.venue}</option>`).join("");
  slotSelect.disabled = false;
}

async function addMarksLockException(slot_year, semester_type) {
  const empId = resolveFacultyEmpIdFromInput();
  const course = document.getElementById("mle-course")?.value;
  const slotComposite = document.getElementById("mle-slot")?.value;
  const component = document.getElementById("mle-component")?.value;
  const level = document.getElementById("mle-level")?.value;
  const expires = document.getElementById("mle-expires")?.value || null;

  if (!empId || !course || !slotComposite || !component || !level) {
    alert("Please pick a valid faculty from the list, plus course, slot, component, and level.");
    return;
  }
  const [slot_name, venue] = slotComposite.split("|");

  try {
    const response = await fetch(`${window.API_URL}/marks/admin/lock-exception`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": localStorage.getItem("token"),
      },
      body: JSON.stringify({
        slot_year,
        semester_type,
        component_type: component,
        program_level: level,
        employee_id: empId,
        course_code: course,
        slot_name,
        venue,
        expires_at: expires,
      }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || "Failed to add exception");
    }
    showMarksAlert("Exception added", "success");
    renderAdminLockControls(slot_year, semester_type);
  } catch (error) {
    console.error("Error adding exception:", error);
    alert(error.message || "Failed to add exception");
  }
}

async function deleteMarksLockException(id, slot_year, semester_type) {
  if (!confirm("Remove this unlock exception?")) return;
  try {
    const response = await fetch(`${window.API_URL}/marks/admin/lock-exception/${id}`, {
      method: "DELETE",
      headers: { "x-access-token": localStorage.getItem("token") },
    });
    if (!response.ok) throw new Error("Failed to remove exception");
    showMarksAlert("Exception removed", "success");
    renderAdminLockControls(slot_year, semester_type);
  } catch (error) {
    console.error("Error removing exception:", error);
    alert("Failed to remove exception");
  }
}

// Toggle lock/unlock for a component at a specific program level (UG/PG/ALL).
async function toggleLock(slot_year, semester_type, component_type, program_level, currentlyLocked) {
  const action = currentlyLocked ? "unlock" : "lock";

  try {
    const response = await fetch(`${window.API_URL}/marks/admin/${action}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": localStorage.getItem("token"),
      },
      body: JSON.stringify({ slot_year, semester_type, component_type, program_level }),
    });

    if (!response.ok) {
      throw new Error(`Failed to ${action} component`);
    }

    showMarksAlert(`${component_type} (${program_level}) ${action}ed successfully`, "success");

    // Refresh the lock controls panel
    renderAdminLockControls(slot_year, semester_type);
  } catch (error) {
    console.error(`Error ${action}ing component:`, error);
    showMarksAlert(`Failed to ${action} ${component_type} (${program_level})`, "danger");
  }
}

// ================== UTILITY FUNCTIONS ==================

// Utility functions
function showMarksAlert(message, type) {
  const alertDiv = document.createElement("div");
  alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
  alertDiv.style.cssText = "top: 20px; right: 20px; z-index: 9999; max-width: 400px;";
  alertDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  document.body.appendChild(alertDiv);

  setTimeout(() => {
    alertDiv.remove();
  }, 5000);
}

function showMarksError(message) {
  const content = document.getElementById("marks-content");
  if (content) {
    content.innerHTML = `
      <div class="alert alert-danger">
        <h5>Error</h5>
        <p>${message}</p>
        <button class="btn btn-primary" onclick="loadMarksInterface()">Try Again</button>
      </div>
    `;
  }
}

// Export for global access
window.initializeMarks = initializeMarks;
window.loadMarksCourses = loadMarksCourses;
window.selectCourseForMarks = selectCourseForMarks;
window.openConfigForm = openConfigForm;
window.openMarksEntry = openMarksEntry;
window.closeConfigForm = closeConfigForm;
window.addQuestion = addQuestion;
window.removeQuestion = removeQuestion;
window.updateQuestionsTotal = updateQuestionsTotal;
window.renderAssignmentFields = renderAssignmentFields;
window.validateMarkInput = validateMarkInput;
window.updateRowTotal = updateRowTotal;
window.saveMarksEntry = saveMarksEntry;
window.viewMarksSummary = viewMarksSummary;

// ===== STUDENT MARKS VIEW =====

// Initialize student marks view - load semesters first
async function initializeStudentMarks() {
  console.log("Initializing student marks view");

  // Reset UI
  const semesterSelect = document.getElementById("student-marks-semester-select");
  const coursesList = document.getElementById("student-marks-courses-list");
  const marksDetail = document.getElementById("student-marks-detail");

  if (semesterSelect) semesterSelect.value = "";
  if (coursesList) coursesList.style.display = "none";
  if (marksDetail) marksDetail.style.display = "none";

  // Load semesters
  await loadStudentSemesters();
}

// Load semesters where student has registrations
async function loadStudentSemesters() {
  const semesterSelect = document.getElementById("student-marks-semester-select");
  if (!semesterSelect) return;

  try {
    const response = await fetch(`${window.API_URL}/course-registration/my-semesters`, {
      headers: { "x-access-token": localStorage.getItem("token") }
    });

    if (!response.ok) {
      throw new Error("Failed to load semesters");
    }

    const semesters = await response.json();

    // Populate dropdown
    semesterSelect.innerHTML = '<option value="">-- Select Semester --</option>';
    semesters.forEach(sem => {
      semesterSelect.innerHTML += `<option value="${sem.slot_year}|${sem.semester_type}">${sem.semester_type} ${sem.slot_year}</option>`;
    });
  } catch (error) {
    console.error("Error loading semesters:", error);
    semesterSelect.innerHTML = '<option value="">Error loading semesters</option>';
  }
}

// Load courses for selected semester
async function loadStudentCoursesForMarks() {
  const semesterSelect = document.getElementById("student-marks-semester-select");
  const coursesList = document.getElementById("student-marks-courses-list");
  const marksDetail = document.getElementById("student-marks-detail");

  if (!semesterSelect || !coursesList) return;

  // Hide marks detail
  if (marksDetail) marksDetail.style.display = "none";

  const selectedValue = semesterSelect.value;
  if (!selectedValue) {
    coursesList.style.display = "none";
    return;
  }

  const [slot_year, semester_type] = selectedValue.split("|");

  coursesList.innerHTML = `
    <div class="text-center py-4">
      <div class="spinner-border text-primary" role="status"></div>
      <p class="mt-2">Loading courses...</p>
    </div>
  `;
  coursesList.style.display = "block";

  try {
    const response = await fetch(
      `${window.API_URL}/course-registration/my-timetable?slot_year=${slot_year}&semester_type=${semester_type}`,
      { headers: { "x-access-token": localStorage.getItem("token") } }
    );

    if (!response.ok) {
      throw new Error("Failed to load courses");
    }

    const data = await response.json();
    // API returns { registrations: [...], allRegistrations: [...], ... }
    const courses = data.allRegistrations || data.registrations || [];
    renderStudentCoursesList(courses, slot_year, semester_type);
  } catch (error) {
    console.error("Error loading courses:", error);
    coursesList.innerHTML = `
      <div class="alert alert-danger">
        <h6>Error loading courses</h6>
        <p>${error.message}</p>
      </div>
    `;
  }
}

// Render list of registered courses
function renderStudentCoursesList(courses, slot_year, semester_type) {
  const coursesList = document.getElementById("student-marks-courses-list");

  if (!courses || courses.length === 0) {
    coursesList.innerHTML = `
      <div class="alert alert-info">
        <h6>No Courses Found</h6>
        <p>You don't have any registered courses for this semester.</p>
      </div>
    `;
    return;
  }

  let html = `
    <h6 class="mb-3">Registered Courses</h6>
    <div class="list-group">
  `;

  courses.forEach(course => {
    html += `
      <a href="#" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
         onclick="showCourseMarks('${course.course_code}', '${course.slot_name}', '${course.venue || ''}', '${slot_year}', '${semester_type}'); return false;">
        <div>
          <strong>${course.course_code}</strong> - ${course.course_name}
          <br>
          <small class="text-muted">
            ${course.slot_name} | ${course.venue || 'TBA'} | ${course.faculty_name || 'TBA'}
          </small>
        </div>
        <span class="badge bg-primary">View Marks</span>
      </a>
    `;
  });

  html += '</div>';
  coursesList.innerHTML = html;
}

// Show marks for a specific course
async function showCourseMarks(courseCode, slotName, venue, slotYear, semesterType) {
  const coursesList = document.getElementById("student-marks-courses-list");
  const marksDetail = document.getElementById("student-marks-detail");

  if (!marksDetail) return;

  // Hide courses list, show marks detail
  if (coursesList) coursesList.style.display = "none";

  marksDetail.innerHTML = `
    <div class="text-center py-4">
      <div class="spinner-border text-primary" role="status"></div>
      <p class="mt-2">Loading marks...</p>
    </div>
  `;
  marksDetail.style.display = "block";

  try {
    // Fetch existing per-component marks AND the new consolidated view in parallel.
    const qs = `slot_year=${slotYear}&semester_type=${semesterType}&course_code=${courseCode}&slot_name=${encodeURIComponent(slotName)}`;
    const headers = { "x-access-token": localStorage.getItem("token") };

    const [marksRes, consolidatedRes] = await Promise.all([
      fetch(`${window.API_URL}/marks/student/my-marks?${qs}`, { headers }),
      fetch(`${window.API_URL}/marks/student/my-consolidated?${qs}`, { headers }),
    ]);

    if (!marksRes.ok) {
      throw new Error("Failed to load marks");
    }

    const data = await marksRes.json();
    const consolidatedData = consolidatedRes.ok ? await consolidatedRes.json() : null;
    renderCourseMarksDetail(data, courseCode, slotName, slotYear, semesterType, consolidatedData);
  } catch (error) {
    console.error("Error loading course marks:", error);
    marksDetail.innerHTML = `
      <div class="alert alert-danger">
        <h6>Error loading marks</h6>
        <p>${error.message}</p>
        <button class="btn btn-secondary btn-sm" onclick="backToCoursesList()">Back to Courses</button>
      </div>
    `;
  }
}

// Render the Consolidated Marks & Grade Report section (student view — vertical
// layout, one row per component, personal only).
function renderConsolidatedStudentPanel(data) {
  if (!data || !data.students || !data.students.length) return "";

  const { course, weightages } = data;
  const student = data.students[0];
  const caKeys = Object.keys(weightages).filter((k) => k.startsWith("CA"))
    .sort((a, b) => parseInt(a.slice(2)) - parseInt(b.slice(2)));
  const hasIM = (weightages.IM || 0) > 0;
  const hasLAB = (weightages.LAB || 0) > 0;

  const cellDash = `<td class="text-muted text-center">–</td>`;

  // Build per-component rows. Each row carries a `notPublished` flag so we can
  // render 'Not published yet' (distinct from 'entered but blank / — ').
  const componentRows = [];
  for (const k of caKeys) {
    const c = student.components[k];
    if (!c) continue;
    const notPublished = c.published === false;
    componentRows.push({
      name: k,
      actual: c.entered ? c.actual : null,
      converted: c.entered ? c.converted : null,
      actual_max: c.actual_max,
      weightage: c.weightage,
      pending: !c.entered,
      notPublished,
    });
  }
  if (hasIM) {
    const c = student.components.IM;
    const notPublished = c && c.published === false;
    componentRows.push({
      name: "Internal Marks (IM)",
      actual: c && c.entered ? c.actual : null,
      converted: c && c.entered ? c.converted : null,
      actual_max: c ? c.actual_max : 0,
      weightage: c ? c.weightage : weightages.IM,
      pending: !(c && c.entered),
      notPublished,
    });
  }
  if (hasLAB) {
    const c = student.components.LAB;
    const notPublished = c && c.published === false;
    componentRows.push({
      name: `Lab Evaluation${c && c.sessions_total && !notPublished ? ` (${c.sessions_done}/${c.sessions_total} sessions)` : ""}`,
      actual: c && c.entered ? c.actual : null,
      converted: c && c.entered ? c.converted : null,
      actual_max: c ? c.actual_max : 0,
      weightage: c ? c.weightage : weightages.LAB,
      pending: !(c && c.entered),
      notPublished,
    });
  }

  const rowsHtml = componentRows.map((r) => {
    // Unpublished takes priority over "pending" — student sees 'Not published
    // yet' rather than empty dashes, so they know it's a visibility gate.
    if (r.notPublished) {
      return `
        <tr class="text-muted">
          <td>${r.name} <span class="badge bg-secondary ms-1">Not published yet</span></td>
          <td colspan="2" class="text-center fst-italic">Faculty has not published these marks yet.</td>
          <td class="text-center text-muted">${r.weightage}</td>
        </tr>`;
    }
    const pendingBadge = r.pending ? ` <span class="badge bg-warning text-dark ms-1">Pending</span>` : "";
    return `
      <tr>
        <td>${r.name}${pendingBadge}</td>
        ${r.actual != null ? `<td class="text-center">${r.actual}</td>` : cellDash}
        ${r.converted != null ? `<td class="text-center fw-bold">${r.converted.toFixed(2)}</td>` : cellDash}
        <td class="text-center text-muted">${r.weightage}</td>
      </tr>`;
  }).join("");

  const publishedCount = componentRows.filter((r) => !r.notPublished).length;
  const enteredCount = componentRows.filter((r) => !r.notPublished && !r.pending).length;
  const totalComponents = componentRows.length;
  const completeness = totalComponents
    ? (publishedCount < totalComponents
        ? `${publishedCount} of ${totalComponents} components published so far`
        : (enteredCount === totalComponents ? `All ${totalComponents} components entered ✓` : `${enteredCount} of ${totalComponents} entered`))
    : "";

  // Grading Type for the student: prefer per-student value if backend attached
  // one (TEL case), else fall back to stats.grading_type. Always fall back to
  // [—] so the label stays consistent when unknown.
  const gradingTypeForStudent =
    (student && student.grading_type) ||
    (data.stats && data.stats.grading_type) ||
    "[—]";

  return `
    <div class="card mb-3 border-success">
      <div class="card-header bg-success text-white">
        <h6 class="mb-0"><i class="fas fa-award me-2"></i>Consolidated Marks &amp; Grade Report</h6>
      </div>
      <div class="card-body">
        <div class="small text-muted mb-2">
          <strong>Course:</strong> ${course.course_code} — ${course.course_name}
          &nbsp;|&nbsp; <strong>Slot:</strong> ${course.slot_name}
          &nbsp;|&nbsp; <strong>Faculty:</strong> ${course.faculty_name || "—"}
          &nbsp;|&nbsp; <strong>Type:</strong> ${data.assessment_type || course.course_type || ""}
          &nbsp;|&nbsp; <strong>Grading Type:</strong> ${gradingTypeForStudent}
        </div>
        <div class="table-responsive">
          <table class="table table-bordered table-sm align-middle">
            <thead class="table-success">
              <tr>
                <th>Component</th>
                <th class="text-center">Actual</th>
                <th class="text-center">Converted</th>
                <th class="text-center">Weightage /Max</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
            <tfoot>
              <tr class="table-success">
                <td class="fw-bold">GRAND TOTAL</td>
                <td></td>
                <td class="text-center fw-bold fs-5">${student.grand_total.toFixed(2)}</td>
                <td class="text-center fw-bold">100</td>
              </tr>
              <tr>
                <td class="fw-bold">GRADE</td>
                <td></td>
                <td class="text-center text-muted">[—]</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
        <small class="text-muted"><i class="fas fa-info-circle me-1"></i>${completeness}. Grand Total is out of 100.</small>
      </div>
    </div>
  `;
}

// Render marks detail for a course
function renderCourseMarksDetail(data, courseCode, slotName, slotYear, semesterType, consolidatedData) {
  const marksDetail = document.getElementById("student-marks-detail");

  let html = `
    <div class="mb-3">
      <button class="btn btn-secondary btn-sm" onclick="backToCoursesList()">
        <i class="fas fa-arrow-left"></i> Back to Courses
      </button>
    </div>
    ${renderConsolidatedStudentPanel(consolidatedData)}
  `;

  // Find the course in the data
  const course = data.courses && data.courses.find(c => c.course_code === courseCode && c.slot_name === slotName);

  if (!course) {
    html += `
      <div class="alert alert-info">
        <h6>No Marks Available</h6>
        <p>No marks have been entered for <strong>${courseCode}</strong> (${slotName}) yet.</p>
      </div>
    `;
    marksDetail.innerHTML = html;
    return;
  }

  html += `
    <div class="card">
      <div class="card-header">
        <strong>${course.course_code}</strong> - ${course.course_name}
        <span class="badge bg-secondary ms-2">${course.slot_name}</span>
      </div>
      <div class="card-body">
  `;

  if (course.marks && course.marks.length > 0) {
    html += `
      <div class="table-responsive">
        <table class="table table-bordered table-sm">
          <thead class="table-light">
            <tr>
              <th>Component</th>
              <th>Marks Obtained</th>
              <th>Max Marks</th>
              <th>Percentage</th>
            </tr>
          </thead>
          <tbody>
    `;

    let totalObtained = 0;
    let totalMax = 0;

    course.marks.forEach(mark => {
      const percentage = mark.max_marks > 0 ? ((mark.marks_obtained / mark.max_marks) * 100).toFixed(1) : 0;
      totalObtained += mark.marks_obtained || 0;
      totalMax += mark.max_marks || 0;

      html += `
        <tr>
          <td>${mark.component}</td>
          <td>${mark.marks_obtained !== null ? mark.marks_obtained.toFixed(2) : '-'}</td>
          <td>${mark.max_marks}</td>
          <td>${mark.marks_obtained !== null ? percentage + '%' : '-'}</td>
        </tr>
      `;
    });

    // Total row
    const totalPercentage = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(1) : 0;
    html += `
            <tr class="table-info fw-bold">
              <td>Total</td>
              <td>${totalObtained.toFixed(2)}</td>
              <td>${totalMax}</td>
              <td>${totalPercentage}%</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  } else {
    html += `<p class="text-muted">No marks entered yet for this course.</p>`;
  }

  html += `
      </div>
    </div>
  `;

  marksDetail.innerHTML = html;
}

// Back to courses list
function backToCoursesList() {
  const coursesList = document.getElementById("student-marks-courses-list");
  const marksDetail = document.getElementById("student-marks-detail");

  if (marksDetail) marksDetail.style.display = "none";
  if (coursesList) coursesList.style.display = "block";
}

// Export student marks functions
window.initializeStudentMarks = initializeStudentMarks;
window.loadStudentSemesters = loadStudentSemesters;
window.loadStudentCoursesForMarks = loadStudentCoursesForMarks;
window.showCourseMarks = showCourseMarks;
window.backToCoursesList = backToCoursesList;

// Exposed for the View Grades page (grades.js) to reuse the same renderer.
window.renderConsolidatedFacultyPanel = renderConsolidatedFacultyPanel;
