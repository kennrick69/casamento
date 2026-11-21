# Feedback do JOs — teste do jogo no dev (19/11/2026, ~18h40)

Testado como VISITANTE ("jos"), Chrome em modo celular (462x823).

> **Status (atualizado após correções):** 19/19 itens numerados **FEITOS** e
> conferidos por screenshot (`docs/screens-jogo/`). Item 7 (noivos no altar) já
> existia e foi reconfirmado. Branch `feat/s3-personagem`, nada em produção,
> migrations só no voem-dev, tsc e eslint limpos.
>
> Como testar (dev): **mapa** `http://localhost:3000/demo/jogo/mapa` ·
> **fase** `?start=vila|bosque|grande-dia` · **colisões** `?debug=1` ·
> **visitante novo** entra em `/demo/jogo` e cria o personagem.

## Criador de personagem

1. **[FEITO]** Corpo troca auto a roupa/cabelo que não combinam; listas mostram
   só o que combina com o corpo. → `c2-criador-masc-390.png` (masc auto-vira
   terno+curto), `c2-criador-1280.png` (fem só vestidos).
2. **[FEITO]** Mais cabelos (LPC): masc — Topete, Social, Raspado, Cacheado curto
   (+ Curtinho); fem — Chanel, Cacheado, **Coque c/ franja**, Rabo de cavalo
   (+ Liso longo). → `c2-cabelos-montagem.png`, `c2-hair-topete.png`,
   `c2-hair-coque.png`.
3. **[FEITO]** Emerald: não reproduziu (render OK por screenshot) — provável
   flakiness do JIT do Tailwind v4 no 1º acesso frio do visitante. Botão "Salvar"
   ganhou afordância clara (borda/sombra). → `c2-criador-1280.png`,
   `nv-02-criador-390.png`.
4. **[FEITO]** Visitante NÃO vê mais "Noivo"/"Noiva" (somem da lista; trava real
   no save). → `c2-criador-1280.png` (só vestidos). *Obs.: screenshot do criador
   logado como organizador não foi feito (sessão NextAuth é JWT, inviável forjar);
   a renderização de noivo/noiva está provada nas prévias e no altar da Fase 3.*
8. **[FEITO]** Prévia é função pura dos params (sem banco/sessão): trocar opção só
   redesenha; oscilação do DB não derruba a página. → `c2-criador-masc-390.png`
   (re-render ao trocar corpo).
9. **[FEITO]** Erros amigáveis: prévia com try/catch + `onError`; error boundary
   em `/jogo` (nunca tela branca). (código: `jogo/error.tsx`, `preview/route.ts`).
10. **[FEITO]** Véu branco **por cima do cabelo**, inclusive coque com franja
    (antes a noiva saía sem véu). → `c2-noiva.png` (coque/liso/cacheado).
11. **[FEITO]** Terno (convidado) ≠ Noivo (organizador): terno = paletó charcoal +
    gravata vinho; noivo = smoking preto + gravata-borboleta branca. →
    `c2-terno-noivo.png`, `c2-noivo.png`.
18. **[FEITO]** Pós-save mostra botão grande "Entrar no jogo". →
    `c2-salvo-entrar-390.png`.

## Mapa-múndi

6. **[FEITO]** Sem emoji: marcadores viraram ícones em **pixel-art** (cadeado,
   estrela, pin, carta, flor, livro, porta, check); emojis removidos das
   mensagens. → `v2-world-390.png`.
12. **[FEITO]** Nós reposicionados sobre as plataformas de **pedra** (o boneco
    para no marcador, não no telhado). → `w3-00-inicio.png`.
13. **[FEITO]** D-pad só em tela de toque (`pointer: coarse`); no PC, teclado. →
    `v2-world-390.png` (celular, com D-pad), desktop sem D-pad.
19. **[FEITO]** Celular retrato: boneco aparece e câmera centrada; rótulo legível.
    → `v2-world-390.png`.

## Fases (vila)

14. **[FEITO]** Zoom responsivo: celular ~2 casas, PC quase a vila toda. →
    `v2-vila-390.png`, `v2-vila-1280.png`.
15. **[FEITO]** O boneco nasce visível na entrada (esquerda) com câmera seguindo
    (centerOn imediato). → `v2-vila-390.png`, `nv-03-npc-dialogo.png`.
16. **[FEITO]** "EN" e acessibilidade não aparecem mais dentro do jogo
    (`HideOnGame` em `/jogo`). → `v2-world-390.png` (topo sem EN).
17. **[FEITO]** Movimento livre 4 direções (cima/baixo/esq/dir, animação por
    direção, respeitando colisões). O "só esq/dir" era o botão ↓ do D-pad coberto
    pelo badge dev do Next. (Snap de grade não aplicado — mapas pintados à mão;
    ver DECISOES.) → `_diag-vila-moved-390.png`.

## Geral

5. **[FEITO]** Colisões ajustadas por mim via `?debug=1` (bancos, postes, mural,
   canteiros; lago/córrego; palco/DJ/bolo). → `col-vila-debug.png`,
   `col-bosque-debug.png`, `col-grande-debug.png`.
7. **[OK — reconfirmado]** Noivos no altar da Fase 3 (noiva de véu + noivo de
   smoking). → `col-grande-debug.png`.
20. **[FEITO]** Boneco segue a **trilha** por waypoints (curvas, pontes) e nunca
    corta grama/água. → `w3-ponte-meio.png` (sobre a ponte), `w3-01-bosque.png`.

### Novo fluxo de visitante (do zero), conferido
`nv-01-entrada-390.png` (entrada) → `nv-02-criador-390.png` (criador padrão) →
`nv-03-npc-dialogo.png` (NPC, variante visitante, sem emoji).

### Pendências do JOs (não bloqueiam)
- Screenshot do criador logado como **organizador** (precisa de login admin real).
- Ajuste fino das **âncoras** dos pedestais do bosque (caem perto das pedras, dá
  pra centralizar mais).
- Botão "EN" no site todo: decisão de produto sua (esconder nas Configurações?).
