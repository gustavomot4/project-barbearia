/* ============================================================
   CASA NAVALHA — Camada de dados
   Tudo que num sistema real viria do backend fica centralizado
   aqui. Para adaptar a barbearia do cliente, edite SÓ este
   arquivo: nenhum outro módulo tem valores fixos de negócio.
   ============================================================ */

window.CN = window.CN || {};

/* ---------- Identidade e contato ---------- */
CN.CONFIG = {
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
  antecedenciaMin: 60
};

/* ---------- Horário de funcionamento ----------
   Chave = dia da semana no padrão JS (0 = domingo).
   null significa fechado.                                    */
CN.HORARIOS = {
  0: null,
  1: { abre: '10:00', fecha: '18:00' },
  2: { abre: '09:00', fecha: '20:00' },
  3: { abre: '09:00', fecha: '20:00' },
  4: { abre: '09:00', fecha: '20:00' },
  5: { abre: '09:00', fecha: '20:00' },
  6: { abre: '08:00', fecha: '19:00' }
};

CN.DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
CN.DIAS_CURTO  = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
CN.MESES       = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
                  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
CN.MESES_CURTO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun',
                  'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/* ---------- Cardápio de serviços ---------- */
CN.SERVICOS = [
  {
    id: 'corte-classico',
    nome: 'Corte Clássico',
    desc: 'Tesoura e máquina, lavagem, finalização com pomada e toalha quente.',
    preco: 55,
    duracao: 40
  },
  {
    id: 'corte-navalhado',
    nome: 'Corte Navalhado',
    desc: 'Degradê fechado na navalha, contorno milimétrico e acabamento em pente fino.',
    preco: 70,
    duracao: 50
  },
  {
    id: 'barba-terapia',
    nome: 'Barba Terapia',
    desc: 'Toalha quente, óleo pré-barba, navalha em duas passadas e bálsamo calmante.',
    preco: 45,
    duracao: 30
  },
  {
    id: 'combo-imperio',
    nome: 'Combo Império',
    desc: 'Corte completo + barba terapia. O ritual inteiro, com bebida por nossa conta.',
    preco: 95,
    duracao: 70,
    destaque: 'Mais pedido'
  },
  {
    id: 'pigmentacao',
    nome: 'Pigmentação & Disfarce',
    desc: 'Correção de falhas na barba ou disfarce de fios brancos com efeito natural.',
    preco: 40,
    duracao: 30
  },
  {
    id: 'platinado',
    nome: 'Platinado Premium',
    desc: 'Descoloração global, matização e tratamento de reconstrução no mesmo dia.',
    preco: 190,
    duracao: 120
  }
];

/* ---------- Equipe ----------
   'folga' usa o mesmo padrão de dia da semana do JS.         */
CN.BARBEIROS = [
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
    foto: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=600&q=80'
  }
];

/* ---------- Galeria ---------- */
CN.GALERIA = [
  { src: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=800&q=80', legenda: 'Clássico executivo',  span: 'lg:col-span-2 lg:row-span-2', ratio: 'aspect-square' },
  { src: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=700&q=80', legenda: 'Degradê na navalha', span: '', ratio: 'aspect-square' },
  { src: 'https://images.unsplash.com/photo-1596728325488-58c87691e9af?auto=format&fit=crop&w=700&q=80', legenda: 'Ferramentas da casa', span: '', ratio: 'aspect-square' },
  { src: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=700&q=80', legenda: 'A cadeira de 1962',  span: '', ratio: 'aspect-square' },
  /* O último item ocupa a linha inteira no mobile (2 colunas) para não
     sobrar buraco na grade; no desktop volta a ser um quadrado normal. */
  { src: 'https://images.unsplash.com/photo-1567894340315-735d7c361db0?auto=format&fit=crop&w=700&q=80', legenda: 'Barba desenhada',    span: 'col-span-2 lg:col-span-1', ratio: 'aspect-[2/1] lg:aspect-square' }
];

/* ---------- Depoimentos ---------- */
CN.DEPOIMENTOS = [
  {
    nome: 'Marcos Vinícius',
    detalhe: 'Cliente há 6 anos',
    nota: 5,
    texto: 'Já testei meia dúzia de barbearias caras na região. Nenhuma acerta o degradê como o Diego. E o horário é o horário — nunca esperei mais de cinco minutos.'
  },
  {
    nome: 'Thiago Nakamura',
    detalhe: 'Primeira visita em março',
    nota: 5,
    texto: 'Cheguei achando que era só cortar o cabelo. Saí de lá com a barba desenhada, café na mão e a sensação de ter tirado uma tarde de folga em quarenta minutos.'
  },
  {
    nome: 'Rodrigo Bastos',
    detalhe: 'Cliente há 2 anos',
    nota: 5,
    texto: 'Fiz platinado com o Léo depois de ter queimado o cabelo em outro lugar. Ele preferiu fazer em duas sessões pra não danificar. Isso é profissionalismo.'
  }
];

/* ---------- Nomes usados para gerar a agenda de demonstração ---------- */
CN.NOMES_DEMO = [
  'André Belmonte', 'Bruno Carvalho', 'Caio Ferrari', 'Daniel Prates',
  'Eduardo Simões', 'Felipe Aguiar', 'Gustavo Rangel', 'Henrique Vidal',
  'Igor Marchetti', 'João Pedro Lins', 'Kaique Rosa', 'Lucas Bittencourt',
  'Matheus Coelho', 'Nelson Fagundes', 'Otávio Brandão', 'Pedro Sanches',
  'Renan Queiroz', 'Sérgio Antunes', 'Thiago Nakamura', 'Vitor Assunção'
];
