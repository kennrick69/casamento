# STATUS — Voem. / Modo Gamificado

Regra de ouro: nada que funciona hoje pode quebrar; tudo do jogo fica atrás de
`Event.experienceType`; o SQL de toda migration é mostrado antes de qualquer merge.

Última atualização: 2026-11-21 (**S3 MERGEADO e EM PRODUÇÃO**).

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

---

## Onde estamos

| Sprint | Tema | Status |
|---|---|---|
| S0 | Visão, docs, fix do PRESS START | ✅ feito · **na main** |
| S1 | Gate de experiência (CLASSIC × GAMIFIED) + placeholder | ✅ feito · **na main** |
| S2 | Identidade: cadastro, passkey (WebAuthn), visitante, claim de boneco, acompanhantes | ✅ feito · **na main** |
| S3 | Criador de personagem (LPC) + rosto + **jogo completo ponta-a-ponta** | ✅ feito · **só no branch `feat/s3-personagem`** |

> **S0–S2 estão MERGEADOS na `main`.** S3 (criador + jogo inteiro) está **só no
> branch `feat/s3-personagem`**, validado por screenshot, **aguardando aprovação do
> JOs para merge**.

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

## O que está só no dev × o que está em produção

- **Produção (`joseeleticia.com`, Railway, deploy da `main`):** apenas S0–S2. O
  modo clássico e o gate de experiência. **Nenhuma migration do jogo foi aplicada.**
- **Só no branch `feat/s3-personagem` (não aplicado em produção):**
  - Todo o criador + jogo (S3) + painel de Recados do jogo.
  - **4 migrations aditivas** (só rodadas no voem-dev) — SQL exato em
    **`docs/PLANO-MERGE.md`**: `add_game_character_roles` (cria GameCharacter,
    EventRole, GuestRoleClaim), `add_locked_role_fk`, `add_character_appearance`,
    `add_game_progress`.
  - Dados de teste **dev-only no demo/voem-dev** (não afeta prod):
    - `amanda` (token `demo-session-amanda-12`) — é o "convidado-câmera" dos
      screenshots. Na rodada 3 ela avançou para **5/5 memórias + Fase 2** (joguei
      pelo screenshot). Pra resetar: `GameCharacter.gameProgress = {}` da amanda.
    - Convidado pendente `demo-session-rsvp-teste` (`[teste-rsvp] Convidada
      Pendente`, PENDING, com personagem) — criado pra provar a missão do RSVP na
      Vila (item 54). Script descartável já removido; o convidado ficou no dev.
    - 5 memórias, 4 mesas; 3 visitantes com recado (`seed-recados-dev.ts`).
  - **Arte nova trocada no branch** (rodada 3): `mundi.png/.webp` (estendido
    1536×1344) e `bosque.walk.png` (máscara do JOs). As antigas foram guardadas em
    `assets-src/` (`mundi-antigo.*`, `bosque-walk-antiga.png`) — fora do git, por
    convenção; se precisar reverter a arte, é de lá.

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

## Pendências (em ordem)

1. **O JOs jogar e dar o OK** — mapa-múndi + 3 fases no celular e no PC. O zoom/
   tamanho do boneco no mapa-múndi foi acertado na rodada 3 (item 53, casa com a
   fase Vila), mas a palavra final é dele jogando. `SPEED`/`zoom` em `game-canvas.tsx`.
2. **Merge para produção**: seguir `docs/PLANO-MERGE.md`, **só com aprovação do JOs**.
   ⚠️ **Atenção:** o `PLANO-MERGE.md` ainda NÃO cobre a arte nova do mapa-múndi
   (item 56) nem a máscara nova do bosque (item 57); são só assets em `public/`
   (sem migration), mas revisar o plano antes do merge.
3. **Ajuste fino residual** de colisões menores (canteiros/bancos) e âncoras, se o
   JOs quiser, com `?debug=1` (o grosso já foi feito nas rodadas 3 anteriores).

> Antes de qualquer merge: `tsc`+`eslint`+`vitest` verdes, mostrar o SQL das
> migrations, conferir backup de produção verificado (produção aplica as migrations
> no `migrate deploy` do build). Tudo detalhado em `docs/PLANO-MERGE.md`.

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
