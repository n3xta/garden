const gardensGrid = document.getElementById('gardens-grid');
const loadingIndicator = document.getElementById('loading');
const errorMessage = document.getElementById('error-message');
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const clearButton = document.getElementById('clear-button');
const searchOverlay = document.getElementById('search-overlay');
const background = document.querySelector('.background');

let gardens = [];
let scrollPosition = 0;
let targetScrollPosition = 0;
let totalWidth = 0;
let originalContentWidth = 0;
let cardWidth = 0;
let gapWidth = 20;
let cloneBeforeWidth = 0; 
let cloneCount = 0;
let isScrolling = false;
let animationFrame = null;
let scrollTimeout = null;
let cardIndex = 0; 
let isFiltered = false;

document.addEventListener('DOMContentLoaded', function() {
  if (typeof AudioEffects !== 'undefined') {
    AudioEffects.play('/samples/ui/explore.wav');
  } else {
    const exploreSound = new Audio('/samples/ui/explore.wav');
    exploreSound.play();
  }
  
  setupTiltEffect();
  
  if (typeof VanillaTilt === 'undefined') {
    console.error('VanillaTilt is not loaded!');
    loadVanillaTilt();
  } else {
    console.log('VanillaTilt is loaded');
  }
  
  fetchGardens();

  searchButton.addEventListener('click', toggleSearchOverlay);
  clearButton.addEventListener('click', clearSearch);
  searchInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
      handleSearch();
      toggleSearchOverlay();
    }
  });
  
  searchOverlay.addEventListener('click', (e) => {
    if (e.target === searchOverlay) {
      toggleSearchOverlay();
    }
  });
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && searchOverlay.classList.contains('active')) {
      toggleSearchOverlay();
    }
  });
  
  window.addEventListener('wheel', handleWheel, { passive: false });
  
  window.addEventListener('resize', updateDimensions);
});

function toggleSearchOverlay() {
  searchOverlay.classList.toggle('active');
  if (searchOverlay.classList.contains('active')) {
    searchInput.focus();
    searchInput.value = '';
  }
}

function clearSearch() {
  console.log("==== CLEARING SEARCH ====");
  
  clearButton.classList.remove('active');
  isFiltered = false;
  
  errorMessage.style.display = 'none';
  
  const existingClones = gardensGrid.querySelectorAll('.garden-card.clone');
  existingClones.forEach(clone => clone.remove());
  
  const gardenCards = gardensGrid.querySelectorAll('.garden-card:not(.clone)');
  gardenCards.forEach(card => {
    card.style.display = 'flex';
    card.style.visibility = 'visible';
    card.style.opacity = '1';
  });
  
  scrollPosition = 0;
  targetScrollPosition = 0;
  gardensGrid.style.transform = 'translateX(0)';
  
  void gardensGrid.offsetWidth;
  
  updateDimensions();
  
  console.log("Search cleared, showing all gardens");
}

function loadVanillaTilt() {
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/vanilla-tilt@1.8.1/dist/vanilla-tilt.min.js';
  script.onload = () => {
    console.log('VanillaTilt loaded dynamically');
    initTiltEffects();
  };
  document.head.appendChild(script);
}

function setupTiltEffect() {
  document.addEventListener('mousemove', function(e) {
    const moveX = (e.clientX - window.innerWidth / 2) * 0.01;
    const moveY = (e.clientY - window.innerHeight / 2) * 0.01;
    background.style.transform = `translate(${moveX}px, ${moveY}px)`;
  });
}

function handleWheel(e) {
  if (searchOverlay.classList.contains('active')) return;
  
  if (totalWidth <= window.innerWidth) return;
  
  e.preventDefault();
  
  isScrolling = true;
  
  if (scrollTimeout) {
    clearTimeout(scrollTimeout);
  }
  
  scrollTimeout = setTimeout(handleScrollEnd, 150);
  
  const delta = e.deltaY;
  const direction = delta > 0 ? 1 : -1;
  const scrollAmount = direction * 30;
  
  targetScrollPosition += scrollAmount;
  
  if (!animationFrame) {
    animationFrame = requestAnimationFrame(animateScroll);
  }
}

function handleScrollEnd() {
  isScrolling = false;
  
  if (scrollPosition < cloneBeforeWidth || 
      scrollPosition > totalWidth - cloneBeforeWidth) {
    
    // 计算相对于原始内容的位置 (模运算)
    const relativePos = (scrollPosition - cloneBeforeWidth) % originalContentWidth;
    
    // 如果是负数，调整到正确的相对位置
    const adjustedRelativePos = relativePos < 0 ? 
      originalContentWidth + relativePos : relativePos;
    
    // 计算新的滚动位置 (新位置 = 前置克隆宽度 + 相对位置)
    const newPosition = cloneBeforeWidth + adjustedRelativePos;
    
    // 无缝跳转
    gardensGrid.style.transition = 'none';
    scrollPosition = newPosition;
    targetScrollPosition = newPosition;
    gardensGrid.style.transform = `translateX(-${newPosition}px)`;
    
    // 强制重排
    void gardensGrid.offsetWidth;
  }
}

function animateScroll() {
  const diff = targetScrollPosition - scrollPosition;
  
  if (Math.abs(diff) < 0.5) {
    scrollPosition = targetScrollPosition;
    animationFrame = null;
  } else {
    scrollPosition += diff * 0.1;
    animationFrame = requestAnimationFrame(animateScroll);
  }
  
  gardensGrid.style.transform = `translateX(-${scrollPosition}px)`;
}

function handleSearch() {
  console.log("==== SEARCH STARTED ====");
  const searchTerm = searchInput.value.trim().toLowerCase();
  console.log("Search term:", JSON.stringify(searchTerm));
  
  errorMessage.style.display = 'none';
  
  const existingClones = gardensGrid.querySelectorAll('.garden-card.clone');
  console.log(`Removing ${existingClones.length} existing clones`);
  existingClones.forEach(clone => clone.remove());
  
  const gardenCards = gardensGrid.querySelectorAll('.garden-card:not(.clone)');
  console.log(`Found ${gardenCards.length} original cards to search through`);
  
  let visibleCardCount = 0;
  
  if (searchTerm === '') {
    console.log("Empty search term - showing all cards");
    gardenCards.forEach(card => {
      card.style.display = 'flex';
      card.style.visibility = 'visible';
      card.style.opacity = '1';
      visibleCardCount++;
    });
    
    clearButton.classList.remove('active');
    isFiltered = false;
  } else {
    gardenCards.forEach((card, index) => {
      const gardenName = card.querySelector('.garden-name').textContent.toLowerCase();
      const ownerName = card.querySelector('.garden-owner').textContent.toLowerCase();
      
      console.log(`Card ${index}: Garden="${gardenName}", Owner="${ownerName}"`);
      
      if (gardenName.includes(searchTerm) || ownerName.includes(searchTerm)) {
        console.log(`Card ${index} matches search term`);
        card.style.display = 'flex';
        card.style.visibility = 'visible';
        card.style.opacity = '1';
        visibleCardCount++;
      } else {
        console.log(`Card ${index} does not match search term`);
        card.style.display = 'none';
        card.style.visibility = 'hidden';
        card.style.opacity = '0';
      }
    });
    
    clearButton.classList.add('active');
    isFiltered = true;
  }
  
  console.log(`Search results: ${visibleCardCount} matches found for "${searchTerm}"`);
  
  if (visibleCardCount > 0) {
    console.log("Updating dimensions with visible cards");
    
    scrollPosition = 0;
    targetScrollPosition = 0;
    gardensGrid.style.transform = 'translateX(0)';
    
    const visibleCards = Array.from(gardenCards).filter(card => card.style.display !== 'none');
    console.log(`Visible cards after filtering: ${visibleCards.length}`);
    
    void gardensGrid.offsetWidth;
    
    updateDimensions();
  } else if (searchTerm !== '') {
    console.log("No cards match the search term");
    errorMessage.textContent = `No gardens found matching "${searchTerm}"`;
    errorMessage.style.display = 'block';
    
    scrollPosition = 0;
    targetScrollPosition = 0;
    gardensGrid.style.transform = 'translateX(0)';
  }
}

async function fetchGardens() {
  try {
    loadingIndicator.style.display = 'block';
    errorMessage.style.display = 'none';
    gardensGrid.innerHTML = '';
    cardIndex = 0;
    
    const response = await fetch('/api/gardens');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch gardens: ${response.status} ${response.statusText}`);
    }
    
    gardens = await response.json();
    
    if (gardens.length === 0) {
      loadingIndicator.textContent = 'No gardens found';
      return;
    }
    
    gardens.sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    
    gardens.forEach(garden => {
      const gardenCard = createGardenCard(garden);
      gardensGrid.appendChild(gardenCard);
      cardIndex++;
    });
    
    loadingIndicator.style.display = 'none';
    
    setTimeout(updateDimensions, 100);
  } catch (error) {
    console.error('Error fetching gardens:', error);
    loadingIndicator.style.display = 'none';
    errorMessage.textContent = 'Error loading gardens. Please try again later.';
    errorMessage.style.display = 'block';
  }
}

function createGardenCard(garden, isClone = false) {
  const card = document.createElement('div');
  card.className = 'garden-card';
  if (isClone) card.classList.add('clone');
  card.dataset.id = garden.id;
  card.addEventListener('click', () => viewGarden(garden.id));
  card.style.cursor = "pointer";
  
  const backgroundId = garden.backgroundId || 1;
  
  const cardHTML = `
    <div class="garden-preview">
      <img src="/img/garden_bg/${backgroundId}.jpg" alt="${garden.gardenName}" class="garden-bg-image">
    </div>
    <div class="garden-info">
      <h3 class="garden-name">${garden.gardenName || 'Untitled Garden'}</h3>
      <p class="garden-owner">By: ${garden.username}</p>
      <div class="garden-stats">
        <span>${garden.plantsCount} plants</span>
        <span>Created: ${formatDate(garden.createdAt)}</span>
      </div>
    </div>
  `;
  
  card.innerHTML = cardHTML;
  return card;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return dateString;
  }
  return date.toLocaleDateString();
}

function viewGarden(gardenId) {
  const transitionLayer = document.querySelector('.cd-transition-layer');
  const bgLayer = transitionLayer.querySelector('.bg-layer');
  
  transitionLayer.classList.add('visible', 'opening');
  
  bgLayer.addEventListener('animationend', function onEnd() {
    window.location.href = `/view/${gardenId}`;
    bgLayer.removeEventListener('animationend', onEnd);
  });
}

function updateDimensions() {
  if (gardens.length === 0) {
    console.log("No garden data available");
    return;
  }

  const visibleOriginalCards = Array.from(gardensGrid.querySelectorAll('.garden-card:not(.clone)'))
    .filter(card => card.style.display !== 'none');
  
  console.log(`Updating dimensions with ${visibleOriginalCards.length} visible original cards`);
  
  if (visibleOriginalCards.length === 0) {
    console.log("No visible cards found");
    totalWidth = 0;
    cloneBeforeWidth = 0;
    gardensGrid.style.transform = 'translateX(0)';
    return;
  }
  
  const existingClones = gardensGrid.querySelectorAll('.garden-card.clone');
  existingClones.forEach(clone => clone.remove());
  
  cardWidth = visibleOriginalCards[0].offsetWidth + gapWidth;
  originalContentWidth = cardWidth * visibleOriginalCards.length;
  
  console.log(`Card width: ${cardWidth}px, Total original content width: ${originalContentWidth}px`);
  
  cloneCount = Math.ceil(window.innerWidth / cardWidth) + 4;
  
  console.log(`Creating ${cloneCount} clones before and after visible cards`);
  
  for (let i = visibleOriginalCards.length - cloneCount; i < visibleOriginalCards.length; i++) {
    const index = i >= 0 ? i : visibleOriginalCards.length + i;
    if (index < 0 || index >= visibleOriginalCards.length) continue;
    
    const card = visibleOriginalCards[index];
    if (!card) continue;
    
    const clone = card.cloneNode(true);
    clone.classList.add('clone');
    clone.style.display = 'flex';
    clone.style.visibility = 'visible';
    clone.style.opacity = '1';
    gardensGrid.insertBefore(clone, gardensGrid.firstChild);
  }
  
  for (let i = 0; i < cloneCount; i++) {
    const index = i % visibleOriginalCards.length;
    if (index < 0 || index >= visibleOriginalCards.length) continue;
    
    const card = visibleOriginalCards[index];
    if (!card) continue;
    
    const clone = card.cloneNode(true);
    clone.classList.add('clone');
    clone.style.display = 'flex';
    clone.style.visibility = 'visible';
    clone.style.opacity = '1';
    gardensGrid.appendChild(clone);
  }
  
  // 计算新的尺寸
  const allVisibleCards = gardensGrid.querySelectorAll('.garden-card:not([style*="display: none"])');
  totalWidth = cardWidth * allVisibleCards.length;
  
  const beforeClones = gardensGrid.querySelectorAll('.garden-card.clone:nth-child(-n+' + cloneCount + ')');
  cloneBeforeWidth = beforeClones.length * cardWidth;
  
  console.log(`Total width with clones: ${totalWidth}px, Clone before width: ${cloneBeforeWidth}px`);
  
  scrollPosition = cloneBeforeWidth;
  targetScrollPosition = cloneBeforeWidth;
  gardensGrid.style.transition = 'none';
  gardensGrid.style.transform = `translateX(-${scrollPosition}px)`;
  
  void gardensGrid.offsetWidth;
  gardensGrid.style.transition = 'transform 0.5s ease';
  
  console.log("Dimensions updated, applying tilt effects");
  
  setTimeout(initTiltEffects, 100);
}

function initTiltEffects() {
  if (typeof VanillaTilt === 'undefined') {
    console.error('VanillaTilt is still not loaded when initializing tilt effects');
    return;
  }
  
  console.log('Initializing tilt effects for cards');
  const cards = document.querySelectorAll('.garden-card');
  
  cards.forEach((card, index) => {
    // 移除现有的VanillaTilt实例（如果有的话）
    if (card.vanillaTilt) {
      card.vanillaTilt.destroy();
    }
    
    // 根据索引奇偶性设置tilt方向
    const isOdd = index % 2 === 0;
    const startX = isOdd ? -20 : 20;
    
    card.setAttribute('data-tilt', '');
    card.setAttribute('data-tilt-startX', startX);
    card.setAttribute('data-tilt-reset-to-start', 'true');
    
    // 应用tilt效果
    VanillaTilt.init(card, {
      max: 15,
      speed: 400,
      glare: true,
      'max-glare': 0.3,
      gyroscope: false,
      scale: 1.02,
      perspective: 1000,
      reset: true,
      transition: true,
      startX: startX,
      axis: 'x'
    });
    
    console.log(`Applied tilt to card ${index}, startX: ${startX}`);
  });
  
  console.log(`Total tilt effects applied: ${cards.length}`);
} 