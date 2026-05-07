import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts", "tests/scenarios/**/*.test.ts"],
    exclude: ["tests/e2e/**", "tests/a11y/**", "tests/visual/**", "tests/load/**"],
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/lib/**/*.ts", "src/app/**/actions.ts"],
      exclude: ["src/lib/db/**", "src/lib/auth/index.ts"],
    },
    setupFiles: ["tests/unit/setup.ts"],
  },
});
