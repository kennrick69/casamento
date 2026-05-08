/**
 * Dev-only rich seed: 1 event, 50 guests, 30 photos, 100 chat messages,
 * 20 songs, 10 missions, 5 donations.
 *
 * Guard: refuses to run against a production DATABASE_URL that does NOT
 * contain "localhost", "127.0.0.1", or the env var DEV_SEED_ALLOW=1.
 */

import { PrismaClient } from "@prisma/client";
import { nanoid } from "nanoid";

const prisma = new PrismaClient();

function guard() {
  const url = process.env.DATABASE_URL ?? "";
  const isLocal = url.includes("localhost") || url.includes("127.0.0.1");
  const isAllowed = process.env.DEV_SEED_ALLOW === "1";
  if (!isLocal && !isAllowed) {
    console.error(
      "❌  seed:dev abortado — DATABASE_URL não parece local.\n" +
      "    Use DEV_SEED_ALLOW=1 para forçar (cuidado em staging!)."
    );
    process.exit(1);
  }
}

const FIRST_NAMES = ["Ana", "Bruno", "Carlos", "Daniela", "Eduardo", "Fernanda",
  "Gabriel", "Helena", "Igor", "Julia", "Kevin", "Larissa", "Marcos", "Natalia",
  "Otávio", "Patricia", "Rafael", "Sandra", "Thiago", "Uiara", "Victor", "Wendy",
  "Xisto", "Yasmin", "Zeca", "Alice", "Bernardo", "Cecília", "Diego", "Elisa"];
const LAST_NAMES = ["Silva", "Santos", "Oliveira", "Souza", "Costa", "Rodrigues",
  "Almeida", "Nascimento", "Lima", "Araújo", "Ferreira", "Carvalho", "Gomes", "Martins",
  "Pereira", "Rocha", "Ribeiro", "Alves", "Monteiro", "Cardoso"];

function randomName() {
  const fn = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const ln = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return `${fn} ${ln}`;
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const CAPTIONS = [
  "Que momento incrível!", "Amor puro ❤️", "Eternamente feliz",
  "Uma noite inesquecível", "Os noivos arrasaram!", "Festa linda!",
  null, null, null, // ~30% sem legenda
];

const SONGS = [
  ["Perfect", "Ed Sheeran"], ["Thinking Out Loud", "Ed Sheeran"],
  ["A Thousand Years", "Christina Perri"], ["Can't Help Falling in Love", "Elvis Presley"],
  ["All of Me", "John Legend"], ["Marry You", "Bruno Mars"],
  ["You Are the Best Thing", "Ray LaMontagne"], ["Better Together", "Jack Johnson"],
  ["Make You Feel My Love", "Adele"], ["Die a Happy Man", "Thomas Rhett"],
  ["Everything", "Michael Bublé"], ["At Last", "Etta James"],
  ["The Way You Look Tonight", "Frank Sinatra"], ["La Vie en Rose", "Édith Piaf"],
  ["Fly Me to the Moon", "Frank Sinatra"], ["Your Song", "Elton John"],
  ["Say You Won't Let Go", "James Arthur"], ["Lucky", "Jason Mraz"],
  ["From the Ground Up", "Dan + Shay"], ["God Only Knows", "The Beach Boys"],
];

const CHAT_MSGS = [
  "Parabéns aos noivos! 🎉", "Que festa incrível!", "Felizes para sempre!",
  "Muito amor esse casal ❤️", "Demorou mas chegou o dia!", "Amando cada momento!",
  "Viva os noivos! 🥂", "Vocês merecem toda felicidade!", "Lindo demais!",
  "Emocionante demais, chorei muito 😭", "Que noite perfeita!", "Amor verdadeiro!",
  "Brinde à vocês! 🍾", "Obrigada pelo convite!", "Passem bem na lua de mel!",
  "Vocês são lindos juntos!", "Alegria enorme estar aqui!", "Parabéns família!",
  "Que venue maravilhosa!", "Todo sucesso do mundo!", "Saudade já...",
  "A festa tá boa demais!", "Dança do casal foi top!", "Decoração impecável!",
  "Gente boa nessa festa!", "Mesa de doces tá demais!", "Foi emocionante demais!",
  "Casamento dos sonhos!", "Família reunida 💕", "Ano que vem tem bodas!",
];

async function main() {
  guard();

  console.log("🌱 seed:dev — iniciando seed rico...\n");

  // Themes
  const { THEMES } = await import("../src/lib/themes/index.js");
  for (const theme of THEMES) {
    await prisma.theme.upsert({
      where: { key: theme.key },
      update: { name: theme.name, tokens: theme.tokens as object },
      create: { key: theme.key, name: theme.name, tokens: theme.tokens as object },
    });
  }

  const minimalTheme = await prisma.theme.findUniqueOrThrow({ where: { key: "minimal" } });

  // Event
  const today = new Date();
  const ceremonyDate = new Date(today);
  ceremonyDate.setDate(today.getDate() + 120);
  ceremonyDate.setUTCHours(19, 0, 0, 0);

  const event = await prisma.event.upsert({
    where: { slug: "dev-casamento-rico" },
    update: { status: "PUBLISHED" },
    create: {
      slug: "dev-casamento-rico",
      title: "Casamento de Luísa e Miguel",
      coupleNames: "Luísa e Miguel",
      ceremonyDate,
      timezone: "America/Sao_Paulo",
      ceremonyLocation: "Fazenda Monte Verde",
      ceremonyAddress: "Estrada da Fazenda, km 5 — Campinas, SP",
      status: "PUBLISHED",
      themeId: minimalTheme.id,
      publicTokenK: "dev-rico-token-" + nanoid(8),
      features: { rsvp: true, photoWall: true, chat: true, playlist: true, gamification: true, donations: true },
    },
  });
  console.log(`✓ Evento: /dev-casamento-rico (${event.id})`);

  // Missions (10)
  const missionDefs = [
    { code: "rsvp_confirmed", title: "Confirmou presença", points: 50, order: 1 },
    { code: "rsvp_early", title: "Confirmou antes do prazo", points: 30, order: 2 },
    { code: "photo_upload", title: "Enviou foto", points: 20, dailyCap: 3, order: 3 },
    { code: "chat_message", title: "Mensagem no chat", points: 10, dailyCap: 5, order: 4 },
    { code: "playlist_add", title: "Sugeriu música", points: 15, dailyCap: 2, order: 5 },
    { code: "vote_cast", title: "Votou em música", points: 5, dailyCap: 5, order: 6 },
    { code: "checkin_venue", title: "Check-in no local", points: 100, order: 7 },
    { code: "custom_dance", title: "Dançou com o casal", points: 75, order: 8 },
    { code: "custom_trivia", title: "Acertou a trivia", points: 40, order: 9 },
    { code: "custom_toast", title: "Fez um brinde especial", points: 60, order: 10 },
  ];
  for (const m of missionDefs) {
    await prisma.mission.upsert({
      where: { eventId_code: { eventId: event.id, code: m.code } },
      update: {},
      create: { eventId: event.id, ...m, active: true },
    });
  }
  console.log(`✓ ${missionDefs.length} missões`);

  // Guests (50)
  const rsvpStatuses = ["CONFIRMED", "CONFIRMED", "CONFIRMED", "PENDING", "DECLINED"] as const;
  const guestIds: string[] = [];

  for (let i = 0; i < 50; i++) {
    const name = randomName();
    const email = `dev.guest.${i + 1}@seed.local`;
    const rsvpStatus = pick(rsvpStatuses);
    const banned = i === 49; // 1 guest banned

    const guest = await prisma.guest.upsert({
      where: { eventId_email: { eventId: event.id, email } },
      update: { rsvpStatus },
      create: {
        eventId: event.id,
        name,
        email,
        rsvpStatus,
        sessionToken: nanoid(40),
        consentTerms: true,
        consentPhotoMural: true,
        consentTimestamp: new Date(),
        banned,
      },
    });
    guestIds.push(guest.id);
  }
  console.log(`✓ 50 convidados (1 banido)`);

  // Photos (30) — storageKey is a placeholder (no actual file)
  const confirmedGuests = guestIds.slice(0, 35);
  for (let i = 0; i < 30; i++) {
    const guestId = pick(confirmedGuests);
    const caption = pick(CAPTIONS);
    await prisma.photo.create({
      data: {
        eventId: event.id,
        guestId,
        storageKey: `dev-casamento-rico/fotos/placeholder-${i + 1}.jpg`,
        caption: caption ?? null,
        approvedByCouple: i < 25, // 5 pending approval
        reactions: {},
      },
    });
  }
  console.log(`✓ 30 fotos (25 aprovadas, 5 pendentes)`);

  // Chat messages (100)
  for (let i = 0; i < 100; i++) {
    const guestId = pick(confirmedGuests);
    await prisma.chatMessage.create({
      data: {
        eventId: event.id,
        guestId,
        content: pick(CHAT_MSGS) + (i % 10 === 0 ? ` (${i + 1})` : ""),
        reactions: {},
      },
    });
  }
  console.log(`✓ 100 mensagens no chat`);

  // Playlist (20 songs)
  for (let i = 0; i < 20; i++) {
    const [trackName, artist] = SONGS[i % SONGS.length];
    const guestId = pick(confirmedGuests);
    const suggestion = await prisma.playlistSuggestion.create({
      data: {
        eventId: event.id,
        guestId,
        trackName,
        artist,
        approved: true,
        songStatus: pick(["PENDING", "APPROVED", "APPROVED", "PLAYED"]) as never,
      },
    });

    // 0-5 random votes each
    const voteCount = Math.floor(Math.random() * 6);
    const voters = [...guestIds].sort(() => 0.5 - Math.random()).slice(0, voteCount);
    for (const voterId of voters) {
      await prisma.playlistVote.upsert({
        where: { suggestionId_guestId: { suggestionId: suggestion.id, guestId: voterId } },
        update: {},
        create: { suggestionId: suggestion.id, guestId: voterId },
      });
    }
  }
  console.log(`✓ 20 músicas na playlist`);

  // Donations (5)
  const donationAmounts = [50, 100, 200, 150, 75];
  for (let i = 0; i < 5; i++) {
    const guestId = pick(confirmedGuests);
    await prisma.donation.create({
      data: {
        eventId: event.id,
        guestId,
        amount: donationAmounts[i],
        mode: "TRUST" as never,
        status: pick(["DECLARED", "APPROVED", "APPROVED"]) as never,
        note: i % 2 === 0 ? "Com muito carinho! 💕" : null,
      },
    });
  }
  console.log(`✓ 5 doações`);

  console.log(`\n🌱 seed:dev concluído!`);
  console.log(`   URL: http://localhost:3000/dev-casamento-rico?k=${
    (await prisma.event.findUnique({ where: { id: event.id }, select: { publicTokenK: true } }))?.publicTokenK ?? "?"
  }`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
