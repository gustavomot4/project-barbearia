# Casa Navalha — Site, Agendamento e Painel de Gestão

Protótipo comercial navegável para barbearia, dividido em **três produtos
independentes** que compartilham a mesma base de dados. Sem backend, sem banco,
sem etapa de build: são arquivos estáticos que rodam direto no GitHub Pages. Os
dados ficam no `localStorage` do navegador.

| Página | O que é | Para quem |
| --- | --- | --- |
| [`index.html`](index.html) | **Site institucional** — cardápio com preços, equipe, trabalho, endereço e horários | Visitante que ainda não conhece a barbearia |
| [`agendar.html`](agendar.html) | **Sistema de agendamento** — fluxo de 4 etapas e confirmação | Cliente que quer marcar horário |
| [`dashboard.html`](dashboard.html) | **Painel de gestão (ERP)** — agenda, serviços, finanças, equipe, clientes | Proprietário |

## Por que separado

Cada peça funciona sozinha. Isso permite vender e implantar em qualquer
combinação:

- **Só o agendamento** — o cliente já tem site ou usa só o Instagram. Publique
  `agendar.html` e ponto; ele não depende do institucional para nada.
- **Só o institucional** — o cliente quer presença digital e ainda agenda por
  WhatsApp. Troque os CTAs de `agendar.html` para o link do WhatsApp.
- **O pacote completo** — o site leva ao agendamento, o agendamento alimenta o
  painel, o painel controla o que o site mostra.

As três páginas conversam entre si sem nenhum acoplamento de código: o único
ponto de contato é o `localStorage`, através de `store.js`.

---

## Sistema visual

O projeto foi redesenhado sob um único princípio: **subtração antes de
decoração**. Cada elemento precisa responder "que decisão do usuário este dado
muda?" — se a resposta é "nenhuma", ele sai da tela.

**Cor.** Fundo off-white (`#FBFAF8`), texto quase preto (`#16161A`) e **um
acento** (`#1F5C4C`). O acento marca a **ação primária** de cada tela e o único
estado crítico do sistema (a linha do "agora" na Agenda). Não existe segunda
cor: status de agendamento, seleção, erro de campo e dia de hoje são
comunicados por **peso, posição e preenchimento neutro**.

Numa confirmação destrutiva a ação destrutiva *é* a primária daquele diálogo,
então ela usa o acento — a proteção é o texto explícito (com o número real do
que será apagado) e o "Voltar" neutro ao lado.

**Tipografia.** Duas famílias no projeto inteiro:

- **Inter** em tudo, inclusive nos números (`font-variant-numeric: tabular-nums`);
- **Cormorant Garamond** só nos títulos do institucional. O painel e o
  agendamento não carregam a serifada.

Quatro tamanhos por tela, e a hierarquia se resolve por **peso** antes de
tamanho. Caixa alta com `letter-spacing` só em rótulo curto (`.rotulo`,
`.ds-eyebrow`) — nunca em frase.

**Composição.** Uma informação herói e uma ação primária por tela. Espaço vazio
é resultado aceito, não problema a resolver.

Os tokens ficam em `:root`: prefixo `--ds-` em `assets/css/dashboard.css`
(painel) e sem prefixo em `assets/css/styles.css` (site e agendamento).

---

## Publicar no GitHub Pages

```bash
git add . && git commit -m "Casa Navalha — site, agendamento e painel"
```

Depois envie ao GitHub e, em **Settings → Pages**, escolha branch `main` e
pasta `/ (root)`. O `.nojekyll` já está incluído e não há dependências de npm.

As páginas ficam em:

- `https://SEU-USUARIO.github.io/SEU-REPO/`
- `https://SEU-USUARIO.github.io/SEU-REPO/agendar.html`
- `https://SEU-USUARIO.github.io/SEU-REPO/dashboard.html`

## Rodar localmente

```bash
python -m http.server 4173
```

Acesse `http://localhost:4173`.

---

## Roteiro de demonstração

Uma sequência de 3 minutos que mostra o sistema inteiro funcionando:

1. **Abra o painel** (`dashboard.html`) → Configurações → **Popular agenda de
   demonstração**. A agenda ganha vida.
2. **Hoje** — o painel abre no atendimento em curso (ou no próximo) e num único
   botão: concluir. A fila do dia fica logo abaixo.
3. **Agenda** — visão de dia com uma coluna por barbeiro. Alterne para
   **Semana**: quando dois barbeiros têm horário no mesmo instante, os blocos
   dividem a largura da coluna em faixas. Clique num bloco para concluir,
   cancelar ou falar com o cliente.
4. **Serviços** — clique em **Novo serviço**, crie um serviço qualquer e salve.
   Clicar em qualquer linha abre a edição.
5. **Abra `agendar.html`** — o serviço recém-criado já está na lista. Faça um
   agendamento completo.
6. **Volte ao painel** — o agendamento aparece na Agenda, o cliente entra na
   aba Clientes e o faturamento sobe em Finanças.

O painel abre direto: numa venda real ele fica atrás do login do sistema, não
de uma senha no código-fonte.

---

## Estrutura

```
index.html                 Site institucional
agendar.html               Fluxo de agendamento
dashboard.html             Painel do proprietário
.nojekyll                  Desliga o Jekyll no GitHub Pages

assets/css/styles.css      Sistema visual do site (institucional + agendamento)
assets/css/dashboard.css   Sistema visual do painel (independente)

assets/js/data.js          DADOS DO NEGÓCIO — edite só este arquivo para adaptar
assets/js/store.js         Núcleo: localStorage, catálogo, relatórios, horários
assets/js/ui.js            Interface do site
assets/js/booking.js       Fluxo de 4 etapas
assets/js/charts.js        Gráficos SVG do painel (sem biblioteca)
assets/js/dashboard.js     Aplicação do painel
```

Quem carrega o quê:

| Página | Scripts |
| --- | --- |
| `index.html` | `data` → `store` → `ui` |
| `agendar.html` | `data` → `store` → `ui` → `booking` |
| `dashboard.html` | `data` → `store` → `charts` → `dashboard` |

Os scripts são clássicos (sem ES modules) para o site funcionar mesmo aberto
via `file://`.

---

## O painel de gestão

Sete telas, cada uma com uma informação herói e — quando existe trabalho a
fazer nela — uma ação primária.

| Tela | Herói | Ação primária |
| --- | --- | --- |
| **Hoje** | O atendimento em curso (ou o próximo) | Concluir atendimento |
| **Agenda** | A grade do dia | Encaixar cliente |
| **Serviços** | O preço de cada serviço | Novo serviço |
| **Finanças** | Resultado líquido do mês | — (é relatório) |
| **Barbeiros** | A comissão do mês | Pausar/reativar na agenda |
| **Clientes** | Visitas por cliente | Falar no WhatsApp (por linha) |
| **Configurações** | O expediente da semana | Salvar alterações |

**Hoje** — o atendimento em curso em corpo grande, o botão de baixa colado nele
e a fila do dia embaixo. O botão de baixa nunca aponta para um horário futuro:
ele mira o que está em curso ou o último que já terminou sem baixa.

**Agenda** — grade com uma coluna por barbeiro (visão de dia) ou por dia da
semana (visão de semana). Cada bloco é posicionado e dimensionado pelo horário
e pela duração reais. Na visão de semana os blocos que se sobrepõem dividem a
largura da coluna em faixas, e cada um leva a inicial do barbeiro.

**Serviços** — tabela com nome, preço, duração e um interruptor "no site". A
linha inteira abre a edição; excluir mora no rodapé do formulário, com a
confirmação de impacto.

**Finanças** — o resultado líquido em destaque, a decomposição em uma linha
(faturamento − custo − despesas fixas), a tabela de comissões com a receita ao
lado para conferência, e a receita por serviço.

**Barbeiros** — uma linha por profissional com atendimentos, receita, comissão,
ocupação da semana e o interruptor que pausa o barbeiro na agenda sem apagar
nada.

**Clientes** — base construída sozinha a partir dos agendamentos, ordenada por
recorrência, com busca por nome ou telefone e o número visível como botão de
WhatsApp (nunca escondido em `hover`: abaixo de 720px `hover` não existe).

**Configurações** — expediente dia a dia no topo, dados do negócio abaixo, e um
único **Salvar** que comete os dois. Depois, as ações de sistema: popular demo,
exportar backup, restaurar catálogo e limpar agenda.

---

## Adaptar para outra barbearia

Quase tudo que muda de cliente para cliente está em
[`assets/js/data.js`](assets/js/data.js) — e boa parte também é editável pelo
próprio painel, sem tocar em código.

| O que mudar | Onde |
| --- | --- |
| Nome, telefone, WhatsApp, endereço | `CN.CONFIG_PADRAO` ou aba **Configurações** |
| Margem bruta e comissão | `CN.CONFIG_PADRAO` ou aba **Configurações** |
| Horário de funcionamento | `CN.HORARIOS_PADRAO` ou aba **Configurações** |
| Serviços, preços e durações | `CN.SERVICOS_PADRAO` ou aba **Serviços** |
| Equipe, fotos e folgas | `CN.BARBEIROS_PADRAO` ou aba **Barbeiros** |
| Fotos de trabalho | `CN.GALERIA` (o site mostra as três primeiras) |
| Base financeira simulada e despesas | `CN.FINANCEIRO` |

Detalhes úteis:

- Dias da semana seguem o padrão do JavaScript: `0` é domingo. `null` em
  `CN.HORARIOS_PADRAO` significa fechado; o campo `folga` do barbeiro usa a
  mesma numeração.
- A duração de um serviço precisa ser múltipla de `CN.CONFIG.intervaloMin`
  (30 min) — o formulário do painel valida isso.
- O sistema nunca oferece um horário cujo serviço ultrapasse o fechamento.
- A descrição do serviço é um **diferenciador** — o que muda entre um e outro —,
  não copy de cardápio: ela aparece em uma linha no institucional.
- `cor` do barbeiro não pinta mais nada (veja o comentário em `data.js`).

---

## Decisões técnicas que valem menção

- **O catálogo tem duas camadas.** `data.js` guarda os padrões de fábrica; o
  que o dono edita vai para o `localStorage` e tem precedência. "Restaurar
  padrão" apenas apaga a camada de cima.
- **Serviço excluído não corrompe o histórico.** `servicoPorId` procura no
  catálogo vigente e, se não achar, nos padrões — um agendamento antigo
  continua exibindo o nome do serviço mesmo depois de ele sair do cardápio.
- **O interruptor "no site" tem de existir no formulário.** Sem ele o payload
  chega sem `ativo`, e `store.js` (`ativo: dados.ativo !== false`) reativaria
  sozinho qualquer serviço desligado que o dono editasse.
- **Horários ocupados são determinísticos.** A ocupação de demonstração vem de
  um hash de `data + barbeiro + horário`, então a agenda não muda a cada
  recarga — o cliente vê o mesmo cenário durante toda a apresentação.
- **Conflito é checado duas vezes:** ao montar a grade e de novo no envio,
  cobrindo o caso de duas abas abertas.
- **Um serviço ocupa todos os blocos que consome.** Um combo de 70 min precisa
  de três blocos livres seguidos, não apenas do horário de início.
- **Faixas na visão de semana.** Uma coluna é um dia e recebe os agendamentos
  de todos os barbeiros; sem o cálculo de faixas, dois horários simultâneos
  desenhariam um por cima do outro e a coluna mentiria justamente nos dias mais
  cheios.
- **O botão desabilitado diz o que falta.** No agendamento ele troca de rótulo
  ("Escolha um serviço", "Escolha um horário") em vez de virar uma placa
  apagada.
- **`localStorage` indisponível não quebra nada.** Em aba anônima ou com cota
  cheia o sistema segue funcionando, apenas sem persistir.
- **Acessibilidade.** Foco visível, `aria-*` nos controles, o nome do dia como
  `label` dos interruptores de expediente, tabelas que viram cartões no celular
  e respeito a `prefers-reduced-motion`.

---

## Limitações (é um protótipo de front-end)

- Os dados ficam **apenas no navegador de quem acessa**. Um agendamento feito
  no celular do cliente não aparece no computador da barbearia — por isso a
  ação primária da confirmação é **enviar no WhatsApp**: é o único caminho pelo
  qual a reserva chega de fato à barbearia.
- O painel não tem autenticação: quem souber a URL entra. Num produto real ele
  fica atrás de um login de verdade, no servidor.
- Os números financeiros são **simulados** — partem de uma base fictícia em
  `CN.FINANCEIRO` somada aos agendamentos reais. A tela de Finanças diz isso
  numa linha, uma vez.
- Não há envio real de WhatsApp, e-mail ou SMS: os botões apenas montam a
  mensagem e abrem o aplicativo. O antigo checkbox "quero um lembrete" foi
  removido justamente por prometer o que o sistema não entrega.
- Não existe rota de cancelamento pelo lado do cliente: por isso o telefone da
  casa fica visível no cabeçalho do agendamento.
- O Tailwind vem por CDN, ótimo para protótipo e desaconselhável em produção.
  Numa versão final, compile o CSS e remova a `<script>` do CDN.

Para virar produto de verdade, o caminho é trocar `assets/js/store.js` por
chamadas a uma API. Nenhum outro arquivo fala diretamente com o `localStorage`,
então o resto do código não precisa mudar.
