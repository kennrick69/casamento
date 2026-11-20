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
// Cada aresta tem `via`: a sequência de waypoints (de a→b) sobre a trilha de
// terra desenhada na arte (curvas, pontes, escadas). O avatar caminha por esses
// pontos — nunca em linha reta por cima da grama/penhasco (feedback do JOs,
// itens 12 e 20). Coordenadas medidas sobre public/game/mapas/mundi.png (grade).
export interface WorldEdge {
  a: number;
  b: number;
  via?: Point[];
}
export interface WorldConfig {
  map: string;
  w: number;
  h: number;
  nodes: Point[];
  edges: WorldEdge[];
  markers: { id: LevelId; node: number; label: string }[];
}

export const WORLD: WorldConfig = {
  map: "/game/mapas/mundi.png",
  w: 1536,
  h: 1024,
  // Nós = os 3 marcadores (Vila, Bosque, Grande Dia) sobre as plataformas de
  // pedra. `via` = waypoints DENSOS gerados por A* restrito à máscara da trilha
  // (areia + pontes + escadas), via scripts/game/trail_mask.py (item 26). O avatar
  // caminha ponto a ponto e nunca sai da trilha pintada.
  nodes: [
    { x: 290, y: 885 }, // 0 A Vila
    { x: 595, y: 760 }, // 1 O Bosque
    { x: 1210, y: 575 }, // 2 O Grande Dia
  ],
  edges: [
    { a: 0, b: 1, via: [{ x: 304, y: 884 }, { x: 314, y: 884 }, { x: 324, y: 888 }, { x: 334, y: 892 }, { x: 344, y: 892 }, { x: 354, y: 891 }, { x: 364, y: 889 }, { x: 374, y: 886 }, { x: 384, y: 883 }, { x: 394, y: 877 }, { x: 402, y: 870 }, { x: 410, y: 862 }, { x: 418, y: 854 }, { x: 426, y: 848 }, { x: 436, y: 846 }, { x: 446, y: 846 }, { x: 456, y: 843 }, { x: 466, y: 838 }, { x: 474, y: 832 }, { x: 484, y: 825 }, { x: 494, y: 819 }, { x: 504, y: 816 }, { x: 514, y: 813 }, { x: 524, y: 810 }, { x: 534, y: 808 }, { x: 544, y: 805 }, { x: 554, y: 800 }, { x: 562, y: 792 }, { x: 570, y: 784 }, { x: 578, y: 776 }, { x: 586, y: 768 }] },
    { a: 1, b: 2, via: [{ x: 608, y: 767 }, { x: 618, y: 770 }, { x: 626, y: 776 }, { x: 634, y: 784 }, { x: 642, y: 791 }, { x: 652, y: 794 }, { x: 662, y: 795 }, { x: 672, y: 797 }, { x: 682, y: 799 }, { x: 692, y: 800 }, { x: 702, y: 803 }, { x: 712, y: 806 }, { x: 722, y: 808 }, { x: 732, y: 812 }, { x: 742, y: 814 }, { x: 752, y: 815 }, { x: 762, y: 818 }, { x: 772, y: 816 }, { x: 780, y: 810 }, { x: 790, y: 804 }, { x: 800, y: 804 }, { x: 810, y: 804 }, { x: 820, y: 804 }, { x: 830, y: 804 }, { x: 840, y: 804 }, { x: 850, y: 804 }, { x: 860, y: 804 }, { x: 870, y: 804 }, { x: 880, y: 804 }, { x: 890, y: 804 }, { x: 900, y: 804 }, { x: 910, y: 804 }, { x: 920, y: 804 }, { x: 930, y: 804 }, { x: 940, y: 804 }, { x: 950, y: 804 }, { x: 960, y: 804 }, { x: 970, y: 804 }, { x: 980, y: 804 }, { x: 990, y: 804 }, { x: 1000, y: 804 }, { x: 1010, y: 804 }, { x: 1020, y: 804 }, { x: 1030, y: 804 }, { x: 1040, y: 804 }, { x: 1050, y: 804 }, { x: 1060, y: 804 }, { x: 1070, y: 803 }, { x: 1080, y: 800 }, { x: 1090, y: 795 }, { x: 1100, y: 792 }, { x: 1110, y: 787 }, { x: 1120, y: 780 }, { x: 1127, y: 772 }, { x: 1134, y: 762 }, { x: 1141, y: 754 }, { x: 1145, y: 744 }, { x: 1148, y: 734 }, { x: 1150, y: 724 }, { x: 1157, y: 714 }, { x: 1160, y: 704 }, { x: 1160, y: 694 }, { x: 1161, y: 684 }, { x: 1167, y: 674 }, { x: 1174, y: 666 }, { x: 1181, y: 656 }, { x: 1186, y: 646 }, { x: 1189, y: 636 }, { x: 1190, y: 626 }, { x: 1191, y: 616 }, { x: 1195, y: 606 }, { x: 1200, y: 596 }, { x: 1205, y: 586 }, { x: 1209, y: 577 }] },
  ],
  markers: [
    { id: "vila", node: 0, label: "A Vila" },
    { id: "bosque", node: 1, label: "O Bosque" },
    { id: "grande-dia", node: 2, label: "O Grande Dia" },
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
