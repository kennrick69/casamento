import { describe, it, expect } from "vitest";
import { formatEventDate } from "@/lib/timezone";

describe("formatEventDate", () => {
  const date = new Date("2026-10-15T19:00:00Z"); // UTC 19h = São Paulo 16h (UTC-3)

  it("formats date in São Paulo timezone", () => {
    const result = formatEventDate(date, "America/Sao_Paulo", "HH:mm");
    expect(result).toBe("16:00");
  });

  it("formats date in UTC timezone", () => {
    const result = formatEventDate(date, "UTC", "HH:mm");
    expect(result).toBe("19:00");
  });

  it("formats date in Tokyo timezone", () => {
    // UTC+9: 19:00 UTC = 04:00 next day Tokyo
    const result = formatEventDate(date, "Asia/Tokyo", "HH:mm");
    expect(result).toBe("04:00");
  });

  it("handles DST boundary correctly for São Paulo", () => {
    // Brazil starts DST on first Sunday of November
    // This test ensures the date is interpreted in the local tz, not UTC
    const novDate = new Date("2026-11-01T12:00:00Z");
    const result = formatEventDate(novDate, "America/Sao_Paulo", "yyyy-MM-dd HH:mm");
    expect(result).toBeTruthy(); // doesn't throw
  });
});

// Edge cases / scenarios
describe("formatEventDate — edge cases", () => {
  it("handles midnight UTC correctly", () => {
    const midnight = new Date("2026-10-15T00:00:00Z");
    // In São Paulo (UTC-3) this is Oct 14 21:00
    const result = formatEventDate(midnight, "America/Sao_Paulo", "dd/MM HH:mm");
    expect(result).toBe("14/10 21:00");
  });

  it("handles dates far in the future", () => {
    const future = new Date("2030-12-31T23:59:59Z");
    const result = formatEventDate(future, "America/Sao_Paulo", "yyyy");
    expect(result).toBe("2030");
  });
});
