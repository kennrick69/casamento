# Status do projeto — 2026-05-09

## ✅ Implementado e funcionando

### Autenticação e segurança
- Login com email/senha + força de senha
- Verificação de email obrigatória em produção (middleware guard)
- Auto-login após verificar email (magic-link behavior)
- Rate limiting em endpoints sensíveis
- Cloudflare Turnstile no cadastro e reset de senha
- LGPD: export de dados ZIP, exclusão de conta com 2-step confirmation, logs de acesso

### Casal / Admin
- Onboarding wizard (5 steps: perfil, evento, tema, locais, convidados)
- Dashboard com métricas em tempo real
- Gerenciamento de locais (tipos: cerimônia, recepção, etc.) com mapa
- Roteiro do dia (timeline de atividades)
- Lista de presentes com reservas
- Galeria pré-evento com upload drag & drop ✨ M3.3
- História do casal (timeline visual) com CRUD ✨ M3.4
- Padrinhos e madrinhas (cadastro por lado: noivo/noiva) ✨ M3.1
- Lista de convidados: import CSV/XLSX com preview e deduplicação ✨ M4.2, export CSV, banir, busca, filtros
- Save-the-date em PDF (3 templates, QR code, ZIP) ✨ M4.3
- Botão WhatsApp por convidado (template pré-preenchido) ✨ M3.8
- Playlist: aprovação/rejeição de sugestões
- Mural: aprovação/rejeição de fotos
- Moderação centralizada (4 abas) ✨ M3.5
- Notificações in-app no header (sino com badge) ✨ M3.6
- Analytics do evento (RSVPs, fotos, músicas, countdown) ✨ M3.7
- Co-organizadores com roles (OWNER/EDITOR)
- Emails automáticos (7 dias e 1 dia antes do evento)
- Email em massa para convidados
- Health check + sistema de backups (Railway 60 dias + Backblaze B2 90 dias opcional) ✨ M4.6
- Editor visual de convite (paleta de cores, tipografia, layout) ✨ M5.1
- Plano de mesas drag-and-drop com export PDF ✨ M5.2
- Gerenciamento de eventos ao vivo (Pusher, painel admin) ✨ M5.4
- Agradecimentos por convidado (template automático, rascunho, progresso) ✨ M5.6
- Digest de email configurável por organizador (NONE/DAILY/WEEKLY) ✨ M5.7

### Convidado / Público
- Landing page por evento com: hero, countdown, locais+mapa, traje, presentes, story ✨ M3.1
- RSVP com: nome, email, telefone, +1, restrições, mensagem, consentimentos LGPD
- Galeria do casal com lightbox ✨ M3.3
- História do casal (timeline alternada) ✨ M3.4
- Mural de fotos com reações (❤️😂🥹🎉) e upload
- Chat em tempo real (Pusher)
- Playlist com votação e sugestões via Spotify
- Lista de presentes com reserva
- Gincana com missões e ranking
- Check-in via QR code
- Roteiro do dia
- Toggle de idioma PT-BR / EN ✨ M4.5
- Mesa do convidado exibida na tela de sucesso do RSVP ✨ M5.2
- Cronograma com notificações de browser 5 min antes ✨ M5.3
- Página Ao Vivo com atualizações em tempo real via Pusher ✨ M5.4
- Perfil público de convidados (quem é quem) ✨ M5.5
- Seção de compartilhamento: WhatsApp, copiar link, QR code modal ✨ M5.8
- Modo TV fullscreen: slideshow rotativo com fotos, mensagens e cronograma ✨ M5.9

### SEO e Marketing
- OG images dinâmicas por evento (1200×630, gradiente bordô) ✨ M4.1
- Twitter Cards summary_large_image ✨ M4.1
- JSON-LD Event schema.org ✨ M4.1
- Sitemap dinâmico (/sitemap.xml) baseado em eventos publicados ✨ M4.1
- robots.txt configurado ✨ M4.1
- Canonical URLs e lang="pt-BR" ✨ M4.1

### Infraestrutura
- PWA completo (manifest + service worker v2 cache estratégico) ✨ M3.9 + M4.4
- 5 temas visuais (rústico, clássico, minimal, boho, praiano)
- Multi-tenant (slug por evento)
- i18n PT-BR / EN via next-intl, detecção por cookie e Accept-Language ✨ M4.5
- Railway volume storage (migração R2 planejada)
- Sentry error monitoring (graceful no-op sem DSN) ✨ M4.7
- Retenção LGPD: aviso 30 dias + arquivo automático após 1 ano ✨ M4.8
- Página de status pública em /status ✨ M4.9
- CI com unit tests (115 testes), typecheck, lint, build, smoke tests E2E

---

## 🔴 Tech-debt alta prioridade

| Item | Gatilho | Esforço |
|------|---------|---------|
| Migrar storage para Cloudflare R2 | 100 fotos OU 30 dias antes do evento | Médio |
| Desabilitar `/admin/dev-tools` antes de comercializar | Antes de onboarding de casais externos | Mínimo (1 env var) |

## 🟡 Tech-debt média prioridade

| Item | Status |
|------|--------|
| Substituir hero da landing (`/`) por ilustração final (arte do casal) | Aguardando Midjourney |
| Substituir greybox do ProtoScene por arte final | José (esquerda) e Letícia (direita, espelhada) integrados como GIFs animados em 2026-05-10. Banner "Protótipo · arte final em produção" mantido até substituir GIFs por arte definitiva. |
| Gateway de pagamento real (Stripe/Pagar.me) | Stub implementado |
| Lembretes via WhatsApp (Twilio) | Email cobre o caso de uso atual |
| Remover campos legados de local no model Event | Após confirmar migração completa para EventLocation |
| Visibilidade restrita de locais (isPublic=false) | Aguarda sistema de tags de convidados (Fase 3+) |
| Atualizar GitHub Actions: Node 20 → 22 | Deadline junho/2026 |

---

## 📊 Métricas de qualidade

- **TypeScript**: 0 erros
- **ESLint**: 0 erros (2 warnings pré-existentes: img no qr-code, aria-expanded no playlist)
- **Testes unitários**: 115/115 passando
- **Testes E2E (smoke)**: CI verde
- **Testes E2E (auth)**: CI verde (Turnstile aceito com regex)
- **Bundle**: xlsx lazy-loaded (não entra no bundle inicial), archiver via createRequire (CJS/ESM safe)
- **Lighthouse**: não rodado localmente (requer servidor ativo) — meta: >85 mobile em todas páginas críticas
- **axe-core**: não rodado localmente — pendente auditoria de acessibilidade

---

---

## 📦 M5 — Entregues (refinamentos avançados)

| # | Feature | Notas |
|---|---------|-------|
| M5.1 | Editor visual de convite | Paleta de cores, tipografia, seções visíveis, layout hero, preview iframe |
| M5.2 | Plano de mesas drag-and-drop | SeatingTable/SeatingAssignment, export PDF, mesa no RSVP sucesso |
| M5.3 | Cronograma com notificações | /[slug]/programacao, Notification API 5 min antes, graceful fallback |
| M5.4 | Live updates (Ao Vivo) | POST /api/admin/eventos/[id]/live, Pusher, painel admin com quick events |
| M5.5 | Quem é quem (perfil público) | profilePublic consent no RSVP, /[slug]/convidados só para confirmados |
| M5.6 | Agradecimentos | Template automático, gift/note editável, copiar, rascunho, progresso |
| M5.7 | Digest de email | Cron DAILY/WEEKLY, UI em Notificações, RSVPs + fotos + chat + countdown |
| M5.8 | Compartilhamento social | WhatsApp, copiar link, QR code modal, analytics via AuthLog SHARE_LINK |
| M5.9 | Modo TV fullscreen | /[slug]/tv, slideshow 8s, teclado/toque, live banner via Pusher |
| M5.10 | Docs finais | STATUS.md, USER-GUIDE.md, ADMIN-GUIDE.md, teste-noturno.md, CHANGELOG.md |

---

## 📦 M4 — Entregues (produto pronto pra mercado)

| # | Feature | Notas |
|---|---------|-------|
| M4.1 | SEO completo (OG, JSON-LD, sitemap, robots, canonical) | opengraph-image.tsx por evento |
| M4.2 | Importador CSV/XLSX com preview e deduplicação | xlsx lazy-loaded |
| M4.3 | Save-the-date em PDF (3 templates, QR, ZIP) | pdfkit + archiver |
| M4.4 | Performance: SW v2, lazy xlsx, preconnect, bundle analyzer | |
| M4.5 | i18n PT-BR / EN com toggle e detecção automática | next-intl, cookie + Accept-Language |
| M4.6 | Backup off-site Backblaze B2 (90 dias, opcional) | graceful no-op sem credenciais |
| M4.7 | Sentry error monitoring (server + client) | graceful no-op sem DSN |
| M4.8 | LGPD: export ZIP, exclusão de conta, retenção 1 ano | cron /api/cron/retention |
| M4.9 | Página de status pública em /status | revalida a cada 60s |
| M4.10 | Docs: STATUS.md + tech-debt.md + USER-GUIDE + ADMIN-GUIDE | este commit |

---

## 🗓 Próximos passos sugeridos (fechar 100%)

1. **Arte final da landing** — substituir ProtoScene greybox + hero minimalista
2. **Fase 3**: Tags de convidados (grupos: família, amigos, trabalho) → visibilidade de locais por grupo
3. **Fase 4**: Sistema de pontos consolidado com prêmio real anunciado
4. **Fase 5**: Lembretes WhatsApp pré-evento via Twilio
5. **Migração R2** quando atingir gatilho (100 fotos ou 30 dias antes)
6. **Lighthouse mobile** → rodar em produção e resolver itens < 85
7. **Auditoria axe-core** → rodar e resolver itens críticos de acessibilidade
