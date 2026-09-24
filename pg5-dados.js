window.MS = (function () {

var SEED_SONGS = [];

    var songs = SEED_SONGS.slice();

    var songs = SEED_SONGS.slice();

    var GRADS = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8'];

    function slugify(texto) {
        return String(texto).toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'musica';
    }

    function gradFor(id) {
        var h = 0;
        for (var i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 9973;
        return GRADS[h % GRADS.length];
    }

    function byId(id) {
        for (var i = 0; i < songs.length; i++) {
            if (songs[i].id === id) return songs[i];
        }
        return songs[0];
    }

    if (window.AppDB) {
        AppDB.register('musicas', SEED_SONGS);
        AppDB.onChange('musicas', function (lista) { songs = lista; });
    }

    function coverHTML(song, cls) {
        cls = cls || 'cap';
        if (song.capa) {
            return '<span class="' + cls + ' cap-img" style="background-image:url(\'' + song.capa + '\')"></span>';
        }
        return '<span class="' + cls + ' ' + song.grad + '"><i class="bx bx-music"></i></span>';
    }

    function arquivosHTML(song, lista, remover) {
        return (lista || song.arquivos || []).map(function (a) {
            return '<div class="file-row">' +
                '<i class="bx ' + a.icone + '"></i>' +
                '<span class="file-name">' + a.nome + '</span>' +
                '<span class="file-size">' + a.tam + '</span>' +
                (remover ? '<button class="rm-btn" data-rm-arquivo="' + esc(a.nome) + '" aria-label="Remover arquivo" title="Remover"><i class="bx bx-x"></i></button>' : '') +
                '<button class="dl-btn" aria-label="Baixar ' + esc(a.nome) + '"><i class="bx bx-download"></i></button>' +
                '</div>';
        }).join('');
    }

    function tagsHTML(song) {
        return (song.tags || []).map(function (t) {
            return '<span class="tag">' + t + '</span>';
        }).join('');
    }

    function statusClass(status) {
        if (status === 'Em andamento') return 'st-andamento';
        if (status === 'Pronta') return 'st-pronta';
        return 'st-planejada';
    }

    /* ---------- FORMULÁRIO NOVO / EDITAR MÚSICA ---------- */

    function formMusica(song) {
        if (!window.AdminKit) return;
        var ehNova = !song;
        var s = song || {};
        var campos = [
            { name: 'capa', label: 'Capa da música', type: 'file', botao: 'Escolher foto', hint: 'Foto opcional. Será exibida junto à música.' },
            { name: 'nome', label: 'Nome', required: true, placeholder: 'Ex.: Algo Novo Vindo' },
            { name: 'artista', label: 'Artista', required: true, half: true, placeholder: 'Ex.: Get Worship' },
            { name: 'compositor', label: 'Compositor', half: true, placeholder: 'Ex.: Christina Ebner' },
            { name: 'cena', label: 'Cena', half: true, placeholder: 'Ex.: Cena 1' },
            { name: 'tom', label: 'Tom', half: true, placeholder: 'Ex.: D' },
            { name: 'bpm', label: 'BPM', type: 'number', half: true },
            { name: 'duracao', label: 'Duração', half: true, placeholder: 'Ex.: 5:12' },
            { name: 'status', label: 'Status', type: 'select', half: true, options: [
                { value: 'Planejada', label: 'Planejada' },
                { value: 'Em andamento', label: 'Em andamento' },
                { value: 'Pronta', label: 'Pronta' }
            ] },
            { name: 'estilo', label: 'Estilo', half: true, placeholder: 'Ex.: Worship' },
            { name: 'idioma', label: 'Idioma', half: true, placeholder: 'Ex.: Português' },
            { name: 'ano', label: 'Ano', type: 'number', half: true },
            { name: 'tags', label: 'Tags (separadas por vírgula)', placeholder: 'Ex.: Abertura, Vocal, Banda' },
            { name: 'desc', label: 'Descrição', type: 'textarea' },
            { name: 'sobre', label: 'Sobre a música', type: 'textarea', rows: 3, hint: 'Contexto geral para a equipe.' },
            { name: 'trecho', label: 'Trecho marcante', type: 'textarea', rows: 2 },
            { name: 'aplicacao', label: 'Aplicação no musical', type: 'textarea', rows: 2 },
            { name: 'letra', label: 'Letra', type: 'textarea', rows: 8, hint: 'Digite a letra com as quebras de linha conforme a música.' },
            { name: 'mapa', label: 'Mapa Vocal', type: 'textarea', rows: 6, hint: 'Divisão de naipe e vozes (ex.: Contralto: linha de abertura...).' }
        ];
        AdminKit.modal({
            title: ehNova ? 'Nova música' : 'Editar música',
            submitLabel: ehNova ? 'Criar música' : 'Salvar alterações',
            values: {
                capa: s.capa || '',
                nome: s.nome || '',
                artista: s.artista || '',
                compositor: s.compositor || '',
                cena: s.cena || '',
                tom: s.tom || '',
                bpm: s.bpm || 70,
                duracao: s.duracao || '',
                status: s.status || 'Planejada',
                estilo: s.estilo || '',
                idioma: s.idioma || 'Português',
                ano: s.ano || (new Date()).getFullYear(),
                tags: (s.tags || []).join(', '),
                desc: s.desc || '',
                sobre: s.sobre || '',
                trecho: s.trecho || '',
                aplicacao: s.aplicacao || '',
                letra: s.letra || '',
                mapa: s.mapa || ''
            },
            fields: campos
        }).then(function (valores) {
            if (!valores) return;
            valores.bpm = parseInt(valores.bpm, 10) || 0;
            valores.ano = parseInt(valores.ano, 10) || 0;
            valores.tags = String(valores.tags || '').split(',').map(function (t) { return t.trim(); }).filter(Boolean);
            if (ehNova) {
                var id = slugify(valores.nome);
                var usados = songs.map(function (m) { return m.id; });
                var base = id, n = 2;
                while (usados.indexOf(id) > -1) { id = base + '-' + n; n++; }
                valores.id = id;
                valores.grad = gradFor(id);
                valores.arquivos = valores.arquivos || [];
                AppDB.add('musicas', valores).then(function () {
                    AdminKit.toast('Música criada.', 'ok');
                });
            } else {
                AppDB.update('musicas', s._id, valores).then(function () {
                    AdminKit.toast('Música atualizada.', 'ok');
                });
            }
        });
    }

    var esc = function (s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    };

    return {
        get songs() { return songs; },
        get ids() { return songs.map(function (s) { return s.id; }); },
        byId: byId,
        coverHTML: coverHTML,
        arquivosHTML: arquivosHTML,
        tagsHTML: tagsHTML,
        statusClass: statusClass,
        esc: esc,
        slugify: slugify,
        gradFor: gradFor,
        formMusica: formMusica
    };
})();