/**
 * Full-flow E2E — caminho feliz completo do sistema.
 *
 * Estrutura:
 *   Suite A) Fluxo do convidado (sem auth admin)
 *   Suite B) Fluxo do casal/admin (requer credenciais de teste)
 *
 * Pré-requisitos para Suite B:
 *   TEST_ADMIN_EMAIL e TEST_ADMIN_PASSWORD devem existir no ambiente.
 *   TEST_SLUG e TEST_PUBLIC_TOKEN devem apontar para um evento existente.
 *
 * Localmente sem variáveis de ambiente, Suite B usa credenciais do seed:
 *   pnpm seed:dev antes de rodar.
 */
import { test, expect, type Page, type BrowserContext } from "@playwright/test";

const SLUG = process.env.TEST_SLUG ?? "casamento-exemplo";
const PUBLIC_TOKEN = process.env.TEST_PUBLIC_TOKEN ?? "dev-public-token-k";
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? "";
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? "";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function loginAdmin(page: Page): Promise<boolean> {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) return false;
  await page.goto("/login");
  await page.getByRole("tab", { name: "Entrar" }).click();
  await page.getByLabel(/e-mail/i).first().fill(ADMIN_EMAIL);
  await page.getByLabel(/senha/i).first().fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: /entrar/i }).click();
  await page.waitForURL(/\/admin/, { timeout: 10_000 }).catch(() => {});
  return page.url().includes("/admin");
}

// ─── Suite A: Fluxo do Convidado ──────────────────────────────────────────────

test.describe("Fluxo do convidado — caminho feliz", () => {
  let context: BrowserContext;
  let page: Page;
  let guestEmail: string;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    guestEmail = `e2e-guest-${Date.now()}@test.local`;
  });

  test.afterAll(async () => {
    await context.close();
  });

  // ── A.1 Landing page ──────────────────────────────────────────────────────

  test("A.1 — landing page do evento carrega", async () => {
    await page.goto(`/${SLUG}?k=${PUBLIC_TOKEN}`);
    await expect(page).toHaveTitle(/.+/);
    await expect(page.locator("body")).not.toBeEmpty();
    // Hero com nome do casal
    const heading = page.getByRole("heading").first();
    await expect(heading).toBeVisible();
    // Botão de RSVP ou banner de confirmado
    const rsvpBtn = page.getByRole("link", { name: /confirmar presença/i });
    const confirmedBanner = page.getByText(/presença confirmada/i);
    const visible = await rsvpBtn.isVisible().catch(() => false);
    const confirmed = await confirmedBanner.isVisible().catch(() => false);
    expect(visible || confirmed, "Deve mostrar CTA de RSVP ou banner de confirmação").toBe(true);
  });

  // ── A.2 RSVP ─────────────────────────────────────────────────────────────

  test("A.2 — página de RSVP carrega com formulário", async () => {
    await page.goto(`/${SLUG}/rsvp?k=${PUBLIC_TOKEN}`);
    await expect(page.locator("form")).toBeVisible();
    await expect(page.getByLabel(/nome completo/i)).toBeVisible();
    await expect(page.getByLabel(/e-mail/i)).toBeVisible();
  });

  test("A.3 — submissão de RSVP com presença confirmada", async () => {
    await page.goto(`/${SLUG}/rsvp?k=${PUBLIC_TOKEN}`);

    // Garante que botão "Vou" está ativo
    const goingBtn = page.getByRole("button", { name: /vou ao casamento/i });
    if (await goingBtn.isVisible()) await goingBtn.click();

    await page.getByLabel(/nome completo/i).fill("E2E Tester Automatico");
    await page.getByLabel(/e-mail/i).fill(guestEmail);

    // Aceita termos (required)
    const termsCheckbox = page.getByRole("checkbox").first();
    if (await termsCheckbox.isVisible()) await termsCheckbox.check();

    const submitBtn = page.getByRole("button", { name: /confirmar presença|enviar resposta/i });
    await submitBtn.click();

    // Aguarda redirect para sucesso ou mensagem de erro reconhecida
    await page.waitForURL(/rsvp\/sucesso|rsvp/, { timeout: 15_000 });
    const url = page.url();

    if (url.includes("sucesso")) {
      await expect(page.getByText(/presença confirmada|recebemos sua resposta/i)).toBeVisible();
    } else {
      // Email duplicado (já cadastrado) → mensagem de recovery é aceitável
      const errText = await page.getByText(/link.*acesso|já está na nossa lista|muitas tentativas/i).isVisible();
      expect(errText, `RSVP falhou e não foi por email duplicado. URL: ${url}`).toBe(true);
    }
  });

  // ── A.4 Páginas públicas com guest session ────────────────────────────────

  test("A.4 — página de galeria do casal carrega", async () => {
    await page.goto(`/${SLUG}/galeria?k=${PUBLIC_TOKEN}`);
    await expect(page.locator("h1")).toContainText(/galeria/i);
  });

  test("A.5 — página de história do casal carrega", async () => {
    await page.goto(`/${SLUG}/historia?k=${PUBLIC_TOKEN}`);
    await expect(page.locator("h1")).toContainText(/história/i);
  });

  test("A.6 — página de mural carrega", async () => {
    await page.goto(`/${SLUG}/mural?k=${PUBLIC_TOKEN}`);
    await expect(page.locator("body")).not.toBeEmpty();
    // Deve mostrar grid de fotos ou estado vazio
    const hasContent = await page.locator("main").isVisible();
    expect(hasContent).toBe(true);
  });

  test("A.7 — página de chat carrega", async () => {
    await page.goto(`/${SLUG}/chat?k=${PUBLIC_TOKEN}`);
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("A.8 — página de playlist carrega", async () => {
    await page.goto(`/${SLUG}/playlist?k=${PUBLIC_TOKEN}`);
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("A.9 — página de locais carrega", async () => {
    await page.goto(`/${SLUG}/locais?k=${PUBLIC_TOKEN}`);
    await expect(page.locator("h1")).toBeVisible();
  });

  test("A.10 — página de presentes carrega", async () => {
    await page.goto(`/${SLUG}/presentes?k=${PUBLIC_TOKEN}`);
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("A.11 — página de gincana carrega", async () => {
    await page.goto(`/${SLUG}/gincana?k=${PUBLIC_TOKEN}`);
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("A.12 — página de roteiro carrega", async () => {
    await page.goto(`/${SLUG}/roteiro?k=${PUBLIC_TOKEN}`);
    await expect(page.locator("body")).not.toBeEmpty();
  });
});

// ─── Suite B: Fluxo do Admin ──────────────────────────────────────────────────

test.describe("Fluxo do admin — caminho feliz", () => {
  let page: Page;
  let context: BrowserContext;
  let isLoggedIn = false;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    isLoggedIn = await loginAdmin(page);
    if (!isLoggedIn) {
      console.warn(
        "⚠️  Suite B pulada — TEST_ADMIN_EMAIL/TEST_ADMIN_PASSWORD não configurados.\n" +
        "   Configure as env vars para rodar os testes de admin."
      );
    }
  });

  test.afterAll(async () => {
    await context.close();
  });

  // ── B.1 Dashboard ─────────────────────────────────────────────────────────

  test("B.1 — /admin carrega após login", async () => {
    test.skip(!isLoggedIn, "Credenciais de admin não configuradas");
    await page.goto("/admin");
    await expect(page.locator("body")).not.toBeEmpty();
    // Não deve redirecionar para /login
    expect(page.url()).not.toContain("/login");
  });

  test("B.2 — lista de eventos carrega", async () => {
    test.skip(!isLoggedIn, "Credenciais de admin não configuradas");
    await page.goto("/admin/eventos");
    await expect(page.locator("body")).not.toBeEmpty();
  });

  // ── B.3 Páginas de evento (requer TEST_EVENT_ID) ──────────────────────────

  const EVENT_ID = process.env.TEST_EVENT_ID ?? "";

  test("B.3 — dashboard do evento carrega", async () => {
    test.skip(!isLoggedIn || !EVENT_ID, "Requer TEST_EVENT_ID");
    await page.goto(`/admin/eventos/${EVENT_ID}`);
    await expect(page.locator("body")).not.toBeEmpty();
    expect(page.url()).not.toContain("/login");
  });

  test("B.4 — página de convidados carrega", async () => {
    test.skip(!isLoggedIn || !EVENT_ID, "Requer TEST_EVENT_ID");
    await page.goto(`/admin/eventos/${EVENT_ID}/convidados`);
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("B.5 — moderação centralizada carrega com abas", async () => {
    test.skip(!isLoggedIn || !EVENT_ID, "Requer TEST_EVENT_ID");
    await page.goto(`/admin/eventos/${EVENT_ID}/moderacao`);
    await expect(page.getByRole("tab", { name: /denúncias/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /mural/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /playlist/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /banidos/i })).toBeVisible();
  });

  test("B.6 — analytics carrega com KPIs", async () => {
    test.skip(!isLoggedIn || !EVENT_ID, "Requer TEST_EVENT_ID");
    await page.goto(`/admin/eventos/${EVENT_ID}/analytics`);
    await expect(page.getByText(/confirmados/i)).toBeVisible();
    await expect(page.getByText(/dias para o evento/i)).toBeVisible();
  });

  test("B.7 — galeria admin carrega", async () => {
    test.skip(!isLoggedIn || !EVENT_ID, "Requer TEST_EVENT_ID");
    await page.goto(`/admin/eventos/${EVENT_ID}/galeria`);
    await expect(page.getByText(/galeria do casal/i)).toBeVisible();
  });

  test("B.8 — história admin carrega", async () => {
    test.skip(!isLoggedIn || !EVENT_ID, "Requer TEST_EVENT_ID");
    await page.goto(`/admin/eventos/${EVENT_ID}/historia`);
    await expect(page.getByText(/nossa história/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /adicionar momento/i })).toBeVisible();
  });

  test("B.9 — exportar CSV de convidados retorna arquivo", async () => {
    test.skip(!isLoggedIn || !EVENT_ID, "Requer TEST_EVENT_ID");
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.goto(`/api/admin/eventos/${EVENT_ID}/convidados/export`),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.csv$/i);
  });

  test("B.10 — notificacoes carrega", async () => {
    test.skip(!isLoggedIn || !EVENT_ID, "Requer TEST_EVENT_ID");
    await page.goto(`/admin/eventos/${EVENT_ID}/notificacoes`);
    await expect(page.getByText(/notificações|lembretes/i)).toBeVisible();
  });
});

// ─── Suite C: Guards de segurança ────────────────────────────────────────────

test.describe("Guards de segurança", () => {
  test("C.1 — /admin sem sessão → redireciona para /login", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
  });

  test("C.2 — PWA manifest.json acessível", async ({ request }) => {
    const res = await request.get("/manifest.json");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.icons).toBeDefined();
    expect(body.icons.length).toBeGreaterThan(0);
  });

  test("C.3 — ícone PWA 192px acessível (não 404)", async ({ request }) => {
    const res = await request.get("/icons/icon-192.png");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("image");
  });

  test("C.4 — ícone PWA 512px acessível (não 404)", async ({ request }) => {
    const res = await request.get("/icons/icon-512.png");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("image");
  });

  test("C.5 — apple-touch-icon acessível", async ({ request }) => {
    const res = await request.get("/icons/apple-touch-icon.png");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("image");
  });

  test("C.6 — API health retorna status", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(["ok", "degraded"]).toContain(body.status);
  });

  test("C.7 — /verify-email sem sessão → redireciona para /login", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/verify-email");
    await expect(page).toHaveURL(/\/login/);
  });

  test("C.8 — /verify-email não tem botão de bypass (segurança)", async ({ page }) => {
    // Testa que o botão de acesso sem verificar foi removido
    await page.goto("/verify-email");
    // Se redirecionar para login, está correto (não há sessão)
    if (page.url().includes("/login")) return;
    const bypassBtn = page.getByText(/acessar.*painel.*sem confirmar|pular verificação|acessar sem confirmar/i);
    await expect(bypassBtn).not.toBeVisible();
  });
});

// ─── Suite D: Navegação pública crítica ──────────────────────────────────────

test.describe("Navegação pública — sem erros 404", () => {
  const publicRoutes = [
    "/login",
    "/forgot-password",
    "/termos",
    "/privacidade",
  ];

  for (const route of publicRoutes) {
    test(`D — ${route} retorna 200`, async ({ page }) => {
      await page.goto(route);
      await expect(page.locator("body")).not.toBeEmpty();
      // Verifica que não há mensagem de "página não encontrada" genérica
      const is404 = await page.getByText(/404|page not found/i).isVisible().catch(() => false);
      expect(is404, `Página ${route} retornou 404`).toBe(false);
    });
  }
});
