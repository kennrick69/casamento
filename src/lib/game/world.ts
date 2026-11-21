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
  // Item 49: os nós são o CENTRO de cada pedra (medido na arte). Com a origem na
  // sola (item 44), o pé para exatamente no centro — não ~25px acima. As via
  // foram regeradas por trail_mask.py pros novos centros (chegada suave, sem degrau).
  nodes: [
    { x: 285, y: 896 }, // 0 A Vila
    { x: 596, y: 785 }, // 1 O Bosque
    { x: 1212, y: 584 }, // 2 O Grande Dia (centro da pedra sob a estufa)
  ],
  edges: [
    { a: 0, b: 1, via: [{ x: 298, y: 896 }, { x: 308, y: 896 }, { x: 318, y: 896 }, { x: 328, y: 896 }, { x: 338, y: 896 }, { x: 348, y: 896 }, { x: 358, y: 895 }, { x: 368, y: 892 }, { x: 378, y: 888 }, { x: 388, y: 885 }, { x: 398, y: 878 }, { x: 406, y: 871 }, { x: 416, y: 865 }, { x: 426, y: 861 }, { x: 436, y: 856 }, { x: 446, y: 851 }, { x: 456, y: 847 }, { x: 466, y: 843 }, { x: 476, y: 838 }, { x: 486, y: 833 }, { x: 496, y: 829 }, { x: 506, y: 824 }, { x: 516, y: 820 }, { x: 526, y: 816 }, { x: 536, y: 812 }, { x: 546, y: 809 }, { x: 556, y: 804 }, { x: 566, y: 797 }, { x: 576, y: 793 }, { x: 586, y: 789 }] },
    { a: 1, b: 2, via: [{ x: 610, y: 791 }, { x: 620, y: 792 }, { x: 630, y: 794 }, { x: 640, y: 795 }, { x: 650, y: 798 }, { x: 660, y: 799 }, { x: 670, y: 801 }, { x: 680, y: 802 }, { x: 690, y: 804 }, { x: 700, y: 806 }, { x: 710, y: 810 }, { x: 720, y: 812 }, { x: 730, y: 815 }, { x: 740, y: 818 }, { x: 750, y: 819 }, { x: 760, y: 821 }, { x: 770, y: 821 }, { x: 780, y: 814 }, { x: 790, y: 808 }, { x: 800, y: 808 }, { x: 810, y: 808 }, { x: 820, y: 808 }, { x: 830, y: 808 }, { x: 840, y: 808 }, { x: 850, y: 808 }, { x: 860, y: 808 }, { x: 870, y: 808 }, { x: 880, y: 808 }, { x: 890, y: 808 }, { x: 900, y: 808 }, { x: 910, y: 808 }, { x: 920, y: 808 }, { x: 930, y: 808 }, { x: 940, y: 808 }, { x: 950, y: 808 }, { x: 960, y: 808 }, { x: 970, y: 808 }, { x: 980, y: 808 }, { x: 990, y: 808 }, { x: 1000, y: 808 }, { x: 1010, y: 808 }, { x: 1020, y: 808 }, { x: 1030, y: 808 }, { x: 1040, y: 808 }, { x: 1050, y: 808 }, { x: 1060, y: 808 }, { x: 1070, y: 807 }, { x: 1080, y: 803 }, { x: 1090, y: 799 }, { x: 1100, y: 796 }, { x: 1110, y: 791 }, { x: 1120, y: 784 }, { x: 1128, y: 776 }, { x: 1134, y: 768 }, { x: 1140, y: 760 }, { x: 1146, y: 752 }, { x: 1150, y: 742 }, { x: 1152, y: 732 }, { x: 1155, y: 722 }, { x: 1161, y: 714 }, { x: 1164, y: 704 }, { x: 1164, y: 694 }, { x: 1167, y: 684 }, { x: 1172, y: 674 }, { x: 1178, y: 666 }, { x: 1185, y: 656 }, { x: 1190, y: 646 }, { x: 1193, y: 636 }, { x: 1194, y: 626 }, { x: 1197, y: 616 }, { x: 1202, y: 606 }, { x: 1207, y: 596 }, { x: 1211, y: 587 }] },
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
    // Vila NOVA PRAÇA (item 46): arte + máscara caminhável desenhadas pelo JOs
    // (calçamento em cruz contornando o canteiro oval central; postes fora do
    // calçamento). A máscara é usada TAL COMO ESTÁ. Teste pela SOLA do pé (item 44).
    // Saídas nas pontas esquerda, direita e embaixo. SEM overlays/colisão por retângulo.
    walkMask: "/game/mapas/vila.walk.png",
    spawn: { x: 95, y: 505, facing: "right" }, // entrada pelo braço ESQUERDO
    anchors: {
      npc: { x: 430, y: 460 }, // calçamento em frente ao mural/caixa de correio (topo-centro)
      gate: { x: 1480, y: 519 }, // saída pelo braço DIREITO → volta ao mapa
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
    // Item 51: máscara caminhável desenhada pelo JOs (piso do salão), usada TAL
    // COMO ESTÁ. Deixa de fora paredes, estrado do altar (notch acima de ~y171,
    // item 38 continua valendo), palco/DJ (canto sup. esq.) e mesa do bolo (canto
    // sup. dir.). Teste pela SOLA do pé (item 44). As MESAS (item 37, desenhadas
    // por código) seguem sólidas pelo corpo circular — a máscara é só o piso.
    walkMask: "/game/mapas/grande-dia.walk.png",
    // A máscara do JOs deixa o estrado caminhável (o jogador subia entre o casal);
    // item 38 continua valendo, então sobra 1 bloco sólido só no estrado do altar
    // (o jogador para NA FRENTE). Paredes/DJ/bolo são da máscara.
    collision: "/game/mapas/grande-dia.colisao.json",
    spawn: { x: 778, y: 870, facing: "up" },
    anchors: {
      altar: { x: 768, y: 195 }, // estrado do altar (avatares do casal)
      // Item 44: com a origem na sola, a âncora é o PÉ. O casal pisa no estrado em
      // ~y195 (antes era y150 do centro do sprite).
      brideStand: { x: 735, y: 195 },
      groomStand: { x: 805, y: 195 },
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
