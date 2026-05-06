import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/lib/i18n/index.ts");

const nextConfig: NextConfig = {
  // Não expor stack trace em produção
  serverExternalPackages: ["@prisma/client"],
};

export default withNextIntl(nextConfig);
