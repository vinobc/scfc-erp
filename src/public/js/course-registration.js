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
  // Force remove spacing from all parent containers
  function removeParentSpacing() {
    const parents = [
      document.body,
      document.querySelector(".main-content"),
      document.querySelector("#content"),
      document.querySelector(".container-fluid"),
      document.querySelector(".student-page"),
      document.querySelector(".col-md-9"), // Target Bootstrap column
      document.querySelector(".col-lg-10"), // Target Bootstrap column
      courseRegistrationContent.parentElement,
      courseRegistrationContent.parentElement?.parentElement,
      courseRegistrationContent.parentElement?.parentElement?.parentElement,
    ];

    parents.forEach((parent) => {
      if (parent) {
        parent.style.paddingLeft = "0px !important";
        parent.style.marginLeft = "0px !important";
        parent.style.paddingRight = "15px"; // Keep some right padding
        // Specifically target Bootstrap column padding
        if (
          parent.classList.contains("col-md-9") ||
          parent.classList.contains("col-lg-10")
        ) {
          parent.style.paddingLeft = "0px !important";
          parent.style.paddingRight = "15px !important";
        }
        console.log(
          "Removed spacing from:",
          parent.className || parent.tagName
        );
      }
    });

    // Also try to find and modify the column that contains our content
    const columnParent = courseRegistrationContent.closest(
      ".col-md-9, .col-lg-10"
    );
    if (columnParent) {
      columnParent.style.paddingLeft = "0px !important";
      columnParent.style.paddingRight = "15px !important";
      console.log("Found and modified column parent:", columnParent.className);
    }
  }

  // Call it before replacing content
  removeParentSpacing();

  // Replace with working content
  courseRegistrationContent.innerHTML = `
    <div style="padding: 0; background: white; min-height: 80vh; margin: 0; position: relative; left: -20px;">
      <div style="max-width: none; margin: 0; padding: 20px;">
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
        await loadCreditSummary();
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

// Display course offerings table - UPDATED FOR TEL COURSES
function displayCourseOfferings(data) {
  const detailsContent = document.getElementById("working-details-content");
  if (!detailsContent) {
    console.error("Details content div not found");
    return;
  }

  const { course_info, offerings } = data;

  // Find existing course details table and preserve it
  const existingTable = detailsContent.querySelector("table");
  let courseDetailsTable = "";

  if (existingTable) {
    const tableContainer = existingTable.closest(
      'div[style*="background: white"]'
    );
    if (tableContainer) {
      courseDetailsTable = tableContainer.outerHTML;
    }
  }

  // Check if this is a TEL course
  const isTELCourse =
    course_info.course_type === "TEL" ||
    (course_info.theory > 0 && course_info.practical > 0);

  let offeringsTable = "";

  if (isTELCourse) {
    // TEL Course: Show theory and practical sections separately
    const theoryOfferings = offerings.filter((o) => o.course_type === "T");
    const practicalOfferings = offerings.filter((o) => o.course_type === "P");

    offeringsTable = `
      <div style="background: white; padding: 20px; border-radius: 6px; border: 1px solid #ddd; margin-top: 20px;">
        <h5 style="color: #007bff; margin-bottom: 15px;">📋 Step 4: Registration</h5>
        
        <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
          <h6 style="color: #856404; margin: 0 0 10px 0;">⚠️ TEL Course Registration Requirements:</h6>
          <ul style="margin: 0; color: #856404;">
            <li><strong>You MUST register for BOTH Theory AND Practical components</strong></li>
            <li>Select 1 theory slot + 1 practical slot</li>
            <li>Total credits: ${
              course_info.credits
            } (for both components combined)</li>
          </ul>
        </div>

        <!-- Theory Section -->
        <div style="margin-bottom: 30px;">
          <h6 style="color: #007bff; margin-bottom: 10px;">🎓 Theory Component (Select 1):</h6>
          <div style="overflow-x: auto; border: 1px solid #ddd; border-radius: 4px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px; min-width: 800px;">
              <thead>
                <tr style="background: #007bff; color: white;">
                  <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">Select</th>
                  <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">Slot</th>
                  <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">Venue</th>
                  <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Faculty</th>
                  <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">Available Seats</th>
                </tr>
              </thead>
              <tbody>
                ${theoryOfferings
                  .map(
                    (offering, index) => `
                  <tr style="background: ${
                    index % 2 === 0 ? "#f8f9fa" : "white"
                  };">
                    <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">
                      <input type="radio" name="theory-selection" value="${
                        offering.slots_offered
                      }" 
                             data-venue="${offering.venue}" data-faculty="${
                      offering.faculty_name
                    }"
                             onchange="updateTELSelection()">
                    </td>
                    <td style="padding: 10px; border: 1px solid #ddd; text-align: center; font-weight: bold;">${
                      offering.slots_offered
                    }</td>
                    <td style="padding: 10px; border: 1px solid #ddd; text-align: center; font-weight: bold;">${
                      offering.venue
                    }</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${
                      offering.faculty_name
                    }</td>
                    <td style="padding: 10px; border: 1px solid #ddd; text-align: center; font-weight: bold; color: #28a745;">${
                      offering.available_seats
                    }</td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Practical Section -->
        <div style="margin-bottom: 30px;">
          <h6 style="color: #28a745; margin-bottom: 10px;">🔬 Practical Component (Select 1):</h6>
          <div style="overflow-x: auto; border: 1px solid #ddd; border-radius: 4px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px; min-width: 800px;">
              <thead>
                <tr style="background: #28a745; color: white;">
                  <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">Select</th>
                  <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">Slot</th>
                  <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">Venue</th>
                  <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Faculty</th>
                  <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">Available Seats</th>
                </tr>
              </thead>
              <tbody>
                ${practicalOfferings
                  .map(
                    (offering, index) => `
                  <tr style="background: ${
                    index % 2 === 0 ? "#f8f9fa" : "white"
                  };">
                    <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">
                      <input type="radio" name="practical-selection" value="${
                        offering.slots_offered
                      }"
                             data-venue="${offering.venue}" data-faculty="${
                      offering.faculty_name
                    }" 
                             onchange="updateTELSelection()">
                    </td>
                    <td style="padding: 10px; border: 1px solid #ddd; text-align: center; font-weight: bold;">${
                      offering.slots_offered
                    }</td>
                    <td style="padding: 10px; border: 1px solid #ddd; text-align: center; font-weight: bold;">${
                      offering.venue
                    }</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${
                      offering.faculty_name
                    }</td>
                    <td style="padding: 10px; border: 1px solid #ddd; text-align: center; font-weight: bold; color: #28a745;">${
                      offering.available_seats
                    }</td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Registration Button -->
        <div style="text-align: center; margin-top: 20px;">
          <button id="register-tel-course" 
                  style="background: #ffc107; color: #000; border: none; padding: 12px 30px; border-radius: 4px; 
                         cursor: not-allowed; font-size: 16px; font-weight: bold;" 
                  disabled onclick="registerTELCourse('${
                    course_info.course_code
                  }')">
            🔄 Select Both Theory & Practical First
          </button>
          
          <button id="delete-tel-course" 
                  style="background: #dc3545; color: white; border: none; padding: 12px 30px; border-radius: 4px; 
                         cursor: pointer; font-size: 16px; font-weight: bold; margin-left: 10px;" 
                  onclick="deleteCourseOffering('${
                    course_info.course_code
                  }', '', 'TEL')">
            🗑️ Delete Registration
          </button>
        </div>

        <div id="tel-selection-status" style="margin-top: 15px; padding: 10px; background: #f8f9fa; border-radius: 4px; text-align: center; color: #666;">
          Please select both theory and practical components to continue.
        </div>
      </div>
    `;
  } else {
    // Regular T-only or P-only course: Show existing table format
    offeringsTable = `
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
                <tr style="background: ${
                  index % 2 === 0 ? "#f8f9fa" : "white"
                };">
                  <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">${
                    offering.course_code
                  }</td>
                  <td style="padding: 10px; border: 1px solid #ddd;">${
                    offering.course_title
                  }</td>
                  <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">
                    <span style="background: ${
                      offering.course_type === "T" ? "#007bff" : "#28a745"
                    }; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 12px;">
                      ${offering.course_type}
                    </span>
                  </td>
                  <td style="padding: 10px; border: 1px solid #ddd; text-align: center; font-weight: bold;">${
                    offering.slots_offered
                  }</td>
                  <td style="padding: 10px; border: 1px solid #ddd; text-align: center; font-weight: bold;">${
                    offering.venue
                  }</td>
                  <td style="padding: 10px; border: 1px solid #ddd;">${
                    offering.faculty_name
                  }</td>
                  <td style="padding: 10px; border: 1px solid #ddd; text-align: center; font-weight: bold; color: #28a745;">${
                    offering.available_seats
                  }</td>
                  <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">
                    <button onclick="registerCourseOffering('${
                      offering.course_code
                    }', '${offering.slots_offered}', '${offering.course_type}')"
                            style="background: #28a745; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; white-space: nowrap;"
                            onmouseover="this.style.background='#218838'" onmouseout="this.style.background='#28a745'">
                      Register
                    </button>
                  </td>
                  <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">
                    <button onclick="deleteCourseOffering('${
                      offering.course_code
                    }', '${offering.slots_offered}', '${offering.course_type}')"
                            style="background: #dc3545; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; white-space: nowrap;"
                            onmouseover="this.style.background='#c82333'" onmouseout="this.style.background='#dc3545'">
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
        </div>
      </div>
    `;
  }

  // Replace entire content with course details + new offerings
  detailsContent.innerHTML = courseDetailsTable + offeringsTable;

  console.log(
    `✅ Displayed ${offerings.length} course offerings for ${
      course_info.course_code
    } (${isTELCourse ? "TEL" : "Regular"} course)`
  );
}

// Register course offering - WORKING VERSION
async function registerCourseOffering(courseCode, slotOffered, courseType) {
  console.log(`📝 Register: ${courseCode} - ${slotOffered} (${courseType})`);

  try {
    // Get current semester selection
    const semesterSelect = document.getElementById("working-semester-select");
    if (!semesterSelect.value) {
      showAlert("Please select a semester first", "warning");
      return;
    }

    const [year, type] = semesterSelect.value.split("|");

    // Get course and faculty details for this offering
    const offeringData = await getCourseOfferingDetails(
      courseCode,
      slotOffered,
      year,
      type
    );
    if (!offeringData) {
      showAlert("Could not find offering details", "danger");
      return;
    }

    // Prepare registration data
    const registrationData = {
      course_code: courseCode,
      slot_name: slotOffered,
      slot_year: year,
      semester_type: type,
      venue: offeringData.venue,
      faculty_name: offeringData.faculty_name,
    };

    console.log("📤 Sending registration request:", registrationData);

    // Call registration API
    const response = await fetch(
      `${window.API_URL}/course-registration/register`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(registrationData),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.message || `HTTP ${response.status}: Registration failed`
      );
    }

    console.log("✅ Registration successful:", result);

    // Show success message
    showAlert(
      `✅ Successfully registered for ${courseCode} - ${slotOffered}! ` +
        `Credits: ${result.registration.credits}, Total Credits: ${result.registration.new_total_credits}`,
      "success"
    );

    // Refresh credit summary
    await loadCreditSummary();

    // Refresh timetable if it's currently displayed
    await refreshTimetableIfVisible();

    // Refresh the course offerings to show updated state
    await loadCourseOfferings(courseCode);
  } catch (error) {
    console.error("Registration error:", error);
    showAlert(`❌ Registration failed: ${error.message}`, "danger");
  }
}

// Delete course offering - WORKING VERSION
async function deleteCourseOffering(courseCode, slotOffered, courseType) {
  console.log(`🗑️ Delete: ${courseCode} - ${slotOffered} (${courseType})`);

  // Confirm deletion
  if (
    !confirm(
      `Are you sure you want to delete your registration for ${courseCode}?\n\nThis will remove ALL components (theory and practical) for this course.`
    )
  ) {
    return;
  }

  try {
    // Get current semester selection
    const semesterSelect = document.getElementById("working-semester-select");
    if (!semesterSelect.value) {
      showAlert("Please select a semester first", "warning");
      return;
    }

    const [year, type] = semesterSelect.value.split("|");

    // Prepare deletion data
    const deletionData = {
      course_code: courseCode,
      slot_year: year,
      semester_type: type,
    };

    console.log("📤 Sending deletion request:", deletionData);

    // Call deletion API
    const response = await fetch(
      `${window.API_URL}/course-registration/delete`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(deletionData),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.message || `HTTP ${response.status}: Deletion failed`
      );
    }

    console.log("✅ Deletion successful:", result);

    // Show success message
    showAlert(
      `✅ Successfully deleted registration for ${courseCode}! ` +
        `(${result.deleted_registrations} registration(s) removed)`,
      "success"
    );

    // Refresh timetable if it's currently displayed
    await refreshTimetableIfVisible();

    // Refresh the course offerings to show updated state
    await loadCourseOfferings(courseCode);
  } catch (error) {
    console.error("Deletion error:", error);
    showAlert(`❌ Deletion failed: ${error.message}`, "danger");
  }
}

// Helper function to get course offering details
async function getCourseOfferingDetails(courseCode, slotOffered, year, type) {
  try {
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
      throw new Error(`Failed to get offering details`);
    }

    const data = await response.json();

    // Find the specific offering
    const offering = data.offerings.find(
      (off) => off.slots_offered === slotOffered
    );

    if (offering) {
      return {
        venue: offering.venue,
        faculty_name: offering.faculty_name,
        available_seats: offering.available_seats,
      };
    }

    return null;
  } catch (error) {
    console.error("Error getting offering details:", error);
    return null;
  }
}

// Enhanced show alert function with auto-dismiss
function showAlert(message, type = "info") {
  const alertContainer = document.getElementById("student-alert-container");
  if (!alertContainer) {
    console.log(`Alert: ${message}`);
    return;
  }

  // Clear any existing alerts
  alertContainer.innerHTML = "";

  const alertId = `alert-${Date.now()}`;

  alertContainer.innerHTML = `
    <div id="${alertId}" class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
  `;

  // Auto-dismiss success and info alerts after 5 seconds
  if (type === "success" || type === "info") {
    setTimeout(() => {
      const alert = document.getElementById(alertId);
      if (alert) {
        alert.remove();
      }
    }, 5000);
  }

  // Scroll alert into view
  alertContainer.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// TEL Course Selection Handler
function updateTELSelection() {
  const theorySelection = document.querySelector(
    'input[name="theory-selection"]:checked'
  );
  const practicalSelection = document.querySelector(
    'input[name="practical-selection"]:checked'
  );
  const registerButton = document.getElementById("register-tel-course");
  const statusDiv = document.getElementById("tel-selection-status");

  if (theorySelection && practicalSelection) {
    // Both components selected
    registerButton.disabled = false;
    registerButton.style.background = "#28a745";
    registerButton.style.cursor = "pointer";
    registerButton.innerHTML = "✅ Register Theory + Practical";

    statusDiv.innerHTML = `
      <div style="color: #28a745;">
        <strong>✅ Ready to register:</strong><br>
        Theory: ${theorySelection.value} (${theorySelection.dataset.venue}, ${theorySelection.dataset.faculty})<br>
        Practical: ${practicalSelection.value} (${practicalSelection.dataset.venue}, ${practicalSelection.dataset.faculty})
      </div>
    `;
  } else if (theorySelection || practicalSelection) {
    // Only one component selected
    registerButton.disabled = true;
    registerButton.style.background = "#ffc107";
    registerButton.style.cursor = "not-allowed";
    registerButton.innerHTML = "🔄 Select Missing Component";

    statusDiv.innerHTML = `
      <div style="color: #856404;">
        <strong>⚠️ Selection incomplete:</strong><br>
        ${theorySelection ? "✅ Theory selected" : "❌ Theory not selected"}<br>
        ${
          practicalSelection
            ? "✅ Practical selected"
            : "❌ Practical not selected"
        }
      </div>
    `;
  } else {
    // Nothing selected
    registerButton.disabled = true;
    registerButton.style.background = "#6c757d";
    registerButton.style.cursor = "not-allowed";
    registerButton.innerHTML = "🔄 Select Both Components";

    statusDiv.innerHTML = `
      <div style="color: #666;">
        Please select both theory and practical components to continue.
      </div>
    `;
  }
}

// Register TEL Course (both components)
async function registerTELCourse(courseCode) {
  const theorySelection = document.querySelector(
    'input[name="theory-selection"]:checked'
  );
  const practicalSelection = document.querySelector(
    'input[name="practical-selection"]:checked'
  );

  if (!theorySelection || !practicalSelection) {
    showAlert("Please select both theory and practical components", "warning");
    return;
  }

  try {
    // Get current semester selection
    const semesterSelect = document.getElementById("working-semester-select");
    if (!semesterSelect.value) {
      showAlert("Please select a semester first", "warning");
      return;
    }

    const [year, type] = semesterSelect.value.split("|");

    console.log(`📝 Registering TEL course: ${courseCode}`);
    console.log(
      `Theory: ${theorySelection.value}, Practical: ${practicalSelection.value}`
    );

    // Register theory component
    const theoryRegistration = {
      course_code: courseCode,
      slot_name: theorySelection.value,
      slot_year: year,
      semester_type: type,
      venue: theorySelection.dataset.venue,
      faculty_name: theorySelection.dataset.faculty,
    };

    console.log("📤 Registering theory component:", theoryRegistration);

    const theoryResponse = await fetch(
      `${window.API_URL}/course-registration/register`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(theoryRegistration),
      }
    );

    const theoryResult = await theoryResponse.json();

    if (!theoryResponse.ok) {
      throw new Error(`Theory registration failed: ${theoryResult.message}`);
    }

    console.log("✅ Theory component registered successfully");

    // Register practical component
    const practicalRegistration = {
      course_code: courseCode,
      slot_name: practicalSelection.value,
      slot_year: year,
      semester_type: type,
      venue: practicalSelection.dataset.venue,
      faculty_name: practicalSelection.dataset.faculty,
    };

    console.log("📤 Registering practical component:", practicalRegistration);

    const practicalResponse = await fetch(
      `${window.API_URL}/course-registration/register`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(practicalRegistration),
      }
    );

    const practicalResult = await practicalResponse.json();

    if (!practicalResponse.ok) {
      // If practical registration fails, we should ideally rollback theory registration
      // For now, just show the error
      throw new Error(
        `Practical registration failed: ${practicalResult.message}`
      );
    }

    console.log("✅ Practical component registered successfully");

    // Show success message
    showAlert(
      `✅ Successfully registered for ${courseCode}!<br>` +
        `Theory: ${theorySelection.value} | Practical: ${practicalSelection.value}<br>` +
        `Total Credits: ${theoryResult.registration.credits}`,
      "success"
    );
    // Refresh credit summary
    await loadCreditSummary();

    // Refresh timetable if it's currently displayed
    await refreshTimetableIfVisible();

    // Refresh the course offerings to show updated state
    await loadCourseOfferings(courseCode);
  } catch (error) {
    console.error("TEL registration error:", error);
    showAlert(`❌ Registration failed: ${error.message}`, "danger");
  }
}

// Load and display credit summary
async function loadCreditSummary() {
  const semesterSelect = document.getElementById("working-semester-select");
  if (!semesterSelect.value) return;

  const [year, type] = semesterSelect.value.split("|");

  try {
    const response = await fetch(
      `${
        window.API_URL
      }/course-registration/summary?slot_year=${encodeURIComponent(
        year
      )}&semester_type=${encodeURIComponent(type)}`,
      {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to load credit summary`);
    }

    const summary = await response.json();
    displayCreditSummary(summary);
  } catch (error) {
    console.error("Error loading credit summary:", error);
  }
}

// Display credit summary in UI
function displayCreditSummary(summary) {
  const { credit_summary, registered_courses, student_info, semester_info } =
    summary;

  // Find or create credit display container
  let creditContainer = document.getElementById("credit-summary-container");
  if (!creditContainer) {
    const courseSearchDiv = document.getElementById("working-course-search");
    creditContainer = document.createElement("div");
    creditContainer.id = "credit-summary-container";
    courseSearchDiv.parentNode.insertBefore(creditContainer, courseSearchDiv);
  }

  const progressColor =
    credit_summary.percentage_used > 90
      ? "#dc3545"
      : credit_summary.percentage_used > 75
      ? "#ffc107"
      : "#28a745";

  creditContainer.innerHTML = `
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 0 20px 20px 0; border-left: 5px solid ${progressColor};">
      <h5 style="color: #007bff; margin-bottom: 15px;">📊 Registration Summary - ${
        semester_info.slot_year
      } ${semester_info.semester_type}</h5>
      
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
        <div>
          <strong style="font-size: 16px;">Credits: ${
            credit_summary.total_credits
          } / 27</strong>
          <span style="color: #666; margin-left: 10px;">(${
            credit_summary.remaining_credits
          } remaining)</span>
        </div>
        <div style="background: #e9ecef; border-radius: 10px; width: 200px; height: 20px; overflow: hidden;">
          <div style="background: ${progressColor}; height: 100%; width: ${
    credit_summary.percentage_used
  }%; transition: width 0.3s ease;"></div>
        </div>
        <div style="font-weight: bold; color: ${progressColor};">${
    credit_summary.percentage_used
  }%</div>
      </div>

      ${
        registered_courses.length > 0
          ? `
        <div style="margin-top: 15px;">
          <strong>Registered Courses (${registered_courses.length}):</strong>
          <div style="margin-top: 8px;">
            ${registered_courses
              .map(
                (course) => `
              <span style="display: inline-block; background: #007bff; color: white; padding: 4px 8px; border-radius: 4px; margin: 2px 4px 2px 0; font-size: 12px;">
                ${course.course_code} (${course.credits}c)
                ${(() => {
                  if (course.components.length > 1) return " - T+P";
                  const comp = course.components[0];
                  if (comp.component_type === "T") return " - T";
                  if (comp.component_type === "P") return " - P";
                  if (comp.component_type === "SINGLE") {
                    return comp.slot_name.startsWith("L") ? " - P" : " - T";
                  }
                  return "";
                })()}
              </span>
            `
              )
              .join("")}
          </div>
        </div>
      `
          : ""
      }

      ${
        credit_summary.remaining_credits <= 3 &&
        credit_summary.remaining_credits > 0
          ? `
        <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 4px; margin-top: 10px; color: #856404;">
          ⚠️ <strong>Warning:</strong> Only ${credit_summary.remaining_credits} credits remaining!
        </div>
      `
          : ""
      }

      ${
        credit_summary.remaining_credits <= 0
          ? `
        <div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 10px; border-radius: 4px; margin-top: 10px; color: #721c24;">
          🚫 <strong>Limit Reached:</strong> You have reached the 27-credit limit for this semester.
        </div>
      `
          : ""
      }

      ${
        registered_courses.length > 0
          ? `
        <div style="margin-top: 15px; text-align: center;">
          <button id="view-student-timetable-btn" 
                  style="background: #28a745; color: white; border: none; padding: 12px 24px; border-radius: 4px; 
                         cursor: pointer; font-size: 14px; font-weight: bold;"
                  onclick="toggleStudentTimetable()">
            📅 View my Slot TimeTable
          </button>
        </div>
      `
          : ""
      }

      <!-- Timetable Container (initially hidden) -->
      <div id="student-timetable-container" style="display: none; margin-top: 20px;">
        <div id="student-timetable-content"></div>
      </div>
    </div>
  `;
}

// Helper function to refresh timetable if it's currently visible
async function refreshTimetableIfVisible() {
  const container = document.getElementById("student-timetable-container");
  if (container && container.style.display !== "none") {
    console.log("🔄 Refreshing visible timetable...");
    await loadStudentTimetable();
  }
}

// Toggle student timetable display
async function toggleStudentTimetable() {
  const button = document.getElementById("view-student-timetable-btn");
  const container = document.getElementById("student-timetable-container");

  if (!container) {
    console.error("Timetable container not found");
    return;
  }

  if (container.style.display === "none") {
    // Show timetable
    button.textContent = "🔄 Loading Timetable...";
    button.disabled = true;

    await loadStudentTimetable();

    container.style.display = "block";
    button.textContent = "📅 Hide my Slot TimeTable";
    button.disabled = false;
  } else {
    // Hide timetable
    container.style.display = "none";
    button.textContent = "📅 View my Slot TimeTable";
  }
}

// Load student timetable data
async function loadStudentTimetable() {
  const semesterSelect = document.getElementById("working-semester-select");
  if (!semesterSelect.value) {
    showAlert("Please select a semester first", "warning");
    return;
  }

  const [year, type] = semesterSelect.value.split("|");

  try {
    const response = await fetch(
      `${
        window.API_URL
      }/course-registration/student-timetable?slot_year=${encodeURIComponent(
        year
      )}&semester_type=${encodeURIComponent(type)}`,
      {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to load student timetable: ${response.status}`);
    }

    const data = await response.json();
    generateStudentTimetable(data.student, data.registrations, year, type);
  } catch (error) {
    console.error("Error loading student timetable:", error);
    showAlert(`Error loading timetable: ${error.message}`, "danger");
  }
}

// Generate student timetable (based on faculty timetable logic)
function generateStudentTimetable(student, registrations, year, semester) {
  const contentDiv = document.getElementById("student-timetable-content");
  if (!contentDiv) {
    console.error("Timetable content div not found");
    return;
  }

  // Set title
  contentDiv.innerHTML = `
    <h6 style="color: #007bff; margin-bottom: 15px;">📅 My Slot Timetable - ${student.student_name} (${student.enrollment_number})</h6>
    <div id="student-timetable-loading" style="text-align: center; padding: 20px;">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p>Loading timetable structure...</p>
    </div>
  `;

  // Fetch slots to build timetable structure
  fetch(`${window.API_URL}/slots/${year}/${semester}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  })
    .then((response) => response.json())
    .then((slots) => {
      console.log("🔍 Registrations received:", registrations);
      console.log(
        "🔍 Sample registration slot_name:",
        registrations[0]?.slot_name
      );

      // Create allocation map from registrations
      const allocationMap = {};
      registrations.forEach((registration) => {
        if (registration.slot_day && registration.slot_time) {
          // Handle compound slots (like "L9+L10,L29+L30")
          if (registration.slot_name.includes(",")) {
            // Split compound slot and create entries for each part
            const individualSlots = registration.slot_name
              .split(",")
              .map((s) => s.trim());
            console.log(
              "🔍 Splitting compound slot:",
              registration.slot_name,
              "into:",
              individualSlots
            );
            individualSlots.forEach((slot) => {
              const key = `${registration.slot_day}-${slot}`;
              allocationMap[key] = registration;
              console.log("🔍 Added allocation map entry:", key);
            });
          } else {
            // Regular single slot
            const key = `${registration.slot_day}-${registration.slot_name}`;
            allocationMap[key] = registration;
            console.log("🔍 Added allocation map entry:", key);
          }
        }
      });

      console.log("🔍 Final allocation map:", allocationMap);

      // Rest of the function continues...

      // Use same timetable structure as faculty timetable
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

      // Generate timetable HTML
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

        // Lab slots pattern (same as faculty timetable)
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

      // Generate summary table - group compound slots back together
      const summaryMap = new Map();

      registrations.forEach((reg) => {
        const key = `${reg.course_code}-${reg.component_type}`;

        if (!summaryMap.has(key)) {
          summaryMap.set(key, {
            ...reg,
            slots: [reg.slot_name],
          });
        } else {
          // Add slot to existing entry if not already present
          const existing = summaryMap.get(key);
          if (!existing.slots.includes(reg.slot_name)) {
            existing.slots.push(reg.slot_name);
          }
        }
      });

      // Convert map to array and format slot names
      const uniqueRegistrations = Array.from(summaryMap.values()).map(
        (reg) => ({
          ...reg,
          slot_name: reg.slots.join(","), // Combine slots back: "L9+L10,L29+L30"
        })
      );
      let summaryTable = `
        <div class="mt-3">
          <h6>Summary</h6>
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

      // Update content
      contentDiv.innerHTML = `
        <h6 style="color: #007bff; margin-bottom: 15px;">📅 My Slot Timetable - ${student.student_name} (${student.enrollment_number})</h6>
        ${tableHtml}
        ${summaryTable}
      `;
    })
    .catch((error) => {
      console.error("Error generating timetable:", error);
      contentDiv.innerHTML = `
        <h6 style="color: #007bff; margin-bottom: 15px;">📅 My Slot Timetable</h6>
        <div class="alert alert-danger">Error loading timetable. Please try again.</div>
      `;
    });
}

// Make functions available globally
window.initializeCourseRegistration = initializeCourseRegistration;
window.selectCourse = selectCourse;
window.loadCourseOfferings = loadCourseOfferings;
window.registerCourseOffering = registerCourseOffering;
window.deleteCourseOffering = deleteCourseOffering;
window.updateTELSelection = updateTELSelection;
window.registerTELCourse = registerTELCourse;
window.loadCreditSummary = loadCreditSummary;
window.toggleStudentTimetable = toggleStudentTimetable;
window.loadStudentTimetable = loadStudentTimetable;
window.refreshTimetableIfVisible = refreshTimetableIfVisible;
