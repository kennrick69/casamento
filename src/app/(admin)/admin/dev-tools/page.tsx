import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { deleteVerificationToken, invalidatePasswordReset } from "./actions";
import type { AuthAction } from "@prisma/client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dev Tools" };

const DEV_TOOLS_ENABLED = process.env.DEV_TOOLS_ENABLED !== "false";
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const ACTION_LABELS: Record<AuthAction, string> = {
  SIGNUP_STARTED: "Signup iniciado",
  SIGNUP_COMPLETED: "Signup completo",
  EMAIL_VERIFIED: "Email verificado",
  EMAIL_SEND_FAILED: "Email falhou",
  LOGIN_SUCCESS: "Login OK",
  LOGIN_FAILED: "Login falhou",
  PASSWORD_RESET_REQUESTED: "Reset solicitado",
  PASSWORD_RESET_COMPLETED: "Reset completo",
  PASSWORD_CHANGED: "Senha alterada",
  EMAIL_CHANGED: "Email alterado",
  LOGOUT: "Logout",
  RATE_LIMITED: "Limite de tentativas atingido",
  CAPTCHA_FAILED: "Captcha falhou",
  HONEYPOT_TRIGGERED: "Honeypot",
  BACKUP_CREATED: "Backup criado",
  BACKUP_FAILED: "Backup falhou",
  ACCOUNT_DELETED: "Conta excluída",
  SHARE_LINK: "Link compartilhado",
  PAYMENT_WEBHOOK: "Webhook de pagamento",
};

interface Props {
  searchParams: Promise<{ action?: string }>;
}

export default async function DevToolsPage({ searchParams }: Props) {
  if (!DEV_TOOLS_ENABLED) notFound();

  const session = await auth();
  if (!session?.user) redirect("/login");

  const { action: actionFilter } = await searchParams;

  const [verificationTokens, passwordResets, authLogs] = await Promise.all([
    prisma.verificationToken.findMany({
      orderBy: { expires: "desc" },
      take: 20,
    }),
    prisma.passwordReset.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { user: { select: { email: true, firstName: true, lastName: true } } },
    }),
    prisma.authLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      where: actionFilter ? { action: actionFilter as AuthAction } : undefined,
    }),
  ]);

  const now = new Date();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 rounded-lg border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-sm font-semibold text-amber-800">
            🔧 Ferramentas de desenvolvimento — não use em produção real
          </p>
          <p className="text-xs text-amber-700 mt-1">
            Desabilite com <code className="bg-amber-100 px-1 rounded">DEV_TOOLS_ENABLED=false</code> quando virar produto comercial.
            URL base: <code className="bg-amber-100 px-1 rounded">{BASE_URL}</code>
          </p>
        </div>

        {/* ── VerificationTokens ─────────────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="text-base font-semibold mb-4">
            Tokens de verificação de email{" "}
            <span className="font-normal text-muted-foreground text-sm">({verificationTokens.length})</span>
          </h2>
          {verificationTokens.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum token no banco.</p>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Email</th>
                    <th className="text-left px-3 py-2 font-medium">Token</th>
                    <th className="text-left px-3 py-2 font-medium">Expira</th>
                    <th className="text-left px-3 py-2 font-medium">Link</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {verificationTokens.map((t) => {
                    const expired = t.expires < now;
                    const verifyUrl = `${BASE_URL}/api/auth/verify?token=${t.token}`;
                    return (
                      <tr key={t.token} className={expired ? "opacity-50" : ""}>
                        <td className="px-3 py-2 font-mono">{t.identifier}</td>
                        <td className="px-3 py-2 font-mono text-muted-foreground">
                          {t.token.slice(0, 8)}…
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {t.expires.toLocaleString("pt-BR")}
                          {expired && (
                            <span className="ml-1 text-red-500 font-medium">(expirado)</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {!expired && (
                            <a
                              href={verifyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary underline underline-offset-2 break-all"
                            >
                              Verificar →
                            </a>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <form action={deleteVerificationToken}>
                            <input type="hidden" name="token" value={t.token} />
                            <button
                              type="submit"
                              className="text-red-500 hover:text-red-700 transition-colors"
                            >
                              Remover
                            </button>
                          </form>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── PasswordResets ─────────────────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="text-base font-semibold mb-4">
            Resets de senha{" "}
            <span className="font-normal text-muted-foreground text-sm">({passwordResets.length})</span>
          </h2>
          <p className="text-xs text-muted-foreground mb-3">
            Token armazenado como hash — link de reset não pode ser reconstruído por segurança.
          </p>
          {passwordResets.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum reset no banco.</p>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Usuário</th>
                    <th className="text-left px-3 py-2 font-medium">Hash (mascarado)</th>
                    <th className="text-left px-3 py-2 font-medium">Expira</th>
                    <th className="text-left px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {passwordResets.map((r) => {
                    const expired = r.expiresAt < now;
                    const used = r.usedAt !== null;
                    const status = used ? "usado" : expired ? "expirado" : "válido";
                    const statusColor = used
                      ? "text-muted-foreground"
                      : expired
                      ? "text-red-500"
                      : "text-green-600";
                    return (
                      <tr key={r.id} className={used || expired ? "opacity-50" : ""}>
                        <td className="px-3 py-2 font-mono">
                          {r.user.email}
                        </td>
                        <td className="px-3 py-2 font-mono text-muted-foreground">
                          {r.tokenHash.slice(0, 12)}…
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {r.expiresAt.toLocaleString("pt-BR")}
                        </td>
                        <td className={`px-3 py-2 font-medium ${statusColor}`}>{status}</td>
                        <td className="px-3 py-2 text-right">
                          {!used && (
                            <form action={invalidatePasswordReset}>
                              <input type="hidden" name="id" value={r.id} />
                              <button
                                type="submit"
                                className="text-red-500 hover:text-red-700 transition-colors"
                              >
                                Invalidar
                              </button>
                            </form>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── AuthLogs ───────────────────────────────────────────────────── */}
        <section className="mb-10">
          <div className="flex items-center gap-4 mb-4">
            <h2 className="text-base font-semibold">
              Auth logs{" "}
              <span className="font-normal text-muted-foreground text-sm">({authLogs.length})</span>
            </h2>
            <form method="GET" className="flex items-center gap-2">
              <select
                name="action"
                defaultValue={actionFilter ?? ""}
                className="text-xs border border-border rounded px-2 py-1 bg-background"
              >
                <option value="">Todas as ações</option>
                {(Object.keys(ACTION_LABELS) as AuthAction[]).map((a) => (
                  <option key={a} value={a}>
                    {ACTION_LABELS[a]}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="text-xs px-3 py-1 rounded border border-border hover:bg-muted transition-colors"
              >
                Filtrar
              </button>
              {actionFilter && (
                <Link href="/admin/dev-tools" className="text-xs text-muted-foreground hover:text-foreground">
                  Limpar
                </Link>
              )}
            </form>
          </div>

          {authLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum log encontrado.</p>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Data</th>
                    <th className="text-left px-3 py-2 font-medium">Ação</th>
                    <th className="text-left px-3 py-2 font-medium">Email</th>
                    <th className="text-left px-3 py-2 font-medium">IP</th>
                    <th className="text-left px-3 py-2 font-medium">Metadata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {authLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                        {log.createdAt.toLocaleString("pt-BR")}
                      </td>
                      <td className="px-3 py-2 font-mono font-medium">
                        {log.action}
                      </td>
                      <td className="px-3 py-2 font-mono">{log.email ?? "—"}</td>
                      <td className="px-3 py-2 font-mono text-muted-foreground">{log.ip}</td>
                      <td className="px-3 py-2 text-muted-foreground max-w-48 truncate">
                        {log.metadata ? JSON.stringify(log.metadata) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
