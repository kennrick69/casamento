import { test, expect } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

test.describe("QA Dashboard", () => {
  test.skip(!process.env.TEST_ADMIN_EMAIL, "Requires TEST_ADMIN_EMAIL");

  test("admin can access /admin/qa", async ({ page }) => {
    await page.goto(`${BASE}/admin/qa`);
    await expect(page.getByRole("heading", { name: "QA Dashboard" })).toBeVisible({ timeout: 10_000 });
  });

  test("create new run redirects to execution page", async ({ page }) => {
    await page.goto(`${BASE}/admin/qa`);
    const titleInput = page.getByPlaceholder(/QA/i);
    await titleInput.fill("Teste automatizado E2E");
    await page.getByRole("button", { name: "Nova execução" }).click();
    await expect(page).toHaveURL(/\/admin\/qa\/.+/, { timeout: 10_000 });
    await expect(page.getByText("Teste automatizado E2E")).toBeVisible();
  });

  test("mark item as OK", async ({ page }) => {
    await page.goto(`${BASE}/admin/qa`);
    await page.getByRole("button", { name: "Nova execução" }).click();
    await page.waitForURL(/\/admin\/qa\/.+/);

    const okButton = page.getByRole("button", { name: "✅ OK" }).first();
    await okButton.click();
    await expect(okButton).toHaveClass(/bg-green-100/, { timeout: 3_000 });
  });

  test("mark item as Bug and add note", async ({ page }) => {
    await page.goto(`${BASE}/admin/qa`);
    await page.getByRole("button", { name: "Nova execução" }).click();
    await page.waitForURL(/\/admin\/qa\/.+/);

    const bugButton = page.getByRole("button", { name: "⚠️ Bug" }).first();
    await bugButton.click();
    await expect(bugButton).toHaveClass(/bg-red-100/, { timeout: 3_000 });

    const noteArea = page.getByPlaceholder(/Descreva o bug/).first();
    await noteArea.fill("Botão não responde no mobile Safari");
    await expect(noteArea).toHaveValue("Botão não responde no mobile Safari");
  });

  test("finalize run disables buttons", async ({ page }) => {
    await page.goto(`${BASE}/admin/qa`);
    await page.getByRole("button", { name: "Nova execução" }).click();
    await page.waitForURL(/\/admin\/qa\/.+/);

    await page.getByRole("button", { name: "Finalizar execução" }).click();
    await expect(page.getByRole("button", { name: "Finalizar execução" })).toBeDisabled({ timeout: 5_000 });
  });

  test("view report page", async ({ page }) => {
    await page.goto(`${BASE}/admin/qa`);
    await page.getByRole("button", { name: "Nova execução" }).click();
    await page.waitForURL(/\/admin\/qa\/.+/);

    await page.getByRole("link", { name: "Gerar relatório" }).click();
    await expect(page).toHaveURL(/\/admin\/qa\/.+\/relatorio/, { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: "Relatório" })).toBeVisible();
    await expect(page.getByText("Total de itens:")).toBeVisible();
  });
});
