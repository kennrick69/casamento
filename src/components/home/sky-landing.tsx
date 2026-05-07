"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Sun, Moon } from "lucide-react";

type Theme = "light" | "dark";

const PALETTE = {
  light: {
    bg: "linear-gradient(180deg, #a8c8e0 0%, #d4e4f0 55%, #f5c89a 100%)",
    celestial: { color: "#f7a825", shadow: "0 0 80px 24px rgba(247,168,37,0.35)" },
    textHero: "#1a2942",
    textSub: "#3d4a6b",
    textMuted: "rgba(61,74,107,0.65)",
    ctaBg: "#1a2942",
    ctaText: "#f5f0e8",
    ctaHover: "#2d3d5a",
    secondaryColor: "rgba(26,41,66,0.55)",
    toggleBg: "rgba(255,255,255,0.28)",
    toggleBorder: "rgba(255,255,255,0.5)",
    toggleColor: "#1a2942",
    footerColor: "rgba(26,41,66,0.4)",
    footerDivider: "rgba(26,41,66,0.12)",
  },
  dark: {
    bg: "linear-gradient(180deg, #1a2942 0%, #24354f 55%, #3d4a6b 100%)",
    celestial: { color: "#e8c89a", shadow: "0 0 80px 24px rgba(232,200,154,0.12)" },
    textHero: "#f0ece8",
    textSub: "#c8b8a8",
    textMuted: "rgba(200,184,168,0.6)",
    ctaBg: "#e8c89a",
    ctaText: "#1a2942",
    ctaHover: "#f5d8aa",
    secondaryColor: "rgba(200,184,168,0.55)",
    toggleBg: "rgba(0,0,0,0.25)",
    toggleBorder: "rgba(255,255,255,0.15)",
    toggleColor: "#e8c89a",
    footerColor: "rgba(200,184,168,0.4)",
    footerDivider: "rgba(200,184,168,0.1)",
  },
};

function systemTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function SkyLanding() {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Leitura de localStorage no cliente para evitar mismatch de hidratação —
    // padrão correto para APIs de browser não disponíveis no servidor.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme((localStorage.getItem("voem-theme") as Theme | null) ?? systemTheme());
    setMounted(true);
  }, []);

  function toggle() {
    const next: Theme = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("voem-theme", next);
  }

  const p = PALETTE[theme];

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: p.bg,
        transition: "background 0.6s ease",
      }}
    >
      {/* Toggle */}
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "20px 24px 0" }}>
        {mounted && (
          <button
            onClick={toggle}
            aria-label={theme === "light" ? "Ativar modo noturno" : "Ativar modo diurno"}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              borderRadius: "999px",
              border: `1px solid ${p.toggleBorder}`,
              background: p.toggleBg,
              color: p.toggleColor,
              cursor: "pointer",
              fontSize: "13px",
              fontFamily: "var(--font-inter, sans-serif)",
              backdropFilter: "blur(8px)",
              transition: "all 0.3s ease",
            }}
          >
            {theme === "light" ? <Moon size={14} /> : <Sun size={14} />}
            {theme === "light" ? "Noite" : "Dia"}
          </button>
        )}
      </div>

      {/* Main */}
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 24px 32px",
          textAlign: "center",
          gap: "0",
        }}
      >
        {/* Celestial body — sol ou lua */}
        <div
          style={{
            width: "52px",
            height: "52px",
            borderRadius: "50%",
            background: p.celestial.color,
            boxShadow: p.celestial.shadow,
            marginBottom: "40px",
            transition: "all 0.6s ease",
          }}
          aria-hidden="true"
        />

        {/* Hero */}
        <h1
          style={{
            fontFamily: "var(--font-cormorant, Georgia, serif)",
            fontStyle: "italic",
            fontWeight: 300,
            fontSize: "clamp(72px, 18vw, 130px)",
            lineHeight: 1,
            letterSpacing: "-0.02em",
            color: p.textHero,
            margin: 0,
            transition: "color 0.6s ease",
          }}
        >
          Voem.
        </h1>

        <p
          style={{
            fontFamily: "var(--font-inter, sans-serif)",
            fontSize: "clamp(13px, 3.5vw, 16px)",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: p.textSub,
            margin: "16px 0 0",
            fontWeight: 400,
            transition: "color 0.6s ease",
          }}
        >
          juntos, na altura que quiserem
        </p>

        {/* Divider */}
        <div
          style={{
            width: "40px",
            height: "1px",
            background: p.footerDivider,
            margin: "40px auto",
          }}
          aria-hidden="true"
        />

        {/* Subtexto */}
        <p
          style={{
            fontFamily: "var(--font-inter, sans-serif)",
            fontSize: "clamp(14px, 3.8vw, 17px)",
            lineHeight: 1.65,
            color: p.textSub,
            maxWidth: "340px",
            margin: "0 auto 40px",
            transition: "color 0.6s ease",
          }}
        >
          A plataforma gratuita para criar o convite digital do casamento dos seus sonhos.
        </p>

        {/* CTAs */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "14px" }}>
          <Link
            href="/admin"
            style={{
              display: "inline-block",
              padding: "16px 40px",
              background: p.ctaBg,
              color: p.ctaText,
              borderRadius: "999px",
              fontFamily: "var(--font-inter, sans-serif)",
              fontSize: "15px",
              fontWeight: 500,
              textDecoration: "none",
              letterSpacing: "0.02em",
              transition: "background 0.3s ease, color 0.3s ease",
            }}
          >
            Criar meu evento
          </Link>

          <p
            style={{
              fontFamily: "var(--font-inter, sans-serif)",
              fontSize: "13px",
              color: p.secondaryColor,
              margin: 0,
              maxWidth: "260px",
              lineHeight: 1.5,
              transition: "color 0.6s ease",
            }}
          >
            Recebeu um QR code?{" "}
            <span style={{ fontStyle: "italic" }}>Use o link do convite.</span>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "24px",
          padding: "20px 24px",
          borderTop: `1px solid ${p.footerDivider}`,
          transition: "border-color 0.6s ease",
        }}
      >
        <Link
          href="/privacidade"
          style={{
            fontFamily: "var(--font-inter, sans-serif)",
            fontSize: "11px",
            color: p.footerColor,
            textDecoration: "none",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            transition: "color 0.3s ease",
          }}
        >
          Privacidade
        </Link>
        <Link
          href="/termos"
          style={{
            fontFamily: "var(--font-inter, sans-serif)",
            fontSize: "11px",
            color: p.footerColor,
            textDecoration: "none",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            transition: "color 0.3s ease",
          }}
        >
          Termos
        </Link>
      </footer>
    </div>
  );
}
