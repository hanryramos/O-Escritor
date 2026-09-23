/* =====================================
   AppX — APOIO COMPARTILHADO DAS PÁGINAS
   Avatares por iniciais, contador de notificações não lidas,
   leitura em voz alta, backup/importação, confete e datas.
   Carregado em todas as páginas após admin.js.
===================================== */

window.AppX = (function (window, document) {
    'use strict';

    var COLUNAS = ['eventos', 'ensaios', 'tarefas', 'musicas', 'integrantes', 'notificacoes', 'perfil', 'preferencias', 'funcoes', 'equipes', 'arquivos', 'links', 'config'];

    function pad(n) { return (n < 10 ? '0' : '') + n; }

    /* ---------- DATAS ---------- */

    function hojeIso() {
        var d = new Date();
        return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    }

    function eqHoje(iso) { return String(iso || '') === hojeIso(); }

    function somaDias(iso, n) {
        var p = String(iso || '').split('-');
        if (p.length !== 3) return iso;
        var d = new Date(+p[0], +p[1] - 1, +p[2]);
        d.setDate(d.getDate() + n);
        return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    }

    /* ---------- AVATAR / NOMES ---------- */

    function iniciais(nome) {
        var p = String(nome || '').trim().split(/\s+/).filter(Boolean);
        var s = '';
        for (var i = 0; i < p.length && i < 2; i++) s += p[i][0];
        return s.toUpperCase() || '?';
    }

    function avatar() {
        if (!window.AppDB) return;
        AppDB.load('perfil').then(function (lista) {
            var f = lista || [];
            if (!f.length) return;
            var doc = null;
            if (window.AppAuth && AppAuth.user && AppAuth.user.email) {
                for (var i = 0; i < f.length; i++) {
                    if (String(f[i].email || '').toLowerCase() === String(AppAuth.user.email).toLowerCase()) {
                        doc = f[i];
                        break;
                    }
                }
            }
            if (!doc) doc = f[0];
            var nome = doc.nome || doc.name || '';
            if (!nome) return;
            var ini = iniciais(nome);
            var av = document.querySelector('#profileAvatar');
            if (av && /^.$/.test(av.textContent.trim())) av.textContent = ini;
            var nomeEl = document.getElementById('profileName');
            if (nomeEl) nomeEl.textContent = nome;
            var hero = document.querySelector('.hero-avatar .avatar');
            if (hero && /^.$/.test(hero.textContent.trim())) hero.textContent = ini;
            var userTitle = document.getElementById('userName');
            if (userTitle) userTitle.textContent = nome.split(' ')[0];
        }).catch(function () {});
    }

    /* ---------- BADGE DE NOTIFICAÇÕES NÃO LIDAS ---------- */

    function notificacoes() {
        var btn = document.querySelector('.notif-btn');
        if (!btn || !window.AppDB) return;
        function aplicar(lista) {
            var pend = (lista || []).filter(function (n) { return !n.lida; }).length;
            var bad = btn.querySelector('.notif-count');
            if (pend > 0) {
                if (!bad) {
                    bad = document.createElement('span');
                    bad.className = 'notif-count';
                    btn.appendChild(bad);
                }
                bad.textContent = pend > 99 ? '99+' : pend;
                btn.classList.add('has-unread');
            } else {
                if (bad) bad.remove();
                btn.classList.remove('has-unread');
            }
        }
        AppDB.load('notificacoes').then(aplicar).catch(function () {});
        try { AppDB.onChange('notificacoes', aplicar); } catch (e) {}
    }

    /* ---------- LEITURA EM VOZ ALTA ---------- */

    var falando = false;

    function falar(texto) {
        if (!('speechSynthesis' in window)) return false;
        if (falando) {
            window.speechSynthesis.cancel();
            falando = false;
            return false;
        }
        var u = new SpeechSynthesisUtterance(String(texto || '').replace(/\s+/g, ' ').trim());
        u.lang = 'pt-BR';
        u.rate = 1.02;
        u.pitch = 1;
        u.onend = function () { falando = false; };
        u.onerror = function () { falando = false; };
        falando = true;
        window.speechSynthesis.speak(u);
        return true;
    }

    function marcarBotaoLer(btn, ativo) {
        if (!btn) return;
        var ic = btn.querySelector('i');
        if (ic) ic.className = ativo ? 'bx bx-volume-mute' : 'bx bx-volume-full';
        btn.classList.toggle('is-reading', ativo);
    }

    function cliqueLer(btn) {
        var alvo = btn.getAttribute('data-ler-target')
            ? document.getElementById(btn.getAttribute('data-ler-target'))
            : btn.closest('.card, .modal');
        if (!alvo) return;
        var texto = alvo.innerText || alvo.textContent || '';
        if (!texto.trim()) return;
        var ativo = falar(texto);
        document.querySelectorAll('[data-ler].is-reading').forEach(function (b) {
            if (b !== btn) marcarBotaoLer(b, false);
        });
        marcarBotaoLer(btn, ativo);
    }

    /* ---------- CONFETE ---------- */

    var CORES_CONF = ['#B9853F', '#6F461B', '#3E9B63', '#C0483B', '#F4C95D', '#FFFFFF'];

    function confetti(n) {
        if (n == null) n = 90;
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        var layer = document.createElement('div');
        layer.className = 'confetti-layer';
        for (var i = 0; i < n; i++) {
            var p = document.createElement('i');
            p.className = 'confetti';
            p.style.left = (Math.random() * 100).toFixed(2) + '%';
            p.style.background = CORES_CONF[i % CORES_CONF.length];
            p.style.transform = 'rotate(' + (Math.random() * 360).toFixed(0) + 'deg)';
            p.style.animationDelay = (Math.random() * 0.7).toFixed(2) + 's';
            p.style.animationDuration = (1.3 + Math.random() * 1.4).toFixed(2) + 's';
            layer.appendChild(p);
        }
        document.body.appendChild(layer);
        setTimeout(function () { if (layer.parentNode) layer.parentNode.removeChild(layer); }, 3600);
    }

    /* ---------- BARRA DE PROGRESSO ---------- */

    function progresso(el, pct, numEl) {
        if (!el) return 0;
        pct = Math.max(0, Math.min(100, Number(pct) || 0));
        el.style.width = pct + '%';
        if (numEl) numEl.textContent = Math.round(pct) + '%';
        return pct;
    }

    /* ---------- BACKUP / IMPORTAÇÃO ---------- */

    function toast(msg, tipo) {
        if (window.AdminKit) { AdminKit.toast(msg, tipo); return; }
        var el = document.createElement('div');
        el.className = 'toast';
        el.textContent = msg;
        document.body.appendChild(el);
        setTimeout(function () { el.classList.add('show'); }, 20);
        setTimeout(function () { el.classList.remove('show'); setTimeout(function () { el.remove(); }, 320); }, 2400);
    }

    function exportar() {
        if (!window.AppDB) { toast('Banco de dados indisponível.', 'erro'); return; }
        var dados = {};
        var chain = Promise.resolve();
        COLUNAS.forEach(function (c) {
            chain = chain.then(function () {
                return AppDB.load(c).then(function (lista) { dados[c] = lista || []; })
                    .catch(function () { dados[c] = []; });
            });
        });
        chain.then(function () {
            var blob = new Blob([JSON.stringify({ app: 'musical-escritor', exportado: new Date().toISOString(), dados: dados }, null, 2)], { type: 'application/json' });
            var a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'backup-musical-escritor-' + hojeIso() + '.json';
            document.body.appendChild(a);
            a.click();
            setTimeout(function () { URL.revokeObjectURL(a.href); if (a.parentNode) a.parentNode.removeChild(a); }, 600);
            toast('Backup exportado.', 'ok');
        });
    }

    function importar(arquivo) {
        if (!arquivo) return;
        if (!window.AppDB) { toast('Banco de dados indisponível.', 'erro'); return; }
        var leitor = new FileReader();
        leitor.onload = function () {
            var obj;
            try { obj = JSON.parse(leitor.result); } catch (e) { toast('Arquivo JSON inválido.', 'erro'); return; }
            var dados = (obj && obj.dados) || obj;
            if (!dados || typeof dados !== 'object') { toast('Nenhum dado encontrado no arquivo.', 'erro'); return; }
            var cols = Object.keys(dados).filter(function (c) { return COLUNAS.indexOf(c) > -1; });
            if (!cols.length) { toast('Arquivo sem dados compatíveis.', 'erro'); return; }
            var chain = Promise.resolve();
            var gravados = 0;
            cols.forEach(function (c) {
                chain = chain.then(function () {
                    var itens = dados[c] || [];
                    var inner = Promise.resolve();
                    itens.forEach(function (item) {
                        inner = inner.then(function () {
                            var id = item && item._id;
                            var corpo = {};
                            for (var k in item) { if (k !== '_id') corpo[k] = item[k]; }
                            if (id) {
                                return AppDB.update(c, id, corpo).then(function () { gravados++; });
                            }
                            return AppDB.add(c, corpo).then(function () { gravados++; });
                        }).catch(function () {});
                    });
                    return inner;
                });
            });
            chain.then(function () {
                toast('Importação concluída (' + gravados + ' itens).', 'ok');
            }).catch(function (e) {
                console.error('[AppX] importar:', e);
                toast('Erro ao importar.', 'erro');
            });
        };
        leitor.onerror = function () { toast('Falha ao ler o arquivo.'); };
        leitor.readAsText(arquivo);
    }

    /* ---------- INICIALIZAÇÃO ---------- */

    function init() {
        var main = document.querySelector('main.dashboard') || document.querySelector('main.content');
        if (main) main.classList.add('page-enter');

        avatar();
        notificacoes();

        document.addEventListener('click', function (e) {
            var ler = e.target.closest('[data-ler]');
            if (ler) { cliqueLer(ler); return; }
            var exp = e.target.closest('[data-export]');
            if (exp) { e.preventDefault(); exportar(); return; }
            var imp = e.target.closest('[data-import]');
            if (imp) {
                e.preventDefault();
                var fi = document.createElement('input');
                fi.type = 'file';
                fi.accept = '.json,application/json';
                fi.onchange = function () { if (fi.files && fi.files[0]) importar(fi.files[0]); };
                fi.click();
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return {
        iniciais: iniciais,
        hojeIso: hojeIso,
        eqHoje: eqHoje,
        somaDias: somaDias,
        avatar: avatar,
        notificacoes: notificacoes,
        falar: falar,
        confetti: confetti,
        progresso: progresso,
        exportar: exportar,
        importar: importar,
        toast: toast
    };
})(window, document);