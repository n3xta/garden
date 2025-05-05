// DOM elements
const gardensGrid = document.getElementById('gardens-grid');
const loadingIndicator = document.getElementById('loading');
const errorMessage = document.getElementById('error-message');
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const background = document.querySelector('.background');

// Global variables
let gardens = []; // Store gardens data
let scrollPosition = 0;
let targetScrollPosition = 0;
let totalWidth = 0;
let originalContentWidth = 0;
let cardWidth = 0;
let gapWidth = 20; // Gap between cards in px
let cloneBeforeWidth = 0; // Width of clones before original items
let cloneCount = 0;
let isScrolling = false;
let animationFrame = null;
let scrollTimeout = null;
let cardIndex = 0; // 用于跟踪卡片索引（奇偶性）

// 页面初始化
document.addEventListener('DOMContentLoaded', function() {
  // Background tilt effect
  setupTiltEffect();
  
  // 确保VanillaTilt已加载
  if (typeof VanillaTilt === 'undefined') {
    console.error('VanillaTilt is not loaded!');
    loadVanillaTilt();
  } else {
    console.log('VanillaTilt is loaded');
  }
  
  // Get all gardens from API
  fetchGardens();

  // Event listeners
  searchButton.addEventListener('click', handleSearch);
  searchInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  });
  
  // Horizontal scroll with mouse wheel
  window.addEventListener('wheel', handleWheel, { passive: false });
  
  // Window resize event
  window.addEventListener('resize', updateDimensions);
});

// 加载VanillaTilt如果没有加载
function loadVanillaTilt() {
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/vanilla-tilt/1.8.0/vanilla-tilt.min.js';
  script.onload = () => {
    console.log('VanillaTilt loaded dynamically');
    initTiltEffects();
  };
  document.head.appendChild(script);
}

// Background tilt effect
function setupTiltEffect() {
  document.addEventListener('mousemove', function(e) {
    const moveX = (e.clientX - window.innerWidth / 2) * 0.01;
    const moveY = (e.clientY - window.innerHeight / 2) * 0.01;
    background.style.transform = `translate(${moveX}px, ${moveY}px)`;
  });
}

// Handle mouse wheel for horizontal scrolling
function handleWheel(e) {
  if (totalWidth <= window.innerWidth) return;
  
  e.preventDefault();
  
  // 标记正在滚动
  isScrolling = true;
  
  // 清除之前的滚动结束定时器
  if (scrollTimeout) {
    clearTimeout(scrollTimeout);
  }
  
  // 设置新的定时器来检测滚动停止
  scrollTimeout = setTimeout(handleScrollEnd, 150);
  
  const delta = e.deltaY;
  const direction = delta > 0 ? 1 : -1;
  const scrollAmount = direction * 30; // 降低单次滚动量，提高平滑度
  
  // 更新目标滚动位置
  targetScrollPosition += scrollAmount;
  
  // 如果没有动画在运行，启动滚动动画
  if (!animationFrame) {
    animationFrame = requestAnimationFrame(animateScroll);
  }
}

// 处理滚动结束事件
function handleScrollEnd() {
  isScrolling = false;
  
  // 检测是否位于需要重置的区域
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

// 滚动动画
function animateScroll() {
  // 平滑过渡到目标位置
  const diff = targetScrollPosition - scrollPosition;
  
  if (Math.abs(diff) < 0.5) {
    // 如果差值很小，直接设置到目标位置
    scrollPosition = targetScrollPosition;
    animationFrame = null;
  } else {
    // 平滑过渡
    scrollPosition += diff * 0.1;
    animationFrame = requestAnimationFrame(animateScroll);
  }
  
  // 应用变换
  gardensGrid.style.transform = `translateX(-${scrollPosition}px)`;
}

// Update dimensions after window resize or content change
function updateDimensions() {
  if (gardens.length === 0) return;
  
  // First, remove any existing clones
  const existingClones = gardensGrid.querySelectorAll('.garden-card.clone');
  existingClones.forEach(clone => clone.remove());
  
  // Get all original cards
  const originalCards = gardensGrid.querySelectorAll('.garden-card');
  
  if (originalCards.length > 0) {
    cardWidth = originalCards[0].offsetWidth + gapWidth;
    originalContentWidth = cardWidth * originalCards.length;
    
    // Calculate how many clones we need for smooth looping
    // We want at least one full screen width of clones on both sides
    cloneCount = Math.ceil(window.innerWidth / cardWidth) + 4; // 多复制几个，确保滚动顺畅
    
    // Add clones BEFORE the first card
    for (let i = originalCards.length - cloneCount; i < originalCards.length; i++) {
      const index = i >= 0 ? i : originalCards.length + i;
      const card = originalCards[index];
      const clone = card.cloneNode(true);
      clone.classList.add('clone');
      gardensGrid.insertBefore(clone, gardensGrid.firstChild);
    }
    
    // Add clones AFTER the last card
    for (let i = 0; i < cloneCount; i++) {
      const index = i % originalCards.length;
      const card = originalCards[index];
      const clone = card.cloneNode(true);
      clone.classList.add('clone');
      gardensGrid.appendChild(clone);
    }
    
    // Calculate new dimensions
    const allCards = gardensGrid.querySelectorAll('.garden-card');
    totalWidth = cardWidth * allCards.length;
    
    // Calculate width of clones before original items
    const beforeClones = gardensGrid.querySelectorAll('.garden-card.clone:nth-child(-n+' + cloneCount + ')');
    cloneBeforeWidth = beforeClones.length * cardWidth;
    
    // Initial positioning to show the original first items
    scrollPosition = cloneBeforeWidth;
    targetScrollPosition = cloneBeforeWidth;
    gardensGrid.style.transition = 'none';
    gardensGrid.style.transform = `translateX(-${scrollPosition}px)`;
    
    // Force reflow
    void gardensGrid.offsetWidth;
    
    // 初始化tilt效果（延迟执行以确保DOM已完全加载）
    setTimeout(initTiltEffects, 100);
  }
}

// 初始化所有卡片的tilt效果
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
      startX: startX
    });
    
    console.log(`Applied tilt to card ${index}, startX: ${startX}`);
  });
  
  console.log(`Total tilt effects applied: ${cards.length}`);
}

// 搜索功能
function handleSearch() {
  const searchTerm = searchInput.value.trim().toLowerCase();
  const gardenCards = gardensGrid.querySelectorAll('.garden-card:not(.clone)');
  
  if (searchTerm === '') {
    // Show all if search is empty
    gardenCards.forEach(card => {
      card.style.display = 'flex';
    });
    
    // Restore clones
    updateDimensions();
    return;
  }
  
  // First, remove any existing clones
  const existingClones = gardensGrid.querySelectorAll('.garden-card.clone');
  existingClones.forEach(clone => clone.remove());
  
  // Filter garden cards based on search term
  gardenCards.forEach(card => {
    const gardenName = card.querySelector('.garden-name').textContent.toLowerCase();
    const ownerName = card.querySelector('.garden-owner').textContent.toLowerCase();
    
    if (gardenName.includes(searchTerm) || ownerName.includes(searchTerm)) {
      card.style.display = 'flex';
    } else {
      card.style.display = 'none';
    }
  });
  
  // Update dimensions after filtering
  updateDimensions();
}

// API 调用获取花园数据
async function fetchGardens() {
  try {
    loadingIndicator.style.display = 'block';
    errorMessage.style.display = 'none';
    gardensGrid.innerHTML = '';
    cardIndex = 0; // 重置卡片索引
    
    const response = await fetch('/api/gardens');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch gardens: ${response.status} ${response.statusText}`);
    }
    
    gardens = await response.json();
    
    if (gardens.length === 0) {
      loadingIndicator.textContent = 'No gardens found';
      return;
    }
    
    // Sort gardens by creation date (newest first)
    gardens.sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    
    // Create a card for each garden
    gardens.forEach(garden => {
      const gardenCard = createGardenCard(garden);
      gardensGrid.appendChild(gardenCard);
      cardIndex++;
    });
    
    loadingIndicator.style.display = 'none';
    
    // Initialize dimensions
    setTimeout(updateDimensions, 100); // Small delay to ensure DOM is ready
  } catch (error) {
    console.error('Error fetching gardens:', error);
    loadingIndicator.style.display = 'none';
    errorMessage.textContent = 'Error loading gardens. Please try again later.';
    errorMessage.style.display = 'block';
  }
}

// 创建花园卡片
function createGardenCard(garden, isClone = false) {
  const card = document.createElement('div');
  card.className = 'garden-card';
  if (isClone) card.classList.add('clone');
  card.dataset.id = garden.id;
  card.addEventListener('click', () => viewGarden(garden.id));
  card.style.cursor = "pointer";
  
  // 获取花园背景图ID
  const backgroundId = garden.backgroundId || 1; // 默认为1如果没有设置
  
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

// 格式化日期
function formatDate(dateString) {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return dateString; // Return original if parsing fails
  }
  return date.toLocaleDateString();
}

// 查看特定花园并使用过渡效果
function viewGarden(gardenId) {
  // Add data-transition attribute dynamically to enable transition
  const transitionLayer = document.querySelector('.cd-transition-layer');
  const bgLayer = transitionLayer.querySelector('.bg-layer');
  
  // Start transition
  transitionLayer.classList.add('visible', 'opening');
  
  // Navigate to garden view page after transition completes
  bgLayer.addEventListener('animationend', function onEnd() {
    window.location.href = `/view/${gardenId}`;
    bgLayer.removeEventListener('animationend', onEnd);
  });
} 