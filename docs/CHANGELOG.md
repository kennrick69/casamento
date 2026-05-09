# Changelog

Todas as mudanças relevantes do produto estão documentadas aqui.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

---

## [M5] — 2026-05-09 — Refinamentos avançados

### Adicionado
- **Editor visual de convite** (`/admin/eventos/[id]/personalizar`): paleta de cores por variável CSS, tipografia (clássica/moderna/romântica), visibilidade de seções, layout do hero, preview iframe em tempo real.
- **Plano de mesas** (`/admin/eventos/[id]/mesas`): drag-and-drop de convidados para mesas, controle de capacidade (incluindo +1s), export PDF, mesa do convidado exibida na tela de sucesso do RSVP.
- **Cronograma com notificações** (`/[slug]/programacao`): igual ao roteiro, com botão opcional para ativar notificações de browser 5 minutos antes de cada item. Funciona apenas na aba ativa.
- **Modo Ao Vivo** (`/[slug]/ao-vivo` + `/admin/eventos/[id]/ao-vivo`): canal Pusher `event-{id}`, painel admin com botões rápidos (cerimônia, brinde, foto, música, bolo) e formulário livre, indicador vermelho animado nos convidados.
- **Quem é quem** (`/[slug]/convidados`): grade pública de convidados com `profilePublic: true`, disponível apenas para confirmados. Foto de perfil (ou inicial), nome, relacionamento, bio.
- **Agradecimentos** (`/admin/eventos/[id]/agradecimentos`): template automático por convidado, campo de presente, textarea editável, copiar para clipboard, salvar rascunho, marcar como enviado, progresso geral.
- **Digest de email** (cron `POST /api/cron/digest`): resumo configurável por organizador (NONE/DAILY/WEEKLY). UI em Notificações. Inclui: novas confirmações, fotos pendentes no mural, mensagens sinalizadas no chat, dias restantes até o evento.
- **Compartilhamento social**: seção na landing page com botão WhatsApp (mensagem pré-formatada), copiar link (Clipboard API) e QR code gerado client-side via `qrcode`. Analytics registrado via `AuthLog.SHARE_LINK`.
- **Modo TV** (`/[slug]/tv`): slideshow fullscreen, 8 s por slide, mistura aleatória de fotos do mural, mensagens do chat e cronograma. Navegação por teclado e toque. Banner de evento ao vivo via Pusher.

### Schema
- `Event.paletteColors Json?`, `Event.customization Json?`
- `SeatingTable`, `SeatingAssignment` (plano de mesas)
- `LiveEvent` (eventos ao vivo)
- `EventOrganizer.digestFrequency DigestFrequency @default(NONE)`
- `enum DigestFrequency { NONE DAILY WEEKLY }`
- Guest: `profileBio`, `profileRelationship`, `profileImageKey`, `profilePublic`, `giftReceived`, `thankYouNote`, `thankYouSent`
- `AuthAction.SHARE_LINK`

---

## [M4] — 2026-05-09 — Produto pronto para mercado

### Adicionado
- **SEO completo**: OG images dinâmicas (1200×630), Twitter Cards, JSON-LD Event schema.org, sitemap.xml, robots.txt, canonical URLs, lang="pt-BR".
- **Importador CSV/XLSX**: preview com mapeamento de colunas, deduplicação, relatório de erros. xlsx lazy-loaded (não entra no bundle inicial).
- **Save-the-date em PDF**: 3 templates (clássico, rústico, minimal), QR code por convidado, download em ZIP.
- **Performance**: Service Worker v2 com cache estratégico, preconnect, bundle analyzer, lazy loading de xlsx e archiver.
- **i18n PT-BR / EN**: next-intl, detecção por cookie e Accept-Language, toggle na landing page.
- **Backup off-site Backblaze B2**: cron diário, 90 dias de retenção, graceful no-op sem credenciais.
- **Sentry error monitoring**: instrumentação server + client, strip de PII, graceful no-op sem DSN.
- **LGPD**: export ZIP de dados pessoais, exclusão de conta com confirmação em 2 etapas, retenção automática de 1 ano com aviso 30 dias antes.
- **Página de status pública**: `/status` com latência do banco, storage, uptime estimado, revalidada a cada 60s.

---

## [M3] — 2026-04-xx — Core features

### Adicionado
- Padrinhos e madrinhas (cadastro por lado, roles)
- Galeria pré-evento com upload drag & drop
- História do casal (timeline visual com CRUD)
- Moderação centralizada (4 abas: fotos, chat, relatórios, lista negra)
- Notificações in-app no header com badge
- Analytics do evento (RSVPs, fotos, músicas, countdown)
- Botão WhatsApp por convidado com template pré-preenchido
- PWA completo (manifest, service worker, install prompt)

---

## [M1–M2] — 2026-03-xx — Fundação

### Adicionado
- Autenticação (email/senha, verificação obrigatória, reset de senha)
- Multi-tenant por slug
- Onboarding wizard (5 steps)
- RSVP com consentimentos LGPD, rate limiting, sessão por cookie
- Mural de fotos com reações e upload
- Chat em tempo real (Pusher)
- Playlist com votação e sugestões via Spotify
- Gincana com missões e ranking
- Check-in via QR code
- Lista de presentes com reservas e PIX
- Rate limiting, honeypot, Cloudflare Turnstile
- 5 temas visuais (rústico, clássico, minimal, boho, praiano)
