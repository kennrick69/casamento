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

## 🟡 MÉDIA — Substituir interim por arte final do casal (landing interativa)

**Status:** integração parcial dos assets reais em andamento.

- **Personagens (interim):** Letícia (`/landing/pingpong.gif`) e José (`/landing/josepingpong.gif`) integrados em 2026-05-10 como GIFs com `mix-blend-mode: multiply`.
- **Cenário (completo):** background (`/landing/ceu.png` — céu pôr do sol + cidade no horizonte + oceano com ondas), sol (`/landing/sol.png`, animação "respirar" 4s ease-in-out) e 4 nuvens (`/landing/nuvem1–4.png`, parallax horizontal contínuo com `vx` variável e zIndex alternado para passar atrás/na frente do sol) integrados em 2026-05-14.

**O que falta:**

1. **Versão transparente do `pingpong.gif`** — o GIF atual da Letícia tem fundo bege opaco. Mesmo com `mix-blend-mode: multiply`, ele sangra um halo bege/marrom contra o novo background (`ceu.png`). Quando a versão transparente subir: substituir o arquivo e **remover** o `mixBlendMode: 'multiply'` da `<img>` interna do `brideRef`.
2. **Versão transparente do `josepingpong.gif`** — mesma situação do José. Por enquanto também usa `mix-blend-mode: multiply`.
3. **Arte definitiva dos personagens** (caso os GIFs ping-pong sejam interim e não final) — substituir. Banner `data-testid="prototype-banner"` já foi removido em 2026-05-14.

**Spec completa:** `docs/future-features/landing-interativa-una-o-casal.md`

---

## 🟡 MÉDIA — Pendências da transição do coração (ProtoScene)

**Status:** transição implementada inline no `ProtoScene.tsx` em 2026-05-15. Quando o usuário aproxima os bonecos, dispara `unite()` → após 800ms inicia a sequência `BIRTH → GROWTH → MERGE → CROSSFADE → DONE` do coração SVG. No `CROSSFADE`, os 2 wrappers de Letícia/José fazem fade-out e o `<img src="/landing/casalvoando.gif">` central faz fade-in. Cenário (céu/sol/nuvens) permanece intacto o tempo todo.

**Componentes idle no repo (não importados por nada):**
- `src/components/landing/HeartFlightTransition.tsx` — substituição de cena inteira via state machine. Mantido como referência.
- `src/components/landing/FallingScene.tsx` — versão simplificada do falling com `framer-motion`. Mantido como referência.
- `src/components/landing/FlyingScene.tsx` — `<img>` puro renderizando o GIF. Mantido como referência.

**Pendências:**

1. **Ping-pong do `casalvoando.gif`** — arquivo atual loopa em forward só, dá um "salto" cada vez que reinicia. Regenerar em vai-e-volta:
   - [ezgif.com](https://ezgif.com) → "Effects → Reverse" → concatenar forward + reverse, OU
   - ffmpeg: `ffmpeg -i casalvoando.gif -filter_complex "[0]reverse[r];[0][r]concat=n=2:v=1:a=0" casalvoando-pp.gif`
   - Substituir `public/landing/casalvoando.gif` quando pronto.
2. **Versão transparente do `pingpong.gif`** — `Downloads/leticia_transparente.gif` pronto. Quando substituir em `public/landing/pingpong.gif`, remover `mixBlendMode: 'multiply'` da `<img>` interna do `brideRef` no `ProtoScene.tsx`. O José ainda fica com `multiply` até também ganhar versão transparente.
3. **Cor exata do céu em `HEART_COLORS.end`** — placeholder `#FFD4B8`. Para o coração "casar" com o céu do GIF do casal voando no fim da transição, atualizar para o hex do pixel central de um frame do `casalvoando.gif`. Não é "costura" como na arquitetura anterior, mas afeta a beleza da fase `MERGE`.
4. **Limpeza opcional dos 3 componentes idle** — `HeartFlightTransition.tsx`, `FallingScene.tsx`, `FlyingScene.tsx` podem ser deletados se a abordagem inline atual ficar.

---

## 🟡 MÉDIA — Configurar e-mail contato@voem.app antes do multi-tenant

**Status:** e-mail de contato nos termos e política usa `contato@joseeleticia.com` (adequado para o piloto de um casal). Para lançamento multi-tenant, criar `contato@voem.app` e configurar forwarding para inbox real.

**O que fazer:**
1. Criar domínio `voem.app` (ou subdomínio) e configurar MX records
2. Criar `contato@voem.app` na plataforma de e-mail
3. Configurar forwarding para o inbox do responsável
4. Atualizar os textos nos arquivos: `src/app/(legal)/termos/page.tsx`, `src/app/(legal)/privacidade/page.tsx` e `src/components/auth/auth-tabs.tsx` (TermsContent/PrivacyContent)

**Gatilho:** antes do onboarding de qualquer casal externo ao projeto piloto.

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
