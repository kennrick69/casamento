# Auditoria de Console Errors — QA.4 (2026-05-09)

Análise estática (sem servidor ativo). Categorias inspecionadas: `console.*` calls,
`<img>` sem Next.js Image, key props em `.map()`, aria attributes.

---

## console.* — resultado: todos legítimos

| Arquivo | Tipo | Motivo |
|---------|------|--------|
| `src/lib/email/console.ts` | `console.log` | Driver de email para dev local — intencional, não aparece em prod |
| `src/lib/realtime/noop.ts` | `console.log` | Stub de Pusher para dev — intencional |
| `src/app/**` + `src/lib/**` (22 calls) | `console.error` / `console.warn` | Tratamento de erros legítimo (catch blocks, fetch failures) |

**Conclusão:** nenhum `console.log` esquecido em código de produção (app/components).

---

## `<img>` sem Next.js Image

| Arquivo | Justificativa |
|---------|---------------|
| `src/app/(admin)/admin/eventos/[id]/gincana/qr-code.tsx:19` | `src` é um data URL (`data:image/png;base64,...`) gerado pelo lib `qrcode`. Next.js `<Image>` não aceita data URLs sem loader customizado. **Falso positivo** do lint rule `next/no-img-element`. |

**Ação:** nenhuma — uso correto. Suprimir o warning com `// eslint-disable-next-line next/no-img-element` se o CI exigir zero warnings.

---

## key props em .map()

Verificados todos os `.map()` que retornam JSX. Resultado:
- Todos os casos encontrados passam `key=` no elemento raiz do retorno.
- Exemplos verificados: `locations.map((loc) => <LocationCard key={loc.id} ...>)`,
  `activity.map((item) => <div key={item.id} ...>)`, etc.

**Conclusão:** sem warning de key prop esperado em runtime.

---

## aria attributes

| Arquivo | Observação |
|---------|------------|
| `src/app/(public)/[slug]/playlist/add-song-form.tsx:158` | `aria-expanded={results.length > 0}` em `<input>` — válido para campo de busca com listbox associado. Sem `aria-controls` apontando para o listbox, mas não é erro — apenas incompleto. |

**Ação:** melhoria futura (a11y nível AAA) — adicionar `aria-controls` e `role="combobox"` no input. Não bloqueia.

---

## Diagnóstico de hydration mismatch (estático)

Componentes que usam `new Date()` em render:
- `src/components/layout/bottom-nav.tsx` — `"use client"`, renderiza data atual. OK (client-only).
- `src/app/(public)/[slug]/page.tsx` — `new Date()` está em função server component. OK.
- Countdown no hero — client component com `useEffect`. OK (não hidrata clock no server).

**Conclusão:** sem risco de hydration mismatch identificado.

---

## Resumo

| Categoria | Status |
|-----------|--------|
| console.log em prod | ✅ Nenhum |
| console.error/warn legítimos | ✅ 22 — todos em error handling |
| `<img>` sem Next.js Image | ⚠️ 1 falso positivo (data URL no QR code) |
| key props ausentes | ✅ Nenhum |
| Aria incompleto | ⚠️ 1 (add-song-form, baixo risco) |
| Hydration mismatch | ✅ Nenhum identificado |
