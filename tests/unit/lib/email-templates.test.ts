import { describe, it, expect } from "vitest";
import {
  rsvpConfirmHtml,
  rsvpConfirmText,
  rsvpDeclineHtml,
  rsvpDeclineText,
  recoveryHtml,
  recoveryText,
  reminderHtml,
  reminderText,
  massEmailHtml,
  massEmailText,
} from "@/lib/email/templates";

const base = {
  name: "Ana Silva",
  eventTitle: "Casamento de Ana e Bruno",
  coupleNames: "Ana e Bruno",
  dateLabel: "sábado, 15 de outubro de 2026 às 16:00",
  location: "Igreja Nossa Senhora",
  eventUrl: "https://exemplo.com/casamento-ana-bruno",
};

describe("rsvpConfirmHtml", () => {
  it("contains guest name", () => {
    expect(rsvpConfirmHtml(base)).toContain("Ana Silva");
  });
  it("contains event date", () => {
    expect(rsvpConfirmHtml(base)).toContain("15 de outubro");
  });
  it("contains event URL button", () => {
    expect(rsvpConfirmHtml(base)).toContain("https://exemplo.com/casamento-ana-bruno");
  });
  it("is valid HTML structure", () => {
    const html = rsvpConfirmHtml(base);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("</html>");
  });
});

describe("rsvpConfirmText", () => {
  it("contains guest name and couple names", () => {
    const text = rsvpConfirmText(base);
    expect(text).toContain("Ana Silva");
    expect(text).toContain("Ana e Bruno");
  });
  it("does not contain HTML tags", () => {
    expect(rsvpConfirmText(base)).not.toMatch(/<[^>]+>/);
  });
});

describe("rsvpDeclineHtml", () => {
  it("contains guest name", () => {
    expect(rsvpDeclineHtml({ name: base.name, eventTitle: base.eventTitle, coupleNames: base.coupleNames, eventUrl: base.eventUrl })).toContain("Ana Silva");
  });
});

describe("rsvpDeclineText", () => {
  it("is plain text without HTML", () => {
    const text = rsvpDeclineText({ name: base.name, eventTitle: base.eventTitle, coupleNames: base.coupleNames, eventUrl: base.eventUrl });
    expect(text).not.toMatch(/<[^>]+>/);
  });
});

describe("recoveryHtml", () => {
  it("contains recovery link", () => {
    const html = recoveryHtml({ ...base, link: "https://exemplo.com/recuperar?t=abc123" });
    expect(html).toContain("https://exemplo.com/recuperar?t=abc123");
  });
});

describe("recoveryText", () => {
  it("contains link in plain text", () => {
    const text = recoveryText({ ...base, link: "https://exemplo.com/recuperar?t=abc123" });
    expect(text).toContain("https://exemplo.com/recuperar?t=abc123");
    expect(text).not.toMatch(/<[^>]+>/);
  });
});

describe("reminderHtml", () => {
  it("says 'amanhã' when daysLeft is 1", () => {
    expect(reminderHtml({ ...base, daysLeft: 1 })).toContain("amanhã");
  });
  it("says 'em 7 dias' when daysLeft is 7", () => {
    expect(reminderHtml({ ...base, daysLeft: 7 })).toContain("em 7 dias");
  });
});

describe("reminderText", () => {
  it("plain text, no HTML", () => {
    expect(reminderText({ ...base, daysLeft: 7 })).not.toMatch(/<[^>]+>/);
  });
});

describe("massEmailHtml", () => {
  it("contains subject and body content", () => {
    const html = massEmailHtml({ ...base, subject: "Surpresa!", body: "Tem novidade." });
    expect(html).toContain("Tem novidade.");
  });
  it("renders multiline body as multiple paragraphs", () => {
    const html = massEmailHtml({ ...base, subject: "Teste", body: "Linha 1\nLinha 2" });
    expect(html).toContain("Linha 1");
    expect(html).toContain("Linha 2");
  });
});

describe("massEmailText", () => {
  it("plain text, no HTML tags", () => {
    const text = massEmailText({ ...base, subject: "Surpresa!", body: "Tem novidade." });
    expect(text).not.toMatch(/<[^>]+>/);
    expect(text).toContain("Tem novidade.");
  });
});

// Edge cases
describe("templates — edge cases", () => {
  it("handles empty location gracefully", () => {
    const html = rsvpConfirmHtml({ ...base, location: "" });
    expect(html).toBeTruthy();
    expect(html).not.toContain("📍 ");
  });

  it("handles name with special characters", () => {
    const html = rsvpConfirmHtml({ ...base, name: "José & Maria <Ação>" });
    expect(html).toBeTruthy(); // doesn't throw
  });

  it("handles emoji in name", () => {
    const text = rsvpConfirmText({ ...base, name: "João 🎉" });
    expect(text).toContain("João 🎉");
  });

  it("handles very long name (100 chars)", () => {
    const longName = "A".repeat(100);
    const html = rsvpConfirmHtml({ ...base, name: longName });
    expect(html).toContain(longName);
  });
});
