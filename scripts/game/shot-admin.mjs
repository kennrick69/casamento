// Screenshot de páginas ADMIN (logado). WSL não alcança o localhost do dev-server
// (Windows); este script roda com o node do Windows, loga como organizador demo
// e screenshota as URLs passadas. Uso (do WSL):
//   cmd.exe /c "cd /d G:\Projetos\casamento && node scripts\game\shot-admin.mjs G:\.cache\admin-shots.json"
// JSON: [{ "url": "...", "out": "G:\\...png", "w":1280, "h":900, "wait":2500, "full":true }]
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const EMAIL = process.env.ADMIN_EMAIL || "demo@joseeleticia.com";
const PASS = process.env.ADMIN_PASS || "demo123";
const shots = JSON.parse(readFileSync(process.argv[2], "utf8"));

const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ deviceScaleFactor: 1 });
const page = await ctx.newPage();

// login (server action -> seta cookie de sessão no contexto)
await page.goto("http://localhost:3000/login", { waitUntil: "load", timeout: 60000 });
await page.fill("#login-email", EMAIL);
await page.fill("#login-password", PASS);
await Promise.all([
  page.waitForURL("**/admin**", { timeout: 30000 }).catch(() => {}),
  page.locator('button[type="submit"]').first().click(),
]);
await page.waitForTimeout(2500);
const loggedUrl = page.url();
console.log("pos-login:", loggedUrl);
if (!loggedUrl.includes("/admin")) console.log("[AVISO] nao chegou em /admin — login pode ter falhado");

for (const s of shots) {
  const p = await ctx.newPage();
  await p.setViewportSize({ width: s.w ?? 1280, height: s.h ?? 900 });
  const errs = [];
  p.on("pageerror", (e) => errs.push("PAGEERROR " + e.message));
  try {
    await p.goto(s.url, { waitUntil: "networkidle", timeout: 60000 });
  } catch (e) {
    console.log("goto-warn", s.url, e.message);
  }
  await p.waitForTimeout(s.wait ?? 2500);
  await p.screenshot({ path: s.out, fullPage: !!s.full });
  console.log("shot", s.out, "ok", errs.length ? "ERRS:" + errs.join(" | ") : "");
  await p.close();
}
await browser.close();
