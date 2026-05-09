# Auditoria Mobile — QA.5 (2026-05-09)

Auditoria estática para viewport 375×667 (iPhone SE). Sem servidor ativo;
verificações confirmadas com leitura de código.

---

## Issues encontrados e corrigidos

### QA.5-FIX-1: Bottom nav sem safe-area-inset-bottom (iPhone X+)

**Problema:** `<nav>` do bottom nav usa `fixed bottom-0` sem `padding-bottom: env(safe-area-inset-bottom)`.
Em iPhone X, 11, 12, 13, 14, 15 (todos com home indicator), a barra fica atrás do indicador de home.

**Fix aplicado:**
- `src/app/layout.tsx`: adicionado `viewportFit: "cover"` no Viewport export para habilitar safe area APIs.
- `src/components/guest/bottom-nav.tsx`: adicionado `style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}` no `<nav>`.
- `src/app/(public)/[slug]/layout.tsx`: padding-bottom do main atualizado para `calc(5rem + env(safe-area-inset-bottom, 0px))` para evitar que conteúdo fique atrás do nav.

---

## Issues conhecidos — não bloqueantes

### QA.5-KNOWN-1: Tabelas na página de privacidade sem overflow-x

**Arquivo:** `src/app/(legal)/privacidade/page.tsx` (3 tables)
**Problema:** As tabelas não têm wrapper com `overflow-x-auto`, podem causar scroll horizontal em viewports estreitos.
**Impacto:** Baixo — página legal raramente acessada em mobile. Nenhum usuário de negócio afetado.
**Ação sugerida:** Envolver cada `<table>` em `<div className="overflow-x-auto">` quando houver demanda.

### QA.5-KNOWN-2: Botões pequenos (h-8) em contextos não-críticos

**Arquivo:** `src/components/ui/button.tsx` size variants
**Problema:** Variant `sm` gera `h-7` (28px), abaixo do mínimo WCAG de 44px de touch target.
**Impacto:** Afeta apenas botões de moderação admin (não é fluxo do convidado). Desktop-first aceitável.
**Ação sugerida:** Auditar botões admin que usam `size="sm"` e adicionar `min-h-[44px]` onde viável.

### QA.5-KNOWN-3: QR Code fixo em 120px

**Arquivo:** `src/app/(admin)/admin/eventos/[id]/gincana/qr-code.tsx`
**Problema:** QR Code renderizado em `120×120px` — legível mas pequeno para scanning em mobile.
**Impacto:** Apenas admin. Convidados escaneiam QR impresso, não digital.
**Ação sugerida:** Aumentar para `160px` se surgir feedback de dificuldade de scanning.

---

## Verificações OK

| Item | Status |
|------|--------|
| Viewport meta (width=device-width, initial-scale=1) | ✅ Configurado em layout.tsx |
| RSVP page max-w-lg mx-auto px-4 | ✅ Mobile-first |
| Bottom nav touch targets (min-h-[48px]) | ✅ Acima de 44px WCAG |
| Hero com countdown — sem overflow horizontal | ✅ Usa flex-wrap e gap |
| Chat page input fixo na base | ✅ Posicionado com sticky/fixed |
| Galeria lightbox teclado+swipe | ✅ Keyboard nav + touch events |
| Mural photo grid (grid-cols-2) | ✅ Responsivo 2 colunas |
| Presentes list overflow text (truncate) | ✅ Truncado corretamente |
| RSVP form input labels | ✅ Labels explícitos em todos inputs |
