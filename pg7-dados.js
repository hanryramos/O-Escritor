/* ============================================
   PG7 · EQUIPE — Dados do módulo
   (começa vazio; o administrador adiciona tudo:
    equipes primeiro, depois integrantes)
============================================ */
window.EQ = (function () {

    var corIndex = 0;
    var cores = ['av-0', 'av-1', 'av-2', 'av-3', 'av-4', 'av-5', 'av-6'];

    function proximaCor() {
        var c = cores[corIndex % cores.length];
        corIndex++;
        return c;
    }

    var SEED_MEMBROS = [];

    var SEED_EQUIPES = [];

    var membros = SEED_MEMBROS.slice();
    var equipes = SEED_EQUIPES.slice();

    if (window.AppDB) {
        AppDB.register('integrantes', SEED_MEMBROS);
        AppDB.register('equipes', SEED_EQUIPES);
        AppDB.onChange('integrantes', function (lista) {
            membros = lista;
        });
        AppDB.onChange('equipes', function (lista) {
            equipes = lista;
        });
    }

    function novaCor() {
        return cores[corIndex % cores.length];
    }

    function calculaResumo() {
        return {
            integrantes: membros.length,
            equipes: equipes.length,
            tarefas: membros.reduce(function (t, m) { return t + (m.tarefas || []).length; }, 0),
            ensaios: 0
        };
    }

    function mapaPorSlug() {
        var por = {};
        membros.forEach(function (m) { por[m.slug] = m; });
        return por;
    }

    var statusInfo = {
        ativo: { dot: 'st-ativo', label: 'Ativo' },
        ausente: { dot: 'st-ausente', label: 'Ausente' },
        inativo: { dot: 'st-inativo', label: 'Inativo' }
    };

    function esc(t) {
        var d = document.createElement('div');
        d.textContent = t;
        return d.innerHTML;
    }

    function inicias(nome) {
        var partes = String(nome || '').trim().split(/\s+/);
        if (!partes[0]) return '?';
        if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
        return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
    }

    function avatarHtml(m, tam) {
        var t = tam === 'md' ? 'av-md' : (tam === 'lg' ? 'av-lg' : '');
        return '<span class="avatar ' + m.cor + ' ' + t + '">' + inicias(m.nome) + '</span>';
    }

    function statusChip(m) {
        var s = statusInfo[m.status] || statusInfo.ativo;
        return '<span class="st-chip ' + s.dot + '"><i></i>' + s.label + '</span>';
    }

    function equipePorId(id) {
        for (var i = 0; i < equipes.length; i++) {
            if (equipes[i].id === id) return equipes[i];
        }
        return null;
    }

    function equipeNome(id) {
        var e = equipePorId(id);
        if (e) return e.nome;
        if (id === 'administracao') return 'Administração';
        if (!id) return '';
        return String(id).charAt(0).toUpperCase() + String(id).slice(1);
    }

    function membrosDaEquipe(id) {
        return membros.filter(function (m) {
            return (m.equipes || []).indexOf(id) > -1;
        });
    }

    return {
        get membros() { return membros; },
        get equipes() { return equipes; },
        get resumo() { return calculaResumo(); },
        get porId() { return mapaPorSlug(); },
        statusInfo: statusInfo,
        esc: esc,
        inicias: inicias,
        avatarHtml: avatarHtml,
        statusChip: statusChip,
        equipeNome: equipeNome,
        equipePorId: equipePorId,
        membrosDaEquipe: membrosDaEquipe,
        novaCor: novaCor
    };

})();