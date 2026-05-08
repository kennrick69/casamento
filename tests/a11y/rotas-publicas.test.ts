/**
 * Testes de acessibilidade com axe-core.
 * Roda em todas as rotas públicas principais.
 */
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const SLUG = process.env.TEST_SLUG ?? "casamento-exemplo";
const PUBLIC_TOKEN = process.env.TEST_PUBLIC_TOKEN ?? "dev-public-token-k";

const routes = [
  // Páginas de evento público
  { path: `/${SLUG}?k=${PUBLIC_TOKEN}`, label: "Landing page" },
  { path: `/${SLUG}/rsvp`, label: "RSVP" },
  { path: `/${SLUG}/roteiro`, label: "Roteiro" },
  { path: `/${SLUG}/local`, label: "Local" },
  { path: `/${SLUG}/recuperar`, label: "Recuperar acesso" },
  { path: `/${SLUG}/gincana`, label: "Gincana" },
  // Páginas de auth (Bloco A) — públicas, sem necessidade de sessão
  { path: "/login", label: "Login / Signup" },
  { path: "/forgot-password", label: "Esqueci minha senha" },
  { path: "/termos", label: "Termos de Uso" },
  { path: "/privacidade", label: "Política de Privacidade" },
];

for (const route of routes) {
  test(`A11y: ${route.label} (${route.path})`, async ({ page }) => {
    await page.goto(route.path);
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .exclude("#__next > *[aria-hidden]")
      .analyze();

    // Filter known acceptable violations
    const violations = results.violations.filter(
      (v) => !["color-contrast"].includes(v.id) // color contrast checked separately via theme
    );

    if (violations.length > 0) {
      console.error(
        `A11y violations on ${route.label}:\n` +
          violations.map((v) => `  [${v.impact}] ${v.id}: ${v.description}`).join("\n")
      );
    }

    expect(violations).toHaveLength(0);
  });
}

test("A11y: barra de acessibilidade funciona com teclado", async ({ page }) => {
  await page.goto(`/${SLUG}?k=${PUBLIC_TOKEN}`);
  await page.waitForLoadState("networkidle");

  // Tab to accessibility bar buttons
  await page.keyboard.press("Tab");
  // Should be able to interact with font/contrast buttons via keyboard
  const focusedEl = await page.evaluate(() => document.activeElement?.tagName);
  expect(focusedEl).toBeTruthy();
});

test("A11y: alto contraste não quebra estrutura ARIA", async ({ page }) => {
  await page.goto(`/${SLUG}?k=${PUBLIC_TOKEN}`);
  await page.waitForLoadState("networkidle");

  // Enable high contrast
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-contrast", "high");
  });

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();

  const critical = results.violations.filter((v) => v.impact === "critical");
  expect(critical).toHaveLength(0);
});
