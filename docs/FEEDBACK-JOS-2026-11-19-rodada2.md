# Feedback do JOs — rodada 2 (19/11/2026, noite)

> **Status: 12/12 itens FEITOS** e conferidos por screenshot (`docs/screens-jogo/`).
> Branch `feat/s3-personagem`, nada em produção, migrations só no voem-dev, tsc e
> eslint limpos. 8 commits (`84e5d02`→`b4d8bf3`).
>
> **Dev:** mapa `http://localhost:3000/demo/jogo/mapa` · do zero `.../demo/jogo`
> (entrar como visitante) · fase `?start=vila|bosque|grande-dia` · colisões `?debug=1`.

21. **[FEITO]** Criador: prévia fixa no topo (sticky) e botão "Salvar" numa barra
    fixa embaixo, depois de todas as escolhas. → `r2-criador-top-390.png`.
22. **[FEITO]** Bosque: as 5 âncoras de pedestal centralizadas sobre as pedras. →
    `r2-pedestais-bosque.png` (os "!" ficam sobre as pedras).
23. **[FEITO]** "Entrar no jogo" (pós-save) vai DIRETO ao `/jogo/mapa`, não à
    identificação. (criador-client: `href={/${slug}/jogo/mapa}`.)
24. **[FEITO]** Tela `/jogo` identificado simplificada: botão grande "Continuar
    jogando" + links menores "Editar meu personagem" e "Trocar de nome"; texto
    desatualizado removido. → `r2-identidade-390.png`.
25. **[FEITO]** Controles touch semitransparentes (~35-40%, mais opacos ao tocar)
    e menores; o "A" virou botão "Entrar" com ícone. → `r2-controles-390.png`.
26. **[FEITO]** Mapa-múndi: trilha por **A* sobre máscara da arte** (areia +
    pontes + escadas), waypoints densos (~10px). O boneco segue a trilha e nunca
    corta grama/água. `scripts/game/trail_mask.py`. → `r2-trail-bridge2.png`
    (cruzando a ponte inferior), `r2-mundo-grande-marcador.png`.
27. **[FEITO]** Profundidade estilo Pokémon: hitbox só nos pés; colisão dos
    objetos altos reduzida à base; camada de **overlay** (topo de poste, copa de
    árvore) desenhada acima do boneco quando ele está atrás (depth por Y). →
    `r2-meio-atras-poste.png` (atrás, ocluso) vs `r2-na-frente-poste.png` (na
    frente); `r2-overlay-debug.png` (recortes).
28. **[FEITO]** Escala do boneco 1.5x (~85% da altura das portas, antes ~22px),
    nearest (sem borrar); zoom/velocidade/hitbox recalibrados. →
    `r2-escala-vila-390.png`, `r2-escala-grande-1280.png`.
29. **[FEITO]** Indicador de missão: "!" amarelo em pixel-art, flutuando e
    piscando sobre o objeto da missão (caixa de correio, pedestais, a mesa do
    convidado); vira "✓" ao concluir. → `r2-missao-grande.png` (Mesa 2),
    `r2-missao-bosque.png`, `r2-missao-vila-npc.png`.
30. **[FEITO]** Fluxo do visitante NOVO conferido: entra → cria personagem →
    salva → mapa (tudo liberado) → vila (missão) → bosque → Grande Dia. Missão
    alternativa do visitante na vila: **"deixe um recado para os noivos"**
    (salvo em Guest.message) conclui a Vila sem RSVP. ?start funciona p/ qualquer
    um no dev. → `r2-recado-dialogo.png`, `r2-visitante-entra-grande.png`.
31. **[FEITO — bloqueador]** VISITANTE entra com TODAS as fases liberadas desde o
    início (sem cadeado, sem depender de missão). As missões continuam, mas não
    travam. RSVP real segue só para quem está na lista. →
    `r2-visitante-mundo-1280.png` (sem cadeados), `r2-visitante-entra-grande.png`.
32. **[FEITO]** Bugs do mapa-múndi: (a) rótulo do topo em linha única, sem cortar
    na borda; (b) nó do Grande Dia centralizado na **pedra redonda** sob a estufa
    (não na porta); (c) boneco maior (ver item 28). → `r2-mundo-grande-marcador.png`.

Obs.: item 31 (2ª parte) **feito** — organizador do evento logado também entra
com tudo liberado (modo de teste).

## Melhorias opcionais (não pedidas, dá pra estender)
- Overlays de profundidade (item 27): cobri os postes da vila + a copa central do
  bosque. Dá pra estender a mais árvores/telhados/arcos — é só listar as regiões
  em `world.ts` (campo `overlays` de cada fase).
