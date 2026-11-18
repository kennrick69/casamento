# Relatório — Modo Gamificado

Branch: `feat/modo-gamificado` · Nada é mergeado na `main` sem aprovação do SQL de migration.
Última atualização: 2026-11-17.

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
