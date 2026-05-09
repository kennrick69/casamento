# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.test.ts >> Auth — comportamento de formulários >> signup com campos em branco não submete (validação client-side)
- Location: tests/e2e/auth.test.ts:111:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /criar conta|criando/i })

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - heading "Voem." [level=1] [ref=e5]
      - paragraph [ref=e6]: Painel dos noivos
    - generic [ref=e8]:
      - tablist [ref=e9]:
        - tab "Entrar" [selected] [ref=e10]
        - tab "Criar conta" [active] [ref=e11]
      - tabpanel [ref=e12]:
        - generic [ref=e13]:
          - textbox [ref=e15]
          - generic [ref=e16]:
            - text: E-mail
            - textbox "E-mail" [ref=e17]:
              - /placeholder: seu@email.com
          - generic [ref=e18]:
            - text: Senha
            - textbox "Senha" [ref=e19]:
              - /placeholder: ••••••••
            - link "Esqueci minha senha" [ref=e21]:
              - /url: /forgot-password
          - button "Entrar" [ref=e22]
          - generic [ref=e24]: ou
          - button "Acessar sem senha" [ref=e25]
    - paragraph [ref=e26]: Sua plataforma de convite interativo
  - region "Notifications alt+T"
```

# Test source

```ts
  16  |   test("/login renderiza com abas Entrar e Criar conta", async ({ page }) => {
  17  |     await page.goto("/login");
  18  |     await expect(page.getByRole("tab", { name: "Entrar" })).toBeVisible();
  19  |     await expect(page.getByRole("tab", { name: "Criar conta" })).toBeVisible();
  20  |   });
  21  | 
  22  |   test("/login aba Criar conta tem campo de força de senha", async ({ page }) => {
  23  |     await page.goto("/login");
  24  |     await page.getByRole("tab", { name: "Criar conta" }).click();
  25  |     await expect(page.getByLabel(/senha/i).first()).toBeVisible();
  26  |   });
  27  | 
  28  |   test("/forgot-password renderiza campo de e-mail", async ({ page }) => {
  29  |     await page.goto("/forgot-password");
  30  |     await expect(page.getByRole("heading", { name: /esqueci/i })).toBeVisible();
  31  |     await expect(page.getByRole("textbox")).toBeVisible();
  32  |   });
  33  | 
  34  |   test("/termos renderiza conteúdo com badge de versão", async ({ page }) => {
  35  |     await page.goto("/termos");
  36  |     await expect(page.getByRole("heading", { name: "Termos de Uso" })).toBeVisible();
  37  |     await expect(page.getByText("v1.0")).toBeVisible();
  38  |   });
  39  | 
  40  |   test("/privacidade renderiza conteúdo com badge de versão", async ({ page }) => {
  41  |     await page.goto("/privacidade");
  42  |     await expect(page.getByRole("heading", { name: "Política de Privacidade" })).toBeVisible();
  43  |     await expect(page.getByText("v1.0")).toBeVisible();
  44  |   });
  45  | });
  46  | 
  47  | // ── Guards de sessão ──────────────────────────────────────────────────────────
  48  | 
  49  | test.describe("Auth — guards de sessão (sem cookie)", () => {
  50  |   test("/admin sem sessão → redireciona para /login", async ({ page }) => {
  51  |     await page.goto("/admin");
  52  |     await expect(page).toHaveURL(/\/login/);
  53  |   });
  54  | 
  55  |   test("/admin/conta sem sessão → redireciona para /login", async ({ page }) => {
  56  |     await page.goto("/admin/conta");
  57  |     await expect(page).toHaveURL(/\/login/);
  58  |   });
  59  | 
  60  |   test("/admin/eventos/novo sem sessão → redireciona para /login", async ({ page }) => {
  61  |     await page.goto("/admin/eventos/novo");
  62  |     await expect(page).toHaveURL(/\/login/);
  63  |   });
  64  | 
  65  |   test("/verify-email sem sessão → redireciona para /login", async ({ page }) => {
  66  |     await page.goto("/verify-email");
  67  |     await expect(page).toHaveURL(/\/login/);
  68  |   });
  69  | 
  70  |   test("/aceitar-termos sem sessão → redireciona para /login", async ({ page }) => {
  71  |     await page.goto("/aceitar-termos");
  72  |     await expect(page).toHaveURL(/\/login/);
  73  |   });
  74  | });
  75  | 
  76  | // ── Comportamento de formulários ──────────────────────────────────────────────
  77  | 
  78  | test.describe("Auth — comportamento de formulários", () => {
  79  |   test("login com credenciais inválidas mostra erro sem vazar info do usuário", async ({ page }) => {
  80  |     await page.goto("/login");
  81  |     await page.waitForLoadState("domcontentloaded");
  82  | 
  83  |     // Aguarda Turnstile auto-resolver (se configurado com always-pass keys)
  84  |     await page.waitForTimeout(2500);
  85  | 
  86  |     await page.getByRole("tab", { name: "Entrar" }).click();
  87  |     await page.getByLabel(/e-mail/i).fill("usuario-que-nao-existe-abc@example.com");
  88  |     await page.locator('input[type="password"]').first().fill("SenhaErrada123!");
  89  |     await page.getByRole("button", { name: /entrar|entrando/i }).click();
  90  | 
  91  |     // Deve mostrar erro genérico — não pode revelar se o e-mail existe
  92  |     await expect(
  93  |       page.getByText(/e-mail ou senha incorretos|verificação de segurança/i)
  94  |     ).toBeVisible({ timeout: 12_000 });
  95  |   });
  96  | 
  97  |   test("forgot-password com e-mail inexistente mostra mensagem de sucesso (anti-enumeration)", async ({ page }) => {
  98  |     await page.goto("/forgot-password");
  99  |     await page.waitForLoadState("domcontentloaded");
  100 |     await page.waitForTimeout(2500);
  101 | 
  102 |     await page.getByRole("textbox").fill("email-inexistente-xyz123@notexist.example");
  103 |     await page.getByRole("button", { name: /receber link/i }).click();
  104 | 
  105 |     // Anti-enumeration: sucesso esperado; Turnstile pode bloquear em CI com chaves reais
  106 |     await expect(
  107 |       page.getByText(/se esse e-mail estiver cadastrado|verificação de segurança/i)
  108 |     ).toBeVisible({ timeout: 12_000 });
  109 |   });
  110 | 
  111 |   test("signup com campos em branco não submete (validação client-side)", async ({ page }) => {
  112 |     await page.goto("/login");
  113 |     await page.getByRole("tab", { name: "Criar conta" }).click();
  114 | 
  115 |     // Tenta submeter sem preencher nada
> 116 |     await page.getByRole("button", { name: /criar conta|criando/i }).click();
      |                                                                      ^ Error: locator.click: Test timeout of 30000ms exceeded.
  117 | 
  118 |     // Deve permanecer na página /login (sem redirect)
  119 |     await expect(page).toHaveURL(/\/login/);
  120 |   });
  121 | 
  122 |   test("/reset-password com token inválido renderiza tela de erro", async ({ page }) => {
  123 |     await page.goto("/reset-password?token=token-completamente-invalido-abc123");
  124 |     // A página renderiza server-side e mostra InvalidLink — sem redirect
  125 |     await expect(page.getByText(/link inválido|link já foi utilizado|expirado/i)).toBeVisible({ timeout: 8_000 });
  126 |   });
  127 | });
  128 | 
  129 | // ── Segurança — /admin/dev-tools ─────────────────────────────────────────────
  130 | 
  131 | test.describe("Auth — /admin/dev-tools protegida", () => {
  132 |   test("retorna 404 ou redireciona (não expõe ferramentas sem DEV_TOOLS_ENABLED)", async ({ request, page }) => {
  133 |     // Em Railway (produção), DEV_TOOLS_ENABLED=false → notFound() → 404
  134 |     // Sem sessão → middleware redireciona para /login antes de chegar na página
  135 |     // Ambos os casos são aceitáveis — o que NÃO pode ocorrer é 200 com a página exposta
  136 |     const response = await request.get("/admin/dev-tools");
  137 |     expect([200, 302, 303, 307, 308, 404]).toContain(response.status());
  138 | 
  139 |     // Se chegou como 200 (autenticado em dev), verificar que é uma página real
  140 |     // Em prod (sem sessão) deve ser redirect para login
  141 |     if (response.status() === 200) {
  142 |       // Só ocorre em ambiente de dev autenticado — aceitável
  143 |       await page.goto("/admin/dev-tools");
  144 |       // Deve ser a página de dev-tools ou a de login — nunca um crash
  145 |       const title = await page.title();
  146 |       expect(title).toBeTruthy();
  147 |     }
  148 |   });
  149 | });
  150 | 
  151 | // ── Login com credenciais válidas (requer secrets no CI) ─────────────────────
  152 | 
  153 | test.describe("Auth — login com credenciais válidas", () => {
  154 |   const email = process.env.TEST_USER_EMAIL;
  155 |   const password = process.env.TEST_USER_PASSWORD;
  156 | 
  157 |   test("redireciona para /admin ou /aceitar-termos após login correto", async ({ page }) => {
  158 |     test.skip(!email || !password, "TEST_USER_EMAIL / TEST_USER_PASSWORD não configurados — skipping");
  159 | 
  160 |     await page.goto("/login");
  161 |     await page.waitForLoadState("domcontentloaded");
  162 |     await page.waitForTimeout(2500); // Aguarda Turnstile
  163 | 
  164 |     await page.getByRole("tab", { name: "Entrar" }).click();
  165 |     await page.getByLabel(/e-mail/i).fill(email!);
  166 |     await page.locator('input[type="password"]').first().fill(password!);
  167 |     await page.getByRole("button", { name: /entrar|entrando/i }).click();
  168 | 
  169 |     await expect(page).toHaveURL(/\/(admin|aceitar-termos)/, { timeout: 20_000 });
  170 |   });
  171 | });
  172 | 
```