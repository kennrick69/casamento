// Backfill dos CÓDIGOS PESSOAIS (S4a) — rodar UMA vez após o deploy.
// Garante um InviteCode PERSONAL para todo convidado da lista (não-visitante,
// não-deletado) de todo evento GAMIFIED que ainda não tenha. Idempotente: roda
// quantas vezes quiser; cria só o que falta. NÃO toca em sessionToken/cookie
// nem no link ?k= — o código pessoal é um campo novo e separado.
//
// Uso (a partir do WSL, com o Node do Windows e o .env.local):
//   cmd.exe /c "cd /d G:\\Projetos\\casamento && npx dotenv -e .env.local -- node scripts\\invite\\backfill-personal-codes.mjs"
// Em produção (Railway tem DATABASE_URL no ambiente):
//   node scripts/invite/backfill-personal-codes.mjs
import { PrismaClient } from "@prisma/client";
import { customAlphabet } from "nanoid";

const prisma = new PrismaClient();
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // base32 sem 0/O/1/I
const gen = customAlphabet(ALPHABET, 8);

async function uniqueCode(eventId, taken) {
  for (let i = 0; i < 20; i++) {
    const code = gen();
    if (taken.has(code)) continue;
    const exists = await prisma.inviteCode.findUnique({
      where: { eventId_code: { eventId, code } },
      select: { id: true },
    });
    if (!exists) {
      taken.add(code);
      return code;
    }
  }
  throw new Error("colisões seguidas ao gerar código");
}

const events = await prisma.event.findMany({
  where: { experienceType: "GAMIFIED" },
  select: { id: true, slug: true },
});

let totalCreated = 0;
for (const ev of events) {
  const [guests, codes] = await Promise.all([
    prisma.guest.findMany({
      where: { eventId: ev.id, isVisitor: false, deletedAt: null },
      select: { id: true },
    }),
    prisma.inviteCode.findMany({
      where: { eventId: ev.id, kind: "PERSONAL" },
      select: { guestId: true, code: true },
    }),
  ]);
  const taken = new Set(codes.map((c) => c.code));
  const have = new Set(codes.map((c) => c.guestId).filter(Boolean));
  const missing = guests.filter((g) => !have.has(g.id));
  for (const g of missing) {
    const code = await uniqueCode(ev.id, taken);
    await prisma.inviteCode.create({ data: { eventId: ev.id, code, kind: "PERSONAL", guestId: g.id } });
    totalCreated++;
  }
  console.log(`[${ev.slug}] convidados=${guests.length} tinham=${have.size} criados=${missing.length}`);
}

console.log(`[OK] backfill concluído. Novos códigos pessoais: ${totalCreated}`);
await prisma.$disconnect();
