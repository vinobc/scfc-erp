// DOM elements will be initialized in the DOMContentLoaded event
let schoolsTableBody;
let addSchoolBtn;
let saveSchoolBtn;
let confirmDeleteBtn;
let schoolSearchInput;
let schoolStatusFilter;

// School form elements
let schoolForm;
let schoolIdInput;
let schoolCodeInput;
let schoolLongNameInput;
let schoolShortNameInput;
let schoolDescriptionInput;
let schoolIsActiveInput;

// Modal elements
let schoolModal;
let deleteConfirmModal;
let schoolModalLabel;
let deleteSchoolCode;
let deleteSchoolName;

// Initialize schools functionality
document.addEventListener('DOMContentLoaded', () => {
  console.log("schools.js: DOM loaded");
  
  // Initialize DOM elements
  schoolsTableBody = document.getElementById('schools-table');
  addSchoolBtn = document.getElementById('add-school-btn');
  saveSchoolBtn = document.getElementById('save-school-btn');
  confirmDeleteBtn = document.getElementById('confirm-delete-btn');
  schoolSearchInput = document.getElementById('school-search-input');
  schoolStatusFilter = document.getElementById('school-status-filter');
  
  // Initialize form elements
  schoolForm = document.getElementById('school-form');
  schoolIdInput = document.getElementById('school-id-field');
  schoolCodeInput = document.getElementById('school-code-field');
  schoolLongNameInput = document.getElementById('school-long-name-field');
  schoolShortNameInput = document.getElementById('school-short-name-field');
  schoolDescriptionInput = document.getElementById('school-description-field');
  schoolIsActiveInput = document.getElementById('school-is-active-field');
  
  // Initialize modal elements
  schoolModalLabel = document.getElementById('schoolModalLabel');
  deleteSchoolCode = document.getElementById('delete-school-code');
  deleteSchoolName = document.getElementById('delete-school-name');
  
  // Initialize Bootstrap modal objects
  const schoolModalElement = document.getElementById('schoolModal');
  const deleteConfirmModalElement = document.getElementById('deleteConfirmModal');
  
  if (schoolModalElement) {
    schoolModal = new bootstrap.Modal(schoolModalElement);
  }
  
  if (deleteConfirmModalElement) {
    deleteConfirmModal = new bootstrap.Modal(deleteConfirmModalElement);
  }
  
  // Setup event listeners
  if (addSchoolBtn) {
    console.log("schools.js: Add school button found");
    addSchoolBtn.addEventListener('click', handleAddSchool);
  }
  
  if (saveSchoolBtn) {
    saveSchoolBtn.addEventListener('click', handleSaveSchool);
  }
  
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', handleConfirmDelete);
  }
  
  if (schoolSearchInput) {
    schoolSearchInput.addEventListener('input', filterSchools);
  }
  
  if (schoolStatusFilter) {
    schoolStatusFilter.addEventListener('change', filterSchools);
  }
  
  // Initial load of schools when the page loads
  const schoolsLink = document.getElementById('schools-link');
  if (schoolsLink) {
    schoolsLink.addEventListener('click', () => {
      loadSchools();
    });
  }
});

// Load all schools from the API
function loadSchools() {
  console.log("schools.js: Loading schools");
  
  // Show loading state
  if (schoolsTableBody) {
    schoolsTableBody.innerHTML = '<tr><td colspan="6" class="text-center">Loading schools...</td></tr>';
  }
  
  fetch(`${API_URL}/schools`, {
    headers: {
      'Authorization': localStorage.getItem('token')
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to load schools');
    }
    return response.json();
  })
  .then(schools => {
    if (schools.length === 0) {
      if (schoolsTableBody) {
        schoolsTableBody.innerHTML = '<tr><td colspan="6" class="text-center">No schools found. Add a new school to get started.</td></tr>';
      }
      return;
    }
    
    // Update the dashboard counter
    const schoolsCount = document.getElementById('schools-count');
    if (schoolsCount) {
      schoolsCount.textContent = schools.length;
    }
    
    // Render schools
    renderSchools(schools);
  })
  .catch(error => {
    console.error('Load schools error:', error);
    if (schoolsTableBody) {
      schoolsTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error loading schools. Please try again.</td></tr>';
    }
    showAlert('Failed to load schools. Please refresh the page or try again later.', 'danger');
  });
}

// Render schools in the table
function renderSchools(schools) {
  if (!schoolsTableBody) {
    console.error('Schools table body element not found');
    return;
  }
  
  // Apply filters if any
  const searchTerm = schoolSearchInput ? schoolSearchInput.value.toLowerCase().trim() : '';
  const statusFilter = schoolStatusFilter ? schoolStatusFilter.value : 'all';
  
  const filteredSchools = schools.filter(school => {
    // Apply status filter
    if (statusFilter !== 'all' && 
        ((statusFilter === 'active' && !school.is_active) || 
         (statusFilter === 'inactive' && school.is_active))) {
      return false;
    }
    
    // Apply search filter
    if (searchTerm) {
      return (
        school.school_code.toLowerCase().includes(searchTerm) ||
        school.school_long_name.toLowerCase().includes(searchTerm) ||
        school.school_short_name.toLowerCase().includes(searchTerm)
      );
    }
    
    return true;
  });
  
  if (filteredSchools.length === 0) {
    schoolsTableBody.innerHTML = '<tr><td colspan="6" class="text-center">No schools match your filters.</td></tr>';
    return;
  }
  
  // Clear previous content
  schoolsTableBody.innerHTML = '';
  
  // Add each school to the table
  filteredSchools.forEach(school => {
    const row = document.createElement('tr');
    
    row.innerHTML = `
      <td>${school.school_code}</td>
      <td>${school.school_long_name}</td>
      <td>${school.school_short_name}</td>
      <td>
        <span class="badge ${school.is_active ? 'bg-success' : 'bg-danger'} status-badge">
          ${school.is_active ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td>${formatDate(school.created_at)}</td>
      <td>
        <button class="btn btn-sm btn-primary action-btn edit-school-btn" data-id="${school.school_id}">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-${school.is_active ? 'warning' : 'success'} action-btn toggle-status-btn" data-id="${school.school_id}" data-active="${school.is_active}">
          <i class="fas fa-${school.is_active ? 'pause' : 'play'}"></i>
        </button>
        <button class="btn btn-sm btn-danger action-btn delete-school-btn" data-id="${school.school_id}" data-code="${school.school_code}" data-name="${school.school_long_name}">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;
    
    schoolsTableBody.appendChild(row);
  });
  
  // Add event listeners to buttons
  addSchoolButtonListeners();
}

// Add event listeners to school action buttons
function addSchoolButtonListeners() {
  // Edit school buttons
  document.querySelectorAll('.edit-school-btn').forEach(button => {
    button.addEventListener('click', () => {
      const schoolId = button.getAttribute('data-id');
      openEditSchoolModal(schoolId);
    });
  });
  
  // Toggle status buttons
  document.querySelectorAll('.toggle-status-btn').forEach(button => {
    button.addEventListener('click', () => {
      const schoolId = button.getAttribute('data-id');
      const isActive = button.getAttribute('data-active') === 'true';
      toggleSchoolStatus(schoolId, !isActive);
    });
  });
  
  // Delete school buttons
  document.querySelectorAll('.delete-school-btn').forEach(button => {
    button.addEventListener('click', () => {
      const schoolId = button.getAttribute('data-id');
      const schoolCode = button.getAttribute('data-code');
      const schoolName = button.getAttribute('data-name');
      openDeleteConfirmModal(schoolId, schoolCode, schoolName);
    });
  });
}

// Filter schools based on search and status
function filterSchools() {
  // Get all schools again and apply filters on the client side
  // This avoids making new API calls for simple filtering
  fetch(`${API_URL}/schools`, {
    headers: {
      'Authorization': localStorage.getItem('token')
    }
  })
  .then(response => response.json())
  .then(schools => {
    renderSchools(schools);
  })
  .catch(error => {
    console.error('Filter schools error:', error);
  });
}

// Handle add school button click
function handleAddSchool() {
  // Reset form
  if (schoolForm) schoolForm.reset();
  if (schoolIdInput) schoolIdInput.value = '';
  if (schoolCodeInput) schoolCodeInput.value = '';
  
  // Hide the school code display for new schools
  const codeContainer = document.getElementById('school-code-display-container');
  if (codeContainer) codeContainer.style.display = 'none';
  
  // Update modal title
  if (schoolModalLabel) schoolModalLabel.textContent = 'Add New School';
  
  // Show modal
  if (schoolModal) schoolModal.show();
}

// Open edit school modal
function openEditSchoolModal(schoolId) {
  // Get school details
  fetch(`${API_URL}/schools/${schoolId}`, {
    headers: {
      'Authorization': localStorage.getItem('token')
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to get school details');
    }
    return response.json();
  })
  .then(school => {
    // Fill form with school data
    if (schoolIdInput) schoolIdInput.value = school.school_id;
    if (schoolCodeInput) schoolCodeInput.value = school.school_code;
    
    // Show school code in read-only format
    const codeContainer = document.getElementById('school-code-display-container');
    const codeDisplay = document.getElementById('school-code-display');
    if (codeContainer && codeDisplay) {
      codeContainer.style.display = 'block';
      codeDisplay.textContent = school.school_code;
    }
    
    if (schoolLongNameInput) schoolLongNameInput.value = school.school_long_name;
    if (schoolShortNameInput) schoolShortNameInput.value = school.school_short_name;
    if (schoolDescriptionInput) schoolDescriptionInput.value = school.description || '';
    if (schoolIsActiveInput) schoolIsActiveInput.checked = school.is_active;
    
    // Update modal title
    if (schoolModalLabel) schoolModalLabel.textContent = 'Edit School';
    
    // Show modal
    if (schoolModal) schoolModal.show();
  })
  .catch(error => {
    console.error('Get school details error:', error);
    showAlert('Failed to load school details. Please try again.', 'danger');
  });
}

// Handle save school button click
function handleSaveSchool() {
  // Get form values
  const schoolId = schoolIdInput ? schoolIdInput.value : '';
  const schoolCode = schoolCodeInput ? schoolCodeInput.value.trim() : '';
  const schoolLongName = schoolLongNameInput ? schoolLongNameInput.value.trim() : '';
  const schoolShortName = schoolShortNameInput ? schoolShortNameInput.value.trim() : '';
  const schoolDescription = schoolDescriptionInput ? schoolDescriptionInput.value.trim() : '';
  const isActive = schoolIsActiveInput ? schoolIsActiveInput.checked : true;
  
  // Validate required fields
  if (!schoolLongName || !schoolShortName) {
    showAlert('Please fill all required fields.', 'danger');
    return;
  }
  
  // Prepare data
  const schoolData = {
    school_long_name: schoolLongName,
    school_short_name: schoolShortName,
    description: schoolDescription,
    is_active: isActive
  };
  
  // Include school_code only for updates, not for new records
  if (schoolId && schoolCode) {
    schoolData.school_code = schoolCode;
  }
  
  // Show loading state
  if (saveSchoolBtn) {
    saveSchoolBtn.disabled = true;
    saveSchoolBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
  }
  
  // Determine if creating or updating
  const method = schoolId ? 'PUT' : 'POST';
  const url = schoolId ? `${API_URL}/schools/${schoolId}` : `${API_URL}/schools`;
  
  fetch(url, {
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': localStorage.getItem('token')
    },
    body: JSON.stringify(schoolData)
  })
  .then(response => {
    if (!response.ok) {
      return response.json().then(data => {
        throw new Error(data.message || 'Failed to save school');
      });
    }
    return response.json();
  })
  .then(data => {
    // Hide modal
    if (schoolModal) schoolModal.hide();
    
    // Show success message
    showAlert(data.message, 'success');
    
    // Reload schools
    loadSchools();
  })
  .catch(error => {
    console.error('Save school error:', error);
    showAlert(error.message, 'danger');
  })
  .finally(() => {
    // Reset button state
    if (saveSchoolBtn) {
      saveSchoolBtn.disabled = false;
      saveSchoolBtn.innerHTML = 'Save';
    }
  });
}

// Toggle school status
function toggleSchoolStatus(schoolId, newStatus) {
  fetch(`${API_URL}/schools/${schoolId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': localStorage.getItem('token')
    },
    body: JSON.stringify({ is_active: newStatus })
  })
  .then(response => {
    if (!response.ok) {
      return response.json().then(data => {
        throw new Error(data.message || 'Failed to update school status');
      });
    }
    return response.json();
  })
  .then(data => {
    // Show success message
    showAlert(data.message, 'success');
    
    // Reload schools
    loadSchools();
  })
  .catch(error => {
    console.error('Toggle status error:', error);
    showAlert(error.message, 'danger');
  });
}

// Open delete confirmation modal
function openDeleteConfirmModal(schoolId, schoolCode, schoolName) {
  // Set confirm modal values
  if (deleteSchoolCode) deleteSchoolCode.textContent = schoolCode;
  if (deleteSchoolName) deleteSchoolName.textContent = schoolName;
  
  // Set school ID on the confirm button
  if (confirmDeleteBtn) confirmDeleteBtn.setAttribute('data-id', schoolId);
  
  // Show modal
  if (deleteConfirmModal) deleteConfirmModal.show();
}

// Handle confirm delete button click
function handleConfirmDelete() {
  if (!confirmDeleteBtn) {
    console.error('Confirm delete button not found');
    return;
  }
  
  const schoolId = confirmDeleteBtn.getAttribute('data-id');
  
  // Show loading state
  confirmDeleteBtn.disabled = true;
  confirmDeleteBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Deleting...';
  
  fetch(`${API_URL}/schools/${schoolId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': localStorage.getItem('token')
    }
  })
  .then(response => {
    if (!response.ok) {
      return response.json().then(data => {
        throw new Error(data.message || 'Failed to delete school');
      });
    }
    return response.json();
  })
  .then(data => {
    // Hide modal
    if (deleteConfirmModal) deleteConfirmModal.hide();
    
    // Show success message
    showAlert(data.message, 'success');
    
    // Reload schools
    loadSchools();
  })
  .catch(error => {
    console.error('Delete school error:', error);
    showAlert(error.message, 'danger');
    
    // Hide modal
    if (deleteConfirmModal) deleteConfirmModal.hide();
  })
  .finally(() => {
    // Reset button state
    if (confirmDeleteBtn) {
      confirmDeleteBtn.disabled = false;
      confirmDeleteBtn.innerHTML = 'Delete';
    }
  });
}

// Show alert message
function showAlert(message, type = 'info', timeout = 5000) {
  const alertContainer = document.getElementById('alert-container');
  if (!alertContainer) {
    console.error('Alert container not found');
    console.log(message); // Log the message instead
    return;
  }
  
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
  alertDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;
  
  alertContainer.appendChild(alertDiv);
  
  if (timeout) {
    setTimeout(() => {
      alertDiv.classList.remove('show');
      setTimeout(() => alertDiv.remove(), 150);
    }, timeout);
  }
}

// Format date string
function formatDate(dateString) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
}