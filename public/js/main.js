document.addEventListener('DOMContentLoaded', () => {
  // Initialize the tilt effect for background
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
  
  // Initialize the tilt effect for the letter or welcome message
  const letterElement = document.querySelector('.letter');
  const welcomeMessage = document.querySelector('.welcome-message');
  
  const elementToTilt = letterElement || welcomeMessage;
  if (elementToTilt) {
    VanillaTilt.init(elementToTilt, {
      max: 10,
      speed: 400,
      scale: 1.1,
      perspective: 1000,
      glare: true,
      'max-glare': 0.3
    });
  }
}); 