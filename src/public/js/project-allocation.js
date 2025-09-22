// Project Allocation Management
let projectAllocations = [];
let projectCourses = [];
let facultyList = [];

// Initialize project allocation functionality
function initializeProjectAllocation() {
  console.log('=== Initializing project allocation ===');
  console.log('Current page:', document.getElementById('project-allocation-page'));
  
  // Check if elements exist
  const addBtn = document.getElementById('add-project-allocation-btn');
  const saveBtn = document.getElementById('save-project-allocation-btn');
  const filterYear = document.getElementById('project-allocation-filter-year');
  const filterSemester = document.getElementById('project-allocation-filter-semester');
  
  console.log('Add button:', addBtn);
  console.log('Save button:', saveBtn);
  console.log('Filter year:', filterYear);
  console.log('Filter semester:', filterSemester);
  
  if (!addBtn) {
    console.log('Add button not found - page might not be active');
    // Don't return early, still load data
  }
  
  // Add event listeners
  if (addBtn) {
    addBtn.addEventListener('click', openProjectAllocationModal);
  }
  
  if (saveBtn) {
    saveBtn.addEventListener('click', saveProjectAllocation);
  }
  
  if (filterYear) {
    filterYear.addEventListener('change', loadProjectAllocations);
  }
  
  if (filterSemester) {
    filterSemester.addEventListener('change', loadProjectAllocations);
  }
  
  // Course selection change handler
  const courseSelect = document.getElementById('project-allocation-course');
  if (courseSelect) {
    courseSelect.addEventListener('change', handleProjectCourseChange);
  }
  
  // Load initial data
  loadAcademicYears();
  // No need to load faculty list anymore
  loadProjectAllocations();
}

// Load academic years
async function loadAcademicYears() {
  console.log('Loading academic years...');
  console.log('API_URL:', window.API_URL);
  console.log('Token:', localStorage.getItem('token'));
  
  try {
    const url = `${window.API_URL || ''}/slots`;
    console.log('Fetching from:', url);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': localStorage.getItem('token'),
        'x-access-token': localStorage.getItem('token')
      }
    });
    
    console.log('Response status:', response.status);
    
    if (response.ok) {
      const slots = await response.json();
      console.log('Slots received:', slots.length);
      
      const years = new Set();
      slots.forEach(slot => years.add(slot.slot_year));
      console.log('Years found:', Array.from(years));
      
      const yearSelect = document.getElementById('project-allocation-year');
      const filterYear = document.getElementById('project-allocation-filter-year');
      
      console.log('Year select element:', yearSelect);
      console.log('Filter year element:', filterYear);
      
      if (yearSelect) {
        yearSelect.innerHTML = '<option value="">Select Year</option>';
        Array.from(years).sort().reverse().forEach(year => {
          yearSelect.innerHTML += `<option value="${year}">${year}</option>`;
        });
        console.log('Year select populated');
      }
      
      if (filterYear) {
        filterYear.innerHTML = '<option value="">All Years</option>';
        Array.from(years).sort().reverse().forEach(year => {
          filterYear.innerHTML += `<option value="${year}">${year}</option>`;
        });
        console.log('Filter year populated');
      }
    } else {
      console.error('Response not OK:', response.status, response.statusText);
      const text = await response.text();
      console.error('Response body:', text);
    }
  } catch (error) {
    console.error('Error loading academic years:', error);
  }
}

// Load faculty list
async function loadFacultyList() {
  console.log('Loading faculty list...');
  try {
    const url = `${window.API_URL || ''}/faculty`;
    console.log('Fetching faculty from:', url);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': localStorage.getItem('token'),
        'x-access-token': localStorage.getItem('token')
      }
    });
    
    console.log('Faculty response status:', response.status);
    
    if (response.ok) {
      facultyList = await response.json();
      console.log('Faculty loaded:', facultyList.length);
      
      const facultySelect = document.getElementById('project-allocation-faculty');
      console.log('Faculty select element:', facultySelect);
      
      if (facultySelect) {
        facultySelect.innerHTML = '<option value="">Select Faculty</option>';
        facultyList.forEach(faculty => {
          facultySelect.innerHTML += `<option value="${faculty.employee_id}">${faculty.name}</option>`;
        });
        console.log('Faculty select populated with', facultyList.length, 'options');
      }
    } else {
      console.error('Faculty response not OK:', response.status);
    }
  } catch (error) {
    console.error('Error loading faculty:', error);
  }
}

// Load available project courses
async function loadProjectCourses() {
  const year = document.getElementById('project-allocation-year').value;
  const semester = document.getElementById('project-allocation-semester').value;
  
  if (!year || !semester) {
    return;
  }
  
  try {
    const response = await fetch(`${window.API_URL || ''}/project-allocations/available-courses?slot_year=${year}&semester_type=${semester}`, {
      headers: {
        'Authorization': localStorage.getItem('token'),
        'x-access-token': localStorage.getItem('token')
      }
    });
    
    if (response.ok) {
      projectCourses = await response.json();
      const courseSelect = document.getElementById('project-allocation-course');
      
      if (courseSelect) {
        courseSelect.innerHTML = '<option value="">Select Project Course</option>';
        projectCourses.forEach(course => {
          courseSelect.innerHTML += `<option value="${course.course_code}">${course.course_code} - ${course.course_name}</option>`;
        });
      }
    }
  } catch (error) {
    console.error('Error loading project courses:', error);
  }
}

// Handle project course selection
function handleProjectCourseChange() {
  const courseCode = document.getElementById('project-allocation-course').value;
  const detailsDiv = document.getElementById('project-course-details');
  
  if (!courseCode) {
    detailsDiv.innerHTML = '<span class="text-muted">Select a course to view details</span>';
    return;
  }
  
  const course = projectCourses.find(c => c.course_code === courseCode);
  if (course) {
    detailsDiv.innerHTML = `
      <strong>${course.course_name}</strong><br>
      Credits: ${course.credits}<br>
      Programs: ${course.programs_offered_to}
    `;
  }
}

// Open project allocation modal
function openProjectAllocationModal() {
  const modal = new bootstrap.Modal(document.getElementById('projectAllocationModal'));
  document.getElementById('projectAllocationModalLabel').textContent = 'Add Project Allocation';
  document.getElementById('project-allocation-form').reset();
  document.getElementById('project-course-details').innerHTML = '<span class="text-muted">Select a course to view details</span>';
  
  // Add change handlers for year/semester to load courses
  const yearSelect = document.getElementById('project-allocation-year');
  const semesterSelect = document.getElementById('project-allocation-semester');
  
  yearSelect.addEventListener('change', loadProjectCourses);
  semesterSelect.addEventListener('change', loadProjectCourses);
  
  modal.show();
}

// Save project allocation
async function saveProjectAllocation() {
  const form = document.getElementById('project-allocation-form');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  
  const data = {
    slot_year: document.getElementById('project-allocation-year').value,
    semester_type: document.getElementById('project-allocation-semester').value,
    course_code: document.getElementById('project-allocation-course').value
  };
  
  try {
    const response = await fetch(`${window.API_URL || ''}/project-allocations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': localStorage.getItem('token'),
        'x-access-token': localStorage.getItem('token')
      },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      showAlert('success', result.message || 'Project allocation created successfully');
      bootstrap.Modal.getInstance(document.getElementById('projectAllocationModal')).hide();
      loadProjectAllocations();
    } else {
      showAlert('danger', result.message || 'Failed to create project allocation');
    }
  } catch (error) {
    console.error('Error saving project allocation:', error);
    showAlert('danger', 'Error saving project allocation');
  }
}

// Load project allocations
async function loadProjectAllocations() {
  const filterYear = document.getElementById('project-allocation-filter-year')?.value || '';
  const filterSemester = document.getElementById('project-allocation-filter-semester')?.value || '';
  
  let url = `${window.API_URL || ''}/project-allocations?`;
  if (filterYear) url += `year=${filterYear}&`;
  if (filterSemester) url += `semesterType=${filterSemester}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': localStorage.getItem('token'),
        'x-access-token': localStorage.getItem('token')
      }
    });
    
    if (response.ok) {
      projectAllocations = await response.json();
      displayProjectAllocations();
    }
  } catch (error) {
    console.error('Error loading project allocations:', error);
  }
}

// Display project allocations in table
function displayProjectAllocations() {
  const tbody = document.getElementById('project-allocation-table-body');
  if (!tbody) return;
  
  if (projectAllocations.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center">No project allocations found</td></tr>';
    return;
  }
  
  tbody.innerHTML = projectAllocations.map(allocation => `
    <tr>
      <td>${allocation.course_code}</td>
      <td>${allocation.course_name}</td>
      <td>${allocation.credits}</td>
      <td>${allocation.slot_year}</td>
      <td>${allocation.semester_type}</td>
      <td><span class="badge bg-success">Active</span></td>
      <td>
        <button class="btn btn-sm btn-danger" onclick="deleteProjectAllocation(${allocation.id})">
          <i class="fas fa-trash"></i> Remove
        </button>
      </td>
    </tr>
  `).join('');
}

// Edit functionality removed - project allocations can only be added or deleted

// Delete project allocation
async function deleteProjectAllocation(id) {
  if (!confirm('Are you sure you want to delete this project allocation?')) {
    return;
  }
  
  try {
    const response = await fetch(`${window.API_URL || ''}/project-allocations/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': localStorage.getItem('token'),
        'x-access-token': localStorage.getItem('token')
      }
    });
    
    const result = await response.json();
    
    if (response.ok) {
      showAlert('success', result.message || 'Project allocation deleted successfully');
      loadProjectAllocations();
    } else {
      showAlert('danger', result.message || 'Failed to delete project allocation');
    }
  } catch (error) {
    console.error('Error deleting project allocation:', error);
    showAlert('danger', 'Error deleting project allocation');
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeProjectAllocation);
} else {
  initializeProjectAllocation();
}