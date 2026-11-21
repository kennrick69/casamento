// Preview do compositor paper-doll (S3). Gera 2-3 bonecos de exemplo, incluindo
// a noiva de véu, para o JOs avaliar o visual ANTES do criador completo.
// Roda com o node do Windows (sharp é binário nativo): pnpm node scripts/game/preview-characters.mjs
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const LPC = path.join(ROOT, "assets-src/personagens/lpc");
const SPR = path.join(LPC, "spritesheets");
const CUSTOM = path.join(ROOT, "assets-src/personagens/custom");
const PAL = path.join(LPC, "palette_definitions");
const OUT = path.join(ROOT, "public/dev-personagens");

// Pose em pé: walk, linha sul (row 2 => y=128), frame 0 (x=0). 64x64.
const FRAME = { left: 0, top: 128, width: 64, height: 64 };

const hexToRgb = (h) => {
  h = h.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};
const palCache = new Map();
const loadPalette = (file) => {
  if (!palCache.has(file)) palCache.set(file, JSON.parse(fs.readFileSync(file, "utf8")));
  return palCache.get(file);
};

// Recolor por rampa: troca cada cor da rampa `base` pela cor de mesmo índice da
// rampa `target` (tolerância +-1 por canal, como o gerador LPC).
function recolor(data, paletteFile, base, target) {
  const pal = loadPalette(paletteFile);
  const src = pal[base].map(hexToRgb);
  const dst = pal[target].map(hexToRgb);
  const n = Math.min(src.length, dst.length);
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

async function tile(layer) {
  const { data } = await sharp(layer.file)
    .extract(FRAME)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (layer.recolor) recolor(data, layer.recolor.file, layer.recolor.base, layer.recolor.target);
  return data;
}

async function compose(name, layers) {
  layers.sort((a, b) => a.z - b.z);
  const parts = [];
  for (const l of layers) {
    parts.push({ input: await tile(l), raw: { width: 64, height: 64, channels: 4 }, left: 0, top: 0 });
  }
  const flat = await sharp({
    create: { width: 64, height: 64, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite(parts)
    .png()
    .toBuffer();
  // 6x nearest-neighbor pra ficar visível e manter o pixel art nítido
  await sharp(flat).resize(384, 384, { kernel: "nearest" }).png().toFile(path.join(OUT, `${name}.png`));
  console.log(`[OK] ${name}.png (${layers.length} camadas)`);
}

const bodyPal = path.join(PAL, "body/body_ulpc.json");
const hairPal = path.join(PAL, "hair/hair_ulpc.json");
const eyes = (color) => ({ z: 100, file: path.join(SPR, `eyes/human/adult/default/walk/${color}.png`) });

const DOLLS = {
  // Noivo: convidado masculino formal
  noivo: [
    { z: 10, file: path.join(SPR, "body/bodies/male/walk.png") },
    { z: 15, file: path.join(SPR, "feet/shoes/revised/male/walk.png") },
    { z: 20, file: path.join(SPR, "legs/formal/male/walk.png") },
    { z: 35, file: path.join(SPR, "torso/clothes/longsleeve/formal/male/walk.png") },
    eyes("brown"),
    { z: 120, file: path.join(SPR, "hair/buzzcut/adult/walk.png"), recolor: { file: hairPal, base: "orange", target: "dark_brown" } },
  ],
  // Convidada: vestido + pele mais morena + cabelo preto
  convidada: [
    { z: 10, file: path.join(SPR, "body/bodies/female/walk.png"), recolor: { file: bodyPal, base: "light", target: "bronze" } },
    { z: 15, file: path.join(SPR, "feet/shoes/revised/thin/walk.png") },
    { z: 30, file: path.join(SPR, "dress/slit/female/walk/rose.png") },
    eyes("green"),
    { z: 120, file: path.join(SPR, "hair/long/adult/walk.png"), recolor: { file: hairPal, base: "orange", target: "black" } },
  ],
  // NOIVA: véu (bg atras + fg na frente) + corpete e saia brancos
  noiva: [
    { z: 5, file: path.join(CUSTOM, "veil/adult/bg/walk.png") },
    { z: 10, file: path.join(SPR, "body/bodies/female/walk.png") },
    { z: 30, file: path.join(CUSTOM, "skirt_belle_white/thin/walk.png") },
    { z: 35, file: path.join(CUSTOM, "bodice_white/female/walk.png") },
    eyes("blue"),
    { z: 120, file: path.join(SPR, "hair/long/adult/walk.png"), recolor: { file: hairPal, base: "orange", target: "chestnut" } },
    { z: 200, file: path.join(CUSTOM, "veil/adult/fg/walk.png") },
  ],
};

fs.mkdirSync(OUT, { recursive: true });
for (const [name, layers] of Object.entries(DOLLS)) {
  await compose(name, layers);
}

// Folha de contato sobre fundo colorido (como no jogo o avatar fica sobre um
// cenario): deixa o vestido/veu branco legivel.
const names = Object.keys(DOLLS);
const cell = 384;
const sheet = await sharp({
  create: { width: cell * names.length, height: cell, channels: 4, background: { r: 124, g: 141, b: 181, alpha: 1 } },
})
  .composite(names.map((n, i) => ({ input: path.join(OUT, `${n}.png`), left: i * cell, top: 0 })))
  .png()
  .toBuffer();
await sharp(sheet).toFile(path.join(OUT, "_contato.png"));
console.log("Pronto:", OUT);
