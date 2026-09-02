# Casa Navalha — Site, Agendamento e Painel de Gestão

Protótipo comercial navegável para barbearia premium, dividido em **três
produtos independentes** que compartilham a mesma base de dados. Sem backend,
sem banco, sem etapa de build: são arquivos estáticos que rodam direto no
GitHub Pages. Os dados ficam no `localStorage` do navegador.

| Página | O que é | Para quem |
| --- | --- | --- |
| [`index.html`](index.html) | **Site institucional** — hero, serviços, equipe, portfólio, depoimentos, localização | Visitante que ainda não conhece a barbearia |
| [`agendar.html`](agendar.html) | **Sistema de agendamento** — fluxo de 4 etapas e confirmação | Cliente que quer marcar horário |
| [`dashboard.html`](dashboard.html) | **Painel de gestão (ERP)** — finanças, agenda, serviços, equipe, clientes | Proprietário |

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
   demonstração**. A agenda e os gráficos ganham vida.
2. **Dashboard** — faturamento do mês com variação percentual, lucro bruto
   simulado e agendamentos do dia. Os dois primeiros cards trazem a nota
   *"Simulado via localStorage"*.
3. **Agenda Geral** — visão de dia com uma coluna por barbeiro; a faixa
   listrada é o dia de folga e a linha vermelha marca o horário atual.
   Alterne para **Semana**. Clique num bloco para concluir ou cancelar.
4. **Serviços** — clique em **ADICIONAR NOVO SERVIÇO**, crie um serviço
   qualquer e salve.
5. **Abra `agendar.html`** — o serviço recém-criado já está na lista. Faça um
   agendamento completo.
6. **Volte ao painel** — o agendamento aparece na Agenda Geral, o cliente entra
   na aba Clientes e o faturamento sobe em Finanças.

O PIN não existe mais: o painel abre direto, porque numa venda real ele fica
atrás do login do sistema, não de uma senha no código-fonte.

---

## Estrutura

```
index.html                 Site institucional
agendar.html               Fluxo de agendamento
dashboard.html             Painel do proprietário
.nojekyll                  Desliga o Jekyll no GitHub Pages

assets/css/styles.css      Identidade do site (institucional + agendamento)
assets/css/dashboard.css   Design system do painel (independente)

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

**Dashboard** — faturamento do mês com variação e sparkline, lucro bruto com
gráfico de barras, agendamentos do dia, ocupação da agenda, evolução de 6
meses, ranking de serviços e a lista dos próximos atendimentos.

**Agenda Geral** — grade com uma coluna por barbeiro (visão de dia) ou por dia
da semana (visão de semana). Cada bloco é posicionado e dimensionado pelo
horário e pela duração reais do serviço. Clicar abre o detalhe com ações de
concluir, cancelar, reabrir, remover e abrir o WhatsApp do cliente.

**Serviços** — tabela com nome, preço, duração e status, botão dourado de
adição, formulário validado e modal de confirmação para exclusão. Tudo que
muda aqui vale imediatamente em `agendar.html`.

**Finanças** — faturamento, lucro bruto, despesas fixas e resultado líquido;
evolução mensal; receita por serviço; comissão por barbeiro.

**Barbeiros** — cartão por profissional com nota, folga, atendimentos do mês,
receita, comissão e ocupação da semana. O interruptor pausa o barbeiro na
agenda sem apagar nada.

**Clientes** — base construída sozinha a partir dos agendamentos: visitas,
última visita, serviço favorito, ticket médio e total gasto. Com busca por
nome ou telefone.

**Configurações** — dados do negócio, margem bruta simulada, comissão, janela
da agenda, antecedência mínima, horário de funcionamento dia a dia e as ações
de popular demo, exportar backup em JSON, restaurar catálogo e limpar agenda.

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
| Equipe, fotos, folgas e cores da agenda | `CN.BARBEIROS_PADRAO` ou aba **Barbeiros** |
| Portfólio e depoimentos | `CN.GALERIA` e `CN.DEPOIMENTOS` |
| Base financeira simulada e despesas | `CN.FINANCEIRO` |

Detalhes úteis:

- Dias da semana seguem o padrão do JavaScript: `0` é domingo. `null` em
  `CN.HORARIOS_PADRAO` significa fechado; o campo `folga` do barbeiro usa a
  mesma numeração.
- A duração de um serviço precisa ser múltipla de `CN.CONFIG.intervaloMin`
  (30 min) — o formulário do painel valida isso.
- O sistema nunca oferece um horário cujo serviço ultrapasse o fechamento.
- `cor` do barbeiro é o que colore o bloco dele na Agenda Geral.

### Cores e tipografia

O site usa `tailwind.config` no topo de cada HTML mais as variáveis `:root` de
`styles.css`. O painel tem sua própria paleta em `:root` no `dashboard.css`
(prefixo `--ds-`). A faixa de madeira de lei é a classe `.wood`.

---

## Decisões técnicas que valem menção

- **O catálogo tem duas camadas.** `data.js` guarda os padrões de fábrica; o
  que o dono edita vai para o `localStorage` e tem precedência. "Restaurar
  padrão" apenas apaga a camada de cima.
- **Serviço excluído não corrompe o histórico.** `servicoPorId` procura no
  catálogo vigente e, se não achar, nos padrões — um agendamento antigo
  continua exibindo o nome do serviço mesmo depois de ele sair do cardápio.
- **Horários ocupados são determinísticos.** A ocupação de demonstração vem de
  um hash de `data + barbeiro + horário`, então a agenda não muda a cada
  recarga — o cliente vê o mesmo cenário durante toda a apresentação.
- **Conflito é checado duas vezes:** ao montar a grade e de novo no envio,
  cobrindo o caso de duas abas abertas.
- **Um serviço ocupa todos os blocos que consome.** Um combo de 70 min precisa
  de três blocos livres seguidos, não apenas do horário de início.
- **Gráficos sem biblioteca.** `charts.js` mede a largura real do contêiner e
  desenha em pixels, redesenhando no `resize` — em vez de esticar um `viewBox`,
  o que distorceria a espessura dos traços.
- **`localStorage` indisponível não quebra nada.** Em aba anônima ou com cota
  cheia o sistema segue funcionando, apenas sem persistir.
- **Acessibilidade.** Foco visível, `aria-*` nos controles, tabelas que viram
  cartões no celular e respeito a `prefers-reduced-motion`.

---

## Limitações (é um protótipo de front-end)

- Os dados ficam **apenas no navegador de quem acessa**. Um agendamento feito
  no celular do cliente não aparece no computador da barbearia.
- O painel não tem autenticação: quem souber a URL entra. Num produto real ele
  fica atrás de um login de verdade, no servidor.
- Os números financeiros são **simulados** — partem de uma base fictícia em
  `CN.FINANCEIRO` somada aos agendamentos reais. Os cards deixam isso explícito.
- Não há envio real de WhatsApp, e-mail ou SMS: os botões apenas montam a
  mensagem e abrem o aplicativo.
- O Tailwind vem por CDN, ótimo para protótipo e desaconselhável em produção.
  Numa versão final, compile o CSS e remova a `<script>` do CDN.

Para virar produto de verdade, o caminho é trocar `assets/js/store.js` por
chamadas a uma API. Nenhum outro arquivo fala diretamente com o `localStorage`,
então o resto do código não precisa mudar.
