/* ============================================
   CONFIG GLOBAL — Dados editáveis pelo admin
   (categorias de tarefas e de arquivos/links)
============================================ */
window.SEED_CONFIG = [
    {
        _id: 'categorias_tarefas',
        itens: ['Repertório', 'Equipe', 'Figurino', 'Projeção', 'Som', 'Direção', 'Logística']
    },
    {
        _id: 'categorias_arquivos',
        itens: ['Roteiro', 'Ensaios', 'Músicas', 'Figurino', 'Cenografia', 'Produção', 'Projeção', 'Referências', 'Administrativo']
    }
];

if (window.AppDB) {
    AppDB.register('config', window.SEED_CONFIG);
}