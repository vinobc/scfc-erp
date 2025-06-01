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
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 5px solid ${progressColor};">
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
    </div>
  `;
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
