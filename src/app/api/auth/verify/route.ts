import { type NextRequest, NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import { prisma } from "@/lib/db";
import { logAuthEvent } from "@/lib/auth/auth-log";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const base = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? new URL(request.url).origin;

  if (!token) {
    return NextResponse.redirect(new URL("/verify-email?error=invalid", base));
  }

  const verificationToken = await prisma.verificationToken.findUnique({
    where: { token },
  });

  if (!verificationToken || verificationToken.expires < new Date()) {
    return NextResponse.redirect(new URL("/verify-email?error=expired", base));
  }

  const now = new Date();

  const [user] = await Promise.all([
    prisma.user.update({
      where: { email: verificationToken.identifier },
      data: { emailVerified: now },
      select: { id: true, email: true, name: true },
    }),
    prisma.verificationToken.delete({ where: { token } }),
  ]);

  await logAuthEvent({
    action: "EMAIL_VERIFIED",
    ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1",
    email: verificationToken.identifier,
  });

  const response = NextResponse.redirect(new URL("/admin/onboarding", base));

  // Auto-sign-in: cria sessão JWT válida para que o clique no link
  // seja suficiente para autenticar — funciona mesmo em browser sem sessão
  // (caso de uso: link aberto pelo Gmail mobile em browser isolado).
  try {
    const isSecure = base.startsWith("https");
    const cookieName = isSecure
      ? "__Secure-authjs.session-token"
      : "authjs.session-token";
    const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "";
    const maxAge = 30 * 24 * 60 * 60; // 30 dias

    const sessionToken = await encode({
      token: {
        sub: user.id,
        email: user.email,
        name: user.name,
        emailVerified: now,
      },
      secret,
      salt: cookieName,
      maxAge,
    });

    response.cookies.set(cookieName, sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      maxAge,
      secure: isSecure,
      path: "/",
    });
  } catch {
    // Fallback: sem auto-login, usuário precisará logar manualmente
  }

  return response;
}
