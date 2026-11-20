# STATUS — Voem. / Modo Gamificado

Branch de trabalho: **`feat/s3-personagem`** (33 commits à frente da `main`).
Regra de ouro: nada que funciona hoje pode quebrar; tudo do jogo fica atrás de
`Event.experienceType`; só o que está estável vai para a `main`, e **o SQL de toda
migration é mostrado antes de qualquer merge**. **Nada em produção. Nada na main.**

Última atualização: 2026-11-20.

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
  itens (21–32) FEITOS** e conferidos por screenshot.

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
  - Todo o criador + jogo (S3).
  - Migration aditiva do progresso — **só rodada no voem-dev**:
    ```sql
    ALTER TABLE "GameCharacter" ADD COLUMN "gameProgress" JSONB;
    ```
  - Dados de teste **dev-only no demo/voem-dev**: convidada-câmera `amanda`
    (Fases 1–2 liberadas), 5 memórias, 4 mesas, alocação da amanda. Não afeta prod.

### ⚠️ Trabalho em andamento NÃO commitado (working tree de `feat/s3-personagem`)
Já há um **começo da pendência nº 1** (extensão da profundidade) no working tree,
**ainda não commitado e NÃO validado por screenshot**:
- `src/lib/game/world.ts` — novos `overlays` para telhados e árvores da Vila, mais
  árvores do Bosque, e **arco do altar** no Grande Dia.
- `public/game/mapas/vila.colisao.json` e `grande-dia.colisao.json` — colisões
  reduzidas à base de casas/árvores/arco.
- `src/app/(public)/[slug]/jogo/mapa/mapa-client.tsx` — tool de teste `?px=&py=`
  para posicionar o avatar num ponto exato e provar a profundidade por screenshot.

> Próxima conversa: **validar essas mudanças com `?debug=1` + `?px&py` por
> screenshot**, ajustar os retângulos, e só então commitar. Não commitei porque
> ainda não passou pela prova visual (norma do projeto).

---

## Pendências (em ordem)

1. **Estender a profundidade (overlay + colisão na base) a TODOS os objetos altos:**
   todas as árvores, telhados, arcos, postes e **o arco do altar**. Começado no
   working tree (ver acima) — falta terminar, validar por `?debug=1`/`?px&py` e
   conferir por screenshot. Campo `overlays` por fase em `src/lib/game/world.ts`;
   colisões de base em `public/game/mapas/<fase>.colisao.json`.
2. **Ajuste fino das colisões** das 3 fases (bancos, postes, canteiros menores
   ainda atravessáveis) e centralização das âncoras (NPC, pedestais, portão, altar)
   usando `?debug=1`.
3. **Decisão de escala** — o JOs vai jogar: validar tamanho do boneco, zoom e
   velocidade (`SPEED`/`zoom` em `game-canvas.tsx`) com ele jogando de verdade.
4. **Merge para produção só com aprovação do JOs.** Antes do merge: mostrar o SQL
   da migration aditiva, conferir backup de produção verificado (produção recebe a
   migration no `migrate deploy` do build).

---

## Arquivos de referência (ler antes de continuar)

- `docs/FEEDBACK-JOS-2026-11-19.md` — feedback rodada 1.
- `docs/FEEDBACK-JOS-2026-11-19-rodada2.md` — feedback rodada 2 (itens 21–32).
- `docs/DECISOES-JOGO.md` — decisões de arquitetura e design do jogo.
- `docs/RELATORIO-JOGO.md` — relatório do jogo completo + como testar + SQL pré-merge.
- `docs/screens-jogo/` — provas visuais (screenshots) de cada item.
- `scripts/game/screenshot.mjs` — tool de screenshot (Chrome/Playwright do Windows).
- `scripts/game/trail_mask.py` — máscara A* da trilha do mapa-múndi.

### Como testar (dev, logado)
- Entrar no jogo: `http://localhost:3000/demo/jogo` (ou "visitante").
- Mapa-múndi: `http://localhost:3000/demo/jogo/mapa`.
- Deep-link de fase: `?start=vila|bosque|grande-dia`.
- Ferramenta de colisão: `?debug=1` (retângulos + coord. do mouse).
- Spawn de teste (profundidade): `?px=<x>&py=<y>`.

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
