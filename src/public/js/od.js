// OD (On Duty) Management Module
// Handles both DSW event creation and faculty coordinator activity management

let odCurrentView = "list"; // list, event-details
let odCurrentEventId = null;
let odCurrentActivityId = null;

// Entry point - called when OD page is navigated to
function initializeOD() {
  const odContent = document.getElementById("od-content");
  if (!odContent) return;

  // currentUser is set by main.js from /api/auth/me response
  const userRole = (currentUser && currentUser.role) || "";
  const isDSW = currentUser && currentUser.username === "316690@blr.amity.edu";

  if (userRole === "admin" || isDSW) {
    showDSWInterface();
  } else if (userRole === "faculty" || userRole === "staff" || userRole === "timetable_coordinator") {
    showCoordinatorInterface();
  } else {
    odContent.innerHTML = '<div class="alert alert-warning">You do not have access to OD Management.</div>';
  }
}

// Make available globally
window.initializeOD = initializeOD;

// ==================== DSW Interface ====================

function showDSWInterface() {
  const odContent = document.getElementById("od-content");

  odContent.innerHTML = `
    <div class="container-fluid">
      <h4 class="mb-4">OD Management (DSW)</h4>

      <!-- Create Event Form -->
      <div class="card mb-4">
        <div class="card-header bg-primary text-white">
          <h6 class="mb-0">Create New Event</h6>
        </div>
        <div class="card-body">
          <div class="row g-3">
            <div class="col-md-3">
              <label for="od-slot-year" class="form-label">Academic Year</label>
              <select id="od-slot-year" class="form-select">
                <option value="">Select Year</option>
              </select>
            </div>
            <div class="col-md-3">
              <label for="od-semester" class="form-label">Semester</label>
              <select id="od-semester" class="form-select">
                <option value="">Select Semester</option>
                <option value="FALL">Fall</option>
                <option value="WINTER">Winter</option>
                <option value="SUMMER">Summer</option>
              </select>
            </div>
            <div class="col-md-6">
              <label for="od-event-name" class="form-label">Event Name</label>
              <input type="text" id="od-event-name" class="form-control" placeholder="Enter event name">
            </div>
            <div class="col-md-6 position-relative">
              <label for="od-coordinator-search" class="form-label">Faculty Coordinator</label>
              <input type="text" id="od-coordinator-search" class="form-control" placeholder="Start typing faculty name or employee ID..." autocomplete="off">
              <div id="od-coordinator-dropdown" class="list-group position-absolute w-100" style="z-index: 1000; display: none; max-height: 200px; overflow-y: auto;"></div>
              <input type="hidden" id="od-coordinator-id">
              <small id="od-coordinator-selected" class="text-success d-none"></small>
            </div>
            <div class="col-md-6 d-flex align-items-end">
              <button class="btn btn-primary" onclick="createODEvent()">
                <i class="fas fa-plus me-2"></i>Create Event
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Events List -->
      <div class="card">
        <div class="card-header bg-light d-flex justify-content-between align-items-center">
          <h6 class="mb-0">Events</h6>
          <div>
            <select id="od-filter-year" class="form-select form-select-sm d-inline-block" style="width: auto;" onchange="loadODEvents()">
              <option value="">All Years</option>
            </select>
            <select id="od-filter-semester" class="form-select form-select-sm d-inline-block ms-2" style="width: auto;" onchange="loadODEvents()">
              <option value="">All Semesters</option>
              <option value="FALL">Fall</option>
              <option value="WINTER">Winter</option>
              <option value="SUMMER">Summer</option>
            </select>
          </div>
        </div>
        <div class="card-body">
          <div id="od-events-list">
            <div class="text-center py-3">
              <div class="spinner-border text-primary" role="status"></div>
              <p class="mt-2">Loading events...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  populateODAcademicYears();
  setupCoordinatorAutocomplete();
  loadODEvents();
}

function populateODAcademicYears() {
  const currentYear = new Date().getFullYear();
  const startYear = currentYear - 2;
  const endYear = currentYear + 2;

  const options = [];
  for (let year = endYear; year >= startYear; year--) {
    const nextYear = (year + 1).toString().slice(-2);
    options.push(`<option value="${year}-${nextYear}">${year}-${nextYear}</option>`);
  }

  const yearSelect = document.getElementById("od-slot-year");
  if (yearSelect) yearSelect.innerHTML = '<option value="">Select Year</option>' + options.join("");

  const filterYear = document.getElementById("od-filter-year");
  if (filterYear) filterYear.innerHTML = '<option value="">All Years</option>' + options.join("");
}

function setupCoordinatorAutocomplete() {
  const searchInput = document.getElementById("od-coordinator-search");
  const dropdown = document.getElementById("od-coordinator-dropdown");
  const hiddenId = document.getElementById("od-coordinator-id");
  const selectedText = document.getElementById("od-coordinator-selected");
  let debounceTimer;

  if (!searchInput) return;

  searchInput.addEventListener("input", function () {
    clearTimeout(debounceTimer);
    const query = this.value.trim();

    // Clear selection when typing
    hiddenId.value = "";
    selectedText.classList.add("d-none");

    if (query.length < 2) {
      dropdown.style.display = "none";
      return;
    }

    debounceTimer = setTimeout(async () => {
      try {
        const response = await fetch(
          `${window.API_URL}/od/faculty-search?q=${encodeURIComponent(query)}`,
          { headers: { "x-access-token": localStorage.getItem("token") } }
        );
        const data = await response.json();

        if (!data.faculty || data.faculty.length === 0) {
          dropdown.innerHTML = '<div class="list-group-item text-muted">No results found</div>';
          dropdown.style.display = "block";
          return;
        }

        dropdown.innerHTML = data.faculty
          .map(
            (f) => `
          <button type="button" class="list-group-item list-group-item-action"
                  onclick="selectCoordinator(${f.employee_id}, '${f.name.replace(/'/g, "\\'")}', '${f.school_short_name || ""}')">
            <strong>${f.name}</strong>
            <span class="text-muted ms-2">${f.school_short_name || ""} - ${f.employee_id}</span>
          </button>
        `
          )
          .join("");
        dropdown.style.display = "block";
      } catch (error) {
        console.error("Faculty search error:", error);
        dropdown.style.display = "none";
      }
    }, 300);
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", function (e) {
    if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.style.display = "none";
    }
  });
}

function selectCoordinator(employeeId, name, school) {
  document.getElementById("od-coordinator-search").value = `${name} (${school}) - ${employeeId}`;
  document.getElementById("od-coordinator-id").value = employeeId;
  document.getElementById("od-coordinator-dropdown").style.display = "none";

  const selectedText = document.getElementById("od-coordinator-selected");
  selectedText.textContent = `Selected: ${name} (${employeeId})`;
  selectedText.classList.remove("d-none");
}

async function createODEvent() {
  const slotYear = document.getElementById("od-slot-year").value;
  const semester = document.getElementById("od-semester").value;
  const eventName = document.getElementById("od-event-name").value.trim();
  const coordinatorId = document.getElementById("od-coordinator-id").value;

  if (!slotYear || !semester || !eventName || !coordinatorId) {
    showODAlert("Please fill in all fields and select a faculty coordinator", "warning");
    return;
  }

  try {
    const response = await fetch(`${window.API_URL}/od/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": localStorage.getItem("token"),
      },
      body: JSON.stringify({
        event_name: eventName,
        slot_year: slotYear,
        semester_type: semester,
        coordinator_employee_id: parseInt(coordinatorId),
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message);

    showODAlert("Event created successfully!", "success");
    // Clear form
    document.getElementById("od-event-name").value = "";
    document.getElementById("od-coordinator-search").value = "";
    document.getElementById("od-coordinator-id").value = "";
    document.getElementById("od-coordinator-selected").classList.add("d-none");
    loadODEvents();
  } catch (error) {
    showODAlert(error.message || "Error creating event", "danger");
  }
}

async function loadODEvents() {
  const listContainer = document.getElementById("od-events-list");
  if (!listContainer) return;

  const filterYear = document.getElementById("od-filter-year");
  const filterSemester = document.getElementById("od-filter-semester");

  const params = new URLSearchParams();
  if (filterYear && filterYear.value) params.set("slot_year", filterYear.value);
  if (filterSemester && filterSemester.value) params.set("semester_type", filterSemester.value);

  try {
    const response = await fetch(`${window.API_URL}/od/events?${params}`, {
      headers: { "x-access-token": localStorage.getItem("token") },
    });
    const data = await response.json();

    if (!data.events || data.events.length === 0) {
      listContainer.innerHTML = '<div class="text-center text-muted py-3">No events found</div>';
      return;
    }

    let html = `
      <div class="table-responsive">
        <table class="table table-bordered table-hover">
          <thead class="table-light">
            <tr>
              <th>Event Name</th>
              <th>Academic Year</th>
              <th>Semester</th>
              <th>Faculty Coordinator</th>
              <th>Activities</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
    `;

    data.events.forEach((event) => {
      html += `
        <tr>
          <td>${event.event_name}</td>
          <td>${event.slot_year}</td>
          <td>${event.semester_type}</td>
          <td>${event.coordinator_name} ${event.coordinator_school ? "(" + event.coordinator_school + ")" : ""}</td>
          <td>${event.activity_count || 0}</td>
          <td>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteODEvent(${event.event_id}, '${event.event_name.replace(/'/g, "\\'")}')">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
    });

    html += "</tbody></table></div>";
    listContainer.innerHTML = html;
  } catch (error) {
    listContainer.innerHTML = '<div class="alert alert-danger">Error loading events</div>';
  }
}

async function deleteODEvent(eventId, eventName) {
  if (!confirm(`Are you sure you want to delete "${eventName}"? This will also delete all activities and OD records.`)) return;

  try {
    const response = await fetch(`${window.API_URL}/od/events/${eventId}`, {
      method: "DELETE",
      headers: { "x-access-token": localStorage.getItem("token") },
    });

    if (!response.ok) throw new Error("Failed to delete event");
    showODAlert("Event deleted successfully", "success");
    loadODEvents();
  } catch (error) {
    showODAlert(error.message || "Error deleting event", "danger");
  }
}

// ==================== Faculty Coordinator Interface ====================

function showCoordinatorInterface() {
  const odContent = document.getElementById("od-content");

  odContent.innerHTML = `
    <div class="container-fluid">
      <h4 class="mb-4">OD Management</h4>
      <div id="od-coordinator-content">
        <div class="text-center py-3">
          <div class="spinner-border text-primary" role="status"></div>
          <p class="mt-2">Loading your events...</p>
        </div>
      </div>
    </div>
  `;

  loadCoordinatorEvents();
}

async function loadCoordinatorEvents() {
  const container = document.getElementById("od-coordinator-content");
  if (!container) return;

  try {
    const response = await fetch(`${window.API_URL}/od/events`, {
      headers: { "x-access-token": localStorage.getItem("token") },
    });
    const data = await response.json();

    if (!data.events || data.events.length === 0) {
      container.innerHTML = `
        <div class="alert alert-info text-center">
          <i class="fas fa-info-circle me-2"></i>
          No events assigned to you. Events are created by the DSW (Director of Student Welfare).
        </div>
      `;
      return;
    }

    let html = '<div class="row">';
    data.events.forEach((event) => {
      html += `
        <div class="col-md-6 mb-3">
          <div class="card h-100">
            <div class="card-body">
              <h5 class="card-title">${event.event_name}</h5>
              <p class="card-text text-muted">
                ${event.slot_year} | ${event.semester_type}<br>
                <small>Activities: ${event.activity_count || 0}</small>
              </p>
              <button class="btn btn-primary btn-sm" onclick="viewEventDetails(${event.event_id})">
                <i class="fas fa-folder-open me-1"></i>Manage Activities
              </button>
            </div>
          </div>
        </div>
      `;
    });
    html += "</div>";
    container.innerHTML = html;
  } catch (error) {
    container.innerHTML = '<div class="alert alert-danger">Error loading events</div>';
  }
}

// ==================== Event Details / Activity Management ====================

async function viewEventDetails(eventId) {
  odCurrentEventId = eventId;
  const odContent = document.getElementById("od-content");

  odContent.innerHTML = `
    <div class="container-fluid">
      <div class="text-center py-3">
        <div class="spinner-border text-primary" role="status"></div>
        <p class="mt-2">Loading event details...</p>
      </div>
    </div>
  `;

  try {
    const response = await fetch(`${window.API_URL}/od/events/${eventId}`, {
      headers: { "x-access-token": localStorage.getItem("token") },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message);

    const event = data.event;
    const activities = data.activities;
    const isDSW = currentUser && currentUser.username === "316690@blr.amity.edu";
    const isCoordinator = !isDSW || currentUser.role === "admin";

    let html = `
      <div class="container-fluid">
        <div class="d-flex align-items-center mb-4">
          <button class="btn btn-outline-secondary me-3" onclick="initializeOD()">
            <i class="fas fa-arrow-left me-1"></i>Back
          </button>
          <div>
            <h4 class="mb-0">${event.event_name}</h4>
            <small class="text-muted">${event.slot_year} | ${event.semester_type} | Coordinator: ${event.coordinator_name}</small>
          </div>
        </div>
    `;

    // Only coordinators (and admins) can add activities, not DSW
    if (isCoordinator) {
      html += `
        <!-- Add Activity Form -->
        <div class="card mb-4">
          <div class="card-header bg-success text-white d-flex justify-content-between align-items-center">
            <h6 class="mb-0">Add Activity</h6>
          </div>
          <div class="card-body">
            <div class="row g-3">
              <div class="col-md-4">
                <label for="od-activity-name" class="form-label">Activity Name</label>
                <input type="text" id="od-activity-name" class="form-control" placeholder="Enter activity name">
              </div>
              <div class="col-md-3">
                <label for="od-activity-date" class="form-label">Date</label>
                <input type="date" id="od-activity-date" class="form-control">
              </div>
              <div class="col-md-2">
                <label for="od-activity-start" class="form-label">Start Time</label>
                <input type="time" id="od-activity-start" class="form-control">
              </div>
              <div class="col-md-2">
                <label for="od-activity-end" class="form-label">End Time</label>
                <input type="time" id="od-activity-end" class="form-control">
              </div>
              <div class="col-md-1 d-flex align-items-end">
                <button class="btn btn-success" onclick="createODActivity(${eventId})">
                  <i class="fas fa-plus"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    html += `
        <!-- Activities List -->
        <div id="od-activities-list">
    `;

    if (!activities || activities.length === 0) {
      html += isDSW ? '<div class="alert alert-info">No activities yet.</div>' : '<div class="alert alert-info">No activities yet. Add one above.</div>';
    } else {
      activities.forEach((activity) => {
        const dateFormatted = formatODDate(activity.activity_date);
        const startFormatted = formatODTime(activity.start_time);
        const endFormatted = formatODTime(activity.end_time);

        html += `
          <div class="card mb-3" id="activity-card-${activity.activity_id}">
            <div class="card-header bg-light d-flex justify-content-between align-items-center">
              <div>
                <strong>${activity.activity_name}</strong>
                <span class="ms-3" style="color: white;">${dateFormatted} | ${startFormatted} - ${endFormatted}</span>
                <span class="badge bg-secondary ms-2">${activity.student_count || 0} students</span>
              </div>
              ${isCoordinator ? `
              <div>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="toggleActivityStudents(${activity.activity_id})">
                  <i class="fas fa-users me-1"></i>Students
                </button>
                <button class="btn btn-sm btn-outline-warning me-1" onclick="showEditActivityForm(${activity.activity_id}, '${activity.activity_name.replace(/'/g, "\\'")}', '${activity.activity_date}', '${activity.start_time}', '${activity.end_time}')">
                  <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteODActivity(${activity.activity_id}, '${activity.activity_name.replace(/'/g, "\\'")}')">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
              ` : ''}
            </div>
            <div class="card-body d-none" id="activity-students-${activity.activity_id}">
              <!-- Students loaded dynamically -->
            </div>
          </div>
        `;
      });
    }

    html += "</div></div>";
    odContent.innerHTML = html;
  } catch (error) {
    odContent.innerHTML = `
      <div class="container-fluid">
        <button class="btn btn-outline-secondary mb-3" onclick="initializeOD()">
          <i class="fas fa-arrow-left me-1"></i>Back
        </button>
        <div class="alert alert-danger">${error.message || "Error loading event details"}</div>
      </div>
    `;
  }
}

async function createODActivity(eventId) {
  const name = document.getElementById("od-activity-name").value.trim();
  const date = document.getElementById("od-activity-date").value;
  const startTime = document.getElementById("od-activity-start").value;
  const endTime = document.getElementById("od-activity-end").value;

  if (!name || !date || !startTime || !endTime) {
    showODAlert("Please fill in all activity fields", "warning");
    return;
  }

  if (startTime >= endTime) {
    showODAlert("End time must be after start time", "warning");
    return;
  }

  try {
    const response = await fetch(`${window.API_URL}/od/events/${eventId}/activities`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": localStorage.getItem("token"),
      },
      body: JSON.stringify({
        activity_name: name,
        activity_date: date,
        start_time: startTime,
        end_time: endTime,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message);

    showODAlert("Activity created successfully!", "success");
    viewEventDetails(eventId); // Reload
  } catch (error) {
    showODAlert(error.message || "Error creating activity", "danger");
  }
}

function showEditActivityForm(activityId, name, date, startTime, endTime) {
  // Parse date to YYYY-MM-DD format for input
  const dateForInput = date.substring(0, 10);
  // Parse time to HH:MM format for input
  const startForInput = startTime.substring(0, 5);
  const endForInput = endTime.substring(0, 5);

  const cardBody = document.querySelector(`#activity-card-${activityId} .card-body`);
  cardBody.classList.remove("d-none");
  cardBody.innerHTML = `
    <div class="row g-3">
      <div class="col-md-4">
        <label class="form-label">Activity Name</label>
        <input type="text" id="edit-activity-name-${activityId}" class="form-control" value="${name}">
      </div>
      <div class="col-md-3">
        <label class="form-label">Date</label>
        <input type="date" id="edit-activity-date-${activityId}" class="form-control" value="${dateForInput}">
      </div>
      <div class="col-md-2">
        <label class="form-label">Start Time</label>
        <input type="time" id="edit-activity-start-${activityId}" class="form-control" value="${startForInput}">
      </div>
      <div class="col-md-2">
        <label class="form-label">End Time</label>
        <input type="time" id="edit-activity-end-${activityId}" class="form-control" value="${endForInput}">
      </div>
      <div class="col-md-1 d-flex align-items-end">
        <button class="btn btn-warning btn-sm me-1" onclick="updateODActivity(${activityId})">
          <i class="fas fa-save"></i>
        </button>
        <button class="btn btn-secondary btn-sm" onclick="viewEventDetails(${odCurrentEventId})">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>
  `;
}

async function updateODActivity(activityId) {
  const name = document.getElementById(`edit-activity-name-${activityId}`).value.trim();
  const date = document.getElementById(`edit-activity-date-${activityId}`).value;
  const startTime = document.getElementById(`edit-activity-start-${activityId}`).value;
  const endTime = document.getElementById(`edit-activity-end-${activityId}`).value;

  if (!name || !date || !startTime || !endTime) {
    showODAlert("Please fill in all fields", "warning");
    return;
  }

  try {
    const response = await fetch(`${window.API_URL}/od/activities/${activityId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": localStorage.getItem("token"),
      },
      body: JSON.stringify({
        activity_name: name,
        activity_date: date,
        start_time: startTime,
        end_time: endTime,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message);

    showODAlert("Activity updated and OD records recalculated", "success");
    viewEventDetails(odCurrentEventId);
  } catch (error) {
    showODAlert(error.message || "Error updating activity", "danger");
  }
}

async function deleteODActivity(activityId, name) {
  if (!confirm(`Delete activity "${name}"? This will remove all OD attendance records for this activity.`)) return;

  try {
    const response = await fetch(`${window.API_URL}/od/activities/${activityId}`, {
      method: "DELETE",
      headers: { "x-access-token": localStorage.getItem("token") },
    });

    if (!response.ok) throw new Error("Failed to delete activity");
    showODAlert("Activity deleted successfully", "success");
    viewEventDetails(odCurrentEventId);
  } catch (error) {
    showODAlert(error.message || "Error deleting activity", "danger");
  }
}

// ==================== Student Management within Activities ====================

async function toggleActivityStudents(activityId) {
  const container = document.getElementById(`activity-students-${activityId}`);
  if (!container) return;

  if (container.classList.contains("d-none")) {
    container.classList.remove("d-none");
    odCurrentActivityId = activityId;
    await loadActivityStudents(activityId);
  } else {
    container.classList.add("d-none");
  }
}

async function loadActivityStudents(activityId) {
  const container = document.getElementById(`activity-students-${activityId}`);
  if (!container) return;

  container.innerHTML = `
    <div class="text-center py-2">
      <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
      <span class="ms-2">Loading students...</span>
    </div>
  `;

  try {
    const response = await fetch(`${window.API_URL}/od/activities/${activityId}/students`, {
      headers: { "x-access-token": localStorage.getItem("token") },
    });
    const data = await response.json();

    let html = `
      <!-- Add Student -->
      <div class="row g-2 mb-2 align-items-end">
        <div class="col-md-3">
          <label class="form-label">Enrollment Number</label>
          <input type="text" id="od-add-student-${activityId}" class="form-control form-control-sm"
                 placeholder="Enter enrollment no." onkeypress="if(event.key==='Enter') lookupAndAddStudent(${activityId})">
        </div>
        <div class="col-md-5" id="od-student-preview-${activityId}"></div>
        <div class="col-md-2">
          <button class="btn btn-sm btn-outline-primary" onclick="lookupAndAddStudent(${activityId})">
            <i class="fas fa-search me-1"></i>Lookup
          </button>
        </div>
        <div class="col-md-2">
          <button class="btn btn-sm btn-success d-none" id="od-confirm-add-${activityId}" onclick="confirmAddStudent(${activityId})">
            <i class="fas fa-plus me-1"></i>Add
          </button>
        </div>
      </div>
      <div class="mb-3">
        <button class="btn btn-sm btn-outline-secondary"
          onclick="openODBulkAddModal(${activityId})"
          title="Add many students at once via paste or Excel upload">
          <i class="fas fa-users me-1"></i>Bulk Upload
        </button>
      </div>
    `;

    if (data.students && data.students.length > 0) {
      html += `
        <div class="table-responsive">
          <table class="table table-sm table-bordered">
            <thead class="table-light">
              <tr>
                <th>Sl. No.</th>
                <th>Enrollment No.</th>
                <th>Student Name</th>
                <th>School</th>
                <th>Program</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
      `;

      data.students.forEach((student, index) => {
        html += `
          <tr>
            <td>${index + 1}</td>
            <td>${student.enrollment_number}</td>
            <td>${student.student_name}</td>
            <td>${student.school_name || "-"}</td>
            <td>${student.program_name || "-"}</td>
            <td>
              <button class="btn btn-sm btn-outline-danger" onclick="removeODStudent(${activityId}, '${student.enrollment_number}', '${student.student_name.replace(/'/g, "\\'")}')">
                <i class="fas fa-minus"></i>
              </button>
            </td>
          </tr>
        `;
      });

      html += "</tbody></table></div>";
    } else {
      html += '<div class="text-muted">No students added yet.</div>';
    }

    container.innerHTML = html;
  } catch (error) {
    container.innerHTML = '<div class="alert alert-danger alert-sm">Error loading students</div>';
  }
}

async function lookupAndAddStudent(activityId) {
  const input = document.getElementById(`od-add-student-${activityId}`);
  const preview = document.getElementById(`od-student-preview-${activityId}`);
  const confirmBtn = document.getElementById(`od-confirm-add-${activityId}`);
  const enrollmentNumber = input.value.trim();

  if (!enrollmentNumber) {
    preview.innerHTML = '<span class="text-warning">Enter an enrollment number</span>';
    return;
  }

  try {
    const response = await fetch(`${window.API_URL}/od/student-lookup/${encodeURIComponent(enrollmentNumber)}`, {
      headers: { "x-access-token": localStorage.getItem("token") },
    });
    const data = await response.json();

    if (!response.ok) {
      preview.innerHTML = `<span class="text-danger">${data.message || "Student not found"}</span>`;
      confirmBtn.classList.add("d-none");
      return;
    }

    const student = data.student;
    preview.innerHTML = `
      <span class="text-success">
        <strong>${student.student_name}</strong> | ${student.school_name || "-"} | ${student.program_name || "-"}
      </span>
    `;
    confirmBtn.classList.remove("d-none");
    confirmBtn.dataset.enrollment = enrollmentNumber;
  } catch (error) {
    preview.innerHTML = '<span class="text-danger">Error looking up student</span>';
    confirmBtn.classList.add("d-none");
  }
}

async function confirmAddStudent(activityId) {
  const confirmBtn = document.getElementById(`od-confirm-add-${activityId}`);
  const enrollmentNumber = confirmBtn.dataset.enrollment;

  if (!enrollmentNumber) return;

  try {
    const response = await fetch(`${window.API_URL}/od/activities/${activityId}/students`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": localStorage.getItem("token"),
      },
      body: JSON.stringify({ enrollment_number: enrollmentNumber }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message);

    showODAlert("Student added and OD marked!", "success");
    loadActivityStudents(activityId); // Reload student list
  } catch (error) {
    showODAlert(error.message || "Error adding student", "danger");
  }
}

async function removeODStudent(activityId, enrollmentNumber, studentName) {
  if (!confirm(`Remove ${studentName} (${enrollmentNumber}) from this activity? OD records will be cleared.`)) return;

  try {
    const response = await fetch(
      `${window.API_URL}/od/activities/${activityId}/students/${encodeURIComponent(enrollmentNumber)}`,
      {
        method: "DELETE",
        headers: { "x-access-token": localStorage.getItem("token") },
      }
    );

    if (!response.ok) throw new Error("Failed to remove student");
    showODAlert("Student removed and OD records cleared", "success");
    loadActivityStudents(activityId);
  } catch (error) {
    showODAlert(error.message || "Error removing student", "danger");
  }
}

// ==================== Utility Functions ====================

function formatODDate(dateStr) {
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatODTime(timeStr) {
  const [hours, mins] = timeStr.split(":");
  const h = parseInt(hours);
  const ampm = h >= 12 ? "PM" : "AM";
  const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayHour}:${mins} ${ampm}`;
}

function showODAlert(message, type) {
  // Find or create alert container at top of od-content
  const odContent = document.getElementById("od-content");
  if (!odContent) return;

  let alertContainer = document.getElementById("od-alert-container");
  if (!alertContainer) {
    alertContainer = document.createElement("div");
    alertContainer.id = "od-alert-container";
    alertContainer.style.cssText = "position: fixed; top: 70px; right: 20px; z-index: 9999; max-width: 400px;";
    document.body.appendChild(alertContainer);
  }

  const alertDiv = document.createElement("div");
  alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
  alertDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  alertContainer.appendChild(alertDiv);

  setTimeout(() => {
    alertDiv.remove();
  }, 4000);
}

// =============================================================================
// BULK ADD STUDENTS TO AN OD ACTIVITY
// =============================================================================
// Modal-based flow:
//   1. Faculty opens the modal on a specific activity.
//   2. Pastes enrolments OR uploads Excel/CSV.
//   3. Clicks Validate → backend dry-run returns per-row status.
//   4. Faculty reviews preview → clicks Confirm Add.
//   5. Backend commits per-student; result modal shows summary + per-row detail.

let odBulkCurrentActivityId = null;
let odBulkCurrentActivity = null; // { activity_name, activity_date, start_time, end_time }
let odBulkPendingList = [];       // list of enrolments captured at Validate time

function openODBulkAddModal(activityId) {
  odBulkCurrentActivityId = activityId;
  odBulkPendingList = [];

  // Reset UI to Step 1
  document.getElementById("od-bulk-step-input").classList.remove("d-none");
  document.getElementById("od-bulk-step-preview").classList.add("d-none");
  document.getElementById("od-bulk-step-result").classList.add("d-none");
  document.getElementById("od-bulk-paste-input").value = "";
  document.getElementById("od-bulk-file-input").value = "";

  // Try to display activity context (best effort — pulled from the activity
  // header if the DOM has it; otherwise blank).
  const infoDiv = document.getElementById("od-bulk-activity-info");
  const activityCard = document.querySelector(`[data-activity-id="${activityId}"]`);
  let contextText = `Activity ID: ${activityId}`;
  if (activityCard) {
    const header = activityCard.querySelector(".activity-header")?.textContent?.trim();
    if (header) contextText = header;
  }
  infoDiv.textContent = contextText;

  const modal = new bootstrap.Modal(document.getElementById("odBulkAddModal"));
  modal.show();
}

// Parse the paste-textbox: split on comma, newline, or whitespace; trim; drop empties.
function parseODBulkPaste(text) {
  if (!text) return [];
  return text
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// Parse the uploaded Excel/CSV. Uses SheetJS (window.XLSX) — already loaded
// for other Excel features in the app. Reads first column of first sheet.
async function parseODBulkFile(file) {
  return new Promise((resolve, reject) => {
    if (!window.XLSX) {
      reject(new Error("Excel library not loaded"));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = window.XLSX.read(data, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        // Read as array of arrays so we can access column A regardless of header.
        const rows = window.XLSX.utils.sheet_to_json(firstSheet, {
          header: 1,
          raw: false,
          defval: "",
        });
        const enrolments = [];
        for (const row of rows) {
          const cell = row && row[0] !== undefined ? String(row[0]).trim() : "";
          if (cell !== "") enrolments.push(cell);
        }
        // If the first row looks like a header (doesn't match enrolment format),
        // drop it.
        if (enrolments.length > 0 && !/^A[A-Z0-9]{11,12}$/i.test(enrolments[0])) {
          enrolments.shift();
        }
        resolve(enrolments);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
}

async function validateODBulkList() {
  // Determine which tab is active — paste or file
  const pasteTabActive = document
    .getElementById("od-bulk-paste-tab")
    .classList.contains("active");

  let enrolments = [];
  try {
    if (pasteTabActive) {
      enrolments = parseODBulkPaste(document.getElementById("od-bulk-paste-input").value);
    } else {
      const fileInput = document.getElementById("od-bulk-file-input");
      if (!fileInput.files || fileInput.files.length === 0) {
        showODAlert("Please choose an Excel/CSV file first.", "warning");
        return;
      }
      enrolments = await parseODBulkFile(fileInput.files[0]);
    }
  } catch (err) {
    showODAlert("Could not read the input: " + err.message, "danger");
    return;
  }

  if (enrolments.length === 0) {
    showODAlert("No enrolment numbers found in the input.", "warning");
    return;
  }

  try {
    const response = await fetch(
      `${window.API_URL}/od/activities/${odBulkCurrentActivityId}/students/validate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-access-token": localStorage.getItem("token"),
        },
        body: JSON.stringify({ enrollment_numbers: enrolments }),
      }
    );
    const data = await response.json();
    if (!response.ok) {
      showODAlert(data.message || "Validation failed", "danger");
      return;
    }
    renderODBulkPreview(enrolments, data);
  } catch (err) {
    console.error("Validate error:", err);
    showODAlert("Server error while validating. Please try again.", "danger");
  }
}

function renderODBulkPreview(originalList, data) {
  odBulkPendingList = originalList;
  const { summary, rows } = data;

  const s = summary;
  document.getElementById("od-bulk-preview-summary").innerHTML = `
    <strong>Submitted:</strong> ${s.total_submitted}
    (${s.unique_submitted} unique) &nbsp;&nbsp;
    <span class="text-success">✓ ${s.will_add} to add</span> &nbsp;&nbsp;
    <span class="text-warning">⚠ ${s.already_in_activity} already in activity</span> &nbsp;&nbsp;
    <span class="text-danger">✗ ${s.not_found} not found</span> &nbsp;&nbsp;
    <span class="text-danger">✗ ${s.invalid_format} invalid format</span> &nbsp;&nbsp;
    <span class="text-warning">⚠ ${s.duplicate_in_list} duplicates in list</span>
  `;

  const tbody = document.getElementById("od-bulk-preview-tbody");
  tbody.innerHTML = rows
    .map((r) => {
      let statusLabel = "";
      let rowClass = "";
      switch (r.status) {
        case "will_add":
          statusLabel = '<span class="text-success">✓ Will add</span>';
          break;
        case "already_in_activity":
          statusLabel = '<span class="text-warning">⚠ Already in activity</span>';
          rowClass = "table-warning";
          break;
        case "not_found":
          statusLabel = '<span class="text-danger">✗ Not found</span>';
          rowClass = "table-danger";
          break;
        case "invalid_format":
          statusLabel = '<span class="text-danger">✗ Invalid format</span>';
          rowClass = "table-danger";
          break;
        case "duplicate_in_list":
          statusLabel = '<span class="text-warning">⚠ Duplicate in list</span>';
          rowClass = "table-warning";
          break;
        default:
          statusLabel = r.status;
      }
      return `
        <tr class="${rowClass}">
          <td>${statusLabel}</td>
          <td><code>${r.enrollment_number}</code></td>
          <td>${r.student_name || "—"}</td>
          <td>${r.program_name || "—"}</td>
          <td>${r.reason || ""}</td>
        </tr>`;
    })
    .join("");

  document.getElementById("od-bulk-step-input").classList.add("d-none");
  document.getElementById("od-bulk-step-preview").classList.remove("d-none");
  document.getElementById("od-bulk-step-result").classList.add("d-none");
}

function backToODBulkInput() {
  document.getElementById("od-bulk-step-input").classList.remove("d-none");
  document.getElementById("od-bulk-step-preview").classList.add("d-none");
}

async function confirmODBulkAdd() {
  if (!odBulkPendingList || odBulkPendingList.length === 0) {
    showODAlert("Nothing to add.", "warning");
    return;
  }

  const confirmBtn = document.getElementById("od-bulk-confirm-btn");
  confirmBtn.disabled = true;
  confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Adding...';

  try {
    const response = await fetch(
      `${window.API_URL}/od/activities/${odBulkCurrentActivityId}/students/bulk`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-access-token": localStorage.getItem("token"),
        },
        body: JSON.stringify({ enrollment_numbers: odBulkPendingList }),
      }
    );
    const data = await response.json();
    if (!response.ok) {
      showODAlert(data.message || "Bulk add failed", "danger");
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = '<i class="fas fa-check me-1"></i>Confirm Add';
      return;
    }
    renderODBulkResult(data);
    // Refresh the activity's student list on the parent page.
    if (typeof loadActivityStudents === "function") {
      loadActivityStudents(odBulkCurrentActivityId);
    }
  } catch (err) {
    console.error("Bulk add error:", err);
    showODAlert("Server error while adding students. Please try again.", "danger");
    confirmBtn.disabled = false;
    confirmBtn.innerHTML = '<i class="fas fa-check me-1"></i>Confirm Add';
  }
}

function renderODBulkResult(data) {
  const { summary, added, skipped, failed } = data;

  document.getElementById("od-bulk-result-summary").innerHTML = `
    <strong>Added:</strong> ${summary.added} &nbsp;&nbsp;
    <strong>Skipped:</strong> ${summary.skipped} &nbsp;&nbsp;
    <strong>Failed:</strong> ${summary.failed}
    (out of ${summary.unique_processed} unique enrolment numbers processed)
  `;

  const rows = [];
  for (const a of added) {
    rows.push(`
      <tr class="table-success">
        <td><span class="text-success">✓ Added</span></td>
        <td><code>${a.enrollment_number}</code></td>
        <td>${a.student_name || "—"}</td>
      </tr>`);
  }
  for (const s of skipped) {
    rows.push(`
      <tr class="table-warning">
        <td><span class="text-warning">⚠ Skipped</span></td>
        <td><code>${s.enrollment_number}</code></td>
        <td>${s.reason}</td>
      </tr>`);
  }
  for (const f of failed) {
    rows.push(`
      <tr class="table-danger">
        <td><span class="text-danger">✗ Failed</span></td>
        <td><code>${f.enrollment_number}</code></td>
        <td>${f.reason}</td>
      </tr>`);
  }
  document.getElementById("od-bulk-result-tbody").innerHTML = rows.join("");

  document.getElementById("od-bulk-step-input").classList.add("d-none");
  document.getElementById("od-bulk-step-preview").classList.add("d-none");
  document.getElementById("od-bulk-step-result").classList.remove("d-none");

  const confirmBtn = document.getElementById("od-bulk-confirm-btn");
  confirmBtn.disabled = false;
  confirmBtn.innerHTML = '<i class="fas fa-check me-1"></i>Confirm Add';
}

function downloadODBulkTemplate(e) {
  e.preventDefault();
  if (!window.XLSX) {
    showODAlert("Excel library not loaded", "danger");
    return;
  }
  const ws = window.XLSX.utils.aoa_to_sheet([
    ["enrollment_number"],
    ["A866175125001"],
    ["A866175125002"],
  ]);
  const wb = window.XLSX.utils.book_new();
  window.XLSX.utils.book_append_sheet(wb, ws, "Enrolments");
  window.XLSX.writeFile(wb, "od-bulk-add-template.xlsx");
}

// Wire up modal buttons once DOM is ready.
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("od-bulk-validate-btn")?.addEventListener("click", validateODBulkList);
  document.getElementById("od-bulk-back-btn")?.addEventListener("click", backToODBulkInput);
  document.getElementById("od-bulk-confirm-btn")?.addEventListener("click", confirmODBulkAdd);
  document.getElementById("od-bulk-download-template")?.addEventListener("click", downloadODBulkTemplate);
});
window.openODBulkAddModal = openODBulkAddModal;
