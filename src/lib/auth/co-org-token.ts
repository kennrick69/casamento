import { createHmac } from "crypto";

const CLAIM_SECRET = process.env.NEXTAUTH_SECRET ?? "build-time-placeholder";

export function signClaimToken(
  eventId: string,
  inviteeEmail: string,
  expiresAt: number
): string {
  const payload = `${eventId}:${inviteeEmail}:${expiresAt}`;
  const sig = createHmac("sha256", CLAIM_SECRET).update(payload).digest("hex");
  return Buffer.from(JSON.stringify({ eventId, inviteeEmail, expiresAt, sig })).toString(
    "base64url"
  );
}

export function verifyClaimToken(
  token: string
): { eventId: string; inviteeEmail: string } | null {
  try {
    const parsed = JSON.parse(Buffer.from(token, "base64url").toString());
    const { eventId, inviteeEmail, expiresAt, sig } = parsed;
    if (Date.now() > expiresAt) return null;
    const expected = createHmac("sha256", CLAIM_SECRET)
      .update(`${eventId}:${inviteeEmail}:${expiresAt}`)
      .digest("hex");
    if (sig !== expected) return null;
    return { eventId, inviteeEmail };
  } catch {
    return null;
  }
}
