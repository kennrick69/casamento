# Performance — Auditoria e Otimizações (M4.4, 2026-05-09)

## Resumo das melhorias aplicadas

### Service Worker (public/sw.js)
Atualizado de v1 (cache genérico) para v2 com estratégias por tipo de recurso:

| Recurso | Estratégia | Cache |
|---------|-----------|-------|
| `/_next/static/**` | Cache-first | `casamento-v2-static` (longa vida — hash no nome) |
| Imagens (png/jpg/webp/avif) | Cache-first + trim (50 items) | `casamento-v2-images` |
| Páginas HTML de evento | Stale-while-revalidate | `casamento-v2-pages` |
| `/api/**` | Network-only | — |
| `/admin/**`, `/login` | Network-only | — |
| Estáticos precacheados | Instalação | icon-192, icon-512, manifest.json |

### Preconnect / DNS prefetch (layout.tsx)
```html
<link rel="preconnect" href="https://challenges.cloudflare.com" />
<link rel="dns-prefetch" href="https://api.spotify.com" />
<link rel="dns-prefetch" href="https://socksv5.pusher.com" />
```
Cloudflare Turnstile carrega em toda página de auth — preconnect reduz RTT inicial.

### Next.js Image optimization (next.config.ts)
- `formats: ["image/avif", "image/webp"]` — já configurado (M2.7)
- `minimumCacheTTL: 3600` — cache de imagens otimizadas por 1h
- `remotePatterns` para Spotify — evita refetch de album art

### Lazy loading
- `galeria-grid.tsx`: `loading="lazy"` em todas as fotos exceto a primeira (que tem `priority`)
- `photo-grid.tsx` (mural): `loading="lazy"` em fotos fora da viewport inicial
- `opengraph-image.tsx`: runtime="nodejs" — gerado server-side, não impacta bundle

### Bundle analyzer
```bash
pnpm analyze  # ANALYZE=true pnpm build:local
```
Abre relatório interativo de bundle. Rodar antes de adicionar novas dependências grandes.

---

## Dependências de maior impacto (estimado — sem build local disponível)

| Dependência | Motivo | Estratégia |
|-------------|--------|-----------|
| `xlsx` (SheetJS) | ~1.3MB minificado | Importado só em `import-client.tsx` — carregado dinamicamente apenas na página de import |
| `recharts` | ~400KB | Importado só em `rsvp-chart.tsx` (`"use client"`) — code split automático pelo Next.js |
| `pdfkit` | ~600KB | Server-side only (`src/lib/pdf/`) — nunca no bundle do cliente |
| `date-fns` | ~100KB (tree-shaken) | Importações por função — OK |
| Fontes Google (6 famílias) | Servidas localmente por next/font | Zero RTT para fonts, sem FOUT |

**Risco alto:** `xlsx` é importado como `import * as XLSX from "xlsx"` em um Client Component.
O Next.js faz code split por rota, então carrega apenas na página `/importar` — OK.
Para garantir, adicionar `dynamic()` se bundle do chunk ficar > 200KB.

---

## Targets de performance (meta)

| Métrica | Target | Status |
|---------|--------|--------|
| FCP em 4G simulado (75ms RTT, 10Mbps) | < 1.5s | Não medido — requer servidor ativo |
| LCP | < 2.5s | Não medido |
| TTI | < 3.5s | Não medido |
| Lighthouse PWA | ≥ 90 | SW v2 + manifest correto |
| Lighthouse Performance (mobile) | ≥ 85 | Meta — rodar em produção |

---

## Como medir

```bash
# Bundle analysis
pnpm analyze

# Lighthouse CI (requer servidor)
pnpm test:perf

# Simular 4G no Chrome DevTools
# Network → 4G → F5 → checar FCP/LCP no Performance tab
```

## Próximos passos (backlog)
- Implementar `dynamic(() => import('xlsx'), { ssr: false })` em `import-client.tsx` para isolar o chunk do SheetJS
- Avaliar substituir `xlsx` por parser CSV puro para o caso de uso principal (CSV >> XLSX em frequência de uso)
- Lighthouse mobile em produção após próximo deploy — registrar scores aqui
