document.addEventListener('DOMContentLoaded', () => {
  const background = document.querySelector('.background');
  
  document.addEventListener('mousemove', (e) => {
    const mouseX = e.clientX / window.innerWidth;
    const mouseY = e.clientY / window.innerHeight;
    
    const moveX = 20 * mouseX;
    const moveY = 20 * mouseY;
    
    background.style.transform = `translate(${moveX}px, ${moveY}px)`;
  });
  
  const letter = document.querySelector('.letter');
  
  document.addEventListener('mousemove', (e) => {
    const mouseX = e.clientX / window.innerWidth;
    const mouseY = e.clientY / window.innerHeight;
    
    const moveX = 40 * mouseX;
    const moveY = 40 * mouseY;
    
    letter.style.transform = `translate(calc(-50% + ${moveX}px), calc(-50% + ${moveY}px))`;
  });

}); 