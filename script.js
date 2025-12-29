import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 1. Конфигурация Firebase
const firebaseConfig = {
    apiKey: "ТВОЙ_API_KEY",
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
    const card = document.createElement('div');
    card.className = 'app-card';
    
    // Используем опциональную цепочку и значения по умолчанию
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

// 3. Функция загрузки данных (Исправленный путь под твою структуру)
async function loadApps(sectionName) {
    const appList = document.getElementById('app-list');
    appList.innerHTML = '<div style="text-align:center; padding:50px; opacity:0.5; font-size:14px;">Загрузка...</div>';

    try {
        // Указываем путь к твоей вложенной коллекции "apps/apps/apps"
        // Если переделаешь базу в плоскую структуру, просто замени обратно на "apps"
        const colRef = collection(db, "apps", "apps", "apps");
        
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
        // Если ошибка Permission Denied — проверь правила в консоли
        appList.innerHTML = `<div style="text-align:center; padding:50px; opacity:0.5;">
            Ошибка доступа. Проверьте путь к базе или правила.<br>
            <small style="font-size:10px; color:red;">${e.code}</small>
        </div>`;
    }
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
            document.getElementById('app-list').innerHTML = `
                <div style="text-align:center; padding:50px; opacity:0.5;">
                    Раздел ${target} в разработке
                </div>`;
        }
    });
});

// 5. Инициализация при старте
window.addEventListener('DOMContentLoaded', () => {
    // Небольшая задержка, чтобы Firebase успел проинициализироваться
    setTimeout(() => loadApps('games'), 500);
});
