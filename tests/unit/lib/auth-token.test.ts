import { describe, it, expect } from "vitest";
import { createHash } from "crypto";
import { hashToken } from "@/lib/auth/token";

describe("hashToken", () => {
  it("produces a 64-char hex string (SHA-256)", () => {
    const result = hashToken("some-uuid-v4-token");
    expect(result).toHaveLength(64);
    expect(result).toMatch(/^[0-9a-f]{64}$/);
  });

  it("matches manual SHA-256 computation", () => {
    const token = "test-reset-token-abc123";
    const expected = createHash("sha256").update(token).digest("hex");
    expect(hashToken(token)).toBe(expected);
  });

  it("is deterministic — same input yields same output", () => {
    const token = "stable-token";
    expect(hashToken(token)).toBe(hashToken(token));
  });

  it("different inputs produce different hashes (collision resistance)", () => {
    expect(hashToken("token-A")).not.toBe(hashToken("token-B"));
  });

  it("handles empty string without throwing", () => {
    const result = hashToken("");
    expect(result).toHaveLength(64);
  });
});
