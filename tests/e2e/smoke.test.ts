/**
 * Smoke tests — verifica que rotas críticas respondem 200 e renderizam conteúdo básico.
 * Roda contra o servidor local (dev) ou Railway (via PLAYWRIGHT_BASE_URL).
 *
 * Testes que dependem de um evento existente no banco são pulados automaticamente
 * quando o evento não existe (ex: ambiente fresh sem dados de seed).
 */
import { test, expect, type APIRequestContext } from "@playwright/test";

const SLUG = process.env.TEST_SLUG ?? "joseeleticia";
const PUBLIC_TOKEN = process.env.TEST_PUBLIC_TOKEN ?? "dev-public-token-k";

let _eventExists: boolean | null = null;

async function eventExists(request: APIRequestContext): Promise<boolean> {
  if (_eventExists !== null) return _eventExists;
  const res = await request.get(`/api/qr/${SLUG}`);
  _eventExists = res.status() === 200;
  if (!_eventExists) {
    console.warn(`⚠️  Evento '${SLUG}' não encontrado — testes que dependem de dados reais serão pulados`);
  }
  return _eventExists;
}

test.describe("Rotas públicas — smoke", () => {
  test("landing page carrega", async ({ page }) => {
    await page.goto(`/${SLUG}?k=${PUBLIC_TOKEN}`);
    await expect(page).toHaveTitle(/.+/);
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("página de RSVP carrega", async ({ page, request }) => {
    if (!await eventExists(request)) {
      test.skip(true, `Evento '${SLUG}' não existe no banco`);
      return;
    }
    await page.goto(`/${SLUG}/rsvp?k=${PUBLIC_TOKEN}`);
    await expect(page.locator("form")).toBeVisible();
  });

  test("página de roteiro carrega", async ({ page }) => {
    await page.goto(`/${SLUG}/roteiro`);
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("página de local carrega", async ({ page }) => {
    await page.goto(`/${SLUG}/local`);
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("página de recuperação carrega", async ({ page, request }) => {
    if (!await eventExists(request)) {
      test.skip(true, `Evento '${SLUG}' não existe no banco`);
      return;
    }
    await page.goto(`/${SLUG}/recuperar`);
    await expect(page.locator("form")).toBeVisible();
  });

  test("API health check retorna 200", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(["ok", "degraded"]).toContain(body.status);
    expect(body.db).toBeDefined();
    expect(body.timestamp).toBeDefined();
  });

  test("QR code PNG é gerado", async ({ request }) => {
    if (!await eventExists(request)) {
      test.skip(true, `Evento '${SLUG}' não existe no banco`);
      return;
    }
    const response = await request.get(`/api/qr/${SLUG}`);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/png");
  });
});

test.describe("Rotas de evento — mobile viewport", () => {
  test.use({ viewport: { width: 390, height: 844 } }); // iPhone 14

  test("bottom nav está visível no mobile", async ({ page, request }) => {
    if (!await eventExists(request)) {
      test.skip(true, `Evento '${SLUG}' não existe no banco`);
      return;
    }
    await page.goto(`/${SLUG}?k=${PUBLIC_TOKEN}`);
    await expect(page.locator("nav")).toBeVisible();
  });

  test("RSVP form é usável em 390px", async ({ page, request }) => {
    if (!await eventExists(request)) {
      test.skip(true, `Evento '${SLUG}' não existe no banco`);
      return;
    }
    await page.goto(`/${SLUG}/rsvp?k=${PUBLIC_TOKEN}`);
    const form = page.locator("form").first();
    await expect(form).toBeVisible();
    const box = await form.boundingBox();
    if (box) expect(box.width).toBeLessThanOrEqual(390);
  });
});

test.describe("Rotas de evento — tela pequena (320px)", () => {
  test.use({ viewport: { width: 320, height: 568 } }); // iPhone SE

  test("landing page não quebra em 320px", async ({ page }) => {
    await page.goto(`/${SLUG}?k=${PUBLIC_TOKEN}`);
    await expect(page.locator("body")).not.toBeEmpty();
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1); // 1px tolerance
  });
});

test.describe("Rotas admin — auth guard", () => {
  test("admin redireciona para login sem sessão", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/login/);
  });
});

test.describe("Páginas de erro", () => {
  test("slug inválido renderiza 404", async ({ page }) => {
    await page.goto("/slug-que-nao-existe-jamais-xyz");
    await expect(page.locator("body")).not.toBeEmpty();
    expect(await page.title()).toBeTruthy();
  });
});
