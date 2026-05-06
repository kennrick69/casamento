# Changelog

## [Unreleased] — Fase 0

### Added
- Projeto Next.js 15 inicializado com TypeScript estrito
- Schema Prisma completo (User, Event, Guest, Photo, Chat, Playlist, Gamification, Donations, Check-in, Moderation, LGPD)
- Auth.js v5 com magic link via Resend (só para organizadores)
- Camada `StorageProvider` com implementação `RailwayVolumeStorage` e interface para futura migração a Cloudflare R2
- Camada `RealtimeProvider` com implementação `PusherProvider` e `NoopRealtimeProvider` para dev
- Camada `EmailProvider` com `ResendProvider` e `ConsoleEmailProvider` para dev
- Seed dos 5 temas visuais: Rústico, Clássico, Minimalista, Boho, Praiano
- Seed de evento de desenvolvimento (`/casamento`)
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
