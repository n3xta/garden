// DOM elements
const gardensGrid = document.getElementById('gardens-grid');
const loadingIndicator = document.getElementById('loading');
const errorMessage = document.getElementById('error-message');
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');

// 页面初始化
document.addEventListener('DOMContentLoaded', function() {
  // Get all gardens from API
  fetchGardens();

  // Event listeners
  searchButton.addEventListener('click', handleSearch);
  searchInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  });
});

// 搜索功能
function handleSearch() {
  const searchTerm = searchInput.value.trim().toLowerCase();
  const gardenCards = gardensGrid.querySelectorAll('.garden-card');
  
  if (searchTerm === '') {
    // Show all if search is empty
    gardenCards.forEach(card => {
      card.style.display = 'block';
    });
    return;
  }
  
  // Filter garden cards based on search term
  gardenCards.forEach(card => {
    const gardenName = card.querySelector('.garden-name').textContent.toLowerCase();
    const ownerName = card.querySelector('.garden-owner').textContent.toLowerCase();
    
    if (gardenName.includes(searchTerm) || ownerName.includes(searchTerm)) {
      card.style.display = 'block';
    } else {
      card.style.display = 'none';
    }
  });
}

// API 调用获取花园数据
async function fetchGardens() {
  try {
    loadingIndicator.style.display = 'block';
    errorMessage.style.display = 'none';
    gardensGrid.innerHTML = '';
    
    const response = await fetch('/api/gardens');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch gardens: ${response.status} ${response.statusText}`);
    }
    
    const gardens = await response.json();
    
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
    });
    
    loadingIndicator.style.display = 'none';
  } catch (error) {
    console.error('Error fetching gardens:', error);
    loadingIndicator.style.display = 'none';
    errorMessage.textContent = 'Error loading gardens. Please try again later.';
    errorMessage.style.display = 'block';
  }
}

// 创建花园卡片
function createGardenCard(garden) {
  const card = document.createElement('div');
  card.className = 'garden-card';
  card.dataset.id = garden.id;
  card.addEventListener('click', () => viewGarden(garden.id));
  
  const cardHTML = `
    <div class="garden-preview">
      <div class="garden-preview-placeholder">
        <img src="/2dassets/garden-placeholder.svg" alt="Garden">
      </div>
    </div>
    <div class="garden-info">
      <h3 class="garden-name">${garden.gardenName}</h3>
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