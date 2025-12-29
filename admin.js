import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
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

const ADMIN_EMAIL = "vibemusic1712@gmail.com";

// Элементы
const authContainer = document.getElementById('auth-container');
const adminMain = document.getElementById('admin-main');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const adminEmailSpan = document.getElementById('admin-email');
const form = document.getElementById('add-app-form');
const adminAppList = document.getElementById('admin-app-list');

// 1. Проверка авторизации
onAuthStateChanged(auth, (user) => {
    if (user && user.email === ADMIN_EMAIL) {
        authContainer.style.display = 'none';
        adminMain.style.display = 'block';
        adminEmailSpan.textContent = `Admin: ${user.email}`;
        loadInventory();
    } else {
        if (user) {
            alert("Access Denied: You are not authorized.");
            signOut(auth);
        }
        authContainer.style.display = 'block';
        adminMain.style.display = 'none';
    }
});

// 2. Вход/Выход
loginBtn.onclick = () => signInWithPopup(auth, provider);
logoutBtn.onclick = () => signOut(auth);

// 3. Загрузка списка для удаления
async function loadInventory() {
    adminAppList.innerHTML = '<p style="text-align:center; opacity:0.5;">Loading inventory...</p>';
    try {
        const q = query(collection(db, "apps"), orderBy("upload_date", "desc"));
        const snap = await getDocs(q);
        adminAppList.innerHTML = '';

        snap.forEach((appDoc) => {
            const data = appDoc.data();
            const div = document.createElement('div');
            div.className = 'admin-item';
            div.innerHTML = `
                <div class="admin-item-info">
                    <img src="${data.icon_url}" width="30">
                    <span>${data.name} (v${data.version})</span>
                </div>
                <button class="del-btn" data-id="${appDoc.id}">Delete</button>
            `;
            adminAppList.appendChild(div);
        });

        // Слушатели для кнопок удаления
        document.querySelectorAll('.del-btn').forEach(btn => {
            btn.onclick = async () => {
                if(confirm(`Delete ${btn.previousElementSibling.textContent}?`)) {
                    await deleteDoc(doc(db, "apps", btn.dataset.id));
                    loadInventory(); // Обновляем список
                }
            };
        });
    } catch (e) {
        console.error(e);
    }
}

// 4. Добавление нового приложения
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('submit-btn');
    submitBtn.disabled = true;
    submitBtn.innerText = "Processing...";

    const newApp = {
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
        views: 0,
        upload_date: serverTimestamp()
    };

    try {
        await addDoc(collection(db, "apps"), newApp);
        alert("App published!");
        form.reset();
        loadInventory();
    } catch (error) {
        alert("Error: " + error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = "Publish App";
    }
});
