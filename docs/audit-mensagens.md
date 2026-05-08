# Auditoria R.4 — Mensagens de Erro e Estados Vazios

Data: 2026-05-08

## Metodologia

Varredura completa de `src/` buscando:
- Strings em inglês em respostas de API (`"Unauthorized"`, `"Forbidden"`, `"Bad request"`, `"Not found"`)
- Mensagens genéricas demais (`"Erro ao enviar."`, `"Dados inválidos"`)
- Estados vazios sem CTA ou explicação
- Textos de loading inconsistentes com o padrão gerúndio

Total analisado: ~112 mensagens user-facing (server actions, API routes, componentes).

---

## HIGH — Listar para revisão (não aplicado automaticamente)

Nenhum item classificado como HIGH nesta auditoria. Todos os problemas encontrados são puramente técnicos (inglês vs. português em respostas HTTP) sem decisão de produto envolvida.

---

## MEDIUM — Aplicado automaticamente

| # | Arquivo | Linha | Antes | Depois | Motivo |
|---|---------|-------|-------|--------|--------|
| M1 | `api/admin/.../convidados/export/route.ts` | 11 | `"Unauthorized"` | `"Não autorizado"` | Admin pode ver no browser ao acessar a URL diretamente |
| M2 | `api/admin/.../convidados/export/route.ts` | 18 | `"Forbidden"` | `"Acesso negado"` | Idem |
| M3 | `(public)/[slug]/mural/photo-uploader.tsx` | 31 | `"Erro ao enviar."` | `"Falha ao enviar. Tente novamente."` | Mostrado diretamente ao convidado em caso de erro de rede/parse |

---

## LOW — Aplicado automaticamente

Strings em inglês em rotas internas (cron, Pusher, endpoints de blob) — nunca mostradas em UI, mas inconsistentes com o padrão da base de código.

| # | Arquivo | Linha | Antes | Depois |
|---|---------|-------|-------|--------|
| L1 | `api/pusher/auth/route.ts` | 10 | `"Bad request"` | `"Requisição inválida"` |
| L2 | `api/qr/[slug]/route.ts` | 18 | `"Not found"` | `"Não encontrado"` |
| L3 | `api/photos/[key]/route.ts` | 23, 27 | `"Not found"` | `"Não encontrado"` |
| L4 | `api/cron/reminder/route.ts` | 14 | `"Unauthorized"` | `"Não autorizado"` |
| L5 | `api/cron/backup/route.ts` | 10 | `"Unauthorized"` | `"Não autorizado"` |

---

## Mantido como está (aprovado)

| Mensagem | Local | Motivo |
|----------|-------|--------|
| `"Dados inválidos"` | rsvp/actions.ts, recuperar/actions.ts | Fallback de último recurso para erros Zod inesperados — aceitável |
| `"Algo deu errado. Tente novamente."` | Wizard forms (4 arquivos) | Catch-all genuíno em blocos try/catch de client components — aceitável |
| `"Erro de autenticação. Tente novamente."` | login/actions.ts | Erro de banco inesperado em autenticação — mensagem genérica intencional |
| `"Muitas tentativas. Tente novamente em X min."` | login/actions.ts | Rate limiting — mensagem correta e específica |
| `"Falha ao enviar e-mail. Tente novamente."` | verify-email/actions.ts | Já em português correto |
| `"Falha ao enviar. Tente novamente."` | verify-email/resend-button.tsx | Já em português correto |
| `"Acesso negado."`, `"Conta suspensa."`, `"Mural desativado."` | fotos/upload/route.ts | Já em português correto |
| Todos os estados vazios admin/público | Múltiplos arquivos | Todos já em português com CTAs adequados |

---

## Estados Vazios — Inventário (todos aprovados)

| Página | Estado vazio | Status |
|--------|-------------|--------|
| Admin › Convidados | "Nenhum convidado ainda." | ✅ OK |
| Admin › Presentes | "Nenhum presente cadastrado ainda." | ✅ OK |
| Admin › Mural | "Nenhuma foto aguardando aprovação." | ✅ OK |
| Admin › Moderação | "Nenhuma denúncia pendente." | ✅ OK |
| Admin › Notificações | Explicação de lembretes automáticos | ✅ OK |
| Público › Mural | "Ainda não há fotos. Seja o primeiro!" | ✅ OK |
| Público › Chat | "Sem mensagens ainda. Diga olá!" | ✅ OK |
| Público › Playlist | "Nenhuma música ainda. Sugira a primeira!" | ✅ OK |
| Público › Presentes | "Lista de presentes em breve." | ✅ OK |
| Público › Gincana | "Nenhuma missão disponível no momento." | ✅ OK |
