import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 1. Конфигурация Firebase (ЗАМЕНИ НА СВОИ ДАННЫЕ)
const firebaseConfig = {
    apiKey: "AIzaSy...", 
    authDomain: "ursa-ipa.firebaseapp.com",
    projectId: "ursa-ipa",
    storageBucket: "ursa-ipa.appspot.com",
    messagingSenderId: "ID",
    appId: "APP_ID"
};

// Инициализация
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 2. Функция для отрисовки карточки
function renderAppCard(appData) {
    const appList = document.getElementById('app-list');
    if (!appList) return;

    const card = document.createElement('div');
    card.className = 'app-card';
    
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

// 3. Функция загрузки данных
async function loadApps(sectionName) {
    const appList = document.getElementById('app-list');
    if (!appList) return;
    
    appList.innerHTML = '<div style="text-align:center; padding:50px; opacity:0.5; font-size:14px;">Загрузка...</div>';

    // Пробуем два пути: вложенный (как на твоих скринах) и обычный
    const paths = [
        ["apps", "apps", "apps"], // Путь 'матрешка'
        ["apps"]                  // Обычный путь
    ];

    for (const path of paths) {
        try {
            const colRef = collection(db, ...path);
            const q = query(
                colRef, 
                where("section", "==", sectionName),
                orderBy("upload_date", "desc")
            );
            
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                appList.innerHTML = ''; 
                querySnapshot.forEach((doc) => renderAppCard(doc.data()));
                return; // Если данные найдены, выходим из цикла
            }
        } catch (e) {
            console.warn(`Путь ${path.join('/')} не сработал:`, e.message);
            // Если это ошибка индекса, она будет в консоли со ссылкой
            if (e.code === 'failed-precondition') {
                appList.innerHTML = '<div style="text-align:center; padding:20px; font-size:12px; opacity:0.7;">Нужно создать индекс в консоли Firebase (см. Console F12)</div>';
                return;
            }
        }
    }

    // Если прошли все пути и ничего не нашли
    appList.innerHTML = '<div style="text-align:center; padding:50px; opacity:0.5;">Ничего не найдено</div>';
}

// 4. Навигация
document.querySelectorAll('.nav-item').forEach(button => {
    button.addEventListener('click', () => {
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

// 5. Инициализация при старте
window.addEventListener('DOMContentLoaded', () => {
    // Ждем полсекунды для уверенности
    setTimeout(() => loadApps('games'), 500);
});
