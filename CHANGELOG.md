# Changelog

## [ProtoScene — polish + FlyingScene canvas com ping-pong + botão arcade] — 2026-05-17

### Added
- **`FlyingScene.tsx` reescrito**: canvas + `requestAnimationFrame` com **ping-pong real**. Decodifica o GIF via `gifuct-js` no mount (warm-up), pré-compõe frames respeitando `disposalType`, roda forward→reverse→forward com delays originais. Substitui `<img>` simples que só fazia loop forward. Dep nova: `gifuct-js@^2.1.2`.
- **Botão arcade no ProtoScene**: substitui "Você é digno deste convite ✨" por par "VOCÊ É DIGNO / PRESS START" em **Press Start 2P** (next/font/google). "VOCÊ É DIGNO" cintila soft (opacity 1↔0.6, ease-in-out 1.6s). "PRESS START" dourado com glow duplo (text-shadow 8px + 16px halo amarelo + sombra dura preta) e **blink duro arcade** (step-end por keyframe, ON 500ms / OFF 500ms — snap NES sem fade).

### Fixed
- **SNAP instantâneo na transição do coração**: bonecos da queda permaneciam ~500ms visíveis sobre o `casalvoando.gif` no SNAP por causa do `transition: opacity 0.5s` nos wrappers + DOM order (bonecos depois com mesmo zIndex). Fix: `transition` condicional — fade só permanece no caminho `fail()` (`heartPhase === 'IDLE'`), durante a transição é `opacity 0s`.
- **Bonecos abraçam no meio do canvas**: `unite()` levava os personagens a `top: 280px` (centro vertical do wrapper em y=392.5) → empurrava o abraço pra metade inferior. Fix: `centerY = 178` (centro do wrapper em y=290, meio exato do canvas 580). `PixelHeart` e `PixelParticle` acompanham (`top: 290px`).
- **Queda residual após `unite()`**: o `if (state !== 'falling') return` do useEffect FALLING ficava no escopo externo. Após `setState('flying')`, o cleanup só rodava no rerender (~50-100ms de delay) — 1-2 ticks de `y += 0.6` ainda disparavam, empurrando bonecos pra baixo. Fix: guard `if (stateRef.current !== 'falling') return` dentro do callback do setInterval (síncrono).
- **Halo azul no FlyingScene canvas**: 4 fixes defensivos — (1) `clearRect` antes de cada `drawImage` no tick (pixels do frame anterior em áreas transparentes do novo frame não acumulam mais), (2) canvas em pixels físicos (DPR-aware) com scaling via `drawImage` interno (evita interpolação CSS bilinear que produz alpha intermediário contra pixels vazios → halo do céu atrás), (3) threshold alpha ≥128→255, <128→0 no pre-compose (kill semi-transparência residual), (4) `globalCompositeOperation = 'source-over'` explícito.

### Changed
- **Personagens (bride/groom) -20%**: `transform: scale(0.8)` no `<img>` interno dos wrappers (wrapper continua 125×225 → preserva drag/clamps/splash/posições do `unite()`/threshold do `checkUnion()`). `objectFit: contain` mantém centro visual.
- **`casalvoando.gif` -32% no total**: 300px → 255px (-15%) → 204px (-20% adicional pra proporcionar com os bonecos -20%).
- **Animação do `unite()`**: transition `0.8s ease-out` → `0.2s ease-out` e `await wait(800)` → `200` (aproximação mais ágil antes do coração nascer).

---

## [ProtoScene — pixel art heart transition] — 2026-05-15

### Changed

- `ProtoScene.tsx` — transição do coração migrada da estética v1 (SVG suave + crossfade) para pixel art 16-bit (padrão HeartFlightTransition v2):
  - Coração SVG substituído por sprite pixel 15×13 px com `shape-rendering: crispEdges`
  - Crescimento contínuo substituído por 6 steps discretos sem easing (vibe Mario power-up)
  - Cor única substituída por 5 paletas ciclando (vermelho → dourado → teal → roxo → rosa)
  - Fade crossfade 400ms substituído por SNAP instantâneo (1 frame)
  - 32 partículas pixel explodem no momento do SNAP
  - `unite()` refatorado de cascade de `setTimeout` para padrão `async/await + cancelledRef`
  - Todo comportamento de drag, detecção de proximidade e threshold de união preservados integralmente

### Added

- `HeartFlightTransition.tsx` — atualizado para v2 (pixel art edition), substituição direta da v1
- `HeartFlightTransition.README.md` — documentação da v2 criada em `src/components/landing/`

---

## [R.6 — Toasts de feedback em ações admin] — 2026-05-08

### Added

- `conta/profile-form.tsx` — client component: toast "Dados salvos!" / erro ao salvar perfil
- `conta/notifications-form.tsx` — client component: toast "Preferências salvas!" ao atualizar notificações
- `presentes/add-gift-form.tsx` — client component: toast "Presente adicionado!" + reset de form
- `presentes/gift-item-actions.tsx` — client component: toast contextual para marcar/desmarcar/remover presente
- `mural/photo-card-actions.tsx` — client component: toast "Foto aprovada!" / "Foto removida."
- `moderacao/report-actions.tsx` — client component: toast "Conteúdo removido." / "Denúncia descartada."

### Changed

- `conta/actions.ts` — `updateProfile` e `updateNotifications` retornam `{ok, error?}` em vez de `void`
- `presentes/actions.ts` — `createGift`, `deleteGift`, `toggleFulfilled` retornam resultado tipado
- `mural/actions.ts` — `approvePhoto`, `removePhoto` retornam `{ok: boolean}`
- `moderacao/actions.ts` — `resolveReport` retorna `{ok, action?}`
- `convidados/actions.ts` — `toggleGuestBan` retorna `{ok, nowBanned}`, `removeGuest` retorna `{ok}`
- `convidados/guest-actions.tsx` — adiciona `toast.success()` após ban/deban/remover com mensagem contextual
- `conta/page.tsx`, `presentes/page.tsx`, `mural/page.tsx`, `moderacao/page.tsx` — usam novos client components

---

## [R.5 — Auditoria de estados de loading] — 2026-05-08

### Changed

- `convidados/guest-actions.tsx` — dois `useTransition` separados; botões mostram "Banindo…"/"Desbanindo…"/"Removendo…" durante ação
- `presentes/reserve-button.tsx` — `"…"` → `"Reservando…"` / `"Cancelando…"` (contextual)
- `chat/chat-room.tsx` — botão Enviar mostra `"Enviando…"` durante `isPending`
- `playlist/vote-button.tsx` — adiciona `opacity-50 cursor-wait` e `aria-label="Processando…"` durante voto

---

## [R.4 — Auditoria de mensagens de erro] — 2026-05-08

### Changed

- `api/admin/.../convidados/export/route.ts` — `"Unauthorized"` → `"Não autorizado"`, `"Forbidden"` → `"Acesso negado"`
- `api/pusher/auth/route.ts` — `"Bad request"` → `"Requisição inválida"`
- `api/qr/[slug]/route.ts` — `"Not found"` → `"Não encontrado"`
- `api/photos/[key]/route.ts` — `"Not found"` → `"Não encontrado"` (ambas as ocorrências)
- `api/cron/reminder/route.ts` — `"Unauthorized"` → `"Não autorizado"`
- `api/cron/backup/route.ts` — `"Unauthorized"` → `"Não autorizado"`
- `(public)/[slug]/mural/photo-uploader.tsx` — fallback de erro de upload: `"Erro ao enviar."` → `"Falha ao enviar. Tente novamente."`

### Docs

- `docs/audit-mensagens.md` — inventário completo de 112 mensagens; 3 MEDIUM + 5 LOW aplicados; sem itens HIGH identificados

---

## [R.3 — Email de confirmação de presença] — 2026-05-08

### Added

- `rsvpConfirmationHtml/Text` — template rico com cerimônia + recepção, link para editar resposta, link para o mural, branding "Voem."
- `SendEmailOpts.headers` — suporte a headers customizados em todos os provedores
- Headers anti-spam nos emails de confirmação: `Precedence: transactional`, `X-Entity-Ref-ID`
- `ConsoleEmailProvider` loga banner visível para emails de confirmação em dev

### Changed

- `rsvp/actions.ts` — usa novo template rico; busca local de recepção via `getMainLocation`; substitui `baseUrl` por `appUrl` consolidado

---

## [R.2.B — Wizard de criação de evento] — 2026-05-08

### Changed

- **P4-A** — Campos "Modo de doação" e "Chave PIX" no passo 4 agora condicionais ao feature flag `donations`
- **P4-B** — Label do checkbox de aprovação: "Requerer aprovação manual…" → "Revisar cada convidado antes de liberar o convite" + helper text
- **P4-C** — Acesso a `?step=4` em eventos já publicados redireciona para `/configuracoes`
- **F1** — Botão "← Passo X: [nome]" entre todos os passos do wizard
- **F2 (HIGH)** — react-hook-form + zodResolver em todos os passos 1–4: erros inline em pt-BR, toast de erro em falha de servidor
- **F3** — Progress bar usa `font-medium` em vez de `font-mono`; indicador "Passo X de 4" abaixo das pílulas

### Added

- `src/lib/utils/redirect.ts` — utilitário `isRedirectError()` para re-throw seguro de redirects Next.js em client components
- `src/app/(admin)/layout.tsx` — `<Toaster>` do sonner no layout admin (posição bottom-right, richColors)
- Formulários cliente do wizard: `novo-wizard-form.tsx`, `wizard-basic-form.tsx`, `wizard-location-form.tsx`, `wizard-publish-form.tsx`

---

## [R.1 — Auditoria de jargão e tom] — 2026-05-08

### Changed

- `(admin)/admin/page.tsx` — removido badge "owner" do card de evento (inglês invisível)
- `(public)/[slug]/checkin/page.tsx` — `<h1>Check-in</h1>` → "Marcar presença"; instrução "para fazer check-in." → "para marcar sua presença na festa."
- `(public)/[slug]/checkin/checkin-form.tsx` — label "Código de check-in" → "Código do local"; botão "Fazer check-in" → "Já cheguei!"
- `(public)/[slug]/checkin/actions.ts` — mensagem de sucesso "Check-in feito!" → "Presença marcada! 🎉" (ambas as ocorrências)
- `(public)/[slug]/gincana/page.tsx` — link "Fazer check-in no local" → "Marcar presença no local"
- `(admin)/admin/eventos/[id]/gincana/page.tsx` — heading "Códigos de check-in" → "Códigos dos locais"; placeholder "Check-in cerimônia" → "Cerimônia"
- `(admin)/admin/eventos/[id]/configuracoes/page.tsx` — feature toggle "Gamificação (pontos e missões)" → "Gincana (pontos e missões)"
- `(admin)/admin/dev-tools/page.tsx` — status "Rate limited" → "Limite de tentativas atingido"
- `(legal)/privacidade/page.tsx` — cookie de sessão: nome técnico agora acompanhado de descrição em linguagem simples

### Audit kept as-is (LOW)
- Playlist, Chat, link mágico, PIX, hash irreversível — termos consolidados no Brasil
- RSVP — apenas em textos legais, com parentético explicativo; não aparece em nenhuma UI visível

---

## [Bloco A — Auth profissional] — 2026-05-08

### Added

- **A.3 /login e /signup** — tabs com react-hook-form, zxcvbn para força de senha, honeypot anti-bot, rate limiting por IP (`RateLimitAttempt`), `AuthLog` para LOGIN_SUCCESS/LOGIN_FAILED/SIGNUP_COMPLETED
- **A.4 Verificação de e-mail** — token UUID→SHA-256 em `VerificationToken`, /verify-email com countdown de reenvio (60s), /admin/onboarding em 3 telas, /admin/dev-tools com guard `DEV_TOOLS_ENABLED`, logging de `EMAIL_SEND_FAILED` com banner visível em Railway Logs
- **A.5 Cloudflare Turnstile** — CAPTCHA opcional via `NEXT_PUBLIC_TURNSTILE_SITE_KEY`; widget com `render=explicit` no nível do `AuthTabs` para sobreviver a troca de abas; verificação server-side via `verifyTurnstile()`; `CAPTCHA_FAILED` no AuthLog
- **A.6 Password Reset** — /forgot-password com anti-enumeration, /reset-password com zxcvbn (score ≥ 2), token SHA-256 no banco expira em 30 min, invalidação de sessões existentes via `passwordChangedAt` + JWT callback, notificação de segurança por e-mail, `PASSWORD_RESET_REQUESTED/COMPLETED` no AuthLog
- **A.7 /admin/conta** — 3 seções: dados pessoais (nome, telefone), segurança (alterar senha com PasswordStrengthBar, re-auth imediato), notificações (marketingOptIn). Link "Minha conta" no header do painel
- **A.8 Headers de segurança** — HSTS (max-age=31536000; includeSubDomains), X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin, CSP baseline cobrindo Turnstile + Pusher + fontes self-hosted. Aplicado em `/(.*)`
- **A.9 Termos de Uso e Privacidade v1.0** — documentos placeholder com TODO jurídico em `docs/legal/`. /termos e /privacidade com conteúdo completo (10/11 seções, LGPD, tabelas de retenção e compartilhamento). Versão gerenciada em `src/lib/legal/versions.ts`. Admin layout redireciona para /aceitar-termos quando usuário não aceitou versão atual
- **A.10 Audit + Smoke E2E** — unit tests para `hashToken`, `checkRateLimit`, `verifyTurnstile` (13 arquivos, 115 testes). Smoke E2E de auth em `tests/e2e/auth.test.ts` (guards, formulários, anti-enumeration, reset inválido). A11y via axe-core em páginas de auth. Lighthouse CI com `@lhci/cli` no job smoke

### Changed

- `tests/unit/setup.ts` — adicionados mocks de Prisma para modelos de auth: `user`, `verificationToken`, `passwordReset`, `rateLimitAttempt`, `authLog`
- `.github/workflows/ci.yml` — smoke job expandido: auth E2E, a11y (continue-on-error), Lighthouse CI (continue-on-error)
- `docs/decisions.md` — ADR-009 documentando Bloco A completo, tech-debt, resultados esperados do Lighthouse

### Security

- Passwords: Argon2 hash (`@node-rs/argon2`)
- Tokens: UUID v4 plain + SHA-256 hash no banco
- Sessions: JWT com invalidação via `passwordChangedAt`
- Rate limiting: sliding window por chave composta (action:ip ou action:email)
- CSP: `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`

---

## [Feature: Locais] — 2026-05-07

### Added
- **Model `EventLocation`** — múltiplos locais por evento com tipos (Cerimônia, Recepção, Chá de panela, Despedida, Brunch, Ensaio, Outro), ordem, data/hora própria, dresscode, descrição, `isMain`, `isPublic`
- **Migration `20260507120000_add_event_location`** — cria tabela e migra dados dos campos planos existentes (cerimônia + recepção) para `EventLocation` automaticamente
- **`/[slug]/locais`** — nova página pública listando todos os locais com Waze/Maps por local
- **`/admin/eventos/[id]/locais`** — admin CRUD completo: criar, editar (via `?edit=id`), remover, reordenar com ▲▼
- **`src/lib/locations/index.ts`** — helpers `generateMapsLink`, `generateWazeLink`, `LOCATION_TYPE_LABELS`, `LOCATION_TYPE_ICONS`, `getMainLocation`
- **Aba "Locais" no EventNav admin**

### Changed
- **Bottom nav pré-cerimônia**: "Local" (`/local`) → "Locais" (`/locais`); label e href corrigidos
- **Bottom nav D-day+**: Início/Fotos/Chat/Playlist/Presentes (confirmado e documentado)
- **RSVP email**: campo `location` agora vem do `EventLocation` principal (com fallback para campo legado)
- **`/[slug]/local`** — redireciona permanentemente para `/[slug]/locais`

### Tech Debt Registered
- Remoção dos campos legados de local no model Event (pré-condição: migrar todos os leitores)
- Visibilidade restrita (`isPublic=false`) pendente de sistema de grupos/tags de convidados

## [Correções pós-testes] — 2026-05-07

### Fixed
- **Bottom nav adaptativo** — navegação agora muda automaticamente com base na data do casamento: antes do dia mostra Início/Roteiro/Local/Presentes (4 abas); no dia e após mostra Início/Fotos/Chat/Playlist/Presentes (5 abas). Helper `getActiveBottomNav` testado unitariamente com 7 casos.
- **Landing pública desbloqueada** — eventos com status `PUBLISHED` agora acessíveis sem cookie nem `?k=`. A função `validateEventAccess` retorna `ok: true, guest: null` para visitantes anônimos em eventos publicados.
- **Página raiz substituída** — `/` exibia o template padrão do create-next-app desde o primeiro commit. Substituído por landing da plataforma com hero, CTA para noivos (`/admin`) e explicação para convidados.
- **ADR-005 documentado** — decisão sobre como tratar mudanças em decisões de produto/arquitetura previamente acordadas adicionada a `docs/decisions.md`.

## [6.0.0] — Fase 6 (2026-05-07)

### Added
- `/admin/eventos/[id]/presentes` — CRUD de lista de presentes com marcação de recebido
- `/admin/eventos/[id]/mural` — aprovação/remoção de fotos (com seção "aguardando aprovação" em destaque)
- `/admin/eventos/[id]/moderacao` — revisão de denúncias: remover conteúdo ou descartar
- `/admin/eventos/[id]/lgpd` — painel LGPD: contagem de esquecimentos, link de exportação CSV, explicação de retenção
- Dashboard do evento com cards de acesso rápido para Mural, Presentes, Moderação e LGPD
- Link "Gincana — ganhe pontos!" no banner de confirmado na landing page (quando gamification ativo)
- Página 404 customizada (`src/app/not-found.tsx`)

## [5.0.0] — Fase 5 (2026-05-07)

### Added
- `/api/cron/reminder` — cron endpoint que envia lembrete automático a confirmados 7 e 1 dia antes do casamento (idempotente via chave Resend)
- Templates `reminderHtml/Text` e `massEmailHtml/Text` em `src/lib/email/templates.ts`
- `/admin/eventos/[id]/notificacoes` — painel de notificações: info sobre lembretes automáticos + formulário para envio de email em massa (confirmados ou todos)
- Aba "Notificações" no nav do admin de evento

## [4.0.0] — Fase 4 (2026-05-07)

### Added
- Motor de pontuação (`src/lib/points/index.ts`) com caps diário e total, transacional
- 7 missões padrão criadas automaticamente em cada novo evento: RSVP confirmado, RSVP antecipado, foto no mural, mensagem no chat, sugestão de música, voto em música, check-in no local
- Pontos awarded automaticamente em: RSVP confirmado, upload de foto, mensagem no chat, sugestão e voto na playlist
- `/[slug]/gincana` — página do convidado com ranking top-10, placar pessoal, posição e lista de missões
- `/[slug]/checkin` — formulário de check-in por código (suporte a código pré-preenchido via query string `?code=`)
- `/admin/eventos/[id]/gincana` — painel admin: ranking, ativar/desativar missões, criar e gerenciar códigos de check-in com missão associada
- Aba "Gincana" no nav do admin de evento

## [3.0.0] — Fase 3 (2026-05-07)

### Added
- `/[slug]/mural` — mural de fotos com upload (8 MB, JPEG/PNG/WebP/HEIC), grid responsivo
- `/api/fotos/upload` — endpoint de upload com validação de tipo, tamanho e permissão de convidado
- `/[slug]/chat` — chat ao vivo com Pusher (real-time) e fallback funcional sem Pusher
- `/[slug]/playlist` — playlist colaborativa com sugestão de músicas e votação por coração
- `/[slug]/presentes` — lista de presentes com reserva/cancelamento e exibição da chave PIX
- Bottom nav expandido: 5 abas (Início · Fotos · Chat · Playlist · Presentes)

### Fixed
- `verifyClaimToken` movida para fora do `"use server"` — corrige erro de build no Next.js 16/Turbopack

## [2.0.0] — Fase 2 (2026-05-07)

### Added
- Landing page pública com 3 estados de convidado: CTA de RSVP, banner de confirmado, banner de declínio
- Countdown regressivo (dias · horas · minutos, atualiza a cada minuto)
- Hero com foto de capa ou gradiente temático
- Formulário de RSVP completo: nome, email, telefone, acompanhantes, restrições, mensagem
- Confirmação de RSVP com magic link de recuperação (anti-duplicata, anti-enumeração)
- Página de sucesso do RSVP com próximos passos
- Recuperação de acesso via email (HMAC-SHA256, expira em 24h)
- Página de roteiro do dia com timeline vertical
- Página de local com cards de cerimônia e recepção, links Waze e Google Maps
- Fluxo LGPD de esquecimento (soft-delete imediato, remoção definitiva em 30 dias)
- Templates de email HTML transacional: confirmação de presença, declínio, recuperação de acesso
- Endpoint `/api/qr/[slug]` para geração server-side de QR code (PNG 512px e SVG)
- Barra de acessibilidade no layout público: tamanho de fonte (A / A+ / A++) e alto contraste
  - Persiste em localStorage, aplica via atributos `data-*` no `<html>`
- Auth de convidado via cookie `guest_token` (1 ano, httpOnly)
- Layout público com tema visual dinâmico via CSS custom properties
- Bottom nav fixo com 4 abas (Início, Roteiro, Local, Presentes)
- 5 temas visuais: Rústico, Clássico, Minimalista, Boho, Praiano

## [0.1.0] — Fase 0 (2026-05-06)

### Added
- Projeto Next.js 15 inicializado com TypeScript estrito
- Schema Prisma completo (User, Event, Guest, Photo, Chat, Playlist, Gamification, Donations, Check-in, Moderation, LGPD)
- Auth.js v5 com magic link via Resend (só para organizadores)
- Camada `StorageProvider` com implementação `RailwayVolumeStorage` e interface para futura migração a Cloudflare R2
- Camada `RealtimeProvider` com implementação `PusherProvider` e `NoopRealtimeProvider` para dev
- Camada `EmailProvider` com `ResendProvider` e `ConsoleEmailProvider` para dev
- Seed dos 5 temas visuais: Rústico, Clássico, Minimalista, Boho, Praiano
- Seed de evento de desenvolvimento (`/casamento-exemplo`)
- i18n com next-intl (pt-BR base, en stub)
- Páginas legais placeholder: `/privacidade` e `/termos`
- PWA: `manifest.json` e service worker básico
- `date-fns-tz` configurado com fuso America/Sao_Paulo como padrão
- Middleware de autenticação protegendo rotas `/admin`
- Rota `/api/photos/[key]` para servir fotos com checagem de autorização
- Rota stub `/api/webhooks/payment` e `/api/cron/backup`
- `DataAccessLog` model no schema para LGPD
- `docs/tech-debt.md` com dívida do storage documentada
- `docs/decisions.md` com ADRs iniciais
- `.env.example` documentado
- Estrutura de pastas completa
