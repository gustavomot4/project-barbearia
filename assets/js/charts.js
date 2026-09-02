/* ============================================================
   CASA NAVALHA — Gráficos do painel
   SVG gerado à mão, sem nenhuma biblioteca externa.

   Em vez de esticar um viewBox fixo (o que distorce a espessura
   dos traços), medimos a largura real do contêiner e desenhamos
   em pixels. Um único observador de resize redesenha todos os
   gráficos registrados, mantendo tudo nítido em qualquer tela.
   ============================================================ */

window.CN = window.CN || {};

CN.charts = (function () {

  var NS = 'http://www.w3.org/2000/svg';
  var registrados = [];   /* [{ el, tipo, dados, opts }] */
  var seqGradiente = 0;

  function el(tag, attrs) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) {
      if (Object.prototype.hasOwnProperty.call(attrs, k)) n.setAttribute(k, attrs[k]);
    }
    return n;
  }

  /* Largura utilizável do contêiner (com um piso para o caso de o
     elemento ainda estar oculto quando o gráfico é montado).      */
  function largura(container, minimo) {
    var w = container.clientWidth;
    return w > 40 ? w : (minimo || 320);
  }

  /* ---------- Tooltip compartilhado por gráfico ---------- */
  function montarTooltip(container) {
    if (getComputedStyle(container).position === 'static') {
      container.style.position = 'relative';
    }
    var tip = container.querySelector('.chart-tip');
    if (!tip) {
      tip = document.createElement('div');
      tip.className = 'chart-tip';
      tip.style.cssText =
        'position:absolute;pointer-events:none;opacity:0;transition:opacity .15s;' +
        'padding:6px 9px;background:var(--ds-ink);color:var(--ds-paper);border:0;' +
        'font-size:12px;white-space:nowrap;transform:translate(-50%,-115%);z-index:5;' +
        'box-shadow:0 10px 24px -14px rgba(22,22,26,.6)';
      container.appendChild(tip);
    }
    return tip;
  }

  function mostrarTooltip(tip, x, y, html) {
    tip.innerHTML = html;
    tip.style.left = x + 'px';
    tip.style.top = y + 'px';
    tip.style.opacity = '1';
  }
  function esconderTooltip(tip) { tip.style.opacity = '0'; }

  /* ══════════════════════════════════════════════════════════
     GRÁFICO DE LINHA — evolução do faturamento
     dados: [{ rotulo, valor, atual }]
     ══════════════════════════════════════════════════════════ */
  function linha(container, dados, opts) {
    opts = opts || {};
    var altura = opts.altura || 190;
    var padT = 18, padB = opts.semRotulos ? 8 : 26, padL = 6, padR = 6;

    var w = largura(container);
    var h = altura;
    var areaW = w - padL - padR;
    var areaH = h - padT - padB;

    container.innerHTML = '';
    var tip = montarTooltip(container);

    var svg = el('svg', { class: 'chart-svg', width: w, height: h, viewBox: '0 0 ' + w + ' ' + h });

    var valores = dados.map(function (d) { return d.valor; });
    var max = Math.max.apply(null, valores);
    var min = Math.min.apply(null, valores);
    /* Folga de 12% para a linha não encostar nas bordas */
    var teto = max + (max - min || max) * 0.12;
    var piso = Math.max(0, min - (max - min || max) * 0.25);

    var px = function (i) { return padL + (dados.length === 1 ? areaW / 2 : (areaW * i) / (dados.length - 1)); };
    var py = function (v) { return padT + areaH - ((v - piso) / (teto - piso || 1)) * areaH; };

    /* Grade horizontal discreta */
    for (var g = 0; g <= 2; g++) {
      var gy = padT + (areaH * g) / 2;
      svg.appendChild(el('line', { class: 'chart-grid', x1: padL, y1: gy, x2: w - padR, y2: gy }));
    }

    /* Área sob a curva */
    var idGrad = 'grad-linha-' + (++seqGradiente);
    var defs = el('defs');
    var grad = el('linearGradient', { id: idGrad, x1: '0', y1: '0', x2: '0', y2: '1' });
    grad.appendChild(el('stop', { offset: '0%',   'stop-color': '#8A8781', 'stop-opacity': '0.28' }));
    grad.appendChild(el('stop', { offset: '100%', 'stop-color': '#8A8781', 'stop-opacity': '0' }));
    defs.appendChild(grad);
    svg.appendChild(defs);

    var dLinha = dados.map(function (d, i) { return (i ? 'L' : 'M') + px(i) + ' ' + py(d.valor); }).join(' ');
    var dArea = dLinha + ' L' + px(dados.length - 1) + ' ' + (padT + areaH) + ' L' + px(0) + ' ' + (padT + areaH) + ' Z';

    svg.appendChild(el('path', { d: dArea, fill: 'url(#' + idGrad + ')' }));
    svg.appendChild(el('path', { class: 'chart-line', d: dLinha }));

    /* Pontos, rótulos do eixo X e área sensível ao mouse */
    dados.forEach(function (d, i) {
      var cx = px(i), cy = py(d.valor);

      svg.appendChild(el('circle', {
        class: 'chart-dot' + (d.atual ? ' chart-dot--atual' : ''),
        cx: cx, cy: cy, r: d.atual ? 4 : 2.6
      }));

      if (!opts.semRotulos) {
        var t = el('text', {
          class: 'chart-label', x: cx, y: h - 6,
          'text-anchor': i === 0 ? 'start' : (i === dados.length - 1 ? 'end' : 'middle')
        });
        t.textContent = d.rotulo;
        svg.appendChild(t);
      }

      /* Faixa invisível: facilita acertar o ponto com o mouse */
      var faixa = el('rect', {
        x: cx - areaW / (dados.length * 2), y: 0,
        width: areaW / dados.length, height: h,
        fill: 'transparent', style: 'cursor:pointer'
      });
      faixa.addEventListener('mouseenter', function () {
        mostrarTooltip(tip, cx, cy, '<strong>' +
          (opts.formatar ? opts.formatar(d.valor) : CN.util.moeda(d.valor)) +
          '</strong><br><span style="opacity:.7">' + CN.util.escapar(d.rotuloLongo || d.rotulo) + '</span>');
      });
      faixa.addEventListener('mouseleave', function () { esconderTooltip(tip); });
      svg.appendChild(faixa);
    });

    container.appendChild(svg);
  }

  /* ══════════════════════════════════════════════════════════
     GRÁFICO DE BARRAS
     dados: [{ rotulo, valor, atual }]
     ══════════════════════════════════════════════════════════ */
  function barras(container, dados, opts) {
    opts = opts || {};
    var altura = opts.altura || 150;
    var padT = 12, padB = opts.semRotulos ? 6 : 22, padL = 2, padR = 2;

    var w = largura(container);
    var h = altura;
    var areaW = w - padL - padR;
    var areaH = h - padT - padB;

    container.innerHTML = '';
    var tip = montarTooltip(container);

    var svg = el('svg', { class: 'chart-svg', width: w, height: h, viewBox: '0 0 ' + w + ' ' + h });

    var max = Math.max.apply(null, dados.map(function (d) { return d.valor; })) || 1;
    var vaoTotal = areaW / dados.length;
    var larguraBarra = Math.max(4, vaoTotal * (opts.densa ? 0.55 : 0.42));

    dados.forEach(function (d, i) {
      var altBarra = Math.max(2, (d.valor / max) * areaH);
      var x = padL + vaoTotal * i + (vaoTotal - larguraBarra) / 2;
      var y = padT + areaH - altBarra;

      var barra = el('rect', {
        class: 'chart-bar' + (d.atual ? ' chart-bar--atual' : ''),
        x: x, y: y, width: larguraBarra, height: altBarra
      });
      barra.addEventListener('mouseenter', function () {
        mostrarTooltip(tip, x + larguraBarra / 2, y,
          '<strong>' +
          (opts.formatar ? opts.formatar(d.valor) : CN.util.moeda(d.valor)) +
          '</strong><br><span style="opacity:.7">' + CN.util.escapar(d.rotuloLongo || d.rotulo) + '</span>');
      });
      barra.addEventListener('mouseleave', function () { esconderTooltip(tip); });
      svg.appendChild(barra);

      if (!opts.semRotulos) {
        var t = el('text', { class: 'chart-label', x: x + larguraBarra / 2, y: h - 5, 'text-anchor': 'middle' });
        t.textContent = d.rotulo;
        svg.appendChild(t);
      }
    });

    container.appendChild(svg);
  }

  /* ══════════════════════════════════════════════════════════
     SPARKLINE — linha minúscula, sem eixos, para dentro de KPIs
     valores: [number]
     ══════════════════════════════════════════════════════════ */
  function sparkline(container, valores, opts) {
    opts = opts || {};
    var h = opts.altura || 44;
    var w = largura(container, 140);

    container.innerHTML = '';
    var svg = el('svg', { class: 'chart-svg', width: w, height: h, viewBox: '0 0 ' + w + ' ' + h });

    var max = Math.max.apply(null, valores);
    var min = Math.min.apply(null, valores);
    var faixa = (max - min) || max || 1;

    var px = function (i) { return (w * i) / (valores.length - 1 || 1); };
    var py = function (v) { return h - 4 - ((v - min) / faixa) * (h - 10); };

    var d = valores.map(function (v, i) { return (i ? 'L' : 'M') + px(i) + ' ' + py(v); }).join(' ');

    var idGrad = 'grad-spark-' + (++seqGradiente);
    var defs = el('defs');
    var grad = el('linearGradient', { id: idGrad, x1: '0', y1: '0', x2: '0', y2: '1' });
    grad.appendChild(el('stop', { offset: '0%',   'stop-color': '#8A8781', 'stop-opacity': '0.3' }));
    grad.appendChild(el('stop', { offset: '100%', 'stop-color': '#8A8781', 'stop-opacity': '0' }));
    defs.appendChild(grad);
    svg.appendChild(defs);

    svg.appendChild(el('path', { d: d + ' L' + px(valores.length - 1) + ' ' + h + ' L0 ' + h + ' Z', fill: 'url(#' + idGrad + ')' }));
    svg.appendChild(el('path', { class: 'chart-line', d: d, 'stroke-width': '1.5' }));
    svg.appendChild(el('circle', {
      class: 'chart-dot--atual', cx: px(valores.length - 1), cy: py(valores[valores.length - 1]),
      r: 3, fill: '#16161A'
    }));

    container.appendChild(svg);
  }

  /* ══════════════════════════════════════════════════════════
     RANKING — barras horizontais em HTML (mais legível que SVG
     quando o rótulo é um nome comprido)
     itens: [{ rotulo, valor, cor, extra }]
     ══════════════════════════════════════════════════════════ */
  function ranking(container, itens, opts) {
    opts = opts || {};
    if (!itens.length) {
      container.innerHTML = '<p class="ds-empty" style="padding:1.5rem">' +
        CN.util.escapar(opts.vazio || 'Sem dados no período.') + '</p>';
      return;
    }

    var max = Math.max.apply(null, itens.map(function (i) { return i.valor; })) || 1;

    container.innerHTML = itens.map(function (i) {
      return '' +
        '<div class="rank-row">' +
          '<span style="font-size:var(--ds-t3)">' + CN.util.escapar(i.rotulo) + '</span>' +
          '<span class="tnum forte" style="font-size:var(--ds-t3)">' +
            (opts.formatar ? opts.formatar(i.valor) : CN.util.moeda(i.valor)) +
          '</span>' +
          (i.extra ? '<span style="grid-column:1/-1;font-size:var(--ds-t4);color:var(--ds-ink-3);margin-top:-2px">' + CN.util.escapar(i.extra) + '</span>' : '') +
          '<span class="rank-track"><span class="rank-fill" style="width:' +
            ((i.valor / max) * 100).toFixed(1) + '%"></span></span>' +
        '</div>';
    }).join('');
    /* A largura vai direto no HTML. A versão anterior a aplicava num
       requestAnimationFrame para animar o preenchimento, mas quando o
       contêiner era redesenhado no mesmo quadro (troca de rota chama
       CN.charts.redesenhar) as barras nasciam e morriam em zero.    */
  }

  /* ══════════════════════════════════════════════════════════
     REGISTRO E REDESENHO
     Guardamos a receita de cada gráfico para poder redesenhar
     com as dimensões novas quando a janela muda de tamanho —
     ou quando uma aba oculta finalmente aparece.
     ══════════════════════════════════════════════════════════ */
  var construtores = { linha: linha, barras: barras, sparkline: sparkline, ranking: ranking };

  function desenhar(container, tipo, dados, opts) {
    if (!container) return;
    var existente = registrados.find(function (r) { return r.el === container; });
    if (existente) {
      existente.tipo = tipo; existente.dados = dados; existente.opts = opts;
    } else {
      registrados.push({ el: container, tipo: tipo, dados: dados, opts: opts });
    }
    construtores[tipo](container, dados, opts);
  }

  /* Redesenha os que estão visíveis (offsetParent nulo = oculto) */
  function redesenhar() {
    registrados.forEach(function (r) {
      if (r.el.isConnected && r.el.offsetParent !== null) {
        construtores[r.tipo](r.el, r.dados, r.opts);
      }
    });
  }

  var timer = null;
  window.addEventListener('resize', function () {
    clearTimeout(timer);
    timer = setTimeout(redesenhar, 160);
  });

  return {
    desenhar: desenhar,
    redesenhar: redesenhar,
    linha: linha, barras: barras, sparkline: sparkline, ranking: ranking
  };
})();
