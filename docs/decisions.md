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

## ADR-003 — Convidados sem login (apenas sessionToken em cookie)

**Data:** 2026-05-05
**Status:** Aceito

**Contexto:** criar conta é fricção desnecessária para convidados (muitos são pessoas mais velhas).

**Decisão:** convidados se identificam apenas com nome + email + telefone no auto-cadastro. `sessionToken` em cookie de 1 ano. Recuperação por magic link se cookie perdido. Auth.js v5 é só para os noivos.
