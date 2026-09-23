/* =====================================
   global-search.js — BUSCA GLOBAL NO CABEÇALHO
   Pressiona a lupa e encontra em qualquer página:
   ensaios, tarefas, músicas, eventos, notificações,
   integrantes, equipes e personagens — levando à
   página certa (detalhe quando existir).
   Só assume inputs de busca SEM id próprio
   (os que já filtram a página seguem).
===================================== */

window.GlobalSearch = (function () {

    var FONTES = [
        { col: 'ensaios',      ic: 'bxs-calendar-event', link: 'pg4.html',                          ver: ['local', 'equipe', 'descricao'] },
        { col: 'tarefas',      ic: 'bx-check-square',     link: 'pg3.html',                          ver: ['nome', 'descricao', 'equipe'] },
        { col: 'musicas',      ic: 'bx-music',            link: 'pg5-detalhe.html?id=',              ver: ['titulo', 'nome', 'artista', 'categoria', 'observacoes'] },
        { col: 'eventos',      ic: 'bxs-calendar-event',  link: 'pg2.html',                          ver: ['nome', 'titulo', 'descricao', 'local'] },
        { col: 'notificacoes', ic: 'bx-bell',             link: 'pg8.html',                          ver: ['titulo', 'mensagem'] },
        { col: 'integrantes',  ic: 'bx-user',             link: 'pg7-detalhe.html?id=',              ver: ['nome', 'personagem', 'equipe', 'funcao', 'obs'] },
        { col: 'equipes',      ic: 'bx-group',            link: 'pg7.html',                          ver: ['nome', 'descricao'] },
        { col: 'personagens',  ic: 'bx-mask',             link: 'pg7.html',                          ver: ['nome', 'elenco'] }
    ];

    function procurar(item, q, chaves) {
        var texto = '';
        chaves.forEach(function (k) { texto += ' ' + (item[k] || ''); });
        return texto.toLowerCase().indexOf(q) > -1;
    }

    function desenhar(input, drop, q) {
        drop.innerHTML = '';

        var urls = {};
        Promise.all(FONTES.map(function (f) {
            return window.AppDB.load(f.col).then(function () {
                urls[f.col] = window.AppDB.snapshot(f.col);
            });
        })).then(function () {
            drop.innerHTML = '';
            var achados = 0;

            FONTES.forEach(function (f) {
                if (achados >= 20) return;

                var itens = urls[f.col].filter(function (it) {
                    return procurar(it, q, f.ver);
                }).slice(0, 4);

                if (!itens.length) return;

                var tit = document.createElement('div');
                tit.className = 'gs-title';
                tit.textContent = f.col;
                drop.appendChild(tit);

                itens.forEach(function (it) {
                    var rotulo = String(it.nome || it.titulo || it.local || it._id);
                    var href = f.link.indexOf('?') > -1 ? f.link + encodeURIComponent(it.slug || it._id) : f.link;
                    var a = document.createElement('a');
                    a.className = 'gs-item';
                    a.href = href;
                    a.innerHTML = '<i class="bx ' + f.ic + '"></i><span>' + rotulo + '</span>';
                    drop.appendChild(a);
                    achados++;
                });
            });

            if (!achados) {
                var vazio = document.createElement('div');
                vazio.className = 'gs-empty';
                vazio.textContent = 'Nenhum resultado para "' + (input.value || '').trim() + '"';
                drop.appendChild(vazio);
            }

            drop.style.display = 'block';
        });
    }

    function ligar(input) {
        var drop = document.createElement('div');
        drop.className = 'gs-drop';
        drop.style.display = 'none';
        document.body.appendChild(drop);

        var timer = null;

        function fechar() {
            clearTimeout(timer);
            drop.style.display = 'none';
        }

        input.addEventListener('input', function () {
            clearTimeout(timer);
            var q = (input.value || '').trim().toLowerCase();
            if (!q) { fechar(); return; }
            timer = setTimeout(function () { desenhar(input, drop, q); }, 220);
        });

        input.addEventListener('focus', function () {
            var q = (input.value || '').trim().toLowerCase();
            if (q) desenhar(input, drop, q);
        });

        input.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') fechar();
        });

        document.addEventListener('click', function (e) {
            if (!drop.contains(e.target) && e.target !== input) fechar();
        });
    }

    function iniciar() {
        document.querySelectorAll('.search-box input[type="text"]').forEach(function (inp) {
            if (inp.id) return;
            if (!window.AppDB) return;
            ligar(inp);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', iniciar);
    } else {
        iniciar();
    }

    return { ligar: ligar };
})();