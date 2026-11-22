// Cardápio do Garçom (NPC do salão). Fica AQUI, num arquivo simples do jogo —
// fácil de editar. Por enquanto é um cardápio de EXEMPLO; o casal manda o real
// depois e é só trocar as listas abaixo. (Sem painel, sem banco — decisão do JOs.)
//
// O Garçom pergunta "Quer ver o cardápio ou as bebidas?" e mostra estas listas.
// "Bebidas" termina sempre com o aviso de que pode trazer a própria bebida.

export const CARDAPIO = {
  foods: [
    "Canapés e finger foods de entrada",
    "Risoto de funghi",
    "Filé ao molho madeira com batatas",
    "Opção vegetariana",
    "Mesa de doces e bem-casados",
    "Bolo dos noivos",
  ],
  drinks: [
    "Espumante para o brinde",
    "Vinho tinto e branco",
    "Drinks da casa",
    "Cerveja",
    "Sucos, água e refrigerantes",
  ],
  // Aviso livre — sempre no fim das bebidas.
  byoNotice: "Quer trazer a sua própria bebida? Gim, vodka, tequila… está liberado!",
} as const;
