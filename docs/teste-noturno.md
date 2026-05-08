# Checklist de Teste Noturno

**Modelo:** "build all day, test at night."
Durante o dia o código avança com CI verde. À noite, você testa
manualmente no Railway (https://casamento-production-2c06.up.railway.app)
e marca cada item.

**Como marcar:**
- `- [ ]` → não testado
- `- [x] ✅ OK` → testado e passou
- `- [x] ❌ Bug: <descrição curta>` → falhou, investigar

**Regra:** nunca remove itens — só adiciona e marca.

---

## [2026-05-08] R.4 — Auditoria de mensagens de erro

**O que foi:** Strings em inglês em rotas de API substituídas por português; fallback de upload de foto melhorado.

**Onde testar:** fluxos onde mensagens de erro aparecem

**O que validar:**
- [ ] Upload de foto com rede lenta/falha → mensagem "Falha ao enviar. Tente novamente." aparece
- [ ] Tentar exportar CSV de convidados sem autenticação → resposta HTTP com "Não autorizado" (verificar no DevTools)
- [ ] Nenhuma mensagem em inglês visível em qualquer tela de erro

---

## [2026-05-07] A.1 — Landing page + botão CTA

**O que foi:** ProtoScene.tsx — hero estático com botão "Criar meu convite" que redireciona para /admin.

**Onde testar:** `/` (raiz do site)

**O que validar:**
- [ ] Hero carrega sem erro de JavaScript (abrir console do browser)
- [ ] Botão CTA visível e clicável
- [ ] Usuário **não logado** clica no botão → redireciona para `/login`
- [ ] Usuário **logado** clica no botão → redireciona para `/admin`
- [ ] Visual do hero (tipografia Cormorant/serif, gradiente, tema claro/escuro)

**Edge cases:**
- [ ] Abrir em mobile (iPhone/Android) — layout não quebra
- [ ] Abrir em modo escuro do sistema → tema adapta

---

## [2026-05-07] A.3 — Páginas /login e /signup

**O que foi:** `/login` com duas abas (Entrar / Criar conta), react-hook-form, zxcvbn, honeypot, rate limit.

**Onde testar:** `/login`

### Aba "Entrar" (Login)

**O que validar:**
- [ ] Página carrega com logo "Voem." e card branco centralizado
- [ ] Duas abas "Entrar" / "Criar conta" visíveis
- [ ] Campo e-mail + campo senha presentes
- [ ] Credenciais corretas → redireciona para `/verify-email`
- [ ] Credenciais erradas → mensagem "E-mail ou senha incorretos." embaixo da senha
- [ ] E-mail inválido (sem @) → validação client-side antes de enviar
- [ ] Botão fica desabilitado enquanto carrega (estado "Entrando…")

**Edge cases:**
- [ ] 5 tentativas erradas seguidas → mensagem de rate limit com tempo de espera
- [ ] "Acessar sem senha" sem preencher e-mail → erro "Informe seu e-mail"
- [ ] "Acessar sem senha" com e-mail válido → "Link enviado! Verifique sua caixa de entrada." (sem crash)

### Aba "Criar conta" (Signup)

**O que validar:**
- [ ] Campos Nome, Sobrenome, E-mail, Senha, Confirmar senha
- [ ] Barra de força de senha aparece ao digitar na senha
- [ ] Senha fraca (ex: "abc12345") → barra vermelha/laranja + label "Fraca"
- [ ] Senha forte (ex: "Bx#9kLm2@river") → barra verde + label "Excelente"
- [ ] Senhas diferentes → "Senhas não conferem" no campo Confirmar
- [ ] E-mail já cadastrado → "E-mail já cadastrado. Tente entrar…"
- [ ] Signup bem-sucedido → redireciona para `/verify-email`
- [ ] Após signup, abrir `/admin/dev-tools` → VerificationToken aparece com link clicável

**Edge cases:**
- [ ] Nome com 1 letra → validação "Mínimo 2 letras"
- [ ] E-mail de domínio descartável (mailinator, etc.) → "Use um e-mail permanente"
- [ ] 3 tentativas de signup seguidas do mesmo IP → rate limit

---

## [2026-05-08] A.4 — Verificação de email + onboarding

### Fluxo completo de verificação

**Onde testar:** criar conta nova em `/login` → seguir o fluxo

**O que validar:**
- [ ] Após signup, redireciona para `/verify-email`
- [ ] Página mostra o e-mail correto da conta criada
- [ ] Botão "Reenviar e-mail" começa desabilitado com countdown "Reenviar e-mail (60s)"
- [ ] Countdown vai de 60 até 0 e botão ativa
- [ ] Clicar "Reenviar" → mensagem "E-mail reenviado! Verifique sua caixa de entrada."
- [ ] Contador reinicia para 60s após reenvio
- [ ] Link "Acessar o painel sem confirmar →" leva para `/admin`

**Edge cases:**
- [ ] Navegar direto para `/verify-email` sem estar logado → redireciona para `/login`
- [ ] Abrir link de verificação do email → `emailVerified` é marcado no banco (verificar em /admin/dev-tools: token some, AuthLog mostra EMAIL_VERIFIED)

### /api/auth/verify (link do email)

**Onde testar:** copiar link de `/admin/dev-tools` e abrir no browser

**O que validar:**
- [ ] Link válido → redireciona para `/admin/onboarding`
- [ ] Mesmo link clicado duas vezes → segunda vez mostra `/verify-email?error=invalid`
- [ ] URL com token inválido `/api/auth/verify?token=abc123` → `/verify-email?error=invalid`

**Edge cases:**
- [ ] Token expirado (usar link antigo) → `/verify-email?error=expired` com mensagem laranja

### /admin/onboarding (3 telas)

**Onde testar:** `/admin/onboarding` ou seguindo o fluxo de verificação

**O que validar:**
- [ ] Tela 1: ícone 💍, título "Bem-vindo ao Voem.", texto descritivo, botão "Continuar"
- [ ] Indicador de passo (3 pontinhos): primeiro ativo, outros menores
- [ ] Botão "Continuar" leva para `?step=2`
- [ ] Tela 2: ícone ✨, lista de 6 funcionalidades com ícones
- [ ] Tela 3: ícone 🚀, botão "Criar meu primeiro evento" → `/admin/eventos/novo`
- [ ] Tela 3: link "Ir para o painel" → `/admin`
- [ ] Acessar `/admin/onboarding?step=2` diretamente → tela 2 correta

**Edge cases:**
- [ ] Navegar direto sem estar logado → redireciona para `/login`
- [ ] `?step=99` → tela 3 (clampado ao máximo)
- [ ] `?step=0` → tela 1 (clampado ao mínimo)

---

## [2026-05-08] A.4 parte 2 — /admin/dev-tools

**O que foi:** página de debug com tokens, resets de senha e auth logs. DEV_TOOLS_ENABLED=false → 404.

**Onde testar:** `/admin/dev-tools`

**O que validar:**
- [ ] Página carrega com banner amarelo "🔧 Ferramentas de desenvolvimento"
- [ ] Banner mostra a URL base correta (casamento-production-2c06.up.railway.app, não localhost)
- [ ] Seção "Tokens de verificação de email" mostra token criado no signup
- [ ] Link "Verificar →" clicável e funcional (só para tokens não expirados)
- [ ] Botão "Remover" deleta o token e atualiza a lista sem reload completo
- [ ] Seção "Auth logs" mostra eventos (SIGNUP_COMPLETED, etc.)
- [ ] Select de filtro de ação funciona (ex: filtrar por EMAIL_SEND_FAILED)
- [ ] Botão "Limpar" no filtro volta para todos os logs

**Edge cases:**
- [ ] Acessar sem estar logado → redireciona para `/login`
- [ ] Seção "Resets de senha" vazia (ainda sem flow de reset) → "Nenhum reset no banco." sem erro
- [ ] Token de verificação expirado → linha cinza sem link "Verificar →"

### Resend error logging

**Onde testar:** Railway Logs + `/admin/dev-tools` → filtro EMAIL_SEND_FAILED

**O que validar (cenário: RESEND_API_KEY configurado mas domínio não verificado):**
- [ ] Criar conta com e-mail diferente de casamento290527@gmail.com
- [ ] Railway Logs mostra banner "🚨 [EMAIL FALHOU]" com email e motivo
- [ ] `/admin/dev-tools` → filtrar AuthLogs por EMAIL_SEND_FAILED → entrada aparece
- [ ] Metadata do log mostra `{ type: "welcome_verify", reason: "..." }`
- [ ] Usuário chegou em `/verify-email` normalmente (cadastro não foi bloqueado)

---

## [2026-05-08] A.5 — Cloudflare Turnstile (CAPTCHA)

**O que foi:** widget Turnstile adicionado ao login e signup. Verificação server-side via TURNSTILE_SECRET_KEY.

**Status:** ✅ Chaves reais configuradas no Railway em 2026-05-08 (NEXT_PUBLIC_TURNSTILE_SITE_KEY + TURNSTILE_SECRET_KEY). Turnstile está ativo em produção.

**Onde testar:** `/login` em `https://casamento-production-2c06.up.railway.app`

**O que validar (chaves reais em produção):**
- [ ] Widget Turnstile aparece no formulário de login (checkbox ou invisível dependendo da configuração)
- [ ] Widget aparece no formulário de signup
- [ ] Widget fica numa posição que não quebra o layout mobile
- [ ] Login com credenciais corretas → widget resolve automaticamente → sucesso normal
- [ ] Signup com dados válidos → widget resolve → sucesso normal
- [ ] Nenhum erro de console relacionado a Turnstile (CSP permite `challenges.cloudflare.com`)

**Edge cases:**
- [ ] Token Turnstile expirado (aguardar 5 min sem enviar) → widget recarrega automaticamente
- [ ] AuthLog em `/admin/dev-tools` mostra CAPTCHA_FAILED para tentativa bloqueada (verificar se ocorre)

**Nota:** as chaves de teste do Cloudflare (always-pass/always-block) não são mais necessárias — chaves reais estão ativas. Para testar o caso always-block seria necessário trocar temporariamente a secret key no Railway.

---

---

## [2026-05-08] A.6 — Password Reset

**O que foi:** fluxo completo de redefinição de senha. `/forgot-password` com anti-enumeration, `/reset-password?token=...` com zxcvbn (score ≥ 2), invalidação de sessões anteriores via `passwordChangedAt`, notificação de segurança por email.

**Onde testar:** `/forgot-password` → email → `/reset-password?token=...` → `/admin`

### /forgot-password

**O que validar:**
- [ ] Link "Esqueci minha senha" aparece no form de login (abaixo do campo senha)
- [ ] Página carrega com visual igual ao /login (gradiente + card branco)
- [ ] Campo e-mail + botão "Receber link de redefinição"
- [ ] E-mail inválido → erro de validação client-side
- [ ] E-mail válido cadastrado → estado de sucesso ("Se esse e-mail estiver cadastrado…")
- [ ] **Anti-enumeration:** e-mail NÃO cadastrado → mesma mensagem de sucesso (nunca "E-mail não encontrado")
- [ ] Após sucesso, link "Voltar para o login" aparece

**Edge cases:**
- [ ] 3 tentativas em 60 min pelo mesmo IP → rate limit
- [ ] Preencher e-mail de conta inexistente → mesmo UX que conta existente

### /admin/dev-tools — PasswordResets

**O que validar:**
- [ ] Após solicitar reset, `PasswordReset` aparece na seção de resets com status "válido"
- [ ] Expira em 30 min (verificar coluna "Expira")
- [ ] Botão "Invalidar" marca como usado → status muda para "usado"

### /reset-password?token=...

**Onde testar:** copiar link do console (dev) ou do email, ou pegar token direto de /admin/dev-tools → construir `https://<url>/reset-password?token=<hash-plain>`

Atenção: o link no email tem o token PLAIN (não o hash). O que está no banco é o hash SHA-256.

**O que validar:**
- [ ] Link válido → formulário com campos "Nova senha" e "Confirmar nova senha"
- [ ] Barra de força de senha aparece ao digitar
- [ ] Senha muito fraca (score < 2, ex: "abc12345") → erro "Senha muito fraca…"
- [ ] Senha razoável (score ≥ 2) → aceita
- [ ] Senhas diferentes → "Senhas não conferem"
- [ ] Submit com senha válida → redireciona para `/admin`
- [ ] Verificar em /admin/dev-tools → token marcado como "usado"
- [ ] AuthLog em /admin/dev-tools → PASSWORD_RESET_COMPLETED aparece

**Edge cases:**
- [ ] Token inválido (url digitada manualmente) → tela 🔒 "Link inválido" + botão "Solicitar novo link"
- [ ] Token já usado (clicar no link duas vezes) → tela 🔒 "Este link já foi utilizado."
- [ ] Token expirado (aguardar 30 min) → tela 🔒 com mensagem de expirado

### Invalidação de sessões anteriores

**Como testar:**
1. Faça login em dois "dispositivos" (browser normal + aba anônima)
2. No browser anônimo, solicite reset e redefina a senha
3. No browser normal (sessão antiga), acesse /admin → deve ser redirecionado para /login

**O que validar:**
- [ ] Sessão antiga é invalidada após reset de senha (logout forçado em outros dispositivos)
- [ ] A sessão criada pelo próprio reset continua válida e acessa /admin normalmente

### Email de notificação de segurança

**O que validar:**
- [ ] Após reset bem-sucedido, email "Sua senha foi alterada" é enviado (ou log no console)
- [ ] Email contém instrução de contato em caso de não ter sido o usuário

---

## [2026-05-08] A.7 — Configurações de conta (/admin/conta)

**O que foi:** página de conta com 3 seções — dados pessoais, alterar senha (com strength bar + invalidação de sessões), preferências de notificação. Link "Minha conta" no header do painel.

**Onde testar:** `/admin` → "Minha conta" no header, ou direto `/admin/conta`

### Dados pessoais

**O que validar:**
- [ ] Nome e sobrenome carregam com os valores do cadastro
- [ ] Campo e-mail readonly (não editável)
- [ ] Badge "✓ verificado" aparece se email verificado, "verificar" se não
- [ ] Campo telefone opcional, aceita vazio
- [ ] Salvar → dados atualizados (recarregar página para confirmar)

### Segurança — alterar senha

**O que validar:**
- [ ] Seção mostra formulário se conta tem senha (cadastro por e-mail+senha)
- [ ] Seção mostra mensagem + link "Defina uma senha" se conta é magic-link only
- [ ] Senha atual incorreta → "Senha atual incorreta."
- [ ] Senhas novas não conferem → "Senhas não conferem"
- [ ] Nova senha muito fraca (score < 2) → "Nova senha muito fraca."
- [ ] Sucesso → redireciona para /admin/conta?changed=1 com banner verde
- [ ] Barra de força aparece ao digitar a nova senha

**Invalidação de sessões (mesmo teste do A.6):**
- [ ] Login em dois browsers; alterar senha no browser 1 → browser 2 perde sessão

### Notificações

**O que validar:**
- [ ] Checkbox "marketingOptIn" carrega com o estado atual do usuário
- [ ] Salvar preferências → atualiza no banco (verificar via /admin/dev-tools AuthLog ou direto no banco)

---

## [2026-05-08] A.8 — Headers de segurança e CSP

**O que foi:** `next.config.ts` com `headers()` aplicando HSTS, X-Frame-Options DENY,
X-Content-Type-Options nosniff, Referrer-Policy, e Content-Security-Policy baseline.
CSP cobre: scripts próprios + Next.js inline + Cloudflare Turnstile, estilos inline,
fontes self-hosted (next/font/google), imagens/blobs próprios, Pusher WebSocket,
iframes do Turnstile. `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`.

**Onde testar:** qualquer página do site em produção

**O que validar:**

- [ ] Abrir DevTools → Network → qualquer request → aba Headers → verificar presença de:
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Content-Security-Policy: default-src 'self'; ...`
- [ ] Console do browser: **zero erros de CSP** na landing page `/`
- [ ] Console do browser: **zero erros de CSP** na página `/login` (Turnstile carrega)
- [ ] Widget Turnstile aparece e funciona normalmente no login/signup
- [ ] Chat do evento (Pusher) conecta sem erros de CSP (abrir console na página `/[slug]/chat`)
- [ ] Fontes carregam corretamente (Cormorant Garamond, etc.) — sem FOUT duradouro
- [ ] Upload de foto no mural funciona (blob: URL necessário para preview)

**Validação externa (após deploy):**
- [ ] Acessar https://securityheaders.com → analisar `https://casamento-production-2c06.up.railway.app`
- [ ] Resultado esperado: nota **A ou A+** (HSTS + X-Frame + nosniff + Referrer + CSP presentes)
- [ ] Nota: `'unsafe-inline'` em script-src/style-src impedirá A+ até implementar nonces — aceitável para baseline

**Edge cases:**
- [ ] Abrir `/admin/conta` → alterar senha → re-auth funciona (form-action 'self' não bloqueia server actions)
- [ ] Abrir `/[slug]/rsvp` → submeter RSVP → sem erros de CSP (fetch para própria origem)

---

## [2026-05-08] A.9 — Termos de Uso e Política de Privacidade

**O que foi:** Documentos legais placeholder (v1.0) em `docs/legal/`. Páginas `/termos` e
`/privacidade` reescritas com conteúdo real em prose. Admin layout verifica se o usuário
aceitou a versão atual — se não, redireciona para `/aceitar-termos` (página bloqueante com
checkbox obrigatório). Versão gerenciada em `src/lib/legal/versions.ts`.

**Onde testar:** Criar conta nova → seguir fluxo, OU simular mudança de versão

### Páginas de documento

**O que validar:**
- [ ] `/termos` carrega com conteúdo completo (10 seções) e badge de versão "v1.0"
- [ ] `/privacidade` carrega com conteúdo completo (11 seções, tabelas) e badge "v1.0"
- [ ] Links "← Início" funcionam
- [ ] Link "Política de Privacidade" em /termos abre /privacidade e vice-versa
- [ ] Badge amarelo "TODO: revisão jurídica" visível (placeholder explícito)

### Fluxo de aceite (novo usuário)

**O que validar:**
- [ ] Após signup + verificação de email, ao tentar acessar `/admin` → redirecionado para `/aceitar-termos`
- [ ] Página `/aceitar-termos` mostra card com 2 links (Termos e Privacidade) com versão "v1.0 ↗"
- [ ] Links abrem em nova aba (target="_blank")
- [ ] Botão "Aceitar e continuar" fica desabilitado enquanto checkbox não está marcado
- [ ] Marcar checkbox → botão ativa
- [ ] Aceitar → redirecionado para `/admin`
- [ ] Voltar para `/aceitar-termos` após aceitar → redirecionado automaticamente para `/admin`

### Fluxo de re-aceite (mudança de versão simulada)

**Como simular:** No banco (`/admin/dev-tools` não tem interface, fazer via Railway Database UI
ou prisma studio): definir `termsVersion = null` para um usuário existente.

**O que validar:**
- [ ] Usuário com `termsVersion = null` no banco → ao acessar qualquer rota `/admin/*` → redirecionado para `/aceitar-termos`
- [ ] Após aceite → `termsVersion = "1.0"` e `termsAcceptedAt` preenchidos no banco

**Edge cases:**
- [ ] Acessar `/aceitar-termos` sem estar logado → redirecionado para `/login`
- [ ] Acessar `/admin/conta` com termos pendentes → bloqueado (redireciona para `/aceitar-termos`)
- [ ] Acessar `/termos` sem estar logado → página pública carrega normalmente

---

## [2026-05-08] A.10 — Audit + Smoke E2E + Lighthouse + Axe

**O que foi:** Unit tests para hashToken/checkRateLimit/verifyTurnstile. Smoke E2E de auth
em `tests/e2e/auth.test.ts`. A11y via axe-core adicionada às páginas de auth. Lighthouse CI
configurado com `@lhci/cli` no job smoke (continue-on-error, informativo). ADR-009 e CHANGELOG
do Bloco A documentados.

**Onde testar:** CI (smoke job no GitHub Actions após push para main)

### Smoke E2E de auth (CI automático)

**O que validar (vai aparecer no CI run após este push):**
- [ ] Job "Smoke test (Railway)" passa com todos os steps verdes
- [ ] "Run smoke tests — auth (Bloco A)" mostra todos os testes passando
- [ ] Os testes que requerem TEST_USER_EMAIL/PASSWORD aparecem como "skipped" (não "failed") se secrets não configurados
- [ ] "Run a11y tests" passa (continue-on-error — pode falhar sem bloquear)
- [ ] "Lighthouse CI" executa e sobe relatórios para temporary-public-storage (URL no output do job)

### Verificar cobertura de testes

**O que validar:**
- [ ] `pnpm test` localmente → 13 arquivos, 115+ testes, todos verdes (TZ=UTC)
- [ ] Os 3 novos arquivos de teste aparecem no output: `auth-token`, `auth-rate-limit`, `auth-turnstile`

### Lighthouse — scores esperados

**Após CI rodar, verificar na aba Artifacts do GitHub Actions:**
- [ ] /login: Performance ≥ 90, Accessibility ≥ 90, Best Practices ≥ 85, SEO ≥ 90
- [ ] /forgot-password: idem
- [ ] /termos: Performance ≥ 95, todos ≥ 90
- [ ] /privacidade: idem
- [ ] Nota: Best Practices pode ficar em 85–90 por causa do `unsafe-inline` no CSP (documentado em ADR-009)

### Axe A11y

**O que validar (CI + manual):**
- [ ] CI: "Run a11y tests" mostra zero violações WCAG AA em /login, /forgot-password, /termos, /privacidade
- [ ] Manual: inspecionar se há violações de color-contrast (excluídas dos testes automáticos — verificar manualmente via DevTools → Lighthouse)

### securityheaders.com (manual pós-deploy)

- [ ] Acessar https://securityheaders.com → analisar `https://casamento-production-2c06.up.railway.app`
- [ ] Nota mínima esperada: **A** (todos os 5 headers principais presentes)
- [ ] Nota A+ bloqueada pelo `unsafe-inline` até implementar nonces (aceitável como baseline)

---

## [2026-05-08] R.3 — Email de confirmação de presença

**O que foi:** Template rico `rsvpConfirmationHtml/Text` com cerimônia + recepção, link para editar resposta, link para o mural. Headers anti-spam. Banner de log em dev.

**Onde testar:** Página `/[slug]/rsvp` → confirmar presença

**O que validar:**
- [ ] Após confirmar presença com e-mail válido → email recebido com assunto "Presença confirmada — [nome do evento]"
- [ ] Email mostra: data/horário, local da cerimônia (se cadastrado), local da recepção (se cadastrado)
- [ ] Botão "Ver meu convite" → abre a landing do evento
- [ ] Link "Mural do evento" → abre `/[slug]/mural`
- [ ] Link "Atualize sua resposta" → abre `/[slug]/rsvp`
- [ ] Texto visível: "Presença confirmada", "confirmação de presença" — sem uso de "RSVP"
- [ ] Dev (sem RESEND_API_KEY): banner no log `✅ [DEV] EMAIL DE CONFIRMAÇÃO DE PRESENÇA` com links visíveis

---

## [2026-05-08] R.2.B — Wizard de criação de evento (react-hook-form + navegação)

**O que foi:** Validação client-side com react-hook-form + zodResolver em todos os passos do
wizard. Botão "← Voltar" entre passos. Indicador "Passo X de 4". Toast de erro em falhas de
servidor. Campos de doação/PIX condicionais ao feature flag. Label de aprovação simplificado.
Redirect de ?step=4 para eventos já publicados.

**Onde testar:** `/admin/eventos/novo` → wizard de 4 passos

### Passo 1 — Dados básicos (novo evento)

**O que validar:**
- [ ] Campo "Nome do casal" em branco → erro inline "Informe o nome do casal (mínimo 3 caracteres)"
- [ ] Sem data → erro "Escolha a data do casamento"
- [ ] Prazo de confirmação posterior à data do casamento → erro "O prazo de confirmação deve ser antes da data do casamento"
- [ ] Campos válidos → botão ativa, "Criando evento…" durante submit, avança para passo 2
- [ ] Pílulas de progresso em font normal (não monospace), "Passo 1 de 4" abaixo

### Passo 2 — Local

**O que validar:**
- [ ] Botão "← Passo 1: Dados básicos" visível e volta corretamente
- [ ] Link do Maps com texto inválido (sem https://) → erro "Cole o link completo do Maps, começando com https://"
- [ ] Link do Maps válido → aceito sem erro
- [ ] Submit → "Salvando…" durante processamento, avança para passo 3
- [ ] Todos os campos opcionais (pode avançar sem preencher)

### Passo 3 — Tema visual

**O que validar:**
- [ ] Botão "← Passo 2: Local" visível e funcional
- [ ] Selecionar tema → botão "Próximo: Publicar →" (não "Salvar tema →")
- [ ] Avança para passo 4 ao clicar

### Passo 4 — Publicar

**O que validar:**
- [ ] Botão "← Passo 3: Tema visual" visível e funcional
- [ ] Se `donations = false` → campos "Modo de doação" e "Chave PIX" NÃO aparecem
- [ ] Se `donations = true` → campos aparecem normalmente
- [ ] Label do checkbox: "Revisar cada convidado antes de liberar o convite" + helper text
- [ ] Botão "Publicar evento 🎉" e indicador "Publicando…" durante submit
- [ ] Após publicar → redirecionado para `/admin/eventos/[id]`

### Guard P4-C

**O que validar:**
- [ ] Acessar manualmente `?step=4` num evento já publicado → redirecionado para `/configuracoes` (sem query string)

*Última atualização: 2026-05-08*
