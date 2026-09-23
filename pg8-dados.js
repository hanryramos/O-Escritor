/* ============================================
   PG8 · NOTIFICAÇÕES — Dados do módulo
   (começa vazio; o administrador adiciona tudo)
============================================ */
window.NTF = (function () {

    var tipos = {
        evento: { ic: 'bx bxs-calendar-event', cl: 'n-evento', nome: 'Eventos' },
        musica: { ic: 'bx bx-music', cl: 'n-musica', nome: 'Música' },
        tarefa: { ic: 'bx bx-check-square', cl: 'n-tarefa', nome: 'Tarefas' },
        equipe: { ic: 'bx bx-group', cl: 'n-equipe', nome: 'Equipe' },
        mencao: { ic: 'bx bx-at', cl: 'n-mencao', nome: 'Menções' },
        arquivo: { ic: 'bx bx-folder', cl: 'n-arquivo', nome: 'Arquivos' },
        sistema: { ic: 'bx bx-info-circle', cl: 'n-sistema', nome: 'Sistema' }
    };

    var pessoas = {
        ariadna: { init: 'A', cor: 'av-1' },
        marcus: { init: 'M', cor: 'av-3' },
        hanry: { init: 'H', cor: 'av-0' },
        laura: { init: 'L', cor: 'av-5' }
    };

    var SEED_LISTA = [];

    var lista = SEED_LISTA.slice();

    if (window.AppDB) {
        AppDB.register('notificacoes', SEED_LISTA);
        AppDB.onChange('notificacoes', function (nova) { lista = nova; });
    }

    var categorias = [
        { id: 'todos', nome: 'Todas', ic: 'bx bxs-circle', cl: 'f-todos' },
        { id: 'naolidas', nome: 'Não lidas', ic: 'bx bxs-dot', cl: 'f-naolidas' },
        { id: 'mencoes', nome: 'Menções', ic: 'bx bx-at', cl: 'f-mencao' },
        { id: 'tarefas', nome: 'Tarefas', ic: 'bx bx-check-square', cl: 'f-tarefa' },
        { id: 'eventos', nome: 'Eventos', ic: 'bx bx-calendar-event', cl: 'f-evento' },
        { id: 'arquivos', nome: 'Arquivos', ic: 'bx bx-folder', cl: 'f-arquivo' },
        { id: 'sistema', nome: 'Sistema', ic: 'bx bx-info-circle', cl: 'f-sistema' }
    ];

    function esc(t) {
        var d = document.createElement('div');
        d.textContent = t;
        return d.innerHTML;
    }

    function conta(id) {
        if (id === 'todos') return lista.length;
        if (id === 'naolidas') return lista.filter(function (n) { return !n.lida; }).length;
        return lista.filter(function (n) { return n.cats.indexOf(id) > -1; }).length;
    }

    return {
        get lista() { return lista; },
        tipos: tipos,
        categorias: categorias,
        pessoas: pessoas,
        conta: conta,
        esc: esc
    };

})();