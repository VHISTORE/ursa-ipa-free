import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    getDocs, 
    query, 
    where, 
    orderBy, 
    updateDoc, 
    increment, 
    doc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js";

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
const messaging = getMessaging(app);

let currentSection = 'games';
let currentCategory = 'All';

/**
 * Push Notifications Logic
 */
async function requestNotifications() {
    const statusEl = document.getElementById('notify-status');
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            const token = await getToken(messaging, { 
                vapidKey: 'BMAUf9qk8ZkeepGWcHaffFfutJ7rAvavjGF4dvhWYZ3aUuswVAfiF2h6Pc6ZNZqT0UlkxXYT0pmJZis2LNIJBvc' 
            });
            
            if (token) {
                console.log("FCM Token:", token);
                localStorage.setItem('ursa_notify_enabled', 'true');
                if (statusEl) {
                    statusEl.textContent = 'ON';
                    statusEl.style.background = '#30d158';
                    statusEl.style.color = 'black';
                }
                alert("✅ Notifications enabled! You will be notified about new IPA updates.");
            }
        } else {
            alert("❌ Permission denied. Please enable notifications in your browser settings.");
        }
    } catch (error) {
        console.error("Notification Error:", error);
    }
}

// Listen for foreground messages
onMessage(messaging, (payload) => {
    console.log('Message received. ', payload);
    alert(`🔔 ${payload.notification.title}\n${payload.notification.body}`);
});

window.activateNotifications = requestNotifications;

/**
 * Helper: Share functionality (Deep Linking)
 */
window.shareApp = (bundleId) => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?id=${bundleId}`;
    
    if (navigator.share) {
        navigator.share({
            title: 'URSA IPA',
            text: `Check out this app on URSA IPA!`,
            url: shareUrl,
        }).catch(console.error);
    } else {
        const el = document.createElement('textarea');
        el.value = shareUrl;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        alert('Link copied to clipboard!');
    }
};

/**
 * Converts Firebase Timestamp to an English date string
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
function createAppCard(appData, docId) {
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
        if (document.getElementById('search-overlay').classList.contains('active')) {
            toggleSearch(false);
        }
        openModal(appData, docId);
    });
    return card;
}

/**
 * Renders the main app list
 */
function renderAppCard(appData, docId) {
    const appList = document.getElementById('app-list');
    if (!appList) return;
    appList.appendChild(createAppCard(appData, docId));
}

/**
 * Generates category buttons
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
        console.error("Category Bar Error:", e);
    }
}

/**
 * Opens modal and INCREMENTS views
 */
async function openModal(appData, docId) {
    const overlay = document.getElementById('modal-overlay');
    const modalBody = document.getElementById('modal-body');

    const displayViews = (appData.views || 0) + 1;

    modalBody.innerHTML = `
        <div class="modal-header-info">
            <img src="${appData.icon_url}" class="modal-icon-big" onerror="this.src='https://via.placeholder.com/60'">
            <div class="modal-title-wrap">
                <h2>${appData.name}</h2>
                <button class="share-btn-rect" onclick="shareApp('${appData.bundle_id}')">
                    <img src="https://cdn-icons-png.flaticon.com/512/2958/2958791.png" alt="share">
                    <span>SHARE</span>
                </button>
                <p class="bundle-id-text">${appData.bundle_id}</p>
            </div>
        </div>
        <div class="modal-stats">
            <div class="stat-item">VERSION<b>${appData.version}</b></div>
            <div class="stat-item">SIZE<b>${appData.size}</b></div>
            <div class="stat-item">iOS<b>${appData.min_ios}+</b></div>
            <div class="stat-item">VIEWS<b id="modal-view-count">${displayViews}</b></div>
            <div class="stat-item" style="grid-column: span 2;">FEATURES<b>${appData.features || "Original"}</b></div>
        </div>
        <div class="modal-desc">${appData.description || "No description available yet."}</div>
        <button class="get-btn-big" onclick="window.location.href='${appData.download_url}'">DOWNLOAD IPA</button>
    `;
    overlay.classList.add('active');

    const newUrl = `${window.location.origin}${window.location.pathname}?id=${appData.bundle_id}`;
    window.history.pushState({ path: newUrl }, '', newUrl);

    if (docId) {
        try {
            const appDocRef = doc(db, "apps", docId);
            await updateDoc(appDocRef, { views: increment(1) });
        } catch (e) { console.error("Error updating views:", e); }
    }
}

const closeModal = () => {
    document.getElementById('modal-overlay').classList.remove('active');
    const cleanUrl = `${window.location.origin}${window.location.pathname}`;
    window.history.pushState({ path: cleanUrl }, '', cleanUrl);
};

document.getElementById('close-modal').addEventListener('click', closeModal);
document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') closeModal();
});

/**
 * Fetches apps from Firebase
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

        querySnapshot.forEach((doc) => renderAppCard(doc.data(), doc.id));
    } catch (e) {
        console.error("Firebase Error:", e);
        appList.innerHTML = `<div style="text-align:center; padding:50px; opacity:0.5;">Error loading apps</div>`;
    }
}

/**
 * Stats logic for More section
 */
async function updateStats() {
    try {
        const snap = await getDocs(collection(db, "apps"));
        let totalViews = 0;
        snap.forEach(doc => { totalViews += (doc.data().views || 0); });

        const filesEl = document.getElementById('stat-files');
        const viewsEl = document.getElementById('stat-views');
        
        if (filesEl) filesEl.textContent = snap.size;
        if (viewsEl) viewsEl.textContent = totalViews.toLocaleString();
    } catch (e) { console.error("Stats error:", e); }
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
                searchResults.appendChild(createAppCard(data, doc.id));
            }
        });
        if (!found) searchResults.innerHTML = '<div style="text-align:center; padding:20px; opacity:0.5;">No results found</div>';
    } catch (e) { console.error("Search failed:", e); }
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
            return; 
        }

        const contentArea = document.getElementById('content');
        if (contentArea) contentArea.scrollTo({ top: 0, behavior: 'smooth' });

        document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        if (target === 'more') {
            const isNotifyEnabled = localStorage.getItem('ursa_notify_enabled') === 'true';
            const statusText = isNotifyEnabled ? 'ON' : 'OFF';
            const statusStyle = isNotifyEnabled ? 'background: #30d158; color: black;' : '';

            document.getElementById('category-bar').innerHTML = '';
            document.getElementById('app-list').innerHTML = `
                <div class="more-page">
                    <div class="more-header-brand">
                        <img src="icons/logoursa.jpeg" alt="URSA Logo" class="more-logo" onerror="this.src='https://via.placeholder.com/100'">
                        <h2>URSA IPA Company</h2>
                    </div>

                    <div class="more-group">
                        <div class="stats-card">
                            <div class="stat-box">
                                <span class="stat-value" id="stat-files">...</span>
                                <span class="stat-label">FILES</span>
                            </div>
                            <div class="stat-divider"></div>
                            <div class="stat-box">
                                <span class="stat-value" id="stat-views">...</span>
                                <span class="stat-label">TOTAL VIEWS</span>
                            </div>
                        </div>
                    </div>

                    <div class="more-group">
                        <a href="https://t.me/ursa_ipa" target="_blank" class="more-item-link">
                            <div class="more-item-content">
                                <span class="item-icon">✈️</span>
                                <span>Telegram Channel</span>
                            </div>
                            <span class="arrow">›</span>
                        </a>
                        <div class="more-item-link" onclick="alert('Donation system coming soon!')">
                            <div class="more-item-content">
                                <span class="item-icon">💎</span>
                                <span>Support Author</span>
                            </div>
                            <span class="arrow">›</span>
                        </div>
                        <div class="more-item-link notify-btn" onclick="activateNotifications()">
                            <div class="more-item-content">
                                <span class="item-icon">🔔</span>
                                <span>IPA Notifications</span>
                            </div>
                            <span class="notify-status" id="notify-status" style="${statusStyle}">${statusText}</span>
                        </div>
                    </div>

                    <div class="more-footer">
                        <p>© 2025 URSA IPA Project</p>
                    </div>
                </div>
            `;
            updateStats();
        } else {
            currentSection = target;
            currentCategory = 'All';
            renderCategoryBar(target);
            loadApps(target);
        }
    });
});

/**
 * Checks for Deep Links
 */
async function checkDeepLink() {
    const urlParams = new URLSearchParams(window.location.search);
    const appId = urlParams.get('id');
    
    if (appId) {
        try {
            const colRef = collection(db, "apps");
            const q = query(colRef, where("bundle_id", "==", appId));
            const snap = await getDocs(q);
            
            if (!snap.empty) {
                const docSnap = snap.docs[0];
                openModal(docSnap.data(), docSnap.id);
            }
        } catch (e) { console.error("Deep Link check failed:", e); }
    }
}

/**
 * Entry Point
 */
window.addEventListener('DOMContentLoaded', () => {
    renderCategoryBar('games');
    loadApps('games');
    checkDeepLink();
});
