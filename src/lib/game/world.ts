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
// itens 12 e 20). Coordenadas medidas sobre public/game/mapas/mundi.webp (grade).
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
  map: "/game/mapas/mundi.webp",
  w: 1536,
  h: 1024,
  // Nós = os 3 marcadores (Vila, Bosque, Grande Dia) sobre as plataformas de
  // pedra. `via` = waypoints DENSOS gerados por A* restrito à máscara da trilha
  // (areia + pontes + escadas), via scripts/game/trail_mask.py (item 26). O avatar
  // caminha ponto a ponto e nunca sai da trilha pintada.
  nodes: [
    { x: 290, y: 885 }, // 0 A Vila
    { x: 595, y: 760 }, // 1 O Bosque
    { x: 1200, y: 590 }, // 2 O Grande Dia (centro da pedra sob a estufa)
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
  collision?: string; // url do .colisao.json (grande-dia); vila/bosque usam walkMask
  // Máscara caminhável (PNG alpha): o avatar só anda no piso pintado (calçamento
  // da vila / trilha+ponte do bosque) + folga. Substitui colisão+overlays nessas
  // fases (feedback JOs 40/42). Gerada por scripts/game/walk_mask.py.
  walkMask?: string;
  spawn: { x: number; y: number; facing: Dir };
  anchors: Record<string, Point>; // âncoras fixas de interação (NPC, portão, altar…)
  pedestals?: Point[]; // bosque: posições dos pedestais de memória
  // Overlays de profundidade (item 27): recortes da arte (topo de poste, copa de
  // árvore) que passam À FRENTE do avatar quando ele está atrás. baseY = linha
  // do chão do objeto. Os objetos têm colisão só na base (.colisao.json).
  overlays?: { cx: number; cy: number; cw: number; ch: number; baseY: number }[];
}

export const PHASES: Record<LevelId, PhaseConfig> = {
  vila: {
    id: "vila",
    title: "A Vila",
    map: "/game/mapas/vila.webp",
    w: 1536,
    h: 1024,
    // Vila: anda ESTRITAMENTE no calçamento (máscara); postes/bancos/caixa/canteiros
    // sobre a pedra viram obstáculos sólidos (buracos na máscara). SEM overlays de
    // profundidade — o boneco nunca fica atrás de nada (decisão JOs 41/42).
    walkMask: "/game/mapas/vila.walk.png",
    spawn: { x: 130, y: 470, facing: "right" },
    anchors: {
      npc: { x: 695, y: 610 }, // calçada em frente à caixa de correio / quadro
      gate: { x: 1380, y: 380 }, // portão de flores à direita (saída)
    },
  },
  bosque: {
    id: "bosque",
    title: "O Bosque",
    map: "/game/mapas/bosque.webp",
    w: 1536,
    h: 1024,
    // Bosque: anda SÓ na trilha de terra + ponte + recuo nos pedestais (máscara).
    // Grama, água, canteiros e árvores bloqueados (item 40).
    walkMask: "/game/mapas/bosque.walk.png",
    spawn: { x: 130, y: 560, facing: "right" },
    anchors: {
      exit: { x: 1360, y: 470 }, // fim da trilha → volta ao mapa
    },
    // 5 pedestais ao longo da trilha (sobre a areia). A memória nº i usa o
    // pedestal i; se houver menos de 5 memórias, sobra pedestal vazio (ignorado).
    // Centralizados sobre as 5 plataformas de pedra da arte (item 22), em ordem
    // pela trilha: esquerda → centro → direita.
    pedestals: [
      { x: 255, y: 560 },
      { x: 540, y: 330 },
      { x: 505, y: 655 },
      { x: 1090, y: 330 },
      { x: 1375, y: 520 },
    ],
    // Cada árvore: copa + tronco recortados do topo até a base do tronco (baseY).
    // O boneco atrás do tronco fica coberto pela árvore (profundidade por Y).
    overlays: [
      { cx: 0, cy: 0, cw: 150, ch: 300, baseY: 300 }, // árvore verde topo-esq (canto)
      { cx: 104, cy: 8, cw: 350, ch: 366, baseY: 374 }, // cerejeiras topo-esq (bosquete)
      { cx: 584, cy: 28, cw: 152, ch: 244, baseY: 272 }, // árvore verde topo-centro
      { cx: 948, cy: 28, cw: 164, ch: 224, baseY: 252 }, // árvore branca topo-centro
      { cx: 1178, cy: 28, cw: 296, ch: 296, baseY: 324 }, // cerejeira topo-dir
      { cx: 24, cy: 616, cw: 228, ch: 272, baseY: 888 }, // árvore verde baixo-esq
      { cx: 1126, cy: 502, cw: 316, ch: 404, baseY: 906 }, // cerejeira baixo-dir
    ],
  },
  "grande-dia": {
    id: "grande-dia",
    title: "O Grande Dia",
    map: "/game/mapas/grande-dia.webp",
    w: 1536,
    h: 1024,
    collision: "/game/mapas/grande-dia.colisao.json",
    spawn: { x: 778, y: 870, facing: "up" },
    anchors: {
      altar: { x: 768, y: 150 }, // estrado do altar (avatares do casal)
      brideStand: { x: 735, y: 150 },
      groomStand: { x: 805, y: 150 },
    },
    // Arco do altar + colunas + cortinas: cobrem o boneco quando ele sobe ao
    // estrado e fica atrás do arco (baseY na base das colunas, onde o casal pisa).
    overlays: [{ cx: 620, cy: 0, cw: 284, ch: 150, baseY: 150 }],
  },
};

// Grade automática das mesas, DISTRIBUÍDA pelo piso do salão (item 37 — antes
// ficavam todas no topo com o centro vazio). Grade centrada em (768,560), cada
// linha centrada; evita altar (topo), buffet/bolo (cantos) e a entrada (baixo).
export function tableGrid(count: number): Point[] {
  const n = Math.min(count, 10);
  const cols = Math.min(4, Math.max(1, Math.ceil(Math.sqrt(n))));
  const rows = Math.ceil(n / cols);
  const dx = 300, dy = 220, cx = 768, cy = 560;
  const gridH = (rows - 1) * dy;
  const out: Point[] = [];
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / cols);
    const col = i % cols;
    const rowCount = Math.min(cols, n - r * cols);
    const rowW = (rowCount - 1) * dx;
    out.push({ x: cx - rowW / 2 + col * dx, y: cy - gridH / 2 + r * dy });
  }
  return out;
}
