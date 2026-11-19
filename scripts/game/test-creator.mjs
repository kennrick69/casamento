// Valida o compositor sobre os assets de public/game/personagem (mesmos da rota).
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
const A = path.join(process.cwd(), "public/game/personagem");
const OUT = path.join(process.cwd(), "public/dev-personagens");
const FRAME = { left: 0, top: 128, width: 64, height: 64 };
const hex = (h) => { h = h.replace("#", ""); return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]; };
const pal = (n) => JSON.parse(fs.readFileSync(path.join(A, "palettes", n + ".json"), "utf8"));
function recolor(d, p, base, target) {
  const s = (p[base]||[]).map(hex), t = (p[target]||[]).map(hex), n = Math.min(s.length, t.length);
  for (let i=0;i<d.length;i+=4){ if(!d[i+3])continue; for(let k=0;k<n;k++){ if(Math.abs(d[i]-s[k][0])<=1&&Math.abs(d[i+1]-s[k][1])<=1&&Math.abs(d[i+2]-s[k][2])<=1){d[i]=t[k][0];d[i+1]=t[k][1];d[i+2]=t[k][2];break;} } }
}
async function tile(l) {
  const { data } = await sharp(path.join(A, l.file)).extract(FRAME).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (l.rc) recolor(data, pal(l.rc.p), l.rc.base, l.rc.target);
  return data;
}
async function compose(name, layers) {
  layers.sort((a,b)=>a.z-b.z);
  const parts = [];
  for (const l of layers) parts.push({ input: await tile(l), raw:{width:64,height:64,channels:4}, left:0, top:0 });
  const flat = await sharp({create:{width:64,height:64,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(parts).png().toBuffer();
  return sharp(flat).resize(256,256,{kernel:"nearest"}).png().toBuffer();
}
const body=(t,skin)=>({file:`body/${t}.png`,z:10,rc:{p:"body",base:"light",target:skin}});
const hair=(s,c)=>({file:`hair/${s}.png`,z:120,rc:{p:"hair",base:"orange",target:c}});
const specs = {
  conv_fem: [body("female","bronze"),{file:"outfit/shoes_female.png",z:15},{file:"dress/blue.png",z:30},hair("long","black")],
  conv_masc:[body("male","light"),{file:"outfit/shoes_male.png",z:15},{file:"outfit/terno_pants.png",z:20},{file:"outfit/terno_shirt.png",z:35},hair("buzzcut","dark_brown")],
  noiva:    [{file:"bride/veil_bg.png",z:5},body("female","light"),{file:"outfit/shoes_female.png",z:15},{file:"bride/skirt.png",z:30},{file:"bride/bodice.png",z:35},hair("long","chestnut"),{file:"bride/veil_fg.png",z:200}],
};
fs.mkdirSync(OUT,{recursive:true});
const imgs=[];
for(const [n,l] of Object.entries(specs)){ const b=await compose(n,l); imgs.push(b); console.log("[OK]",n); }
const sheet=await sharp({create:{width:256*imgs.length,height:256,channels:4,background:{r:124,g:141,b:181,alpha:1}}})
  .composite(imgs.map((b,i)=>({input:b,left:i*256,top:0}))).png().toBuffer();
await sharp(sheet).toFile(path.join(OUT,"_creator_test.png"));
console.log("sheet ok");
