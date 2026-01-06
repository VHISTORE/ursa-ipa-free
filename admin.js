import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, updateDoc, doc, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, onValue, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCQxz47mev45XXLz3ejJViVQCzFL_Fo3z8",
    authDomain: "ursaipa.firebaseapp.com",
    projectId: "ursaipa",
    storageBucket: "ursaipa.firebasestorage.app",
    messagingSenderId: "697377996977",
    appId: "1:697377996977:web:f94ca78dfe3d3472942290",
    databaseURL: "https://ursaipa-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const rtdb = getDatabase(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Gofile & Admin Data
const GOFILE_TOKEN = "1CXC2VQ263Z4TctNDGiWkE935MnTki35"; 
const ADMIN_EMAILS = ["vibemusic1712@gmail.com", "Wasmachensachenh@gmail.com", "maximguf10@gmail.com"];
const ROOT_FOLDER_ID = "f6473757-cc2b-42b4-bb4e-99d4b8d3429c"; 

let editMode = false;
let currentEditId = null;
let isIconUploaded = false;
let isIpaUploaded = false;
let allApps = []; 

const adminMain = document.getElementById('admin-main');
const authContainer = document.getElementById('auth-container');
const form = document.getElementById('add-app-form');
const adminAppList = document.getElementById('admin-app-list');
const submitBtn = document.getElementById('manual-submit-btn');
const searchInput = document.getElementById('inventory-search');

// --- TABS LOGIC ---
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.tab-btn, .admin-page').forEach(el => el.classList.remove('active'));
        btn.classList.add('active');
        const target = btn.dataset.target;
        document.getElementById(target).classList.add('active');
        
        if (target === 'page-bans') initBanManager();
        if (target === 'page-sessions') initSessionMonitor();
    };
});

// --- FILE SIZE UTILITY ---
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// --- ACCESS CONTROL ---
onAuthStateChanged(auth, (user) => {
    if (user && ADMIN_EMAILS.includes(user.email)) {
        authContainer.style.display = 'none';
        adminMain.style.display = 'block';
        document.getElementById('admin-email').textContent = user.email;
        loadInventory();
    } else {
        if (user) {
            alert("Access Denied!");
            signOut(auth);
        }
        authContainer.style.display = 'block';
        adminMain.style.display = 'none';
    }
});

document.getElementById('login-btn').onclick = () => signInWithPopup(auth, provider);
document.getElementById('logout-btn').onclick = () => signOut(auth);

// --- BAN SYSTEM ---
function initBanManager() {
    const banListContainer = document.getElementById('ban-list');
    const sessionsRef = ref(rtdb, 'sessions');

    onValue(sessionsRef, (snapshot) => {
        banListContainer.innerHTML = '';
        const data = snapshot.val();
        if (!data) {
            banListContainer.innerHTML = '<p style="text-align:center; opacity:0.5;">No registered devices found.</p>';
            return;
        }

        Object.keys(data).forEach(deviceId => {
            const deviceData = data[deviceId];
            const isBanned = deviceData.banned === true;
            
            const div = document.createElement('div');
            div.className = `ban-item ${isBanned ? 'banned' : ''}`;
            div.innerHTML = `
                <div class="user-info">
                    <img src="${deviceData.avatar || ''}" class="user-avatar" onerror="this.src='https://ui-avatars.com/api/?name=${deviceData.nickname}'">
                    <div>
                        <strong>${deviceData.nickname || 'Unknown'}</strong>
                        <span class="device-id">${deviceId}</span>
                    </div>
                </div>
                <button style="background: ${isBanned ? '#30d158' : '#ff453a'}; padding: 8px 15px; border-radius: 10px; border:none; color:white; font-weight:bold; cursor:pointer;" 
                    id="btn-ban-${deviceId}">
                    ${isBanned ? 'Unban' : 'Ban Device'}
                </button>
            `;
            banListContainer.appendChild(div);

            document.getElementById(`btn-ban-${deviceId}`).onclick = () => {
                const deviceRef = ref(rtdb, `sessions/${deviceId}`);
                update(deviceRef, { banned: !isBanned });
            };
        });
    });
}

function initSessionMonitor() {
    const sessionsContainer = document.getElementById('sessions-list');
    const sessionsRef = ref(rtdb, 'sessions');

    onValue(sessionsRef, (snapshot) => {
        sessionsContainer.innerHTML = '';
        const data = snapshot.val();
        if (!data) return;

        const sorted = Object.entries(data).sort((a, b) => (b[1].timestamp || 0) - (a[1].timestamp || 0));

        sorted.forEach(([id, s]) => {
            const div = document.createElement('div');
            div.className = 'session-item';
            const time = s.timestamp ? new Date(s.timestamp).toLocaleString() : 'N/A';
            div.innerHTML = `
                <div class="user-info">
                    <img src="${s.avatar || ''}" class="user-avatar">
                    <div>
                        <strong>${s.nickname}</strong><br>
                        <small style="opacity:0.6;">${s.email}</small>
                    </div>
                </div>
                <div style="text-align:right;">
                    <span style="font-size:11px; opacity:0.5;">Last Login:</span><br>
                    <span style="font-size:12px; color:var(--accent);">${time}</span>
                </div>
            `;
            sessionsContainer.appendChild(div);
        });
    });
}

// --- IPA MANAGER LOGIC ---
function updateSubmitButton() {
    if (isIconUploaded && isIpaUploaded) {
        submitBtn.disabled = false;
        submitBtn.textContent = editMode ? "Update Application" : "Publish App";
        submitBtn.style.background = "#007aff";
    } else {
        submitBtn.disabled = true;
        submitBtn.textContent = "Waiting for uploads...";
    }
}

async function createAndGetDirectLink(contentId, retryCount = 0) {
    try {
        // 1. Пытаемся создать прямую ссылку
        const response = await fetch(`https://api.gofile.io/contents/${contentId}/directlinks`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${GOFILE_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ expireTime: 4102444800 })
        });
        const result = await response.json();
        
        if (result.status === "ok" && result.data && result.data.link) {
            return result.data.link;
        }

        // 2. Резервный метод: проверка метаданных файла
        const infoRes = await fetch(`https://api.gofile.io/contents/${contentId}`, {
            headers: { 'Authorization': `Bearer ${GOFILE_TOKEN}` }
        });
        const infoData = await infoRes.json();
        if (infoData.status === "ok" && infoData.data.directLink) {
            return infoData.data.directLink;
        }

        // 3. Ожидание индексации (макс 32 сек)
        if (retryCount < 8) {
            console.log("Link not ready, retrying...");
            await new Promise(r => setTimeout(r, 4000));
            return await createAndGetDirectLink(contentId, retryCount + 1);
        }
        return null;
    } catch (e) { 
        console.error("DirectLink Error:", e);
        return null; 
    }
}

async function uploadFile(file, progressId, statusId, hiddenInputId) {
    const status = document.getElementById(statusId);
    const progress = document.getElementById(progressId);
    const hiddenInput = document.getElementById(hiddenInputId);

    if (hiddenInputId === 'download_url') document.getElementById('size').value = formatBytes(file.size);

    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folderId', ROOT_FOLDER_ID);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', 'https://upload.gofile.io/uploadfile');
        xhr.setRequestHeader('Authorization', `Bearer ${GOFILE_TOKEN}`);

        xhr.upload.onprogress = (e) => {
            const percent = (e.loaded / e.total) * 100;
            progress.style.width = percent + "%";
            status.textContent = `Uploading: ${Math.round(percent)}%`;
        };

        xhr.onload = async function() {
            const res = JSON.parse(xhr.responseText);
            if (res.status === "ok") {
                status.textContent = "🔗 Generating Direct Link...";
                
                // Даем серверу время на обработку перед первым запросом ссылки
                await new Promise(r => setTimeout(r, 3000));
                
                const directUrl = await createAndGetDirectLink(res.data.id);
                
                // Критическая проверка для IPA
                if (!directUrl && hiddenInputId === 'download_url') {
                    status.textContent = "⚠️ Direct Link Failed";
                    alert("Gofile failed to provide a direct link. App installation will NOT work with a page link!");
                    hiddenInput.value = res.data.downloadPage; // Временный фолбэк
                } else {
                    hiddenInput.value = directUrl || res.data.downloadPage;
                    status.textContent = "✅ Success!";
                }
                
                if (hiddenInputId === 'icon_url') {
                    isIconUploaded = true;
                    document.getElementById('icon-preview').innerHTML = `<img src="${hiddenInput.value}" style="width:100%; height:100%; object-fit:cover; border-radius:10px;">`;
                } else {
                    isIpaUploaded = true;
                }
                updateSubmitButton();
            } else {
                status.textContent = "❌ Upload Error";
            }
        };
        xhr.send(formData);
    } catch (err) { status.textContent = "❌ Failed"; }
}

document.getElementById('icon-input').onchange = (e) => {
    if (e.target.files[0]) uploadFile(e.target.files[0], 'icon-progress', 'icon-status', 'icon_url');
};

document.getElementById('ipa-input').onchange = (e) => {
    if (e.target.files[0]) uploadFile(e.target.files[0], 'ipa-progress', 'ipa-status', 'download_url');
};

async function loadInventory() {
    try {
        const q = query(collection(db, "apps"), orderBy("upload_date", "desc"));
        const snap = await getDocs(q);
        allApps = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })); 
        renderList(allApps);
    } catch (e) { console.error(e); }
}

function renderList(apps) {
    adminAppList.innerHTML = '';
    apps.forEach((appData) => {
        const div = document.createElement('div');
        div.className = 'admin-item';
        div.innerHTML = `
            <div class="admin-item-info">
                <img src="${appData.icon_url}" width="35" height="35" style="border-radius:8px;">
                <div><strong>${appData.name}</strong><br><small>${appData.version}</small></div>
            </div>
            <div class="admin-item-actions">
                <button class="edit-btn" onclick="window.startEdit('${appData.id}')">Edit</button>
                <button class="del-btn" onclick="window.deleteApp('${appData.id}')">Delete</button>
            </div>
        `;
        adminAppList.appendChild(div);
    });
}

window.startEdit = (id) => {
    const appData = allApps.find(a => a.id === id);
    currentEditId = id;
    editMode = true;
    isIconUploaded = isIpaUploaded = true;
    
    document.getElementById('name').value = appData.name;
    document.getElementById('section').value = appData.section;
    document.getElementById('category').value = appData.category;
    document.getElementById('version').value = appData.version;
    document.getElementById('size').value = appData.size;
    document.getElementById('bundle_id').value = appData.bundle_id;
    document.getElementById('min_ios').value = appData.min_ios || '';
    document.getElementById('features').value = appData.features || '';
    document.getElementById('description').value = appData.description || '';
    document.getElementById('icon_url').value = appData.icon_url;
    document.getElementById('download_url').value = appData.download_url;
    
    document.getElementById('icon-preview').innerHTML = `<img src="${appData.icon_url}" style="width:100%; height:100%; object-fit:cover; border-radius:10px;">`;
    updateSubmitButton();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.deleteApp = async (id) => {
    if (confirm('Delete this app?')) {
        await deleteDoc(doc(db, "apps", id));
        loadInventory();
    }
};

const handleSave = async () => {
    if (submitBtn.disabled) return;
    submitBtn.disabled = true;
    submitBtn.textContent = "Processing...";

    const appObj = {
        name: document.getElementById('name').value,
        section: document.getElementById('section').value,
        category: document.getElementById('category').value.toLowerCase(),
        version: document.getElementById('version').value,
        size: document.getElementById('size').value,
        bundle_id: document.getElementById('bundle_id').value,
        min_ios: document.getElementById('min_ios').value,
        features: document.getElementById('features').value,
        description: document.getElementById('description').value,
        icon_url: document.getElementById('icon_url').value,
        download_url: document.getElementById('download_url').value,
        upload_date: serverTimestamp()
    };

    try {
        if (editMode) {
            await updateDoc(doc(db, "apps", currentEditId), appObj);
        } else {
            appObj.views = 0;
            await addDoc(collection(db, "apps"), appObj);
        }
        form.reset();
        editMode = false;
        isIconUploaded = isIpaUploaded = false;
        document.getElementById('icon-preview').innerHTML = "📸";
        loadInventory();
        alert("Saved successfully!");
    } catch (err) { alert(err.message); }
    updateSubmitButton();
};

submitBtn.onclick = handleSave;

searchInput.addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase();
    const filtered = allApps.filter(app => app.name.toLowerCase().includes(val));
    renderList(filtered);
});
