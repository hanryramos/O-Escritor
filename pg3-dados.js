/* =====================================
   TAREFAS — DADOS
===================================== */

(function () {
    var respMap = {
        Gustavo: { init: 'GU', cor: 'p-bege' },
        Ana: { init: 'AN', cor: 'p-verde' },
        Mariana: { init: 'MA', cor: 'p-lilas' },
        Pedro: { init: 'PE', cor: 'p-azul' },
        Ravi: { init: 'RA', cor: 'p-rosa' },
        Sofia: { init: 'SO', cor: 'p-cinza' },
        Lucas: { init: 'LU', cor: 'p-dourado' }
    };

    var tasks = [];

    var CATS = ['Repertório', 'Equipe', 'Figurino', 'Projeção', 'Som', 'Direção', 'Logística'];

    function fmtData(iso) {
        var p = iso.split('-');
        return p[2] + '/' + p[1];
    }

    function esc(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function respOf(nome) {
        return respMap[nome] || { init: nome.slice(0, 2), cor: 'p-cinza' };
    }

    function statusCls(s) {
        if (s === 'Concluída') return 'st-concluida';
        if (s === 'Em atraso') return 'st-em-atraso';
        if (s === 'Em andamento') return 'st-em-andamento';
        return 'st-pendente';
    }

    function prioCls(p) {
        if (p === 'Alta') return 'pr-alta';
        if (p === 'Baixa') return 'pr-baixa';
        return 'pr-media';
    }

    function catClsOf(cat) {
        return 'cat-' + String(cat).toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    if (window.AppDB) {
        AppDB.register('tarefas', tasks);
    }

    window.pg3Dados = {
        tasks: tasks,
        respMap: respMap,
        CATS: CATS,
        fmtData: fmtData,
        esc: esc,
        respOf: respOf,
        statusCls: statusCls,
        prioCls: prioCls,
        catClsOf: catClsOf
    };
})();