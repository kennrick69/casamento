# Auditoria de Integridade de Dados — QA.6 (2026-05-09)

Script: `scripts/db-integrity.ts`

Execução: `DATABASE_URL=<railway-url> pnpm tsx scripts/db-integrity.ts`

---

## Checks implementados

| # | Check | O que detecta |
|---|-------|---------------|
| 1 | GalleryPhoto orphans | Fotos do casal sem evento pai (cascade delete deve prevenir, mas verifica) |
| 2 | CoupleStoryItem orphans | Itens de história sem evento pai |
| 3 | Guest orphans | Convidados sem evento pai |
| 4 | Soft-deleted guests with inviteToken | Convidados `deletedAt != null` ainda com `inviteToken` ativo — token deveria ser limpo |
| 5 | Expired sessions | Auth.js sessions vencidas (N/A para JWT strategy — tabela não existe) |
| 6 | Events without OWNER organizer | Evento sem organizador OWNER — estado inválido que bloqueia login |
| 7 | Photos: approved=true AND removedAt set | Inconsistência: foto aprovada e removida ao mesmo tempo |
| 8 | Guests: CONFIRMED + banned | Convidado confirmado e banido — estado ambíguo |

---

## Resultado local (sem DATABASE_URL)

Todos os checks retornam 0 via fallback `.catch(() => [])`.
Executar contra Railway DB com:

```bash
# Substituir com URL do Railway
DATABASE_URL="postgresql://..." pnpm tsx scripts/db-integrity.ts
```

---

## Mitigações já em código

- `GalleryPhoto`, `CoupleStoryItem`, `WeddingPartyMember` têm `onDelete: Cascade` — orphans
  são impossíveis a menos que a FK seja bypassada.
- `Photo.removedAt` e `approvedByCouple` são setados por ações separadas. O check #7
  detecta se a lógica de moderação foi bypassada (ex: bug em server action).
- Convidados banidos não são excluídos — `bannedAt` é uma flag. O status CONFIRMED
  é mantido mas o frontend bloqueia acesso. O check #8 é informacional.

---

## Ações recomendadas

1. Rodar o script contra Railway antes de cada evento de produção (≥ 1x/mês).
2. Se check #4 encontrar guests com inviteToken e deletedAt: `UPDATE "Guest" SET "inviteToken" = NULL WHERE "deletedAt" IS NOT NULL`.
3. Se check #6 encontrar eventos sem OWNER: investigar se o usuário foi excluído manualmente do banco.
