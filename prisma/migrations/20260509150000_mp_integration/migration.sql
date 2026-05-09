-- Add MERCADO_PAGO to DonationMode enum
ALTER TYPE "DonationMode" ADD VALUE 'MERCADO_PAGO';

-- Add PAYMENT_WEBHOOK to AuthAction enum
ALTER TYPE "AuthAction" ADD VALUE 'PAYMENT_WEBHOOK';

-- Add Mercado Pago credential fields to Event
ALTER TABLE "Event" ADD COLUMN "mpPublicKey"     TEXT;
ALTER TABLE "Event" ADD COLUMN "mpAccessToken"   TEXT;
ALTER TABLE "Event" ADD COLUMN "mpEnabled"       BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Event" ADD COLUMN "mpWebhookSecret" TEXT;

-- Add giftId to Donation (optional FK)
ALTER TABLE "Donation" ADD COLUMN "giftId" TEXT;
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_giftId_fkey"
  FOREIGN KEY ("giftId") REFERENCES "Gift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Index on gatewayPaymentId for webhook lookups
CREATE INDEX "Donation_gatewayPaymentId_idx" ON "Donation"("gatewayPaymentId");
