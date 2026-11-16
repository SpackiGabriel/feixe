# Guia de defesa — Feixe (apresentação de 20 min, 18/11/2026)

Base: o enunciado da disciplina (Seção 3: dez requisitos em quatro eixos;
Seção 5: nota = 0,70 × artefato + 0,30 × defesa, cada requisito de 0 a 10).
Duas escalas importam:

- **Artefato**: "Básico" = função pronta da ferramenta; "Avançado" = lógica
  própria (matriz composta à mão, shader customizado, malha gerada por código).
- **Defesa**: "Superficial" = descreve a tela; "Domínio pleno" = explica a
  matemática por trás, responde variações, **altera um parâmetro ao vivo e
  prevê o efeito antes de rodar**.

Como usamos Three.js, o enunciado exige "explicação rigorosa da matemática e
dos algoritmos que o motor executa internamente". Toda resposta abaixo tem
as duas partes: *o que o Three faz por dentro* e *onde nós fizemos à mão*.

Antes de apresentar: `npm start`, abrir `http://localhost:8000/?debug`
(painel de debug com posição, mira, receptores e portas; `F3` oculta) e
deixar o editor aberto nos arquivos citados. Com `?debug`,
`window.__feixe` dá acesso à câmera, ao `levelRuntime` etc. pelo console.

---

## 1. Roteiro (20 min)

| Tempo | Bloco | No jogo | No código |
|---|---|---|---|
| 0:00–1:00 | Abertura: o que é o Feixe (puzzle de laser em 1ª pessoa; 10 níveis; tudo procedural, nenhum modelo importado) | Jogar o L3 ("Ângulo"): girar o espelho, o feixe gira o dobro | — |
| 1:00–5:30 | **Eixo I** (3 requisitos) — transformações, malhas, hierarquia | L6: deslizar (translação) e girar (rotação) espelhos; paredes = caixa unitária × T·R·S à mão; tecla `T` (ordem errada) | `matrix.js`, `wall.js`, `mirror.js`, `conduits.js`, `laser.js` |
| 5:30–8:30 | **Eixo II** (2) — câmera/projeção e navegação | Mirar um espelho: painel mostra w e ndc à mão = Three; andar para trás (w cresce); `+`/`−` no FOV; colidir | `matrix.js`, `camera.js`, `look.js`, `movement.js`, `interaction.js` |
| 8:30–14:30 | **Eixo III** (4) — luz, sombreamento, materiais, texturas | L10 escuro: o feixe ilumina a parede; tecla `L` (por vértice: a mancha some); espelho com reflexo real; texturas | `phong-material.js`, `scene.js`, `laser-beam.js`, `mirror.js`, `textures.js`, `mirror-reflection.js` |
| 14:30–16:30 | **Eixo IV** (1) — animação independente de FPS | Porta subindo/descendo e revertendo; pulso dos condutos | `main.js`, `motion.js`, `door-motion.js` |
| 16:30–20:00 | Perguntas / alteração ao vivo | — | §4 deste guia |

Os 10 requisitos têm o **mesmo peso** na nota: o tempo acompanha quantos
cada eixo tem. Dica de ritmo: **uma fórmula dita por requisito** —
mostrar no jogo → abrir o arquivo → a fórmula. Não ler código linha a
linha. Deixar L3, L6 e L10 abertos em abas (`?debug&level=3` etc.).

**O trabalho é "estritamente individual" no enunciado:** cada um de
vocês precisa conseguir responder sozinho a qualquer item deste guia.

---

## 2. Requisito por requisito: o que mostrar, nível honesto e a matemática

### I.1 Coordenadas 3D e transformações (T, R, S, ordem canônica)

**Onde:** espelho no trilho = translação (`mirror.js:89`,
`base.position.lerpVectors(railStart, railEnd, t)` — interpolação linear
P = (1−t)·A + t·B); giro = rotação em Y (`mirror.js:106`); paredes =
caixa unitária com a matriz **T·R·S composta à mão** a partir do nível
(`wall.js:41-55` + `core/matrix.js`); feixe =
cilindro unitário escalado em Z pelo comprimento de cada trecho
(`laser-beam.js:151-153`).

**Matemática:** o Three monta a matriz local sempre como **M = T · R · S**
(`Object3D.updateMatrix` → `matrix.compose(position, quaternion, scale)`).
Um vértice p vira p' = T(R(S·p)): primeiro escala, depois rotação, depois
translação, em coordenadas homogêneas (vetor 4D com w = 1, por isso a
translação cabe numa matriz 4×4).

Rotação em torno de Y por θ:
```
| cosθ  0  sinθ |
|  0    1   0   |
| -sinθ 0  cosθ |
```
Feita **à mão** em `laser.js:39` (`rotateXZ`: x' = x·cosθ + z·sinθ,
z' = −x·sinθ + z·cosθ), usada para remapear a direção do feixe e do
jogador num portal.

**Por que a ordem importa (pergunta provável):** numa parede norte-sul
(rotação 90°) com escala (4, 3, 0,2): T·R·S escala a caixa no espaço
local (4 m de comprimento) e depois gira — certo. T·S·R giraria primeiro
e escalaria nos eixos do mundo: como o cubo unitário é simétrico, girar
90° não muda nada visível, e a parede fica leste-oeste, **como se não
tivesse girado**. A 45° o efeito é pior: a escala não uniforme depois da
rotação **cisalha** a caixa (a planta vira um losango). Com escala não
uniforme, R·S ≠ S·R. No Three, a ordem em que se
atribuem `position/rotation/scale` no código **não** importa: `compose`
sempre usa T·R·S.

**Matrizes compostas à mão (`src/core/matrix.js`):** `translation`,
`rotationX/Y/Z`, `scaling`, `multiply` (produto 4×4, coluna-maior como
o WebGL: `m[col·4 + linha]`), `transformPoint` (vetor homogêneo com
w = 1). `composeTRS` = T·R·S; `composeTSR` = a ordem errada, para a
demonstração. As **paredes internas usam essa matriz direto**:
`mesh.matrixAutoUpdate = false` e `mesh.matrix` = `composeTRS(centro,
ângulo, [comprimento, altura, espessura])` (`wall.js:41-55`), ou seja, o
Three não monta a matriz delas — nós montamos. Testes comparam cada
função com o Three até 9 casas decimais (`tests/unit/matrix.test.js`).

**Demonstração ao vivo — tecla `T`** (só com `?debug`): no L6, olhando a
parede norte-sul da câmara lateral (de x ≈ 2,5, z ≈ −2,5, olhando para
oeste), prever e apertar `T`: as paredes passam a T·S·R e a parede vira
uma lâmina leste-oeste, abrindo a câmara (aparecem o espelho M3 e o
receptor B). `T` de novo volta. É só visual: feixe e colisão continuam
usando os dados do nível; `R` reinicia.

**Nível honesto:** avançado. Composição à mão nas paredes, rotação à mão
no traçado do feixe (`laser.js`) e uso explícito de `matrixWorld` para
levar pontos locais ao mundo (`mirror.js:140-148`). Os demais objetos
(espelhos, portas) usam o `compose` do Three — mesma matemática.

### I.2 Modelagem 3D (malhas; topologia vs. geometria)

**Onde:** condutos do chão = `BufferGeometry` **gerada por código**
(`conduits.js:70-104`): para cada perna da rota, 4 vértices (posições) e
2 triângulos (índices).

**Topologia vs. geometria:** geometria = *onde* estão os vértices
(`position`); topologia = *como se ligam* (`setIndex`: triângulos
`base, base+1, base+2` e `base+1, base+3, base+2`). Mesma topologia,
geometria diferente: as paredes são todas a mesma caixa (mesma
conectividade), e a escala muda só as posições.

**Pergunta clássica:** "um cubo tem 8 vértices; por que a `BoxGeometry`
tem 24?" Porque cada face precisa da sua própria normal e UV no canto:
o mesmo ponto geométrico aparece 3 vezes com atributos diferentes
(arestas duras). Um cubo "suave" compartilharia os 8 e teria normais
médias, o que fica errado num cubo.

**Nível honesto:** a maioria das malhas é primitiva do Three (Box,
Cylinder, Plane); os condutos são malha própria. Mostrar os condutos.

### I.3 Modelagem hierárquica (grafo de cena)

**Onde:** espelho = `base` (Group, pai: desliza no trilho) → `plate`
(filho: gira) → grampos e superfícies de reflexo (netos) (`mirror.js:36-75`).
O pedestal é filho da base: desliza mas não gira. Porta: `root` →
`panel` (sobe) (`door-view.js`).

**Matemática:** M_mundo(filho) = M_mundo(pai) · M_local(filho). Para a
placa: M = T(posição no trilho) · R_y(θ). O traçado do feixe usa isso
diretamente: as pontas da placa (±0,5 m em x local) são levadas ao mundo
por `applyMatrix4(plate.matrixWorld)` (`mirror.js:141-142`).

**Demonstração:** deslizar um espelho já girado — a placa mantém o
ângulo e acompanha a base, porque herda a translação do pai.

### II.1 Câmera e projeções (perspectiva, divisão por w)

**Onde:** `camera.js:11` — `PerspectiveCamera(70°, aspect, 0,1, 100)`;
`+`/`−` muda o FOV (55°–100°) e chama `updateProjectionMatrix()`.

**Matemática (o que o Three monta por dentro)**, com f = 1/tan(fov/2)
(fov **vertical**) e a = largura/altura:
```
| f/a  0       0                 0          |
|  0   f       0                 0          |
|  0   0  (far+near)/(near−far)  2·far·near/(near−far) |
|  0   0      −1                 0          |
```
Pipeline: p_view = V·M·p; p_clip = P·p_view → **w_clip = −z_view** (a
distância à câmera). A GPU divide por w: NDC = (x, y, z)/w. É essa
divisão que causa o encurtamento perspectivo: o dobro de distância faz o
objeto ocupar metade da tela. No nosso shader: `laser-beam.js:37`,
`gl_Position = projectionMatrix * mv;` — o shader entrega coordenadas de
recorte e o hardware faz a divisão por w.

**FOV maior** → f menor → mais mundo na tela, objetos menores e
distorção maior nas bordas.

**Feito à mão (`src/core/matrix.js`):** `perspective(fov, a, near, far)`
monta exatamente a matriz acima; `viewMatrix(olho, pitch, yaw)` monta
V = Rx(−pitch)·Ry(−yaw)·T(−olho), a inversa da matriz de mundo da câmera
(C = T·Ry·Rx, ordem `'YXZ'`); `projectPoint` faz P·V·p e **divide por
w**. Os testes conferem as três contra o Three (`projectionMatrix`,
`matrixWorldInverse`, `Vector3.project`) e que um ponto duas vezes mais
longe fica a metade da distância do centro da tela.

**Demonstração ao vivo — painel de debug:** mirando qualquer objeto
interativo, o painel mostra `à mão: w=… ndc=(…)` e, embaixo,
`Three: ndc=(…)` — os mesmos números. Andar para trás e ver **w
crescer** (w = distância à frente da câmera) e o ndc encolher para o
centro; `+`/`−` muda o FOV e o ndc muda junto (f na matriz).
Código: `main.js:237` (`projectionLines`).

**Nível honesto:** a câmera que renderiza é a do Three; a mesma
matemática está implementada e verificada à mão, e é mostrada ao vivo.

### II.2 Navegação

**Onde (lógica própria):**
- Olhar: `look.js:49` — yaw e pitch acumulados do mouse, Euler na ordem
  `'YXZ'` (gira em Y do mundo, depois inclina em X local; sem rolagem);
  pitch limitado a ±(π/2 − 0,01 rad) ≈ ±89,4°.
- Andar: `movement.js:42` — frente = (−sin yaw, −cos yaw), direita =
  (cos yaw, −sin yaw); velocidade amortecida (aceleração ≠ desaceleração).
- Colisão: AABB do jogador contra AABBs das paredes/portas, **por eixo
  separado** (`movement.js:73-79`): tenta mover em x, depois em z — por
  isso o jogador desliza ao longo da parede em vez de parar.
- Mirar/selecionar: raio do centro da câmera (`interaction.js:43`); o
  Three testa raio–triângulo; depois testamos se há
  parede/porta entre a câmera e o alvo (`interaction.js:49`).
- Portal: atravessar remapeia posição e direção com a mesma `rotateXZ`
  do feixe (`portal-crossing.js`).

**Nível honesto:** avançado (quase toda própria).

### III.1 Iluminação

**Onde:** `scene.js:120-131` — luz hemisférica (céu frio, chão quente),
ambiente fraca e uma direcional fraca: as salas são propositalmente
escuras. **Cada feixe é uma fonte de luz dinâmica**: uma `PointLight` na
cor do feixe, logo antes do ponto onde ele bate (`laser-beam.js:116` e
`171-183`), movida a cada quadro. A porta de saída tem uma luz "vazando"
(`door-view.js`).

**Nosso modelo: Blinn-Phong escrito à mão** (`phong-material.js`),
usado nas paredes da sala, nas paredes internas e no piso — exatamente
as superfícies onde a luz dos feixes cai. É um shader próprio
(`ShaderMaterial`); do Three ele só recebe os valores das luzes da cena
(`lights: true` preenche `pointLights[]`, `hemisphereLights[]`,
`directionalLights[]` e `ambientLightColor`, já em espaço de câmera) e a
neblina. O cálculo é nosso (`phong-material.js:63-103`):
```
cor = albedo · (ka·Ia + Σ kd·max(N·L, 0)·I_luz) / π
    + Σ ks·max(N·H, 0)^n · I_luz          (só onde N·L > 0)
H = normalize(L + V)   (Blinn: vetor do meio, em vez de R·V do Phong)
albedo = cor × textura;  Ia = ambiente + hemisférica(N)
```
- **Hemisférica:** Ia += mix(cor_chão, cor_céu, 0,5·(N·up) + 0,5).
- **Pontual (feixes):** atenuação 1/d² (decay 2) com corte suave em
  `distance`: × (1 − (d/dist)⁴)², `phong-material.js:95`.
- **Direcional:** só N·L, sem atenuação (fonte no infinito).
- **O 1/π:** convenção de unidade de luz do Three (Lambert normalizado:
  ∫cosθ dω = π sobre o hemisfério, então a energia difusa refletida não
  passa da recebida). Com kd = ka = 0,95 o **difuso e o ambiente** ficam
  equivalentes ao material PBR que substituímos (que usava albedo ×
  (1 − metalness 0,05)/π) — conferido por screenshots antes/depois. O
  especular é outro modelo (Blinn-Phong de livro, sem normalização) e
  não tenta imitar o GGX antigo; nas paredes ele é fraco de propósito.

**Por que Blinn-Phong e não Phong puro?** O Phong (ks·(R·V)^n) corta o
brilho de repente quando R·V < 0, o que acontece em ângulos rasantes; o
vetor do meio H não tem esse problema. Custo: H exige um `normalize` por
luz e `reflect` também é barato, então só há ganho real quando luz e
observador estão no infinito (H constante). Para o mesmo tamanho de
brilho, n_Blinn ≈ 4·n_Phong.

Os outros objetos (espelhos, emissores, receptores, portas) continuam
com o material PBR do Three (Cook-Torrance: distribuição GGX, Smith,
Fresnel de Schlick + difuso de Lambert). Também é modelo local, mas
físico em vez de empírico. Usamos PBR no metal do espelho porque ele
precisa do mapa de ambiente (reflexo).

### III.2 Sombreamento (normais; por vértice vs. por fragmento)

**Demonstração ao vivo — tecla `L`:** alterna o nosso Blinn-Phong entre
**por fragmento** (padrão) e **por vértice** (Gouraud). É a mesma
função `blinnPhong()`, chamada no fragment shader ou no vertex shader,
escolhida pelo `#define PER_VERTEX` (`phong-material.js:109-168`); trocar
o define recompila o programa (a primeira troca dá um pequeno engasgo:
ver checklist).
- **Por fragmento (Phong shading):** o vertex shader passa posição e
  normal (espaço de câmera); a GPU **interpola a normal**; o fragment
  shader re-normaliza (interpolar vetores unitários encurta) e calcula
  a luz em cada pixel.
- **Por vértice (Gouraud):** a luz é calculada só nos vértices; a GPU
  **interpola a cor** já iluminada.

**O que mostrar (L10, canto sudoeste):** no início do L10 a luz
vermelha do feixe fica em (−4; 1,2; 4,75), a 0,25 m da parede **sul** e a
1 m da oeste: a mancha forte está na parede sul, atrás do emissor
vermelho. A parede tem **2 triângulos por face**. Prever, depois apertar
`L`: a mancha localizada **some** (ou vira um gradiente fraco e largo
vindo do canto), porque a luz só é avaliada nos 4 cantos da parede, longe
do ponto onde o feixe bate. Apertar de novo: volta. O brilho especular
também some no meio de faces grandes pelo mesmo motivo; Gouraud só
funciona bem com malhas muito subdivididas.

**Normais (`phong-material.js:127`):** `normalMatrix · normal`, onde
normalMatrix = inversa transposta da 3×3 da model-view. Regra geral: se
t é tangente à superfície, n·t = 0; depois da transformação M, a
tangente vira M·t e a normal que continua perpendicular é (M⁻¹)ᵀ·n.
Nas nossas caixas escaladas daria o mesmo resultado que usar M (cada
normal de face está alinhada com um eixo da escala, só o comprimento
muda e o `normalize` corrige); a diferença aparece em normais oblíquas,
como num cilindro ou esfera com escala não uniforme.

Outro shader próprio: o halo do feixe (`laser-beam.js:44-60`) usa
`facing = |N·V|` por fragmento para deixar a borda do cilindro
transparente (brilho macio).

**Flat vs. suave:** `flatShading: true` usa a normal da face (derivadas
da posição na tela); suave usa a normal interpolada dos vértices.

### III.3 Materiais

**Onde:** espelho = metal liso (`mirror.js:52-61`: metalness 1,
roughness 0,07, mapa de ambiente); aço dos pedestais (metalness 0,7,
roughness 0,38); paredes foscas; núcleo do feixe `MeshBasicMaterial`
(sem iluminação: é ele que emite); receptores e lâmpadas emissivos.

**Coeficientes ka, kd, ks e n (`phong-material.js:31-34`, `PHONG`):**
paredes ka 0,95, kd 0,95, ks 0,04, n 12 (concreto fosco: quase nenhum
brilho); piso ka 1, kd 1, ks 0,08, n 32 (um pouco mais polido: brilho
menor e mais concentrado). Cada um vira um uniform do shader e pode ser
mudado ao vivo pelo console (§4).

**Nos materiais PBR (espelho, metal):** `color` (albedo) ≈ kd; roughness
≈ inverso do expoente n (mais áspero = brilho maior e mais espalhado);
metalness decide se o especular tem a cor do material (metal) ou é
branco/fraco (dielétrico, F0 ≈ 0,04); a resposta à luz
ambiente/hemisférica ≈ ka.

**Reflexo real dos espelhos** (`mirror-reflection.js` +
`vendor/three/addons/Reflector.js`): a cena é renderizada de novo com
a câmera **refletida no plano do espelho** (reflexão de Householder
v' = v − 2(v·n)n, `Reflector.js:135`) e um plano de recorte oblíquo
(Lengyel, `Reflector.js:170-213`: o plano do espelho em espaço de câmera
substitui a 3ª linha da matriz de projeção, então o "near" passa a ser o
próprio plano) corta o que está atrás do espelho. É rasterização, não
ray tracing.

### III.4 Texturas

**Onde:** todas as texturas são **desenhadas por código** num canvas 2D
(`textures.js:13`, `canvasTexture`): piso, paredes, vidro, porta,
símbolos dos receptores, numeral da sala. Coordenadas UV:
`tileUvs` (`textures.js:140`) multiplica as UVs pelo tamanho real da
superfície dividido pelo tamanho do ladrilho, com `RepeatWrapping`: a
textura repete em vez de esticar (por isso a parede escalada continua
com ladrilhos do mesmo tamanho). UVs dos condutos montadas à mão
(`conduits.js`).

**Por dentro:** a UV de cada fragmento é interpolada (com correção de
perspectiva, também dividindo por w); o sampler busca o texel com
mipmaps (filtro trilinear) e anisotropia 4.

### IV. Animação independente de FPS

**Onde:** `main.js:256` — `deltaSeconds = min(dt, 0,1)` (o teto evita
um salto enorme depois de trocar de aba). Tudo recebe dt:
- `movement.js`: posição += velocidade · dt (integração de Euler: a
  velocidade é exata por `damp`, a posição é independente de FPS em
  regime constante, com erro pequeno só na rampa de ~0,07 s).
- `motion.js:27`, `damp`: x ← alvo + (x − alvo)·e^(−λ·dt). É
  independente de FPS porque e^(−λ·dt1)·e^(−λ·dt2) = e^(−λ·(dt1+dt2)):
  dois quadros curtos dão exatamente o mesmo resultado que um longo. O
  erro comum, `x = lerp(x, alvo, 0,1)` por quadro, anda mais rápido a
  144 Hz que a 60 Hz.
- Porta: máquina de estados por tempo (`door-motion.js`, durações em
  segundos e easing cúbico), reversível no meio do movimento sem salto.
- Shaders: `uTime` acumulado em segundos (ondulação do feixe, pulso dos
  condutos, superfície dos portais).

---

## 3. Perguntas prováveis (com resposta curta)

1. **"Qual a ordem das transformações e por que importa?"** T·R·S;
   exemplo da parede, mostrar com a tecla `T` no L6 (§I.1).
2. **"O que acontece se a placa não for filha da base?"** Ao deslizar a
   base, a placa ficaria parada no lugar: não herdaria a translação.
3. **"Como o feixe reflete?"** r = d − 2(d·n)n (`laser.js:25`); n é a
   perpendicular do segmento da placa. O ângulo de saída é o dobro do
   giro do espelho (L3).
4. **"Como acha onde o feixe bate?"** Interseção raio–segmento em 2D:
   resolve o + t·d = a + s·(b − a) por produtos vetoriais 2D
   (`laser.js:47`); aceita t > ε e 0 ≤ s ≤ 1; pega o menor t.
5. **"Por que 2D?"** Espelhos e emissores só giram em Y e o feixe tem
   altura fixa (1,2 m): o problema vive no plano XZ. Mais simples e
   100% testável.
6. **"O feixe é ray tracing?"** Não. É traçado de um raio geométrico
   para a lógica do jogo; a imagem é rasterizada (cilindros).
7. **"O que é a divisão por w?"** §II.1; mostrar o painel de debug
   (w e ndc à mão = Three) e andar para trás.
8. **"Por que o pitch é limitado?"** Para não passar da vertical: depois
   de ±90° a imagem ficaria de cabeça para baixo e o yaw do mouse
   inverteria. Limitamos a π/2 − 0,01 rad ≈ 89,4°. (Com Euler YXZ não
   há singularidade no nosso código; gimbal lock é outra coisa — ver 32.)
9. **"Por que Euler 'YXZ'?"** Yaw em Y do mundo primeiro, pitch no X já
   girado: é o comportamento de câmera em primeira pessoa; outra ordem
   faria o pitch inclinar a câmera de lado depois de virar.
10. **"Por vértice vs. por fragmento?"** §III.2: apertar `L` no L10 e
    mostrar a mancha de luz sumindo (prever antes).
11. **"Onde estão ka, kd e ks?"** `phong-material.js:31-34` (`PHONG`),
    viram uniforms; fórmula em §III.1. Mudar o ks ao vivo (§4).
12. **"Por que normalMatrix e não a model-view na normal?"** Regra
    geral (M⁻¹)ᵀ, de n·t = 0 (§III.2). Nas nossas caixas daria o mesmo;
    importa com normais oblíquas e escala não uniforme.
13. **"Por que dividir por π?"** Lambert normalizado: ∫cosθ dω = π,
    então a energia difusa refletida não passa da recebida; é a
    convenção de unidades do Three e mantém o difuso igual ao PBR antigo.
14. **"Por que re-normalizar a normal no fragment shader?"** A
    interpolação linear entre dois vetores unitários gera vetores mais
    curtos que 1 no meio do triângulo; sem normalizar, a luz escurece no
    centro das faces.
15. **"A luz do feixe projeta sombra?"** Não: sombras desligadas (custo
    de shadow map por luz pontual = 6 renders de cubo). Decisão de
    desempenho.
16. **"Como a textura não estica na parede escalada?"** `tileUvs`
    (§III.4).
17. **"O que garante 60 FPS?"** Pools fixos (nenhuma alocação por quadro
    no feixe), uma luz por feixe (ADR 0003), orçamento de pixels, opção
    Qualidade baixa e Reflexos desligados.
18. **"Como o portal funciona?"** Não renderiza através (fora de escopo,
    spec §14): o feixe sai do centro do outro portal com a direção girada
    pela diferença de orientação (`rotateXZ`); o jogador, idem.
19. **"Como a cor combina?"** Aditiva por canal (OR de R, G, B) no
    receptor (`laser.js:151`); filtro = AND com a cor primária.
20. **"Por que a animação é independente de FPS?"** §IV, com a
    identidade da exponencial.
21. **"Qual a diferença entre a luz pontual e a direcional?"** Pontual:
    posição, direção L varia por ponto, atenua com d². Direcional: só
    direção, L constante, sem atenuação.
22. **"Por que a ordem de somar luzes não muda o resultado?"** A
    contribuição de cada luz é somada (soma é comutativa); só a conversão para sRGB e o
    corte em [0, 1] no fim são não lineares (não usamos tone mapping).
23. **"O que o raycaster do Three faz?"** Para cada malha: testa a
    bounding sphere/box, leva o raio ao espaço local (inversa da
    matrixWorld) e testa raio–triângulo, triângulo a triângulo.
24. **"Como é a matriz de visão?"** V = (matriz de mundo da câmera)⁻¹ =
    Rᵀ·T(−olho). Mover a câmera equivale a mover o mundo ao contrário.
25. **"E depois da divisão por w?"** NDC em [−1, 1]³ → transformação de
    viewport para pixels; z vai para o depth buffer. A profundidade é não
    linear em z (mais precisão perto da câmera), por isso near = 0,1 e
    não 0 (z-fighting). Os condutos no chão usam `polygonOffset`
    (`conduits.js:118`) para não brigar com o piso.
26. **"E se a projeção fosse ortográfica?"** A última linha da matriz
    vira (0, 0, 0, 1): w = 1, sem encurtamento — o tamanho na tela não
    depende da distância.
27. **"Por que w = 1 para pontos e w = 0 para direções?"** Com w = 0 a
    coluna de translação é anulada: direções (normais, direção de luz)
    giram mas não se deslocam (`transformDirection` no Three).
28. **"Por que o especular depende de V e o difuso não?"** Lambert
    espalha igual em todas as direções; o especular se concentra em torno
    da reflexão, então depende de onde está o olho. n controla a largura
    do lóbulo.
29. **"Por que iluminar em espaço de câmera?"** O olho fica na origem,
    então V = normalize(−P). Qualquer espaço serve, desde que N, L e V
    estejam no mesmo.
30. **"Por que mipmaps e por que sRGB?"** Mipmaps evitam aliasing quando
    a textura é reduzida (minificação). A conta de luz é linear: a
    textura sRGB é decodificada ao amostrar e o resultado é codificado
    de volta no fim (`colorspace_fragment`).
31. **"O modelo é local: o que falta?"** Sombras e luz indireta (uma
    superfície iluminando outra). O termo ambiente (ka·Ia) é o remendo
    empírico para a indireta.
32. **"Euler ou quatérnio?"** O Three guarda a rotação como quatérnio; o
    Euler YXZ é só a nossa interface de yaw/pitch. Gimbal lock = perda de
    um grau de liberdade quando dois eixos de Euler se alinham.

---

## 4. Alterações ao vivo: onde mexer e o que prever

Ensaiar cada uma: **dizer o efeito antes**, salvar e recarregar
(Ctrl+Shift+R).

| Pedido | Onde | Prever |
|---|---|---|
| Mudar o campo de visão | `camera.js:3` `FOV_DEGREES` | maior = mais cena, objetos menores |
| Andar mais rápido | `movement.js:3` `MOVE_SPEED` | m/s; independe do FPS |
| Feixe mais grosso | `laser-beam.js:6-7` `CORE_RADIUS`, `HALO_RADIUS` | só visual; a lógica usa o raio geométrico |
| Luz do feixe mais forte/alcance | `laser-beam.js:9-10` | mancha maior/mais clara onde o feixe bate |
| Sala mais clara | `scene.js:123-129` intensidades | atenção: `setAtmosphere` (`scene.js:172`) **sobrescreve** hemisférica e ambiente a cada nível — mudar lá |
| Neblina | `setAtmosphere`: `scene.fog.density` (não a linha 162, que é sobrescrita) | FogExp2: fator = 1 − e^(−(densidade·d)²) |
| Espelho fosco | primeiro **desligar Reflexos no menu** (com eles ligados, o reflexo real cobre 94% da placa e o `roughness` só muda a moldura); depois `mirror.js:52-61` `roughness` ↑, Qualidade alta | reflexo do ambiente borrado |
| Passo de giro | dado do nível: `rotationStepDegrees` (ex. `level-9.js`) ou `KEY_ROTATE_STEP` em `manipulation.js:5` | 15° no espelho = 30° no feixe |
| Mais reflexões | `laser.js:8` `MAX_REFLECTIONS` | só muda o limite de quiques por feixe |
| Porta mais lenta | `door-motion.js` `DOOR_TIMING.rise` | segundos; continua reversível |
| Ladrilho da parede | `wall.js:40` (1,5 / 2,5) | maior = ladrilhos maiores |
| Trocar a ordem das transformações | tecla `T` (com `?debug`) ou `__feixe.wallOrder('TSR')`; no código, `wall.js` chama `composeTSR` em vez de `composeTRS` | a 90°: parede fica leste-oeste, como se não girasse; a 45°: cisalhada, planta em losango (§I.1) |
| Desligar o sombreamento suave | material PBR (ex. pedestais, `mirror.js:16`): `flatShading: true` | facetas visíveis em superfícies curvas |
| Sombreamento por vértice | tecla `L` (ou `__feixe.phong.setShadingMode('vertex')`) | mancha de luz do feixe some no meio das paredes |
| Parede mais brilhante (especular) | `phong-material.js:32` `PHONG.wall.ks` / `shininess` (melhor pelo console, abaixo) | ks ↑ = reflexo mais forte; n ↑ = reflexo menor e mais concentrado. **Não usar n = 0** (`pow(0, 0)` é indefinido em GLSL) |
| Sem luz ambiente | `uKa = 0` nas paredes (console) | longe dos feixes as paredes leste e sul ficam pretas; oeste e norte ainda recebem um pouco da direcional (N·L ≈ 0,56 e 0,37); o piso tem `ka` próprio e não muda |

Pelo console (com `?debug`), sem recarregar:
- FOV: `__feixe.cameraFx.setBaseFov(100)` (ou as teclas `+`/`−`). Mudar
  `camera.fov` direto **não funciona**: `camera-fx.js` regrava o FOV a
  cada quadro.
- Coeficientes do Blinn-Phong (materiais `'paredes'` e `'piso'`):
  `const w = __feixe.phong.materials().find((m) => m.name === 'paredes');
  w.uniforms.uKs.value = 0.6; w.uniforms.uShininess.value = 64;` —
  efeito imediato, já que são uniforms (sem recompilar).

---

## 5. Onde a nota de artefato subiu

O que já é "avançado" (lógica própria): traçado do feixe (reflexão,
interseção, rotação, portais), navegação e colisão, condutos (malha por
código + shader), halo do feixe (shader próprio), texturas procedurais,
animação por dt com `damp`. O que é "básico" (pronto do Three):

- **A. Iluminação + sombreamento + materiais — FEITO (16/11):**
  Blinn-Phong próprio (`phong-material.js`) com ka/kd/ks/n como uniforms
  nas paredes e no piso, e a tecla `L` alternando por vértice ↔ por
  fragmento ao vivo (§III.1–III.3).
- **B. Câmera/projeção — FEITO (16/11):** perspectiva, matriz de visão
  e divisão por w à mão (`core/matrix.js`), conferidas contra o Three e
  mostradas ao vivo no painel de debug (§II.1).
- **C. Transformações — FEITO (16/11):** T·R·S composta à mão nas paredes
  internas, com a ordem errada T·S·R na tecla `T` (§I.1).

---

## 6. Checklist do dia

- [ ] `npm start` na máquina da apresentação (precisa de Node e Python);
      testar offline.
- [ ] Abrir com `?debug`; Qualidade/Reflexos conforme a máquina.
- [ ] Editor aberto em: `laser.js`, `mirror.js`, `wall.js`,
      `camera.js`, `look.js`, `movement.js`, `scene.js`,
      `laser-beam.js`, `phong-material.js`, `matrix.js`, `textures.js`, `motion.js`,
      `main.js`.
- [ ] Testar a tecla `L` no L10 (canto sudoeste, parede sul) na máquina
      da apresentação.
- [ ] **Aquecer os shaders** depois do último reload: em cada nível que
      será mostrado, apertar `L` duas vezes. A primeira troca compila os
      programas (pequeno engasgo) e cada nível com outro número de luzes
      pontuais compila de novo; o cache dura até recarregar a página.
- [ ] Preferir o console (uniforms) a editar e recarregar nas alterações
      ao vivo: efeito imediato e sem perder o estado do nível.
- [ ] Ensaiar 3 alterações ao vivo da §4 com cronômetro.
- [ ] Ensaiar as duas demonstrações de matriz: tecla `T` no L6 (ordem
      errada) e o painel de debug com w/ndc à mão = Three (andar para trás).
- [ ] Ter o jogo já no L3 e saber pular de nível (`?debug&level=N` na URL; só funciona com `debug`).
