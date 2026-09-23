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
        return '<span class="' + cls + ' ' + song.grad + '"><i class="bx bx-music"></i></span>';
    }

    function arquivosHTML(song, lista) {
        return (lista || song.arquivos || []).map(function (a) {
            return '<div class="file-row">' +
                '<i class="bx ' + a.icone + '"></i>' +
                '<span class="file-name">' + a.nome + '</span>' +
                '<span class="file-size">' + a.tam + '</span>' +
                '<button class="dl-btn" aria-label="Baixar ' + a.nome + '"><i class="bx bx-download"></i></button>' +
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
        gradFor: gradFor
    };
})();