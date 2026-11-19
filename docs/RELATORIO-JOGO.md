# Relatório — Jogo completo (Modo Gamificado)

Missão autônoma em `feat/s3-personagem` (2026-11-19). **Nada na main, nada em
produção.** Dev-server no ar no Windows (`http://localhost:3000`).

## Resumo

O jogo ponta-a-ponta está **jogável**: mapa-múndi estilo Super Mario World +
3 fases com a arte real, câmera seguindo o avatar, colisões, progressão salva por
convidado, e todas as interações (RSVP, memórias, mesas, noivos, créditos). Tudo
foi **conferido por screenshot** (Chrome/Playwright do Windows, logado como
convidado) — provas em `docs/screens-jogo/`. `tsc` 0 erros, `eslint` 0.

## O que ficou pronto (por prioridade da tarefa)

| # | Item | Status | Prova |
|---|------|--------|-------|
| 1 | Arte real nas fases + câmera + limites do mundo | ✅ | `vila-debug-1280`, `bosque-1280`, `grande-mesas-1280` |
| 2 | Colisão por JSON + ferramenta `?debug=1` (retângulos + coord. do mouse) | ✅ | `vila-debug-1280` (retângulos vermelhos) |
| 3 | Mapa-múndi (trilha por nós), marcadores, desbloqueio, progresso no banco | ✅ | `mundo-1280`, `mundo-node-move-1280`, `mundo-fresh-locked-1280` |
| 4 | Fase 1 Vila: NPC na caixa de correio → RSVP real → portão libera Fase 2 | ✅ | `vila-npc-1280` |
| 5 | Fase 2 Bosque: pedestais com memórias da aba História | ✅ | `bosque-memoria-1280` |
| 6 | Fase 3 Grande Dia: mesas da aba Mesas em grade + guia até a sua + msg | ✅ | `grande-mesas-1280`, `grande-mesa-msg-1280` |
| 7 | Noivo/noiva: avatares do casal no altar | ✅ | `grande-altar-1280` |
| 8 | Celular: D-pad + botões grandes, 390×844 e 1280×800 | ✅ | `mundo-390`, `grande-390` |
| 9 | Tela de Créditos (menu do jogo) | ✅ | `creditos-1280` |
| 10 | Este relatório | ✅ | — |

Extra: **mapas otimizados** 13MB → 3.8MB (quantização 256 cores, sem banding).

## Como testar (dev, logado)

O jogo exige um convidado com personagem. No **demo** deixei um convidado-câmera
pronto (**amanda**, confirmada, Fases 1–2 liberadas) pra testar rápido:

- Entrar no jogo: `http://localhost:3000/demo/jogo` → identifique-se (ou "visitante")
  e crie/edite o personagem; depois "Entrar na festa".
- **Mapa-múndi:** `http://localhost:3000/demo/jogo/mapa`
- Deep-link de fase (só libera fases desbloqueadas): adicione `?start=vila` |
  `?start=bosque` | `?start=grande-dia`.
- **Ferramenta de colisão:** adicione `?debug=1` (ex.: `...?start=vila&debug=1`).
  Desenha os retângulos de colisão por cima e mostra `x:.. y:..` do mouse.
- Controles: setas/WASD + D-pad no toque; **Enter/Espaço/A** interage.

Pra screenshots automáticos: `scripts/game/screenshot.mjs` (ver cabeçalho do arquivo).

## Decisões (resumo; detalhes em `docs/DECISOES-JOGO.md`)

- Jogo inteiro numa rota (`/jogo/mapa`) com máquina de estados no cliente + um
  canvas Phaser que troca de "level". Mapa-múndi = movimento por nós; fases =
  andar livre com câmera + colisão por retângulos.
- Progresso: coluna aditiva `GameCharacter.gameProgress` (só voem-dev). Fase 1
  conclui pelo RSVP real `CONFIRMED`.
- Mesas e marcadores desenhados pelo jogo (Phaser Graphics) = arte própria.
- Rota do atlas tornou-se **render-permissiva** (desenhar pixels de noivo/noiva é
  inofensivo; a trava real continua no SAVE do personagem) — corrige o atlas de
  um organizador-noiva e habilita os avatares do altar.

## O que falta / ajustes pra você fazer

1. **Ajuste fino das colisões** (o mais importante): as colisões em
   `public/game/mapas/<fase>.colisao.json` são **grosseiras de propósito** (bordas
   + obstáculos grandes). Abra cada fase com `?debug=1`, passe o mouse pra ler as
   coordenadas e ajuste os retângulos nos JSONs. Hoje cobrem casas/água/paredes
   principais, mas bancos, postes e canteiros menores ainda são atravessáveis.
2. **Âncoras** (NPC, pedestais, portão, altar) em `src/lib/game/world.ts`: caíram
   bem sobre a arte, mas dá pra centralizar melhor com o `?debug=1`.
3. **Zoom/velocidade**: `SPEED` e `zoom` em `game-canvas.tsx` — ajuste ao seu gosto.
4. **Noivos no altar**: hoje usam specs fixos (noiva de véu + noivo de terno). Se
   quiserem os avatares reais de vocês dois, dá pra puxar dos personagens dos
   organizadores depois.
5. **Fotos das memórias**: puxam de `CoupleStoryItem.photoKey` via `storage.getUrl`.
   No demo as memórias que semeei (dev) não têm foto; com foto real aparece no card.
6. **Dados de teste (dev-only, demo):** semeei 5 memórias, 4 mesas e a alocação da
   amanda só no **voem-dev** pra demonstrar as Fases 2 e 3. Não afeta produção.

## Antes de mergear na main (regra combinada)

- Migration **aditiva** nova (só aplicada no voem-dev):
  ```sql
  ALTER TABLE "GameCharacter" ADD COLUMN "gameProgress" JSONB;
  ```
- Conferir backup de produção verificado **antes** do merge (produção recebe a
  migration no `migrate deploy` do build). Nenhuma migration foi aplicada em prod.

## Commits (branch feat/s3-personagem)

- arte real + colisões + decisões
- migration aditiva do progresso (só dev)
- jogo completo (mapa-múndi + 3 fases)
- screenshots de verificação
- otimização dos mapas (256 cores)
- tool de verificação visual
