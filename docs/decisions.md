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

## ADR-004 — Princípios de diagnóstico (como investigar erros)

**Data:** 2026-05-07
**Status:** Aceito

**Contexto:** durante o desenvolvimento, foram feitas mudanças especulativas ("correções") baseadas em hipóteses de erro sem evidência concreta — o que resultou em commits incorretos que precisaram ser revertidos e custo de atenção desnecessário.

**Decisão:** antes de propor ou implementar qualquer mudança motivada por um possível erro, exigir evidência concreta de um dos seguintes tipos:

- Log de build ou runtime com stack trace
- Screenshot ou descrição exata da tela de erro
- Comando executado e output exato
- Comportamento observado vs comportamento esperado (ambos descritos com precisão)

Se não houver evidência disponível: **perguntar ao usuário** em vez de inferir e codificar. Nunca fazer "correções especulativas" — a probabilidade de introduzir regressões é maior que a de acertar o diagnóstico sem dados.

**Como aplicar:**

- Usuário reporta erro → pedir log/screenshot antes de tocar no código
- Build Railway falhou → pedir os logs do Railway antes de propor mudanças
- "Não consigo testar" → perguntar qual é o erro específico observado
- Exceção: problemas de configuração óbvios e reversíveis (ex.: falta de `await`, typo em import) podem ser corrigidos sem evidência adicional

**Consequências:** diagnósticos mais lentos às vezes, mas sem commits desnecessários, sem regressões especulativas e sem documentação que descreve uma realidade que não existe.

---

## ADR-007 — Prisma generate é obrigatório em todo job CI que importa @prisma/client

**Data:** 2026-05-07
**Status:** Aceito

**Contexto:** o job `smoke` do GitHub Actions falhou com `Cannot find module '.prisma/client/default'`. O erro ocorreu após o A.1 adicionar novos modelos ao schema. O Prisma Client é gerado em runtime por `prisma generate` e não é commitado no repositório. Cada job no GitHub Actions roda em runner Ubuntu isolado — artefatos (incluindo arquivos gerados) não são compartilhados entre jobs mesmo que `needs: [unit, typecheck]` esteja declarado. Os jobs `unit` e `typecheck` tinham `prisma generate` explícito; `smoke` não tinha.

**Por que "postinstall" foi descartado:** adicionar `prisma generate` como script `postinstall` no `package.json` faria ele rodar em toda instalação de dependências — incluindo ambientes que não precisam (Docker de build que só roda `next build`, pipelines de lint-only, `npm install` de um desenvolvedor novo). O custo de tempo e acoplamento é desnecessário quando o problema é localizado e a correção pontual é clara.

**Decisão:** cada job CI que importa `@prisma/client` direta ou indiretamente deve ter um step explícito `pnpm exec prisma generate` logo após `pnpm install --frozen-lockfile`. Sem exceções.

**Regra de detecção:** ao criar um novo job CI, perguntar: "algum arquivo importado por este job (direta ou indiretamente) usa `@prisma/client`?" Se sim, o step é obrigatório. Isso inclui:
- Qualquer job que rode testes com fixtures de banco
- Qualquer job que suba um servidor Next.js local (webServer no Playwright)
- Qualquer job que importe `src/lib/db` ou qualquer action/page server-side

**Consequências:** jobs CI ficam autossuficientes. Fácil de auditar: basta grep `prisma generate` no `.yml` e comparar com jobs que usam Prisma. O custo de ~5s por job é compensado pela ausência de falhas silenciosas.

---

## ADR-006 — Paridade entre validação local e build de produção

**Data:** 2026-05-07
**Status:** Aceito

**Contexto:** o build no Railway falhou com "exports de arquivo 'use server' devem ser async" — uma regra que o Next.js valida em build time mas que TypeScript e os testes unitários não cobrem. O erro "passou local, falhou em produção" indica gap na camada de validação, não só um bug pontual.

**Decisão:** toda regra que o build de produção valida deve ter um equivalente local que falha **antes** do push. Quando um erro do tipo "passou local, falhou no build" ocorre:

1. Corrigir o bug pontual
2. Identificar por que o check local não pegou
3. Adicionar o check ao pipeline local (`pnpm test:all` e/ou hook `pre-push`)
4. Documentar a nova validação aqui

**Validações implantadas:**

| Regra | Ferramenta | Quando roda |
|-------|-----------|-------------|
| TypeScript strict | `pnpm typecheck` | CI + pre-push |
| ESLint | `pnpm lint` | CI + pre-push |
| Exports async em `"use server"` | `scripts/check-server-actions.mjs` | CI (`test:all`) + hook pre-push |
| Testes unitários | `pnpm test` | CI + pre-push via `test:all` |

**Como aplicar:**

- Erro de build no Railway que não foi pego localmente → identificar a categoria do erro → adicionar ao pipeline → não fechar sem o check implantado.
- O script `scripts/check-server-actions.mjs` detecta funções exportadas sem `async` em arquivos `"use server"`. Roda como hook `pre-push` e em `pnpm test:all`.

---

## ADR-005 — Mudanças de decisões acordadas

**Data:** 2026-05-07
**Status:** Aceito

**Contexto:** durante o desenvolvimento da Fase 3, foi adicionada uma barra de navegação inferior com 5 abas (Início, Fotos, Chat, Playlist, Presentes) sem consultar o usuário, sobrescrevendo a decisão anterior de 4 abas (Início, Roteiro, Local, Presentes). A justificativa foi "parece óbvio dado o contexto" — o que é uma premissa perigosa.

**Decisão:** ao perceber a necessidade de mudar uma decisão de produto ou arquitetura previamente acordada, parar e apresentar a mudança proposta antes de implementar. Não "completar" a decisão sozinho mesmo quando parece óbvio. Aplica-se especialmente a:

- Navegação e estrutura de menus
- Fluxos de usuário (RSVP, autenticação, recuperação)
- Contratos de API (formatos de request/response)
- Estrutura de autorização (quem pode acessar o quê)

**Como aplicar:**

1. Identificou que uma decisão precisa mudar → escrever a proposta com contexto
2. Apresentar ao usuário com as opções e tradeoffs
3. Aguardar aprovação explícita antes de implementar
4. Se implementação parcial já ocorreu: revelar o desvio junto com a proposta

**Consequências:** ciclos de revisão mais frequentes em mudanças de decisão. Compensado por evitar retrabalho, regressões e divergência entre produto acordado e produto implementado.

---

## ADR-008 — Testes com datas exigem tempo fixo; hook simula TZ=UTC

**Data:** 2026-05-07
**Status:** Aceito

**Contexto:** o teste `bottom-nav.test.ts` falhava em CI intermitentemente com "expected length 5, got 4". Causa raiz: o teste usava `new Date()` + `setHours(12,0,0,0)` para construir uma data de cerimônia relativa ao "hoje". Em CI (Ubuntu, TZ=UTC) o push às 21:25 BRT ocorre às 00:25 UTC do dia seguinte — o "hoje" em UTC virou amanhã em relação ao que o teste esperava. Localmente (TZ=America/Sao_Paulo) o mesmo teste sempre passava porque `setHours` e o relógio interno da função usavam o mesmo fuso. O pre-push hook não pegou porque: (a) não rodava `pnpm test`, e (b) mesmo que rodasse, usaria o TZ local do dev.

**Decisão:**

1. **Testes que envolvem datas devem usar tempo determinístico.** Usar `vi.useFakeTimers()` + `vi.setSystemTime(FIXED_DATE)` em `beforeEach` e `vi.useRealTimers()` em `afterEach`. Nunca construir datas relativas a `new Date()` sem mock — esses testes são flaky por definição.

2. **Usar ISO strings fixas para datas de teste**, não `new Date()` + `setHours()`. Exemplo correto: `const TODAY_ISO = "2025-06-15T15:00:00.000Z"`. Assim o teste tem o mesmo comportamento em qualquer TZ.

3. **O hook pre-push roda os testes em `TZ=UTC`** para simular o ambiente do CI. Um teste que passa local (BRT) mas falha em UTC é detectado antes do push.

**Como detectar testes flaky de TZ no futuro:**
- Grep por `new Date()` sem mock nos arquivos de teste: `grep -rn "new Date()\|Date.now()" tests/ --include="*.ts"`
- Candidatos de risco: testes que usam `new Date()` E fazem conversão de timezone, comparação de datas calendário, ou operações dependentes de "hoje"
- Candidatos de baixo risco: testes que usam `Date.now()` apenas para criar timestamps relativos (ex.: `expiresAt = Date.now() + 86400000`) sem conversão de fuso

**Auditoria (2026-05-07):**

| Arquivo | `Date.now()`/`new Date()` sem mock | Risco TZ | Status |
|---|---|---|---|
| `bottom-nav.test.ts` | ✅ | ALTO (converte para SP) | **Corrigido** |
| `co-org-token.test.ts` | timestamps relativos | BAIXO (sem conversão TZ) | Monitorar |
| `scenarios/fase-0-1.test.ts` | timestamps relativos | BAIXO (sem conversão TZ) | Monitorar |

**Consequências:** todos os testes de data passam tanto em BRT quanto em UTC. O hook pega regressões antes do push.

---

## ADR-003 — Convidados sem login (apenas sessionToken em cookie)

**Data:** 2026-05-05
**Status:** Aceito

**Contexto:** criar conta é fricção desnecessária para convidados (muitos são pessoas mais velhas).

**Decisão:** convidados se identificam apenas com nome + email + telefone no auto-cadastro. `sessionToken` em cookie de 1 ano. Recuperação por magic link se cookie perdido. Auth.js v5 é só para os noivos.

---

## ADR-009 — Bloco A (Auth profissional) — concluído

**Data:** 2026-05-08
**Status:** Aceito

### O que entrou (A.1 → A.10)

| Sub-bloco | Descrição |
|---|---|
| A.1 | Modelo User com campos de auth (firstName, lastName, phone, passwordHash, termsVersion, etc.) e enums AuthAction, UserRole |
| A.2 | (incluído em A.1 — campos base de auth) |
| A.3 | Páginas /login e /signup com tabs, react-hook-form, zxcvbn, honeypot, rate limiting |
| A.4 | Verificação de e-mail: token UUID→SHA-256, /verify-email com countdown, /admin/onboarding 3 telas, /admin/dev-tools com DEV_TOOLS_ENABLED guard |
| A.5 | Cloudflare Turnstile (CAPTCHA opcional via NEXT_PUBLIC_TURNSTILE_SITE_KEY) |
| A.6 | Password reset completo: /forgot-password com anti-enumeration, /reset-password com zxcvbn, invalidação de sessões via passwordChangedAt + JWT callback |
| A.7 | /admin/conta — dados pessoais, alterar senha, notificações (marketingOptIn) |
| A.8 | Headers de segurança: HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, CSP baseline |
| A.9 | Termos de Uso v1.0 e Política de Privacidade v1.0 (placeholder com TODO jurídico), /aceitar-termos com bloqueio no admin layout |
| A.10 | Audit: unit tests para hashToken/checkRateLimit/verifyTurnstile, smoke E2E de auth, a11y em páginas de auth, Lighthouse CI setup |

### Tech-debt explícito (para revisitar)

| Item | Localização | Trigger para resolver |
|---|---|---|
| Revisão jurídica dos termos e política | `docs/legal/termos-v1.md`, `docs/legal/privacidade-v1.md` | Antes de qualquer lançamento comercial |
| `'unsafe-inline'` em CSP script-src/style-src | `next.config.ts` | Implementar nonces via Middleware quando necessário (bloqueia nota A+ no securityheaders.com) |
| DPO e CNPJ na política de privacidade | `docs/legal/privacidade-v1.md`, `/privacidade/page.tsx` | Abertura da empresa |
| SCCs para transferência internacional (Resend/Railway/Pusher) | `docs/legal/privacidade-v1.md` | Antes do lançamento |
| Job automático de deleção de dados do evento (90 dias pós-cerimônia) | `schema.prisma: Event.ceremonyDate` | Antes do primeiro evento em produção real |
| Substituição do Storage de Railway Volume → Cloudflare R2 | `src/lib/storage/index.ts` | Ao atingir limites de volume ou em produção |

### Lighthouse — resultados esperados (auth pages, mobile)

Executado via `@lhci/cli` no job smoke após deploy no Railway. Scores esperados baseados na análise da stack:

| Página | Performance | Accessibility | Best Practices | SEO | Nota |
|---|---|---|---|---|---|
| /login | 90–95 | 90–95 | 85–90 | 90–95 | `unsafe-inline` no CSP penaliza Best Practices |
| /forgot-password | 92–97 | 90–95 | 85–90 | 90–95 | idem |
| /termos | 95–100 | 95–100 | 85–90 | 90–95 | Página estática leve |
| /privacidade | 95–100 | 95–100 | 85–90 | 90–95 | Página estática leve |

**Fatores que afetam negativamente:**
- `'unsafe-inline'` em `script-src` e `style-src` → Lighthouse Best Practices deduz pontos (flag de segurança)
- Widget Turnstile (se ativo) carrega script externo → leve impacto em Performance
- `next/font/google` com `display: swap` → sem FOIT, mas possível FOUT mínimo

**Fatores positivos:**
- Fontes self-hosted pelo Next.js (zero requisição para fonts.googleapis.com em runtime)
- Páginas leves — sem imagens pesadas, sem JS bundles grandes
- HSTS configurado → Best Practices ++
- Sem cookies de terceiros → Best Practices ++

*Scores reais aparecem nos artifacts do CI após push.*

### Axe A11y — cobertura

Rotas públicas testadas com axe-core (WCAG 2.1 AA, exceto color-contrast que é verificado via tema):

- `/login` — formulário com labels, tabs com roles corretos
- `/forgot-password` — formulário acessível
- `/termos` — documento de prose estruturado
- `/privacidade` — documento de prose com tabelas

Rotas de auth que requerem sessão (testadas manualmente):
- `/verify-email` — requires auth
- `/admin/conta` — requires auth + terms accepted
- `/aceitar-termos` — requires auth

