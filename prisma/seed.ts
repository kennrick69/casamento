import { PrismaClient, RsvpStatus } from "@prisma/client";
import { THEMES } from "../src/lib/themes";

const prisma = new PrismaClient();

async function main() {
  // ─── Temas ────────────────────────────────────────────────────────────────
  console.log("🎨 Seeding temas...");
  for (const theme of THEMES) {
    await prisma.theme.upsert({
      where: { key: theme.key },
      update: { name: theme.name, tokens: theme.tokens as object },
      create: { key: theme.key, name: theme.name, tokens: theme.tokens as object },
    });
  }
  console.log("   ✓ 5 temas");

  // ─── Evento de desenvolvimento ────────────────────────────────────────────
  console.log("📅 Seeding evento de desenvolvimento...");

  const minimalTheme = await prisma.theme.findUniqueOrThrow({
    where: { key: "minimal" },
  });

  const today = new Date();
  const ceremonyDate = new Date(today);
  ceremonyDate.setDate(today.getDate() + 150);
  ceremonyDate.setUTCHours(19, 0, 0, 0);

  const rsvpEarlyDeadline = new Date(today);
  rsvpEarlyDeadline.setDate(today.getDate() + 90);

  const event = await prisma.event.upsert({
    where: { slug: "casamento-exemplo" },
    update: {
      title: "Casamento de Ana e Bruno",
      coupleNames: "Ana e Bruno",
      coupleLabel: "os noivos",
      ceremonyDate,
      timezone: "America/Sao_Paulo",
      ceremonyLocation: "Igreja São Francisco de Assis",
      ceremonyAddress: "Rua das Flores, 123 — São Paulo, SP",
      receptionLocation: "Espaço Villa Jardim",
      receptionAddress: "Av. das Palmeiras, 456 — São Paulo, SP",
      mapsLink: "https://maps.google.com",
      dresscode: "Social",
      description:
        "Venha celebrar conosco este momento tão especial. Será uma noite inesquecível, cheia de amor, alegria e muita festa!",
      paletteColors: {
        primary: "#2D2D2D",
        accent: "#E8A598",
        background: "#FAFAFA",
      },
      themeId: minimalTheme.id,
      status: "PUBLISHED",
      features: {
        rsvp: true,
        mural: true,
        chat: true,
        gincana: true,
        presentes: true,
        roteiro: true,
        playlist: true,
        recados: true,
      },
      donationMode: "TRUST",
      rsvpEarlyDeadline,
      pointsPerCurrencyUnit: 0.1,
    },
    create: {
      slug: "casamento-exemplo",
      title: "Casamento de Ana e Bruno",
      coupleNames: "Ana e Bruno",
      coupleLabel: "os noivos",
      ceremonyDate,
      timezone: "America/Sao_Paulo",
      ceremonyLocation: "Igreja São Francisco de Assis",
      ceremonyAddress: "Rua das Flores, 123 — São Paulo, SP",
      receptionLocation: "Espaço Villa Jardim",
      receptionAddress: "Av. das Palmeiras, 456 — São Paulo, SP",
      mapsLink: "https://maps.google.com",
      dresscode: "Social",
      description:
        "Venha celebrar conosco este momento tão especial. Será uma noite inesquecível, cheia de amor, alegria e muita festa!",
      paletteColors: {
        primary: "#2D2D2D",
        accent: "#E8A598",
        background: "#FAFAFA",
      },
      themeId: minimalTheme.id,
      status: "PUBLISHED",
      features: {
        rsvp: true,
        mural: true,
        chat: true,
        gincana: true,
        presentes: true,
        roteiro: true,
        playlist: true,
        recados: true,
      },
      donationMode: "TRUST",
      publicTokenK: "dev-token-casamento-exemplo",
      rsvpEarlyDeadline,
      pointsPerCurrencyUnit: 0.1,
    },
  });

  console.log(`   ✓ Evento: /casamento-exemplo (id: ${event.id})`);

  // ─── Roteiro ──────────────────────────────────────────────────────────────
  console.log("🗓  Seeding roteiro...");

  const journeyItems = [
    { time: "16:00", title: "Chegada dos convidados", icon: "door-open", order: 1 },
    { time: "17:00", title: "Cerimônia", description: "Cerimônia religiosa na Igreja São Francisco de Assis", icon: "heart", order: 2 },
    { time: "18:30", title: "Coquetel", description: "Drinks e canapés no jardim", icon: "wine", order: 3 },
    { time: "20:00", title: "Jantar", description: "Jantar servido no salão principal", icon: "utensils", order: 4 },
    { time: "22:00", title: "Festa", description: "Dança, música e muita alegria até o amanhecer!", icon: "music", order: 5 },
  ];

  for (const item of journeyItems) {
    const existing = await prisma.journeyItem.findFirst({
      where: { eventId: event.id, order: item.order },
    });
    if (!existing) {
      await prisma.journeyItem.create({ data: { eventId: event.id, ...item } });
    } else {
      await prisma.journeyItem.update({ where: { id: existing.id }, data: item });
    }
  }
  console.log("   ✓ 5 itens de roteiro");

  // ─── Presentes ────────────────────────────────────────────────────────────
  console.log("🎁 Seeding lista de presentes...");

  const gifts = [
    { name: "Jogo de jantar completo", description: "Para 12 pessoas, porcelana branca", price: 480.0 },
    { name: "Air fryer", description: "Capacidade 5L, digital", price: 350.0 },
    { name: "Contribuição para lua de mel", description: "Ajude a realizar nosso sonho", price: 200.0 },
  ];

  for (const gift of gifts) {
    const existing = await prisma.gift.findFirst({
      where: { eventId: event.id, name: gift.name },
    });
    if (!existing) {
      await prisma.gift.create({ data: { eventId: event.id, ...gift } });
    }
  }
  console.log("   ✓ 3 presentes");

  // ─── Missões ──────────────────────────────────────────────────────────────
  console.log("🏆 Seeding missões...");

  const missions = [
    {
      code: "rsvp_early",
      title: "Confirmação antecipada",
      description: "Confirme presença antes do prazo e ganhe pontos bônus!",
      points: 100,
      totalCap: 1,
      order: 1,
    },
    {
      code: "photo_post",
      title: "Fotógrafo do dia",
      description: "Poste uma foto no mural do evento",
      points: 20,
      dailyCap: 5,
      order: 2,
    },
    {
      code: "gift_reserve",
      title: "Presente reservado",
      description: "Reserve um item da lista de presentes",
      points: 50,
      totalCap: 1,
      order: 3,
    },
    {
      code: "message_couple",
      title: "Mensagem de carinho",
      description: "Deixe uma mensagem especial para os noivos",
      points: 50,
      totalCap: 1,
      order: 4,
    },
    {
      code: "checkin",
      title: "Check-in no evento",
      description: "Faça check-in no dia do casamento",
      points: 500,
      totalCap: 1,
      order: 5,
    },
  ];

  for (const mission of missions) {
    await prisma.mission.upsert({
      where: { eventId_code: { eventId: event.id, code: mission.code } },
      update: { ...mission, active: true },
      create: { eventId: event.id, ...mission, active: true },
    });
  }
  console.log("   ✓ 5 missões");

  // ─── Convidados de teste ──────────────────────────────────────────────────
  console.log("👥 Seeding convidados de teste...");

  const guests: Array<{
    name: string;
    email: string;
    sessionToken: string;
    rsvpStatus: RsvpStatus;
    consentTerms: boolean;
    consentPhotoMural: boolean;
    consentTimestamp: Date;
  }> = [
    {
      name: "Maria Silva",
      email: "maria.silva@exemplo.com",
      sessionToken: "dev-session-maria-silva",
      rsvpStatus: "CONFIRMED",
      consentTerms: true,
      consentPhotoMural: true,
      consentTimestamp: new Date(),
    },
    {
      name: "João Santos",
      email: "joao.santos@exemplo.com",
      sessionToken: "dev-session-joao-santos",
      rsvpStatus: "PENDING",
      consentTerms: true,
      consentPhotoMural: false,
      consentTimestamp: new Date(),
    },
    {
      name: "Carla Mendes",
      email: "carla.mendes@exemplo.com",
      sessionToken: "dev-session-carla-mendes",
      rsvpStatus: "DECLINED",
      consentTerms: true,
      consentPhotoMural: false,
      consentTimestamp: new Date(),
    },
  ];

  for (const guest of guests) {
    await prisma.guest.upsert({
      where: { eventId_email: { eventId: event.id, email: guest.email } },
      update: { rsvpStatus: guest.rsvpStatus },
      create: { eventId: event.id, ...guest },
    });
  }
  console.log("   ✓ 3 convidados (Maria CONFIRMED, João PENDING, Carla DECLINED)");

  console.log("\n🌱 Seed concluído!");
  console.log(`   URL local: http://localhost:3000/casamento-exemplo?k=dev-token-casamento-exemplo`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
