// Valida o compositor (rosto incluso) sobre os assets de public/game/personagem.
// Espelha src/lib/game/character/compositor.ts (recolor de pele/cabelo + íris).
// Gera public/dev-personagens/_creator_test.png: 3 figuras completas em cima e
// uma grade de closeups de rosto embaixo (cores de olho, sobrancelha, barba,
// óculos) — pra inspecionar o rosto personalizável de relance.
//
// Em WSL o sharp do node_modules é o binário Windows; rode apontando o sharp
// linux:  NODE_PATH=<scratchpad>/sharp-linux/node_modules node scripts/game/test-creator.mjs
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const A = path.join(process.cwd(), "public/game/personagem");
const OUT = path.join(process.cwd(), "public/dev-personagens");
const FRAME = { left: 0, top: 128, width: 64, height: 64 };
const hex = (h) => { h = h.replace("#", ""); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
const pal = (n) => JSON.parse(fs.readFileSync(path.join(A, "palettes", n + ".json"), "utf8"));

function recolor(d, p, base, target) {
  const s = (p[base] || []).map(hex), t = (p[target] || []).map(hex), n = Math.min(s.length, t.length);
  for (let i = 0; i < d.length; i += 4) { if (!d[i + 3]) continue; for (let k = 0; k < n; k++) { if (Math.abs(d[i] - s[k][0]) <= 1 && Math.abs(d[i + 1] - s[k][1]) <= 1 && Math.abs(d[i + 2] - s[k][2]) <= 1) { d[i] = t[k][0]; d[i + 1] = t[k][1]; d[i + 2] = t[k][2]; break; } } }
}

// recolor da íris embutida da cabeça (ver compositor.ts)
const IRIS = [[87, 206, 228], [86, 134, 174], [42, 60, 73]];
function eyeRecolor(d, h) {
  const [r, g, b] = hex(h);
  const lite = (c) => Math.round(c + (255 - c) * 0.45), dark = (c) => Math.round(c * 0.5);
  const dst = [[lite(r), lite(g), lite(b)], [r, g, b], [dark(r), dark(g), dark(b)]];
  for (let i = 0; i < d.length; i += 4) { if (!d[i + 3]) continue; for (let k = 0; k < 3; k++) { const s = IRIS[k]; if (Math.abs(d[i] - s[0]) <= 2 && Math.abs(d[i + 1] - s[1]) <= 2 && Math.abs(d[i + 2] - s[2]) <= 2) { d[i] = dst[k][0]; d[i + 1] = dst[k][1]; d[i + 2] = dst[k][2]; break; } } }
}

async function tile(l) {
  const { data } = await sharp(path.join(A, l.file)).extract(FRAME).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (l.rc) recolor(data, pal(l.rc.p), l.rc.base, l.rc.target);
  if (l.eyes) eyeRecolor(data, l.eyes);
  return data;
}

async function flatten(layers) {
  layers.sort((a, b) => a.z - b.z);
  const parts = [];
  for (const l of layers) parts.push({ input: await tile(l), raw: { width: 64, height: 64, channels: 4 }, left: 0, top: 0 });
  return sharp({ create: { width: 64, height: 64, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(parts).png().toBuffer();
}
const full = async (layers, scale = 4) => sharp(await flatten(layers)).resize(64 * scale, 64 * scale, { kernel: "nearest" }).png().toBuffer();
// closeup do rosto: recorta a cabeça (x16..48, y10..44) e amplia
const face = async (layers, scale = 8) => sharp(await sharp(await flatten(layers)).extract({ left: 16, top: 10, width: 32, height: 34 }).png().toBuffer()).resize(32 * scale, 34 * scale, { kernel: "nearest" }).png().toBuffer();

// helpers de camada
const B = (t, skin) => ({ file: `body/${t}.png`, z: 10, rc: { p: "body", base: "light", target: skin } });
const H = (t, skin, eye) => ({ file: `head/${t}.png`, z: 100, rc: { p: "body", base: "light", target: skin }, eyes: eye });
const BR = (s, c) => ({ file: `eyebrows/${s}.png`, z: 106, rc: { p: "hair", base: "orange", target: c } });
const BD = (s, c) => ({ file: `beard/${s}.png`, z: 111, rc: { p: "hair", base: "orange", target: c } });
const GL = (s) => ({ file: `glasses/${s}.png`, z: 115 });
const hair = (s, c) => ({ file: `hair/${s}.png`, z: 120, rc: { p: "hair", base: "orange", target: c } });

const BG = { r: 124, g: 141, b: 181, alpha: 1 };
async function strip(items, render, cellW, cellH, gap = 8) {
  const imgs = [];
  for (const it of items) imgs.push(await render(it));
  const W = items.length * cellW + (items.length + 1) * gap;
  const comp = imgs.map((input, i) => ({ input, left: gap + i * (cellW + gap), top: gap }));
  return { buf: await sharp({ create: { width: W, height: cellH + 2 * gap, channels: 4, background: BG } }).composite(comp).png().toBuffer(), w: W, h: cellH + 2 * gap };
}

// --- figuras completas (convidada, convidado, noiva) ---
const figures = [
  [B("female", "bronze"), H("female", "bronze", "#3f6fb8"), BR("thin", "black"), { file: "outfit/shoes_female.png", z: 15 }, { file: "dress/blue.png", z: 30 }, hair("long", "black")],
  [B("male", "peach"), H("male", "peach", "#5b3a1e"), BR("thick", "dark_brown"), BD("curta", "dark_brown"), GL("redondo"), { file: "outfit/shoes_male.png", z: 15 }, { file: "outfit/terno_pants.png", z: 20 }, { file: "outfit/terno_shirt.png", z: 35 }, hair("buzzcut", "dark_brown")],
  [{ file: "bride/veil_bg.png", z: 5 }, B("female", "light"), H("female", "light", "#3f7a4f"), BR("thin", "chestnut"), { file: "outfit/shoes_female.png", z: 15 }, { file: "bride/skirt.png", z: 30 }, { file: "bride/bodice.png", z: 35 }, hair("long", "chestnut"), { file: "bride/veil_fg.png", z: 200 }],
];

// --- grade de rostos ---
const eyeRow = ["#5b3a1e", "#3f6fb8", "#3f7a4f", "#9a6b2f", "#5b6672"].map((c) => [B("female", "light"), H("female", "light", c), BR("thin", "dark_brown"), hair("long", "dark_brown")]);
const beardRow = [["none"], ["curta"], ["media"], ["bigode"]].map(([bd], i) => { const l = [B("male", "peach"), H("male", "peach", "#5b3a1e"), BR("thick", "black"), hair("buzzcut", "black")]; if (bd !== "none") l.push(BD(bd, "black")); if (i === 3) l.push(GL("redondo")); return l; });
const skinRow = ["light", "peach", "bronze", "brown", "black"].map((sk) => [B("male", sk), H("male", sk, "#5b3a1e"), BR("thick", "dark_brown"), hair("buzzcut", "dark_brown")]);

fs.mkdirSync(OUT, { recursive: true });
const rows = [];
rows.push(await strip(figures, (l) => full(l, 4), 256, 256));
console.log("[OK] figuras");
for (const [name, items] of [["olhos", eyeRow], ["barba+óculos", beardRow], ["pele", skinRow]]) {
  rows.push(await strip(items, (l) => face(l, 7), 32 * 7, 34 * 7));
  console.log("[OK] rostos:", name);
}

const gap = 8;
const W = Math.max(...rows.map((r) => r.w));
const Htot = rows.reduce((a, r) => a + r.h, 0) + gap * (rows.length + 1);
let y = gap;
const comp = [];
for (const r of rows) { comp.push({ input: r.buf, left: Math.round((W - r.w) / 2), top: y }); y += r.h + gap; }
await sharp({ create: { width: W, height: Htot, channels: 4, background: BG } }).composite(comp).png().toFile(path.join(OUT, "_creator_test.png"));
console.log("[OK] sheet", W + "x" + Htot, "->", path.join(OUT, "_creator_test.png"));
