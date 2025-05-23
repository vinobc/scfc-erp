// Password change functionality
let changePasswordModal;
let changePasswordForm;
let changePasswordAlert;
let currentPasswordField;
let newPasswordField;
let confirmPasswordField;
let savePasswordBtn;

// Initialize password change functionality
document.addEventListener("DOMContentLoaded", () => {
  console.log("password-change.js: DOM loaded");

  // Initialize DOM elements
  changePasswordModal = document.getElementById("changePasswordModal");
  changePasswordForm = document.getElementById("change-password-form");
  changePasswordAlert = document.getElementById("password-change-alert");
  currentPasswordField = document.getElementById("current-password-field");
  newPasswordField = document.getElementById("new-password-field");
  confirmPasswordField = document.getElementById("confirm-password-field");
  savePasswordBtn = document.getElementById("save-password-btn");

  // Setup event listeners
  setupPasswordChangeListeners();
});

// Setup event listeners
function setupPasswordChangeListeners() {
  const changePasswordLink = document.getElementById("change-password-link");

  if (changePasswordLink) {
    changePasswordLink.addEventListener("click", (e) => {
      e.preventDefault();
      showChangePasswordModal();
    });
  }

  if (savePasswordBtn) {
    savePasswordBtn.addEventListener("click", handlePasswordChange);
  }

  // Real-time password validation
  if (newPasswordField) {
    newPasswordField.addEventListener("input", validateNewPassword);
  }

  if (confirmPasswordField) {
    confirmPasswordField.addEventListener("input", validatePasswordMatch);
  }

  // Form submission with Enter key
  if (changePasswordForm) {
    changePasswordForm.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handlePasswordChange();
      }
    });
  }
}

// Show change password modal
function showChangePasswordModal() {
  console.log("Showing change password modal");

  // Reset form
  if (changePasswordForm) {
    changePasswordForm.reset();
  }

  // Clear alerts
  hidePasswordAlert();

  // Show modal
  if (changePasswordModal) {
    const modal = new bootstrap.Modal(changePasswordModal);
    modal.show();
  }
}

// Handle password change
function handlePasswordChange() {
  console.log("Handling password change");

  // Clear previous alerts
  hidePasswordAlert();

  // Get form values
  const currentPassword = currentPasswordField
    ? currentPasswordField.value
    : "";
  const newPassword = newPasswordField ? newPasswordField.value : "";
  const confirmPassword = confirmPasswordField
    ? confirmPasswordField.value
    : "";

  // Validate form
  const validation = validatePasswordForm(
    currentPassword,
    newPassword,
    confirmPassword
  );
  if (!validation.isValid) {
    showPasswordAlert(validation.message, "danger");
    return;
  }

  // Disable button and show loading
  if (savePasswordBtn) {
    savePasswordBtn.disabled = true;
    savePasswordBtn.innerHTML =
      '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Changing...';
  }

  // Send password change request
  fetch(`${window.API_URL}/auth/change-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: localStorage.getItem("token"),
    },
    body: JSON.stringify({
      currentPassword,
      newPassword,
    }),
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((data) => {
          throw new Error(data.message || "Failed to change password");
        });
      }
      return response.json();
    })
    .then((data) => {
      showPasswordAlert("Password changed successfully!", "success");

      // Reset form after short delay
      setTimeout(() => {
        if (changePasswordForm) {
          changePasswordForm.reset();
        }
        if (changePasswordModal) {
          const modal = bootstrap.Modal.getInstance(changePasswordModal);
          if (modal) modal.hide();
        }

        // Show global success message
        if (typeof window.showAlert === "function") {
          window.showAlert(
            "Your password has been changed successfully!",
            "success"
          );
        }
      }, 1500);
    })
    .catch((error) => {
      console.error("Password change error:", error);
      showPasswordAlert(error.message, "danger");
    })
    .finally(() => {
      // Reset button state
      if (savePasswordBtn) {
        savePasswordBtn.disabled = false;
        savePasswordBtn.innerHTML = "Change Password";
      }
    });
}

// Validate password form
function validatePasswordForm(currentPassword, newPassword, confirmPassword) {
  if (!currentPassword) {
    return { isValid: false, message: "Current password is required" };
  }

  if (!newPassword) {
    return { isValid: false, message: "New password is required" };
  }

  if (!confirmPassword) {
    return { isValid: false, message: "Please confirm your new password" };
  }

  // Check password complexity
  const complexityCheck = validatePasswordComplexity(newPassword);
  if (!complexityCheck.isValid) {
    return complexityCheck;
  }

  // Check password match
  if (newPassword !== confirmPassword) {
    return { isValid: false, message: "New passwords do not match" };
  }

  // Check if new password is different from current
  if (currentPassword === newPassword) {
    return {
      isValid: false,
      message: "New password must be different from current password",
    };
  }

  return { isValid: true };
}

// Validate password complexity
function validatePasswordComplexity(password) {
  if (password.length < 8) {
    return {
      isValid: false,
      message: "Password must be at least 8 characters long",
    };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      isValid: false,
      message: "Password must contain at least one uppercase letter",
    };
  }

  if (!/[a-z]/.test(password)) {
    return {
      isValid: false,
      message: "Password must contain at least one lowercase letter",
    };
  }

  if (!/\d/.test(password)) {
    return {
      isValid: false,
      message: "Password must contain at least one digit",
    };
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return {
      isValid: false,
      message: "Password must contain at least one special character",
    };
  }

  return { isValid: true };
}

// Real-time new password validation
function validateNewPassword() {
  if (!newPasswordField) return;

  const password = newPasswordField.value;
  if (password.length === 0) return;

  const validation = validatePasswordComplexity(password);

  if (validation.isValid) {
    newPasswordField.classList.remove("is-invalid");
    newPasswordField.classList.add("is-valid");
  } else {
    newPasswordField.classList.remove("is-valid");
    newPasswordField.classList.add("is-invalid");
  }
}

// Real-time password match validation
function validatePasswordMatch() {
  if (!newPasswordField || !confirmPasswordField) return;

  const newPassword = newPasswordField.value;
  const confirmPassword = confirmPasswordField.value;

  if (confirmPassword.length === 0) return;

  if (newPassword === confirmPassword) {
    confirmPasswordField.classList.remove("is-invalid");
    confirmPasswordField.classList.add("is-valid");
  } else {
    confirmPasswordField.classList.remove("is-valid");
    confirmPasswordField.classList.add("is-invalid");
  }
}

// Show password alert
function showPasswordAlert(message, type) {
  if (!changePasswordAlert) return;

  changePasswordAlert.textContent = message;
  changePasswordAlert.className = `alert alert-${type}`;
  changePasswordAlert.classList.remove("d-none");
}

// Hide password alert
function hidePasswordAlert() {
  if (!changePasswordAlert) return;

  changePasswordAlert.classList.add("d-none");
}
