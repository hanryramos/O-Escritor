/* =====================================
   ONBOARDING — PRIMEIRO ACESSO
   Mostra um cartão no primeiro login para
   a pessoa preencher: nome, equipes,
   personagem e um breve resumo.
   Salva tudo em AppDB 'perfil'.
===================================== */

(function () {

    if (!window.AppDB || !window.AppAuth) return;

    var overlay = null;
    var SKIP_KEY = 'musical_onb_skip';
    var REABRIR_EM = 24 * 60 * 60 * 1000;

    /* O cartão volta em TODA visita enquanto o perfil estiver incompleto:
       faltando a equipe (quando existem equipes cadastradas) ou, se a pessoa
       se diz ator, faltando dizer qual personagem é. */
    function perfilCompleto(per, existeEquipes) {
        if (!per) return false;
        if (existeEquipes) {
            var temEq = Array.isArray(per.equipes) && per.equipes.some(function (e) { return String(e || '').trim(); });
            if (!temEq) return false;
        }
        var pd = String(per.personagem || '').trim();
        if (per.temPersonagem === true) return !!pd;
        if (per.temPersonagem === false) return true;
        return !!pd;
    }

    function registrarDescartar() {
        try { localStorage.setItem(SKIP_KEY, String(Date.now())); } catch (e) { }
    }

    function deveMostrar() {
        try {
            var salvo = parseInt(localStorage.getItem(SKIP_KEY), 10);
            if (salvo && (Date.now() - salvo) < REABRIR_EM) return false;
        } catch (e) { }
        return true;
    }

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function toast(msg) {
        if (window.AdminKit) { AdminKit.toast(msg, 'ok'); return; }
        var t = document.createElement('div');
        t.className = 'toast';
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(function () { t.classList.add('show'); }, 20);
        setTimeout(function () {
            t.classList.remove('show');
            setTimeout(function () { t.remove(); }, 320);
        }, 2400);
    }

    function fechar() {
        registrarDescartar();
        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
        overlay = null;
        document.body.style.overflow = '';
    }

    function hoje() {
        var d = new Date();
        return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
    }

    function chavePerfil() {
        var e = (window.AppAuth && window.AppAuth.user && window.AppAuth.user.email) || '';
        if (!e) return 'perfil';
        return 'perfil_' + String(e).toLowerCase().replace(/[^a-z0-9]+/g, '_');
    }

    function montar(perfil, equipes, personagens) {
        var userNome = '';
        var userEmail = '';
        if (window.AppAuth && window.AppAuth.user) {
            userNome = window.AppAuth.user.displayName || '';
            userEmail = window.AppAuth.user.email || '';
        }
        var valorNome = (perfil && perfil.nome) ? perfil.nome : userNome;

        var eqsHTML = '';
        if (equipes && equipes.length) {
            eqsHTML = equipes.map(function (eq) {
                var nome = eq.nome || eq.id || '';
                return '<label class="onb-eq"><input type="checkbox" value="' + esc(nome) + '"><span>' + esc(nome) + '</span></label>';
            }).join('');
        } else {
            eqsHTML = '<p class="onb-empty">Nenhuma equipe cadastrada ainda — as equipes aparecem aqui assim que o administrador criá-las.</p>';
        }

        var personagemHTML = '';
        if (personagens && personagens.length) {
            personagemHTML = '<select id="onbQualPersonagem" disabled>' +
                '<option value="">Selecione um personagem...</option>' +
                personagens.map(function (p) {
                    var n = p.nome || p.id || '';
                    return '<option value="' + esc(n) + '">' + esc(n) + '</option>';
                }).join('') +
                '</select>';
        } else {
            personagemHTML = '<input type="text" id="onbQualPersonagem" placeholder="Nenhum personagem cadastrado ainda — escreva aqui" disabled>';
        }

        var ehAtor = !!(perfil && (perfil.temPersonagem === true || (perfil.personagem && String(perfil.personagem).trim())));

        overlay = document.createElement('div');
        overlay.className = 'onboarding-overlay';
        overlay.innerHTML =
            '<div class="onboarding-card">' +
            '<button type="button" class="onb-fechar" data-fechar aria-label="Fechar"><i class="bx bx-x"></i></button>' +
            '<div class="onb-topo">' +
            '<span class="onb-selo"><i class="bx bx-star"></i>Boas-vindas</span>' +
            '<h2>Bem-vindo ao Musical Escritor!</h2>' +
            '<p class="onb-intro">Este é o espaço da equipe: agenda de ensaios, tarefas, repertório, equipe e muito mais. Antes de começar, conte um pouco sobre você.</p>' +
            '</div>' +
            '<div class="onb-corpo">' +
            '<label class="onb-campo"><span>Seu nome</span><input type="text" id="onbNome" value="' + esc(valorNome) + '" placeholder="Como quer ser chamado(a)"></label>' +
            '<div class="onb-campo"><span>Equipes que você faz parte <i>(pode marcar mais de uma)</i></span>' +
            '<div class="onb-equipes">' + eqsHTML + '</div></div>' +
            '<div class="onb-campo"><span>Você representa algum personagem?</span>' +
            '<div class="onb-personagem">' +
            '<label><input type="radio" name="onbPersonagem" value="sim"' + (ehAtor ? ' checked' : '') + '> Sim</label>' +
            '<label><input type="radio" name="onbPersonagem" value="nao"' + (ehAtor ? '' : ' checked') + '> Não</label>' +
            '</div>' +
            personagemHTML + '</div>' +
            '<label class="onb-campo"><span>Breve resumo sobre você</span>' +
            '<textarea id="onbResumo" rows="3" placeholder="Ex.: soprano, integra o corpo de dança, chegou ao projeto em 2025..."></textarea></label>' +
            '</div>' +
            '<div class="onb-acoes">' +
            '<button type="button" class="onb-btn onb-ghost" data-fechar>Agora não</button>' +
            '<button type="button" class="onb-btn onb-primario" data-salvar><i class="bx bx-check"></i> Concluir</button>' +
            '</div>' +
            '</div>';

        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';
        setTimeout(function () { overlay.classList.add('show'); }, 40);

        var qual = overlay.querySelector('#onbQualPersonagem');
        var rSim = overlay.querySelector('input[name="onbPersonagem"][value="sim"]');
        var rNao = overlay.querySelector('input[name="onbPersonagem"][value="nao"]');

        function atualizaPersonagem() {
            qual.disabled = !(rSim && rSim.checked);
            if (qual.disabled) qual.value = '';
        }
        rSim.addEventListener('change', atualizaPersonagem);
        rNao.addEventListener('change', atualizaPersonagem);

        overlay.querySelectorAll('[data-fechar]').forEach(function (b) {
            b.addEventListener('click', fechar);
        });

        var salvarBtn = overlay.querySelector('[data-salvar]');
        salvarBtn.addEventListener('click', function () {
            var nomeEl = overlay.querySelector('#onbNome');
            var nome = (nomeEl.value || '').trim() || userNome || (userEmail ? userEmail.split('@')[0] : '') || 'Integrante';

            var selecionadas = overlay.querySelectorAll('.onb-eq input:checked');
            var equipes = [];
            Array.prototype.forEach.call(selecionadas, function (el) {
                var v = (el.value || '').trim();
                if (v) equipes.push(v);
            });

            var personagem = (rSim && rSim.checked) ? (qual.value || '').trim() : '';

            var patch = {
                nome: nome,
                email: userEmail || (perfil && perfil.email) || '',
                equipes: equipes,
                personagem: personagem,
                temPersonagem: !!(rSim && rSim.checked),
                sobre: (overlay.querySelector('#onbResumo').value || '').trim(),
                entrada: (perfil && perfil.entrada) || hoje(),
                onboarded: true
            };

            salvarBtn.disabled = true;
            var concluir = function () {
                fechar();
                toast('Boas-vindas! Seu perfil foi concluído.');
            };

            var chave = chavePerfil();
            if (perfil && perfil._id) {
                window.AppDB.update('perfil', chave, patch).then(concluir).catch(function () { salvarBtn.disabled = false; });
            } else {
                patch._id = chave;
                window.AppDB.add('perfil', patch).then(concluir).catch(function () { salvarBtn.disabled = false; });
            }
        });
    }

    window.AppAuth.ready.then(function () {
        var chave = chavePerfil();
        var per = null;
        window.AppDB.load('perfil').then(function (lista) {
            (lista || []).forEach(function (p) {
                if (p._id === chave) per = p;
            });
            return Promise.all([
                Promise.resolve(per),
                window.AppDB.load('equipes'),
                window.AppDB.load('personagens')
            ]);
        }).then(function (d) {
            var perf = d[0];
            var equipes = d[1] || [];
            var personagens = d[2] || [];
            var existeEquipes = equipes.length > 0;
            if (perf && perfilCompleto(perf, existeEquipes)) return;
            montar(perf, equipes, personagens);
        });
    });

})();