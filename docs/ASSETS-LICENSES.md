# Licenças de assets — Voem. Modo Gamificado

Registro de **autores + licença + link** de todo asset de terceiros usado no jogo.
Regra: só entram aqui os arquivos **efetivamente copiados/processados para `public/`** (ou para onde o jogo carregar). A pasta-fonte `assets-src/` fica fora do git e não é distribuída.

> O jogo **deve ter uma tela/link de Créditos** exibindo os autores abaixo (obrigação das licenças).

---

## 1. Personagens — pacote LPC (decisão tomada)

**Fonte:** Universal LPC Spritesheet Character Generator
- Repo: https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator
- Commit fixado: `04140673ec02906f8233523639733c83690df750` (baixado em 17/11/2026)
- Pasta-fonte local (fora do git): `assets-src/personagens/lpc/`
- Créditos por arquivo: `assets-src/personagens/lpc/CREDITS.csv` (13.916 linhas) — **fonte da verdade dos autores/licenças**
- Texto das licenças: `assets-src/personagens/lpc/LICENSE`

### Licenças presentes no pacote
Todas permitem **uso comercial**, mas **exigem crédito** aos autores. Cada arquivo lista uma ou mais:

| Licença | Uso comercial | Crédito obrigatório | Observação |
|---|---|---|---|
| CC0 1.0 | ✅ | não (mas registramos) | domínio público |
| OGA-BY 3.0 | ✅ | ✅ | atribuição (OpenGameArt) |
| CC-BY 3.0/4.0 | ✅ | ✅ | atribuição |
| CC-BY-SA 3.0 | ✅ | ✅ | **share-alike**: a arte derivada herda a licença |
| GPL 3.0 | ✅ | ✅ | **copyleft** sobre o asset (não contamina o código do app) |

> ⚠️ **Share-alike/copyleft (CC-BY-SA 3.0 + GPL 3.0):** aplicam-se à **arte** (os spritesheets que distribuímos), não ao código do jogo. Na prática: os PNGs finais que forem para `public/` carregam essas licenças e precisam manter os créditos deste arquivo + a tela de Créditos. Não impactam a licença do Next.js/código.

### Autores da base LPC (crédito mínimo garantido — a base de corpo é sempre usada)
bluecarrot16 · JaidynReiman · Benjamin K. Smith (BenCreating) · Evert · Eliza Wyatt (ElizaWy) · TheraHedwig · MuffinElZangano · Durrani · Johannes Sjölund (wulax) · Stephen Challener (Redshrike) · Pierre Vigier (pvigier) · Matthew Krohn (makrohn) · Nila122 · kheftel · Sander Frenken (castelonia) · dalonedrau

> A lista **definitiva e por arquivo** é gerada a partir do `CREDITS.csv` para exatamente os PNGs enviados ao `public/`, no S3.

### Arquivos efetivamente usados (`public/`)
**Status: nenhum arquivo copiado para `public/` ainda** — o criador de personagem (S3) ainda não começou. Conforme cada camada for processada, entra aqui uma linha:

| Arquivo (público) | Origem (assets-src) | Autores | Licenças |
|---|---|---|---|
| _(preenchido em S3)_ | | | |

---

## 1.1 Obras derivadas customizadas (`assets-src/personagens/custom/`)

Peças que o JOs pediu para eu criar a partir do LPC. Ficam em `assets-src/custom/` (fora do git) e **herdam a licença + créditos do asset original** (share-alike). Entram no `public/` e na tela de Créditos como qualquer outro asset.

### Véu de noiva — `custom/veil/` (criado em 2026-11-17)
- **O que é:** camada nova `veil`, branco translúcido (~65% de opacidade), silhueta derivada do cabelo **LPC `hair/xlong`**. Mesmas animações e frames 64×64 (walk, idle, sit, emote, run, jump), nas camadas `bg` (atrás do corpo) e `fg` (na frente), para combinar com a tiara (`hat_formal_tiara`).
- **Processo:** RGB → branco; alpha → 65% do original. Script: `scratchpad/make_veil.py` (determinístico, re-executável).
- **Asset original:** `hair/xlong/adult/{bg,fg}/*` do pacote LPC.
- **Autores (herdados):** Nila122 (original), JaidynReiman (limpeza/resplit/jump-run-sit).
- **Licenças (herdadas, share-alike):** OGA-BY 3.0, CC-BY-SA 3.0, GPL 2.0, GPL 3.0.
- **Links:** https://opengameart.org/content/lpc-expanded-xlong-hair · https://opengameart.org/content/lpc-clothes-and-hair
- **Crédito na tela de Créditos:** "Véu de noiva — obra derivada do cabelo LPC *xlong* de Nila122 e JaidynReiman (OGA-BY 3.0 / CC-BY-SA 3.0 / GPL)."

---

## 2. Áudio (pendente)
Músicas e efeitos 8-bit (S7): usar material **livre de direitos** ou **gerado por IA com licença comercial**; registrar aqui (autor, link, licença) antes de subir qualquer arquivo para `public/`.

---

## 3. Peças que FALTAM no pacote (JOs providencia)
Ver detalhe em [`future-features/modo-gamificado.md`](./future-features/modo-gamificado.md) §12. Resumo:
- **Véu de noiva** — ~~não existe no LPC~~ **criado** como obra derivada do cabelo `xlong` (ver §1.1). Aguardando aprovação do preview.
- **Gown de noiva dedicado** — composição `dress_bodice` + `legs_skirt_belle` (saia de baile) em branco + `hat_formal_tiara` cobre bem; um vestido de noiva específico seria "nice to have", não bloqueante.
- (Smoking com gravata-borboleta do padrinho **já é possível** com `torso_jacket_frock` + `vest` + `longsleeve_formal` + `legs_formal` + `neck_bowtie` + `hat_formal_tophat`.)
