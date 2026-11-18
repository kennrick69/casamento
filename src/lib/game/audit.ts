import "server-only";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/db";

// Registra uma identificação no jogo para auditoria dos noivos no painel.
// `method`: "name_phone" | "passkey" | "visitor". Nunca lança — auditoria não
// pode quebrar o login.
export async function logIdentification(
  eventId: string,
  guestId: string,
  method: "name_phone" | "passkey" | "visitor"
): Promise<void> {
  try {
    const h = await headers();
    const store = await cookies();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const userAgent = h.get("user-agent")?.slice(0, 300) ?? null;
    const deviceId = store.get("game_device")?.value ?? null;
    await prisma.guestIdentificationLog.create({
      data: { eventId, guestId, method, ip, userAgent, deviceId },
    });
  } catch {
    // auditoria é best-effort; silenciar.
  }
}
