import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 1. Твои настройки Firebase (возьми их в консоли Firebase)
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

// 2. Функция для создания HTML-карточки приложения
function renderAppCard(appData) {
    const appList = document.getElementById('app-list');
    const card = document.createElement('div');
    card.className = 'app-card';
    
    card.innerHTML = `
        <img src="${appData.icon_url}" class="app-icon" onerror="this.src='https://via.placeholder.com/60'">
        <div class="app-info">
            <div class="app-name">${appData.name}</div>
            <div class="app-meta">v${appData.version} • ${appData.size}</div>
            <div class="app-features">${appData.features || ''}</div>
        </div>
        <button class="download-btn" onclick="window.location.href='${appData.download_url}'">GET</button>
    `;
    appList.appendChild(card);
}

// 3. Функция загрузки данных из Firebase
async function loadApps(sectionName) {
    const appList = document.getElementById('app-list');
    
    // Показываем лоадер
    appList.innerHTML = '<div style="text-align:center; padding:50px; opacity:0.5; font-size:14px;">Загрузка...</div>';

    try {
        // Запрос к коллекции 'apps' с фильтром по 'section' и сортировкой по дате
        const q = query(
            collection(db, "apps"), 
            where("section", "==", sectionName),
            orderBy("upload_date", "desc")
        );
        
        const querySnapshot = await getDocs(q);
        appList.innerHTML = ''; // Очищаем лоадер

        if (querySnapshot.empty) {
            appList.innerHTML = '<div style="text-align:center; padding:50px; opacity:0.5;">Ничего не найдено</div>';
            return;
        }

        querySnapshot.forEach((doc) => {
            renderAppCard(doc.data());
        });
    } catch (e) {
        console.error("Ошибка загрузки данных:", e);
        appList.innerHTML = '<div style="text-align:center; padding:50px; color:rgba(255,255,255,0.5);">Ошибка подключения к базе</div>';
    }
}

// 4. Твоя навигация с добавленной логикой
document.querySelectorAll('.nav-item').forEach(button => {
    button.addEventListener('click', () => {
        // Сброс активного класса у всех кнопок
        document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
        // Установка активного класса на нажатую кнопку
        button.classList.add('active');
        
        const target = button.getAttribute('data-target');
        console.log(`Раздел: ${target}`);
        
        // Смена контента в зависимости от цели
        if (target === 'games' || target === 'apps') {
            loadApps(target);
        } else if (target === 'search') {
            document.getElementById('app-list').innerHTML = '<div style="text-align:center; padding:50px; opacity:0.5;">Раздел поиска в разработке</div>';
        } else if (target === 'more') {
            document.getElementById('app-list').innerHTML = '<div style="text-align:center; padding:50px; opacity:0.5;">Настройки и информация</div>';
        }
    });
});

// 5. Загружаем 'games' по умолчанию при старте сайта
window.addEventListener('DOMContentLoaded', () => {
    loadApps('games');
});
