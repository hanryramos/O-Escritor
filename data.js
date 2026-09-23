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

        c.iniciado = window.AppAuth.ready.then(function () {
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

        return c.iniciado;
    }

    function load(col) {
        garantir(col);
        return iniciar(col);
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
            return ref(col).child(item._id).set(item).then(function () { return item; }).catch(function (err) {
                console.warn('AppDB: falha ao gravar em "' + col + '" no Firebase, mantendo apenas localmente.', err);
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
                console.warn('AppDB: falha ao atualizar "' + col + '/' + id + '" no Firebase, mantendo apenas localmente.', err);
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
                console.warn('AppDB: falha ao remover "' + col + '/' + id + '" no Firebase, mantendo apenas localmente.', err);
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
        onChange: onChange,
        add: add,
        update: update,
        remove: remove,
        replaceAll: replaceAll,
        uid: uid,
        temRTDB: temRTDB,
        ehAdmin: ehAdmin
    };
})();
