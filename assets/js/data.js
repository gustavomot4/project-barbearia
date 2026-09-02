/* ============================================================
   CASA NAVALHA — Camada de dados (semente)
   Estes são os valores PADRÃO do sistema. O catálogo de serviços
   e barbeiros pode ser editado pelo painel do proprietário; a
   versão editada fica no localStorage e tem precedência (veja
   CN.catalogo em store.js). Para trocar de cliente, edite aqui.
   ============================================================ */

window.CN = window.CN || {};

/* ---------- Identidade e contato ---------- */
CN.CONFIG_PADRAO = {
  nome: 'Casa Navalha',
  subtitulo: 'Barbearia & Clube',
  telefone: '(11) 4002-8922',
  // Formato internacional, sem símbolos — usado nos links do WhatsApp
  whatsapp: '5511940028922',
  endereco: 'Rua Harmonia, 412 — Vila Madalena, São Paulo/SP',
  // PIN de demonstração do painel do proprietário
  adminPin: '1234',
  // Quantos dias à frente a agenda fica aberta
  janelaDias: 21,
  // Granularidade da grade de horários, em minutos
  intervaloMin: 30,
  // Antecedência mínima para agendar no mesmo dia, em minutos
  antecedenciaMin: 60,
  // Margem bruta fictícia usada nas simulações financeiras (54%)
  margemBruta: 0.54,
  // Comissão paga ao barbeiro sobre o serviço (40%)
  comissaoBarbeiro: 0.40
};

/* CN.CONFIG é preenchido por CN.catalogo.config() em store.js,
   mesclando os padrões acima com o que estiver salvo no navegador. */
CN.CONFIG = Object.assign({}, CN.CONFIG_PADRAO);

/* ---------- Horário de funcionamento ----------
   Chave = dia da semana no padrão JS (0 = domingo).
   null significa fechado.                                    */
CN.HORARIOS_PADRAO = {
  0: null,
  1: { abre: '10:00', fecha: '18:00' },
  2: { abre: '09:00', fecha: '20:00' },
  3: { abre: '09:00', fecha: '20:00' },
  4: { abre: '09:00', fecha: '20:00' },
  5: { abre: '09:00', fecha: '20:00' },
  6: { abre: '08:00', fecha: '19:00' }
};
CN.HORARIOS = Object.assign({}, CN.HORARIOS_PADRAO);

CN.DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
CN.DIAS_CURTO  = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
CN.MESES       = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
                  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
CN.MESES_CURTO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun',
                  'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/* ---------- Cardápio de serviços ---------- */
CN.SERVICOS_PADRAO = [
  {
    id: 'corte-classico',
    nome: 'Corte Clássico',
    desc: 'Máquina e tesoura, sem degradê. Inclui lavagem.',
    preco: 55,
    duracao: 40,
    ativo: true
  },
  {
    id: 'corte-navalhado',
    nome: 'Corte Navalhado',
    desc: 'Degradê fechado na navalha e contorno definido.',
    preco: 70,
    duracao: 50,
    ativo: true
  },
  {
    id: 'barba-terapia',
    nome: 'Barba Terapia',
    desc: 'Só barba: navalha em duas passadas, sem corte.',
    preco: 45,
    duracao: 30,
    ativo: true
  },
  {
    id: 'combo-imperio',
    nome: 'Combo Império',
    desc: 'Corte Clássico + Barba Terapia numa sessão só.',
    preco: 95,
    duracao: 70,
    destaque: 'Mais pedido',
    ativo: true
  },
  {
    id: 'pigmentacao',
    nome: 'Pigmentação & Disfarce',
    desc: 'Cobre falhas na barba ou fios brancos. Não corta.',
    preco: 40,
    duracao: 30,
    ativo: true
  },
  {
    id: 'platinado',
    nome: 'Platinado Premium',
    desc: 'Descoloração global com matização e reconstrução.',
    preco: 190,
    duracao: 120,
    ativo: true
  }
];

/* ---------- Equipe ----------
   'folga' usa o mesmo padrão de dia da semana do JS.

   'cor' NÃO pinta mais nada: no redesenho a Agenda Geral passou a
   identificar o barbeiro pelo nome da coluna (visão de dia) e pela
   inicial dentro do bloco (visão de semana), porque quatro matizes
   competindo com a ação primária quebravam a regra de um acento só.
   O campo continua no registro porque store.js o repassa em
   financeiro().porBarbeiro — e store.js está congelado.          */
CN.BARBEIROS_PADRAO = [
  {
    id: 'rafael',
    nome: 'Rafael Moreira',
    apelido: 'Navalha',
    cargo: 'Fundador · Barbeiro-mestre',
    especialidade: 'Clássicos e navalhete',
    bio: 'Vinte anos de ofício. Aprendeu com o pai, numa cadeira de 1962 que ainda está na loja.',
    nota: 5.0,
    atendimentos: 4200,
    folga: 1,
    cor: '#C9A24A',
    ativo: true,
    foto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'diego',
    nome: 'Diego Salles',
    apelido: 'Fade',
    cargo: 'Barbeiro sênior',
    especialidade: 'Degradês e fades',
    bio: 'Se o degradê tem que subir limpo até o topo, é com ele. Campeão estadual em 2023.',
    nota: 4.9,
    atendimentos: 3100,
    folga: 2,
    cor: '#8FA9C4',
    ativo: true,
    foto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'caio',
    nome: 'Caio Mendonça',
    apelido: 'Barbeiro',
    cargo: 'Especialista em barba',
    especialidade: 'Barboterapia e desenho',
    bio: 'Trata barba como escultura: mede, marca e só então encosta a navalha.',
    nota: 4.9,
    atendimentos: 2650,
    folga: 3,
    cor: '#B08A6E',
    ativo: true,
    foto: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'leo',
    nome: 'Léo Tavares',
    apelido: 'Colorista',
    cargo: 'Colorista',
    especialidade: 'Platinado e pigmentação',
    bio: 'Química na medida certa. Fio saudável importa mais que o tom perfeito no primeiro dia.',
    nota: 4.8,
    atendimentos: 1480,
    folga: 4,
    cor: '#9C8AA8',
    ativo: true,
    foto: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=600&q=80'
  }
];

/* Aliases de leitura direta — mantidos para o site institucional.
   O painel sempre consulta CN.catalogo, que respeita as edições. */
CN.SERVICOS  = CN.SERVICOS_PADRAO;
CN.BARBEIROS = CN.BARBEIROS_PADRAO;

/* ---------- Galeria ----------
   Só fotos de RESULTADO: as de ambiente e de ferramenta saíram no
   redesenho. Quem está decidindo marcar quer ver o corte, não a
   cadeira. O site mostra as três primeiras.                      */
CN.GALERIA = [
  { src: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=800&q=80', legenda: 'Clássico executivo' },
  { src: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=700&q=80', legenda: 'Degradê na navalha' },
  { src: 'https://images.unsplash.com/photo-1567894340315-735d7c361db0?auto=format&fit=crop&w=700&q=80', legenda: 'Barba desenhada' }
];

/* ---------- Base financeira simulada ----------
   O faturamento exibido no painel é a soma desta base histórica com
   os agendamentos reais salvos no localStorage. Assim o número já
   nasce realista numa instalação limpa e cresce quando o dono testa
   um agendamento pelo site.                                        */
CN.FINANCEIRO = {
  /* Faturamento "de balcão" já realizado no mês corrente */
  baseMesAtual: 15750,
  /* Últimos 5 meses fechados, do mais antigo para o mais recente */
  historico: [
    { rotulo: 'abr', valor: 11200 },
    { rotulo: 'mai', valor: 12400 },
    { rotulo: 'jun', valor: 11900 },
    { rotulo: 'jul', valor: 13600 },
    { rotulo: 'ago', valor: 14800 }
  ],
  /* Despesas fixas mensais estimadas, usadas na aba Finanças */
  despesas: [
    { nome: 'Aluguel e condomínio', valor: 3200 },
    { nome: 'Produtos e insumos',   valor: 1450 },
    { nome: 'Energia, água e internet', valor: 780 },
    { nome: 'Marketing e software',  valor: 520 }
  ]
};

/* ---------- Nomes usados para gerar a agenda de demonstração ---------- */
CN.NOMES_DEMO = [
  'André Belmonte', 'Bruno Carvalho', 'Caio Ferrari', 'Daniel Prates',
  'Eduardo Simões', 'Felipe Aguiar', 'Gustavo Rangel', 'Henrique Vidal',
  'Igor Marchetti', 'João Pedro Lins', 'Kaique Rosa', 'Lucas Bittencourt',
  'Matheus Coelho', 'Nelson Fagundes', 'Otávio Brandão', 'Pedro Sanches',
  'Renan Queiroz', 'Sérgio Antunes', 'Thiago Nakamura', 'Vitor Assunção'
];
