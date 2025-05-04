document.addEventListener('DOMContentLoaded', () => {
  const background = document.querySelector('.background');
  const letter = document.querySelector('.letter');
  const welcomeMessage = document.querySelector('.welcome-message');
  
  const BACKGROUND_MOVEMENT_FACTOR = 20;
  const FOREGROUND_MOVEMENT_FACTOR = 50;
  
  document.addEventListener('mousemove', (e) => {
    // Move background effect
    if (background) {
      const mouseXRatio = e.clientX / window.innerWidth;
      const mouseYRatio = e.clientY / window.innerHeight;
      
      const moveX = BACKGROUND_MOVEMENT_FACTOR * mouseXRatio;
      const moveY = BACKGROUND_MOVEMENT_FACTOR * mouseYRatio;
      
      background.style.transform = `translate(${moveX}px, ${moveY}px)`;
    }
    
    // Move letter or welcome message
    const elementToMove = letter || welcomeMessage;
    if (elementToMove) {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const offsetX = (e.clientX - centerX) / FOREGROUND_MOVEMENT_FACTOR;
      const offsetY = (e.clientY - centerY) / FOREGROUND_MOVEMENT_FACTOR;
      
      elementToMove.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`;
    }
  });
}); 