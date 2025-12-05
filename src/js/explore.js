import { db } from '../config/firebase.js';
import { collection, getDocs, query, limit } from "firebase/firestore";

const gardensGrid = document.getElementById('gardens-grid');
const loadingIndicator = document.getElementById('loading');
const errorMessage = document.getElementById('error-message');
const searchInput = document.getElementById('search-input');
const searchOverlay = document.getElementById('search-overlay');
const searchButton = document.getElementById('search-button');
const clearButton = document.getElementById('clear-button');
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
let isFiltered = false;

// Audio helper
const AudioEffects = {
  play: (url) => {
    const audio = new Audio(url);
    audio.play().catch(e => console.warn("Audio play failed", e));
  }
};

document.addEventListener('DOMContentLoaded', async () => {
    AudioEffects.play('/samples/ui/explore.wav');

    setupTiltEffect();
    
    // Load VanillaTilt if not present (though it's in head)
    if (typeof VanillaTilt === 'undefined') {
        console.error('VanillaTilt is not loaded!');
        loadVanillaTilt();
    }

    await fetchGardens();

    setupSearch();

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('resize', updateDimensions);
});

async function fetchGardens() {
    try {
        loadingIndicator.style.display = 'block';
        errorMessage.style.display = 'none';
        gardensGrid.innerHTML = '';

        // Query 'gardens' collection
        const gardensRef = collection(db, "gardens");
        const q = query(gardensRef, limit(50));
        const querySnapshot = await getDocs(q);

        gardens = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.plants && data.plants.length > 0) {
                gardens.push({
                    id: doc.id,
                    username: data.ownerUsername || "Unknown Gardener",
                    gardenName: data.name || "Untitled Garden",
                    createdAt: data.createdAt || data.updatedAt || new Date().toISOString(), 
                    plantsCount: data.plants.length,
                    backgroundId: data.backgroundId || 1
                });
            }
        });

        // Sort client side
        gardens.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        if (gardens.length === 0) {
             loadingIndicator.textContent = "No gardens found.";
             return;
        }

        gardens.forEach(garden => {
            const card = createGardenCard(garden);
            gardensGrid.appendChild(card);
        });

        loadingIndicator.style.display = 'none';
        
        setTimeout(updateDimensions, 100);

    } catch (error) {
        console.error("Error fetching gardens:", error);
        loadingIndicator.style.display = 'none';
        errorMessage.textContent = "Failed to load gardens.";
        errorMessage.style.display = 'block';
    }
}

function createGardenCard(garden, isClone = false) {
    const card = document.createElement('div');
    card.className = 'garden-card';
    if (isClone) card.classList.add('clone');
    card.dataset.id = garden.id; // Store ID for clones
    
    // Ensure matching CSS classes: garden-preview, garden-bg-image
    const bgId = garden.backgroundId || 1;
    const bgUrl = `/img/garden_bg/${bgId}.jpg`;
    
    card.innerHTML = `
        <div class="garden-preview">
            <img src="${bgUrl}" alt="${garden.gardenName}" class="garden-bg-image">
        </div>
        <div class="garden-info">
            <h3 class="garden-name">${garden.gardenName}</h3>
            <p class="garden-owner">By: ${garden.username}</p>
            <div class="garden-stats">
                <span>${garden.plantsCount} plants</span>
                <span>Created: ${new Date(garden.createdAt).toLocaleDateString()}</span>
            </div>
        </div>
    `;
    
    // Navigation click
    card.style.cursor = "pointer";
    card.addEventListener('click', () => {
        window.location.href = `/garden.html?id=${garden.id}`;
    });

    return card;
}

// --- Search Logic ---
function setupSearch() {
    if(searchButton) {
        searchButton.addEventListener('click', toggleSearchOverlay);
    }
    if(clearButton) {
        clearButton.addEventListener('click', clearSearch);
    }
    if(searchOverlay) {
        searchOverlay.addEventListener('click', (e) => {
            if (e.target === searchOverlay) toggleSearchOverlay();
        });
    }
    if (searchInput) {
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                handleSearch();
                toggleSearchOverlay();
            }
        });
        searchInput.addEventListener('keydown', (e) => {
            if(e.key === 'Escape') {
                 if (searchOverlay.classList.contains('active')) toggleSearchOverlay();
            }
        });
    }
}

function toggleSearchOverlay() {
  searchOverlay.classList.toggle('active');
  if (searchOverlay.classList.contains('active')) {
    searchInput.focus();
    searchInput.value = '';
  }
}

function handleSearch() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    errorMessage.style.display = 'none';

    // Remove clones before searching
    const existingClones = gardensGrid.querySelectorAll('.garden-card.clone');
    existingClones.forEach(clone => clone.remove());

    const gardenCards = gardensGrid.querySelectorAll('.garden-card:not(.clone)');
    let visibleCardCount = 0;

    if (searchTerm === '') {
        gardenCards.forEach(card => {
            card.style.display = 'flex';
            card.style.visibility = 'visible';
            card.style.opacity = '1';
            visibleCardCount++;
        });
        clearButton.classList.remove('active');
        isFiltered = false;
    } else {
        gardenCards.forEach(card => {
            const name = card.querySelector('.garden-name').textContent.toLowerCase();
            const owner = card.querySelector('.garden-owner').textContent.toLowerCase();
            
            if (name.includes(searchTerm) || owner.includes(searchTerm)) {
                card.style.display = 'flex';
                card.style.visibility = 'visible';
                card.style.opacity = '1';
                visibleCardCount++;
            } else {
                card.style.display = 'none';
                card.style.visibility = 'hidden';
                card.style.opacity = '0';
            }
        });
        clearButton.classList.add('active');
        isFiltered = true;
    }

    if (visibleCardCount > 0) {
        scrollPosition = 0;
        targetScrollPosition = 0;
        gardensGrid.style.transform = 'translateX(0)';
        void gardensGrid.offsetWidth;
        updateDimensions();
    } else if (searchTerm !== '') {
        errorMessage.textContent = `No gardens found matching "${searchTerm}"`;
        errorMessage.style.display = 'block';
        scrollPosition = 0;
        targetScrollPosition = 0;
        gardensGrid.style.transform = 'translateX(0)';
    }
}

function clearSearch() {
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
}

// --- Infinite Scroll & Layout Logic ---

function handleWheel(e) {
  if (searchOverlay.classList.contains('active')) return;
  if (totalWidth <= window.innerWidth) return; // Don't scroll if content fits
  
  e.preventDefault();
  isScrolling = true;
  
  if (scrollTimeout) clearTimeout(scrollTimeout);
  scrollTimeout = setTimeout(handleScrollEnd, 150);
  
  const delta = e.deltaY;
  const direction = delta > 0 ? 1 : -1;
  const scrollAmount = direction * 30; // Speed
  
  targetScrollPosition += scrollAmount;
  
  if (!animationFrame) {
    animationFrame = requestAnimationFrame(animateScroll);
  }
}

function handleScrollEnd() {
  isScrolling = false;
  
  // Check bounds for infinite loop
  if (scrollPosition < cloneBeforeWidth || 
      scrollPosition > totalWidth - cloneBeforeWidth) {
    
    const relativePos = (scrollPosition - cloneBeforeWidth) % originalContentWidth;
    const adjustedRelativePos = relativePos < 0 ? 
      originalContentWidth + relativePos : relativePos;
    
    const newPosition = cloneBeforeWidth + adjustedRelativePos;
    
    gardensGrid.style.transition = 'none';
    scrollPosition = newPosition;
    targetScrollPosition = newPosition;
    gardensGrid.style.transform = `translateX(-${newPosition}px)`;
    
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

function updateDimensions() {
  const visibleOriginalCards = Array.from(gardensGrid.querySelectorAll('.garden-card:not(.clone)'))
    .filter(card => card.style.display !== 'none');
  
  if (visibleOriginalCards.length === 0) {
    totalWidth = 0;
    cloneBeforeWidth = 0;
    gardensGrid.style.transform = 'translateX(0)';
    return;
  }
  
  // Remove old clones
  const existingClones = gardensGrid.querySelectorAll('.garden-card.clone');
  existingClones.forEach(clone => clone.remove());
  
  cardWidth = visibleOriginalCards[0].offsetWidth + gapWidth;
  originalContentWidth = cardWidth * visibleOriginalCards.length;
  
  // Calculate how many clones needed to cover screen + buffer
  cloneCount = Math.ceil(window.innerWidth / cardWidth) + 4;
  
  // Add clones at start (prepend)
  for (let i = visibleOriginalCards.length - cloneCount; i < visibleOriginalCards.length; i++) {
    // Wrap around index logic
    let index = i; 
    while(index < 0) index += visibleOriginalCards.length;
    index = index % visibleOriginalCards.length;

    const card = visibleOriginalCards[index];
    const clone = card.cloneNode(true);
    clone.classList.add('clone');
    // Ensure click works on clones too
    clone.addEventListener('click', () => {
        // Extract ID from original card or dataset if we stored it
        // Since we didn't store dataset id in new create function, we rely on closure.
        // Wait, cloneNode copies attributes but not event listeners.
        // We need to re-attach listener.
        // Let's store ID in dataset.
        const id = card.dataset.id; // we need to add this in createGardenCard
        if(id) window.location.href = `/garden.html?id=${id}`;
    });
    gardensGrid.insertBefore(clone, gardensGrid.firstChild);
  }
  
  // Add clones at end (append)
  for (let i = 0; i < cloneCount; i++) {
    const index = i % visibleOriginalCards.length;
    const card = visibleOriginalCards[index];
    const clone = card.cloneNode(true);
    clone.classList.add('clone');
    clone.addEventListener('click', () => {
        const id = card.dataset.id;
        if(id) window.location.href = `/garden.html?id=${id}`;
    });
    gardensGrid.appendChild(clone);
  }
  
  const allVisibleCards = gardensGrid.querySelectorAll('.garden-card:not([style*="display: none"])');
  totalWidth = cardWidth * allVisibleCards.length;
  
  // Determine width of prepended clones
  // We prepended `cloneCount` items (or less if loop logic was weird, but logic above attempts `cloneCount` iterations)
  // Actually the loop: `i = visibleOriginalCards.length - cloneCount` to `visibleOriginalCards.length`
  // Number of iterations = cloneCount.
  cloneBeforeWidth = cloneCount * cardWidth;
  
  // Set initial position to show original content (skip prepended clones)
  scrollPosition = cloneBeforeWidth;
  targetScrollPosition = cloneBeforeWidth;
  
  gardensGrid.style.transition = 'none';
  gardensGrid.style.transform = `translateX(-${scrollPosition}px)`;
  
  void gardensGrid.offsetWidth;
  gardensGrid.style.transition = 'transform 0.5s ease';
  
  setTimeout(initTiltEffects, 100);
}

// --- Tilt & Effects ---
function setupTiltEffect() {
  document.addEventListener('mousemove', function(e) {
    if (background) {
        const moveX = (e.clientX - window.innerWidth / 2) * 0.01;
        const moveY = (e.clientY - window.innerHeight / 2) * 0.01;
        background.style.transform = `translate(${moveX}px, ${moveY}px)`;
    }
  });
}

function loadVanillaTilt() {
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/vanilla-tilt@1.8.1/dist/vanilla-tilt.min.js';
  script.onload = () => {
    initTiltEffects();
  };
  document.head.appendChild(script);
}

function initTiltEffects() {
  if (typeof VanillaTilt === 'undefined') return;
  
  const cards = document.querySelectorAll('.garden-card');
  cards.forEach((card, index) => {
    if (card.vanillaTilt) {
      card.vanillaTilt.destroy();
    }
    
    const isOdd = index % 2 === 0;
    const startX = isOdd ? -20 : 20; // Alternating tilt
    
    card.setAttribute('data-tilt', '');
    card.setAttribute('data-tilt-startX', startX);
    card.setAttribute('data-tilt-reset-to-start', 'true');
    
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
  });
}
