/* =====================================
   firebase-messaging-sw.js — SERVICE WORKER
   Necessário para push real via Firebase Cloud
   Messaging. Para ativar: gere a chave VAPID no
   console do Firebase (Cloud Messaging -> Configuração
   da Web) e cole em `auth.js` (firebaseConfig.vapidKey).
   A geração de token e as mensagens já são tratadas
   automaticamente pelo messaging.js.
===================================== */

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: 'AIzaSyCf-HXV7FV0Xom7gbbzgELbuRnd17JOIkM',
    authDomain: 'musical-escritor.firebaseapp.com',
    databaseURL: 'https://musical-escritor-default-rtdb.firebaseio.com',
    projectId: 'musical-escritor',
    storageBucket: 'musical-escritor.firebasestorage.app',
    messagingSenderId: '946659031609',
    appId: '1:946659031609:web:6f71a80bf7a88d7d496be8'
});

const messagingPush = firebase.messaging();

messagingPush.setBackgroundMessageHandler(function (payload) {
    const dados = payload && payload.notification ? payload.notification : {};
    const titulo = dados.title || 'Notificação';
    const corpo = dados.body || '';
    const opcoes = {
        body: corpo,
        icon: 'assets/icon.png'
    };
    return self.registration.showNotification(titulo, opcoes);
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    event.waitUntil(clients.matchAll({ type: 'window' }).then(function (lista) {
        for (var i = 0; i < lista.length; i++) {
            if ('focus' in lista[i]) return lista[i].focus();
        }
        return clients.openWindow('pg8.html');
    }));
});