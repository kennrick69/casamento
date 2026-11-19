// Catálogo do criador de personagem (S3). Define as opções que o jogador
// escolhe e, para cada peça, a(s) camada(s) LPC (z-order + recolor por paleta).
// Os PNGs vivem em public/game/personagem (só licenças CC-BY/CC-BY-SA/OGA-BY;
// créditos em docs/ASSETS-LICENSES.md). Compartilhado por compositor e UI.

export type BodyType = "feminino" | "masculino";

export interface Layer {
  file: string; // caminho relativo a public/game/personagem
  z: number;
  recolor?: { palette: "body" | "hair"; base: string; target: string };
}

export interface Option {
  id: string;
  label: string;
}

// Pele (paleta body_ulpc; base embutida = "light")
export const SKINS: Option[] = [
  { id: "light", label: "Clara" },
  { id: "peach", label: "Pêssego" },
  { id: "bronze", label: "Bronze" },
  { id: "brown", label: "Morena" },
  { id: "black", label: "Negra" },
];

// Cabelo: estilo + cor (paleta hair_ulpc; base embutida = "orange")
export const HAIR_STYLES: Option[] = [
  { id: "long", label: "Longo" },
  { id: "buzzcut", label: "Curto" },
  { id: "none", label: "Sem cabelo" },
];
export const HAIR_COLORS: Option[] = [
  { id: "dark_brown", label: "Castanho" },
  { id: "black", label: "Preto" },
  { id: "chestnut", label: "Acaju" },
  { id: "blonde", label: "Loiro" },
  { id: "redhead", label: "Ruivo" },
  { id: "gray", label: "Grisalho" },
];

// Roupas. `bride: true` é bloqueada para quem não é a noiva (validação no
// servidor). Cada roupa lista suas camadas (sem corpo/cabelo, que são comuns).
export interface Outfit extends Option {
  bride?: boolean;
  layers: Layer[];
}
export const OUTFITS: Outfit[] = [
  {
    id: "terno",
    label: "Terno",
    layers: [
      { file: "outfit/shoes_male.png", z: 15 },
      { file: "outfit/terno_pants.png", z: 20 },
      { file: "outfit/terno_shirt.png", z: 35 },
    ],
  },
  {
    id: "vestido_rose",
    label: "Vestido rosé",
    layers: [
      { file: "outfit/shoes_female.png", z: 15 },
      { file: "dress/rose.png", z: 30 },
    ],
  },
  {
    id: "vestido_blue",
    label: "Vestido azul",
    layers: [
      { file: "outfit/shoes_female.png", z: 15 },
      { file: "dress/blue.png", z: 30 },
    ],
  },
  {
    id: "vestido_lavender",
    label: "Vestido lilás",
    layers: [
      { file: "outfit/shoes_female.png", z: 15 },
      { file: "dress/lavender.png", z: 30 },
    ],
  },
  {
    id: "noiva",
    label: "Noiva (véu)",
    bride: true,
    layers: [
      { file: "bride/veil_bg.png", z: 5 },
      { file: "outfit/shoes_female.png", z: 15 },
      { file: "bride/skirt.png", z: 30 },
      { file: "bride/bodice.png", z: 35 },
      { file: "bride/veil_fg.png", z: 200 },
    ],
  },
];

export interface CharacterSpec {
  body: BodyType;
  skin: string;
  hairStyle: string;
  hairColor: string;
  outfit: string;
}

export const DEFAULT_SPEC: CharacterSpec = {
  body: "feminino",
  skin: "light",
  hairStyle: "long",
  hairColor: "chestnut",
  outfit: "vestido_rose",
};

export function getOutfit(id: string): Outfit | undefined {
  return OUTFITS.find((o) => o.id === id);
}

function isIn(list: Option[], id: string) {
  return list.some((o) => o.id === id);
}

// Valida a escolha. `canBride` vem do servidor (só a noiva). Retorna as camadas
// finais (corpo + roupa + cabelo) já em ordem de z, ou um erro.
export function resolveLayers(
  spec: CharacterSpec,
  canBride: boolean,
): { layers: Layer[] } | { error: string } {
  if (!["feminino", "masculino"].includes(spec.body)) return { error: "corpo inválido" };
  if (!isIn(SKINS, spec.skin)) return { error: "pele inválida" };
  if (!isIn(HAIR_STYLES, spec.hairStyle)) return { error: "cabelo inválido" };
  if (!isIn(HAIR_COLORS, spec.hairColor)) return { error: "cor de cabelo inválida" };
  const outfit = getOutfit(spec.outfit);
  if (!outfit) return { error: "roupa inválida" };
  if (outfit.bride && !canBride) return { error: "Só a noiva pode usar o vestido de noiva." };

  const bodyFile = spec.body === "masculino" ? "body/male.png" : "body/female.png";
  const layers: Layer[] = [
    { file: bodyFile, z: 10, recolor: { palette: "body", base: "light", target: spec.skin } },
    ...outfit.layers,
  ];
  if (spec.hairStyle !== "none") {
    layers.push({
      file: `hair/${spec.hairStyle}.png`,
      z: 120,
      recolor: { palette: "hair", base: "orange", target: spec.hairColor },
    });
  }
  return { layers: layers.sort((a, b) => a.z - b.z) };
}
