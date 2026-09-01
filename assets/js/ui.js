/* ============================================================
   CASA NAVALHA — Interface
   Navegação, animações de entrada, renderização das seções
   estáticas, imagens com fallback, toasts e helpers de modal.
   ============================================================ */

window.CN = window.CN || {};

CN.ui = (function () {

  var $  = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  var observadorReveal = null;

  /* ══════════════════════════════════════════════════════════
     IMAGENS — carregamento tardio + degradação elegante
     Se uma foto do Unsplash não carregar (offline, bloqueio de
     rede), trocamos por uma textura da marca em vez de deixar
     o ícone de imagem quebrada.
     ══════════════════════════════════════════════════════════ */
  function prepararImagem(img) {
    img.addEventListener('error', function () {
      img.style.display = 'none';
      var pai = img.parentElement;
      if (pai && !pai.classList.contains('img-fallback')) {
        pai.classList.add('img-fallback');
      }
    }, { once: true });

    img.addEventListener('load', function () {
      img.dataset.loaded = 'true';
    }, { once: true });
  }

  /* Troca data-src por src assim que o elemento se aproxima da viewport */
  function ativarLazy(raiz) {
    var alvos = $$('img[data-src]', raiz || document);
    if (!alvos.length) return;

    /* Uma mesma imagem pode ser vigiada por dois observadores (o da
       seção que acabou de ser renderizada e o global do init). Zeramos
       data-src ANTES de atribuir o src: a segunda chamada encontra o
       atributo vazio e desiste, em vez de fazer `src = undefined` e
       derrubar a foto no placeholder de erro.                          */
    var carregar = function (img) {
      var src = img.dataset.src;
      if (!src) return;
      img.removeAttribute('data-src');
      prepararImagem(img);
      img.src = src;
    };

    if (!('IntersectionObserver' in window)) {
      alvos.forEach(carregar);
      return;
    }

    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (e.isIntersecting) {
          carregar(e.target);
          obs.unobserve(e.target);
        }
      });
    }, { rootMargin: '300px' });

    alvos.forEach(function (img) { obs.observe(img); });
  }

  /* ══════════════════════════════════════════════════════════
     APARIÇÃO NO SCROLL
     ══════════════════════════════════════════════════════════ */
  function iniciarReveal() {
    if (!('IntersectionObserver' in window)) {
      $$('.reveal').forEach(function (el) { el.classList.add('is-in'); });
      return;
    }

    observadorReveal = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          observadorReveal.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

    observarReveals();
  }

  /* Reaplicado sempre que injetamos HTML novo na página */
  function observarReveals(raiz) {
    if (!observadorReveal) {
      $$('.reveal', raiz).forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    $$('.reveal', raiz).forEach(function (el) {
      if (!el.classList.contains('is-in')) observadorReveal.observe(el);
    });
  }

  /* ══════════════════════════════════════════════════════════
     CONTADORES DO HERO
     ══════════════════════════════════════════════════════════ */
  function iniciarContadores() {
    var alvos = $$('[data-count]');
    if (!alvos.length || !('IntersectionObserver' in window)) {
      alvos.forEach(function (el) { el.textContent = el.dataset.count + (el.dataset.suffix || ''); });
      return;
    }

    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (!e.isIntersecting) return;
        animarNumero(e.target);
        obs.unobserve(e.target);
      });
    }, { threshold: 0.6 });

    alvos.forEach(function (el) { obs.observe(el); });
  }

  function animarNumero(el) {
    var destino = parseFloat(el.dataset.count);
    var casas = parseInt(el.dataset.decimals || '0', 10);
    var sufixo = el.dataset.suffix || '';
    var duracao = 1400;
    var inicio = performance.now();

    function passo(agora) {
      var p = Math.min((agora - inicio) / duracao, 1);
      /* easeOutExpo — desacelera bonito no fim */
      var e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      var valor = destino * e;
      el.textContent = (casas ? valor.toFixed(casas) : Math.round(valor)) + sufixo;
      if (p < 1) requestAnimationFrame(passo);
    }
    requestAnimationFrame(passo);
  }

  /* ══════════════════════════════════════════════════════════
     HEADER + MENU MOBILE + SEÇÃO ATIVA
     ══════════════════════════════════════════════════════════ */
  function iniciarHeader() {
    var header = $('#site-header');

    var aoRolar = function () {
      header.classList.toggle('is-stuck', window.scrollY > 20);
    };
    window.addEventListener('scroll', aoRolar, { passive: true });
    aoRolar();

    /* Destaca no menu a seção visível */
    var secoes = ['inicio', 'servicos', 'equipe', 'agendar', 'galeria', 'contato'];
    if ('IntersectionObserver' in window) {
      var obs = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (e) {
          if (!e.isIntersecting) return;
          $$('.nav-link').forEach(function (l) {
            l.classList.toggle('is-active', l.getAttribute('href') === '#' + e.target.id);
          });
        });
      }, { rootMargin: '-45% 0px -50% 0px' });

      secoes.forEach(function (id) {
        var el = document.getElementById(id);
        if (el) obs.observe(el);
      });
    }
  }

  function iniciarMenuMobile() {
    var botao = $('#menu-toggle');
    var menu = $('#mobile-menu');
    if (!botao || !menu) return;

    function alternar(abrir) {
      var estaAberto = typeof abrir === 'boolean' ? abrir : !menu.classList.contains('is-open');
      menu.classList.toggle('is-open', estaAberto);
      botao.setAttribute('aria-expanded', String(estaAberto));
      botao.setAttribute('aria-label', estaAberto ? 'Fechar menu' : 'Abrir menu');
      document.body.classList.toggle('is-locked', estaAberto);
      $('#site-header').classList.toggle('is-menu-open', estaAberto);
    }

    botao.addEventListener('click', function () { alternar(); });

    /* Fecha ao escolher um destino */
    $$('#mobile-menu a, #mobile-menu button').forEach(function (el) {
      el.addEventListener('click', function () { alternar(false); });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) alternar(false);
    });
  }

  /* ══════════════════════════════════════════════════════════
     RENDERIZAÇÃO DAS SEÇÕES ESTÁTICAS
     ══════════════════════════════════════════════════════════ */

  function renderServicos() {
    var alvo = $('#services-grid');
    if (!alvo) return;

    alvo.innerHTML = CN.SERVICOS.map(function (s, i) {
      var tag = s.destaque
        ? '<span class="svc-card__tag">' + CN.util.escapar(s.destaque) + '</span>'
        : '';

      return '' +
        '<button type="button" class="svc-card bracket reveal" data-goto-service="' + s.id + '" style="--d:' + (i * 70) + 'ms">' +
          tag +
          '<div class="flex items-start justify-between gap-4">' +
            '<div class="min-w-0">' +
              '<h3 class="font-display uppercase text-xl tracking-wide leading-tight">' + CN.util.escapar(s.nome) + '</h3>' +
              '<p class="mt-3 text-sm text-bone-dim leading-relaxed">' + CN.util.escapar(s.desc) + '</p>' +
            '</div>' +
          '</div>' +
          '<div class="mt-7 flex items-end justify-between gap-4 pt-5 border-t border-white/[0.08]">' +
            '<div>' +
              '<span class="svc-card__price">' + CN.util.moeda(s.preco) + '</span>' +
              '<span class="block text-[10px] tracking-[0.2em] uppercase text-bone-faint mt-1.5">' + s.duracao + ' minutos</span>' +
            '</div>' +
            '<span class="inline-flex items-center gap-1.5 text-[10px] tracking-[0.2em] uppercase text-gold">' +
              'Agendar' +
              '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>' +
            '</span>' +
          '</div>' +
        '</button>';
    }).join('');

    /* Clicar num serviço já leva ao fluxo com ele pré-selecionado */
    $$('[data-goto-service]', alvo).forEach(function (btn) {
      btn.addEventListener('click', function () {
        CN.booking.selecionarServico(btn.dataset.gotoService);
        document.getElementById('agendar').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    observarReveals(alvo);
  }

  function renderBarbeiros() {
    var alvo = $('#barbers-grid');
    if (!alvo) return;

    alvo.innerHTML = CN.BARBEIROS.map(function (b, i) {
      return '' +
        '<article class="barber-card bracket reveal border border-white/10 bg-ink" style="--d:' + (i * 80) + 'ms">' +
          '<div class="relative aspect-[3/4] overflow-hidden bg-ink-600">' +
            '<img data-src="' + b.foto + '" alt="' + CN.util.escapar(b.nome) + '" class="w-full h-full object-cover" loading="lazy" />' +
            '<div class="absolute inset-0 bg-gradient-to-t from-ink via-ink/10 to-transparent"></div>' +
            '<span class="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-1 bg-ink/80 backdrop-blur text-[10px] text-gold">' +
              '<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z"/></svg>' +
              b.nota.toFixed(1) +
            '</span>' +
            '<div class="absolute bottom-0 inset-x-0 p-4">' +
              '<p class="text-[9px] tracking-ultra uppercase text-gold mb-1">' + CN.util.escapar(b.especialidade) + '</p>' +
              '<h3 class="font-display uppercase text-xl leading-none">' + CN.util.escapar(b.nome) + '</h3>' +
            '</div>' +
          '</div>' +
          '<div class="p-5">' +
            '<p class="text-sm text-bone-dim leading-relaxed min-h-[3.4rem]">' + CN.util.escapar(b.bio) + '</p>' +
            '<div class="mt-4 pt-4 border-t border-white/[0.08] flex items-center justify-between text-[10px] tracking-[0.16em] uppercase">' +
              '<span class="text-bone-faint">' + b.atendimentos.toLocaleString('pt-BR') + '+ atendimentos</span>' +
              '<button type="button" data-goto-barber="' + b.id + '" class="text-gold hover:underline underline-offset-4">Agendar</button>' +
            '</div>' +
            '<p class="mt-3 text-[10px] tracking-[0.14em] uppercase text-bone-faint">Folga: ' + CN.DIAS_SEMANA[b.folga].toLowerCase() + '</p>' +
          '</div>' +
        '</article>';
    }).join('');

    $$('[data-goto-barber]', alvo).forEach(function (btn) {
      btn.addEventListener('click', function () {
        CN.booking.selecionarBarbeiro(btn.dataset.gotoBarber);
        document.getElementById('agendar').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    ativarLazy(alvo);
    observarReveals(alvo);
  }

  function renderGaleria() {
    var alvo = $('#gallery-grid');
    if (!alvo) return;

    alvo.innerHTML = CN.GALERIA.map(function (g, i) {
      return '' +
        '<figure class="gal-item reveal ' + g.span + ' ' + g.ratio + '" style="--d:' + (i * 60) + 'ms">' +
          '<img data-src="' + g.src + '" alt="' + CN.util.escapar(g.legenda) + '" class="w-full h-full object-cover" loading="lazy" />' +
          '<figcaption>' + CN.util.escapar(g.legenda) + '</figcaption>' +
        '</figure>';
    }).join('');

    ativarLazy(alvo);
    observarReveals(alvo);
  }

  function renderDepoimentos() {
    var alvo = $('#testimonials-grid');
    if (!alvo) return;

    alvo.innerHTML = CN.DEPOIMENTOS.map(function (d, i) {
      var estrelas = '';
      for (var s = 0; s < d.nota; s++) {
        estrelas += '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z"/></svg>';
      }
      var iniciais = d.nome.split(' ').map(function (n) { return n[0]; }).slice(0, 2).join('');

      return '' +
        '<blockquote class="bracket reveal p-7 border border-white/10 bg-ink-800 flex flex-col" style="--d:' + (i * 90) + 'ms">' +
          '<div class="flex gap-1 text-gold mb-5">' + estrelas + '</div>' +
          '<p class="font-serif text-lg italic leading-relaxed text-bone flex-1">' + CN.util.escapar(d.texto) + '</p>' +
          '<footer class="mt-6 pt-5 border-t border-white/[0.08] flex items-center gap-3">' +
            '<span class="grid place-items-center w-10 h-10 border border-gold/30 font-serif text-gold text-sm">' + iniciais + '</span>' +
            '<span>' +
              '<cite class="not-italic block text-sm text-bone">' + CN.util.escapar(d.nome) + '</cite>' +
              '<span class="block text-[10px] tracking-[0.16em] uppercase text-bone-faint mt-0.5">' + CN.util.escapar(d.detalhe) + '</span>' +
            '</span>' +
          '</footer>' +
        '</blockquote>';
    }).join('');

    observarReveals(alvo);
  }

  function renderHorarios() {
    var alvo = $('#hours-list');
    if (!alvo) return;

    var hojeDow = new Date().getDay();

    /* Agrupa dias seguidos com o mesmo expediente (ter–sex, por ex.) */
    var ordem = [1, 2, 3, 4, 5, 6, 0];
    var grupos = [];

    ordem.forEach(function (dow) {
      var h = CN.HORARIOS[dow];
      var texto = h ? h.abre + ' — ' + h.fecha : 'Fechado';
      var ultimo = grupos[grupos.length - 1];
      if (ultimo && ultimo.texto === texto) {
        ultimo.dias.push(dow);
      } else {
        grupos.push({ texto: texto, dias: [dow] });
      }
    });

    alvo.innerHTML = grupos.map(function (g) {
      var rotulo = g.dias.length > 1
        ? CN.DIAS_CURTO[g.dias[0]] + ' – ' + CN.DIAS_CURTO[g.dias[g.dias.length - 1]]
        : CN.DIAS_SEMANA[g.dias[0]];
      var ehHoje = g.dias.indexOf(hojeDow) !== -1;
      var fechado = g.texto === 'Fechado';

      return '' +
        '<div class="flex items-center justify-between gap-4 ' + (ehHoje ? 'text-gold' : 'text-bone-dim') + '">' +
          '<dt class="flex items-center gap-2">' +
            (ehHoje ? '<span class="w-1.5 h-1.5 bg-gold rotate-45"></span>' : '') +
            rotulo +
          '</dt>' +
          '<dd class="' + (fechado ? 'text-bone-faint' : '') + ' font-variant-numeric tabular-nums">' + g.texto + '</dd>' +
        '</div>';
    }).join('');
  }

  /* Barra superior: mês corrente + vagas livres reais na semana */
  function renderTicker() {
    var mes = $('#ticker-month');
    var vagas = $('#ticker-slots');
    if (mes) mes.textContent = CN.MESES[new Date().getMonth()];
    if (vagas) vagas.textContent = CN.slots.totalLivresNaSemana();
  }

  /* ══════════════════════════════════════════════════════════
     TOASTS
     ══════════════════════════════════════════════════════════ */
  function toast(mensagem, tipo) {
    var area = $('#toasts');
    if (!area) return;

    var icones = {
      sucesso: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>',
      error:   '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16v.01"/></svg>',
      info:    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.01"/></svg>'
    };

    var el = document.createElement('div');
    el.className = 'toast toast--' + (tipo || 'sucesso');
    el.setAttribute('role', 'status');
    el.innerHTML = '<span class="shrink-0 text-gold">' + (icones[tipo] || icones.sucesso) + '</span><span>' + CN.util.escapar(mensagem) + '</span>';
    area.appendChild(el);

    setTimeout(function () {
      el.classList.add('is-out');
      el.addEventListener('animationend', function () { el.remove(); }, { once: true });
    }, 3600);
  }

  /* ══════════════════════════════════════════════════════════
     HELPERS DE MODAL — travam o scroll e devolvem o foco
     ══════════════════════════════════════════════════════════ */
  function abrirOverlay(el) {
    el.classList.remove('hidden');
    document.body.classList.add('is-locked');
    /* força um reflow para que a transição de entrada rode */
    void el.offsetWidth;
  }

  function fecharOverlay(el) {
    el.classList.add('hidden');
    /* Só libera o scroll se nenhum outro overlay continuar aberto */
    var aindaAberto = $$('#confirm-modal, #admin-panel').some(function (o) {
      return !o.classList.contains('hidden');
    });
    if (!aindaAberto) document.body.classList.remove('is-locked');
  }

  /* ══════════════════════════════════════════════════════════
     INICIALIZAÇÃO
     ══════════════════════════════════════════════════════════ */
  function init() {
    var ano = $('#year');
    if (ano) ano.textContent = new Date().getFullYear();

    iniciarHeader();
    iniciarMenuMobile();

    renderServicos();
    renderBarbeiros();
    renderGaleria();
    renderDepoimentos();
    renderHorarios();
    renderTicker();

    iniciarReveal();
    iniciarContadores();
    ativarLazy();

    /* O ticker acompanha novas reservas */
    CN.store.aoMudar(renderTicker);
  }

  return {
    init: init,
    $: $, $$: $$,
    toast: toast,
    abrirOverlay: abrirOverlay,
    fecharOverlay: fecharOverlay,
    observarReveals: observarReveals,
    ativarLazy: ativarLazy,
    renderTicker: renderTicker
  };
})();
