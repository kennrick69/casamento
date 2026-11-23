// Cardápio do Garçom (NPC do salão / Grande Dia).
//
// O conteúdo REAL vem do banco (Event.menu), configurado pelo casal na aba
// "Cardápio" do painel. Enquanto o casal não cadastra, o jogo mostra o cardápio
// de EXEMPLO abaixo — e o painel avisa que ainda é exemplo (ver lib/event/readiness).
//
// O Garçom pergunta "Quer ver o cardápio ou as bebidas?" e mostra estas listas.
// "Bebidas" termina sempre com o aviso de que pode trazer a própria bebida.

export interface Cardapio {
  foods: string[];
  drinks: string[];
  byoNotice: string;
}

/** Cardápio de EXEMPLO — usado só até o casal cadastrar o real no painel. */
export const CARDAPIO_EXEMPLO: Cardapio = {
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
  byoNotice: "Quer trazer a sua própria bebida? Gim, vodka, tequila… está liberado!",
};

// Compat: código antigo importava `CARDAPIO`. Mantém apontando para o exemplo.
export const CARDAPIO = CARDAPIO_EXEMPLO;

/** True se `menu` do banco é um cardápio válido e não-vazio (casal cadastrou). */
export function isMenuConfigured(menu: unknown): boolean {
  if (!menu || typeof menu !== "object") return false;
  const m = menu as Partial<Cardapio>;
  const hasFood = Array.isArray(m.foods) && m.foods.some((f) => typeof f === "string" && f.trim());
  const hasDrink = Array.isArray(m.drinks) && m.drinks.some((d) => typeof d === "string" && d.trim());
  return hasFood || hasDrink;
}

/**
 * Resolve o cardápio que o Garçom vai mostrar: o do casal (Event.menu) se válido,
 * senão o de EXEMPLO. `isExample` diz qual foi usado (pro aviso no painel/jogo).
 */
export function resolveCardapio(menu: unknown): Cardapio & { isExample: boolean } {
  if (!isMenuConfigured(menu)) return { ...CARDAPIO_EXEMPLO, isExample: true };
  const m = menu as Partial<Cardapio>;
  return {
    foods: (m.foods ?? []).filter((f): f is string => typeof f === "string" && f.trim().length > 0),
    drinks: (m.drinks ?? []).filter((d): d is string => typeof d === "string" && d.trim().length > 0),
    byoNotice:
      typeof m.byoNotice === "string" && m.byoNotice.trim()
        ? m.byoNotice
        : CARDAPIO_EXEMPLO.byoNotice,
    isExample: false,
  };
}
