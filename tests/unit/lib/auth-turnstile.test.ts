import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { verifyTurnstile } from "@/lib/auth/turnstile";

describe("verifyTurnstile", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    delete process.env.TURNSTILE_SECRET_KEY;
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("returns true when no TURNSTILE_SECRET_KEY is set (dev mode bypass)", async () => {
    const result = await verifyTurnstile("any-token");
    expect(result).toBe(true);
  });

  it("returns false when secret is configured but token is empty", async () => {
    process.env.TURNSTILE_SECRET_KEY = "1x0000000000000000000000000000000AA";
    const result = await verifyTurnstile("");
    expect(result).toBe(false);
  });

  it("returns true when Cloudflare API returns success:true", async () => {
    process.env.TURNSTILE_SECRET_KEY = "1x0000000000000000000000000000000AA";
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: true }),
    } as never);

    const result = await verifyTurnstile("valid-cf-token");

    expect(result).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
    );
  });

  it("returns false when Cloudflare API returns success:false", async () => {
    process.env.TURNSTILE_SECRET_KEY = "2x0000000000000000000000000000000AB";
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: false }),
    } as never);

    const result = await verifyTurnstile("blocked-token");
    expect(result).toBe(false);
  });

  it("returns false when fetch throws (network error — fail safe)", async () => {
    process.env.TURNSTILE_SECRET_KEY = "some-secret";
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const result = await verifyTurnstile("some-token");
    expect(result).toBe(false);
  });

  it("sends secret and response token in request body", async () => {
    const secretKey = "test-secret-123";
    const cfToken = "user-cf-token-abc";
    process.env.TURNSTILE_SECRET_KEY = secretKey;

    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: true }),
    } as never);

    await verifyTurnstile(cfToken);

    const call = vi.mocked(global.fetch).mock.calls[0];
    const body = JSON.parse(call[1]?.body as string);
    expect(body.secret).toBe(secretKey);
    expect(body.response).toBe(cfToken);
  });
});
