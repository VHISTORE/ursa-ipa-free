import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Твой точный конфиг проекта ursaipa
const firebaseConfig = {
  apiKey: "AIzaSyCQxz47mev45XXLz3ejJViVQCzFL_Fo3z8",
  authDomain: "ursaipa.firebaseapp.com",
  projectId: "ursaipa",
  storageBucket: "ursaipa.firebasestorage.app",
  messagingSenderId: "697377996977",
  appId: "1:697377996977:web:f94ca78dfe3d3472942290",
  measurementId: "G-RWFQ47DLHS"
};

// Инициализация Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Отрисовка карточки приложения
 */
function renderAppCard(appData) {
    const appList = document.getElementById('app-list');
    if (!appList) return;

    const card = document.createElement('div');
    card.className = 'app-card';
    
    // Безопасное извлечение данных
    const name = appData.name || 'Unknown App';
    const version = appData.version || '0.0';
    const size = appData.size || '?? MB';
    const features = appData.features || '';
    const icon = appData.icon_url || 'https://via.placeholder.com/60';
    const dl = appData.download_url || '#';

    card.innerHTML = `
        <img src="${icon}" class="app-icon" onerror="this.src='https://via.placeholder.com/60'">
        <div class="app-info">
            <div class="app-name">${name}</div>
            <div class="app-meta">v${version} • ${size}</div>
            <div class="app-features">${features}</div>
        </div>
        <button class="download-btn" onclick="window.location.href='${dl}'">GET</button>
    `;
    appList.appendChild(card);
}

/**
 * Загрузка данных из корневой коллекции "apps"
 */
async function loadApps(sectionName) {
    const appList = document.getElementById('app-list');
    if (!appList) return;
    
    appList.innerHTML = '<div style="text-align:center; padding:50px; opacity:0.5; font-size:14px;">Загрузка...</div>';

    try {
        // Теперь используем прямой путь к коллекции, которую ты создал последней
        const colRef = collection(db, "apps");
        
        const q = query(
            colRef, 
            where("section", "==", sectionName),
            orderBy("upload_date", "desc")
        );
        
        const querySnapshot = await getDocs(q);
        appList.innerHTML = ''; 

        if (querySnapshot.empty) {
            appList.innerHTML = '<div style="text-align:center; padding:50px; opacity:0.5;">Ничего не найдено</div>';
            return;
        }

        querySnapshot.forEach((doc) => {
            renderAppCard(doc.data());
        });
    } catch (e) {
        console.error("Firebase Error:", e);
        
        // Обработка ошибок доступа или отсутствия индекса
        if (e.code === 'failed-precondition') {
            appList.innerHTML = '<div style="text-align:center; padding:20px; font-size:12px; color:#fff;">Нужно подтвердить индекс. Ссылка в консоли браузера (F12)</div>';
        } else {
            appList.innerHTML = `<div style="text-align:center; padding:50px; opacity:0.5;">Ошибка: ${e.code}</div>`;
        }
    }
}

/**
 * Логика переключения вкладок навигации
 */
document.querySelectorAll('.nav-item').forEach(button => {
    button.addEventListener('click', () => {
        // Скроллим контент вверх при переключении
        const contentArea = document.getElementById('content');
        if (contentArea) contentArea.scrollTo({ top: 0, behavior: 'smooth' });

        // Обновляем визуальное состояние кнопок
        document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        const target = button.getAttribute('data-target');
        
        if (target === 'games' || target === 'apps') {
            loadApps(target);
        } else {
            const appList = document.getElementById('app-list');
            if (appList) {
                appList.innerHTML = `
                    <div style="text-align:center; padding:50px; opacity:0.5;">
                        Раздел ${target.toUpperCase()} в разработке
                    </div>`;
            }
        }
    });
});

/**
 * Стартовая инициализация
 */
window.addEventListener('DOMContentLoaded', () => {
    // Загружаем игры сразу после загрузки страницы
    loadApps('games');
});
