# HANDOFF — Ponto de Continuidade

> Criado em 2026-05-09 para retomada do projeto em nova máquina.
> Ler este arquivo antes de qualquer outra coisa.

---

## Estado atual do projeto

### Última sprint — ProtoScene pixel art heart (2026-05-15)

Migração da estética do coração no `ProtoScene.tsx` da v1 (SVG suave + crossfade) para o padrão da HeartFlightTransition v2 (pixel art 16-bit). **Todo o comportamento de drag, detecção de proximidade e threshold de união foi preservado integralmente.**

**O que mudou:**
- `HeartPhase`: `IDLE | BIRTH | GROWTH | MERGE | CROSSFADE | DONE` → `IDLE | BIRTH | BEAT | POWER_UP | SNAP`
- Coração SVG com curvas Bézier → sprite pixel 15×13 px (`PixelHeart`, `shape-rendering: crispEdges`)
- Crescimento contínuo com easing → 6 steps discretos sem easing (`GROW_STEPS_PROTO`: scales 1.5→7)
- 1 cor com crossfade → 5 paletas ciclando (`POWER_UP_PALETTES`: vermelho→dourado→teal→roxo→rosa)
- Crossfade 400ms → SNAP instantâneo (1 frame)
- 32 partículas pixel explodem no SNAP (`PixelParticle`)
- `unite()` refatorado de cascade de `setTimeout` para `async/await + cancelledRef`
- `HeartFlightTransition.tsx` atualizado para v2 (arquivo idle, não importado em produção)
- `HeartFlightTransition.README.md` criado em `src/components/landing/`

**Pendências remanescentes (ver `docs/tech-debt.md`):**
1. Ping-pong do `casalvoando.gif` (atualmente loopa forward só)
2. Versões transparentes dos GIFs dos personagens (remove `mix-blend-mode: multiply`)

---

### Última milestone implementada: M5.Z — QA Dashboard

Dashboard de QA built-in em `/admin/qa` com:
- 52 itens de checklist agrupados em 8 seções
- Criação de runs de teste com progresso persistido no banco
- Relatório copiável (Markdown) com resumo pass/fail/skip
- Modelo Prisma `QATestRun` com campo `results Json`

### Última sprint — Transição do coração interna ao ProtoScene (2026-05-15)

**Correção da abordagem anterior.** A versão anterior do mesmo dia trocava a cena inteira via `HeartFlightTransition` cobrindo o cenário inteiro com `FlyingScene`. Não era o desejado: a intenção sempre foi trocar **só os personagens** (Letícia + José → casalvoando.gif), mantendo o cenário (céu/sol/nuvens) intacto.

**Estado atual:**
- `src/app/page.tsx` volta a renderizar `<ProtoScene />` direto (server component com `export const metadata`).
- `src/components/landing/LandingClient.tsx` removido.
- `ProtoScene.tsx` ganhou a transição do coração **inline**:
  - Tipo `HeartPhase` (`IDLE → BIRTH → GROWTH → MERGE → CROSSFADE → DONE`).
  - Componente `Heart` SVG inline (centro horizontal, `top: 280px`).
  - `unite()` reescrito: após os 800ms de aproximação, dispara `setTimeout` em cascata pras fases do coração. Fly loop interno removido (o `casalvoando.gif` é o que anima).
  - `<img src="/landing/casalvoando.gif">` no centro, fade-in quando `heartPhase === 'CROSSFADE' | 'DONE'`.
  - Opacity dos wrappers `brideRef` e `groomRef` faz fade-out simultâneo.
  - `reset()` zera `heartPhase`.

**Componentes idle no repo** (criados, não usados): `HeartFlightTransition.tsx`, `FallingScene.tsx`, `FlyingScene.tsx`. Mantidos como referência.

**Pendências (ver `docs/tech-debt.md`):**

1. **Ping-pong do `casalvoando.gif`** — atualmente loopa em forward só, o "salto" é visível. Regerar em vai-e-volta via [ezgif.com](https://ezgif.com) ou ffmpeg, substituir `public/landing/casalvoando.gif`.
2. **Versão transparente do `pingpong.gif`** — `Downloads/leticia_transparente.gif` pronto. Quando substituir, remover `mix-blend-mode: multiply` da Letícia no `ProtoScene.tsx`.

---

### Sprint anterior — Landing integrada com transição do coração (REVERTIDA no mesmo dia)

---

### Sprint anterior — Arquitetura de transição da landing (2026-05-15)

3 componentes novos em `src/components/landing/`, **ainda não integrados** em `src/app/page.tsx` — o `ProtoScene` atual segue ativo até a integração final.

1. **`HeartFlightTransition.tsx`** — container/máquina de estados de 7 fases (`IDLE → UNION_PAUSE → HEART_BIRTH → HEART_GROWTH → HEART_MERGE → SKY_CROSSFADE → FLYING`) que orquestra a passagem entre uma cena de queda e uma cena de voo. Coração SVG cresce/explode no centro durante a transição, cobrindo o cut. Respeita `prefers-reduced-motion`. Pré-monta a `flyingScene` em `opacity:0` desde o início pra warm-up do `<video>`. Veio direto do briefing do usuário (Downloads/HeartFlightTransition.tsx); ESLint disable da regra `react-hooks/set-state-in-effect` adicionado no topo porque a máquina de estados precisa sincronizar `trigger` externo → `setPhase` (caso correto da regra).

2. **`FallingScene.tsx`** — Letícia + José em lados opostos, ambos draggáveis via `framer-motion` (`<motion.div drag />`). Loop de `requestAnimationFrame` calcula distância euclidiana entre os centros dos `getBoundingClientRect()`; quando < 80px, dispara `onHandsUnited` uma única vez. Altura inicial aleatória (25–45%). Props pra trocar `src` dos GIFs e desligar o `mix-blend-mode: multiply` quando subir a versão transparente.

3. **`FlyingScene.tsx`** — `<video>` com `autoPlay muted playsInline preload="auto"` (`playsInline` é crítico em iOS). `.load() + .play()` no mount pra warm-up. **Loop ping-pong** (forward → reverse → forward) implementado em JS via manipulação de `currentTime` em rAF — evita `playbackRate < 0` que não funciona em Safari. Pode ser desligado com `pingPong={false}` se o asset já vier com ping-pong embutido no MP4.

**Pendências antes de integrar em `src/app/page.tsx`:**

1. **Cor exata do céu** do MP4 final do voo → atualizar `COLORS.heartEnd` e `COLORS.skyTarget` em `HeartFlightTransition.tsx` (pixel-picker em frame central). Atualmente `#FFD4B8` placeholder.
2. **Asset `public/casal-voando.mp4`** — escolher e copiar de `Downloads/` (candidatos: `casalvoando.gif` 3.9 MB, `The_two_characters_fly_together*.mp4` 486 KB, `flying_like_a_superman*.mp4` 287 KB). Briefing pede MP4 < 2 MB.
3. **Versão transparente do `pingpong.gif`** — `Downloads/leticia_transparente.gif`. Quando substituir em `public/landing/`, passar `brideBlendMode="normal"` no `<FallingScene>`.

Ver `docs/tech-debt.md` → item "Integrar a nova arquitetura de transição (HeartFlightTransition)" pra exemplo de uso completo.

---

### Sprint anterior — Cenário final da landing (2026-05-14)

Integração de assets visuais finais no `ProtoScene.tsx`, ainda como cena monolítica (anterior à refatoração de 2026-05-15):

- **Background `ceu.png`** (céu pôr do sol + cidade + oceano com ondas) substituindo gradiente CSS e SVG inline de mar/horizonte.
- **Sol cartoon** (`sol.png`, ~340px) com animação "respirar" via Web Animations API, posicionado no canto superior direito atrás de todas as nuvens.
- **4 nuvens** (`nuvem1–4.png`) com parallax horizontal contínuo (vx variado, ~30–60s travessia). Limitadas aos 3/4 superiores da cena. Estado-aware: sobem durante `falling`, andam na horizontal durante `flying`.
- **Pan vertical do background** durante a queda (de `center 0%` até `center 100%`) revelando a cidade conforme caem.
- **Splash de água + fade-out dos bonecos** no `fail()` (countdown zerou sem união): 14 gotinhas grandes + 8 spray, animações via Web Animations API.
- **Banner "🚧 Protótipo · arte final em produção" removido**.

**Commits:** `1241ae1`, `fecbc4b`, `22729c7`, `79a4ba2`, `7be5c02`, `3b4cc62`, `5b110f9`, `ddb3201`.

---

### Sprint anterior — Landing com GIFs animados dos personagens (2026-05-10)

Substituição parcial do `ProtoScene` (cena interativa "una o casal" da landing) pelos GIFs reais dos personagens, mantendo o banner "🚧 Protótipo · arte final em produção" até a arte definitiva chegar.

1. **GIF da Letícia integrado** — `public/landing/pingpong.gif` substitui as 5 divs CSS greybox que compunham a noiva. Wrapper `brideRef` mantido intocado para preservar o drag custom; `<img>` interno com `pointer-events:none + draggable={false} + mix-blend-mode:multiply` para integrar fundo claro do GIF com o gradiente.

2. **Bonecos aumentados 2.5x** — wrapper passa de 50×90 para 125×225 px para dar peso visual proporcional à arte real. Drag clamp passa a usar `offsetWidth/Height` em vez de hardcoded 330/450 — funciona corretamente para qualquer tamanho de boneco.

3. **GIF do José integrado + posições invertidas** — `public/landing/josepingpong.gif` substitui o boneco CSS do José. **José assume a esquerda (left:60) e Letícia passa para a direita (right:60)**. A Letícia ganha `transform: scaleX(-1)` para ficar espelhada e encarar o José. `bridePos`/`groomPos`, `unite()` e `reset()` reescritos para refletir as novas posições.

4. **Bug do drag corrigido** — `checkUnion` threshold subiu de 70 → 140 no commit 21c33dc, mas as posições iniciais têm `dx=135`, então o `unite()` disparava no primeiro pixel de drag e os bonecos "fugiam" ao toque. Threshold final: **100** (exige ~35px de aproximação para disparar o voo).

5. **Bonecos se abraçam no voo** — posições finais do `unite()` passam de groom.x=65/bride.x=190 (gap=0) para groom.x=90/bride.x=165 (**sobreposição visual de 50px**).

**Commits:** `33f26e1` · `21c33dc` · `ceaa8d0` · `fba15c5` · `a7a3ce1`

**Tech-debt remanescente:** banner "Protótipo · arte final em produção" segue ativo (`ProtoScene.tsx` `data-testid="prototype-banner"`). Próximo passo é decidir se os GIFs ping-pong são a arte definitiva ou interim — se interim, falta a versão final (estilo igual mas talvez com cenário/luz integrada).

---

### Sprint anterior — QA de autenticação (2026-05-09)

1. **Zero cookies antes do login completo** — removido `signIn()` do `signupAction`; fluxo agora é signup → email → `/verify-email?email=xxx` (sem sessão) → clicar no link → `/login?verified=1` → usuário faz login → cookie de sessão criado. Elimina o bug de sessão preematura após Cmd+Shift+R na tela de verificação.

2. **Aceite de termos no cadastro** — `signupAction` agora salva `termsVersion`, `privacyVersion`, `termsAcceptedAt`, `privacyAcceptedAt` na criação do usuário. Novos usuários nunca veem `/aceitar-termos` no primeiro login; a página persiste apenas para re-aceite quando as versões mudam.

3. **Termos/Privacidade como modal no formulário de cadastro** — componentes `LegalModal`, `TermsContent` e `PrivacyContent` inline em `src/components/auth/auth-tabs.tsx`. Dois checkboxes no form antes do botão "Criar conta". Implementado sem biblioteca externa (useEffect para Escape, backdrop click fecha).

4. **Ajustes no conteúdo dos termos** — removido badge "TODO: revisão jurídica", removido display de versão (`v{TERMS_VERSION}`), instrução de email de exclusão adicionada ao texto dos termos.

5. **Email de contato padronizado** — todos os textos legais (termos, privacidade, modal de cadastro) usam `contato@joseeleticia.com`. Dívida técnica documentada em `docs/tech-debt.md` para migrar para `contato@voem.app` antes do multi-tenant.

6. **Botão "Sair" corrigido** — substituídos todos os `<Link href="/api/auth/signout">` por `<SignOutButton />` (`src/components/admin/sign-out-button.tsx`), componente client-side que chama `signOut({ callbackUrl: "/" })` do next-auth/react.

### Bugs conhecidos pendentes

- Nenhum bug crítico conhecido em produção no momento.
- `/admin/dev-tools` está acessível a qualquer usuário autenticado — desabilitar com `DEV_TOOLS_ENABLED=false` no Railway antes de onboarding de casais externos (ver `docs/tech-debt.md`).

---

## Commits recentes (últimos 10)

| Hash | Data | Mensagem |
|------|------|----------|
| `9c6ae95` | 2026-05-09 | fix(auth): botão Sair usa signOut() do NextAuth em vez de GET para /api/auth/signout |
| `5bb8f7c` | 2026-05-09 | fix(legal): ajustes nos termos — remove badge de revisão e versão visível |
| `1647530` | 2026-05-09 | feat(auth): aceite de termos no cadastro + modal de termos/privacidade |
| `fb331b7` | 2026-05-09 | fix(auth): zero cookies antes do login completo |
| `356fbf4` | 2026-05-09 | fix(smoke): pular testes dependentes de evento quando slug não existe no banco |
| `336916e` | 2026-05-09 | fix(config): migrar prisma.seed para prisma.config.ts e hook Sentry |
| `190a6bb` | 2026-05-09 | fix(ci): default TEST_SLUG to joseeleticia instead of casamento-exemplo |
| `9f5f059` | 2026-05-09 | feat(qa): dashboard de teste manual built-in com relatório copiável |
| `d7588e0` | 2026-05-09 | docs: URLs de produção e links clicáveis em todos os checklists de teste |
| `0a7b257` | 2026-05-09 | refactor: eliminar localhost de runtime + fail-fast no startup |

---

## Configurações ativas

### Variáveis de ambiente (Railway) — nomes apenas

**Banco de dados**
- `DATABASE_URL`

**Autenticação (Auth.js v5)**
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `AUTH_TRUST_HOST`

**Email (Resend)**
- `RESEND_API_KEY`
- `EMAIL_FROM`

**Realtime (Pusher)**
- `PUSHER_APP_ID`
- `PUSHER_SECRET`
- `PUSHER_KEY`
- `NEXT_PUBLIC_PUSHER_KEY`
- `NEXT_PUBLIC_PUSHER_CLUSTER`

**Storage**
- `RAILWAY_VOLUME_PATH` — volume persistente montado em `/data/uploads`
- `STORAGE_PROVIDER` — atualmente ignorada no código; hardcoded como railway

**App**
- `NEXT_PUBLIC_APP_URL`
- `CRON_SECRET`

**CAPTCHA (Cloudflare Turnstile)**
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`

**Criptografia (Mercado Pago)**
- `ENCRYPTION_KEY` — AES-256-GCM para credentials de pagamento por evento

**Spotify (opcional)**
- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`

**Backblaze B2 (opcional)**
- `B2_KEY_ID`
- `B2_APPLICATION_KEY`
- `B2_BUCKET`
- `B2_ENDPOINT`

**Sentry (opcional)**
- `SENTRY_DSN`
- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_ORG` *(opcional, só para source maps)*
- `SENTRY_PROJECT` *(opcional, só para source maps)*

**Operacional**
- `STATUS_EMAIL_TOKEN` — protege `POST /api/admin/send-status-email`
- `DEV_TOOLS_ENABLED` — definir como `"false"` para esconder `/admin/dev-tools`
- `DEV_SEED_ALLOW` — habilita seed de desenvolvimento

### Status dos serviços externos

| Serviço | Função | Status |
|---------|--------|--------|
| **Railway** (Postgres + Volume) | Banco de dados + storage de fotos | ✅ Configurado e em uso |
| **Resend** | Emails transacionais | ✅ Configurado e em uso |
| **Pusher** | Chat e modo ao vivo em tempo real | ✅ Configurado e em uso |
| **Cloudflare Turnstile** | CAPTCHA anti-bot no login/signup | ✅ Configurado e em uso |
| **Mercado Pago** | Gateway de pagamento (presentes) | ✅ Integrado — configurado por casal nas settings do evento |
| **Sentry** | Monitoramento de erros | ⚠️ Código pronto, DSN não configurado no Railway |
| **Backblaze B2** | Backup off-site do banco | ⚠️ Código pronto, credenciais não configuradas no Railway |
| **Spotify** | Busca de músicas na playlist | ⚠️ Código pronto, credenciais provavelmente não configuradas |
| **Cloudflare R2** | CDN para fotos (futura migração) | ❌ Não iniciado — storage atual é volume Railway |

---

## Pendências

### Imediatas (antes de próxima sessão de dev)

- [ ] **Criar evento `joseeleticia` em produção** — banco foi zerado em 2026-05-09 com `prisma migrate reset`. Usar `/admin/eventos/novo` após login. Sem o evento, os smoke tests do CI pulam 5 dos 11 testes.
- [ ] **Criar conta de usuário em produção** — conta também foi apagada no reset.

### Técnicas pendentes (ver `docs/tech-debt.md` para detalhes)

- [ ] **Configurar Sentry DSN** no Railway (`SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN`) — antes do onboarding de casais externos.
- [ ] **Configurar Backblaze B2** no Railway (4 variáveis) — antes do onboarding de casais externos.
- [ ] **Configurar Spotify** no Railway (`SPOTIFY_CLIENT_ID` + `SPOTIFY_CLIENT_SECRET`) — para habilitar busca de músicas.
- [ ] **`DEV_TOOLS_ENABLED=false`** no Railway — antes de onboarding de casais externos.
- [ ] **Migrar storage para Cloudflare R2** — gatilho: 100 fotos no sistema ou 30 dias antes do evento.
- [ ] **Migrar email para `contato@voem.app`** — antes do multi-tenant.
- [ ] **Renovar domínio `joseeleticia.com`** — antes de 2027-05-08.
- [ ] **Atualizar CI de Node 20 → Node 22** — antes de junho/2026 (GitHub Actions encerra suporte Node 20).
- [ ] **Remover campos legados de local** (`ceremonyLocation`, `ceremonyAddress` etc.) do model `Event` — após confirmar migração para `EventLocation`.

### Milestones pendentes

- [ ] **M5.X — fluxo completo de pagamento Mercado Pago** (integração OK, falta testar fluxo end-to-end com conta real de sandbox).
- [ ] **M5.Y — template repo** (detalhe não documentado — verificar contexto na conversa anterior).

### QA manual

- [ ] **QA manual completo em `/admin/qa`** — 52 itens, 8 seções. Precisa do evento `joseeleticia` criado e configurado em produção. Começar pelo grupo Auth/Signup após recriar conta.

---

## Convenções estabelecidas

### Projeto e negócio
- **Repositório:** `github.com/kennrick69/casamento`
- **Deploy:** Railway (auto-deploy via push para `main`)
- **Domínio:** `joseeleticia.com` (vence 2027-05-08)
- **Slug do evento:** `joseeleticia`
- **Casal:** José Ricardo + Letícia — casamento 29/05/2027
- **Email operacional:** `contato@joseeleticia.com`

### Stack
- **Framework:** Next.js 16 (App Router, Turbopack)
- **Banco:** PostgreSQL via Prisma ORM
- **Auth:** Auth.js v5 (NextAuth) com JWT + PrismaAdapter
- **Realtime:** Pusher Channels
- **Email:** Resend
- **Storage:** Railway Volume (`/data/uploads`) — CDN futuro: Cloudflare R2
- **Payments:** Mercado Pago SDK v2 + AES-256-GCM para credentials
- **Testes unitários:** Vitest
- **Testes E2E:** Playwright (smoke tests no CI contra prod Railway)
- **CI:** GitHub Actions — 3 jobs: `unit` (Vitest), `typecheck` (tsc + ESLint), `smoke` (Playwright vs Railway)
- **Package manager:** pnpm

### Fluxo de trabalho
- **Filosofia:** "Build all day, test at night"
- **Commits:** atômicos, convenção Conventional Commits (`feat`, `fix`, `refactor`, `docs`, `chore`)
- **Pre-push hook:** typecheck + lint + `TZ=UTC pnpm test` + `pnpm build:local` (bloqueia push se falhar)
- **Versões de termos:** `src/lib/legal/versions.ts` — bumpar `TERMS_VERSION`/`PRIVACY_VERSION` quando documentos mudam
- **Dívida técnica:** documentada em `docs/tech-debt.md` — atualizar ao criar ou pagar dívida

### Variáveis de CI (GitHub Actions Secrets)
- `TEST_SLUG`: `joseeleticia` (hardcoded no ci.yml como fallback)
- `PUBLIC_TOKEN`: token público do evento para smoke tests de RSVP

---

## Como retomar em nova máquina

```bash
git clone https://github.com/kennrick69/casamento.git
cd casamento
pnpm install
```

> **Não é necessário configurar `.env.local`.** O projeto não é desenvolvido localmente — deploy direto via push para `main` → Railway.

### Instalar Claude Code (Windows)

```bash
npm install -g @anthropic-ai/claude-code
claude
```

Fazer login com conta Anthropic quando solicitado.

### Primeira coisa após clone

1. Ler este arquivo (`docs/HANDOFF.md`)
2. Checar `docs/tech-debt.md` para pendências priorizadas
3. Criar conta e evento `joseeleticia` em produção (banco foi zerado)
4. Rodar QA manual em `/admin/qa`
5. Continuar de onde parou

### URLs de produção

- **App:** https://joseeleticia.com
- **Admin:** https://joseeleticia.com/admin
- **QA Dashboard:** https://joseeleticia.com/admin/qa
- **Health:** https://joseeleticia.com/api/health
