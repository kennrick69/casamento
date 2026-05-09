import { notFound } from "next/navigation";
import { validateEventAccess } from "@/lib/auth/guest";
import { prisma } from "@/lib/db";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Convidados" };

export default async function ConvidadosPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ k?: string }>;
}) {
  const { slug } = await params;
  const { k } = await searchParams;

  const result = await validateEventAccess(slug, k ?? null);
  if (!result.ok) notFound();

  const { event, guest } = result;

  // Only visible to confirmed guests
  if (!guest || guest.rsvpStatus !== "CONFIRMED") {
    return (
      <div className="px-4 py-12 max-w-lg mx-auto text-center">
        <p className="text-2xl mb-3">👥</p>
        <p className="text-sm text-[var(--theme-secondary)]">
          Esta página está disponível após confirmar presença.
        </p>
      </div>
    );
  }

  const guests = await prisma.guest.findMany({
    where: {
      eventId: event.id,
      deletedAt: null,
      banned: false,
      rsvpStatus: "CONFIRMED",
      profilePublic: true,
    },
    select: {
      id: true,
      name: true,
      profileBio: true,
      profileRelationship: true,
      profileImageKey: true,
    },
    orderBy: { name: "asc" },
  });

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <h1
        className="text-2xl font-semibold mb-1"
        style={{ fontFamily: "var(--theme-font-heading)" }}
      >
        Quem vai estar lá
      </h1>
      <p className="text-sm text-[var(--theme-secondary)] mb-6">
        {guests.length} convidado{guests.length !== 1 ? "s" : ""} com perfil público
      </p>

      {guests.length === 0 ? (
        <p className="text-sm text-[var(--theme-secondary)]">
          Nenhum convidado habilitou o perfil público ainda.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {guests.map((g) => (
            <div
              key={g.id}
              className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] p-4 flex flex-col items-center text-center gap-2"
            >
              {g.profileImageKey ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`${APP_URL}/api/photos/${g.profileImageKey}`}
                  alt={g.name}
                  className="h-16 w-16 rounded-full object-cover border-2 border-[var(--theme-primary)]"
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-[var(--theme-muted)] flex items-center justify-center text-2xl font-semibold text-[var(--theme-primary)]">
                  {g.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-sm font-semibold leading-tight">{g.name}</p>
                {g.profileRelationship && (
                  <p className="text-xs text-[var(--theme-secondary)] mt-0.5">{g.profileRelationship}</p>
                )}
                {g.profileBio && (
                  <p className="text-xs text-[var(--theme-secondary)] mt-1 line-clamp-2">{g.profileBio}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Current guest's profile section */}
      <div className="mt-8 rounded-xl border border-dashed border-[var(--theme-border)] p-4">
        <p className="text-sm font-medium mb-1">Seu perfil</p>
        <p className="text-xs text-[var(--theme-secondary)] mb-3">
          {guest.profilePublic
            ? "Seu perfil está visível para outros convidados."
            : "Seu perfil está oculto. Você pode torná-lo público:"}
        </p>
        <a
          href={`/${slug}/rsvp?k=${k}`}
          className="text-xs underline underline-offset-2 text-[var(--theme-primary)]"
        >
          Editar confirmação e perfil
        </a>
      </div>
    </div>
  );
}
