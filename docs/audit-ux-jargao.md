# Auditoria R.1 — Jargão e Linguagem

> Estado atual do código. Nenhuma mudança aplicada ainda.
> Aguardando aprovação para aplicar correções.

---

## ALTO — Inglês visível ao usuário

| # | Arquivo | Linha | Texto atual | Sugestão |
|---|---------|-------|-------------|----------|
| 1 | `src/app/(admin)/admin/page.tsx` | 86 | `<span>owner</span>` (badge de papel no card do evento) | Remover badge ou substituir por "Proprietário" |
| 2 | `src/app/(public)/[slug]/checkin/page.tsx` | 40 | `<h1>Check-in</h1>` | `<h1>Entrada no evento</h1>` |
| 3 | `src/app/(public)/[slug]/checkin/page.tsx` | 53 | "para fazer check-in." | "para confirmar sua entrada." |
| 4 | `src/app/(public)/[slug]/checkin/checkin-form.tsx` | 27 | label `"Código de check-in"` | `"Código de entrada"` |
| 5 | `src/app/(public)/[slug]/checkin/checkin-form.tsx` | 48 | botão `"Fazer check-in"` | `"Confirmar entrada"` |
| 6 | `src/app/(public)/[slug]/checkin/actions.ts` | 61, 65 | mensagem de sucesso `"Check-in feito!"` | `"Entrada confirmada!"` |
| 7 | `src/app/(public)/[slug]/gincana/page.tsx` | 79 | link `"Fazer check-in no local"` | `"Confirmar chegada no local"` |
| 8 | `src/app/(admin)/admin/eventos/[id]/gincana/page.tsx` | 111 | heading `"Códigos de check-in"` | `"Códigos de entrada"` |
| 9 | `src/app/(admin)/admin/eventos/[id]/gincana/page.tsx` | 130 | placeholder `"Check-in cerimônia"` | `"Entrada cerimônia"` |

---

## MÉDIO — Jargão técnico em contexto de uso

| # | Arquivo | Linha | Texto atual | Sugestão |
|---|---------|-------|-------------|----------|
| 10 | `src/app/(admin)/admin/eventos/[id]/configuracoes/page.tsx` | 282 | label `"Gamificação (pontos e missões)"` | `"Gincana (pontos e missões)"` — alinha com o nome da página pública |
| 11 | `src/app/(admin)/admin/dev-tools/page.tsx` | 26 | `RATE_LIMITED: "Rate limited"` | `"Limite de tentativas"` — visível somente com DEV_TOOLS_ENABLED |
| 12 | `src/app/(legal)/privacidade/page.tsx` | 174 | cookie listado literalmente como `authjs.session-token` | Manter nome técnico, mas adicionar descrição: `"cookie de sessão (nome técnico: authjs.session-token)"` |

---

## BAIXO — Aceitável ou amplamente compreendido no Brasil

| Termo | Localização | Motivo para manter |
|-------|-------------|-------------------|
| "RSVP" | `privacidade/page.tsx` linhas 40, 62, 151, 187; `termos/page.tsx` linha 48 | Contexto jurídico; `termos/page.tsx:26` já tem "(RSVP)" como parentético |
| "Playlist" | bottom nav, headings | Termo consolidado no Brasil; substituir causaria estranheza |
| "Chat" | bottom nav | Idem |
| "link mágico" | `conta/page.tsx` | Spec do produto já prevê este termo |
| "PIX" / "Chave PIX" | presentes | Sistema de pagamento oficial; nome regulamentado |
| "hash irreversível" | `privacidade/page.tsx` | Contexto jurídico/técnico; adequado |
| "Muitas tentativas. Tente novamente em X min." | auth | Já em português ✅ |

---

## Resumo

- **9 ocorrências HIGH** — todas relacionadas ao fluxo de check-in (termo inglês exposto ao convidado)
- **3 ocorrências MEDIUM** — "Gamificação" vs "Gincana", dev-tools em inglês, cookie sem descrição
- **7 itens LOW** — manter como estão

**Impacto estimado das correções HIGH+MEDIUM:** 6 arquivos, ~15 linhas modificadas. Sem quebra de funcionalidade, sem migração de dados.

**Próximo passo aguardando aprovação:**
- Aplicar HIGH: renomear todo o fluxo check-in para "entrada" nos arquivos públicos e admin
- Aplicar MEDIUM #10: "Gamificação" → "Gincana" em configurações
- Aplicar MEDIUM #11: traduzir "Rate limited" em dev-tools
- Aplicar MEDIUM #12: adicionar descrição ao nome do cookie na política de privacidade
