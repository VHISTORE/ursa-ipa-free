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

const ADMIN_EMAIL = "vibemusic1712@gmail.com";
let editMode = false;
let currentEditId = null;

const authContainer = document.getElementById('auth-container');
const adminMain = document.getElementById('admin-main');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const adminEmailSpan = document.getElementById('admin-email');
const form = document.getElementById('add-app-form');
const adminAppList = document.getElementById('admin-app-list');
const submitBtn = document.getElementById('submit-btn');

onAuthStateChanged(auth, (user) => {
    if (user && user.email === ADMIN_EMAIL) {
        authContainer.style.display = 'none';
        adminMain.style.display = 'block';
        adminEmailSpan.textContent = `Admin: ${user.email}`;
        loadInventory();
    } else {
        if (user) { alert("Access Denied"); signOut(auth); }
        authContainer.style.display = 'block';
        adminMain.style.display = 'none';
    }
});

loginBtn.onclick = () => signInWithPopup(auth, provider);
logoutBtn.onclick = () => signOut(auth);

async function loadInventory() {
    adminAppList.innerHTML = '<p style="text-align:center; opacity:0.5;">Loading...</p>';
    const q = query(collection(db, "apps"), orderBy("upload_date", "desc"));
    const snap = await getDocs(q);
    adminAppList.innerHTML = '';

    snap.forEach((appDoc) => {
        const data = appDoc.data();
        const div = document.createElement('div');
        div.className = 'admin-item';
        div.innerHTML = `
            <div class="admin-item-info">
                <img src="${data.icon_url}" width="35">
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

    document.querySelectorAll('.del-btn').forEach(btn => {
        btn.onclick = async () => {
            if(confirm('Delete app?')) {
                await deleteDoc(doc(db, "apps", btn.dataset.id));
                loadInventory();
            }
        };
    });

    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.onclick = () => startEdit(btn.dataset.id, snap);
    });
}

function startEdit(id, snap) {
    const appData = snap.docs.find(d => d.id === id).data();
    currentEditId = id;
    editMode = true;

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
            alert("App updated!");
        } else {
            appObj.views = 0;
            await addDoc(collection(db, "apps"), appObj);
            alert("App added!");
        }
        resetForm();
        loadInventory();
    } catch (err) { alert(err.message); }
    submitBtn.disabled = false;
});

function resetForm() {
    form.reset();
    editMode = false;
    currentEditId = null;
    submitBtn.innerText = "Publish App";
    submitBtn.style.background = "var(--accent)";
}
