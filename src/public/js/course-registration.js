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

// Select a course
async function selectCourse(courseCode) {
  console.log(`📋 Loading details for course: ${courseCode}`);

  try {
    const response = await fetch(
      `${window.API_URL}/course-registration/course/${encodeURIComponent(
        courseCode
      )}`,
      {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to load course details`);
    }

    const details = await response.json();

    const courseInput = document.getElementById("working-course-input");
    if (courseInput) {
      courseInput.value = `${details.course_code} - ${details.course_name}`;
    }

    const resultsDiv = document.getElementById("working-course-results");
    if (resultsDiv) {
      resultsDiv.style.display = "none";
    }

    const detailsContent = document.getElementById("working-details-content");
    if (detailsContent) {
      detailsContent.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 6px; border: 1px solid #ddd;">
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
                <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">${details.course_code}</td>
                <td style="padding: 12px; border: 1px solid #ddd;">${details.course_name}</td>
                <td style="padding: 12px; border: 1px solid #ddd; text-align: center; font-weight: bold;">${details.theory}</td>
                <td style="padding: 12px; border: 1px solid #ddd; text-align: center; font-weight: bold;">${details.practical}</td>
                <td style="padding: 12px; border: 1px solid #ddd; text-align: center; font-weight: bold; color: #28a745;">${details.credits}</td>
              </tr>
            </tbody>
          </table>
          <div style="margin-top: 15px; color: #666; font-size: 14px;">
            <strong>T</strong> = Theory hours per week | 
            <strong>P</strong> = Practical hours per week | 
            <strong>C</strong> = Total Credits
          </div>
        </div>
      `;
    }

    const detailsDiv = document.getElementById("working-course-details");
    if (detailsDiv) {
      detailsDiv.style.display = "block";
    }

    console.log(`✅ Course details loaded for ${courseCode}`);

    // Phase 2: Load course offerings after showing course details
    await loadCourseOfferings(courseCode);
  } catch (error) {
    console.error("Error loading course details:", error);
    showAlert(`Error loading course details: ${error.message}`, "danger");
  }
}

// Fetch and display course offerings
async function loadCourseOfferings(courseCode) {
  const semesterSelect = document.getElementById("working-semester-select");
  if (!semesterSelect.value) {
    console.error("No semester selected");
    return;
  }

  const [year, type] = semesterSelect.value.split("|");

  try {
    console.log(
      `🔍 Loading course offerings for ${courseCode} - ${year} ${type}`
    );

    const response = await fetch(
      `${
        window.API_URL
      }/course-registration/course-offerings/${encodeURIComponent(
        courseCode
      )}/${encodeURIComponent(year)}/${encodeURIComponent(type)}`,
      {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      }
    );

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}: Failed to load course offerings`
      );
    }

    const data = await response.json();
    displayCourseOfferings(data);
  } catch (error) {
    console.error("Error loading course offerings:", error);
    showAlert(`Error loading course offerings: ${error.message}`, "danger");
  }
}

// Display course offerings table
function displayCourseOfferings(data) {
  const detailsContent = document.getElementById("working-details-content");
  if (!detailsContent) {
    console.error("Details content div not found");
    return;
  }

  const { course_info, offerings } = data;

  // Create course offerings table with responsive container
  const offeringsTable = `
    <div style="background: white; padding: 20px; border-radius: 6px; border: 1px solid #ddd; margin-top: 20px;">
      <h5 style="color: #007bff; margin-bottom: 15px;">📋 Step 4: Registration</h5>
      
      <!-- Responsive table container -->
      <div style="overflow-x: auto; border: 1px solid #ddd; border-radius: 4px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; min-width: 1000px;">
          <thead>
            <tr style="background: #28a745; color: white;">
              <th style="padding: 10px; text-align: left; border: 1px solid #ddd; min-width: 100px;">Course Code</th>
              <th style="padding: 10px; text-align: left; border: 1px solid #ddd; min-width: 150px;">Course Title</th>
              <th style="padding: 10px; text-align: center; border: 1px solid #ddd; min-width: 80px;">Course Type</th>
              <th style="padding: 10px; text-align: center; border: 1px solid #ddd; min-width: 150px;">Slots Offered</th>
              <th style="padding: 10px; text-align: center; border: 1px solid #ddd; min-width: 80px;">Venue</th>
              <th style="padding: 10px; text-align: left; border: 1px solid #ddd; min-width: 150px;">Faculty Name</th>
              <th style="padding: 10px; text-align: center; border: 1px solid #ddd; min-width: 80px;">Available Seats</th>
              <th style="padding: 10px; text-align: center; border: 1px solid #ddd; min-width: 80px;">Register</th>
              <th style="padding: 10px; text-align: center; border: 1px solid #ddd; min-width: 80px;">Delete</th>
            </tr>
          </thead>
          <tbody>
            ${offerings
              .map(
                (offering, index) => `
              <tr style="background: ${index % 2 === 0 ? "#f8f9fa" : "white"};">
                <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">${
                  offering.course_code
                }</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${
                  offering.course_title
                }</td>
                <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">
                  <span style="
                    background: ${
                      offering.course_type === "T"
                        ? "#007bff"
                        : offering.course_type === "P"
                        ? "#28a745"
                        : "#ffc107"
                    }; 
                    color: ${
                      offering.course_type === "TEL" ? "#000" : "white"
                    }; 
                    padding: 4px 8px; 
                    border-radius: 4px; 
                    font-weight: bold; 
                    font-size: 12px;
                  ">
                    ${offering.course_type}
                  </span>
                </td>
                <td style="padding: 10px; border: 1px solid #ddd; text-align: center; font-weight: bold;">
                  ${offering.slots_offered}
                </td>
                <td style="padding: 10px; border: 1px solid #ddd; text-align: center; font-weight: bold;">
                  ${offering.venue}
                </td>
                <td style="padding: 10px; border: 1px solid #ddd;">${
                  offering.faculty_name
                }</td>
                <td style="padding: 10px; border: 1px solid #ddd; text-align: center; font-weight: bold; color: #28a745;">
                  ${offering.available_seats}
                </td>
                <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">
                  <button 
                    onclick="registerCourseOffering('${
                      offering.course_code
                    }', '${offering.slots_offered}', '${offering.course_type}')"
                    style="background: #28a745; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; white-space: nowrap;"
                    onmouseover="this.style.background='#218838'"
                    onmouseout="this.style.background='#28a745'">
                    Register
                  </button>
                </td>
                <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">
                  <button 
                    onclick="deleteCourseOffering('${offering.course_code}', '${
                  offering.slots_offered
                }', '${offering.course_type}')"
                    style="background: #dc3545; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; white-space: nowrap;"
                    onmouseover="this.style.background='#c82333'"
                    onmouseout="this.style.background='#dc3545'">
                    Delete
                  </button>
                </td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
      
      <div style="margin-top: 15px; padding: 10px; background: #e9ecef; border-radius: 4px; font-size: 13px; color: #666;">
        <strong>Legend:</strong> 
        <span style="background: #007bff; color: white; padding: 2px 6px; border-radius: 3px; margin-left: 10px;">T</span> Theory Only | 
        <span style="background: #28a745; color: white; padding: 2px 6px; border-radius: 3px; margin-left: 5px;">P</span> Practical/Lab Only
        <br><br>
        📍 <strong>Total Offerings:</strong> ${
          offerings.length
        } option(s) available for this course
        <br><small style="color: #999; font-style: italic;">💡 Tip: Scroll horizontally if table extends beyond screen width</small>
      </div>
    </div>
  `;

  // Add the offerings table to existing content
  const existingContent = detailsContent.innerHTML;
  detailsContent.innerHTML = existingContent + offeringsTable;

  console.log(
    `✅ Displayed ${offerings.length} course offerings for ${course_info.course_code}`
  );
}

// Placeholder functions for Register/Delete buttons (Phase 3)
function registerCourseOffering(courseCode, slotOffered, courseType) {
  console.log(`📝 Register: ${courseCode} - ${slotOffered} (${courseType})`);
  showAlert(
    `Register functionality will be implemented in Phase 3. Selected: ${courseCode} - ${slotOffered} (${courseType})`,
    "info"
  );
}

function deleteCourseOffering(courseCode, slotOffered, courseType) {
  console.log(`🗑️ Delete: ${courseCode} - ${slotOffered} (${courseType})`);
  showAlert(
    `Delete functionality will be implemented in Phase 3. Selected: ${courseCode} - ${slotOffered} (${courseType})`,
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
window.loadCourseOfferings = loadCourseOfferings;
window.registerCourseOffering = registerCourseOffering;
window.deleteCourseOffering = deleteCourseOffering;
