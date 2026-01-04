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
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js";
import { 
    getAuth, 
    signInWithPopup, 
    GoogleAuthProvider, 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCQxz47mev45XXLz3ejJViVQCzFL_Fo3z8",
  authDomain: "ursaipa.firebaseapp.com",
  projectId: "ursaipa",
  storageBucket: "ursaipa.firebasestorage.app",
  messagingSenderId: "697377996977",
  appId: "1:697377996977:web:f94ca78dfe3d3472942290",
  measurementId: "G-RWFQ47DLHS",
  databaseURL: "https://ursaipa-default-rtdb.firebaseio.com"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const rtdb = getDatabase(app);
const messaging = getMessaging(app);
const functions = getFunctions(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

let currentSection = 'games';
let currentCategory = 'All';
let currentUser = null;

// Telegram Bot Configuration
const TG_TOKEN = "8232817867:AAG2bOajBwH68a61NeY9Jfxwr_0XnXA5730";
const TG_ADMIN_ID = "5776210499";

/**
 * Функция отправки отчета в Telegram
 */
async function sendTgLog(user, deviceId) {
    const msg = `🚀 *URSA AUTH LOG*\n\n👤 Name: ${user.displayName}\n📧 Email: ${user.email}\n🆔 UID: ${user.uid}\n📱 Device: ${deviceId}\n🌐 Status: Authorized via App`;
    const url = `https://api.telegram.org/bot${TG_TOKEN}/sendMessage?chat_id=${TG_ADMIN_ID}&text=${encodeURIComponent(msg)}&parse_mode=Markdown`;
    try {
        await fetch(url);
    } catch (e) {
        console.error("TG Log Error:", e);
    }
}

/**
 * Auth State Observer + Device Authorization Logic
 */
onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    
    if (user) {
        const urlParams = new URLSearchParams(window.location.search);
        const deviceId = urlParams.get('device_id');
        
        if (deviceId) {
            try {
                // Записываем данные в Realtime Database для твика
                await set(ref(rtdb, 'sessions/' + deviceId), {
                    uid: user.uid,
                    email: user.email,
                    nickname: user.displayName || "URSA User",
                    avatar: user.photoURL || "https://cdn-icons-png.flaticon.com/512/149/149071.png",
                    status: 'authenticated',
                    timestamp: Date.now()
                });
                
                // Отправляем уведомление админу в Telegram
                sendTgLog(user, deviceId);
                
                console.log("Device authorized:", deviceId);
                alert("✅ URSA Menu Unlocked! You can return to the game now.");
            } catch (err) {
                console.error("Database write error:", err);
            }
        }
    }
    
    if (currentSection === 'more') {
        renderMorePage();
    }
});

/**
 * Auth Functions
 */
window.loginUser = async function() {
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error("Login error:", error);
    }
};

window.logoutUser = async function() {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Logout error:", error);
    }
};

/**
 * Notification Logic
 */
window.activateNotifications = async function() {
    const statusEl = document.getElementById('notify-status');
    
    if (!('Notification' in window)) {
        alert("Notifications not supported.");
        return;
    }

    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;

    if (isIOS && !isStandalone) {
        showiOSInstructions();
        return;
    }

    try {
        if (statusEl) statusEl.textContent = '...';
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
            const registration = await navigator.serviceWorker.getRegistration();
            if (!registration) return;

            const token = await getToken(messaging, { 
                vapidKey: 'BMAUf9qk8ZkeepGWcHaffFfutJ7rAvavjGF4dvhWYZ3aUuswVAfiF2h6Pc6ZNZqT0UlkxXYT0pmJZis2LNIJBvc',
                serviceWorkerRegistration: registration
            });
            
            if (token) {
                const subscribe = httpsCallable(functions, 'subscribeToTopic');
                await subscribe({ token: token });
                localStorage.setItem('ursa_notify_enabled', 'true');
                if (statusEl) {
                    statusEl.textContent = 'ON';
                    statusEl.style.background = '#30d158';
                    statusEl.style.color = 'black';
                }
                alert("✅ Notifications enabled!");
            }
        }
    } catch (error) {
        if (statusEl) statusEl.textContent = 'OFF';
    }
};

function showiOSInstructions() {
    const overlay = document.createElement('div');
    overlay.id = "pwa-instr-overlay";
    overlay.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:20000; display:flex; align-items:flex-end;";
    const modal = document.createElement('div');
    modal.style = "width:100%; background:#1c1c1e; border-radius:20px 20px 0 0; padding:30px; color:white; font-family:-apple-system, sans-serif; box-sizing:border-box; border-top:1px solid #333; animation: slideUp 0.3s ease-out;";
    modal.innerHTML = `
        <div style="text-align:center;">
            <div style="width:40px; height:5px; background:#333; border-radius:10px; margin: 0 auto 20px;"></div>
            <h2>Enable Notifications</h2>
            <p style="opacity:0.7; font-size:15px; margin-bottom:25px;">On iOS, notifications only work when URSA is added to your Home Screen.</p>
            <button onclick="document.getElementById('pwa-instr-overlay').remove()" style="width:100%; padding:16px; background:#007aff; border:none; border-radius:12px; color:white; font-weight:bold;">Got it</button>
        </div>
    `;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
}

onMessage(messaging, (payload) => {
    alert(`🔔 ${payload.notification.title}\n${payload.notification.body}`);
});

/**
 * Helper Functions
 */
window.shareApp = (bundleId) => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?id=${bundleId}`;
    if (navigator.share) {
        navigator.share({ title: 'URSA IPA', url: shareUrl }).catch(console.error);
    } else {
        navigator.clipboard.writeText(shareUrl);
        alert('Link copied to clipboard!');
    }
};

function formatDate(timestamp) {
    if (!timestamp) return "Unknown";
    return timestamp.toDate().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

function createAppCard(appData, docId) {
    const card = document.createElement('div');
    card.className = 'app-card';
    card.innerHTML = `
        <img src="${appData.icon_url}" class="app-icon" onerror="this.src='https://via.placeholder.com/60'">
        <div class="app-info">
            <div class="app-name">${appData.name || 'Unknown'}</div>
            <div class="app-meta">v${appData.version || '0'} • ${appData.size || '?? MB'}</div>
            <div class="app-date">Updated: ${formatDate(appData.upload_date)}</div>
        </div>
        <button class="download-btn">GET</button>
    `;
    card.addEventListener('click', () => {
        if (document.getElementById('search-overlay').classList.contains('active')) toggleSearch(false);
        openModal(appData, docId);
    });
    return card;
}

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
            if (cat && !categories.includes(cat)) categories.push(cat);
        });
        categories.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = `category-btn ${cat === currentCategory ? 'active' : ''}`;
            btn.textContent = cat;
            btn.onclick = (e) => {
                e.stopPropagation();
                currentCategory = cat;
                loadApps(sectionName, cat);
                renderCategoryBar(sectionName);
            };
            bar.appendChild(btn);
        });
    } catch (e) { console.error(e); }
}

async function openModal(appData, docId) {
    const overlay = document.getElementById('modal-overlay');
    const modalBody = document.getElementById('modal-body');
    const displayViews = (appData.views || 0) + 1;

    const downloadAction = currentUser 
        ? `window.location.href='${appData.download_url}'` 
        : `alert('⚠️ Please log in via the Settings tab to download files.')`;
    
    const downloadBtnText = currentUser ? "DOWNLOAD IPA" : "🔒 LOG IN TO DOWNLOAD";

    modalBody.innerHTML = `
        <div class="modal-header-info">
            <img src="${appData.icon_url}" class="modal-icon-big" onerror="this.src='https://via.placeholder.com/60'">
            <div class="modal-title-wrap">
                <h2>${appData.name}</h2>
                <button class="share-btn-rect" onclick="shareApp('${appData.bundle_id}')">
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
            <div class="stat-item" style="grid-column: span 2;">
                FEATURES
                <b style="white-space: pre-wrap; font-weight: 700; margin-top: 5px; display: block; color: white; text-transform: none; font-size: 14px;">${appData.features || "Original"}</b>
            </div>
        </div>
        <div class="modal-desc" style="white-space: pre-wrap; word-break: break-word; line-height: 1.6; opacity: 0.9; font-size: 15px; margin-bottom: 30px;">${appData.description || "No description available."}</div>
        <button class="get-btn-big" onclick="${downloadAction}">${downloadBtnText}</button>
    `;
    overlay.classList.add('active');
    
    if (docId) {
        try { await updateDoc(doc(db, "apps", docId), { views: increment(1) }); } catch (e) {}
    }
}

async function loadApps(sectionName, category = 'All') {
    const appList = document.getElementById('app-list');
    if (!appList) return;
    appList.innerHTML = '<div style="text-align:center; padding:50px; opacity:0.5;">Loading...</div>';
    try {
        const colRef = collection(db, "apps");
        let q = (category === 'All') 
            ? query(colRef, where("section", "==", sectionName), orderBy("upload_date", "desc"))
            : query(colRef, where("section", "==", sectionName), where("category", "==", category), orderBy("upload_date", "desc"));
        
        const snap = await getDocs(q);
        appList.innerHTML = ''; 
        if (snap.empty) {
            appList.innerHTML = '<div style="text-align:center; padding:50px; opacity:0.5;">No items found</div>';
            return;
        }
        snap.forEach((doc) => appList.appendChild(createAppCard(doc.data(), doc.id)));
    } catch (e) { appList.innerHTML = `<div style="text-align:center; padding:50px; opacity:0.5;">Error loading data</div>`; }
}

async function updateStats() {
    try {
        const snap = await getDocs(collection(db, "apps"));
        let totalViews = 0;
        snap.forEach(doc => { totalViews += (doc.data().views || 0); });
        const filesEl = document.getElementById('stat-files');
        const viewsEl = document.getElementById('stat-views');
        if (filesEl) filesEl.textContent = snap.size;
        if (viewsEl) viewsEl.textContent = totalViews.toLocaleString();
    } catch (e) {}
}

const searchOverlay = document.getElementById('search-overlay');
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
const clearSearchBtn = document.getElementById('clear-search');

function toggleSearch(show) {
    if (show) { searchOverlay.classList.add('active'); searchInput.focus(); } 
    else { searchOverlay.classList.remove('active'); searchInput.value = ''; searchResults.innerHTML = ''; clearSearchBtn.style.display = 'none'; }
}

async function performSearch(term) {
    if (term.length < 2) return;
    clearSearchBtn.style.display = 'block';
    try {
        const snap = await getDocs(collection(db, "apps"));
        searchResults.innerHTML = '';
        let found = false;
        snap.forEach(doc => {
            const data = doc.data();
            if (data.name.toLowerCase().includes(term.toLowerCase())) {
                found = true; searchResults.appendChild(createAppCard(data, doc.id));
            }
        });
        if (!found) searchResults.innerHTML = '<div style="text-align:center; padding:20px; opacity:0.5;">No results found</div>';
    } catch (e) {}
}

searchInput.addEventListener('input', (e) => performSearch(e.target.value));
clearSearchBtn.addEventListener('click', () => { searchInput.value = ''; searchResults.innerHTML = ''; clearSearchBtn.style.display = 'none'; searchInput.focus(); });
document.getElementById('cancel-search').addEventListener('click', () => toggleSearch(false));

/**
 * Render More Page with Auth
 */
function renderMorePage() {
    const isNotifyEnabled = localStorage.getItem('ursa_notify_enabled') === 'true';
    document.getElementById('category-bar').innerHTML = '';
    
    const authProfileHtml = currentUser ? `
        <div class="user-profile-card" style="display:flex; align-items:center; gap:15px; background:rgba(255,255,255,0.1); padding:15px; border-radius:20px; width:100%; margin-bottom:10px; border:1px solid rgba(255,255,255,0.05);">
            <img src="${currentUser.photoURL}" style="width:50px; height:50px; border-radius:50%; border:2px solid #007aff;">
            <div style="flex:1;">
                <div style="font-weight:bold; font-size:16px;">${currentUser.displayName}</div>
                <div style="font-size:12px; opacity:0.6;">URSA Member</div>
            </div>
            <button onclick="logoutUser()" style="background:rgba(255,69,58,0.2); color:#ff453a; border:none; padding:8px 12px; border-radius:10px; font-weight:bold; font-size:12px;">Logout</button>
        </div>
    ` : `
        <div class="login-promo-card" style="background:linear-gradient(135deg, #007aff, #00c6ff); padding:20px; border-radius:20px; width:100%; text-align:center; margin-bottom:10px; box-shadow: 0 10px 20px rgba(0,122,255,0.2);">
            <h3 style="margin-bottom:8px;">Account Required</h3>
            <p style="font-size:13px; opacity:0.9; margin-bottom:15px;">Sign in to unlock IPA downloads and exclusive features.</p>
            <button onclick="loginUser()" style="background:white; color:#007aff; border:none; padding:12px 24px; border-radius:12px; font-weight:bold; font-size:15px; cursor:pointer; width:100%;">Sign in with Google</button>
        </div>
    `;

    document.getElementById('app-list').innerHTML = `
        <div class="more-page">
            ${authProfileHtml}
            <div class="more-header-brand">
                <img src="icons/logoursa.jpeg" alt="URSA Logo" class="more-logo" style="width:80px; border-radius:20px; margin-bottom:10px;">
                <h2 style="color:white; margin-top:0;">URSA IPA Company</h2>
            </div>
            <div class="more-group">
                <div class="stats-card">
                    <div class="stat-box"><span class="stat-value" id="stat-files">...</span><span class="stat-label">FILES</span></div>
                    <div class="stat-divider"></div>
                    <div class="stat-box"><span class="stat-value" id="stat-views">...</span><span class="stat-label">VIEWS</span></div>
                </div>
            </div>
            <div class="more-group">
                <a href="https://t.me/ursa_ipa" target="_blank" class="more-item-link">
                    <div class="more-item-content"><span class="item-icon">✈️</span><span>Telegram Channel</span></div><span class="arrow">›</span>
                </a>
                <div class="more-item-link notify-btn" onclick="activateNotifications()" style="cursor: pointer; -webkit-tap-highlight-color: transparent;">
                    <div class="more-item-content"><span class="item-icon">🔔</span><span>IPA Notifications</span></div>
                    <span class="notify-status" id="notify-status" style="${isNotifyEnabled ? 'background:#30d158;color:black;' : ''}">${isNotifyEnabled ? 'ON' : 'OFF'}</span>
                </div>
            </div>
            <div class="more-footer"><p>© 2025 URSA IPA Project</p></div>
        </div>
    `;
    updateStats();
}

/**
 * Tab Navigation Logic
 */
function switchTab(target) {
    if (target === 'search') {
        toggleSearch(true);
        return;
    }
    
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    const targetBtn = document.querySelector(`.nav-item[data-target="${target}"]`);
    if (targetBtn) targetBtn.classList.add('active');
    
    currentSection = target;
    if (target === 'more') {
        renderMorePage();
    } else {
        renderCategoryBar(target);
        loadApps(target);
    }
}

document.querySelectorAll('.nav-item').forEach(button => {
    button.addEventListener('click', () => {
        const target = button.getAttribute('data-target');
        switchTab(target);
    });
});

/**
 * Deep Link Logic
 */
async function checkDeepLink() {
    const urlParams = new URLSearchParams(window.location.search);
    const appId = urlParams.get('id');
    
    if (appId) {
        try {
            const snap = await getDocs(query(collection(db, "apps"), where("bundle_id", "==", appId)));
            if (!snap.empty) openModal(snap.docs[0].data(), snap.docs[0].id);
        } catch (e) {}
    }
}

/**
 * INITIALIZATION
 */
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const targetTab = urlParams.get('tab');
    
    // Если в URL есть tab=more, открываем сразу профиль и ПРЕРЫВАЕМ стандартную загрузку
    if (targetTab === 'more') {
        switchTab('more');
    } else {
        // Иначе грузим стандартную страницу игр
        switchTab('games');
    }
    
    checkDeepLink();
});
