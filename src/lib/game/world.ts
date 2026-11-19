// ─── Modo Gamificado · Configuração do mundo e das fases ────────────────────
// Dados compartilhados entre o server component (que carrega progresso/dados) e
// o canvas Phaser (cliente). Sem imports de servidor. Coordenadas no espaço do
// mundo de cada imagem (1536×1024). Colisões finas ficam nos .colisao.json; aqui
// ficam spawn, âncoras de interação e o grafo do mapa-múndi.

export type Dir = "up" | "down" | "left" | "right";
export type LevelId = "vila" | "bosque" | "grande-dia";

export const LEVEL_ORDER: LevelId[] = ["vila", "bosque", "grande-dia"];

export interface Point {
  x: number;
  y: number;
}

// ── Mapa-múndi (00): movimento por nós ao longo da trilha (estilo SMW) ──
export interface WorldConfig {
  map: string;
  w: number;
  h: number;
  nodes: Point[];
  edges: [number, number][];
  markers: { id: LevelId; node: number; label: string }[];
}

export const WORLD: WorldConfig = {
  map: "/game/mapas/mundi.png",
  w: 1536,
  h: 1024,
  // trilha: Vila (casa, baixo-esq) → Bosque (cerejeiras) → jardim/fonte → ponte
  // → Grande Dia (estufa de vidro, direita).
  nodes: [
    { x: 215, y: 820 }, // 0 Vila
    { x: 360, y: 735 }, // 1
    { x: 560, y: 600 }, // 2 Bosque
    { x: 815, y: 470 }, // 3 jardim da fonte
    { x: 1050, y: 515 }, // 4 ponte
    { x: 1270, y: 500 }, // 5 Grande Dia
  ],
  edges: [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
  ],
  markers: [
    { id: "vila", node: 0, label: "A Vila" },
    { id: "bosque", node: 2, label: "O Bosque" },
    { id: "grande-dia", node: 5, label: "O Grande Dia" },
  ],
};

// ── Fases: andar livre, câmera segue, colisão por retângulos ──
export interface PhaseConfig {
  id: LevelId;
  title: string;
  map: string;
  w: number;
  h: number;
  collision: string; // url do .colisao.json
  spawn: { x: number; y: number; facing: Dir };
  anchors: Record<string, Point>; // âncoras fixas de interação (NPC, portão, altar…)
  pedestals?: Point[]; // bosque: posições dos pedestais de memória
}

export const PHASES: Record<LevelId, PhaseConfig> = {
  vila: {
    id: "vila",
    title: "A Vila",
    map: "/game/mapas/vila.png",
    w: 1536,
    h: 1024,
    collision: "/game/mapas/vila.colisao.json",
    spawn: { x: 130, y: 470, facing: "right" },
    anchors: {
      npc: { x: 695, y: 560 }, // frente da caixa de correio / quadro de avisos
      gate: { x: 1380, y: 380 }, // portão de flores à direita (saída)
    },
  },
  bosque: {
    id: "bosque",
    title: "O Bosque",
    map: "/game/mapas/bosque.png",
    w: 1536,
    h: 1024,
    collision: "/game/mapas/bosque.colisao.json",
    spawn: { x: 130, y: 560, facing: "right" },
    anchors: {
      exit: { x: 1360, y: 470 }, // fim da trilha → volta ao mapa
    },
    // 5 pedestais ao longo da trilha (sobre a areia). A memória nº i usa o
    // pedestal i; se houver menos de 5 memórias, sobra pedestal vazio (ignorado).
    pedestals: [
      { x: 330, y: 600 },
      { x: 540, y: 360 },
      { x: 560, y: 720 },
      { x: 1180, y: 560 },
      { x: 1290, y: 360 },
    ],
  },
  "grande-dia": {
    id: "grande-dia",
    title: "O Grande Dia",
    map: "/game/mapas/grande-dia.png",
    w: 1536,
    h: 1024,
    collision: "/game/mapas/grande-dia.colisao.json",
    spawn: { x: 778, y: 870, facing: "up" },
    anchors: {
      altar: { x: 768, y: 150 }, // estrado do altar (avatares do casal)
      brideStand: { x: 735, y: 150 },
      groomStand: { x: 805, y: 150 },
    },
  },
};

// Grade automática das mesas no piso livre do salão (até 10). Evita altar
// (topo-centro), buffet (topo-esq), bolo (topo-dir) e a entrada (baixo-centro).
export function tableGrid(count: number): Point[] {
  const cols = 5;
  const x0 = 300;
  const y0 = 380;
  const dx = 235;
  const dy = 250;
  const out: Point[] = [];
  for (let i = 0; i < Math.min(count, 10); i++) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    out.push({ x: x0 + c * dx, y: y0 + r * dy });
  }
  return out;
}
