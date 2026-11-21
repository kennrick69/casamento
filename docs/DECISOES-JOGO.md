# Decisões do jogo (Modo Gamificado · fases)

Registro das escolhas feitas durante a construção autônoma do jogo ponta-a-ponta
(branch `feat/s3-personagem`). Regra combinada: na dúvida de gosto/estilo, escolher
o **mais simples**, anotar aqui e seguir. JOs ajusta depois.

## Arquitetura

- **Rota única `/[slug]/jogo/mapa` = jogo inteiro.** Mapa-múndi + 3 fases numa
  máquina de estados no cliente, com **um** canvas Phaser que troca de "level".
  Evita reload entre fases e dá o feel de Super Mario World. O server component
  carrega tudo (evento, convidado, personagem, progresso, memórias, mesas) e
  passa pro cliente.
- **Phaser** continua vendorizado (`public/game/vendor/`), não dá `pnpm add` no WSL.

## Movimentação

- **Mapa-múndi:** movimento por **nós/trilha** (waypoint graph), estilo SMW — o
  avatar anda entre marcadores ligados pela trilha. Mais simples e robusto que
  colisão pixel-perfeita da água, e é exatamente o feel pedido.
- **Fases (vila/bosque/grande-dia):** andar livre, **câmera segue** o avatar,
  limites do mundo = tamanho da imagem (1536×1024), **colisão por retângulos**
  lidos de `public/game/mapas/<fase>.colisao.json`.

## Colisão

- Formato: `{ "w":1536, "h":1024, "blocks":[ {"x","y","w","h"}, ... ] }`. Só
  retângulos na v1 (polígono fica como futuro — retângulo cobre casa/muro/água).
- **Ferramenta de dev `?debug=1`:** desenha os retângulos por cima (semi-transp.)
  e mostra as coordenadas do mouse no mundo, pra JOs ajustar os números depois.
- As colisões entregues são **grosseiras de propósito** (bordas + obstáculos
  grandes): jogáveis e demonstram o sistema; o ajuste fino é com o debug.

## Progresso

- Coluna **aditiva** `GameCharacter.gameProgress Json?` (migration só no voem-dev).
  Shape: `{ phase1:bool, phase2:bool, phase3:bool, memoriesSeen:string[] }`.
- Fase 1 (Vila) conclui quando o **RSVP real** fica `CONFIRMED` (reusa `/rsvp`,
  sem burlar consentimento). As outras marcam no `gameProgress`.
- Desbloqueio: Vila sempre aberta → conclui → Bosque → conclui → Grande Dia.

## Fases

- **Vila:** NPC na caixa de correio/quadro de avisos → missão "Confirme sua
  presença" → `/rsvp`. Ao voltar confirmado, portão de flores à direita libera e
  volta ao mapa com a Fase 2 aberta.
- **Bosque:** pedestais ao longo da trilha mostram memórias do casal vindas da
  aba **História** (`CoupleStoryItem`: título, texto, foto). Se houver menos de 5,
  usa as que existirem. Ver todas conclui a fase.
- **Grande Dia:** mesas desenhadas **pelo jogo** (sprites próprios via Phaser
  Graphics) a partir da aba **Mesas** (`SeatingTable`), em grade automática no
  piso livre (até 10 mesas). Missão "Encontre sua mesa": brilho/seta guia até a
  mesa do convidado (`SeatingAssignment`); ao sentar, mensagem dos noivos. Sem
  mesa alocada → mensagem simpática "sua mesa será definida em breve".

## Noivo e noiva

- Traje de noiva/noivo no criador já é gated por `isEventOrganizer` (S3). No jogo,
  **simplificação:** no altar da Fase 3 aparecem dois avatares fixos do casal
  (specs noiva+noivo padrão) como NPCs decorativos. Avatar próprio do organizador
  com traje de noivo/noiva continua valendo (quem criou com esse traje anda com ele).

## Validação visual

- WSL não alcança o localhost; uso **Chrome/Playwright do Windows** com profile
  isolado (`G:\.cache\chrome-shot`) + cookie `guest_token` de um convidado-teste
  do demo (`demo-session-amanda-12`). Screenshots conferidos em `docs/screens-jogo/`.
- Dados de teste (dev-only): o demo não tinha História nem Mesas — seeds dev
  adicionados pra tornar as fases 2 e 3 demonstráveis.

---

## Rodada de feedback do JOs (2026-11-19, 20 itens)

### Movimento e câmera
- **Zoom responsivo "cover"** (item 14/19): o mapa enche a tela (sem faixas
  vazias), celular ~2 casas, desktop quase a fase toda. `centerOn` imediato faz o
  avatar nascer visível (não espera o lerp da câmera).
- **Movimento (item 17):** 4 direções livres estilo Pokémon GBA (cima/baixo/
  esquerda/direita, animação por direção, respeitando colisões). **Decisão:** NÃO
  implementei "snap de grade/tile por vez" — os mapas são pintados à mão, não
  tilemaps; travar numa grade imaginária pioraria o passeio. O movimento livre
  cobre a necessidade real (antes "só esquerda/direita" era o botão ↓ do D-pad
  coberto pelo badge dev do Next, não um bug de engine).

### Mapa-múndi (itens 12, 20)
- Nós reposicionados sobre as **plataformas de pedra** da arte.
- Cada aresta tem **waypoints** sobre a trilha de terra (curvas, ponte); o avatar
  caminha ponto a ponto e nunca corta grama/água. Removida a linha reta branca
  sobreposta (a arte já traz a trilha).

### Criador
- **Filtro por corpo (item 1):** roupa/cabelo mostram só o que combina; trocar o
  corpo auto-ajusta. Tags `suit` no catálogo.
- **Cabelos (item 2):** 8 novos do LPC (topete, social, raspado, cacheado curto;
  chanel, cacheado, coque c/ franja, rabo de cavalo). **Decisão:** "rabo de
  cavalo" usa `half_up` (camada única) em vez de `ponytail` (que tem bg/fg e
  exigiria suporte a cabelo multicamada).
- **Terno ≠ Noivo (item 11):** terno = paletó charcoal + gravata vinho; noivo =
  smoking preto + gravata-borboleta branca. **Decisão:** sem flor na lapela
  (boutonnière exigiria arte por-frame); o contraste paletó/gravata já distingue.
- **Véu (item 10):** o véu (`veil_bg`) subiu de z5 para z130 (acima do cabelo
  z120) — antes ficava atrás de tudo e a noiva saía "sem véu". Funciona com
  qualquer penteado, inclusive coque com franja.
- **Prévia sem banco (itens 8/9):** preview e atlas viraram função pura dos
  params (render-permissivo, sem `getGameEvent`/`isEventOrganizer`). Error
  boundary amigável em `/jogo`. A trava real de noivo/noiva fica no SAVE.
- **Item 3 (emerald):** não reproduziu (render ok por screenshot) — provável
  flakiness do JIT do Tailwind v4 no 1º acesso frio. Botão "Salvar" ganhou
  afordância (borda/sombra) e o pós-save mostra "Entrar no jogo" (item 18).

### HUD / UI
- **Sem emoji no jogo (item 6):** marcadores viraram ícones em pixel-art
  (cadeado, estrela, pin, carta, flor, livro, porta, check). Removidos os emoji
  das mensagens/toasts. **Decisão:** mantive emoji só fora do jogo.
- **D-pad só em toque (item 13):** `(pointer: coarse)` / `hasTouch`. No PC usa
  teclado. D-pad maior; rótulo de proximidade legível (item 19).
- **Chrome do site no jogo (item 16):** `HideOnGame` esconde idioma/
  acessibilidade/nav inferior em `/jogo` e subrotas (experiência imersiva).

### Colisões (item 5)
- Refinadas por mim via `?debug=1` (sem pedir coordenadas ao JOs): vila (bancos,
  postes, mural, canteiros), bosque (lago/córrego justos, ponte livre), grande
  dia (palco do altar, DJ, bolo). Conferidas por screenshot sobre a arte.

### Verificação de organizador (itens 4/10/11)
- Sessão NextAuth é **JWT** — forjar uma sessão de organizador é inviável sem o
  segredo. Verifiquei: (a) visitante NÃO vê noivo/noiva (screenshot); (b) a
  renderização de noivo/noiva/véu está correta (prévias); (c) os **avatares do
  casal no altar** (Fase 3) provam que esses trajes renderizam no jogo pela rota
  render-permissiva. O filtro `outfitsFor(body, canRestricted)` é o mesmo nos dois
  lados. Falta só o screenshot do criador logado como organizador (precisa de
  login admin real).

---

## Rodada 2 de feedback do JOs (2026-11-19 noite, itens 21-32)

- **Visitante joga tudo (31):** decisão do JOs — visitante entra com todas as
  fases liberadas (`isVisitor`/`isOrganizer` → `freeRoam`); missões não travam.
  Missão alternativa da vila: "deixe um recado para os noivos" (Guest.message),
  sem RSVP. ?start= funciona p/ qualquer um no dev.
- **Trilha por A* (26):** `scripts/game/trail_mask.py` gera a máscara da trilha
  (areia por limiar de cor + pontes/escadas por retângulos + discos nos nós),
  limpa com morfologia (closing+dilation), roda A* com custo que prefere o CENTRO
  (distance transform) e densifica (~10px). **Decisão:** 3 nós (só os marcadores);
  rota pela ponte INFERIOR (a areia conecta melhor por ali que pela superior).
  Regenerar: `python3 scripts/game/trail_mask.py` → cola os waypoints no world.ts.
- **Escala (28):** avatar 1.5x (`AVATAR_SCALE`), nearest. SPEED 165→195.
- **Profundidade (27):** sistema de **overlay** — recortes da arte (`setCrop`)
  desenhados em depth=baseY; o avatar (depth=y) passa atrás/na frente por Y.
  Colisão dos objetos altos reduzida à base. **Decisão:** sem gerar sprites por
  objeto — reusa o próprio mapa recortado (zero arte nova). Cobri postes da vila
  + copa central do bosque (extensível via `overlays` no world.ts).
- **Indicador de missão (29):** glyph "bang" (!) em pixel-art, maior (u=6) e com
  contorno escuro; vira "check" ao concluir. Sobre NPC/pedestais/minha-mesa.
- **Criador (21):** prévia sticky no topo + barra fixa embaixo com o botão.
- **Identidade (24):** botão "Continuar jogando"; `characterClaimed` passa a
  considerar ter GameCharacter (salvar personagem seta `characterClaimedAt`).
- **Controles touch (25):** semitransparentes (opacidade baixa, mais opacos ao
  tocar), menores; "A" virou botão "Entrar" com ícone.
- **Pedestais/nós (22, 32b):** âncoras do bosque e nó do Grande Dia centralizados
  nas plataformas de pedra (medidos sobre a arte).

---

## Profundidade estendida — pendência #1 (2026-11-20)

Fechei a pendência #1 do STATUS: estender a profundidade (overlay + colisão na
base) a **todas** as árvores, telhados, arcos, postes e o arco do altar.

- **Vila:** overlays agora cobrem os 2 telhados, o arco de rosas (direita), os 4
  postes e as 4 árvores; colisões reduzidas à base (parede baixa das casas, tronco
  das árvores) via WIP anterior. Provas: `z3-telhado-atras.png` × `z3-telhado-frente.png`
  (o boneco some atrás da casa e reaparece na frente), `z3-vila-arvore-atras.png`,
  `r3-vila-arco-atras.png`.
- **Bosque:** 7 overlays de árvore (copa+tronco) no lugar da única copa central.
  **Colisão reduzida à base** (o que faltava): troquei os 4 blocos grandes de canto
  por caixas de tronco pequenas (derivadas do centro de cada copa no `baseY`),
  mantendo água (córrego + lago) e arbustos. Agora o boneco sobe atrás da copa.
  Provas: `_d3-bosque-debug2.png` (troncos alinhados), `z3-bosque-arvore-atras.png`.
- **Ferramenta de dev `?px=&py=`:** spawn do avatar num ponto exato da fase (WIP),
  usada pra provar a oclusão por screenshot sem precisar andar até cada objeto.

### Arco do altar (Grande Dia) — limitação honesta
Overlay presente e **na ordem correta** (fica atrás do casal, não os cobre). Mas o
efeito de "passar atrás do arco" **não é demonstrável em jogo normal**: os avatares
do casal têm profundidade pela âncora `y=150`, enquanto visualmente pisam bem mais
abaixo; pra manter o casal na frente do arco, `baseY` tem que ficar ≤150, faixa que
só é alcançável colado na parede do topo, acima de todos — onde o jogador não anda.
Mantive o overlay (inofensivo, satisfaz "incluir o arco do altar"); um efeito real
exigiria desacoplar a profundidade do casal da âncora (fica como ajuste futuro).
A classe "arcos" está bem provada pelo **arco de rosas da Vila**.

---

## Refino de colisões — rodada 3 (2026-11-20)

Varri as 3 fases com `?debug=1` (dirigindo o avatar contra sólidos e bordas por
screenshot). Provas: `_c3-*` (mapas de colisão), `_c4-grande` (mesas), `r4-*`.

- **Debug mais legível:** a colisão no `?debug=1` passou de vermelho (0xff3344,
  confundia com telhados/flores) para **magenta** (0xff2bff, raro nessa arte).
  Só no modo debug; produção inalterada.
- **Mesas e pedestais viraram sólidos:** eram desenhados pelo jogo (não estão no
  `.colisao.json`), então o avatar os atravessava. Agora ganham **corpo circular
  estático** (mesa r=44, pedestal r=22) no `game-canvas.tsx`. Raio < 72 (alcance
  de interação) → ainda dá pra chegar perto e interagir. Prova: `r4-grande-mesa-block`.
- **Bosque — lago:** alarguei o box do lago para a esquerda (`686→600`, `w 380→480`)
  pra cobrir o lobo esquerdo da água. Aproximando de fora, a água bloqueia na ponte
  e nas margens (`r4-agua-centro`, `r4-agua-esq2`). Troncos das árvores já eram
  caixas de base (pendência #1).
- **Bordas:** conferidas nas 3 fases (vila esq/dir/baixo, grande topo, bosque via
  água/arbustos). O avatar para no limite e não sai do mapa.
- **Decisão — estrado do altar (Grande Dia):** é **piso caminhável**; o convidado
  pode subir e chegar perto do casal (não há interação lá). **Mais simples** que
  barrar e não viola as regras (não é sólido atravessado nem prende o jogador).
  Testei uma barreira entre as colunas, mas ela caía atrás do casal (profundidade
  do casal pela âncora y=150) — removida.
- **Decisão — canteiros de flores baixos (Vila):** tratados como **forração
  caminhável** (ground cover), não sólidos. Só os objetos claramente sólidos —
  casas, bancos, postes, mural/caixa-de-correio, troncos, arcos, água, mesas —
  bloqueiam. Evita criar bolsões onde o jogador ficaria preso entre canteiro e banco.

---

## Rodada de feedback 20/11 (itens 33–43) — decisões

- **Máscara caminhável (40/42):** vila e bosque deixaram de usar colisão por
  retângulos + overlays e passaram a usar uma **máscara de piso** (PNG alpha): o
  avatar só anda onde há calçamento (vila) / trilha+ponte (bosque), com folga
  pequena. Gerada da arte por `scripts/game/walk_mask.py` (threshold de cor +
  morfologia + erosão; estende ~32px pra baixo p/ cobrir o nível dos pés).
  Obstáculos sobre o piso viram buracos naturais na máscara. **Mais simples e
  robusto** que mapear cada retângulo, e cumpre "andar só no piso".
- **Overlays da vila removidos (41/42):** como o avatar nunca sai do calçamento,
  não fica atrás de nada → removi os overlays de profundidade da vila (o do poste
  estava com recorte retangular feio). Grande-dia mantém colisão por retângulos.
- **Altar (38):** bloqueei o estrado inteiro (o jogador admira o casal da frente,
  não sobe no estrado). Mais simples que recortar "frente sim, atrás não".
- **Mesas (37):** desenhadas com Phaser Graphics (toalha+sombra, flores, cadeiras
  de madeira com encosto), nome em **Caveat** (fonte do jogo, lida via `--font-caveat`).
  `tableGrid` distribui em grade centrada no salão.
- **Controles (39):** par A/B estilo GBA no mobile; no PC Enter/E/Z = A, Esc/X = B.
- **Selo de dev (34):** `devIndicators:false` + `'unsafe-eval'` no CSP **só em dev**
  (o React dev quebrava no CSP e gerava o selo "1 Issue"). Produção = CSP estrito.
- **Trilha do mapa (33):** `trail_mask.py` erode a máscara antes do A* → caminho
  pelo centro de pontes/escadas. **Setas (35):** direção pelos primeiros ~40px da
  trilha (não só o 1º waypoint), casando com a direção na tela.
