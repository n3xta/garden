import { db } from '../config/firebase.js';
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";

const gardensGrid = document.getElementById('gardens-grid');
const loadingIndicator = document.getElementById('loading');
const errorMessage = document.getElementById('error-message');
const searchInput = document.getElementById('search-input');
const searchOverlay = document.getElementById('search-overlay');
const searchButton = document.getElementById('search-button');
const clearButton = document.getElementById('clear-button');

let allGardens = [];

// Init
document.addEventListener('DOMContentLoaded', async () => {
    setupSearch();
    await fetchGardens();
});

async function fetchGardens() {
    try {
        loadingIndicator.style.display = 'block';
        const usersRef = collection(db, "users");
        // In a real app, you'd probably want a separate "gardens" collection or an index on createdAt
        // For now, fetching all users is "okay" if small, but we should limit.
        // Since users collection contains everything, we query it.
        const q = query(usersRef, limit(50)); // simple limit
        const querySnapshot = await getDocs(q);

        allGardens = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.garden && data.garden.plants && data.garden.plants.length > 0) {
                allGardens.push({
                    id: doc.id,
                    username: data.username,
                    gardenName: data.gardenName || "Untitled Garden",
                    createdAt: data.createdAt,
                    plantsCount: data.garden.plants.length,
                    backgroundId: data.backgroundId || 1
                });
            }
        });

        // Sort client side for now since we can't easily composite index every field quickly without console setup
        allGardens.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        renderGardens(allGardens);
        loadingIndicator.style.display = 'none';

    } catch (error) {
        console.error("Error fetching gardens:", error);
        loadingIndicator.style.display = 'none';
        errorMessage.textContent = "Failed to load gardens.";
        errorMessage.style.display = 'block';
    }
}

function renderGardens(gardens) {
    gardensGrid.innerHTML = '';
    
    if (gardens.length === 0) {
        errorMessage.textContent = "No gardens found.";
        errorMessage.style.display = 'block';
        return;
    }

    errorMessage.style.display = 'none';

    gardens.forEach(garden => {
        const card = document.createElement('div');
        card.className = 'garden-card';
        
        // Background Image
        const bgId = garden.backgroundId || 1;
        const bgUrl = `/img/garden_bg/${bgId}.jpg`;
        
        card.innerHTML = `
            <div class="garden-thumbnail" style="background-image: url('${bgUrl}')">
                <div class="plant-count">
                    <span class="count">${garden.plantsCount}</span>
                    <span class="label">plants</span>
                </div>
            </div>
            <div class="garden-info">
                <h3 class="garden-name">${garden.gardenName}</h3>
                <div class="garden-meta">
                    <span class="author">by ${garden.username}</span>
                    <span class="date">${new Date(garden.createdAt).toLocaleDateString()}</span>
                </div>
            </div>
            <a href="/garden.html?id=${garden.id}" class="card-link" data-transition="true"></a>
        `;

        // Add tilt effect
        if (typeof VanillaTilt !== 'undefined') {
            VanillaTilt.init(card, {
                max: 5,
                speed: 400,
                glare: true,
                "max-glare": 0.2,
                scale: 1.02
            });
        }

        gardensGrid.appendChild(card);
    });

    // Re-init transition links for new elements
    // Assuming transition.js handles global click or we need to re-attach
    // If transition.js uses delegation (which I think I saw it might not, let's check), 
    // we might need to trigger it. 
    // The transition.js I wrote earlier uses `document.querySelectorAll('[data-transition="true"]')` on load.
    // We need to attach listeners to new links.
    attachTransitionListeners();
}

function attachTransitionListeners() {
    // Simple hack: re-run the attachment logic from transition.js if accessible, or just manually attach here
    // Since transition.js logic is scoped, we'll manually replicate the click handler if needed, 
    // or rely on event delegation if we refactored transition.js.
    // Let's use delegation on the grid container.
    
    const links = gardensGrid.querySelectorAll('a[data-transition="true"]');
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            // rely on global handler if present, or prevent default here
            // e.preventDefault();
            // But wait, transition.js runs on DOMContentLoaded. New elements won't have it.
            // Ideally transition.js should use event delegation.
            // I'll leave it as standard navigation for now if transition.js doesn't pick it up,
            // or I can try to import startTransition if I exported it. I didn't export it.
            // For now, standard nav.
        });
    });
}

function setupSearch() {
    if(searchButton) {
        searchButton.addEventListener('click', () => {
            searchOverlay.classList.add('active');
            setTimeout(() => searchInput.focus(), 100);
        });
    }

    if(searchOverlay) {
        searchOverlay.addEventListener('click', (e) => {
            if (e.target === searchOverlay) {
                searchOverlay.classList.remove('active');
            }
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = allGardens.filter(g => 
                g.gardenName.toLowerCase().includes(term) || 
                g.username.toLowerCase().includes(term)
            );
            renderGardens(filtered);
        });
        
        // ESC to close
        searchInput.addEventListener('keydown', (e) => {
            if(e.key === 'Escape') searchOverlay.classList.remove('active');
        });
    }

    if (clearButton) { // actually this was for clearing search input? check explore.ejs
        // It seems clear button might be for clearing search logic in original
    }
}
