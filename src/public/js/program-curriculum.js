// Program Curriculum admin page: cascading School/Program dropdowns, upload form,
// and existing-curricula table with per-row delete + Excel download.

let __curriculumProgramsCache = null;
let __curriculumInitialized = false;

function initializeProgramCurriculum() {
  if (!__curriculumInitialized) {
    __curriculumInitialized = true;
    wireCurriculumEvents();
    populateCurriculumYears();
  }
  loadCurriculumSchools();
  loadCurriculumPrograms();
  loadCurriculumList();
}

function curriculumHeaders() {
  return { "x-access-token": localStorage.getItem("token") };
}

function populateCurriculumYears() {
  const sel = document.getElementById("curr-year");
  if (!sel) return;
  sel.innerHTML = "";
  const now = new Date().getFullYear();
  // Reasonable spread: 10 years back, 5 years forward.
  for (let y = now + 5; y >= now - 10; y--) {
    const opt = document.createElement("option");
    opt.value = String(y);
    opt.textContent = String(y);
    if (y === now) opt.selected = true;
    sel.appendChild(opt);
  }
}

async function loadCurriculumSchools() {
  const sel = document.getElementById("curr-school");
  if (!sel) return;
  try {
    const res = await fetch(`${window.API_URL}/schools`, { headers: curriculumHeaders() });
    if (!res.ok) throw new Error("Failed to load schools");
    const schools = await res.json();
    sel.innerHTML = '<option value="">Select school</option>';
    schools.forEach((s) => {
      const opt = document.createElement("option");
      opt.value = s.school_id;
      opt.textContent = `${s.school_short_name} - ${s.school_long_name}`;
      sel.appendChild(opt);
    });
  } catch (err) {
    console.error(err);
    if (typeof showAlert === "function") showAlert("Failed to load schools", "danger");
  }
}

async function loadCurriculumPrograms() {
  try {
    const res = await fetch(`${window.API_URL}/programs`, { headers: curriculumHeaders() });
    if (!res.ok) throw new Error("Failed to load programs");
    __curriculumProgramsCache = await res.json();
  } catch (err) {
    console.error(err);
    if (typeof showAlert === "function") showAlert("Failed to load programs", "danger");
  }
}

function filterCurriculumProgramsForSchool(schoolId) {
  const sel = document.getElementById("curr-program");
  if (!sel) return;
  if (!schoolId || !__curriculumProgramsCache) {
    sel.innerHTML = '<option value="">Select school first</option>';
    sel.disabled = true;
    return;
  }
  const filtered = __curriculumProgramsCache.filter((p) => String(p.school_id) === String(schoolId));
  sel.innerHTML = '<option value="">Select program</option>';
  filtered.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.program_id;
    opt.textContent = `${p.program_name_short || p.program_code} - ${p.program_name_long || ""}`;
    sel.appendChild(opt);
  });
  sel.disabled = filtered.length === 0;
}

async function loadCurriculumList() {
  const tbody = document.getElementById("curriculum-table-body");
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Loading&hellip;</td></tr>';
  try {
    const res = await fetch(`${window.API_URL}/program-curriculum`, { headers: curriculumHeaders() });
    if (!res.ok) throw new Error("Failed to load curricula");
    const rows = await res.json();
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No curricula uploaded yet.</td></tr>';
      return;
    }
    tbody.innerHTML = "";
    rows.forEach((r) => {
      const tr = document.createElement("tr");
      const uploaded = r.uploaded_at ? new Date(r.uploaded_at).toLocaleDateString() : "";
      tr.innerHTML = `
        <td>${escapeHtml(r.school_short_name || "")}</td>
        <td>${escapeHtml(r.program_name_short || r.program_code || "")}</td>
        <td>${r.admitted_year}</td>
        <td>${Number(r.curriculum_version).toFixed(2)}</td>
        <td>${uploaded}</td>
        <td>
          <a class="btn btn-sm btn-outline-primary me-1" href="${window.API_URL}/program-curriculum/${r.id}/download/pdf" data-token-download="pdf" data-id="${r.id}">PDF</a>
          <a class="btn btn-sm btn-outline-secondary me-1" href="${window.API_URL}/program-curriculum/${r.id}/download/excel" data-token-download="excel" data-id="${r.id}">Excel</a>
          <button class="btn btn-sm btn-outline-danger" data-delete-curriculum="${r.id}">Delete</button>
        </td>`;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Failed to load.</td></tr>';
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

// Downloads via anchor tag don't send x-access-token header; use fetch + blob instead.
async function downloadCurriculumFile(id, kind) {
  try {
    const res = await fetch(`${window.API_URL}/program-curriculum/${id}/download/${kind}`, {
      headers: curriculumHeaders(),
    });
    if (!res.ok) {
      const msg = (await res.json().catch(() => ({}))).message || "Download failed";
      if (typeof showAlert === "function") showAlert(msg, "danger");
      return;
    }
    const blob = await res.blob();
    const disposition = res.headers.get("Content-Disposition") || "";
    const match = /filename="?([^";]+)"?/.exec(disposition);
    const filename = match ? match[1] : `curriculum_${id}.${kind === "pdf" ? "pdf" : "xlsx"}`;
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

function wireCurriculumEvents() {
  const schoolSel = document.getElementById("curr-school");
  if (schoolSel) {
    schoolSel.addEventListener("change", (e) => filterCurriculumProgramsForSchool(e.target.value));
  }

  const form = document.getElementById("curriculum-upload-form");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = document.getElementById("curr-upload-btn");
      const school_id = document.getElementById("curr-school").value;
      const program_id = document.getElementById("curr-program").value;
      const admitted_year = document.getElementById("curr-year").value;
      const curriculum_version = document.getElementById("curr-version").value.trim();
      const pdfFile = document.getElementById("curr-pdf").files[0];
      const excelFile = document.getElementById("curr-excel").files[0];

      if (!school_id || !program_id || !admitted_year || !curriculum_version || !pdfFile || !excelFile) {
        if (typeof showAlert === "function") showAlert("Please fill all fields and pick both files.", "warning");
        return;
      }
      if (!/^\d+\.\d{2}$/.test(curriculum_version)) {
        if (typeof showAlert === "function") showAlert("Version must be in x.xx format (e.g., 1.00)", "warning");
        return;
      }

      const fd = new FormData();
      fd.append("school_id", school_id);
      fd.append("program_id", program_id);
      fd.append("admitted_year", admitted_year);
      fd.append("curriculum_version", curriculum_version);
      fd.append("pdf", pdfFile);
      fd.append("excel", excelFile);

      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Uploading&hellip;';
      try {
        const res = await fetch(`${window.API_URL}/program-curriculum/upload`, {
          method: "POST",
          headers: curriculumHeaders(),
          body: fd,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (typeof showAlert === "function") showAlert(data.message || "Upload failed", "danger");
          return;
        }
        if (typeof showAlert === "function") showAlert("Curriculum uploaded successfully.", "success");
        form.reset();
        document.getElementById("curr-program").innerHTML = '<option value="">Select school first</option>';
        document.getElementById("curr-program").disabled = true;
        populateCurriculumYears();
        loadCurriculumList();
      } catch (err) {
        console.error(err);
        if (typeof showAlert === "function") showAlert("Upload failed", "danger");
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-upload me-1"></i> Upload';
      }
    });
  }

  const tbody = document.getElementById("curriculum-table-body");
  if (tbody) {
    tbody.addEventListener("click", async (e) => {
      const delBtn = e.target.closest("[data-delete-curriculum]");
      if (delBtn) {
        const id = delBtn.getAttribute("data-delete-curriculum");
        if (!confirm("Delete this curriculum? Both PDF and Excel files will be removed permanently.")) return;
        try {
          const res = await fetch(`${window.API_URL}/program-curriculum/${id}`, {
            method: "DELETE",
            headers: curriculumHeaders(),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            if (typeof showAlert === "function") showAlert(data.message || "Delete failed", "danger");
            return;
          }
          if (typeof showAlert === "function") showAlert("Curriculum deleted.", "success");
          loadCurriculumList();
        } catch (err) {
          console.error(err);
          if (typeof showAlert === "function") showAlert("Delete failed", "danger");
        }
        return;
      }
      const dlLink = e.target.closest("[data-token-download]");
      if (dlLink) {
        e.preventDefault();
        const id = dlLink.getAttribute("data-id");
        const kind = dlLink.getAttribute("data-token-download");
        downloadCurriculumFile(id, kind);
      }
    });
  }
}

// ---------- Student Portal ("My Curriculum") ----------
let __studentCurriculumList = null;
let __studentCurriculumWired = false;

async function initializeStudentCurriculum() {
  const schoolSel = document.getElementById("stu-curr-school");
  if (!schoolSel) return;

  if (!__studentCurriculumWired) {
    __studentCurriculumWired = true;
    schoolSel.addEventListener("change", (e) => stuCurrPopulatePrograms(e.target.value));
    document.getElementById("stu-curr-program").addEventListener("change", (e) => stuCurrPopulateYears(e.target.value));
    document.getElementById("stu-curr-year").addEventListener("change", (e) => stuCurrPopulateVersions(e.target.value));
    document.getElementById("stu-curr-version").addEventListener("change", (e) => {
      document.getElementById("stu-curr-btn").disabled = !e.target.value;
    });
    document.getElementById("stu-curr-btn").addEventListener("click", stuCurrDownload);
  }

  try {
    const res = await fetch(`${window.API_URL}/program-curriculum`, {
      headers: { "x-access-token": localStorage.getItem("token") },
    });
    if (!res.ok) throw new Error("Failed to load curricula");
    __studentCurriculumList = await res.json();
  } catch (err) {
    console.error(err);
    __studentCurriculumList = [];
  }

  const schools = new Map();
  __studentCurriculumList.forEach((r) => {
    if (!schools.has(r.school_id)) schools.set(r.school_id, r.school_short_name || String(r.school_id));
  });
  schoolSel.innerHTML = '<option value="">Select school</option>';
  [...schools.entries()].sort((a, b) => a[1].localeCompare(b[1])).forEach(([id, name]) => {
    const opt = document.createElement("option");
    opt.value = String(id);
    opt.textContent = name;
    schoolSel.appendChild(opt);
  });
}

function stuCurrPopulatePrograms(schoolId) {
  const programSel = document.getElementById("stu-curr-program");
  const yearSel = document.getElementById("stu-curr-year");
  const verSel = document.getElementById("stu-curr-version");
  const btn = document.getElementById("stu-curr-btn");
  programSel.innerHTML = '<option value="">Select program</option>';
  yearSel.innerHTML = '<option value="">-</option>';
  verSel.innerHTML = '<option value="">-</option>';
  yearSel.disabled = true;
  verSel.disabled = true;
  btn.disabled = true;
  if (!schoolId || !__studentCurriculumList) {
    programSel.disabled = true;
    return;
  }
  const programs = new Map();
  __studentCurriculumList
    .filter((r) => String(r.school_id) === String(schoolId))
    .forEach((r) => {
      if (!programs.has(r.program_id)) programs.set(r.program_id, r.program_name_short || r.program_code || String(r.program_id));
    });
  [...programs.entries()].sort((a, b) => a[1].localeCompare(b[1])).forEach(([id, name]) => {
    const opt = document.createElement("option");
    opt.value = String(id);
    opt.textContent = name;
    programSel.appendChild(opt);
  });
  programSel.disabled = programs.size === 0;
}

function stuCurrPopulateYears(programId) {
  const yearSel = document.getElementById("stu-curr-year");
  const verSel = document.getElementById("stu-curr-version");
  const btn = document.getElementById("stu-curr-btn");
  yearSel.innerHTML = '<option value="">Select year</option>';
  verSel.innerHTML = '<option value="">-</option>';
  verSel.disabled = true;
  btn.disabled = true;
  if (!programId) {
    yearSel.disabled = true;
    return;
  }
  const years = new Set(
    __studentCurriculumList
      .filter((r) => String(r.program_id) === String(programId))
      .map((r) => r.admitted_year)
  );
  [...years].sort((a, b) => b - a).forEach((y) => {
    const opt = document.createElement("option");
    opt.value = String(y);
    opt.textContent = String(y);
    yearSel.appendChild(opt);
  });
  yearSel.disabled = years.size === 0;
}

function stuCurrPopulateVersions(year) {
  const programId = document.getElementById("stu-curr-program").value;
  const verSel = document.getElementById("stu-curr-version");
  const btn = document.getElementById("stu-curr-btn");
  verSel.innerHTML = '<option value="">Select version</option>';
  btn.disabled = true;
  if (!year || !programId) {
    verSel.disabled = true;
    return;
  }
  const versions = __studentCurriculumList
    .filter((r) => String(r.program_id) === String(programId) && String(r.admitted_year) === String(year))
    .sort((a, b) => Number(b.curriculum_version) - Number(a.curriculum_version));
  versions.forEach((r) => {
    const opt = document.createElement("option");
    opt.value = String(r.id);
    opt.textContent = Number(r.curriculum_version).toFixed(2);
    verSel.appendChild(opt);
  });
  verSel.disabled = versions.length === 0;
}

async function stuCurrDownload() {
  const id = document.getElementById("stu-curr-version").value;
  if (!id) return;
  const status = document.getElementById("stu-curr-status");
  try {
    status.innerHTML = '<div class="text-info"><i class="fas fa-spinner fa-spin me-1"></i>Preparing download&hellip;</div>';
    const res = await fetch(`${window.API_URL}/program-curriculum/${id}/download/pdf`, {
      headers: { "x-access-token": localStorage.getItem("token") },
    });
    if (!res.ok) {
      const msg = (await res.json().catch(() => ({}))).message || "Download failed";
      status.innerHTML = `<div class="text-danger">${msg}</div>`;
      return;
    }
    const blob = await res.blob();
    const disposition = res.headers.get("Content-Disposition") || "";
    const match = /filename="?([^";]+)"?/.exec(disposition);
    const filename = match ? match[1] : `curriculum_${id}.pdf`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    status.innerHTML = '<div class="text-success"><i class="fas fa-check me-1"></i>Download started.</div>';
  } catch (err) {
    console.error(err);
    status.innerHTML = '<div class="text-danger">Download failed</div>';
  }
}
