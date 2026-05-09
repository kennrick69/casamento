import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Guard 1: /admin exige autenticação
  if (pathname.startsWith("/admin") && !req.auth) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("callbackUrl", pathname);
    return Response.redirect(loginUrl);
  }

  // Guard 2: /admin exige email verificado (só em produção)
  // Cookie "email-just-verified" evita loop imediatamente após clicar no link
  const isProd = process.env.NODE_ENV === "production";
  const justVerified = req.cookies.get("email-just-verified")?.value === "1";
  if (
    isProd &&
    pathname.startsWith("/admin") &&
    req.auth &&
    !req.auth.user?.emailVerified &&
    !justVerified
  ) {
    const verifyUrl = req.nextUrl.clone();
    verifyUrl.pathname = "/verify-email";
    verifyUrl.search = "";
    return Response.redirect(verifyUrl);
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|manifest.json|sw.js).*)"],
};
