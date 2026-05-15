# Changelog

Todas as mudanças relevantes do produto estão documentadas aqui.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

---

## 2026-05-15 — Landing com voo final integrado (transição do coração ao vivo)

### Mudado

- **`src/app/page.tsx`** virou server component só com `export const metadata`;
  toda a árvore interativa foi extraída pra **`src/components/landing/LandingClient.tsx`**
  (necessário porque o client component não pode coexistir com `export const metadata`).
- **Landing agora usa a arquitetura `HeartFlightTransition`**: o `ProtoScene` ainda
  é a cena de queda (preserva ceu/sol/nuvens/splash/countdown/fail), mas ao
  detectar a união dos bonecos chama o callback `onUnite` que dispara a transição
  do coração; após o `SKY_CROSSFADE` aparece o `FlyingScene` com o GIF
  `casalvoando.gif`.
- **`ProtoScene.tsx`** ganhou prop opcional `onUnite?: () => void` chamada dentro
  de `unite()`. Sem a prop, comportamento standalone idêntico ao anterior.
- **`FlyingScene.tsx`** simplificado pra `<img>` puro (briefing confirmou que
  todos os assets de voo são GIF). Removida toda a lógica de `<video>`, warm-up
  e ping-pong manual (o GIF já loopa nativamente).

### Adicionado

- **`public/landing/casalvoando.gif`** (3.9 MB) — cena de voo.

### Pendente

- **Cor exata do céu** (`COLORS.heartEnd` / `COLORS.skyTarget` em
  `HeartFlightTransition.tsx`) — placeholder `#FFD4B8` deve ser trocado pelo
  hex do pixel central de um frame do `casalvoando.gif`, senão a fase
  `HEART_MERGE → SKY_CROSSFADE` tem "costura" visível.
- **Versão transparente do `pingpong.gif`** (em `Downloads/leticia_transparente.gif`)
  — quando substituir em `public/landing/`, remover o `mix-blend-mode: multiply`
  da `<img>` interna do `brideRef` em `ProtoScene.tsx` (linha ~496).

---

## 2026-05-15 — Arquitetura de transição da landing (3 componentes novos)

### Adicionado

- **`HeartFlightTransition`** (`src/components/landing/HeartFlightTransition.tsx`) —
  máquina de estados linear que orquestra a passagem entre a cena de queda
  e a cena de voo. 7 fases: `IDLE → UNION_PAUSE → HEART_BIRTH → HEART_GROWTH
  → HEART_MERGE → SKY_CROSSFADE → FLYING`. Coração SVG cresce/explode no
  centro, transição cobre o cut entre cenas. Respeita `prefers-reduced-motion`
  (degrada pra fade simples). API:
  ```tsx
  <HeartFlightTransition
    trigger={handsUnited}
    fallingScene={<FallingScene onHandsUnited={...} />}
    flyingScene={<FlyingScene src="/casal-voando.mp4" />}
    onFlightStart={() => setShowInviteBtn(true)}
  />
  ```
- **`FallingScene`** (`src/components/landing/FallingScene.tsx`) —
  Letícia + José em lados opostos, ambos draggáveis via `framer-motion`
  (`<motion.div drag />`). Loop de `requestAnimationFrame` calcula
  distância euclidiana entre os centros dos `getBoundingClientRect()`;
  quando < 80px, dispara `onHandsUnited` uma única vez. Altura inicial
  aleatória (25–45%). Props para trocar `src` dos GIFs e desligar o
  `mix-blend-mode: multiply` quando as versões transparentes subirem.
- **`FlyingScene`** (`src/components/landing/FlyingScene.tsx`) —
  `<video>` com `autoPlay muted playsInline preload="auto"` (`playsInline`
  é crítico em iOS). `.load()` + `.play()` no mount para warm-up; a
  `HeartFlightTransition` monta este componente em `opacity 0` desde o
  início, então quando aparecer já está rodando. **Loop ping-pong**
  (forward → reverse → forward) implementado em JS via manipulação de
  `currentTime` em `requestAnimationFrame` — evita `playbackRate < 0` que
  não funciona em iOS Safari. Pode ser desligado com `pingPong={false}`
  se o asset já vier com ping-pong embutido no MP4 (via ffmpeg concat).

### Pendente (não integrado nesta entrega)

- **Integração em `src/app/page.tsx`** — `ProtoScene` segue sendo o
  componente renderizado na landing. A nova arquitetura existe mas ainda
  não substitui o ProtoScene. Próxima sessão: trocar `<ProtoScene />` por
  `<HeartFlightTransition trigger={...} fallingScene={...} flyingScene={...} />`
  e levar o ProtoScene pra arquivamento ou deletar.
- **Cor exata do coração final** (`COLORS.heartEnd` e `COLORS.skyTarget`
  em `HeartFlightTransition.tsx`) — atualmente `#FFD4B8` como placeholder.
  Precisa de pixel-picker num frame central do MP4 do voo definitivo, ou
  vai aparecer "costura" visível na fase `HEART_MERGE → SKY_CROSSFADE`.
- **Asset `public/casal-voando.mp4`** — ainda não existe em `public/`.
  Em `Downloads/` há candidatos: `casalvoando.gif` (3.9 MB), 2 MP4s gerados
  (`The_two_characters_fly_together...mp4` 486 KB e `flying_like_a_superman...mp4`
  287 KB). Decidir qual vira o arquivo final, comprimir se >2 MB com
  `ffmpeg -i input.mp4 -vcodec libx264 -crf 28 -preset slow -movflags +faststart output.mp4`.
- **`leticia_transparente.gif`** em `Downloads/` — versão transparente do
  `pingpong.gif` da Letícia. Quando substituir em `public/landing/`, passar
  `brideBlendMode="normal"` para `<FallingScene>` (remove o
  `mix-blend-mode: multiply` que está mascarando o fundo bege opaco).

---

## 2026-05-10 — Landing com GIFs animados dos personagens

### Mudado
- **ProtoScene** (`src/components/landing/ProtoScene.tsx`) — bonecos do casal substituídos por GIFs animados.
  - **Letícia** (`/landing/pingpong.gif`, 928 KB): assume a posição direita da cena (`right:60`), espelhada horizontalmente via `transform: scaleX(-1)`.
  - **José** (`/landing/josepingpong.gif`, 948 KB): assume a posição esquerda (`left:60`). Antes era greybox CSS.
  - Wrappers passam de 50×90 px para **125×225 px** (2.5×) para destaque visual proporcional à arte real.
  - `<img>` interno: `mix-blend-mode: multiply` para integrar fundo claro do GIF com o gradiente, `pointer-events: none` + `draggable={false}` para não conflitar com o drag custom do wrapper.
  - Drag clamp passa a usar `offsetWidth/Height` em vez de constantes 330/450 — robusto para qualquer tamanho de boneco.
  - `unite()` reposiciona os bonecos para sobreposição visual de ~50 px no estado de voo (antes ficavam lado-a-lado sem gap).
  - `checkUnion` threshold ajustado para `dx<100` para acomodar as novas posições iniciais (`dx=135`) sem disparar `unite()` no primeiro pixel de drag.
- Banner `data-testid="prototype-banner"` ("🚧 Protótipo · arte final em produção") mantido — definir se os GIFs ping-pong são a arte final ou interim.

### Commits
`33f26e1` · `21c33dc` · `ceaa8d0` · `fba15c5` · `a7a3ce1`

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
