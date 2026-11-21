/**
 * DEV-ONLY (voem-dev): cria visitantes com recado + personagem no evento demo,
 * para demonstrar a seção "Recados do jogo" no painel. Idempotente (upsert por
 * nome). Só mexe no evento slug "demo". Rodar no Windows:
 *   pnpm exec dotenv -e .env.local -- tsx scripts/game/seed-recados-dev.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Spec = {
  body: string; skin: string; hairStyle: string; hairColor: string;
  eyeColor: string; eyebrows: string; beard: string; glasses: string; outfit: string;
};

const VISITORS: { name: string; playerName: string; message: string; spec: Spec }[] = [
  {
    name: "[recado] Marina Teste", playerName: "Marina",
    message: "Que festa linda! Muitas felicidades aos dois.",
    spec: { body: "feminino", skin: "bronze", hairStyle: "cacheado", hairColor: "black", eyeColor: "castanho", eyebrows: "thin", beard: "none", glasses: "none", outfit: "vestido_blue" },
  },
  {
    name: "[recado] Rafael Teste", playerName: "Rafael",
    message: "Parabens, noivos! Dia inesquecivel, emocionante do comeco ao fim.",
    spec: { body: "masculino", skin: "brown", hairStyle: "topete", hairColor: "dark_brown", eyeColor: "castanho", eyebrows: "thick", beard: "curta", glasses: "redondo", outfit: "terno" },
  },
  {
    name: "[recado] Yasmin Teste", playerName: "Yasmin",
    message: "Amei tudo! ❤️🎉 Viva os noivos 😍🥂",
    spec: { body: "feminino", skin: "light", hairStyle: "coque", hairColor: "redhead", eyeColor: "verde", eyebrows: "thin", beard: "none", glasses: "none", outfit: "vestido_lavender" },
  },
];

async function main() {
  const event = await prisma.event.findUnique({ where: { slug: "demo" }, select: { id: true } });
  if (!event) throw new Error("evento demo nao encontrado");

  for (const v of VISITORS) {
    let guest = await prisma.guest.findFirst({ where: { eventId: event.id, name: v.name } });
    if (!guest) {
      guest = await prisma.guest.create({
        data: {
          eventId: event.id,
          name: v.name,
          email: `recado_${v.playerName.toLowerCase()}@demo.local`,
          sessionToken: `recado-session-${v.playerName.toLowerCase()}`,
          isVisitor: true,
          playerName: v.playerName,
          message: v.message,
          rsvpStatus: "PENDING",
          approved: true,
          consentTerms: true,
          consentTimestamp: new Date(),
        },
      });
    } else {
      await prisma.guest.update({ where: { id: guest.id }, data: { isVisitor: true, playerName: v.playerName, message: v.message } });
    }
    await prisma.gameCharacter.upsert({
      where: { guestId: guest.id },
      update: { skinColor: v.spec.skin, hairStyle: v.spec.hairStyle, hairColor: v.spec.hairColor, outfit: v.spec.outfit, appearance: v.spec },
      create: { guestId: guest.id, skinColor: v.spec.skin, hairStyle: v.spec.hairStyle, hairColor: v.spec.hairColor, outfit: v.spec.outfit, appearance: v.spec },
    });
    console.log(`[OK] visitante ${v.playerName} (${guest.id})`);
  }
  console.log(`[OK] eventId demo = ${event.id}`);
}

main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
