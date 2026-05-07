/**
 * Visual regression tests — captura screenshots e compara com baseline.
 * Primeira execução cria o baseline. Execuções seguintes comparam.
 */
import { test, expect } from "@playwright/test";

const SLUG = process.env.TEST_SLUG ?? "casamento-exemplo";
const PUBLIC_TOKEN = process.env.TEST_PUBLIC_TOKEN ?? "dev-public-token-k";

test.describe("Visual: mobile (390×844)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("landing page — mobile", async ({ page }) => {
    await page.goto(`/${SLUG}?k=${PUBLIC_TOKEN}`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("landing-mobile.png", {
      fullPage: false,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("RSVP form — mobile", async ({ page }) => {
    await page.goto(`/${SLUG}/rsvp`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("rsvp-mobile.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });
});

test.describe("Visual: desktop (1280×800)", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("landing page — desktop", async ({ page }) => {
    await page.goto(`/${SLUG}?k=${PUBLIC_TOKEN}`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("landing-desktop.png", {
      fullPage: false,
      maxDiffPixelRatio: 0.02,
    });
  });
});
