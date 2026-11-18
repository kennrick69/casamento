# STATUS — Voem. / Modo Gamificado

Branch de trabalho: `feat/modo-gamificado` (criado a partir da `main`).
Regra de ouro: nada que funciona hoje pode quebrar; tudo do jogo fica atrás de `Event.experienceType`; só o que está estável vai para a `main`, e **o SQL de toda migration é mostrado antes de qualquer merge**.

Última atualização: 2026-11-17.

---

## Onde estamos

| Sprint | Tema | Status |
|---|---|---|
| S0 | Visão, docs, fix do PRESS START | ✅ feito |
| S1 | Gate de experiência (CLASSIC × GAMIFIED) + placeholder | ✅ feito (no branch, não na main) |
| S2+ | Jogo RPG (Phaser), personagem, salão, missões | ⏳ a fazer |

### S1 — entregue neste branch
- Enum `ExperienceType { CLASSIC, GAMIFIED }` + `Event.experienceType` default **CLASSIC** (migration aditiva `20261118020228_add_experience_type`).
- Painel: seção **"Experiência do convite"** em Configurações.
- Convidado de evento `GAMIFIED` → placeholder "em construção". Evento `CLASSIC` → site clássico **inalterado**.
- `tsc` 0 erros · `eslint` limpo · `vitest` 115/115 · build de produção compila.

Detalhe e passo-a-passo de teste: **`RELATORIO-MODO-GAMIFICADO.md`**.

---

## Ambientes
- **Produção:** `joseeleticia.com` (Railway, deploy da `main`). Build roda `prisma migrate deploy` → migration na main aplica na produção.
- **Dev DB:** Postgres `voem-dev` no Railway, em `.env.local` (gitignored, **não** é produção). 40 tabelas + seed (`/demo`, `/casamento-exemplo`, 30 convidados).

## Toolchain (WSL + checkout no mount Windows)
- Migrations: **WSL** (`prisma migrate deploy`). Seed e build: **Windows** (`cmd.exe … pnpm …`), porque `tsx`/esbuild e `prisma generate` quebram no mount WSL.
- `pnpm test` (vitest): rodar no **Windows**. Nunca `git add -A` (ruído CRLF); identidade de commit inline.

## Docs do projeto
- `docs/future-features/missao-original.md` — missão original (verbatim).
- `docs/future-features/modo-gamificado.md` — visão + fases + modelo de dados + sprints.
- `docs/ASSETS-LICENSES.md` — licenças LPC + obras derivadas (véu, saia e corpete de noiva brancos).
