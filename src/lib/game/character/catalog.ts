// Catálogo do criador de personagem (S3). Define as opções que o jogador
// escolhe e, para cada peça, a(s) camada(s) LPC (z-order + recolor por paleta).
// Os PNGs vivem em public/game/personagem (só licenças CC-BY/CC-BY-SA/OGA-BY;
// créditos em docs/ASSETS-LICENSES.md). Olhos = arte própria (desenhados).
// Compartilhado por compositor e UI (sem imports de servidor).

export type BodyType = "feminino" | "masculino";

export interface Layer {
  file: string; // caminho relativo a public/game/personagem
  z: number;
  recolor?: { palette: "body" | "hair"; base: string; target: string };
  eyes?: string; // hex do íris — recolore a íris embutida da cabeça (ver compositor)
}

export interface Option {
  id: string;
  label: string;
  hex?: string; // swatch (pele/olhos)
  suit?: BodyType; // combina só com este corpo; ausente = serve nos dois
}

// Pele (paleta body_ulpc; base embutida = "light")
export const SKINS: Option[] = [
  { id: "light", label: "Clara", hex: "#f9d5ba" },
  { id: "peach", label: "Pêssego", hex: "#edc5a8" },
  { id: "bronze", label: "Bronze", hex: "#c07a4b" },
  { id: "brown", label: "Morena", hex: "#8a5a38" },
  { id: "black", label: "Negra", hex: "#5a3a28" },
];

// Cabelos extraídos do LPC (walk.png na paleta base "orange", recolor por
// cor). `suit` filtra por corpo (item 2). Arte/licenças em docs/ASSETS-LICENSES.
export const HAIR_STYLES: Option[] = [
  // femininos
  { id: "long", label: "Liso longo", suit: "feminino" },
  { id: "bob", label: "Chanel", suit: "feminino" },
  { id: "cacheado", label: "Cacheado", suit: "feminino" },
  { id: "coque", label: "Coque c/ franja", suit: "feminino" },
  { id: "rabo", label: "Rabo de cavalo", suit: "feminino" },
  // masculinos
  { id: "topete", label: "Topete", suit: "masculino" },
  { id: "social", label: "Social", suit: "masculino" },
  { id: "raspado", label: "Raspado", suit: "masculino" },
  { id: "cacheado_curto", label: "Cacheado curto", suit: "masculino" },
  // dois corpos
  { id: "buzzcut", label: "Curtinho" },
  { id: "none", label: "Careca / sem cabelo" },
];
export const HAIR_COLORS: Option[] = [
  { id: "dark_brown", label: "Castanho", hex: "#4a3121" },
  { id: "black", label: "Preto", hex: "#231f20" },
  { id: "chestnut", label: "Acaju", hex: "#7a4a2a" },
  { id: "blonde", label: "Loiro", hex: "#d9b36a" },
  { id: "redhead", label: "Ruivo", hex: "#a8431f" },
  { id: "gray", label: "Grisalho", hex: "#b9b9b9" },
];

// Olhos — arte própria (íris colorida). Sem dependência de licença LPC.
export const EYE_COLORS: Option[] = [
  { id: "castanho", label: "Castanho", hex: "#5b3a1e" },
  { id: "azul", label: "Azul", hex: "#3f6fb8" },
  { id: "verde", label: "Verde", hex: "#3f7a4f" },
  { id: "mel", label: "Mel", hex: "#9a6b2f" },
  { id: "cinza", label: "Cinza", hex: "#5b6672" },
];

// Sobrancelha (recolor pela cor do cabelo). LPC OGA-BY.
export const EYEBROWS: Option[] = [
  { id: "thin", label: "Finas" },
  { id: "thick", label: "Grossas" },
  { id: "none", label: "Nenhuma" },
];

// Barba/bigode (opcional; recolor pela cor do cabelo). LPC CC-BY-SA/OGA-BY.
export const BEARDS: Option[] = [
  { id: "none", label: "Nenhuma" },
  { id: "curta", label: "Barba curta" },
  { id: "media", label: "Barba média" },
  { id: "bigode", label: "Bigode" },
];

// Óculos (opcional; cor fixa). LPC CC-BY-SA/OGA-BY.
export const GLASSES: Option[] = [
  { id: "none", label: "Nenhum" },
  { id: "redondo", label: "Redondo" },
];

export interface Outfit extends Option {
  bride?: boolean; // vestido de noiva — só organizador
  groom?: boolean; // traje de noivo — só organizador
  layers: Layer[];
}
export const OUTFITS: Outfit[] = [
  {
    id: "terno",
    label: "Terno",
    suit: "masculino",
    // convidado: paletó escuro (charcoal) + calça social + camisa clara + gravata
    layers: [
      { file: "outfit/shoes_male.png", z: 15 },
      { file: "outfit/pants_charcoal.png", z: 20 },
      { file: "outfit/terno_shirt.png", z: 35 },
      { file: "outfit/necktie.png", z: 37 },
      { file: "outfit/jacket_charcoal.png", z: 40 },
    ],
  },
  {
    id: "vestido_rose",
    label: "Vestido rosé",
    suit: "feminino",
    layers: [
      { file: "outfit/shoes_female.png", z: 15 },
      { file: "dress/rose.png", z: 30 },
    ],
  },
  {
    id: "vestido_blue",
    label: "Vestido azul",
    suit: "feminino",
    layers: [
      { file: "outfit/shoes_female.png", z: 15 },
      { file: "dress/blue.png", z: 30 },
    ],
  },
  {
    id: "vestido_lavender",
    label: "Vestido lilás",
    suit: "feminino",
    layers: [
      { file: "outfit/shoes_female.png", z: 15 },
      { file: "dress/lavender.png", z: 30 },
    ],
  },
  {
    id: "noivo",
    label: "Noivo",
    suit: "masculino",
    groom: true,
    // destaque do noivo: paletó preto (smoking) + calça preta + gravata-borboleta
    layers: [
      { file: "outfit/shoes_male.png", z: 15 },
      { file: "outfit/pants_black.png", z: 20 },
      { file: "outfit/terno_shirt.png", z: 35 },
      { file: "outfit/bowtie.png", z: 37 },
      { file: "outfit/jacket_black.png", z: 40 },
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
  eyeColor: string;
  eyebrows: string;
  beard: string;
  glasses: string;
  outfit: string;
}

export const DEFAULT_SPEC: CharacterSpec = {
  body: "feminino",
  skin: "light",
  hairStyle: "long",
  hairColor: "chestnut",
  eyeColor: "castanho",
  eyebrows: "thin",
  beard: "none",
  glasses: "none",
  outfit: "vestido_rose",
};

export function getOutfit(id: string): Outfit | undefined {
  return OUTFITS.find((o) => o.id === id);
}

// ── Filtragem por corpo (item 1): listas mostram só o que combina ──
// Visitante não vê noivo/noiva (item 4): canRestricted = organizador.
const suits = (o: Option, body: BodyType) => !o.suit || o.suit === body;
export function outfitsFor(body: BodyType, canRestricted: boolean): Outfit[] {
  return OUTFITS.filter((o) => suits(o, body) && (canRestricted || (!o.bride && !o.groom)));
}
export function hairsFor(body: BodyType): Option[] {
  return HAIR_STYLES.filter((h) => suits(h, body));
}
export function defaultOutfit(body: BodyType, canRestricted: boolean): string {
  const list = outfitsFor(body, canRestricted).filter((o) => !o.bride && !o.groom);
  return (list[0] ?? OUTFITS[0]).id;
}
export function defaultHair(body: BodyType): string {
  return hairsFor(body).some((h) => h.id === "long") ? "long" : "buzzcut";
}

const idIn = (list: Option[], id: string) => list.some((o) => o.id === id);
const hexOf = (list: Option[], id: string) => list.find((o) => o.id === id)?.hex;

// Valida a escolha. `canRestricted` (organizador) libera noivo/noiva. Retorna
// as camadas finais já em ordem de z, ou um erro.
export function resolveLayers(
  spec: CharacterSpec,
  canRestricted: boolean,
): { layers: Layer[] } | { error: string } {
  if (!["feminino", "masculino"].includes(spec.body)) return { error: "corpo inválido" };
  if (!idIn(SKINS, spec.skin)) return { error: "pele inválida" };
  if (!idIn(HAIR_STYLES, spec.hairStyle)) return { error: "cabelo inválido" };
  if (!idIn(HAIR_COLORS, spec.hairColor)) return { error: "cor de cabelo inválida" };
  if (!idIn(EYE_COLORS, spec.eyeColor)) return { error: "cor de olhos inválida" };
  if (!idIn(EYEBROWS, spec.eyebrows)) return { error: "sobrancelha inválida" };
  if (!idIn(BEARDS, spec.beard)) return { error: "barba inválida" };
  if (!idIn(GLASSES, spec.glasses)) return { error: "óculos inválido" };
  const outfit = getOutfit(spec.outfit);
  if (!outfit) return { error: "roupa inválida" };
  if ((outfit.bride || outfit.groom) && !canRestricted) {
    return { error: "Traje de noivo/noiva é só para os organizadores do evento." };
  }

  const bodyFile = spec.body === "masculino" ? "body/male.png" : "body/female.png";
  const skinRecolor = { palette: "body" as const, base: "light", target: spec.skin };
  const hairRecolor = { palette: "hair" as const, base: "orange", target: spec.hairColor };

  const headFile = `head/${spec.body === "masculino" ? "male" : "female"}.png`;
  const layers: Layer[] = [
    { file: bodyFile, z: 10, recolor: skinRecolor },
    ...outfit.layers,
    // A cabeça já traz os olhos desenhados; `eyes` recolore a íris embutida.
    { file: headFile, z: 100, recolor: skinRecolor, eyes: hexOf(EYE_COLORS, spec.eyeColor) },
  ];
  if (spec.eyebrows !== "none") {
    layers.push({ file: `eyebrows/${spec.eyebrows}.png`, z: 106, recolor: hairRecolor });
  }
  if (spec.beard !== "none") {
    layers.push({ file: `beard/${spec.beard}.png`, z: 111, recolor: hairRecolor });
  }
  if (spec.glasses !== "none") {
    layers.push({ file: `glasses/${spec.glasses}.png`, z: 115 });
  }
  if (spec.hairStyle !== "none") {
    layers.push({ file: `hair/${spec.hairStyle}.png`, z: 120, recolor: hairRecolor });
  }
  return { layers: layers.sort((a, b) => a.z - b.z) };
}
