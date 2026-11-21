# Feedback JOs — rodada 3 (20/11 noite)

Branch `feat/s3-personagem`. Mesmas regras: nada em produção, tsc/eslint limpos,
um commit + screenshot de prova por item em `docs/screens-jogo/` (prefixo m52-).

## 52 — Caixa de diálogo: ir pra CIMA e ficar com cara de GAME
**Problema (print do JOs, celular, memória "O grande dia"):** a caixa de diálogo
(`DialogBox` em `jogo/mapa/mapa-client.tsx` — usada por memória, recepcionista,
mesa, portão e créditos) aparece EMBAIXO, por trás/sob os botões A e B, que cobrem
o texto e o botão "Continuar". E o visual (card escuro arredondado, fonte de site,
botão verde "Continuar", X no canto) não tem nada de jogo.
**Fazer:**
1. Posição: no TOPO da área do jogo (abaixo do header "Mapa da festa"), largura
   quase total, sem nunca encostar no D-pad/A/B. Nada do jogo fica escondido atrás
   dela que seja necessário ver.
2. Visual de RPG estilo GBA/Pokémon: caixa com borda pixel-art dupla (moldura
   clara + contorno escuro, cantos "dentados"), fundo creme/papel, sem blur nem
   sombra de site; título como plaquinha/aba de nome em cima da caixa; texto com a
   fonte pixel do projeto (`--font-press-start`) só no título/rótulos e uma fonte
   legível no corpo (ou pixel se ficar legível no celular — testar 390 px).
3. Texto com efeito máquina de escrever; apertar A (ou tocar na caixa / Enter)
   completa o texto e depois avança; indicador "▼" piscando no canto quando há
   mais. Textos longos paginados (sem rolagem).
4. Escolhas (ex.: "Agora não" / confirmar) viram lista com cursor "▶" (D-pad
   cima/baixo + A pra escolher; toque também funciona). B = voltar/fechar.
   Tirar o botão verde "Continuar" e o "X".
5. Enquanto a caixa está aberta, o boneco não anda.
6. Mesma caixa pra TODOS os diálogos (memória, recepcionista, mesa, portão,
   créditos). Provas em 390x844, 427x952 e 1280x800, com A/B visíveis e sem cobrir
   a caixa.

## 53 — Mapa-múndi: zoom exagerado + falta cenário embaixo
**Problema (print do JOs, celular):** depois do item 50 o zoom ficou PERTO DEMAIS
(a Vila ocupa a tela toda) e, como a Vila fica no pé da arte, a câmera não consegue
centralizar a noiva acima dos controles → embaixo aparece uma faixa azul lisa
(o "cor do mar" de folga) atrás do D-pad/A/B.
**Fazer:**
1. Reduzir o zoom do celular. REFERÊNCIA DO JOs: o tamanho da noiva DENTRO DA VILA
   (fase, 427x952) ficou "perfeito" — no mapa-múndi a noiva deve aparecer com esse
   mesmo tamanho na tela (ou bem próximo), mostrando a vizinhança.
2. O JOs vai mandar uma ARTE NOVA do mapa-múndi estendida PRA BAIXO (mesma arte,
   com mais mar/costa embaixo; topo e laterais idênticos). Quando chegar:
   - trocar `public/game/mapas/mundi.png/.webp` (guardar a antiga em assets-src/);
   - como só cresce embaixo, TODAS as coordenadas (nós, via, plaquinhas) continuam
     valendo; atualizar só `WORLD.h` e os limites da câmera;
   - estender a máscara da trilha (trail_mask) com a faixa nova (não caminhável);
   - remover a folga "cor do mar" lisa: a área embaixo dos controles passa a ser
     cenário de verdade.
3. Provas 390x844, 427x952, 1280x800 nas 3 plataformas.

## 54 — Vila: a caixa de correio não dá a missão (RSVP)
**Problema (print do JOs):** parada em frente à caixa de correio da NOVA praça, a
noiva não recebe a informação/missão (RSVP "Confirme sua presença").
**Causa:** o ponto de interação `PHASES.vila.anchors.npc` ficou na posição da praça
ANTIGA: (430, 460) — longe da caixa de correio nova.
Na arte nova (`vila.png`), a caixa de correio fica com a base em ~(684, 307); o
calçamento começa logo abaixo (y≈334 nesse x). Mural de avisos ao lado direito
(~x 790–860).
**Fazer:**
1. Mover `anchors.npc` pra frente da caixa de correio, NO calçamento:
   ~**(684, 350)** (conferir com `?debug=1`). O raio de interação deve pegar quem
   para em frente à caixa ou ao mural.
2. Conferir que a dica do botão (A/Enter) aparece ao chegar perto e que o diálogo
   da missão abre (já com a caixa nova do item 52).
3. Revisar TODOS os anchors da vila com a praça nova (spawn 95,505 e gate 1480,519
   estão dentro da máscara, mas confirmar se fazem sentido visualmente).
4. Provar: screenshot em frente à caixa com a dica de A e com o diálogo aberto.

## 55 — Limpar os avisos do console (jogo)
Print do JOs (DevTools, /demo/jogo/mapa). Nenhum é erro fatal, mas limpar:
1. **"The resource <URL> was preloaded using link preload but not used…" (x16):**
   - `layout.tsx` carrega 7 fontes `next/font` (Inter, Cormorant, Fraunces, Lora,
     Caveat, DM Serif, Press Start 2P) com preload em TODA página; no jogo quase
     nenhuma é usada logo de cara. Usar `preload: false` nas que não aparecem
     acima da dobra em todas as páginas (ou mover a fonte pro layout/página que
     usa). Não pode quebrar a aparência do site clássico — conferir com screenshot.
   - `jogo/mapa/page.tsx` faz `<link rel="preload">` do phaser.js, `mundi.webp` e
     do atlas, mas o Phaser carrega por outro caminho (XHR/Image com outro
     `crossOrigin`/URL) → o navegador descarta o preload. Ou alinhar
     (`crossOrigin` igual / mesma URL exata) ou remover esses preloads.
2. **"The AudioContext was not allowed to start…":** o Phaser cria WebAudio antes de
   o usuário tocar na tela. Se o jogo não tem som: `audio: { noAudio: true }` no
   config do `new Phaser.Game`. Se for ter som: só criar/retomar o áudio no
   primeiro toque/tecla.
3. **Banner do Phaser aparecendo 3x:** `banner: false` no config. E conferir que
   não ficam vários `Phaser.Game` vivos ao trocar de cena/fase (deve haver só 1;
   em dev o StrictMode monta 2x — ok, desde que o `destroy(true)` rode).
4. "Download the React DevTools…" e "[HMR]/[Fast Refresh]": só aparecem em dev,
   ignorar.
Provar: print do console limpo ao abrir o mapa e entrar numa fase.

## 56 — Mapa-múndi NOVO, estendido pra baixo (arte do JOs) — completa o item 53
O JOs gerou o mapa-múndi com mais mar/ilhotas embaixo. O GPT redesenhou a imagem
inteira (1341x1173, levemente reescalada), então NÃO dá pra colar a parte de cima
antiga (testado: emenda fica com "fantasma" do penhasco). Solução já preparada:
- `assets-src/mapas/mundi-estendido-1536x1344.png` = arte nova redimensionada
  (x1.148, y1.156) e cortada em **1536x1344**. Nessa escala ela ALINHA com a antiga:
  o topo bate com 1–3 px de diferença. Original do GPT guardada em
  `assets-src/mapas/mundi-estendido-original-gpt-1341x1173.png`.
- Centros das pedras medidos na arte nova (template match com a antiga):
  Vila **(286, 898)**, Bosque **(597, 787)**, Grande Dia **(1215, 585)**.
**Fazer:**
1. Trocar `public/game/mapas/mundi.png/.webp` por essa (antiga → assets-src/
   `mundi-antigo.png`). `WORLD.h = 1344`.
2. Atualizar os 3 nós com os centros acima e REGERAR a máscara da trilha + as
   `via` com `scripts/game/trail_mask.py` sobre a arte nova (pontes/escadas podem
   ter mudado alguns px). Conferir que o boneco anda pelo meio da trilha.
3. Câmera: limites com a altura nova; tirar a folga "cor do mar" lisa (agora tem
   cenário de verdade embaixo). Zoom conforme item 53 (tamanho da noiva = o da
   fase Vila em 427x952).
4. Provas: 427x952 e 1280x800 parada nas 3 pedras (de frente, no centro) e no
   meio de uma viagem; Vila com os botões em cima do mar, não da noiva.

## 57 — Bosque: máscara caminhável feita pelo JOs
- `assets-src/mapas/bosque-piso-caminhavel-2026-11-20.png` — 1536x1024, modo L,
  **BRANCO = caminhável**, sobre a arte ATUAL `bosque.png` (conferido:
  `assets-src/mapas/bosque-overlay-mascara.jpg`). Cobre a trilha de areia + a ponte.
**Fazer:**
1. Converter (branco → opaco) e substituir `public/game/mapas/bosque.walk.png`
   (antiga → assets-src/`bosque-walk-antiga.png`). Sem erodir/dilatar/regerar.
2. Teste pela SOLA (item 44). Spawn (130,560) e exit (1360,470) já caem no branco.
3. ⚠️ Os 5 PEDESTAIS ficam FORA do branco (em cima das pedras, como deve ser) —
   distância até a trilha: (255,560) ~44 px, (540,330) ~44, (505,655) ~8,
   (1090,330) ~44, (1375,520) ~4. Garantir que cada pedestal é INTERAGÍVEL parando
   na trilha ao lado (raio de interação medido da sola até a pedra ≥ 60 px, ou um
   "ponto de parada" na borda do branco em frente a cada pedra). Não liberar
   andar em cima da pedra.
4. Provas: noiva percorrendo a trilha toda + ponte, barrada na grama/água pelo pé,
   e abrindo a memória em cada um dos 5 pedestais.
