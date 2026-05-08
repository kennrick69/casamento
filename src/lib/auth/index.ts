import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Resend from "next-auth/providers/resend";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { authConfig } from "./config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  callbacks: {
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
    async jwt({ token, user }) {
      // No sign-in inicial, o user object está presente — apenas passa o token
      if (user) return token;
      if (!token.sub || !token.iat) return token;

      // Verifica se a senha foi alterada após emissão deste token.
      // Se sim, invalida o token (força re-auth em todos os dispositivos).
      const dbUser = await prisma.user.findUnique({
        where: { id: token.sub },
        select: { passwordChangedAt: true },
      });
      if (dbUser?.passwordChangedAt) {
        const changedAt = Math.floor(dbUser.passwordChangedAt.getTime() / 1000);
        if (changedAt > (token.iat as number)) return null;
      }

      return token;
    },
  },
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.EMAIL_FROM ?? "noreply@example.com",
    }),
    Credentials({
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
      },
      async authorize(credentials) {
        if (
          typeof credentials?.email !== "string" ||
          typeof credentials?.password !== "string"
        ) {
          return null;
        }
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          select: { id: true, email: true, name: true, passwordHash: true },
        });
        if (!user?.passwordHash) return null;
        const valid = await verifyPassword(credentials.password, user.passwordHash);
        if (!valid) return null;
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
});
