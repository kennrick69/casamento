import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
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
    Credentials({
      id: "credentials",
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
    // Magic link sem senha. Substitui o provider Resend nativo do Auth.js v5 beta,
    // que tinha bug de não setar a sessão JWT após o callback de verificação.
    // Aqui validamos o token contra a tabela VerificationToken e retornamos o user
    // diretamente — o restante do fluxo (encode JWT, set cookie, redirect) usa o
    // mesmo caminho do credentials, que já funciona.
    Credentials({
      id: "magic-link",
      name: "Magic Link",
      credentials: {
        token: { type: "text" },
      },
      async authorize(credentials) {
        const token = typeof credentials?.token === "string" ? credentials.token : null;
        if (!token) return null;
        const vt = await prisma.verificationToken.findUnique({ where: { token } });
        if (!vt || vt.expires < new Date()) return null;
        await prisma.verificationToken.delete({ where: { token } });
        const user = await prisma.user.findUnique({
          where: { email: vt.identifier },
          select: { id: true, email: true, name: true, emailVerified: true },
        });
        if (!user) return null;
        if (!user.emailVerified) {
          await prisma.user.update({
            where: { id: user.id },
            data: { emailVerified: new Date() },
          });
          return { ...user, emailVerified: new Date() };
        }
        return user;
      },
    }),
  ],
});
