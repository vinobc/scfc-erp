// Course Withdrawal Module
let registeredCourses = [];
let selectedSemester = null;

// Initialize course withdrawal functionality
function initializeCourseWithdrawal() {
  console.log("🚀 Initializing course withdrawal...");
  
  // Load semesters
  loadWithdrawalSemesters();
  
  // Setup event listener for semester selection
  const semesterSelect = document.getElementById("withdrawal-semester-select");
  if (semesterSelect) {
    semesterSelect.addEventListener("change", handleSemesterSelection);
  }
}

// Load available semesters from student registrations
async function loadWithdrawalSemesters() {
  try {
    const response = await fetch(`${window.API_URL}/course-registration/my-semesters`, {
      headers: {
        Authorization: localStorage.getItem("token"),
      },
    });

    if (!response.ok) {
      throw new Error("Failed to load semesters");
    }

    const data = await response.json();
    populateSemesterDropdown(data);
  } catch (error) {
    console.error("Error loading semesters:", error);
    showStudentAlert("Failed to load semesters", "danger");
  }
}

// Populate semester dropdown
function populateSemesterDropdown(semesters) {
  const semesterSelect = document.getElementById("withdrawal-semester-select");
  if (!semesterSelect) return;

  semesterSelect.innerHTML = '<option value="">Select Academic Year & Semester</option>';
  
  semesters.forEach(sem => {
    const option = document.createElement("option");
    option.value = `${sem.slot_year}|${sem.semester_type}`;
    option.textContent = `${sem.slot_year} - ${sem.semester_type}`;
    semesterSelect.appendChild(option);
  });
}

// Handle semester selection
async function handleSemesterSelection(event) {
  const value = event.target.value;
  if (!value) {
    document.getElementById("withdrawal-courses-section").style.display = "none";
    return;
  }

  const [slot_year, semester_type] = value.split("|");
  selectedSemester = { slot_year, semester_type };
  
  // Load registered courses for the selected semester
  await loadRegisteredCourses(slot_year, semester_type);
}

// Load registered courses
async function loadRegisteredCourses(slot_year, semester_type) {
  try {
    const response = await fetch(
      `${window.API_URL}/course-withdrawal/registered-courses/${slot_year}/${semester_type}`,
      {
        headers: {
          Authorization: localStorage.getItem("token"),
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to load registered courses");
    }

    const data = await response.json();
    registeredCourses = data.courses;
    displayRegisteredCourses();
    
    // Show the courses section
    document.getElementById("withdrawal-courses-section").style.display = "block";
  } catch (error) {
    console.error("Error loading registered courses:", error);
    showStudentAlert("Failed to load registered courses", "danger");
  }
}

// Display registered courses
function displayRegisteredCourses() {
  const coursesList = document.getElementById("withdrawal-courses-list");
  if (!coursesList) return;

  if (registeredCourses.length === 0) {
    coursesList.innerHTML = `
      <div class="alert alert-info">
        No registered courses found for the selected semester.
      </div>
    `;
    return;
  }

  // Group courses by withdrawn status
  const activeCourses = registeredCourses.filter(course => !course.withdrawn);
  const withdrawnCourses = registeredCourses.filter(course => course.withdrawn);

  let html = "";

  // Display active courses
  if (activeCourses.length > 0) {
    html += `
      <h6 class="mb-3">Active Courses</h6>
      <div class="table-responsive mb-4">
        <table class="table table-bordered">
          <thead>
            <tr>
              <th>Course Code</th>
              <th>Course Name</th>
              <th>Credits</th>
              <th>Type</th>
              <th>Faculty</th>
              <th>Slots & Venues</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
    `;

    activeCourses.forEach(course => {
      const slotsInfo = course.components.map(comp => {
        const compType = comp.component_type === 'T' ? 'Theory' : 
                        comp.component_type === 'P' ? 'Practical' : '';
        return `${comp.slot_name} (${comp.venue})${compType ? ' - ' + compType : ''}`;
      }).join('<br>');

      html += `
        <tr>
          <td>${course.course_code}</td>
          <td>${course.course_name}</td>
          <td>${course.credits}</td>
          <td>${course.course_type}</td>
          <td>${course.faculty_name}</td>
          <td>${slotsInfo}</td>
          <td>
            <button class="btn btn-danger btn-sm" onclick="confirmWithdrawal('${course.course_code}', '${course.course_name}')">
              <i class="fas fa-times-circle"></i> Withdraw
            </button>
          </td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
    `;
  }

  // Display withdrawn courses
  if (withdrawnCourses.length > 0) {
    html += `
      <h6 class="mb-3 text-muted">Withdrawn Courses</h6>
      <div class="table-responsive">
        <table class="table table-bordered table-striped">
          <thead>
            <tr>
              <th>Course Code</th>
              <th>Course Name</th>
              <th>Credits</th>
              <th>Type</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
    `;

    withdrawnCourses.forEach(course => {
      html += `
        <tr class="text-muted">
          <td>${course.course_code}</td>
          <td>${course.course_name}</td>
          <td>${course.credits}</td>
          <td>${course.course_type}</td>
          <td><span class="badge bg-secondary">Withdrawn</span></td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
    `;
  }

  coursesList.innerHTML = html;
}

// Confirm withdrawal
function confirmWithdrawal(courseCode, courseName) {
  const modal = document.createElement('div');
  modal.innerHTML = `
    <div class="modal fade" id="withdrawalConfirmModal" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Confirm Course Withdrawal</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <p>Are you sure you want to withdraw from the following course?</p>
            <p><strong>Course:</strong> ${courseCode} - ${courseName}</p>
            <div class="alert alert-warning">
              <i class="fas fa-exclamation-triangle"></i> 
              <strong>Warning:</strong> You are attempting to withdraw the course ${courseCode} - ${courseName}. A course once withdrawn can not be reinstated. This action cannot be undone. Do you wish to continue with this course withdrawal?
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-danger" onclick="performWithdrawal('${courseCode}')">
              <i class="fas fa-times-circle"></i> Confirm Withdrawal
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  const modalInstance = new bootstrap.Modal(document.getElementById('withdrawalConfirmModal'));
  modalInstance.show();
  
  // Clean up after modal is hidden
  document.getElementById('withdrawalConfirmModal').addEventListener('hidden.bs.modal', function () {
    modal.remove();
  });
}

// Perform withdrawal
async function performWithdrawal(courseCode) {
  try {
    // Close the modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('withdrawalConfirmModal'));
    modal.hide();

    const response = await fetch(`${window.API_URL}/course-withdrawal/withdraw`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: localStorage.getItem("token"),
      },
      body: JSON.stringify({
        course_code: courseCode,
        slot_year: selectedSemester.slot_year,
        semester_type: selectedSemester.semester_type
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to withdraw from course");
    }

    const result = await response.json();
    showStudentAlert(`Successfully withdrawn from ${result.course.course_name}`, "success");
    
    // Reload the courses list
    await loadRegisteredCourses(selectedSemester.slot_year, selectedSemester.semester_type);
  } catch (error) {
    console.error("Error withdrawing from course:", error);
    showStudentAlert(error.message || "Failed to withdraw from course", "danger");
  }
}

// Show alert message (using existing student alert function)
function showStudentAlert(message, type = "info") {
  if (typeof window.showAlert === "function") {
    window.showAlert(message, type);
  } else {
    console.log(`[${type}] ${message}`);
  }
}

// Make functions globally available
window.initializeCourseWithdrawal = initializeCourseWithdrawal;
window.confirmWithdrawal = confirmWithdrawal;
window.performWithdrawal = performWithdrawal;