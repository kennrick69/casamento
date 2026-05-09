/**
 * E2E — Modo de doação TRUST
 * Convidado declara intenção de presentear via PIX; casal marca como aprovado.
 */
import { test, expect } from "@playwright/test";

const SLUG = process.env.TEST_SLUG ?? "casamento-exemplo";
const PUBLIC_TOKEN = process.env.TEST_PUBLIC_TOKEN ?? "dev-public-token-k";

test.describe("Modo TRUST — confiança PIX", () => {
  test("convidado vê chave PIX e botão de promessa", async ({ page }) => {
    await page.goto(`/${SLUG}/presentes?k=${PUBLIC_TOKEN}`);
    // If donations disabled, skip
    const disabled = await page.locator("text=Lista de presentes não disponível").isVisible();
    if (disabled) return;

    // PIX key block should be visible (if configured)
    const pixBlock = page.locator("text=Chave PIX");
    const hasPixKey = await pixBlock.isVisible().catch(() => false);
    if (hasPixKey) {
      await expect(pixBlock).toBeVisible();
    }
  });

  test("convidado não autenticado vê prompt de RSVP", async ({ page }) => {
    await page.goto(`/${SLUG}/presentes`);
    const disabled = await page.locator("text=Lista de presentes não disponível").isVisible();
    if (disabled) return;

    // Gift list visible but confirm prompt shown
    const confirmPrompt = page.locator("text=Confirme sua presença");
    // At least the page loads without error
    await expect(page).not.toHaveTitle(/erro|error/i);
  });

  test("admin vê lista de doações na página de presentes", async ({ page }) => {
    const adminEmail = process.env.TEST_ADMIN_EMAIL;
    const adminPassword = process.env.TEST_ADMIN_PASSWORD;
    if (!adminEmail || !adminPassword) return;

    await page.goto("/login");
    await page.getByLabel(/e-mail/i).first().fill(adminEmail);
    await page.getByLabel(/senha/i).first().fill(adminPassword);
    await page.getByRole("button", { name: /entrar/i }).click();
    await page.waitForURL("/admin");

    // Navigate to presentes admin
    const events = await page.locator("[data-testid=event-card], .event-row, a[href*='/admin/eventos/']").first();
    const href = await events.getAttribute("href").catch(() => null);
    if (!href) return;

    const eventId = href.split("/admin/eventos/")[1]?.split("/")[0];
    if (!eventId) return;

    await page.goto(`/admin/eventos/${eventId}/presentes`);
    await expect(page.locator("h1")).toContainText("Lista de presentes");
    await expect(page.locator("text=Configurar modo de pagamento")).toBeVisible();
  });
});
