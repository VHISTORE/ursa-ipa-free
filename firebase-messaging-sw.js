importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyCQxz47mev45XXLz3ejJViVQCzFL_Fo3z8",
    authDomain: "ursaipa.firebaseapp.com",
    projectId: "ursaipa",
    storageBucket: "ursaipa.firebasestorage.app",
    messagingSenderId: "697377996977",
    appId: "1:697377996977:web:f94ca78dfe3d3472942290"
});

const messaging = firebase.messaging();

// Фоновая обработка уведомления
messaging.onBackgroundMessage((payload) => {
    console.log('Received background message ', payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: payload.notification.image || './icons/logoursa.jpeg', // Используем относительный путь для GitHub Pages
        data: {
            url: 'https://vhistore.github.io/ursa-ipa-free/' // Ссылка, которую откроет клик
        }
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Логика клика по уведомлению: открывает сайт или фокусирует вкладку
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const urlToOpen = event.notification.data.url;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // Если сайт уже открыт, просто переключаемся на него
            for (var i = 0; i < windowClients.length; i++) {
                var client = windowClients[i];
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            // Если сайт закрыт — открываем новую вкладку
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
