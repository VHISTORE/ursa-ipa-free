import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, updateDoc, doc, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Конфигурация Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCQxz47mev45XXLz3ejJViVQCzFL_Fo3z8",
    authDomain: "ursaipa.firebaseapp.com",
    projectId: "ursaipa",
    storageBucket: "ursaipa.firebasestorage.app",
    messagingSenderId: "697377996977",
    appId: "1:697377996977:web:f94ca78dfe3d3472942290"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Данные Gofile и Admin
const GOFILE_TOKEN = "1CXC2VQ263Z4TctNDGiWkE935MnTki35"; 
const ADMIN_EMAIL = "vibemusic1712@gmail.com";
const ROOT_FOLDER_ID = "f6473757-cc2b-42b4-bb4e-99d4b8d3429c"; 

// --- НАСТРОЙКА УВЕДОМЛЕНИЙ ---
// ВСТАВЬТЕ СЮДА ВАШ LEGACY SERVER KEY ИЗ НАСТРОЕК FIREBASE
const SERVER_KEY = "ЗДЕСЬ_ВАШ_КЛЮЧ_СЕРВЕРА"; 

let editMode = false;
let currentEditId = null;
let isIconUploaded = false;
let isIpaUploaded = false;
let allApps = []; 

const adminMain = document.getElementById('admin-main');
const authContainer = document.getElementById('auth-container');
const form = document.getElementById('add-app-form');
const adminAppList = document.getElementById('admin-app-list');
const submitBtn = document.getElementById('submit-btn');
const searchInput = document.getElementById('inventory-search');

// --- УТИЛИТА ОТПРАВКИ ПУША ---
async function sendPushNotification(appName, version, isNew) {
    if (!SERVER_KEY || SERVER_KEY === "ЗДЕСЬ_ВАШ_КЛЮЧ_СЕРВЕРА") {
        console.warn("Server Key not set. Notification skipped.");
        return;
    }

    const title = isNew ? "🆕 New IPA Available!" : "🆙 New Update!";
    const body = `${appName} | v${version} ${isNew ? 'is now added' : 'has been updated'} in URSA IPA.`;

    try {
        const response = await fetch('https://fcm.googleapis.com/fcm/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `key=${SERVER_KEY}`
            },
            body: JSON.stringify({
                to: "/topics/all",
                notification: {
                    title: title,
                    body: body,
                    icon: "https://vhistore.github.io/ursa-ipa-free/icons/logoursa.jpeg",
                    click_action: "https://vhistore.github.io/ursa-ipa-free/",
                    sound: "default"
                },
                priority: "high"
            })
        });
        const result = await response.json();
        console.log("FCM Result:", result);
    } catch (e) {
        console.error("Push Error:", e);
    }
}

// --- УТИЛИТА ДЛЯ РАЗМЕРА ФАЙЛА ---
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// --- УПРАВЛЕНИЕ ДОСТУПОМ ---
onAuthStateChanged(auth, (user) => {
    if (user && user.email === ADMIN_EMAIL) {
        authContainer.style.display = 'none';
        adminMain.style.display = 'block';
        document.getElementById('admin-email').textContent = user.email;
        loadInventory();
    } else {
        if (user) signOut(auth);
        authContainer.style.display = 'block';
        adminMain.style.display = 'none';
    }
});

document.getElementById('login-btn').onclick = () => signInWithPopup(auth, provider);
document.getElementById('logout-btn').onclick = () => signOut(auth);

function updateSubmitButton() {
    if (isIconUploaded && isIpaUploaded) {
        submitBtn.disabled = false;
        submitBtn.textContent = editMode ? "Update Application" : "Publish App";
        submitBtn.style.background = "#007aff";
    } else {
        submitBtn.disabled = true;
        submitBtn.textContent = "Waiting for DirectLinks...";
    }
}

// --- УНИВЕРСАЛЬНЫЙ ПАРСЕР ССЫЛОК ---
async function createAndGetDirectLink(contentId, retryCount = 0) {
    try {
        const response = await fetch(`https://api.gofile.io/contents/${contentId}/directlinks`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GOFILE_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ expireTime: 4102444800 })
        });
        
        const result = await response.json();
        if (result.status === "ok" && result.data) {
            const data = result.data;
            if (data.link) return data.link;
            const deepSearch = (obj) => {
                for (let key in obj) {
                    if (typeof obj[key] === 'string' && obj[key].startsWith('http')) return obj[key];
                    if (typeof obj[key] === 'object' && obj[key] !== null) {
                        const found = deepSearch(obj[key]);
                        if (found) return found;
                    }
                }
                return null;
            };
            const foundUrl = deepSearch(data);
            if (foundUrl) return foundUrl;
        }
        if (retryCount < 5) {
            await new Promise(r => setTimeout(r, 3000));
            return await createAndGetDirectLink(contentId, retryCount + 1);
        }
        return null;
    } catch (e) { return null; }
}

// --- ЗАГРУЗКА ФАЙЛА ---
async function uploadFile(file, progressId, statusId, hiddenInputId) {
    const status = document.getElementById(statusId);
    const progress = document.getElementById(progressId);
    const hiddenInput = document.getElementById(hiddenInputId);

    if (hiddenInputId === 'download_url') {
        document.getElementById('size').value = formatBytes(file.size);
    }

    try {
        status.style.color = "white";
        status.textContent = "🚀 Starting upload...";
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
            try {
                const res = JSON.parse(xhr.responseText);
                if (res.status === "ok") {
                    status.textContent = "🔗 Fetching Direct Link...";
                    const fileId = res.data.id;
                    await new Promise(r => setTimeout(r, 2000));
                    const directUrl = await createAndGetDirectLink(fileId);
                    const finalUrl = directUrl || res.data.downloadPage;
                    
                    hiddenInput.value = finalUrl; 
                    status.textContent = directUrl ? "✅ Direct Link Ready!" : "⚠️ Fallback Link Ready";
                    status.style.color = directUrl ? "#30d158" : "#ff9f0a";
                    progress.style.background = directUrl ? "#30d158" : "#ff9f0a";
                    
                    if (hiddenInputId === 'icon_url') {
                        isIconUploaded = true;
                        document.getElementById('icon-preview').innerHTML = `<img src="${finalUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;">`;
                    } else {
                        isIpaUploaded = true;
                    }
                    updateSubmitButton();
                } else {
                    status.textContent = "❌ Upload Error";
                }
            } catch (e) { status.textContent = "❌ Error"; }
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

// --- СИСТЕМА ИНВЕНТАРЯ ---
async function loadInventory() {
    adminAppList.innerHTML = '<p style="text-align:center; opacity:0.5;">Syncing...</p>';
    try {
        const q = query(collection(db, "apps"), orderBy("upload_date", "desc"));
        const snap = await getDocs(q);
        allApps = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })); 
        renderList(allApps);
    } catch (e) { console.error(e); }
}

function renderList(apps) {
    adminAppList.innerHTML = '';
    if (apps.length === 0) {
        adminAppList.innerHTML = '<p style="text-align:center; opacity:0.3; padding:20px;">No results found</p>';
        return;
    }

    apps.forEach((appData) => {
        const div = document.createElement('div');
        div.className = 'admin-item';
        div.innerHTML = `
            <div class="admin-item-info">
                <img src="${appData.icon_url}" width="35" height="35" style="border-radius:8px; object-fit:cover;">
                <div>
                    <strong>${appData.name}</strong><br>
                    <small style="opacity:0.4; font-size:10px;">${appData.bundle_id || 'no bundle'}</small>
                </div>
            </div>
            <div class="admin-item-actions">
                <button class="edit-btn" data-id="${appData.id}">Edit</button>
                <button class="del-btn" data-id="${appData.id}">Delete</button>
            </div>
        `;
        adminAppList.appendChild(div);
    });

    document.querySelectorAll('.del-btn').forEach(btn => {
        btn.onclick = async () => {
            if(confirm('Delete app?')) {
                await deleteDoc(doc(db, "apps", btn.dataset.id));
                loadInventory();
            }
        };
    });

    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.onclick = () => {
            const data = allApps.find(a => a.id === btn.dataset.id);
            startEdit(btn.dataset.id, data);
        };
    });
}

searchInput.addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase().trim();
    const filtered = allApps.filter(app => 
        app.name.toLowerCase().includes(val) || 
        (app.bundle_id && app.bundle_id.toLowerCase().includes(val))
    );
    renderList(filtered);
});

function startEdit(id, appData) {
    currentEditId = id;
    editMode = true;
    isIconUploaded = true;
    isIpaUploaded = true;
    const fields = ['name', 'section', 'category', 'version', 'size', 'bundle_id', 'icon_url', 'download_url', 'min_ios', 'features', 'description'];
    fields.forEach(f => {
        const el = document.getElementById(f);
        if (el) el.value = appData[f] || '';
    });
    document.getElementById('icon-preview').innerHTML = `<img src="${appData.icon_url}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;">`;
    submitBtn.style.background = "#30d158";
    updateSubmitButton();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;

    const appName = document.getElementById('name').value;
    const appVersion = document.getElementById('version').value;

    const appObj = {
        name: appName,
        section: document.getElementById('section').value,
        category: document.getElementById('category').value.toLowerCase(),
        version: appVersion,
        size: document.getElementById('size').value,
        bundle_id: document.getElementById('bundle_id').value,
        icon_url: document.getElementById('icon_url').value, 
        download_url: document.getElementById('download_url').value, 
        min_ios: document.getElementById('min_ios').value,
        features: document.getElementById('features').value || "Original",
        description: document.getElementById('description').value,
        upload_date: serverTimestamp()
    };

    try {
        if (editMode) {
            await updateDoc(doc(db, "apps", currentEditId), appObj);
            // Отправляем пуш (Update)
            await sendPushNotification(appName, appVersion, false);
        } else {
            appObj.views = 0;
            await addDoc(collection(db, "apps"), appObj);
            // Отправляем пуш (New)
            await sendPushNotification(appName, appVersion, true);
        }
        resetForm();
        loadInventory();
        alert("Success! Data saved and notification sent.");
    } catch (err) { alert(err.message); }
    submitBtn.disabled = false;
});

function resetForm() {
    form.reset();
    editMode = false;
    currentEditId = null;
    isIconUploaded = false;
    isIpaUploaded = false;
    submitBtn.style.background = "#007aff";
    document.getElementById('icon-progress').style.width = "0%";
    document.getElementById('ipa-progress').style.width = "0%";
    document.getElementById('icon-status').textContent = "Tap to upload icon";
    document.getElementById('ipa-status').textContent = "Tap to select .ipa";
    document.getElementById('icon-preview').innerHTML = "📸";
    updateSubmitButton();
}
