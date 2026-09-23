/* =====================================
   theme.js — MODO ESCURO (tema)
   Aplica o tema vindo das preferências do usuário
   (salvas no banco) com fallback para localStorage.
   Expõe Theme.definir(escuro) para a página Meu Perfil.
===================================== */

window.Theme = (function () {

    var LS_KEY = 'musical_escuro';

    function emailAtual() {
        return (window.AppAuth && window.AppAuth.user && window.AppAuth.user.email) || '';
    }

    function chavePrefs(email) {
        return 'pref_' + String(email || '').toLowerCase().replace(/[^a-z0-9]/g, '_');
    }

    function aplicarClasse(escuro) {
        document.body.classList.toggle('modo-escuro', !!escuro);
    }

    function lerLocal() {
        try { return localStorage.getItem(LS_KEY); } catch (e) { return null; }
    }

    function salvarLocal(escuro) {
        try { localStorage.setItem(LS_KEY, escuro ? '1' : '0'); } catch (e) { }
    }

    /* Tema salvo pelo próprio usuário (primeira aplicação, sem depender da rede) */
    aplicarClasse(lerLocal() === '1');

    function carregar() {
        if (!window.AppDB) {
            aplicarClasse(lerLocal() === '1');
            return;
        }

        window.AppDB.load('preferencias').then(function (lista) {
            var minha = null;
            var global = null;
            (lista || []).forEach(function (p) {
                if (p._id === chavePrefs(emailAtual())) minha = p;
                if (p._id === 'pref') global = p;
            });
            var p = minha || global;
            if (p && typeof p.escuro !== 'undefined') {
                aplicarClasse(buildLocalState(p));
                salvarLocal(!!p.escuro);
            } else {
                aplicarClasse(lerLocal() === '1');
            }
        }).catch(function () {
            aplicarClasse(lerLocal() === '1');
        });
    }

    function buildLocalState(p) { return !!p.escuro; }

    /* Altera o tema e persiste nas preferências do usuário (ou global, como fallback) */
    function definir(escuro) {
        escuro = !!escuro;
        aplicarClasse(escuro);
        salvarLocal(escuro);

        if (!window.AppDB) return Promise.resolve();

        var email = emailAtual();
        var chave = chavePrefs(email);

        return window.AppDB.load('preferencias').then(function (lista) {
            var existe = false;
            (lista || []).forEach(function (p) { if (p._id === chave) existe = true; });

            if (existe) {
                return window.AppDB.update('preferencias', chave, { escuro: escuro, email: email });
            }
            return window.AppDB.add('preferencias', {
                _id: chave,
                email: email,
                push: true,
                app: true,
                escuro: escuro,
                idioma: 'pt'
            });
        });
    }

    if (window.AppAuth && window.AppAuth.ready) {
        window.AppAuth.ready.then(carregar);
    } else if (document.readyState === 'complete') {
        carregar();
    } else {
        window.addEventListener('load', carregar);
    }

    return {
        definir: definir,
        aplicar: carregar,
        chavePrefs: chavePrefs
    };
})();