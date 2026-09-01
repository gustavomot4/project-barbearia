/* ============================================================
   CASA NAVALHA — Fluxo de agendamento (stepper de 4 etapas)
   1. Serviço  2. Barbeiro  3. Data e horário  4. Dados
   O estado vive em memória e só vira registro no localStorage
   quando o cliente confirma na última etapa.
   ============================================================ */

window.CN = window.CN || {};

CN.booking = (function () {

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var ETAPAS = [
    { n: 1, rotulo: 'Serviço' },
    { n: 2, rotulo: 'Barbeiro' },
    { n: 3, rotulo: 'Horário' },
    { n: 4, rotulo: 'Dados' }
  ];

  /* Estado do formulário em andamento */
  var estado = {
    etapa: 1,
    servicoId: null,
    barbeiroId: null,
    data: null,
    hora: null,
    nome: '',
    telefone: '',
    obs: '',
    lembrete: true
  };

  var ultimaReserva = null;   /* usado pelo modal de confirmação */

  /* ══════════════════════════════════════════════════════════
     TRILHA DE PROGRESSO
     ══════════════════════════════════════════════════════════ */
  function renderStepper() {
    var alvo = $('#stepper');
    if (!alvo) return;

    alvo.innerHTML = ETAPAS.map(function (e, i) {
      var classe = e.n < estado.etapa ? 'is-done'
                 : e.n === estado.etapa ? 'is-current' : '';

      var conteudo = e.n < estado.etapa
        ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>'
        : e.n;

      var item = '' +
        '<li class="stepper-item flex items-center ' + classe + '"' +
        (e.n === estado.etapa ? ' aria-current="step"' : '') + '>' +
          '<span class="stepper-node">' + conteudo + '</span>' +
          '<span class="stepper-label hidden sm:inline">' + e.rotulo + '</span>' +
        '</li>';

      /* Barra de ligação entre os nós (não vai depois do último) */
      var barra = i < ETAPAS.length - 1 ? '<li class="stepper-bar" aria-hidden="true"></li>' : '';
      return item + barra;
    }).join('');
  }

  /* ══════════════════════════════════════════════════════════
     ETAPA 1 — SERVIÇOS
     ══════════════════════════════════════════════════════════ */
  function renderServicos() {
    var alvo = $('#svc-list');
    if (!alvo) return;

    alvo.innerHTML = CN.SERVICOS.map(function (s) {
      var sel = estado.servicoId === s.id;
      return '' +
        '<button type="button" class="opt p-4 sm:p-5 ' + (sel ? 'is-selected' : '') + '" data-servico="' + s.id + '" aria-pressed="' + sel + '">' +
          '<span class="flex items-center gap-4">' +
            '<span class="opt-dot" aria-hidden="true"></span>' +
            '<span class="flex-1 min-w-0">' +
              '<span class="flex items-center gap-2 flex-wrap">' +
                '<span class="font-medium text-bone">' + CN.util.escapar(s.nome) + '</span>' +
                (s.destaque ? '<span class="px-1.5 py-0.5 bg-gold/15 text-gold text-[9px] tracking-[0.14em] uppercase">' + CN.util.escapar(s.destaque) + '</span>' : '') +
              '</span>' +
              '<span class="block text-xs text-bone-faint mt-1">' + s.duracao + ' min</span>' +
            '</span>' +
            '<span class="font-serif text-xl font-semibold text-gold shrink-0">' + CN.util.moeda(s.preco) + '</span>' +
          '</span>' +
        '</button>';
    }).join('');

    $$('[data-servico]', alvo).forEach(function (btn) {
      btn.addEventListener('click', function () {
        selecionarServico(btn.dataset.servico);
      });
    });
  }

  function selecionarServico(id) {
    if (estado.servicoId !== id) {
      /* Trocar de serviço muda a duração — o horário escolhido pode
         não caber mais na agenda, então zeramos por segurança.     */
      estado.hora = null;
    }
    estado.servicoId = id;
    renderServicos();
    atualizarResumo();
    atualizarBotoes();
  }

  /* ══════════════════════════════════════════════════════════
     ETAPA 2 — BARBEIROS
     ══════════════════════════════════════════════════════════ */
  function renderBarbeiros() {
    var alvo = $('#barber-list');
    if (!alvo) return;

    alvo.innerHTML = CN.BARBEIROS.map(function (b) {
      var sel = estado.barbeiroId === b.id;
      return '' +
        '<button type="button" class="opt p-4 ' + (sel ? 'is-selected' : '') + '" data-barbeiro="' + b.id + '" aria-pressed="' + sel + '">' +
          '<span class="flex items-center gap-4">' +
            '<span class="relative shrink-0 w-14 h-14 overflow-hidden bg-ink-600">' +
              '<img data-src="' + b.foto + '" alt="" class="w-full h-full object-cover" loading="lazy" />' +
            '</span>' +
            '<span class="flex-1 min-w-0 text-left">' +
              '<span class="block font-medium text-bone truncate">' + CN.util.escapar(b.nome) + '</span>' +
              '<span class="block text-xs text-bone-faint mt-0.5 truncate">' + CN.util.escapar(b.especialidade) + '</span>' +
              '<span class="inline-flex items-center gap-1 text-[10px] text-gold mt-1.5">' +
                '<svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z"/></svg>' +
                b.nota.toFixed(1) +
              '</span>' +
            '</span>' +
            '<span class="opt-dot shrink-0" aria-hidden="true"></span>' +
          '</span>' +
        '</button>';
    }).join('');

    $$('[data-barbeiro]', alvo).forEach(function (btn) {
      btn.addEventListener('click', function () {
        selecionarBarbeiro(btn.dataset.barbeiro);
      });
    });

    CN.ui.ativarLazy(alvo);
  }

  function selecionarBarbeiro(id) {
    if (estado.barbeiroId !== id) {
      /* Agenda é por barbeiro: trocar invalida data e hora */
      estado.data = null;
      estado.hora = null;
    }
    estado.barbeiroId = id;
    renderBarbeiros();
    atualizarResumo();
    atualizarBotoes();
  }

  /* ══════════════════════════════════════════════════════════
     ETAPA 3 — DATA E HORÁRIO
     ══════════════════════════════════════════════════════════ */
  /* Ao chegar na etapa 3 sem data escolhida, já abrimos no primeiro dia
     com folga real de agenda. Poupa um toque no celular e evita cair
     em "hoje" quando só sobrou um horário no fim do expediente.       */
  function garantirDataPadrao() {
    if (estado.data || !estado.barbeiroId || !estado.servicoId) return;

    var servico = CN.util.servicoPorId(estado.servicoId);
    var reserva = null;   /* primeiro dia com qualquer vaga, como plano B */

    for (var i = 0; i < CN.CONFIG.janelaDias; i++) {
      var iso = CN.util.toISO(CN.util.addDias(new Date(), i));
      if (!CN.slots.barbeiroTrabalha(estado.barbeiroId, iso)) continue;

      var livres = CN.slots.listar(iso, estado.barbeiroId, servico.duracao)
        .filter(function (s) { return s.disponivel; }).length;

      if (livres >= 3) { estado.data = iso; return; }
      if (livres > 0 && !reserva) reserva = iso;
    }
    estado.data = reserva;
  }

  function renderDatas() {
    var alvo = $('#date-strip');
    if (!alvo || !estado.barbeiroId) return;

    var barbeiro = CN.util.barbeiroPorId(estado.barbeiroId);
    var hoje = new Date();
    var html = '';

    for (var i = 0; i < CN.CONFIG.janelaDias; i++) {
      var dia = CN.util.addDias(hoje, i);
      var iso = CN.util.toISO(dia);
      var trabalha = CN.slots.barbeiroTrabalha(estado.barbeiroId, iso);

      /* Um dia só entra habilitado se ainda restar algum horário livre */
      var temVaga = false;
      if (trabalha && estado.servicoId) {
        var servico = CN.util.servicoPorId(estado.servicoId);
        temVaga = CN.slots.listar(iso, estado.barbeiroId, servico.duracao)
                    .some(function (s) { return s.disponivel; });
      }

      var sel = estado.data === iso;
      var titulo = !trabalha
        ? (CN.slots.expediente(iso) ? barbeiro.nome.split(' ')[0] + ' folga neste dia' : 'Barbearia fechada')
        : (temVaga ? 'Ver horários' : 'Agenda cheia');

      html += '' +
        '<button type="button" class="day-chip ' + (sel ? 'is-selected' : '') + '"' +
          ' data-data="' + iso + '"' + (temVaga ? '' : ' disabled') +
          ' title="' + CN.util.escapar(titulo) + '" aria-pressed="' + sel + '">' +
          '<span class="day-chip__dow">' + (i === 0 ? 'Hoje' : CN.DIAS_CURTO[dia.getDay()]) + '</span>' +
          '<span class="day-chip__num">' + dia.getDate() + '</span>' +
          '<span class="day-chip__mon">' + CN.MESES_CURTO[dia.getMonth()] + '</span>' +
        '</button>';
    }

    alvo.innerHTML = html;

    $$('[data-data]', alvo).forEach(function (btn) {
      btn.addEventListener('click', function () {
        estado.data = btn.dataset.data;
        estado.hora = null;
        renderDatas();
        renderHorarios();
        atualizarResumo();
        atualizarBotoes();
      });
    });

    /* Mantém o dia escolhido visível na faixa rolável */
    var ativo = $('.day-chip.is-selected', alvo);
    if (ativo) ativo.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }

  function renderHorarios() {
    var alvo = $('#slot-grid');
    var legenda = $('#slot-sub');
    if (!alvo) return;

    if (!estado.data) {
      alvo.innerHTML = vazio('Escolha uma data acima para ver os horários livres.');
      return;
    }

    var servico = CN.util.servicoPorId(estado.servicoId);
    var lista = CN.slots.listar(estado.data, estado.barbeiroId, servico.duracao);
    var barbeiro = CN.util.barbeiroPorId(estado.barbeiroId);

    if (legenda) {
      legenda.textContent = barbeiro.nome.split(' ')[0] + ' · ' +
        CN.util.dataExtenso(estado.data) + ' · bloco de ' + servico.duracao + ' min';
    }

    if (!lista.length) {
      alvo.innerHTML = vazio('Sem expediente nesta data. Tente outro dia.');
      return;
    }

    var livres = lista.filter(function (s) { return s.disponivel; }).length;
    if (livres === 0) {
      alvo.innerHTML = vazio('Agenda cheia neste dia. Escolha outra data ou outro barbeiro.');
      return;
    }

    alvo.innerHTML = lista.map(function (s) {
      var sel = estado.hora === s.hora;
      return '' +
        '<button type="button" class="slot ' + (sel ? 'is-selected' : '') + '"' +
          ' data-hora="' + s.hora + '"' + (s.disponivel ? '' : ' disabled') +
          ' title="' + CN.util.escapar(s.disponivel ? 'Disponível' : s.motivo) + '"' +
          ' aria-pressed="' + sel + '">' + s.hora + '</button>';
    }).join('');

    $$('[data-hora]', alvo).forEach(function (btn) {
      btn.addEventListener('click', function () {
        estado.hora = btn.dataset.hora;
        renderHorarios();
        atualizarResumo();
        atualizarBotoes();
      });
    });
  }

  function vazio(texto) {
    return '<p class="col-span-full py-8 text-center text-sm text-bone-faint border border-dashed border-white/10">' +
             CN.util.escapar(texto) + '</p>';
  }

  /* ══════════════════════════════════════════════════════════
     ETAPA 4 — DADOS DO CLIENTE
     ══════════════════════════════════════════════════════════ */
  function iniciarFormulario() {
    var nome = $('#f-nome');
    var tel = $('#f-tel');
    var obs = $('#f-obs');
    var lembrete = $('#f-lembrete');

    /* Máscara aplicada enquanto digita, preservando a posição do cursor
       quando o usuário edita no meio do texto.                        */
    tel.addEventListener('input', function () {
      var noFim = tel.selectionStart === tel.value.length;
      tel.value = CN.util.mascaraTelefone(tel.value);
      if (noFim) tel.setSelectionRange(tel.value.length, tel.value.length);
      estado.telefone = tel.value;
      limparErro('telefone');
      atualizarBotoes();
    });

    nome.addEventListener('input', function () {
      estado.nome = nome.value;
      limparErro('nome');
      atualizarBotoes();
    });

    obs.addEventListener('input', function () { estado.obs = obs.value; });
    lembrete.addEventListener('change', function () { estado.lembrete = lembrete.checked; });

    /* Enter no formulário confirma em vez de recarregar a página */
    $('#client-form').addEventListener('submit', function (e) {
      e.preventDefault();
      confirmar();
    });
  }

  function validarCliente(mostrarErros) {
    var ok = true;

    var nome = estado.nome.trim();
    if (nome.length < 3 || nome.split(/\s+/).length < 2) {
      if (mostrarErros) marcarErro('nome', 'Informe nome e sobrenome.');
      ok = false;
    }

    var digitos = CN.util.apenasDigitos(estado.telefone);
    if (digitos.length < 10 || digitos.length > 11) {
      if (mostrarErros) marcarErro('telefone', 'Informe um número com DDD. Ex.: (11) 99999-9999');
      ok = false;
    }

    return ok;
  }

  function marcarErro(campo, mensagem) {
    var alvo = $('[data-error-for="' + campo + '"]');
    var input = $('[name="' + campo + '"]');
    if (alvo) {
      alvo.textContent = mensagem;
      alvo.classList.add('is-visible');
    }
    if (input) {
      input.classList.add('has-error');
      input.classList.remove('shake');
      void input.offsetWidth;          /* reinicia a animação */
      input.classList.add('shake');
    }
  }

  function limparErro(campo) {
    var alvo = $('[data-error-for="' + campo + '"]');
    var input = $('[name="' + campo + '"]');
    if (alvo) { alvo.textContent = ''; alvo.classList.remove('is-visible'); }
    if (input) input.classList.remove('has-error');
  }

  /* ══════════════════════════════════════════════════════════
     RESUMO (lateral no desktop, barra fixa no mobile)
     ══════════════════════════════════════════════════════════ */
  function atualizarResumo() {
    var servico  = estado.servicoId  ? CN.util.servicoPorId(estado.servicoId)   : null;
    var barbeiro = estado.barbeiroId ? CN.util.barbeiroPorId(estado.barbeiroId) : null;

    var linhas = [
      { rotulo: 'Serviço',  valor: servico  ? servico.nome  : null },
      { rotulo: 'Barbeiro', valor: barbeiro ? barbeiro.nome : null },
      { rotulo: 'Data',     valor: estado.data ? CN.util.dataExtenso(estado.data) : null },
      { rotulo: 'Horário',  valor: estado.hora && servico
          ? estado.hora + ' — ' + CN.util.paraHora(CN.util.minutos(estado.hora) + servico.duracao)
          : null }
    ];

    var alvo = $('#summary');
    if (alvo) {
      alvo.innerHTML = linhas.map(function (l) {
        var preenchido = !!l.valor;
        return '' +
          '<div class="flex items-start justify-between gap-4 pb-3 border-b border-white/[0.06] last:border-0">' +
            '<dt class="text-[10px] tracking-[0.18em] uppercase text-bone-faint shrink-0 pt-0.5">' + l.rotulo + '</dt>' +
            '<dd class="text-right ' + (preenchido ? 'text-bone' : 'text-bone-faint') + '">' +
              (preenchido ? CN.util.escapar(l.valor) : '—') +
            '</dd>' +
          '</div>';
      }).join('');
    }

    var total = $('#summary-total');
    if (total) total.textContent = servico ? CN.util.moeda(servico.preco) : '—';

    atualizarBarraMobile(servico, barbeiro);
  }

  function atualizarBarraMobile(servico, barbeiro) {
    var barra = $('#booking-bar');
    if (!barra) return;

    /* Só aparece quando já há algo escolhido e a seção está visível */
    var temAlgo = !!servico;
    barra.classList.toggle('translate-y-full', !temAlgo || !secaoVisivel());

    if (!temAlgo) return;

    $('#bar-title').textContent = servico.nome;
    $('#bar-sub').textContent = [
      barbeiro ? barbeiro.nome.split(' ')[0] : null,
      estado.data ? CN.util.dataCurta(estado.data) : null,
      estado.hora
    ].filter(Boolean).join(' · ') || (servico.duracao + ' min');
    $('#bar-total').textContent = CN.util.moeda(servico.preco);
  }

  function secaoVisivel() {
    var sec = document.getElementById('agendar');
    if (!sec) return false;
    var r = sec.getBoundingClientRect();
    return r.top < window.innerHeight * 0.85 && r.bottom > 120;
  }

  /* ══════════════════════════════════════════════════════════
     NAVEGAÇÃO ENTRE ETAPAS
     ══════════════════════════════════════════════════════════ */
  function podeAvancar() {
    if (estado.etapa === 1) return !!estado.servicoId;
    if (estado.etapa === 2) return !!estado.barbeiroId;
    if (estado.etapa === 3) return !!(estado.data && estado.hora);
    if (estado.etapa === 4) return validarCliente(false);
    return false;
  }

  function atualizarBotoes() {
    var prev = $('#btn-prev');
    var next = $('#btn-next');
    var rotulo = $('#btn-next-label');

    prev.disabled = estado.etapa === 1;
    next.disabled = !podeAvancar();
    rotulo.textContent = estado.etapa === 4 ? 'Confirmar agendamento' : 'Continuar';
  }

  function irPara(n, voltando) {
    estado.etapa = Math.min(4, Math.max(1, n));

    $$('.step').forEach(function (s) {
      var ativa = Number(s.dataset.step) === estado.etapa;
      s.classList.toggle('hidden', !ativa);
      s.classList.toggle('is-back', !!voltando);
      if (ativa) {
        /* Reinicia a animação de entrada da etapa */
        s.style.animation = 'none';
        void s.offsetWidth;
        s.style.animation = '';
      }
    });

    if (estado.etapa === 3) { garantirDataPadrao(); renderDatas(); renderHorarios(); }

    renderStepper();
    /* Sempre depois de garantirDataPadrao(): a data escolhida
       automaticamente precisa aparecer no resumo na hora. */
    atualizarResumo();
    atualizarBotoes();
  }

  function avancar() {
    if (estado.etapa === 4) { confirmar(); return; }
    if (!podeAvancar()) return;
    irPara(estado.etapa + 1, false);
  }

  function voltar() {
    if (estado.etapa === 1) return;
    irPara(estado.etapa - 1, true);
  }

  /* ══════════════════════════════════════════════════════════
     CONFIRMAÇÃO
     ══════════════════════════════════════════════════════════ */
  function confirmar() {
    if (!validarCliente(true)) {
      CN.ui.toast('Confira os campos destacados.', 'error');
      return;
    }

    var servico = CN.util.servicoPorId(estado.servicoId);

    /* Revalida o horário no momento do envio: alguém pode ter
       reservado o mesmo slot em outra aba desde a etapa 3.    */
    var aindaLivre = CN.slots.listar(estado.data, estado.barbeiroId, servico.duracao)
      .some(function (s) { return s.hora === estado.hora && s.disponivel; });

    if (!aindaLivre) {
      CN.ui.toast('Esse horário acabou de ser ocupado. Escolha outro.', 'error');
      irPara(3, true);
      renderHorarios();
      return;
    }

    ultimaReserva = CN.store.criar({
      servicoId: estado.servicoId,
      barbeiroId: estado.barbeiroId,
      data: estado.data,
      hora: estado.hora,
      duracao: servico.duracao,
      preco: servico.preco,
      cliente: estado.nome.trim(),
      telefone: estado.telefone,
      obs: estado.obs.trim(),
      lembrete: estado.lembrete
    });

    abrirModal(ultimaReserva);
    CN.ui.renderTicker();
  }

  /* ══════════════════════════════════════════════════════════
     MODAL DE SUCESSO
     ══════════════════════════════════════════════════════════ */
  function abrirModal(reserva) {
    var modal = $('#confirm-modal');
    var card = $('#confirm-card');
    var servico = CN.util.servicoPorId(reserva.servicoId);
    var barbeiro = CN.util.barbeiroPorId(reserva.barbeiroId);

    $('#confirm-msg').textContent =
      reserva.cliente.split(' ')[0] + ', seu horário está reservado. ' +
      'Chegue com 5 minutos de folga — o café fica por nossa conta.';

    $('#confirm-details').innerHTML = [
      { r: 'Serviço',  v: servico.nome + ' · ' + servico.duracao + ' min' },
      { r: 'Barbeiro', v: barbeiro.nome },
      { r: 'Quando',   v: CN.util.dataExtenso(reserva.data) + ' às ' + reserva.hora },
      { r: 'Valor',    v: CN.util.moeda(reserva.preco) + ' (pago no balcão)' },
      { r: 'Local',    v: CN.CONFIG.endereco }
    ].map(function (l) {
      return '' +
        '<div class="flex items-start justify-between gap-4">' +
          '<dt class="text-[10px] tracking-[0.18em] uppercase text-bone-faint shrink-0 pt-0.5">' + l.r + '</dt>' +
          '<dd class="text-right text-bone">' + CN.util.escapar(l.v) + '</dd>' +
        '</div>';
    }).join('');

    $('#confirm-code').textContent = reserva.codigo;

    /* Mensagem pronta para o WhatsApp da barbearia */
    var texto =
      'Olá! Confirmando meu agendamento na ' + CN.CONFIG.nome + '.\n\n' +
      'Código: ' + reserva.codigo + '\n' +
      'Serviço: ' + servico.nome + '\n' +
      'Barbeiro: ' + barbeiro.nome + '\n' +
      'Data: ' + CN.util.dataExtenso(reserva.data) + ' às ' + reserva.hora + '\n' +
      'Nome: ' + reserva.cliente;

    $('#confirm-wa').href = 'https://wa.me/' + CN.CONFIG.whatsapp + '?text=' + encodeURIComponent(texto);

    montarParticulas();
    CN.ui.abrirOverlay(modal);
    requestAnimationFrame(function () { card.classList.add('is-in'); });
  }

  function fecharModal() {
    var modal = $('#confirm-modal');
    var card = $('#confirm-card');
    card.classList.remove('is-in');
    setTimeout(function () {
      CN.ui.fecharOverlay(modal);
      reiniciar();
    }, 320);
  }

  /* Estilhaços dourados que saem do selo de sucesso */
  function montarParticulas() {
    var burst = $('#burst');
    if (!burst) return;
    var total = 16;
    var html = '';
    for (var i = 0; i < total; i++) {
      var ang = (Math.PI * 2 * i) / total;
      var dist = 60 + Math.random() * 55;
      html += '<span class="spark" style="' +
        '--x:' + (Math.cos(ang) * dist).toFixed(1) + 'px;' +
        '--y:' + (Math.sin(ang) * dist).toFixed(1) + 'px;' +
        'animation-delay:' + (0.7 + Math.random() * 0.18).toFixed(2) + 's"></span>';
    }
    burst.innerHTML = html;
  }

  /* Arquivo .ics para o cliente jogar na agenda do celular */
  function baixarICS() {
    if (!ultimaReserva) return;
    var r = ultimaReserva;
    var servico = CN.util.servicoPorId(r.servicoId);
    var barbeiro = CN.util.barbeiroPorId(r.barbeiroId);

    var inicio = CN.util.toDateTime(r.data, r.hora);
    var fim = new Date(inicio.getTime() + r.duracao * 60000);

    var stamp = function (d) {
      return d.getUTCFullYear() +
        String(d.getUTCMonth() + 1).padStart(2, '0') +
        String(d.getUTCDate()).padStart(2, '0') + 'T' +
        String(d.getUTCHours()).padStart(2, '0') +
        String(d.getUTCMinutes()).padStart(2, '0') + '00Z';
    };

    var ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Casa Navalha//Agendamento//PT-BR',
      'BEGIN:VEVENT',
      'UID:' + r.id + '@casanavalha',
      'DTSTAMP:' + stamp(new Date()),
      'DTSTART:' + stamp(inicio),
      'DTEND:' + stamp(fim),
      'SUMMARY:' + servico.nome + ' — ' + CN.CONFIG.nome,
      'DESCRIPTION:Barbeiro: ' + barbeiro.nome + '\\nCódigo: ' + r.codigo,
      'LOCATION:' + CN.CONFIG.endereco,
      'BEGIN:VALARM',
      'TRIGGER:-PT2H',
      'ACTION:DISPLAY',
      'DESCRIPTION:Seu horário na ' + CN.CONFIG.nome + ' é daqui a 2 horas',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    var blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'casa-navalha-' + r.codigo + '.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);

    CN.ui.toast('Arquivo de calendário baixado.', 'info');
  }

  /* Limpa o formulário para um novo agendamento */
  function reiniciar() {
    estado.servicoId = null;
    estado.barbeiroId = null;
    estado.data = null;
    estado.hora = null;
    estado.obs = '';

    $('#f-obs').value = '';
    /* Nome e telefone ficam preenchidos: é comum agendar duas
       pessoas em sequência (o cliente e o filho, por exemplo). */

    renderServicos();
    renderBarbeiros();
    irPara(1, true);
    atualizarResumo();
  }

  /* ══════════════════════════════════════════════════════════
     INICIALIZAÇÃO
     ══════════════════════════════════════════════════════════ */
  function init() {
    renderStepper();
    renderServicos();
    renderBarbeiros();
    iniciarFormulario();
    atualizarResumo();
    atualizarBotoes();

    $('#btn-next').addEventListener('click', avancar);
    $('#btn-prev').addEventListener('click', voltar);
    $('#confirm-ics').addEventListener('click', baixarICS);

    $$('[data-close-modal]').forEach(function (el) {
      el.addEventListener('click', fecharModal);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !$('#confirm-modal').classList.contains('hidden')) {
        fecharModal();
      }
    });

    /* A barra-resumo do mobile só aparece perto da seção de agendamento */
    window.addEventListener('scroll', function () {
      var servico = estado.servicoId ? CN.util.servicoPorId(estado.servicoId) : null;
      var barbeiro = estado.barbeiroId ? CN.util.barbeiroPorId(estado.barbeiroId) : null;
      atualizarBarraMobile(servico, barbeiro);
    }, { passive: true });
  }

  return {
    init: init,
    selecionarServico: function (id) { selecionarServico(id); irPara(1, false); },
    selecionarBarbeiro: function (id) {
      /* Vindo da seção "Equipe": se ainda não houver serviço,
         assume o mais pedido para não travar o fluxo.         */
      if (!estado.servicoId) {
        var padrao = CN.SERVICOS.find(function (s) { return s.destaque; }) || CN.SERVICOS[0];
        selecionarServico(padrao.id);
      }
      selecionarBarbeiro(id);
      irPara(2, false);
    }
  };
})();
