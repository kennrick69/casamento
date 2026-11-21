// Regressão do Modo Gamificado (dev). Dirige o fluxo REAL de um visitante novo
// (sem cookie): entrar -> criar personagem -> salvar -> mapa -> 3 fases -> missões.
// Coleta erros de console/página/HTTP e screenshota os marcos. Roda no Windows:
//   cmd.exe /c "cd /d G:\Projetos\casamento && node scripts\game\regression.mjs <390|1280>"
import { chromium } from "playwright";

const W = Number(process.argv[2]) === 390 ? 390 : 1280;
const H = W === 390 ? 844 : 800;
const ORG = process.argv[3] === "org"; // loga como organizador antes (test mode)
const BASE = "http://localhost:3000";
const OUT = "G:\\Projetos\\casamento\\docs\\screens-jogo";
const tag = ORG ? `org${W}` : `v${W}`;
const errors = [];

const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({
  deviceScaleFactor: 1,
  viewport: { width: W, height: H },
  hasTouch: W === 390,
  isMobile: W === 390,
});
const page = await ctx.newPage();
const IGNORE = [/eval\(\) is not supported/i, /Content-Security-Policy/i, /Download the React DevTools/i];
function watch(p) {
  p.on("console", (m) => {
    if (m.type() === "error" && !IGNORE.some((r) => r.test(m.text()))) errors.push(`[console] ${m.text()}`);
  });
  p.on("pageerror", (e) => errors.push(`[pageerror] ${e.message}`));
  p.on("response", (r) => { if (r.status() >= 500) errors.push(`[http ${r.status()}] ${r.url()}`); });
}
watch(page);
const shot = async (name) => { await page.screenshot({ path: `${OUT}\\reg-${tag}-${name}.png` }); };
const wait = (ms) => page.waitForTimeout(ms);

try {
  // 0) Organizador: loga no admin antes (isEventOrganizer=true -> tudo liberado)
  if (ORG) {
    await page.goto(`${BASE}/login`, { waitUntil: "load", timeout: 60000 });
    await page.fill("#login-email", "demo@joseeleticia.com");
    await page.fill("#login-password", "demo123");
    await Promise.all([
      page.waitForURL("**/admin**", { timeout: 30000 }).catch(() => {}),
      page.locator('button[type="submit"]').first().click(),
    ]);
    await wait(2500);
    if (!page.url().includes("/admin")) errors.push("[org] login admin falhou");
  }

  // 1) Entrar como visitante
  await page.goto(`${BASE}/demo/jogo`, { waitUntil: "load", timeout: 60000 });
  await wait(1200);
  await page.fill('input[placeholder="Como quer ser chamado?"]', `Reg${W}`);
  await page.click('button:has-text("Entrar como visitante")');
  await wait(2500);
  await shot("01-entrou");

  // 2) Criar personagem + salvar (clica o link real da tela de identidade)
  await page.click('a:has-text("Editar meu personagem")');
  await page.waitForURL("**/personagem**", { timeout: 20000 }).catch(() => {});
  await wait(2000);
  await shot("02-criador");
  await page.click('button:has-text("Salvar personagem")', { timeout: 20000 });
  await wait(2500);
  await shot("03-salvo");

  // 3) Mapa-múndi
  await page.goto(`${BASE}/demo/jogo/mapa`, { waitUntil: "load", timeout: 60000 });
  await wait(7000);
  await shot("04-mapa");

  // 4) Fases + missões (px/py posiciona perto do objeto da missão; Enter interage)
  const steps = [
    ["vila", 695, 615, "05-vila"],
    ["bosque", 255, 600, "06-bosque"],
    ["grande-dia", 535, 455, "07-grande"],
  ];
  for (const [ph, px, py, name] of steps) {
    await page.goto(`${BASE}/demo/jogo/mapa?start=${ph}&px=${px}&py=${py}`, { waitUntil: "load", timeout: 60000 });
    await wait(6000);
    const canvas = await page.$("canvas");
    if (canvas) await canvas.click({ position: { x: 20, y: 20 } });
    await page.keyboard.press("Enter");
    await wait(1500);
    await shot(name);
    await page.keyboard.press("Escape");
    await wait(400);
  }

  // 5) Voltar ao mapa + sair
  await page.goto(`${BASE}/demo/jogo/mapa`, { waitUntil: "load", timeout: 60000 });
  await wait(5000);
  await shot("08-voltou");
} catch (e) {
  errors.push(`[fatal] ${e.message}`);
}

console.log(`=== REGRESSÃO ${W}px ===`);
console.log(errors.length ? errors.join("\n") : "SEM ERROS de console/página/HTTP");
await browser.close();
