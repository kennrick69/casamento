# Deploy no Railway

## Estado atual (maio 2026)

- **Schema**: migration `20260506015212_init` aplicada — todas as tabelas existem no Railway
- **Temas**: os 5 temas (rústico, clássico, minimalista, boho, praiano) foram seeded antes do início das fases
- **Variáveis**: configuradas no Railway Raw Editor (ver lista abaixo)

## O que acontece em cada deploy (`pnpm build`)

```
prisma migrate deploy    # aplica migrations novas (noop se já aplicadas)
prisma generate          # gera o Prisma Client
next build               # compila o app
```

O seed **não roda em produção**. Dados de exemplo (casamento-exemplo, Ana e Bruno,
convidados de teste) existem apenas no banco local.

## Repovoar banco local com dados de exemplo

```bash
pnpm db:seed:dev
```

Roda `prisma/seed.ts` com `.env.local`. Idempotente — usa `upsert`, pode rodar
quantas vezes quiser.

## Variáveis de ambiente no Railway

Configuradas via Settings → Variables → Raw Editor:

| Variável | Notas |
|----------|-------|
| `DATABASE_URL` | Injetado automaticamente pelo Postgres do Railway |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | URL pública do deploy (ex.: `https://casamento-xxx.up.railway.app`) |
| `AUTH_TRUST_HOST` | `true` (obrigatório atrás de proxy reverso) |
| `NEXT_PUBLIC_APP_URL` | Mesma URL do `NEXTAUTH_URL` |
| `RESEND_API_KEY` | Obtido em resend.com → API Keys |
| `EMAIL_FROM` | `Casamento de … <noreply@seudominio.com.br>` (domínio verificado no Resend) |
| `PUSHER_APP_ID` | Dashboard Pusher → App Keys |
| `PUSHER_KEY` | Dashboard Pusher → App Keys |
| `PUSHER_SECRET` | Dashboard Pusher → App Keys |
| `NEXT_PUBLIC_PUSHER_KEY` | Mesmo valor que `PUSHER_KEY` |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | Ex.: `sa1` (São Paulo) |
| `STORAGE_PROVIDER` | `railway` |
| `RAILWAY_VOLUME_PATH` | `/data/uploads` (Volume montado neste path no service) |
| `CRON_SECRET` | `openssl rand -hex 32` |
| `NODE_ENV` | `production` (Railway define automaticamente) |

## Cron jobs

Configurar em Railway → service → Settings → Cron Jobs:

| Endpoint | Cron | Header |
|----------|------|--------|
| `POST /api/cron/backup` | `0 3 * * 1` (segunda 3h) | `x-cron-secret: $CRON_SECRET` |
| `POST /api/cron/reminder` | `0 8 * * *` (diário 8h) | `x-cron-secret: $CRON_SECRET` |

## Setup local (novo desenvolvedor)

```bash
pnpm install
# Instalar o git hook pre-push (bloqueia push se build/checks falharem):
cat > .git/hooks/pre-push << 'HOOK'
#!/bin/sh
set -e
REQUIRED_MAJOR=20
ACTUAL_MAJOR=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$ACTUAL_MAJOR" -lt "$REQUIRED_MAJOR" ]; then
  echo "❌  Node 20+ necessário. Versão atual: $(node -v)"; exit 1
fi
TZ=UTC pnpm test
node scripts/check-server-actions.mjs
pnpm typecheck
pnpm lint
pnpm build:local
HOOK
chmod +x .git/hooks/pre-push
```

O hook roda automaticamente em `git push` e valida: versão do Node, testes unitários em
UTC (simula CI), exports async, TypeScript, ESLint e build Next.js. `TZ=UTC` é essencial
para pegar testes flaky dependentes de timezone antes que cheguem ao CI.

## Primeiro acesso como organizador

1. Acesse `/admin` → "Entrar com email" → informe seu email
2. Se Resend estiver configurado: chegará magic link por email
3. Se Resend **não** estiver configurado: o link aparece nos logs do Railway
   (service → Deployments → View logs — procure `ConsoleEmailProvider`)
