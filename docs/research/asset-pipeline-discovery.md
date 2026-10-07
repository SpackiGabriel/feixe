# **Pipeline Automática e Design System para Visual 3D no Feixe**

O desenvolvimento visual de jogos de quebra-cabeça técnicos exige um equilíbrio rigoroso entre estética, legibilidade das mecânicas de jogo e facilidade de manutenção. No projeto *Feixe* — um jogo de quebra-cabeça em primeira pessoa desenvolvido em Three.js para a disciplina de Computação Gráfica na UTFPR —, os ativos visuais precisam comunicar regras funcionais sem introduzir ruído gráfico ou comprometer a precisão geométrica da simulação óptica1. O jogo opera com dez salas contidas1, onde o jogador manipula feixes de luz coloridos através de espelhos, filtros, receptores e portais para abrir portas1.  
Este relatório estabelece uma arquitetura prática, sustentável e automatizada para a criação, validação e integração de ativos 3D estilizados (*hard-surface*). A pipeline aproveita a automação por agentes de código (Claude e ChatGPT) integrados ao Blender via linha de comando (scripts Python *headless*) e utilitários de ecossistema aberto (@gltf-transform/cli), garantindo custo financeiro zero e baixa sobrecarga de manutenção1.

## **1\. Estratégia de Assets e Desacoplamento Visual-Gameplay**

Em jogos de quebra-cabeça fundamentados em lógica vetorial ou óptica simulada, a geometria responsável pelos cálculos do motor de jogo não deve ser acoplada à geometria de renderização visual1. No *Feixe*, as reflexões de feixes por cálculo 2D no plano XZ, a detecção de colisões por caixas AABB e a seleção de interatividade (*picking*) ocorrem em dimensões e alturas estritas — especificamente com o feixe centralizado na altura Y de 1,2 metros1.  
A estratégia adotada fundamenta-se no desacoplamento completo: os scripts do Three.js mantêm representações simplificadas para cálculo matemático e colisão1, enquanto arquivos externos em formato GLB agregam o acabamento estético, suportes mecânicos, carcaças e superfícies emissivas1.

| Família de Asset | Abordagem Recomendada | Formato Runtime | Justificativa Técnica |
| :---- | :---- | :---- | :---- |
| **Ambiente (Piso, Paredes, Teto)** | Kit Modular \+ Materiais Repetíveis (*Tileable*) | GLB \+ Texturas WebP | Minimiza chamadas de renderização (*draw calls*) e permite cobrir as dez salas reaproveitando um conjunto enxuto de painéis e calhas1. |
| **Espelho (Mirror)** | Modelo 3D Externo \+ Animação por Código | GLB | Suporte e trilhos são carregados via GLB; a placa espelhada fica alinhada no eixo X local a Y=1,2 m1. Deslocamentos e rotações ocorrem programaticamente no Three.js1. |
| **Emissor (Emitter)** | Modelo 3D Externo | GLB | Estrutura industrial *hard-surface*. Possui canal emissivo isolado para aplicação da cor do laser em tempo de execução via material do Three.js1. |
| **Receptor (Receiver)** | Modelo 3D Externo | GLB | Placa frontal fixa (0,8 m) com entalhes geométricos para acessibilidade de cores1. Canal emissivo dinâmico para indicação de ativação1. |
| **Porta (Door)** | Modelo 3D Externo \+ Animação por Código | GLB | Moldura e painéis deslizantes (2×3 m)1. O movimento de abertura é controlado por código, mantendo sincronia perfeita com o colisor AABB1. |
| **Filtro Subtrativo (Filter)** | Modelo 3D Externo | GLB | Estrutura mecânica de trilho com placa central utilizando transparência no Three.js1. |
| **Bloqueador (Blocker)** | Geometria Procedural no Three.js \+ Material PBR | Próprio do Three.js | Como os bloqueadores possuem dimensões arbitrárias por nível (ex.: divisória de 10 m no Nível 8\)1, instanciar caixas procedurais evita a distorção de escala de malhas externas. |
| **Portal (Portal Pair)** | Modelo 3D Externo \+ Shader VFX | GLB \+ Shader | Moldura de portal estilizada com superfície plana aplicando um shader procedural de turbulência e emissão1. |
| **Interruptor (Switch)** | Modelo 3D Externo \+ Animação por Código | GLB | Pedestal estático com botão filho móvel acionado via transição vetorial no eixo Y. |
| **Feixe de Laser (Beam)** | Geometria Procedural no Three.js \+ PointLight | Próprio do Three.js | Atualização quadro a quadro da malha do feixe (fita/cilindro) combinada com iluminação pontual móvel1. |
| **UI / VFX / Símbolos** | Sprites Canvas 2D / Shaders Unlit | Texturas / Shaders | Ícones de acessibilidade e retícula central (2 px) manipulados via interface ou texturas aplicadas diretamente1. |

## **2\. Design System Consumível por Agentes**

Para que modelos gerados automaticamente em sessões distintas mantenham coerência visual, é indispensável estabelecer um *Design System* formalizado e legível por software.

### **Especificação Artística e Regras Estéticas**

A direção de arte estabelecida é o **Sci-Fi Industrial Brutalista Limpo**. O ambiente deve evocar uma instalação de testes tecnológicos funcional e ligeiramente desgastada, sem poluição visual.

* **Linguagem de Formas (*Shape Language*):** Uso proeminente de chanfros (*bevels*) de 45 graus, superfícies facetadas e recortes hexagonais ou octogonais. Cantos vivos de 90 graus são proibidos para garantir destaques especulares nas bordas sob a iluminação do cenário.  
* **Paleta de Cores do Cenário:** Tons neutros e escuros baseados em cinza-escuro (\#2A2B2E), grafite (\#1E1F22) e aço escovado (\#4A4D52). Cores vibrantes são proibidas na estrutura dos cenários para evitar ruído com os lasers1.  
* **Cores Reservadas ao Gameplay:** Vermelho (\#FF0000), Verde (\#00FF00), Azul (\#0000FF), Amarelo (\#FFFF00), Magenta (\#FF00FF), Ciano (\#00FFFF) e Branco (\#FFFFFF) são estritamente reservadas para os lasers, receptores, emissores e sinalizadores funcionais1.  
* **Materiais e Propriedades PBR:**  
  * *Metal Neutro:* Rugosidade (*roughness*) 0,35, Metalicidade (*metalness*) 0,80.  
  * *Painel Estrutural/Piso:* Rugosidade 0,70, Metalicidade 0,10.  
  * *Placa Emissiva:* Rugosidade 0,10, Metalicidade 0,00, com suporte a intensidade emissiva ajustável em tempo de execução1.  
* **Estados Visuais (Ativo, Inativo, Hover):**  
  * *Inativo:* Intensidade emissiva em 0,10 (brilho residual baixo).  
  * *Hover (Cursor sobre o Objeto):* Aumento da intensidade emissiva para 0,50 ou adição de uma borda destacada neutra1.  
  * *Ativo:* Intensidade emissiva entre 1,50 e 2,00 na cor do feixe correspondente1.  
* **Proporções e Escala:** Unidades em metros (1 unidade \= 1 metro), eixo Y voltado para cima (*Y-up*)1. A altura padrão do feixe de laser é fixada em 1,2 m a partir do piso1. A origem (*pivot*) de todos os elementos de piso e parede deve ficar localizada na base central do modelo (Y \= 0).  
* **Acessibilidade para Daltonismo:** A cor do feixe não pode ser o único indicador de gameplay1. Transmissores e receptores devem incorporar entalhes geométricos extrudados na malha1:  
  * *Vermelho / Primário 1:* Círculo entalhado.  
  * *Verde / Primário 2:* Triângulo entalhado.  
  * *Azul / Primário 3:* Losango/Diamante entalhado.  
  * *Cores Compostas (Amarelo, Magenta, Ciano, Branco):* Junção dos contornos geométricos correspondentes.

### **Representação do Design System para Agentes**

A representação do sistema para os agentes operacionais consiste em uma estrutura tripla:

> 1. Um documento descritivo em Markdown (design-system.md) contendo as diretrizes textuais.  
> 2. Um arquivo JSON estruturado (design-tokens.json) com os limites numéricos de dimensões, nomes padronizados de materiais e códigos de estado.  
> 3. Um arquivo de biblioteca do Blender (materials.blend) contendo os materiais PBR pré-configurados.

Abaixo apresenta-se a estrutura do arquivo design-tokens.json:

JSON  
{  
  "system": "Feixe Visual System v1.0",  
  "units": "meters",  
  "up\_axis": "Y",  
  "beam\_height": 1.2,  
  "materials": {  
    "mat\_frame\_metal": { "roughness": 0.35, "metalness": 0.80, "color": "\#4A4D52" },  
    "mat\_casing\_dark": { "roughness": 0.70, "metalness": 0.10, "color": "\#1E1F22" },  
    "mat\_emissive\_dynamic": { "roughness": 0.10, "metalness": 0.00, "is\_dynamic": true }  
  },  
  "bevel\_radius": 0.03,  
  "max\_polycount": 5000  
}

## **3\. Metodologia de Produção de Assets: IA vs. Automação Determinística**

A escolha da técnica de criação determina a reprodutibilidade da pipeline. Avaliou-se o uso de IA generativa 3D (conversão de texto/imagem para modelos 3D) em comparação com a modelagem procedural por scripts Python executados no Blender em modo *headless*3.  
A geração 3D por IA frequentemente entrega malhas com topologia desordenada, contagem excessiva de triângulos, coordenadas de textura (UVs) distorcidas, dimensões fora de escala e origens posicionadas de forma arbitrária. A correção desses defeitos exige intervenção manual contínua, anulando a economia de tempo esperada.  
Por outro lado, a modelagem procedural via scripts Python no Blender oferece controle dimensional exato, garantia de eixos de rotação corretos, alinhamento milimétrico das superfícies funcionais e atribuição precisa de materiais PBR3.

| Critério | Geração 3D por IA Generativa | Script Determinístico em Python (Blender) | Recomendação para o Feixe |
| :---- | :---- | :---- | :---- |
| **Precisão Dimensional** | Baixa (escalas arbitrárias, exige reajustes). | Absoluta (parâmetros definidos em metros)1. | **Script Python** |
| **Posicionamento do Pivô** | Impreciso (geralmente no centro da Bounding Box). | Exato (configurado programaticamente na origem)1. | **Script Python** |
| **Topologia e Polycount** | Densa, desordenada, difícil de otimizar. | Limpa, quad-dominant, chanfros otimizados. | **Script Python** |
| **Atribuição de Materiais** | Texturas estáticas consolidadas (*baked*). | Separação em slots de materiais funcionais1. | **Script Python** |
| **Consistência Estética** | Variável entre sessões de geração. | Garantida por restrições de código e tokens. | **Script Python** |
| **Geração de Conceitos/Arte** | Excelente para referências e decalques. | Não aplicável. | **IA Generativa (Imagem)** |

O papel da IA generativa deve ser estritamente restrito à criação de **imagens de referência visual** (conceitos gerados por DALL-E ou Midjourney) e à produção de **máscaras de textura ou decalques**. A modelagem geométrica *hard-surface* deve ser executada por **scripts Python no Blender**3.

## **4\. Pipeline Concreta e Toolchain Recomendada**

A pipeline foi estruturada de forma sequencial para automatizar o trabalho repetitivo. Agentes de código gerenciam a criação e validação, reservando o julgamento humano apenas para a aprovação estética final.

### **Fluxo Etapa por Etapa**

> 1. **Especificação:** O agente ou desenvolvedor define as características do ativo em um arquivo JSON local, declarando dimensões, materiais e requisitos de acessibilidade1.  
> 2. **Referência Visual:** O agente gera ou seleciona imagens de referência que respeitem o design-system.md.  
> 3. **Criação / Modelagem:** Um script Python é gerado pelo agente e executado no Blender em modo *headless* (blender \-b \--python script.py)3. O script constrói a geometria usando primitivas parametrizadas, aplica chanfros e ajusta os nós de ancoragem3.  
> 4. **Atribuição de Materiais:** O script vincula as superfícies da malha aos slots de materiais definidos em materials.blend.  
> 5. **Exportação GLB:** O Blender exporta a cena diretamente para o formato GLB, aplicando a conversão de eixos para o padrão Y-up3.  
> 6. **Validação Automática:** Ferramentas via linha de comando (gltf-transform) verificam a integridade estrutural do arquivo e as métricas de desempenho2.  
> 7. **Preview e Renderização:** O Blender renderiza automaticamente três imagens do ativo (ângulos fixos com iluminação de estúdio) em diferentes estados (Inativo, Hover, Ativo). O agente com capacidade de visão faz uma primeira avaliação contra o design system1.  
> 8. **Revisão Humana:** O desenvolvedor inspeciona as imagens de preview e aprova ou solicita ajustes.  
> 9. **Integração e Testes:** O arquivo GLB aprovado é movido para o diretório de ativos do jogo e testado na suíte de testes (Vitest) e no navegador1.

| Etapa | Ferramenta Recomendada | Papel do Agente de IA | Automação | Julgamento Humano |
| :---- | :---- | :---- | :---- | :---- |
| **1\. Especificação** | Arquivo JSON / Prompt | Cria/ajusta o arquivo de especificação JSON. | Total | Opcional. |
| **2\. Referência** | ChatGPT / Claude | Gera prompts para imagens de conceito visual. | Total | Não necessário. |
| **3\. Criação** | Blender Python Headless3 | Escreve e executa os scripts de modelagem .py. | Total | Não necessário. |
| **4\. Materiais** | Blender / Python3 | Mapeia os materiais PBR nos slots da malha. | Total | Não necessário. |
| **5\. Exportação** | Blender GLTF Exporter3 | Executa a exportação parametrizada em GLB3. | Total | Não necessário. |
| **6\. Validação** | @gltf-transform/cli \[cite: 2, 6, 7\] | Roda comandos CLI e analisa o relatório de erros2. | Total | Não necessário. |
| **7\. Preview** | Blender Render / Claude Vision | Inspeciona as imagens geradas contra os tokens. | Parcial | **Necessário:** Validação estética final. |
| **8\. Integração** | Three.js / Módulos ES1 | Mapeia o ativo no repositório do jogo1. | Total | Não necessário. |
| **9\. Teste In-Game** | Vitest / Dev Server1 | Executa testes de cena sem falhas de runtime1. | Total | Não necessário. |

### **Toolchain e Impacto Financeiro**

* **Blender (v4.x+):** Gratuito e open-source. Funciona como central de automação para modelagem, materiais, exportação GLB e renderização de previews via Python CLI3.  
* **Node.js \+ @gltf-transform/cli:** Gratuito e open-source. Executa a validação do contrato glTF e otimizações de malha2.  
* **Claude / ChatGPT (Planos Existentes):** Ferramentas já contratadas pela equipe1, atuando na geração de código Python, administração de arquivos e análise visual de previews.  
* **Custo Adicional Incremental:** **R\$ 0,00**. Não há contratação de novos serviços SaaS.

## **5\. Formato, Source of Truth e Gestão no Git**

Para evitar a perda de ajustes manuais durante a regeneração automática de um modelo, estabelece-se uma separação estrita entre os arquivos fonte programáticos e os produtos de compilação runtime.

### **Estrutura de Diretórios do Projeto**

* assets\_src/ *(Fonte da Verdade \- Commitado no Git)*  
  * specs/: Especificações dos ativos estruturadas em JSON.  
  * scripts/: Scripts em Python para geração geométrica no Blender.  
  * templates/: Bibliotecas base e materiais padrão (materials.blend).  
  * previews/: Imagens PNG geradas para rápida inspeção humana.  
* public/assets/models/ *(Ativos em Runtime \- Commitado no Git)*  
  * Arquivos .glb validados e prontos para serem carregados pelo Three.js1.

### **Regras de Regeneração e Controle de Versão**

* **Proibição de Edição Direta do GLB:** O arquivo GLB localizado em public/assets/models/ é tratado como um artefato compilado descartável.  
* **Ajustes Estéticos:** Devem ser feitos editando o script Python em assets\_src/scripts/ ou a especificação JSON correspondente3.  
* **Exceções para Edição Manual:** Caso um modelo exija modelagem manual no Blender que não valha a pena codificar em Python, o arquivo fonte .blend resultante deve ser mantido em assets\_src/manual\_models/. O script de exportação lerá esse arquivo .blend e aplicará apenas o processo de validação e otimização para gerar o .glb final.  
* **Estratégia do Git:** O repositório versiona os scripts, especificações, bibliotecas e os arquivos GLB finais validados. Arquivos de log e imagens temporárias de renderização são adicionados ao .gitignore.

## **6\. Validação Automática de Assets**

Antes que qualquer ativo seja aceito no repositório ou carregado pelo Three.js, ele passa por um script de validação automática baseado em Python e @gltf-transform/cli2.

| Verificação | Severidade | Regra de Validação / Tolerância |
| :---- | :---- | :---- |
| **Integridade do GLTF/GLB** | **ERRO (Bloqueante)** | O arquivo deve ser um GLB 2.0 válido conforme a especificação oficial da Khronos (gltf-transform validate)6. |
| **Origem do Pivô** | **ERRO (Bloqueante)** | A origem da malha no nó raiz deve estar exatamente em (0.0, 0.0, 0.0). |
| **Transformações Aplicadas** | **ERRO (Bloqueante)** | A escala do nó raiz deve ser (1.0, 1.0, 1.0). Rotações e translações devem estar consolidadas na geometria. |
| **Dimensões e Bounding Box** | **ERRO (Bloqueante)** | As dimensões X, Y e Z da caixa delimitadora devem bater com o JSON de especificação (tolerância de ±0,005 m). |
| **Nomes de Materiais** | **ERRO (Bloqueante)** | Materiais devem utilizar apenas os nomes definidos no design system (ex.: mat\_frame\_metal, mat\_emissive\_dynamic). |
| **Orientação dos Eixos** | **ERRO (Bloqueante)** | A face ativa deve estar alinhada com o eixo X local, com a frente voltada para o eixo −Z local1. |
| **Contagem de Polígonos** | **AVISO (Alerta)** | O número total de triângulos não deve exceder 5.000 polígonos. |
| **Resolução de Texturas** | **AVISO (Alerta)** | Texturas não podem ultrapassar a resolução de 1024×1024 pixels e devem utilizar o formato WebP2. |
| **Nós de Ancoragem** | **AVISO (Alerta)** | Presença dos nós utilitários vazios (PickTarget, LaserSegment) quando aplicável. |

O validador gera um log legível por agentes no formato JSON:

JSON  
{  
  "asset": "receiver.glb",  
  "status": "PASSED",  
  "errors": \[\],  
  "warnings": \[  
    "Polycount (3,200 tris) is close to the recommended threshold of 5,000."  
  \],  
  "metrics": {  
    "dimensions": \[0.8, 0.8, 0.08\],  
    "materials": \["mat\_frame\_metal", "mat\_emissive\_dynamic"\],  
    "polycount": 3200  
  }  
}

## **7\. Renderização de Previews e Revisão Visual Automatizada**

Para inspecionar a qualidade visual sem carregar a aplicação no navegador, o Blender é utilizado para gerar imagens estáticas de demonstração3.

### **Estúdio Virtual de Preview no Blender**

O script de renderização insere o modelo exportado em uma cena neutra pré-configurada:

* **Câmera:** Vista isométrica fixa (45° azimuth, 30° elevação) com enquadramento automático na Bounding Box do objeto.  
* **Iluminação:** Setup de estúdio com três pontos de luz neutros.  
* **Escala de Referência:** Uma silhueta de 1,6 m de altura (representando a altura dos olhos do jogador)1 e uma grade de piso de 1×1 m são desenhadas ao fundo.  
* **Renders de Estado:** O script gera automaticamente três imagens PNG (800×600 px):  
  1. preview\_inactive.png: Estado em repouso.  
  2. preview\_hover.png: Estado com destaque de aproximação do cursor.  
  3. preview\_active.png: Estado ativado com canal emissivo iluminado1.

### **Pré-Análise Multimodal por Agente de Visão**

Antes de solicitar a validação humana, as imagens são enviadas ao agente multimodal (Claude ou GPT com visão). O agente analisa as imagens com base no seguinte protocolo:

> 1. Verificação da visibilidade dos chanfros nas bordas externas.  
> 2. Análise do contraste entre a carcaça foscas e a área emissiva.  
> 3. Checagem de artefatos de renderização ou sobreposição de malhas (*Z-fighting*).  
> 4. Verificação do entalhe geométrico do símbolo de acessibilidade1.

Se o agente identificar problemas, ele altera os parâmetros no script Python e reexecuta a geração3. Caso seja aprovado, o resultado é enviado para aprovação do desenvolvedor.

## **8\. Arquitetura de Integração no Three.js**

A inclusão de modelos 3D em formato GLB no *Feixe* mantém a arquitetura modular existente1.

### **Carregamento e Caching Sem Bundler**

Como o projeto utiliza módulos ES sem empacotadores (*bundlers*)1, o carregamento utiliza o GLTFLoader fornecido via import map para Three.js r1861. Um utilitário de carregamento armazena o protótipo da cena em memória para evitar requisições repetidas:

JavaScript  
// src/assets/AssetLoader.js  
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const cache \= new Map();  
const loader \= new GLTFLoader();

export async function loadAsset(url) {  
  if (cache.has(url)) {  
    return cache.get(url);  
  }  
  const gltf \= await loader.loadAsync(url);  
  cache.set(url, gltf);  
  return gltf;  
}

### **Gestão de Instâncias e Materiais Compartilhados**

Ao instanciar um ativo no nível, a malha é clonada a partir do protótipo em cache. Contudo, **os materiais com estados dinâmicos não podem ser compartilhados entre instâncias**1. Se dois receptores compartilharem o mesmo material emissivo, ativar um deles faria o outro acender incorretamente1.  
As fábricas de objetos devem clonar a hierarquia e duplicar os materiais que sofrem alteração de estado dinâmico no gameplay1:

JavaScript  
// Exemplo de criação de instância visual na fábrica do objeto  
export function createVisualInstance(gltfProtótipo) {  
  const root \= gltfProtótipo.scene.clone(true);  
    
  root.traverse((node) \=\> {  
    if (node.isMesh && node.material) {  
      if (node.material.name.includes('dynamic') || node.material.name.includes('emissive')) {  
        node.material \= node.material.clone();  
      }  
    }  
  });  
    
  return root;  
}

### **Seleção (*Picking*) e Limpeza de Memória (*Disposal*)**

Para manter a seleção de objetos leve1:

* A malha detalhada GLB é inserida como filha do nó principal da entidade (Group).  
* O cálculo de seleção por cursor (raycaster.intersectObjects) continua testando apenas uma malha proxy invisível simplificada registrada na lista interactiveObjects1.  
* A função disposeLevel() é estendida para percorrer os nós visuais das instâncias e liberar geometrias e materiais duplicados durante o restart do nível (tecla R) ou transição de sala1.

## **9\. Otimização do Ambiente das 10 Salas**

As dez salas do jogo compartilham uma estrutura base de 10×10 m por 3 m de altura1. A estratégia mais eficiente para transformar o cenário genérico em um ambiente imersivo consiste em adotar um **Kit Modular Reutilizável de Baixa Complexidade**.

### **Composição do Kit Modular**

O kit completo de ambiente é composto por **seis peças fundamentais**:

> 1. **Placa de Piso Modular (2×2 m):** Malha plana com chanfros sutis e textura PBR de concreto/metal industrial.  
> 2. **Painel de Parede Liso (2×3 m):** Placa estrutural vertical com textura de painéis metálicos foscos.  
> 3. **Painel de Parede Técnico (2×3 m):** Variação do painel contendo conduítes de cabos e tubulações na parte superior.  
> 4. **Moldura de Porta (2×3 m):** Estrutura mecânica vazada que se encaixa nas aberturas de transição das salas1.  
> 5. **Rodapé / Calha Técnica (2 m de largura):** Peça de transição entre o piso e a parede para ocultar junções de geometria.  
> 6. **Módulo de Teto / Grelha de Iluminação (2×2 m):** Estrutura aberta vazada para dar profundidade ao teto e abrigar pontos de luz.

Com esse conjunto enxuto, as dez salas são montadas através da repetição e combinação dessas seis malhas1. A variedade visual entre as salas é obtida pela troca de posição das calhas técnicas e aplicação de decalques contendo numerações e sinalizações.

## **10\. Animações e VFX de Baixo Custo**

Para evitar o custo de desenvolvimento de animações esqueléticas (*rigging/skinning*), utiliza-se o princípio de que todos os movimentos do *Feixe* podem ser resolvidos via **Animação por Código** ou **Shaders/Materiais**1.

| Elemento | Tipo de Animação | Técnica de Implementação | Justificativa |
| :---- | :---- | :---- | :---- |
| **Abertura de Portas** | Por Código | Interpolação linear da posição Y dos painéis1. | Sincronia perfeita com a remoção do colisor AABB do jogador1. |
| **Giro de Espelhos** | Por Código | Atualização do valor rotation.y com base nos deltas do cursor1. | Controle direto e contínuo durante o arraste1. |
| **Acionamento de Botão** | Por Código | Deslocamento do nó filho no eixo Y local ao interagir. | Dispensa arquivos de animação para movimentos lineares simples. |
| **Portal** | Por Shader / UV | Deslocamento contínuo das coordenadas UV da textura do portal1. | Efeito visual fluido sem uso de recursos da CPU. |

### **Melhorias de VFX de Alto Impacto**

> 1. **Substituição do Feixe de Laser (Beam):** A linha de 1 pixel (THREE.Line)1 é substituída por uma geometria cilíndrica estreita utilizando MeshBasicMaterial com cor vibrante e toneMapped: false1. Isso dá volume visual ao feixe sem exigir filtros de pós-processamento.  
> 2. **Pulso de Ativação do Receptor:** Quando o feixe atinge o receptor, a intensidade emissiva do canal dinâmico varia em formato de onda senoidal (de 0,15 a 1,5)1, fornecendo retorno claro de acionamento ao jogador.  
> 3. **Ponto de Impacto do Laser:** Instanciação de um pequeno plano com textura circular radial no ponto exato onde o feixe intercepta superfícies, alinhado com a normal do impacto.

## **11\. Workflow Prático Agent-Friendly**

Esta seção ilustra a sequência operacional quando o desenvolvedor solicita a criação de um ativo para o agente de código.

### **Comando no Terminal**

Bash  
npm run asset:generate \-- \--type receiver \--spec assets\_src/specs/receiver.json

### **Prompt de Orientação para o Agente (Claude / ChatGPT)**

"Atue como Technical Artist do projeto Feixe. Crie o ativo 3D do Receptor (Receiver) seguindo as diretrizes de design-system.md e o arquivo de especificação assets\_src/specs/receiver.json.  
Passos obrigatórios:

1. Escreva um script Python (assets\_src/scripts/build\_receiver.py) para execução em Blender headless3.  
2. O modelo deve ter base de 0,8×0,8 m com 0,08 m de espessura1.  
3. Entalhe no centro a geometria do símbolo de acessibilidade para daltônicos (triângulo para a cor verde)1.  
4. Atribua o material mat\_frame\_metal no corpo e mat\_emissive\_dynamic no canal emissivo e no símbolo1.  
5. Aplique chanfros de 0,03 m nas bordas e configure o pivô na base traseira (0,0,0)1.  
6. Exporte o resultado para public/assets/models/receiver.glb3.  
7. Execute o script de renderização de preview e rode a validação via gltf-transform2.  
8. Apresente o relatório e as imagens de preview para aprovação."

### **Sequência Operacional Interna da Automação**

> 1. O agente lê o arquivo assets\_src/specs/receiver.json.  
> 2. O agente gera o script Python assets\_src/scripts/build\_receiver.py.  
> 3. O agente executa o Blender em modo headless: blender \-b \--python assets\_src/scripts/build\_receiver.py3.  
> 4. O Blender constrói a geometria, aplica chanfros, atribui materiais e exporta para public/assets/models/receiver.glb3.  
> 5. O validador executa gltf-transform validate e confirma que não há erros6.  
> 6. O Blender renderiza as imagens de demonstração na pasta assets\_src/previews/3.  
> 7. O agente de visão analisa preview\_active.png e confirma a visibilidade do símbolo e do canal emissivo.  
> 8. O processo é interrompido para aguardar a confirmação humana final (Y/N).

## **12\. Primeiro Experimento Prático: Asset Validador (Receptor)**

Para comprovar a eficiência da pipeline antes da produção de todos os ativos, o primeiro experimento é realizado com o **Receptor (Receiver)**. Trata-se de um modelo representativo, pois reúne todas as exigências do projeto: superfície funcional (0,8 m)1, relevo de acessibilidade1, canal emissivo variável1 e alinhamento no plano Y=1,2 m1.

### **Execução do Experimento Piloto**

> 1. **Especificação (assets\_src/specs/receiver.json):**  
   * Tipo: Receiver  
   * Largura/Altura: 0,8 m × 0,8 m; Profundidade: 0,08 m1.  
   * Altura do Centro: Y \= 1,2 m1.  
   * Símbolo de Acessibilidade: Triangle (profundidade do entalhe: 0,01 m)1.  
   * Material Corpo: mat\_frame\_metal (cinza-escuro, metálico).  
   * Material Face Ativa: mat\_emissive\_dynamic.  
> 2. **Criação do Script Blender Python (assets\_src/scripts/build\_receiver.py):**  
   * O script importa bpy e limpa a cena padrão3.  
   * Adiciona um cubo base e o ajusta para 0,8 × 0,8 × 0,08 m1.  
   * Aplica o modificador *Bevel* de 0,03 m com 3 segmentos nas bordas externas.  
   * Modela a geometria de um triângulo no centro e executa uma operação booleana para entalhar o símbolo na superfície frontal.  
   * Cria dois slots de materiais e vincula o material emissivo às superfícies do entalhe e à placa frontal.  
   * Move a malha para que a origem local (0,0,0) fique no centro traseiro da carcaça.  
   * Exporte a cena para public/assets/models/receiver.glb3.  
> 3. **Exportação e Validação:**  
   * O validador invoca gltf-transform inspect public/assets/models/receiver.glb2.  
   * Confirma que a caixa delimitadora mede 0,8 × 0,8 × 0,08 m, o pivô está na origem e existem 2 slots de materiais atribuídos.  
> 4. **Preview e Inspeção Visual:**  
   * O script gera as capturas de visualização, produzindo preview\_active.png com o canal emissivo iluminado na cor verde1.  
> 5. **Integração no Three.js:**  
   * O arquivo src/factories/createReceiver.js é atualizado para carregar receiver.glb de forma assíncrona1.  
   * A instância visual é vinculada à posição lógica definida nos dados do nível1.

### **Artefatos Produzidos no Experimento**

* assets\_src/specs/receiver.json  
* assets\_src/scripts/build\_receiver.py  
* public/assets/models/receiver.glb  
* assets\_src/previews/receiver\_preview\_active.png  
* assets\_src/reports/receiver\_validation.json

## **13\. Roadmap de Implementação Incremental**

O plano de produção visual organiza-se de forma sequencial, priorizando o que é indispensável para a apresentação do jogo1.

| Etapa | Dependências | Esforço Estimado | Priorização de Valor |
| :---- | :---- | :---- | :---- |
| **1\. Decisões e Experimento Piloto (Receptor)** | Nenhuma. | **Small** (1-2 dias) | **Necessário para Começar** |
| **2\. Design System Mínimo (design-tokens.json)** | Etapa 1\. | **Quick** (4 horas) | **Necessário para Começar** |
| **3\. Pipeline Mínima no Blender (Script Base)** | Etapa 2\. | **Small** (1 dia) | **Necessário para Começar** |
| **4\. Validador CLI (gltf-transform)** | Etapa 3\. | **Quick** (4 horas) | **Necessário para Começar** |
| **5\. Ativos Principais (Receptor, Espelho, Emissor)** | Etapas 1-4. | **Medium** (3-4 dias) | **Necessário para Começar** |
| **6\. Kit Modular de Ambiente (Piso e Parede)** | Etapa 5\. | **Medium** (3 dias) | **Vale Fazer Depois** |
| **7\. Ativos Secundários (Porta, Filtro, Portal)** | Etapa 5\. | **Small** (2 dias) | **Vale Fazer Depois** |
| **8\. Melhoria dos Feixes e VFX (Shader de Laser)** | Etapa 5\. | **Small** (1-2 dias) | **Vale Fazer Depois** |
| **9\. Agente de Revisão com Visão Computacional** | Etapa 4\. | **Small** (1 dia) | **Nice-to-Have** |
| **10\. Post-Processing AAA / Iluminação Global** | Nenhuma. | **Large** | **Overengineering (Evitar)** \[cite: 1\] |
| **11\. Infraestrutura Multi-Agente em Rede SaaS** | Nenhuma. | **Large** | **Overengineering (Evitar)** \[cite: 1\] |

## **14\. Síntese Final e Respostas Objetivas**

> 1. **Qual estratégia visual de ativos seguir?** Adotar o desacoplamento completo entre a geometria de renderização e as mecânicas de gameplay1. O gameplay roda sobre colisores simples e cálculos em código1, enquanto a renderização utiliza malhas GLB estilizadas no padrão Sci-Fi Industrial Brutalista geradas por scripts1.  
> 2. **Quais ferramentas usar?** Blender (v4.x+) operado em modo headless via scripts Python locais3, @gltf-transform/cli para validação e otimização de GLBs2, e Three.js r186 (carregamento nativo via GLTFLoader sem bundler)1.  
> 3. **Quanto isso provavelmente custará?** **R\$ 0,00 adicionais**. A pipeline apoia-se em ferramentas open-source locais e reaproveita as assinaturas já existentes do Claude e ChatGPT1.  
> 4. **O que Claude e ChatGPT conseguem fazer dentro da pipeline?** Eles geram as especificações em JSON, escrevem os scripts de modelagem procedural em Python para o Blender3, executam os comandos no terminal, analisam os relatórios de validação e fazem a pré-inspeção visual dos renders de preview.  
> 5. **O que pode rodar localmente?** Todo o ciclo de geração geométrica, compilação, validação via CLI, renderização de previews e execução do jogo roda de forma 100% local na máquina do desenvolvedor1.  
> 6. **O que ainda exige trabalho humano?** Aprovação estética final ("O modelo ficou bonito e combina com o jogo?") por meio de um comando de confirmação simples (Y/N) e correções conceituais de alto nível.  
> 7. **Como validar automaticamente os ativos?** Utilizando um script de portaria alimentado por @gltf-transform/cli e verificação de malha Python2, que checa dimensões, origem do pivô, escala aplicada, integridade do arquivo GLB e conformidade com os slots de materiais.  
> 8. **Como integrar tudo ao Three.js?** Carregando os modelos GLB via GLTFLoader com cache1, clonando hierarquias e materiais dinâmicos de forma independente por instância1, e vinculando as malhas visuais às entidades sem alterar as colisões e raycasts lógicos1.  
> 9. **Qual é o MVP da pipeline?** Um script de automação em Node.js que recebe uma especificação em JSON, aciona o Blender headless para gerar e exportar um GLB parametrizado3, valida o arquivo com gltf-transform2 e produz uma imagem estática de preview para aprovação.  
> 10. **Qual é o primeiro experimento que devemos executar?** A criação e integração do ativo **Receptor (Receiver)**1, por reunir todas as restrições operacionais do jogo: dimensão exata (0,8 m)1, alinhamento do feixe (Y=1,2 m)1, entalhe geométrico para daltônicos1 e material emissivo dinâmico para indicação de estado1.

#### **Referências citadas**

> 1. asset-pipeline-context.md  
> 2. gltf-transform/cli \- Yarn Classic, [https\://classic.yarnpkg.com/en/package/@gltf-transform/cli](https://classic.yarnpkg.com/en/package/@gltf-transform/cli)  
> 3. export-a-blender-file-to-glb-from-the-command-line.md \- GitHub, [https\://github.com/jakelazaroff/til/blob/main/blender/export-a-blender-file-to-glb-from-the-command-line.md](https://github.com/jakelazaroff/til/blob/main/blender/export-a-blender-file-to-glb-from-the-command-line.md)  
> 4. Convert blend files to gltf using a script \- Geowarin, [https\://geowarin.com/convert-blend-files-to-gltf-using-a-script/](https://geowarin.com/convert-blend-files-to-gltf-using-a-script/)  
> 5. glTF Transform, [https\://gltf-transform.dev/](https://gltf-transform.dev/)  
> 6. gltf-transform optimize: Flags, Defaults and Examples \- Compress GLB, [https\://compress-glb.com/blog/gltf-transform-optimize/](https://compress-glb.com/blog/gltf-transform-optimize/)  
> 7. @gltf-transform/cli \- npm, [https\://www\.npmjs.com/package/@gltf-transform/cli](https://www.npmjs.com/package/@gltf-transform/cli)  
> 8. glTF Project Explorer \- The Khronos Group, [https\://github.khronos.org/glTF-Project-Explorer/](https://github.khronos.org/glTF-Project-Explorer/)