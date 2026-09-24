/* =====================================
   AdminKit — COMPONENTES DE ADMIN
   Pronto quando window.AppAuth.ready.
===================================== */

window.AdminKit = (function () {

    var estado = { isAdmin: false, user: null };

    /* ---------- UTIL ---------- */

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function ready() {
        return window.AppAuth.ready;
    }

    function ehAdmin() {
        return estado.isAdmin;
    }

    /* ---------- TOAST ---------- */

    function toast(msg, tipo) {
        var el = document.createElement('div');
        el.className = 'toast';
        el.textContent = msg;
        if (tipo === 'ok') el.style.background = 'linear-gradient(120deg, #4C9E6A, #2F6B45)';
        if (tipo === 'erro') el.style.background = 'linear-gradient(120deg, #C0483B, #7E2A21)';
        document.body.appendChild(el);
        setTimeout(function () { el.classList.add('show'); }, 20);
        setTimeout(function () {
            el.classList.remove('show');
            setTimeout(function () { el.remove(); }, 320);
        }, 2400);
    }

    /* ---------- GUARDA ---------- */

    function guard(handler, acaoLabel) {
        return function (e) {
            if (!estado.isAdmin) {
                if (e && e.preventDefault) e.preventDefault();
                toast('Função disponível apenas para administradores.');
                return;
            }
            return handler(e);
        };
    }

    /* ---------- MODAL DE FORMULÁRIO ---------- */

    function compactarImagem(file, ok, err) {
        var leitor = new FileReader();
        leitor.onerror = function () { err && err(new Error('Falha ao ler o arquivo.')); };
        leitor.onload = function () {
            var img = new Image();
            img.onerror = function () { err && err(new Error('Arquivo não é uma imagem válida.')); };
            img.onload = function () {
                var MAX = 1000;
                var esc = Math.min(1, MAX / Math.max(img.width, img.height));
                var w = Math.max(1, Math.round(img.width * esc));
                var h = Math.max(1, Math.round(img.height * esc));
                var c = document.createElement('canvas');
                c.width = w;
                c.height = h;
                c.getContext('2d').drawImage(img, 0, 0, w, h);
                ok(c.toDataURL('image/jpeg', 0.82));
            };
            img.src = leitor.result;
        };
        leitor.readAsDataURL(file);
    }

    function campoHTML(f, valor) {
        var val = valor == null ? (f.value == null ? '' : f.value) : valor;
        var id = 'admF_' + f.name;
        var inner = '';

        if (f.type === 'select') {
            inner = '<select id="' + id + '" name="' + f.name + '">' +
                (f.options || []).map(function (o) {
                    var v = (o && o.value != null) ? o.value : o;
                    var l = (o && o.label != null) ? o.label : o;
                    return '<option value="' + esc(v) + '"' + (String(v) === String(val) ? ' selected' : '') + '>' + esc(l) + '</option>';
                }).join('') +
                '</select>';
        } else if (f.type === 'textarea') {
            inner = '<textarea id="' + id + '" name="' + f.name + '" placeholder="' + esc(f.placeholder || '') + '"' +
                (f.rows ? ' rows="' + f.rows + '"' : '') + '>' + esc(val) + '</textarea>';
        } else if (f.type === 'file') {
            var tem = !!val;
            inner = '<div class="adm-file">' +
                '<span class="adm-file-prev' + (tem ? ' has-img' : '') + '">' +
                (tem ? '<img src="' + esc(val) + '" alt="">' : '<i class="bx bx-image-add"></i>') +
                '</span>' +
                '<span class="adm-file-mid">' +
                '<label class="adm-btn">' + esc(f.botao || 'Escolher imagem') +
                '<input type="file" accept="image/*" data-destino="' + esc(f.name) + '" hidden></label>' +
                '<button type="button" class="adm-btn link" data-limpar="' + esc(f.name) + '"' + (tem ? '' : ' style="display:none"') + '>Remover</button>' +
                '</span>' +
                '<input type="hidden" name="' + esc(f.name) + '" id="' + id + '" value="' + esc(val) + '">' +
                '</div>';
        } else {
            inner = '<input id="' + id + '" name="' + f.name + '" type="' + (f.type || 'text') + '" value="' + esc(val) +
                '" placeholder="' + esc(f.placeholder || '') + '"' + (f.required ? ' required' : '') + '>';
        }

        return '<div class="adm-field" data-nome="' + f.name + '"><label for="' + id + '">' + esc(f.label || f.name) + '</label>' + inner +
            (f.hint ? '<small class="adm-field-hint">' + esc(f.hint) + '</small>' : '') + '</div>';
    }

    function ligarCampoArquivo(ov) {
        function aplicar(nome, dataUrl, tem) {
            var hidden = ov.querySelector('input[name="' + nome + '"]');
            if (!hidden) return;
            hidden.value = dataUrl || '';
            var prev = ov.querySelector('.adm-file-prev');
            if (prev) {
                prev.innerHTML = tem ? '<img src="' + dataUrl + '" alt="">' : '<i class="bx bx-image-add"></i>';
                prev.classList.toggle('has-img', !!tem);
            }
            var limpar = ov.querySelector('[data-limpar="' + nome + '"]');
            if (limpar) limpar.style.display = tem ? '' : 'none';
        }

        ov.querySelectorAll('input[type="file"][data-destino]').forEach(function (fi) {
            fi.addEventListener('change', function () {
                var nome = fi.getAttribute('data-destino');
                var file = fi.files && fi.files[0];
                if (!file) return;
                if (!/^image\//.test(file.type)) {
                    toast('Envie um arquivo de imagem.');
                    fi.value = '';
                    return;
                }
                compactarImagem(file, function (dataUrl) {
                    aplicar(nome, dataUrl, true);
                }, function () {
                    toast('Não foi possível ler a imagem.');
                    fi.value = '';
                });
            });
        });

        ov.querySelectorAll('[data-limpar]').forEach(function (b) {
            b.addEventListener('click', function () {
                aplicar(b.getAttribute('data-limpar'), '', false);
            });
        });
    }

    function modal(opts) {
        return new Promise(function (resolve) {
            var fields = opts.fields || [];
            var values = opts.values || {};

            // agrupa campos marcados como half em pares
            var agrupado = '';
            var i = 0;
            while (i < fields.length) {
                if (fields[i].half && fields[i + 1] && fields[i + 1].half) {
                    agrupado += '<div class="adm-grid-2">' + campoHTML(fields[i], values[fields[i].name]) + campoHTML(fields[i + 1], values[fields[i + 1].name]) + '</div>';
                    i += 2;
                } else {
                    agrupado += campoHTML(fields[i], values[fields[i].name]);
                    i += 1;
                }
            }

            var ov = document.createElement('div');
            ov.className = 'adm-overlay';
            ov.innerHTML =
                '<div class="adm-modal adm-modal-form">' +
                '<div class="adm-modal-head"><h3>' + esc(opts.title || 'Editar') + '</h3>' +
                '<button type="button" data-fechar><i class="bx bx-x"></i></button></div>' +
                '<form class="adm-form"><div class="adm-modal-body">' + agrupado + '</div>' +
                '<div class="adm-actions">' +
                '<button type="button" class="adm-btn" data-fechar>Cancelar</button>' +
                '<button type="submit" class="adm-btn primary"><i class="bx bx-check"></i> ' + esc(opts.submitLabel || 'Salvar') + '</button>' +
                '</div></form>' +
                '</div>';

            document.body.appendChild(ov);
            setTimeout(function () { ov.classList.add('show'); }, 20);
            ligarCampoArquivo(ov);

            var primeiro = ov.querySelector('input, select, textarea');
            if (primeiro) setTimeout(function () { primeiro.focus(); }, 120);

            function fechar(res) {
                ov.classList.remove('show');
                setTimeout(function () { ov.remove(); }, 260);
                document.removeEventListener('keydown', onKey);
                resolve(res);
            }

            function onKey(e) { if (e.key === 'Escape') fechar(null); }
            document.addEventListener('keydown', onKey);

            ov.querySelectorAll('[data-fechar]').forEach(function (b) {
                b.addEventListener('click', function () { fechar(null); });
            });
            ov.addEventListener('click', function (e) { if (e.target === ov) fechar(null); });

            ov.querySelector('form').addEventListener('submit', function (e) {
                e.preventDefault();
                var dados = {};
                fields.forEach(function (f) {
                    var el = ov.querySelector('[name="' + f.name + '"]');
                    var v = el ? el.value : '';
                    if ((f.type === 'number') && v !== '') v = Number(v);
                    dados[f.name] = v;
                });
                var invalido = fields.some(function (f) { return f.required && !String(dados[f.name] || '').trim(); });
                if (invalido) {
                    toast('Preencha os campos obrigatórios.');
                    return;
                }
                fechar(dados);
            });
        });
    }

    /* ---------- CONFIRMAÇÃO ---------- */

    function confirmar(opts) {
        return new Promise(function (resolve) {
            var ov = document.createElement('div');
            ov.className = 'adm-overlay adm-confirm';
            ov.innerHTML =
                '<div class="adm-modal">' +
                '<div class="adm-modal-head"><h3>' + esc(opts.title || 'Confirmar') + '</h3>' +
                '<button type="button" data-fechar><i class="bx bx-x"></i></button></div>' +
                '<div class="adm-confirm-msg"><i class="' + (opts.icon || 'bx bx-error-circle') + '"></i>' + esc(opts.message || 'Tem certeza?') + '</div>' +
                '<div class="adm-actions">' +
                '<button type="button" class="adm-btn" data-fechar>Cancelar</button>' +
                '<button type="button" class="adm-btn ' + (opts.danger ? 'danger' : 'primary') + '" data-ok>' + esc(opts.confirmLabel || 'Confirmar') + '</button>' +
                '</div>' +
                '</div>';

            document.body.appendChild(ov);
            setTimeout(function () { ov.classList.add('show'); }, 20);

            function fechar(res) {
                ov.classList.remove('show');
                setTimeout(function () { ov.remove(); }, 260);
                document.removeEventListener('keydown', onKey);
                resolve(res);
            }
            function onKey(e) { if (e.key === 'Escape') fechar(false); }
            document.addEventListener('keydown', onKey);

            ov.querySelectorAll('[data-fechar]').forEach(function (b) {
                b.addEventListener('click', function () { fechar(false); });
            });
            ov.querySelector('[data-ok]').addEventListener('click', function () { fechar(true); });
            ov.addEventListener('click', function (e) { if (e.target === ov) fechar(false); });
        });
    }

    /* ---------- IDENTIDADE / APARÊNCIA ---------- */

    function aplicarAparencia() {
        document.body.classList.toggle('is-admin', estado.isAdmin);

        if (!estado.isAdmin) return;

        var nomeEl = document.getElementById('profileName');
        if (nomeEl && !nomeEl.parentNode.querySelector('.admin-badge')) {
            var badge = document.createElement('span');
            badge.className = 'admin-badge';
            badge.innerHTML = '<i class="bx bx-shield-quarter"></i>Admin';
            nomeEl.insertAdjacentElement('afterend', badge);
        }

        var roleSpan = document.querySelector('.profile-info span');
        if (roleSpan) roleSpan.textContent = 'Administrador';
        var cargo = document.querySelector('.hero-cargo');
        if (cargo) cargo.textContent = 'Administrador';

        if (!document.querySelector('.admin-mode-flag')) {
            var flag = document.createElement('div');
            flag.className = 'admin-mode-flag';
            flag.innerHTML = '<i class="bx bx-shield-quarter"></i> Modo administrador';
            document.body.appendChild(flag);
        }
    }

    /* ---------- INICIALIZAÇÃO ---------- */

    ready().then(function (a) {
        estado.isAdmin = !!(a && a.isAdmin);
        estado.user = a && a.user;
        aplicarAparencia();
    });

    return {
        ready: ready,
        isAdmin: ehAdmin,
        estado: estado,
        guard: guard,
        toast: toast,
        modal: modal,
        confirm: confirmar,
        esc: esc,
        onReady: function (fn) {
            return ready().then(fn);
        }
    };
})();
