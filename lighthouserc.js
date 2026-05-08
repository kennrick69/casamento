// Lighthouse CI config — roda mobile nas páginas de auth do Bloco A.
// Executado no job smoke do CI após deploy no Railway.
// Scores alvo: >= 90 em Performance, Accessibility, Best Practices, SEO.

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

/** @type {import('@lhci/cli').LighthouseRcConfig} */
module.exports = {
  ci: {
    collect: {
      // Páginas públicas de auth — não requerem sessão
      url: [
        `${BASE_URL}/login`,
        `${BASE_URL}/forgot-password`,
        `${BASE_URL}/termos`,
        `${BASE_URL}/privacidade`,
      ],
      numberOfRuns: 1,
      settings: {
        formFactor: "mobile",
        throttling: {
          rttMs: 40,
          throughputKbps: 10240,
          cpuSlowdownMultiplier: 4,
        },
        screenEmulation: {
          mobile: true,
          width: 390,
          height: 844,
          deviceScaleFactor: 2,
          disabled: false,
        },
        // Evita audits de PWA (não implementado ainda)
        onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
      },
    },
    assert: {
      assertions: {
        // warn = não bloqueia CI, mas aparece no relatório
        "categories:performance": ["warn", { minScore: 0.9 }],
        "categories:accessibility": ["warn", { minScore: 0.9 }],
        "categories:best-practices": ["warn", { minScore: 0.9 }],
        "categories:seo": ["warn", { minScore: 0.9 }],
      },
    },
    upload: {
      // Armazena relatórios em storage temporário público (gratuito, 7 dias)
      target: "temporary-public-storage",
    },
  },
};
