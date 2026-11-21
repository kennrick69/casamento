# Feedback do JOs — 20/11/2026

> **STATUS: 11/11 FEITOS** (itens 33–43), no branch `feat/s3-personagem`, nada em
> produção, `tsc`/`eslint` limpos, cada item provado por screenshot em
> `docs/screens-jogo/`. Commits `8887…`→`2f8ddf1`.
>
> | Item | Status | Commit | Prova |
> |---|---|---|---|
> | 42 vila: só nas lajotas (máscara) | ✅ FEITO | d6dd5cb | m-vila-casa, m-vila-dir |
> | 41 overlays dos postes removidos | ✅ FEITO (decisão) | d6dd5cb | — |
> | 40 bosque: só na trilha | ✅ FEITO | d6dd5cb | m-bosque-sair, m-bosque-trilha |
> | 34 selo de dev off | ✅ FEITO | d6dd5cb | m-selo2 |
> | 43 fecha modais ao trocar de cena | ✅ FEITO | 4ac60ae | m43-memoria-aberta, m43-apos-mapa |
> | 36 parede inferior sólida | ✅ FEITO | 6645e37 | m-gd-parede |
> | 36b porta estreita | ✅ FEITO | 6645e37 | m-gd-parede |
> | 38 nada atrás do altar | ✅ FEITO | 6645e37 | m-gd-altar |
> | 39 botões A/B GBA + dicas | ✅ FEITO | 0db16a5 | m39-botoes, m39-hint-pc |
> | 37 mesas pixel-art + escala + distribuição | ✅ FEITO | 7692f38 | m37-mesas |
> | 35 setas pela direção na tela | ✅ FEITO | 2f8ddf1 | m35-chega-grande, m35-down-volta |
> | 33 trilha pelo centro (pontes/escadas) | ✅ FEITO | 2f8ddf1 | m33-trilha-centro |
>
> Decisão de arquitetura: vila e bosque passaram de colisão-por-retângulos para
> **máscara caminhável** (anda só no piso pintado + folga), gerada da arte por
> `scripts/game/walk_mask.py`. Detalhes em `docs/DECISOES-JOGO.md`.


33. Mapa-múndi: nas PONTES o boneco anda pela BORDA (corrimão/água) e não pelo meio do tabuleiro. Causa provável: o A* na máscara pega o caminho mais curto rente à borda. Corrigir: (a) erodir a máscara da trilha (afastar ~6-8 px das bordas) antes do A*, ou dar custo maior perto da borda (distance transform) para o trajeto seguir a LINHA CENTRAL; (b) nas pontes e escadas, forçar waypoints no eixo central. Conferir por screenshot/frames em TODAS as pontes e escadas, nos dois sentidos.
34. Selo "N 1 Issue" do Next (dev) cobre o botão ↓ do D-pad: devIndicators: false no next.config (só dev).
35. Mapa-múndi: as setas não seguem a DIREÇÃO NA TELA. Ex.: no marcador do Grande Dia (salão de vidro), para voltar ao marcador anterior (que fica EMBAIXO, descendo a escada) é preciso apertar ↑. Estilo Super Mario World: cada seta escolhe o vizinho cujo trecho de trilha SAI do marcador naquela direção (compare a direção dos primeiros ~30 px do trajeto com ↑↓←→, maior produto escalar vence). Se nenhum vizinho estiver naquela direção, não anda. Vale para teclado, D-pad e toque. Conferir em todos os marcadores.
36. Grande Dia: o boneco ANDA POR CIMA DA PAREDE de baixo do salão (a fachada com janelas em arco/lanternas/canteiros) e sai do salão. A parede inferior precisa ser sólida em toda a extensão, exceto a PORTA de entrada (tapete vermelho, no centro). Revise TODAS as paredes das 3 fases (topo, laterais, base): o boneco só sai pelas portas/saídas. Provar andando colado em cada parede.
36b. Mesmo problema na PORTA de entrada do salão: o boneco fica em cima da parede ao lado da porta. A abertura caminhável deve ter só a largura da porta (tapete vermelho).
37. Mesas do Grande Dia parecem PROVISÓRIAS: círculos chapados com texto monoespaçado ("Mesa 3") e cadeiras marrons em bolinha. Fazer sprites em pixel art no MESMO estilo da arte do salão (toalha branca com sombra, arranjo de flores no centro, cadeiras de madeira com encosto vistas de cima 3/4), na escala certa em relação ao boneco (cadeira ~ largura do boneco; mesa de 8 lugares bem maior que o boneco). Nome da mesa numa plaquinha/placa de mesa ou etiqueta legível com a fonte do jogo, não monoespaçada. Distribuir as mesas ocupando o salão (hoje estão todas no topo, com o centro vazio).
38. Grande Dia: dá para o boneco sumir ATRÁS do altar/colunas (entre o estrado e a parede do fundo). Ali é parede: não deve ser caminhável. Bloquear o espaço atrás do altar, das colunas e entre o estrado e a parede do fundo; o boneco pode subir no estrado pela frente, mas não passar por trás. Conferir que nenhum ponto caminhável deixe o boneco totalmente escondido (sem querer) em nenhuma fase.
39. Controles estilo GBA: no celular, botões A e B redondos do lado DIREITO (oposto ao direcional), visual de Game Boy Advance em pixel art, semitransparentes. A = ação (entrar/falar/interagir), B = voltar/cancelar (fechar diálogo, sair da fase para o mapa). Trocar o botão "Entrar" atual por esse par. Dicas na tela coerentes com o aparelho: no celular "aperte A"; no PC "aperte Enter (ou E)" e "Esc" para voltar — o PC também aceita Z/X como A/B. Corrigir o rótulo do topo "· aperte A" que aparece cortado (sem o nome do lugar/ação antes do "·").
40. Bosque: liberar SÓ A TRILHA de terra para andar (mais a ponte e um pequeno recuo em volta de cada pedestal para interagir). Grama, canteiros, árvores e arbustos ficam bloqueados — hoje o boneco sai da trilha e some atrás das árvores, o que é ruim. Gerar a área caminhável a partir da máscara da trilha (mesma técnica do mapa-múndi), com uma folga pequena nas bordas. Conferir por screenshot andando a trilha inteira, de ponta a ponta, e tentando sair dela em vários pontos.
41. Vila: o recorte de profundidade (overlay) do POSTE ficou mal cortado: um retângulo da arte (com pedaço de piso/grama) aparece por cima do boneco, cortando a cabeça dele de forma estranha. Recortar o overlay pelo CONTORNO do objeto (máscara alfa só dos pixels do poste/lanterna, não um retângulo), ou desenhar o overlay como sprite próprio com fundo transparente. Revisar TODOS os overlays (postes, árvores, telhados, arcos) com a mesma regra.
42. Vila: o boneco SOBE NA CASA (anda sobre a fachada/telhado, entre as janelas). Casas inteiras são sólidas; só a calçada/praça e a frente da porta são caminháveis. Mesma solução do bosque: na vila, liberar só o calçamento de pedra da praça e os caminhos (máscara da arte), com folga pequena; grama, canteiros, casas, cercas e árvores bloqueados.

## DECISÃO do JOs (substitui 41 e refina 42)
41/42. Vila: REMOVER os overlays de profundidade das luminárias/postes (não precisa passar por trás deles). A movimentação na vila fica ESTRITAMENTE onde há LAJOTAS/calçamento de pedra no chão (praça + caminhos de pedra), gerado pela máscara da arte com folga pequena. Postes, bancos, caixa de correio e canteiros sobre o calçamento viram obstáculos sólidos pela base. Grama, casas, cercas, árvores: bloqueados.
43. Ao sair do bosque (botão "Mapa") com uma MEMÓRIA aberta (ex. "SET 2023 · O pedido"), o modal continua na tela por cima do mapa-múndi. Ao trocar de fase/cena (ou voltar ao mapa), fechar TODOS os diálogos/modais/overlays da cena anterior. Conferir: abrir memória → Mapa; abrir diálogo do NPC na vila → Mapa; abrir mensagem da mesa → Mapa.
