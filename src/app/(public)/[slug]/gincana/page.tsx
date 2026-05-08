import { prisma } from "@/lib/db";
import { getCurrentGuest } from "@/lib/auth/guest";
import { notFound } from "next/navigation";
import Link from "next/link";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function GincanaPage({ params }: Props) {
  const { slug } = await params;

  const event = await prisma.event.findUnique({
    where: { slug },
    select: { id: true, features: true },
  });
  if (!event) notFound();

  const features = event.features as Record<string, boolean>;
  if (!features.gamification) notFound();

  const guest = await getCurrentGuest(slug);

  const [missions, ranking, guestPoints] = await Promise.all([
    prisma.mission.findMany({
      where: { eventId: event.id, active: true },
      orderBy: { order: "asc" },
    }),
    prisma.guestPoints.findMany({
      where: { eventId: event.id },
      orderBy: { totalPoints: "desc" },
      take: 10,
      include: { guest: { select: { name: true } } },
    }),
    guest
      ? prisma.guestPoints.findUnique({ where: { guestId: guest.id } })
      : null,
  ]);

  const guestRank = guest
    ? (await prisma.guestPoints.count({
        where: { eventId: event.id, totalPoints: { gt: guestPoints?.totalPoints ?? 0 } },
      })) + 1
    : null;

  return (
    <div className="px-4 pt-5 pb-24">
      <h1
        className="text-xl font-semibold mb-1"
        style={{ fontFamily: "var(--theme-font-heading)" }}
      >
        Gincana
      </h1>
      <p className="text-sm text-[var(--theme-secondary)] mb-5">
        Participe, ganhe pontos e concorra a surpresas!
      </p>

      {/* Meu placar */}
      {guest && (
        <div className="rounded-[var(--theme-radius)] border border-[var(--theme-border)] bg-[var(--theme-muted)] p-4 mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs text-[var(--theme-secondary)]">Seus pontos</p>
            <p className="text-3xl font-bold" style={{ color: "var(--theme-primary)" }}>
              {guestPoints?.totalPoints ?? 0}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[var(--theme-secondary)]">Sua posição</p>
            <p className="text-3xl font-bold">{guestRank ?? "—"}</p>
          </div>
        </div>
      )}

      {/* Check-in CTA */}
      <Link
        href={`/${slug}/checkin`}
        className="block text-center mb-6 py-2 px-4 rounded-[var(--theme-radius)] border border-[var(--theme-border)] bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)] text-sm font-medium"
      >
        Marcar presença no local
      </Link>

      {/* Ranking */}
      <h2
        className="text-base font-semibold mb-3"
        style={{ fontFamily: "var(--theme-font-heading)" }}
      >
        Ranking
      </h2>
      <div className="flex flex-col gap-2 mb-7">
        {ranking.length === 0 && (
          <p className="text-sm text-[var(--theme-secondary)] text-center py-4">
            Ninguém pontuou ainda. Seja o primeiro!
          </p>
        )}
        {ranking.map((entry, i) => {
          const isMe = guest && entry.guestId === guest.id;
          return (
            <div
              key={entry.guestId}
              className={`flex items-center gap-3 rounded-[var(--theme-radius)] px-3 py-2 border ${
                isMe
                  ? "border-[var(--theme-primary)] bg-[var(--theme-muted)]"
                  : "border-[var(--theme-border)]"
              }`}
            >
              <span className="text-base font-bold w-6 text-center text-[var(--theme-secondary)]">
                {i + 1}
              </span>
              <span className="flex-1 text-sm font-medium truncate">
                {isMe ? "Você" : entry.guest.name}
              </span>
              <span className="text-sm font-bold" style={{ color: "var(--theme-primary)" }}>
                {entry.totalPoints} pts
              </span>
            </div>
          );
        })}
      </div>

      {/* Missões */}
      <h2
        className="text-base font-semibold mb-3"
        style={{ fontFamily: "var(--theme-font-heading)" }}
      >
        Como ganhar pontos
      </h2>
      <div className="flex flex-col gap-2">
        {missions.map((m) => (
          <div
            key={m.id}
            className="flex items-center justify-between rounded-[var(--theme-radius)] border border-[var(--theme-border)] px-3 py-2.5"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{m.title}</p>
              {m.dailyCap && (
                <p className="text-xs text-[var(--theme-secondary)]">
                  Até {m.dailyCap}× por dia
                </p>
              )}
            </div>
            <span
              className="text-sm font-bold ml-4 shrink-0"
              style={{ color: "var(--theme-accent)" }}
            >
              +{m.points} pts
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
