# Relatório — Modo Gamificado

Branch: `feat/modo-gamificado` · Nada é mergeado na `main` sem aprovação do SQL de migration.
Última atualização: 2026-11-18.

---

## Sprint S2 — Identidade do jogador (cadastro, passkey, visitante, claim)

**Objetivo:** dar ao convidado uma identidade dentro do jogo, reaproveitando o
`Guest` e a sessão da experiência clássica. Nada do site clássico muda.

### O que entrou

1. **Migration (aditiva)** `20261118142707_add_game_identity` — SQL completo mais abaixo. Só `ADD COLUMN` (com default seguro) + `CREATE TABLE`/índices/FK. Nenhum rename/drop; eventos e convidados atuais inalterados.
   - `Guest.isVisitor` (bool, default false), `Guest.playerName` (texto, nulo), `Guest.characterClaimedAt` (timestamp, nulo).
   - Nova tabela **`GuestCredential`** — passkeys WebAuthn (chave pública COSE + contador anti-clonagem). Nenhum dado biométrico sai do aparelho.
2. **Passkey WebAuthn** (`@simplewebauthn/server@14` + `@simplewebauthn/browser@14`): login sem senha e à prova de phishing. Desafio guardado em cookie httpOnly de uso único (sem tabela extra). RP ID = host do app.
3. **Rota `/[slug]/jogo`** (só sob `GAMIFIED`; evento clássico é redirecionado para `/[slug]`). Tela de identidade com: entrar com passkey, entrar com e-mail (reusa o magic link de `/recuperar`), entrar como visitante, e — já identificado — criar passkey e reivindicar o boneco.
4. **Visitante:** quem não está na lista entra como `Guest` com `isVisitor=true` (e-mail sintético `@visitante.voem.invalid`, nunca real — mantém o `NOT NULL` do schema sem relaxar nada).
5. **Claim de boneco:** marca `characterClaimedAt` + grava `playerName` (LGPD: só 1º nome, opt-in). A **aparência** do boneco (camadas LPC) é o criador do **S3**.
6. **Acompanhantes:** reaproveitados do `GuestCompanion` já existente (criados no RSVP). Sem schema novo.

### Decisão: "código por celular"
O projeto ainda **não tem SMS/WhatsApp** (o custo da API oficial é pendência §12.4 do doc). Em vez de inventar uma integração, o acesso sem senha do S2 reusa o **magic link por e-mail** já testado (`/[slug]/recuperar`). Quando o WhatsApp for aprovado, vira só mais um canal do mesmo fluxo.

### Arquivos
- `prisma/schema.prisma` — 3 campos em `Guest` + model `GuestCredential`.
- `prisma/migrations/20261118142707_add_game_identity/` — migration.
- `src/lib/game/identity.ts` — helpers de identidade (visitante, claim, 1º nome).
- `src/lib/game/webauthn.ts` — WebAuthn (opções + verificação, cookie de desafio).
- `src/app/(public)/[slug]/jogo/{page.tsx,actions.ts,jogo-identity-client.tsx}` — rota gated.
- `src/components/guest/gamified-placeholder.tsx` + `.../[slug]/page.tsx` — botão "Entrar no jogo (beta)".
- `package.json` — deps SimpleWebAuthn.

### Verificações
- Migration aplicada no **voem-dev** (`migrate deploy`); client Prisma regenerado no Windows.
- `tsc --noEmit` → ✅ **0 erros** no projeto (client regenerado zerou os erros falsos de Prisma).
- `eslint` nos arquivos do S2 → ✅ limpo.
- `node scripts/check-server-actions.mjs` → ✅ todos os exports async.
- `vitest` / `build` / Playwright: **não** rodados nesta sessão (vitest não tem binário linux no checkout WSL; build+e2e cobertos pelo CI/pre-push). Rodar no Windows/CI antes do merge.
- Runtime do passkey **não** é verificável sem aparelho real (precisa de HTTPS + biometria) → ver "Como testar no celular".

---

## Como testar no celular (S2)

> **Pré-requisito do passkey:** WebAuthn exige **contexto seguro** = HTTPS **ou** `http://localhost`. O celular não acessa o `localhost` do PC, então há dois caminhos:

### Caminho A — HTTPS público (recomendado para testar no celular)
1. Suba o app num host HTTPS que o celular alcance (deploy de preview no Railway, ou um túnel tipo Cloudflare/ngrok apontando para o `next start` local). O RP ID vira o host desse HTTPS.
2. `NEXT_PUBLIC_APP_URL` = essa URL HTTPS (lembrar: `NEXT_PUBLIC_*` é inlinado → **rebuildar** após mudar). **Não** precisa da flag `ALLOW_LOCALHOST_APP_URL` aqui (não é localhost).
3. No evento de teste, marque **Gamificada** em `/admin/eventos/[id]/configuracoes` (ou SQL no dev: `UPDATE "Event" SET "experienceType"='GAMIFIED' WHERE slug='demo';`).
4. No celular, abra `https://<host>/demo` → botão **"Entrar no jogo (beta)"** → `/demo/jogo`.
5. Fluxos a conferir:
   - **Visitante:** digite um nome → "Entrar como visitante" → deve identificar e mostrar "Olá, <nome>! (visitante)".
   - **Passkey (cadastro):** identifique-se primeiro (visitante ou e-mail) → "Criar passkey neste aparelho" → o celular pede Face ID/digital → "[OK] Passkey criado".
   - **Passkey (login):** saia (apague o cookie) → "Entrar com passkey" → Face ID/digital → entra sem e-mail.
   - **Claim:** com sessão, digite o 1º nome → "Reivindicar meu boneco" → "[OK] Boneco reivindicado".
   - **E-mail:** "Entrar com e-mail" → leva para `/recuperar` (magic link no e-mail do convite).

### Caminho B — só no PC (localhost, sem celular)
1. `.env.local`: `ALLOW_LOCALHOST_APP_URL=true` + `NEXT_PUBLIC_APP_URL=http://localhost:3000` (rebuild). No start aparece o aviso `[startup] ATENÇÃO: localhost liberado — só para dev`.
2. `cmd.exe /c "cd /d G:\Projetos\casamento && pnpm build:local && pnpm exec next start"`.
3. Abra `http://localhost:3000/demo/jogo` no próprio PC (Chrome/Edge com Windows Hello, ou um passkey de software) e rode os mesmos fluxos.

### Não-regressão (clássico)
- `/casamento-exemplo` e `/demo` (CLASSIC) → site clássico idêntico; `/demo/jogo` num evento CLASSIC → **redireciona** para `/demo` (jogo não aparece).

---

## Sprint S1 — Gate de experiência (CLASSIC × GAMIFIED)

**Objetivo:** permitir que cada evento escolha a experiência do convite, sem tocar em nada do site clássico atual.

### O que entrou

1. **Schema (aditivo):** novo enum `ExperienceType { CLASSIC, GAMIFIED }` e novo campo `Event.experienceType` com **default `CLASSIC`**.
2. **Migration** `20261118020228_add_experience_type` — estritamente aditiva:
   ```sql
   -- CreateEnum
   CREATE TYPE "ExperienceType" AS ENUM ('CLASSIC', 'GAMIFIED');
   -- AlterTable
   ALTER TABLE "Event" ADD COLUMN "experienceType" "ExperienceType" NOT NULL DEFAULT 'CLASSIC';
   ```
   Só `CREATE TYPE` + `ADD COLUMN ... DEFAULT`. Nenhum rename/drop. Todo evento existente vira `CLASSIC` automaticamente.
3. **Painel (admin):** nova seção **"Experiência do convite"** em *Configurações* (`/admin/eventos/[id]/configuracoes`) com escolha Clássica × Gamificada (Gamificada marcada como "em construção"). Server action `updateEventExperience`.
4. **Convidado:** evento `GAMIFIED` mostra um **placeholder "em construção"** (`GamifiedPlaceholder`) com nome do casal, data, contagem regressiva e botão de confirmar presença. O jogo RPG chega nos próximos sprints. Evento `CLASSIC` → site clássico **inalterado**.

### Arquivos tocados
- `prisma/schema.prisma` — enum + campo.
- `prisma/migrations/20261118020228_add_experience_type/migration.sql` — migration.
- `src/app/(admin)/admin/eventos/[id]/configuracoes/actions.ts` — `updateEventExperience`.
- `src/app/(admin)/admin/eventos/[id]/configuracoes/page.tsx` — seção `ExperienceForm`.
- `src/app/(public)/[slug]/page.tsx` — early-return para `GAMIFIED`.
- `src/components/guest/gamified-placeholder.tsx` — placeholder (novo).

### Verificações
- `node scripts/check-server-actions.mjs` → ✅ todos os exports async.
- `tsc --noEmit` → ✅ 0 erros (client regenerado no Windows com o novo enum).
- `eslint` nos arquivos tocados → ✅ limpo.
- `vitest run` (no Windows) → ✅ **115/115** testes passando, 13 arquivos.
- **Build de produção** (`next build`) → ✅ compila e passa o TypeScript do build.
- **Render real** (servidor de produção local, banco voem-dev):
  - `/casamento-exemplo` e `/demo` (CLASSIC) → HTTP 200, site clássico completo (Confirmar presença, Locais, Presentes, Memórias…), **nenhum** marcador do modo jogo.
  - `/demo` com `experienceType=GAMIFIED` → HTTP 200, placeholder **"Em construção"** (🎮 + nome do casal + confirmar presença), **sem** o corpo clássico. Revertido para CLASSIC → site clássico idêntico de volta.
- Playwright (e2e): não executado aqui (precisa do app servindo + envs completas); roda no CI Linux.

> ⚠️ **Rodar o app localmente:** `src/instrumentation.ts` bloqueia `NEXT_PUBLIC_APP_URL` com `localhost`/`127.0.0.1` (guarda de produção). Para servir local, use um host não-localhost (ex.: `http://dev.local:3000`) no `.env.local`. Como `NEXT_PUBLIC_*` é **inlinado no build**, é preciso **rebuildar** depois de mudar esse valor. O `.env.local` (gitignored) ganhou, só para dev: `NEXT_PUBLIC_APP_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET` (placeholder) e `AUTH_TRUST_HOST`.

---

## Como testar

### Banco de dev
`.env.local` aponta para o Postgres **voem-dev** no Railway (NÃO é produção). Scripts:
- Migrations: **no WSL** — `node_modules/.bin/dotenv -e .env.local -- node_modules/.bin/prisma migrate deploy`
- Seed: **no Windows** — `cmd.exe /c "cd /d G:\Projetos\casamento && pnpm exec prisma generate && pnpm run db:seed"`
  (no WSL o `tsx` quebra: esbuild é binário win32.)

### Experiência Clássica (não deve ter mudado)
1. Build: `cmd.exe /c "cd /d G:\Projetos\casamento && pnpm build:local"` ; start: `... && pnpm exec next start`.
   (Use `next start` direto, não `pnpm start` — este roda `prisma migrate deploy` que, via `prisma.config.ts`, não lê o `.env.local` e falha por falta de `DATABASE_URL`.)
2. Abrir `/demo` e `/casamento-exemplo` → devem renderizar o site clássico igual a antes
   (hero, contagem regressiva, locais, presentes, etc.). Ambos são `CLASSIC` por padrão.

### Experiência Gamificada (placeholder)
1. No painel: `/admin/eventos/[id]/configuracoes` → seção **Experiência do convite** → marcar **Gamificada** → Salvar.
   (ou via SQL no dev: `UPDATE "Event" SET "experienceType"='GAMIFIED' WHERE slug='demo';`)
2. Abrir `/demo` como convidado → deve mostrar o placeholder **"Em construção"** (🎮) com nome do casal, data e botão de confirmar presença.
3. Voltar para **Clássica** → o site clássico volta idêntico.

### Rodar os testes
- Unit: `cmd.exe /c "cd /d G:\Projetos\casamento && pnpm test"` (Windows; no WSL o rolldown não tem binário linux).
- E2E (Playwright): `pnpm test:e2e` — precisa do app servindo; roda no CI Linux.

---

## Regras que continuam valendo
- **Migrations só aditivas.** O build do Railway roda `prisma migrate deploy` → toda migration na `main` vai para **produção**. Antes de qualquer merge na `main`, o SQL da migration é mostrado ao JOs.
- Nada relacionado ao jogo entra no bundle clássico; o gate é `Event.experienceType`.
- `assets-src/` é fonte, fora do git. Arte derivada (véu, saia, corpete) registrada em `docs/ASSETS-LICENSES.md`.
