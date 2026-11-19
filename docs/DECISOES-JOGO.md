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
