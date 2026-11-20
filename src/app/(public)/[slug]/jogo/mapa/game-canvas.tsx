"use client";

import { useEffect, useRef } from "react";
import type { Dir, Point, WorldEdge } from "@/lib/game/world";

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
const FRAMES_PER_DIR = 9; // sheets LPC: 9 colunas × 4 linhas
const ROW: Record<Dir, number> = { up: 0, left: 1, down: 2, right: 3 };

// Zoom responsivo "cover": o mapa sempre enche a tela (sem faixas vazias) e a
// câmera segue o avatar. No celular mostra ~2 casas; no desktop, quase a fase
// toda. (Feedback do JOs, itens 14 e 19.)
function computeZoom(vw: number, vh: number, mapW: number, mapH: number): number {
  const cover = Math.max(vw / mapW, vh / mapH);
  return Math.max(0.5, Math.min(1.6, cover));
}

// ─── Ícones em pixel-art (sem emoji — feedback do JOs, item 6) ───────────────
// Pequenos bitmaps desenhados com retângulos (cada caractere ≠ '.' vira um
// bloco). Substituem os emoji flutuantes dos marcadores (cadeado, estrela…).
type GlyphName = "lock" | "star" | "pin" | "mail" | "flower" | "book" | "check" | "door";
const GLYPHS: Record<GlyphName, string[]> = {
  lock: ["..###..", ".#...#.", ".#...#.", ".#...#.", "#######", "##.#.##", "#######", "#######"],
  star: ["...#...", "...#...", "#######", ".#####.", "..###..", ".##.##.", "##...##"],
  pin: [".#####.", "#.....#", "#..#..#", "#.....#", ".#...#.", "..#.#..", "...#...", "...#..."],
  mail: ["#######", "##...##", "#.#.#.#", "#..#..#", "#.....#", "#######"],
  flower: ["..#.#..", ".#####.", ".#####.", "..###..", "...#...", ".##.#..", "...#..."],
  book: [".#...#.", "#######", "#.#.#.#", "#.#.#.#", "#######", ".#...#."],
  check: [".....##", "....##.", "#..##..", "##.##..", ".###...", "..#...."],
  door: ["#######", "#.....#", "#.....#", "#....##", "#.....#", "#.....#", "#######"],
};
function paintGlyph(scene: any, container: any, cx: number, cy: number, name: GlyphName, color: number, alpha: number, off: number) {
  const g = scene.add.graphics();
  const rows = GLYPHS[name];
  const u = 3;
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
  interactables: Interactable[];
  // world:
  nodes?: Point[];
  edges?: WorldEdge[];
  startNode?: number;
  // phase:
  npcs?: NpcAvatar[];
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
  onNearChange,
  onInteract,
  onDebugPoint,
}: {
  config: SceneConfig;
  controls: React.RefObject<Controls>;
  onNearChange: (it: Interactable | null) => void;
  onInteract: (id: string) => void;
  onDebugPoint?: (p: Point) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
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
        let facing: Dir = cfg.spawn.facing;
        let nearId: string | null = null;
        const markerSprites: Record<string, any> = {};
        let hudText: any;
        // world mode
        let currentNode = cfg.startNode ?? 0;
        let moving = false;

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
          this.load.spritesheet("player", cfg.atlasUrl, { frameWidth: 64, frameHeight: 64 });
          if (cfg.collisionUrl) this.load.json("col", cfg.collisionUrl);
          (cfg.npcs ?? []).forEach((n, i) => {
            this.load.spritesheet(`npc${i}`, n.atlasUrl, { frameWidth: 64, frameHeight: 64 });
          });
        }

        // desenha uma mesa redonda (arte própria via Graphics) com cadeiras
        function drawTable(scene: any, x: number, y: number, label: string, highlight: boolean) {
          const c = scene.add.container(x, y);
          const g = scene.add.graphics();
          // cadeiras (8) em volta
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            g.fillStyle(0x8a5a3a, 1);
            g.fillCircle(Math.cos(a) * 46, Math.sin(a) * 46, 9);
          }
          // tampo
          g.fillStyle(0xffffff, 1);
          g.fillCircle(0, 0, 34);
          g.fillStyle(0xf3e6c4, 1);
          g.fillCircle(0, 0, 30);
          g.lineStyle(2, 0xc9a24a, 1);
          g.strokeCircle(0, 0, 30);
          // centro (arranjo)
          g.fillStyle(0xe48aa6, 1);
          g.fillCircle(0, 0, 8);
          c.add(g);
          const t = scene.add
            .text(0, 1, label, { fontFamily: "monospace", fontSize: "16px", color: "#5a3d2b", fontStyle: "bold" })
            .setOrigin(0.5);
          c.add(t);
          c.setDepth(y);
          if (highlight) {
            const ring = scene.add.circle(x, y, 52, 0xffd24a, 0.18).setStrokeStyle(3, 0xffd24a, 0.9);
            ring.setDepth(y - 1);
            scene.tweens.add({ targets: ring, scale: { from: 0.9, to: 1.15 }, alpha: { from: 0.9, to: 0.3 }, duration: 800, yoyo: true, repeat: -1 });
          }
          return c;
        }

        // marcador flutuante (anel + ícone pixel-art) para NPC / pedestal / portão
        function drawMarker(scene: any, it: Interactable) {
          const dimmed = it.locked;
          const color = it.done ? 0x9aa0a6 : it.locked ? 0x9aa0a6 : 0xffe58a;
          const ring = scene.add.circle(it.x, it.y, 26, color, 0.0).setStrokeStyle(3, color, dimmed ? 0.5 : 0.95);
          ring.setDepth(100000);
          if (!dimmed && !it.done) {
            scene.tweens.add({ targets: ring, scale: { from: 0.85, to: 1.1 }, duration: 900, yoyo: true, repeat: -1 });
          }
          // ícone pixel-art flutuante (cadeado, estrela, etc. — nunca emoji)
          const glyph: GlyphName =
            it.glyph ?? (it.locked ? "lock" : it.done ? (it.kind === "pedestal" ? "check" : "star") : "pin");
          const glyphColor = it.locked ? 0xb9bdc2 : it.done ? 0xffd24a : 0xffe58a;
          const gy = it.y - 46;
          const iconLayer = scene.add.container(0, 0);
          paintGlyph(scene, iconLayer, it.x, gy, glyph, 0x201208, 0.55, 1.5); // sombra
          paintGlyph(scene, iconLayer, it.x, gy, glyph, glyphColor, 1, 0);
          iconLayer.setDepth(100001);
          scene.tweens.add({ targets: iconLayer, y: -7, duration: 900, yoyo: true, repeat: -1 });
          const c = scene.add.container(0, 0, [ring, iconLayer]);
          c.setDepth(100000);
          return c;
        }

        function buildInteractables(scene: any) {
          Object.values(markerSprites).forEach((m) => m.destroy());
          for (const k of Object.keys(markerSprites)) delete markerSprites[k];
          cfgRef.current.interactables.forEach((it) => {
            if (it.kind === "table") {
              markerSprites[it.id] = drawTable(scene, it.x, it.y, it.tableLabel ?? "", !!it.highlight);
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

          scene.physics.world.setBounds(0, 0, W, H);
          scene.cameras.main.setBounds(0, 0, W, H);
          const applyZoom = () => {
            const vw = scene.scale.width || 640;
            const vh = scene.scale.height || 400;
            scene.cameras.main.setZoom(cfg.zoom ?? computeZoom(vw, vh, W, H));
          };
          applyZoom();
          scene.cameras.main.setBackgroundColor("#2b3a1e");
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
              const r = scene.add.rectangle(b.x + b.w / 2, b.y + b.h / 2, b.w, b.h, 0xff3344, cfg.debug ? 0.28 : 0);
              scene.physics.add.existing(r, true);
              if (cfg.debug) r.setStrokeStyle(2, 0xff3344, 0.9).setDepth(90000);
              walls.push(r);
            });
            scene._walls = walls;
          }

          // ── mesas / pedestais / NPCs decorativos ──
          buildInteractables(scene);

          (cfg.npcs ?? []).forEach((n, i) => {
            addWalkAnims(scene, `npc${i}`, `npc${i}`);
            const s = scene.add.sprite(n.x, n.y, `npc${i}`, ROW[n.facing] * FRAMES_PER_DIR);
            s.setScale(AVATAR_SCALE);
            s.setDepth(n.y);
          });

          // ── avatar ──
          player = scene.physics.add.sprite(cfg.spawn.x, cfg.spawn.y, "player", ROW[cfg.spawn.facing] * FRAMES_PER_DIR);
          player.setScale(AVATAR_SCALE);
          player.setCollideWorldBounds(true);
          // hitbox só nos PÉS (item 27): corpo pequeno na base do sprite. Em
          // coords do frame (Phaser multiplica pela escala).
          player.body.setSize(22, 12).setOffset(21, 50);
          player.setDepth(cfg.spawn.y);
          if (scene._walls) scene.physics.add.collider(player, scene._walls);
          scene.cameras.main.startFollow(player, true, 0.14, 0.14);
          // snap imediato: o avatar já nasce centralizado e visível (não espera
          // o lerp da câmera) — resolve "o boneco não aparece" (itens 15 e 19).
          scene.cameras.main.centerOn(player.x, player.y);

          // ── world: posiciona no nó inicial (a trilha já está pintada na arte;
          // não desenhamos linha reta por cima — item 20) ──
          if (cfg.mode === "world" && cfg.nodes && cfg.edges) {
            const n = cfg.nodes[currentNode];
            player.setPosition(n.x, n.y);
            player.setDepth(n.y);
            player.body.setAllowGravity(false);
            player.body.moves = false; // movimento por tween, não física
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
          });

          // atualiza marcadores/mesas sem recriar a cena (ex.: portão libera,
          // memória vista, mesa encontrada) — preserva a posição do avatar.
          sceneApiRef.current = { rebuild: () => buildInteractables(scene) };
          scene._ready = true;
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
              Phaser.Input.Keyboard.JustDown(keys.interact) || Phaser.Input.Keyboard.JustDown(keys.enter) || c.interact,
          };
        }

        function updatePhase() {
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
            duration: Math.max(220, total * 2.3),
            ease: "Sine.easeInOut",
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
                const nx = path[1].x - here.x;
                const ny = path[1].y - here.y;
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
                  player.anims.stop();
                  player.setFrame(ROW[facing] * FRAMES_PER_DIR);
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
          if (cfgRef.current.mode === "world") updateWorld(this);
          else updatePhase();
        }

        game = new Phaser.Game({
          type: Phaser.AUTO,
          parent: hostRef.current,
          width: hostRef.current.clientWidth || 640,
          height: hostRef.current.clientHeight || 400,
          pixelArt: true,
          backgroundColor: "#2b3a1e",
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
    .map((i) => `${i.id}:${i.locked ? 1 : 0}${i.done ? 1 : 0}${i.highlight ? 1 : 0}`)
    .join("|");
  useEffect(() => {
    sceneApiRef.current?.rebuild();
  }, [interactSig]);

  return <div ref={hostRef} className="h-full w-full" />;
}

export default GameCanvas;
