// Function to handle the transition to auth pages
function handleAuthTransition(event, formType) {
  event.preventDefault();
  
  // Create the transition overlay if it doesn't exist
  if (!document.querySelector('.transition-overlay')) {
    const overlay = document.createElement('div');
    overlay.className = 'transition-overlay';
    document.body.appendChild(overlay);
    
    // Force a reflow to ensure the initial state is applied
    overlay.offsetHeight;
  }
  
  // Get the overlay
  const overlay = document.querySelector('.transition-overlay');
  
  // Play wood sound when starting the transition
  const woodSound = new Audio('/samples/ui/wood.wav');
  woodSound.play();
  
  // Start the animation - just the wood background
  setTimeout(() => {
    overlay.classList.add('active');
    
    // Navigate to the appropriate page after wood animation completes
    // Don't show the form until the page is loaded
    setTimeout(() => {
      window.location.href = formType === 'login' ? '/login' : '/register';
    }, 1000);
  }, 100);
}

// Function to handle vertical form switching transitions between login and register
function handleAuthPageTransition(event, formType) {
  event.preventDefault();
  
  // Play the paper sound for the transition
  const paperSound = new Audio('/samples/ui/paper.wav');
  paperSound.play();
  
  // Get the current form container
  const currentFormContainer = document.querySelector('.form-container');
  
  // Add exit animation to the current form
  currentFormContainer.classList.add('exit-up');
  
  // Create a new container for the switching animation
  const switchingContainer = document.createElement('div');
  switchingContainer.className = 'form-switching-container';
  document.body.appendChild(switchingContainer);
  
  // Create a new form container
  const newFormContainer = document.createElement('div');
  newFormContainer.className = formType === 'login' ? 'form-container login-form' : 'form-container signup-form';
  
  // Create the new tilt container
  const tiltDiv = document.createElement('div');
  tiltDiv.setAttribute('data-tilt', '');
  tiltDiv.setAttribute('data-tilt-max', '5');
  tiltDiv.setAttribute('data-tilt-speed', '400');
  tiltDiv.setAttribute('data-tilt-perspective', '500');
  tiltDiv.className = 'tilt-container';
  
  // Create the form image
  const formImage = document.createElement('img');
  formImage.src = formType === 'login' 
    ? '/2dassets/login_form.png' 
    : '/2dassets/signup_form.png';
  formImage.alt = formType === 'login' ? 'Login Form' : 'Signup Form';
  formImage.className = 'form-image show-image';
  
  // Create input overlay
  const inputOverlay = document.createElement('div');
  inputOverlay.className = 'input-overlay show-inputs';
  
  // Set initial style before animation
  newFormContainer.style.transform = 'translateY(50vh)';
  newFormContainer.style.opacity = '0';
  
  // Add everything to the DOM
  tiltDiv.appendChild(formImage);
  tiltDiv.appendChild(inputOverlay);
  newFormContainer.appendChild(tiltDiv);
  switchingContainer.appendChild(newFormContainer);
  
  // Start entering animation
  setTimeout(() => {
    newFormContainer.classList.add('enter-from-below');
    
    // After animation completes, navigate to the new page
    setTimeout(() => {
      window.location.href = formType === 'login' ? '/login' : '/register';
    }, 600);
  }, 100);
}

// Function to initialize the auth page (login or register)
function initAuthPage() {
  // Show the form with animation and play sound effect
  setTimeout(() => {
    const paperSound = new Audio('/samples/ui/paper.wav');
    paperSound.play();
    
    // Make form visible
    const formWrapper = document.querySelector('.form-wrapper');
    if (formWrapper) {
      formWrapper.style.opacity = '1';
    }
    
    // Initialize vanilla tilt if it exists
    if (typeof VanillaTilt !== 'undefined') {
      const tiltElements = document.querySelectorAll('[data-tilt]');
      if (tiltElements.length > 0) {
        VanillaTilt.init(tiltElements);
      }
    }
  }, 200);
  
  // Add event listeners for login/signup links within auth pages
  const loginLink = document.querySelector('.login-link');
  const signupLink = document.querySelector('.signup-link');
  
  if (loginLink) {
    loginLink.addEventListener('click', function(event) {
      handleAuthPageTransition(event, 'login');
    });
  }
  
  if (signupLink) {
    signupLink.addEventListener('click', function(event) {
      handleAuthPageTransition(event, 'signup');
    });
  }
}

// Initialize event listeners when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
  const isAuthPage = window.location.pathname === '/login' || window.location.pathname === '/register';
  
  if (isAuthPage) {
    // Initialize auth page
    initAuthPage();
  } else {
    // Add event listeners to the login and signup links on the index page
    const loginLink = document.querySelector('.login-link');
    const signupLink = document.querySelector('.signup-link');
    
    if (loginLink) {
      loginLink.addEventListener('click', function(event) {
        handleAuthTransition(event, 'login');
      });
    }
    
    if (signupLink) {
      signupLink.addEventListener('click', function(event) {
        handleAuthTransition(event, 'signup');
      });
    }
  }
}); 