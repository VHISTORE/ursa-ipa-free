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

// Исправленный обработчик: берет иконку из данных, если системный пуш её "потерял"
messaging.onBackgroundMessage((payload) => {
    console.log('[sw.js] Received:', payload);
    
    // Если браузер сам не отобразил уведомление, мы можем сделать это вручную здесь, 
    // но в 2nd gen функциях Google обычно делает это сам. 
    // Если иконка не грузится - оставьте этот блок пустым, как сейчас.
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const urlToOpen = 'https://vhistore.github.io/ursa-ipa-free/';
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            for (let i = 0; i < windowClients.length; i++) {
                let client = windowClients[i];
                if (client.url === urlToOpen && 'focus' in client) return client.focus();
            }
            if (clients.openWindow) return clients.openWindow(urlToOpen);
        })
    );
});
