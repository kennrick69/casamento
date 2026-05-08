# Auditoria R.2 — Wizard de criação de evento

> Estado atual do código. Nenhuma mudança aplicada ainda.
> Aguardando aprovação para aplicar correções.

---

## Fluxo atual (4 passos)

| Passo | Rota | Ação server | Avança para |
|-------|------|-------------|-------------|
| 1 Básico | `/admin/eventos/novo` | `createEventBasic` | `?step=2` |
| 2 Local | `?step=2` | `updateEventLocation` | `?step=3` (se DRAFT) |
| 3 Tema | `?step=3` | `updateEventTheme` | `?step=4` (se DRAFT) |
| 4 Publicar | `?step=4` | `publishEvent` | `/admin/eventos/[id]` |

---

## Passo 1 — Dados básicos ✅ (sem problemas)

- Heading, labels, placeholders e helper text: todos em português e claros
- Botão: "Próximo: Local →" — adequado
- Único campo técnico: `rsvpEarlyDeadline`, mas o label já está traduzido e há helper text explicativo

---

## Passo 2 — Local ✅ (sem problemas)

- Heading: "Local" — consistente com o nome usado em todo o app
- Labels e placeholders realistas ("Igreja São João", "Rua das Flores, 100 — São Paulo, SP")
- Botão: "Salvar local →" — adequado
- Traje é um campo relevante e o label é claro

---

## Passo 3 — Tema visual ✅ (sem problemas)

- Heading: "Tema visual" — claro
- Seleção visual de 5 temas com nomes e círculos de cor — UX adequada
- Botão: "Salvar tema →" — adequado

---

## Passo 4 — Publicar ⚠ (3 problemas)

### P4-A — "Modo de doação" aparece sempre, mesmo com feature desativada

```tsx
// PublishForm não verifica event.features.donations
// Mostra "Modo de doação" e "Chave PIX" mesmo quando donations: false
```

Casal que não ativou a lista de presentes vê campos de PIX sem contexto. 
**Sugestão:** renderizar os campos de doação somente se `features.donations === true`.

---

### P4-B — Label do checkbox de aprovação é verboso e técnico

**Atual:**
> "Requerer aprovação manual de convidados antes de mostrar o convite completo"

**Problema:** "Requerer" é formalismo técnico. "Aprovação manual" soa como ERP.

**Sugestão:**
> "Revisar cada convidado antes de liberar o convite"

Com helper text abaixo:
> "Ative se quiser aprovar individualmente cada convidado que se cadastrar."

---

### P4-C — Botão de publicação exibe emoji somente em estado novo

```tsx
{event.status === "PUBLISHED" ? "Salvar configurações" : "Publicar evento 🎉"}
```

Isso já está correto, mas o botão primário na tela de publicação quando `status=PUBLISHED` diz "Salvar configurações" — usuário retornou ao wizard após publicar. É confuso ver `step=4` com "Salvar configurações" no lugar de "Publicar". 
**Sugestão:** esse path (retornar ao wizard pós-publicação) provavelmente não acontece na prática (wizard só aparece se `isWizard && step > 0`). **Sem mudança necessária.**

---

## Problemas de fluxo (cross-steps)

### F1 — Sem botão "Voltar" entre passos

O cabeçalho tem "← Meus eventos" que abandona completamente o wizard. Não há "← Passo anterior" para navegar entre etapas.

**Impacto:** usuário que quer corrigir a data após avançar para passo 2 precisa voltar ao início ou ir em configurações separadamente.

**Sugestão:** adicionar link de navegação regressiva ("← Passo 1: Dados básicos") em cada passo do wizard.

---

### F2 — Falha silenciosa em todos os formulários

Se o Zod parse falhar (ex: URL do Maps malformada no passo 2), a `action` retorna sem redirecionar e sem mensagem de erro. O botão apenas deixa de processar — usuário não sabe o que aconteceu.

**Impacto:** raro em campos simples, mas o campo "Link do Google Maps" valida URL e pode falhar silenciosamente se o usuário colar um link sem `https://`.

**Sugestão:** retornar estado de erro da action e exibir mensagem inline. (Tech debt documentado, não bloqueador do wizard básico.)

---

### F3 — Progress bar em `font-mono`

```tsx
<div className="flex gap-2 mb-8 text-xs font-mono">
```

Fonte monospace nas pílulas de progresso ("1 Básico", "2 Local", "3 Tema", "4 Publicar") parece código, não convite de casamento.

**Sugestão:** remover `font-mono`, usar `font-medium` ou `font-sans`.

---

## Resumo

| # | Severidade | Onde | Problema | Mudança |
|---|-----------|------|----------|---------|
| P4-A | ALTO | Passo 4 | Campos de doação/PIX aparecem com feature desativada | Condicionar ao `features.donations` |
| P4-B | MÉDIO | Passo 4 | Label de aprovação verboso ("Requerer aprovação manual…") | Simplificar copy |
| F1 | MÉDIO | Todos | Sem botão "Voltar" entre passos | Adicionar nav regressiva |
| F2 | BAIXO | Todos | Falhas silenciosas de validação | Tech debt; não bloqueia |
| F3 | BAIXO | Todos | `font-mono` nas pílulas de progresso | Trocar por `font-medium` |
| P4-C | NENHUM | Passo 4 | Botão pós-publicação no wizard | Irrelevante na prática |
