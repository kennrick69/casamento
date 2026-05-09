/**
 * E2E — Modo de doação PIX_PROOF
 * Convidado declara que fez PIX; casal aprova ou rejeita.
 */
import { test, expect } from "@playwright/test";

const SLUG = process.env.TEST_SLUG ?? "casamento-exemplo";
const PUBLIC_TOKEN = process.env.TEST_PUBLIC_TOKEN ?? "dev-public-token-k";

test.describe("Modo PIX_PROOF — comprovante", () => {
  test("página de presentes carrega sem erro", async ({ page }) => {
    await page.goto(`/${SLUG}/presentes?k=${PUBLIC_TOKEN}`);
    await expect(page).not.toHaveTitle(/erro|error/i);
    await expect(page.locator("h1")).toContainText(/presentes/i);
  });

  test("admin: tela de configuração de pagamentos acessível", async ({ page }) => {
    const adminEmail = process.env.TEST_ADMIN_EMAIL;
    const adminPassword = process.env.TEST_ADMIN_PASSWORD;
    if (!adminEmail || !adminPassword) return;

    await page.goto("/login");
    await page.getByLabel(/e-mail/i).first().fill(adminEmail);
    await page.getByLabel(/senha/i).first().fill(adminPassword);
    await page.getByRole("button", { name: /entrar/i }).click();
    await page.waitForURL("/admin");

    const events = await page.locator("a[href*='/admin/eventos/']").first();
    const href = await events.getAttribute("href").catch(() => null);
    if (!href) return;

    const eventId = href.split("/admin/eventos/")[1]?.split("/")[0];
    if (!eventId) return;

    await page.goto(`/admin/eventos/${eventId}/configuracoes/pagamentos`);
    await expect(page.locator("h1")).toContainText(/pagamentos/i);
    await expect(page.locator("text=Confiança")).toBeVisible();
    await expect(page.locator("text=PIX + Comprovante")).toBeVisible();
    await expect(page.locator("text=Mercado Pago")).toBeVisible();
  });

  test("admin: seleção de modo PIX_PROOF funciona", async ({ page }) => {
    const adminEmail = process.env.TEST_ADMIN_EMAIL;
    const adminPassword = process.env.TEST_ADMIN_PASSWORD;
    if (!adminEmail || !adminPassword) return;

    await page.goto("/login");
    await page.getByLabel(/e-mail/i).first().fill(adminEmail);
    await page.getByLabel(/senha/i).first().fill(adminPassword);
    await page.getByRole("button", { name: /entrar/i }).click();
    await page.waitForURL("/admin");

    const events = await page.locator("a[href*='/admin/eventos/']").first();
    const href = await events.getAttribute("href").catch(() => null);
    if (!href) return;

    const eventId = href.split("/admin/eventos/")[1]?.split("/")[0];
    if (!eventId) return;

    await page.goto(`/admin/eventos/${eventId}/configuracoes/pagamentos`);

    // Select PIX_PROOF
    await page.locator("input[value='PIX_PROOF']").check();
    await expect(page.locator("text=Chave PIX")).toBeVisible();
  });
});
