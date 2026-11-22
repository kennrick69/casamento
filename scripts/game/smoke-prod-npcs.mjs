// Smoke de PRODUÇÃO — Grande Dia com NPCs do salão. Reusa o cookie de um
// visitante JÁ existente (zero dado novo) e o atalho ?start=grande-dia (liberado
// a qualquer usuário). Spawn override coloca o avatar no meio dos NPCs.
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const BASE = "https://joseeleticia.com";
const SLUG = "joseeleticia";
const OUT = "G:\\Projetos\\casamento\\docs\\screens-jogo";
const TOKEN = readFileSync(process.env.TOKFILE || "G:\\.cache\\tok-smoke.txt", "utf8").trim();
const W = 427, H = 920;

const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ deviceScaleFactor: 2, hasTouch: true, isMobile: true, viewport: { width: W, height: H } });
await ctx.addCookies([{ name: "guest_token", value: TOKEN, url: BASE }]);
const page = await ctx.newPage();
const logs = [];
page.on("pageerror", (e) => logs.push("PAGEERROR " + e.message));

// Nasce entre os NPCs (anchors dj=300, fotografo=600, cerimonialista=980, garcom=1240)
await page.goto(`${BASE}/${SLUG}/jogo/mapa?start=grande-dia&px=640&py=430`, { waitUntil: "load", timeout: 60000 });
await page.waitForTimeout(9000); // Phaser + atlas + cena
await page.screenshot({ path: `${OUT}\\p-prod-04-grandedia-npcs-427.png` });
console.log("[shot] p-prod-04-grandedia-npcs-427.png");

// Anda para a direita um pouco para revelar cerimonialista/garçom
try {
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(2600);
  await page.keyboard.up("ArrowRight");
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}\\p-prod-05-grandedia-direita-427.png` });
  console.log("[shot] p-prod-05-grandedia-direita-427.png");
} catch (e) { console.log("[walk] " + e.message); }

if (logs.length) console.log("ERROS DE PÁGINA:\n" + logs.join("\n"));
else console.log("[ok] sem erros de página");
await browser.close();
