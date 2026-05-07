-- Bloco A.1 — Auth profissional: schema e migration
-- Adiciona campos de auth, LGPD, audit no User.
-- Cria modelos PasswordReset, RateLimitAttempt, AuthLog.

-- ── 1. Tornar name nullable (compatibilidade Auth.js) ────────────────────────
ALTER TABLE "User" ALTER COLUMN "name" DROP NOT NULL;

-- ── 2. Adicionar novos campos ao User ────────────────────────────────────────
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "emailVerified"       TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "image"               TEXT,
  ADD COLUMN IF NOT EXISTS "passwordHash"        TEXT,
  ADD COLUMN IF NOT EXISTS "firstName"           TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "lastName"            TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "marketingOptIn"      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "profileCompleted"    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "termsAcceptedAt"     TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "termsVersion"        TEXT,
  ADD COLUMN IF NOT EXISTS "privacyAcceptedAt"   TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "privacyVersion"      TEXT,
  ADD COLUMN IF NOT EXISTS "acceptanceIp"        TEXT,
  ADD COLUMN IF NOT EXISTS "lastLoginAt"         TIMESTAMP(3);

-- ── 3. Data migration: usuarios existentes ───────────────────────────────────
-- firstName = tudo que estiver em name (sem split, conforme decisão do usuário)
-- onboardingCompleted = true (já estão usando a plataforma)
-- profileCompleted permanece false (modal vai pedir firstName/lastName/phone separados)
UPDATE "User"
SET
  "firstName"           = COALESCE("name", ''),
  "onboardingCompleted" = true
WHERE "firstName" = '';

-- ── 4. Criar enum AuthAction ─────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "AuthAction" AS ENUM (
    'SIGNUP_STARTED',
    'SIGNUP_COMPLETED',
    'EMAIL_VERIFIED',
    'LOGIN_SUCCESS',
    'LOGIN_FAILED',
    'PASSWORD_RESET_REQUESTED',
    'PASSWORD_RESET_COMPLETED',
    'PASSWORD_CHANGED',
    'EMAIL_CHANGED',
    'LOGOUT',
    'RATE_LIMITED',
    'CAPTCHA_FAILED',
    'HONEYPOT_TRIGGERED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 5. Criar tabela PasswordReset ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "PasswordReset" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt"    TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PasswordReset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PasswordReset_tokenHash_key" ON "PasswordReset"("tokenHash");
CREATE INDEX IF NOT EXISTS "PasswordReset_tokenHash_idx"        ON "PasswordReset"("tokenHash");
CREATE INDEX IF NOT EXISTS "PasswordReset_userId_idx"           ON "PasswordReset"("userId");

ALTER TABLE "PasswordReset"
  DROP CONSTRAINT IF EXISTS "PasswordReset_userId_fkey";
ALTER TABLE "PasswordReset"
  ADD CONSTRAINT "PasswordReset_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── 6. Criar tabela RateLimitAttempt ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "RateLimitAttempt" (
  "id"        TEXT NOT NULL,
  "key"       TEXT NOT NULL,
  "ip"        TEXT NOT NULL,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RateLimitAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "RateLimitAttempt_key_createdAt_idx" ON "RateLimitAttempt"("key", "createdAt");
CREATE INDEX IF NOT EXISTS "RateLimitAttempt_ip_createdAt_idx"  ON "RateLimitAttempt"("ip",  "createdAt");

-- ── 7. Criar tabela AuthLog ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "AuthLog" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT,
  "email"     TEXT,
  "action"    "AuthAction" NOT NULL,
  "ip"        TEXT NOT NULL,
  "userAgent" TEXT,
  "metadata"  JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuthLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AuthLog_userId_createdAt_idx" ON "AuthLog"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuthLog_email_createdAt_idx"  ON "AuthLog"("email",  "createdAt");
CREATE INDEX IF NOT EXISTS "AuthLog_action_createdAt_idx" ON "AuthLog"("action", "createdAt");

ALTER TABLE "AuthLog"
  DROP CONSTRAINT IF EXISTS "AuthLog_userId_fkey";
ALTER TABLE "AuthLog"
  ADD CONSTRAINT "AuthLog_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
