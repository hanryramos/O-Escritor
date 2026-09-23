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
    appId: "1:946659031609:web:6f71a80bf7a88d7d496be8"
};

/* =====================================
   PAPEL DE ADMINISTRADOR
   (definido por e-mail; caixa baixa)
===================================== */

const ADMIN_EMAILS = [
'admoescritor@musical.com'
];

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

function emailEhAdmin(email) {
    return ADMIN_EMAILS.indexOf(String(email || '').toLowerCase()) > -1;
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

        if (primeiraVez) {
            primeiraVez = false;
            concluir(user);
        } else {
            window.AppAuth.user = user || null;
            window.AppAuth.isAdmin = !!(user && emailEhAdmin(user.email));
        }

        if (loginForm) {
            if (user) window.location.href = 'pg1.html';
            return;
        }

        if (!user) {
            window.location.href = 'index.html';
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

        window.fireAuth.signInWithEmailAndPassword(email, password)
            .then(function () {
                window.location.href = 'pg1.html';
            })
            .catch(function (err) {
                button.disabled = false;
                button.style.opacity = '';
                errorBox.textContent = loginErrorMessage(err.code);
            });
    });

    window.fireAuth.onAuthStateChanged(function (user) {
        if (user) window.location.href = 'pg1.html';
    });
})();
