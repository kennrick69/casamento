# Voem. — Plataforma de Convites de Casamento

Plataforma multi-tenant para convites de casamento digitais. Cada casal recebe seu **próprio deploy** com URL personalizada, painel de administração completo e integração de pagamentos opcional via Mercado Pago.

## Modelo de negócio

```
1 casal = 1 deploy Railway separado = URL própria
```

O operador (você) clona este repositório, cria um projeto Railway por casal e entrega ao cliente. Cada casal tem seus próprios dados, tema visual, credenciais de pagamento e URL — sem compartilhar banco com outros casais.

---

## Funcionalidades principais

### Para o casal (admin)
- Painel de administração completo
- Editor visual de convite (cores, tipografia, layout)
- Gerenciamento de convidados + importação CSV/XLSX
- Plano de mesas drag-and-drop + export PDF
- Save-the-dates em PDF com QR code personalizado
- Modo Ao Vivo para atualizações em tempo real no dia do evento
- Agradecimentos com template automático por convidado
- Digest de email configurável (diário ou semanal)
- Backups automáticos diários

### Para os convidados (público)
- Convite digital com tema personalizado
- RSVP online com consentimentos LGPD
- Lista de presentes com 3 modos: Confiança / PIX+Comprovante / Mercado Pago
- Mural de fotos com reações
- Chat em tempo real
- Playlist colaborativa via Spotify
- Cronograma com notificações de browser
- Perfil público de convidados
- Compartilhamento: WhatsApp, link, QR code
- Modo TV fullscreen para projetor no salão

### Infraestrutura
- Multi-tenant por slug (`/[slug]`)
- 5 temas visuais (clássico, rústico, minimal, boho, praiano)
- i18n PT-BR / EN
- PWA completo
- SEO: OG images dinâmicas, JSON-LD, sitemap.xml
- Sentry para monitoramento de erros (opcional)
- LGPD: export de dados, exclusão de conta, retenção automática

---

## Quick start — desenvolvimento local

```bash
# 1. Clone e instale
git clone https://github.com/kennrick69/casamento.git
cd casamento
pnpm install

# 2. Configure variáveis de ambiente
cp .env.example .env.local
# edite .env.local com suas keys

# 3. Banco de dados
pnpm prisma migrate dev
# pnpm prisma db seed   # opcional — cria evento de exemplo

# 4. Rode o servidor
pnpm dev
# Acesse http://localhost:3000
```

### Variáveis mínimas para dev

```bash
DATABASE_URL="postgresql://..."   # PostgreSQL local ou Railway
AUTH_SECRET="qualquer-string-aleatoria"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

As demais variáveis são opcionais em dev: email vai para o console, Pusher desabilitado, Turnstile com bypass automático.

---

## Deploy de um novo casal

Use o script interativo:

```bash
pnpm tsx scripts/setup-novo-casal.ts
```

Ou siga o [Playbook completo →](docs/PLAYBOOK-NOVO-CASAL.md)

---

## Estrutura do projeto

```
src/
├── app/
│   ├── (admin)/admin/          # Painel de administração
│   │   └── eventos/[id]/       # Por evento: convidados, presentes, etc.
│   ├── (public)/[slug]/        # Páginas públicas por evento
│   └── api/                    # API routes: crons, webhooks, storage
├── components/
│   ├── admin/                  # Componentes do painel admin
│   ├── guest/                  # Componentes da área pública
│   └── ui/                     # Design system (shadcn/ui)
├── lib/
│   ├── auth/                   # Autenticação (Auth.js v5)
│   ├── crypto/                 # Criptografia AES-256-GCM
│   ├── email/                  # Resend + templates
│   ├── mercadopago/            # SDK Mercado Pago
│   └── storage/                # Storage de arquivos (Railway volume)
prisma/
├── schema.prisma               # Schema completo
└── migrations/                 # Migrations SQL
docs/
├── PLAYBOOK-NOVO-CASAL.md      # Guia de onboarding
├── USER-GUIDE.md               # Manual do casal
├── ADMIN-GUIDE.md              # Manual operacional
├── STATUS.md                   # Features implementadas
└── CHANGELOG.md                # Histórico de versões
```

---

## Tech stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Banco | PostgreSQL (Prisma ORM) |
| Auth | Auth.js v5 |
| Email | Resend |
| Realtime | Pusher |
| Storage | Railway volume → Cloudflare R2 (planejado) |
| Pagamentos | Mercado Pago SDK v2 |
| Criptografia | Node.js crypto (AES-256-GCM) |
| Deploy | Railway |
| Monitoramento | Sentry (opcional) |

---

## Documentação

- [Playbook — Onboarding de novo casal](docs/PLAYBOOK-NOVO-CASAL.md)
- [Guia do casal (USER-GUIDE)](docs/USER-GUIDE.md)
- [Guia operacional (ADMIN-GUIDE)](docs/ADMIN-GUIDE.md)
- [Status do projeto](docs/STATUS.md)
- [Changelog](docs/CHANGELOG.md)
