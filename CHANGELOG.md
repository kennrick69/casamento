# Changelog

## [1.0.0] — Fase 1 (2026-05-06)

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
