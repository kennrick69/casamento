import { describe, it, expect, vi, afterEach } from "vitest";
import { getActiveBottomNav } from "@/components/guest/bottom-nav";

const TZ = "America/Sao_Paulo";

afterEach(() => {
  vi.useRealTimers();
});

describe("getActiveBottomNav", () => {
  it("returns pre-dday tabs (4) when ceremony is tomorrow", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tabs = getActiveBottomNav(tomorrow.toISOString(), TZ);
    expect(tabs).toHaveLength(4);
    expect(tabs.map((t) => t.href)).toEqual(["", "/roteiro", "/locais", "/presentes"]);
  });

  it("returns dday-plus tabs (5) when ceremony is today", () => {
    // Set now to noon so we are clearly in the same day as ceremony
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const tabs = getActiveBottomNav(today.toISOString(), TZ);
    expect(tabs).toHaveLength(5);
    expect(tabs.map((t) => t.href)).toEqual(["", "/mural", "/chat", "/playlist", "/presentes"]);
  });

  it("returns dday-plus tabs (5) when ceremony was yesterday", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const tabs = getActiveBottomNav(yesterday.toISOString(), TZ);
    expect(tabs).toHaveLength(5);
    expect(tabs[0]?.label).toBe("Início");
    expect(tabs[1]?.label).toBe("Fotos");
  });

  it("returns pre-dday tabs when ceremony is far in the future", () => {
    const future = new Date("2099-12-31T12:00:00Z");
    const tabs = getActiveBottomNav(future.toISOString(), TZ);
    expect(tabs).toHaveLength(4);
    expect(tabs[1]?.label).toBe("Roteiro");
  });

  it("pre-dday tabs include Local and Roteiro, not Fotos or Chat", () => {
    const future = new Date();
    future.setDate(future.getDate() + 30);
    const tabs = getActiveBottomNav(future.toISOString(), TZ);
    const labels = tabs.map((t) => t.label);
    expect(labels).toContain("Roteiro");
    expect(labels).toContain("Locais");
    expect(labels).not.toContain("Fotos");
    expect(labels).not.toContain("Chat");
  });

  it("dday-plus tabs include Fotos and Chat, not Roteiro or Local", () => {
    const past = new Date("2020-01-01T12:00:00Z");
    const tabs = getActiveBottomNav(past.toISOString(), TZ);
    const labels = tabs.map((t) => t.label);
    expect(labels).toContain("Fotos");
    expect(labels).toContain("Chat");
    expect(labels).not.toContain("Roteiro");
    expect(labels).not.toContain("Locais");
  });

  it("both tab sets always start with Início and end with Presentes", () => {
    const future = new Date();
    future.setDate(future.getDate() + 10);
    const past = new Date();
    past.setDate(past.getDate() - 10);

    const preTabs = getActiveBottomNav(future.toISOString(), TZ);
    const postTabs = getActiveBottomNav(past.toISOString(), TZ);

    expect(preTabs[0]?.label).toBe("Início");
    expect(preTabs[preTabs.length - 1]?.label).toBe("Presentes");
    expect(postTabs[0]?.label).toBe("Início");
    expect(postTabs[postTabs.length - 1]?.label).toBe("Presentes");
  });
});
