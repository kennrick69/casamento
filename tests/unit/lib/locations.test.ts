import { describe, it, expect } from "vitest";
import { generateMapsLink, generateWazeLink, LOCATION_TYPE_LABELS, LOCATION_TYPE_ICONS } from "@/lib/locations";

describe("generateMapsLink", () => {
  it("encodes address into maps URL", () => {
    const url = generateMapsLink("Rua das Flores, 100 — São Paulo, SP");
    expect(url).toMatch(/^https:\/\/maps\.google\.com\/\?q=/);
    expect(url).toContain(encodeURIComponent("Rua das Flores, 100 — São Paulo, SP"));
  });

  it("handles empty string gracefully", () => {
    const url = generateMapsLink("");
    expect(url).toBe("https://maps.google.com/?q=");
  });

  it("encodes special characters", () => {
    const url = generateMapsLink("Av. Brasil & Cia, 1º andar");
    expect(url).not.toContain(" ");
    expect(url).not.toContain("&");
  });
});

describe("generateWazeLink", () => {
  it("encodes address into waze URL", () => {
    const url = generateWazeLink("Igreja São João");
    expect(url).toMatch(/^https:\/\/waze\.com\/ul\?q=/);
    expect(url).toContain(encodeURIComponent("Igreja São João"));
  });

  it("produces different URL from maps", () => {
    const addr = "Rua Teste, 1";
    expect(generateWazeLink(addr)).not.toBe(generateMapsLink(addr));
  });
});

describe("LOCATION_TYPE_LABELS", () => {
  it("covers all expected types", () => {
    const expectedTypes = ["CEREMONY", "RECEPTION", "TEA_PARTY", "BACHELOR_PARTY", "BRUNCH", "REHEARSAL", "OTHER"];
    for (const t of expectedTypes) {
      expect(LOCATION_TYPE_LABELS[t as keyof typeof LOCATION_TYPE_LABELS]).toBeTruthy();
    }
  });

  it("returns Portuguese labels", () => {
    expect(LOCATION_TYPE_LABELS.CEREMONY).toBe("Cerimônia");
    expect(LOCATION_TYPE_LABELS.RECEPTION).toBe("Recepção");
  });
});

describe("LOCATION_TYPE_ICONS", () => {
  it("has an icon for every label key", () => {
    const labelKeys = Object.keys(LOCATION_TYPE_LABELS);
    const iconKeys = Object.keys(LOCATION_TYPE_ICONS);
    expect(iconKeys.sort()).toEqual(labelKeys.sort());
  });

  it("icons are single emoji strings", () => {
    for (const icon of Object.values(LOCATION_TYPE_ICONS)) {
      expect(typeof icon).toBe("string");
      expect(icon.length).toBeGreaterThan(0);
    }
  });
});
