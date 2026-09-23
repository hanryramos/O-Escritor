/* =====================================
   loader.js — BARRA DE PROGRESSO GLOBAL
   Reage aos eventos appdb:start / appdb:end
   disparados pela camada de dados (AppDB).
===================================== */

window.PageLoader = (function () {

    var bar = null;
    var ativos = 0;
    var timer = null;

    function el() {
        if (!bar) {
            bar = document.createElement('div');
            bar.className = 'page-loader';
            document.body.appendChild(bar);
        }
        return bar;
    }

    function show() {
        ativos++;
        clearTimeout(timer);
        el().classList.add('on');
    }

    function hide() {
        ativos = Math.max(0, ativos - 1);
        if (ativos === 0) {
            clearTimeout(timer);
            timer = setTimeout(function () {
                el().classList.remove('on');
            }, 350);
        }
    }

    document.addEventListener('appdb:start', show);
    document.addEventListener('appdb:end', hide);

    return {
        show: show,
        hide: hide
    };
})();