/* ============================================================
   CASA NAVALHA — Fluxo de agendamento (agendar.html)
   1. Serviço  2. Barbeiro  3. Data e horário  4. Dados

   Página autônoma: funciona sozinha, sem depender do site
   institucional. Aceita pré-seleção pela URL:
     agendar.html?servico=combo-imperio
     agendar.html?barbeiro=diego

   O motor de horários (CN.slots), a checagem de conflito e a
   gravação (CN.store.criar) não mudaram: o redesenho é de
   composição e de hierarquia, não de regra.
   ============================================================ */

window.CN = window.CN || {};

CN.booking = (function () {

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var TOTAL_ETAPAS = 4;

  /* Estado do formulário em andamento */
  var estado = {
    etapa: 1,
    servicoId: null,
    barbeiroId: null,
    data: null,
    hora: null,
    nome: '',
    telefone: '',
    obs: ''
  };

  var ultimaReserva = null;   /* usado pelo modal de confirmação */

  /* ══════════════════════════════════════════════════════════
     ETAPA 1 — SERVIÇOS
     Preço e duração numa linha só. O marcador circular de seleção
     saiu: a borda em tinta já diz qual está escolhido.
     ══════════════════════════════════════════════════════════ */
  function renderServicos() {
    var alvo = $('#svc-list');
    if (!alvo) return;

    var lista = CN.catalogo.servicosAtivos();

    if (!lista.length) {
      alvo.innerHTML = vazio('Nenhum serviço disponível. Fale com a barbearia pelo telefone acima.');
      return;
    }

    alvo.innerHTML = lista.map(function (s) {
      var sel = estado.servicoId === s.id;
      return '' +
        '<button type="button" class="opt ' + (sel ? 'is-selected' : '') + '" data-servico="' + s.id + '" aria-pressed="' + sel + '">' +
          '<span class="flex items-baseline justify-between gap-4">' +
            '<span class="font-medium">' + CN.util.escapar(s.nome) + '</span>' +
            '<span class="tnum font-semibold shrink-0">' + CN.util.moeda(s.preco) + '</span>' +
          '</span>' +
          '<span class="flex items-baseline justify-between gap-4 fraco mt-0.5">' +
            '<span>' + (s.destaque ? CN.util.escapar(s.destaque) : '') + '</span>' +
            '<span class="shrink-0">' + s.duracao + ' min</span>' +
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
    atualizarBarra();
  }

  /* ══════════════════════════════════════════════════════════
     ETAPA 2 — BARBEIROS
     Foto, nome e especialidade. A nota saiu: 5.0 / 4.9 / 4.9 / 4.8
     não desempata escolha nenhuma.
     ══════════════════════════════════════════════════════════ */
  function renderBarbeiros() {
    var alvo = $('#barber-list');
    if (!alvo) return;

    alvo.innerHTML = CN.catalogo.barbeirosAtivos().map(function (b) {
      var sel = estado.barbeiroId === b.id;
      return '' +
        '<button type="button" class="opt ' + (sel ? 'is-selected' : '') + '" data-barbeiro="' + b.id + '" aria-pressed="' + sel + '">' +
          '<span class="flex items-center gap-3">' +
            '<img data-src="' + b.foto + '" alt="" class="barbeiro__foto" style="width:44px;height:44px" loading="lazy" />' +
            '<span class="min-w-0">' +
              '<span class="block font-medium truncate">' + CN.util.escapar(b.nome) + '</span>' +
              '<span class="block fraco truncate">' + CN.util.escapar(b.especialidade) +
                ' · folga ' + CN.DIAS_SEMANA[b.folga].toLowerCase() + '</span>' +
            '</span>' +
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
    atualizarBarra();
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

    var hoje = new Date();
    var html = '';
    var mesAnterior = null;

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

      /* O mês só é impresso quando muda: repetido 21 vezes era ruído,
         mas apagado por completo faria alguém marcar 3 de outubro
         achando que era 3 de setembro.                             */
      var mes = dia.getMonth();
      var mostraMes = mes !== mesAnterior;
      mesAnterior = mes;

      var sel = estado.data === iso;

      html += '' +
        '<button type="button" class="day-chip ' + (sel ? 'is-selected' : '') + '"' +
          ' data-data="' + iso + '"' + (temVaga ? '' : ' disabled') +
          ' aria-pressed="' + sel + '">' +
          '<span class="day-chip__dow">' + (i === 0 ? 'Hoje' : CN.DIAS_CURTO[dia.getDay()]) + '</span>' +
          '<span class="day-chip__num">' + dia.getDate() + '</span>' +
          '<span class="day-chip__mes">' + (mostraMes ? CN.MESES_CURTO[mes] : '') + '</span>' +
        '</button>';
    }

    alvo.innerHTML = html;

    $$('[data-data]', alvo).forEach(function (btn) {
      btn.addEventListener('click', function () {
        estado.data = btn.dataset.data;
        estado.hora = null;
        renderDatas();
        renderHorarios();
        atualizarBarra();
      });
    });

    /* Mantém o dia escolhido visível na faixa rolável */
    var ativo = $('.day-chip.is-selected', alvo);
    if (ativo) ativo.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }

  function renderHorarios() {
    var alvo = $('#slot-grid');
    var pergunta = $('#pergunta-horario');
    var sub = $('#slot-sub');
    if (!alvo) return;

    var servico = CN.util.servicoPorId(estado.servicoId);
    var barbeiro = CN.util.barbeiroPorId(estado.barbeiroId);

    /* A pergunta carrega o barbeiro — assim ele não precisa de uma
       linha própria de resumo.                                    */
    if (pergunta && barbeiro) {
      pergunta.textContent = 'Quando fica bom com o ' + barbeiro.nome.split(' ')[0] + '?';
    }

    /* Duração e término: a etapa 1 está oculta agora, então este é o
       único lugar do fluxo onde o cliente vê quanto tempo reserva. */
    if (sub && servico) {
      sub.textContent = servico.nome + ' · ' + servico.duracao + ' min';
    }

    if (!estado.data) {
      alvo.innerHTML = vazio('Escolha uma data acima.');
      return;
    }

    var lista = CN.slots.listar(estado.data, estado.barbeiroId, servico.duracao);

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
          ' aria-pressed="' + sel + '">' + s.hora + '</button>';
    }).join('');

    $$('[data-hora]', alvo).forEach(function (btn) {
      btn.addEventListener('click', function () {
        estado.hora = btn.dataset.hora;
        renderHorarios();
        atualizarBarra();
      });
    });
  }

  function vazio(texto) {
    return '<p class="vazio">' + CN.util.escapar(texto) + '</p>';
  }

  /* ══════════════════════════════════════════════════════════
     ETAPA 4 — DADOS DO CLIENTE
     O checkbox de lembrete saiu: o campo era escrito e lido por
     nada em todo o projeto, e um site estático não manda WhatsApp.
     Era uma promessa que o sistema não pode cumprir.
     ══════════════════════════════════════════════════════════ */
  function iniciarFormulario() {
    var nome = $('#f-nome');
    var tel = $('#f-tel');
    var obs = $('#f-obs');
    if (!nome || !tel) return;

    /* Máscara aplicada enquanto digita, preservando a posição do cursor
       quando o usuário edita no meio do texto.                        */
    tel.addEventListener('input', function () {
      var noFim = tel.selectionStart === tel.value.length;
      tel.value = CN.util.mascaraTelefone(tel.value);
      if (noFim) tel.setSelectionRange(tel.value.length, tel.value.length);
      estado.telefone = tel.value;
      limparErro('telefone');
      atualizarBarra();
    });

    nome.addEventListener('input', function () {
      estado.nome = nome.value;
      limparErro('nome');
      atualizarBarra();
    });

    obs.addEventListener('input', function () { estado.obs = obs.value; });

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
     BARRA DE AÇÃO
     Um botão primário, e o resumo como legenda dele. O botão
     desabilitado DIZ o que falta — uma placa colorida apagada
     não comunica nada.
     ══════════════════════════════════════════════════════════ */
  function atualizarBarra() {
    var servico  = estado.servicoId  ? CN.util.servicoPorId(estado.servicoId)   : null;
    var barbeiro = estado.barbeiroId ? CN.util.barbeiroPorId(estado.barbeiroId) : null;

    var prev = $('#btn-prev');
    var next = $('#btn-next');
    var rotulo = $('#btn-next-label');
    var resumo = $('#barra-resumo');
    if (!prev || !next) return;

    prev.disabled = estado.etapa === 1;

    var pode = podeAvancar();
    next.disabled = !pode;

    /* Rótulo do botão: quando dá para avançar, é a ação;
       quando não dá, é a instrução do que falta.        */
    var faltas = {
      1: 'Escolha um serviço',
      2: 'Escolha um barbeiro',
      3: estado.data ? 'Escolha um horário' : 'Escolha um dia',
      4: 'Preencha seus dados'
    };
    rotulo.textContent = pode
      ? (estado.etapa === TOTAL_ETAPAS ? 'Confirmar agendamento' : 'Continuar')
      : faltas[estado.etapa];

    /* Legenda da barra: o que já foi escolhido, ou a objeção que
       ainda precisa ser derrubada.                             */
    if (resumo) {
      if (!servico) {
        resumo.textContent = 'Sem cartão · cancele pelo telefone até 3h antes';
      } else {
        var partes = [servico.nome];
        if (barbeiro && estado.etapa > 2) partes.push(barbeiro.nome.split(' ')[0]);
        if (estado.data && estado.hora) partes.push(CN.util.dataCurta(estado.data) + ' ' + estado.hora);
        resumo.innerHTML = '<strong>' + CN.util.moeda(servico.preco) + '</strong> · ' +
                           CN.util.escapar(partes.join(' · '));
      }
    }

    /* Revisão da etapa 4 — aparece uma vez, onde revisar é decisão */
    var revisao = $('#revisao');
    if (revisao && servico && barbeiro && estado.data && estado.hora) {
      revisao.textContent =
        servico.nome + ' com ' + barbeiro.nome.split(' ')[0] + ' · ' +
        CN.util.dataExtenso(estado.data) + ', ' + estado.hora + ' · ' +
        CN.util.moeda(servico.preco);
    }

    $('#etapa-contador').textContent = 'Etapa ' + estado.etapa + ' de ' + TOTAL_ETAPAS;
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

  function irPara(n) {
    estado.etapa = Math.min(TOTAL_ETAPAS, Math.max(1, n));

    $$('.step').forEach(function (s) {
      s.classList.toggle('hidden', Number(s.dataset.step) !== estado.etapa);
    });

    if (estado.etapa === 3) { garantirDataPadrao(); renderDatas(); renderHorarios(); }

    atualizarBarra();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function avancar() {
    if (estado.etapa === TOTAL_ETAPAS) { confirmar(); return; }
    if (!podeAvancar()) return;
    irPara(estado.etapa + 1);
  }

  function voltar() {
    if (estado.etapa === 1) return;
    irPara(estado.etapa - 1);
  }

  /* ══════════════════════════════════════════════════════════
     CONFIRMAÇÃO
     ══════════════════════════════════════════════════════════ */
  function confirmar() {
    if (!validarCliente(true)) {
      CN.ui.toast('Confira os campos destacados.');
      return;
    }

    var servico = CN.util.servicoPorId(estado.servicoId);

    /* Revalida o horário no momento do envio: alguém pode ter
       reservado o mesmo slot em outra aba desde a etapa 3.    */
    var aindaLivre = CN.slots.listar(estado.data, estado.barbeiroId, servico.duracao)
      .some(function (s) { return s.hora === estado.hora && s.disponivel; });

    if (!aindaLivre) {
      CN.ui.toast('Esse horário acabou de ser ocupado. Escolha outro.');
      irPara(3);
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
      /* O campo continua no registro para não mudar a forma gravada
         no localStorage, mas o cliente não recebe mais a promessa de
         um lembrete que este sistema não tem como enviar. */
      lembrete: true
    });

    abrirModal(ultimaReserva);
  }

  /* ══════════════════════════════════════════════════════════
     MODAL DE SUCESSO
     Herói: data e hora. Ação primária: WhatsApp — é o único
     caminho pelo qual a reserva chega à barbearia num protótipo
     estático, já que o localStorage não atravessa dispositivos.
     ══════════════════════════════════════════════════════════ */
  function abrirModal(reserva) {
    var modal = $('#confirm-modal');
    var servico = CN.util.servicoPorId(reserva.servicoId);
    var barbeiro = CN.util.barbeiroPorId(reserva.barbeiroId);
    var d = CN.util.fromISO(reserva.data);

    $('#confirm-quando').textContent =
      CN.DIAS_CURTO[d.getDay()] + ', ' + d.getDate() + ' ' + CN.MESES_CURTO[d.getMonth()] +
      ' · ' + reserva.hora;

    $('#confirm-detalhe').textContent =
      servico.nome + ' com ' + barbeiro.nome.split(' ')[0] + ' · ' +
      CN.util.moeda(reserva.preco) + ' no balcão';

    var mapa = $('#confirm-mapa');
    mapa.textContent = CN.CONFIG.endereco;
    mapa.href = 'https://www.google.com/maps/search/?api=1&query=' +
                encodeURIComponent(CN.CONFIG.endereco);

    /* Mensagem pronta para o WhatsApp da barbearia */
    var texto =
      'Olá! Confirmando meu agendamento na ' + CN.CONFIG.nome + '.\n\n' +
      'Código: ' + reserva.codigo + '\n' +
      'Serviço: ' + servico.nome + '\n' +
      'Barbeiro: ' + barbeiro.nome + '\n' +
      'Data: ' + CN.util.dataExtenso(reserva.data) + ' às ' + reserva.hora + '\n' +
      'Nome: ' + reserva.cliente;

    $('#confirm-wa').href = 'https://wa.me/' + CN.CONFIG.whatsapp + '?text=' + encodeURIComponent(texto);

    CN.ui.abrirOverlay(modal);
  }

  function fecharModal() {
    CN.ui.fecharOverlay($('#confirm-modal'));
    reiniciar();
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

    CN.ui.toast('Arquivo de calendário baixado.');
  }

  /* Limpa o formulário para um novo agendamento */
  function reiniciar() {
    estado.servicoId = null;
    estado.barbeiroId = null;
    estado.data = null;
    estado.hora = null;
    estado.obs = '';

    var obs = $('#f-obs');
    if (obs) obs.value = '';
    /* Nome e telefone ficam preenchidos: é comum agendar duas
       pessoas em sequência (o cliente e o filho, por exemplo). */

    renderServicos();
    renderBarbeiros();
    irPara(1);
  }

  /* ══════════════════════════════════════════════════════════
     PRÉ-SELEÇÃO VIA URL
     Permite que o site institucional mande o visitante direto
     para o serviço ou o barbeiro em que ele clicou.
     ══════════════════════════════════════════════════════════ */
  function aplicarParametrosDaURL() {
    var p = new URLSearchParams(window.location.search);
    var servicoId = p.get('servico');
    var barbeiroId = p.get('barbeiro');
    var etapaInicial = 1;

    if (servicoId && CN.catalogo.servicosAtivos().some(function (s) { return s.id === servicoId; })) {
      selecionarServico(servicoId);
      etapaInicial = 2;
    }

    if (barbeiroId && CN.catalogo.barbeirosAtivos().some(function (b) { return b.id === barbeiroId; })) {
      /* Veio pela ficha de um barbeiro: se ainda não há serviço,
         assume o mais pedido para não travar o fluxo na etapa 1. */
      if (!estado.servicoId) {
        var lista = CN.catalogo.servicosAtivos();
        var padrao = lista.find(function (s) { return s.destaque; }) || lista[0];
        if (padrao) selecionarServico(padrao.id);
      }
      selecionarBarbeiro(barbeiroId);
      etapaInicial = 3;
    }

    if (etapaInicial > 1) irPara(etapaInicial);
  }

  /* ══════════════════════════════════════════════════════════
     INICIALIZAÇÃO
     ══════════════════════════════════════════════════════════ */
  function init() {
    if (!$('#btn-next')) return;   /* não estamos na página de agendamento */

    renderServicos();
    renderBarbeiros();
    iniciarFormulario();
    atualizarBarra();

    $('#btn-next').addEventListener('click', avancar);
    $('#btn-prev').addEventListener('click', voltar);

    var ics = $('#confirm-ics');
    if (ics) ics.addEventListener('click', baixarICS);

    $$('[data-close-modal]').forEach(function (el) {
      el.addEventListener('click', fecharModal);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !$('#confirm-modal').classList.contains('hidden')) {
        fecharModal();
      }
    });

    aplicarParametrosDaURL();
  }

  return {
    init: init,
    selecionarServico: selecionarServico,
    selecionarBarbeiro: selecionarBarbeiro,
    irPara: irPara
  };
})();
