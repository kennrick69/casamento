# Guia Operacional — Administração da plataforma

## Arquitetura

```
Next.js 16 App Router (Turbopack)
  ├── Railway (servidor + PostgreSQL + volume persistente)
  ├── Resend (emails transacionais)
  ├── Pusher (WebSocket / chat em tempo real)
  ├── Cloudflare Turnstile (anti-bot no cadastro)
  └── Backblaze B2 (backup off-site — opcional)
```

---

## Subir o servidor (Railway)

O deploy é automático via `git push origin main`. O hook de pre-push:
1. Roda `pnpm test` (115 unit tests)
2. Roda `pnpm typecheck`
3. Roda `pnpm lint`
4. Roda `pnpm build:local` (build Turbopack)

Se qualquer etapa falhar, o push é bloqueado.

### Variáveis de ambiente obrigatórias

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | PostgreSQL Railway |
| `AUTH_SECRET` | Secret do NextAuth (gerado com `openssl rand -hex 32`) |
| `NEXT_PUBLIC_APP_URL` | URL pública (ex: `https://casamento.up.railway.app`) |
| `CRON_SECRET` | Secret para autorizar chamadas aos crons |
| `RESEND_API_KEY` | API key do Resend para emails |
| `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `NEXT_PUBLIC_PUSHER_KEY`, `NEXT_PUBLIC_PUSHER_CLUSTER` | Pusher |
| `RAILWAY_VOLUME_PATH` | Caminho do volume persistente (ex: `/data`) |

### Variáveis opcionais

| Variável | Descrição |
|----------|-----------|
| `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` | Monitoramento de erros |
| `B2_KEY_ID`, `B2_APPLICATION_KEY`, `B2_BUCKET`, `B2_ENDPOINT` | Backup off-site Backblaze B2 |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` | Captcha Cloudflare |
| `SPOTIFY_CLIENT_ID` + `SPOTIFY_CLIENT_SECRET` | Busca de músicas |

---

## Migrations do banco

Em deploy, as migrations são aplicadas pelo railway-start script automaticamente.

Para aplicar manualmente:
```bash
pnpm prisma migrate deploy
```

Para criar uma nova migration localmente:
```bash
pnpm prisma migrate dev --name nome_da_migration
```

---

## Crons configurados no Railway

| Cron | Schedule | Endpoint | Descrição |
|------|----------|----------|-----------|
| Backup | `0 3 * * *` (3h UTC) | `POST /api/cron/backup` | Backup diário de todos os eventos |
| Reminder | `0 8 * * *` (8h UTC) | `POST /api/cron/reminder` | Emails de lembrete 7 e 1 dia antes |
| Retention | `0 4 1 * *` (1º de cada mês) | `POST /api/cron/retention` | Aviso 30 dias + arquiva eventos >1 ano |
| Digest | `0 7 * * *` (7h UTC) | `POST /api/cron/digest` | Resumo diário (todos os dias) + semanal (só segundas) |

Todos exigem header `x-cron-secret: $CRON_SECRET`.

---

## Restaurar backup

### Do volume Railway
```bash
# Os backups ficam em $RAILWAY_VOLUME_PATH/backups/<slug>/backup-YYYY-MM-DD.json
ls $RAILWAY_VOLUME_PATH/backups/
```

### Do Backblaze B2 (se configurado)
```bash
# Lista arquivos no bucket
aws s3 ls s3://$B2_BUCKET/backups/<slug>/ --endpoint-url $B2_ENDPOINT

# Download de um arquivo
aws s3 cp s3://$B2_BUCKET/backups/<slug>/backup-2026-01-01.json ./restore.json \
  --endpoint-url $B2_ENDPOINT
```

### Importar dados do JSON
O JSON de backup contém `guests`, `journeyItems`, `gifts`. Para reimportar, use o importador de planilha ou crie um script Prisma custom.

---

## Debugar problemas

### Ver logs
- Railway Dashboard → Deployments → Logs (streaming em tempo real)
- Sentry (se configurado): rastreamento de erros com stack trace

### Health checks
- `GET /api/health` — status público: DB latência, storage, memória
- `GET /admin/saude` — painel interno com histórico e detalhes
- `GET /status` — página pública de status

### Banco de dados
```bash
# Conectar via Railway CLI
railway run pnpm prisma studio

# Verificar integridade
pnpm tsx scripts/db-integrity.ts
```

### Erros de email (Resend)
- Verificar logs no dashboard Resend
- `ConsoleEmailProvider` é usado em desenvolvimento (sem API key)

---

## DEV_TOOLS — desabilitar antes de ir ao mercado

A rota `/admin/dev-tools` expõe tokens de verificação e logs sensíveis.

Para desabilitar:
```bash
# Railway → Variables → Add
DEV_TOOLS_ENABLED=false
```

A rota retorna 404 automaticamente. Não requer redeploy.

---

## Monitoramento de segurança

- AuthLog em `/admin/dev-tools` (quando habilitado)
- Rate limiting aplicado em: login, signup, reset senha, RSVP, upload de foto
- Turnstile em cadastro e reset (bypass automático sem key em dev)
- Logs de IP em todas as ações de autenticação

---

## Escalar para múltiplos casais

A plataforma é multi-tenant por slug desde o início. Para onboarding de um novo casal:

1. Casal cria conta em `/` → onboarding cria evento automaticamente
2. Slug customizável em configuracoes → Avançado
3. Não requer nenhuma ação da operação

Para desabilitar o auto-signup (modo convidado-only):
- Ainda não implementado — futuro: variável `SIGNUP_ENABLED=false`
