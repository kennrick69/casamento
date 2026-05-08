import { prisma } from "@/lib/db";
import { getCurrentGuest } from "@/lib/auth/guest";
import { notFound } from "next/navigation";
import Link from "next/link";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ k?: string; rank?: string }>;
}

const MOTIVATIONAL: { min: number; max: number; msg: string }[] = [
  { min: 0, max: 0, msg: "Comece agora e entre no ranking!" },
  { min: 1, max: 49, msg: "Bom começo! Continue engajando." },
  { min: 50, max: 149, msg: "Você está crescendo no ranking!" },
  { min: 150, max: 299, msg: "Impressionante! Você é um dos favoritos." },
  { min: 300, max: Infinity, msg: "Uau! Você está arrasando na gincana 🏆" },
];

function getMotivational(points: number): string {
  return MOTIVATIONAL.find((m) => points >= m.min && points <= m.max)?.msg ?? "";
}

export default async function GincanaPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { k, rank } = await searchParams;
  void k;
  const showFullRanking = rank === "1";

  const event = await prisma.event.findUnique({
    where: { slug },
    select: { id: true, features: true },
  });
  if (!event) notFound();

  const features = event.features as Record<string, boolean>;
  if (!features.gamification) notFound();

  const guest = await getCurrentGuest(slug);

  const rankingLimit = showFullRanking ? undefined : 10;

  const [missions, ranking, guestPoints, totalParticipants] = await Promise.all([
    prisma.mission.findMany({
      where: { eventId: event.id, active: true },
      orderBy: { order: "asc" },
    }),
    prisma.guestPoints.findMany({
      where: { eventId: event.id },
      orderBy: { totalPoints: "desc" },
      take: rankingLimit,
      include: { guest: { select: { name: true } } },
    }),
    guest ? prisma.guestPoints.findUnique({ where: { guestId: guest.id } }) : null,
    prisma.guestPoints.count({ where: { eventId: event.id } }),
  ]);

  const myPoints = guestPoints?.totalPoints ?? 0;

  const guestRank = guest
    ? (await prisma.guestPoints.count({
        where: { eventId: event.id, totalPoints: { gt: myPoints } },
      })) + 1
    : null;

  // Calculate mission progress from PointEvents
  const completedMissions = guest
    ? await prisma.pointEvent.groupBy({
        by: ["missionId"],
        where: { guestId: guest.id, eventId: event.id, missionId: { not: null } },
        _count: true,
      })
    : [];
  const completedMap = new Map(completedMissions.map((m) => [m.missionId, m._count]));

  const maxPoints = missions.reduce((sum, m) => sum + m.points, 0);
  const progressPct = maxPoints > 0 ? Math.round((myPoints / maxPoints) * 100) : 0;

  return (
    <div className="px-4 pt-5 pb-24">
      <h1 className="text-xl font-semibold mb-1" style={{ fontFamily: "var(--theme-font-heading)" }}>
        Gincana
      </h1>
      <p className="text-sm text-[var(--theme-secondary)] mb-5">
        Participe, ganhe pontos e concorra a surpresas!
      </p>

      {/* Meu placar */}
      {guest && (
        <div className="rounded-[var(--theme-radius)] border border-[var(--theme-border)] bg-[var(--theme-muted)] p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-[var(--theme-secondary)]">Seus pontos</p>
              <p className="text-3xl font-bold" style={{ color: "var(--theme-primary)" }}>
                {myPoints}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[var(--theme-secondary)]">Sua posição</p>
              <p className="text-3xl font-bold">
                {guestRank ? `${guestRank}º` : "—"}
                {guestRank === 1 && " 🏆"}
                {guestRank === 2 && " 🥈"}
                {guestRank === 3 && " 🥉"}
              </p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-2 bg-[var(--theme-border)] rounded-full overflow-hidden mb-2">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, progressPct)}%`, background: "var(--theme-primary)" }}
            />
          </div>
          <p className="text-xs text-[var(--theme-secondary)]">{progressPct}% do potencial máximo · {getMotivational(myPoints)}</p>
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
      <h2 className="text-base font-semibold mb-3" style={{ fontFamily: "var(--theme-font-heading)" }}>
        Ranking {showFullRanking ? `(${totalParticipants})` : "Top 10"}
      </h2>
      <div className="flex flex-col gap-2 mb-4">
        {ranking.length === 0 && (
          <p className="text-sm text-[var(--theme-secondary)] text-center py-4">
            Ninguém pontuou ainda. Seja o primeiro!
          </p>
        )}
        {ranking.map((entry, i) => {
          const isMe = guest && entry.guestId === guest.id;
          const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
          return (
            <div
              key={entry.guestId}
              className={`flex items-center gap-3 rounded-[var(--theme-radius)] px-3 py-2 border ${isMe ? "border-[var(--theme-primary)] bg-[var(--theme-muted)]" : "border-[var(--theme-border)]"}`}
            >
              <span className="text-base font-bold w-7 text-center text-[var(--theme-secondary)] shrink-0">
                {medal ?? i + 1}
              </span>
              <span className="flex-1 text-sm font-medium truncate">
                {isMe ? "Você ✨" : entry.guest.name}
              </span>
              <span className="text-sm font-bold shrink-0" style={{ color: "var(--theme-primary)" }}>
                {entry.totalPoints} pts
              </span>
            </div>
          );
        })}
      </div>

      {!showFullRanking && totalParticipants > 10 && (
        <a
          href={`/${slug}/gincana?rank=1`}
          className="block text-center text-sm underline underline-offset-2 text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] mb-6"
        >
          Ver ranking completo ({totalParticipants} participantes)
        </a>
      )}

      {/* Missões */}
      <h2 className="text-base font-semibold mb-3" style={{ fontFamily: "var(--theme-font-heading)" }}>
        Como ganhar pontos
      </h2>
      <div className="flex flex-col gap-2">
        {missions.map((m) => {
          const done = completedMap.get(m.id) ?? 0;
          const cap = m.dailyCap ?? m.totalCap ?? null;
          const isComplete = cap !== null && done >= cap;
          return (
            <div
              key={m.id}
              className={`flex items-center justify-between rounded-[var(--theme-radius)] border px-3 py-2.5 ${isComplete ? "border-[var(--theme-primary)]/30 bg-[var(--theme-muted)]" : "border-[var(--theme-border)]"}`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{m.title}</p>
                <p className="text-xs text-[var(--theme-secondary)]">
                  {m.description}
                  {m.dailyCap ? ` Até ${m.dailyCap}× por dia` : ""}
                  {guest && done > 0 ? ` · você fez ${done}×` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 ml-4 shrink-0">
                {isComplete && <span className="text-sm">✓</span>}
                <span className="text-sm font-bold" style={{ color: "var(--theme-accent)" }}>
                  +{m.points} pts
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
