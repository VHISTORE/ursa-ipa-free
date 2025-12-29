import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Firebase configuration for ursaipa
const firebaseConfig = {
  apiKey: "AIzaSyCQxz47mev45XXLz3ejJViVQCzFL_Fo3z8",
  authDomain: "ursaipa.firebaseapp.com",
  projectId: "ursaipa",
  storageBucket: "ursaipa.firebasestorage.app",
  messagingSenderId: "697377996977",
  appId: "1:697377996977:web:f94ca78dfe3d3472942290",
  measurementId: "G-RWFQ47DLHS"
};

// Initialize
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let currentSection = 'games';
let currentCategory = 'All';

/**
 * Converts Firebase Timestamp to an English date string (ShortMonth DD, YYYY)
 */
function formatDate(timestamp) {
    if (!timestamp) return "Unknown";
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

/**
 * Creates an application card element
 */
function createAppCard(appData) {
    const card = document.createElement('div');
    card.className = 'app-card';
    const dateStr = formatDate(appData.upload_date);

    card.innerHTML = `
        <img src="${appData.icon_url}" class="app-icon" onerror="this.src='https://via.placeholder.com/60'">
        <div class="app-info">
            <div class="app-name">${appData.name || 'Unknown'}</div>
            <div class="app-meta">v${appData.version || '0'} • ${appData.size || '?? MB'}</div>
            <div class="app-date">Updated: ${dateStr}</div>
        </div>
        <button class="download-btn">GET</button>
    `;

    card.addEventListener('click', () => {
        // If search is open, close it before showing details
        if (document.getElementById('search-overlay').classList.contains('active')) {
            toggleSearch(false);
        }
        openModal(appData);
    });
    return card;
}

/**
 * Renders the main app list
 */
function renderAppCard(appData) {
    const appList = document.getElementById('app-list');
    if (!appList) return;
    appList.appendChild(createAppCard(appData));
}

/**
 * Generates category buttons based on available data in Firestore
 */
async function renderCategoryBar(sectionName) {
    const bar = document.getElementById('category-bar');
    if (!bar) return;
    bar.innerHTML = '';
    
    const categories = ['All'];
    
    try {
        const q = query(collection(db, "apps"), where("section", "==", sectionName));
        const snap = await getDocs(q);
        
        snap.forEach(doc => {
            const cat = doc.data().category;
            if (cat && !categories.includes(cat)) {
                categories.push(cat);
            }
        });

        categories.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = `category-btn ${cat === currentCategory ? 'active' : ''}`;
            btn.textContent = cat === 'All' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1);
            
            btn.onclick = (e) => {
                e.stopPropagation();
                currentCategory = cat;
                document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                loadApps(sectionName, cat);
            };
            bar.appendChild(btn);
        });
    } catch (e) {
        console.error("Category Error:", e);
    }
}

/**
 * Opens modal with full details
 */
function openModal(appData) {
    const overlay = document.getElementById('modal-overlay');
    const modalBody = document.getElementById('modal-body');

    modalBody.innerHTML = `
        <div class="modal-header-info">
            <img src="${appData.icon_url}" class="modal-icon-big" onerror="this.src='https://via.placeholder.com/60'">
            <div class="modal-title-wrap">
                <h2>${appData.name}</h2>
                <p>${appData.bundle_id}</p>
            </div>
        </div>
        <div class="modal-stats">
            <div class="stat-item">VERSION<b>${appData.version}</b></div>
            <div class="stat-item">SIZE<b>${appData.size}</b></div>
            <div class="stat-item">iOS<b>${appData.min_ios}+</b></div>
            <div class="stat-item">VIEWS<b>${appData.views || 0}</b></div>
            <div class="stat-item" style="grid-column: span 2;">FEATURES<b>${appData.features || "Original"}</b></div>
        </div>
        <div class="modal-desc">${appData.description || "No description available."}</div>
        <button class="get-btn-big" onclick="window.location.href='${appData.download_url}'">DOWNLOAD IPA</button>
    `;
    overlay.classList.add('active');
}

const closeModal = () => document.getElementById('modal-overlay').classList.remove('active');
document.getElementById('close-modal').addEventListener('click', closeModal);
document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') closeModal();
});

/**
 * Fetches apps from Firebase with section and category filtering
 */
async function loadApps(sectionName, category = 'All') {
    const appList = document.getElementById('app-list');
    if (!appList) return;
    
    appList.innerHTML = '<div style="text-align:center; padding:50px; opacity:0.5; font-size:14px;">Loading...</div>';

    try {
        const colRef = collection(db, "apps");
        let q;
        
        if (category === 'All') {
            q = query(colRef, where("section", "==", sectionName), orderBy("upload_date", "desc"));
        } else {
            q = query(colRef, 
                where("section", "==", sectionName), 
                where("category", "==", category), 
                orderBy("upload_date", "desc")
            );
        }
        
        const querySnapshot = await getDocs(q);
        appList.innerHTML = ''; 

        if (querySnapshot.empty) {
            appList.innerHTML = '<div style="text-align:center; padding:50px; opacity:0.5;">No items found</div>';
            return;
        }

        querySnapshot.forEach((doc) => renderAppCard(doc.data()));
    } catch (e) {
        console.error("Firebase Error:", e);
        if (e.code === 'failed-precondition') {
            appList.innerHTML = '<div style="text-align:center; padding:20px; font-size:12px; color:#fff;">Index required. Check browser console (F12) for link.</div>';
        } else {
            appList.innerHTML = `<div style="text-align:center; padding:50px; opacity:0.5;">Error: ${e.code}</div>`;
        }
    }
}

// --- SEARCH LOGIC ---
const searchOverlay = document.getElementById('search-overlay');
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
const clearSearchBtn = document.getElementById('clear-search');

function toggleSearch(show) {
    if (show) {
        searchOverlay.classList.add('active');
        searchInput.focus();
    } else {
        searchOverlay.classList.remove('active');
        searchInput.value = '';
        searchResults.innerHTML = '';
        clearSearchBtn.style.display = 'none';
    }
}

async function performSearch(term) {
    if (term.length < 2) {
        searchResults.innerHTML = '';
        clearSearchBtn.style.display = 'none';
        return;
    }

    clearSearchBtn.style.display = 'block';
    searchResults.innerHTML = '<div style="text-align:center; padding:20px; opacity:0.5;">Searching...</div>';

    try {
        const snap = await getDocs(collection(db, "apps"));
        searchResults.innerHTML = '';
        let found = false;

        snap.forEach(doc => {
            const data = doc.data();
            if (data.name.toLowerCase().includes(term.toLowerCase())) {
                found = true;
                searchResults.appendChild(createAppCard(data));
            }
        });

        if (!found) {
            searchResults.innerHTML = '<div style="text-align:center; padding:20px; opacity:0.5;">No results found</div>';
        }
    } catch (e) {
        console.error(e);
    }
}

searchInput.addEventListener('input', (e) => performSearch(e.target.value));

clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchResults.innerHTML = '';
    clearSearchBtn.style.display = 'none';
    searchInput.focus();
});

document.getElementById('cancel-search').addEventListener('click', () => toggleSearch(false));

/**
 * Bottom Navigation logic
 */
document.querySelectorAll('.nav-item').forEach(button => {
    button.addEventListener('click', () => {
        const target = button.getAttribute('data-target');

        if (target === 'search') {
            toggleSearch(true);
            return; // Don't switch main content when search is triggered
        }

        const contentArea = document.getElementById('content');
        if (contentArea) contentArea.scrollTo({ top: 0, behavior: 'smooth' });

        document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        if (target === 'games' || target === 'apps') {
            currentSection = target;
            currentCategory = 'All';
            renderCategoryBar(target);
            loadApps(target);
        } else {
            document.getElementById('category-bar').innerHTML = '';
            document.getElementById('app-list').innerHTML = `
                <div style="text-align:center; padding:50px; opacity:0.5;">${target.toUpperCase()} section coming soon</div>
            `;
        }
    });
});

/**
 * Application entry point
 */
window.addEventListener('DOMContentLoaded', () => {
    renderCategoryBar('games');
    loadApps('games');
});
