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

// 搜索功能
function handleSearch() {
  console.log("==== SEARCH STARTED ====");
  const searchTerm = searchInput.value.trim().toLowerCase();
  console.log("Search term:", JSON.stringify(searchTerm));
  
  // 清除之前的错误消息
  errorMessage.style.display = 'none';
  
  // 移除所有克隆卡片
  const existingClones = gardensGrid.querySelectorAll('.garden-card.clone');
  console.log(`Removing ${existingClones.length} existing clones`);
  existingClones.forEach(clone => clone.remove());
  
  // 获取所有原始卡片
  const gardenCards = gardensGrid.querySelectorAll('.garden-card:not(.clone)');
  console.log(`Found ${gardenCards.length} original cards to search through`);
  
  let visibleCardCount = 0;
  
  if (searchTerm === '') {
    console.log("Empty search term - showing all cards");
    // 显示所有卡片
    gardenCards.forEach(card => {
      card.style.display = 'flex';
      card.style.visibility = 'visible';
      card.style.opacity = '1';
      visibleCardCount++;
    });
  } else {
    // 过滤卡片
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
  }
  
  console.log(`Search results: ${visibleCardCount} matches found for "${searchTerm}"`);
  
  if (visibleCardCount > 0) {
    console.log("Updating dimensions with visible cards");
    
    // 重置当前滚动位置
    scrollPosition = 0;
    targetScrollPosition = 0;
    gardensGrid.style.transform = 'translateX(0)';
    
    // 确保卡片在视口中可见
    const visibleCards = Array.from(gardenCards).filter(card => card.style.display !== 'none');
    console.log(`Visible cards after filtering: ${visibleCards.length}`);
    
    // 强制重排
    void gardensGrid.offsetWidth;
    
    // 更新布局
    updateDimensions();
  } else if (searchTerm !== '') {
    // 没有找到匹配的卡片
    console.log("No cards match the search term");
    errorMessage.textContent = `No gardens found matching "${searchTerm}"`;
    errorMessage.style.display = 'block';
    
    // 清除滚动位置
    scrollPosition = 0;
    targetScrollPosition = 0;
    gardensGrid.style.transform = 'translateX(0)';
  }
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

// Update dimensions after window resize or content change
function updateDimensions() {
  if (gardens.length === 0) {
    console.log("No garden data available");
    return;
  }
  
  // 获取所有可见的原始卡片
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
  
  // 先移除现有的克隆卡片
  const existingClones = gardensGrid.querySelectorAll('.garden-card.clone');
  existingClones.forEach(clone => clone.remove());
  
  // 计算卡片宽度
  cardWidth = visibleOriginalCards[0].offsetWidth + gapWidth;
  originalContentWidth = cardWidth * visibleOriginalCards.length;
  
  console.log(`Card width: ${cardWidth}px, Total original content width: ${originalContentWidth}px`);
  
  // 计算需要的克隆数量
  cloneCount = Math.ceil(window.innerWidth / cardWidth) + 4;
  
  console.log(`Creating ${cloneCount} clones before and after visible cards`);
  
  // 在第一张卡片前添加克隆卡片
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
  
  // 在最后一张卡片后添加克隆卡片
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
  
  // 计算前置克隆的宽度
  const beforeClones = gardensGrid.querySelectorAll('.garden-card.clone:nth-child(-n+' + cloneCount + ')');
  cloneBeforeWidth = beforeClones.length * cardWidth;
  
  console.log(`Total width with clones: ${totalWidth}px, Clone before width: ${cloneBeforeWidth}px`);
  
  // 设置初始定位
  scrollPosition = cloneBeforeWidth;
  targetScrollPosition = cloneBeforeWidth;
  gardensGrid.style.transition = 'none';
  gardensGrid.style.transform = `translateX(-${scrollPosition}px)`;
  
  // 强制重排
  void gardensGrid.offsetWidth;
  gardensGrid.style.transition = 'transform 0.5s ease';
  
  console.log("Dimensions updated, applying tilt effects");
  
  // 初始化tilt效果
  setTimeout(initTiltEffects, 100);
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
      startX: startX,
      axis: 'x'
    });
    
    console.log(`Applied tilt to card ${index}, startX: ${startX}`);
  });
  
  console.log(`Total tilt effects applied: ${cards.length}`);
} 