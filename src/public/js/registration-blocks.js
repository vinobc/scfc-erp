// Admin "Registration Blocks" page — manage students blocked from course registration.

(function () {
  let isInitialized = false;
  let fileInput, fileInfo, uploadBtn;

  document.addEventListener("DOMContentLoaded", () => {
    const link = document.getElementById("registration-blocks-link");
    if (link) {
      link.addEventListener("click", () => {
        initializeRegistrationBlocks();
        loadBlocks();
      });
    }
  });

  function initializeRegistrationBlocks() {
    if (isInitialized) return;
    isInitialized = true;

    const addBtn = document.getElementById("add-block-btn");
    if (addBtn) addBtn.addEventListener("click", handleAddBlock);

    const search = document.getElementById("block-search-input");
    if (search) {
      let timer;
      search.addEventListener("input", () => {
        clearTimeout(timer);
        timer = setTimeout(() => loadBlocks(search.value.trim()), 250);
      });
    }

    fileInput = document.getElementById("block-file-input");
    fileInfo = document.getElementById("block-file-info");
    uploadBtn = document.getElementById("upload-blocks-btn");

    if (fileInput) {
      fileInput.addEventListener("change", () => {
        if (fileInput.files && fileInput.files[0]) {
          if (fileInfo) fileInfo.textContent = fileInput.files[0].name;
          if (uploadBtn) uploadBtn.disabled = false;
        } else {
          if (fileInfo) fileInfo.textContent = "";
          if (uploadBtn) uploadBtn.disabled = true;
        }
      });
    }
    if (uploadBtn) uploadBtn.addEventListener("click", handleUpload);
  }

  function authHeaders(extra = {}) {
    return {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      ...extra,
    };
  }

  async function loadBlocks(search = "") {
    const tbody = document.getElementById("blocks-table");
    if (!tbody) return;
    tbody.innerHTML =
      '<tr><td colspan="7" class="text-center">Loading...</td></tr>';
    try {
      const url = search
        ? `${window.API_URL}/registration-blocks?search=${encodeURIComponent(search)}`
        : `${window.API_URL}/registration-blocks`;
      const resp = await fetch(url, { headers: authHeaders() });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const rows = await resp.json();
      renderBlocks(rows);
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Failed to load: ${err.message}</td></tr>`;
    }
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(
      /[<>&"']/g,
      (c) =>
        ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" }[c])
    );
  }

  function renderBlocks(rows) {
    const tbody = document.getElementById("blocks-table");
    if (!tbody) return;
    if (!rows || rows.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="7" class="text-center">No students currently blocked.</td></tr>';
      return;
    }
    tbody.innerHTML = rows
      .map((r) => {
        const blockedAt = r.blocked_at ? new Date(r.blocked_at).toLocaleString() : "";
        return `
          <tr>
            <td>${escapeHtml(r.enrollment_no)}</td>
            <td>${escapeHtml(r.student_name)}</td>
            <td>${escapeHtml(r.program_name)}</td>
            <td>${escapeHtml(r.block_reason)}</td>
            <td>${escapeHtml(r.notes || "")}</td>
            <td><small>${escapeHtml(r.blocked_by_username || "")}<br>${escapeHtml(blockedAt)}</small></td>
            <td>
              <button class="btn btn-sm btn-success unblock-btn"
                      data-enrollment="${escapeHtml(r.enrollment_no)}">
                Unblock
              </button>
            </td>
          </tr>`;
      })
      .join("");

    tbody.querySelectorAll(".unblock-btn").forEach((btn) => {
      btn.addEventListener("click", () =>
        handleUnblock(btn.getAttribute("data-enrollment"))
      );
    });
  }

  async function handleAddBlock() {
    const enr = prompt("Enrollment number to block:");
    if (enr === null) return;
    const reason =
      prompt("Reason for block (optional — e.g. Pending tuition fees):") || "";
    const notes = prompt("Notes (optional, leave blank to skip):") || "";

    try {
      const resp = await fetch(`${window.API_URL}/registration-blocks`, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          enrollment_no: enr.trim(),
          block_reason: reason.trim() || null,
          notes: notes.trim() || null,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message || `HTTP ${resp.status}`);
      alert(`✅ Blocked ${enr.trim()}`);
      loadBlocks();
    } catch (err) {
      alert(`❌ ${err.message}`);
    }
  }

  async function handleUnblock(enrollmentNo) {
    if (!confirm(`Unblock student ${enrollmentNo}?`)) return;
    try {
      const resp = await fetch(
        `${window.API_URL}/registration-blocks/${encodeURIComponent(enrollmentNo)}/unblock`,
        { method: "PUT", headers: authHeaders() }
      );
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message || `HTTP ${resp.status}`);
      alert(`✅ ${data.message}`);
      loadBlocks();
    } catch (err) {
      alert(`❌ ${err.message}`);
    }
  }

  async function handleUpload() {
    if (!fileInput || !fileInput.files || !fileInput.files[0]) return;
    const formData = new FormData();
    formData.append("file", fileInput.files[0]);

    if (uploadBtn) {
      uploadBtn.disabled = true;
      uploadBtn.textContent = "Uploading...";
    }

    try {
      const resp = await fetch(`${window.API_URL}/registration-blocks/import`, {
        method: "POST",
        headers: authHeaders(),
        body: formData,
      });
      const data = await resp.json();
      const r = data.results || {};
      let msg = data.message || "Upload complete";
      if (r.errors && r.errors.length > 0) {
        const firstErrors = r.errors
          .slice(0, 5)
          .map((e) => `Row ${e.row}: ${e.message}`)
          .join("\n");
        const more =
          r.errors.length > 5 ? `\n…and ${r.errors.length - 5} more` : "";
        msg += `\n\nErrors:\n${firstErrors}${more}`;
      }
      alert(msg);
      if (resp.ok) {
        fileInput.value = "";
        if (fileInfo) fileInfo.textContent = "";
        loadBlocks();
      }
    } catch (err) {
      alert(`❌ ${err.message}`);
    } finally {
      if (uploadBtn) {
        uploadBtn.disabled = true;
        uploadBtn.textContent = "Upload";
      }
    }
  }
})();
