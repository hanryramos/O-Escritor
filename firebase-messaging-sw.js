/* =====================================
   firebase-messaging-sw.js — SERVICE WORKER
   Service worker enxuto (Web Push nativo, sem SDK).
   O push do FCM chega aqui e mostramos a notificação
   mesmo com o app/aba fechados. Clicar abre a pg8.
   ===================================== */

self.addEventListener('install', function () {
    self.skipWaiting();
});

self.addEventListener('activate', function (event) {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function (event) {
    var titulo = 'Nova notificação';
    var corpo = '';
    var icon = 'assets/icon.png';
    var link = 'pg8.html';
    var tipo = 'sistema';
    try {
        var dados = (event.data && event.data.json()) || {};
        var n = dados.notification || dados.data || {};
        titulo = dados.titulo || n.title || titulo;
        corpo = dados.desc || dados.body || n.body || corpo;
        if (dados.icon) icon = dados.icon;
        if (dados.link) link = dados.link;
        if (dados.tipo) tipo = dados.tipo;
    } catch (e) { }
    event.waitUntil(self.registration.showNotification(titulo, {
        body: corpo,
        icon: icon,
        badge: 'assets/icon.png',
        tag: 'musical-' + tipo,
        vibrate: [200, 100, 200],
        data: { url: link, tipo: tipo },
        actions: [
            { action: 'abrir', title: 'Ver agora' }
        ]
    }));
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    var destino = (event.notification.data && event.notification.data.url) || 'pg8.html';
    if (event.action && event.action !== 'abrir') return;
    event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (lista) {
        for (var i = 0; i < lista.length; i++) {
            if (lista[i].url.indexOf('musical-escritor') > -1 && 'focus' in lista[i]) return lista[i].focus();
        }
        return clients.openWindow(destino);
    }));
});