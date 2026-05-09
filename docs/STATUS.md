# Status do projeto — 2026-05-09

## ✅ Implementado e funcionando

### Autenticação e segurança
- Login com email/senha + força de senha
- Verificação de email obrigatória em produção (middleware guard)
- Auto-login após verificar email (magic-link behavior)
- Rate limiting em endpoints sensíveis
- Cloudflare Turnstile no cadastro e reset de senha
- LGPD: export de dados, solicitação de exclusão, logs de acesso

### Casal / Admin
- Onboarding wizard (5 steps: perfil, evento, tema, locais, convidados)
- Dashboard com métricas em tempo real
- Gerenciamento de locais (tipos: cerimônia, recepção, etc.) com mapa
- Roteiro do dia (timeline de atividades)
- Lista de presentes com reservas
- Galeria pré-evento com upload drag & drop ✨ M3.3
- História do casal (timeline visual) com CRUD ✨ M3.4
- Padrinhos e madrinhas (cadastro por lado: noivo/noiva) ✨ M3.1
- Lista de convidados: import CSV, export CSV, banir, busca, filtros
- Botão WhatsApp por convidado (template pré-preenchido) ✨ M3.8
- Playlist: aprovação/rejeição de sugestões
- Mural: aprovação/rejeição de fotos
- Moderação centralizada (4 abas) ✨ M3.5
- Notificações in-app no header (sino com badge) ✨ M3.6
- Analytics do evento (RSVPs, fotos, músicas, countdown) ✨ M3.7
- Co-organizadores com roles (OWNER/EDITOR)
- Emails automáticos (7 dias e 1 dia antes do evento)
- Email em massa para convidados
- Health check + sistema de backups

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

### Infraestrutura
- PWA completo (manifest + service worker + ícones) ✨ M3.9
- 5 temas visuais (rústico, clássico, minimal, boho, praiano)
- Multi-tenant (slug por evento)
- Railway volume storage (migração R2 planejada)
- CI com unit tests (115 testes), typecheck, smoke tests E2E

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
| Substituir greybox do ProtoScene por arte final | Aguardando aprovação da noiva |
| Gateway de pagamento real (Stripe/Pagar.me) | Stub implementado |
| Lembretes via WhatsApp (Twilio) | Email cobre o caso de uso atual |
| Remover campos legados de local no model Event | Após confirmar migração completa para EventLocation |
| Visibilidade restrita de locais (isPublic=false) | Aguarda sistema de tags de convidados (Fase 3+) |
| Atualizar GitHub Actions: Node 20 → 22 | Deadline junho/2026 |

---

## 📊 Métricas de qualidade

- **TypeScript**: 0 erros
- **ESLint**: 0 erros (3 warnings pré-existentes)
- **Testes unitários**: 115/115 passando
- **Testes E2E (smoke)**: CI verde
- **Testes E2E (auth)**: CI verde (Turnstile aceito com regex)
- **Lighthouse**: não rodado localmente (requer servidor ativo) — meta: >85 mobile em todas páginas críticas
- **axe-core**: não rodado localmente — pendente auditoria de acessibilidade

---

## 🗓 Próximos passos sugeridos (fechar 100%)

1. **Arte final da landing** — substituir ProtoScene greybox + hero minimalista
2. **Fase 3**: Tags de convidados (grupos: família, amigos, trabalho) → visibilidade de locais por grupo
3. **Fase 4**: Sistema de pontos consolidado com prêmio real anunciado
4. **Fase 5**: Lembretes WhatsApp pré-evento via Twilio
5. **Migração R2** quando atingir gatilho (100 fotos ou 30 dias antes)
6. **Lighthouse mobile** → rodar em produção e resolver itens < 85
7. **Auditoria axe-core** → rodar e resolver itens críticos de acessibilidade
