/* =====================================
   FIREBASE — CONFIGURAÇÃO
===================================== */

const firebaseConfig = {
    apiKey: "AIzaSyCf-HXV7FV0Xom7gbbzgELbuRnd17JOIkM",
    authDomain: "musical-escritor.firebaseapp.com",
    databaseURL: "https://musical-escritor-default-rtdb.firebaseio.com",
    projectId: "musical-escritor",
    storageBucket: "musical-escritor.firebasestorage.app",
    messagingSenderId: "946659031609",
    appId: "1:946659031609:web:6f71a80bf7a88d7d496be8",
    vapidKey: "BJXAQNpvBWs-8-ApAbj3mMwbDpP5457XxusHPZciXrDR1y_2nF20LYMEPRtThM0xzund7gSnhKSXKlpW7vKt3ZU"
};

/* Chave VAPID (notificações push no celular com o app fechado):
   1) Firebase Console -> Cloud Messaging -> aba "Configuração da Web";
   2) "Chave de aplicativo" -> "Gerar chave";
   3) cole o valor na linha vapidKey acima (entre as aspas). */
window.firebaseConfig = firebaseConfig;

/* =====================================
   PAPEL DE ADMINISTRADOR
   Lista inicial (fallback) + lista dinâmica
   carregada do Firebase em 'admins'.
   Para adicionar um admin sem mexer no
   código, basta inserir o e-mail na
   coleção 'admins' no Realtime Database.
===================================== */

const ADMIN_EMAILS = [
'admoescritor@musical.com'
];

window.AdminSet = {};

function emailEhAdmin(email) {
    const e = String((email && email.trim) ? email.trim() : (email || '')).toLowerCase();
    return ADMIN_EMAILS.indexOf(e) > -1 || !!window.AdminSet[e];
}

function definirAdmins(lista) {
    window.AdminSet = {};
    (lista || []).forEach(function (e) {
        const s = String(e == null ? '' : e).toLowerCase().trim();
        if (s) window.AdminSet[s] = true;
    });
}

function adminsPraLista(obj) {
    if (Array.isArray(obj)) return obj.slice();
    if (!obj) return [];
    return Object.keys(obj).map(function (k) {
        const v = obj[k];
        if (v && typeof v === 'object') return v.email || v._id || k;
        return String(v);
    });
}

function carregarAdmins() {
    if (!(typeof firebase !== 'undefined' && firebase && firebase.database)) return Promise.resolve();
    return firebase.database().ref('musical/admins').once('value').then(function (snap) {
        if (snap.exists()) {
            definirAdmins(adminsPraLista(snap.val()));
            return;
        }
        // Se ainda não existe, o admin "de código" sementeia a lista no banco.
        const u = window.AppAuth && window.AppAuth.user;
        const ue = (u && u.email) ? String(u.email).toLowerCase().trim() : '';
        if (ue && ADMIN_EMAILS.indexOf(ue) > -1) {
            const seed = {};
            ADMIN_EMAILS.forEach(function (e, i) { seed['k' + i] = e; });
            firebase.database().ref('musical/admins').set(seed).catch(function (err) {
                console.error('[auth] Falha ao gravar admins iniciais.', err);
            });
        }
    }).catch(function (err) {
        console.error('[auth] Falha ao carregar admins do Firebase.', err);
    });
}

function chavePerfilUsuario(email) {
    const e = String(email || '').toLowerCase();
    if (!e) return 'perfil';
    return 'perfil_' + e.replace(/[^a-z0-9]+/g, '_');
}

/* =====================================
   ESTADO GLOBAL DE AUTENTICAÇÃO
   window.AppAuth.ready -> Promise
===================================== */

window.AppAuth = {
    user: null,
    isAdmin: false,
    ready: null
};

/* =====================================
   MENSAGENS DE ERRO
===================================== */

function loginErrorMessage(code) {
    switch (code) {
        case 'auth/invalid-email':
            return 'Digite um e-mail válido.';
        case 'auth/user-disabled':
            return 'Esta conta foi desativada.';
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
            return 'E-mail ou senha incorretos.';
        case 'auth/too-many-requests':
            return 'Muitas tentativas. Aguarde e tente novamente.';
        case 'auth/network-request-failed':
            return 'Sem conexão com a internet. Verifique sua rede.';
        default:
            return 'Não foi possível entrar. Tente novamente.';
    }
}

function formatName(name) {
    const trimmed = (name || '').trim();
    if (!trimmed) return 'Integrante';
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/* =====================================
   NÚCLEO DE AUTENTICAÇÃO
===================================== */

(function () {
    const hasFirebase = (typeof firebase !== 'undefined' && firebase && firebase.auth);

    let resolver;
    window.AppAuth.ready = new Promise(function (resolve) { resolver = resolve; });

    function concluir(user, extra) {
        window.AppAuth.user = user || null;
        window.AppAuth.isAdmin = !!(user && emailEhAdmin(user.email));
        if (extra) window.AppAuth.demo = true;
        resolver(window.AppAuth);
        document.dispatchEvent(new CustomEvent('appauth:ready', { detail: window.AppAuth }));
    }

    /* --- Modo demonstração / offline (sem Firebase) --- */
    if (!hasFirebase) {
        let demoUser = null;
        let q = {};
        try {
            (location.search || '').replace(/^\?/, '').split('&').forEach(function (kv) {
                let parts = kv.split('=');
                if (parts[0]) q[parts[0]] = decodeURIComponent(parts[1] || '');
            });
        } catch (e) { }
        try {
            if (q.adm === '1' || localStorage.getItem('admDemo') === '1') {
demoUser = { email: 'admoescritor@musical.com', displayName: 'Adm Escritor' };
            } else if (q.user === '1' || localStorage.getItem('userDemo') === '1') {
                demoUser = { email: 'integrante@musical.com', displayName: 'Integrante' };
            }
        } catch (e) {
            if (q.adm === '1') demoUser = { email: 'admoescritor@musical.com', displayName: 'Adm Escritor' };
            else if (q.user === '1') demoUser = { email: 'integrante@musical.com', displayName: 'Integrante' };
        }
        setTimeout(function () { concluir(demoUser, true); }, 0);
        return;
    }

    /* --- Firebase real --- */
    firebase.initializeApp(firebaseConfig);
    const fireAuth = firebase.auth();
    window.fireAuth = fireAuth;

    let primeiraVez = true;
    fireAuth.onAuthStateChanged(function (user) {
        const loginForm = document.getElementById('login-form');

        if (!user) {
            window.AppAuth.user = null;
            window.AppAuth.isAdmin = false;
            if (primeiraVez) { primeiraVez = false; concluir(null); }
            if (loginForm) return;
            window.location.href = 'index.html';
            return;
        }

        carregarAdmins().then(function () {
            window.AppAuth.user = user;
            window.AppAuth.isAdmin = emailEhAdmin(user.email);

            if (primeiraVez) {
                primeiraVez = false;
                concluir(user);
            } else {
                document.dispatchEvent(new CustomEvent('appauth:state', { detail: window.AppAuth }));
            }

            if (loginForm) {
                if (user) window.location.href = 'pg1.html';
                return;
            }

            aplicarIdentidadeDeUsuario(user);

            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', function () {
                    fireAuth.signOut().then(function () {
                        window.location.href = 'index.html';
                    });
                });
            }
        });
    });

    function primeiroNome(user) {
        var base = (user && (user.displayName || user.email || '')) || '';
        return String(base).split(/[@\s]+/)[0] || '';
    }

    function aplicarIdentidadeDeUsuario(user) {
        const display = formatName(primeiroNome(user));

        const userNameEl = document.getElementById('userName');
        const nameField = document.getElementById('profileName');
        const avatarEl = document.getElementById('profileAvatar');

        if (userNameEl) userNameEl.textContent = display;
        if (nameField) nameField.textContent = display;
        if (avatarEl) avatarEl.textContent = (display.charAt(0) || 'G').toUpperCase();
        if (avatarEl && window.AppAuth.isAdmin) avatarEl.classList.add('is-admin-avatar');
    }

    /* --- Usa o nome escolhido no cadastro de boas-vindas (perfil) --- */
    window.AppAuth.ready.then(function () {
        if (!window.AppDB) return;
        const email = (window.AppAuth.user && window.AppAuth.user.email) || '';
        const chave = chavePerfilUsuario(email);

        function aplicarPerfil(lista) {
            let p = null;
            (lista || []).forEach(function (x) { if (x._id === chave) p = x; });
            if (!p || !p.nome) return;
            const display = formatName(String(p.nome).split(/[\s@]+/)[0]);
            const userNameEl = document.getElementById('userName');
            const nameField = document.getElementById('profileName');
            const avatarEl = document.getElementById('profileAvatar');
            if (userNameEl) userNameEl.textContent = display;
            if (nameField) nameField.textContent = display;
            if (avatarEl) avatarEl.textContent = (display.charAt(0) || 'G').toUpperCase();
        }

        window.AppDB.onChange('perfil', aplicarPerfil);
        window.AppDB.load('perfil').then(aplicarPerfil);
    });
})();

/* =====================================
   PÁGINA DE LOGIN
===================================== */

(function () {
    const loginForm = document.getElementById('login-form');
    if (!loginForm) return;

    if (typeof firebase === 'undefined' || !firebase.auth) {
        const button = loginForm.querySelector('button[type="submit"]');
        if (button) button.addEventListener('click', function (e) {
            e.preventDefault();
            const box = document.getElementById('loginError');
            if (box) box.textContent = 'Login indisponível (modo demonstração).';
        });
        return;
    }

    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    const errorBox = document.getElementById('loginError');
    const button = loginForm.querySelector('button[type="submit"]');
    const lembrarCheck = loginForm.querySelector('.remember input');

    /* --- Lembre-se de mim: restaura e-mail da última vez --- */
    try {
        if (localStorage.getItem('musical_lembrar') === '1') {
            if (lembrarCheck) lembrarCheck.checked = true;
            const lembrado = localStorage.getItem('musical_lembrar_email');
            if (lembrado) emailInput.value = lembrado;
        }
    } catch (e) { }

    loginForm.addEventListener('submit', function (e) {
        e.preventDefault();
        errorBox.textContent = '';

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
            errorBox.textContent = 'Preencha seu e-mail e senha.';
            return;
        }

        button.disabled = true;
        button.style.opacity = '0.7';

        const persistencia = (lembrarCheck && lembrarCheck.checked)
            ? firebase.auth.Auth.Persistence.LOCAL
            : firebase.auth.Auth.Persistence.SESSION;

        window.fireAuth.setPersistence(persistencia)
            .then(function () {
                return window.fireAuth.signInWithEmailAndPassword(email, password);
            })
            .then(function () {
                try {
                    if (lembrarCheck && lembrarCheck.checked) {
                        localStorage.setItem('musical_lembrar', '1');
                        localStorage.setItem('musical_lembrar_email', email);
                    } else {
                        localStorage.removeItem('musical_lembrar');
                        localStorage.removeItem('musical_lembrar_email');
                    }
                } catch (e) { }
                window.location.href = 'pg1.html';
            })
            .catch(function (err) {
                console.error('[login] Falha na autenticação.', err && err.code, err);
                button.disabled = false;
                button.style.opacity = '';
                errorBox.textContent = loginErrorMessage(err && err.code);
            });
    });

    window.fireAuth.onAuthStateChanged(function (user) {
        if (user) window.location.href = 'pg1.html';
    });
})();
