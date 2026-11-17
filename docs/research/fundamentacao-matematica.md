# Fundamentação matemática do Feixe

Guia de estudo e apoio à defesa. O foco é explicar os modelos que o projeto
implementa, as convenções necessárias para ler as fórmulas e os pontos em que
uma escolha de jogo é uma aproximação visual, não uma simulação física completa.

## Mapa do projeto

O Feixe separa a **lógica do jogo** (raios 2D no plano XZ, colisão e regras de
receptores) da **apresentação 3D** (cena Three.js, malhas, câmera, materiais e
shaders). O fluxo é: dados de nível → transforms e grafo de cena → cálculo da
câmera → projeção e rasterização; em paralelo, o sistema de laser calcula
interseções e interações e atualiza feixes, luzes e objetivos.

Convenção usada nas matrizes manuais: pontos são vetores-coluna, a coordenada
homogênea de ponto é `w=1`, de direção é `w=0`, e a composição age da direita
para a esquerda. A ordenação column-major descreve como os valores ficam
armazenados na memória; por si só, ela não determina a convenção de vetores.

## 1. Transformações, hierarquia e malhas

Uma transformação afim em 3D cabe em matriz homogênea 4×4. Para posição
`p=(x,y,z,1)ᵀ`, `p' = M p`. Com escala local `S`, rotação `R` e translação
`T`, a composição `M=T·R·S` escala primeiro, gira em seguida e translada por
último. Em geral `R·S ≠ S·R`: a ordem muda os eixos nos quais a escala atua.
Para direções `(dx,dy,dz,0)ᵀ`, a translação não tem efeito.

No grafo de cena, a matriz mundial de um filho é `M_world = M_parent ·
M_local`. Assim o espelho pode deslizar como conjunto pela base enquanto a
placa gira relativamente a ela. O Feixe compõe transforms manualmente em
`src/core/matrix.js` e os aplica a paredes em `src/gameplay/wall.js`; outras
partes usam `Object3D` do Three.js.

Uma malha triangular separa posições de vértices (geometria) da lista de
índices que conecta os vértices em triângulos (topologia). Os condutos em
`src/presentation/conduits.js` constroem pernas com quatro posições e dois
triângulos indexados. Na rasterização, esses triângulos são a unidade básica
de superfície.

**Para a defesa:** desenhe o ponto local do espelho, aplique placa, base e
matriz do mundo; depois explique por que inverter a ordem de `R` e `S` muda a
forma e orientação. Lembre que `matrixWorld` do Three incorpora toda a cadeia
de pais.

## 2. Câmera, projeção e espaço de tela

A câmera transforma pontos do mundo para o espaço da câmera pela matriz de
visão `V=C⁻¹`, inversa da pose da câmera. A projeção perspectiva usa
`f=1/tan(FOV/2)` e razão de aspecto `a`; a coordenada clip `w` é proporcional
à profundidade negativa no espaço de visão. A divisão perspectiva produz
`NDC=(x_clip/w, y_clip/w, z_clip/w)`. Por isso, mantendo o tamanho do objeto,
duplicar sua distância aproximadamente divide por dois sua dimensão na tela.

O shader entrega `gl_Position` em coordenadas homogêneas; o pipeline gráfico
faz o clipping e a divisão por `w` antes do mapeamento à viewport. O código
manual do Feixe para `viewMatrix` e `projectPoint` está em
`src/core/matrix.js`; compare os espaços (mundo, visão, clip, NDC) antes de
comparar números.

## 3. Feixe: interseção, reflexão, cor e portais

O traçado é geométrico e bidimensional no plano XZ, não ray tracing de imagem.
Um raio é `p+t d`, com `t≥0`; um segmento é `a+u(b−a)`, com `0≤u≤1`.
Igualar as duas expressões dá um sistema 2×2. Descartando paralelos e
interseções fora dos intervalos, o sistema escolhe o menor `t` positivo: o
primeiro obstáculo atingido. O epsilon evita reatingir a própria superfície
depois de refletir.

Para direção incidente unitária `d` e normal unitária `n`, a reflexão é
`r=d−2(d·n)n`. A fórmula subtrai duas vezes a componente normal e preserva a
componente tangencial, o que equivale a ângulos de incidência e reflexão
iguais. Em 2D, girar a normal do espelho por `θ` gira a direção refletida por
`2θ` (com sinal conforme a orientação): é a demonstração do nível 3.

As cores são canais RGB discretos na lógica dos puzzles. Um filtro aplica
interseção canal a canal (AND); contribuições que chegam a um receptor são
combinadas canal a canal (OR/soma lógica conforme a implementação). Isso é
regra do jogo, não modelo espectral de luz nem mistura contínua de pigmentos.

Portais remapeiam o ponto de saída e giram a direção por uma diferença de
orientação `Δθ`; o jogador também atualiza yaw. O Feixe não renderiza uma
câmera através do portal: trata-se de transporte lógico do raio e do jogador.

## 4. Colisão e movimento

Uma AABB é uma caixa alinhada aos eixos; para testar uma caixa girada contra
ela, os limites do envoltório podem ser calculados por
`ex=|hw cosθ|+|hd sinθ|` e `ez=|hw sinθ|+|hd cosθ|`. O jogador testa
deslocamentos em X e Z separadamente: se um eixo colide, bloqueia esse eixo e
mantém o outro, o que produz deslizamento ao longo da parede. Esta é uma
resolução discreta simples, adequada às velocidades e escala do jogo; não é
um solver geral de corpos rígidos nem uma garantia contra tunneling em
velocidades arbitrárias.

## 5. Iluminação e shaders

O shader próprio usa um modelo empírico Blinn–Phong. Para normal unitária `N`,
direção para luz `L`, direção ao observador `V`, e meia-direção
`H=normalize(L+V)`, os termos são Lambert difuso
`kd·max(N·L,0)` e especular `ks·max(N·H,0)^n`. O ambiente é aproximado por
`ka·Ia`; o shader aplica albedo/textura ao termo difuso. O expoente `n`
controla o tamanho do brilho: quanto maior, mais concentrado. Não confundir
**modelo de iluminação de Phong** com **Phong shading**.

No modo por fragmento, posição e normal interpoladas chegam ao fragment shader
e a iluminação é calculada por pixel. No modo por vértice (Gouraud), a
iluminação é calculada nos vértices e a cor é interpolada; um brilho pequeno
entre vértices pode desaparecer. A tecla `L` permite observar a diferença.
Normais transformadas sob escalas não uniformes usam a inversa transposta da
matriz linear, pois uma normal deve continuar perpendicular às tangentes.

Uma luz pontual perde irradiância aproximadamente como `1/d²` em espaço livre.
O shader também multiplica por uma janela suave finita
`(max(1−(d/dist)^4,0))²`; esse corte é uma escolha prática do projeto, não lei
óptica. O fator `1/π` normaliza o termo Lambert difuso sob a convenção de
unidades adotada.

O espelho visual usa `Reflector` do Three.js: renderiza a cena de novo com a
câmera refletida pelo plano e recorta a geometria do lado indesejado. É uma
reflexão planar por rasterização, com custo de render adicional; o feixe
lógico, por sua vez, usa a equação vetorial de reflexão.

## O que o projeto simula e o que aproxima

- **Geometria exata dentro do modelo:** transforms afins, interseções
  raio-segmento e reflexão especular ideal 2D.
- **Regras discretas de jogo:** canais RGB binários, receptores, portas e
  remapeamento de portal.
- **Aproximações de renderização:** Blinn–Phong empírico, atenuação/corte da
  luz pontual e reflexão planar por segunda renderização.
- **Fora do escopo:** propagação ondulatória, espectro contínuo, refração,
  iluminação global e imagem de câmera atravessando portais.

## Referências anotadas

1. Jernej Barbic, **Transformations**, USC CSCI 420, Lecture 5 (2020),
   [notas em PDF](https://viterbi-web.usc.edu/~jbarbic/cs420-s20/05-transformations/05-transformations-6up.pdf).
   Matrizes homogêneas, composição e ordem de aplicação.
2. Three.js, **Matrix4**, [documentação](https://threejs.org/docs/pages/Matrix4.html)
   e [Object3D na revisão r186](https://github.com/mrdoob/three.js/blob/r186/src/core/Object3D.js).
   API e composição de matrizes/transformações do motor.
3. Three.js, **BufferGeometry** e **Object3D**,
   [BufferGeometry](https://threejs.org/docs/pages/BufferGeometry.html),
   [Object3D](https://threejs.org/docs/pages/Object3D.html),
   [transformações de matriz](https://threejs.org/manual/pages/matrix-transformations.html).
   Atributos de posição, índices e matrizes locais/mundiais.
4. Khronos Group, **OpenGL 4.3 Core Profile Specification** (2013), §13.6,
   [especificação](https://registry.khronos.org/OpenGL/specs/gl/glspec43.core.pdf).
   Clipping, divisão perspectiva e viewport.
5. Three.js, **Fundamentals**, [manual](https://threejs.org/manual/pages/fundamentals.html).
   FOV vertical, aspecto, planos near/far e convenção de câmera.
6. Christer Ericson, **Real-Time Collision Detection**, Morgan Kaufmann (2005),
   [página do livro](https://realtimecollisiondetection.net/). Referência para
   volumes delimitadores, testes de interseção e expansão de Minkowski.
7. Williams, Barrus, Morley & Shirley, “An Efficient and Robust Ray-Box
   Intersection Algorithm,” *Journal of Graphics Tools* 10(1), 2005,
   [DOI](https://doi.org/10.1080/2151237X.2005.10129188). Algoritmo de
   interseção raio-caixa; relevante como referência geral de colisão, embora o
   Feixe use segmento-raio em 2D para lasers.
8. OpenStax, **The Law of Reflection**, [Physics, §16.1](https://openstax.org/books/physics/pages/16-1-reflection).
   Igualdade dos ângulos, medidos relativamente à normal; fundamenta a fórmula
   vetorial usada pelo laser.
9. CMU 15-468, **Ray Tracing and Shading**, [aula 3 em PDF](https://imaging.cs.cmu.edu/15-468/2022_spring/lectures/lecture3.pdf).
   Apresenta a equação vetorial da reflexão e o produto escalar com a normal.
10. Khronos Group, **OpenGL 4.6 Core Profile Specification** (2022),
    [especificação](https://registry.khronos.org/OpenGL/specs/gl/glspec46.core.pdf),
    e **GLSL 4.60**, [especificação](https://registry.khronos.org/OpenGL/specs/gl/GLSLangSpec.4.60.pdf).
    Coordenadas homogêneas e interpolação entre etapas do shader.
11. LearnOpenGL, **Advanced Lighting** e **Light Casters**,
    [Blinn–Phong](https://learnopengl.com/Advanced-Lighting/Advanced-Lighting),
    [atenuação](https://learnopengl.com/Lighting/Light-casters). Referência
    didática para difuso, half-vector, especular e atenuação; confronte os
    parâmetros exatos com `src/presentation/phong-material.js`.
12. Three.js, **Reflector**, [documentação](https://threejs.org/docs/pages/Reflector.html)
    e [implementação r186](https://github.com/mrdoob/three.js/blob/r186/examples/jsm/objects/Reflector.js).
    Câmera refletida, render target e reflexão planar usada visualmente.
13. Datta & Lowe, “A New Technique for Rendering Complex Portals,” *IEEE TVCG*
    11(1), 2005, pp. 81–90, [DOI](https://doi.org/10.1109/TVCG.2005.1). Contexto
    acadêmico de renderização de portais; o Feixe implementa apenas remapeamento
    de gameplay.

## Como estudar para a defesa

1. Desenhe os espaços e transforms: local → mundo → visão → clip → NDC.
2. Derive a reflexão separando `d` em componentes tangencial e normal.
3. Explique uma colisão XZ e o motivo do teste por eixo permitir deslizar.
4. Compare Blinn–Phong por vértice e por fragmento usando uma parede grande.
5. Para cada fórmula, indique as hipóteses: vetores unitários, plano XZ,
   convenção de câmera, interpolação ou caráter discreto da regra de cor.

## Alinhamento com fontes locais

Para detalhes específicos do comportamento, leia `docs/defesa-40.md`,
`docs/level-authoring.md`, `docs/decisions/0010-own-shader-and-matrices-for-the-course-brief.md`
e `docs/engine-reference/threejs/VERSION.md`. Este guia complementa esses
documentos com fundamentação e referências externas.
