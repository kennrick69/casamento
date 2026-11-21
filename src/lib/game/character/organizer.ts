import "server-only";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Noivo/noiva no criador são só para ORGANIZADORES do evento (o casal). Checa a
// sessão admin (next-auth) e se o usuário é organizador. Convidado comum (sem
// sessão admin) nunca libera. Substitui a antiga heurística por nome.
export async function isEventOrganizer(eventId: string): Promise<boolean> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return false;
  const org = await prisma.eventOrganizer.findUnique({
    where: { eventId_userId: { eventId, userId } },
    select: { userId: true },
  });
  return Boolean(org);
}
