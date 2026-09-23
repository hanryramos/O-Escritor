/* =====================================
   messaging.js — NOTIFICAÇÕES
   • Popup no canto da tela (celular/PC) sempre que
     chega uma notificação nova nas coleções.
   • Se o navegador permitir, também dispara uma
     notificação do sistema.
   • Banner único pedindo permissão.
===================================== */

window.Messaging = (function () {

    var VISTAS_KEY = 'musical_notif_vistas';
    var PERG_KEY = 'musical_push_perguntado';

    var ICONES = {
        evento: 'bxs-calendar-event', musica: 'bx-music', tarefa: 'bx-check-square',
        equipe: 'bx-group', mencao: 'bx-at', arquivo: 'bx-folder', sistema: 'bx-info-circle'
    };

    var papeis = {};

    function lidas() {
        try { return JSON.parse(localStorage.getItem(VISTAS_KEY) || '[]'); }
        catch (e) { return []; }
    }

    function marcarLida(id) {
        var lista = lidas();
        if (lista.indexOf(id) > -1) return;
        lista.push(id);
        if (lista.length > 300) lista = lista.slice(-300);
        try { localStorage.setItem(VISTAS_KEY, JSON.stringify(lista)); } catch (e) { }
    }

    function hoje() {
        var d = new Date();
        return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
    }

    function popup(item) {
        var wrap = document.querySelector('.inapp-wrap');
        if (!wrap) {
            wrap = document.createElement('div');
            wrap.className = 'inapp-wrap';
            document.body.appendChild(wrap);
        }

        var el = document.createElement('div');
        el.className = 'inapp-popup';

        var ic = ICONES[item.tipo] || 'bx-info-circle';
        var texto = String(item.mensagem || '');
        var titulo = String(item.titulo || 'Notificação');

        el.innerHTML =
            '<i class="inapp-ic bx ' + ic + '"></i>' +
            '<div>' +
            '  <strong>' + titulo + '</strong>' +
            '  <span>' + texto + '</span>' +
            '</div>' +
            '<button class="inapp-close" title="Fechar">&times;</button>';

        el.querySelector('.inapp-close').addEventListener('click', function (e) {
            e.stopPropagation();
            fechar(el);
        });

        el.addEventListener('click', function () {
            window.location.href = 'pg8.html';
        });

        wrap.appendChild(el);
        requestAnimationFrame(function () { el.classList.add('show'); });

        setTimeout(function () { fechar(el, true); }, 8000);
    }

    function fechar(el, suave) {
        if (suave) {
            el.classList.remove('show');
            setTimeout(function () { el.remove(); }, 250);
        } else {
            el.remove();
        }
    }

    function sistema(item, permissao) {
        if (!('Notification' in window)) return;
        if (permissao !== 'granted') return;
        try {
            new Notification(String(item.titulo || 'Notificação'), {
                body: String(item.mensagem || ''),
                icon: 'assets/icon.png'
            });
        } catch (e) { }
    }

    function processar(lista) {
        var vistas = lidas();
        var papel;

        if (window.Notification && window.Notification.permission === 'granted') {
            papel = 'granted';
        }

        (lista || []).forEach(function (item) {
            if (!item || !item._id) return;
            if (vistas.indexOf(item._id) > -1) return;
            marcarLida(item._id);
            popup(item);
            sistema(item, papel);
        });
    }

    /* ---------- banner de permissão ---------- */

    function banner() {
        if (!('Notification' in window)) return;
        if (window.Notification.permission !== 'default') return;
        try { if (localStorage.getItem(PERG_KEY)) return; } catch (e) { }

        var b = document.createElement('div');
        b.className = 'push-banner';
        b.innerHTML =
            '<p>Avisamos por aqui quando entra aviso novo, sem precisar ficar olhando toda hora.</p>' +
            '<button class="perm">Permitir</button>' +
            '<button class="ghost">Agora não</button>';

        document.body.appendChild(b);
        requestAnimationFrame(function () { b.classList.add('show'); });

        b.querySelector('.perm').addEventListener('click', function () {
            marcarPerguntado();
            window.Notification.requestPermission().then(function (per) {
                if (per === 'granted') {
                    try {
                        new Notification('Notificações ativas', {
                            body: 'Passaremos a avisar por aqui.',
                            icon: 'assets/icon.png'
                        });
                    } catch (e) { }
                    configurarPush();
                }
                b.remove();
            });
        });

        b.querySelector('.ghost').addEventListener('click', function () {
            marcarPerguntado();
            b.remove();
        });
    }

    function marcarPerguntado() {
        try { localStorage.setItem(PERG_KEY, '1'); } catch (e) { }
    }

    /* ---------- registro do service worker (FCM) ---------- */

    function registrarSW() {
        if (!('serviceWorker' in navigator)) return;
        if (location.protocol === 'file:') return;
        navigator.serviceWorker.register('firebase-messaging-sw.js').catch(function () { });
    }

    /* ---------- push real (Firebase Cloud Messaging) ---------- */

    function chaveVapid() {
        return (window.firebaseConfig && window.firebaseConfig.vapidKey) || '';
    }

    function getMessaging() {
        if (typeof firebase === 'undefined' || !firebase.messaging) return null;
        try { return firebase.messaging(); } catch (e) { return null; }
    }

    function salvarToken(token) {
        var auth = firebase.auth && firebase.auth().currentUser;
        var uid = auth && auth.uid;
        if (!token || !uid) return;
        try {
            firebase.database().ref('musical/tokens/' + uid).set({ token: token, formato: 'fcm' });
        } catch (e) { }
    }

    function configurarPush() {
        var vapid = chaveVapid();
        var m = getMessaging();
        if (!vapid || !m) return;

        if ('Notification' in window && window.Notification.permission !== 'granted') return;

        function pedirToken() {
            m.getToken({ vapidKey: vapid }).then(salvarToken)
                .catch(function (err) {
                    console.warn('[push] Sem token FCM (é preciso HTTPS ou localhost).', err);
                });
        }

        pedirToken();
        if (m.onTokenRefresh) m.onTokenRefresh(pedirToken);

        if (m.onMessage) {
            m.onMessage(function (payload) {
                var notif = payload.notification || {};
                var item = {
                    _id: 'push_' + Date.now(),
                    titulo: notif.title || 'Notificação',
                    mensagem: notif.body || '',
                    tipo: payload.data && payload.data.tipo ? payload.data.tipo : 'sistema',
                    data: hoje()
                };
                popup(item);
                sistema(item, 'granted');
            });
        }
    }

    function iniciar() {
        if (!window.AppDB) return;
        window.AppDB.onChange('notificacoes', processar);
        window.AppDB.load('notificacoes').then(function (lista) { processar(lista); });

        banner();
        registrarSW();
        configurarPush();
    }

    if (window.AppAuth && window.AppAuth.ready) {
        window.AppAuth.ready.then(iniciar);
    } else if (document.readyState === 'complete') {
        iniciar();
    } else {
        window.addEventListener('load', iniciar);
    }

    return { processar: processar };
})();