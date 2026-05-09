import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Resend from "next-auth/providers/resend";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { email as emailService } from "@/lib/email";
import { magicLinkLoginHtml, magicLinkLoginText } from "@/lib/email/templates";
import { authConfig } from "./config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  callbacks: {
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      session.user.emailVerified = (token.emailVerified as Date | null) ?? null;
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        // Sign-in inicial: captura emailVerified direto do objeto de usuário
        token.emailVerified = (user as { emailVerified?: Date | null }).emailVerified ?? null;
        return token;
      }
      if (!token.sub || !token.iat) return token;

      // Refresh: verifica senha alterada e atualiza emailVerified do banco
      const dbUser = await prisma.user.findUnique({
        where: { id: token.sub },
        select: { passwordChangedAt: true, emailVerified: true },
      });
      if (dbUser?.passwordChangedAt) {
        const changedAt = Math.floor(dbUser.passwordChangedAt.getTime() / 1000);
        if (changedAt > (token.iat as number)) return null;
      }
      token.emailVerified = dbUser?.emailVerified ?? null;

      return token;
    },
  },
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.EMAIL_FROM ?? "noreply@example.com",
      // Override do template default (inglês) — usa nosso layout PT-BR + serviço de
      // email centralizado pra garantir mesmo formato e idempotency-key.
      async sendVerificationRequest({ identifier, url }) {
        await emailService.send({
          to: identifier,
          subject: "Acessar sua conta no Voem.",
          html: magicLinkLoginHtml({ email: identifier, url }),
          text: magicLinkLoginText({ email: identifier, url }),
        });
      },
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
          select: { id: true, email: true, name: true, passwordHash: true, emailVerified: true },
        });
        if (!user?.passwordHash) return null;
        const valid = await verifyPassword(credentials.password, user.passwordHash);
        if (!valid) return null;
        return { id: user.id, email: user.email, name: user.name, emailVerified: user.emailVerified };
      },
    }),
  ],
});
