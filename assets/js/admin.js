/* ============================================================
   CASA NAVALHA — Painel do proprietário (simulado)
   Lê os agendamentos do localStorage, mostra indicadores e
   permite concluir, cancelar ou remover cada reserva.
   ============================================================ */

window.CN = window.CN || {};

CN.admin = (function () {

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var CHAVE_SESSAO = 'casa_navalha:admin_liberado';
  var filtroAtual = 'todos';

  /* ══════════════════════════════════════════════════════════
     ABERTURA E TRAVA POR PIN
     ══════════════════════════════════════════════════════════ */
  function abrir() {
    var painel = $('#admin-panel');
    var folha = $('#admin-sheet');

    CN.ui.abrirOverlay(painel);
    requestAnimationFrame(function () { folha.classList.add('is-in'); });

    if (liberado()) {
      mostrarConteudo();
    } else {
      $('#admin-lock').classList.remove('hidden');
      $('#admin-content').classList.add('hidden');
      setTimeout(function () { $('#admin-pin').focus(); }, 420);
    }
  }

  function fechar() {
    var painel = $('#admin-panel');
    var folha = $('#admin-sheet');
    folha.classList.remove('is-in');
    setTimeout(function () { CN.ui.fecharOverlay(painel); }, 380);
  }

  /* A liberação vale só enquanto a aba estiver aberta */
  function liberado() {
    try { return sessionStorage.getItem(CHAVE_SESSAO) === '1'; }
    catch (e) { return false; }
  }

  function liberar() {
    try { sessionStorage.setItem(CHAVE_SESSAO, '1'); } catch (e) { /* modo privado */ }
    mostrarConteudo();
  }

  function mostrarConteudo() {
    $('#admin-lock').classList.add('hidden');
    $('#admin-content').classList.remove('hidden');
    render();
  }

  function tentarLiberar() {
    var campo = $('#admin-pin');
    var erro = $('#admin-pin-error');

    if (campo.value === CN.CONFIG.adminPin) {
      erro.classList.remove('is-visible');
      campo.value = '';
      liberar();
      CN.ui.toast('Bem-vindo de volta, chefe.', 'sucesso');
    } else {
      erro.textContent = 'PIN incorreto. Tente novamente.';
      erro.classList.add('is-visible');
      campo.classList.add('has-error', 'shake');
      campo.value = '';
      setTimeout(function () { campo.classList.remove('shake'); }, 450);
      campo.focus();
    }
  }

  /* ══════════════════════════════════════════════════════════
     INDICADORES
     ══════════════════════════════════════════════════════════ */
  function renderKPIs() {
    var s = CN.store.estatisticas();
    $('#kpi-hoje').textContent = s.hoje;
    $('#kpi-receita').textContent = CN.util.moeda(s.receita);
    $('#kpi-ticket').textContent = CN.util.moeda(s.ticket);
    $('#kpi-ocupacao').textContent = s.ocupacao + '%';
  }

  /* ══════════════════════════════════════════════════════════
     LISTA DE AGENDAMENTOS
     ══════════════════════════════════════════════════════════ */
  function filtrar(lista) {
    var hoje = CN.util.hojeISO();
    if (filtroAtual === 'hoje')      return lista.filter(function (a) { return a.data === hoje && a.status !== 'cancelado'; });
    if (filtroAtual === 'agendado')  return lista.filter(function (a) { return a.status === 'agendado'; });
    if (filtroAtual === 'concluido') return lista.filter(function (a) { return a.status === 'concluido'; });
    if (filtroAtual === 'cancelado') return lista.filter(function (a) { return a.status === 'cancelado'; });
    return lista;
  }

  function renderLista() {
    var alvo = $('#admin-list');
    var lista = filtrar(CN.store.todos());

    if (!lista.length) {
      alvo.innerHTML = estadoVazio();
      var seed = $('[data-seed-inline]', alvo);
      if (seed) seed.addEventListener('click', popular);
      return;
    }

    /* Agrupa por data para dar leitura de "agenda do dia" */
    var porData = {};
    lista.forEach(function (a) {
      (porData[a.data] = porData[a.data] || []).push(a);
    });

    var hoje = CN.util.hojeISO();

    alvo.innerHTML = Object.keys(porData).sort().map(function (data) {
      var titulo = data === hoje ? 'Hoje' : CN.util.dataExtenso(data);
      var passado = data < hoje;

      var cabecalho = '' +
        '<div class="flex items-center gap-3 mt-6 first:mt-0 mb-3">' +
          '<span class="text-[10px] tracking-ultra uppercase ' + (data === hoje ? 'text-gold' : 'text-bone-faint') + '">' +
            CN.util.escapar(titulo) + (passado ? ' · encerrado' : '') +
          '</span>' +
          '<span class="flex-1 h-px bg-white/[0.08]"></span>' +
          '<span class="text-[10px] text-bone-faint">' + porData[data].length + '</span>' +
        '</div>';

      return cabecalho + porData[data].map(linha).join('');
    }).join('');

    /* Liga as ações de cada linha */
    $$('[data-acao]', alvo).forEach(function (btn) {
      btn.addEventListener('click', function () {
        executarAcao(btn.dataset.acao, btn.dataset.id);
      });
    });
  }

  function linha(a) {
    var servico = CN.util.servicoPorId(a.servicoId);
    var barbeiro = CN.util.barbeiroPorId(a.barbeiroId);
    var fim = CN.util.paraHora(CN.util.minutos(a.hora) + (a.duracao || 30));

    var rotulos = { agendado: 'Agendado', concluido: 'Concluído', cancelado: 'Cancelado' };

    /* Ações mudam conforme o estado atual da reserva */
    var acoes = '';
    if (a.status === 'agendado') {
      acoes =
        '<button type="button" class="row-action row-action--ok" data-acao="concluir" data-id="' + a.id + '">Concluir</button>' +
        '<button type="button" class="row-action row-action--danger" data-acao="cancelar" data-id="' + a.id + '">Cancelar</button>';
    } else {
      acoes =
        '<button type="button" class="row-action" data-acao="reabrir" data-id="' + a.id + '">Reabrir</button>' +
        '<button type="button" class="row-action row-action--danger" data-acao="remover" data-id="' + a.id + '">Remover</button>';
    }

    var whatsapp = CN.util.apenasDigitos(a.telefone);

    return '' +
      '<article class="booking-row is-' + a.status + '">' +

        '<div class="flex sm:block items-center gap-3">' +
          '<p class="font-display text-2xl text-gold leading-none">' + a.hora + '</p>' +
          '<p class="text-[10px] tracking-[0.14em] uppercase text-bone-faint sm:mt-1">até ' + fim + '</p>' +
        '</div>' +

        '<div class="min-w-0">' +
          '<div class="flex items-center gap-2.5 flex-wrap">' +
            '<h4 class="font-medium text-bone">' + CN.util.escapar(a.cliente) + '</h4>' +
            '<span class="status-badge status-' + a.status + '">' + rotulos[a.status] + '</span>' +
            (a.demo ? '<span class="text-[9px] tracking-[0.16em] uppercase text-bone-faint">demo</span>' : '') +
          '</div>' +
          '<p class="text-sm text-bone-dim mt-1.5">' +
            CN.util.escapar(servico ? servico.nome : '—') +
            ' · com ' + CN.util.escapar(barbeiro ? barbeiro.nome.split(' ')[0] : '—') +
            ' · <span class="text-gold">' + CN.util.moeda(a.preco) + '</span>' +
          '</p>' +
          '<p class="text-xs text-bone-faint mt-1.5 flex items-center gap-3 flex-wrap">' +
            '<a href="https://wa.me/55' + whatsapp + '" target="_blank" rel="noopener" class="hover:text-gold transition-colors">' +
              CN.util.escapar(a.telefone) +
            '</a>' +
            '<span class="text-bone-faint/60">' + CN.util.escapar(a.codigo) + '</span>' +
          '</p>' +
          (a.obs ? '<p class="mt-2 pl-3 border-l border-gold/30 text-xs italic text-bone-dim">' + CN.util.escapar(a.obs) + '</p>' : '') +
        '</div>' +

        '<div class="flex gap-2 shrink-0">' + acoes + '</div>' +
      '</article>';
  }

  function estadoVazio() {
    var msgs = {
      todos:     ['Nenhum agendamento ainda', 'Assim que um cliente reservar pelo site, ele aparece aqui.'],
      hoje:      ['Nada marcado para hoje', 'Dia livre — bom momento para organizar o estoque.'],
      agendado:  ['Nenhum agendamento em aberto', 'Todas as reservas já foram concluídas ou canceladas.'],
      concluido: ['Nenhum atendimento concluído', 'Marque uma reserva como concluída para vê-la aqui.'],
      cancelado: ['Nenhum cancelamento', 'Ótimo sinal — ninguém desmarcou.']
    };
    var m = msgs[filtroAtual] || msgs.todos;

    return '' +
      '<div class="py-16 text-center border border-dashed border-white/10">' +
        '<span class="mx-auto mb-5 grid place-items-center w-14 h-14 border border-white/10 text-bone-faint">' +
          '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="17" rx="1"/><path d="M8 2v4M16 2v4M3 10h18"/></svg>' +
        '</span>' +
        '<h4 class="font-display uppercase text-xl">' + m[0] + '</h4>' +
        '<p class="mt-2 text-sm text-bone-faint max-w-xs mx-auto">' + m[1] + '</p>' +
        (filtroAtual === 'todos'
          ? '<button type="button" data-seed-inline class="ghost-btn mt-6">Popular com dados de demonstração</button>'
          : '') +
      '</div>';
  }

  /* ══════════════════════════════════════════════════════════
     AÇÕES
     ══════════════════════════════════════════════════════════ */
  function executarAcao(acao, id) {
    var reserva = CN.store.todos().find(function (a) { return a.id === id; });
    if (!reserva) return;

    if (acao === 'concluir') {
      CN.store.atualizarStatus(id, 'concluido');
      CN.ui.toast('Atendimento de ' + reserva.cliente.split(' ')[0] + ' concluído.', 'sucesso');
    }

    if (acao === 'cancelar') {
      /* Confirmação porque libera o horário para outro cliente */
      if (!confirm('Cancelar o agendamento de ' + reserva.cliente + ' (' + reserva.hora + ')?\n\nO horário volta a ficar disponível.')) return;
      CN.store.atualizarStatus(id, 'cancelado');
      CN.ui.toast('Agendamento cancelado e horário liberado.', 'info');
    }

    if (acao === 'reabrir') {
      CN.store.atualizarStatus(id, 'agendado');
      CN.ui.toast('Agendamento reaberto.', 'info');
    }

    if (acao === 'remover') {
      if (!confirm('Remover definitivamente o registro de ' + reserva.cliente + '?\n\nEsta ação não pode ser desfeita.')) return;
      CN.store.remover(id);
      CN.ui.toast('Registro removido.', 'info');
    }
  }

  function popular() {
    var criados = CN.store.popularDemo();
    CN.ui.toast(criados > 0
      ? criados + ' agendamentos de demonstração criados.'
      : 'A agenda de demonstração já está preenchida.', criados > 0 ? 'sucesso' : 'info');
  }

  function limparTudo() {
    if (!CN.store.todos().length) {
      CN.ui.toast('A agenda já está vazia.', 'info');
      return;
    }
    if (!confirm('Apagar TODOS os agendamentos salvos neste navegador?\n\nEsta ação não pode ser desfeita.')) return;
    CN.store.limpar();
    CN.ui.toast('Agenda zerada.', 'info');
  }

  /* ══════════════════════════════════════════════════════════
     RENDER GERAL
     ══════════════════════════════════════════════════════════ */
  function render() {
    if ($('#admin-content').classList.contains('hidden')) return;
    renderKPIs();
    renderLista();
  }

  /* ══════════════════════════════════════════════════════════
     INICIALIZAÇÃO
     ══════════════════════════════════════════════════════════ */
  function init() {
    $$('[data-open-admin]').forEach(function (b) { b.addEventListener('click', abrir); });
    $$('[data-close-admin]').forEach(function (b) { b.addEventListener('click', fechar); });

    $('#admin-unlock').addEventListener('click', tentarLiberar);
    $('#admin-pin').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') tentarLiberar();
    });
    $('#admin-pin').addEventListener('input', function () {
      /* aceita só dígitos */
      this.value = this.value.replace(/\D/g, '');
      $('#admin-pin-error').classList.remove('is-visible');
      this.classList.remove('has-error');
    });

    $('#admin-seed').addEventListener('click', popular);
    $('#admin-clear').addEventListener('click', limparTudo);

    $$('#admin-filters .chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        filtroAtual = chip.dataset.filter;
        $$('#admin-filters .chip').forEach(function (c) {
          c.classList.toggle('is-active', c === chip);
        });
        renderLista();
      });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !$('#admin-panel').classList.contains('hidden')) fechar();
    });

    /* O painel se redesenha sozinho a cada mudança na agenda —
       inclusive quando o cliente confirma um novo agendamento. */
    CN.store.aoMudar(render);
  }

  return { init: init, abrir: abrir, fechar: fechar };
})();
