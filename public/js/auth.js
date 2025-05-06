/**
 * Authentication Pages JavaScript
 * Handles login and register page functionality
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize the auth forms
  setupAuthForms();
  
  // Add save button to the corner
  addSaveButtonToCorner();

  // Initialize form submission handlers
  initFormSubmitHandlers();
});

/**
 * Setup the authentication forms with appropriate styling and effects
 */
function setupAuthForms() {
  // Make sure the form wrapper is visible
  const formWrapper = document.querySelector('.form-wrapper');
  if (formWrapper) {
    formWrapper.style.opacity = '1';
  }

}

/**
 * Add save button to the right bottom corner of the form
 */
function addSaveButtonToCorner() {
  // Remove the existing submit button from the form (it's hidden via CSS but let's be thorough)
  const existingButton = document.querySelector('.img-submit-btn');
  if (existingButton) {
    existingButton.style.display = 'none';
  }
  
  // Create new save button container
  const saveContainer = document.createElement('div');
  saveContainer.className = 'save-btn-container';
  
  // Get reference to the image path from the hidden button
  let imgSrc = '/img/save.webp';
  const existingImg = document.querySelector('.submit-img');
  if (existingImg) {
    imgSrc = existingImg.getAttribute('src');
  }
  
  // Create the image element
  const saveImg = document.createElement('img');
  saveImg.className = 'submit-img';
  saveImg.src = imgSrc;
  saveImg.alt = 'Save';
  
  // Add the image to the container
  saveContainer.appendChild(saveImg);
  
  // Add container to the tilt container (not the form container) to make it tilt with the form
  const tiltContainer = document.querySelector('.tilt-container');
  if (tiltContainer) {
    // Add parallax-item class to make it behave like other parallax items
    saveContainer.classList.add('parallax-item');
    tiltContainer.appendChild(saveContainer);
  }
  
  // Add click event to the save button
  saveImg.addEventListener('click', function() {
    // Find the form
    const form = document.querySelector('form');
    if (form) {
      // Submit the form
      form.submit();
    }
  });
}

/**
 * Initialize form submission handlers
 */
function initFormSubmitHandlers() {
  // Get the current form
  const currentForm = document.querySelector('form');
  
  if (currentForm) {
    // Prevent default form submission
    currentForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      // Validate the form
      if (validateForm(currentForm)) {
        // If valid, submit the form programmatically
        currentForm.submit();
      }
    });
  }
}

/**
 * Validate form inputs before submission
 * @param {HTMLFormElement} form - The form to validate
 * @returns {boolean} - Whether the form is valid
 */
function validateForm(form) {
  let isValid = true;
  
  // Check if this is the signup form
  const isSignupForm = form.getAttribute('id') === 'signup-form';
  
  // Get username and password fields
  const username = form.querySelector('input[name="username"]').value;
  const password = form.querySelector('input[name="password"]').value;
  
  // Simple validation
  if (username.length < 3) {
    showError('Username must be at least 3 characters long');
    isValid = false;
  }
  
  if (password.length < 6) {
    showError('Password must be at least 6 characters long');
    isValid = false;
  }
  
  // If signup form, check password confirmation
  if (isSignupForm) {
    const confirmPassword = form.querySelector('input[name="confirmpassword"]').value;
    
    if (password !== confirmPassword) {
      showError('Passwords do not match');
      isValid = false;
    }
  }
  
  return isValid;
}

/**
 * Show error message in the form
 * @param {string} message - The error message to display
 */
function showError(message) {
  // Find existing error message element or create a new one
  let errorElement = document.querySelector('.error-message');
  
  if (!errorElement) {
    errorElement = document.createElement('p');
    errorElement.className = 'error-message';
    
    // Insert in the form container instead of inside the form
    const formContainer = document.querySelector('.form-container');
    if (formContainer) {
      formContainer.appendChild(errorElement);
    } else {
      // Fallback to form if container not found
      const form = document.querySelector('form');
      form.insertBefore(errorElement, form.firstChild);
    }
  }
  
  errorElement.textContent = message;
} 