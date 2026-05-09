#!/usr/bin/env tsx
/**
 * CLI interativo para gerar .env.production.local de um novo casal.
 * Uso: pnpm tsx scripts/setup-novo-casal.ts
 */

import { createInterface } from "readline";
import { randomBytes } from "crypto";
import { writeFileSync } from "fs";

const rl = createInterface({ input: process.stdin, output: process.stdout });

function ask(question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, (answer) => resolve(answer.trim())));
}

function gen(bytes: number, encoding: "hex" | "base64" = "hex"): string {
  return randomBytes(bytes).toString(encoding);
}

async function main() {
  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║   Setup — Novo Casal                     ║");
  console.log("╚══════════════════════════════════════════╝\n");
  console.log("Responda as perguntas abaixo. Deixe em branco para usar o padrão.\n");

  const coupleNames = await ask("Nomes dos noivos (ex: Ana e Carlos): ");
  const domain = await ask("Domínio ou URL Railway (ex: casamento.up.railway.app): ");
  const slug = await ask("Slug do convite (ex: ana-e-carlos): ");
  const ceremonyDate = await ask("Data da cerimônia (YYYY-MM-DD, ex: 2026-12-05): ");
  const paymentMode = await ask("Modo de pagamento [trust/pix/mp] (padrão: trust): ") || "trust";
  const resendKey = await ask("Resend API Key (opcional, deixe vazio para dev): ");
  const emailFrom = await ask(`Remetente do email (ex: "Casamento de ${coupleNames || "Ana e Carlos"} <noreply@${domain || "exemplo.com"}>"): `);
  const pusherAppId = await ask("Pusher App ID (opcional): ");
  const pusherKey = await ask("Pusher Key (opcional): ");
  const pusherSecret = await ask("Pusher Secret (opcional): ");
  const pusherCluster = await ask("Pusher Cluster (padrão: sa1): ") || "sa1";

  const appUrl = domain.startsWith("http") ? domain.replace(/\/$/, "") : `https://${domain}`;

  const authSecret = gen(32, "base64");
  const cronSecret = gen(32);
  const encryptionKey = gen(32);

  const content = `# Gerado por scripts/setup-novo-casal.ts em ${new Date().toISOString()}
# Casal: ${coupleNames || "[preencher]"}
# Domínio: ${domain || "[preencher]"}

# ===== BANCO =====
DATABASE_URL=""   # preencher com a URL do PostgreSQL Railway

# ===== AUTH =====
AUTH_SECRET="${authSecret}"
NEXT_PUBLIC_APP_URL="${appUrl}"
AUTH_TRUST_HOST="true"

# ===== EMAIL =====
RESEND_API_KEY="${resendKey}"
EMAIL_FROM="${emailFrom}"

# ===== REALTIME =====
PUSHER_APP_ID="${pusherAppId}"
PUSHER_KEY="${pusherKey}"
PUSHER_SECRET="${pusherSecret}"
NEXT_PUBLIC_PUSHER_KEY="${pusherKey}"
NEXT_PUBLIC_PUSHER_CLUSTER="${pusherCluster}"

# ===== STORAGE =====
RAILWAY_VOLUME_PATH="/data"

# ===== CRIPTOGRAFIA =====
ENCRYPTION_KEY="${encryptionKey}"

# ===== CRON =====
CRON_SECRET="${cronSecret}"

# ===== MODO DE PAGAMENTO =====
# ${paymentMode === "mp" ? "Mercado Pago — configure as credentials no painel admin" : paymentMode === "pix" ? "PIX + Comprovante" : "Confiança (TRUST)"}

# ===== SLUG E DADOS DO EVENTO =====
# Configurar manualmente no painel admin após criar a conta:
#   Slug: ${slug || "[preencher]"}
#   Data: ${ceremonyDate || "[preencher]"}
#   Casal: ${coupleNames || "[preencher]"}

# ===== OPCIONAIS =====
# SENTRY_DSN=""
# NEXT_PUBLIC_SENTRY_DSN=""
# NEXT_PUBLIC_TURNSTILE_SITE_KEY=""
# TURNSTILE_SECRET_KEY=""
# SPOTIFY_CLIENT_ID=""
# SPOTIFY_CLIENT_SECRET=""
# B2_KEY_ID=""
# B2_APPLICATION_KEY=""
# B2_BUCKET=""
# B2_ENDPOINT=""
`;

  const filename = `.env.production.local.${(coupleNames || "novo-casal").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}`;
  writeFileSync(filename, content, "utf8");

  console.log(`\n✅ Arquivo gerado: ${filename}`);
  console.log("\nPróximos passos:");
  console.log("  1. Preencha DATABASE_URL com a URL do PostgreSQL Railway");
  if (paymentMode === "mp") {
    console.log("  2. Configure credentials Mercado Pago no painel admin após o deploy");
  }
  console.log(`  3. Copie as variáveis para Railway → Variables`);
  console.log("  4. Faça o primeiro deploy: git push origin main");
  console.log(`  5. Acesse ${appUrl}/admin para criar a conta do casal\n`);

  rl.close();
}

main().catch((err) => {
  console.error(err);
  rl.close();
  process.exit(1);
});
