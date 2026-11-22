# STATUS — Voem. / Modo Gamificado

Regra de ouro: nada que funciona hoje pode quebrar; tudo do jogo fica atrás de
`Event.experienceType`; o SQL de toda migration é mostrado antes de qualquer merge.

Última atualização: 2026-11-22 (**fix/mural-file-delete PUBLICADO** — remover foto apaga o
arquivo do volume + limpeza de órfãos pelo painel — merge `ef0a5e0`; antes: fix/storage `7cfe417`).

## 🧹 fix/mural-file-delete — remover foto apaga o arquivo + limpa órfãos (2026-11-22)
Branch `fix/mural-file-delete` **mergeada na `main`** (merge `ef0a5e0`, `--no-ff`) e deployada
(health verde atravessando o redeploy, `storage: ok` persistente). 4 arquivos, `tsc`+`eslint` verdes.
- **Problema:** o "remover foto" do painel (mural + moderação) só fazia soft-delete (`removedAt`),
  deixando o byte no volume. Galeria e história já apagavam o arquivo; o mural não.
- **Fix:** helper `src/lib/storage/photo-file.ts` → `deletePhotoFile(storageKey)` (idiom
  `storage.delete(key).catch(...)`, nunca derruba o fluxo). Plugado em `removePhoto`,
  `batchRemovePhotos` (mural/actions) e `resolveReport(REMOVED)` (moderacao/actions): pega o
  `storageKey` ANTES do soft-delete e apaga o byte. Continua soft-delete no banco (auditoria).
- **Removida nunca é servida:** `api/photos/[key]` linha 23 já 404 quando `removedAt != null`
  (única rota que serve foto); agora com o byte apagado há dupla garantia.
- **Órfãos / arquivo de teste:** nova server action `purgeOrphanMuralFiles` (requireOrganizer) +
  botão **"Limpar arquivos órfãos"** no painel do mural. Varre `${slug}/fotos/` e apaga arquivos
  sem foto viva no banco. Prefixo exclusivo do mural (galeria=`gallery/…`, história=`story/…`),
  seguro. **Sem Railway SSH** — organizador logado clica e o toast devolve a contagem.
- **FECHADO (resíduo zero):** JOs clicou "Limpar arquivos órfãos" → toast "1 arquivo órfão
  apagado do volume". O órfão `/data/joseeleticia/fotos/1yrJWTIXLHjE.jpg` foi apagado. Esse
  clique também é a **prova funcional** de que o código novo está no ar (a action rodou).

## 🔧 fix/storage — upload de fotos funciona em produção (2026-11-22)
Branch `fix/storage` **mergeado na `main`** (merge `7cfe417`, `--no-ff`) e deployado.
- **Causa raiz do `storage=degraded`:** não era permissão — era `ENOENT` em `/data`: o
  **Volume não estava montado**. O JOs anexou o Volume `casamento-volume` em `/data`
  (serviço `casamento`). Agora `RAILWAY_VOLUME_MOUNT_PATH=/data` existe e é gravável.
- **Código (6 arquivos, `tsc`+`eslint` verdes):** `src/lib/storage/volume-path.ts` novo —
  `resolveVolumeBase()` prefere `RAILWAY_VOLUME_MOUNT_PATH` (fonte de verdade do mount) →
  `RAILWAY_VOLUME_PATH` → `/tmp/casamento-uploads`. `storage/railway-volume.ts` (grava) e
  `api/photos/[key]` (lê) usam o MESMO resolver. `api/health` faz probe de escrita REAL
  (mkdir recursivo, igual ao upload) e acusa `EFÊMERO` quando grava mas não há Volume
  anexado (foto sumiria no deploy) em vez de "ok" falso.
- **Texto "CóDIGO":** Press Start 2P é all-caps e não tem "Ó" maiúsculo → saía "CóDIGO".
  Removido o acento em `invite-code-entry` ("Tenho um codigo") e `redeem-client`
  ("TENHO OUTRO CODIGO"). Prod confere: opening mostra "Tenho um codigo".
- **Provas em produção:** `GET /api/health` → `storage: ok` · `"gravável · volume
  persistente em /data · 4.5GB livre"`. Foto de teste subida pelo mural a 427px (visitante
  "Convidada"), servida HTTP 200 (20654 bytes do volume) — print
  `docs/screens-jogo/fix-storage-mural-427.png`. **Foto de teste apagada** (hard-delete da
  Photo row em prod): `GET /api/photos/...` → 404, mural volta a "Nenhuma foto", 0 fotos no
  evento. **Resíduo:** os ~20KB do arquivo órfão em `/data/joseeleticia/fotos/` (já
  inacessível, 404) — RESOLVIDO pelo `fix/mural-file-delete`: some no botão "Limpar
  arquivos órfãos" do painel (ver seção acima), sem Railway SSH.

## S4 COMPLETO PUBLICADO EM PRODUÇÃO — merge `ffe880e`

## 🧩 Rodada "finalizar tudo antes de testar" — branch `feat/s4-convites` (NÃO na main)
Decisão do JOs (21/11): construir S4a + S4b + NPCs + S4c TODOS no `feat/s4-convites`,
**sem merge**, e só então testar tudo de uma vez em produção (publicação única, PARTE 5).
Um commit + screenshot (celular 427 e PC 1280) por item; STATUS atualizado ao fim de
cada parte. As falas/textos ficam no tom do site — o JOs ajusta no teste final.

- **PARTE 1 — ajustes do S4a ✅ (commit `66f8411`):**
  - Mensagem do convite mantém "Entre no jogo para escolher o seu lugar" (S4b vai existir).
  - "Tenho um código" aceita com/sem hífen, com espaços e minúsculas: `44hu-v9nt` ==
    `44HU V9NT` == `44HUV9NT`. Normalizador puro compartilhado em
    `src/lib/invite/normalize.ts` (cliente + servidor usam a MESMA regra).
  - Provas: `docs/screens-jogo/m-s4p1-codigo-{427,1280}.png`.
- **PARTE 2 — S4b (escolha de lugar) ✅ (commit `ff14a3b`):**
  - Migration aditiva `add_seats` (tabela `Seat`: cadeira = `tableId+seatIndex`;
    ocupante convidado/acompanhante OU cadeira travada pelo organizador; `claimedById`
    liga a família). SQL 100% aditivo, aplicada só no voem-dev.
  - No **Grande Dia**, o convidado chega perto de uma mesa e escolhe sentar ali com
    a família (acompanhantes do S2); reserva as cadeiras livres mais baixas, a missão
    passa a **guiar até a mesa**. Cadeira livre/minha/ocupada/travada tem cor própria
    no desenho (Phaser). Reserva atômica e idempotente por grupo (re-escolher troca).
  - Aba **Mesas**: mapa de cadeiras por mesa, **travar/destravar** cadeira livre,
    **mover** a família p/ outra mesa, **liberar** reserva. `SeatingAssignment` segue
    em sincronia (contagem e "sem mesa" continuam certos).
  - **Decisão de design** (ajustável no teste): o convidado escolhe a MESA e o jogo
    reserva as cadeiras livres do grupo (não precisa clicar cadeira por cadeira);
    visualmente as cadeiras do grupo ficam douradas. Dá pra refinar p/ escolha cadeira
    a cadeira depois, se o JOs quiser.
  - Provas: `docs/screens-jogo/m-s4p2-escolha-427.png` (diálogo de escolha),
    `m-s4p2-reservado-427.png` (cadeiras reservadas + guia), `m-s4p2-mesas-1280.png`
    (painel com a reserva da família + travar/mover/liberar).
  - **Dev-only:** a Amanda (convidada-câmera) ganhou 2 acompanhantes e uma reserva na
    Mesa 3 no voem-dev, só p/ os screenshots. Não afeta produção.
- **PARTE 3 — NPCs do salão + Garçom/cardápio + crianças ✅ (commit `ae3531f`):**
  - 4 NPCs no Grande Dia (pixel-art LPC, colisão pela sola, sparkle discreto, caixa
    GBA): **Fotógrafo**→mural de fotos, **DJ**→playlist, **Cerimonialista**→roteiro,
    **Garçom**→cardápio. Falas no tom do site (o JOs ajusta no teste).
  - **Garçom** pergunta "cardápio ou bebidas?" (2 opções ▶); bebidas terminam com
    "pode trazer a própria bebida". Conteúdo em **`src/lib/game/cardapio.ts`** (arquivo
    simples, cardápio de EXEMPLO — **sem painel, sem migration**, decisão do JOs).
  - **Crianças/bebê de colo** (migration aditiva `add_companion_lap_infant`,
    `GuestCompanion.lapInfant`): cadastro do acompanhante ganha "bebê de colo (não
    ocupa cadeira)"; na escolha de lugar a **criança ganha cadeira** e o **bebê de
    colo não** (fica fora do grupo); painéis **Convidados** e **Mesas** mostram quem
    é "criança" e quem é "bebê de colo".
  - Provas: `m-s4p3-npcs-1280.png`, `m-s4p3-garcom-427.png` (cardápio/bebidas),
    `m-s4p3-garcom-bebidas-427.png`, `m-s4p3-cadastro-427.png`,
    `m-s4p3-familia-{convidados,mesas}-1280.png` (família teste pai+mãe+criança+bebê).
  - **Dev-only:** família de teste "Paulo Família Teste" (+Marina/Nina/Téo) no
    voem-dev, com reserva na Mesa 2. Não afeta produção.
- **PARTE 4 — S4c (família andando junto) ✅ (commit `08bb7e4`):**
  - Os acompanhantes (menos bebê de colo) seguem o jogador **em fila** (estilo
    Pokémon) no mapa-múndi e nas 3 fases; no Grande Dia vão junto até a mesa.
  - **Criança anda em tamanho de criança** (escala ~0.72); **bebê de colo é
    carregado** (não entra na fila). Rastro do pé (history) + amostragem por
    arc-length; mesma origem na sola (profundidade por Y).
  - Provas: `m-s4p4-fila-vila-427.png` (Amanda + Bruno adulto + Lili criança menor;
    bebê de colo fora da fila), `m-s4p4-familia-mesa-1280.png` (família até a mesa).
  - **Dev-only:** a Amanda ganhou um "Bebê Cardoso" (bebê de colo) no voem-dev só
    para provar a exclusão da fila.
- **PARTE 5 — publicação única ✅ PUBLICADO EM PRODUÇÃO (22/11, OK do JOs):**
  Plano seguido (`docs/PLANO-MERGE-S4-COMPLETO.md`). Ver seção **"🚀 S4 EM PRODUÇÃO"**
  abaixo. Merge `ffe880e` (`--no-ff`) → deploy Railway → 3 migrations aditivas
  aplicadas (`add_invite_codes`, `add_seats`, `add_companion_lap_infant`) → backfill
  rodado (0 a criar: evento real ainda sem lista) → site clássico íntegro → smoke 427 ok.


## 🚀 S4 EM PRODUÇÃO (2026-11-22)
`feat/s4-convites` **mergeado na `main`** (merge `ffe880e`, `--no-ff`) e **deployado no
Railway**. Antes do merge: **backup de produção fresco verificado** (decriptado +
descomprimido + conferido: 44 tabelas, dados reais, dump íntegro — `casamento-2026-11-22`).
- **3 migrations aditivas aplicadas** pelo `migrate deploy` (confirmadas em prod:
  `InviteCode` e `Seat` criadas, `GuestCompanion.lapInfant` adicionada, as 3 com
  `finished_at`). Nenhuma coluna existente mudou.
- **Backfill** `scripts/invite/backfill-personal-codes.mjs` rodado 1× contra prod:
  **0 códigos criados** — o evento real `joseeleticia` ainda tem só 3 **visitantes** e
  **0 convidados na lista**. Quando o JOs cadastrar a lista, cada convidado ganha código
  automaticamente (`ensurePersonalCodes` ao abrir Convidados) e dá p/ re-rodar o backfill.
- **Site CLASSIC íntegro**: `/` e `/joseeleticia` → HTTP 200. Health 200 (`db` ok).
  Obs.: health acusava `storage=degraded` (volume `/data` não gravável) — **RESOLVIDO em
  22/11**, ver seção "🔧 fix/storage" no topo (Volume anexado + health honesto).
- **Smoke 427 em prod** (`docs/screens-jogo/p-prod-*`): abertura com "Tenho um código" +
  "Escanear QR code" + "Convite impresso" e mensagem "encontre a sua mesa na festa"
  (`p-prod-01`); "Tenho um código" aceitando `44hu v9nt` (minúsculo+espaço) e tratando
  código inexistente com elegância (`p-prod-02/03`); Grande Dia renderizando com NPC do
  salão "Fotógrafo · aperte A" (`p-prod-04/05`). Sem erros de página; **zero resíduo**
  (reusei cookie de visitante existente; `?start=` é só visualização).
- **Pendente do JOs no evento real** p/ testar escolha de mesa ponta-a-ponta em prod:
  cadastrar a **lista de convidados** e definir as **mesas/capacidade** (hoje 0 mesas).
- **Rollback**: `git revert -m 1 ffe880e`. Tabelas novas podem ficar (não atrapalham).
  Detalhe cosmético visto no smoke: a fonte pixel mostrava "CóDIGO" (Press Start 2P não tem
  Ó maiúsculo) — **RESOLVIDO em 22/11** (texto sem acento), ver "🔧 fix/storage" no topo.

## 🚀 S3 EM PRODUÇÃO (2026-11-21)
`feat/s3-personagem` foi **mergeado na `main`** (merge commit `5fdd163`, `--no-ff`)
e **deployado no Railway**. As 4 migrations foram aplicadas pelo `migrate deploy`
(`Database schema is up to date!`). Validado ponta-a-ponta em produção no evento real
`joseeleticia` (GAMIFIED, PUBLISHED), mobile 427×952 e desktop 1280 — relatório e
prints em **`docs/RELATORIO-DEPLOY-PROD-2026-11-21.md`** / `docs/screens-prod/`.
Site CLASSIC conferido íntegro. Rollback: `git revert -m 1 5fdd163`.
- **Pendente do JOs:** jogar/aprovar; conferir o painel *Recados do jogo* (único print
  que faltou — precisa do login dele); cadastrar memórias + mesas do evento real
  (hoje 0/0); limpar os 2 visitantes de teste (`Convidada`, `Teste`) — ver relatório.

Estado do código: `tsc` 0 erros · `eslint` 0 errors (16 warnings pré-existentes) ·
`vitest` 141/141. Jogo jogável ponta-a-ponta, provado por screenshot.

## 🌿 Rodada 4 (2026-11-21) — no branch `feat/rodada4`, AGUARDANDO OK (NÃO na main)
Itens 58–60 do `docs/FEEDBACK-JOS-2026-11-21-rodada4.md`, 1 commit + screenshot por
item, **nada na `main`/produção**. `tsc` 0 · `eslint` 0. Sem migration nesta rodada.
- **58 — abertura de jogo de verdade:** novo `src/components/guest/game-opening.tsx`
  (`GameOpening`) substitui o `GamifiedPlaceholder` "em construção/beta" (deletado).
  Tela-título estilo GBA sobre a arte do mapa-múndi; nomes + data + contagem; botão
  pixel "▶ COMEÇAR"; "Confirmar presença" secundário discreto. Texto da abertura
  aprovado pelo JOs (constante `OPENING`). O `?k=` passa ao link do jogo (a
  identidade real é o cookie `guest_token`, não o `?k=`). **Botões futuros do convite
  impresso (S4, `docs/IDEIA-QRCODES-CONVITE.md`) ficam só no código, atrás de
  `INVITE_CODES_ENABLED=false` — bloco ESCONDIDO enquanto a flag está off.**
- **59 — tirar o "EN":** `LocaleToggle` removido do layout do convite; barra "A ◑"
  (acessibilidade) permanece. Componente fica no repo.
- **60 — service worker:** `public/sw.js` nunca devolve `undefined` ao `respondWith`;
  só cacheia respostas `ok`/não-redirect; sem rede entrega página offline 503
  (`offlinePage`). `CACHE_VERSION` v2→v3. Provado com SW ativo/controlando em aba
  anônima: online = console limpo; offline sem cache = 503, 0 erro de SW.
- **Provas:** `docs/screens-jogo/m58-abertura-{mobile-427,desktop-1280}.png`,
  `m59-sem-en-{mobile-427,desktop-1280}.png`, `m60-offline-fallback.png`,
  `m60-console-prova.txt`.
- **Pendente do JOs:** jogar/aprovar o branch e dar o OK pro merge (sem migration →
  merge direto quando liberar). **Não mergear sem o OK dele.**

---

## Onde estamos

| Sprint | Tema | Status |
|---|---|---|
| S0 | Visão, docs, fix do PRESS START | ✅ feito · **na main** |
| S1 | Gate de experiência (CLASSIC × GAMIFIED) + placeholder | ✅ feito · **na main** |
| S2 | Identidade: cadastro, passkey (WebAuthn), visitante, claim de boneco, acompanhantes | ✅ feito · **na main** |
| S3 | Criador de personagem (LPC) + rosto + **jogo completo ponta-a-ponta** | ✅ feito · **na main · EM PRODUÇÃO** |

> **S0–S3 estão MERGEADOS na `main` e EM PRODUÇÃO** (merge `5fdd163`, deploy do
> Railway em 2026-11-21, 4 migrations aplicadas pelo `migrate deploy`). Validado
> ponta-a-ponta em produção no evento real `joseeleticia` (mobile e desktop) e site
> CLASSIC conferido íntegro. Relatório: `docs/RELATORIO-DEPLOY-PROD-2026-11-21.md`.

### S3 — o que foi entregue no branch (resumo)
Jogo **jogável ponta-a-ponta**, conferido por screenshot (Chrome/Playwright do
Windows, logado) — provas em `docs/screens-jogo/`. `tsc` 0 erros, `eslint` 0.

- **Criador de personagem** (LPC): corpo, cabelos (topete, coque, cacheado, rabo,
  social, raspado…), rosto (olhos/sobrancelha/barba/óculos), roupas; noiva com
  véu/saia/corpete, noivo de terno; prévia sticky; filtro por corpo; visitante sem
  noivo/noiva.
- **Mapa-múndi** estilo Super Mario World: trilha por A* sobre máscara da arte
  (areia/pontes/escadas), movimento por nós, marcadores, desbloqueio, progresso
  salvo por convidado.
- **3 fases** com arte real + câmera + colisão por JSON + ferramenta `?debug=1`:
  - **Vila** — NPC na caixa de correio → RSVP real libera a Fase 2.
  - **Bosque** — pedestais com memórias da aba História.
  - **Grande Dia** — mesas da aba Mesas em grade + guia até a sua + avatares do
    casal no altar.
- **Profundidade estilo Pokémon** (item 27): hitbox nos pés, colisão dos objetos
  altos reduzida à base, camada de **overlay** desenhada acima do boneco quando ele
  está atrás (depth por Y).
- Mobile (D-pad + botões 390×844), controles touch semitransparentes, tela de
  identidade simples, indicador de missão "!" pixel-art, créditos.
- **Visitante e organizador logado entram com todas as fases liberadas** (modo de
  teste); RSVP real segue só para quem está na lista.

### Rodadas de feedback do JOs
- **Rodada 1** (19/11, `docs/FEEDBACK-JOS-2026-11-19.md`): todos os itens FEITOS.
- **Rodada 2** (19/11 noite, `docs/FEEDBACK-JOS-2026-11-19-rodada2.md`): **12/12
  itens (21–32) FEITOS** e conferidos por screenshot. Itens 44–51 também FEITOS.
- **Rodada 3** (21/11, `docs/FEEDBACK-JOS-2026-11-21-rodada3.md`): **6/6 itens
  (52–57) FEITOS**, um commit + screenshot de prova por item (`docs/screens-jogo/`
  prefixos `m52-`…`m57-` e `m53-`). Resumo:
  - **52** — caixa de diálogo estilo GBA/Pokémon no topo (mesma pra todos os
    diálogos; máquina de escrever; escolhas com cursor ▶; boneco não anda).
  - **53** — zoom do mapa-múndi no tamanho da fase Vila (a noiva casa com a fase).
  - **54** — âncora da recepcionista movida pra frente da caixa de correio nova
    (684,350): a missão do RSVP volta a abrir.
  - **55** — console limpo (fontes `preload:false`, sem preloads órfãos, Phaser
    `noAudio`/`banner:false`).
  - **56** — mapa-múndi NOVO estendido pra baixo (WORLD.h=1344, 3 nós remedidos,
    trilha/via regeradas, câmera com limites reais, fim da folga "cor do mar").
  - **57** — Bosque com a máscara caminhável do JOs (branco→opaco); 5 pedestais
    interagíveis.

### S0–S2 (já na main) — referência rápida
- **S1:** enum `ExperienceType { CLASSIC, GAMIFIED }` + `Event.experienceType`
  default **CLASSIC** (migration aditiva `20261118020228_add_experience_type`).
  Convidado de evento `GAMIFIED` → placeholder; `CLASSIC` → site clássico inalterado.
- **S2:** migration aditiva `20261118142707_add_game_identity`
  (`Guest.isVisitor/playerName/characterClaimedAt` + tabela `GuestCredential`).
  Passkey WebAuthn (`@simplewebauthn` v14), rota gated `/[slug]/jogo`. "Código por
  celular" reusa o magic link (SMS/WhatsApp é pendência de custo).

---

## O que está em produção × o que é dev-only

- **Produção (`joseeleticia.com`, Railway, deploy da `main`):** S0–S3 completo. Modo
  clássico, gate de experiência, criador + jogo inteiro + painel de Recados do jogo.
  As **4 migrations aditivas** já foram aplicadas pelo `migrate deploy`
  (`add_game_character_roles` → GameCharacter/EventRole/GuestRoleClaim,
  `add_locked_role_fk`, `add_character_appearance`, `add_game_progress`) — SQL exato
  em `docs/PLANO-MERGE.md`. Rollback: `git revert -m 1 5fdd163`.
  - **No evento real `joseeleticia`:** ainda **0 memórias e 0 mesas** cadastradas, e
    há **2 visitantes de teste** (`Convidada`, `Teste`) para limpar — pendência do
    JOs (ver relatório de deploy).
- **Dados de teste dev-only no demo/voem-dev (NÃO afetam prod):**
    - `amanda` (token `demo-session-amanda-12`) — é o "convidado-câmera" dos
      screenshots. Na rodada 3 ela avançou para **5/5 memórias + Fase 2** (joguei
      pelo screenshot). Pra resetar: `GameCharacter.gameProgress = {}` da amanda.
    - Convidado pendente `demo-session-rsvp-teste` (`[teste-rsvp] Convidada
      Pendente`, PENDING, com personagem) — criado pra provar a missão do RSVP na
      Vila (item 54). Script descartável já removido; o convidado ficou no dev.
    - 5 memórias, 4 mesas; 3 visitantes com recado (`seed-recados-dev.ts`).
- **Arte nova (rodada 3), já em produção:** `mundi.png/.webp` (estendido 1536×1344) e
  `bosque.walk.png` (máscara do JOs) foram ao ar no merge. As antigas foram guardadas
  em `assets-src/` (`mundi-antigo.*`, `bosque-walk-antiga.png`) — **fora do git**; se
  precisar reverter a arte, é de lá.

### ✅ Pendência nº 1 — profundidade estendida (FEITA, 2026-11-20, commitada)
Estendida a profundidade (overlay + colisão na base) a **todas** as árvores,
telhados, arcos, postes e o arco do altar, validada por screenshot (`z3-*`,
`_d3-*`, `r3-*`). `tsc` 0 erros · `eslint` limpo. Detalhes e a ressalva do arco do
altar em `docs/DECISOES-JOGO.md` (seção "Profundidade estendida").
- `src/lib/game/world.ts` — overlays de telhados/arco/árvores da Vila, 7 árvores do
  Bosque, arco do altar do Grande Dia.
- `public/game/mapas/{vila,grande-dia,bosque}.colisao.json` — colisões reduzidas à
  base (o Bosque era o que faltava: blocos grandes de canto → caixas de tronco).
- `src/app/(public)/[slug]/jogo/mapa/mapa-client.tsx` — tool de dev `?px=&py=`.

### ✅ Rodada 3 — missão autônoma (FEITA, 2026-11-20, commitada)
Detalhes em **`docs/RELATORIO-RODADA3.md`**. Resumo:
- **Colisões refinadas** (`51cbf15`): mesas e pedestais sólidos; água do bosque
  selada; bordas conferidas; debug em magenta.
- **Recados do jogo no painel** (`eff0003`): *Acessos ao jogo* mostra os recados
  dos visitantes com avatar real e sem emoji.
- **Regressão completa** (`69a104b`): visitante + organizador, 1280 e 390 — sem bug.
- **Desempenho**: carregamento do jogo no 4G de ~7 s → **~4,7 s** (mapas WebP +
  preload). Build de produção compila.
- **`docs/PLANO-MERGE.md`** escrito (migrations, riscos, rollback, teste em prod).

---

## Pendências (em ordem) — agora do JOs

Merge + deploy FEITOS. O que falta é tudo do lado do JOs, no evento real em produção:

1. **Jogar e dar o OK final** — mapa-múndi + 3 fases no celular e no PC em produção.
   O zoom/tamanho do boneco no mapa-múndi foi acertado na rodada 3 (item 53, casa com
   a fase Vila), mas a palavra final é dele jogando. `SPEED`/`zoom` em `game-canvas.tsx`.
2. **Conferir o painel *Recados do jogo*** (login de organizador) — única prova visual
   que faltou no deploy; o caminho do dado foi provado por banco + código.
3. **Cadastrar o conteúdo real** no evento `joseeleticia`: **memórias** (aba História,
   viram os pedestais do Bosque) e **mesas** (aba Mesas, viram o Grande Dia). Hoje 0/0.
4. **Limpar os 2 visitantes de teste** (`Convidada`, `Teste`) do evento real.
5. **Ajuste fino residual** de colisões menores (canteiros/bancos) e âncoras, se quiser,
   com `?debug=1` (o grosso já foi feito nas rodadas anteriores).

> Já NÃO há merge pendente. Se precisar de uma nova migration no futuro, a regra segue:
> só aditiva, `tsc`+`eslint`+`vitest` verdes, SQL mostrado antes, backup de produção
> verificado antes (produção aplica no `migrate deploy` do build). Ver `docs/PLANO-MERGE.md`.

### ⚠️ Avisos / pontas soltas

- **`src/lib/utils/escape-html.ts`** está na árvore de trabalho **não rastreado** e
  **sem uso** no código — sobrou de outra sessão, não é da rodada 3. Deixado
  intocado; decidir depois se remove ou aproveita (ex.: escapar nome em e-mail/JSON-LD).
- Backups de arte antiga vivem em `assets-src/` (fora do git). Se o checkout for
  recriado do zero, esses backups se perdem — não dependa deles para reverter.
- `demo-session-rsvp-teste` e o progresso 5/5 da amanda são **dev-only**; se algum
  screenshot futuro precisar da amanda "zerada", resetar o `gameProgress` dela.

---

## Arquivos de referência (ler antes de continuar)

- `docs/FEEDBACK-JOS-2026-11-19.md` — feedback rodada 1.
- `docs/FEEDBACK-JOS-2026-11-19-rodada2.md` — feedback rodada 2 (itens 21–32).
- `docs/DECISOES-JOGO.md` — decisões de arquitetura e design do jogo.
- `docs/RELATORIO-JOGO.md` — relatório do jogo completo + como testar + SQL pré-merge.
- `docs/RELATORIO-RODADA3.md` — rodada 3 (colisões, recados, regressão, perf, plano).
- `docs/PLANO-MERGE.md` — plano de merge: migrations/SQL, riscos, rollback, teste prod.
- `docs/screens-jogo/` — provas visuais (screenshots) de cada item.
- `scripts/game/screenshot.mjs` — tool de screenshot (Chrome/Playwright do Windows).
- `scripts/game/trail_mask.py` — máscara A* da trilha do mapa-múndi.

### Como testar (dev, logado)
- Entrar no jogo: `http://localhost:3000/demo/jogo` (ou "visitante").
- Mapa-múndi: `http://localhost:3000/demo/jogo/mapa`.
- Deep-link de fase: `?start=vila|bosque|grande-dia`.
- Parar o avatar num nó do mapa-múndi: `?node=0|1|2` (Vila/Bosque/Grande Dia).
- Ferramenta de colisão: `?debug=1` (retângulos + coord. do mouse).
- Spawn de teste (profundidade / abrir diálogo): `?px=<x>&py=<y>`. Para abrir um
  diálogo por script, o Enter precisa ficar PRESSIONADO alguns frames (um "tap"
  rápido às vezes não registra) — ver `scripts/game/screenshot.mjs` (`hold`).

---

## Ambientes
- **Produção:** `joseeleticia.com` (Railway, deploy da `main`). Build roda
  `prisma migrate deploy` → migration na main aplica na produção.
- **Dev DB:** Postgres `voem-dev` no Railway, em `.env.local` (gitignored, **não**
  é produção). Seed: `/demo`, `/casamento-exemplo`, 30 convidados.

## Toolchain (WSL + checkout no mount Windows)
- Migrations: **WSL** (`prisma migrate deploy`). Seed e build: **Windows**
  (`cmd.exe … pnpm …`), porque `tsx`/esbuild e `prisma generate` quebram no mount WSL.
- `pnpm test` (vitest): rodar no **Windows**. Nunca `git add -A` (ruído CRLF);
  identidade de commit inline.

## Docs do projeto
- `docs/future-features/missao-original.md` — missão original (verbatim).
- `docs/future-features/modo-gamificado.md` — visão + fases + modelo de dados + sprints.
- `docs/ASSETS-LICENSES.md` — licenças LPC + obras derivadas (véu, saia e corpete brancos).
