/* ============================================
   PG2 · EVENTOS — Dados do módulo
   (começa vazio; o administrador adiciona tudo)
============================================ */
window.SEED_EVENTOS = [];

if (window.AppDB) {
    AppDB.register('eventos', window.SEED_EVENTOS);
}