import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/authorization";
import { notFound } from "next/navigation";
import { EventNav } from "@/components/admin/event-nav";
import { AdminHeader } from "@/components/admin/admin-header";
import { specFromCharacter, specToQuery } from "@/lib/game/character/catalog";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Acessos ao jogo" };

const METHOD_LABEL: Record<string, string> = {
  name_phone: "Nome + celular",
  passkey: "Passkey",
  visitor: "Visitante",
};

// Remove emojis (pictogramas, modificadores de tom, ZWJ, variation selectors) —
// o painel do jogo é sem emoji (regra do projeto, item 6). O recado é texto do
// visitante; só tiramos os emojis, o resto fica igual.
function stripEmojis(s: string): string {
  return s
    .replace(/[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}\u{200D}️]/gu, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

const fmt = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

interface Props {
  params: Promise<{ id: string }>;
}

// Auditoria das identificações no Modo Gamificado. Como a entrada por
// nome+celular não verifica posse do número, os noivos conseguem ver aqui
// quem entrou, quando, como e de qual aparelho/IP.
export default async function AcessosJogoPage({ params }: Props) {
  const { id: eventId } = await params;
  try {
    await requireOrganizer(eventId);
  } catch {
    notFound();
  }

  const [event, logs, recadoGuests] = await Promise.all([
    prisma.event.findUnique({ where: { id: eventId }, select: { slug: true } }),
    prisma.guestIdentificationLog.findMany({
      where: { eventId },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        guest: { select: { name: true, playerName: true, isVisitor: true } },
      },
    }),
    // Recados do jogo = mensagens deixadas na Vila por VISITANTES (quem está na
    // lista confirma via RSVP; o campo Guest.message é o mesmo, então filtramos
    // por isVisitor para não misturar com mensagens de RSVP).
    prisma.guest.findMany({
      where: { eventId, isVisitor: true, banned: false, deletedAt: null, message: { not: null } },
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: {
        id: true,
        name: true,
        playerName: true,
        message: true,
        updatedAt: true,
        gameCharacter: {
          select: { appearance: true, outfit: true, skinColor: true, hairStyle: true, hairColor: true },
        },
      },
    }),
  ]);

  const slug = event?.slug ?? "";
  const recados = recadoGuests
    .map((g) => ({
      id: g.id,
      who: g.playerName || g.name,
      text: stripEmojis(g.message ?? ""),
      when: g.updatedAt,
      avatarUrl: g.gameCharacter
        ? `/${slug}/jogo/personagem/preview?${specToQuery(specFromCharacter(g.gameCharacter))}`
        : null,
    }))
    .filter((r) => r.text.length > 0);

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader title="Acessos ao jogo" eventId={eventId} />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <EventNav eventId={eventId} />

        <h1 className="text-2xl font-bold mb-2">Acessos ao jogo</h1>

        {/* ── Recados do jogo (visitantes) ── */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-1">Recados do jogo</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Mensagens que os visitantes deixaram para vocês na Vila do jogo.
          </p>
          {recados.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum recado ainda.</p>
          ) : (
            <ul className="space-y-3">
              {recados.map((r) => (
                <li
                  key={r.id}
                  className="flex gap-3 rounded-lg border border-border bg-card p-3"
                >
                  <div className="shrink-0 flex items-end justify-center w-12 h-16 rounded-md bg-muted/40 overflow-hidden">
                    {r.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.avatarUrl}
                        alt={`Personagem de ${r.who}`}
                        className="w-full h-full object-contain [image-rendering:pixelated]"
                      />
                    ) : (
                      <span className="text-lg font-semibold text-muted-foreground self-center">
                        {r.who.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-medium truncate">{r.who}</span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {fmt.format(r.when)}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words mt-0.5">
                      {r.text}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <h2 className="text-lg font-semibold mb-1">Quem entrou</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Cada identificação no modo jogo (últimas 200). A entrada por
          nome+celular não confirma o número, então use isto para auditar quem
          entrou. Cancelamentos e mudanças de acompanhantes também avisam o
          convidado por e-mail.
        </p>

        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum acesso registrado ainda.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Quando</th>
                  <th className="px-3 py-2 font-medium">Convidado</th>
                  <th className="px-3 py-2 font-medium">Como</th>
                  <th className="px-3 py-2 font-medium">Aparelho / IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-t border-border align-top">
                    <td className="px-3 py-2 whitespace-nowrap">{fmt.format(log.createdAt)}</td>
                    <td className="px-3 py-2">
                      {log.guest.playerName || log.guest.name}
                      {log.guest.isVisitor && (
                        <span className="ml-1 text-xs text-muted-foreground">(visitante)</span>
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {METHOD_LABEL[log.method] ?? log.method}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground break-all">
                      {log.ip ?? "—"}
                      {log.deviceId ? ` · dev:${log.deviceId.slice(0, 8)}` : ""}
                      {log.userAgent ? ` · ${log.userAgent.slice(0, 60)}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
