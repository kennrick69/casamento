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
