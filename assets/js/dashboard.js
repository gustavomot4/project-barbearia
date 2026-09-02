/* ============================================================
   CASA NAVALHA — Painel de gestão (dashboard.html)

   Aplicação de tela única com roteamento por hash:
     #/dashboard  #/agenda  #/servicos  #/financas
     #/barbeiros  #/clientes  #/configuracoes

   Lê e escreve nos mesmos dados do site (CN.store / CN.catalogo),
   então tudo que o dono muda aqui aparece no agendamento — e
   todo agendamento feito pelo site aparece aqui.
   ============================================================ */

window.CN = window.CN || {};

CN.dashboard = (function () {

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* Estado da interface (não persiste — é só navegação) */
  var ui = {
    rota: 'dashboard',
    agendaData: CN.util.hojeISO(),
    agendaModo: 'dia',        /* 'dia' | 'semana' */
    filtroServico: 'todos',
    buscaCliente: '',
    servicoEmEdicao: null,
    confirmarAcao: null
  };

  var TITULOS = {
    dashboard:     ['Dashboard',      'Visão geral do negócio'],
    agenda:        ['Agenda Geral',   'Todos os barbeiros, lado a lado'],
    servicos:      ['Serviços',       'Cardápio, preços e duração'],
    financas:      ['Finanças',       'Faturamento, custos e comissões'],
    barbeiros:     ['Barbeiros',      'Equipe e desempenho'],
    clientes:      ['Clientes',       'Base construída pelos agendamentos'],
    configuracoes: ['Configurações',  'Dados do negócio e do sistema']
  };

  /* ══════════════════════════════════════════════════════════
     NOTIFICAÇÕES
     ══════════════════════════════════════════════════════════ */
  function toast(mensagem, tipo) {
    var area = $('#ds-toasts');
    if (!area) return;

    var icones = {
      sucesso: '<path d="M20 6L9 17l-5-5"/>',
      erro:    '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16v.01"/>',
      info:    '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.01"/>'
    };
    var cores = { sucesso: '#C9A24A', erro: '#C97C72', info: '#8FA9C4' };
    var t = tipo || 'sucesso';

    var n = document.createElement('div');
    n.className = 'ds-toast ds-toast--' + t;
    n.setAttribute('role', 'status');
    n.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="' + cores[t] + '" stroke-width="2" style="flex-shrink:0">' +
        icones[t] + '</svg>' +
      '<span>' + CN.util.escapar(mensagem) + '</span>';
    area.appendChild(n);

    setTimeout(function () {
      n.classList.add('is-out');
      n.addEventListener('animationend', function () { n.remove(); }, { once: true });
    }, 3400);
  }

  /* ══════════════════════════════════════════════════════════
     MODAIS
     ══════════════════════════════════════════════════════════ */
  function abrirModal(id) {
    var m = $(id);
    if (!m) return;
    m.hidden = false;
    document.body.classList.add('is-locked');
    requestAnimationFrame(function () { m.classList.add('is-in'); });
  }

  function fecharModal(id) {
    var m = $(id);
    if (!m) return;
    m.classList.remove('is-in');
    setTimeout(function () {
      m.hidden = true;
      var algumAberto = $$('.ds-modal').some(function (x) { return !x.hidden; });
      if (!algumAberto) document.body.classList.remove('is-locked');
    }, 260);
  }

  /* Confirmação reutilizável — substitui o confirm() do navegador
     por um diálogo com a cara do sistema.                         */
  function confirmar(opcoes, aoConfirmar) {
    $('#confirmar-titulo').textContent = opcoes.titulo;
    $('#confirmar-texto').innerHTML = opcoes.texto;
    var btn = $('#confirmar-ok');
    btn.textContent = opcoes.rotulo || 'Confirmar';
    btn.className = 'ds-btn ' + (opcoes.perigo ? 'ds-btn--danger' : 'ds-btn--gold');
    ui.confirmarAcao = aoConfirmar;
    abrirModal('#modal-confirmar');
  }

  /* ══════════════════════════════════════════════════════════
     ROTEAMENTO
     ══════════════════════════════════════════════════════════ */
  function irPara(rota) {
    if (!TITULOS[rota]) rota = 'dashboard';
    ui.rota = rota;

    $$('.ds-view').forEach(function (v) { v.hidden = v.dataset.view !== rota; });
    $$('.ds-nav-item').forEach(function (n) {
      n.classList.toggle('is-active', n.dataset.rota === rota);
      if (n.dataset.rota === rota) n.setAttribute('aria-current', 'page');
      else n.removeAttribute('aria-current');
    });

    $('#topbar-titulo').textContent = TITULOS[rota][0];
    $('#topbar-sub').textContent = TITULOS[rota][1];

    fecharDrawer();
    renderRotaAtual();

    /* Gráficos só medem certo quando a aba está visível */
    requestAnimationFrame(function () { CN.charts.redesenhar(); });
  }

  function renderRotaAtual() {
    var mapa = {
      dashboard: renderVisaoGeral,
      agenda: renderAgenda,
      servicos: renderServicos,
      financas: renderFinancas,
      barbeiros: renderBarbeiros,
      clientes: renderClientes,
      configuracoes: renderConfiguracoes
    };
    (mapa[ui.rota] || renderVisaoGeral)();
    renderBadges();
  }

  /* Contador de hoje ao lado de "Agenda Geral" */
  function renderBadges() {
    var badge = $('#badge-agenda');
    if (!badge) return;
    var n = CN.store.doDia(CN.util.hojeISO()).length;
    badge.textContent = n;
    badge.style.display = n ? '' : 'none';
  }

  /* ══════════════════════════════════════════════════════════
     TELA 1 — DASHBOARD
     ══════════════════════════════════════════════════════════ */
  function renderVisaoGeral() {
    var fin = CN.store.financeiro();
    var est = CN.store.estatisticas();
    var hoje = CN.util.hojeISO();

    /* --- Card de faturamento --- */
    $('#kpi-faturamento').textContent = CN.util.moeda(fin.faturamento);

    var delta = $('#kpi-faturamento-delta');
    var sinal = fin.variacao >= 0 ? 'up' : 'down';
    delta.className = 'ds-delta ds-delta--' + (Math.abs(fin.variacao) < 0.05 ? 'flat' : sinal);
    delta.innerHTML =
      (Math.abs(fin.variacao) < 0.05 ? '' :
        '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">' +
        (sinal === 'up' ? '<path d="M12 19V5M5 12l7-7 7 7"/>' : '<path d="M12 5v14M19 12l-7 7-7-7"/>') +
        '</svg>') +
      (fin.variacao >= 0 ? '+' : '') + fin.variacao.toFixed(1) + '%';

    $('#kpi-faturamento-foot').textContent =
      'vs. ' + fin.serie[fin.serie.length - 2].rotulo + ' · ' + fin.atendimentosMes + ' atendimentos no mês';

    CN.charts.desenhar($('#spark-faturamento'), 'sparkline',
      fin.serie.map(function (m) { return m.valor; }), { altura: 46 });

    /* --- Card de lucro bruto --- */
    $('#kpi-lucro').textContent = CN.util.moeda(fin.lucroBruto);
    $('#kpi-lucro-foot').textContent =
      'Margem fictícia de ' + Math.round(fin.margem * 100) + '% sobre o faturamento';

    CN.charts.desenhar($('#bar-lucro'), 'barras',
      fin.serie.map(function (m) {
        return { rotulo: m.rotulo, valor: Math.round(m.valor * fin.margem), atual: !!m.atual };
      }),
      { altura: 64, semRotulos: true, densa: true });

    /* --- Card de próximos agendamentos --- */
    var deHoje = CN.store.doDia(hoje).filter(function (a) { return a.status === 'agendado'; })
      .sort(function (a, b) { return a.hora.localeCompare(b.hora); });

    $('#kpi-hoje').textContent = deHoje.length;

    var agoraMin = new Date().getHours() * 60 + new Date().getMinutes();
    var proximo = deHoje.find(function (a) { return CN.util.minutos(a.hora) >= agoraMin; });

    $('#kpi-hoje-foot').textContent = proximo
      ? 'Próximo às ' + proximo.hora + ' — ' + proximo.cliente.split(' ')[0]
      : (deHoje.length ? 'Todos os horários de hoje já passaram' : 'Nenhum horário marcado para hoje');

    /* --- Card de ocupação --- */
    $('#kpi-ocupacao').textContent = est.ocupacao + '%';
    $('#kpi-ocupacao-barra').style.width = est.ocupacao + '%';
    $('#kpi-ocupacao-foot').textContent = 'Ticket médio de ' + CN.util.moeda(est.ticket);

    /* --- Gráfico grande de faturamento --- */
    CN.charts.desenhar($('#chart-faturamento'), 'linha',
      fin.serie.map(function (m) {
        return { rotulo: m.rotulo, valor: m.valor, atual: !!m.atual,
                 rotuloLongo: m.atual ? m.rotulo + ' (mês corrente)' : m.rotulo };
      }),
      { altura: 210 });

    /* --- Serviços mais vendidos --- */
    CN.charts.desenhar($('#rank-servicos'), 'ranking',
      fin.porServico.slice(0, 5).map(function (s) {
        return { rotulo: s.nome, valor: s.total, extra: s.qtd + (s.qtd === 1 ? ' atendimento' : ' atendimentos') };
      }),
      { vazio: 'Nenhum serviço vendido neste mês ainda. Use "Popular demo" nas Configurações.' });

    /* --- Lista dos próximos atendimentos --- */
    var lista = $('#lista-hoje');
    if (!deHoje.length) {
      lista.innerHTML = estadoVazio('calendario', 'Agenda livre hoje',
        'Quando um cliente reservar pelo site, o horário aparece aqui.');
    } else {
      lista.innerHTML = deHoje.slice(0, 6).map(function (a) {
        var s = CN.util.servicoPorId(a.servicoId);
        var b = CN.util.barbeiroPorId(a.barbeiroId);
        var passou = CN.util.minutos(a.hora) < agoraMin;

        return '' +
          '<button type="button" data-evento="' + a.id + '" class="w-full flex items-center gap-4 px-5 py-3.5 border-b border-white/[0.06] last:border-0 hover:bg-white/[0.025] transition-colors text-left' + (passou ? ' opacity-50' : '') + '">' +
            '<span class="tnum font-display text-xl shrink-0" style="color:' + (b ? b.cor : '#C9A24A') + '">' + a.hora + '</span>' +
            '<span class="flex-1 min-w-0">' +
              '<span class="block text-sm font-medium truncate">' + CN.util.escapar(a.cliente) + '</span>' +
              '<span class="block text-xs text-[color:var(--ds-faint)] truncate">' +
                CN.util.escapar(s ? s.nome : '—') + ' · ' + CN.util.escapar(b ? b.nome.split(' ')[0] : '—') +
              '</span>' +
            '</span>' +
            '<span class="tnum text-sm shrink-0" style="color:var(--ds-gold)">' + CN.util.moeda(a.preco) + '</span>' +
          '</button>';
      }).join('');

      ligarEventos(lista);
    }
  }

  /* ══════════════════════════════════════════════════════════
     TELA 2 — AGENDA GERAL
     Grade com uma coluna por barbeiro (visão de dia) ou uma
     coluna por dia da semana (visão de semana).
     ══════════════════════════════════════════════════════════ */
  function renderAgenda() {
    /* Cabeçalho de navegação */
    var d = CN.util.fromISO(ui.agendaData);
    var rotulo;

    if (ui.agendaModo === 'dia') {
      rotulo = ui.agendaData === CN.util.hojeISO()
        ? 'Hoje · ' + CN.util.dataExtenso(ui.agendaData)
        : CN.util.dataExtenso(ui.agendaData);
    } else {
      var ini = CN.util.inicioDaSemana(d);
      var fim = CN.util.addDias(ini, 6);
      /* Quando a semana cruza a virada do mês, o rótulo precisa dizer
         os dois meses — senão "31 a 6 de setembro" engana. */
      rotulo = ini.getMonth() === fim.getMonth()
        ? 'Semana de ' + ini.getDate() + ' a ' + fim.getDate() + ' de ' + CN.MESES[fim.getMonth()]
        : 'Semana de ' + ini.getDate() + ' de ' + CN.MESES_CURTO[ini.getMonth()] +
          ' a ' + fim.getDate() + ' de ' + CN.MESES_CURTO[fim.getMonth()];
    }
    $('#agenda-rotulo').textContent = rotulo;

    $$('#agenda-modos .ds-chip').forEach(function (c) {
      c.classList.toggle('is-active', c.dataset.modo === ui.agendaModo);
    });

    if (ui.agendaModo === 'dia') renderAgendaDia();
    else renderAgendaSemana();
  }

  /* Faixa de horários que a grade precisa cobrir num conjunto de dias */
  function janelaDeHorarios(datas) {
    var abre = null, fecha = null;
    datas.forEach(function (iso) {
      var e = CN.slots.expediente(iso);
      if (!e) return;
      var a = CN.util.minutos(e.abre), f = CN.util.minutos(e.fecha);
      abre = abre === null ? a : Math.min(abre, a);
      fecha = fecha === null ? f : Math.max(fecha, f);
    });
    return abre === null ? null : { abre: abre, fecha: fecha };
  }

  /* Linhas de fundo + coluna de horários, comuns às duas visões */
  function esqueletoGrade(janela, passo, alturaLinha) {
    var linhas = (janela.fecha - janela.abre) / passo;
    var altura = linhas * alturaLinha;

    var tempos = '';
    for (var i = 0; i <= linhas; i++) {
      var min = janela.abre + i * passo;
      var cheia = min % 60 === 0;
      tempos += '<div class="cal-time' + (cheia ? ' cal-time--hora' : '') + '" style="height:' + alturaLinha + 'px">' +
                  (cheia || linhas <= 14 ? CN.util.paraHora(min) : '') +
                '</div>';
    }

    var fundo = '';
    for (var j = 0; j <= linhas; j++) {
      var m = janela.abre + j * passo;
      fundo += '<span class="cal-line' + (m % 60 === 0 ? '' : ' cal-line--meia') +
               '" style="top:' + (j * alturaLinha) + 'px"></span>';
    }

    return { linhas: linhas, altura: altura, tempos: tempos, fundo: fundo };
  }

  /* Marcador da hora atual, se o dia mostrado for hoje */
  function marcadorAgora(iso, janela, alturaLinha, passo) {
    if (iso !== CN.util.hojeISO()) return '';
    var agora = new Date();
    var min = agora.getHours() * 60 + agora.getMinutes();
    if (min < janela.abre || min > janela.fecha) return '';
    var top = ((min - janela.abre) / passo) * alturaLinha;
    return '<span class="cal-now" style="top:' + top.toFixed(1) + 'px"></span>';
  }

  function renderAgendaDia() {
    var alvo = $('#agenda-grade');
    var iso = ui.agendaData;
    var expediente = CN.slots.expediente(iso);

    if (!expediente) {
      alvo.innerHTML = estadoVazio('fechado', 'Barbearia fechada',
        CN.util.dataExtenso(iso) + ' não tem expediente. Ajuste em Configurações.');
      return;
    }

    var barbeiros = CN.catalogo.barbeirosAtivos();
    if (!barbeiros.length) {
      alvo.innerHTML = estadoVazio('equipe', 'Nenhum barbeiro ativo', 'Reative alguém na aba Barbeiros.');
      return;
    }

    var PASSO = 30;
    var ALTURA = 46;
    var janela = { abre: CN.util.minutos(expediente.abre), fecha: CN.util.minutos(expediente.fecha) };
    var esq = esqueletoGrade(janela, PASSO, ALTURA);
    var agendamentos = CN.store.doDia(iso);
    var dow = CN.util.fromISO(iso).getDay();

    var cabecalho = '<div class="cal-head__cell"></div>' + barbeiros.map(function (b) {
      var folga = b.folga === dow;
      var doDia = agendamentos.filter(function (a) { return a.barbeiroId === b.id; });
      var receita = doDia.reduce(function (s, a) { return s + (a.preco || 0); }, 0);

      return '' +
        '<div class="cal-head__cell">' +
          '<div class="flex items-center gap-2.5">' +
            '<span class="ds-avatar w-8 h-8 text-xs" style="border-color:' + b.cor + '55">' +
              (b.foto ? '<img src="' + b.foto + '" alt="" loading="lazy" />' : CN.util.iniciais(b.nome)) +
            '</span>' +
            '<span class="min-w-0">' +
              '<span class="block text-xs font-semibold truncate">' + CN.util.escapar(b.nome.split(' ')[0]) + '</span>' +
              '<span class="block text-[10px] truncate" style="color:var(--ds-faint)">' +
                (folga ? 'Folga hoje' : doDia.length + ' · ' + CN.util.moeda(receita)) +
              '</span>' +
            '</span>' +
          '</div>' +
        '</div>';
    }).join('');

    var colunas = barbeiros.map(function (b) {
      var folga = b.folga === dow;
      var eventos = agendamentos
        .filter(function (a) { return a.barbeiroId === b.id; })
        .map(function (a) { return blocoEvento(a, janela, ALTURA, PASSO, b.cor); })
        .join('');

      return '<div class="cal-col' + (folga ? ' cal-col--folga' : '') + '" style="height:' + esq.altura + 'px">' +
               esq.fundo + eventos +
             '</div>';
    }).join('');

    alvo.innerHTML =
      '<div class="cal" style="--cal-cols:' + barbeiros.length + '">' +
        '<div class="cal-head">' + cabecalho + '</div>' +
        '<div class="cal-body">' +
          '<div class="cal-times" style="height:' + esq.altura + 'px">' + esq.tempos + '</div>' +
          colunas +
          marcadorAgora(iso, janela, ALTURA, PASSO) +
        '</div>' +
      '</div>';

    ligarEventos(alvo);
  }

  function renderAgendaSemana() {
    var alvo = $('#agenda-grade');
    var inicio = CN.util.inicioDaSemana(CN.util.fromISO(ui.agendaData));

    var dias = [];
    for (var i = 0; i < 7; i++) dias.push(CN.util.toISO(CN.util.addDias(inicio, i)));

    var janela = janelaDeHorarios(dias);
    if (!janela) {
      alvo.innerHTML = estadoVazio('fechado', 'Semana sem expediente', 'Nenhum dia desta semana está aberto.');
      return;
    }

    var PASSO = 30;
    var ALTURA = 34;   /* linhas mais baixas: 7 colunas cabem melhor */
    var esq = esqueletoGrade(janela, PASSO, ALTURA);
    var hoje = CN.util.hojeISO();

    var cabecalho = '<div class="cal-head__cell"></div>' + dias.map(function (iso) {
      var d = CN.util.fromISO(iso);
      var fechado = !CN.slots.expediente(iso);
      var qtd = CN.store.doDia(iso).length;
      var ehHoje = iso === hoje;

      return '' +
        '<div class="cal-head__cell' + (ehHoje ? ' bg-white/[0.03]' : '') + '">' +
          '<div class="text-[9px] tracking-[0.2em] uppercase" style="color:' + (ehHoje ? 'var(--ds-gold)' : 'var(--ds-faint)') + '">' +
            CN.DIAS_CURTO[d.getDay()] +
          '</div>' +
          '<div class="flex items-baseline gap-2 mt-0.5">' +
            '<span class="font-display text-lg leading-none">' + d.getDate() + '</span>' +
            (fechado
              ? '<span class="text-[10px]" style="color:var(--ds-faint)">fechado</span>'
              : '<span class="text-[10px]" style="color:var(--ds-faint)">' + qtd + '</span>') +
          '</div>' +
        '</div>';
    }).join('');

    var colunas = dias.map(function (iso) {
      var fechado = !CN.slots.expediente(iso);
      var eventos = CN.store.doDia(iso).map(function (a) {
        var b = CN.util.barbeiroPorId(a.barbeiroId);
        return blocoEvento(a, janela, ALTURA, PASSO, b ? b.cor : '#C9A24A', true);
      }).join('');

      return '<div class="cal-col' + (fechado ? ' cal-col--folga' : '') + '" style="height:' + esq.altura + 'px">' +
               esq.fundo + eventos +
             '</div>';
    }).join('');

    alvo.innerHTML =
      '<div class="cal" style="--cal-cols:7">' +
        '<div class="cal-head">' + cabecalho + '</div>' +
        '<div class="cal-body">' +
          '<div class="cal-times" style="height:' + esq.altura + 'px">' + esq.tempos + '</div>' +
          colunas +
        '</div>' +
      '</div>';

    ligarEventos(alvo);
  }

  /* Um bloquinho de agendamento posicionado na coluna */
  function blocoEvento(a, janela, alturaLinha, passo, cor, compacto) {
    var ini = CN.util.minutos(a.hora);
    var top = ((ini - janela.abre) / passo) * alturaLinha;
    var alt = Math.max(alturaLinha - 3, ((a.duracao || 30) / passo) * alturaLinha - 3);

    var s = CN.util.servicoPorId(a.servicoId);
    var fim = CN.util.paraHora(ini + (a.duracao || 30));
    var b = CN.util.barbeiroPorId(a.barbeiroId);

    var titulo = a.cliente + ' · ' + (s ? s.nome : '—') + ' · ' + a.hora + '–' + fim +
                 (b ? ' · ' + b.nome : '');

    /* Na visão semanal o espaço é curto: mostramos hora + primeiro nome */
    var conteudo = compacto
      ? '<div class="cal-event__hora">' + a.hora + '</div>' +
        '<div class="cal-event__nome" style="font-size:.6875rem">' + CN.util.escapar(a.cliente.split(' ')[0]) + '</div>'
      : '<div class="cal-event__hora">' + a.hora + ' – ' + fim + '</div>' +
        '<div class="cal-event__nome">' + CN.util.escapar(a.cliente) + '</div>' +
        (alt > 58 ? '<div class="cal-event__svc">' + CN.util.escapar(s ? s.nome : '—') + '</div>' : '');

    return '' +
      '<button type="button" data-evento="' + a.id + '" title="' + CN.util.escapar(titulo) + '"' +
        ' class="cal-event' + (a.status === 'concluido' ? ' is-concluido' : '') + '"' +
        ' style="--cor:' + cor + ';top:' + top.toFixed(1) + 'px;height:' + alt.toFixed(1) + 'px">' +
        conteudo +
      '</button>';
  }

  /* Clique num bloco ou numa linha da lista abre o detalhe */
  function ligarEventos(raiz) {
    $$('[data-evento]', raiz).forEach(function (btn) {
      btn.addEventListener('click', function () { abrirDetalhe(btn.dataset.evento); });
    });
  }

  function abrirDetalhe(id) {
    var a = CN.store.porId(id);
    if (!a) return;

    var s = CN.util.servicoPorId(a.servicoId);
    var b = CN.util.barbeiroPorId(a.barbeiroId);
    var fim = CN.util.paraHora(CN.util.minutos(a.hora) + (a.duracao || 30));
    var rotulos = { agendado: 'Agendado', concluido: 'Concluído', cancelado: 'Cancelado' };

    $('#evento-titulo').textContent = a.cliente;
    $('#evento-badge').className = 'ds-badge ds-badge--' + a.status;
    $('#evento-badge').textContent = rotulos[a.status];

    $('#evento-corpo').innerHTML = [
      { r: 'Serviço',  v: (s ? s.nome : '—') + ' · ' + (a.duracao || 30) + ' min' },
      { r: 'Barbeiro', v: b ? b.nome : '—' },
      { r: 'Quando',   v: CN.util.dataExtenso(a.data) + ' · ' + a.hora + ' – ' + fim },
      { r: 'Valor',    v: CN.util.moeda(a.preco) },
      { r: 'Contato',  v: a.telefone },
      { r: 'Código',   v: a.codigo }
    ].map(function (l) {
      return '<div class="flex items-start justify-between gap-4 py-2 border-b border-white/[0.06] last:border-0">' +
               '<dt class="ds-eyebrow shrink-0 pt-0.5">' + l.r + '</dt>' +
               '<dd class="text-sm text-right">' + CN.util.escapar(l.v) + '</dd>' +
             '</div>';
    }).join('') +
    (a.obs ? '<p class="mt-4 pl-3 border-l text-xs italic" style="border-color:var(--ds-gold-line);color:var(--ds-dim)">' +
              CN.util.escapar(a.obs) + '</p>' : '');

    /* Ações mudam conforme o estado atual da reserva */
    var acoes = $('#evento-acoes');
    var wa = 'https://wa.me/55' + CN.util.apenasDigitos(a.telefone);

    acoes.innerHTML =
      '<a href="' + wa + '" target="_blank" rel="noopener" class="ds-btn">WhatsApp</a>' +
      (a.status === 'agendado'
        ? '<button type="button" class="ds-btn ds-btn--ok" data-acao="concluir">Concluir</button>' +
          '<button type="button" class="ds-btn ds-btn--danger" data-acao="cancelar">Cancelar</button>'
        : '<button type="button" class="ds-btn" data-acao="reabrir">Reabrir</button>' +
          '<button type="button" class="ds-btn ds-btn--danger" data-acao="remover">Remover</button>');

    $$('[data-acao]', acoes).forEach(function (btn) {
      btn.addEventListener('click', function () { acaoAgendamento(btn.dataset.acao, a); });
    });

    abrirModal('#modal-evento');
  }

  function acaoAgendamento(acao, a) {
    if (acao === 'concluir') {
      CN.store.atualizarStatus(a.id, 'concluido');
      fecharModal('#modal-evento');
      toast('Atendimento de ' + a.cliente.split(' ')[0] + ' concluído.');
    }

    if (acao === 'reabrir') {
      CN.store.atualizarStatus(a.id, 'agendado');
      fecharModal('#modal-evento');
      toast('Agendamento reaberto.', 'info');
    }

    if (acao === 'cancelar') {
      fecharModal('#modal-evento');
      confirmar({
        titulo: 'Cancelar agendamento',
        texto: 'Cancelar o horário de <strong>' + CN.util.escapar(a.cliente) + '</strong> em ' +
               CN.util.dataCurta(a.data) + ' às ' + a.hora + '?<br><br>' +
               '<span style="color:var(--ds-faint)">O horário volta a ficar disponível no site.</span>',
        rotulo: 'Cancelar horário',
        perigo: true
      }, function () {
        CN.store.atualizarStatus(a.id, 'cancelado');
        toast('Agendamento cancelado e horário liberado.', 'info');
      });
    }

    if (acao === 'remover') {
      fecharModal('#modal-evento');
      confirmar({
        titulo: 'Remover registro',
        texto: 'Apagar definitivamente o registro de <strong>' + CN.util.escapar(a.cliente) + '</strong>?<br><br>' +
               '<span style="color:var(--ds-faint)">Esta ação não pode ser desfeita.</span>',
        rotulo: 'Remover',
        perigo: true
      }, function () {
        CN.store.remover(a.id);
        toast('Registro removido.', 'info');
      });
    }
  }

  /* ══════════════════════════════════════════════════════════
     TELA 3 — SERVIÇOS
     ══════════════════════════════════════════════════════════ */
  function renderServicos() {
    var todos = CN.catalogo.servicos();
    var lista = todos.filter(function (s) {
      if (ui.filtroServico === 'ativos')   return s.ativo !== false;
      if (ui.filtroServico === 'inativos') return s.ativo === false;
      return true;
    });

    $$('#servicos-filtros .ds-chip').forEach(function (c) {
      c.classList.toggle('is-active', c.dataset.filtro === ui.filtroServico);
    });

    $('#servicos-resumo').textContent =
      todos.length + (todos.length === 1 ? ' serviço' : ' serviços') + ' · ' +
      todos.filter(function (s) { return s.ativo !== false; }).length + ' ativos';

    var corpo = $('#servicos-corpo');
    var vazio = $('#servicos-vazio');
    var tabela = $('#servicos-tabela');

    if (!lista.length) {
      corpo.innerHTML = '';        /* idem: não deixa linhas órfãs no DOM */
      tabela.hidden = true;
      vazio.hidden = false;
      vazio.innerHTML = estadoVazio('servicos',
        ui.filtroServico === 'todos' ? 'Nenhum serviço cadastrado' : 'Nenhum serviço neste filtro',
        ui.filtroServico === 'todos'
          ? 'Clique em "Adicionar novo serviço" para montar o cardápio.'
          : 'Troque o filtro para ver os demais serviços.');
      return;
    }

    tabela.hidden = false;
    vazio.hidden = true;

    corpo.innerHTML = lista.map(function (s) {
      var ativo = s.ativo !== false;
      return '' +
        '<tr class="' + (ativo ? '' : 'is-off') + '">' +

          '<td data-rotulo="Serviço">' +
            '<div class="flex items-center gap-2 flex-wrap">' +
              '<span class="font-medium">' + CN.util.escapar(s.nome) + '</span>' +
              (s.destaque ? '<span class="px-1.5 py-0.5 text-[9px] tracking-[0.14em] uppercase" style="background:rgba(201,162,74,.15);color:var(--ds-gold)">' + CN.util.escapar(s.destaque) + '</span>' : '') +
            '</div>' +
            (s.desc ? '<p class="text-xs mt-1 max-w-md" style="color:var(--ds-faint)">' + CN.util.escapar(s.desc) + '</p>' : '') +
          '</td>' +

          '<td data-rotulo="Preço" class="num tnum" style="color:var(--ds-gold)">' + CN.util.moeda(s.preco) + '</td>' +

          '<td data-rotulo="Duração" class="num tnum">' + s.duracao + ' min</td>' +

          '<td data-rotulo="Status">' +
            '<span class="ds-badge ds-badge--' + (ativo ? 'ativo' : 'inativo') + '">' + (ativo ? 'Ativo' : 'Inativo') + '</span>' +
          '</td>' +

          '<td class="col-acoes">' +
            '<div class="flex gap-2 justify-end">' +
              '<button type="button" class="ds-btn ds-btn--sm" data-svc-toggle="' + s.id + '">' +
                (ativo ? 'Desativar' : 'Ativar') +
              '</button>' +
              '<button type="button" class="ds-btn ds-btn--sm ds-btn--outline" data-svc-editar="' + s.id + '">Editar</button>' +
              '<button type="button" class="ds-btn ds-btn--sm ds-btn--danger" data-svc-excluir="' + s.id + '">Excluir</button>' +
            '</div>' +
          '</td>' +
        '</tr>';
    }).join('');

    /* --- Ações da tabela --- */
    $$('[data-svc-editar]', corpo).forEach(function (b) {
      b.addEventListener('click', function () { abrirFormServico(b.dataset.svcEditar); });
    });

    $$('[data-svc-toggle]', corpo).forEach(function (b) {
      b.addEventListener('click', function () {
        var s = CN.catalogo.alternarServico(b.dataset.svcToggle);
        toast('"' + s.nome + '" agora está ' + (s.ativo ? 'ativo' : 'inativo') + '.',
              s.ativo ? 'sucesso' : 'info');
      });
    });

    $$('[data-svc-excluir]', corpo).forEach(function (b) {
      b.addEventListener('click', function () {
        var s = CN.util.servicoPorId(b.dataset.svcExcluir);
        var usos = CN.store.ativos().filter(function (a) { return a.servicoId === s.id; }).length;

        confirmar({
          titulo: 'Excluir serviço',
          texto: 'Remover <strong>' + CN.util.escapar(s.nome) + '</strong> do cardápio?<br><br>' +
                 (usos
                   ? '<span style="color:var(--ds-warn)">Há ' + usos + ' agendamento(s) usando este serviço. ' +
                     'Eles continuam na agenda com o nome preservado, mas o serviço deixa de ser oferecido no site.</span>'
                   : '<span style="color:var(--ds-faint)">Ele deixa de aparecer no site imediatamente.</span>'),
          rotulo: 'Excluir serviço',
          perigo: true
        }, function () {
          CN.catalogo.removerServico(s.id);
          toast('Serviço "' + s.nome + '" excluído.', 'info');
        });
      });
    });
  }

  /* --- Formulário de serviço (criar / editar) --- */
  function abrirFormServico(id) {
    var s = id ? CN.util.servicoPorId(id) : null;
    ui.servicoEmEdicao = s ? s.id : null;

    $('#form-servico-titulo').textContent = s ? 'Editar serviço' : 'Novo serviço';
    $('#form-servico-sub').textContent = s
      ? 'As alterações aparecem no site imediatamente.'
      : 'O serviço entra no cardápio do site assim que for salvo.';

    $('#fs-nome').value = s ? s.nome : '';
    $('#fs-desc').value = s ? (s.desc || '') : '';
    $('#fs-preco').value = s ? s.preco : '';
    $('#fs-duracao').value = s ? s.duracao : 40;
    $('#fs-destaque').value = s ? (s.destaque || '') : '';
    $('#fs-ativo').checked = s ? s.ativo !== false : true;

    $$('.ds-error', $('#modal-servico')).forEach(function (e) { e.classList.remove('is-visible'); });
    $$('.ds-input', $('#modal-servico')).forEach(function (e) { e.classList.remove('has-error'); });

    abrirModal('#modal-servico');
    setTimeout(function () { $('#fs-nome').focus(); }, 300);
  }

  function salvarFormServico() {
    var nome = $('#fs-nome').value.trim();
    var preco = parseFloat(String($('#fs-preco').value).replace(',', '.'));
    var duracao = parseInt($('#fs-duracao').value, 10);
    var ok = true;

    function erro(campo, msg) {
      $('#erro-' + campo).textContent = msg;
      $('#erro-' + campo).classList.add('is-visible');
      var input = $('#fs-' + campo);
      input.classList.add('has-error', 'shake');
      setTimeout(function () { input.classList.remove('shake'); }, 450);
      ok = false;
    }

    $$('.ds-error', $('#modal-servico')).forEach(function (e) { e.classList.remove('is-visible'); });
    $$('.ds-input', $('#modal-servico')).forEach(function (e) { e.classList.remove('has-error'); });

    if (nome.length < 3) erro('nome', 'Informe um nome com pelo menos 3 letras.');
    if (isNaN(preco) || preco <= 0) erro('preco', 'Informe um preço maior que zero.');

    /* A duração precisa ser múltipla do intervalo da agenda, senão o
       bloco não encaixa na grade de horários do site.               */
    if (isNaN(duracao) || duracao < CN.CONFIG.intervaloMin) {
      erro('duracao', 'Mínimo de ' + CN.CONFIG.intervaloMin + ' minutos.');
    } else if (duracao % CN.CONFIG.intervaloMin !== 0) {
      erro('duracao', 'Use múltiplos de ' + CN.CONFIG.intervaloMin + ' min (30, 60, 90…).');
    }

    if (!ok) return;

    var salvo = CN.catalogo.salvarServico({
      id: ui.servicoEmEdicao,
      nome: nome,
      desc: $('#fs-desc').value.trim(),
      preco: preco,
      duracao: duracao,
      destaque: $('#fs-destaque').value.trim(),
      ativo: $('#fs-ativo').checked
    });

    fecharModal('#modal-servico');
    toast(ui.servicoEmEdicao ? 'Serviço "' + salvo.nome + '" atualizado.' : 'Serviço "' + salvo.nome + '" criado.');
    ui.servicoEmEdicao = null;
  }

  /* ══════════════════════════════════════════════════════════
     TELA 4 — FINANÇAS
     ══════════════════════════════════════════════════════════ */
  function renderFinancas() {
    var fin = CN.store.financeiro();

    $('#fin-faturamento').textContent = CN.util.moeda(fin.faturamento);
    $('#fin-lucro').textContent = CN.util.moeda(fin.lucroBruto);
    $('#fin-despesas').textContent = CN.util.moeda(fin.despesasFixas);
    $('#fin-liquido').textContent = CN.util.moeda(fin.lucroLiquido);
    $('#fin-liquido').style.color = fin.lucroLiquido >= 0 ? 'var(--ds-ok)' : 'var(--ds-danger)';

    $('#fin-composicao').textContent =
      CN.util.moeda(fin.baseSimulada) + ' de base simulada + ' +
      CN.util.moeda(fin.realizadoMes) + ' de ' + fin.atendimentosMes + ' agendamentos reais';

    $('#fin-margem-nota').textContent = 'Margem bruta de ' + Math.round(fin.margem * 100) + '% (ajustável em Configurações)';

    CN.charts.desenhar($('#fin-chart'), 'linha',
      fin.serie.map(function (m) {
        return { rotulo: m.rotulo, valor: m.valor, atual: !!m.atual,
                 rotuloLongo: m.atual ? m.rotulo + ' (mês corrente)' : m.rotulo };
      }),
      { altura: 230 });

    CN.charts.desenhar($('#fin-rank-servicos'), 'ranking',
      fin.porServico.map(function (s) {
        return { rotulo: s.nome, valor: s.total, extra: s.qtd + '×' };
      }),
      { vazio: 'Nenhuma venda registrada neste mês.' });

    /* Tabela de comissões */
    var corpo = $('#fin-barbeiros');
    var comTotal = fin.porBarbeiro.reduce(function (s, b) { return s + b.comissao; }, 0);

    corpo.innerHTML = fin.porBarbeiro.map(function (b) {
      return '' +
        '<tr>' +
          '<td data-rotulo="Barbeiro">' +
            '<span class="flex items-center gap-2.5">' +
              '<span style="width:8px;height:8px;background:' + b.cor + ';flex-shrink:0"></span>' +
              CN.util.escapar(b.nome) +
            '</span>' +
          '</td>' +
          '<td data-rotulo="Atendimentos" class="num tnum">' + b.atendimentos + '</td>' +
          '<td data-rotulo="Receita" class="num tnum">' + CN.util.moeda(b.total) + '</td>' +
          '<td data-rotulo="Comissão" class="num tnum" style="color:var(--ds-gold)">' + CN.util.moeda(b.comissao) + '</td>' +
        '</tr>';
    }).join('') +
    '<tr style="background:rgba(255,255,255,.02)">' +
      '<td data-rotulo="Total" class="font-semibold">Total</td>' +
      '<td class="num tnum font-semibold">' + fin.porBarbeiro.reduce(function (s, b) { return s + b.atendimentos; }, 0) + '</td>' +
      '<td class="num tnum font-semibold">' + CN.util.moeda(fin.porBarbeiro.reduce(function (s, b) { return s + b.total; }, 0)) + '</td>' +
      '<td class="num tnum font-semibold" style="color:var(--ds-gold)">' + CN.util.moeda(comTotal) + '</td>' +
    '</tr>';

    /* Despesas fixas */
    $('#fin-despesas-lista').innerHTML = fin.despesas.map(function (d) {
      var pct = ((d.valor / fin.despesasFixas) * 100).toFixed(0);
      return '' +
        '<div class="rank-row">' +
          '<span style="font-size:.8125rem">' + CN.util.escapar(d.nome) + '</span>' +
          '<span class="tnum" style="font-size:.8125rem">' + CN.util.moeda(d.valor) + '</span>' +
          '<span class="rank-track"><span class="rank-fill" style="width:' + pct + '%"></span></span>' +
        '</div>';
    }).join('');
  }

  /* ══════════════════════════════════════════════════════════
     TELA 5 — BARBEIROS
     ══════════════════════════════════════════════════════════ */
  function renderBarbeiros() {
    var fin = CN.store.financeiro();
    var hoje = CN.util.hojeISO();
    var alvo = $('#barbeiros-grade');

    alvo.innerHTML = CN.catalogo.barbeiros().map(function (b) {
      var dados = fin.porBarbeiro.find(function (x) { return x.id === b.id; }) ||
                  { atendimentos: 0, total: 0, comissao: 0 };
      var ativo = b.ativo !== false;
      var folgaHoje = b.folga === CN.util.fromISO(hoje).getDay();

      /* Ocupação da semana deste barbeiro */
      var vendidos = 0, capacidade = 0;
      for (var d = 0; d < 7; d++) {
        var iso = CN.util.toISO(CN.util.addDias(new Date(), d));
        var exp = CN.slots.expediente(iso);
        if (!exp || b.folga === CN.util.fromISO(iso).getDay()) continue;
        capacidade += CN.util.minutos(exp.fecha) - CN.util.minutos(exp.abre);
        vendidos += CN.store.ocupadosEm(iso, b.id)
          .reduce(function (s, a) { return s + (a.duracao || 0); }, 0);
      }
      var ocupacao = capacidade ? Math.round((vendidos / capacidade) * 100) : 0;

      return '' +
        '<article class="ds-card ds-card--hover' + (ativo ? '' : ' opacity-55') + '">' +
          '<div class="p-5 flex items-start gap-4">' +
            '<span class="ds-avatar w-14 h-14 text-base" style="border-color:' + b.cor + '66">' +
              (b.foto ? '<img src="' + b.foto + '" alt="" loading="lazy" />' : CN.util.iniciais(b.nome)) +
            '</span>' +
            '<div class="min-w-0 flex-1">' +
              '<div class="flex items-start justify-between gap-3">' +
                '<div class="min-w-0">' +
                  '<h3 class="font-semibold text-sm truncate">' + CN.util.escapar(b.nome) + '</h3>' +
                  '<p class="text-xs mt-0.5" style="color:var(--ds-faint)">' + CN.util.escapar(b.cargo) + '</p>' +
                '</div>' +
                '<label class="flex items-center gap-2 shrink-0 cursor-pointer" title="Ativar ou pausar na agenda">' +
                  '<input type="checkbox" class="ds-switch" data-barb-toggle="' + b.id + '"' + (ativo ? ' checked' : '') + ' />' +
                '</label>' +
              '</div>' +

              '<div class="flex items-center gap-3 mt-2.5 text-[10px] tracking-[0.12em] uppercase" style="color:var(--ds-faint)">' +
                '<span style="color:var(--ds-gold)">★ ' + b.nota.toFixed(1) + '</span>' +
                '<span>Folga: ' + CN.DIAS_SEMANA[b.folga].toLowerCase() + '</span>' +
                (folgaHoje && ativo ? '<span style="color:var(--ds-warn)">De folga hoje</span>' : '') +
              '</div>' +
            '</div>' +
          '</div>' +

          '<dl class="grid grid-cols-3 gap-px" style="background:var(--ds-line)">' +
            '<div class="p-4" style="background:var(--ds-surface)">' +
              '<dt class="ds-eyebrow">Atend./mês</dt>' +
              '<dd class="tnum text-lg mt-1">' + dados.atendimentos + '</dd>' +
            '</div>' +
            '<div class="p-4" style="background:var(--ds-surface)">' +
              '<dt class="ds-eyebrow">Receita</dt>' +
              '<dd class="tnum text-lg mt-1" style="color:var(--ds-gold)">' + CN.util.moeda(dados.total) + '</dd>' +
            '</div>' +
            '<div class="p-4" style="background:var(--ds-surface)">' +
              '<dt class="ds-eyebrow">Comissão</dt>' +
              '<dd class="tnum text-lg mt-1">' + CN.util.moeda(dados.comissao) + '</dd>' +
            '</div>' +
          '</dl>' +

          '<div class="px-5 py-4 border-t" style="border-color:var(--ds-line)">' +
            '<div class="flex items-center justify-between text-[10px] tracking-[0.14em] uppercase mb-2" style="color:var(--ds-faint)">' +
              '<span>Ocupação da semana</span>' +
              '<span class="tnum" style="color:var(--ds-text)">' + ocupacao + '%</span>' +
            '</div>' +
            '<div class="ds-meter"><span class="ds-meter__fill" style="width:' + ocupacao + '%;background:' + b.cor + '"></span></div>' +
          '</div>' +
        '</article>';
    }).join('');

    $$('[data-barb-toggle]', alvo).forEach(function (sw) {
      sw.addEventListener('change', function () {
        var b = CN.catalogo.alternarBarbeiro(sw.dataset.barbToggle);
        toast(b.nome.split(' ')[0] + ' ' + (b.ativo ? 'reativado na agenda' : 'pausado — não recebe novos agendamentos') + '.',
              b.ativo ? 'sucesso' : 'info');
      });
    });
  }

  /* ══════════════════════════════════════════════════════════
     TELA 6 — CLIENTES
     ══════════════════════════════════════════════════════════ */
  function renderClientes() {
    var todos = CN.store.clientes();
    var termo = ui.buscaCliente.trim().toLowerCase();

    /* O trecho numérico só entra na comparação quando o usuário digitou
       algum dígito: indexOf('') devolve 0, o que faria uma busca por
       texto puro casar com todos os telefones da base.               */
    var digitos = CN.util.apenasDigitos(termo);

    var lista = termo
      ? todos.filter(function (c) {
          if (c.nome.toLowerCase().indexOf(termo) !== -1) return true;
          return digitos.length > 0 &&
                 CN.util.apenasDigitos(c.telefone).indexOf(digitos) !== -1;
        })
      : todos;

    $('#clientes-resumo').textContent = todos.length
      ? todos.length + (todos.length === 1 ? ' cliente' : ' clientes') + ' na base' +
        (termo ? ' · ' + lista.length + ' no filtro' : '')
      : 'Base vazia';

    var tabela = $('#clientes-tabela');
    var vazio = $('#clientes-vazio');

    if (!lista.length) {
      /* Limpa o corpo: sem isso as linhas do filtro anterior ficam no DOM
         por trás da tabela oculta. */
      $('#clientes-corpo').innerHTML = '';
      tabela.hidden = true;
      vazio.hidden = false;
      vazio.innerHTML = todos.length
        ? estadoVazio('clientes', 'Nenhum resultado', 'Nenhum cliente corresponde a "' + CN.util.escapar(ui.buscaCliente) + '".')
        : estadoVazio('clientes', 'Nenhum cliente ainda',
            'A base se monta sozinha: cada agendamento feito no site vira um cliente aqui.');
      return;
    }

    tabela.hidden = false;
    vazio.hidden = true;

    $('#clientes-corpo').innerHTML = lista.map(function (c) {
      /* Cliente com 3+ visitas ganha selo de recorrente */
      var recorrente = c.visitas >= 3;
      return '' +
        '<tr>' +
          '<td data-rotulo="Cliente">' +
            '<div class="flex items-center gap-3">' +
              '<span class="ds-avatar w-9 h-9 text-xs shrink-0">' + CN.util.iniciais(c.nome) + '</span>' +
              '<div class="min-w-0">' +
                '<div class="flex items-center gap-2">' +
                  '<span class="font-medium truncate">' + CN.util.escapar(c.nome) + '</span>' +
                  (recorrente ? '<span class="px-1.5 py-0.5 text-[9px] tracking-[0.12em] uppercase" style="background:rgba(201,162,74,.15);color:var(--ds-gold)">Fiel</span>' : '') +
                '</div>' +
                '<a href="https://wa.me/55' + CN.util.apenasDigitos(c.telefone) + '" target="_blank" rel="noopener" ' +
                   'class="text-xs hover:underline" style="color:var(--ds-faint)">' + CN.util.escapar(c.telefone) + '</a>' +
              '</div>' +
            '</div>' +
          '</td>' +
          '<td data-rotulo="Visitas" class="num tnum">' + c.visitas +
            (c.cancelamentos ? '<span class="text-xs" style="color:var(--ds-danger)"> (' + c.cancelamentos + ' canc.)</span>' : '') +
          '</td>' +
          '<td data-rotulo="Última visita" class="num tnum">' + (c.ultima ? CN.util.dataCurta(c.ultima) : '—') + '</td>' +
          '<td data-rotulo="Serviço favorito">' + CN.util.escapar(c.favorito) + '</td>' +
          '<td data-rotulo="Ticket médio" class="num tnum">' + CN.util.moeda(c.ticket) + '</td>' +
          '<td data-rotulo="Total gasto" class="num tnum" style="color:var(--ds-gold)">' + CN.util.moeda(c.total) + '</td>' +
        '</tr>';
    }).join('');
  }

  /* ══════════════════════════════════════════════════════════
     TELA 7 — CONFIGURAÇÕES
     ══════════════════════════════════════════════════════════ */
  function renderConfiguracoes() {
    var c = CN.catalogo.config();

    $('#cfg-nome').value = c.nome;
    $('#cfg-telefone').value = c.telefone;
    $('#cfg-whatsapp').value = c.whatsapp;
    $('#cfg-endereco').value = c.endereco;
    $('#cfg-margem').value = Math.round(c.margemBruta * 100);
    $('#cfg-comissao').value = Math.round(c.comissaoBarbeiro * 100);
    $('#cfg-janela').value = c.janelaDias;
    $('#cfg-antecedencia').value = c.antecedenciaMin;

    /* Expediente: uma linha por dia da semana */
    var h = CN.catalogo.horarios();
    var ordem = [1, 2, 3, 4, 5, 6, 0];

    $('#cfg-expediente').innerHTML = ordem.map(function (dow) {
      var dia = h[dow];
      var aberto = !!dia;
      return '' +
        '<div class="grid grid-cols-[1fr_auto] sm:grid-cols-[130px_auto_1fr] items-center gap-3 py-2.5 border-b border-white/[0.06] last:border-0">' +
          '<span class="text-sm">' + CN.DIAS_SEMANA[dow] + '</span>' +
          '<label class="flex items-center gap-2 cursor-pointer">' +
            '<input type="checkbox" class="ds-switch" data-dia-toggle="' + dow + '"' + (aberto ? ' checked' : '') + ' />' +
            '<span class="text-xs" style="color:var(--ds-faint)">' + (aberto ? 'Aberto' : 'Fechado') + '</span>' +
          '</label>' +
          '<div class="col-span-2 sm:col-span-1 flex items-center gap-2 ' + (aberto ? '' : 'opacity-35 pointer-events-none') + '">' +
            '<input type="time" class="ds-input tnum" style="padding:.45rem .6rem;width:auto" data-dia-abre="' + dow + '" value="' + (aberto ? dia.abre : '09:00') + '" />' +
            '<span style="color:var(--ds-faint)">—</span>' +
            '<input type="time" class="ds-input tnum" style="padding:.45rem .6rem;width:auto" data-dia-fecha="' + dow + '" value="' + (aberto ? dia.fecha : '20:00') + '" />' +
          '</div>' +
        '</div>';
    }).join('');

    /* Alterar qualquer campo do expediente grava na hora */
    $$('[data-dia-toggle], [data-dia-abre], [data-dia-fecha]', $('#cfg-expediente')).forEach(function (campo) {
      campo.addEventListener('change', salvarExpediente);
    });

    /* Estatísticas de armazenamento */
    var ag = CN.store.todos();
    $('#cfg-dados-resumo').textContent =
      ag.length + ' agendamentos · ' + CN.catalogo.servicos().length + ' serviços · ' +
      CN.catalogo.barbeiros().length + ' barbeiros salvos neste navegador';
  }

  function salvarExpediente() {
    var mapa = {};
    [0, 1, 2, 3, 4, 5, 6].forEach(function (dow) {
      var toggle = $('[data-dia-toggle="' + dow + '"]');
      if (!toggle) return;
      if (!toggle.checked) { mapa[dow] = null; return; }

      var abre = $('[data-dia-abre="' + dow + '"]').value || '09:00';
      var fecha = $('[data-dia-fecha="' + dow + '"]').value || '20:00';

      /* Fechamento antes da abertura zeraria a agenda inteira do dia */
      if (CN.util.minutos(fecha) <= CN.util.minutos(abre)) {
        toast('O fechamento de ' + CN.DIAS_SEMANA[dow].toLowerCase() + ' precisa ser depois da abertura.', 'erro');
        fecha = CN.util.paraHora(Math.min(24 * 60 - 30, CN.util.minutos(abre) + 480));
        $('[data-dia-fecha="' + dow + '"]').value = fecha;
      }
      mapa[dow] = { abre: abre, fecha: fecha };
    });

    CN.catalogo.salvarHorarios(mapa);
    toast('Expediente atualizado.');
    renderConfiguracoes();
  }

  function salvarDadosNegocio() {
    CN.catalogo.salvarConfig({
      nome: $('#cfg-nome').value.trim() || CN.CONFIG_PADRAO.nome,
      telefone: $('#cfg-telefone').value.trim(),
      whatsapp: CN.util.apenasDigitos($('#cfg-whatsapp').value),
      endereco: $('#cfg-endereco').value.trim(),
      margemBruta: Math.min(95, Math.max(1, parseInt($('#cfg-margem').value, 10) || 54)) / 100,
      comissaoBarbeiro: Math.min(90, Math.max(0, parseInt($('#cfg-comissao').value, 10) || 40)) / 100,
      janelaDias: Math.min(90, Math.max(1, parseInt($('#cfg-janela').value, 10) || 21)),
      antecedenciaMin: Math.max(0, parseInt($('#cfg-antecedencia').value, 10) || 0)
    });
    toast('Configurações salvas.');
    renderConfiguracoes();
  }

  /* --- Exportar os dados como JSON --- */
  function exportarDados() {
    var pacote = {
      exportadoEm: new Date().toISOString(),
      config: CN.catalogo.config(),
      horarios: CN.catalogo.horarios(),
      servicos: CN.catalogo.servicos(),
      barbeiros: CN.catalogo.barbeiros(),
      agendamentos: CN.store.todos()
    };

    var blob = new Blob([JSON.stringify(pacote, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'casa-navalha-' + CN.util.hojeISO() + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);

    toast('Backup exportado em JSON.', 'info');
  }

  /* ══════════════════════════════════════════════════════════
     ESTADO VAZIO REUTILIZÁVEL
     ══════════════════════════════════════════════════════════ */
  function estadoVazio(icone, titulo, texto) {
    var icones = {
      calendario: '<rect x="3" y="4" width="18" height="17" rx="1"/><path d="M8 2v4M16 2v4M3 10h18"/>',
      fechado:    '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>',
      servicos:   '<path d="M4 7h16M4 12h16M4 17h10"/>',
      clientes:   '<circle cx="12" cy="8" r="3.5"/><path d="M4.5 20a7.5 7.5 0 0115 0"/>',
      equipe:     '<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0112 0M16 11a3 3 0 100-6M18 20a6 6 0 00-3-5.2"/>'
    };

    return '' +
      '<div class="ds-empty">' +
        '<span class="ds-empty__icon">' +
          '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">' +
            (icones[icone] || icones.calendario) +
          '</svg>' +
        '</span>' +
        '<h3 class="font-display uppercase text-lg tracking-wide">' + CN.util.escapar(titulo) + '</h3>' +
        '<p class="mt-2 text-sm max-w-sm mx-auto" style="color:var(--ds-faint)">' + texto + '</p>' +
      '</div>';
  }

  /* ══════════════════════════════════════════════════════════
     BARRA LATERAL NO MOBILE
     ══════════════════════════════════════════════════════════ */
  function abrirDrawer() {
    $('#ds-sidebar').classList.add('is-open');
    $('#ds-scrim').hidden = false;
    document.body.classList.add('is-locked');
  }
  function fecharDrawer() {
    $('#ds-sidebar').classList.remove('is-open');
    $('#ds-scrim').hidden = true;
    if (!$$('.ds-modal').some(function (x) { return !x.hidden; })) {
      document.body.classList.remove('is-locked');
    }
  }

  /* ══════════════════════════════════════════════════════════
     INICIALIZAÇÃO
     ══════════════════════════════════════════════════════════ */
  function init() {
    /* --- Navegação --- */
    $$('.ds-nav-item').forEach(function (n) {
      n.addEventListener('click', function () { location.hash = '#/' + n.dataset.rota; });
    });

    window.addEventListener('hashchange', function () {
      irPara((location.hash || '').replace('#/', '') || 'dashboard');
    });

    $('#ds-menu').addEventListener('click', abrirDrawer);
    $('#ds-scrim').addEventListener('click', fecharDrawer);

    /* --- Data no topo --- */
    var hoje = new Date();
    $('#topbar-data').textContent =
      CN.DIAS_SEMANA[hoje.getDay()] + ', ' + hoje.getDate() + ' de ' + CN.MESES[hoje.getMonth()];

    /* --- Agenda: navegação e modos --- */
    $('#agenda-ant').addEventListener('click', function () {
      var passo = ui.agendaModo === 'dia' ? -1 : -7;
      ui.agendaData = CN.util.toISO(CN.util.addDias(CN.util.fromISO(ui.agendaData), passo));
      renderAgenda();
    });
    $('#agenda-prox').addEventListener('click', function () {
      var passo = ui.agendaModo === 'dia' ? 1 : 7;
      ui.agendaData = CN.util.toISO(CN.util.addDias(CN.util.fromISO(ui.agendaData), passo));
      renderAgenda();
    });
    $('#agenda-hoje').addEventListener('click', function () {
      ui.agendaData = CN.util.hojeISO();
      renderAgenda();
    });
    $$('#agenda-modos .ds-chip').forEach(function (c) {
      c.addEventListener('click', function () { ui.agendaModo = c.dataset.modo; renderAgenda(); });
    });

    /* --- Serviços --- */
    $$('[data-novo-servico]').forEach(function (b) {
      b.addEventListener('click', function () { abrirFormServico(null); });
    });
    $('#form-servico-salvar').addEventListener('click', salvarFormServico);
    $('#form-servico').addEventListener('submit', function (e) { e.preventDefault(); salvarFormServico(); });

    $$('#servicos-filtros .ds-chip').forEach(function (c) {
      c.addEventListener('click', function () { ui.filtroServico = c.dataset.filtro; renderServicos(); });
    });

    /* --- Clientes --- */
    $('#clientes-busca').addEventListener('input', function () {
      ui.buscaCliente = this.value;
      renderClientes();
    });

    /* --- Configurações --- */
    $('#cfg-salvar').addEventListener('click', salvarDadosNegocio);
    $('#cfg-exportar').addEventListener('click', exportarDados);

    $('#cfg-demo').addEventListener('click', function () {
      var n = CN.store.popularDemo();
      toast(n > 0 ? n + ' agendamentos de demonstração criados.' : 'A agenda de demonstração já está preenchida.',
            n > 0 ? 'sucesso' : 'info');
    });

    $('#cfg-limpar').addEventListener('click', function () {
      if (!CN.store.todos().length) { toast('A agenda já está vazia.', 'info'); return; }
      confirmar({
        titulo: 'Limpar agendamentos',
        texto: 'Apagar <strong>todos</strong> os agendamentos salvos neste navegador?<br><br>' +
               '<span style="color:var(--ds-faint)">Serviços, equipe e configurações são preservados.</span>',
        rotulo: 'Apagar tudo',
        perigo: true
      }, function () {
        CN.store.limpar();
        toast('Agenda zerada.', 'info');
      });
    });

    $('#cfg-restaurar').addEventListener('click', function () {
      confirmar({
        titulo: 'Restaurar padrão de fábrica',
        texto: 'Devolver serviços, equipe, expediente e configurações aos valores originais?<br><br>' +
               '<span style="color:var(--ds-faint)">Os agendamentos não são apagados.</span>',
        rotulo: 'Restaurar',
        perigo: true
      }, function () {
        CN.catalogo.restaurarPadrao();
        toast('Catálogo restaurado ao padrão.', 'info');
        renderConfiguracoes();
      });
    });

    /* --- Modais --- */
    $$('[data-fechar]').forEach(function (b) {
      b.addEventListener('click', function () { fecharModal(b.dataset.fechar); });
    });

    $('#confirmar-ok').addEventListener('click', function () {
      var acao = ui.confirmarAcao;
      ui.confirmarAcao = null;
      fecharModal('#modal-confirmar');
      if (acao) acao();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var aberto = $$('.ds-modal').filter(function (m) { return !m.hidden; }).pop();
      if (aberto) { fecharModal('#' + aberto.id); return; }
      if ($('#ds-sidebar').classList.contains('is-open')) fecharDrawer();
    });

    /* --- Redesenha tudo a cada mudança nos dados ---
       Vale tanto para ações do painel quanto para um agendamento
       feito no site em outra aba do mesmo navegador.            */
    CN.store.aoMudar(renderRotaAtual);
    CN.catalogo.aoMudar(renderRotaAtual);

    /* Outra aba mexeu no localStorage: recarrega o catálogo e redesenha */
    window.addEventListener('storage', function (e) {
      if (e.key && e.key.indexOf('casa_navalha:') === 0) location.reload();
    });

    /* --- Rota inicial --- */
    irPara((location.hash || '').replace('#/', '') || 'dashboard');
  }

  return { init: init, irPara: irPara, toast: toast };
})();
