// Course Syllabus admin page: course-owner cascade, searchable/chip requisite
// widgets, metadata form (with auto-fill from latest version), PDF+Word upload,
// list with delete. Also serves the student-portal "My Syllabus" flow.

let __syllabusCoursesCache = null;
let __syllabusSchoolCodeMap = new Map();
let __syllabusAdminInitialized = false;

// Widget instances for the 5 admin form selectors.
let __sylWidgetCode = null;
let __sylWidgetPre = null;
let __sylWidgetAnti = null;
let __sylWidgetCo = null;
let __sylWidgetEquiv = null;

// Split on any owner-separator (,  &  +  " and "), map SCL### -> school_short_name,
// dedupe, sort, and join with " + ". Collapses "ASET & AIIT", "AIIT,ASET",
// "SCL003+SCL011" etc into the same canonical label.
function syllabusResolveOwner(raw) {
  if (!raw) return "";
  const tokens = String(raw)
    .split(/\s*(?:,|&|\+|\band\b)\s*/i)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => __syllabusSchoolCodeMap.get(t.toUpperCase()) || t);
  return [...new Set(tokens)].sort().join(" + ");
}

function syllabusHeaders() {
  return { "x-access-token": localStorage.getItem("token") };
}

function syllabusEscapeHtml(str) {
  return String(str == null ? "" : str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

function courseToItem(c) {
  return { value: c.course_code, label: `${c.course_code} - ${c.course_name}` };
}

async function initializeCourseSyllabus() {
  if (!__syllabusAdminInitialized) {
    __syllabusAdminInitialized = true;
    initializeSyllabusWidgets();
    wireSyllabusEvents();
  }
  await loadSyllabusCourses();
  populateSyllabusOwners();
  loadSyllabusList();
}

function initializeSyllabusWidgets() {
  __sylWidgetCode = createSearchableSelect({
    containerId: "syl-course-code-mount",
    hiddenInputId: "syl-course-code",
    items: [],
    placeholder: "Select course owner first",
    onChange: (value) => onSyllabusCourseCodeChanged(value),
  });
  if (__sylWidgetCode) __sylWidgetCode.setDisabled(true);

  const mkChip = (containerId, hiddenId, naId) =>
    createChipMultiSelect({
      containerId,
      hiddenInputId: hiddenId,
      items: [],
      placeholder: "Select a course code first",
      onChange: (values) => {
        // If user picks any chip, un-check the NA box.
        const na = document.getElementById(naId);
        if (na && values.length > 0) na.checked = false;
      },
    });

  __sylWidgetPre = mkChip("syl-pre-mount", "syl-pre", "syl-pre-na");
  __sylWidgetAnti = mkChip("syl-anti-mount", "syl-anti", "syl-anti-na");
  __sylWidgetCo = mkChip("syl-co-mount", "syl-co", "syl-co-na");
  __sylWidgetEquiv = mkChip("syl-equiv-mount", "syl-equiv", "syl-equiv-na");

  // Requisite widgets start disabled until a course is picked.
  [__sylWidgetPre, __sylWidgetAnti, __sylWidgetCo, __sylWidgetEquiv].forEach((w) => {
    if (w) w.setDisabled(true);
  });
}

async function loadSyllabusCourses() {
  try {
    const [coursesRes, schoolsRes] = await Promise.all([
      fetch(`${window.API_URL}/courses`, { headers: syllabusHeaders() }),
      fetch(`${window.API_URL}/schools`, { headers: syllabusHeaders() }),
    ]);
    if (!coursesRes.ok) throw new Error("Failed to load courses");
    const courses = await coursesRes.json();
    const schools = schoolsRes.ok ? await schoolsRes.json() : [];

    __syllabusSchoolCodeMap = new Map();
    schools.forEach((s) => {
      if (s.school_code && s.school_short_name) {
        __syllabusSchoolCodeMap.set(String(s.school_code).trim().toUpperCase(), s.school_short_name);
      }
    });

    courses.forEach((c) => {
      c.resolved_owner = syllabusResolveOwner(c.course_owner);
    });
    __syllabusCoursesCache = courses;
  } catch (err) {
    console.error(err);
    __syllabusCoursesCache = [];
    if (typeof showAlert === "function") showAlert("Failed to load courses", "danger");
  }
}

function populateSyllabusOwners() {
  const sel = document.getElementById("syl-owner");
  if (!sel) return;
  const owners = new Set();
  (__syllabusCoursesCache || []).forEach((c) => {
    if (c.resolved_owner) owners.add(c.resolved_owner);
  });
  sel.innerHTML = '<option value="">Select course owner</option>';
  [...owners].sort().forEach((o) => {
    const opt = document.createElement("option");
    opt.value = o;
    opt.textContent = o;
    sel.appendChild(opt);
  });

  const typeSel = document.getElementById("syl-course-type");
  if (typeSel) {
    const types = new Set();
    (__syllabusCoursesCache || []).forEach((c) => {
      if (c.course_type) types.add(c.course_type);
    });
    typeSel.innerHTML = '<option value="">Select type</option>';
    [...types].sort().forEach((t) => {
      const opt = document.createElement("option");
      opt.value = t;
      opt.textContent = t;
      typeSel.appendChild(opt);
    });
  }
}

function refreshCourseCodeWidgetForOwner(owner) {
  if (!__sylWidgetCode) return;
  if (!owner) {
    __sylWidgetCode.refresh([]);
    __sylWidgetCode.clear();
    __sylWidgetCode.setDisabled(true);
    return;
  }
  const list = (__syllabusCoursesCache || [])
    .filter((c) => c.resolved_owner === owner)
    .sort((a, b) => a.course_code.localeCompare(b.course_code))
    .map(courseToItem);
  __sylWidgetCode.refresh(list);
  __sylWidgetCode.clear();
  __sylWidgetCode.setDisabled(list.length === 0);
}

function refreshRequisiteWidgets(excludeCourseCode) {
  const list = (__syllabusCoursesCache || [])
    .filter((c) => c.course_code !== excludeCourseCode)
    .sort((a, b) => a.course_code.localeCompare(b.course_code))
    .map(courseToItem);
  [__sylWidgetPre, __sylWidgetAnti, __sylWidgetCo, __sylWidgetEquiv].forEach((w) => {
    if (w) {
      w.refresh(list);
      w.clear();
    }
  });
}

function fillCourseAutoFields(course) {
  document.getElementById("syl-course-title").value = course ? course.course_name : "";
  document.getElementById("syl-tpc").value = course
    ? `${course.theory}-${course.practical}-${course.credits}`
    : "";
  const typeSel = document.getElementById("syl-course-type");
  if (typeSel && course && course.course_type) typeSel.value = course.course_type;
}

// Apply a requisite list to a widget + its NA checkbox. If the list is empty,
// NA is checked and the widget is disabled; otherwise chips are set.
function applyRequisitesToWidget(widget, naCheckbox, list) {
  if (!widget || !naCheckbox) return;
  const arr = Array.isArray(list) ? list : [];
  if (arr.length === 0) {
    widget.clear();
    naCheckbox.checked = true;
    widget.setDisabled(true);
  } else {
    naCheckbox.checked = false;
    widget.setDisabled(false);
    widget.setValues(arr);
  }
}

async function autoFillFromLatestVersion(courseCode) {
  if (!courseCode) return;
  try {
    const res = await fetch(
      `${window.API_URL}/course-syllabus/details?course_code=${encodeURIComponent(courseCode)}`,
      { headers: syllabusHeaders() }
    );
    if (!res.ok) return;
    const d = await res.json();

    const typeSel = document.getElementById("syl-course-type");
    if (typeSel && d.course_type) typeSel.value = d.course_type;

    applyRequisitesToWidget(__sylWidgetPre, document.getElementById("syl-pre-na"), d.pre_requisites);
    applyRequisitesToWidget(__sylWidgetAnti, document.getElementById("syl-anti-na"), d.anti_requisites);
    applyRequisitesToWidget(__sylWidgetCo, document.getElementById("syl-co-na"), d.co_requisites);
    applyRequisitesToWidget(__sylWidgetEquiv, document.getElementById("syl-equiv-na"), d.course_equivalence);

    document.getElementById(d.ocne ? "syl-ocne-yes" : "syl-ocne-no").checked = true;
    document.getElementById(d.pbl ? "syl-pbl-yes" : "syl-pbl-no").checked = true;

    if (typeof showAlert === "function") {
      showAlert(`Metadata auto-filled from version ${Number(d.syllabus_version).toFixed(2)}. Edit and set a new version.`, "info");
    }
  } catch (err) {
    console.error("autoFillFromLatestVersion:", err);
  }
}

async function onSyllabusCourseCodeChanged(code) {
  const course = (__syllabusCoursesCache || []).find((c) => c.course_code === code);
  fillCourseAutoFields(course);
  refreshRequisiteWidgets(code);
  // Default to NA (nothing selected).
  ["syl-pre-na", "syl-anti-na", "syl-co-na", "syl-equiv-na"].forEach((id) => {
    const cb = document.getElementById(id);
    if (cb) cb.checked = true;
  });
  [__sylWidgetPre, __sylWidgetAnti, __sylWidgetCo, __sylWidgetEquiv].forEach((w) => {
    if (w) w.setDisabled(true);
  });
  if (code) await autoFillFromLatestVersion(code);
}

async function loadSyllabusList() {
  const tbody = document.getElementById("syllabus-table-body");
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted">Loading&hellip;</td></tr>';
  try {
    const res = await fetch(`${window.API_URL}/course-syllabus`, { headers: syllabusHeaders() });
    if (!res.ok) throw new Error("Failed to load syllabi");
    const rows = await res.json();
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted">No syllabi uploaded yet.</td></tr>';
      return;
    }
    tbody.innerHTML = "";
    rows.forEach((r) => {
      const tr = document.createElement("tr");
      const uploaded = r.uploaded_at ? new Date(r.uploaded_at).toLocaleDateString() : "";
      tr.innerHTML = `
        <td>${syllabusEscapeHtml(syllabusResolveOwner(r.course_owner))}</td>
        <td>${syllabusEscapeHtml(r.course_code)}</td>
        <td>${syllabusEscapeHtml(r.course_name)}</td>
        <td>${Number(r.syllabus_version).toFixed(2)}</td>
        <td>${syllabusEscapeHtml(r.course_type || "")}</td>
        <td>${r.ocne ? "Yes" : "No"}</td>
        <td>${r.pbl ? "Yes" : "No"}</td>
        <td>${uploaded}</td>
        <td>
          <button class="btn btn-sm btn-outline-info me-1" data-view-syllabus="${r.id}" data-course-code="${syllabusEscapeHtml(r.course_code)}" data-version="${r.syllabus_version}">View</button>
          <a class="btn btn-sm btn-outline-primary me-1" href="#" data-syl-download="pdf" data-id="${r.id}">PDF</a>
          <a class="btn btn-sm btn-outline-secondary me-1" href="#" data-syl-download="word" data-id="${r.id}">Word</a>
          <button class="btn btn-sm btn-outline-danger" data-delete-syllabus="${r.id}">Delete</button>
        </td>`;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    tbody.innerHTML = '<tr><td colspan="9" class="text-center text-danger">Failed to load.</td></tr>';
  }
}

async function downloadSyllabusFile(id, kind) {
  try {
    const res = await fetch(`${window.API_URL}/course-syllabus/${id}/download/${kind}`, {
      headers: syllabusHeaders(),
    });
    if (!res.ok) {
      const msg = (await res.json().catch(() => ({}))).message || "Download failed";
      if (typeof showAlert === "function") showAlert(msg, "danger");
      return;
    }
    const blob = await res.blob();
    const disposition = res.headers.get("Content-Disposition") || "";
    const match = /filename="?([^";]+)"?/.exec(disposition);
    const filename = match ? match[1] : `syllabus_${id}.${kind === "pdf" ? "pdf" : "docx"}`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error(err);
    if (typeof showAlert === "function") showAlert("Download failed", "danger");
  }
}

function wireSyllabusEvents() {
  const ownerSel = document.getElementById("syl-owner");
  if (ownerSel) {
    ownerSel.addEventListener("change", (e) => {
      refreshCourseCodeWidgetForOwner(e.target.value);
      fillCourseAutoFields(null);
      refreshRequisiteWidgets(""); // clears + empties widget datasets
      [__sylWidgetPre, __sylWidgetAnti, __sylWidgetCo, __sylWidgetEquiv].forEach((w) => {
        if (w) w.setDisabled(true);
      });
    });
  }

  // NA checkboxes disable + clear their sibling chip widget.
  [
    ["syl-pre-na", __sylWidgetPre],
    ["syl-anti-na", __sylWidgetAnti],
    ["syl-co-na", __sylWidgetCo],
    ["syl-equiv-na", __sylWidgetEquiv],
  ].forEach(([naId]) => {
    const na = document.getElementById(naId);
    if (!na) return;
    na.addEventListener("change", () => {
      // Resolve the widget by naId at call time (init order safety).
      const w = ({
        "syl-pre-na": __sylWidgetPre,
        "syl-anti-na": __sylWidgetAnti,
        "syl-co-na": __sylWidgetCo,
        "syl-equiv-na": __sylWidgetEquiv,
      })[naId];
      if (!w) return;
      if (na.checked) {
        w.clear();
        w.setDisabled(true);
      } else {
        w.setDisabled(false);
      }
    });
  });

  const form = document.getElementById("syllabus-upload-form");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = document.getElementById("syl-upload-btn");
      const course_code = __sylWidgetCode ? __sylWidgetCode.getValue() : "";
      const syllabus_version = document.getElementById("syl-version").value.trim();
      const course_type = document.getElementById("syl-course-type").value;
      const pdfFile = document.getElementById("syl-pdf").files[0];
      const wordFile = document.getElementById("syl-word").files[0];

      if (!course_code || !syllabus_version || !pdfFile || !wordFile) {
        if (typeof showAlert === "function") showAlert("Please fill all required fields and pick both files.", "warning");
        return;
      }
      if (!/^\d+\.\d{2}$/.test(syllabus_version)) {
        if (typeof showAlert === "function") showAlert("Version must be in x.xx format (e.g., 1.00)", "warning");
        return;
      }

      const pre = document.getElementById("syl-pre-na").checked ? [] : (__sylWidgetPre ? __sylWidgetPre.getValues() : []);
      const anti = document.getElementById("syl-anti-na").checked ? [] : (__sylWidgetAnti ? __sylWidgetAnti.getValues() : []);
      const co = document.getElementById("syl-co-na").checked ? [] : (__sylWidgetCo ? __sylWidgetCo.getValues() : []);
      const equiv = document.getElementById("syl-equiv-na").checked ? [] : (__sylWidgetEquiv ? __sylWidgetEquiv.getValues() : []);
      const ocne = document.querySelector('input[name="syl-ocne"]:checked').value;
      const pbl = document.querySelector('input[name="syl-pbl"]:checked').value;

      const fd = new FormData();
      fd.append("course_code", course_code);
      fd.append("syllabus_version", syllabus_version);
      fd.append("course_type", course_type);
      fd.append("pre_requisites", JSON.stringify(pre));
      fd.append("anti_requisites", JSON.stringify(anti));
      fd.append("co_requisites", JSON.stringify(co));
      fd.append("course_equivalence", JSON.stringify(equiv));
      fd.append("ocne", ocne);
      fd.append("pbl", pbl);
      fd.append("pdf", pdfFile);
      fd.append("word", wordFile);

      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Uploading&hellip;';
      try {
        const res = await fetch(`${window.API_URL}/course-syllabus/upload`, {
          method: "POST",
          headers: syllabusHeaders(),
          body: fd,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (typeof showAlert === "function") showAlert(data.message || "Upload failed", "danger");
          return;
        }
        if (typeof showAlert === "function") showAlert("Syllabus uploaded successfully.", "success");
        form.reset();
        if (__sylWidgetCode) {
          __sylWidgetCode.clear();
          __sylWidgetCode.refresh([]);
          __sylWidgetCode.setDisabled(true);
        }
        [__sylWidgetPre, __sylWidgetAnti, __sylWidgetCo, __sylWidgetEquiv].forEach((w) => {
          if (w) { w.clear(); w.refresh([]); w.setDisabled(true); }
        });
        fillCourseAutoFields(null);
        loadSyllabusList();
      } catch (err) {
        console.error(err);
        if (typeof showAlert === "function") showAlert("Upload failed", "danger");
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-upload me-1"></i> Upload Syllabus';
      }
    });
  }

  const tbody = document.getElementById("syllabus-table-body");
  if (tbody) {
    tbody.addEventListener("click", async (e) => {
      const delBtn = e.target.closest("[data-delete-syllabus]");
      if (delBtn) {
        const id = delBtn.getAttribute("data-delete-syllabus");
        if (!confirm("Delete this syllabus? Both PDF and Word files will be removed permanently.")) return;
        try {
          const res = await fetch(`${window.API_URL}/course-syllabus/${id}`, {
            method: "DELETE",
            headers: syllabusHeaders(),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            if (typeof showAlert === "function") showAlert(data.message || "Delete failed", "danger");
            return;
          }
          if (typeof showAlert === "function") showAlert("Syllabus deleted.", "success");
          loadSyllabusList();
        } catch (err) {
          console.error(err);
          if (typeof showAlert === "function") showAlert("Delete failed", "danger");
        }
        return;
      }
      const dl = e.target.closest("[data-syl-download]");
      if (dl) {
        e.preventDefault();
        downloadSyllabusFile(dl.getAttribute("data-id"), dl.getAttribute("data-syl-download"));
        return;
      }
      const viewBtn = e.target.closest("[data-view-syllabus]");
      if (viewBtn) {
        e.preventDefault();
        toggleSyllabusDetailsRow(viewBtn);
      }
    });
  }
}

async function toggleSyllabusDetailsRow(btn) {
  const id = btn.getAttribute("data-view-syllabus");
  const courseCode = btn.getAttribute("data-course-code");
  const version = btn.getAttribute("data-version");
  const tr = btn.closest("tr");
  if (!tr) return;

  // Toggle: if a details row already follows, remove it.
  const next = tr.nextElementSibling;
  if (next && next.classList.contains("syl-details-row") && next.dataset.forId === id) {
    next.remove();
    btn.textContent = "View";
    return;
  }

  // Remove any other open details row first (only one at a time).
  document.querySelectorAll(".syl-details-row").forEach((r) => r.remove());
  document.querySelectorAll("[data-view-syllabus]").forEach((b) => (b.textContent = "View"));

  const detailsTr = document.createElement("tr");
  detailsTr.className = "syl-details-row";
  detailsTr.dataset.forId = id;
  const td = document.createElement("td");
  td.colSpan = 9;
  td.innerHTML = '<div class="text-muted small">Loading details&hellip;</div>';
  detailsTr.appendChild(td);
  tr.after(detailsTr);
  btn.textContent = "Hide";

  const url = new URL(`${window.API_URL}/course-syllabus/details`);
  url.searchParams.set("course_code", courseCode);
  url.searchParams.set("version", version);
  try {
    const res = await fetch(url.toString(), { headers: syllabusHeaders() });
    if (!res.ok) {
      const msg = (await res.json().catch(() => ({}))).message || "Failed to fetch syllabus";
      td.innerHTML = `<div class="alert alert-warning mb-0">${syllabusEscapeHtml(msg)}</div>`;
      return;
    }
    const d = await res.json();
    const names = d.requisite_names || {};
    const formatCode = (code) => (names[code] ? `${code} - ${names[code]}` : code);
    const listOrNA = (arr) =>
      (arr && arr.length ? arr.map((c) => syllabusEscapeHtml(formatCode(c))).join(", ") : "NA");
    td.innerHTML = `
      <div class="card">
        <div class="card-body">
          <div class="row g-2">
            <div class="col-md-4"><strong>Course Code:</strong> ${syllabusEscapeHtml(d.course_code)}</div>
            <div class="col-md-8"><strong>Course Title:</strong> ${syllabusEscapeHtml(d.course_name)}</div>
            <div class="col-md-4"><strong>TPC:</strong> ${d.theory}-${d.practical}-${d.credits}</div>
            <div class="col-md-4"><strong>Syllabus Version:</strong> ${Number(d.syllabus_version).toFixed(2)}</div>
            <div class="col-md-4"><strong>Course Type:</strong> ${syllabusEscapeHtml(d.course_type || "")}</div>
            <div class="col-12"><strong>Pre-requisite(s):</strong> ${listOrNA(d.pre_requisites)}</div>
            <div class="col-12"><strong>Anti-requisite(s):</strong> ${listOrNA(d.anti_requisites)}</div>
            <div class="col-12"><strong>Co-requisite(s):</strong> ${listOrNA(d.co_requisites)}</div>
            <div class="col-12"><strong>Course Equivalence:</strong> ${listOrNA(d.course_equivalence)}</div>
            <div class="col-md-3"><strong>OCNE:</strong> ${d.ocne ? "Yes" : "No"}</div>
            <div class="col-md-3"><strong>PBL:</strong> ${d.pbl ? "Yes" : "No"}</div>
          </div>
        </div>
      </div>`;
  } catch (err) {
    console.error(err);
    td.innerHTML = '<div class="alert alert-danger mb-0">Failed to fetch syllabus details.</div>';
  }
}

// ---------- Student Portal ("My Syllabus") ----------
let __stuSyllabusCourses = null;
let __stuSyllabusWired = false;
let __stuSyllabusCourseWidget = null;

async function initializeStudentSyllabus() {
  const mount = document.getElementById("stu-syl-course-mount");
  if (!mount) return;

  if (!__stuSyllabusWired) {
    __stuSyllabusWired = true;
    __stuSyllabusCourseWidget = createSearchableSelect({
      containerId: "stu-syl-course-mount",
      hiddenInputId: "stu-syl-course",
      items: [],
      placeholder: "Type course code or subject name…",
      onChange: (value) => stuSylOnCourseChange(value),
    });
    document.getElementById("stu-syl-version").addEventListener("change", () => stuSylFetchDetails());
    document.getElementById("stu-syl-download-btn").addEventListener("click", stuSylDownload);
  }

  try {
    const res = await fetch(`${window.API_URL}/course-syllabus/uploaded-courses`, {
      headers: syllabusHeaders(),
    });
    if (!res.ok) throw new Error("Failed to load courses");
    __stuSyllabusCourses = await res.json();
  } catch (err) {
    console.error(err);
    __stuSyllabusCourses = [];
  }

  if (__stuSyllabusCourseWidget) {
    __stuSyllabusCourseWidget.refresh(__stuSyllabusCourses.map(courseToItem));
    __stuSyllabusCourseWidget.clear();
  }
  document.getElementById("stu-syl-version").innerHTML = '<option value="">Latest</option>';
  document.getElementById("stu-syl-version").disabled = true;
  document.getElementById("stu-syl-download-btn").disabled = true;
  document.getElementById("stu-syl-details").innerHTML = "";
}

async function stuSylOnCourseChange(courseCode) {
  const verSel = document.getElementById("stu-syl-version");
  const details = document.getElementById("stu-syl-details");
  const dlBtn = document.getElementById("stu-syl-download-btn");
  verSel.innerHTML = '<option value="">Latest</option>';
  verSel.disabled = true;
  dlBtn.disabled = true;
  details.innerHTML = "";
  if (!courseCode) return;

  try {
    const res = await fetch(
      `${window.API_URL}/course-syllabus/versions?course_code=${encodeURIComponent(courseCode)}`,
      { headers: syllabusHeaders() }
    );
    if (!res.ok) throw new Error("Failed to load versions");
    const versions = await res.json();
    versions.forEach((v) => {
      const opt = document.createElement("option");
      opt.value = v.syllabus_version;
      opt.textContent = Number(v.syllabus_version).toFixed(2);
      verSel.appendChild(opt);
    });
    verSel.disabled = versions.length === 0;
  } catch (err) {
    console.error(err);
  }
  stuSylFetchDetails();
}

async function stuSylFetchDetails() {
  const courseCode = document.getElementById("stu-syl-course").value;
  const version = document.getElementById("stu-syl-version").value;
  const details = document.getElementById("stu-syl-details");
  const dlBtn = document.getElementById("stu-syl-download-btn");
  details.innerHTML = "";
  dlBtn.disabled = true;
  if (!courseCode) return;

  const url = new URL(`${window.API_URL}/course-syllabus/details`);
  url.searchParams.set("course_code", courseCode);
  if (version) url.searchParams.set("version", version);

  try {
    const res = await fetch(url.toString(), { headers: syllabusHeaders() });
    if (!res.ok) {
      const msg = (await res.json().catch(() => ({}))).message || "Failed to fetch syllabus";
      details.innerHTML = `<div class="alert alert-warning mb-0">${syllabusEscapeHtml(msg)}</div>`;
      return;
    }
    const d = await res.json();
    dlBtn.dataset.syllabusId = d.id;
    dlBtn.disabled = false;

    const names = d.requisite_names || {};
    const formatCode = (code) => {
      const title = names[code];
      return title ? `${code} - ${title}` : code;
    };
    const listOrNA = (arr) =>
      (arr && arr.length ? arr.map((c) => syllabusEscapeHtml(formatCode(c))).join(", ") : "NA");
    details.innerHTML = `
      <div class="card">
        <div class="card-body">
          <div class="row g-2">
            <div class="col-md-4"><strong>Course Code:</strong> ${syllabusEscapeHtml(d.course_code)}</div>
            <div class="col-md-8"><strong>Course Title:</strong> ${syllabusEscapeHtml(d.course_name)}</div>
            <div class="col-md-4"><strong>TPC:</strong> ${d.theory}-${d.practical}-${d.credits}</div>
            <div class="col-md-4"><strong>Syllabus Version:</strong> ${Number(d.syllabus_version).toFixed(2)}</div>
            <div class="col-md-4"><strong>Course Type:</strong> ${syllabusEscapeHtml(d.course_type || "")}</div>
            <div class="col-12"><strong>Pre-requisite(s):</strong> ${listOrNA(d.pre_requisites)}</div>
            <div class="col-12"><strong>Anti-requisite(s):</strong> ${listOrNA(d.anti_requisites)}</div>
            <div class="col-12"><strong>Co-requisite(s):</strong> ${listOrNA(d.co_requisites)}</div>
            <div class="col-12"><strong>Course Equivalence:</strong> ${listOrNA(d.course_equivalence)}</div>
            <div class="col-md-3"><strong>OCNE:</strong> ${d.ocne ? "Yes" : "No"}</div>
            <div class="col-md-3"><strong>PBL:</strong> ${d.pbl ? "Yes" : "No"}</div>
          </div>
        </div>
      </div>`;
  } catch (err) {
    console.error(err);
    details.innerHTML = '<div class="alert alert-danger mb-0">Failed to fetch syllabus details.</div>';
  }
}

async function stuSylDownload() {
  const btn = document.getElementById("stu-syl-download-btn");
  const id = btn.dataset.syllabusId;
  if (!id) return;
  await downloadSyllabusFile(id, "pdf");
}
