"use client";

import { useEffect, useRef } from "react";
import type { Dir, Point, WorldEdge } from "@/lib/game/world";
import type { SeatCell } from "@/lib/game/seats"; // só o tipo (erased) — não puxa o módulo server-only

// Phaser é dinâmico (script vendored) e sua API não é tipada aqui; `any` é
// intencional em todo o motor desta cena.
/* eslint-disable @typescript-eslint/no-explicit-any */

// ─── Modo Gamificado · Motor da cena (Phaser) ──────────────────────────────
// Um único canvas que renderiza DOIS modos a partir de um SceneConfig:
//   • "world"  — mapa-múndi: avatar anda por nós da trilha (estilo SMW).
//   • "phase"  — fase: andar livre, câmera segue o avatar, colisão por retângulos
//                lidos do .colisao.json, interações por proximidade.
// Phaser vem do script vendored same-origin (public/game/vendor), NÃO do npm
// (ver AGENTS.md / docs/ASSETS-LICENSES.md). A UI (diálogos, HUD, D-pad) é React
// por cima do <canvas>.

const PHASER_SRC = "/game/vendor/phaser-3.88.2.min.js";
const SPEED = 195;
// Escala do avatar: a arte LPC rende o personagem ~22px; a 1.5x fica ~33px,
// ≈75-80% da altura das portas da arte (item 28). Nearest-neighbor (pixelArt),
// sem borrar. Aplicada ao avatar e aos NPCs (noivos no altar).
const AVATAR_SCALE = 1.5;
// S4c: acompanhante criança anda em tamanho de criança (~72% do adulto).
const CHILD_SCALE = AVATAR_SCALE * 0.72;
// Distância entre cada integrante da fila da família (estilo Pokémon), no espaço
// do mundo. ~ a largura do boneco, pra ficarem um atrás do outro sem colar.
const FOLLOW_SPACING = 26;
const FRAMES_PER_DIR = 9; // sheets LPC: 9 colunas × 4 linhas
// Item 44: a referência de posição é a SOLA do pé (1º pixel opaco de baixo pra
// cima do sprite LPC), medida em ~62 de 64px. Com a origem na sola, player.x/y =
// ponto do pé → anda/para sobre a trilha/plataforma/piso, e a profundidade é pelo pé.
const FRAME_H = 64;
const FOOT_Y = 62;
const ORIGIN_Y = FOOT_Y / FRAME_H;
const ROW: Record<Dir, number> = { up: 0, left: 1, down: 2, right: 3 };

// Zoom responsivo "cover": o mapa sempre enche a tela (sem faixas vazias) e a
// câmera segue o avatar. No celular mostra ~2 casas; no desktop, quase a fase
// toda. (Feedback do JOs, itens 14 e 19.)
function computeZoom(vw: number, vh: number, mapW: number, mapH: number, mode: "world" | "phase"): number {
  const cover = Math.max(vw / mapW, vh / mapH);
  if (mode === "world") {
    // Item 53: no celular a noiva do mapa-múndi deve ter ~o MESMO tamanho que
    // dentro da fase Vila (referência "perfeita" do JOs, 427x952). As fases são
    // 1536x1024, então o "cover" de uma fase nesse viewport é ~vh/1024 — usamos
    // esse mesmo fator aqui pro boneco casar (o zoom 1.9 de antes ficou ~2x grande
    // demais e colava a Vila na tela toda). A arte do mundo é mais alta (1344), mas
    // é o tamanho do boneco que tem que bater. Desktop: um pouco mais que o cover.
    const phaseLike = Math.max(vw / 1536, vh / 1024);
    const target = vw < 820 ? phaseLike : Math.max(phaseLike, 1.0);
    return Math.max(cover, Math.min(1.8, target));
  }
  return Math.max(0.5, Math.min(1.6, cover));
}

// ─── Ícones em pixel-art (sem emoji — feedback do JOs, item 6) ───────────────
// Pequenos bitmaps desenhados com retângulos (cada caractere ≠ '.' vira um
// bloco). Substituem os emoji flutuantes dos marcadores (cadeado, estrela…).
type GlyphName = "lock" | "star" | "pin" | "mail" | "flower" | "book" | "check" | "door" | "bang" | "sparkle";
const GLYPHS: Record<GlyphName, string[]> = {
  sparkle: ["..#..", "..#..", "#####", "..#..", "..#.."], // brilho discreto (item 48)
  bang: [".##.", ".##.", ".##.", ".##.", ".##.", "....", ".##."], // "!" da missão
  lock: ["..###..", ".#...#.", ".#...#.", ".#...#.", "#######", "##.#.##", "#######", "#######"],
  star: ["...#...", "...#...", "#######", ".#####.", "..###..", ".##.##.", "##...##"],
  pin: [".#####.", "#.....#", "#..#..#", "#.....#", ".#...#.", "..#.#..", "...#...", "...#..."],
  mail: ["#######", "##...##", "#.#.#.#", "#..#..#", "#.....#", "#######"],
  flower: ["..#.#..", ".#####.", ".#####.", "..###..", "...#...", ".##.#..", "...#..."],
  book: [".#...#.", "#######", "#.#.#.#", "#.#.#.#", "#######", ".#...#."],
  check: [".....##", "....##.", "#..##..", "##.##..", ".###...", "..#...."],
  door: ["#######", "#.....#", "#.....#", "#....##", "#.....#", "#.....#", "#######"],
};
function paintGlyph(scene: any, container: any, cx: number, cy: number, name: GlyphName, color: number, alpha: number, off: number, u = 3) {
  const g = scene.add.graphics();
  const rows = GLYPHS[name];
  const w = rows[0].length;
  const ox = cx - (w * u) / 2 + off;
  const oy = cy - (rows.length * u) / 2 + off;
  g.fillStyle(color, alpha);
  rows.forEach((row: string, r: number) => {
    for (let c = 0; c < row.length; c++) if (row[c] !== ".") g.fillRect(ox + c * u, oy + r * u, u, u);
  });
  container.add(g);
}

export type Controls = {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  interact: boolean; // edge-trigger: a cena consome e zera
};

export interface Interactable {
  id: string;
  x: number;
  y: number;
  radius?: number;
  label?: string;
  locked?: boolean;
  done?: boolean;
  kind?: "npc" | "pedestal" | "gate" | "table" | "marker";
  glyph?: GlyphName; // ícone pixel-art flutuante (sem emoji)
  tableLabel?: string; // texto da mesa
  highlight?: boolean; // alvo da missão (brilho dourado)
  capacity?: number; // nº de cadeiras a desenhar (mesa)
  seats?: SeatCell[]; // S4b: estado de cada cadeira (livre/minha/ocupada/travada)
  solid?: boolean; // colisão pela base (NPCs do salão não são atravessados)
}

export interface NpcAvatar {
  x: number;
  y: number;
  atlasUrl: string;
  facing: Dir;
}

export interface SceneConfig {
  mode: "world" | "phase";
  map: string;
  w: number;
  h: number;
  atlasUrl: string;
  spawn: { x: number; y: number; facing: Dir };
  zoom?: number;
  collisionUrl?: string;
  // Máscara caminhável (PNG alpha): o avatar só anda onde o pixel é opaco
  // (calçamento da vila / trilha do bosque + folga). Substitui os retângulos de
  // colisão nessas fases (feedback JOs, itens 40/42). cfg.map resolution.
  walkMaskUrl?: string;
  interactables: Interactable[];
  // world:
  nodes?: Point[];
  edges?: WorldEdge[];
  startNode?: number;
  // phase:
  npcs?: NpcAvatar[];
  // S4c — família andando junto (estilo Pokémon). Em fila atrás do jogador, no
  // mapa-múndi e nas fases. child = tamanho de criança. Bebê de colo não entra aqui.
  followers?: { atlasUrl: string; child: boolean }[];
  // Overlays de profundidade (item 27): recortes da arte (topo de poste, copa de
  // árvore) desenhados ACIMA do avatar quando ele está atrás (depth = baseY = a
  // linha do chão do objeto). cx/cy/cw/ch = região recortada do mapa.
  overlays?: { cx: number; cy: number; cw: number; ch: number; baseY: number }[];
  debug?: boolean;
}

declare global {
  interface Window {
    Phaser?: any;
  }
}

let phaserLoader: Promise<any> | null = null;
function loadPhaser(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("sem window"));
  if (window.Phaser) return Promise.resolve(window.Phaser);
  if (phaserLoader) return phaserLoader;
  phaserLoader = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = PHASER_SRC;
    s.async = true;
    s.onload = () => (window.Phaser ? resolve(window.Phaser) : reject(new Error("Phaser não carregou")));
    s.onerror = () => reject(new Error("Falha ao baixar o Phaser"));
    document.head.appendChild(s);
  });
  return phaserLoader;
}

export function GameCanvas({
  config,
  controls,
  paused,
  onNearChange,
  onInteract,
  onDebugPoint,
}: {
  config: SceneConfig;
  controls: React.RefObject<Controls>;
  // Item 52: enquanto uma caixa de diálogo está aberta, o boneco não anda.
  paused?: boolean;
  onNearChange: (it: Interactable | null) => void;
  onInteract: (id: string) => void;
  onDebugPoint?: (p: Point) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const onNearRef = useRef(onNearChange);
  const onInteractRef = useRef(onInteract);
  const onDebugRef = useRef(onDebugPoint);
  const cfgRef = useRef(config);
  const sceneApiRef = useRef<{ rebuild: () => void } | null>(null);
  onNearRef.current = onNearChange;
  onInteractRef.current = onInteract;
  onDebugRef.current = onDebugPoint;
  cfgRef.current = config;

  // Recria o jogo quando o mapa muda (troca de fase). Interações/estado dentro
  // da mesma cena são atualizados por refs sem recriar.
  const sceneKey = `${config.mode}:${config.map}:${config.atlasUrl}`;

  useEffect(() => {
    let game: any = null;
    let destroyed = false;
    const cfg = cfgRef.current;

    loadPhaser()
      .then((Phaser) => {
        if (destroyed || !hostRef.current) return;

        // ── estado da cena ──
        let player: any;
        let keys: any;
        // máscara caminhável lida em pixels (closure — updatePhase não recebe scene)
        let walkMask: { data: Uint8Array; w: number; h: number; sx: number; sy: number } | null = null;
        let facing: Dir = cfg.spawn.facing;
        let nearId: string | null = null;
        // última posição válida (dentro da máscara caminhável) p/ reverter o passo
        let lastGood = { x: cfg.spawn.x, y: cfg.spawn.y };
        const markerSprites: Record<string, any> = {};
        let hudText: any;
        // world mode
        let currentNode = cfg.startNode ?? 0;
        let moving = false;
        // S4c — followers (família em fila). history = rastro de posições do pé do
        // jogador; cada follower fica a FOLLOW_SPACING*(i+1) de distância atrás.
        const followerSprites: any[] = [];
        const followerFacing: Dir[] = [];
        const history: { x: number; y: number }[] = [];

        function addWalkAnims(scene: any, key: string, texture: string) {
          (["up", "left", "down", "right"] as Dir[]).forEach((d) => {
            const base = ROW[d] * FRAMES_PER_DIR;
            const name = `${key}-walk-${d}`;
            if (scene.anims.exists(name)) return;
            scene.anims.create({
              key: name,
              frames: scene.anims.generateFrameNumbers(texture, {
                frames: [base + 1, base + 2, base + 3, base + 4, base + 5, base + 6, base + 7, base + 8],
              }),
              frameRate: 10,
              repeat: -1,
            });
          });
        }

        function preload(this: any) {
          this.load.image("map", cfg.map);
          if (cfg.walkMaskUrl) this.load.image("walkmask", cfg.walkMaskUrl);
          this.load.spritesheet("player", cfg.atlasUrl, { frameWidth: 64, frameHeight: 64 });
          if (cfg.collisionUrl) this.load.json("col", cfg.collisionUrl);
          (cfg.npcs ?? []).forEach((n, i) => {
            this.load.spritesheet(`npc${i}`, n.atlasUrl, { frameWidth: 64, frameHeight: 64 });
          });
          (cfg.followers ?? []).forEach((f, i) => {
            this.load.spritesheet(`fol${i}`, f.atlasUrl, { frameWidth: 64, frameHeight: 64 });
          });
        }

        // Mesa de 8 lugares em pixel-art no estilo do salão (item 37): toalha branca
        // com sombra, arranjo de flores no centro, cadeiras de madeira com encosto
        // (vistas 3/4 de cima), e o nome numa plaquinha com a fonte do jogo (Caveat).
        // Escala: cadeira ~ largura do boneco; mesa bem maior que ele.
        const CLOTH = 52, CHAIR_R = 72; // raios: toalha e anel de cadeiras
        function drawTable(scene: any, x: number, y: number, label: string, seats?: SeatCell[], capacity?: number) {
          const c = scene.add.container(x, y);
          const g = scene.add.graphics();
          // sombra no chão
          g.fillStyle(0x000000, 0.14);
          g.fillEllipse(0, 14, CLOTH * 2.5, CLOTH * 1.5);
          // cadeiras: capacity (fallback 8), encosto voltado pra fora. S4b: a cor e
          // um marcador mostram o estado — livre, ocupada (outro), minha ou travada.
          const n = Math.max(1, Math.min(14, capacity ?? seats?.length ?? 8));
          // começa no topo (−90°) e vai no sentido horário — leitura natural.
          for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2 - Math.PI / 2;
            const cx = Math.cos(a) * CHAIR_R, cy = Math.sin(a) * CHAIR_R;
            const ox = Math.cos(a), oy = Math.sin(a);
            const st = seats?.find((s) => s.index === i)?.state ?? "free";
            // paleta por estado (encosto / assento / detalhe)
            const pal =
              st === "mine"
                ? { back: 0x9a6b1f, seat: 0xe6b84c, top: 0xf6d98a }
                : st === "taken"
                  ? { back: 0x5a3a1f, seat: 0x8a5a30, top: 0x9f6c3c }
                  : st === "locked"
                    ? { back: 0x4a4a4a, seat: 0x6f6f6f, top: 0x8a8a8a }
                    : { back: 0x6b4423, seat: 0xa9713f, top: 0xc08a52 };
            // encosto (externo)
            g.fillStyle(pal.back, 1);
            g.fillRoundedRect(cx + ox * 8 - 11, cy + oy * 8 - 11, 22, 22, 5);
            // assento
            g.fillStyle(pal.seat, 1);
            g.fillRoundedRect(cx - 11, cy - 10, 22, 20, 5);
            g.fillStyle(pal.top, 1);
            g.fillRoundedRect(cx - 8, cy - 7, 16, 12, 4);
            // marcador no assento: ocupada/minha = "cabecinha"; travada = X.
            if (st === "taken" || st === "mine") {
              g.fillStyle(st === "mine" ? 0x7a4a12 : 0x3a2a1a, 1);
              g.fillCircle(cx, cy - 1, 6); // alguém sentado (cabeça vista de cima)
            } else if (st === "locked") {
              g.lineStyle(2.5, 0x2a2a2a, 1);
              g.beginPath();
              g.moveTo(cx - 5, cy - 5); g.lineTo(cx + 5, cy + 5);
              g.moveTo(cx + 5, cy - 5); g.lineTo(cx - 5, cy + 5);
              g.strokePath();
              g.lineStyle();
            }
          }
          // toalha: saia (drapeado) + tampo
          g.fillStyle(0xe7dcc8, 1); g.fillCircle(0, 6, CLOTH + 4);     // saia/sombra da toalha
          g.fillStyle(0xffffff, 1); g.fillCircle(0, 0, CLOTH);          // tampo branco
          g.fillStyle(0xf3eee4, 1); g.fillCircle(0, 0, CLOTH - 6);      // leve creme interno
          g.lineStyle(2, 0xd9cdb4, 1); g.strokeCircle(0, 0, CLOTH);
          // arranjo de flores central (folhas + flores)
          g.fillStyle(0x4f8a4a, 1);
          for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; g.fillCircle(Math.cos(a) * 12, Math.sin(a) * 12, 6); }
          const petals = [0xe77aa0, 0xf4c0d2, 0xe9b949, 0xffffff];
          for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; g.fillStyle(petals[i % petals.length], 1); g.fillCircle(Math.cos(a) * 8, Math.sin(a) * 8, 5); }
          g.fillStyle(0xf6d94e, 1); g.fillCircle(0, 0, 5);
          c.add(g);
          // plaquinha com o nome (fonte do jogo, não monoespaçada)
          if (label) {
            const font = (typeof document !== "undefined" && getComputedStyle(document.documentElement).getPropertyValue("--font-caveat").trim()) || "Georgia, serif";
            const plate = scene.add.graphics();
            const pw = Math.max(64, label.length * 11 + 22), py0 = CLOTH + 16;
            plate.fillStyle(0x000000, 0.12); plate.fillRoundedRect(-pw / 2 + 2, py0 + 2, pw, 30, 8);
            plate.fillStyle(0xfffdf7, 1); plate.fillRoundedRect(-pw / 2, py0, pw, 30, 8);
            plate.lineStyle(2, 0xd8b06a, 1); plate.strokeRoundedRect(-pw / 2, py0, pw, 30, 8);
            c.add(plate);
            const t = scene.add
              .text(0, py0 + 15, label, { fontFamily: font, fontSize: "22px", color: "#5a3d2b", fontStyle: "bold" })
              .setOrigin(0.5);
            c.add(t);
          }
          c.setDepth(y);
          // Item 48: sem anel dourado pulsando — a "minha mesa" ganha só um sparkle
          // discreto acima (criado em buildInteractables quando a missão está pendente).
          return c;
        }

        // Marcador de interação (item 48): SEM anel pulsando e SEM "!" grande.
        // • mapa-múndi (kind "marker"): pino de navegação discreto acima da pedra —
        //   cadeado (travado), estrela (concluído) ou sparkle (disponível).
        // • fases (NPC/pedestal/portão): indicador só quando há interação PENDENTE —
        //   um sparkle pequeno acima da cabeça; concluído/travado = nada (o cadeado
        //   só aparece na dica ao chegar perto).
        function drawMarker(scene: any, it: Interactable) {
          if (it.kind === "marker") {
            // acima da cabeça do avatar parado na pedra (item 48/49: nunca sobreposto)
            if (it.locked) return floatGlyph(scene, it.x, it.y - 74, "lock", 0xc2c6ca);
            if (it.done) return floatGlyph(scene, it.x, it.y - 74, "star", 0xffd24a);
            return sparkleHint(scene, it.x, it.y - 74);
          }
          if (it.done || it.locked) return scene.add.container(0, 0); // sem indicador
          return sparkleHint(scene, it.x, it.y - 44);
        }

        // Sparkle pixel-art discreto acima da cabeça do NPC/objeto (item 48):
        // brilho creme que PISCA (escala/alpha, estilo 2–3 frames) — nunca sobre o
        // avatar do jogador. Substitui o "!" dourado e o anel.
        function sparkleHint(scene: any, x: number, y: number) {
          const layer = scene.add.container(x, y);
          for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2]])
            paintGlyph(scene, layer, dx, dy, "sparkle", 0x201208, 0.85, 0, 3); // contorno
          paintGlyph(scene, layer, 0, 0, "sparkle", 0xfff1b8, 1, 0, 3);
          layer.setDepth(100001);
          scene.tweens.add({ targets: layer, alpha: { from: 1, to: 0.45 }, duration: 640, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
          scene.tweens.add({ targets: layer, scaleX: { from: 1, to: 0.68 }, scaleY: { from: 1, to: 0.68 }, duration: 640, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
          return layer;
        }

        // glyph pixel-art flutuante (sombra + cor), p/ os pinos do mapa-múndi
        // (cadeado/estrela). Discreto, só flutua de leve (sem anel — item 48).
        function floatGlyph(scene: any, x: number, baseY: number, glyph: GlyphName, color: number) {
          const u = 3;
          const layer = scene.add.container(0, 0);
          // contorno escuro em 4 direções → o ícone destaca em qualquer fundo
          for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2]])
            paintGlyph(scene, layer, x + dx, baseY + dy, glyph, 0x201208, 0.9, 0, u);
          paintGlyph(scene, layer, x, baseY, glyph, color, 1, 0, u);
          layer.setDepth(100001);
          scene.tweens.add({ targets: layer, y: -7, duration: 820, yoyo: true, repeat: -1 });
          return layer;
        }

        function buildInteractables(scene: any) {
          Object.values(markerSprites).forEach((m) =>
            Array.isArray(m) ? m.forEach((x: any) => x.destroy()) : m.destroy(),
          );
          for (const k of Object.keys(markerSprites)) delete markerSprites[k];
          cfgRef.current.interactables.forEach((it) => {
            if (it.kind === "table") {
              const tbl = drawTable(scene, it.x, it.y, it.tableLabel ?? "", it.seats, it.capacity);
              // Item 48: indicador só na MINHA mesa enquanto pendente — sparkle
              // discreto acima; encontrada ("check") ou demais mesas = sem indicador.
              if (it.glyph === "bang" && !it.done) {
                const g = sparkleHint(scene, it.x, it.y - 100);
                markerSprites[it.id] = [tbl, g];
              } else {
                markerSprites[it.id] = tbl;
              }
            } else {
              markerSprites[it.id] = drawMarker(scene, it);
            }
          });
        }

        function create(this: any) {
          buildScene(this);
        }
        function buildScene(scene: any) {
          const W = cfg.w;
          const H = cfg.h;

          const bg = scene.add.image(0, 0, "map").setOrigin(0, 0);
          bg.setDepth(0);

          // Overlays de profundidade (item 27): cada um é uma cópia recortada do
          // mapa, posicionada igual ao fundo, com depth = baseY. Quando o avatar
          // (depth = player.y) está acima da linha do chão do objeto, o overlay
          // o cobre (parece estar atrás); abaixo, o avatar fica na frente.
          (cfg.overlays ?? []).forEach((o) => {
            const img = scene.add.image(0, 0, "map").setOrigin(0, 0);
            img.setCrop(o.cx, o.cy, o.cw, o.ch);
            img.setDepth(o.baseY);
            if (cfg.debug) {
              scene.add
                .rectangle(o.cx + o.cw / 2, o.cy + o.ch / 2, o.cw, o.ch)
                .setStrokeStyle(2, 0x33ddff, 0.9)
                .setDepth(95000);
            }
          });

          // celular/toque: sobe a noiva acima da faixa de controles (D-pad/A-B)
          const coarsePointer =
            typeof window !== "undefined" &&
            (window.matchMedia?.("(pointer: coarse)")?.matches || "ontouchstart" in window);
          scene.physics.world.setBounds(0, 0, W, H);
          // Item 56: a arte do mapa-múndi agora é ESTENDIDA pra baixo (mar/ilhotas
          // de verdade abaixo das pedras), então a câmera usa os limites REAIS da
          // arte — acabou a antiga folga "cor do mar" lisa (camPadB) atrás dos
          // controles. A noiva ainda sobe acima do D-pad pelo followOffset (abaixo).
          scene.cameras.main.setBounds(0, 0, W, H);
          const applyZoom = () => {
            const vw = scene.scale.width || 640;
            const vh = scene.scale.height || 400;
            const z = cfg.zoom ?? computeZoom(vw, vh, W, H, cfg.mode);
            scene.cameras.main.setZoom(z);
            // followOffset.y negativo = alvo mais pra CIMA na tela. No celular sobe
            // ~metade da faixa dos controles pra noiva nunca ficar atrás deles (item 50).
            if (cfg.mode === "world") {
              const band = coarsePointer ? 180 : 0;
              scene.cameras.main.setFollowOffset(0, -(band / 2) / z);
            }
          };
          applyZoom();
          // Fundo: cor do mar no mapa-múndi (a faixa extra embaixo vira "mar");
          // verde-escuro nas fases (bordas da arte).
          scene.cameras.main.setBackgroundColor(cfg.mode === "world" ? "#2f7fb8" : "#2b3a1e");
          // recalcula zoom e recentra ao girar/redimensionar a tela
          scene.scale.on("resize", () => {
            applyZoom();
            if (player) scene.cameras.main.centerOn(player.x, player.y);
          });

          addWalkAnims(scene, "player", "player");

          // ── colisões (fase) ──
          if (cfg.collisionUrl) {
            const col = scene.cache.json.get("col") as { blocks: { x: number; y: number; w: number; h: number }[] } | null;
            const walls: any[] = [];
            (col?.blocks ?? []).forEach((b) => {
              // Debug: magenta (0xff2bff) — cor rara nessa arte (telhados/flores
              // vermelhos confundiam o 0xff3344), fácil de conferir cobertura.
              const r = scene.add.rectangle(b.x + b.w / 2, b.y + b.h / 2, b.w, b.h, 0xff2bff, cfg.debug ? 0.25 : 0);
              scene.physics.add.existing(r, true);
              if (cfg.debug) r.setStrokeStyle(3, 0xff2bff, 1).setDepth(90000);
              walls.push(r);
            });
            scene._walls = walls;
          }
          scene._walls = scene._walls ?? [];

          // ── máscara caminhável (vila/bosque): lê os pixels do PNG pra um array
          // alpha (opaco = caminhável). O avatar fica preso dentro dela (itens 40/42).
          if (scene.textures.exists("walkmask")) {
            const src = scene.textures.get("walkmask").getSourceImage() as HTMLImageElement;
            const mw = src.width, mh = src.height;
            const cnv = document.createElement("canvas");
            cnv.width = mw; cnv.height = mh;
            const ctx2 = cnv.getContext("2d", { willReadFrequently: true })!;
            ctx2.drawImage(src, 0, 0);
            const alpha = ctx2.getImageData(0, 0, mw, mh).data;
            const arr = new Uint8Array(mw * mh);
            for (let i = 0; i < mw * mh; i++) arr[i] = alpha[i * 4 + 3] > 80 ? 1 : 0;
            walkMask = { data: arr, w: mw, h: mh, sx: mw / W, sy: mh / H };
          }

          // Sólidos desenhados pelo jogo (mesas do salão, pedestais do bosque):
          // não estão no .colisao.json, então viram corpos circulares estáticos
          // para o avatar não os atravessar. Raio < 72 (alcance de interação),
          // então ainda dá pra chegar perto e interagir.
          (cfg.interactables ?? []).forEach((it) => {
            if (it.kind !== "table" && it.kind !== "pedestal" && !it.solid) return;
            const rad = it.kind === "table" ? 62 : it.kind === "pedestal" ? 22 : 15;
            const body = scene.add.circle(it.x, it.y, rad, 0xff2bff, cfg.debug ? 0.25 : 0);
            scene.physics.add.existing(body, true);
            body.body.setCircle(rad);
            if (cfg.debug) body.setStrokeStyle(3, 0xff2bff, 1).setDepth(90000);
            scene._walls.push(body);
          });

          // ── mesas / pedestais / NPCs decorativos ──
          buildInteractables(scene);

          (cfg.npcs ?? []).forEach((n, i) => {
            addWalkAnims(scene, `npc${i}`, `npc${i}`);
            const s = scene.add.sprite(n.x, n.y, `npc${i}`, ROW[n.facing] * FRAMES_PER_DIR);
            s.setOrigin(0.5, ORIGIN_Y); // origem na sola (item 44)
            s.setScale(AVATAR_SCALE);
            s.setDepth(n.y);
          });

          // ── avatar ──
          player = scene.physics.add.sprite(cfg.spawn.x, cfg.spawn.y, "player", ROW[cfg.spawn.facing] * FRAMES_PER_DIR);
          player.setOrigin(0.5, ORIGIN_Y); // origem na sola → player.x/y = o pé (item 44)
          player.setScale(AVATAR_SCALE);
          player.setCollideWorldBounds(true);
          // hitbox na base: o fundo do corpo (frame y62) coincide com a sola.
          player.body.setSize(22, 12).setOffset(21, 50);
          player.setDepth(cfg.spawn.y);
          if (scene._walls) scene.physics.add.collider(player, scene._walls);
          scene.cameras.main.startFollow(player, true, 0.14, 0.14);
          // snap imediato: o avatar já nasce centralizado e visível (não espera
          // o lerp da câmera) — resolve "o boneco não aparece" (itens 15 e 19).
          scene.cameras.main.centerOn(player.x, player.y);

          // ── S4c — followers da família (fila atrás do jogador) ──
          followerSprites.length = 0;
          followerFacing.length = 0;
          (cfg.followers ?? []).forEach((f, i) => {
            addWalkAnims(scene, `fol${i}`, `fol${i}`);
            const s = scene.add.sprite(player.x, player.y, `fol${i}`, ROW.down * FRAMES_PER_DIR);
            s.setOrigin(0.5, ORIGIN_Y); // origem na sola (mesma colisão pela base)
            s.setScale(f.child ? CHILD_SCALE : AVATAR_SCALE);
            s.setDepth(player.y);
            followerSprites.push(s);
            followerFacing.push("down");
          });
          history.length = 0;
          history.push({ x: player.x, y: player.y });

          // ── world: posiciona no nó inicial (a trilha já está pintada na arte;
          // não desenhamos linha reta por cima — item 20) ──
          if (cfg.mode === "world" && cfg.nodes && cfg.edges) {
            const n = cfg.nodes[currentNode];
            player.setPosition(n.x, n.y);
            player.setDepth(n.y);
            player.body.setAllowGravity(false);
            player.body.moves = false; // movimento por tween, não física
            // Item 47: parado no mapa-múndi, o avatar fica SEMPRE de frente pro
            // jogador (direção down) — não de costas com a direção do trecho.
            facing = "down";
            player.anims.stop();
            player.setFrame(ROW.down * FRAMES_PER_DIR);
          }

          // ── HUD de proximidade (debug: coords do mouse) ──
          if (cfg.debug) {
            hudText = scene.add
              .text(8, 8, "", { fontFamily: "monospace", fontSize: "16px", color: "#fff", backgroundColor: "#000a" })
              .setScrollFactor(0)
              .setDepth(100002);
            scene.input.on("pointermove", (p: any) => {
              const wx = Math.round(p.worldX);
              const wy = Math.round(p.worldY);
              if (hudText) hudText.setText(`x:${wx} y:${wy}`);
              onDebugRef.current?.({ x: wx, y: wy });
            });
          }

          keys = scene.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.UP,
            down: Phaser.Input.Keyboard.KeyCodes.DOWN,
            left: Phaser.Input.Keyboard.KeyCodes.LEFT,
            right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
            w: Phaser.Input.Keyboard.KeyCodes.W,
            a: Phaser.Input.Keyboard.KeyCodes.A,
            s: Phaser.Input.Keyboard.KeyCodes.S,
            d: Phaser.Input.Keyboard.KeyCodes.D,
            interact: Phaser.Input.Keyboard.KeyCodes.SPACE,
            enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
            e: Phaser.Input.Keyboard.KeyCodes.E, // ação (A) no PC
            z: Phaser.Input.Keyboard.KeyCodes.Z, // ação (A) estilo GBA no PC
          });

          // atualiza marcadores/mesas sem recriar a cena (ex.: portão libera,
          // memória vista, mesa encontrada) — preserva a posição do avatar.
          sceneApiRef.current = { rebuild: () => buildInteractables(scene) };
          scene._ready = true;
        }

        // S4c — registra o rastro do pé do jogador e posiciona a família em fila.
        function recordHistory() {
          const last = history[0];
          if (!last || Math.hypot(player.x - last.x, player.y - last.y) >= 3) {
            history.unshift({ x: player.x, y: player.y });
            const maxLen = Math.ceil(((followerSprites.length + 1) * FOLLOW_SPACING) / 3) + 24;
            if (history.length > maxLen) history.length = maxLen;
          }
        }
        // ponto do rastro a uma distância (arc-length) atrás do jogador.
        function sampleHistory(dist: number): { x: number; y: number } {
          let acc = 0;
          for (let k = 1; k < history.length; k++) {
            const seg = Math.hypot(history[k].x - history[k - 1].x, history[k].y - history[k - 1].y);
            if (acc + seg >= dist) {
              const t = (dist - acc) / (seg || 1);
              return {
                x: history[k - 1].x + (history[k].x - history[k - 1].x) * t,
                y: history[k - 1].y + (history[k].y - history[k - 1].y) * t,
              };
            }
            acc += seg;
          }
          return history[history.length - 1] ?? { x: player.x, y: player.y };
        }
        function updateFollowers() {
          if (!followerSprites.length) return;
          recordHistory();
          for (let i = 0; i < followerSprites.length; i++) {
            const spr = followerSprites[i];
            const pos = sampleHistory(FOLLOW_SPACING * (i + 1));
            const dx = pos.x - spr.x, dy = pos.y - spr.y;
            spr.setPosition(pos.x, pos.y);
            spr.setDepth(pos.y);
            if (Math.abs(dx) + Math.abs(dy) > 0.4) {
              const dir: Dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "left" : "right") : dy < 0 ? "up" : "down";
              followerFacing[i] = dir;
              spr.anims.play(`fol${i}-walk-${dir}`, true);
            } else {
              spr.anims.stop();
              spr.setFrame(ROW[followerFacing[i]] * FRAMES_PER_DIR);
            }
          }
        }

        function nearestInteractable(px: number, py: number): Interactable | null {
          let best: Interactable | null = null;
          let bestD = Infinity;
          for (const it of cfgRef.current.interactables) {
            const r = it.radius ?? 72;
            const d = Phaser.Math.Distance.Between(px, py, it.x, it.y);
            if (d <= r && d < bestD) {
              best = it;
              bestD = d;
            }
          }
          return best;
        }

        function readDir(): { up: boolean; down: boolean; left: boolean; right: boolean; interact: boolean } {
          const c = controls.current ?? { up: false, down: false, left: false, right: false, interact: false };
          return {
            left: keys.left.isDown || keys.a.isDown || c.left,
            right: keys.right.isDown || keys.d.isDown || c.right,
            up: keys.up.isDown || keys.w.isDown || c.up,
            down: keys.down.isDown || keys.s.isDown || c.down,
            interact:
              Phaser.Input.Keyboard.JustDown(keys.interact) ||
              Phaser.Input.Keyboard.JustDown(keys.enter) ||
              Phaser.Input.Keyboard.JustDown(keys.e) ||
              Phaser.Input.Keyboard.JustDown(keys.z) ||
              c.interact,
          };
        }

        // true se o ponto (coords do mundo) é caminhável na máscara (ou se não há
        // máscara nesta fase). Fora dos limites = não caminhável.
        function walkableAt(wx: number, wy: number): boolean {
          const wk = walkMask;
          if (!wk) return true;
          const mx = Math.floor(wx * wk.sx), my = Math.floor(wy * wk.sy);
          if (mx < 0 || my < 0 || mx >= wk.w || my >= wk.h) return false;
          return wk.data[my * wk.w + mx] === 1;
        }

        function updatePhase() {
          // ── restrição à máscara caminhável: se os pés saíram da máscara, reverte
          // (tentando deslizar por um eixo antes de parar de vez) ──
          if (walkMask && player) {
            // testa a SOLA (player.x, player.y): com a origem na sola, esse é o
            // ponto do pé — a máscara é o CHÃO/piso da arte, onde o pé pisa (item 44).
            const fx = player.x, fy = player.y;
            if (walkableAt(fx, fy)) {
              lastGood = { x: player.x, y: player.y };
            } else {
              const dx = player.x - lastGood.x, dy = player.y - lastGood.y;
              if (dx !== 0 && walkableAt(fx - dx, fy)) player.setPosition(lastGood.x, player.y);
              else if (dy !== 0 && walkableAt(fx, fy - dy)) player.setPosition(player.x, lastGood.y);
              else player.setPosition(lastGood.x, lastGood.y);
              player.body.setVelocity(0, 0);
              lastGood = { x: player.x, y: player.y };
            }
          }

          const d = readDir();
          let vx = 0;
          let vy = 0;
          if (d.left) vx -= SPEED;
          if (d.right) vx += SPEED;
          if (d.up) vy -= SPEED;
          if (d.down) vy += SPEED;
          if (vx !== 0 && vy !== 0) {
            vx *= 0.7071;
            vy *= 0.7071;
          }
          player.body.setVelocity(vx, vy);
          if (vx !== 0 || vy !== 0) {
            const dir: Dir = Math.abs(vx) > Math.abs(vy) ? (vx < 0 ? "left" : "right") : vy < 0 ? "up" : "down";
            facing = dir;
            player.anims.play(`player-walk-${dir}`, true);
          } else {
            player.anims.stop();
            player.setFrame(ROW[facing] * FRAMES_PER_DIR);
          }
          player.setDepth(player.y);

          const near = nearestInteractable(player.x, player.y);
          const id = near?.id ?? null;
          if (id !== nearId) {
            nearId = id;
            onNearRef.current(near);
          }
          if (d.interact) {
            if (controls.current) controls.current.interact = false;
            if (near && !near.locked) onInteractRef.current(near.id);
          }
        }

        // vizinhos de um nó e a polilinha (start→…→end) seguindo a trilha
        function neighborsOf(node: number): number[] {
          const out: number[] = [];
          (cfg.edges ?? []).forEach((e) => {
            if (e.a === node) out.push(e.b);
            else if (e.b === node) out.push(e.a);
          });
          return out;
        }
        function pathBetween(from: number, to: number): Point[] | null {
          for (const e of cfg.edges ?? []) {
            if (e.a === from && e.b === to) return [cfg.nodes![from], ...(e.via ?? []), cfg.nodes![to]];
            if (e.a === to && e.b === from)
              return [cfg.nodes![from], ...[...(e.via ?? [])].reverse(), cfg.nodes![to]];
          }
          return null;
        }
        // caminha o avatar ao longo da polilinha (um ponto por vez), virando a
        // animação para a direção de cada trecho. Nunca sai da trilha.
        function moveAlong(scene: any, points: Point[], onDone: () => void) {
          const segs: { a: Point; b: Point; L: number; acc: number }[] = [];
          let total = 0;
          for (let i = 0; i < points.length - 1; i++) {
            const L = Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y) || 1;
            segs.push({ a: points[i], b: points[i + 1], L, acc: total });
            total += L;
          }
          const st = { d: 0 };
          scene.tweens.add({
            targets: st,
            d: total,
            // Item 45: viagem no mapa com velocidade CONSTANTE ~166 px/s (um pouco
            // menor que o andar das fases, SPEED=195), antes era ~435 px/s. Ease
            // linear = ritmo de caminhada constante; passo e câmera já acompanham.
            duration: Math.max(600, total * 6),
            ease: "Linear",
            onUpdate: () => {
              let seg = segs[segs.length - 1];
              for (const s of segs) {
                if (st.d <= s.acc + s.L) {
                  seg = s;
                  break;
                }
              }
              const t = Math.min(1, Math.max(0, (st.d - seg.acc) / seg.L));
              const x = seg.a.x + (seg.b.x - seg.a.x) * t;
              const y = seg.a.y + (seg.b.y - seg.a.y) * t;
              player.setPosition(x, y);
              player.setDepth(y);
              const dx = seg.b.x - seg.a.x;
              const dy = seg.b.y - seg.a.y;
              const dir: Dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "left" : "right") : dy < 0 ? "up" : "down";
              if (dir !== facing) {
                facing = dir;
                player.anims.play(`player-walk-${dir}`, true);
              }
            },
            onComplete: onDone,
          });
        }

        function updateWorld(scene: any) {
          const d = readDir();
          if (!moving) {
            // escolhe o vizinho cuja direção INICIAL da trilha casa com o input
            let want: { x: number; y: number } | null = null;
            if (d.left) want = { x: -1, y: 0 };
            else if (d.right) want = { x: 1, y: 0 };
            else if (d.up) want = { x: 0, y: -1 };
            else if (d.down) want = { x: 0, y: 1 };
            if (want) {
              const here = cfg.nodes![currentNode];
              let bestNode = -1;
              let bestDot = 0.3;
              let bestPath: Point[] | null = null;
              neighborsOf(currentNode).forEach((other) => {
                const path = pathBetween(currentNode, other);
                if (!path || path.length < 2) return;
                // direção dos primeiros ~40px da trilha (não só o 1º waypoint, que
                // é ruidoso): acumula o comprimento até ~40px (item 35).
                let acc = 0, tx = path[path.length - 1].x, ty = path[path.length - 1].y;
                for (let k = 1; k < path.length; k++) {
                  acc += Math.hypot(path[k].x - path[k - 1].x, path[k].y - path[k - 1].y);
                  if (acc >= 40) { tx = path[k].x; ty = path[k].y; break; }
                }
                const nx = tx - here.x;
                const ny = ty - here.y;
                const len = Math.hypot(nx, ny) || 1;
                const dot = (nx / len) * want!.x + (ny / len) * want!.y;
                if (dot > bestDot) {
                  bestDot = dot;
                  bestNode = other;
                  bestPath = path;
                }
              });
              if (bestNode >= 0 && bestPath) {
                moving = true;
                moveAlong(scene, bestPath, () => {
                  currentNode = bestNode;
                  moving = false;
                  // Item 47: ao chegar na plataforma, para de frente pro jogador
                  // (down), nunca de costas com a direção do último trecho.
                  facing = "down";
                  player.anims.stop();
                  player.setFrame(ROW.down * FRAMES_PER_DIR);
                });
              }
            }
          }
          player.setDepth(player.y);

          // marcador no nó atual?
          const marker = cfgRef.current.interactables.find((it) => {
            return Phaser.Math.Distance.Between(player.x, player.y, it.x, it.y) < 48;
          });
          const id = marker?.id ?? null;
          if (id !== nearId) {
            nearId = id;
            onNearRef.current(marker ?? null);
          }
          if (d.interact && !moving) {
            if (controls.current) controls.current.interact = false;
            if (marker && !marker.locked) onInteractRef.current(marker.id);
          }
        }

        function update(this: any) {
          if (!this._ready || !player) return;
          // Item 52: caixa de diálogo aberta → congela o avatar (para a velocidade
          // e a animação; A/B/setas passam a controlar o diálogo, não o jogo).
          if (pausedRef.current) {
            if (cfgRef.current.mode !== "world" && player.body) player.body.setVelocity(0, 0);
            player.anims.stop();
            player.setFrame(ROW[facing] * FRAMES_PER_DIR);
            if (controls.current) controls.current.interact = false;
            updateFollowers(); // família para junto (idle) com a caixa aberta
            return;
          }
          if (cfgRef.current.mode === "world") updateWorld(this);
          else updatePhase();
          updateFollowers();
        }

        game = new Phaser.Game({
          type: Phaser.AUTO,
          parent: hostRef.current,
          width: hostRef.current.clientWidth || 640,
          height: hostRef.current.clientHeight || 400,
          pixelArt: true,
          backgroundColor: "#2b3a1e",
          // Item 55: o jogo não tem som → noAudio evita o WebAudio criado antes do
          // toque ("The AudioContext was not allowed to start"). banner:false tira
          // o banner do Phaser do console (aparecia a cada montagem, 3x em dev).
          audio: { noAudio: true },
          banner: false,
          scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
          physics: { default: "arcade", arcade: { gravity: { x: 0, y: 0 }, debug: false } },
          scene: { preload, create, update },
        });
      })
      .catch((e) => console.error("[jogo] Phaser:", e));

    return () => {
      destroyed = true;
      sceneApiRef.current = null;
      if (game) game.destroy(true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneKey]);

  // Reconstrói marcadores/mesas dentro da MESMA cena quando o estado muda
  // (portão libera, memória vista, mesa encontrada), sem perder a posição.
  const interactSig = config.interactables
    .map(
      (i) =>
        `${i.id}:${i.locked ? 1 : 0}${i.done ? 1 : 0}${i.highlight ? 1 : 0}:${i.glyph ?? ""}:${
          i.seats ? i.seats.map((s) => s.state[0]).join("") : ""
        }`,
    )
    .join("|");
  useEffect(() => {
    sceneApiRef.current?.rebuild();
  }, [interactSig]);

  return <div ref={hostRef} className="h-full w-full" />;
}

export default GameCanvas;
