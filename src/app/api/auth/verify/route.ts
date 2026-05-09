import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logAuthEvent } from "@/lib/auth/auth-log";
import { getAppUrl } from "@/lib/app-url";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const base = getAppUrl();

  if (!token) {
    return NextResponse.redirect(new URL("/verify-email?error=invalid", base));
  }

  const verificationToken = await prisma.verificationToken.findUnique({
    where: { token },
  });

  if (!verificationToken || verificationToken.expires < new Date()) {
    return NextResponse.redirect(new URL("/verify-email?error=expired", base));
  }

  const [user] = await Promise.all([
    prisma.user.update({
      where: { email: verificationToken.identifier },
      data: { emailVerified: new Date() },
      select: { id: true, email: true },
    }),
    prisma.verificationToken.delete({ where: { token } }),
  ]);

  await logAuthEvent({
    action: "EMAIL_VERIFIED",
    ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1",
    email: user.email,
  });

  // Sem auto-login. O usuário faz login manualmente após a verificação.
  const loginUrl = new URL("/login", base);
  loginUrl.searchParams.set("verified", "1");
  return NextResponse.redirect(loginUrl);
}
