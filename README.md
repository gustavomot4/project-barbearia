# Casa Navalha — Front-End de Barbearia

Protótipo comercial navegável de site + sistema de agendamento para barbearia.
Sem backend, sem banco de dados, sem etapa de build: são arquivos estáticos que
rodam direto no GitHub Pages. Os agendamentos ficam salvos no `localStorage` do
navegador, o que é suficiente para demonstrar o produto inteiro para um cliente.

---

## Publicar no GitHub Pages

```bash
git init && git add . && git commit -m "Casa Navalha — protótipo"
```

Depois crie o repositório no GitHub e envie:

```bash
git remote add origin https://github.com/SEU-USUARIO/SEU-REPO.git && git branch -M main && git push -u origin main
```

Por fim, em **Settings → Pages**, escolha `Deploy from a branch`, branch `main`,
pasta `/ (root)` e salve. Em cerca de um minuto o site fica no ar em
`https://SEU-USUARIO.github.io/SEU-REPO/`.

> Não é preciso configurar mais nada: o `.nojekyll` já está no repositório e não
> há dependências de `npm`.

## Rodar localmente

O projeto abre até com duplo clique no `index.html`, mas prefira um servidor
local para evitar diferenças de comportamento entre navegadores:

```bash
python -m http.server 4173
```

Acesse `http://localhost:4173`.

---

## Como testar o protótipo

1. **Agendar** — escolha serviço, barbeiro, data e horário, preencha nome e
   WhatsApp e confirme. Aparece o modal de sucesso com código da reserva, link
   pronto para o WhatsApp e download do evento para a agenda do celular (`.ics`).
2. **Painel do dono** — botão *Painel* no topo. PIN de demonstração: **1234**.
   Ali estão os indicadores do dia, os filtros e as ações de concluir, cancelar,
   reabrir e remover cada agendamento.
3. **Popular demo** — dentro do painel, cria uma agenda fictícia dos próximos
   dias. Útil para nunca apresentar o sistema com a tela vazia.
4. **Limpar tudo** — zera os agendamentos salvos naquele navegador.

Cancelar um agendamento devolve o horário para a lista de disponíveis
imediatamente.

---

## Estrutura

```
index.html              Marcação de todas as seções
.nojekyll               Desliga o processamento Jekyll do GitHub Pages
assets/css/styles.css   Identidade visual: texturas, animações, componentes
assets/js/data.js       DADOS DO NEGÓCIO — edite só este arquivo para adaptar
assets/js/store.js      localStorage, estatísticas e motor de horários
assets/js/ui.js         Navegação, animações e renderização das seções
assets/js/booking.js    Fluxo de agendamento em 4 etapas
assets/js/admin.js      Painel do proprietário
```

Os scripts são carregados como scripts clássicos (sem ES modules) justamente
para o site continuar funcionando mesmo aberto via `file://`.

---

## Adaptar para outra barbearia

Praticamente tudo que muda de cliente para cliente está em
[`assets/js/data.js`](assets/js/data.js):

| O que mudar | Onde |
| --- | --- |
| Nome, telefone, WhatsApp, endereço, PIN do painel | `CN.CONFIG` |
| Horário de funcionamento por dia da semana | `CN.HORARIOS` |
| Serviços, preços e durações | `CN.SERVICOS` |
| Equipe, fotos, especialidades e dia de folga | `CN.BARBEIROS` |
| Fotos do portfólio | `CN.GALERIA` |
| Depoimentos | `CN.DEPOIMENTOS` |

Detalhes úteis:

- `CN.HORARIOS` usa o padrão do JavaScript para dia da semana — `0` é domingo.
  `null` significa fechado.
- O campo `folga` de cada barbeiro segue a mesma numeração.
- `CN.CONFIG.janelaDias` define quantos dias à frente a agenda abre (padrão 21).
- `CN.CONFIG.antecedenciaMin` é a antecedência mínima para agendar no mesmo dia.
- O sistema nunca oferece um horário cujo serviço ultrapasse o fechamento.

### Cores e tipografia

As cores vivem em dois lugares que devem ser mantidos em sincronia: o bloco
`tailwind.config` no topo do `index.html` e as variáveis `:root` no início do
`styles.css`. As fontes são carregadas do Google Fonts pelo `<link>` do
`index.html`.

---

## Decisões técnicas que valem menção

- **Horários ocupados são determinísticos.** A ocupação de demonstração vem de
  um hash de `data + barbeiro + horário`, então a agenda não muda a cada
  recarga — o cliente vê sempre o mesmo cenário durante a apresentação.
- **Conflito é checado duas vezes.** Na montagem da grade e novamente no envio,
  cobrindo o caso de duas abas abertas ao mesmo tempo.
- **Um serviço ocupa todos os blocos que consome.** Um combo de 70 minutos
  precisa de três blocos livres seguidos, não apenas do horário de início.
- **`localStorage` indisponível não quebra o site.** Em aba anônima ou com cota
  cheia o app segue funcionando, apenas sem persistir.
- **Imagens têm degradação elegante.** Se uma foto não carregar, entra uma
  textura da marca no lugar, em vez do ícone de imagem quebrada.
- **Acessibilidade.** Foco visível, `aria-*` nos controles do fluxo e do painel,
  e respeito a `prefers-reduced-motion`.

---

## Limitações (é um protótipo de front-end)

- Os dados ficam **apenas no navegador de quem acessa**. Um agendamento feito no
  celular do cliente não aparece no computador da barbearia.
- O PIN do painel é apenas cênico: está no código-fonte e não protege nada.
- Não há envio real de WhatsApp, e-mail ou SMS — o botão apenas monta a mensagem
  e abre o aplicativo.
- O Tailwind vem por CDN, o que é ótimo para protótipo e desaconselhável em
  produção. Numa versão final, compile o CSS e troque a `<script>` do CDN.

Para virar produto de verdade, o caminho é trocar `assets/js/store.js` por
chamadas a uma API — o restante do código não precisa mudar, porque nenhum outro
módulo fala diretamente com o `localStorage`.
