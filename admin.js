import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, updateDoc, doc, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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

const GOFILE_TOKEN = "yJlIY71QaZ5WZ9cdI18Ig7QuwwEvYMZM"; 
const ADMIN_EMAIL = "vibemusic1712@gmail.com";

let editMode = false;
let currentEditId = null;
let isIconUploaded = false;
let isIpaUploaded = false;

const adminMain = document.getElementById('admin-main');
const authContainer = document.getElementById('auth-container');
const form = document.getElementById('add-app-form');
const adminAppList = document.getElementById('admin-app-list');
const submitBtn = document.getElementById('submit-btn');

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
    } else {
        submitBtn.disabled = true;
        submitBtn.textContent = "Waiting for DirectLinks...";
    }
}

// --- СОЗДАНИЕ DIRECT LINK (МАЙ 2025) ---
async function createDirectLink(contentId) {
    try {
        const response = await fetch(`https://api.gofile.io/contents/${contentId}/directlinks`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GOFILE_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({}) 
        });
        
        const result = await response.json();
        console.log("DirectLink API Response:", result);

        if (result.status === "ok" && result.data && result.data.directLinks && result.data.directLinks.length > 0) {
            // Пытаемся взять поле 'link', если его нет - поле 'url'
            return result.data.directLinks[0].link || result.data.directLinks[0].url;
        }
        return null;
    } catch (e) {
        console.error("DirectLink Error:", e);
        return null;
    }
}

// --- УНИВЕРСАЛЬНАЯ ЗАГРУЗКА ---
async function uploadFile(file, progressId, statusId, hiddenInputId) {
    const status = document.getElementById(statusId);
    const progress = document.getElementById(progressId);
    const hiddenInput = document.getElementById(hiddenInputId);

    try {
        status.style.color = "white";
        status.textContent = "🚀 Starting upload...";
        
        const formData = new FormData();
        formData.append('file', file);

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
                    status.textContent = "🔗 Processing Direct Link...";
                    const contentId = res.data.id;
                    
                    // Ждем 1.5 сек, чтобы Gofile проиндексировал файл (решает ошибку undefined)
                    await new Promise(r => setTimeout(r, 1500));

                    const directUrl = await createDirectLink(contentId);

                    if (directUrl) {
                        hiddenInput.value = directUrl; 
                        status.textContent = "✅ Direct Link Ready!";
                        status.style.color = "#30d158";
                        progress.style.background = "#30d158";

                        if (hiddenInputId === 'icon_url') {
                            isIconUploaded = true;
                            document.getElementById('icon-preview').innerHTML = `<img src="${directUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:12px;">`;
                        } else {
                            isIpaUploaded = true;
                        }
                        updateSubmitButton();
                    } else {
                        status.textContent = "❌ DirectLink failed";
                        status.style.color = "#ff453a";
                    }
                } else {
                    status.textContent = "❌ Error: " + res.status;
                }
            } catch (e) {
                status.textContent = "❌ Server error";
            }
        };
        xhr.send(formData);
    } catch (err) {
        status.textContent = "❌ Connection failed";
    }
}

document.getElementById('icon-input').onchange = (e) => {
    if (e.target.files[0]) uploadFile(e.target.files[0], 'icon-progress', 'icon-status', 'icon_url');
};

document.getElementById('ipa-input').onchange = (e) => {
    if (e.target.files[0]) uploadFile(e.target.files[0], 'ipa-progress', 'ipa-status', 'download_url');
};

// --- ИНВЕНТАРЬ ---
async function loadInventory() {
    const list = document.getElementById('admin-app-list');
    const q = query(collection(db, "apps"), orderBy("upload_date", "desc"));
    const snap = await getDocs(q);
    list.innerHTML = '';

    snap.forEach((appDoc) => {
        const data = appDoc.data();
        const div = document.createElement('div');
        div.className = 'admin-item';
        div.innerHTML = `
            <div class="admin-item-info">
                <img src="${data.icon_url}" width="35" height="35" style="border-radius:8px; object-fit:cover;">
                <div><strong>${data.name}</strong><br><small style="opacity:0.5">v${data.version}</small></div>
            </div>
            <div class="admin-item-actions">
                <button class="edit-btn" data-id="${appDoc.id}">Edit</button>
                <button class="del-btn" data-id="${appDoc.id}">Delete</button>
            </div>
        `;
        list.appendChild(div);
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
            const appData = snap.docs.find(d => d.id === btn.dataset.id).data();
            startEdit(btn.dataset.id, appData);
        };
    });
}

function startEdit(id, appData) {
    currentEditId = id;
    editMode = true;
    isIconUploaded = true;
    isIpaUploaded = true;

    document.getElementById('name').value = appData.name;
    document.getElementById('section').value = appData.section;
    document.getElementById('category').value = appData.category;
    document.getElementById('version').value = appData.version;
    document.getElementById('size').value = appData.size;
    document.getElementById('bundle_id').value = appData.bundle_id;
    document.getElementById('icon_url').value = appData.icon_url;
    document.getElementById('download_url').value = appData.download_url;
    document.getElementById('min_ios').value = appData.min_ios;
    document.getElementById('features').value = appData.features;
    document.getElementById('description').value = appData.description;

    submitBtn.style.background = "#30d158";
    updateSubmitButton();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- ОТПРАВКА В Базу ---
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;

    const appObj = {
        name: document.getElementById('name').value,
        section: document.getElementById('section').value,
        category: document.getElementById('category').value.toLowerCase(),
        version: document.getElementById('version').value,
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
        } else {
            appObj.views = 0;
            await addDoc(collection(db, "apps"), appObj);
        }
        resetForm();
        loadInventory();
        alert("Success!");
    } catch (err) { alert(err.message); }
    submitBtn.disabled = false;
});

function resetForm() {
    form.reset();
    editMode = false;
    currentEditId = null;
    isIconUploaded = false;
    isIpaUploaded = false;
    submitBtn.style.background = "var(--accent)";
    document.getElementById('icon-progress').style.width = "0%";
    document.getElementById('ipa-progress').style.width = "0%";
    document.getElementById('icon-status').textContent = "Tap to upload icon";
    document.getElementById('ipa-status').textContent = "Tap to select .ipa";
    document.getElementById('icon-preview').innerHTML = "📸";
    updateSubmitButton();
}
