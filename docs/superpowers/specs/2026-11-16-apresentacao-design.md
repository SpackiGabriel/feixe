# Apresentação da defesa — redesenho (2026-11-16)

Aprovado pelo dono em 2026-11-16. Defesa em 2026-11-18 (20 min + arguição).
Este arquivo é o briefing comum de todos os workers.

## Objetivo

Substituir o `apresentacao.html` atual (2765 linhas, 13 "passos" com código,
simulação interativa, cola de fala, cronômetro e atalhos de apresentador) por
uma apresentação **de projeto**: tópicos que explicam como o programa
funciona, poucas fórmulas bem compostas, trechos de código só onde importam,
animações **automáticas**. O `docs/defesa.md` continua sendo o guia geral
(tudo o que podem perguntar); a apresentação é só o que se mostra.

## Regras da apresentação (não negociáveis)

1. **Nada para o apresentador na tela.** Sem cronômetro, notas, faixas de
   tempo, legendas de atalho, botão "jogo · L3 [G]", comandos `__feixe`,
   instruções tipo "Alt+Tab". O professor só vê conteúdo.
2. **Navegação:** `→` / `Espaço` / `PageDown` / clique avança; `←` /
   `PageUp` volta; `Home`/`End`; `F` tela cheia (não anunciado). Indicador:
   uma barra fina de progresso em forma de feixe no rodapé, nada mais.
3. **Uma ideia por slide**, tópicos curtos (≤ 5 bullets, ≤ ~12 palavras cada),
   muito respiro. Cards, diagramas e ícones em vez de painéis densos.
4. **Animações automáticas** em loop, iniciam ao entrar no slide e param ao
   sair. Sem sliders, sem arrastar, sem clique.
5. **Código nunca rola.** Trechos de ≤ ~14 linhas, recortados com `…` onde
   omitir; o `deck.js` reduz a fonte até caber na caixa (mínimo legível
   ~13 px no palco 1280×720). Abaixo do código, legenda discreta com
   `arquivo` (sem número de linha). Os trechos são **cópias fiéis** de
   `src/` (só elisões com `…`, nunca reescrita).
6. **Fórmulas** em MathML nativo (`<math display="block">`), grandes, com os
   termos coloridos por significado, e uma linha em português embaixo dizendo
   o que a fórmula faz. Nada de fórmula em texto monoespaçado.
7. **Offline:** nenhum CDN, nenhuma fonte externa. Tudo servido por
   `npm start` (http.server na raiz, porta 8000).
8. Português do Brasil em todo texto visível.

## Identidade visual (escuro, identidade do jogo)

Tokens (definir em `apresentacao/deck.css` como variáveis CSS e reutilizar
nas cenas):

| Token | Valor | Uso |
|---|---|---|
| `--ink` | `#07090a` | fundo |
| `--panel` | `#0c1012` | cards |
| `--paper` | `#d9d4c7` | texto |
| `--paper-dim` | `#8d897e` | texto secundário |
| `--line` | `rgba(217,212,199,.18)` | bordas |
| `--beam` | `#fff1d6` | feixe branco / destaque |
| `--c-red` | `#ff3b30` | Eixo I · Geometria |
| `--c-green` | `#2ee66b` | Eixo II · Visualização |
| `--c-blue` | `#3b9eff` | Eixo III · Renderização |
| `--c-yellow` | `#ffe047` | Eixo IV · Animação |
| fonte display | `"Bahnschrift", "DIN Condensed", "Roboto Condensed", "Arial Narrow", sans-serif` | títulos |
| fonte mono | `ui-monospace, "Cascadia Code", "JetBrains Mono", Consolas, monospace` | código |

Símbolos das cores (spec do jogo): vermelho = círculo, verde = triângulo,
azul = losango. Palco fixo 1280×720 escalado para a janela (como o atual).

## Roteiro (15 slides)

| # | Slide | Conteúdo | Cena / mídia |
|---|---|---|---|
| 01 | Capa | FEIXE · Computação Gráfica · UTFPR · nomes | `cover-beam` |
| 02 | O que é o Feixe | Quebra-cabeça em 1ª pessoa: levar a luz certa ao receptor certo. Peças: emissor, espelho, filtro, receptor, portal, porta | ícones `apresentacao/icons/*.svg` |
| 03 | Demonstração | Slide-intervalo, só título "Demonstração" + feixe sutil | `cover-beam` (variante calma) ou CSS |
| 04 | Como o programa funciona | Laço por quadro: entrada → lógica 2D (JS puro, testável) → apresentação 3D (Three.js) → quadro; dados do nível → cena | `pipeline` |
| 05 | O feixe | Traçado no plano XZ: interseção raio–segmento, reflexão, cor por canal; "no L3 vocês viram: girar θ ⇒ feixe gira 2θ" | `beam-reflect` + fórmula r = d − 2(d·n)n |
| 06 | Eixo I · Geometria | T·R·S (ordem importa), malha gerada por código (condutos), hierarquia do espelho (base → placa) | `trs-order` |
| 07 | Eixo I · código | `composeTRS` + parede com matriz à mão | código |
| 08 | Eixo II · Câmera | Perspectiva, w = −z, NDC = clip / w | `frustum-w` + matriz P |
| 09 | Eixo II · Navegação | yaw/pitch (Euler YXZ), colisão AABB por eixo (desliza na parede), portal soma θ ao yaw | `nav-collision` |
| 10 | Eixo III · Iluminação e materiais | Blinn-Phong próprio (ka, kd, ks, n), luz por feixe, PBR no espelho, reflexo planar | `blinn-phong` + fórmula |
| 11 | Eixo III · Sombreamento e texturas | Por vértice × por fragmento, normalMatrix, texturas por código + `tileUvs` | `gouraud-phong` + trecho GLSL |
| 12 | Eixo IV · Animação | dt em tudo, `damp` exponencial, porta reversível | `damp-race` + fórmula |
| 13 | Qualidade | 344 testes unitários, matrizes conferidas com o Three, 60 FPS, zero modelos importados | contadores/cards |
| 14 | Conclusão | O que o projeto demonstra nos 4 eixos (o que é nosso × o que é do Three) | mapa dos 4 eixos |
| 15 | Perguntas | "Obrigado · Perguntas" | `cover-beam` |

As **alterações ao vivo** ficam só no `defesa.md` (§4), não na apresentação.

## Arquitetura de arquivos

```
apresentacao.html            casca: palco + 15 <section class="slide">, conteúdo estático
apresentacao/deck.css        tokens, layout, componentes (card, bullets, code, math)
apresentacao/deck.js         navegação, escala do palco, barra de progresso,
                             ciclo de vida das cenas, realce + ajuste de código
apresentacao/scenes/<n>.js   uma cena animada por arquivo (contrato abaixo)
apresentacao/icons/<n>.svg   ícones das peças
apresentacao/img/<n>.png     capturas reais do jogo (opcional)
```

### Contrato de cena

```js
// apresentacao/scenes/<nome>.js — ES module, sem dependências externas
export default function mount(host) {
  // host: HTMLElement já dimensionado pelo CSS do slide.
  // Construir um <svg viewBox="0 0 W H" width="100%" height="100%"> dentro dele.
  // SVG (não canvas): fica nítido no palco escalado.
  return {
    start() { /* inicia requestAnimationFrame, loop infinito */ },
    stop()  { /* cancela o rAF; start() de novo deve retomar */ },
  };
}
```

- No HTML: `<div class="scene" data-scene="beam-reflect"></div>`. O
  `deck.js` faz `import('./scenes/beam-reflect.js')`, chama `mount` uma vez,
  `start()` ao entrar no slide e `stop()` ao sair.
- Animação por tempo real (`performance.now()`), loop de 6–12 s, com pausas
  curtas nos momentos-chave. Movimento suave (easing), nada de estrobo.
- Pouquíssimo texto dentro da cena (rótulos de 1–3 palavras, ex. `N`, `L`,
  `θ`, `2θ`, `w = 2`). Cores e fontes pelos tokens (`var(--c-red)` etc.,
  lidos com `getComputedStyle(document.documentElement)` ou hard-coded iguais).
- A matemática mostrada tem de ser **correta** (a reflexão desenhada é a
  reflexão calculada, o ponto projetado é P·v / w de verdade etc.).
- Página de teste: cada cena deve rodar isolada em
  `apresentacao/scenes/_preview.html?scene=<nome>` (um único arquivo de
  preview genérico que monta a cena num host 800×450 com fundo `--ink`).

### Cenas

| Nome | O que mostra (loop) |
|---|---|
| `cover-beam` | Feixe branco atravessa o palco, bate num espelho e se divide/colore em R, G, B suavemente; fundo com grade sutil. Discreto (é fundo de capa). |
| `pipeline` | Diagrama de blocos: Entrada → Lógica 2D → Apresentação 3D → Quadro, com um pulso de luz percorrendo as setas a cada quadro; ramo "Dados do nível → Cena" entrando na lógica. Rótulos curtos. |
| `beam-reflect` | Vista de cima (plano XZ): emissor, espelho girando ±θ devagar, normal n desenhada, feixe refletido calculado por r = d − 2(d·n)n; arco θ no espelho e arco 2θ no feixe. |
| `trs-order` | Duas colunas: caixa unitária → S → R → T (T·R·S, certo) vs. → R → S → T (T·S·R, errado, cisalha em losango a 45°). Etapas aparecem em sequência. |
| `frustum-w` | Vista lateral do frustum: câmera, plano de projeção, dois cubos iguais a profundidades z e 2z; mostra w crescendo e a projeção do mais distante com metade da altura. |
| `nav-collision` | Vista de cima: jogador (AABB) andando na diagonal contra uma parede; resolve x, depois z → desliza ao longo dela. Seta de frente = (−sin yaw, −cos yaw). |
| `blinn-phong` | Superfície com N; luz orbitando (L), olho (V), H = normalize(L+V) desenhado; intensidade do brilho na superfície acompanhando (N·H)^n. |
| `gouraud-phong` | Duas paredes de 2 triângulos lado a lado com uma luz pontual perto do centro: esquerda por fragmento (mancha), direita por vértice (cor só nos 4 cantos interpolada, mancha some). Luz se movendo devagar. |
| `damp-race` | Duas trilhas: "30 FPS" e "144 FPS", ambas com `x ← alvo + (x − alvo)·e^(−λ·dt)` chegando juntas; terceira trilha "lerp por quadro" a 144 FPS chegando antes (o erro). Marcas de quadro visíveis. |

## Seletor de níveis no jogo

- Item **"Câmara"** (era "Selecionar câmara"; encurtado para caber no menu) nos menus inicial e de pausa
  (`src/ui/menu.js`), com meta `◂ 03 · Ângulo ▸`. `←`/`→` percorrem só os
  níveis **já alcançados**; Enter/clique carrega o escolhido (com a
  transição `blink`, como "Reiniciar") e retoma o jogo. Só aparece quando há
  mais de um nível alcançado.
- `src/levels/level-manager.js`: chave nova `feixe.reachedLevelIndex`
  (maior índice já alcançado). Funções puras com storage injetável, como as
  existentes: `loadReachedLevelIndex(levelCount, storage)` (nunca menor que o
  índice atual salvo, para o progresso antigo contar) e
  `saveReachedLevelIndex(index, storage)` (grava o máximo).
- Atualizada ao chegar num nível novo, ao terminar o nível 10 (todos
  alcançados) e no `?debug&level=N`. "Novo jogo" **não** apaga.
- Testes unitários em `tests/unit/level-manager.test.js`.

## `docs/defesa.md`

Continua o guia completo. Reescrever: cabeçalho/introdução (sem os atalhos
do html antigo), §1 Roteiro com os 15 slides e o tempo de cada um (no md
pode, é para os alunos), a demo usando o seletor de níveis, o checklist do
dia. Manter §2–§5 (conteúdo técnico, 38 perguntas, alterações ao vivo),
ajustando referências ao html antigo.

## Fora de escopo

Jogo embutido em iframe, notas do apresentador, exportar PDF, edição ao
vivo dentro dos slides.
