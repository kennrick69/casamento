import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkRateLimit, clearRateLimit } from "@/lib/auth/rate-limit";
import { prisma } from "@/lib/db";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows attempt when count is below limit", async () => {
    vi.mocked(prisma.rateLimitAttempt.count).mockResolvedValue(2);
    vi.mocked(prisma.rateLimitAttempt.create).mockResolvedValue({} as never);

    const result = await checkRateLimit("login:user@test.com", "127.0.0.1", 5, 15);

    expect(result.allowed).toBe(true);
    expect(prisma.rateLimitAttempt.create).toHaveBeenCalledOnce();
  });

  it("allows first attempt (count = 0)", async () => {
    vi.mocked(prisma.rateLimitAttempt.count).mockResolvedValue(0);
    vi.mocked(prisma.rateLimitAttempt.create).mockResolvedValue({} as never);

    const result = await checkRateLimit("signup:1.2.3.4", "1.2.3.4", 3, 60);

    expect(result.allowed).toBe(true);
    expect(prisma.rateLimitAttempt.create).toHaveBeenCalledOnce();
  });

  it("blocks when count equals max attempts", async () => {
    vi.mocked(prisma.rateLimitAttempt.count).mockResolvedValue(5);
    vi.mocked(prisma.rateLimitAttempt.findFirst).mockResolvedValue({
      id: "1",
      key: "login:user@test.com",
      ip: "127.0.0.1",
      createdAt: new Date(Date.now() - 60_000), // 1 min ago
      userAgent: null,
    } as never);

    const result = await checkRateLimit("login:user@test.com", "127.0.0.1", 5, 15);

    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.retryAfterSeconds).toBeGreaterThan(0);
    }
  });

  it("does not record attempt when blocked", async () => {
    vi.mocked(prisma.rateLimitAttempt.count).mockResolvedValue(3);
    vi.mocked(prisma.rateLimitAttempt.findFirst).mockResolvedValue({
      id: "1", key: "k", ip: "1.2.3.4",
      createdAt: new Date(), userAgent: null,
    } as never);

    await checkRateLimit("forgot:1.2.3.4", "1.2.3.4", 3, 60);

    expect(prisma.rateLimitAttempt.create).not.toHaveBeenCalled();
  });

  it("retryAfterSeconds reflects remaining window", async () => {
    const windowMinutes = 15;
    const windowMs = windowMinutes * 60 * 1000;
    const oldestCreatedAt = new Date(Date.now() - 60_000); // 1 min into window
    const expectedRetry = Math.ceil((oldestCreatedAt.getTime() + windowMs - Date.now()) / 1000);

    vi.mocked(prisma.rateLimitAttempt.count).mockResolvedValue(3);
    vi.mocked(prisma.rateLimitAttempt.findFirst).mockResolvedValue({
      id: "1", key: "k", ip: "1.2.3.4",
      createdAt: oldestCreatedAt, userAgent: null,
    } as never);

    const result = await checkRateLimit("key", "1.2.3.4", 3, windowMinutes);

    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      // Allow 3s tolerance for test execution time
      expect(Math.abs(result.retryAfterSeconds - expectedRetry)).toBeLessThan(3);
    }
  });
});

describe("clearRateLimit", () => {
  it("deletes all attempts for the given key", async () => {
    vi.mocked(prisma.rateLimitAttempt.deleteMany).mockResolvedValue({ count: 3 } as never);

    await clearRateLimit("login:user@test.com");

    expect(prisma.rateLimitAttempt.deleteMany).toHaveBeenCalledWith({
      where: { key: "login:user@test.com" },
    });
  });
});
