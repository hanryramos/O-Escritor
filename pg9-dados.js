/* ============================================
   PG9 · MEU PERFIL — Dados do módulo
   (começa vazio; o administrador preenche via editar)
============================================ */
window.MP = (function () {

    var SEED_PERFIL = {
        _id: 'perfil',
        nome: '',
        cargo: '',
        frase: '',
        sobre: '',
        versiculo: '',
        email: '',
        telefone: '',
        local: '',
        entrada: ''
    };

    function chavePerfil() {
        var e = (window.AppAuth && window.AppAuth.user && window.AppAuth.user.email) || '';
        if (!e) return 'perfil';
        return 'perfil_' + String(e).toLowerCase().replace(/[^a-z0-9]+/g, '_');
    }

    function pegarPerfil(lista) {
        var chave = chavePerfil();
        var achou = (lista || []).filter(function (p) { return p._id === chave; })[0];
        return achou || SEED_PERFIL;
    }

    var SEED_FUNCOES = [];

    var perfil = SEED_PERFIL;
    var funcoes = SEED_FUNCOES.slice();

    if (window.AppDB) {
        AppDB.register('perfil', [SEED_PERFIL]);
        AppDB.register('funcoes', SEED_FUNCOES);
        AppDB.onChange('perfil', function (lista) {
            perfil = pegarPerfil(lista);
        });
        AppDB.onChange('funcoes', function (lista) {
            funcoes = lista;
        });
    }

    function chavePrefs() {
        var e = (window.AppAuth && window.AppAuth.user && window.AppAuth.user.email) || '';
        if (!e) return 'pref';
        return 'pref_' + String(e).toLowerCase().replace(/[^a-z0-9]/g, '_');
    }

    var SEED_PREFERENCIA = {
        _id: 'pref',
        push: true,
        app: true,
        escuro: false,
        idioma: 'Português (BR)'
    };

    var preferencias = {
        push: SEED_PREFERENCIA.push,
        app: SEED_PREFERENCIA.app,
        escuro: SEED_PREFERENCIA.escuro,
        idioma: SEED_PREFERENCIA.idioma
    };

    if (window.AppDB) {
        AppDB.register('perfil', [SEED_PERFIL]);
        AppDB.register('funcoes', SEED_FUNCOES);
        AppDB.register('preferencias', [SEED_PREFERENCIA]);
        AppDB.onChange('perfil', function (lista) {
            perfil = pegarPerfil(lista);
        });
        AppDB.onChange('funcoes', function (lista) {
            funcoes = lista;
        });
        AppDB.onChange('preferencias', function (lista) {
            var minha = null;
            var global = null;
            (lista || []).forEach(function (p) {
                if (p._id === chavePrefs()) minha = p;
                if (p._id === 'pref') global = p;
            });
            if (minha) preferencias = minha;
            else if (global) preferencias = global;
        });
    }

    function salvarPrefs(patch) {
        Object.keys(patch || {}).forEach(function (k) {
            preferencias[k] = patch[k];
        });
        if (window.AppDB) {
            var chave = chavePrefs();
            var existe = AppDB.snapshot('preferencias').filter(function (p) { return p._id === chave; }).length > 0;
            if (existe) {
                return AppDB.update('preferencias', chave, patch);
            }
            var novo = {
                _id: chave,
                email: (window.AppAuth && window.AppAuth.user && window.AppAuth.user.email) || '',
                push: true,
                app: true,
                escuro: false,
                idioma: 'Português (BR)'
            };
            Object.keys(patch || {}).forEach(function (k) { novo[k] = patch[k]; });
            return AppDB.add('preferencias', novo);
        }
        return Promise.resolve(preferencias);
    }

    function esc(t) {
        var d = document.createElement('div');
        d.textContent = t;
        return d.innerHTML;
    }

    return {
        get perfil() { return perfil; },
        get funcoes() { return funcoes; },
        preferencias: preferencias,
        chavePerfil: chavePerfil,
        esc: esc,
        onChange: function (cb) {
            if (!window.AppDB) return;
            AppDB.onChange('perfil', cb);
            AppDB.onChange('funcoes', function () { cb(); });
        }
    };

})();