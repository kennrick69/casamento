# Feedback JOs — 2026-11-20 (rodada 2, itens 44–46)

> **STATUS: 3/3 FEITOS** (ordem executada 44 → 46 → 45), branch `feat/s3-personagem`,
> nada em produção, `tsc`/`eslint` limpos.
> | Item | Status | Commit | Prova |
> |---|---|---|---|
> | 44 posição/colisão pela SOLA do pé | ✅ FEITO | d1c1f8f | m44-mapa-vila, m44-vila-porta, m44-bosque, m44-salao |
> | 46 nova praça da vila + máscara do JOs | ✅ FEITO | c55364d | m46-entrada, m46-cruz, m46-grama, m46-saida-dir/baixo |
> | 45 viagem do mapa em velocidade de caminhada | ✅ FEITO | cd40114 | m45-viagem.gif, m45-sequencia |


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
