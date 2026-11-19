import "server-only";
import path from "node:path";
import fs from "node:fs";
import sharp from "sharp";
import type { Layer } from "./catalog";

// Compositor paper-doll (S3). Empilha as camadas LPC (frame "em pé" = walk,
// linha sul) aplicando recolor de pele/cabelo por rampa de paleta, e devolve um
// PNG. Roda só no servidor (sharp é nativo). Assets em public/game/personagem.

const ASSETS = path.join(process.cwd(), "public", "game", "personagem");
const FRAME = { left: 0, top: 128, width: 64, height: 64 }; // sul, frame 0

const hexToRgb = (h: string): [number, number, number] => {
  const s = h.replace("#", "");
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
};

const palCache = new Map<string, Record<string, string[]>>();
function loadPalette(name: "body" | "hair"): Record<string, string[]> {
  if (!palCache.has(name)) {
    palCache.set(name, JSON.parse(fs.readFileSync(path.join(ASSETS, "palettes", `${name}.json`), "utf8")));
  }
  return palCache.get(name)!;
}

// Troca cada cor da rampa `base` pela de mesmo índice de `target` (±1 por canal).
function recolor(data: Buffer, palette: "body" | "hair", base: string, target: string) {
  const pal = loadPalette(palette);
  const src = (pal[base] ?? []).map(hexToRgb);
  const dst = (pal[target] ?? []).map(hexToRgb);
  const n = Math.min(src.length, dst.length);
  if (!n) return;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    for (let k = 0; k < n; k++) {
      if (
        Math.abs(data[i] - src[k][0]) <= 1 &&
        Math.abs(data[i + 1] - src[k][1]) <= 1 &&
        Math.abs(data[i + 2] - src[k][2]) <= 1
      ) {
        data[i] = dst[k][0];
        data[i + 1] = dst[k][1];
        data[i + 2] = dst[k][2];
        break;
      }
    }
  }
}

// Cor dos olhos = recolor da íris que JÁ vem desenhada na cabeça LPC (shading do
// artista preservado). A cabeça traz a íris em 3 tons de azul fixos; trocamos
// cada um por um tom da cor escolhida (claro/médio/escuro). A pupila/contorno
// (quase preto) e o branco do olho ficam intactos. Roda DEPOIS do recolor de
// pele (os azuis da íris não existem na rampa de pele, então não conflitam).
const IRIS_SHADES: [number, number, number][] = [
  [87, 206, 228], // brilho (claro)
  [86, 134, 174], // íris (médio)
  [42, 60, 73], // sombra inferior (escuro)
];
function eyeRecolor(data: Buffer, hex: string) {
  const [r, g, b] = hexToRgb(hex);
  const lite = (c: number) => Math.round(c + (255 - c) * 0.45);
  const dark = (c: number) => Math.round(c * 0.5);
  const dst: [number, number, number][] = [
    [lite(r), lite(g), lite(b)],
    [r, g, b],
    [dark(r), dark(g), dark(b)],
  ];
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    for (let k = 0; k < IRIS_SHADES.length; k++) {
      const s = IRIS_SHADES[k];
      if (
        Math.abs(data[i] - s[0]) <= 2 &&
        Math.abs(data[i + 1] - s[1]) <= 2 &&
        Math.abs(data[i + 2] - s[2]) <= 2
      ) {
        data[i] = dst[k][0];
        data[i + 1] = dst[k][1];
        data[i + 2] = dst[k][2];
        break;
      }
    }
  }
}

async function tile(layer: Layer): Promise<Buffer> {
  const { data } = await sharp(path.join(ASSETS, layer.file))
    .extract(FRAME)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (layer.recolor) recolor(data, layer.recolor.palette, layer.recolor.base, layer.recolor.target);
  if (layer.eyes) eyeRecolor(data, layer.eyes);
  return data;
}

// layers já ordenadas por z (ver resolveLayers). `scale` = nearest-neighbor.
export async function composeCharacter(layers: Layer[], scale = 4): Promise<Buffer> {
  const parts: sharp.OverlayOptions[] = [];
  for (const l of layers) {
    parts.push({ input: await tile(l), raw: { width: 64, height: 64, channels: 4 }, left: 0, top: 0 });
  }
  const flat = await sharp({
    create: { width: 64, height: 64, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite(parts)
    .png()
    .toBuffer();
  const size = 64 * Math.max(1, Math.min(8, scale));
  return sharp(flat).resize(size, size, { kernel: "nearest" }).png().toBuffer();
}
