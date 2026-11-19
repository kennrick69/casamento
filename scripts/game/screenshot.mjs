// Ferramenta de verificação visual do jogo (dev).
//
// O WSL não alcança o localhost do dev-server (que roda no Windows), mas o
// Chrome/Playwright do Windows alcança. Este script roda com o node do Windows,
// usa o Chrome do sistema (channel:"chrome", instância isolada — não mexe nas
// abas abertas) e seta o cookie de sessão de um convidado pra screenshotar as
// telas do jogo logado.
//
// Uso (a partir do WSL):
//   1) escreva um JSON com a lista de shots, ex. G:\.cache\shots.json:
//        [{ "url":"http://localhost:3000/demo/jogo/mapa",
//           "out":"G:\\Projetos\\casamento\\docs\\screens-jogo\\x.png",
//           "w":1280, "h":800, "wait":8000,
//           "hold":[{"key":"ArrowUp","ms":2000}],   // opcional: dirige o avatar
//           "tap":["Enter"],                          // opcional: tecla única
//           "clickText":"Créditos" }]                 // opcional: clica num texto
//   2) cmd.exe /c "cd /d G:\Projetos\casamento && node scripts\game\screenshot.mjs G:\.cache\shots.json"
//
// Cookie do convidado-câmera: env GUEST_TOKEN (default = seed do demo). O
// convidado precisa ter personagem (GameCharacter) e, pra fases travadas,
// progresso suficiente (coluna GameCharacter.gameProgress) — tudo só no voem-dev.
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const TOKEN = process.env.GUEST_TOKEN || "demo-session-amanda-12";
const COOKIE = { name: "guest_token", value: TOKEN, url: "http://localhost:3000" };
const shots = JSON.parse(readFileSync(process.argv[2], "utf8"));

const browser = await chromium.launch({ channel: "chrome" });
// Dois contextos: desktop (padrão) e toque (celular, hasTouch/isMobile → o jogo
// mostra o D-pad só nesse; ver item 13). Cada shot escolhe via "touch": true.
const ctxDesktop = await browser.newContext({ deviceScaleFactor: 1 });
const ctxTouch = await browser.newContext({ deviceScaleFactor: 2, hasTouch: true, isMobile: true });
await ctxDesktop.addCookies([COOKIE]);
await ctxTouch.addCookies([COOKIE]);

for (const s of shots) {
  const ctx = s.touch ? ctxTouch : ctxDesktop;
  const page = await ctx.newPage();
  await page.setViewportSize({ width: s.w ?? 1280, height: s.h ?? 800 });
  const errs = [];
  page.on("pageerror", (e) => errs.push("PAGEERROR " + e.message));
  try {
    await page.goto(s.url, { waitUntil: "load", timeout: 60000 });
  } catch (e) {
    console.log("goto-warn", s.url, e.message);
  }
  await page.waitForTimeout(s.wait ?? 5000);
  try {
    const canvas = await page.$("canvas");
    if (canvas) await canvas.click({ position: { x: 20, y: 20 } });
  } catch {}
  for (const h of s.hold ?? []) {
    await page.keyboard.down(h.key);
    await page.waitForTimeout(h.ms);
    await page.keyboard.up(h.key);
    await page.waitForTimeout(250);
  }
  for (const k of s.tap ?? []) {
    await page.keyboard.press(k);
    await page.waitForTimeout(400);
  }
  if (s.clickText) {
    try {
      await page.getByText(s.clickText, { exact: false }).first().click();
      await page.waitForTimeout(600);
    } catch (e) {
      console.log("click-warn", s.clickText, e.message);
    }
  }
  await page.screenshot({ path: s.out });
  console.log("shot", s.out, errs.length ? "ERR:" + errs.slice(0, 3).join(" | ") : "ok");
  await page.close();
}
await ctxDesktop.close();
await ctxTouch.close();
await browser.close();
