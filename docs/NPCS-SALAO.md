# NPCs do salão (Grande Dia) — pedido do JOs 21/11

Hoje no jogo NÃO existe nenhum NPC no salão (o DJ é só cenário: a cabine na arte).
Criar 4 personagens (pixel-art LPC, mesmo estilo dos avatares), parados nos pontos
certos do salão, com a caixa de diálogo GBA (item 52) e interação pelo botão A.
Cada um abre uma função que JÁ EXISTE no site (ou nova, no caso do cardápio).

| NPC | Onde fica | Ao conversar |
|---|---|---|
| **Fotógrafo** | perto da pista/altar | fala curta + abre o ENVIO DE FOTOS (Galeria — upload do convidado) |
| **DJ** | na cabine do DJ (canto sup. esq. da arte) | fala curta + abre PEDIR/SUGERIR MÚSICA (Playlist) |
| **Cerimonialista** | perto da entrada/altar | mostra o ROTEIRO/horários da festa (Roteiro/Programação) — *confirmar com o JOs se é essa a função* |
| **Garçom** | perto da mesa do bolo / bar (canto sup. dir.) | mostra o CARDÁPIO: comidas e bebidas do dia + o aviso de que **o convidado pode levar a própria bebida (ex.: gim, vodka, tequila) — está liberado** |

## Cardápio (NOVO no painel)
- Aba nova no painel do organizador (ou seção em Personalizar): **Cardápio** com
  listas editáveis: Comidas, Bebidas, e um campo de aviso livre
  (padrão: "Quer trazer a sua própria bebida? Gim, vodka, tequila… está liberado!").
- O garçom lê dali (e a mesma informação pode aparecer na página do convite, se
  fizer sentido — perguntar ao JOs).

## Regras
- NPC com colisão pela sola (não atravessa), sem anel amarelo nem "!" grande
  (item 48): só o sparkle discreto + dica do botão A ao chegar perto.
- Falas curtas, tom do site, sem emoji. Mostrar as falas ao JOs antes de fechar.
- Tudo em branch próprio, nada na main sem OK do JOs.
