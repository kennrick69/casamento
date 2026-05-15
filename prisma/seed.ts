import { PrismaClient, RsvpStatus, Venue3DObjectKind } from "@prisma/client";
import { hash } from "@node-rs/argon2";
import { THEMES } from "../src/lib/themes";

const ARGON2_OPTIONS = { timeCost: 3, memoryCost: 65536, parallelism: 4, algorithm: 2 as const };

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

  // ─── DEMO: Evento José e Letícia ─────────────────────────────────────────
  console.log("💍 Seeding evento demo (José e Letícia)...");

  const classicTheme = await prisma.theme.findUniqueOrThrow({ where: { key: "classic" } });

  const demoPasswordHash = await hash("demo123", ARGON2_OPTIONS);
  const now = new Date();
  const demoUser = await prisma.user.upsert({
    where: { email: "demo@joseeleticia.com" },
    update: { passwordHash: demoPasswordHash },
    create: {
      email: "demo@joseeleticia.com",
      firstName: "José",
      lastName: "Demo",
      name: "José Demo",
      passwordHash: demoPasswordHash,
      emailVerified: now,
      profileCompleted: true,
      onboardingCompleted: true,
      termsAcceptedAt: now,
      termsVersion: "1.0",
      privacyAcceptedAt: now,
      privacyVersion: "1.0",
    },
  });
  console.log(`   ✓ Usuário: demo@joseeleticia.com`);

  const ceremonyDateDemo = new Date("2027-05-29T19:00:00.000Z");
  const rsvpDeadlineDemo = new Date("2027-04-29T23:59:59.000Z");

  const demoEvent = await prisma.event.upsert({
    where: { slug: "demo" },
    update: { coupleNames: "José e Letícia" },
    create: {
      slug: "demo",
      title: "Casamento de José e Letícia",
      coupleNames: "José e Letícia",
      coupleLabel: "os noivos",
      ceremonyDate: ceremonyDateDemo,
      timezone: "America/Sao_Paulo",
      ceremonyLocation: "Igreja Nossa Senhora da Glória",
      ceremonyAddress: "Rua das Acácias, 200 — São Paulo, SP",
      receptionLocation: "Espaço Voem",
      receptionAddress: "Av. Beira-Mar, 1000 — Santos, SP",
      mapsLink: "https://maps.google.com",
      dresscode: "Esporte Fino",
      description: "Uma noite mágica, cheia de amor e alegria.",
      paletteColors: { primary: "#2D2D2D", accent: "#B8860B", background: "#FAFAFA" },
      themeId: classicTheme.id,
      status: "PUBLISHED",
      features: { rsvp: true, mural: true, chat: true, gincana: true, presentes: true, roteiro: true, playlist: true, recados: true },
      donationMode: "TRUST",
      publicTokenK: "demo-token-jose-e-leticia",
      rsvpEarlyDeadline: rsvpDeadlineDemo,
      pointsPerCurrencyUnit: 0.1,
    },
  });
  console.log(`   ✓ Evento: /demo (id: ${demoEvent.id})`);

  await prisma.eventOrganizer.upsert({
    where: { eventId_userId: { eventId: demoEvent.id, userId: demoUser.id } },
    update: {},
    create: { eventId: demoEvent.id, userId: demoUser.id, role: "OWNER" },
  });
  console.log("   ✓ Organizador vinculado");

  // ─── 30 convidados fake ───────────────────────────────────────────────────
  console.log("👥 Seeding 30 convidados demo...");
  const CONFIRMED_NAMES = [
    ["Maria", "Silva"], ["João", "Santos"], ["Ana", "Oliveira"], ["Pedro", "Costa"],
    ["Carla", "Mendes"], ["Lucas", "Ferreira"], ["Beatriz", "Alves"], ["Rafael", "Lima"],
    ["Fernanda", "Rocha"], ["Gustavo", "Pereira"], ["Juliana", "Barbosa"], ["Rodrigo", "Nunes"],
    ["Amanda", "Cardoso"], ["Felipe", "Gomes"], ["Tatiana", "Ribeiro"], ["Eduardo", "Martins"],
    ["Priscila", "Araújo"], ["Thiago", "Sousa"], ["Renata", "Campos"], ["Diego", "Teixeira"],
  ];
  const PENDING_NAMES = [
    ["Camila", "Vieira"], ["Marcos", "Ramos"], ["Vanessa", "Cruz"], ["Bruno", "Dias"],
    ["Daniela", "Freitas"], ["Leonardo", "Borges"], ["Patricia", "Moreira"], ["André", "Pinto"],
    ["Larissa", "Correia"], ["Carlos", "Fonseca"],
  ];

  const makeGuest = (firstName: string, lastName: string, idx: number, status: RsvpStatus) => ({
    name: `${firstName} ${lastName}`,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${idx}@exemplo.com`,
    sessionToken: `demo-session-${firstName.toLowerCase()}-${idx}`,
    rsvpStatus: status,
    consentTerms: true,
    consentPhotoMural: true,
    consentTimestamp: now,
  });

  for (const [i, [fn, ln]] of CONFIRMED_NAMES.entries()) {
    const g = makeGuest(fn, ln, i, "CONFIRMED");
    await prisma.guest.upsert({
      where: { eventId_email: { eventId: demoEvent.id, email: g.email } },
      update: { rsvpStatus: "CONFIRMED" },
      create: { eventId: demoEvent.id, ...g },
    });
  }
  for (const [i, [fn, ln]] of PENDING_NAMES.entries()) {
    const g = makeGuest(fn, ln, i + 20, "PENDING");
    await prisma.guest.upsert({
      where: { eventId_email: { eventId: demoEvent.id, email: g.email } },
      update: { rsvpStatus: "PENDING" },
      create: { eventId: demoEvent.id, ...g },
    });
  }
  console.log("   ✓ 20 CONFIRMED + 10 PENDING");

  // ─── Venue3D ──────────────────────────────────────────────────────────────
  console.log("🏛️  Seeding Venue3D demo...");
  const venue = await prisma.venue3D.upsert({
    where: { eventId: demoEvent.id },
    update: {},
    create: {
      eventId: demoEvent.id,
      floorWidthTiles: 20,
      floorDepthTiles: 15,
      floorColor: "#F5F0E8",
      wallColor: "#E8E0D0",
      ambientLight: 0.65,
    },
  });

  // Layout: floor 20×15 (X: -10…+10, Z: -7.5…+7.5)
  const objects: Array<{
    kind: Venue3DObjectKind; posX: number; posZ: number; rotation: number;
    label?: string; seats?: number; number?: number;
  }> = [
    // Mesa dos noivos no centro-norte
    { kind: "TABLE_U",       posX:  0,  posZ: -5.5, rotation: 0,                label: "Mesa dos Noivos" },
    // Pista central
    { kind: "DANCE_FLOOR",   posX:  0,  posZ:  0.5, rotation: 0 },
    // Palco ao norte da pista
    { kind: "STAGE",         posX:  0,  posZ: -2.5, rotation: 0 },
    // DJ Booth
    { kind: "DJ_BOOTH",      posX: -4,  posZ: -4.5, rotation: Math.PI / 4 },
    // Bar no sudeste
    { kind: "BAR",           posX:  7,  posZ:  5.5, rotation: -Math.PI / 2 },
    // Buffet no oeste
    { kind: "BUFFET",        posX: -7,  posZ:  1.0, rotation: Math.PI / 2 },
    // Mesa do bolo perto do bar
    { kind: "CAKE_TABLE",    posX:  5.5, posZ: 5.5, rotation: 0 },
    // 6 mesas redondas ao redor da pista
    { kind: "TABLE_ROUND_8", posX: -4.5, posZ: 3.5, rotation: 0, label: "Mesa 1", number: 1, seats: 8 },
    { kind: "TABLE_ROUND_8", posX:  4.5, posZ: 3.5, rotation: 0, label: "Mesa 2", number: 2, seats: 8 },
    { kind: "TABLE_ROUND_8", posX: -6.5, posZ: 0.5, rotation: 0, label: "Mesa 3", number: 3, seats: 8 },
    { kind: "TABLE_ROUND_8", posX:  6.5, posZ: 0.5, rotation: 0, label: "Mesa 4", number: 4, seats: 8 },
    { kind: "TABLE_ROUND_8", posX: -4.5, posZ:-2.5, rotation: 0, label: "Mesa 5", number: 5, seats: 8 },
    { kind: "TABLE_ROUND_8", posX:  4.5, posZ:-2.5, rotation: 0, label: "Mesa 6", number: 6, seats: 8 },
  ];

  for (const obj of objects) {
    const existing = await prisma.venue3DObject.findFirst({
      where: { venueId: venue.id, kind: obj.kind, posX: obj.posX, posZ: obj.posZ },
    });
    if (!existing) {
      await prisma.venue3DObject.create({ data: { venueId: venue.id, ...obj } });
    }
  }
  console.log(`   ✓ ${objects.length} objetos no salão`);

  console.log("\n🌱 Seed concluído!");
  console.log(`   URL local: http://localhost:3000/casamento-exemplo?k=dev-token-casamento-exemplo`);
  console.log(`   Demo:      http://localhost:3000/demo?k=demo-token-jose-e-leticia`);
  console.log(`   Sala 3D:   http://localhost:3000/demo/sala-3d`);
  console.log(`   Login:     demo@joseeleticia.com / demo123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
