/* ============================================================
   CASA NAVALHA — Núcleo compartilhado
   Este arquivo é carregado pelas TRÊS páginas (site, agendamento
   e painel). Ele concentra:

   - CN.util     : formatação, datas, máscaras
   - CN.catalogo : serviços, barbeiros, config e horários (editáveis)
   - CN.store    : agendamentos no localStorage + relatórios
   - CN.slots    : geração de horários e checagem de conflito
   ============================================================ */

window.CN = window.CN || {};

/* ══════════════════════════════════════════════════════════
   UTILITÁRIOS
   ══════════════════════════════════════════════════════════ */
CN.util = (function () {

  /* Data local -> "AAAA-MM-DD" (evita o deslocamento de fuso do toISOString) */
  function toISO(date) {
    var m = String(date.getMonth() + 1).padStart(2, '0');
    var d = String(date.getDate()).padStart(2, '0');
    return date.getFullYear() + '-' + m + '-' + d;
  }

  /* "AAAA-MM-DD" -> Date local à meia-noite */
  function fromISO(iso) {
    var p = String(iso).split('-');
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }

  /* "AAAA-MM-DD" + "HH:MM" -> Date local completo */
  function toDateTime(iso, hhmm) {
    var d = fromISO(iso);
    var t = hhmm.split(':');
    d.setHours(Number(t[0]), Number(t[1]), 0, 0);
    return d;
  }

  function hojeISO() { return toISO(new Date()); }

  function addDias(date, n) {
    var d = new Date(date.getTime());
    d.setDate(d.getDate() + n);
    return d;
  }

  /* Segunda-feira da semana de uma data (base da Agenda Geral semanal) */
  function inicioDaSemana(date) {
    var d = new Date(date.getTime());
    var dow = d.getDay();
    var recuo = dow === 0 ? 6 : dow - 1;   /* segunda como primeiro dia */
    return addDias(d, -recuo);
  }

  /* "AAAA-MM" — chave de agrupamento mensal */
  function mesDe(iso) { return String(iso).slice(0, 7); }

  /* "HH:MM" -> minutos desde a meia-noite (e o inverso) */
  function minutos(hhmm) {
    var p = String(hhmm).split(':');
    return Number(p[0]) * 60 + Number(p[1]);
  }
  function paraHora(min) {
    var h = Math.floor(min / 60);
    var m = min % 60;
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  }

  function moeda(v) {
    return 'R$ ' + Number(v || 0).toLocaleString('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  }

  /* Versão com centavos, para relatórios financeiros */
  function moedaCheia(v) {
    return 'R$ ' + Number(v || 0).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  /* "12 de setembro, sexta-feira" — usado nos resumos */
  function dataExtenso(iso) {
    var d = fromISO(iso);
    return d.getDate() + ' de ' + CN.MESES[d.getMonth()] + ', ' +
           CN.DIAS_SEMANA[d.getDay()].toLowerCase();
  }

  /* "12/09" — versão curta para listas densas */
  function dataCurta(iso) {
    var d = fromISO(iso);
    return String(d.getDate()).padStart(2, '0') + '/' +
           String(d.getMonth() + 1).padStart(2, '0');
  }

  /* Máscara progressiva de telefone brasileiro */
  function mascaraTelefone(valor) {
    var n = String(valor).replace(/\D/g, '').slice(0, 11);
    if (n.length === 0) return '';
    if (n.length <= 2)  return '(' + n;
    if (n.length <= 6)  return '(' + n.slice(0, 2) + ') ' + n.slice(2);
    if (n.length <= 10) return '(' + n.slice(0, 2) + ') ' + n.slice(2, 6) + '-' + n.slice(6);
    return '(' + n.slice(0, 2) + ') ' + n.slice(2, 7) + '-' + n.slice(7);
  }

  function apenasDigitos(v) { return String(v == null ? '' : v).replace(/\D/g, ''); }

  /* Hash determinístico (FNV-1a + finalização MurmurHash3). Gera a
     ocupação-fantasma da demo de forma estável: o mesmo dia mostra
     sempre os mesmos horários ocupados, em vez de mudar a cada
     recarga.                                                        */
  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    /* Sem esta finalização o FNV tem avalanche fraca: chaves que
       diferem só nos minutos ("…|09:00" vs "…|09:30") caem em faixas
       vizinhas e a ocupação simulada se agrupa toda nos horários :30. */
    h ^= h >>> 16;
    h = Math.imul(h, 2246822507);
    h ^= h >>> 13;
    h = Math.imul(h, 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  }

  /* Código legível da reserva: CN-7F3K */
  function gerarCodigo() {
    var abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var s = '';
    for (var i = 0; i < 4; i++) s += abc[Math.floor(Math.random() * abc.length)];
    return 'CN-' + s;
  }

  /* Identificador para novos serviços criados pelo painel */
  function slug(texto) {
    return String(texto).toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'servico';
  }

  function escapar(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function iniciais(nome) {
    return String(nome || '?').trim().split(/\s+/)
      .map(function (n) { return n[0]; }).slice(0, 2).join('').toUpperCase();
  }

  /* Busca no catálogo vigente e, se não achar, nos padrões — assim um
     agendamento antigo continua exibindo o nome de um serviço que o
     dono já excluiu, em vez de aparecer como "—".                    */
  function servicoPorId(id) {
    var lista = CN.catalogo ? CN.catalogo.servicos() : CN.SERVICOS_PADRAO;
    return lista.find(function (s) { return s.id === id; }) ||
           CN.SERVICOS_PADRAO.find(function (s) { return s.id === id; }) || null;
  }

  function barbeiroPorId(id) {
    var lista = CN.catalogo ? CN.catalogo.barbeiros() : CN.BARBEIROS_PADRAO;
    return lista.find(function (b) { return b.id === id; }) ||
           CN.BARBEIROS_PADRAO.find(function (b) { return b.id === id; }) || null;
  }

  return {
    toISO: toISO, fromISO: fromISO, toDateTime: toDateTime, hojeISO: hojeISO,
    addDias: addDias, inicioDaSemana: inicioDaSemana, mesDe: mesDe,
    minutos: minutos, paraHora: paraHora, moeda: moeda, moedaCheia: moedaCheia,
    dataExtenso: dataExtenso, dataCurta: dataCurta,
    mascaraTelefone: mascaraTelefone, apenasDigitos: apenasDigitos,
    hash: hash, gerarCodigo: gerarCodigo, slug: slug, escapar: escapar,
    iniciais: iniciais,
    servicoPorId: servicoPorId, barbeiroPorId: barbeiroPorId
  };
})();

/* ══════════════════════════════════════════════════════════
   CATÁLOGO — serviços, equipe, configurações e expediente
   Tudo aqui é editável pelo painel do proprietário. O que o dono
   salva vive no localStorage e tem precedência sobre data.js.
   ══════════════════════════════════════════════════════════ */
CN.catalogo = (function () {

  var CHAVES = {
    servicos:  'casa_navalha:servicos:v1',
    barbeiros: 'casa_navalha:barbeiros:v1',
    config:    'casa_navalha:config:v1',
    horarios:  'casa_navalha:horarios:v1'
  };

  var cache = {};
  var ouvintes = [];

  function ler(chave, padrao) {
    if (cache[chave] !== undefined) return cache[chave];
    try {
      var cru = localStorage.getItem(chave);
      cache[chave] = cru ? JSON.parse(cru) : padrao;
    } catch (e) {
      console.warn('[Casa Navalha] catálogo indisponível:', e);
      cache[chave] = padrao;
    }
    return cache[chave];
  }

  function gravar(chave, valor) {
    cache[chave] = valor;
    try {
      localStorage.setItem(chave, JSON.stringify(valor));
    } catch (e) {
      console.warn('[Casa Navalha] não foi possível gravar o catálogo:', e);
    }
    notificar();
  }

  function notificar() { ouvintes.forEach(function (fn) { fn(); }); }
  function aoMudar(fn) { ouvintes.push(fn); }

  /* ---- Serviços ---- */
  function servicos() {
    return ler(CHAVES.servicos, CN.SERVICOS_PADRAO).slice();
  }
  function servicosAtivos() {
    return servicos().filter(function (s) { return s.ativo !== false; });
  }

  /* Cria ou atualiza. Devolve o registro gravado. */
  function salvarServico(dados) {
    var lista = servicos();
    var id = dados.id || CN.util.slug(dados.nome);

    /* Evita colisão de id ao criar dois serviços com nomes parecidos */
    if (!dados.id) {
      var base = id, n = 2;
      while (lista.some(function (s) { return s.id === id; })) { id = base + '-' + (n++); }
    }

    var registro = {
      id: id,
      nome: String(dados.nome || '').trim(),
      desc: String(dados.desc || '').trim(),
      preco: Number(dados.preco) || 0,
      duracao: Number(dados.duracao) || 30,
      destaque: dados.destaque ? String(dados.destaque).trim() : undefined,
      ativo: dados.ativo !== false
    };

    var i = lista.findIndex(function (s) { return s.id === id; });
    if (i >= 0) lista[i] = Object.assign({}, lista[i], registro);
    else lista.push(registro);

    gravar(CHAVES.servicos, lista);
    return registro;
  }

  function removerServico(id) {
    gravar(CHAVES.servicos, servicos().filter(function (s) { return s.id !== id; }));
  }

  function alternarServico(id) {
    var lista = servicos();
    var alvo = lista.find(function (s) { return s.id === id; });
    if (!alvo) return null;
    alvo.ativo = alvo.ativo === false;
    gravar(CHAVES.servicos, lista);
    return alvo;
  }

  /* ---- Barbeiros ---- */
  function barbeiros() {
    return ler(CHAVES.barbeiros, CN.BARBEIROS_PADRAO).slice();
  }
  function barbeirosAtivos() {
    return barbeiros().filter(function (b) { return b.ativo !== false; });
  }
  function salvarBarbeiro(dados) {
    var lista = barbeiros();
    var i = lista.findIndex(function (b) { return b.id === dados.id; });
    if (i >= 0) lista[i] = Object.assign({}, lista[i], dados);
    else lista.push(dados);
    gravar(CHAVES.barbeiros, lista);
    return dados;
  }
  function alternarBarbeiro(id) {
    var lista = barbeiros();
    var alvo = lista.find(function (b) { return b.id === id; });
    if (!alvo) return null;
    alvo.ativo = alvo.ativo === false;
    gravar(CHAVES.barbeiros, lista);
    return alvo;
  }

  /* ---- Configurações ---- */
  function config() {
    return Object.assign({}, CN.CONFIG_PADRAO, ler(CHAVES.config, {}));
  }
  function salvarConfig(parcial) {
    var atual = ler(CHAVES.config, {});
    var novo = Object.assign({}, atual, parcial);
    gravar(CHAVES.config, novo);
    aplicarNoGlobal();
    return config();
  }

  /* ---- Expediente ---- */
  function horarios() {
    return Object.assign({}, CN.HORARIOS_PADRAO, ler(CHAVES.horarios, {}));
  }
  function salvarHorarios(mapa) {
    gravar(CHAVES.horarios, mapa);
    aplicarNoGlobal();
    return horarios();
  }

  /* Devolve tudo ao estado de fábrica definido em data.js */
  function restaurarPadrao() {
    Object.keys(CHAVES).forEach(function (k) {
      try { localStorage.removeItem(CHAVES[k]); } catch (e) { /* ignora */ }
      delete cache[CHAVES[k]];
    });
    aplicarNoGlobal();
    notificar();
  }

  /* Espelha config e expediente nos objetos globais que o restante do
     código já consulta (CN.CONFIG, CN.HORARIOS), mantendo a mesma
     referência para não quebrar quem guardou o objeto.               */
  function aplicarNoGlobal() {
    var c = config();
    Object.keys(CN.CONFIG).forEach(function (k) { delete CN.CONFIG[k]; });
    Object.assign(CN.CONFIG, c);

    var h = horarios();
    Object.keys(CN.HORARIOS).forEach(function (k) { delete CN.HORARIOS[k]; });
    Object.assign(CN.HORARIOS, h);
  }

  aplicarNoGlobal();

  return {
    servicos: servicos, servicosAtivos: servicosAtivos,
    salvarServico: salvarServico, removerServico: removerServico,
    alternarServico: alternarServico,
    barbeiros: barbeiros, barbeirosAtivos: barbeirosAtivos,
    salvarBarbeiro: salvarBarbeiro, alternarBarbeiro: alternarBarbeiro,
    config: config, salvarConfig: salvarConfig,
    horarios: horarios, salvarHorarios: salvarHorarios,
    restaurarPadrao: restaurarPadrao, aoMudar: aoMudar
  };
})();

/* ══════════════════════════════════════════════════════════
   STORE — agendamentos no localStorage
   Estrutura de um registro:
   { id, codigo, servicoId, barbeiroId, data, hora, duracao,
     preco, cliente, telefone, obs, lembrete, status, criadoEm }
   status: 'agendado' | 'concluido' | 'cancelado'
   ══════════════════════════════════════════════════════════ */
CN.store = (function () {

  var CHAVE = 'casa_navalha:agendamentos:v1';
  var ouvintes = [];

  /* Toda leitura passa por aqui: se o localStorage estiver
     indisponível (modo privado, cota cheia), o app segue
     funcionando em memória em vez de quebrar.                */
  function ler() {
    try {
      var cru = localStorage.getItem(CHAVE);
      var lista = cru ? JSON.parse(cru) : [];
      return Array.isArray(lista) ? lista : [];
    } catch (e) {
      console.warn('[Casa Navalha] Não foi possível ler o localStorage:', e);
      return [];
    }
  }

  function gravar(lista) {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(lista));
    } catch (e) {
      console.warn('[Casa Navalha] Não foi possível gravar no localStorage:', e);
    }
    notificar();
  }

  function notificar() {
    ouvintes.forEach(function (fn) { fn(ler()); });
  }

  /* Permite que o painel se atualize sozinho a cada mudança */
  function aoMudar(fn) { ouvintes.push(fn); }

  function todos() {
    return ler().sort(function (a, b) {
      return (a.data + a.hora).localeCompare(b.data + b.hora);
    });
  }

  function ativos() {
    return todos().filter(function (a) { return a.status !== 'cancelado'; });
  }

  function porId(id) {
    return todos().find(function (a) { return a.id === id; }) || null;
  }

  function criar(dados) {
    var lista = ler();
    var registro = Object.assign({
      id: 'ag_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      codigo: CN.util.gerarCodigo(),
      status: 'agendado',
      criadoEm: new Date().toISOString()
    }, dados);

    lista.push(registro);
    gravar(lista);
    return registro;
  }

  function atualizarStatus(id, status) {
    var lista = ler();
    var alvo = lista.find(function (a) { return a.id === id; });
    if (!alvo) return null;
    alvo.status = status;
    alvo.atualizadoEm = new Date().toISOString();
    gravar(lista);
    return alvo;
  }

  function remover(id) {
    gravar(ler().filter(function (a) { return a.id !== id; }));
  }

  function limpar() { gravar([]); }

  /* Ocupação de um barbeiro num dia (só reservas ativas) */
  function ocupadosEm(dataISO, barbeiroId) {
    return ativos().filter(function (a) {
      return a.data === dataISO && a.barbeiroId === barbeiroId;
    });
  }

  function doDia(dataISO) {
    return ativos().filter(function (a) { return a.data === dataISO; });
  }

  /* ---- Indicadores operacionais ---- */
  function estatisticas() {
    var lista = ativos();
    var hoje = CN.util.hojeISO();
    var limite = CN.util.toISO(CN.util.addDias(new Date(), 7));

    var deHoje = lista.filter(function (a) { return a.data === hoje; });

    var proximos = lista.filter(function (a) {
      return a.data >= hoje && a.data <= limite && a.status === 'agendado';
    });
    var receita = proximos.reduce(function (s, a) { return s + (a.preco || 0); }, 0);

    var faturados = todos().filter(function (a) { return a.status === 'concluido'; });
    var ticket = faturados.length
      ? faturados.reduce(function (s, a) { return s + (a.preco || 0); }, 0) / faturados.length
      : (lista.length ? lista.reduce(function (s, a) { return s + (a.preco || 0); }, 0) / lista.length : 0);

    return {
      hoje: deHoje.length,
      agendadosHoje: deHoje.filter(function (a) { return a.status === 'agendado'; }).length,
      receita: receita,
      ticket: Math.round(ticket),
      ocupacao: ocupacaoDoDia(hoje),
      total: lista.length
    };
  }

  /* Ocupação = minutos vendidos / minutos disponíveis no dia */
  function ocupacaoDoDia(dataISO) {
    var dow = CN.util.fromISO(dataISO).getDay();
    var expediente = CN.HORARIOS[dow];
    if (!expediente) return 0;

    var janela = CN.util.minutos(expediente.fecha) - CN.util.minutos(expediente.abre);
    var emServico = CN.catalogo.barbeirosAtivos().filter(function (b) {
      return b.folga !== dow;
    }).length;

    var capacidade = janela * emServico;
    if (capacidade <= 0) return 0;

    var vendidos = doDia(dataISO).reduce(function (s, a) { return s + (a.duracao || 0); }, 0);
    return Math.min(100, Math.round((vendidos / capacidade) * 100));
  }

  /* ---- Relatório financeiro (simulado) ----
     Faturamento = base histórica de data.js + agendamentos reais.
     A base existe para o painel já nascer com números plausíveis
     numa instalação limpa; o restante vem do que foi agendado.   */
  function financeiro() {
    var agora = new Date();
    var mesAtual = CN.util.toISO(agora).slice(0, 7);
    var cfg = CN.catalogo.config();

    var doMes = ativos().filter(function (a) { return CN.util.mesDe(a.data) === mesAtual; });
    var realizadoMes = doMes.reduce(function (s, a) { return s + (a.preco || 0); }, 0);

    var faturamento = CN.FINANCEIRO.baseMesAtual + realizadoMes;
    var lucroBruto = Math.round(faturamento * cfg.margemBruta);

    /* Série dos últimos 6 meses: 5 fechados + o corrente */
    var serie = CN.FINANCEIRO.historico.map(function (m) {
      return { rotulo: m.rotulo, valor: m.valor };
    });
    serie.push({ rotulo: CN.MESES_CURTO[agora.getMonth()], valor: faturamento, atual: true });

    var anterior = serie[serie.length - 2].valor;
    var variacao = anterior ? ((faturamento - anterior) / anterior) * 100 : 0;

    /* Receita por serviço (só do que foi realmente agendado) */
    var porServico = {};
    doMes.forEach(function (a) {
      var s = CN.util.servicoPorId(a.servicoId);
      var nome = s ? s.nome : 'Outros';
      porServico[nome] = porServico[nome] || { nome: nome, total: 0, qtd: 0 };
      porServico[nome].total += a.preco || 0;
      porServico[nome].qtd++;
    });

    /* Receita e comissão por barbeiro */
    var porBarbeiro = CN.catalogo.barbeiros().map(function (b) {
      var dele = doMes.filter(function (a) { return a.barbeiroId === b.id; });
      var total = dele.reduce(function (s, a) { return s + (a.preco || 0); }, 0);
      return {
        id: b.id, nome: b.nome, cor: b.cor,
        atendimentos: dele.length,
        total: total,
        comissao: Math.round(total * cfg.comissaoBarbeiro)
      };
    }).sort(function (x, y) { return y.total - x.total; });

    var despesasFixas = CN.FINANCEIRO.despesas.reduce(function (s, d) { return s + d.valor; }, 0);

    return {
      mesAtual: mesAtual,
      faturamento: faturamento,
      baseSimulada: CN.FINANCEIRO.baseMesAtual,
      realizadoMes: realizadoMes,
      lucroBruto: lucroBruto,
      margem: cfg.margemBruta,
      variacao: variacao,
      serie: serie,
      porServico: Object.keys(porServico).map(function (k) { return porServico[k]; })
                    .sort(function (x, y) { return y.total - x.total; }),
      porBarbeiro: porBarbeiro,
      despesas: CN.FINANCEIRO.despesas,
      despesasFixas: despesasFixas,
      lucroLiquido: lucroBruto - despesasFixas,
      atendimentosMes: doMes.length
    };
  }

  /* ---- Base de clientes derivada dos agendamentos ---- */
  function clientes() {
    var mapa = {};

    todos().forEach(function (a) {
      var chave = CN.util.apenasDigitos(a.telefone) || a.cliente;
      if (!mapa[chave]) {
        mapa[chave] = {
          chave: chave, nome: a.cliente, telefone: a.telefone,
          visitas: 0, cancelamentos: 0, total: 0,
          ultima: null, primeira: null, servicos: {}
        };
      }
      var c = mapa[chave];
      c.nome = a.cliente;             /* mantém o nome mais recente */

      if (a.status === 'cancelado') {
        c.cancelamentos++;
      } else {
        c.visitas++;
        c.total += a.preco || 0;
        var s = CN.util.servicoPorId(a.servicoId);
        if (s) c.servicos[s.nome] = (c.servicos[s.nome] || 0) + 1;
      }

      if (!c.primeira || a.data < c.primeira) c.primeira = a.data;
      if (!c.ultima || a.data > c.ultima) c.ultima = a.data;
    });

    return Object.keys(mapa).map(function (k) {
      var c = mapa[k];
      var favorito = Object.keys(c.servicos).sort(function (x, y) {
        return c.servicos[y] - c.servicos[x];
      })[0] || '—';
      c.favorito = favorito;
      c.ticket = c.visitas ? Math.round(c.total / c.visitas) : 0;
      return c;
    }).sort(function (x, y) { return y.total - x.total; });
  }

  /* ---- Agenda de demonstração ----
     Cria reservas plausíveis nos próximos dias para que o painel
     nunca apareça vazio numa apresentação comercial.            */
  function popularDemo() {
    var lista = ler();
    var criados = 0;
    var hoje = new Date();
    var servicos = CN.catalogo.servicosAtivos();
    if (!servicos.length) return 0;

    for (var d = 0; d < 6 && criados < 14; d++) {
      var dia = CN.util.addDias(hoje, d);
      var iso = CN.util.toISO(dia);
      var expediente = CN.HORARIOS[dia.getDay()];
      if (!expediente) continue;

      var porDia = 2 + (CN.util.hash(iso) % 2);

      for (var k = 0; k < porDia && criados < 14; k++) {
        var semente = CN.util.hash(iso + ':demo:' + k);
        var servico = servicos[semente % servicos.length];

        var elegiveis = CN.catalogo.barbeirosAtivos().filter(function (b) {
          return b.folga !== dia.getDay();
        });
        if (!elegiveis.length) continue;
        var barbeiro = elegiveis[(semente >>> 3) % elegiveis.length];

        var abre = CN.util.minutos(expediente.abre);
        var fecha = CN.util.minutos(expediente.fecha);
        var vagas = Math.floor((fecha - abre - servico.duracao) / CN.CONFIG.intervaloMin);
        if (vagas <= 0) continue;

        var hora = CN.util.paraHora(abre + ((semente >>> 7) % vagas) * CN.CONFIG.intervaloMin);

        /* Não sobrepõe nada que já exista na agenda */
        if (!livre(lista, iso, barbeiro.id, hora, servico.duracao)) continue;

        var nome = CN.NOMES_DEMO[(semente >>> 11) % CN.NOMES_DEMO.length];
        var numero = 90000000 + ((semente >>> 5) % 9999999);

        lista.push({
          id: 'ag_demo_' + iso.replace(/-/g, '') + '_' + k,
          codigo: CN.util.gerarCodigo(),
          servicoId: servico.id,
          barbeiroId: barbeiro.id,
          data: iso,
          hora: hora,
          duracao: servico.duracao,
          preco: servico.preco,
          cliente: nome,
          telefone: '(11) ' + String(numero).slice(0, 5) + '-' + String(numero).slice(5),
          obs: '',
          lembrete: true,
          /* O primeiro do dia de hoje já entra como concluído */
          status: d === 0 && k === 0 ? 'concluido' : 'agendado',
          criadoEm: new Date().toISOString(),
          demo: true
        });
        criados++;
      }
    }

    gravar(lista);
    return criados;
  }

  /* Verifica conflito dentro de uma lista arbitrária (usado pela demo) */
  function livre(lista, dataISO, barbeiroId, hora, duracao) {
    var ini = CN.util.minutos(hora);
    var fim = ini + duracao;
    return !lista.some(function (a) {
      if (a.status === 'cancelado') return false;
      if (a.data !== dataISO || a.barbeiroId !== barbeiroId) return false;
      var aIni = CN.util.minutos(a.hora);
      var aFim = aIni + (a.duracao || 30);
      return ini < aFim && aIni < fim;   /* sobreposição de intervalos */
    });
  }

  return {
    todos: todos, ativos: ativos, porId: porId, criar: criar,
    atualizarStatus: atualizarStatus, remover: remover, limpar: limpar,
    ocupadosEm: ocupadosEm, doDia: doDia,
    estatisticas: estatisticas, ocupacaoDoDia: ocupacaoDoDia,
    financeiro: financeiro, clientes: clientes,
    popularDemo: popularDemo, aoMudar: aoMudar, livre: livre
  };
})();

/* ══════════════════════════════════════════════════════════
   SLOTS — geração da grade de horários
   ══════════════════════════════════════════════════════════ */
CN.slots = (function () {

  /* A barbearia abre nesse dia? */
  function expediente(dataISO) {
    return CN.HORARIOS[CN.util.fromISO(dataISO).getDay()] || null;
  }

  /* O barbeiro trabalha nesse dia? */
  function barbeiroTrabalha(barbeiroId, dataISO) {
    var b = CN.util.barbeiroPorId(barbeiroId);
    if (!b || b.ativo === false) return false;
    if (!expediente(dataISO)) return false;
    return b.folga !== CN.util.fromISO(dataISO).getDay();
  }

  /* Ocupação simulada: dá vida à agenda mesmo sem reservas reais.
     É determinística (via hash), então não "pisca" entre recargas. */
  function ocupadoNaDemo(dataISO, barbeiroId, hora) {
    var h = CN.util.hash(dataISO + '|' + barbeiroId + '|' + hora);
    /* 18% por bloco de 30 min — calibrado empiricamente. Serviços longos
       consomem vários blocos, então a taxa efetiva sobe sozinha: o combo
       de 70 min precisa de 3 blocos seguidos livres (~55% de aprovação) e
       o platinado de 120 min precisa de 4 (~45%). Acima de 22% a agenda
       fica cheia demais e o protótipo passa a impressão de que não há
       vaga; abaixo de 12% quase nada aparece ocupado e perde o realismo. */
    return (h % 100) < 18;
  }

  /* Retorna [{ hora, disponivel, motivo }] para a combinação escolhida */
  function listar(dataISO, barbeiroId, duracao) {
    var exp = expediente(dataISO);
    if (!exp || !barbeiroTrabalha(barbeiroId, dataISO)) return [];

    var abre  = CN.util.minutos(exp.abre);
    var fecha = CN.util.minutos(exp.fecha);
    var passo = CN.CONFIG.intervaloMin;

    var agora = new Date();
    var ehHoje = dataISO === CN.util.hojeISO();
    var minimoHoje = agora.getHours() * 60 + agora.getMinutes() + CN.CONFIG.antecedenciaMin;

    var reservas = CN.store.ocupadosEm(dataISO, barbeiroId);
    var resultado = [];

    for (var t = abre; t + duracao <= fecha; t += passo) {
      var hora = CN.util.paraHora(t);
      var item = { hora: hora, disponivel: true, motivo: '' };

      /* 1. Horário já passou (ou está dentro da antecedência mínima) */
      if (ehHoje && t < minimoHoje) {
        item.disponivel = false;
        item.motivo = 'Horário já passou';
      }

      /* 2. Conflito com uma reserva real salva no localStorage */
      if (item.disponivel) {
        var conflito = reservas.some(function (r) {
          var rIni = CN.util.minutos(r.hora);
          var rFim = rIni + (r.duracao || 30);
          return t < rFim && rIni < (t + duracao);
        });
        if (conflito) {
          item.disponivel = false;
          item.motivo = 'Já reservado';
        }
      }

      /* 3. Ocupação de demonstração — checa todos os blocos que o
            serviço consome, não apenas o horário de início.        */
      if (item.disponivel) {
        for (var b = t; b < t + duracao; b += passo) {
          if (ocupadoNaDemo(dataISO, barbeiroId, CN.util.paraHora(b))) {
            item.disponivel = false;
            item.motivo = 'Agenda ocupada';
            break;
          }
        }
      }

      resultado.push(item);
    }

    return resultado;
  }

  function totalLivresNaSemana() {
    var total = 0;
    var duracaoBase = 40;
    for (var d = 0; d < 7; d++) {
      var iso = CN.util.toISO(CN.util.addDias(new Date(), d));
      CN.catalogo.barbeirosAtivos().forEach(function (b) {
        listar(iso, b.id, duracaoBase).forEach(function (s) {
          if (s.disponivel) total++;
        });
      });
    }
    return total;
  }

  return {
    expediente: expediente,
    barbeiroTrabalha: barbeiroTrabalha,
    ocupadoNaDemo: ocupadoNaDemo,
    listar: listar,
    totalLivresNaSemana: totalLivresNaSemana
  };
})();
