# Playbook — Onboarding de Novo Casal

**Tempo estimado:** 2–3 horas por casal  
**Pré-requisito:** acesso à conta Railway do operador

---

## 0. O que pedir do casal antes de começar

| Item | Obrigatório | Onde usar |
|------|-------------|-----------|
| Nomes dos noivos | Sim | `coupleNames` no evento |
| Data e hora da cerimônia | Sim | `ceremonyDate` |
| Domínio desejado (ex: ana-e-carlos.casamento.app) | Recomendado | CNAME Railway |
| Foto de capa (JPEG/WebP, mín 1400px de largura) | Recomendado | `coverImageKey` |
| Tema preferido | Não | Configurável depois |
| Modo de pagamento (Confiança / PIX / Mercado Pago) | Não | Configurável depois |
| Chave PIX (se PIX ou MP) | Não | Configurável depois |
| Credentials Mercado Pago (se MP) | Não | Configurável depois |
| Lista de convidados (CSV) | Não | Importar depois |

---

## 1. Criar projeto no Railway

1. Acesse [railway.app](https://railway.app) → New Project
2. **Deploy from GitHub repo** → selecione `kennrick69/casamento`
3. Railway cria automaticamente: servidor Node + PostgreSQL
4. Anote a URL gerada (ex: `casamento-abc123.up.railway.app`)

---

## 2. Configurar domínio

**Opção A — Domínio próprio do casal:**
```
1. Railway → Settings → Domains → Custom Domain → digitar o domínio
2. No painel DNS do casal: adicionar CNAME apontando para o Railway
3. Aguardar propagação (até 48h)
```

**Opção B — Subdomínio na conta do operador (mais rápido):**
```
1. Usar URL padrão do Railway: casamento-abc123.up.railway.app
2. Ou criar subdomínio em domínio próprio do operador
```

---

## 3. Variáveis de ambiente

No Railway → Variables, configure:

### Obrigatórias

```bash
DATABASE_URL            # gerada automaticamente pelo Railway PostgreSQL
AUTH_SECRET             # openssl rand -base64 32
NEXT_PUBLIC_APP_URL     # https://[dominio-do-casal]
CRON_SECRET             # openssl rand -hex 32
RESEND_API_KEY          # resend.com → API Keys
EMAIL_FROM              # "Casamento de Ana e Carlos <noreply@seudomain.com>"
RAILWAY_VOLUME_PATH     # /data
```

### Pusher (para chat ao vivo e live updates)

```bash
PUSHER_APP_ID           # dashboard.pusher.com → App Keys
PUSHER_KEY              # mesma key (server)
PUSHER_SECRET
NEXT_PUBLIC_PUSHER_KEY  # mesma key (cliente)
NEXT_PUBLIC_PUSHER_CLUSTER  # ex: sa1 (South America)
```

### Criptografia (obrigatória para Mercado Pago)

```bash
ENCRYPTION_KEY          # openssl rand -hex 32
```

### Opcionais

```bash
SENTRY_DSN                      # monitoramento de erros
NEXT_PUBLIC_SENTRY_DSN          # mesmo DSN (cliente)
NEXT_PUBLIC_TURNSTILE_SITE_KEY  # anti-bot no cadastro
TURNSTILE_SECRET_KEY
SPOTIFY_CLIENT_ID               # busca de músicas
SPOTIFY_CLIENT_SECRET
B2_KEY_ID                       # backup off-site
B2_APPLICATION_KEY
B2_BUCKET
B2_ENDPOINT
```

---

## 4. Configurar crons no Railway

Railway → Settings → Cron Jobs → Add cron:

| Nome | Schedule | Comando |
|------|----------|---------|
| Backup | `0 3 * * *` | `curl -X POST $NEXT_PUBLIC_APP_URL/api/cron/backup -H "x-cron-secret: $CRON_SECRET"` |
| Reminder | `0 8 * * *` | `curl -X POST $NEXT_PUBLIC_APP_URL/api/cron/reminder -H "x-cron-secret: $CRON_SECRET"` |
| Retention | `0 4 1 * *` | `curl -X POST $NEXT_PUBLIC_APP_URL/api/cron/retention -H "x-cron-secret: $CRON_SECRET"` |
| Digest | `0 7 * * *` | `curl -X POST $NEXT_PUBLIC_APP_URL/api/cron/digest -H "x-cron-secret: $CRON_SECRET"` |

---

## 5. Primeiro deploy

O push para `main` dispara deploy automático via Railway. Ele:
1. Instala dependências (`pnpm install`)
2. Roda `prisma migrate deploy` (aplica todas as migrations)
3. Roda `next build`
4. Sobe o servidor

Aguardar ≈ 3–5 minutos. Verificar em Railway → Deployments.

---

## 6. Primeiro acesso — criar conta do casal

1. Acesse `https://[dominio]/`
2. Clique em **Criar conta**
3. Preencha dados do casal (nome, email, senha)
4. Verifique o email recebido
5. Complete o onboarding wizard:
   - Perfil: nome dos noivos, foto
   - Evento: título, data, slug (ex: `ana-e-carlos`)
   - Tema: escolha visual
   - Locais: cerimônia, recepção
   - Convidados: adicione 1–2 para testar

---

## 7. Configurações recomendadas pós-onboarding

### 7.1 Modo de pagamento

`/admin/eventos/[id]/configuracoes/pagamentos`:
- Escolha o modo (Confiança / PIX / Mercado Pago)
- Configure chave PIX se aplicável
- Para Mercado Pago: siga o tutorial na própria tela

### 7.2 Publicar o evento

`/admin/eventos/[id]/configuracoes` → **Publicar evento**
- Evento muda de DRAFT para PUBLISHED
- URL pública fica acessível

### 7.3 Importar lista de convidados (opcional)

`/admin/eventos/[id]/convidados/importar`:
- Upload do CSV (template disponível na página)
- Mapeie as colunas
- Importe

### 7.4 Enviar save-the-dates

`/admin/eventos/[id]/save-the-date`:
- Gera PDFs com QR code personalizado por convidado
- Download em ZIP

### 7.5 Configurar digest de email (opcional)

`/admin/eventos/[id]/notificacoes` → seção Resumo por email:
- Recomendado: Semanal (um resumo toda segunda-feira)

---

## 8. Entrega ao casal

Envie ao casal:
1. URL do painel admin: `https://[dominio]/admin`
2. URL pública do convite: `https://[dominio]/[slug]`
3. Email e senha criados
4. Link para `docs/USER-GUIDE.md` (ou versão PDF)

---

## 9. Checklist final antes da entrega

- [ ] Deploy sem erros no Railway
- [ ] Email de verificação chega (teste com email real)
- [ ] Landing page pública carrega com tema correto
- [ ] RSVP funciona (teste você mesmo)
- [ ] Foto de capa configurada
- [ ] Slug personalizado (não o padrão gerado)
- [ ] Modo de pagamento configurado
- [ ] Chave PIX visível na página de presentes (se TRUST/PIX_PROOF)
- [ ] Crons configurados no Railway
- [ ] DEV_TOOLS_ENABLED=false se for casal externo

---

## Troubleshooting comum

**Email não chega:**
- Verificar `EMAIL_FROM` está com domínio verificado no Resend
- Testar com o email de verificação de conta

**Erro 500 no deploy:**
- Verificar logs no Railway → Deployments → Logs
- Mais comum: `DATABASE_URL` errada ou migração falhou

**Chat em tempo real não funciona:**
- Verificar variáveis Pusher configuradas corretamente
- Verificar cluster (ex: `sa1` para Brasil)

**Mercado Pago não salva:**
- `ENCRYPTION_KEY` não configurada — gere e adicione no Railway
