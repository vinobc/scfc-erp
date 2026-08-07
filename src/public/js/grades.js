// View Grades — dedicated screen for the Consolidated Marks & Grade Report.
// Faculty/Coordinator see their own courses; Admin/COE see all courses with a
// Faculty picker. HoI toggle can be added later as a follow-up.

(function () {
  let vgRole = null;
  let vgIsHoi = false;
  let vgHoiSchools = [];
  let vgCoursesCache = []; // rows: { course_code, course_name, employee_id, faculty_name, assessment_type, ... }
  let vgSlotsCache = [];   // rows: { slot_name, venue, component_type, assessment_type }

  function getRoleFromToken() {
    try {
      const t = localStorage.getItem("token");
      if (!t) return null;
      return JSON.parse(atob(t.split(".")[1])).role || null;
    } catch { return null; }
  }

  async function fetchHoiStatus() {
    try {
      const res = await fetch(`${window.API_URL}/reports/hoi-status`, {
        headers: { "x-access-token": localStorage.getItem("token") },
      });
      if (!res.ok) return;
      const data = await res.json();
      vgIsHoi = !!data.isHoi;
      vgHoiSchools = Array.isArray(data.schools) ? data.schools : [];
    } catch {}
  }

  async function initializeViewGrades() {
    vgRole = getRoleFromToken();
    await fetchHoiStatus();
    renderInterface();
  }

  function currentYearOptions() {
    // Match how Download Reports builds year options: recent years back a few.
    const now = new Date();
    const currentJulyOnwards = now.getMonth() >= 6;
    const baseYear = currentJulyOnwards ? now.getFullYear() : now.getFullYear() - 1;
    const opts = [];
    for (let i = 0; i < 4; i++) {
      const start = baseYear - i;
      const end = String(start + 1).slice(-2);
      const year = `${start}-${end}`;
      opts.push(`<option value="${year}">${year}</option>`);
    }
    return `<option value="">Select Academic Year</option>` + opts.join("");
  }

  // Current scope: "own" (faculty/coord's own courses) or "school" (HoI's school-wide).
  // Admin/COE always effectively see "all" via the same "own" branch (backend gives them everything).
  let vgScope = "own";

  function renderInterface() {
    const container = document.getElementById("view-grades-content");
    if (!container) return;

    const isAdminOrCoe = vgRole === "admin" || vgRole === "coe";
    const showHoiToggle = vgIsHoi && !isAdminOrCoe; // HoI who isn't already admin/coe
    // Faculty filter is shown for admin/coe always, and for HoI in School scope.
    const showFacultyFilterInitial = isAdminOrCoe || (showHoiToggle && vgScope === "school");

    if (isAdminOrCoe) vgScope = "own"; // 'own' branch handles admin/coe too (backend returns all)

    container.innerHTML = `
      <div class="mb-3">
        <h4 class="mb-1"><i class="fas fa-award me-2 text-success"></i>Consolidated Marks &amp; Grade Report</h4>
        <p class="text-muted mb-0" id="vg-blurb">
          ${isAdminOrCoe
            ? "View the consolidated grand-total-out-of-100 for any course-slot-faculty."
            : (showHoiToggle
                ? "View your own courses, or switch to My School to view any course-slot-faculty within your school."
                : "View the consolidated grand-total-out-of-100 for your own courses.")}
        </p>
      </div>

      ${showHoiToggle ? `
      <div class="mb-3">
        <div class="btn-group" role="group" aria-label="View Grades scope">
          <input type="radio" class="btn-check" name="vg-scope" id="vg-scope-own" value="own" ${vgScope === "own" ? "checked" : ""} onchange="setViewGradesScope('own')">
          <label class="btn btn-outline-primary" for="vg-scope-own"><i class="fas fa-user me-1"></i> My Courses</label>
          <input type="radio" class="btn-check" name="vg-scope" id="vg-scope-school" value="school" ${vgScope === "school" ? "checked" : ""} onchange="setViewGradesScope('school')">
          <label class="btn btn-outline-primary" for="vg-scope-school"><i class="fas fa-university me-1"></i> My School (HoI)</label>
        </div>
        ${vgHoiSchools.length ? `<small class="text-muted ms-2">${vgHoiSchools.map((s) => s.school_short_name).join(", ")}</small>` : ""}
      </div>` : ""}

      <div class="card mb-3">
        <div class="card-header bg-light">
          <h6 class="mb-0"><i class="fas fa-filter me-2"></i>Filters</h6>
        </div>
        <div class="card-body">
          <div class="row g-3">
            <div class="col-md-3">
              <label for="vg-year" class="form-label">Academic Year <span class="text-danger">*</span></label>
              <select id="vg-year" class="form-select" onchange="onViewGradesYearSemChange()">
                ${currentYearOptions()}
              </select>
            </div>
            <div class="col-md-3">
              <label for="vg-semester" class="form-label">Semester <span class="text-danger">*</span></label>
              <select id="vg-semester" class="form-select" onchange="onViewGradesYearSemChange()">
                <option value="">Select Semester</option>
                <option value="FALL">FALL</option>
                <option value="WINTER">WINTER</option>
                <option value="SUMMER">SUMMER</option>
              </select>
            </div>
            <div class="col-md-3">
              <label for="vg-course" class="form-label">Course <span class="text-danger">*</span></label>
              <select id="vg-course" class="form-select" onchange="onViewGradesCourseChange()">
                <option value="">Select Year & Semester first</option>
              </select>
            </div>
            <div class="col-md-3">
              <label for="vg-slot" class="form-label">Slot <span class="text-danger">*</span></label>
              <select id="vg-slot" class="form-select">
                <option value="">Select Course first</option>
              </select>
            </div>
          </div>
          <div class="row g-3 mt-1" id="vg-faculty-row" style="${showFacultyFilterInitial ? "" : "display:none"}">
            <div class="col-md-6">
              <label for="vg-faculty" class="form-label">Faculty <span class="text-danger">*</span></label>
              <select id="vg-faculty" class="form-select" onchange="onViewGradesFacultyChange()">
                <option value="">Select Course first</option>
              </select>
            </div>
          </div>
          <div class="row g-3 mt-1">
            <div class="col-12 d-flex gap-2">
              <button type="button" class="btn btn-success" onclick="loadViewGradesReport()">
                <i class="fas fa-eye me-2"></i>View Consolidated Report
              </button>
              <button type="button" class="btn btn-outline-secondary" onclick="clearViewGradesFilters()">
                <i class="fas fa-times me-1"></i>Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      <div id="vg-status"></div>
      <div id="vg-report"></div>
    `;
  }

  function setViewGradesScope(scope) {
    vgScope = scope;
    // Re-render so the Faculty picker visibility follows the toggle.
    renderInterface();
  }

  // Whether the current call should be HoI-scoped (hoi_scope=true query param).
  function useHoiScope() {
    return vgIsHoi && vgScope === "school";
  }

  async function onViewGradesYearSemChange() {
    const year = document.getElementById("vg-year").value;
    const semester = document.getElementById("vg-semester").value;
    const courseSelect = document.getElementById("vg-course");
    const slotSelect = document.getElementById("vg-slot");
    const facultySelect = document.getElementById("vg-faculty");

    slotSelect.innerHTML = `<option value="">Select Course first</option>`;
    if (facultySelect) facultySelect.innerHTML = `<option value="">Select Course first</option>`;
    vgCoursesCache = [];
    vgSlotsCache = [];

    if (!year || !semester) {
      courseSelect.innerHTML = `<option value="">Select Year & Semester first</option>`;
      return;
    }

    courseSelect.innerHTML = `<option value="">Loading courses...</option>`;
    try {
      const hoiParam = useHoiScope() ? "&hoi_scope=true" : "";
      const res = await fetch(
        `${window.API_URL}/reports/student-marks/courses?slot_year=${year}&semester_type=${semester}${hoiParam}`,
        { headers: { "x-access-token": localStorage.getItem("token") } }
      );
      if (!res.ok) throw new Error("Failed to load courses");
      vgCoursesCache = await res.json();

      // Distinct course_code list.
      const seen = new Set();
      const unique = [];
      for (const c of vgCoursesCache) {
        if (!seen.has(c.course_code)) {
          seen.add(c.course_code);
          unique.push(c);
        }
      }
      unique.sort((a, b) => a.course_code.localeCompare(b.course_code));
      courseSelect.innerHTML = `<option value="">Select Course</option>` +
        unique.map((c) => `<option value="${c.course_code}">${c.course_code} - ${c.course_name}</option>`).join("");
    } catch (e) {
      courseSelect.innerHTML = `<option value="">Error loading courses</option>`;
      showStatus("danger", `Error loading courses: ${e.message}`);
    }
  }

  async function onViewGradesCourseChange() {
    const year = document.getElementById("vg-year").value;
    const semester = document.getElementById("vg-semester").value;
    const course = document.getElementById("vg-course").value;
    const slotSelect = document.getElementById("vg-slot");
    const facultySelect = document.getElementById("vg-faculty");

    slotSelect.innerHTML = `<option value="">Loading slots...</option>`;
    if (facultySelect) facultySelect.innerHTML = `<option value="">Loading faculty...</option>`;
    vgSlotsCache = [];

    if (!course) {
      slotSelect.innerHTML = `<option value="">Select Course first</option>`;
      if (facultySelect) facultySelect.innerHTML = `<option value="">Select Course first</option>`;
      return;
    }

    // Populate Faculty dropdown (admin/coe only) — filter vgCoursesCache by course_code.
    if (facultySelect) {
      const facRows = vgCoursesCache.filter((c) => c.course_code === course);
      const seen = new Set();
      const uniqueFac = [];
      for (const f of facRows) {
        if (!seen.has(f.employee_id)) {
          seen.add(f.employee_id);
          uniqueFac.push(f);
        }
      }
      uniqueFac.sort((a, b) => String(a.faculty_name).localeCompare(String(b.faculty_name)));
      facultySelect.innerHTML = `<option value="">All Faculty (pick to filter slots)</option>` +
        uniqueFac.map((f) => `<option value="${f.employee_id}">${f.faculty_name}</option>`).join("");
    }

    // Load slots — auto-scoped for faculty/coord; HoI passes hoi_scope=true.
    try {
      let url = `${window.API_URL}/reports/student-marks/slots?slot_year=${year}&semester_type=${semester}&course_code=${course}`;
      const empId = facultySelect ? facultySelect.value : "";
      if (empId) url += `&employee_id=${empId}`;
      if (useHoiScope()) url += `&hoi_scope=true`;
      const res = await fetch(url, { headers: { "x-access-token": localStorage.getItem("token") } });
      if (!res.ok) throw new Error("Failed to load slots");
      vgSlotsCache = await res.json();
      slotSelect.innerHTML = `<option value="">Select Slot</option>` +
        vgSlotsCache.map((s) => `<option value="${s.slot_name}|${s.venue}">${s.slot_name} (${s.venue})</option>`).join("");
    } catch (e) {
      slotSelect.innerHTML = `<option value="">Error loading slots</option>`;
      showStatus("danger", `Error loading slots: ${e.message}`);
    }
  }

  // Faculty picked — reload only the Slot dropdown (scoped to this faculty).
  // Does NOT touch the Faculty dropdown itself, so the user's selection sticks.
  async function onViewGradesFacultyChange() {
    const year = document.getElementById("vg-year").value;
    const semester = document.getElementById("vg-semester").value;
    const course = document.getElementById("vg-course").value;
    const empId = document.getElementById("vg-faculty").value;
    const slotSelect = document.getElementById("vg-slot");
    if (!year || !semester || !course) return;

    slotSelect.innerHTML = `<option value="">Loading slots...</option>`;
    vgSlotsCache = [];
    try {
      let url = `${window.API_URL}/reports/student-marks/slots?slot_year=${year}&semester_type=${semester}&course_code=${course}`;
      if (empId) url += `&employee_id=${empId}`;
      if (useHoiScope()) url += `&hoi_scope=true`;
      const res = await fetch(url, { headers: { "x-access-token": localStorage.getItem("token") } });
      if (!res.ok) throw new Error("Failed to load slots");
      vgSlotsCache = await res.json();
      slotSelect.innerHTML = `<option value="">Select Slot</option>` +
        vgSlotsCache.map((s) => `<option value="${s.slot_name}|${s.venue}">${s.slot_name} (${s.venue})</option>`).join("");
    } catch (e) {
      slotSelect.innerHTML = `<option value="">Error loading slots</option>`;
      showStatus("danger", `Error loading slots: ${e.message}`);
    }
  }

  function clearViewGradesFilters() {
    document.getElementById("vg-year").value = "";
    document.getElementById("vg-semester").value = "";
    document.getElementById("vg-course").innerHTML = `<option value="">Select Year & Semester first</option>`;
    document.getElementById("vg-slot").innerHTML = `<option value="">Select Course first</option>`;
    const fac = document.getElementById("vg-faculty");
    if (fac) fac.innerHTML = `<option value="">Select Course first</option>`;
    document.getElementById("vg-report").innerHTML = "";
    document.getElementById("vg-status").innerHTML = "";
    vgCoursesCache = [];
    vgSlotsCache = [];
  }

  function showStatus(kind, msg) {
    const s = document.getElementById("vg-status");
    if (s) s.innerHTML = `<div class="alert alert-${kind} py-2">${msg}</div>`;
  }

  // Resolve employee_id from the current filter state.
  function resolveEmployeeId(course) {
    const facSelect = document.getElementById("vg-faculty");
    const explicit = facSelect ? facSelect.value : "";
    if (explicit) return explicit;
    // In HoI school scope OR admin/coe, cache may have multiple faculty per
    // course; a specific pick is required rather than auto-first.
    const rows = vgCoursesCache.filter((c) => c.course_code === course);
    if (rows.length === 1) return rows[0].employee_id;
    return null;
  }

  async function loadViewGradesReport() {
    const year = document.getElementById("vg-year").value;
    const semester = document.getElementById("vg-semester").value;
    const course = document.getElementById("vg-course").value;
    const slotChoice = document.getElementById("vg-slot").value;
    const reportDiv = document.getElementById("vg-report");

    if (!year || !semester || !course || !slotChoice) {
      showStatus("warning", "Please select Academic Year, Semester, Course, and Slot.");
      return;
    }

    const [slotName, venue] = slotChoice.split("|");
    const empId = resolveEmployeeId(course);
    if (!empId) {
      showStatus("warning", "Could not resolve faculty for this course. If you're admin/COE, pick a Faculty.");
      return;
    }

    reportDiv.innerHTML = `
      <div class="text-center py-4">
        <div class="spinner-border text-primary" role="status"></div>
        <p class="mt-2">Loading Consolidated report...</p>
      </div>
    `;
    showStatus("info", "Fetching consolidated report...");

    try {
      const qs = new URLSearchParams({
        slot_year: year,
        semester_type: semester,
        course_code: course,
        employee_id: String(empId),
        slot_name: slotName,
        venue,
      }).toString();
      const res = await fetch(`${window.API_URL}/marks/consolidated?${qs}`, {
        headers: { "x-access-token": localStorage.getItem("token") },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to load report");
      }
      const data = await res.json();

      // Attach a download callback that uses the same filter state.
      window.__vgDownloadPayload = { year, semester, course, empId, slotName, venue };

      const cardHtml = (typeof window.renderConsolidatedFacultyPanel === "function")
        ? window.renderConsolidatedFacultyPanel(data)
        : `<div class="alert alert-danger">Renderer not available — please reload the page.</div>`;

      // Replace the Export XLSX handler on the rendered card. The renderer wires
      // it to `downloadConsolidatedReport()` (which reads selectedCourse from the
      // Marks page). Here we override with a View-Grades-specific download.
      reportDiv.innerHTML = cardHtml.replace(
        /onclick="downloadConsolidatedReport\(\)"/g,
        `onclick="downloadViewGradesXlsx()"`
      );
      document.getElementById("vg-status").innerHTML = "";
    } catch (e) {
      reportDiv.innerHTML = "";
      showStatus("danger", `Error: ${e.message}`);
    }
  }

  async function downloadViewGradesXlsx() {
    const p = window.__vgDownloadPayload;
    if (!p) { showStatus("warning", "Load a report first, then download."); return; }
    try {
      const qs = new URLSearchParams({
        slot_year: p.year,
        semester_type: p.semester,
        course_code: p.course,
        employee_id: String(p.empId),
        slot_name: p.slotName,
        venue: p.venue,
      }).toString();
      const res = await fetch(`${window.API_URL}/reports/consolidated?${qs}`, {
        headers: { "x-access-token": localStorage.getItem("token") },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to download");
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") || "";
      let filename = "consolidated_report.xlsx";
      const m = cd.match(/filename="?(.+?)"?$/);
      if (m) filename = m[1];
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      showStatus("danger", `Download failed: ${e.message}`);
    }
  }

  // Global exports.
  window.initializeViewGrades = initializeViewGrades;
  window.onViewGradesYearSemChange = onViewGradesYearSemChange;
  window.onViewGradesCourseChange = onViewGradesCourseChange;
  window.clearViewGradesFilters = clearViewGradesFilters;
  window.loadViewGradesReport = loadViewGradesReport;
  window.downloadViewGradesXlsx = downloadViewGradesXlsx;
  window.setViewGradesScope = setViewGradesScope;
  window.onViewGradesFacultyChange = onViewGradesFacultyChange;
})();
