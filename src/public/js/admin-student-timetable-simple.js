// Simple test file
console.log("🔥 SIMPLE ADMIN TIMETABLE FILE LOADED!");

// Simple function to test
function initializeAdminStudentTimetable() {
  console.log("🚀 Simple admin timetable initialized!");
  
  // Simple button handlers
  setTimeout(() => {
    const searchBtn = document.getElementById("search-student-btn");
    const clearBtn = document.getElementById("clear-search-btn");
    
    if (searchBtn) {
      searchBtn.onclick = function() {
        console.log("🔍 Search button clicked!");
        const input = document.getElementById("student-enrollment-search");
        if (input) {
          console.log("📝 Input value:", input.value);
          alert("Search functionality coming soon! Value: " + input.value);
        }
      };
      console.log("✅ Search button handler added");
    }
    
    if (clearBtn) {
      clearBtn.onclick = function() {
        console.log("🧹 Clear button clicked!");
        const input = document.getElementById("student-enrollment-search");
        if (input) {
          input.value = "";
          console.log("✅ Input cleared");
        }
      };
      console.log("✅ Clear button handler added");
    }
  }, 500);
}

// Export to global
window.initializeAdminStudentTimetable = initializeAdminStudentTimetable;
console.log("✅ Simple function exported!");