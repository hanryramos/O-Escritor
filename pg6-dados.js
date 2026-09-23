window.RC = (function () {

    var SC = window.SEED_CONFIG;
    var seed = (SC || []).filter(function (x) { return x._id === 'categorias_arquivos'; })[0];
    var categorias = (seed && seed.itens && seed.itens.length) ? seed.itens.slice() : ['Roteiro', 'Ensaios', 'Músicas', 'Figurino', 'Cenografia', 'Produção', 'Projeção', 'Referências', 'Administrativo'];

    var SEED_ARQUIVOS = [];

    var SEED_LINKS = [];

    var arquivos = SEED_ARQUIVOS.slice();
    var links = SEED_LINKS.slice();
    var guardas = [];

    function emitir() {
        guardas.forEach(function (fn) { try { fn(); } catch (e) {} });
    }

    if (window.AppDB) {
        AppDB.register('arquivos', SEED_ARQUIVOS);
        AppDB.register('links', SEED_LINKS);
        AppDB.onChange('arquivos', function (lista) { arquivos = lista; emitir(); });
        AppDB.onChange('links', function (lista) { links = lista; emitir(); });
        AppDB.onChange('config', function (lista) {
            var doc = (lista || []).filter(function (x) { return x._id === 'categorias_arquivos'; })[0];
            if (doc && doc.itens && doc.itens.length) {
                categorias = doc.itens.slice();
            }
            emitir();
        });
    }

    var tipos = {
        pdf:  { cls: 'ic-pdf',   icone: 'bxs-file-pdf',   label: 'PDF' },
        docx: { cls: 'ic-docx',  icone: 'bx-file-blank',  label: 'Word' },
        xlsx: { cls: 'ic-xlsx',  icone: 'bxs-spreadsheet', label: 'Excel' },
        mp3:  { cls: 'ic-mp3',   icone: 'bx-music',       label: 'Áudio' },
        pptx: { cls: 'ic-pptx',  icone: 'bx-slideshow',   label: 'Slides' },
        img:  { cls: 'ic-img',   icone: 'bx-image',       label: 'Imagem' },
        link: { cls: 'ic-link',  icone: 'bx-link',        label: 'Link' }
    };

    function fmtData(iso) {
        var p = iso.split('-');
        return p[2] + '/' + p[1] + '/' + p[0];
    }

    function contagem(categoria) {
        var n = 0;
        arquivos.forEach(function (a) { if (a.categoria === categoria) n++; });
        links.forEach(function (l) { if (l.categoria === categoria) n++; });
        return n;
    }

    var esc = function (s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    };

    return {
        get arquivos() { return arquivos; },
        get links() { return links; },
        get categorias() { return categorias; },
        tipos: tipos,
        contagem: contagem,
        fmtData: fmtData,
        esc: esc,
        onChange: function (fn) { guardas.push(fn); }
    };
})();