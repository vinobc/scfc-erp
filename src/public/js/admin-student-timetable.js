// Admin Student Timetable Module
console.log("🔥 ADMIN STUDENT TIMETABLE JS FILE LOADED!");

// Global variables
let adminTimetableData = {
  availableSemesters: [],
  currentStudentData: null
};

// Initialize admin student timetable functionality
function initializeAdminStudentTimetable() {
  console.log("🚀 Initializing admin student timetable...");
  
  setTimeout(() => {
    setupAdminTimetableHandlers();
    loadAdminAvailableSemesters();
    clearAdminStudentSearch();
  }, 300);
}

// Setup event listeners
function setupAdminTimetableHandlers() {
  const searchBtn = document.getElementById("search-student-btn");
  const clearBtn = document.getElementById("clear-search-btn");
  const searchInput = document.getElementById("student-enrollment-search");
  
  if (searchBtn) {
    searchBtn.onclick = handleAdminStudentSearch;
    console.log("✅ Search handler added");
  }
  
  if (clearBtn) {
    clearBtn.onclick = clearAdminStudentSearch;
    console.log("✅ Clear handler added");
  }
  
  if (searchInput) {
    searchInput.addEventListener("keypress", function(e) {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAdminStudentSearch();
      }
    });
    console.log("✅ Enter key handler added");
  }
}

// Load available semesters
async function loadAdminAvailableSemesters() {
  try {
    console.log("📅 Loading available semesters...");
    
    const response = await fetch(`${window.API_URL}/course-registration/semesters`, {
      headers: { "x-access-token": localStorage.getItem("token") }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to load semesters`);
    }
    
    adminTimetableData.availableSemesters = await response.json();
    console.log("✅ Loaded semesters:", adminTimetableData.availableSemesters.length);
  } catch (error) {
    console.error("Error loading semesters:", error);
    if (typeof showAlert === 'function') {
      showAlert(`Error loading semesters: ${error.message}`, "danger");
    }
  }
}

// Handle student search
async function handleAdminStudentSearch() {
  console.log("🚀 Starting admin student search...");
  
  try {
    console.log("🔧 Getting DOM elements...");
    const searchInput = document.getElementById("student-enrollment-search");
    const searchBtn = document.getElementById("search-student-btn");
    console.log("🔧 Elements found:", { searchInput: !!searchInput, searchBtn: !!searchBtn });
  
    if (!searchInput || !searchBtn) {
      console.error("❌ Required elements not found");
      return;
    }
    
    console.log("🔧 Getting enrollment number from input...");
    const enrollmentNo = searchInput.value.trim();
    console.log("📝 Enrollment number:", enrollmentNo);
    
    // Validate input
    if (!enrollmentNo) {
      console.log("❌ No enrollment number entered");
      searchInput.classList.add("is-invalid");
      if (typeof showAlert === 'function') {
        showAlert("Please enter an enrollment number", "warning");
      } else {
        alert("Please enter an enrollment number");
      }
      return;
    }
    
    console.log("🔍 Validating enrollment number format...");
    if (enrollmentNo.length < 6) {
      console.log("❌ Enrollment number too short");
      searchInput.classList.add("is-invalid");
      if (typeof showAlert === 'function') {
        showAlert("Please enter a valid enrollment number (minimum 6 characters)", "warning");
      } else {
        alert("Please enter a valid enrollment number (minimum 6 characters)");
      }
      return;
    }
    
    console.log("✅ Validation passed, proceeding to API call...");
    
    try {
      // Show loading state
      searchBtn.disabled = true;
      searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Searching...';
      
      hideAdminAllSections();
      
      console.log(`🔍 Searching for student: ${enrollmentNo}`);
      console.log(`🌐 API URL: ${window.API_URL}/students/${enrollmentNo}`);
      console.log(`🔑 Token: ${localStorage.getItem("token") ? "Present" : "Missing"}`);
      
      const response = await fetch(`${window.API_URL}/students/${enrollmentNo}`, {
        headers: { "x-access-token": localStorage.getItem("token") }
      });
      
      console.log(`📡 Response status: ${response.status}`);
      console.log(`📡 Response ok: ${response.ok}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Response error: ${errorText}`);
        if (response.status === 404) {
          throw new Error("Student not found with the provided enrollment number");
        }
        throw new Error(`Failed to fetch student details: ${response.status} - ${errorText}`);
      }
      
      const student = await response.json();
      console.log("✅ Found student:", student.student_name);
      console.log("📊 Full student data:", student);
      
      displayAdminStudentInfo(student);
      adminTimetableData.currentStudentData = student;
      displayAdminSemesterSelection();
      
    } catch (error) {
      console.error("❌ Complete error details:", error);
      console.error("❌ Error message:", error.message);
      console.error("❌ Error stack:", error.stack);
      showAdminStudentError(error.message);
    } finally {
      searchBtn.disabled = false;
      searchBtn.innerHTML = '<i class="fas fa-search me-2"></i>Search Student';
      searchInput.classList.remove("is-invalid");
    }
    
  } catch (outerError) {
    console.error("💥 OUTER ERROR in handleAdminStudentSearch:", outerError);
    console.error("💥 OUTER ERROR message:", outerError.message);
    console.error("💥 OUTER ERROR stack:", outerError.stack);
    alert("Error in search function: " + outerError.message);
  }
}

// Display student information
function displayAdminStudentInfo(student) {
  console.log("🏷️ Displaying student info...");
  const studentInfoSection = document.getElementById("student-info-section");
  if (!studentInfoSection) {
    console.error("❌ student-info-section not found!");
    return;
  }
  
  const fields = {
    "admin-student-enrollment": student.enrollment_no,
    "admin-student-name": student.student_name || "N/A",
    "admin-student-school": student.school_short_name || "N/A", 
    "admin-student-program": student.program_name_short || "N/A",
    "admin-student-year-admitted": student.year_admitted || "N/A"
  };
  
  // Only add semester if it has a value
  if (student.current_semester) {
    fields["admin-student-semester"] = student.current_semester;
  }
  
  console.log("📝 Field mapping:", fields);
  
  Object.entries(fields).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
      console.log(`✅ Set ${id} = ${value}`);
    } else {
      console.error(`❌ Element ${id} not found!`);
    }
  });
  
  // Hide semester paragraph if no semester data
  const semesterElement = document.getElementById("student-semester");
  if (semesterElement && semesterElement.parentElement) {
    if (student.current_semester) {
      semesterElement.parentElement.style.display = "block";
    } else {
      semesterElement.parentElement.style.display = "none";
    }
  }
  
  studentInfoSection.style.display = "block";
  console.log("✅ Student info section displayed");
}

// Display semester selection
function displayAdminSemesterSelection() {
  const timetableSection = document.getElementById("student-timetable-section");
  const timetableContainer = document.getElementById("admin-student-timetable-container");
  
  if (!timetableSection || !timetableContainer) return;
  
  let semesterOptions = adminTimetableData.availableSemesters
    .map(semester => 
      `<option value="${semester.slot_year}|${semester.semester_type}">
        ${semester.slot_year} - ${semester.semester_type}
      </option>`
    ).join("");
  
  timetableContainer.innerHTML = `
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
      <h6 style="color: #007bff; margin-bottom: 15px;">📅 Select Semester to View Timetable</h6>
      <div class="row">
        <div class="col-md-6">
          <select id="admin-semester-select" class="form-select" style="padding: 10px; font-size: 16px;">
            <option value="">Select Academic Year & Semester</option>
            ${semesterOptions}
          </select>
        </div>
        <div class="col-md-6">
          <button id="load-admin-timetable-btn" class="btn btn-primary" style="padding: 10px 20px;" disabled>
            📋 Load Timetable
          </button>
        </div>
      </div>
    </div>
    <div id="admin-timetable-display" style="display: none;"></div>
  `;
  
  // Setup semester selection handler
  const semesterSelect = document.getElementById("admin-semester-select");
  const loadButton = document.getElementById("load-admin-timetable-btn");
  
  if (semesterSelect) {
    semesterSelect.addEventListener("change", function() {
      if (loadButton) {
        loadButton.disabled = !this.value;
      }
    });
  }
  
  if (loadButton) {
    loadButton.onclick = function() {
      loadAdminStudentTimetable();
    };
  }
  
  timetableSection.style.display = "block";
}

// Load student timetable
async function loadAdminStudentTimetable() {
  const semesterSelect = document.getElementById("admin-semester-select");
  const displayArea = document.getElementById("admin-timetable-display");
  const loadButton = document.getElementById("load-admin-timetable-btn");
  
  if (!semesterSelect || !semesterSelect.value || !adminTimetableData.currentStudentData) {
    if (typeof showAlert === 'function') {
      showAlert("Please select a semester first", "warning");
    }
    return;
  }
  
  const [year, type] = semesterSelect.value.split("|");
  
  try {
    if (loadButton) {
      loadButton.disabled = true;
      loadButton.innerHTML = "🔄 Loading...";
    }
    
    if (displayArea) {
      displayArea.innerHTML = `
        <div style="text-align: center; padding: 40px;">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          <p class="mt-3">Loading student timetable...</p>
        </div>
      `;
      displayArea.style.display = "block";
    }
    
    console.log(`📋 Loading timetable for ${adminTimetableData.currentStudentData.enrollment_no} - ${year} ${type}`);
    
    const response = await fetch(
      `${window.API_URL}/course-registration/admin-student-timetable/${adminTimetableData.currentStudentData.enrollment_no}?slot_year=${encodeURIComponent(year)}&semester_type=${encodeURIComponent(type)}`,
      {
        headers: { "x-access-token": localStorage.getItem("token") }
      }
    );
    
    if (!response.ok) {
      if (response.status === 403) {
        throw new Error("Access denied. Admin, faculty, or coordinator access required.");
      }
      throw new Error(`Failed to load student timetable: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.registrations && data.registrations.length > 0) {
      displayAdminTimetableResults(data, year, type);
    } else {
      showAdminNoRegistrationsMessage(year, type);
    }
    
  } catch (error) {
    console.error("Error loading timetable:", error);
    showAdminTimetableError(`Error loading timetable: ${error.message}`);
  } finally {
    if (loadButton) {
      loadButton.disabled = false;
      loadButton.innerHTML = "📋 Load Timetable";
    }
  }
}

// Display timetable results
function displayAdminTimetableResults(data, year, semester) {
  const displayArea = document.getElementById("admin-timetable-display");
  if (!displayArea) return;
  
  // Fetch slots to build timetable structure (same as student timetable)
  fetch(`${window.API_URL}/slots/${year}/${semester}`, {
    headers: { "x-access-token": localStorage.getItem("token") },
  })
    .then((response) => response.json())
    .then((slots) => {
      console.log("🔍 Building admin timetable for registrations:", data.registrations);

      // Create allocation map from registrations (excluding withdrawn courses)
      const allocationMap = {};
      data.registrations.forEach((registration) => {
        // For theory slots (like C, D), add to all days and times where this slot appears
        if (registration.slot_name && !registration.slot_name.includes("L") && !registration.slot_name.includes("+")) {
          // This is a theory slot - add to all occurrences across all days
          const days = ["MON", "TUE", "WED", "THU", "FRI"];
          days.forEach((day) => {
            const key = `${day}-${registration.slot_name}`;
            allocationMap[key] = registration;
          });
        } else if (registration.slot_day && registration.slot_time) {
          // Handle compound slots (like "L9+L10,L29+L30") - these are day-specific
          if (registration.slot_name.includes(",")) {
            const individualSlots = registration.slot_name
              .split(",")
              .map((s) => s.trim());
            individualSlots.forEach((slot) => {
              const key = `${registration.slot_day}-${slot}`;
              allocationMap[key] = registration;
            });
          } else {
            const key = `${registration.slot_day}-${registration.slot_name}`;
            allocationMap[key] = registration;
          }
        }
      });

      // Build timetable structure
      const days = ["MON", "TUE", "WED", "THU", "FRI"];
      const timeSlots = [
        "9.00-9.50",
        "9.55-10.45",
        "10.50-11.40",
        "11.45-12.35",
        "12.35-1.15",
        "1.15–2.05",
        "2.10-3.00",
        "3.05–3.55",
        "4.00–4.50",
      ];

      // Create slot map
      const slotMap = {};
      days.forEach((day) => {
        slotMap[day] = {};
      });

      slots.forEach((slot) => {
        if (!slotMap[slot.slot_day]) slotMap[slot.slot_day] = {};
        const matchingTimeSlot = timeSlots.find((ts) =>
          slot.slot_time.includes(ts)
        );
        if (matchingTimeSlot) {
          slotMap[slot.slot_day][matchingTimeSlot] = slot.slot_name;
        }
      });

      // Generate timetable HTML (same logic as student timetable)
      let tableHtml = generateAdminTimetableHTML(
        days,
        timeSlots,
        slotMap,
        allocationMap
      );
      let summaryTable = generateAdminSummaryTable(data.allRegistrations);

      // Update display area (exact same format as student timetable)
      displayArea.innerHTML = `
        <h6 style="color: #007bff; margin-bottom: 15px;">📅 My Slot Timetable - ${data.student.student_name} (${data.student.enrollment_number})</h6>
        <p style="color: #666; margin-bottom: 20px;">Academic Year: <strong>${year}</strong> | Semester: <strong>${semester}</strong></p>
        ${tableHtml}
        ${summaryTable}
      `;
    })
    .catch((error) => {
      console.error("Error generating admin timetable:", error);
      showAdminTimetableError(
        "Error loading timetable structure. Please try again."
      );
    });
}

// Show no registrations message
function showAdminNoRegistrationsMessage(year, semester) {
  const displayArea = document.getElementById("admin-timetable-display");
  if (!displayArea) return;
  
  displayArea.innerHTML = `
    <div class="alert alert-info" style="text-align: center; padding: 30px;">
      <h5>📋 No Course Registrations Found</h5>
      <p>This student doesn't have any registered courses for <strong>${year} ${semester}</strong>.</p>
    </div>
  `;
  displayArea.style.display = "block";
}

// Show error functions
function showAdminStudentError(message) {
  const errorSection = document.getElementById("student-error-section");
  const errorMessage = document.getElementById("student-error-message");
  
  if (errorSection && errorMessage) {
    errorMessage.textContent = message;
    errorSection.style.display = "block";
  }
}

function showAdminTimetableError(message) {
  const displayArea = document.getElementById("admin-timetable-display");
  if (displayArea) {
    displayArea.innerHTML = `
      <div class="alert alert-danger" style="text-align: center; padding: 30px;">
        <h5>❌ Error</h5>
        <p>${message}</p>
      </div>
    `;
    displayArea.style.display = "block";
  }
}

// Hide all sections
function hideAdminAllSections() {
  const sections = [
    "student-info-section",
    "student-error-section",
    "student-timetable-section"
  ];
  
  sections.forEach(sectionId => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.style.display = "none";
    }
  });
}

// Clear all data
function clearAdminStudentSearch() {
  console.log("🧹 Clearing admin student search...");
  
  const searchInput = document.getElementById("student-enrollment-search");
  if (searchInput) {
    searchInput.value = "";
    searchInput.classList.remove("is-invalid");
  }
  
  hideAdminAllSections();
  adminTimetableData.currentStudentData = null;
}

// Generate timetable HTML (copied from student-timetable.js)
function generateAdminTimetableHTML(days, timeSlots, slotMap, allocationMap) {
  let tableHtml = `
    <table class="table table-bordered" style="margin-bottom: 20px;">
      <thead>
        <tr class="table-primary">
          <th></th>
          <th colspan="4">Morning</th>
          <th rowspan="2" class="align-middle">Lunch</th>
          <th colspan="4">Afternoon</th>
        </tr>
        <tr class="table-primary">
          <th>Day</th>
          <th>9:00 - 9:50</th>
          <th>9:55 - 10:45</th>
          <th>10:50 - 11:40</th>
          <th>11:45 - 12:35</th>
          <th>1:15 - 2:05</th>
          <th>2:10 - 3:00</th>
          <th>3:05 - 3:55</th>
          <th>4:00 - 4:50</th>
        </tr>
      </thead>
      <tbody>
  `;

  // Generate theory and lab rows for each day
  days.forEach((day) => {
    // Theory row
    let rowHtml = `<tr><td class="table-secondary"><strong>${day}</strong></td>`;

    // Morning theory slots (0-3)
    for (let i = 0; i < 4; i++) {
      const timeSlot = timeSlots[i];
      const slotName = slotMap[day][timeSlot] || "";
      const allocation = allocationMap[`${day}-${slotName}`];

      if (allocation) {
        rowHtml += `<td class="text-center table-success" style="font-size: 12px;">
          <strong>${slotName}</strong><br>
          ${allocation.course_code}<br>
          ${allocation.venue}<br>
          ${allocation.faculty_name}
        </td>`;
      } else {
        rowHtml += `<td class="text-center" style="color: #999;">${slotName}</td>`;
      }
    }

    rowHtml += `<td class="table-secondary text-center">LUNCH</td>`;

    // Afternoon theory slots (5-8)
    for (let i = 5; i < 9; i++) {
      const timeSlot = timeSlots[i];
      const slotName = slotMap[day][timeSlot] || "";
      const allocation = allocationMap[`${day}-${slotName}`];

      if (allocation) {
        rowHtml += `<td class="text-center table-success" style="font-size: 12px;">
          <strong>${slotName}</strong><br>
          ${allocation.course_code}<br>
          ${allocation.venue}<br>
          ${allocation.faculty_name}
        </td>`;
      } else {
        rowHtml += `<td class="text-center" style="color: #999;">${slotName}</td>`;
      }
    }

    rowHtml += "</tr>";
    tableHtml += rowHtml;

    // Lab row
    let labRowHtml = `<tr><td class="table-warning">Lab</td>`;

    // Lab slot mappings for each day (matching student timetable exactly)
    const morningLab1 = `L${
      day === "MON"
        ? "1+L2"
        : day === "TUE"
        ? "5+L6"
        : day === "WED"
        ? "9+L10"
        : day === "THU"
        ? "13+L14"
        : "17+L18"
    }`;
    const morningLab2 = `L${
      day === "MON"
        ? "3+L4"
        : day === "TUE"
        ? "7+L8"
        : day === "WED"
        ? "11+L12"
        : day === "THU"
        ? "15+L16"
        : "19+L20"
    }`;
    const afternoonLab1 = `L${
      day === "MON"
        ? "21+L22"
        : day === "TUE"
        ? "25+L26"
        : day === "WED"
        ? "29+L30"
        : day === "THU"
        ? "33+L34"
        : "37+L38"
    }`;
    const afternoonLab2 = `L${
      day === "MON"
        ? "23+L24"
        : day === "TUE"
        ? "27+L28"
        : day === "WED"
        ? "31+L32"
        : day === "THU"
        ? "35+L36"
        : "39+L40"
    }`;

    // Morning lab slots
    [morningLab1, morningLab2].forEach((labSlot) => {
      const allocation = allocationMap[`${day}-${labSlot}`];
      if (allocation) {
        labRowHtml += `<td class="text-center table-warning" colspan="2" style="font-size: 12px;">
          <strong>${labSlot}</strong><br>
          ${allocation.course_code}<br>
          ${allocation.venue || "TBD"}<br>
          ${allocation.faculty_name || "TBD"}
        </td>`;
      } else {
        labRowHtml += `<td class="text-center table-warning" colspan="2" style="color: #999;">${labSlot}</td>`;
      }
    });

    labRowHtml += `<td class="table-secondary"></td>`;

    // Afternoon lab slots
    [afternoonLab1, afternoonLab2].forEach((labSlot) => {
      const allocation = allocationMap[`${day}-${labSlot}`];
      if (allocation) {
        labRowHtml += `<td class="text-center table-warning" colspan="2" style="font-size: 12px;">
          <strong>${labSlot}</strong><br>
          ${allocation.course_code}<br>
          ${allocation.venue || "TBD"}<br>
          ${allocation.faculty_name || "TBD"}
        </td>`;
      } else {
        labRowHtml += `<td class="text-center table-warning" colspan="2" style="color: #999;">${labSlot}</td>`;
      }
    });

    labRowHtml += "</tr>";
    tableHtml += labRowHtml;
  });

  tableHtml += "</tbody></table>";
  return tableHtml;
}

// Generate enhanced summary table (copied from student-timetable.js)
function generateAdminSummaryTable(allRegistrations) {
  if (!allRegistrations || allRegistrations.length === 0) {
    return `
      <div class="mt-4">
        <h6 style="color: #007bff; margin-bottom: 15px;">📋 Course Registration Summary</h6>
        <div class="alert alert-info">No course registrations found.</div>
      </div>
    `;
  }

  // Group registrations by course code and categorize
  const courseMap = new Map();
  let totalRegisteredCredits = 0;
  let totalWithdrawnCredits = 0;

  allRegistrations.forEach((reg) => {
    const key = reg.course_code;
    
    if (!courseMap.has(key)) {
      courseMap.set(key, {
        course_code: reg.course_code,
        course_name: reg.course_name,
        credits: reg.credits,
        course_type: reg.course_type,
        theory: reg.theory,
        practical: reg.practical,
        withdrawn: reg.withdrawn,
        faculty_name: reg.faculty_name,
        components: []
      });

      // Add to credit totals (only count each course once)
      if (reg.withdrawn) {
        totalWithdrawnCredits += reg.credits;
      } else {
        totalRegisteredCredits += reg.credits;
      }
    }

    // Add component info
    courseMap.get(key).components.push({
      slot_name: reg.slot_name,
      venue: reg.venue,
      component_type: reg.component_type
    });
  });

  const courses = Array.from(courseMap.values());
  const registeredCourses = courses.filter(course => !course.withdrawn);
  const withdrawnCourses = courses.filter(course => course.withdrawn);

  let tableHtml = `
    <div class="mt-4">
      <h6 style="color: #007bff; margin-bottom: 15px;">📋 Course Registration Summary</h6>
      <div class="table-responsive">
        <table class="table table-bordered table-hover">
          <thead class="table-primary">
            <tr>
              <th>Sl. No.</th>
              <th>Course Code</th>
              <th>Course Title</th>
              <th>Credits</th>
              <th>Type</th>
              <th>Slot</th>
              <th>Venue</th>
              <th>Faculty</th>
              <th>Component</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
  `;

  let slNo = 1;

  // Display registered courses
  registeredCourses.forEach((course) => {
    const isBackendCourse = course.theory === 0 && course.practical === 0;
    const rowClass = isBackendCourse ? 'table-info' : 'table-success';
    
    course.components.forEach((comp, index) => {
      tableHtml += `
        <tr class="${rowClass}">
          <td>${index === 0 ? slNo++ : ''}</td>
          <td>${index === 0 ? course.course_code : ''}</td>
          <td>${index === 0 ? course.course_name : ''}</td>
          <td>${index === 0 ? course.credits : ''}</td>
          <td>${index === 0 ? course.course_type : ''}</td>
          <td>${comp.slot_name}</td>
          <td>${comp.venue}</td>
          <td>${index === 0 ? course.faculty_name : ''}</td>
          <td>${comp.component_type}</td>
          <td>${index === 0 ? '<span class="badge bg-success">Registered</span>' : ''}</td>
        </tr>
      `;
    });
  });

  // Display withdrawn courses
  withdrawnCourses.forEach((course) => {
    course.components.forEach((comp, index) => {
      tableHtml += `
        <tr class="table-danger text-muted" style="text-decoration: line-through;">
          <td>${index === 0 ? slNo++ : ''}</td>
          <td>${index === 0 ? course.course_code : ''}</td>
          <td>${index === 0 ? course.course_name : ''}</td>
          <td>${index === 0 ? course.credits : ''}</td>
          <td>${index === 0 ? course.course_type : ''}</td>
          <td>${comp.slot_name}</td>
          <td>${comp.venue}</td>
          <td>${index === 0 ? course.faculty_name : ''}</td>
          <td>${comp.component_type}</td>
          <td>${index === 0 ? '<span class="badge bg-danger">Withdrawn</span>' : ''}</td>
        </tr>
      `;
    });
  });

  // Add summary row
  tableHtml += `
          </tbody>
          <tfoot class="table-dark">
            <tr>
              <th colspan="3">Total Credits Summary</th>
              <th>${totalRegisteredCredits}</th>
              <th colspan="4">Registered Credits</th>
              <th colspan="2">Withdrawn: ${totalWithdrawnCredits}</th>
            </tr>
            <tr>
              <th colspan="3">Grand Total Attempted</th>
              <th>${totalRegisteredCredits + totalWithdrawnCredits}</th>
              <th colspan="6">Total Credits Attempted</th>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  `;

  return tableHtml;
}

// Export functions globally
window.initializeAdminStudentTimetable = initializeAdminStudentTimetable;
window.handleAdminStudentSearch = handleAdminStudentSearch;
window.clearAdminStudentSearch = clearAdminStudentSearch;
window.loadAdminStudentTimetable = loadAdminStudentTimetable;

console.log("✅ Admin student timetable functions exported successfully!");