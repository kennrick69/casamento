import { describe, it, expect, beforeAll } from "vitest";
import { signClaimToken, verifyClaimToken } from "@/lib/auth/co-org-token";

beforeAll(() => {
  process.env.NEXTAUTH_SECRET = "test-secret-for-unit-tests-32chars!!";
});

describe("signClaimToken + verifyClaimToken", () => {
  it("round-trips a valid token", () => {
    const expiresAt = Date.now() + 86_400_000; // 24h
    const token = signClaimToken("event-123", "test@example.com", expiresAt);
    const result = verifyClaimToken(token);
    expect(result).not.toBeNull();
    expect(result?.eventId).toBe("event-123");
    expect(result?.inviteeEmail).toBe("test@example.com");
  });

  it("returns null for expired token", () => {
    const expiresAt = Date.now() - 1000; // already expired
    const token = signClaimToken("event-123", "test@example.com", expiresAt);
    expect(verifyClaimToken(token)).toBeNull();
  });

  it("returns null for tampered token", () => {
    const expiresAt = Date.now() + 86_400_000;
    const token = signClaimToken("event-123", "test@example.com", expiresAt);
    const tampered = token.slice(0, -4) + "XXXX";
    expect(verifyClaimToken(tampered)).toBeNull();
  });

  it("returns null for completely invalid string", () => {
    expect(verifyClaimToken("not-a-token")).toBeNull();
    expect(verifyClaimToken("")).toBeNull();
  });

  it("different events produce different tokens", () => {
    const expiresAt = Date.now() + 86_400_000;
    const t1 = signClaimToken("event-A", "a@b.com", expiresAt);
    const t2 = signClaimToken("event-B", "a@b.com", expiresAt);
    expect(t1).not.toBe(t2);
  });

  it("different emails produce different tokens", () => {
    const expiresAt = Date.now() + 86_400_000;
    const t1 = signClaimToken("event-X", "alice@b.com", expiresAt);
    const t2 = signClaimToken("event-X", "bob@b.com", expiresAt);
    expect(t1).not.toBe(t2);
  });
});

// Edge cases
describe("signClaimToken — edge cases", () => {
  it("handles email with + alias", () => {
    const expiresAt = Date.now() + 86_400_000;
    const token = signClaimToken("e1", "user+alias@example.com", expiresAt);
    const result = verifyClaimToken(token);
    expect(result?.inviteeEmail).toBe("user+alias@example.com");
  });

  it("handles unicode in email domain (IDN)", () => {
    const expiresAt = Date.now() + 86_400_000;
    const token = signClaimToken("e1", "user@例え.jp", expiresAt);
    const result = verifyClaimToken(token);
    expect(result?.inviteeEmail).toBe("user@例え.jp");
  });

  it("token just before expiry is still valid", () => {
    const expiresAt = Date.now() + 100; // 100ms in the future
    const token = signClaimToken("e1", "a@b.com", expiresAt);
    expect(verifyClaimToken(token)).not.toBeNull();
  });
});
