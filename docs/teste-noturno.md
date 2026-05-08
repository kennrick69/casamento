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

**O que foi:** widget Turnstile adicionado ao login e signup. Verificação server-side opcional via TURNSTILE_SECRET_KEY.

**Onde testar:** `/login` com Turnstile configurado no Railway

**Pré-requisito:** configurar no Railway:
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` = sua site key do Cloudflare Turnstile
- `TURNSTILE_SECRET_KEY` = sua secret key

**Chaves de teste oficiais do Cloudflare (sem criar conta):**
- Site key always-pass: `1x00000000000000000000AA`
- Secret key always-pass: `1x0000000000000000000000000000000AA`
- Site key always-block: `2x00000000000000000000AB`
- Secret key always-fail: `2x0000000000000000000000000000000AB`

**O que validar (com chaves always-pass):**
- [ ] Widget aparece no formulário de login (geralmente checkbox ou invisível)
- [ ] Widget aparece no formulário de signup
- [ ] Widget fica numa posição que não quebra o layout mobile
- [ ] Login com chaves always-pass → sucesso normal
- [ ] Signup com chaves always-pass → sucesso normal

**O que validar (sem chaves configuradas — dev mode):**
- [ ] Formulários funcionam normalmente sem widget aparecer
- [ ] Nenhum erro no console relacionado a Turnstile

**Edge cases:**
- [ ] Trocar para chave always-block → login bloqueado com erro "Verificação de segurança falhou."
- [ ] AuthLog em `/admin/dev-tools` mostra CAPTCHA_FAILED para tentativa bloqueada
- [ ] Token Turnstile expirado (aguardar 5 min sem enviar) → widget recarrega automaticamente

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

*Última atualização: 2026-05-08*
