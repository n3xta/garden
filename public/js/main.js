const AudioEffects = {
  sounds: {},

  preload: function(urls) {
    if (!Array.isArray(urls)) {
      urls = [urls];
    }

    urls.forEach(url => {
      if (!this.sounds[url]) {
        this.sounds[url] = new Audio(url);
      }
    });
  },

  play: function(url) {
    if (!this.sounds[url]) {
      this.sounds[url] = new Audio(url);
    }
    
    this.sounds[url].currentTime = 0;
    this.sounds[url].play().catch(err => {
      console.warn('音效播放失败:', err);
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  AudioEffects.preload([
    '/samples/ui/paper.wav',
    '/samples/ui/wood.wav',
    '/samples/ui/save.wav',
    '/samples/ui/explore.wav',
    '/samples/ui/garden.wav'
  ]);
});

document.addEventListener('DOMContentLoaded', () => {
  const isAuthPage = window.location.pathname === '/login' || window.location.pathname === '/register';
  const isIndexPage = window.location.pathname === '/' || window.location.pathname === '/index';
  
  initTiltEffects();
  
  if (isAuthPage) {
    initAuthPage();
  } else if (isIndexPage) {
    initAuthTransitionLinks();
  }
});

function initTiltEffects() {
  const tiltElements = document.querySelectorAll('[data-tilt]');
  if (tiltElements.length > 0) {
    VanillaTilt.init(tiltElements);
  }
}

function initAuthPage() {
  const fromAuthPage = document.referrer.includes('/login') || document.referrer.includes('/register');
  
  if (typeof AudioEffects !== 'undefined') {
    AudioEffects.play('/samples/ui/paper.wav');
  } else {
    const paperSound = new Audio('/samples/ui/paper.wav');
    paperSound.play();
  }
  
  const formWrapper = document.querySelector('.form-wrapper');
  const formContainer = document.querySelector('.form-container');
  
  if (formWrapper) {
    formWrapper.style.opacity = '1';
    
    if (fromAuthPage && formContainer) {
      formContainer.classList.add('enter-from-below');
    }
  }
  
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

function initAuthTransitionLinks() {
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

function handleAuthTransition(event, formType) {
  event.preventDefault();
  
  if (!document.querySelector('.transition-overlay')) {
    const overlay = document.createElement('div');
    overlay.className = 'transition-overlay';
    document.body.appendChild(overlay);
    
    overlay.offsetHeight;
  }
  
  const overlay = document.querySelector('.transition-overlay');
  
  const woodImage = new Image();
  woodImage.onload = () => {
    if (typeof AudioEffects !== 'undefined') {
      AudioEffects.play('/samples/ui/wood.wav');
    } else {
      const woodSound = new Audio('/samples/ui/wood.wav');
      woodSound.play();
    }
    
    overlay.classList.add('active');
    
    setTimeout(() => {
      window.location.href = formType === 'login' ? '/login' : '/register';
    }, 1200);
  };
  
  woodImage.src = '/img/wood.jpg';
  if (woodImage.complete) {
    woodImage.onload();
  }
}

function handleAuthPageTransition(event, formType) {
  event.preventDefault();
  
  if (typeof AudioEffects !== 'undefined') {
    AudioEffects.play('/samples/ui/paper.wav');
  } else {
    const paperSound = new Audio('/samples/ui/paper.wav');
    paperSound.play();
  }
  
  const currentFormContainer = document.querySelector('.form-container');
  const formWrapper = document.querySelector('.form-wrapper');
  
  currentFormContainer.classList.add('exit-up');
  
  if (formWrapper) {
    formWrapper.style.transition = 'opacity 0.9s ease-out';
    formWrapper.style.opacity = '0';
  }
  
  setTimeout(() => {
    window.location.href = formType === 'login' ? '/login' : '/register';
  }, 900);
}