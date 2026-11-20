# Relatório — Rodada 3 (missão autônoma, 2026-11-20)

Branch **`feat/s3-personagem`**. **Nada na main, nada em produção.** Migrations só
aditivas e só no voem-dev. `tsc` 0 erros e `eslint` limpo antes de cada commit.
Tudo conferido por screenshot (Chrome/Playwright do Windows) em `docs/screens-jogo/`.

## O que ficou pronto

### 0. Higiene de arquivos
`package-lock.json` (projeto é pnpm), `RESULTADO.md`, `dev-server.log` e screenshots
de rodadas (`r2/c2/w3/v2/_base/_diag`) → `.gitignore`. `escape-html.ts` não é
importado por ninguém → deixado solto (não commitado). Commit `8887ed5`.

### 1. Refino de colisões das 3 fases (commit `51cbf15`)
- **Mesas** (salão) e **pedestais** (bosque) viraram sólidos (corpo circular
  estático; raio < alcance de interação) — antes o avatar os atravessava.
- Bosque: box do lago alargado à esquerda (cobre o lobo esquerdo da água).
- Debug `?debug=1`: colisão em **magenta** (confundia com telhados/flores vermelhos).
- Varredura dirigindo o avatar: mesas/água bloqueiam, bordas seguram, trilha livre.
  Provas: `_c3-*`, `_c4-grande`, `r4-*`.
- Decisões em `docs/DECISOES-JOGO.md`: estrado do altar é piso caminhável;
  canteiros baixos são forração (não sólidos).

### 2. Recados do jogo no painel dos noivos (commit `eff0003`)
Seção **"Recados do jogo"** em *Acessos ao jogo*: mostra as mensagens que os
**visitantes** deixaram na Vila, com o **avatar real** de cada um (respeitando o
skin) e o texto **sem emojis**. Provas: `p2-recados-1280`, `p2-recados-390`.

### 3. Regressão completa (commit `69a104b`)
Fluxo real por Playwright (`scripts/game/regression.mjs`), visitante e organizador,
1280 e 390: entrar → criar personagem → salvar → mapa-múndi → 3 fases → missões →
voltar → sair. **Nenhum bug de código** (sem erros de console/página/HTTP). As
missões funcionam (recado da vila, memória do bosque → "Memórias 1/5", mesa do
grande dia). Provas: `reg-*`. (Instabilidade do proxy do voem-dev / pool Prisma
durante os testes — ambiente DEV, resolvida com restart; não é do código.)

### 4. Desempenho (celular, 4G simulado)
Medido no **build de produção** (`next start`), viewport 390, throttle 4G
(~4 Mbps / 100 ms), métrica = tempo até o jogo ser jogável (último asset do jogo).

| | jogável (mediana) | transfer |
|---|---|---|
| **Antes** | **~7,0 s** (runs 9,0 / 7,0 / 6,0) | 4,13 MB |
| **Depois** | **~4,7 s** (servidor quente: 4,6 / 4,7 s) | 3,88 MB |

Passou de >5 s para **<5 s** com o servidor quente — e produção (Railway) fica
sempre quente, sem o *cold start* do 1º acesso. Otimizações: (a) mapas **PNG →
WebP** (mundi 0,85→0,48 MB; fases 0,9–1,0→0,3–0,6 MB); (b) **preload** de Phaser +
mapa inicial + atlas no `<head>` da página do mapa — mata o *waterfall* (antes o
mapa só baixava depois do JS montar o canvas e injetar o Phaser). As fases seguem
carregando sob demanda (não pré-carrega tudo). Script: `scripts/game/perf.mjs`.
Provas visuais do WebP: `p4-webp-mapa`, `p4-webp-bosque` (sem artefato).

### 5. Plano de merge
`docs/PLANO-MERGE.md`: o que vai para produção, as **4 migrations aditivas com SQL
exato**, riscos, rollback e roteiro de teste em produção. **Merge NÃO feito.**

## Pendências
- **Merge para produção**: só com aprovação do JOs (ver `PLANO-MERGE.md`).
- **Escala/gosto**: o JOs validar tamanho/zoom/velocidade jogando (pendência antiga).
- Arco do altar: oclusão real exigiria desacoplar a profundidade do casal da âncora
  (ajuste futuro; ver `DECISOES-JOGO.md`).

## Links do dev (localhost:3000, voem-dev)
- Jogo (do zero): `/demo/jogo` → "Entrar como visitante" → criar → Entrar no jogo.
- Mapa-múndi: `/demo/jogo/mapa` · fase: `?start=vila|bosque|grande-dia`.
- Debug de colisão: `?debug=1` · spawn de teste: `?px=<x>&py=<y>`.
- Painel (admin `demo@joseeleticia.com` / `demo123`): *Acessos ao jogo* → Recados.
- Tools: `scripts/game/{screenshot,shot-admin,regression,perf,seed-recados-dev}.*`.
