/* ============================================================
   CASA NAVALHA — Painel de gestão (dashboard.html)

   Aplicação de tela única com roteamento por hash:
     #/dashboard  #/agenda  #/servicos  #/financas
     #/barbeiros  #/clientes  #/configuracoes

   Lê e escreve nos mesmos dados do site (CN.store / CN.catalogo),
   então tudo que o dono muda aqui aparece no agendamento — e
   todo agendamento feito pelo site aparece aqui.

   Regra de composição que vale para todas as telas:
   uma informação herói, uma ação primária, e todo o resto
   subordinado. Cor só na ação primária e na linha do "agora".
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
    buscaCliente: '',
    servicoEmEdicao: null,
    confirmarAcao: null
  };

  /* Rotas válidas. Não há mais mapa de título/subtítulo: cada tela
     carrega o próprio cabeçalho, então a barra superior não precisa
     repetir o que a lateral já marca como ativo.                   */
  var ROTAS = ['dashboard', 'agenda', 'servicos', 'financas', 'barbeiros', 'clientes', 'configuracoes'];

  /* Estado local dos interruptores de dia enquanto o formulário de
     Configurações não foi salvo. Sem isto, ligar um dia fechado
     perderia o valor no redesenho da linha.                      */
  var rascunhoExpediente = {};

  /* Primeira letra maiúscula — usado nas datas por extenso */
  function capitalizar(t) { return t.charAt(0).toUpperCase() + t.slice(1); }

  /* ══════════════════════════════════════════════════════════
     NOTIFICAÇÕES
     Sem ícone e sem cor por tipo: a frase já diz o que aconteceu.
     O parâmetro 'tipo' continua na assinatura porque várias
     chamadas o passam, mas não muda mais a aparência.
     ══════════════════════════════════════════════════════════ */
  function toast(mensagem) {
    var area = $('#ds-toasts');
    if (!area) return;

    var n = document.createElement('div');
    n.className = 'ds-toast';
    n.setAttribute('role', 'status');
    n.textContent = mensagem;
    area.appendChild(n);

    setTimeout(function () {
      n.classList.add('is-out');
      setTimeout(function () { n.remove(); }, 220);
    }, 3200);
  }

  /* ══════════════════════════════════════════════════════════
     MODAIS
     ══════════════════════════════════════════════════════════ */
  function abrirModal(id) {
    var m = $(id);
    if (!m) return;
    m.hidden = false;
    document.body.classList.add('is-locked');
  }

  function fecharModal(id) {
    var m = $(id);
    if (!m) return;
    m.hidden = true;
    var algumAberto = $$('.ds-modal').some(function (x) { return !x.hidden; });
    if (!algumAberto) document.body.classList.remove('is-locked');
  }

  /* Confirmação reutilizável — substitui o confirm() do navegador.
     O botão de confirmar é a ação PRIMÁRIA deste diálogo, inclusive
     quando ela é destrutiva: quem protege é o texto (que diz o
     número real do que será apagado) e o "Voltar" neutro ao lado. */
  function confirmar(opcoes, aoConfirmar) {
    $('#confirmar-titulo').textContent = opcoes.titulo;
    $('#confirmar-texto').textContent = opcoes.texto;
    $('#confirmar-ok').textContent = opcoes.rotulo || 'Confirmar';
    ui.confirmarAcao = aoConfirmar;
    abrirModal('#modal-confirmar');
  }

  /* ══════════════════════════════════════════════════════════
     ROTEAMENTO
     ══════════════════════════════════════════════════════════ */
  function irPara(rota) {
    if (ROTAS.indexOf(rota) === -1) rota = 'dashboard';
    ui.rota = rota;

    $$('.ds-view').forEach(function (v) { v.hidden = v.dataset.view !== rota; });
    $$('.ds-nav-item').forEach(function (n) {
      n.classList.toggle('is-active', n.dataset.rota === rota);
      if (n.dataset.rota === rota) n.setAttribute('aria-current', 'page');
      else n.removeAttribute('aria-current');
    });

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

  /* Contador ao lado de "Agenda".
     Conta só o que ainda está POR ATENDER: um contador que soma o
     dia inteiro já concluído informa quantas linhas existem, não
     quanto falta — e nada se decide com isso.                    */
  function renderBadges() {
    var badge = $('#badge-agenda');
    if (!badge) return;
    var agora = minutosDeAgora();
    var n = CN.store.doDia(CN.util.hojeISO()).filter(function (a) {
      return a.status === 'agendado' && CN.util.minutos(a.hora) + (a.duracao || 30) > agora;
    }).length;
    badge.textContent = n;
    badge.style.display = n ? '' : 'none';
  }

  function minutosDeAgora() {
    var d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  }

  /* ══════════════════════════════════════════════════════════
     TELA 1 — HOJE
     Herói: o atendimento em curso (ou o próximo).
     Ação primária: dar baixa nele.

     O alvo da baixa NUNCA é um atendimento futuro: gravar
     'concluido' num horário que ainda não aconteceu contamina o
     ticket médio e o histórico do cliente. O botão mira o que
     está em curso ou o último que já terminou sem baixa.
     ══════════════════════════════════════════════════════════ */
  function renderVisaoGeral() {
    var hoje = CN.util.hojeISO();
    var agora = minutosDeAgora();
    var doDia = CN.store.doDia(hoje);

    var agendados = doDia.filter(function (a) { return a.status === 'agendado'; })
      .sort(function (a, b) { return a.hora.localeCompare(b.hora); });

    var porAtender = agendados.filter(function (a) {
      return CN.util.minutos(a.hora) + (a.duracao || 30) > agora;
    });

    $('#hoje-data').textContent = capitalizar(CN.util.dataExtenso(hoje));
    $('#hoje-contexto').textContent = doDia.length
      ? doDia.length + (doDia.length === 1 ? ' agendamento' : ' agendamentos') +
        ' · ' + porAtender.length + ' por atender'
      : 'Nenhum agendamento';

    /* --- Quem está na cadeira, quem é o próximo, quem falta dar baixa --- */
    var emCurso = agendados.find(function (a) {
      var ini = CN.util.minutos(a.hora);
      return ini <= agora && agora < ini + (a.duracao || 30);
    });

    var proximo = agendados.find(function (a) { return CN.util.minutos(a.hora) > agora; });

    /* Último que já terminou e continua sem baixa */
    var vencidos = agendados.filter(function (a) {
      return CN.util.minutos(a.hora) + (a.duracao || 30) <= agora;
    });
    var aConcluir = emCurso || vencidos[vencidos.length - 1] || null;

    var foco = emCurso || proximo || vencidos[vencidos.length - 1] || null;

    $('#hoje-foco').innerHTML = focoHTML(foco, emCurso, aConcluir);

    var btn = $('[data-concluir]');
    if (btn) {
      btn.addEventListener('click', function () {
        var a = CN.store.porId(btn.dataset.concluir);
        if (!a) return;
        CN.store.atualizarStatus(a.id, 'concluido');
        toast('Atendimento de ' + a.cliente.split(' ')[0] + ' concluído.');
      });
    }

    /* --- Fila do dia --- */
    var lista = $('#lista-hoje');
    var ordenados = doDia.slice().sort(function (a, b) { return a.hora.localeCompare(b.hora); });

    if (!ordenados.length) {
      lista.innerHTML = estadoVazio('Nenhum horário reservado para hoje.');
      return;
    }

    lista.innerHTML = ordenados.map(function (a) {
      var s = CN.util.servicoPorId(a.servicoId);
      var b = CN.util.barbeiroPorId(a.barbeiroId);
      var apagado = a.status !== 'agendado' ||
                    CN.util.minutos(a.hora) + (a.duracao || 30) <= agora;

      return '' +
        '<button type="button" data-evento="' + a.id + '"' +
          ' class="ds-row' + (apagado ? ' is-off' : '') + '">' +
          '<span class="tnum font-semibold shrink-0 w-12">' + a.hora + '</span>' +
          '<span class="flex-1 min-w-0">' +
            '<span class="block truncate">' + CN.util.escapar(a.cliente) + '</span>' +
            '<span class="ds-row__sub block truncate">' +
              CN.util.escapar(s ? s.nome : '—') + ' · ' + CN.util.escapar(b ? b.nome.split(' ')[0] : '—') +
            '</span>' +
          '</span>' +
        '</button>';
    }).join('');

    ligarEventos(lista);
  }

  /* O bloco herói da tela "Hoje" */
  function focoHTML(foco, emCurso, aConcluir) {
    if (!foco) {
      return '' +
        '<div class="ds-card p-5 sm:p-6">' +
          '<p class="ds-hero__value">Agenda livre</p>' +
          '<div class="mt-5">' +
            '<a href="agendar.html" target="_blank" rel="noopener" class="ds-btn ds-btn--primary">Novo agendamento</a>' +
          '</div>' +
        '</div>';
    }

    var s = CN.util.servicoPorId(foco.servicoId);
    var b = CN.util.barbeiroPorId(foco.barbeiroId);
    var fim = CN.util.paraHora(CN.util.minutos(foco.hora) + (foco.duracao || 30));

    /* A ação primária muda conforme exista ou não algo para dar baixa */
    var acao = aConcluir
      ? '<button type="button" class="ds-btn ds-btn--primary" data-concluir="' + aConcluir.id + '">' +
          'Concluir ' + CN.util.escapar(aConcluir.cliente.split(' ')[0]) + ' · ' + aConcluir.hora +
        '</button>' +
        '<a href="agendar.html" target="_blank" rel="noopener" class="ds-btn">Novo agendamento</a>'
      : '<a href="agendar.html" target="_blank" rel="noopener" class="ds-btn ds-btn--primary">Novo agendamento</a>';

    return '' +
      '<div class="ds-card p-5 sm:p-6">' +
        '<p class="ds-hero__label">' + (emCurso ? 'Na cadeira agora' : 'Próximo atendimento') + '</p>' +
        '<p class="ds-hero__value tnum">' + foco.hora + ' · ' + CN.util.escapar(foco.cliente) + '</p>' +
        '<p class="ds-hero__sub">' +
          CN.util.escapar(s ? s.nome : '—') + ' · até ' + fim + ' · ' + CN.util.escapar(b ? b.nome.split(' ')[0] : '—') +
        '</p>' +
        '<div class="mt-5 flex flex-wrap gap-3">' + acao + '</div>' +
      '</div>';
  }

  /* ══════════════════════════════════════════════════════════
     TELA 2 — AGENDA
     Grade com uma coluna por barbeiro (visão de dia) ou uma
     coluna por dia da semana (visão de semana).

     Posição = hora. Altura = duração. Esmaecido = concluído.
     Nada disso precisa de cor para ser lido — e por isso as
     quatro cores de barbeiro saíram.
     ══════════════════════════════════════════════════════════ */
  function renderAgenda() {
    var d = CN.util.fromISO(ui.agendaData);
    var rotulo;

    if (ui.agendaModo === 'dia') {
      /* O prefixo "Hoje ·" é a única coisa que diz se o dia na tela
         é o dia corrente — sem ele, navegar para amanhã deixa a
         pessoa sem referência.                                    */
      rotulo = ui.agendaData === CN.util.hojeISO()
        ? 'Hoje · ' + CN.util.dataExtenso(ui.agendaData)
        : capitalizar(CN.util.dataExtenso(ui.agendaData));
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

  /* Linhas de fundo + coluna de horários, comuns às duas visões.
     Uma única espessura de linha: duas grades sobrepostas eram
     dois desenhos para a mesma leitura.                        */
  function esqueletoGrade(janela, passo, alturaLinha) {
    var linhas = (janela.fecha - janela.abre) / passo;
    var altura = linhas * alturaLinha;

    var tempos = '';
    for (var i = 0; i <= linhas; i++) {
      var min = janela.abre + i * passo;
      var cheia = min % 60 === 0;
      tempos += '<div class="cal-time" style="height:' + alturaLinha + 'px">' +
                  (cheia || linhas <= 14 ? CN.util.paraHora(min) : '') +
                '</div>';
    }

    var fundo = '';
    for (var j = 0; j <= linhas; j++) {
      fundo += '<span class="cal-line" style="top:' + (j * alturaLinha) + 'px"></span>';
    }

    return { linhas: linhas, altura: altura, tempos: tempos, fundo: fundo };
  }

  /* Marcador da hora atual, se o dia mostrado for hoje.
     É o único estado crítico do painel — e o único lugar, fora da
     ação primária, onde o acento aparece.                        */
  function marcadorAgora(iso, janela, alturaLinha, passo) {
    if (iso !== CN.util.hojeISO()) return '';
    var min = minutosDeAgora();
    if (min < janela.abre || min > janela.fecha) return '';
    var top = ((min - janela.abre) / passo) * alturaLinha;
    return '<span class="cal-now" style="top:' + top.toFixed(1) + 'px"></span>';
  }

  /* ---- Faixas para blocos que se sobrepõem ----
     Na visão de semana uma coluna é um DIA e recebe os agendamentos
     de TODOS os barbeiros. Sem isto, dois barbeiros às 14:00 geram
     dois blocos no mesmo topo e na mesma largura — um cobre o outro
     por inteiro, e a coluna mente justamente nos dias mais cheios.

     Não escrevemos nada no objeto do agendamento: ele vem do cache
     do localStorage e ganharia um campo de layout na persistência. */
  function comFaixas(lista) {
    var ordenada = lista.slice().sort(function (a, b) {
      return CN.util.minutos(a.hora) - CN.util.minutos(b.hora);
    });

    var fimDaFaixa = [];   /* minuto em que a última reserva de cada faixa termina */

    var itens = ordenada.map(function (a) {
      var ini = CN.util.minutos(a.hora);
      var fim = ini + (a.duracao || 30);
      var faixa = 0;
      while (faixa < fimDaFaixa.length && fimDaFaixa[faixa] > ini) faixa++;
      fimDaFaixa[faixa] = fim;
      return { ag: a, faixa: faixa };
    });

    return { itens: itens, faixas: Math.max(1, fimDaFaixa.length) };
  }

  function renderAgendaDia() {
    var alvo = $('#agenda-grade');
    var iso = ui.agendaData;
    var expediente = CN.slots.expediente(iso);

    if (!expediente) {
      alvo.innerHTML = estadoVazio(capitalizar(CN.util.dataExtenso(iso)) +
        ' não tem expediente. Ajuste em Configurações.');
      return;
    }

    var barbeiros = CN.catalogo.barbeirosAtivos();
    if (!barbeiros.length) {
      alvo.innerHTML = estadoVazio('Nenhum barbeiro ativo. Reative alguém em Barbeiros.');
      return;
    }

    var PASSO = 30;
    var ALTURA = 46;
    var janela = { abre: CN.util.minutos(expediente.abre), fecha: CN.util.minutos(expediente.fecha) };
    var esq = esqueletoGrade(janela, PASSO, ALTURA);
    var agendamentos = CN.store.doDia(iso);
    var dow = CN.util.fromISO(iso).getDay();

    /* Cabeçalho: primeiro nome, e "folga" no mesmo rótulo quando for
       o caso. Avatar, contagem e receita por barbeiro saíram — nenhuma
       decisão de agenda depende de dinheiro.                         */
    var cabecalho = '<div class="cal-head__cell"></div>' + barbeiros.map(function (b) {
      var folga = b.folga === dow;
      return '' +
        '<div class="cal-head__cell">' +
          '<span class="font-medium">' + CN.util.escapar(b.nome.split(' ')[0]) + '</span>' +
          (folga ? '<span class="apoio"> · folga</span>' : '') +
        '</div>';
    }).join('');

    var colunas = barbeiros.map(function (b) {
      var folga = b.folga === dow;
      var grupo = comFaixas(agendamentos.filter(function (a) { return a.barbeiroId === b.id; }));

      var eventos = grupo.itens.map(function (it) {
        return blocoEvento(it.ag, janela, ALTURA, PASSO, {
          faixa: it.faixa, faixas: grupo.faixas
        });
      }).join('');

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
      alvo.innerHTML = estadoVazio('Nenhum dia desta semana está aberto.');
      return;
    }

    var PASSO = 30;
    var ALTURA = 42;   /* baixo o bastante para 7 colunas, alto o bastante
                          para o bloco de 30 min caber duas linhas de texto */
    var esq = esqueletoGrade(janela, PASSO, ALTURA);
    var hoje = CN.util.hojeISO();

    /* A contagem do dia fica: com quatro barbeiros no mesmo eixo, a
       densidade visual não responde "quinta ainda cabe?" — o número
       responde.                                                     */
    var cabecalho = '<div class="cal-head__cell"></div>' + dias.map(function (iso) {
      var d = CN.util.fromISO(iso);
      var fechado = !CN.slots.expediente(iso);
      var qtd = CN.store.doDia(iso).length;
      var ehHoje = iso === hoje;

      return '' +
        '<div class="cal-head__cell">' +
          '<span class="' + (ehHoje ? 'font-semibold' : '') + '">' +
            CN.DIAS_CURTO[d.getDay()] + ' ' + d.getDate() +
          '</span>' +
          '<span class="apoio"> · ' + (fechado ? 'fechado' : qtd) + '</span>' +
        '</div>';
    }).join('');

    var colunas = dias.map(function (iso) {
      var fechado = !CN.slots.expediente(iso);
      var grupo = comFaixas(CN.store.doDia(iso));

      var eventos = grupo.itens.map(function (it) {
        var b = CN.util.barbeiroPorId(it.ag.barbeiroId);
        return blocoEvento(it.ag, janela, ALTURA, PASSO, {
          compacto: true,
          faixa: it.faixa,
          faixas: grupo.faixas,
          inicial: b ? CN.util.iniciais(b.nome).charAt(0) : '?'
        });
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

  /* Um bloquinho de agendamento posicionado na coluna.
     opts: { compacto, faixa, faixas, inicial }                 */
  function blocoEvento(a, janela, alturaLinha, passo, opts) {
    opts = opts || {};
    var ini = CN.util.minutos(a.hora);
    var top = ((ini - janela.abre) / passo) * alturaLinha;
    var alt = Math.max(alturaLinha - 3, ((a.duracao || 30) / passo) * alturaLinha - 3);

    var faixas = opts.faixas || 1;
    var faixa = opts.faixa || 0;
    var largura = 100 / faixas;
    var geometria =
      'top:' + top.toFixed(1) + 'px;' +
      'height:' + alt.toFixed(1) + 'px;' +
      'left:calc(' + (faixa * largura).toFixed(3) + '% + 2px);' +
      'width:calc(' + largura.toFixed(3) + '% - 4px);';

    /* Na visão semanal a régua de horários sai da tela ao rolar as
       7 colunas, então a hora tem de estar dentro do bloco; e a
       inicial do barbeiro substitui a cor que saiu.               */
    var conteudo = opts.compacto
      ? '<div class="cal-event__hora">' + a.hora + ' · ' + CN.util.escapar(opts.inicial || '') + '</div>' +
        '<div class="cal-event__nome">' + CN.util.escapar(a.cliente.split(' ')[0]) + '</div>'
      : '<div class="cal-event__nome">' + CN.util.escapar(a.cliente) + '</div>' +
        (alt > 54 ? '<div class="cal-event__hora">até ' +
                      CN.util.paraHora(ini + (a.duracao || 30)) + '</div>' : '');

    return '' +
      '<button type="button" data-evento="' + a.id + '"' +
        ' class="cal-event' + (opts.compacto ? ' cal-event--compacto' : '') +
          (a.status === 'concluido' ? ' is-concluido' : '') + '"' +
        ' style="' + geometria + '">' +
        conteudo +
      '</button>';
  }

  /* Clique num bloco ou numa linha da fila abre o detalhe */
  function ligarEventos(raiz) {
    $$('[data-evento]', raiz).forEach(function (btn) {
      btn.addEventListener('click', function () { abrirDetalhe(btn.dataset.evento); });
    });
  }

  /* ---- Folha de detalhe do agendamento ----
     Uma ação primária (dar baixa), o contato como ação com o número
     visível, e a data SEMPRE presente: a mesma folha abre a partir
     da visão de semana e da fila de hoje, onde a data da tela não
     é a data do bloco. Dar baixa no cliente errado é irreversível. */
  function abrirDetalhe(id) {
    var a = CN.store.porId(id);
    if (!a) return;

    var s = CN.util.servicoPorId(a.servicoId);
    var b = CN.util.barbeiroPorId(a.barbeiroId);
    var fim = CN.util.paraHora(CN.util.minutos(a.hora) + (a.duracao || 30));
    var rotulos = { agendado: 'Agendado', concluido: 'Concluído', cancelado: 'Cancelado' };

    $('#evento-titulo').textContent = a.cliente;
    $('#evento-sub').textContent =
      capitalizar(CN.util.dataExtenso(a.data)) + ' · ' + a.hora + '–' + fim +
      ' · ' + (b ? b.nome.split(' ')[0] : '—');

    $('#evento-corpo').innerHTML =
      '<p>' + CN.util.escapar(s ? s.nome : '—') + ' · ' + (a.duracao || 30) + ' min · ' +
        CN.util.moeda(a.preco) + '</p>' +
      '<p class="mt-1" style="color:var(--ds-ink-3);font-size:var(--ds-t4)">' +
        rotulos[a.status] + ' · ' + CN.util.escapar(a.codigo) +
      '</p>' +
      (a.obs
        ? '<p class="mt-3 pl-3 border-l" style="border-color:var(--ds-line-2);color:var(--ds-ink-2)">' +
            CN.util.escapar(a.obs) + '</p>'
        : '');

    /* Ações mudam conforme o estado atual da reserva */
    var acoes = $('#evento-acoes');
    var wa = 'https://wa.me/55' + CN.util.apenasDigitos(a.telefone);

    acoes.innerHTML =
      (a.status === 'agendado'
        ? '<button type="button" class="ds-btn ds-btn--primary" data-acao="concluir">Concluir atendimento</button>'
        : '<button type="button" class="ds-btn ds-btn--primary" data-acao="reabrir">Reabrir</button>') +
      '<a href="' + wa + '" target="_blank" rel="noopener" class="ds-btn">' +
        CN.util.escapar(a.telefone) +
      '</a>' +
      (a.status === 'agendado'
        ? '<button type="button" class="ds-btn ds-btn--quiet ml-auto" data-acao="cancelar">Cancelar horário</button>'
        : '<button type="button" class="ds-btn ds-btn--quiet ml-auto" data-acao="remover">Remover registro</button>');

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
      toast('Agendamento reaberto.');
    }

    if (acao === 'cancelar') {
      fecharModal('#modal-evento');
      confirmar({
        titulo: 'Cancelar horário',
        texto: 'O horário de ' + a.cliente + ' em ' + CN.util.dataCurta(a.data) + ' às ' +
               a.hora + ' volta a ficar disponível no site.',
        rotulo: 'Cancelar horário'
      }, function () {
        CN.store.atualizarStatus(a.id, 'cancelado');
        toast('Horário liberado.');
      });
    }

    if (acao === 'remover') {
      fecharModal('#modal-evento');
      confirmar({
        titulo: 'Remover registro',
        texto: 'O registro de ' + a.cliente + ' será apagado definitivamente. Não dá para desfazer.',
        rotulo: 'Remover'
      }, function () {
        CN.store.remover(a.id);
        toast('Registro removido.');
      });
    }
  }

  /* ══════════════════════════════════════════════════════════
     TELA 3 — SERVIÇOS
     Herói: o preço. Ação primária: novo serviço.

     "Editar" deixou de ser um botão por linha (seriam N alvos
     concorrendo) e virou a linha inteira. "Excluir" desceu para
     dentro do formulário, onde a confirmação de impacto já existe.
     ══════════════════════════════════════════════════════════ */
  function renderServicos() {
    /* Ativos primeiro; os inativos vão para o fim, esmaecidos.
       Isso substitui os três chips de filtro: um cardápio de
       barbearia tem meia dúzia de linhas.                    */
    var lista = CN.catalogo.servicos().slice().sort(function (x, y) {
      var ax = x.ativo !== false ? 0 : 1;
      var ay = y.ativo !== false ? 0 : 1;
      return ax - ay;
    });

    var corpo = $('#servicos-corpo');
    var vazio = $('#servicos-vazio');
    var tabela = $('#servicos-tabela');

    if (!lista.length) {
      corpo.innerHTML = '';        /* não deixa linhas órfãs no DOM */
      tabela.hidden = true;
      vazio.hidden = false;
      vazio.innerHTML = estadoVazio('Nenhum serviço no cardápio.');
      return;
    }

    tabela.hidden = false;
    vazio.hidden = true;

    corpo.innerHTML = lista.map(function (s) {
      var ativo = s.ativo !== false;
      return '' +
        '<tr class="is-clicavel' + (ativo ? '' : ' is-off') + '" data-svc-editar="' + s.id + '">' +

          '<td data-rotulo="Serviço">' +
            CN.util.escapar(s.nome) +
            /* O selo continua legível porque é load-bearing: o fluxo de
               agendamento usa 'destaque' para pré-selecionar o serviço
               de quem chega por ?barbeiro=. Sem cor, só em rótulo.    */
            (s.destaque
              ? '<span class="ds-eyebrow" style="margin-left:.5rem">' + CN.util.escapar(s.destaque) + '</span>'
              : '') +
          '</td>' +

          '<td data-rotulo="Preço" class="num tnum forte">' + CN.util.moeda(s.preco) + '</td>' +
          '<td data-rotulo="Duração" class="num tnum">' + s.duracao + ' min</td>' +

          '<td data-rotulo="No site" class="num col-acoes">' +
            '<input type="checkbox" class="ds-switch" data-svc-toggle="' + s.id + '"' +
              (ativo ? ' checked' : '') + ' aria-label="Disponível no site" />' +
          '</td>' +
        '</tr>';
    }).join('');

    /* --- Ações da tabela --- */
    $$('[data-svc-editar]', corpo).forEach(function (tr) {
      tr.addEventListener('click', function (e) {
        /* O interruptor tem ação própria: não abre o formulário */
        if (e.target.closest('[data-svc-toggle]')) return;
        abrirFormServico(tr.dataset.svcEditar);
      });
    });

    $$('[data-svc-toggle]', corpo).forEach(function (sw) {
      sw.addEventListener('change', function () {
        var s = CN.catalogo.alternarServico(sw.dataset.svcToggle);
        toast('"' + s.nome + '" ' + (s.ativo ? 'voltou ao site.' : 'saiu do site.'));
      });
    });
  }

  /* --- Formulário de serviço (criar / editar) --- */
  function abrirFormServico(id) {
    var s = id ? CN.util.servicoPorId(id) : null;
    ui.servicoEmEdicao = s ? s.id : null;

    $('#form-servico-titulo').textContent = s ? 'Editar serviço' : 'Novo serviço';

    $('#fs-nome').value = s ? s.nome : '';
    $('#fs-desc').value = s ? (s.desc || '') : '';
    $('#fs-preco').value = s ? s.preco : '';
    $('#fs-duracao').value = s ? s.duracao : 40;
    $('#fs-destaque').value = s ? (s.destaque || '') : '';
    $('#fs-ativo').checked = s ? s.ativo !== false : true;

    /* Excluir só existe em modo edição */
    $('#form-servico-excluir').hidden = !s;

    $$('.ds-error', $('#modal-servico')).forEach(function (e) { e.classList.remove('is-visible'); });
    $$('.ds-input', $('#modal-servico')).forEach(function (e) { e.classList.remove('has-error'); });

    abrirModal('#modal-servico');
    setTimeout(function () { $('#fs-nome').focus(); }, 60);
  }

  function excluirServicoEmEdicao() {
    var s = CN.util.servicoPorId(ui.servicoEmEdicao);
    if (!s) return;
    var usos = CN.store.ativos().filter(function (a) { return a.servicoId === s.id; }).length;

    fecharModal('#modal-servico');
    confirmar({
      titulo: 'Excluir serviço',
      texto: usos
        ? s.nome + ' sai do site agora. ' +
          (usos === 1
            ? 'O agendamento que já o usa continua'
            : 'Os ' + usos + ' agendamentos que já o usam continuam') +
          ' na agenda, com o nome preservado.'
        : s.nome + ' deixa de aparecer no site imediatamente.',
      rotulo: 'Excluir serviço'
    }, function () {
      CN.catalogo.removerServico(s.id);
      ui.servicoEmEdicao = null;
      toast('Serviço "' + s.nome + '" excluído.');
    });
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
     Herói: resultado líquido. Os quatro cartões de mesmo peso
     viraram um número e uma linha de decomposição: assim o dono
     não precisa refazer a subtração de cabeça toda vez.

     O gráfico de linha saiu. Não era leitura de tendência: como
     o mês corrente parte de uma base fixa maior que qualquer mês
     do histórico, o último ponto é SEMPRE o máximo da série — a
     curva nunca pode descer.
     ══════════════════════════════════════════════════════════ */
  function renderFinancas() {
    var fin = CN.store.financeiro();

    $('#fin-liquido').textContent = CN.util.moeda(fin.lucroLiquido);
    $('#fin-decomposicao').textContent =
      CN.util.moeda(fin.faturamento) + ' de faturamento − ' +
      CN.util.moeda(fin.faturamento - fin.lucroBruto) + ' de custo − ' +
      CN.util.moeda(fin.despesasFixas) + ' de despesas fixas';

    /* Um único marcador de simulação. O herói é majoritariamente
       uma base fictícia de data.js: apagar o número e o aviso ao
       mesmo tempo entregaria ficção como fato.                  */
    $('#fin-simulado').textContent =
      'Simulado · ' + CN.util.moeda(fin.baseSimulada) + ' de base + ' +
      fin.atendimentosMes + ' agendamentos reais';

    /* Tabela de comissões. A coluna Receita fica: sem ela o dono
       paga um número que a tela não deixa conferir.            */
    var corpo = $('#fin-barbeiros');
    var comTotal = fin.porBarbeiro.reduce(function (s, b) { return s + b.comissao; }, 0);

    corpo.innerHTML = fin.porBarbeiro.map(function (b) {
      return '' +
        '<tr>' +
          '<td data-rotulo="Barbeiro">' + CN.util.escapar(b.nome) + '</td>' +
          '<td data-rotulo="Receita" class="num tnum">' + CN.util.moeda(b.total) + '</td>' +
          '<td data-rotulo="Comissão" class="num tnum forte">' + CN.util.moeda(b.comissao) + '</td>' +
        '</tr>';
    }).join('') +
    '<tr>' +
      '<td data-rotulo="Total" class="forte">Total</td>' +
      '<td class="num tnum">' + CN.util.moeda(fin.porBarbeiro.reduce(function (s, b) { return s + b.total; }, 0)) + '</td>' +
      '<td class="num tnum forte">' + CN.util.moeda(comTotal) + '</td>' +
    '</tr>';

    CN.charts.desenhar($('#fin-rank-servicos'), 'ranking',
      fin.porServico.map(function (s) {
        return { rotulo: s.nome, valor: s.total, extra: s.qtd + '×' };
      }),
      { vazio: 'Nenhuma venda registrada neste mês.' });
  }

  /* ══════════════════════════════════════════════════════════
     TELA 5 — BARBEIROS
     Os quatro cartões viraram uma tabela: o interruptor passa a
     ficar na mesma linha dos números que justificam apertá-lo.
     Foto, cargo e nota saíram — a nota é constante de data.js
     que nenhuma tela edita, então nunca dispara ação.
     ══════════════════════════════════════════════════════════ */
  function renderBarbeiros() {
    var fin = CN.store.financeiro();
    var hoje = CN.util.hojeISO();
    var corpo = $('#barbeiros-corpo');

    corpo.innerHTML = CN.catalogo.barbeiros().map(function (b) {
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
        '<tr' + (ativo ? '' : ' class="is-off"') + '>' +
          '<td data-rotulo="Barbeiro">' +
            CN.util.escapar(b.nome) +
            (folgaHoje && ativo ? '<span style="color:var(--ds-ink-3)"> · de folga hoje</span>' : '') +
          '</td>' +
          '<td data-rotulo="Atendimentos" class="num tnum">' + dados.atendimentos + '</td>' +
          '<td data-rotulo="Receita" class="num tnum">' + CN.util.moeda(dados.total) + '</td>' +
          '<td data-rotulo="Comissão" class="num tnum forte">' + CN.util.moeda(dados.comissao) + '</td>' +
          '<td data-rotulo="Ocupação" class="num tnum">' + ocupacao + '%</td>' +
          '<td data-rotulo="Na agenda" class="num col-acoes">' +
            '<input type="checkbox" class="ds-switch" data-barb-toggle="' + b.id + '"' +
              (ativo ? ' checked' : '') + ' aria-label="Ativo na agenda" />' +
          '</td>' +
        '</tr>';
    }).join('');

    $$('[data-barb-toggle]', corpo).forEach(function (sw) {
      sw.addEventListener('change', function () {
        var b = CN.catalogo.alternarBarbeiro(sw.dataset.barbToggle);
        toast(b.nome.split(' ')[0] + (b.ativo
          ? ' voltou à agenda.'
          : ' pausado — não recebe novos agendamentos.'));
      });
    });
  }

  /* ══════════════════════════════════════════════════════════
     TELA 6 — CLIENTES
     Herói: visitas. A ordenação é feita AQUI, na camada de view —
     store.clientes() não é tocado, porque ele é relatório e está
     congelado junto com o resto do cálculo.

     O telefone continua legível e o alvo é persistente: abaixo de
     720px a tabela vira cartões e hover não existe, então esconder
     a ação no hover apagaria número E ação justamente no aparelho
     em que o dono abre o painel de manhã.
     ══════════════════════════════════════════════════════════ */
  function renderClientes() {
    var todos = CN.store.clientes().slice().sort(function (x, y) {
      return y.visitas - x.visitas;
    });
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

    var tabela = $('#clientes-tabela');
    var vazio = $('#clientes-vazio');

    if (!lista.length) {
      /* Limpa o corpo: sem isso as linhas do filtro anterior ficam no DOM
         por trás da tabela oculta. */
      $('#clientes-corpo').innerHTML = '';
      tabela.hidden = true;
      vazio.hidden = false;
      vazio.innerHTML = estadoVazio(todos.length
        ? 'Nenhum cliente corresponde a "' + ui.buscaCliente + '".'
        : 'Nenhum cliente ainda.');
      return;
    }

    tabela.hidden = false;
    vazio.hidden = true;

    $('#clientes-corpo').innerHTML = lista.map(function (c) {
      return '' +
        '<tr>' +
          '<td data-rotulo="Cliente">' + CN.util.escapar(c.nome) + '</td>' +
          '<td data-rotulo="Visitas" class="num tnum forte">' + c.visitas +
            /* Este contador é o único lugar do produto onde o dado
               existe — e é ele que separa o cliente fiel do que
               costuma furar.                                      */
            (c.cancelamentos
              ? '<span style="color:var(--ds-ink-3);font-weight:400"> · ' + c.cancelamentos + ' canc.</span>'
              : '') +
          '</td>' +
          '<td data-rotulo="Última visita" class="num tnum">' + (c.ultima ? CN.util.dataCurta(c.ultima) : '—') + '</td>' +
          '<td data-rotulo="Falar" class="num col-acoes">' +
            '<a href="https://wa.me/55' + CN.util.apenasDigitos(c.telefone) + '" target="_blank" rel="noopener" ' +
               'class="ds-btn ds-btn--sm tnum">' + CN.util.escapar(c.telefone) + '</a>' +
          '</td>' +
        '</tr>';
    }).join('');
  }

  /* ══════════════════════════════════════════════════════════
     TELA 7 — CONFIGURAÇÕES
     Herói: o expediente — a única coisa daqui com efeito no que o
     site vende. Por isso ele vem primeiro na tela.

     O expediente deixou de gravar sozinho no 'change': agora ele
     e os dados do negócio são cometidos pelo MESMO botão Salvar,
     que assim vira a ação primária do herói em vez de um botão de
     duas vezes por ano. CN.catalogo.salvarHorarios não mudou.
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

    desenharExpediente();

    /* Estatísticas de armazenamento */
    var ag = CN.store.todos();
    $('#cfg-dados-resumo').textContent =
      ag.length + ' agendamentos · ' + CN.catalogo.servicos().length + ' serviços · ' +
      CN.catalogo.barbeiros().length + ' barbeiros salvos neste navegador';
  }

  /* Expediente: uma linha por dia da semana.
     O nome do dia é o <label> do interruptor — sem isso ele seria um
     controle anônimo para quem usa leitor de tela, já que a palavra
     "Aberto/Fechado" saiu. E nos dias fechados os campos de hora
     somem: a ausência é o estado, não precisa de rótulo.          */
  function desenharExpediente() {
    var h = CN.catalogo.horarios();
    var ordem = [1, 2, 3, 4, 5, 6, 0];

    $('#cfg-expediente').innerHTML = ordem.map(function (dow) {
      var dia = h[dow];
      var aberto = rascunhoExpediente[dow] !== undefined ? rascunhoExpediente[dow] : !!dia;
      var abre = dia ? dia.abre : '09:00';
      var fecha = dia ? dia.fecha : '20:00';

      return '' +
        '<div class="flex items-center gap-4 py-2.5 border-b" style="border-color:var(--ds-line)">' +
          '<input type="checkbox" class="ds-switch" id="dia-' + dow + '" data-dia-toggle="' + dow + '"' +
            (aberto ? ' checked' : '') + ' />' +
          '<label for="dia-' + dow + '" class="w-24 shrink-0 cursor-pointer">' + CN.DIAS_SEMANA[dow] + '</label>' +
          (aberto
            ? '<div class="flex items-center gap-2">' +
                '<input type="time" class="ds-input tnum" style="padding:.35rem .5rem;width:auto" data-dia-abre="' + dow + '" value="' + abre + '" aria-label="Abre" />' +
                '<span style="color:var(--ds-ink-3)">—</span>' +
                '<input type="time" class="ds-input tnum" style="padding:.35rem .5rem;width:auto" data-dia-fecha="' + dow + '" value="' + fecha + '" aria-label="Fecha" />' +
              '</div>'
            : '<span style="color:var(--ds-ink-3)">Fechado</span>') +
        '</div>';
    }).join('');

    /* Ligar/desligar um dia redesenha a linha para mostrar ou esconder
       os campos de hora, mas NÃO grava: quem grava é o Salvar. */
    $$('[data-dia-toggle]', $('#cfg-expediente')).forEach(function (campo) {
      campo.addEventListener('change', function () {
        rascunhoExpediente[campo.dataset.diaToggle] = campo.checked;
        desenharExpediente();
      });
    });
  }

  /* Um único commit: expediente + dados do negócio */
  function salvarConfiguracoes() {
    var mapa = {};
    var avisou = false;

    [0, 1, 2, 3, 4, 5, 6].forEach(function (dow) {
      var toggle = $('[data-dia-toggle="' + dow + '"]');
      if (!toggle) return;
      if (!toggle.checked) { mapa[dow] = null; return; }

      var abre = $('[data-dia-abre="' + dow + '"]').value || '09:00';
      var fecha = $('[data-dia-fecha="' + dow + '"]').value || '20:00';

      /* Fechamento antes da abertura zeraria a agenda inteira do dia */
      if (CN.util.minutos(fecha) <= CN.util.minutos(abre)) {
        fecha = CN.util.paraHora(Math.min(24 * 60 - 30, CN.util.minutos(abre) + 480));
        avisou = true;
      }
      mapa[dow] = { abre: abre, fecha: fecha };
    });

    CN.catalogo.salvarHorarios(mapa);

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

    rascunhoExpediente = {};
    toast(avisou
      ? 'Salvo. Um fechamento anterior à abertura foi corrigido.'
      : 'Alterações salvas. O site já está usando os novos horários.');
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

    toast('Backup exportado.');
  }

  /* ══════════════════════════════════════════════════════════
     ESTADO VAZIO
     Uma frase. Sem ícone e sem segunda linha pedagógica: quem
     olha uma tabela vazia já sabe que ela está vazia.
     ══════════════════════════════════════════════════════════ */
  function estadoVazio(texto) {
    return '<p class="ds-empty">' + CN.util.escapar(texto) + '</p>';
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
    $('#form-servico-excluir').addEventListener('click', excluirServicoEmEdicao);
    $('#form-servico').addEventListener('submit', function (e) { e.preventDefault(); salvarFormServico(); });

    /* --- Clientes --- */
    $('#clientes-busca').addEventListener('input', function () {
      ui.buscaCliente = this.value;
      renderClientes();
    });

    /* --- Configurações --- */
    $('#cfg-salvar').addEventListener('click', salvarConfiguracoes);
    $('#cfg-exportar').addEventListener('click', exportarDados);

    $('#cfg-demo').addEventListener('click', function () {
      var n = CN.store.popularDemo();
      toast(n > 0 ? n + ' agendamentos de demonstração criados.' : 'A agenda de demonstração já está preenchida.');
    });

    $('#cfg-limpar').addEventListener('click', function () {
      var total = CN.store.todos().length;
      if (!total) { toast('A agenda já está vazia.'); return; }
      confirmar({
        titulo: 'Limpar agendamentos',
        texto: 'Apagar ' + total + ' agendamentos deste navegador. Serviços, equipe e configurações são preservados.',
        rotulo: 'Apagar ' + total + ' agendamentos'
      }, function () {
        CN.store.limpar();
        toast('Agenda zerada.');
      });
    });

    $('#cfg-restaurar').addEventListener('click', function () {
      confirmar({
        titulo: 'Restaurar catálogo padrão',
        texto: 'Serviços, equipe, expediente e configurações voltam aos valores de fábrica. Os agendamentos não são apagados.',
        rotulo: 'Restaurar'
      }, function () {
        CN.catalogo.restaurarPadrao();
        rascunhoExpediente = {};
        toast('Catálogo restaurado ao padrão.');
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
