# Convenções de documentação

## Regra 1 — Links clicáveis em docs de teste

Todo item testável em docs de teste (`teste-noturno.md` e similares) **deve** ter um link
clicável direto para a página a testar. O testador não deve precisar montar a URL.

### Formato obrigatório

```markdown
**Onde testar:** [https://joseeleticia.com/admin/eventos/SEU_EVENTO_ID/convidados](https://joseeleticia.com/admin/eventos/SEU_EVENTO_ID/convidados)

**O que validar:**
- [ ] Descrição do comportamento esperado
- [ ] Outro comportamento esperado
```

Para múltiplas páginas, separe com `·`:

```markdown
**Onde testar:** [/login](https://joseeleticia.com/login) · [/forgot-password](https://joseeleticia.com/forgot-password)
```

### Parâmetros dinâmicos

| Placeholder | O que é | Como obter |
|-------------|---------|------------|
| `SEU_EVENTO_ID` | ID do evento no banco | Aparece na URL ao acessar https://joseeleticia.com/admin/eventos |
| `SEU_SLUG` | Slug público do evento | Configurado em https://joseeleticia.com/admin/eventos/SEU_EVENTO_ID/configuracoes |
| `joseeleticia` | Slug do evento real do casal | Usar diretamente — é o evento de produção |

---

## Regra 2 — URLs em docs sempre apontam para produção

Toda URL completa em qualquer arquivo `.md` de `docs/` deve apontar para o domínio
de produção `https://joseeleticia.com`. Nunca use:

- `http://localhost:3000` — use `https://joseeleticia.com`
- `https://*.up.railway.app` — use `https://joseeleticia.com`
- `http://localhost:8080` — use `https://joseeleticia.com`

**Exceção:** seções explicitamente marcadas como "ambiente local" ou "desenvolvimento",
como testes de seed (`pnpm seed:dev`) que requerem banco local.

---

## Regra 3 — Estrutura de seção de teste

Cada seção de teste deve ter:

```markdown
### Nome da Feature

**O que mudou:** descrição breve da mudança implementada (omitir para docs de usuário)

**Onde testar:** [link clicável](url) · [outro link](url2)

**O que validar:**
- [ ] Comportamento esperado 1
- [ ] Comportamento esperado 2

**Edge cases:**
- [ ] Caso de borda 1
```

---

## Como aplicar ao criar nova feature

Ao adicionar um bloco de testes em `teste-noturno.md`:

1. Adicione "**Onde testar:**" com link(s) clicável(is)
2. Use `joseeleticia` como slug para rotas públicas
3. Use `SEU_EVENTO_ID` para rotas com ID de evento
4. Não remova itens antigos — apenas adicione e marque

---

## Regra 4 — Checklist de QA obrigatório

Every new feature MUST have a corresponding item in `src/lib/qa/checklist.ts`. A feature without a QA checklist item is incomplete.
