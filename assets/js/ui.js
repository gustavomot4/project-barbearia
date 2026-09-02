/* ============================================================
   CASA NAVALHA — Camada de interface do SITE
   Usada por index.html (institucional) e agendar.html (reserva).
   O painel do proprietário (dashboard.html) NÃO carrega este
   arquivo: ele tem shell e estilos próprios.

   Todos os renderizadores são tolerantes à ausência do seu
   contêiner, então o mesmo script serve às duas páginas.

   O que saiu daqui no redesenho, e por quê:
   - depoimentos: os três tinham nota 5, o dado não separava nada;
   - ticker de vagas livres: somava 4 barbeiros × 7 dias e não
     respondia "tem horário para mim na quinta às 18h";
   - contadores animados do hero: nenhum deles muda a decisão de
     marcar ou não;
   - menu mobile em tela cheia e navegação por âncora: eram o
     remédio para uma página longa que deixou de existir.
   ============================================================ */

window.CN = window.CN || {};

CN.ui = (function () {

  var $  = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* ══════════════════════════════════════════════════════════
     IMAGENS — carregamento tardio + degradação elegante
     Se uma foto não carregar (offline, bloqueio de rede),
     trocamos por um fundo neutro em vez de deixar o ícone de
     imagem quebrada.
     ══════════════════════════════════════════════════════════ */
  function prepararImagem(img) {
    img.addEventListener('error', function () {
      img.style.display = 'none';
      var pai = img.parentElement;
      if (pai && !pai.classList.contains('img-fallback')) {
        pai.classList.add('img-fallback');
      }
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
     SEÇÕES DO INSTITUCIONAL
     ══════════════════════════════════════════════════════════ */

  /* O cardápio é a informação herói da página: nome, uma linha de
     diferença, preço e duração. A linha inteira é o link — assim o
     deep link ?servico= continua existindo sem um micro-botão
     "Agendar" repetido seis vezes.                              */
  function renderServicos() {
    var alvo = $('#services-list');
    if (!alvo) return;

    alvo.innerHTML = CN.catalogo.servicosAtivos().map(function (s) {
      return '' +
        '<a href="agendar.html?servico=' + encodeURIComponent(s.id) + '" class="svc-linha">' +
          '<span class="svc-linha__nome">' + CN.util.escapar(s.nome) + '</span>' +
          '<span class="svc-linha__preco">' + CN.util.moeda(s.preco) + '</span>' +
          '<span class="svc-linha__desc">' + CN.util.escapar(s.desc) + '</span>' +
          '<span class="svc-linha__dur">' + s.duracao + ' min</span>' +
        '</a>';
    }).join('');
  }

  /* Foto, nome, especialidade e folga.
     A folga fica: no agendamento o motivo de um dia bloqueado só
     existe como atributo title, que não abre no toque — sem ela o
     cliente que só pode na segunda conclui "agenda cheia" e sai. */
  function renderBarbeiros() {
    var alvo = $('#barbers-list');
    if (!alvo) return;

    alvo.innerHTML = CN.catalogo.barbeirosAtivos().map(function (b) {
      return '' +
        '<a href="agendar.html?barbeiro=' + encodeURIComponent(b.id) + '" class="barbeiro">' +
          '<img data-src="' + b.foto + '" alt="" class="barbeiro__foto" loading="lazy" />' +
          '<span class="min-w-0">' +
            '<span class="block font-medium">' + CN.util.escapar(b.nome) + '</span>' +
            '<span class="block apoio" style="font-size:var(--t4)">' + CN.util.escapar(b.especialidade) + '</span>' +
            '<span class="block fraco">Folga ' + CN.DIAS_SEMANA[b.folga].toLowerCase() + '</span>' +
          '</span>' +
        '</a>';
    }).join('');

    ativarLazy(alvo);
  }

  /* Três fotos de resultado. As de ambiente e ferramenta saíram:
     quem decide marcar quer ver o corte, não a cadeira.        */
  function renderGaleria() {
    var alvo = $('#gallery-grid');
    if (!alvo) return;

    alvo.innerHTML = CN.GALERIA.slice(0, 3).map(function (g) {
      return '<img data-src="' + g.src + '" alt="' + CN.util.escapar(g.legenda) + '" loading="lazy" />';
    }).join('');

    ativarLazy(alvo);
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

      /* O dia de hoje é marcado por PESO, não por cor: cor aqui
         gastaria o acento numa informação que não é ação.      */
      return '' +
        '<div class="flex items-center justify-between gap-4 py-1' + (ehHoje ? ' font-semibold' : '') + '">' +
          '<dt>' + rotulo + '</dt>' +
          '<dd class="tnum">' + g.texto + '</dd>' +
        '</div>';
    }).join('');
  }

  /* ══════════════════════════════════════════════════════════
     TOASTS
     Sem ícone e sem cor por tipo: a frase já diz o que aconteceu.
     ══════════════════════════════════════════════════════════ */
  function toast(mensagem) {
    var area = $('#toasts');
    if (!area) return;

    var el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.textContent = mensagem;
    area.appendChild(el);

    setTimeout(function () {
      el.classList.add('is-out');
      setTimeout(function () { el.remove(); }, 220);
    }, 3400);
  }

  /* ══════════════════════════════════════════════════════════
     HELPERS DE MODAL — travam o scroll
     ══════════════════════════════════════════════════════════ */
  function abrirOverlay(el) {
    el.classList.remove('hidden');
    document.body.classList.add('is-locked');
  }

  function fecharOverlay(el) {
    el.classList.add('hidden');
    var aindaAberto = $$('.overlay').some(function (o) {
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

    renderServicos();
    renderBarbeiros();
    renderGaleria();
    renderHorarios();

    ativarLazy();
  }

  return {
    init: init,
    $: $, $$: $$,
    toast: toast,
    abrirOverlay: abrirOverlay,
    fecharOverlay: fecharOverlay,
    ativarLazy: ativarLazy
  };
})();
