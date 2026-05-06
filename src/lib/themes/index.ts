export interface ThemeTokens {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    muted: string;
    border: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  radius: string;
  decorations: {
    pattern: string;
    ornaments: string[];
  };
}

export interface ThemeSeed {
  key: string;
  name: string;
  tokens: ThemeTokens;
}

export const THEMES: ThemeSeed[] = [
  {
    key: "rustic",
    name: "Rústico Campestre",
    tokens: {
      colors: {
        primary: "#7C5C3E",
        secondary: "#A8896A",
        accent: "#C4A882",
        background: "#FAF6F1",
        foreground: "#2C1A0E",
        muted: "#E8DDD0",
        border: "#D4C4B0",
      },
      fonts: { heading: "Fraunces", body: "Lora" },
      radius: "0.375rem",
      decorations: { pattern: "leaves", ornaments: ["branch", "wreath"] },
    },
  },
  {
    key: "classic",
    name: "Clássico Elegante",
    tokens: {
      colors: {
        primary: "#1A1A1A",
        secondary: "#B8972A",
        accent: "#D4AF37",
        background: "#FFFFFF",
        foreground: "#1A1A1A",
        muted: "#F5F5F5",
        border: "#E0E0E0",
      },
      fonts: { heading: "Cormorant Garamond", body: "Inter" },
      radius: "0.25rem",
      decorations: { pattern: "geometric", ornaments: ["flourish", "line"] },
    },
  },
  {
    key: "minimal",
    name: "Moderno Minimalista",
    tokens: {
      colors: {
        primary: "#2D2D2D",
        secondary: "#6B6B6B",
        accent: "#E8A598",
        background: "#FAFAFA",
        foreground: "#1A1A1A",
        muted: "#F0F0F0",
        border: "#E8E8E8",
      },
      fonts: { heading: "Inter", body: "Inter" },
      radius: "0.5rem",
      decorations: { pattern: "none", ornaments: [] },
    },
  },
  {
    key: "boho",
    name: "Boho Natural",
    tokens: {
      colors: {
        primary: "#C4714A",
        secondary: "#8B9E7A",
        accent: "#D4A96A",
        background: "#FDF8F2",
        foreground: "#2A1F14",
        muted: "#EDE4D8",
        border: "#D8CCBD",
      },
      fonts: { heading: "Cormorant Garamond", body: "Caveat" },
      radius: "1rem",
      decorations: { pattern: "botanica", ornaments: ["feather", "moon"] },
    },
  },
  {
    key: "beach",
    name: "Praiano Tropical",
    tokens: {
      colors: {
        primary: "#1B6B8A",
        secondary: "#4A9CB5",
        accent: "#E8C84A",
        background: "#F7FBFC",
        foreground: "#0D2B38",
        muted: "#E0F0F5",
        border: "#C0DFE8",
      },
      fonts: { heading: "DM Serif Display", body: "Inter" },
      radius: "0.75rem",
      decorations: { pattern: "waves", ornaments: ["shell", "palm"] },
    },
  },
];
