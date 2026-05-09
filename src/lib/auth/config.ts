// Edge-safe Auth.js config — sem imports Node.js (argon2, Prisma, etc.)
// Usado pelo middleware. Providers com deps nativas ficam em index.ts.
import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  secret: process.env.NEXTAUTH_SECRET ?? "build-time-placeholder",
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    verifyRequest: "/verify",
    error: "/login",
  },
  callbacks: {
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      session.user.emailVerified = (token.emailVerified as Date | null) ?? null;
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
