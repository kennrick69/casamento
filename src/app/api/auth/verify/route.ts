import { type NextRequest, NextResponse } from "next/server";
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

  await prisma.user.update({
    where: { email: verificationToken.identifier },
    data: { emailVerified: new Date() },
  });

  await prisma.verificationToken.delete({ where: { token } });

  await logAuthEvent({
    action: "EMAIL_VERIFIED",
    ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1",
    email: verificationToken.identifier,
  });

  const response = NextResponse.redirect(new URL("/admin/onboarding", base));
  // Cookie de 60s para o middleware saber que o email acabou de ser verificado,
  // evitando redirect loop antes do JWT ser atualizado com emailVerified do banco.
  response.cookies.set("email-just-verified", "1", {
    maxAge: 60,
    httpOnly: true,
    path: "/",
    sameSite: "lax",
  });
  return response;
}
