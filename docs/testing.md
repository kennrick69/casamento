# Estratégia de Testes

## Visão geral

| Camada | Ferramenta | Comando | Quando roda |
|--------|------------|---------|-------------|
| Unit + Integration | Vitest | `pnpm test` | CI em todo PR e push |
| E2E (multi-browser, mobile) | Playwright | `pnpm test:e2e` | CI pós-deploy |
| Acessibilidade | axe-core + Playwright | `pnpm test:a11y` | Junto com E2E |
| Visual regression | Playwright screenshots | `pnpm test:visual` | Junto com E2E |
| Performance | Lighthouse CI | `pnpm test:perf` | Manual / pré-release |
| Carga | k6 | `pnpm test:load` | Manual / pré-evento |
| Tudo junto | — | `pnpm test:all` | Obrigatório antes de marcar fase concluída |

## Estrutura de pastas

```
tests/
  unit/           # Funções puras, lógica de negócio sem I/O
    setup.ts      # Mocks globais (DB, email, storage, realtime)
    lib/          # Testes de src/lib/
  integration/    # Server actions e API routes (com mocks de infra)
  e2e/            # Playwright — fluxos de usuário
    smoke.test.ts # Rotas críticas: 200, sem crash, mobile ok
  a11y/           # axe-core em todas as rotas públicas
  visual/         # Screenshot diff (mobile + desktop)
  load/           # Scripts k6
  scenarios/      # Cenários hipotéticos como testes executáveis
```

## Como rodar cada tipo

### Unit tests
```bash
pnpm test              # roda uma vez
pnpm test:watch        # modo watch (desenvolvimento)
pnpm test:coverage     # com relatório de cobertura
```
Não precisam de banco, servidor ou variáveis de ambiente. Rodam em ~1s.

### E2E (requer servidor rodando)
```bash
# Contra servidor local (inicia next dev automaticamente)
pnpm test:e2e

# Com UI interativa
pnpm test:e2e:ui

# Contra Railway
PLAYWRIGHT_BASE_URL=https://joseeleticia.com pnpm test:e2e
```
Roda em 4 browsers: chromium, webkit, mobile-chrome (Pixel 5), mobile-safari (iPhone 14).

### Acessibilidade
```bash
pnpm test:a11y
```
Usa axe-core com tags `wcag2a`, `wcag2aa`, `wcag21aa`. Falha em violações críticas e sérias.

### Visual regression
```bash
# Primeira execução: cria baseline
pnpm test:visual

# Atualizando baseline (após mudança intencional de UI)
pnpm exec playwright test tests/visual --update-snapshots
```

### Performance (Lighthouse CI)
```bash
# Requer servidor rodando em localhost:3000
pnpm run build && pnpm start &
pnpm test:perf
```
Thresholds: Performance ≥ 85, Acessibilidade ≥ 90, Best Practices ≥ 90, SEO ≥ 85.

### Carga (k6)
```bash
# Contra localhost
pnpm test:load

# Contra Railway (não faça isso sem avisar a Vercel/Railway)
k6 run tests/load/rsvp-flow.js --env BASE_URL=https://joseeleticia.com
```
Simula 200 VUs em rampa de 2 minutos. SLA: p95 < 2s, erro < 1%.

## CI (GitHub Actions)

Arquivo: `.github/workflows/ci.yml`

### Jobs

**unit** — roda em todo PR e push:
- `pnpm test` (Vitest)
- `pnpm typecheck`
- `pnpm lint`

**smoke** — roda só em push para `main` (após unit passar):
- Aguarda 90s para Railway terminar o deploy
- Roda `tests/e2e/smoke.test.ts` contra `$RAILWAY_URL`
- Upload do relatório Playwright como artefato

### Secrets necessários no GitHub

| Secret | Valor |
|--------|-------|
| `RAILWAY_URL` | URL pública de produção (ex.: `https://joseeleticia.com`) |
| `TEST_SLUG` | Slug do evento de teste (ex.: `casamento-exemplo`) |
| `TEST_PUBLIC_TOKEN` | `publicTokenK` do evento de teste |

## Regras invioláveis

1. **`pnpm test:all` deve passar antes de marcar qualquer fase como concluída.**

2. **Cada feature nova vem com:**
   - Unit das funções puras com mais de um branch
   - Integration da server action / rota API
   - E2E do fluxo principal (mobile viewport por padrão)
   - A11y da rota envolvida
   - Visual snapshot (mobile + desktop)

3. **Cenários hipotéticos: mínimo 15 por fase.** Cobrir:
   - Inputs maliciosos (XSS, SQLi, path traversal)
   - Inputs malformados (encoding inválido, tamanhos extremos, unicode, emoji)
   - Race conditions (ações simultâneas, reservas concorrentes)
   - Estados parciais (rede caiu no meio, refresh durante ação)
   - Casos de borda de tempo (fuso diferente, virada de dia, DST, data passada)
   - Casos de borda de dados (lista vazia, lista gigante, strings extremas)
   - Casos de borda de UI (320px, 4K, retrato/paisagem)
   - Compatibilidade de browser (Safari iOS, Chrome Android, Firefox)
   - Acessibilidade (teclado, alto contraste, zoom 200%)
   - Performance (3G simulado, CPU lenta)
   - LGPD (apagar dados, exportar, consentimento revogado)
   - Erros de provider (Resend offline, Pusher offline, banco lento)

4. **CI rejeita merges se unit ou typecheck falhar.**

## Interpretando falhas

| Falha | O que fazer |
|-------|-------------|
| Unit test falha | Lógica do código mudou — verifique a função apontada |
| E2E smoke falha com timeout | Railway ainda deployando — aguardar e re-rodar |
| A11y violation | Verificar o elemento no relatório axe, corrigir antes de merge |
| Visual diff | Se mudança intencional: `--update-snapshots`. Se não: investigar regressão |
| Lighthouse abaixo do threshold | Verificar bundle size, imagens sem otimização, JS bloqueante |
| k6 p95 > 2s | Checar queries N+1, índices no banco, cold start do Railway |
