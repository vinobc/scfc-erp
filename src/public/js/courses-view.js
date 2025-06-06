// Courses View functionality for both admin and student interfaces

document.addEventListener("DOMContentLoaded", () => {
  initializeCoursesView();
});

function initializeCoursesView() {
  console.log("Initializing courses view functionality");

  // Admin interface elements
  const adminCoursesViewLink = document.getElementById("courses-view-link");
  const adminYearSelect = document.getElementById("courses-view-year");
  const adminSemesterSelect = document.getElementById("courses-view-semester");
  const adminLoadBtn = document.getElementById("load-courses-view-btn");

  // Student interface elements
  const studentCoursesViewLink = document.getElementById(
    "student-courses-view-link"
  );
  const studentYearSelect = document.getElementById(
    "student-courses-view-year"
  );
  const studentSemesterSelect = document.getElementById(
    "student-courses-view-semester"
  );
  const studentLoadBtn = document.getElementById(
    "student-load-courses-view-btn"
  );

  // Setup admin interface
  if (adminCoursesViewLink) {
    adminCoursesViewLink.addEventListener("click", (e) => {
      e.preventDefault();
      showAdminCoursesView();
    });
  }

  if (adminLoadBtn) {
    adminLoadBtn.addEventListener("click", () => {
      loadCoursesViewData("admin");
    });
  }

  if (adminYearSelect) {
    adminYearSelect.addEventListener("change", () => {
      populateSemesters("admin");
    });
  }

  // Setup student interface
  if (studentCoursesViewLink) {
    studentCoursesViewLink.addEventListener("click", (e) => {
      e.preventDefault();
      showStudentCoursesView();
    });
  }

  if (studentLoadBtn) {
    studentLoadBtn.addEventListener("click", () => {
      loadCoursesViewData("student");
    });
  }

  if (studentYearSelect) {
    studentYearSelect.addEventListener("change", () => {
      populateSemesters("student");
    });
  }
}

// Show admin courses view
function showAdminCoursesView() {
  console.log("Showing admin courses view");

  // Update navigation
  const navLinks = document.querySelectorAll(".nav-link");
  const contentPages = document.querySelectorAll(".content-page");

  navLinks.forEach((link) => link.classList.remove("active"));
  contentPages.forEach((page) => page.classList.remove("active"));

  const coursesViewLink = document.getElementById("courses-view-link");
  const coursesViewPage = document.getElementById("courses-view-page");

  if (coursesViewLink) coursesViewLink.classList.add("active");
  if (coursesViewPage) coursesViewPage.classList.add("active");

  // Update page title
  const pageTitle = document.getElementById("page-title");
  if (pageTitle) pageTitle.textContent = "Courses View";

  // Load available years and semesters
  loadAvailableYearsAndSemesters("admin");
}

// Show student courses view
function showStudentCoursesView() {
  console.log("Showing student courses view");

  // Update navigation
  const studentNavLinks = document.querySelectorAll(
    "#student-sidebar .nav-link"
  );
  const studentContentPages = document.querySelectorAll(
    ".student-content-page"
  );

  studentNavLinks.forEach((link) => link.classList.remove("active"));
  studentContentPages.forEach((page) => (page.style.display = "none"));

  const studentCoursesViewLink = document.getElementById(
    "student-courses-view-link"
  );
  const studentCoursesViewContent = document.getElementById(
    "student-courses-view-content"
  );

  if (studentCoursesViewLink) studentCoursesViewLink.classList.add("active");
  if (studentCoursesViewContent)
    studentCoursesViewContent.style.display = "block";

  // Update page title
  const studentPageTitle = document.getElementById("student-page-title");
  if (studentPageTitle) studentPageTitle.textContent = "Courses View";

  // Load available years and semesters
  loadAvailableYearsAndSemesters("student");
}

// Load available years and semesters
async function loadAvailableYearsAndSemesters(userType) {
  const yearSelect =
    userType === "admin"
      ? document.getElementById("courses-view-year")
      : document.getElementById("student-courses-view-year");

  const semesterSelect =
    userType === "admin"
      ? document.getElementById("courses-view-semester")
      : document.getElementById("student-courses-view-semester");

  if (!yearSelect || !semesterSelect) return;

  try {
    const response = await fetch(
      `${window.API_URL}/faculty-allocations/years-semesters`,
      {
        headers: {
          "x-access-token": localStorage.getItem("token"),
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch years and semesters");
    }

    const yearsData = await response.json();
    console.log("Available years and semesters:", yearsData);

    // Populate year dropdown
    yearSelect.innerHTML = '<option value="">Select Academic Year</option>';
    yearsData.forEach((yearInfo) => {
      const option = document.createElement("option");
      option.value = yearInfo.year;
      option.textContent = yearInfo.year;
      option.dataset.semesters = JSON.stringify(yearInfo.semesters);
      yearSelect.appendChild(option);
    });

    // Clear semester dropdown
    semesterSelect.innerHTML = '<option value="">Select Semester</option>';
  } catch (error) {
    console.error("Error loading years and semesters:", error);
    if (typeof showAlert === "function") {
      showAlert("Error loading available years and semesters", "danger");
    }
  }
}

// Populate semesters based on selected year
function populateSemesters(userType) {
  const yearSelect =
    userType === "admin"
      ? document.getElementById("courses-view-year")
      : document.getElementById("student-courses-view-year");

  const semesterSelect =
    userType === "admin"
      ? document.getElementById("courses-view-semester")
      : document.getElementById("student-courses-view-semester");

  if (!yearSelect || !semesterSelect) return;

  const selectedOption = yearSelect.options[yearSelect.selectedIndex];
  semesterSelect.innerHTML = '<option value="">Select Semester</option>';

  if (selectedOption && selectedOption.dataset.semesters) {
    const semesters = JSON.parse(selectedOption.dataset.semesters);
    semesters.forEach((semester) => {
      const option = document.createElement("option");
      option.value = semester;
      option.textContent = semester;
      semesterSelect.appendChild(option);
    });
  }
}

// Load and display courses view data
async function loadCoursesViewData(userType) {
  const yearSelect =
    userType === "admin"
      ? document.getElementById("courses-view-year")
      : document.getElementById("student-courses-view-year");

  const semesterSelect =
    userType === "admin"
      ? document.getElementById("courses-view-semester")
      : document.getElementById("student-courses-view-semester");

  const container =
    userType === "admin"
      ? document.getElementById("courses-view-container")
      : document.getElementById("student-courses-view-container");

  const tableBody =
    userType === "admin"
      ? document.getElementById("courses-view-table-body")
      : document.getElementById("student-courses-view-table-body");

  const title =
    userType === "admin"
      ? document.getElementById("courses-view-title")
      : document.getElementById("student-courses-view-title");

  if (!yearSelect || !semesterSelect || !container || !tableBody || !title) {
    console.error("Required elements not found");
    return;
  }

  const year = yearSelect.value;
  const semester = semesterSelect.value;

  if (!year || !semester) {
    if (typeof showAlert === "function") {
      showAlert("Please select both academic year and semester", "warning");
    }
    return;
  }

  try {
    // Show loading
    container.style.display = "block";
    title.textContent = `Loading courses for ${year} ${semester}...`;
    tableBody.innerHTML =
      '<tr><td colspan="6" class="text-center">Loading...</td></tr>';

    const response = await fetch(
      `${window.API_URL}/faculty-allocations/courses-view?year=${year}&semesterType=${semester}`,
      {
        headers: {
          "x-access-token": localStorage.getItem("token"),
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch courses view data");
    }

    const data = await response.json();
    console.log("Courses view data:", data);

    // Update title
    title.textContent = `Courses View - ${year} ${semester} (${data.totalCourses} courses, ${data.totalAllocations} allocations)`;

    // Generate table content
    generateCoursesTable(data.courses, tableBody);
  } catch (error) {
    console.error("Error loading courses view data:", error);
    if (typeof showAlert === "function") {
      showAlert("Error loading courses view data", "danger");
    }

    // Show error in table
    tableBody.innerHTML =
      '<tr><td colspan="6" class="text-center text-danger">Error loading data</td></tr>';
  }
}

// Generate the courses table with proper grouping
function generateCoursesTable(courses, tableBody) {
  if (!courses || courses.length === 0) {
    tableBody.innerHTML =
      '<tr><td colspan="6" class="text-center">No courses found</td></tr>';
    return;
  }

  let html = "";
  let serialNumber = 1;

  courses.forEach((course) => {
    const allocations = course.allocations || [];

    if (allocations.length === 0) {
      // Course with no allocations
      html += `
          <tr>
            <td>${serialNumber++}</td>
            <td>${course.course_code}</td>
            <td>${course.course_name}</td>
            <td class="text-muted">No allocations</td>
            <td class="text-muted">-</td>
            <td class="text-muted">-</td>
          </tr>
        `;
    } else {
      // Group allocations by faculty and venue to combine slots
      const groupedAllocations = groupAllocationsByFacultyVenue(allocations);

      groupedAllocations.forEach((allocation, index) => {
        html += `
            <tr>
              <td>${index === 0 ? serialNumber : ""}</td>
              <td>${index === 0 ? course.course_code : ""}</td>
              <td>${index === 0 ? course.course_name : ""}</td>
              <td>${allocation.combinedSlots}</td>
              <td>${allocation.venue}</td>
              <td>${allocation.faculty_name}</td>
            </tr>
          `;
      });

      serialNumber++;
    }
  });

  tableBody.innerHTML = html;
}

// Group allocations by faculty and venue, combining slots
function groupAllocationsByFacultyVenue(allocations) {
  const groups = new Map();

  allocations.forEach((allocation) => {
    const key = `${allocation.faculty_name}-${allocation.venue}`;

    if (!groups.has(key)) {
      groups.set(key, {
        faculty_name: allocation.faculty_name,
        venue: allocation.venue,
        venue_type: allocation.venue_type,
        slots: [],
      });
    }

    groups.get(key).slots.push({
      slot_name: allocation.slot_name,
      slot_day: allocation.slot_day,
      slot_time: allocation.slot_time,
    });
  });

  // Convert to array and combine slots
  return Array.from(groups.values()).map((group) => {
    // Sort slots for consistent display
    group.slots.sort((a, b) => {
      if (a.slot_day !== b.slot_day) {
        const dayOrder = ["MON", "TUE", "WED", "THU", "FRI"];
        return dayOrder.indexOf(a.slot_day) - dayOrder.indexOf(b.slot_day);
      }
      return a.slot_time.localeCompare(b.slot_time);
    });

    // Combine slot names
    const slotNames = group.slots.map((slot) => slot.slot_name);
    group.combinedSlots = slotNames.join(", ");

    return group;
  });
}
