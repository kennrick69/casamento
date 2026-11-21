# Relatório — Deploy do Modo Gamificado (S3) em PRODUÇÃO

Data: **2026-11-21** · Executor: sessão autônoma (Claude) · Aprovação: JOs (merge aprovado)
Produção: `joseeleticia.com` (Railway, deploy da `main`) · Evento real: **`joseeleticia`** (GAMIFIED, PUBLISHED)

> **Resultado: SUCESSO.** `feat/s3-personagem` → `main` mergeado, build e deploy do
> Railway concluídos, as 4 migrations aplicadas pelo `migrate deploy`, jogo validado
> ponta-a-ponta em produção (mobile 427×952 e desktop 1280) e site CLASSIC íntegro.
> Uma única prova visual ficou pendente: o **painel dos noivos logado** (precisa do
> login de organizador do JOs). O caminho do dado foi provado por banco + código.

---

## Checklist da seção 6 (PLANO-MERGE) — resultado

| # | Passo | Resultado |
|---|---|---|
| 1 | `tsc` + `eslint` + `pnpm test` | ✅ tsc 0 erros · eslint **0 errors** (16 warnings pré-existentes) · vitest **141/141** |
| 2 | `prisma migrate status` contra PROD | ✅ exatamente as **4** migrations do plano pendentes, nada mais, sem drift |
| 3 | Backup de PROD agora + restore-test | ✅ `casamento-2026-11-21.sql.gz.gpg` no Drive · restore-test OK (42 tabelas) |
| 4 | Não incluir `escape-html.ts` | ✅ ficou untracked, fora do merge |
| 5 | Merge → build → deploy → migrate deploy | ✅ deploy no ar (~3,5 min) · `Database schema is up to date!` · 4 tabelas/colunas confirmadas |
| 6 | Roteiro seção 5 em PROD + smoke CLASSIC | ✅ fluxo completo (visitante→recado→3 fases) · CLASSIC íntegro · ⚠️ painel logado pendente |

---

## 1. Validação (passo 1)

- **tsc:** 0 erros.
- **eslint:** 0 errors (antes havia 33). Foram 2 correções commitadas no branch (commit `7dfb83f`):
  - `public/game/vendor/**` adicionado ao `globalIgnores` — o Phaser vendorizado
    minificado gerava 32 errors + milhares de warnings de lint sem sentido.
  - `mapa-client.tsx`: `stateRef.current` passou a ser atualizado num `useEffect`
    (regra `react-hooks/refs`), em vez de durante o render. Equivalente — o ref só
    é lido em handlers/effects, que rodam após o commit.
- **vitest:** 141 testes / 16 arquivos, todos verdes (rodado no Windows).

## 2. Migrations contra produção (passo 2)

`migrate status` apontado para `railway @ trolley.proxy.rlwy.net:59914`: pendentes
exatamente as 4 do plano — `add_game_character_roles`, `add_locked_role_fk`,
`add_character_appearance`, `add_game_progress`. Nenhuma outra, sem drift.

## 3. Backup de produção (passo 3)

- `pg_dump` 18 → gzip → gpg (AES256) → Google Drive **`01 Backups/casamento/2026-11-21/casamento-2026-11-21.sql.gz.gpg`** (20K).
- **restore-test**: restaurado num DB throwaway (`restore_test`, criado e **dropado**
  na mesma instância, isolado do banco `railway` de prod) → **42 tabelas, Guest=33,
  Event=4**. Backup recuperável. A senha GPG (`~/casamento-backups/.crypto-pass`) é a
  chave de recuperação.

## 4. Merge e deploy (passo 5)

- Merge `--no-ff`: commit de merge **`5fdd163`** (rollback por `git revert -m 1 5fdd163`).
- Push `6e35603..5fdd163 main -> main`. Railway auto-deploy.
- Deploy no ar confirmado pelo asset branch-only `/game/vendor/phaser-3.88.2.min.js`
  (404 → **200**) ~3,5 min após o push.
- `migrate deploy` do build aplicou as 4 → `migrate status`: **"Database schema is up
  to date!"**. Conferido direto no banco: tabelas **EventRole, GameCharacter,
  GuestRoleClaim** e colunas **appearance, gameProgress, lockedByRoleId** presentes.

## 5. Roteiro em produção — evento do JOs `joseeleticia` (passo 6)

Fluxo de **visitante** real em `joseeleticia.com/joseeleticia/jogo`, sem erros de
console, nos dois tamanhos. Prints em `docs/screens-prod/` (prefixo `m-` = 427×952,
`d-` = 1280):

| Tela | Mobile 427×952 | Desktop 1280 |
|---|---|---|
| Identificação (entrada) | `m-01-entrada.png` | `d-01-entrada.png` |
| Visitante logado | `m-02-visitante-logado.png` | `d-02-visitante-logado.png` |
| Criador de personagem | `m-03-criador.png` | `d-03-criador.png` |
| Personagem salvo | `m-04-personagem-salvo.png` | `d-04-personagem-salvo.png` |
| Mapa-múndi | `m-05-mapa.png` | `d-05-mapa.png` |
| Vila | `m-06-vila.png` | `d-06-vila.png` |
| Vila — diálogo recepcionista | `m-07-vila-dialogo.png`, `m-07b-dialogo-aberto.png` | — |
| Vila — recado digitado | `m-08-recado-digitado.png` | — |
| Vila — recado enviado | `m-09-recado-enviado.png` | — |
| Bosque | `m-10-bosque.png` | `d-10-bosque.png` |
| Grande Dia | `m-11-grande-dia.png` | `d-11-grande-dia.png` |

- **Recado + caixa de correio (RSVP):** o diálogo estilo GBA "Recepcionista" abriu,
  o recado foi digitado e **enviado**; apareceu a confirmação "Que carinho,
  Convidada! Seu recado foi guardado…". Conferido no banco de prod: `Guest.message` =
  "Que festa linda, José e Letícia! Felicidades mil pra vo…" (visitante `Convidada`).
- **Bosque:** "Memórias: 0/0" — o evento real ainda **não tem memórias cadastradas**
  (conteúdo, não bug). Pedestal e arte OK.
- **Grande Dia:** "Sua mesa será definida em breve" — visitante não tem mesa e o
  evento real ainda **não tem mesas cadastradas**. Noivos no altar + salão OK.
- **Painel dos noivos → "Recados do jogo":** ⚠️ **não screenshotado** — a página
  (`/admin/eventos/[id]/acessos-jogo`) exige **login de organizador do JOs** (não
  tenho a senha). O caminho do dado está provado: o recado está no banco e a query do
  painel é `guest.findMany({ isVisitor:true, message:{not:null}, banned:false, deletedAt:null })`
  com `stripEmojis` — o recado da `Convidada` casa com o filtro e vai aparecer (sem
  emoji) assim que o JOs logar. **Ação do JOs:** logar no painel e conferir visualmente.

## 6. Smoke do site CLASSIC (não-regressão)

Em produção **só `joseeleticia` está PUBLISHED**; os dois eventos CLASSIC
(`casamento-exemplo`, `demo`) estão **ARCHIVED** (desde antes do deploy). Para gerar
a prova visual do CLASSIC, **publiquei temporariamente** o evento de exemplo
`casamento-exemplo` (dados fictícios "Ana e Bruno", não é convidado real),
screenshotei e **reverti para ARCHIVED** no mesmo passo. Estado final conferido:
idêntico ao original (`casamento-exemplo`, `demo`, `asdasd` = ARCHIVED; `joseeleticia`
= PUBLISHED). Prints: `classic-m-home.png`, `classic-d-home.png`. A landing clássica
renderiza íntegra (data, "Confirmar presença", Presentes, nav Mural/Chat/Playlist),
**sem nenhum elemento de jogo** — experiência clássica inalterada.

---

## Pendências / ações para o JOs

1. **Jogar e aprovar** o jogo em produção no seu próprio dispositivo.
2. **Conferir o painel** dos noivos → *Acessos ao jogo* → *Recados do jogo*: deve
   aparecer o recado da `Convidada` (prova do caminho completo). Único print que não
   consegui fazer (precisa do seu login).
3. **Cadastrar memórias e mesas** do evento real `joseeleticia` (hoje 0/0 e sem
   mesas) — senão Bosque e Grande Dia ficam sem conteúdo para os convidados.
4. **Dados de teste em produção** que eu criei (gated, evento ainda não divulgado):
   2 visitantes — `Convidada` (com recado) e `Teste` (sem recado). **Não apaguei
   nada** (deleção em prod só com seu OK). Recomendo manter a `Convidada` até você
   conferir o painel, depois apagar os dois. Um comando limpa:
   `DELETE FROM "Guest" WHERE "eventId"=(SELECT id FROM "Event" WHERE slug='joseeleticia') AND "isVisitor"=true AND "playerName" IN ('Convidada','Teste');`

## Rollback (se precisar — seção 4 do plano)

`git revert -m 1 5fdd163` na `main` + push → Railway redeploya sem o jogo; CLASSIC
nunca foi afetado. As 3 tabelas novas podem ficar (vazias, inofensivas). Backup do dia
disponível no Drive se precisar restaurar.
