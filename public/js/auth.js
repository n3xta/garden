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
  
  // Navigate to the new page after exit animation starts
  setTimeout(() => {
    // Simply navigate to the target page and let it handle its own entrance animation
    window.location.href = formType === 'login' ? '/login' : '/register';
  }, 500); // 延长动画时间，确保用户可以看到完整的上滑动画
}

// Function to initialize the auth page (login or register)
function initAuthPage() {
  // Check if this page is being navigated to from another auth page
  const fromAuthPage = document.referrer.includes('/login') || document.referrer.includes('/register');
  
  // Show the form with animation and play sound effect
  setTimeout(() => {
    const paperSound = new Audio('/samples/ui/paper.wav');
    paperSound.play();
    
    // Make form visible with entrance animation
    const formWrapper = document.querySelector('.form-wrapper');
    const formContainer = document.querySelector('.form-container');
    
    if (formWrapper) {
      formWrapper.style.opacity = '1';
      
      // Add entrance animation from below if coming from another auth page
      if (fromAuthPage && formContainer) {
        formContainer.classList.add('enter-from-below');
      }
    }
    
    // Initialize vanilla tilt if it exists
    if (typeof VanillaTilt !== 'undefined') {
      // Initialize background tilt with full page listening
      const background = document.querySelector('.background');
      if (background) {
        VanillaTilt.init(background, {
          max: 5,
          speed: 1000,
          scale: 1.05,
          perspective: 1000,
          fullPageListening: true
        });
      }
      
      // Initialize form tilt with 3D effect
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