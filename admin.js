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

// Инициализация сервисов
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Ваши данные Gofile и Admin
const GOFILE_TOKEN = "yJlIY71QaZ5WZ9cdI18Ig7QuwwEvYMZM";
const ADMIN_EMAIL = "vibemusic1712@gmail.com";

let editMode = false;
let currentEditId = null;

// Элементы интерфейса
const authContainer = document.getElementById('auth-container');
const adminMain = document.getElementById('admin-main');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const adminEmailSpan = document.getElementById('admin-email');
const form = document.getElementById('add-app-form');
const adminAppList = document.getElementById('admin-app-list');
const submitBtn = document.getElementById('submit-btn');

const fileInput = document.getElementById('file-input');
const uploadStatus = document.getElementById('upload-status');
const progressBar = document.getElementById('progress-bar');
const downloadUrlInput = document.getElementById('download_url');

// --- УПРАВЛЕНИЕ ДОСТУПОМ ---
onAuthStateChanged(auth, (user) => {
    if (user && user.email === ADMIN_EMAIL) {
        authContainer.style.display = 'none';
        adminMain.style.display = 'block';
        adminEmailSpan.textContent = `Admin: ${user.email}`;
        loadInventory();
    } else {
        if (user) { 
            alert("Access Denied"); 
            signOut(auth); 
        }
        authContainer.style.display = 'block';
        adminMain.style.display = 'none';
    }
});

loginBtn.onclick = () => signInWithPopup(auth, provider);
logoutBtn.onclick = () => signOut(auth);

// --- ЗАГРУЗКА НА GOFILE ---
fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
        uploadStatus.style.color = "var(--text-secondary)";
        uploadStatus.textContent = "🚀 Определение сервера...";
        
        // 1. Получаем подходящий сервер
        const serverRes = await fetch('https://api.gofile.io/getServer');
        const serverData = await serverRes.json();
        const server = serverData.data.server;

        // 2. Подготовка данных для загрузки
        const formData = new FormData();
        formData.append('file', file);
        formData.append('token', GOFILE_TOKEN);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', `https://${server}.gofile.io/uploadFile`);

        // Прогресс загрузки
        xhr.upload.onprogress = (event) => {
            const percent = (event.loaded / event.total) * 100;
            progressBar.style.width = percent + "%";
            uploadStatus.textContent = `Загрузка: ${Math.round(percent)}%`;
        };

        xhr.onload = function() {
            const res = JSON.parse(xhr.responseText);
            if (res.status === "ok") {
                // Прямая ссылка для Premium аккаунтов подставляется в форму
                downloadUrlInput.value = res.data.downloadPage; 
                uploadStatus.textContent = "✅ Файл готов к публикации!";
                uploadStatus.style.color = "#30d158";
                progressBar.style.background = "#30d158";
            } else {
                uploadStatus.textContent = "❌ Ошибка Gofile: " + res.status;
            }
        };

        xhr.send(formData);
    } catch (err) {
        uploadStatus.textContent = "❌ Ошибка соединения";
        console.error(err);
    }
});

// --- УПРАВЛЕНИЕ ИНВЕНТАРЕМ ---
async function loadInventory() {
    adminAppList.innerHTML = '<p style="text-align:center; opacity:0.5;">Синхронизация...</p>';
    const q = query(collection(db, "apps"), orderBy("upload_date", "desc"));
    const snap = await getDocs(q);
    adminAppList.innerHTML = '';

    snap.forEach((appDoc) => {
        const data = appDoc.data();
        const div = document.createElement('div');
        div.className = 'admin-item';
        div.innerHTML = `
            <div class="admin-item-info">
                <img src="${data.icon_url}" width="35" style="border-radius:8px">
                <div>
                    <strong>${data.name}</strong><br>
                    <small style="opacity:0.5">v${data.version}</small>
                </div>
            </div>
            <div class="admin-item-actions">
                <button class="edit-btn" data-id="${appDoc.id}">Edit</button>
                <button class="del-btn" data-id="${appDoc.id}">Delete</button>
            </div>
        `;
        adminAppList.appendChild(div);
    });

    // Обработка удаления
    document.querySelectorAll('.del-btn').forEach(btn => {
        btn.onclick = async () => {
            if(confirm('Удалить это приложение навсегда?')) {
                await deleteDoc(doc(db, "apps", btn.dataset.id));
                loadInventory();
            }
        };
    });

    // Обработка редактирования
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.onclick = () => startEdit(btn.dataset.id, snap);
    });
}

function startEdit(id, snap) {
    const appDoc = snap.docs.find(d => d.id === id);
    const appData = appDoc.data();
    currentEditId = id;
    editMode = true;

    // Заполнение полей формы для редактирования
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

    submitBtn.innerText = "Update Application";
    submitBtn.style.background = "#30d158";
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- ОТПРАВКА ФОРМЫ (CREATE / UPDATE) ---
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
            alert("Данные успешно обновлены!");
        } else {
            appObj.views = 0;
            await addDoc(collection(db, "apps"), appObj);
            alert("Приложение успешно добавлено!");
        }
        resetForm();
        loadInventory();
    } catch (err) { 
        alert("Ошибка Firestore: " + err.message); 
    }
    submitBtn.disabled = false;
});

function resetForm() {
    form.reset();
    editMode = false;
    currentEditId = null;
    submitBtn.innerText = "Publish App";
    submitBtn.style.background = "var(--accent)";
    progressBar.style.width = "0%";
    uploadStatus.textContent = "Select .ipa file to start upload";
    uploadStatus.style.color = "var(--text-secondary)";
}
