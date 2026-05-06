import { PrismaClient } from "@prisma/client";
import { THEMES } from "../src/lib/themes";
import { nanoid } from "nanoid";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding themes...");

  for (const theme of THEMES) {
    await prisma.theme.upsert({
      where: { key: theme.key },
      update: { name: theme.name, tokens: theme.tokens as object },
      create: { key: theme.key, name: theme.name, tokens: theme.tokens as object },
    });
  }

  console.log("✅ Themes seeded.");

  if (process.env.NODE_ENV === "development") {
    console.log("🌱 Seeding dev event...");

    const classicTheme = await prisma.theme.findUniqueOrThrow({
      where: { key: "classic" },
    });

    await prisma.event.upsert({
      where: { slug: "casamento" },
      update: {},
      create: {
        slug: "casamento",
        title: "Casamento de Exemplo",
        coupleNames: "Ricardo e Juliana",
        coupleLabel: "os noivos",
        ceremonyDate: new Date("2026-11-07T16:00:00.000Z"),
        timezone: "America/Sao_Paulo",
        ceremonyLocation: "Igreja Nossa Senhora da Paz",
        ceremonyAddress: "Rua das Flores, 123 - São Paulo, SP",
        receptionLocation: "Espaço Villa Verde",
        receptionAddress: "Av. das Palmeiras, 456 - São Paulo, SP",
        dresscode: "Social",
        themeId: classicTheme.id,
        publicTokenK: nanoid(16),
        features: {
          rsvp: true,
          mural: true,
          chat: true,
          presentes: true,
          playlist: true,
          gincana: true,
          recados: true,
        },
        donationMode: "TRUST",
      },
    });

    console.log("✅ Dev event seeded: /casamento");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
