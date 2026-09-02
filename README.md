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

O projeto foi redesenhado sob um princípio — **subtração antes de decoração**:
cada elemento precisa responder "que decisão do usuário este dado muda?"; se a
resposta é "nenhuma", ele sai da tela. Depois disso, a construção foi calibrada
pelos padrões da **Apple**, com valores medidos no CSS computado do apple.com e
nas fontes medidas em canvas — não estimados.

### Tipografia

**Uma família: Inter**, servida com o eixo de *optical size* ligado
(`family=Inter:opsz,wght@14..32,400;14..32,600`). Isso reproduz de graça o
mecanismo central da tipografia da Apple: medido, a Inter estreita 0,8% sozinha
de 14px para 48px, que é exatamente o trabalho da troca SF Pro Text → SF Pro
Display. Sem o `opsz,` na URL o Google Fonts serve outro arquivo e o recurso
desliga em silêncio.

| Regra | Valor |
| --- | --- |
| Rampa de tamanhos | 12 · 14 · 17 · 21 · 28 · 40 · 48 · 56 — nunca 15, 18, 22 |
| Line-height de título | `calc(1em + 4px)` |
| Line-height de leitura | `calc(1em + 8px)` |
| Pesos | **só 400 e 600** — a apple.com não usa 700 |
| Tracking | 56px `-0.005em` · 48px `-0.003em` · 21–40px `0` · 17px `-0.011em` · 14px `-0.008em` |
| Breakpoints | 1068px e 734px, descendo degraus na mesma rampa |

Duas armadilhas evitadas: o tracking da Apple (`-0.022em` no corpo) foi
calibrado para a SF Pro Text, que é um desenho largo — a Inter já nasce
apertada, então usamos metade. E o tracking *positivo* que a Apple aplica entre
19 e 32px é compensação por usar o corte Display em corpo pequeno; com o eixo
`opsz` ligado isso é automático, e copiar seria corrigir duas vezes.

### Cor

Tema claro, **um acento**. A rampa de neutros é **quente** de propósito: os
cinzas da Apple são azulados (`#F5F5F7` tem B > R) e misturá-los com o off-white
de uma barbearia faz o branco parecer encardido.

| Token | Valor | Papel |
| --- | --- | --- |
| `--paper` | `#FAF9F7` | fundo da página |
| `--surface` | `#FFFFFF` | cartões e listas |
| `--line` | `#E8E4DC` | separador |
| `--ink` | `#1C1B19` | texto (16,9:1) |
| `--ink-2` | `#6B6862` | secundário (5,55:1) |
| `--ink-3` | `#8A867E` | letra miúda |
| `--accent` | `#8E2C26` | ação primária e estado crítico |
| `--accent-hover` | `#9C332C` | **mais claro** no hover, como a Apple |
| `--accent-text` | `#7A2520` | o mesmo hue, escurecido, quando é texto |

O acento foi calculado, não escolhido de catálogo: branco sobre cada acento de
sistema da Apple dá systemBlue 4,02:1, Red 3,55:1, Teal 2,57:1, Green 2,22:1 —
todos reprovam. Até o `#0071E3` do botão da apple.com dá só 4,70:1. Este dá
**8,27:1**, o que deixa margem para o acento aparecer pequeno.

Trocar de acento é editar `--accent`, `--accent-hover`, `--accent-active`,
`--accent-text` e `--accent-tint` nas duas folhas.

### Componentes — três referências, não uma

Página de marketing e ferramenta de trabalho são produtos diferentes na própria
Apple. Copiar a vitrine para dentro de um ERP dá uma tela bonita onde cabe
metade dos dados.

| Peça | Referência | O que isso significa |
| --- | --- | --- |
| `index.html` | apple.com | pílula de 44px, corpo 17px, headline 56px, respiro de 80px |
| `agendar.html` | fluxo de checkout | alvo de 44px, uma ação por tela, barra fixa |
| `dashboard.html` | app do macOS | botão de 6px de raio, corpo 14px, linha de 36px |

Vieram do HIG, com valores: pílula de navegação de 32px com raio 6px e respiro
de 8px; lista agrupada com separador recuado 16px; *segmented control* com
trilho de 9px e pílula de 7px com sombra; interruptor 38×22 com botão de 18;
campo de 36px; anel de foco como halo de 3px; cartão de raio 12px com sombra
`0 1px 3px rgba(0,0,0,.04)`; alvo mínimo de 28px no mouse e 44px no dedo.

### Onde este sistema se afasta da Apple, de propósito

1. **A Apple usa o azul em cinco lugares** — seleção de sidebar, link, foco,
   interruptor ligado e botão primário. A regra deste projeto é um acento. Ele
   fica na ação primária, no anel de foco e na linha do "agora" da agenda;
   seleção de menu e interruptor se resolvem na escala de neutros.
2. **Caixa alta saiu.** Nenhum token da apple.com usa `text-transform`. Os
   rótulos de seção viraram títulos de verdade e o cabeçalho de coluna passou a
   caixa normal, como em Numbers e no Finder.
3. **`backdrop-filter` só na barra fixa.** É caro, e numa agenda que rola muito
   o custo aparece em máquina fraca — que é o hardware provável de uma
   barbearia. A sidebar é sólida.
4. **A marca é um símbolo.** O poste de barbeiro, reduzido a um retângulo
   arredondado com três diagonais, desenhado inline em SVG (`currentColor`, sem
   arquivo) e reaproveitado no favicon das três páginas.

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
