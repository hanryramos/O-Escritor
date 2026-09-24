/* =====================================
   AppDB — CAMADA DE DADOS
   Usa Firebase Realtime Database quando
   disponível; senão, mantém em memória
   (modo demonstração / offline).

   Uso típico por página:
     AppDB.register('eventos', EV);
     AppDB.onChange('eventos', function (lista) { EV = lista; render(); });
     AppDB.add('eventos', obj);
     AppDB.update('eventos', id, patch);
     AppDB.remove('eventos', id);
===================================== */

window.AppDB = (function () {

    var ROOT = 'musical/';
    var LS_PREFIX = 'musical_ls_';
    var cols = {};

    function temRTDB() {
        return (typeof firebase !== 'undefined' && firebase && firebase.database &&
            window.AppAuth && window.AppAuth.user);
    }

    function lerLocal(col) {
        try {
            var raw = localStorage.getItem(LS_PREFIX + col);
            if (!raw) return null;
            var dados = JSON.parse(raw);
            return Array.isArray(dados) ? lista(dados) : null;
        } catch (e) {
            return null;
        }
    }

    function salvarLocal(c) {
        try {
            localStorage.setItem(LS_PREFIX + c.col, JSON.stringify(c.data || []));
        } catch (e) { }
    }

    function ehAdmin() {
        return !!(window.AppAuth && window.AppAuth.isAdmin);
    }

    function uid() {
        return 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    }

    /* ---------- NOTIFICAÇÃO AUTOMÁTICA AO CRIAR ---------- */

    var LINKS = {
        eventos: 'pg2.html',
        ensaios: 'pg4.html',
        tarefas: 'pg3.html',
        musicas: 'pg5.html',
        integrantes: 'pg7.html',
        arquivos: 'pg6.html',
        links: 'pg6.html',
        equipes: 'pg7.html'
    };

    var AVISOS = {
        eventos: { tipo: 'evento', acao: 'Novo evento' },
        ensaios: { tipo: 'evento', acao: 'Novo ensaio' },
        tarefas: { tipo: 'tarefa', acao: 'Nova tarefa' },
        musicas: { tipo: 'musica', acao: 'Nova música' },
        integrantes: { tipo: 'equipe', acao: 'Novo integrante' },
        arquivos: { tipo: 'arquivo', acao: 'Novo arquivo' },
        links: { tipo: 'arquivo', acao: 'Novo link' },
        equipes: { tipo: 'equipe', acao: 'Nova equipe' }
    };

    function detalheAviso(col, item) {
        var partes = [];
        if (col === 'eventos') {
            if (item.hora) partes.push(item.hora);
            if (item.local) partes.push(item.local);
            if (item.d) partes.push(item.d);
        } else if (col === 'ensaios') {
            if (item.ini) partes.push(item.ini);
            if (item.local) partes.push(item.local);
            if (item.data) partes.push(item.data);
        } else if (col === 'tarefas') {
            if (item.resp) partes.push('Resp.: ' + item.resp);
            if (item.data) partes.push(item.data);
        } else if (col === 'musicas') {
            if (item.artista) partes.push(item.artista);
        } else if (col === 'integrantes') {
            if (item.funcao) partes.push(item.funcao);
            if (item.equipe) partes.push(item.equipe);
        }
        if (item.nome && col !== 'eventos') partes.unshift(item.nome);
        return partes.join(' · ').slice(0, 140);
    }

    function avisarNovo(col, item) {
        var a = AVISOS[col];
        if (!a || col === 'notificacoes') return;
        if (!temRTDB()) return;
        var nomeItem = String(item.titulo || item.nome || '').trim();
        var titulo = a.acao + (nomeItem ? ': ' + nomeItem : '');
        var email = (window.AppAuth && window.AppAuth.user && window.AppAuth.user.email) || '';
        var novoT;
        try {
            novoT = firebase.database().ref(ROOT + 'notificacoes').push().set({
                tipo: a.tipo,
                cats: [a.tipo, col],
                pessoa: null,
                titulo: titulo,
                desc: detalheAviso(col, item),
                tempo: 'Agora há pouco',
                lida: false,
                link: LINKS[col] || null,
                criadoPor: email
            });
        } catch (e) { novoT = null; }
        if (novoT && novoT.then) {
            novoT.then(function () {
                enviarPush({ titulo: titulo, desc: detalheAviso(col, item), tipo: a.tipo, link: LINKS[col] || 'pg8.html' }).catch(function () { });
            }).catch(function () { });
        }
    }

    /* --- Push real (FCM) enviado do próprio navegador, sem servidor ---
       Dois modos:
       1) Se tiver a "Chave do servidor" (projetos antigos), salva em
          localStorage 'musical_fcm_key' e usa a API legada.
       2) Do contrário, cola o JSON da conta de serviço do Firebase
          (Console -> Configurações do projeto -> Contas de serviço ->
          Gerar nova chave privada) em 'musical_sa_json'; o navegador
          gera o token OAuth com WebCrypto e usa a API v1.
       Envia para todos os tokens salvos em musical/tokens — funciona
       com o app e a aba fechada. */
    var cacheOAuth = { valor: '', expira: 0 };

    function b64url(bytes) {
        var bin = '';
        var arr = new Uint8Array(bytes);
        for (var i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
        return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    }

    function pemParaArrayBuffer(pem) {
        var base64 = String(pem || '').replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
        var bin = atob(base64);
        var len = bin.length;
        var bytes = new Uint8Array(len);
        for (var i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
        return bytes.buffer;
    }

    function gerarAccessToken(sa) {
        var iat = Math.floor(Date.now() / 1000);
        var header = b64url(new TextEncoder().encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
        var claims = b64url(new TextEncoder().encode(JSON.stringify({
            iss: sa.client_email,
            scope: 'https://www.googleapis.com/auth/firebase.messaging',
            aud: 'https://oauth2.googleapis.com/token',
            iat: iat,
            exp: iat + 3600
        })));
        var entrada = header + '.' + claims;
        return crypto.subtle.importKey(
            'pkcs8',
            pemParaArrayBuffer(sa.private_key),
            { name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-256' } },
            false,
            ['sign']
        ).then(function (key) {
            return crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(entrada));
        }).then(function (sig) {
            var jwt = entrada + '.' + b64url(sig);
            return fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') +
                    '&assertion=' + encodeURIComponent(jwt)
            });
        }).then(function (r) { return r.json(); }).then(function (j) {
            if (!j.access_token) throw new Error('OAuth falhou: ' + (j.error_description || j.error || 'token não retornado'));
            cacheOAuth.valor = j.access_token;
            cacheOAuth.expira = Date.now() + ((j.expires_in || 3600) - 60) * 1000;
            return j.access_token;
        });
    }

    function tokenParaPush(sa) {
        if (cacheOAuth.valor && Date.now() < cacheOAuth.expira) return Promise.resolve(cacheOAuth.valor);
        return gerarAccessToken(sa);
    }

    function temChavePush() {
        var a = '';
        try { a = localStorage.getItem('musical_fcm_key') || ''; } catch (e) { }
        if (a) return true;
        var b = '';
        try { b = localStorage.getItem('musical_sa_json') || ''; } catch (e) { }
        if (!b) return false;
        try {
            var sa = JSON.parse(b);
            return !!(sa && sa.client_email && sa.private_key);
        } catch (e) { return false; }
    }

    function enviarPush(item) {
        if (typeof firebase === 'undefined' || !firebase.database) return Promise.reject(new Error('Sem Firebase.'));
        return firebase.database().ref(ROOT + 'tokens').once('value').then(function (snap) {
            var mapa = snap.val() || {};
            var regs = [];
            Object.keys(mapa).forEach(function (k) {
                var t = mapa[k] && mapa[k].token;
                if (t && regs.indexOf(t) === -1) regs.push(t);
            });
            if (!regs.length) throw new Error('Nenhum dispositivo com permissão ainda.');

            var projeto = (window.firebaseConfig && window.firebaseConfig.projectId) || 'musical-escritor';

            function dadosPush() {
                return {
                    tipo: item.tipo || 'sistema',
                    link: item.link || '',
                    titulo: String(item.titulo || 'Nova notificação'),
                    desc: String(item.desc || '')
                };
            }

            /* Modo 1: chave do servidor (API legada) */
            var chaveLegada = '';
            try { chaveLegada = localStorage.getItem('musical_fcm_key') || ''; } catch (e) { }
            if (chaveLegada) {
                return fetch('https://fcm.googleapis.com/fcm/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'key=' + chaveLegada },
                    body: JSON.stringify({
                        registration_ids: regs.slice(0, 1000),
                        data: dadosPush(),
                        webpush: { headers: { TTL: '3600' } }
                    })
                }).then(function (r) {
                    return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, corpo: j }; });
                });
            }

            /* Modo 2: conta de serviço (API v1) */
            var saJson = '';
            try { saJson = localStorage.getItem('musical_sa_json') || ''; } catch (e) { }
            var sa = null;
            try { sa = JSON.parse(saJson); } catch (e) { }
            if (!sa || !sa.client_email || !sa.private_key) {
                return Promise.reject(new Error('Configure a chave de envio em Configurações (push com app fechado).'));
            }
            if (!(window.crypto && window.crypto.subtle)) {
                return Promise.reject(new Error('Precisa abrir o site por HTTPS para gerar o push (não serve em arquivo local).'));
            }
            return tokenParaPush(sa).then(function (tok) {
var falhas = 0;
                var erros = [];
                var okNomes = [];
                var chain = Promise.resolve();
                regs.slice(0, 1000).forEach(function (token) {
                    chain = chain.then(function () {
                        return fetch('https://fcm.googleapis.com/v1/projects/' + projeto + '/messages:send', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok },
                            body: JSON.stringify({
                                message: {
                                    token: token,
                                    data: dadosPush(),
                                    webpush: { headers: { TTL: '3600' } }
                                }
                            })
                        }).then(function (r) {
                            if (r.status === 401 || r.status === 403) {
                                cacheOAuth.valor = '';
                                throw new Error('push não autorizado (status ' + r.status + ').');
                            }
                            if (!r.ok) {
                                falhas += 1;
                                return r.json().catch(function () { return {}; }).then(function (j) {
                                    var m = (j.error && (j.error.message || j.error.status || j.error.code)) || ('HTTP ' + r.status);
                                    erros.push(String(m));
                                });
                            }
                            return r.json().catch(function () { return {}; }).then(function (j) {
                                if (j && j.name) okNomes.push(String(j.name));
                            });
                        });
                    });
                });
                return chain.then(function () {
                    return { status: 200, corpo: { ok: true, dispositivos: regs.length, falhas: falhas, erros: erros.slice(0, 5), ids: okNomes.slice(0, 3) } };
                });
            });
        });
    }

    function avisarFalhaRTDB(msg) {
        try {
            if (window.AdminKit) AdminKit.toast(msg, 'erro');
        } catch (e) { }
    }

    function norm(item) {
        item = item || {};
        if (!item._id) item._id = item.id || item.slug || uid();
        return item;
    }

    function lista(arr) {
        return (arr || []).map(norm);
    }

    function praArray(obj) {
        if (!obj) return [];
        return Object.keys(obj).map(function (k) {
            var v = obj[k] || {};
            if (typeof v !== 'object') v = { valor: v };
            v._id = v._id || k;
            return v;
        });
    }

    function ref(col) {
        return firebase.database().ref(ROOT + col);
    }

    function garantir(col) {
        if (!cols[col]) cols[col] = { col: col, seed: [], listeners: [], data: [], iniciado: null, mode: null };
        return cols[col];
    }

    function register(col, seed) {
        var c = garantir(col);
        if (seed) c.seed = lista(seed);
        return c.seed;
    }

    function emitir(col) {
        var c = cols[col];
        (c.listeners || []).forEach(function (cb) {
            try { cb(c.data.slice()); } catch (e) { console.error(e); }
        });
    }

    function iniciar(col) {
        var c = garantir(col);
        if (c.iniciado) return c.iniciado;

        document.dispatchEvent(new CustomEvent('appdb:start', { detail: col }));

        var inicio = window.AppAuth.ready.then(function () {
            if (!temRTDB()) {
                c.mode = 'local';
                c.data = (lerLocal(col) || c.seed).slice();
                return c.data;
            }

            c.mode = 'rtdb';
            return ref(col).once('value').then(function (snap) {
                if (!snap.exists()) {
                    if (ehAdmin() && c.seed.length) {
                        var obj = {};
                        c.seed.forEach(function (it) { obj[it._id] = it; });
                        return ref(col).set(obj).then(function () { return c.seed.slice(); });
                    }
                    return c.seed.slice();
                }
                return praArray(snap.val());
            }).then(function (list) {
                c.data = list;
                ref(col).on('value', function (snap) {
                    c.data = praArray(snap.val());
                    emitir(col);
                });
                return c.data;
            }).catch(function (err) {
                console.warn('AppDB: falha ao ler "' + col + '", usando armazenamento local (localStorage).', err);
                c.mode = 'local';
                c.data = (lerLocal(col) || c.seed).slice();
                return c.data;
            });
        });

        c.iniciado = inicio.then(
            function (v) {
                document.dispatchEvent(new CustomEvent('appdb:end', { detail: col }));
                return v;
            },
            function (e) {
                document.dispatchEvent(new CustomEvent('appdb:end', { detail: col }));
                throw e;
            }
        );
        return c.iniciado;
    }

    function load(col) {
        garantir(col);
        return iniciar(col);
    }

    function snapshot(col) {
        var c = cols[col];
        return c ? c.data.slice() : [];
    }

    function onChange(col, cb) {
        var c = garantir(col);
        c.listeners.push(cb);
        iniciar(col).then(function () {
            if (c.mode === 'local') cb(c.data.slice());
        });
        return function () {
            var i = c.listeners.indexOf(cb);
            if (i > -1) c.listeners.splice(i, 1);
        };
    }

    function add(col, item) {
        var c = garantir(col);
        item = norm(item);
        if (c.mode === 'rtdb') {
            return ref(col).child(item._id).set(item).then(function () {
                avisarNovo(col, item);
                return item;
            }).catch(function (err) {
                console.error('AppDB: falha ao gravar "' + col + '" no Firebase. Automatizações seguem localmente.', err);
                avisarFalhaRTDB('Erro ao salvar "' + col + '" no banco compartilhado. A alteração ficou só neste dispositivo.');
                c.data.push(item);
                salvarLocal(c);
                emitir(col);
                return item;
            });
        }
        c.data.push(item);
        salvarLocal(c);
        emitir(col);
        return Promise.resolve(item);
    }

    function update(col, id, patch) {
        var c = garantir(col);
        if (c.mode === 'rtdb') {
            return ref(col).child(id).update(patch).then(function () { return id; }).catch(function (err) {
                console.error('AppDB: falha ao atualizar "' + col + '/' + id + '" no Firebase. Alteração mantida localmente.', err);
                avisarFalhaRTDB('Erro ao atualizar "' + col + '" no banco compartilhado. A alteração ficou só neste dispositivo.');
                aplicarPatch(c.data, id, patch);
                salvarLocal(c);
                emitir(col);
                return id;
            });
        }
        aplicarPatch(c.data, id, patch);
        salvarLocal(c);
        emitir(col);
        return Promise.resolve(id);
    }

    function remove(col, id) {
        var c = garantir(col);
        if (c.mode === 'rtdb') {
            return ref(col).child(id).remove().then(function () { return id; }).catch(function (err) {
                console.error('AppDB: falha ao remover "' + col + '/' + id + '" no Firebase. Remoção mantida localmente.', err);
                avisarFalhaRTDB('Erro ao remover do banco compartilhado. A exclusão ficou só neste dispositivo.');
                c.data = c.data.filter(function (it) { return it._id !== id; });
                salvarLocal(c);
                emitir(col);
                return id;
            });
        }
        c.data = c.data.filter(function (it) { return it._id !== id; });
        salvarLocal(c);
        emitir(col);
        return Promise.resolve(id);
    }

    function replaceAll(col, arr) {
        var c = garantir(col);
        var listaNova = lista(arr);
        if (c.mode === 'rtdb') {
            var obj = {};
            listaNova.forEach(function (it) { obj[it._id] = it; });
            return ref(col).set(obj).then(function () { return; }).catch(function (err) {
                console.warn('AppDB: falha ao substituir "' + col + '" no Firebase, mantendo apenas localmente.', err);
                c.data = listaNova;
                salvarLocal(c);
                emitir(col);
            });
        }
        c.data = listaNova;
        salvarLocal(c);
        emitir(col);
        return Promise.resolve();
    }

    function aplicarPatch(arr, id, patch) {
        for (var i = 0; i < arr.length; i++) {
            if (arr[i]._id === id) {
                Object.keys(patch).forEach(function (k) { arr[i][k] = patch[k]; });
                break;
            }
        }
    }

    return {
        register: register,
        load: load,
        snapshot: snapshot,
        onChange: onChange,
        add: add,
        update: update,
        remove: remove,
        replaceAll: replaceAll,
        uid: uid,
        temRTDB: temRTDB,
        ehAdmin: ehAdmin,
        enviarPush: enviarPush,
        temChavePush: temChavePush
    };
})();
