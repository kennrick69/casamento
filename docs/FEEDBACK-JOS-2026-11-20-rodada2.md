# Feedback JOs — 2026-11-20 (rodada 2, itens 44–51)

> **STATUS: 8/8 FEITOS**, branch `feat/s3-personagem`, nada em produção,
> `tsc`/`eslint` limpos. Primeiro lote 44 → 46 → 45; segundo lote 47 → 48 → 49 → 50 → 51.
> | Item | Status | Commit | Prova |
> |---|---|---|---|
> | 44 posição/colisão pela SOLA do pé | ✅ FEITO | d1c1f8f | m44-mapa-vila, m44-vila-porta, m44-bosque, m44-salao |
> | 46 nova praça da vila + máscara do JOs | ✅ FEITO | c55364d | m46-entrada, m46-cruz, m46-grama, m46-saida-dir/baixo |
> | 45 viagem do mapa em velocidade de caminhada | ✅ FEITO | cd40114 | m45-viagem.gif, m45-sequencia |
> | 47 mapa-múndi para de frente pro jogador | ✅ FEITO | 8a02010 | m47-paradas-de-frente |
> | 48 tirar a bola amarela e o "!" | ✅ FEITO | 7367159 | m48-salao-antes-depois, m48-vila-bosque-depois |
> | 49 parar EM CIMA do círculo de pedra | ✅ FEITO | 2ed844e | m49-parar-no-centro-da-pedra |
> | 50 celular: zoom maior + câmera seguindo | ✅ FEITO | c505eba | m50-zoom-e-camera |
> | 51 salão: máscara caminhável do JOs | ✅ FEITO | 7fc1caf | m51-salao-mascara-do-jos |
>
> **2 avisos pro JOs (item 51):**
> 1. **Estrado do altar:** sua máscara do salão deixa o estrado CAMINHÁVEL (a noiva
>    subia e ficava entre o casal). Como o item 38 continua valendo, deixei 1 bloco
>    sólido só no estrado (`grande-dia.colisao.json`) pra ela parar na frente. Se
>    quiser, pinte esse trecho de PRETO na máscara que eu apago o bloco.
> 2. **Porta do salão:** a máscara para antes da porta (tapete vermelho), como você
>    disse. Hoje não existe "saída pela porta" — volta-se ao mapa pelo botão *Mapa*
>    (ou B). Se quiser saída andando até a porta, pinte o tapete na máscara que eu
>    ligo uma zona de saída ali.


Branch `feat/s3-personagem`. Mesmas regras: nada em produção, tsc/eslint limpos,
cada item provado por screenshot em `docs/screens-jogo/` (prefixo m44-, m45-), commit por item.

## 44 — O PÉ do boneco é que pisa (mapa-múndi E fases) — PRIORIDADE
**Problema:** o sistema alinha o MEIO do corpo do boneco com a plataforma/trilha/piso.
Por isso o boneco parece flutuar/fora do lugar e tudo "fica errado".
**Regra do JOs:** a referência é o **primeiro pixel opaco de baixo pra cima** do
sprite (a sola do pé). É ESSE ponto que tem que estar sobre a plataforma.

Onde está o erro (achado no código):
- `game-canvas.tsx`: o `player` usa origin padrão (0.5, 0.5) → no mundo,
  `player.setPosition(n.x, n.y)` e o tween da trilha põem o **centro** do sprite
  no nó/waypoint (`world.ts` nodes/via são pontos NO CHÃO da trilha/pedra).
- Nas fases (vila/bosque), `walkableAt` testa `player.body.center` (hitbox 22x12
  com offset y=50 num frame de 64) — não é a sola; e o comentário "y+~36" é chute.
- Spawns, NPCs e a profundidade (`setDepth(y)`) também usam o centro.

O que fazer:
1. Medir, por frame/direção do spritesheet LPC, a linha do primeiro pixel opaco
   de baixo pra cima (sola). Guardar como constante (ex.: `FOOT_Y` em px do frame).
2. `player.setOrigin(0.5, FOOT_Y / FRAME_H)` (e o mesmo pros NPCs) → `player.x/y`
   passa a ser o ponto da SOLA. Ajustar o hitbox (`setSize/setOffset`) pra base do
   corpo ficar exatamente na sola.
3. Mundo: nós e waypoints continuam sendo pontos do chão — com a origem na sola,
   o pé passa a andar sobre a trilha e PARAR em cima da plataforma de pedra.
4. Fases: `walkableAt` testa a sola (player.x, player.y). Revisar se as máscaras
   `vila.walk.png`/`bosque.walk.png` foram desenhadas compensando o centro (o
   "y+~36"); se sim, regerar sem essa compensação.
5. Profundidade (`setDepth`) pela sola. Spawns (`cfg.spawn`) e o `?px=&py=`
   passam a significar posição da sola — revisar os valores.
6. Provar com screenshot: boneco parado em cada uma das 3 plataformas do mapa,
   na porta da casa da vila (print do JOs: boneco na frente da casa enxaimel),
   na trilha/ponte do bosque e no salão.

## 45 — Viagem no mapa-múndi rápida demais
**Problema:** o boneco indo de uma fase para outra anda muito rápido.
Hoje: tween com `duration: Math.max(220, total * 2.3)` → ~435 px/s, mais que o
dobro da velocidade de andar nas fases (`SPEED = 195`).
**Fazer:** velocidade constante ~ a mesma das fases ou um pouco menor
(ex.: `total * 6` ≈ 165 px/s, mínimo 600 ms), ease linear (ou só suavizar
início/fim) e animação de passos acompanhando. Câmera seguindo suave.
Provar com GIF/sequência de screenshots.

## 46 — NOVA PRAÇA da vila + piso caminhável feito pelo JOs (substitui "tirar o poste")
O JOs refez a arte da vila e desenhou ele mesmo a máscara caminhável:
- Arte nova: `assets-src/mapas/vila-nova-praca-2026-11-20.png` (1536x1024, RGB).
  Praça redesenhada: calçamento em cruz com canteiro oval no centro; os postes
  agora ficam FORA do calçamento (não travam mais a noiva).
- Máscara: `assets-src/mapas/vila-piso-caminhavel-2026-11-20.png` (1536x1024,
  RGBA; alpha opaco = caminhável). É EXATAMENTE o calçamento da arte nova
  (conferido: `assets-src/mapas/vila-nova-praca-overlay-mascara.jpg`).

**Fazer:**
1. Trocar a arte da vila por essa (gerar `public/game/mapas/vila.png`/`vila.webp`
   como hoje; guardar as antigas em `assets-src/` com sufixo `-antiga`).
2. Usar a máscara do JOs como `public/game/mapas/vila.walk.png` **tal como está**
   (não regerar com walk_mask.py, não erodir/dilatar). Só converter pro formato
   que o loader espera, se precisar.
3. Teste de caminhável = **a sola do boneco** (item 44): o ponto (x, pé) tem que
   estar num pixel opaco da máscara. O corpo pode passar por cima de grama/flores;
   só o pé conta.
4. Apagar da vila tudo que era da praça antiga: obstáculos sólidos (postes/bancos/
   caixa do item 42), overlays, `vila.colisao.json` se não for mais usado, e
   reposicionar spawn, NPCs, itens de missão e portais/saídas para cima do
   calçamento novo (as saídas estão nas pontas esquerda, direita e embaixo).
5. Screenshots: noiva andando pela cruz toda, contornando o canteiro central,
   parada nas 3 saídas, e tentando pisar na grama (tem que barrar pelo pé).

## 47 — No mapa-múndi o boneco PARA sempre de frente pro jogador
**Problema (print do JOs):** ao chegar numa plataforma do mapa-múndi (ex.: A Vila),
a noiva fica parada de COSTAS (com a direção do último trecho da trilha).
**Regra do JOs:** parado, o bonequinho fica SEMPRE virado para o espectador
(de frente, direção `down`).
**Fazer:** no fim do tween da viagem (onComplete) e ao nascer/voltar ao mapa,
parar a animação de andar e setar o frame parado de frente
(`ROW.down * FRAMES_PER_DIR`). Andando, continua virando pra direção da trilha.
Vale pra noiva, noivo e convidados (todo avatar no mapa-múndi).
Nas fases (vila/bosque/grande dia) NÃO mudar: lá parado mantém a última direção
(padrão de RPG) — a regra é do mapa-múndi.
Provar: screenshot parado em cada uma das 3 plataformas, de frente.

## 48 — Tirar a bola amarela e o "!" (JOs: "ridículo")
**Problema (print do JOs, vila, noiva parada na frente da casa):** o marcador de
interação (`drawMarker` em game-canvas.tsx) desenha um ANEL amarelo pulsando no chão
e um "!" grande dourado (`floatGlyph` "bang", u=6) — o "!" fica em cima do rosto da
noiva e o anel em volta dos pés. Fica feio e amador.
**Fazer:**
1. Remover o anel pulsante de TODOS os marcadores (NPC, pedestal, portão) e o anel
   `highlight` das mesas (`ring` com 0xffd24a).
2. Remover o "!" grande. No lugar, indicador discreto e no estilo da arte:
   balãozinho pixel-art pequeno (tipo "..." ou brilho/sparkle de 2–3 frames) ACIMA
   da cabeça do NPC/objeto, nunca sobreposto ao avatar do jogador. Itens já feitos:
   sem indicador nenhum. Travados: sem indicador (o cadeado só aparece ao tentar).
3. Quando o jogador está perto o bastante pra interagir, mostrar só a dica do
   botão (A no celular / Enter no PC) pequena, perto do objeto — some ao se afastar.
4. Screenshots antes/depois na vila (mesmo ponto do print), no bosque e no salão.

## 49 — Mapa-múndi: parar EM CIMA do círculo de pedra
**Problema (print do JOs, O Bosque):** a noiva anda certinho pela trilha, mas ao
chegar ela para ACIMA do círculo de pedra (a sola fica ~25 px acima do centro), não
em cima dele.
**Causa:** os `nodes` de `WORLD` (src/lib/game/world.ts) não estão no centro das
pedras. Com a origem na sola (item 44), o pé vai exatamente pro nó — então o nó
precisa SER o centro da pedra.
Centros medidos na arte `public/game/mapas/mundi.png` (1536x1024), conferir ±3 px:
- A Vila:        (290,885) → **(285, 896)**
- O Bosque:      (595,760) → **(596, 785)**
- O Grande Dia: (1210,575) → **(1212, 584)**
**Fazer:** atualizar os 3 nós; ajustar o 1º/último waypoint de cada `via` pra
chegar suave no novo ponto (sem degrau no fim). Se o passo 3 do trail_mask.py
gerar os nós, corrigir lá também. A sola tem que ficar no CENTRO da pedra, de
frente pro jogador (item 47).
Provar: screenshot parado nas 3 pedras.

## 50 — Mapa-múndi no celular: zoom maior e câmera seguindo a noiva
**Problema (print do JOs, Pixel 9 Pro 427x952 no DevTools):** o mapa-múndi aparece
INTEIRO na tela; a noiva fica minúscula e lá embaixo (na Vila), atrás do D-pad e dos
botões A/B. Muito espaço gasto mostrando o mapa todo pra cima.
**Fazer:**
1. Zoom no mapa-múndi: boneco bem maior (≈2x o tamanho atual na tela do celular;
   no PC pode ficar menor, mas sem mostrar o mapa inteiro se não couber bonito).
2. Câmera SEGUE a noiva (startFollow suave), inclusive durante a viagem entre as
   fases, presa aos limites do mapa (sem mostrar fora da arte).
3. Centro "útil": a noiva fica no centro da área VISÍVEL acima dos controles
   (D-pad/A/B ocupam a faixa de baixo no celular) → usar followOffset/deadzone ou
   viewport pra ela nunca ficar escondida atrás dos botões.
4. Ao chegar numa plataforma: centralizada, de frente (item 47), em cima da pedra
   (item 49), com a plaquinha "A Vila · aperte A" visível sem cobrir nada.
5. Provar com screenshots em 390x844 e 427x952 (celular) e 1280x800 (PC), parada
   nas 3 plataformas e no meio de uma viagem.

## 51 — Salão (Grande Dia): máscara caminhável feita pelo JOs
O JOs desenhou a máscara do piso do salão, igual fez com a vila (item 46):
- `assets-src/mapas/salao-piso-caminhavel-2026-11-20.png` — 1536x1024, modo L
  (tons de cinza): **BRANCO = caminhável**, preto = bloqueado. Feita sobre a arte
  ATUAL `public/game/mapas/grande-dia.png` (conferido:
  `assets-src/mapas/salao-overlay-mascara.jpg`). Cobre o piso todo; deixa de fora
  as paredes, o estrado do altar (item 38 continua valendo), o palco/DJ (canto
  sup. esq.) e a mesa do bolo (canto sup. dir.).
**Fazer:**
1. Converter pro formato que o loader de `walkMask` espera (PNG com alpha:
   branco → opaco, preto → transparente) e salvar como
   `public/game/mapas/grande-dia.walk.png`. NÃO erodir/dilatar nem regerar.
2. No `world.ts`, o Grande Dia passa a usar `walkMask` (como vila/bosque), teste
   pela SOLA do pé (item 44). Tirar os retângulos de parede/borda do
   `grande-dia.colisao.json` que a máscara já cobre.
3. As MESAS (pixel-art do item 37, desenhadas por código) continuam obstáculos
   sólidos pelo pé — a máscara é só o piso. Mesmo pra NPCs.
4. ATENÇÃO à porta de entrada (embaixo, centro, tapete vermelho): a máscara para
   ANTES da porta. Conferir onde a noiva nasce/entra no salão: o spawn tem que
   estar DENTRO do branco (logo acima da porta). Conferido: o spawn atual
   (778, 870) já está no branco; o branco termina em y=883 na frente da porta. Se a saída do salão depender de
   chegar na porta, usar uma zona de saída na borda de baixo do branco em frente à
   porta — e me avisar no relatório (o JOs pode pintar o tapete na máscara).
5. Screenshots: noiva andando pelo salão inteiro, encostando nas 4 paredes (barra
   pelo pé), na frente do altar sem subir no estrado, contornando mesas, e no spawn.
