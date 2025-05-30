// Working Course Registration Module
let availableCourses = [];

// Initialize course registration functionality
function initializeCourseRegistration() {
  console.log("🚀 Initializing working course registration...");

  // Replace the content with working version
  replaceWithWorkingCourseRegistration();
}

// Replace with working interface
function replaceWithWorkingCourseRegistration() {
  console.log("🔄 Setting up working course registration interface...");

  // Find and replace the course registration content
  const courseRegistrationContent = document.getElementById(
    "student-course-registration-content"
  );
  if (!courseRegistrationContent) {
    console.error("Course registration content not found");
    return;
  }

  // Replace with working content
  courseRegistrationContent.innerHTML = `
    <div style="padding: 20px; background: white; min-height: 80vh;">
      <div style="max-width: 900px; margin: 0 auto;">
        <h2 style="color: #007bff; margin-bottom: 30px;">
          📚 Course Registration
        </h2>
        
        <!-- Step 1: Semester Selection -->
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h4 style="margin-bottom: 15px;">Step 1: Select Academic Year & Semester</h4>
          <select id="working-semester-select" 
                  style="width: 100%; max-width: 400px; padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 16px;">
            <option value="">Loading semesters...</option>
          </select>
        </div>
        
        <!-- Step 2: Course Search -->
        <div id="working-course-search" style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; display: none;">
          <h4 style="margin-bottom: 15px;">Step 2: Search and Select Course</h4>
          <input type="text" 
                 id="working-course-input" 
                 placeholder="Type course code or course name..." 
                 style="width: 100%; max-width: 500px; padding: 12px; border: 1px solid #ccc; border-radius: 4px; font-size: 16px; margin-bottom: 15px;">
          
          <div id="working-course-results" 
               style="background: white; border: 1px solid #ddd; border-radius: 4px; max-height: 300px; overflow-y: auto; display: none;">
          </div>
          
          <small style="color: #666;">Start typing to search available courses...</small>
        </div>
        
        <!-- Step 3: Course Details -->
        <div id="working-course-details" style="background: #f8f9fa; padding: 20px; border-radius: 8px; display: none;">
          <h4 style="margin-bottom: 15px;">Step 3: Course Details</h4>
          <div id="working-details-content"></div>
        </div>
      </div>
    </div>
  `;

  // Initialize the working functionality
  initializeWorkingFunctionality();
}

// Initialize working functionality
async function initializeWorkingFunctionality() {
  console.log("⚙️ Setting up course registration functionality...");

  // Load semesters
  try {
    const response = await fetch(
      `${window.API_URL}/course-registration/semesters`,
      {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to load semesters`);
    }

    const semesters = await response.json();
    console.log(`✅ Loaded ${semesters.length} semesters`);

    const semesterSelect = document.getElementById("working-semester-select");
    if (!semesterSelect) {
      console.error("Semester select element not found");
      return;
    }

    semesterSelect.innerHTML =
      '<option value="">Select Academic Year & Semester</option>';

    semesters.forEach((semester) => {
      const option = document.createElement("option");
      option.value = `${semester.slot_year}|${semester.semester_type}`;
      option.textContent = `${semester.slot_year} - ${semester.semester_type}`;
      semesterSelect.appendChild(option);
    });

    // Semester change handler
    semesterSelect.addEventListener("change", async function () {
      const courseSearchDiv = document.getElementById("working-course-search");
      const courseDetailsDiv = document.getElementById(
        "working-course-details"
      );

      if (!this.value) {
        courseSearchDiv.style.display = "none";
        courseDetailsDiv.style.display = "none";
        return;
      }

      const [year, type] = this.value.split("|");

      try {
        const coursesResponse = await fetch(
          `${
            window.API_URL
          }/course-registration/courses?slot_year=${encodeURIComponent(
            year
          )}&semester_type=${encodeURIComponent(type)}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        if (!coursesResponse.ok) {
          throw new Error(
            `HTTP ${coursesResponse.status}: Failed to load courses`
          );
        }

        availableCourses = await coursesResponse.json();

        const courseInput = document.getElementById("working-course-input");
        if (courseInput) {
          courseInput.placeholder = `Search ${availableCourses.length} courses...`;
          courseInput.value = "";
        }

        courseSearchDiv.style.display = "block";
        courseDetailsDiv.style.display = "none";

        const resultsDiv = document.getElementById("working-course-results");
        if (resultsDiv) {
          resultsDiv.style.display = "none";
        }

        console.log(
          `✅ Loaded ${availableCourses.length} courses for ${year} ${type}`
        );
      } catch (error) {
        console.error("Error loading courses:", error);
        showAlert(`Error loading courses: ${error.message}`, "danger");
      }
    });

    // Course search handler
    const courseInput = document.getElementById("working-course-input");
    if (courseInput) {
      courseInput.addEventListener("input", handleCourseSearch);
      console.log("✅ Course search handler attached");
    }

    console.log(
      "✅ Course registration functionality initialized successfully!"
    );
  } catch (error) {
    console.error("Error initializing course registration:", error);
    showAlert(
      `Error initializing course registration: ${error.message}`,
      "danger"
    );
  }
}

// Handle course search
function handleCourseSearch() {
  const courseInput = document.getElementById("working-course-input");
  const resultsDiv = document.getElementById("working-course-results");

  if (!courseInput || !resultsDiv) {
    console.error("Course input or results div not found");
    return;
  }

  const term = courseInput.value.toLowerCase().trim();

  if (term.length < 1) {
    resultsDiv.style.display = "none";
    return;
  }

  const filtered = availableCourses.filter(
    (course) =>
      course.course_code.toLowerCase().includes(term) ||
      course.course_name.toLowerCase().includes(term)
  );

  if (filtered.length === 0) {
    resultsDiv.innerHTML =
      '<div style="padding: 15px; color: #666;">No courses found matching your search</div>';
  } else {
    resultsDiv.innerHTML = filtered
      .map(
        (course) => `
      <div onclick="selectCourse('${course.course_code}')" 
           style="padding: 15px; border-bottom: 1px solid #eee; cursor: pointer;"
           onmouseover="this.style.backgroundColor='#f0f0f0'"
           onmouseout="this.style.backgroundColor='white'">
        <div style="font-weight: bold; color: #007bff;">${course.course_code}</div>
        <div style="color: #666; font-size: 14px;">${course.course_name}</div>
      </div>
    `
      )
      .join("");
  }

  resultsDiv.style.display = "block";
  console.log(`🔍 Found ${filtered.length} courses matching "${term}"`);
}

// Enhanced selectCourse function with Phase 2 support
async function selectCourse(courseCode) {
  console.log(`📋 Loading details for course: ${courseCode}`);

  // Get current semester selection
  const semesterSelect = document.getElementById("working-semester-select");
  if (!semesterSelect || !semesterSelect.value) {
    showAlert("Please select a semester first", "warning");
    return;
  }

  const [slot_year, semester_type] = semesterSelect.value.split("|");

  try {
    // Enhanced API call with semester parameters
    const response = await fetch(
      `${window.API_URL}/course-registration/course/${encodeURIComponent(
        courseCode
      )}?slot_year=${encodeURIComponent(
        slot_year
      )}&semester_type=${encodeURIComponent(semester_type)}`,
      {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to load course details`);
    }

    const details = await response.json();

    // Update course input
    const courseInput = document.getElementById("working-course-input");
    if (courseInput) {
      courseInput.value = `${details.course_code} - ${details.course_name}`;
    }

    // Hide results
    const resultsDiv = document.getElementById("working-course-results");
    if (resultsDiv) {
      resultsDiv.style.display = "none";
    }

    // Render both Phase 1 and Phase 2 content
    const detailsContent = document.getElementById("working-details-content");
    if (detailsContent) {
      detailsContent.innerHTML = `
          <!-- Phase 1: T-P-C Table -->
          <div style="background: white; padding: 20px; border-radius: 6px; border: 1px solid #ddd; margin-bottom: 20px;">
            <h5 style="margin-bottom: 15px; color: #007bff;">Course Information</h5>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #007bff; color: white;">
                  <th style="padding: 12px; text-align: left;">Course Code</th>
                  <th style="padding: 12px; text-align: left;">Course Title</th>
                  <th style="padding: 12px; text-align: center;">Theory (T)</th>
                  <th style="padding: 12px; text-align: center;">Practical (P)</th>
                  <th style="padding: 12px; text-align: center;">Credits (C)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">${
                    details.course_code
                  }</td>
                  <td style="padding: 12px; border: 1px solid #ddd;">${
                    details.course_name
                  }</td>
                  <td style="padding: 12px; border: 1px solid #ddd; text-align: center; font-weight: bold;">${
                    details.theory
                  }</td>
                  <td style="padding: 12px; border: 1px solid #ddd; text-align: center; font-weight: bold;">${
                    details.practical
                  }</td>
                  <td style="padding: 12px; border: 1px solid #ddd; text-align: center; font-weight: bold; color: #28a745;">${
                    details.credits
                  }</td>
                </tr>
              </tbody>
            </table>
            <div style="margin-top: 15px; color: #666; font-size: 14px;">
              <strong>T</strong> = Theory hours per week | 
              <strong>P</strong> = Practical hours per week | 
              <strong>C</strong> = Total Credits
            </div>
          </div>
  
          <!-- Phase 2: Slot Offerings Table -->
          ${renderSlotOfferingsTable(details)}
        `;
    }

    const detailsDiv = document.getElementById("working-course-details");
    if (detailsDiv) {
      detailsDiv.style.display = "block";
    }

    console.log(`✅ Course details loaded for ${courseCode}`);
  } catch (error) {
    console.error("Error loading course details:", error);
    showAlert(`Error loading course details: ${error.message}`, "danger");
  }
}

// New function to render Phase 2 slot offerings table
function renderSlotOfferingsTable(details) {
  if (
    !details.slot_offerings ||
    details.slot_offerings.all_slots.length === 0
  ) {
    return `
        <div style="background: white; padding: 20px; border-radius: 6px; border: 1px solid #ddd;">
          <h5 style="margin-bottom: 15px; color: #007bff;">Course Offerings</h5>
          <div style="text-align: center; color: #666; padding: 20px;">
            No slot offerings available for this course in the selected semester.
          </div>
        </div>
      `;
  }

  const { course_type, slot_offerings } = details;
  const { theory_slots, lab_slots, all_slots } = slot_offerings;

  // Determine which slots to display based on course type
  let slotsToDisplay = [];
  if (course_type === "T") {
    slotsToDisplay = theory_slots; // Theory only
  } else if (course_type === "P") {
    slotsToDisplay = lab_slots; // Lab only
  } else if (course_type === "TEL") {
    slotsToDisplay = all_slots; // Both theory and lab
  }

  // Group slots by unique combinations for display
  const uniqueOfferings = [];
  const seen = new Set();

  slotsToDisplay.forEach((slot) => {
    const key = `${slot.slot_name}-${slot.venue}-${slot.faculty_name}`;
    if (!seen.has(key)) {
      seen.add(key);

      // Find all slots for this combination
      const relatedSlots = slotsToDisplay.filter(
        (s) =>
          s.slot_name === slot.slot_name &&
          s.venue === slot.venue &&
          s.faculty_name === slot.faculty_name
      );

      uniqueOfferings.push({
        ...slot,
        slot_count: relatedSlots.length,
        all_days: relatedSlots.map((s) => s.slot_day).join(", "),
      });
    }
  });

  return `
      <div style="background: white; padding: 20px; border-radius: 6px; border: 1px solid #ddd;">
        <h5 style="margin-bottom: 15px; color: #007bff;">Registration - ${
          course_type === "T"
            ? "Theory Only"
            : course_type === "P"
            ? "Lab Only"
            : "Theory + Lab"
        }</h5>
        
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #28a745; color: white;">
              <th style="padding: 12px; text-align: left;">Course Code</th>
              <th style="padding: 12px; text-align: left;">Course Title</th>
              <th style="padding: 12px; text-align: center;">Course Type</th>
              <th style="padding: 12px; text-align: center;">Slots Offered</th>
              <th style="padding: 12px; text-align: left;">Venue</th>
              <th style="padding: 12px; text-align: left;">Faculty Name</th>
              <th style="padding: 12px; text-align: center;">Available Seats</th>
              <th style="padding: 12px; text-align: center;">Register</th>
              <th style="padding: 12px; text-align: center;">Delete</th>
            </tr>
          </thead>
          <tbody>
            ${uniqueOfferings
              .map(
                (offering, index) => `
              <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">${
                  details.course_code
                }</td>
                <td style="padding: 12px; border: 1px solid #ddd;">${
                  details.course_name
                }</td>
                <td style="padding: 12px; border: 1px solid #ddd; text-align: center;">
                  <span style="background: ${
                    course_type === "T"
                      ? "#007bff"
                      : course_type === "P"
                      ? "#17a2b8"
                      : "#6f42c1"
                  }; 
                               color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                    ${course_type}
                  </span>
                </td>
                <td style="padding: 12px; border: 1px solid #ddd; text-align: center;">
                  <div style="font-weight: bold; color: #007bff;">${
                    offering.slot_name
                  }</div>
                  <div style="font-size: 12px; color: #666;">${
                    offering.slot_time
                  }</div>
                  <div style="font-size: 11px; color: #888;">${
                    offering.all_days
                  }</div>
                </td>
                <td style="padding: 12px; border: 1px solid #ddd;">
                  <span style="background: #f8f9fa; padding: 4px 8px; border-radius: 4px; font-weight: bold;">
                    ${offering.venue}
                  </span>
                </td>
                <td style="padding: 12px; border: 1px solid #ddd;">${
                  offering.faculty_name
                }</td>
                <td style="padding: 12px; border: 1px solid #ddd; text-align: center;">
                  <span style="color: ${
                    offering.available_seats > 10
                      ? "#28a745"
                      : offering.available_seats > 5
                      ? "#ffc107"
                      : "#dc3545"
                  }; 
                               font-weight: bold;">
                    ${offering.available_seats}
                  </span>
                </td>
                <td style="padding: 12px; border: 1px solid #ddd; text-align: center;">
                  <input type="radio" 
                         name="course_registration_${details.course_code}" 
                         value="register_${index}"
                         onchange="handleRegistrationChange('${
                           details.course_code
                         }', 'register', ${index})"
                         style="transform: scale(1.2);">
                </td>
                <td style="padding: 12px; border: 1px solid #ddd; text-align: center;">
                  <input type="radio" 
                         name="course_registration_${details.course_code}" 
                         value="delete_${index}"
                         onchange="handleRegistrationChange('${
                           details.course_code
                         }', 'delete', ${index})"
                         style="transform: scale(1.2);">
                </td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
        
        <div style="margin-top: 15px; color: #666; font-size: 14px;">
          <strong>Course Type:</strong> 
          T = Theory Only | P = Lab Only | TEL = Theory Embedded Lab<br>
          <strong>Available Seats:</strong> Based on venue capacity
        </div>
      </div>
    `;
}

// New function to handle registration/delete radio button changes
function handleRegistrationChange(courseCode, action, index) {
  console.log(
    `📝 ${action.toUpperCase()} selected for course: ${courseCode}, offering index: ${index}`
  );

  // Here you can add logic to handle the registration/deletion
  // For now, just show a confirmation
  const actionText = action === "register" ? "register for" : "delete from";
  showAlert(
    `You selected to ${actionText} ${courseCode} (Option ${index + 1})`,
    "info"
  );
}

// Show alert message
function showAlert(message, type = "info") {
  const alertContainer = document.getElementById("student-alert-container");
  if (!alertContainer) {
    console.log(`Alert: ${message}`);
    return;
  }

  alertContainer.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
  `;
}

// Make functions available globally
window.initializeCourseRegistration = initializeCourseRegistration;
window.selectCourse = selectCourse;
window.handleRegistrationChange = handleRegistrationChange;
