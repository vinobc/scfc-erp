// Standalone Student Timetable Module
console.log("📚 Loading student-timetable.js module...");
let availableSemesters = [];

// Initialize standalone timetable functionality
function initializeStandaloneTimetable() {
  console.log("🚀 Initializing standalone student timetable...");
  
  // Check if container exists
  const container = document.getElementById("standalone-timetable-container");
  if (!container) {
    console.error("❌ standalone-timetable-container not found!");
    return;
  }
  
  console.log("✅ Container found, loading semesters...");
  loadAvailableSemesters();
}

// Load available semesters where student has registrations
async function loadAvailableSemesters() {
  try {
    console.log("📅 Loading semesters with student registrations...");

    const response = await fetch(
      `${window.API_URL}/course-registration/my-semesters`,
      {
        headers: { 
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
          "x-access-token": localStorage.getItem("token")
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to load semesters`);
    }

    availableSemesters = await response.json();
    console.log("🔍 Semesters with registrations:", availableSemesters);
    console.log(
      `✅ Loaded ${availableSemesters.length} semesters with registrations`
    );

    displaySemesterSelection();
  } catch (error) {
    console.error("Error loading semesters:", error);
    // Show error in the UI
    const container = document.getElementById("standalone-timetable-container");
    if (container) {
      container.innerHTML = `
        <div class="alert alert-danger" style="margin: 20px;">
          <h5>❌ Error Loading Timetable</h5>
          <p>${error.message}</p>
          <details>
            <summary>Technical Details</summary>
            <pre>${error.stack || error}</pre>
          </details>
          <button class="btn btn-primary mt-3" onclick="initializeStandaloneTimetable()">
            🔄 Try Again
          </button>
        </div>
      `;
    }
  }
}

// Display semester selection interface
function displaySemesterSelection() {
  const container = document.getElementById("standalone-timetable-container");
  if (!container) {
    console.error("Timetable container not found");
    return;
  }

  let semesterOptions = availableSemesters
    .map(
      (semester) =>
        `<option value="${semester.slot_year}|${semester.semester_type}">
      ${semester.slot_year} - ${semester.semester_type}
    </option>`
    )
    .join("");

  container.innerHTML = `
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
      <h5 style="color: #007bff; margin-bottom: 15px;">📅 Select Semester to View Timetable</h5>
      <div class="row">
        <div class="col-md-6">
          <select id="standalone-semester-select" 
                  class="form-select" 
                  style="padding: 10px; font-size: 16px;">
            <option value="">Select Academic Year & Semester</option>
            ${semesterOptions}
          </select>
        </div>
        <div class="col-md-6">
          <button id="load-timetable-btn" 
                  class="btn btn-primary" 
                  style="padding: 10px 20px;"
                  onclick="loadSelectedTimetable()" 
                  disabled>
            📋 Load Timetable
          </button>
        </div>
      </div>
    </div>
    
    <!-- Timetable Display Area -->
    <div id="standalone-timetable-display" style="display: none;">
      <!-- Timetable will be displayed here -->
    </div>
  `;

  // Setup semester selection handler
  const semesterSelect = document.getElementById("standalone-semester-select");
  const loadButton = document.getElementById("load-timetable-btn");

  if (semesterSelect) {
    semesterSelect.addEventListener("change", function () {
      if (loadButton) {
        loadButton.disabled = !this.value;
      }
    });
  }
}

// Load timetable for selected semester
async function loadSelectedTimetable() {
  const semesterSelect = document.getElementById("standalone-semester-select");
  const displayArea = document.getElementById("standalone-timetable-display");
  const loadButton = document.getElementById("load-timetable-btn");

  if (!semesterSelect || !semesterSelect.value) {
    showTimetableAlert("Please select a semester first", "warning");
    return;
  }

  const [year, type] = semesterSelect.value.split("|");

  try {
    // Show loading state
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
          <p class="mt-3">Loading your timetable...</p>
        </div>
      `;
      displayArea.style.display = "block";
    }

    console.log(`📋 Loading timetable for ${year} ${type}`);

    const response = await fetch(
      `${
        window.API_URL
      }/course-registration/my-timetable?slot_year=${encodeURIComponent(
        year
      )}&semester_type=${encodeURIComponent(type)}`,
      {
        headers: { 
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
          "x-access-token": localStorage.getItem("token")
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to load student timetable: ${response.status}`);
    }

    const data = await response.json();
    
    console.log("📥 Full API response:", data);
    console.log("📥 Project registrations from API:", data.projectRegistrations);
    console.log("📥 All registrations from API:", data.allRegistrations);

    // Check for both regular and project registrations
    const hasRegularCourses = data.registrations && data.registrations.length > 0;
    const hasProjectCourses = data.projectRegistrations && data.projectRegistrations.length > 0;

    if (hasRegularCourses || hasProjectCourses) {
      console.log("🚀 Calling generateStandaloneTimetable with:", {
        projectRegistrations: data.projectRegistrations || [],
        allRegistrations: data.allRegistrations || []
      });
      generateStandaloneTimetable(
        data.student, 
        data.registrations || [], 
        data.allRegistrations || data.registrations || [], 
        year, 
        type,
        data.projectRegistrations || []
      );
    } else {
      showNoRegistrationsMessage(year, type);
    }
  } catch (error) {
    console.error("Error loading timetable:", error);
    showTimetableError(`Error loading timetable: ${error.message}`);
  } finally {
    // Reset button state
    if (loadButton) {
      loadButton.disabled = false;
      loadButton.innerHTML = "📋 Load Timetable";
    }
  }
}

// Show message when no registrations found
function showNoRegistrationsMessage(year, semester) {
  const displayArea = document.getElementById("standalone-timetable-display");
  if (!displayArea) return;

  displayArea.innerHTML = `
    <div class="alert alert-info" style="text-align: center; padding: 30px;">
      <h5>📋 No Course Registrations Found</h5>
      <p>You don't have any registered courses for <strong>${year} ${semester}</strong>.</p>
      <p>Please visit the Course Registration page to register for courses first.</p>
    </div>
  `;
  displayArea.style.display = "block";
}

// Generate standalone timetable (extracted from course-registration.js)
function generateStandaloneTimetable(student, registrations, allRegistrations, year, semester, projectRegistrations = []) {
  const displayArea = document.getElementById("standalone-timetable-display");
  if (!displayArea) {
    console.error("Timetable display area not found");
    return;
  }

  // Store projectRegistrations so it's accessible in the promise chain
  const projectRegs = projectRegistrations || [];
  console.log("📦 Project registrations received in generateStandaloneTimetable:", projectRegs);

  // Show loading while building timetable
  displayArea.innerHTML = `
    <h6 style="color: #007bff; margin-bottom: 15px;">📅 My Slot Timetable - ${student.student_name} (${student.enrollment_number})</h6>
    <div style="text-align: center; padding: 20px;">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p>Building timetable structure...</p>
    </div>
  `;

  // Fetch slots to build timetable structure
  fetch(`${window.API_URL}/slots/${year}/${semester}`, {
    headers: { "x-access-token": localStorage.getItem("token") },
  })
    .then((response) => response.json())
    .then((slots) => {
      console.log("🔍 Building timetable for registrations:", registrations);

      // Create allocation map from registrations
      const allocationMap = {};
      registrations.forEach((registration) => {
        if (registration.slot_day && registration.slot_time) {
          // Handle compound slots (like "L9+L10,L29+L30")
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

      // Generate timetable HTML (same logic as course-registration.js)
      let tableHtml = generateTimetableHTML(
        days,
        timeSlots,
        slotMap,
        allocationMap
      );
      console.log("📊 Passing project registrations to summary table:", projectRegs);
      let summaryTable = generateEnhancedSummaryTable(allRegistrations, projectRegs);

      // Update display area
      displayArea.innerHTML = `
        <h6 style="color: #007bff; margin-bottom: 15px;">📅 My Slot Timetable - ${student.student_name} (${student.enrollment_number})</h6>
        <p style="color: #666; margin-bottom: 20px;">Academic Year: <strong>${year}</strong> | Semester: <strong>${semester}</strong></p>
        ${tableHtml}
        ${summaryTable}
      `;
    })
    .catch((error) => {
      console.error("Error generating timetable:", error);
      showTimetableError(
        "Error loading timetable structure. Please try again."
      );
    });
}

// Generate timetable HTML
function generateTimetableHTML(days, timeSlots, slotMap, allocationMap) {
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

    // Lab slots pattern
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

// Generate enhanced summary table with all course types
function generateEnhancedSummaryTable(allRegistrations, projectRegistrations = []) {
  console.log("📊 Summary table debug:");
  console.log("allRegistrations:", allRegistrations);
  console.log("projectRegistrations:", projectRegistrations);
  
  // Combine all registrations and project registrations into one array
  const combinedRegistrations = [...(allRegistrations || []), ...(projectRegistrations || [])];
  console.log("combinedRegistrations:", combinedRegistrations);
  
  if (combinedRegistrations.length === 0) {
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

  combinedRegistrations.forEach((reg) => {
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
      component_type: reg.component_type,
      faculty_name: reg.faculty_name
    });
  });

  const courses = Array.from(courseMap.values());
  const registeredCourses = courses.filter(course => !course.withdrawn);
  const withdrawnCourses = courses.filter(course => course.withdrawn);
  
  // Separate project courses from regular courses
  const projectCourses = registeredCourses.filter(course => course.course_type === 'PRJ');
  const regularCourses = registeredCourses.filter(course => course.course_type !== 'PRJ');

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

  // Display regular courses
  regularCourses.forEach((course) => {
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
          <td>${comp.faculty_name || ''}</td>
          <td>${comp.component_type}</td>
          <td>${index === 0 ? '<span class="badge bg-success">Registered</span>' : ''}</td>
        </tr>
      `;
    });
  });

  // Display project courses
  projectCourses.forEach((course) => {
    tableHtml += `
      <tr class="table-warning">
        <td>${slNo++}</td>
        <td>${course.course_code}</td>
        <td>${course.course_name}</td>
        <td>${course.credits}</td>
        <td>${course.course_type}</td>
        <td>PROJECT</td>
        <td>N/A</td>
        <td>${course.faculty_name || 'TBA'}</td>
        <td>PROJECT</td>
        <td><span class="badge bg-success">Registered</span></td>
      </tr>
    `;
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
          <td>${comp.faculty_name || ''}</td>
          <td>${comp.component_type}</td>
          <td>${index === 0 ? '<span class="badge bg-danger">Withdrawn</span>' : ''}</td>
        </tr>
      `;
    });
  });

  tableHtml += `
          </tbody>
        </table>
      </div>
    `;
  
  // Add summary section with credit totals
  tableHtml += `
      <div class="mt-4">
        <h6 style="color: #007bff; margin-bottom: 15px;">📊 Credit Summary</h6>
        <table class="table table-bordered">
          <tbody>
            <tr class="table-secondary">
              <th>Credits Registered before Withdrawal:</th>
              <td><strong>${totalRegisteredCredits + totalWithdrawnCredits}</strong></td>
            </tr>
            <tr class="table-warning">
              <th>Credits Withdrawn:</th>
              <td><strong>${totalWithdrawnCredits}</strong></td>
            </tr>
            <tr class="table-success">
              <th>Credits Registered after Withdrawal:</th>
              <td><strong>${totalRegisteredCredits}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  return tableHtml;
}

// Generate summary table (keep original for backward compatibility)
function generateSummaryTable(registrations) {
  // Group compound slots back together
  const summaryMap = new Map();

  registrations.forEach((reg) => {
    const key = `${reg.course_code}-${reg.component_type}`;

    if (!summaryMap.has(key)) {
      summaryMap.set(key, {
        ...reg,
        slots: [reg.slot_name],
      });
    } else {
      const existing = summaryMap.get(key);
      if (!existing.slots.includes(reg.slot_name)) {
        existing.slots.push(reg.slot_name);
      }
    }
  });

  const uniqueRegistrations = Array.from(summaryMap.values()).map((reg) => ({
    ...reg,
    slot_name: reg.slots.join(","),
  }));

  let summaryTable = `
    <div class="mt-3">
      <h6>📋 Registration Summary</h6>
      <table class="table table-sm">
        <thead>
          <tr>
            <th>Sl. No.</th>
            <th>Course Code</th>
            <th>Course Title</th>
            <th>Slot</th>
            <th>Venue</th>
            <th>Faculty</th>
            <th>Component</th>
          </tr>
        </thead>
        <tbody>
  `;

  uniqueRegistrations.forEach((reg, index) => {
    summaryTable += `
      <tr>
        <td>${index + 1}.</td>
        <td>${reg.course_code}</td>
        <td>${reg.course_name}</td>
        <td>${reg.slot_name}</td>
        <td>${reg.venue}</td>
        <td>${reg.faculty_name}</td>
        <td><span class="badge ${
          reg.component_type === "T"
            ? "bg-primary"
            : reg.component_type === "P"
            ? "bg-success"
            : "bg-secondary"
        }">${reg.component_type}</span></td>
      </tr>
    `;
  });

  summaryTable += "</tbody></table></div>";
  return summaryTable;
}

// Show timetable error
function showTimetableError(message) {
  const container = document.getElementById("standalone-timetable-container");
  if (container) {
    container.innerHTML = `
      <div class="alert alert-danger" style="text-align: center; padding: 30px;">
        <h5>❌ Error</h5>
        <p>${message}</p>
        <button class="btn btn-primary" onclick="initializeStandaloneTimetable()">
          🔄 Try Again
        </button>
      </div>
    `;
  }
}

// Show timetable alert
function showTimetableAlert(message, type = "info") {
  // You can implement this to show alerts in the timetable page
  console.log(`Timetable Alert (${type}): ${message}`);
}

// Make functions available globally
window.initializeStandaloneTimetable = initializeStandaloneTimetable;
window.loadSelectedTimetable = loadSelectedTimetable;

console.log("✅ student-timetable.js loaded successfully");
console.log("✅ initializeStandaloneTimetable is now available on window:", typeof window.initializeStandaloneTimetable);
