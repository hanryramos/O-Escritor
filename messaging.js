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
                icon: 'assets/icon.png',
                badge: 'assets/icon.png',
                tag: 'musical-' + String(item.tipo || 'sistema'),
                vibrate: [200, 100, 200]
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

    function ehIos() {
        return /iphone|ipad|ipod/i.test(navigator.userAgent || '');
    }

    function ehStandalone() {
        try {
            return window.navigator.standalone === true ||
                (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
                (window.matchMedia && window.matchMedia('(display-mode: minimal-ui)').matches);
        } catch (e) { return false; }
    }

    function dicaIos() {
        try { if (sessionStorage.getItem('musical_dica_ios')) return; } catch (e) { }
        try { sessionStorage.setItem('musical_dica_ios', '1'); } catch (e) { }
        var b = document.createElement('div');
        b.className = 'push-banner';
        b.innerHTML =
            '<p>No iPhone, as notificações só funcionam com o site <b>na Tela de Início</b>: toque em Compartilhar (seta para cima) e em “Adicionar à Tela de Início”. Depois é só entrar pelo ícone e permitir.</p>' +
            '<button class="perm">Entendi</button>';
        document.body.appendChild(b);
        requestAnimationFrame(function () { b.classList.add('show'); });
        b.querySelector('.perm').addEventListener('click', function () { b.remove(); });
    }

    function bannerBloqueado() {
        try { if (sessionStorage.getItem('musical_banner_bloqueado')) return; } catch (e) { }
        try { sessionStorage.setItem('musical_banner_bloqueado', '1'); } catch (e) { }
        var b = document.createElement('div');
        b.className = 'push-banner';
        b.innerHTML =
            '<p>As notificações estão <b>bloqueadas</b> neste navegador. No Chrome (celular): toque no <b>cadeado ou globo</b> ao lado do endereço → <b>Permissões</b> → <b>Notificações</b> → <b>Permitir</b>. Depois volte aqui.</p>' +
            '<button class="perm">Já permiti, voltar</button>';
        document.body.appendChild(b);
        requestAnimationFrame(function () { b.classList.add('show'); });
        b.querySelector('.perm').addEventListener('click', function () {
            b.remove();
            location.reload();
        });
    }

    function banner() {
        var suporta = 'Notification' in window;

        /* iPhone no Safari comum (não instalado na tela inicial): sem
           como pedir permissão — avisa o que fazer. */
        if (ehIos() && !ehStandalone() && !suporta) {
            dicaIos();
            return;
        }
        if (!suporta) return;
        if (window.Notification.permission === 'denied') {
            bannerBloqueado();
            return;
        }
        if (window.Notification.permission !== 'default') return;
        /* Mostra sempre que ainda não houve resposta do usuário. */

        var b = document.createElement('div');
        b.className = 'push-banner';
        var dicaMobile = '';
        if (!ehIos() && !ehStandalone() && /android/i.test(navigator.userAgent || '')) {
            dicaMobile = '<br><b>Dica (celular):</b> o Chrome só confirma as notificações pra sempre se o site estiver instalado — toque no <b>⋮</b> do Chrome → <b>Adicionar à tela inicial</b>/<b>Instalar aplicativo</b>.';
        }
        b.innerHTML =
            '<p>Avisamos por aqui quando entra aviso novo, sem precisar ficar olhando toda hora.' + dicaMobile + '</p>' +
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
                            icon: 'assets/icon.png',
                            badge: 'assets/icon.png',
                            tag: 'musical-ativo',
                            vibrate: [200, 100, 200]
                        });
                    } catch (e) { }
                    configurarPush();
                }
                b.remove();
            }).catch(function () { b.remove(); });
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
        return new Promise(function (resolve) {
            var auth = firebase.auth && firebase.auth().currentUser;
            var uid = auth && auth.uid;
            if (!token) return resolve(false);
            if (!uid) {
                console.error('[push] Sem usuário logado para salvar o token.');
                return resolve(false);
            }
            firebase.database().ref('musical/tokens/' + uid).set({ token: token, formato: 'fcm' })
                .then(function () { resolve(true); })
                .catch(function (err) {
                    console.error('[push] Falha ao salvar o token no banco.', err);
                    resolve(false);
                });
        });
    }

    function configurarPush(forcar) {
        var vapid = chaveVapid();
        var m = getMessaging();
        if (!vapid || !m) return Promise.reject(new Error('Push indisponível neste navegador.'));

        if (m.onTokenRefresh) {
            m.onTokenRefresh(function () {
                m.getToken({ vapidKey: vapid }).then(salvarToken).catch(function () { });
            });
        }

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

        var okPer = true;
        if ('Notification' in window && window.Notification.permission !== 'granted') {
            if (forcar) {
                okPer = false;
                return Promise.reject(new Error('Notificações ainda não autorizadas neste site.'));
            }
            return Promise.resolve(null);
        }

        return m.getToken({ vapidKey: vapid }).then(function (tok) {
            if (!tok) {
                throw new Error('O navegador concedeu permissão, mas ainda não gerou o token. Recarregue a página (Ctrl+F5) e tente de novo.');
            }
            return salvarToken(tok).then(function (gravou) {
                if (!gravou) throw new Error('O token foi gerado, mas não consegui gravar no banco compartilhado.');
                return tok;
            });
        }).catch(function (err) {
            console.warn('[push] Sem token FCM.', err);
            throw err;
        });
    }

    /* Pede a permissão (se preciso) e garante o token salvo. Usado pelo
       botão "testar push" e quando o usuário autoriza. */
    function permitir() {
        if (!('Notification' in window)) {
            if (ehIos() && !ehStandalone()) {
                return Promise.reject(new Error('No iPhone: toque em Compartilhar → “Adicionar à Tela de Início” e entre pelo ícone para ativar as notificações.'));
            }
            return Promise.reject(new Error('Este navegador não suporta notificações.'));
        }
        var per = window.Notification.permission;
        if (per === 'granted') return configurarPush(true);
        if (per === 'denied') {
            return Promise.reject(new Error('Notificações bloqueadas para este site. Libere: configurações do navegador → notificações → permitir para este site.'));
        }
        return window.Notification.requestPermission().then(function (nova) {
            if (nova !== 'granted') {
                throw new Error('Você negou a permissão de notificações.');
            }
            try {
                new Notification('Notificações ativas', {
                    body: 'Passaremos a avisar por aqui.',
                    icon: 'assets/icon.png',
                    badge: 'assets/icon.png',
                    tag: 'musical-ativo',
                    vibrate: [200, 100, 200]
                });
            } catch (e) { }
            return configurarPush(true);
        });
    }

    /* Mostra uma notificação direto do navegador (sem service worker).
       Serve pra saber se o bloqueio está no sistema/notificações. */
    function testeLocal(titulo, corpo) {
        return new Promise(function (resolve, reject) {
            if (!('Notification' in window)) return reject(new Error('Sem suporte a notificações.'));
            if (window.Notification.permission !== 'granted') return reject(new Error('Sem permissão.'));
            try {
                new Notification(String(titulo || 'Notificação'), {
                    body: String(corpo || ''),
                    icon: 'assets/icon.png',
                    badge: 'assets/icon.png',
                    tag: 'musical-teste',
                    vibrate: [200, 100, 200]
                });
                resolve(true);
            } catch (e) {
                reject(e);
            }
        });
    }

    /* Estado do service worker de push (pro diagnóstico). */
    function estadoSW() {
        return new Promise(function (resolve) {
            if (!('serviceWorker' in navigator)) return resolve('sem service worker');
            navigator.serviceWorker.getRegistrations().then(function (lista) {
                if (!lista || !lista.length) return resolve('nenhum SW registrado');
                var partes = lista.map(function (r) {
                    return (r.scope.replace(location.origin, '') || '/') + ' -> ' + (r.active ? 'ativo' : r.waiting ? 'instalando' : r.installing ? 'instalando' : 'inativo');
                });
                resolve(partes.join(' | '));
            }).catch(function (e) { resolve('erro: ' + e.message); });
        });
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

    return { processar: processar, permitir: permitir, testeLocal: testeLocal, estadoSW: estadoSW };
})();