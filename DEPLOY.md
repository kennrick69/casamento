# Deploy no Railway — Checklist

## Variáveis de ambiente obrigatórias

Configure em: Railway → seu projeto → service do Next.js → Variables

### Obrigatórias (sem elas o app não sobe)

| Variável | Valor |
|----------|-------|
| `DATABASE_URL` | Gerado automaticamente pelo Railway Postgres |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `https://seu-projeto.up.railway.app` |
| `AUTH_TRUST_HOST` | `true` |
| `NEXT_PUBLIC_APP_URL` | `https://seu-projeto.up.railway.app` |

### Para envio de email (obrigatório para RSVP, magic link, etc.)

| Variável | Valor |
|----------|-------|
| `RESEND_API_KEY` | Obtido em resend.com → API Keys |
| `EMAIL_FROM` | `Casamento de Ana e Bruno <noreply@seudominio.com.br>` |

> **Domínio verificado**: o domínio do `EMAIL_FROM` precisa estar verificado no Resend com SPF/DKIM/DMARC.
> Em desenvolvimento, se `RESEND_API_KEY` estiver vazio, os emails são logados no console.

### Para chat em tempo real (opcional — fallback funciona sem)

| Variável | Valor |
|----------|-------|
| `PUSHER_APP_ID` | Painel Pusher → App Keys |
| `PUSHER_KEY` | Painel Pusher → App Keys |
| `PUSHER_SECRET` | Painel Pusher → App Keys |
| `NEXT_PUBLIC_PUSHER_KEY` | Mesmo valor que `PUSHER_KEY` |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | Ex.: `sa1` (São Paulo) |

### Para fotos (storage)

| Variável | Valor |
|----------|-------|
| `RAILWAY_VOLUME_PATH` | `/data/uploads` |

> Configure um Volume no Railway: service → Settings → Volumes → Mount path: `/data/uploads`

### Para cron jobs (backup semanal + lembretes)

| Variável | Valor |
|----------|-------|
| `CRON_SECRET` | `openssl rand -hex 32` |

> Configure crons no Railway: service → Settings → Cron Jobs
> - Backup: `POST /api/cron/backup` com header `x-cron-secret: $CRON_SECRET` — agendamento: `0 3 * * 1` (toda segunda 3h)
> - Lembretes: `POST /api/cron/reminder` com header `x-cron-secret: $CRON_SECRET` — agendamento: `0 8 * * *` (diário 8h)

## O que acontece no `pnpm build` (Railway)

1. `prisma migrate deploy` — aplica o schema no Postgres do Railway
2. `prisma generate` — gera o Prisma Client
3. `next build` — compila o app
4. `tsx prisma/seed.ts` — cria/atualiza os 5 temas e o evento de exemplo (idempotente)

## Primeiro acesso como organizador

1. Acesse `/admin` → clique em "Entrar com email" → informe seu email
2. Verifique o email (magic link enviado via Resend)
3. Crie seu primeiro evento em `/admin/eventos/novo`

## Testar sem email configurado

Em dev ou sem Resend, o magic link aparece nos logs do Railway:
Railway → seu service → Deployments → View logs
