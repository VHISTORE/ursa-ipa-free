import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Конфигурация проекта ursaipa
const firebaseConfig = {
  apiKey: "AIzaSyCQxz47mev45XXLz3ejJViVQCzFL_Fo3z8",
  authDomain: "ursaipa.firebaseapp.com",
  projectId: "ursaipa",
  storageBucket: "ursaipa.firebasestorage.app",
  messagingSenderId: "697377996977",
  appId: "1:697377996977:web:f94ca78dfe3d3472942290",
  measurementId: "G-RWFQ47DLHS"
};

// Инициализация
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Преобразует Firebase Timestamp в строку даты (ДД.ММ.ГГГГ)
 */
function formatDate(timestamp) {
    if (!timestamp) return "Неизвестно";
    const date = timestamp.toDate();
    return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

/**
 * Отрисовка карточки приложения в общем списке
 */
function renderAppCard(appData) {
    const appList = document.getElementById('app-list');
    if (!appList) return;

    const card = document.createElement('div');
    card.className = 'app-card';
    
    // Вместо features теперь отображаем дату загрузки
    const dateStr = formatDate(appData.upload_date);

    card.innerHTML = `
        <img src="${appData.icon_url}" class="app-icon" onerror="this.src='https://via.placeholder.com/60'">
        <div class="app-info">
            <div class="app-name">${appData.name || 'Unknown'}</div>
            <div class="app-meta">v${appData.version || '0'} • ${appData.size || '?? MB'}</div>
            <div class="app-date">Обновлено: ${dateStr}</div>
        </div>
        <button class="download-btn">GET</button>
    `;

    // При нажатии на любую часть карточки открываем модалку
    card.addEventListener('click', () => openModal(appData));
    
    appList.appendChild(card);
}

/**
 * Открытие модального окна с полной информацией
 */
function openModal(appData) {
    const overlay = document.getElementById('modal-overlay');
    const modalBody = document.getElementById('modal-body');

    modalBody.innerHTML = `
        <div class="modal-header-info">
            <img src="${appData.icon_url}" class="modal-icon-big" onerror="this.src='https://via.placeholder.com/60'">
            <div class="modal-title-wrap">
                <h2>${appData.name}</h2>
                <p>${appData.bundle_id}</p>
            </div>
        </div>
        <div class="modal-stats">
            <div class="stat-item">ВЕРСИЯ<b>${appData.version}</b></div>
            <div class="stat-item">РАЗМЕР<b>${appData.size}</b></div>
            <div class="stat-item">iOS<b>${appData.min_ios}+</b></div>
            <div class="stat-item">ПРОСМОТРЫ<b>${appData.views || 0}</b></div>
            <div class="stat-item" style="grid-column: span 2;">ФИШКИ<b>${appData.features || "Original"}</b></div>
        </div>
        <div class="modal-desc">${appData.description || "Описание функционала скоро появится."}</div>
        <button class="get-btn-big" onclick="window.location.href='${appData.download_url}'">DOWNLOAD IPA</button>
    `;

    overlay.classList.add('active');
}

/**
 * Закрытие модального окна
 */
const closeModal = () => {
    document.getElementById('modal-overlay').classList.remove('active');
};

// Назначаем слушатели для закрытия
document.getElementById('close-modal').addEventListener('click', closeModal);
document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') closeModal();
});

/**
 * Загрузка данных из Firebase
 */
async function loadApps(sectionName) {
    const appList = document.getElementById('app-list');
    if (!appList) return;
    
    appList.innerHTML = '<div style="text-align:center; padding:50px; opacity:0.5; font-size:14px;">Загрузка...</div>';

    try {
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
        if (e.code === 'failed-precondition') {
            appList.innerHTML = '<div style="text-align:center; padding:20px; font-size:12px; color:#fff;">Нужно подтвердить индекс. Ссылка в консоли браузера (F12)</div>';
        } else {
            appList.innerHTML = `<div style="text-align:center; padding:50px; opacity:0.5;">Ошибка: ${e.code}</div>`;
        }
    }
}

/**
 * Навигация
 */
document.querySelectorAll('.nav-item').forEach(button => {
    button.addEventListener('click', () => {
        const contentArea = document.getElementById('content');
        if (contentArea) contentArea.scrollTo({ top: 0, behavior: 'smooth' });

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
 * Старт
 */
window.addEventListener('DOMContentLoaded', () => {
    loadApps('games');
});
