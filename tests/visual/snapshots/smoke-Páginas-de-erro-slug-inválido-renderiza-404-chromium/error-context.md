# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.test.ts >> Páginas de erro >> slug inválido renderiza 404
- Location: tests/e2e/smoke.test.ts:94:7

# Error details

```
Error: expect(received).toBeTruthy()

Received: ""
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e6] [cursor=pointer]:
    - button "Open Next.js Dev Tools" [ref=e7]:
      - img [ref=e8]
    - generic [ref=e11]:
      - button "Open issues overlay" [ref=e12]:
        - generic [ref=e13]:
          - generic [ref=e14]: "0"
          - generic [ref=e15]: "1"
        - generic [ref=e16]: Issue
      - button "Collapse issues badge" [ref=e17]:
        - img [ref=e18]
  - generic [ref=e20]:
    - paragraph [ref=e21]: 💍
    - heading "Página não encontrada" [level=1] [ref=e22]
    - paragraph [ref=e23]: Este link não existe ou o evento foi removido.
    - link "Voltar ao início" [ref=e24] [cursor=pointer]:
      - /url: /
  - region "Notifications alt+T"
  - alert [ref=e25]
```

# Test source

```ts
  1   | /**
  2   |  * Smoke tests — verifica que rotas críticas respondem 200 e renderizam conteúdo básico.
  3   |  * Roda contra o servidor local (dev) ou Railway (via PLAYWRIGHT_BASE_URL).
  4   |  */
  5   | import { test, expect } from "@playwright/test";
  6   | 
  7   | const SLUG = process.env.TEST_SLUG ?? "casamento-exemplo";
  8   | const PUBLIC_TOKEN = process.env.TEST_PUBLIC_TOKEN ?? "dev-public-token-k";
  9   | 
  10  | test.describe("Rotas públicas — smoke", () => {
  11  |   test("landing page carrega", async ({ page }) => {
  12  |     await page.goto(`/${SLUG}?k=${PUBLIC_TOKEN}`);
  13  |     await expect(page).toHaveTitle(/.+/);
  14  |     await expect(page.locator("body")).not.toBeEmpty();
  15  |   });
  16  | 
  17  |   test("página de RSVP carrega", async ({ page }) => {
  18  |     await page.goto(`/${SLUG}/rsvp`);
  19  |     await expect(page.locator("form")).toBeVisible();
  20  |   });
  21  | 
  22  |   test("página de roteiro carrega", async ({ page }) => {
  23  |     await page.goto(`/${SLUG}/roteiro`);
  24  |     await expect(page.locator("body")).not.toBeEmpty();
  25  |   });
  26  | 
  27  |   test("página de local carrega", async ({ page }) => {
  28  |     await page.goto(`/${SLUG}/local`);
  29  |     await expect(page.locator("body")).not.toBeEmpty();
  30  |   });
  31  | 
  32  |   test("página de recuperação carrega", async ({ page }) => {
  33  |     await page.goto(`/${SLUG}/recuperar`);
  34  |     await expect(page.locator("form")).toBeVisible();
  35  |   });
  36  | 
  37  |   test("API health check retorna 200", async ({ request }) => {
  38  |     const response = await request.get("/api/health");
  39  |     expect(response.status()).toBe(200);
  40  |     const body = await response.json();
  41  |     expect(["ok", "degraded"]).toContain(body.status);
  42  |     expect(body.db).toBeDefined();
  43  |     expect(body.timestamp).toBeDefined();
  44  |   });
  45  | 
  46  |   test("QR code PNG é gerado", async ({ request }) => {
  47  |     const response = await request.get(`/api/qr/${SLUG}`);
  48  |     expect(response.status()).toBe(200);
  49  |     expect(response.headers()["content-type"]).toContain("image/png");
  50  |   });
  51  | });
  52  | 
  53  | test.describe("Rotas de evento — mobile viewport", () => {
  54  |   test.use({ viewport: { width: 390, height: 844 } }); // iPhone 14
  55  | 
  56  |   test("bottom nav está visível no mobile", async ({ page }) => {
  57  |     await page.goto(`/${SLUG}?k=${PUBLIC_TOKEN}`);
  58  |     // Bottom nav exists as a fixed nav element
  59  |     await expect(page.locator("nav")).toBeVisible();
  60  |   });
  61  | 
  62  |   test("RSVP form é usável em 390px", async ({ page }) => {
  63  |     await page.goto(`/${SLUG}/rsvp`);
  64  |     const form = page.locator("form").first();
  65  |     await expect(form).toBeVisible();
  66  |     // Form should not overflow
  67  |     const box = await form.boundingBox();
  68  |     if (box) expect(box.width).toBeLessThanOrEqual(390);
  69  |   });
  70  | });
  71  | 
  72  | test.describe("Rotas de evento — tela pequena (320px)", () => {
  73  |   test.use({ viewport: { width: 320, height: 568 } }); // iPhone SE
  74  | 
  75  |   test("landing page não quebra em 320px", async ({ page }) => {
  76  |     await page.goto(`/${SLUG}?k=${PUBLIC_TOKEN}`);
  77  |     await expect(page.locator("body")).not.toBeEmpty();
  78  |     // Check for horizontal scroll
  79  |     const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  80  |     const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  81  |     expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1); // 1px tolerance
  82  |   });
  83  | });
  84  | 
  85  | test.describe("Rotas admin — auth guard", () => {
  86  |   test("admin redireciona para login sem sessão", async ({ page }) => {
  87  |     await page.goto("/admin");
  88  |     // Should redirect to /login
  89  |     await expect(page).toHaveURL(/login/);
  90  |   });
  91  | });
  92  | 
  93  | test.describe("Páginas de erro", () => {
  94  |   test("slug inválido renderiza 404", async ({ page }) => {
  95  |     await page.goto("/slug-que-nao-existe-jamais-xyz");
  96  |     await expect(page.locator("body")).not.toBeEmpty();
  97  |     // Should show not found content
> 98  |     expect(await page.title()).toBeTruthy();
      |                                ^ Error: expect(received).toBeTruthy()
  99  |   });
  100 | });
  101 | 
```