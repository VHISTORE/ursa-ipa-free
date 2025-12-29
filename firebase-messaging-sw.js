importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Инициализация Firebase в Service Worker
firebase.initializeApp({
    apiKey: "AIzaSyCQxz47mev45XXLz3ejJViVQCzFL_Fo3z8",
    authDomain: "ursaipa.firebaseapp.com",
    projectId: "ursaipa",
    storageBucket: "ursaipa.firebasestorage.app",
    messagingSenderId: "697377996977",
    appId: "1:697377996977:web:f94ca78dfe3d3472942290"
});

const messaging = firebase.messaging();

/**
 * Фоновая обработка сообщений.
 * Мы оставляем этот блок пустым или только для логирования,
 * чтобы избежать дублирования уведомлений. 
 * Браузер сам отобразит уведомление из поля 'notification', присланного сервером.
 */
messaging.onBackgroundMessage((payload) => {
    console.log('[sw.js] Received background message:', payload);
});

/**
 * Логика клика по уведомлению: 
 * Открывает сайт или фокусирует вкладку, если она уже открыта.
 */
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    // Ссылка на ваш проект
    const urlToOpen = 'https://vhistore.github.io/ursa-ipa-free/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // Если вкладка с сайтом уже открыта — переключаем на нее фокус
            for (let i = 0; i < windowClients.length; i++) {
                let client = windowClients[i];
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            // Если сайт не открыт — открываем новую вкладку
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
