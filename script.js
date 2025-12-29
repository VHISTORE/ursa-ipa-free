import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ТВОЙ КОНФИГ ИЗ FIREBASE CONSOLE
const firebaseConfig = {
  apiKey: "AIzaSyCQxz47mev45XXLz3ejJViVQCzFL_Fo3z8",
  authDomain: "ursaipa.firebaseapp.com",
  projectId: "ursaipa",
  storageBucket: "ursaipa.firebasestorage.app",
  messagingSenderId: "697377996977",
  appId: "1:697377996977:web:f94ca78dfe3d3472942290",
  measurementId: "G-RWFQ47DLHS"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Функция отрисовки карточки
function renderAppCard(appData) {
    const appList = document.getElementById('app-list');
    const card = document.createElement('div');
    card.className = 'app-card';
    card.innerHTML = `
        <img src="${appData.icon_url}" class="app-icon">
        <div class="app-info">
            <div class="app-name">${appData.name}</div>
            <div class="app-meta">v${appData.version} • ${appData.size}</div>
            <div class="app-features">${appData.features}</div>
        </div>
        <button class="download-btn" onclick="window.location.href='${appData.download_url}'">GET</button>
    `;
    appList.appendChild(card);
}

// Загрузка данных
async function loadApps(sectionName) {
    const appList = document.getElementById('app-list');
    appList.innerHTML = ''; // Очистка перед загрузкой

    try {
        const q = query(
            collection(db, "apps"), 
            where("section", "==", sectionName),
            orderBy("upload_date", "desc")
        );
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
            renderAppCard(doc.data());
        });
    } catch (e) {
        console.error("Ошибка загрузки: ", e);
    }
}

// Навигация
document.querySelectorAll('.nav-item').forEach(button => {
    button.addEventListener('click', () => {
        document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        const target = button.getAttribute('data-target');
        if (target === 'games' || target === 'apps') {
            loadApps(target);
        }
    });
});

// Стартовая загрузка
loadApps('games');
