import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getActiveBottomNav } from "@/components/guest/bottom-nav";

const TZ = "America/Sao_Paulo";

// Âncora fixa: domingo 15 jun 2025, 15:00 UTC = 12:00 BRT.
// Usada em todos os testes para garantir resultados determinísticos
// independente do timezone do processo (CI roda em UTC, dev roda em BRT).
const FIXED_NOW = new Date("2025-06-15T15:00:00.000Z");
const TODAY_ISO = "2025-06-15T15:00:00.000Z";
const TOMORROW_ISO = "2025-06-16T15:00:00.000Z";
const YESTERDAY_ISO = "2025-06-14T15:00:00.000Z";
const FUTURE_30D_ISO = "2025-07-15T15:00:00.000Z";
const FAR_FUTURE_ISO = "2099-12-31T12:00:00.000Z";
const PAST_ISO = "2020-01-01T12:00:00.000Z";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("getActiveBottomNav", () => {
  it("returns pre-dday tabs (4) when ceremony is tomorrow", () => {
    const tabs = getActiveBottomNav(TOMORROW_ISO, TZ);
    expect(tabs).toHaveLength(4);
    expect(tabs.map((t) => t.href)).toEqual(["", "/roteiro", "/locais", "/presentes"]);
  });

  it("returns dday-plus tabs (5) when ceremony is today", () => {
    const tabs = getActiveBottomNav(TODAY_ISO, TZ);
    expect(tabs).toHaveLength(5);
    expect(tabs.map((t) => t.href)).toEqual(["", "/mural", "/chat", "/playlist", "/presentes"]);
  });

  it("returns dday-plus tabs (5) when ceremony was yesterday", () => {
    const tabs = getActiveBottomNav(YESTERDAY_ISO, TZ);
    expect(tabs).toHaveLength(5);
    expect(tabs[0]?.label).toBe("Início");
    expect(tabs[1]?.label).toBe("Fotos");
  });

  it("returns pre-dday tabs when ceremony is far in the future", () => {
    const tabs = getActiveBottomNav(FAR_FUTURE_ISO, TZ);
    expect(tabs).toHaveLength(4);
    expect(tabs[1]?.label).toBe("Roteiro");
  });

  it("pre-dday tabs include Local and Roteiro, not Fotos or Chat", () => {
    const tabs = getActiveBottomNav(FUTURE_30D_ISO, TZ);
    const labels = tabs.map((t) => t.label);
    expect(labels).toContain("Roteiro");
    expect(labels).toContain("Locais");
    expect(labels).not.toContain("Fotos");
    expect(labels).not.toContain("Chat");
  });

  it("dday-plus tabs include Fotos and Chat, not Roteiro or Local", () => {
    const tabs = getActiveBottomNav(PAST_ISO, TZ);
    const labels = tabs.map((t) => t.label);
    expect(labels).toContain("Fotos");
    expect(labels).toContain("Chat");
    expect(labels).not.toContain("Roteiro");
    expect(labels).not.toContain("Locais");
  });

  it("both tab sets always start with Início and end with Presentes", () => {
    const preTabs = getActiveBottomNav(FUTURE_30D_ISO, TZ);
    const postTabs = getActiveBottomNav(YESTERDAY_ISO, TZ);

    expect(preTabs[0]?.label).toBe("Início");
    expect(preTabs[preTabs.length - 1]?.label).toBe("Presentes");
    expect(postTabs[0]?.label).toBe("Início");
    expect(postTabs[postTabs.length - 1]?.label).toBe("Presentes");
  });
});
