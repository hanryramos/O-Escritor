/* ============================================
   PG4 · ENSAIOS — Dados do módulo
   (começa vazio; o administrador adiciona tudo)
============================================ */
window.SEED_ENSAIOS = [];

if (window.AppDB) {
    AppDB.register('ensaios', window.SEED_ENSAIOS);
}