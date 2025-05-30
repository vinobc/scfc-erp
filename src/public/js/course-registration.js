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

// Enhanced selectCourse function with new response structure
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

        <!-- Phase 2: Registration Entries Table -->
        ${renderEnhancedSlotOfferingsTable(details)}
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

// Enhanced slot details formatting for day-grouped P=4 display
function formatRegistrationSlotDetails(entry) {
  if (!entry.slot_details) return "No schedule available";

  if (entry.type === "theory") {
    // Theory slots: group by slot name, show all times
    const slotNames = Object.keys(entry.slot_details);
    const formattedSlots = [];

    slotNames.forEach((slotName) => {
      const slotData = entry.slot_details[slotName];
      if (slotData && slotData.length > 0) {
        const times = slotData
          .map((slot) => `${slot.slot_day} (${slot.slot_time})`)
          .join(", ");
        formattedSlots.push(`<strong>${slotName}:</strong> ${times}`);
      }
    });

    return formattedSlots.join("<br>");
  } else {
    // Lab slots: handle day-grouped P=4 combination or regular linking
    if (entry.p4_combination && entry.p4_combination.dayGroups) {
      // P=4 combination: show day-grouped format
      const dayGroupedDisplay = [];

      entry.p4_combination.dayGroups.forEach((dayGroup) => {
        const daySlots = [];

        if (dayGroup.morning) {
          daySlots.push(
            `<strong>${dayGroup.morning.slot_name}</strong> (${dayGroup.morning.slot_time})`
          );
        }

        if (dayGroup.afternoon) {
          daySlots.push(
            `<strong>${dayGroup.afternoon.slot_name}</strong> (${dayGroup.afternoon.slot_time})`
          );
        }

        if (daySlots.length > 0) {
          dayGroupedDisplay.push(
            `<strong>${dayGroup.day}:</strong> ${daySlots.join(", ")}`
          );
        }
      });

      return dayGroupedDisplay.join("<br>");
    } else {
      // Regular lab slots (P=2 or individual)
      const slotNames = Object.keys(entry.slot_details);
      const formattedSlots = [];

      slotNames.forEach((slotName) => {
        const slotData = entry.slot_details[slotName];
        if (slotData && slotData.length > 0) {
          const slot = slotData[0];
          formattedSlots.push(
            `<strong>${slotName}</strong> (${slot.slot_day}, ${slot.slot_time})`
          );
        }
      });

      return formattedSlots.join("<br>");
    }
  }
}

// Enhanced component name formatting for day-grouped P=4
function formatComponentName(entry) {
  if (entry.p4_combination && entry.p4_combination.dayGroups) {
    // P=4: Show day-grouped component names
    const dayNames = entry.p4_combination.dayGroups.map((dayGroup) => {
      const slots = [];
      if (dayGroup.morning) slots.push(dayGroup.morning.slot_name);
      if (dayGroup.afternoon) slots.push(dayGroup.afternoon.slot_name);
      return slots.join(", ");
    });
    return dayNames.join("<br>");
  } else {
    // Regular component name
    return entry.component_name;
  }
}

// Enhanced table rendering with clean UI (no linking indicators)
function renderEnhancedSlotOfferingsTable(details) {
  if (
    !details.registration_entries ||
    details.registration_entries.length === 0
  ) {
    return `
      <div style="background: white; padding: 20px; border-radius: 6px; border: 1px solid #ddd;">
        <h5 style="margin-bottom: 15px; color: #007bff;">Registration</h5>
        <div style="text-align: center; color: #666; padding: 20px;">
          No slot offerings available for this course in the selected semester.
        </div>
      </div>
    `;
  }

  return `
    <div style="background: white; padding: 20px; border-radius: 6px; border: 1px solid #ddd;">
      <h5 style="margin-bottom: 15px; color: #007bff;">Registration</h5>
      
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #28a745; color: white;">
            <th style="padding: 12px; text-align: left;">Course Code</th>
            <th style="padding: 12px; text-align: left;">Course Title</th>
            <th style="padding: 12px; text-align: center;">Course Type</th>
            <th style="padding: 12px; text-align: left;">Slots Offered</th>
            <th style="padding: 12px; text-align: left;">Venue</th>
            <th style="padding: 12px; text-align: left;">Faculty Name</th>
            <th style="padding: 12px; text-align: center;">Available Seats</th>
            <th style="padding: 12px; text-align: center; width: 100px;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${details.registration_entries
            .map(
              (entry, index) => `
            <tr style="border-bottom: 1px solid #ddd;" id="offering-row-${index}">
              <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">${
                details.course_code
              }</td>
              <td style="padding: 12px; border: 1px solid #ddd;">${
                details.course_name
              }</td>
              <td style="padding: 12px; border: 1px solid #ddd; text-align: center;">
                <span style="background: ${getEntryTypeColor(entry.type)}; 
                             color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                  ${entry.type.toUpperCase()}
                </span>
              </td>
              <td style="padding: 12px; border: 1px solid #ddd; text-align: left;">
                <div style="font-weight: bold; color: #007bff; margin-bottom: 6px;">
                  ${formatComponentName(entry)}
                </div>
                <div style="font-size: 13px; color: #333; line-height: 1.4;">
                  ${formatRegistrationSlotDetails(entry)}
                </div>
              </td>
              <td style="padding: 12px; border: 1px solid #ddd;">
                <span style="background: #f8f9fa; padding: 4px 8px; border-radius: 4px; font-weight: bold;">
                  ${entry.venue}
                </span>
              </td>
              <td style="padding: 12px; border: 1px solid #ddd;">${
                entry.faculty_name
              }</td>
              <td style="padding: 12px; border: 1px solid #ddd; text-align: center;">
                <span style="color: ${
                  entry.available_seats > 10
                    ? "#28a745"
                    : entry.available_seats > 5
                    ? "#ffc107"
                    : "#dc3545"
                }; 
                             font-weight: bold;">
                  ${entry.available_seats}
                </span>
              </td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">
                <div style="display: flex; flex-direction: column; gap: 4px;">
                  <button onclick="handleCourseRegistration('${
                    details.course_code
                  }', ${index}, 'register')"
                          style="background: #28a745; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold;"
                          onmouseover="this.style.background='#218838'"
                          onmouseout="this.style.background='#28a745'">
                    REGISTER
                  </button>
                  <button onclick="handleCourseRegistration('${
                    details.course_code
                  }', ${index}, 'delete')"
                          style="background: #dc3545; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold;"
                          onmouseover="this.style.background='#c82333'"
                          onmouseout="this.style.background='#dc3545'">
                    DELETE
                  </button>
                </div>
              </td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

// Get color for entry type
function getEntryTypeColor(type) {
  switch (type) {
    case "theory":
      return "#007bff";
    case "lab":
      return "#17a2b8";
    default:
      return "#6c757d";
  }
}

// Enhanced function to handle course registration/deletion with confirmation
function handleCourseRegistration(courseCode, offeringIndex, action) {
  console.log(
    `🎯 ${action.toUpperCase()} action for course: ${courseCode}, offering: ${offeringIndex}`
  );

  // Get offering row for visual feedback
  const offeringRow = document.getElementById(`offering-row-${offeringIndex}`);

  // Show confirmation dialog
  const actionText = action === "register" ? "register for" : "delete from";
  const actionColor = action === "register" ? "#28a745" : "#dc3545";
  const actionIcon = action === "register" ? "✅" : "❌";

  const confirmed = confirm(
    `${actionIcon} Are you sure you want to ${actionText} this course offering?\n\nCourse: ${courseCode}\nOffering: ${
      offeringIndex + 1
    }`
  );

  if (confirmed) {
    // Add visual feedback
    if (offeringRow) {
      offeringRow.style.backgroundColor =
        action === "register" ? "#d4edda" : "#f8d7da";
      offeringRow.style.borderLeft = `4px solid ${actionColor}`;

      // Reset visual feedback after 2 seconds
      setTimeout(() => {
        offeringRow.style.backgroundColor = "";
        offeringRow.style.borderLeft = "";
      }, 2000);
    }

    // Show success message
    showAlert(
      `${actionIcon} Successfully ${
        action === "register" ? "registered for" : "deleted from"
      } ${courseCode} (Offering ${offeringIndex + 1})`,
      action === "register" ? "success" : "warning"
    );

    // TODO: Here you would implement the actual API call to register/delete
    // For example:
    // await registerForCourse(courseCode, offeringIndex);

    console.log(`✅ ${action.toUpperCase()} completed for ${courseCode}`);
  } else {
    console.log(`❌ ${action.toUpperCase()} cancelled for ${courseCode}`);
  }
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

// Make enhanced functions available globally
window.initializeCourseRegistration = initializeCourseRegistration;
window.selectCourse = selectCourse;
window.handleCourseRegistration = handleCourseRegistration;
