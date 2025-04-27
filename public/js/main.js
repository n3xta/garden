document.addEventListener('DOMContentLoaded', () => {
  // Mouse parallax effect for background with reduced movement
  const background = document.querySelector('.background');
  
  document.addEventListener('mousemove', (e) => {
    const mouseX = e.clientX / window.innerWidth;
    const mouseY = e.clientY / window.innerHeight;
    
    // Reduced movement amount
    const moveX = 10 * mouseX;
    const moveY = 10 * mouseY;
    
    background.style.transform = `translate(${moveX}px, ${moveY}px)`;
  });
  
  // Set elements to visible immediately instead of using animations
  document.querySelector('.title').style.opacity = '1';
  document.querySelector('.title').style.transform = 'translateY(0)';
  
  document.querySelector('.subtitle').style.opacity = '0.7';
  document.querySelector('.subtitle').style.transform = 'translateY(0)';
  
  document.querySelector('.tiny-text').style.opacity = '0.5';
  document.querySelector('.tiny-text').style.transform = 'translateY(0)';
  
  document.querySelector('.hidden-nav').style.opacity = '1';
  
  document.querySelector('.intro-text').style.opacity = '1';
  document.querySelector('.intro-text').style.transform = 'translateY(0)';
  
  // Create garden form
  const createBtn = document.getElementById('create-garden');
  const overlay = document.getElementById('overlay');
  const createForm = document.getElementById('create-form');
  const closeBtn = document.querySelector('.close-btn');
  
  createBtn.addEventListener('click', () => {
    overlay.classList.add('active');
    createForm.classList.add('active');
  });
  
  closeBtn.addEventListener('click', () => {
    overlay.classList.remove('active');
    createForm.classList.remove('active');
  });
  
  overlay.addEventListener('click', () => {
    overlay.classList.remove('active');
    createForm.classList.remove('active');
  });
}); 