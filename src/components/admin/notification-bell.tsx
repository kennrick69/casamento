import Link from "next/link";
import { Bell } from "lucide-react";
import { prisma } from "@/lib/db";

export async function NotificationBell({ eventId }: { eventId: string }) {
  const now = new Date();
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [pendingPhotos, pendingSongs, recentConfirmed, event] = await Promise.all([
    prisma.photo.count({ where: { eventId, approvedByCouple: false, removedAt: null } }),
    prisma.playlistSuggestion.count({ where: { eventId, songStatus: "PENDING" } }),
    prisma.guest.count({
      where: { eventId, rsvpStatus: "CONFIRMED", updatedAt: { gte: since24h }, deletedAt: null },
    }),
    prisma.event.findUnique({
      where: { id: eventId },
      select: { ceremonyDate: true, coupleNames: true },
    }),
  ]);

  const notifications: { label: string; href: string }[] = [];

  if (recentConfirmed > 0) {
    notifications.push({
      label: `${recentConfirmed} convidado${recentConfirmed > 1 ? "s" : ""} confirmou nas últimas 24h`,
      href: `/admin/eventos/${eventId}/convidados`,
    });
  }

  if (pendingPhotos > 0) {
    notifications.push({
      label: `${pendingPhotos} foto${pendingPhotos > 1 ? "s" : ""} aguardando aprovação`,
      href: `/admin/eventos/${eventId}/moderacao?tab=mural`,
    });
  }

  if (pendingSongs > 0) {
    notifications.push({
      label: `${pendingSongs} música${pendingSongs > 1 ? "s" : ""} na fila da playlist`,
      href: `/admin/eventos/${eventId}/moderacao?tab=playlist`,
    });
  }

  if (event) {
    const daysLeft = Math.ceil(
      (event.ceremonyDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysLeft > 0 && daysLeft <= 30) {
      notifications.push({
        label: `Faltam ${daysLeft} dia${daysLeft > 1 ? "s" : ""} para o casamento!`,
        href: `/admin/eventos/${eventId}`,
      });
    }
  }

  const total = notifications.length;

  return (
    <div className="relative group">
      <Link
        href={`/admin/eventos/${eventId}/moderacao`}
        className="relative flex items-center justify-center w-9 h-9 rounded-full hover:bg-muted transition-colors"
        aria-label={`${total} notificaç${total === 1 ? "ão" : "ões"}`}
      >
        <Bell size={18} />
        {total > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 flex items-center justify-center text-[10px] font-bold rounded-full bg-destructive text-destructive-foreground">
            {total}
          </span>
        )}
      </Link>

      {/* Dropdown */}
      <div className="absolute right-0 top-full mt-2 w-72 rounded-lg border bg-background shadow-lg z-50 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity">
        <div className="p-3 border-b">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Notificações
          </p>
        </div>
        {notifications.length === 0 ? (
          <p className="text-sm text-muted-foreground p-4 text-center">Tudo em dia ✓</p>
        ) : (
          <ul className="divide-y">
            {notifications.map((n, i) => (
              <li key={i}>
                <Link
                  href={n.href}
                  className="block px-4 py-3 text-sm hover:bg-muted transition-colors"
                >
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
