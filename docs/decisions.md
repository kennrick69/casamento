# Decisões de Arquitetura (ADRs)

---

## ADR-001 — Railway em vez de Supabase

**Data:** 2026-05-05
**Status:** Aceito

**Contexto:** v3 do prompt usava Supabase (Postgres + Auth + Storage + Realtime). v4 migrou para Railway.

**Decisão:** Railway hospeda Next.js + Postgres + Volume. Auth.js v5 para autenticação dos noivos. Pusher para realtime. Resend para email.

**Consequências:** sem magic RLS do Supabase — segurança é responsabilidade das camadas de autorização em `src/lib/authorization/`. Compensado por abstrações de storage/realtime/email que tornam providers trocáveis.

---

## ADR-002 — StorageProvider com Railway Volume primeiro

**Data:** 2026-05-05
**Status:** Aceito

**Contexto:** Cloudflare R2 seria ideal, mas adiciona complexidade de configuração no início.

**Decisão:** começar com volume persistente do Railway. Implementar `StorageProvider` interface desde o dia 1. Migrar para R2 quando atingir gatilho documentado em `docs/tech-debt.md`.

---

## ADR-003 — Convidados sem login (apenas sessionToken em cookie)

**Data:** 2026-05-05
**Status:** Aceito

**Contexto:** criar conta é fricção desnecessária para convidados (muitos são pessoas mais velhas).

**Decisão:** convidados se identificam apenas com nome + email + telefone no auto-cadastro. `sessionToken` em cookie de 1 ano. Recuperação por magic link se cookie perdido. Auth.js v5 é só para os noivos.
