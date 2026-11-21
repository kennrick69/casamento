// Mede o tempo de carregamento do jogo (/jogo/mapa) no celular com 4G simulado.
// Uso: cmd.exe /c "cd /d G:\Projetos\casamento && node scripts\game\perf.mjs [porta]"
// Throttle via CDP (Chrome). Perfil 4G: ~4 Mbps down, 3 Mbps up, 100ms RTT.
import { chromium } from "playwright";

const PORT = process.argv[2] || "3000";
const URL = `http://localhost:${PORT}/demo/jogo/mapa`;
const RUNS = 3;

const browser = await chromium.launch({ channel: "chrome" });
const results = [];
for (let i = 0; i < RUNS; i++) {
  const ctx = await browser.newContext({
    deviceScaleFactor: 2, hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 },
  });
  await ctx.addCookies([{ name: "guest_token", value: "demo-session-amanda-12", url: `http://localhost:${PORT}` }]);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    downloadThroughput: Math.floor((4 * 1024 * 1024) / 8),
    uploadThroughput: Math.floor((3 * 1024 * 1024) / 8),
    latency: 100,
  });
  let bytes = 0;
  let tLastGameAsset = 0; // ms até o último asset do jogo (phaser+mapa+atlas) chegar
  const isGameAsset = (u) => /\/game\/vendor\/phaser|\/game\/mapas\/mundi|\/jogo\/personagem\/sheet/.test(u);
  let t0 = 0;
  page.on("response", async (r) => {
    try {
      const b = (await r.body()).length; bytes += b;
      if (t0 && isGameAsset(r.url())) tLastGameAsset = Date.now() - t0;
    } catch {}
  });

  t0 = Date.now();
  await page.goto(URL, { waitUntil: "load", timeout: 120000 });
  const tLoad = Date.now() - t0;
  await page.waitForSelector("canvas", { timeout: 60000 }).catch(() => {});
  // settle curto para capturar o último asset do jogo
  await page.waitForTimeout(3000);
  results.push({ tLoad, tGame: tLastGameAsset, mb: +(bytes / 1048576).toFixed(2) });
  console.log(`run ${i + 1}: load=${tLoad}ms  jogável(último asset do jogo)=${tLastGameAsset}ms  ~${(bytes / 1048576).toFixed(2)}MB`);
  await ctx.close();
}
const med = (k) => results.map((r) => r[k]).sort((a, b) => a - b)[Math.floor(RUNS / 2)];
console.log(`MEDIANA: load=${med("tLoad")}ms  jogável=${med("tGame")}ms  transfer=${med("mb")}MB`);
await browser.close();
