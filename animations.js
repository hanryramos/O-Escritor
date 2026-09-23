(function () {
    const doc = document.documentElement;
    doc.classList.add('js-anim');

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) doc.classList.add('no-motion');

    const css = `
html.js-anim [data-anim]{opacity:0}
html.js-anim [data-anim="fadeUp"].in{animation:fadeUp .7s cubic-bezier(.22,.61,.36,1) var(--d,0s) both}
html.js-anim [data-anim="fadeIn"].in{animation:fadeIn .8s cubic-bezier(.22,.61,.36,1) var(--d,0s) both}
html.js-anim [data-anim="zoomIn"].in{animation:zoomIn .7s cubic-bezier(.22,.61,.36,1) var(--d,0s) both}
html.js-anim [data-anim="fadeIn"][data-float]{animation:fadeIn .8s ease var(--d,0s) both,var(--fl,float) 6s ease-in-out calc(var(--d,0s) + .8s) infinite}
html.js-anim [data-anim="fadeIn"][data-float="slow"]{animation:fadeIn .9s ease var(--d,0s) both,var(--fl,floatSlow) 9s ease-in-out calc(var(--d,0s) + .9s) infinite}
@keyframes fadeUp{from{opacity:0;transform:translateY(26px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes zoomIn{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:scale(1)}}
@keyframes slideInLeft{from{opacity:0;transform:translateX(-28px)}to{opacity:1;transform:translateX(0)}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-16px)}}
@keyframes floatSlow{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-24px) rotate(2.5deg)}}
@keyframes pulseDot{0%{transform:scale(1)}50%{transform:scale(1.3)}100%{transform:scale(1)}}
html.js-anim [data-pulse]{animation:pulseDot 2.2s ease-in-out 1s infinite}
html.js-anim .progress-fill[data-target]{width:0}
html.no-motion [data-anim],html.no-motion [data-float],html.no-motion [data-pulse],
html.no-motion *,html.no-motion *::before,html.no-motion *::after{animation:none!important;transition:none!important;opacity:1!important}
`;

    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    const animEls = document.querySelectorAll('[data-anim]');
    animEls.forEach(function (el, i) {
        const delay = el.getAttribute('data-delay') || (i * 0.06) + 's';
        el.style.setProperty('--d', delay);
        if (el.hasAttribute('data-float')) {
            el.style.setProperty('--fl', el.getAttribute('data-float') || 'float');
        }
    });

    if (!reduced) {
        document.querySelectorAll('[data-count]').forEach(function (el) { el.textContent = '0'; });
        const pv = document.querySelector('.progress-value');
        if (pv) pv.textContent = '0%';
    }

    function runCounter(el, target) {
        if (reduced) { el.textContent = target; return; }
        const duration = 1300;
        const start = performance.now();
        const tick = function (now) {
            const p = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            el.textContent = Math.round(target * eased);
            if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }

    const reveal = function () {
        animEls.forEach(function (el) { el.classList.add('in'); });
    };

    const runCounters = function () {
        document.querySelectorAll('[data-count]').forEach(function (el) {
            if (el.classList.contains('counted')) return;
            el.classList.add('counted');
            runCounter(el, parseFloat(el.getAttribute('data-count')));
        });
    };

    const runProgress = function () {
        const fill = document.querySelector('.progress-fill[data-target]');
        if (!fill) return;
        const target = parseFloat(fill.getAttribute('data-target'));
        const value = document.querySelector('.progress-value');
        if (reduced) {
            fill.style.width = target + '%';
            if (value) value.textContent = target + '%';
            return;
        }
        if (value) value.textContent = '0%';
        fill.style.transition = 'width 1.4s cubic-bezier(.22,.61,.36,1)';
        setTimeout(function () { fill.style.width = target + '%'; }, 350);
        if (value) {
            const duration = 1400;
            const start = performance.now();
            const tick = function (now) {
                const p = Math.min((now - start) / duration, 1);
                const eased = 1 - Math.pow(1 - p, 3);
                value.textContent = Math.round(target * eased) + '%';
                if (p < 1) requestAnimationFrame(tick);
            };
            setTimeout(function () { requestAnimationFrame(tick); }, 350);
        }
    };

    const ready = function () {
        setTimeout(reveal, 80);
        setTimeout(function () {
            runCounters();
            runProgress();
        }, 250);
    };

    if (document.readyState === 'complete') ready();
    else window.addEventListener('load', ready);

    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('backdrop');

    if (sidebar) {
        const open = document.getElementById('menuToggle');
        const close = document.getElementById('sidebarClose');

        function staggerMenu() {
            if (reduced) return;
            const els = sidebar.querySelectorAll('.sidebar-logo, .sidebar-menu a, .sidebar-quote');
            els.forEach(function (el, i) {
                el.style.animation = 'none';
                void el.offsetWidth;
                el.style.animation = 'slideInLeft .5s ' + (0.045 * i + 0.06) + 's both';
            });
        }

        function setSidebar(state) {
            sidebar.classList.toggle('open', state);
            if (backdrop) backdrop.classList.toggle('show', state);
            document.body.style.overflow = state ? 'hidden' : '';
            if (state) staggerMenu();
        }

        if (open) open.addEventListener('click', function () { setSidebar(true); });
        if (close) close.addEventListener('click', function () { setSidebar(false); });
        if (backdrop) backdrop.addEventListener('click', function () { setSidebar(false); });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') setSidebar(false);
        });
    }

    const notifBtn = document.querySelector('.notif-btn');
    if (notifBtn) {
        notifBtn.addEventListener('click', function () {
            if (window.location.pathname.indexOf('pg8.html') === -1) {
                window.location.href = 'pg8.html';
            }
        });
    }
})();