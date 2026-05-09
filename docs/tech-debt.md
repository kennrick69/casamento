# Dívidas Técnicas

Documentação viva. Atualizar ao criar dívida nova ou pagar dívida existente.

---

## 🔴 ALTA — Desabilitar /admin/dev-tools antes de virar produto comercial

**Status:** página ativa, acessível a qualquer usuário autenticado.

**O que tem lá:** tokens de verificação em texto puro (clicáveis), hashes de reset de senha (mascarados), e todos os AuthLogs. Não deve ser exposto a clientes finais.

**Como desabilitar:** configurar `DEV_TOOLS_ENABLED=false` no Railway (ou qualquer env). A página retorna 404 automaticamente.

**Gatilho:** antes de onboarding de qualquer casal externo ao projeto piloto.

---

## 🟡 MÉDIA — Substituir hero minimalista por ilustração final

**Status:** hero atual usa tipografia + gradiente CSS (Voem., céu dia/noite).

**O que falta:** ilustração do casal voando (aquarela digital, versões dia/noite, formatos horizontal/vertical/quadrado para diferentes viewports). Aguardando decisão de execução: Midjourney + ilustrador freelancer.

**Quando fazer:** antes do lançamento público da plataforma para outros casais.

---

## ✅ Verificação de email obrigatória — IMPLEMENTADO (2026-05-08)

`emailVerified` propagado no JWT via `authorize` + `jwt` callback. Middleware bloqueia `/admin/*` para usuários não-verificados em produção (`NODE_ENV === "production"`). Bypass via cookie `email-just-verified` (60s) evita loop após clicar no link. Botão "Acessar sem confirmar" removido de `/verify-email`. Dev local não é afetado.

---

## 🔴 ALTA — Migrar storage para Cloudflare R2

**Status:** Ativo — em uso o volume persistente do Railway.

**Gatilho de migração:** o que vier primeiro:
- 100 fotos no sistema
- 30 dias antes do evento

**Risco:** volume Railway não é CDN, custo de egress pode subir, e não há redundância automática.

**Como migrar:**
1. Criar bucket R2 na Cloudflare
2. Implementar `src/lib/storage/cloudflare-r2.ts` implementando `StorageProvider`
3. **Ligar leitura de `STORAGE_PROVIDER` em `src/lib/storage/index.ts`** — hoje o código ignora essa variável e usa `RailwayVolumeStorage` hardcoded; ao migrar, mudar para: `process.env.STORAGE_PROVIDER === "r2" ? new CloudflareR2Storage() : new RailwayVolumeStorage()`
4. Definir `STORAGE_PROVIDER=r2` nas env vars do Railway (variável já documentada em `.env.example`)
5. Migrar fotos existentes do volume para o R2 com script
6. Remover `RailwayVolumeStorage` após validar

**Camada de abstração:** `StorageProvider` em `src/lib/storage/types.ts` — a troca de implementação não requer mudanças fora de `src/lib/storage/`.

---

## ✅ Gateway de pagamento — IMPLEMENTADO com Mercado Pago (2026-05-09)

**Status:** Mercado Pago integrado via SDK oficial (v2.x). Credentials criptografadas com AES-256-GCM por evento. Webhook em `/api/webhooks/mercadopago` com verificação HMAC.

**Configuração:** cada casal configura suas próprias credentials em `/admin/eventos/[id]/configuracoes/pagamentos`.

---

## 🟡 MÉDIA — Lembretes via WhatsApp

**Status:** não iniciado.

**O que falta:** integrar Twilio ou WhatsApp Business API, criar templates de mensagem aprovados pelo Meta.

**Alternativa atual:** lembretes por email via Resend (implementar na Fase 5).

---

## 🟡 MÉDIA — Remover campos legados de local no model Event

**Status:** campos mantidos para compatibilidade retroativa após migração para `EventLocation`.

**Campos legados:** `Event.ceremonyLocation`, `Event.ceremonyAddress`, `Event.receptionLocation`, `Event.receptionAddress`, `Event.mapsLink`, `Event.dresscode`.

**Pré-condição para remover:**
1. Confirmar que toda leitura de local foi migrada para `EventLocation` (emails, roteiro, landing)
2. Confirmar que o formulário em `configuracoes` (step 2 / LocationForm) foi substituído pelo admin `/locais`
3. Criar migration que remove os campos do schema
4. Atualizar `.env.example` se necessário

**Impacto atual:** Duplicação de dados entre campos planos e `EventLocation`. A migration de dados em `20260507120000_add_event_location` popula `EventLocation` a partir dos campos planos. O admin `/locais` é a fonte de verdade para novos eventos.

---

## 🟡 MÉDIA — Visibilidade restrita de locais (isPublic=false)

**Status:** campo `isPublic` existe no schema e no admin. Validação de acesso não implementada — todos os locais com `isPublic=false` ainda aparecem para todos.

**Pré-condição:** sistema de tags/grupos de convidados (Fase 3+).

**Implementação futura:** em `src/app/(public)/[slug]/locais/page.tsx`, filtrar `isPublic=true` OR (convidado tem tag relevante).

---

## 🟡 MÉDIA — Substituir greybox por arte final do casal (landing interativa)

**Status:** landing `/` usa bonecos greybox (CSS puro). Arte real aguardando produção com Midjourney.

**O que falta:** assets finais (6 imagens de personagens + cenário) gerados e aprovados pela noiva. Quando prontos, substituir os divs greybox no `ProtoScene` pelas imagens reais e remover o banner `data-testid="prototype-banner"`.

**Spec completa:** `docs/future-features/landing-interativa-una-o-casal.md`

**Quando fazer:** após conclusão do Bloco A e aprovação visual com a noiva.

---

## 🟡 MÉDIA — Atualizar GitHub Actions de Node 20 para Node 22

**Status:** CI usa `node-version: 20` em todos os jobs.

**Deadline:** antes de junho/2026 — GitHub Actions encerra suporte a Node 20 LTS nessa data.

**Como fazer:** em `.github/workflows/ci.yml`, trocar `node-version: 20` por `node-version: 22` nos 3 jobs (`unit`, `typecheck`, `smoke`). Testar localmente com `node --version` se necessário.

---

## 🟡 MÉDIA — Criar conta Sentry e configurar DSN

**Status:** código implementado (M4.7), sem DSN configurado.

**O que falta:** no Railway, definir:
- `SENTRY_DSN` — DSN do projeto (server-side)
- `NEXT_PUBLIC_SENTRY_DSN` — mesmo valor (client-side)
- `SENTRY_ORG` / `SENTRY_PROJECT` — opcionais, para upload de source maps

**Criar em:** sentry.io → New Project → Next.js → Client Keys (DSN). Plano grátis: 5k events/mês.

**Quando:** antes do onboarding de casais externos.

---

## 🟡 MÉDIA — Configurar Backblaze B2 para backup off-site

**Status:** código implementado (M4.6), env vars ausentes no Railway.

**O que falta:** no Railway, definir:
- `B2_KEY_ID` — Application Key ID
- `B2_APPLICATION_KEY` — Application Key (secret)
- `B2_BUCKET` — nome do bucket (ex.: `casamento-backups`)
- `B2_ENDPOINT` — S3-compatible endpoint (ex.: `https://s3.us-east-005.backblazeb2.com`)

**Quando:** antes do onboarding de casais externos. Sem B2, só o volume Railway (60 dias) protege os dados.

**Verificar:** /admin/saude/backups mostra status verde para ambas as storages quando configurado.

---

## ✅ Concluídas

*(Mover itens aqui quando pagos, com data.)*
