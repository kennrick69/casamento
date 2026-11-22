// Smoke de PRODUÇÃO (S4) — captura telas no celular 427 em https://joseeleticia.com.
// Zero resíduo: abertura e "Tenho um código" são páginas públicas, sem login.
// Uso (do WSL):
//   cmd.exe /c "cd /d G:\Projetos\casamento && node scripts\game\smoke-prod.mjs"
import { chromium } from "playwright";

const BASE = process.env.SMOKE_BASE || "https://joseeleticia.com";
const SLUG = process.env.SMOKE_SLUG || "joseeleticia";
const OUT = "G:\\Projetos\\casamento\\docs\\screens-jogo";
const W = 427, H = 920;

const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ deviceScaleFactor: 2, hasTouch: true, isMobile: true, viewport: { width: W, height: H } });
const page = await ctx.newPage();
const logs = [];
page.on("pageerror", (e) => logs.push("PAGEERROR " + e.message));

async function shot(name) {
  await page.screenshot({ path: `${OUT}\\${name}` });
  console.log("[shot] " + name);
}

// 1) Abertura
await page.goto(`${BASE}/${SLUG}`, { waitUntil: "load", timeout: 60000 });
await page.waitForTimeout(3500);
const hasCode = await page.getByText("Tenho um código").count();
const hasScan = await page.getByText("Escanear").count();
const hasPrint = await page.getByText("Convite impresso").count();
console.log(`[abertura] 'Tenho um código'=${hasCode} 'Escanear'=${hasScan} 'Convite impresso'=${hasPrint}`);
await shot("p-prod-01-abertura-427.png");

// 2) "Tenho um código" — abre o campo e digita minúsculo + espaço
try {
  await page.getByText("Tenho um código").first().click();
  await page.waitForTimeout(800);
  // o input de código
  const input = page.locator('input[autocapitalize="characters"], input[type="text"]').first();
  await input.click();
  await input.fill("44hu v9nt");
  await page.waitForTimeout(600);
  const val = await input.inputValue();
  console.log(`[codigo] digitei '44hu v9nt' -> campo mostra '${val}'`);
  await shot("p-prod-02-codigo-digitado-427.png");
  // submete para ver o tratamento gracioso (código inexistente)
  await page.keyboard.press("Enter");
  await page.waitForTimeout(2500);
  await shot("p-prod-03-codigo-resultado-427.png");
  const bodyTxt = (await page.locator("body").innerText()).slice(0, 400).replace(/\n+/g, " | ");
  console.log(`[codigo] após enter: ${bodyTxt}`);
} catch (e) {
  console.log("[codigo] erro: " + e.message);
}

if (logs.length) console.log("ERROS DE PÁGINA:\n" + logs.join("\n"));
else console.log("[ok] sem erros de página");
await browser.close();
