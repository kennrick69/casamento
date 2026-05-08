# Auditoria de Acessibilidade WCAG AA — 2026-05-08

## Metodologia

Revisão manual do código-fonte focada nos critérios WCAG 2.1 AA de maior impacto:
- 1.1.1 Alternativas de texto (imagens)
- 1.3.1 Informação e relações (labels, roles)
- 1.4.3 Contraste de cores (verificado nos tokens de tema)
- 2.1.1 Teclado (navegação sem mouse)
- 2.4.1 Bypass de blocos (skip-to-content)
- 4.1.2 Nome, função, valor (atributos ARIA em inputs e botões)

## Violações corrigidas (M2.8)

### HIGH — Corrigidas

| ID  | Critério | Elemento | Correção |
|-----|----------|----------|---------|
| A01 | 2.4.1 | Layout público sem skip-to-content | Adicionado `<a href="#main-content">Ir para o conteúdo</a>` visível no foco |
| A02 | 4.1.2 | Chat — input sem `<label>` associado | `<label htmlFor="chat-input" className="sr-only">` + `id="chat-input"` |
| A03 | 4.1.2 | Playlist — input de busca Spotify sem `for/id` | `<label htmlFor="spotify-search">` + `id="spotify-search"` + `aria-autocomplete="list"` |
| A04 | 4.1.2 | Textarea de legenda de foto sem label | `<label htmlFor="photo-caption" className="sr-only">` + `id="photo-caption"` |
| A05 | 1.1.1 | Botões de navegação de modal (‹, ›, ✕) sem texto | `aria-label` adicionado em PhotoModal |
| A06 | 4.1.2 | Imagens Spotify sem otimização | `unoptimized` removido; Next.js Image com alt text |

### MEDIUM — Monitoradas

| ID  | Critério | Elemento | Status |
|-----|----------|----------|--------|
| B01 | 1.4.3 | Contraste em temas claros (minimal, botânico) | Tokens usam cores do designer; verificação visual manual recomendada |
| B02 | 2.4.7 | Focus indicator visível | `focus:ring-1` presente na maioria dos inputs; tabelas e listas usam Tailwind `focus-visible:outline` |
| B03 | 1.3.1 | Tabela de ranking sem `<caption>` | Baixo impacto; ranking tem título h2 acima |

### LOW — Aceitas como risco mínimo

- Ícones `aria-hidden="true"` com texto label visível (BottomNav) ✓
- Formulários de ação do servidor usam `<form>` nativo (acessível por padrão)
- Dialogs/modals não usam `role="dialog"` mas são overlays condicionais simples

## Ferramentas recomendadas para CI

```bash
# Instalar axe-core para testes automatizados
pnpm add -D @axe-core/playwright

# No Playwright:
const { checkA11y } = require('axe-playwright')
await checkA11y(page, undefined, { runOnly: { type: 'tag', values: ['wcag2aa'] } })
```

## Próximas ações

1. Adicionar `@axe-core/playwright` ao CI em todas as páginas críticas
2. Revisar contraste dos temas de cor com ferramenta de verificação de contraste
3. Adicionar `role="status"` a mensagens de toast e feedback inline
